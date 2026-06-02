import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useKids } from "@/lib/kidsContext";
import { API_BASE } from "@/lib/apiClient";
import { F } from "@/lib/tokens";

const K = {
  purple: "#7C3AED",
  bg: "#FFF8F0",
  deep: "#1C1917",
  muted: "#78716C",
  border: "rgba(28,25,23,0.08)",
} as const;

const STORIES = [
  { label: "📖 Main Story", duration: "5:12", key: "main" as const },
  { label: "⚡ Quick Hits", duration: "2:30", key: "quickHits" as const },
  { label: "🏛 History", duration: "3:45", key: "history" as const },
];

const MOCK_TEXTS: Record<string, string> = {
  main: `[Warm voice] You are about to step into a place that has drawn people from across the world for generations. [pause] Before you go in, take one breath and notice something: the way the air feels here, the sounds around you, the light hitting the walls or the ground. [pause] That is the beginning of really seeing a place, not just visiting it.

This stop has a story that goes back much further than most people realize. Long before it looked the way it does today, people were gathering here. They came to trade, to learn, to celebrate, to argue, to create. [pause] The layers of those lives are still here, invisible but real, right beneath your feet and all around you.

As you explore, there are details that most visitors walk right past. The things that seem ordinary at first glance often turn out to be the most interesting when you stop and look closely. Textures in the walls. The way a doorway is shaped. The angle of a staircase. People made deliberate choices about all of it. [pause] Every choice had a reason.

One of the most fascinating things about places like this is how many contradictions they hold at once. They can be both very old and very alive. Very grand and very human. Very famous and, if you look carefully enough, still full of secrets that nobody talks about on the official tour.

[Warm voice] Here is your challenge for today: find one thing that surprises you. Not the most obvious thing, not the thing printed on the brochure. Something small. Something that makes you think, wait, why is that there? [pause] That question is the beginning of the best kind of curiosity. [pause] What will you find?`,

  quickHits: `Places like this one see enormous numbers of visitors every year, but here is something interesting: most of them take the exact same route, look at the exact same things, and leave having missed most of what makes it genuinely remarkable. The people who slow down always find more.

The materials used to build and maintain a place like this come from all over the world. Stone, metal, wood, glass — each with its own origin story. If you look at different surfaces closely, you can sometimes see where materials from very different places were joined together, each brought here for a specific reason.

Sounds behave differently in different parts of a space like this. Architects and builders have always known this. Some areas were designed to carry sound a long distance so that many people could hear a single voice. Others were built to absorb it, creating pockets of quiet in the middle of crowds.

The people who work here every day see things that visitors never notice. If you get a chance, ask someone who works here what their favorite detail is. The answers are almost always surprising, and usually reveal something completely invisible to a first-time visitor.

Every place like this has a version of its history that is told officially, and another version that exists in the memories of the people who have lived near it for decades. Both versions are true. Both are incomplete.`,

  history: `[Warm voice] The story of this place does not begin the day it was built. It begins much earlier, with the question of why anyone decided to build here at all. [pause] Location is never random. People choose places for reasons — because of water, or elevation, or the crossing of roads, or because something important had already happened there.

By the time the first stone was laid, or the first structure raised, the location already had a history. Other people had stood on this same ground, made decisions, built things, lost things. [pause] Understanding that gives a different feeling to being here.

The people who created what you see today were working without many of the tools we take for granted. They had to solve problems using ingenuity, hard physical labor, and a particular kind of stubbornness that comes from believing something is worth doing even when it is extremely difficult. Some of them did not live to see it finished.

There were also failures along the way. Plans that had to be abandoned, materials that did not behave as expected, ideas that seemed good in theory but fell apart in practice. The final result you see today is not the first version. It is the version that survived disagreement, compromise, and the slow test of time.

[Gentle voice] What is most remarkable is that places like this have outlasted so much. Wars. Economic collapses. Decades of changing fashion and shifting priorities. Someone in every generation made the decision to maintain it, to restore it, to keep it going. [pause] That decision is still being made today, by people whose names most visitors will never know.

Standing here, you are part of a very long line of people who came to this same spot and felt something. Curiosity. Wonder. History moving through a place that refuses to forget.`,
};

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[^\x00-\x7F\u00A0-\u024F\u2000-\u206F\u2600-\u26FF]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Audio helpers ────────────────────────────────────────────────────────────

/** Fast djb2 hash of the first 600 chars — enough to detect story text changes */
function textHash(text: string): string {
  let h = 5381;
  const limit = Math.min(text.length, 600);
  for (let i = 0; i < limit; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

async function fetchAndCacheAudio(
  stopId: string,
  storyKey: string,
  storyText: string
): Promise<string> {
  // Cache key includes a hash of the story text so stale audio is busted
  // when the API returns a longer story than what was previously cached.
  const hash = textHash(storyText);
  const localUri = `${FileSystem.cacheDirectory}kids_audio_${stopId}_${storyKey}_${hash}.mp3`;

  // Return cached file if it exists and matches the current story
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) return localUri;

  // Fetch audio binary from API with auth
  const token = await AsyncStorage.getItem("auth_token");
  const res = await fetch(
    `${API_BASE}/api/travel/stops/${stopId}/generate-audio`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: storyText, voice: "eva" }),
    }
  );

  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);

  // Convert blob → base64 via FileReader
  const blob = await res.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result = "data:audio/mpeg;base64,AAAA..."
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  await FileSystem.writeAsStringAsync(localUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return localUri;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StoryPlayer() {
  const insets = useSafeAreaInsets();
  const kids = useKids();

  const [storyIdx, setStoryIdx] = useState(kids.currentStoryIndex);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Audio state
  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const story = STORIES[storyIdx];
  const storyKey = story.key;
  const stopId = kids.stopId;
  const stopName = kids.stopName || "Millennium Park";

  const transcript =
    kids.exploreContent?.stories?.[storyKey]?.text ?? MOCK_TEXTS[storyKey] ?? "";
  const rawDuration = kids.exploreContent?.stories?.[storyKey]?.durationSeconds;

  const stopLabel =
    kids.exploreContent?.stopIndex && kids.exploreContent?.totalStops
      ? `STOP ${kids.exploreContent.stopIndex} OF ${kids.exploreContent.totalStops}`
      : "STORY PACK";

  const nextLabels = ["Quick Hits →", "History →", "Continue → Wonder Time"];

  const progressPct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
  const remainingMs = Math.max(0, durationMs - positionMs);

  // ── Audio setup ──────────────────────────────────────────────────────────

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPositionMs(0);
    setDurationMs(0);
  }, []);

  const loadAudio = useCallback(async (idx: number) => {
    await unloadSound();
    setAudioError(null);
    setAudioLoading(true);

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      const key = STORIES[idx].key;
      const text =
        kids.exploreContent?.stories?.[key]?.text ?? MOCK_TEXTS[key] ?? "";

      const uri = await fetchAndCacheAudio(stopId, key, stripEmojis(text));

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 250 },
        (status) => {
          if (!status.isLoaded) return;
          setPositionMs(status.positionMillis);
          setDurationMs(status.durationMillis ?? 0);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
            kids.markStoryComplete(idx);
          }
        }
      );

      soundRef.current = sound;
    } catch (e: any) {
      setAudioError(e?.message ?? "Failed to load audio");
    } finally {
      setAudioLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopId, kids.exploreContent]);

  // Load audio whenever story changes
  useEffect(() => {
    if (stopId) loadAudio(storyIdx);
    return () => { unloadSound(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIdx, stopId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { unloadSound(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Controls ─────────────────────────────────────────────────────────────

  async function handlePlay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!soundRef.current) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch {}
  }

  async function handleRestart() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(0);
      setPositionMs(0);
    } catch {}
  }

  async function handleSkipEnd() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    kids.markStoryComplete(storyIdx);
    await unloadSound();
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (storyIdx > 0) {
      const prev = storyIdx - 1;
      setStoryIdx(prev);
      kids.setCurrentStoryIndex(prev);
    } else {
      unloadSound();
      router.back();
    }
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    kids.markStoryComplete(storyIdx);
    if (storyIdx < 2) {
      const next = storyIdx + 1;
      setStoryIdx(next);
      kids.setCurrentStoryIndex(next);
    } else {
      unloadSound();
      router.push("/kids/wonder");
    }
  }

  function switchStory(i: number) {
    if (i === storyIdx) return;
    setStoryIdx(i);
    kids.setCurrentStoryIndex(i);
  }

  const doneCount = kids.completedStories.filter(Boolean).length;

  // ── Status text ───────────────────────────────────────────────────────────

  let statusText = "Tap to listen";
  if (audioLoading) statusText = "Loading audio…";
  else if (audioError) statusText = "Tap ▶ to retry";
  else if (isPlaying) statusText = "Listening…";
  else if (positionMs > 0) statusText = "Paused";

  // ── Duration display ──────────────────────────────────────────────────────

  const durationLabel = durationMs > 0
    ? fmtMs(durationMs)
    : rawDuration
      ? `${Math.floor(rawDuration / 60)}:${String(rawDuration % 60).padStart(2, "0")}`
      : story.duration;

  return (
    <View style={[s.root, { backgroundColor: K.purple }]}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.circle1} />
        {/* 3 progress dots */}
        <View style={s.dots}>
          {STORIES.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                kids.completedStories[i] && s.dotDone,
                i === storyIdx && !kids.completedStories[i] && s.dotCur,
              ]}
            >
              {i === storyIdx && !kids.completedStories[i] && (
                <View style={s.dotPulse} />
              )}
              {kids.completedStories[i] && (
                <View style={s.dotFull} />
              )}
            </View>
          ))}
        </View>
        {/* Type pills */}
        <View style={s.pills}>
          {STORIES.map((st, i) => (
            <Pressable
              key={st.key}
              style={[s.pill, i === storyIdx && s.pillActive]}
              onPress={() => switchStory(i)}
            >
              <Text style={[s.pillText, i === storyIdx && s.pillTextActive]}>
                {st.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.stopLbl}>{stopLabel}</Text>
        <Text style={s.stopName}>{stopName}</Text>
        <Text style={s.duration}>{story.label} · ~{durationLabel}</Text>
      </View>

      {/* ── Body ── */}
      <View style={s.body}>
        {/* Glass panel */}
        <View style={s.glass}>
          {/* Controls */}
          <View style={s.controls}>
            {/* Skip-back button */}
            <Pressable
              style={[s.skipBtn, { backgroundColor: isPlaying ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.18)" }]}
              onPress={handleRestart}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <View style={{ width: 3, height: 16, borderRadius: 1.5, backgroundColor: K.purple }} />
                <View style={{ width: 0, height: 0,
                  borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 12,
                  borderTopColor: "transparent", borderBottomColor: "transparent",
                  borderRightColor: K.purple,
                }} />
              </View>
            </Pressable>

            {/* Play / Pause button with orange glow ring when playing */}
            <View style={[s.playBtnGlow, isPlaying && s.playBtnGlowActive]}>
              <Pressable
                style={s.playBtn}
                onPress={audioError ? () => loadAudio(storyIdx) : handlePlay}
                disabled={audioLoading}
              >
                {audioLoading ? (
                  <ActivityIndicator color={K.purple} size="large" />
                ) : audioError ? (
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    <View style={{ width: 5, height: 22, borderRadius: 2.5, backgroundColor: K.purple }} />
                    <View style={{ width: 5, height: 22, borderRadius: 2.5, backgroundColor: K.purple }} />
                  </View>
                ) : isPlaying ? (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <View style={{ width: 6, height: 26, borderRadius: 3, backgroundColor: K.purple }} />
                    <View style={{ width: 6, height: 26, borderRadius: 3, backgroundColor: K.purple }} />
                  </View>
                ) : (
                  <View style={{ width: 0, height: 0,
                    borderTopWidth: 14, borderBottomWidth: 14, borderLeftWidth: 24,
                    borderTopColor: "transparent", borderBottomColor: "transparent",
                    borderLeftColor: K.purple,
                    marginLeft: 5,
                  }} />
                )}
              </Pressable>
            </View>

            {/* Skip-forward button */}
            <Pressable
              style={[s.skipBtn, { backgroundColor: isPlaying ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.18)" }]}
              onPress={handleSkipEnd}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <View style={{ width: 0, height: 0,
                  borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 12,
                  borderTopColor: "transparent", borderBottomColor: "transparent",
                  borderLeftColor: K.purple,
                }} />
                <View style={{ width: 3, height: 16, borderRadius: 1.5, backgroundColor: K.purple }} />
              </View>
            </Pressable>
          </View>

          <Text style={s.status}>{statusText}</Text>

          {/* Progress bar */}
          <View style={s.progTrack}>
            <View style={[s.progFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={s.timeRow}>
            <Text style={s.timeText}>{fmtMs(positionMs)}</Text>
            <Text style={s.timeText}>{fmtMs(remainingMs)} remaining</Text>
          </View>
        </View>

        {/* Voice + transcript row */}
        <View style={s.auxRow}>
          <View style={s.voicePill}>
            <Text style={s.voiceText}>{"🔊 Eva ▾"}</Text>
          </View>
          <Pressable onPress={() => setTranscriptOpen(true)}>
            <Text style={s.transcriptBtn} numberOfLines={1}>
              {"📄 Read transcript"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Bottom nav ── */}
      <View style={[s.nav, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.navRow}>
          <Pressable style={s.backBtn} onPress={handleBack}>
            <Text style={{ color: "#fff", fontSize: 20 }}>{"←"}</Text>
          </Pressable>
          <Pressable style={s.nextBtn} onPress={handleNext}>
            <Text style={s.nextBtnText}>{nextLabels[storyIdx]}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Text style={s.handBack}>{"← Back"}</Text>
        </Pressable>
      </View>

      {/* ── Transcript sheet ── */}
      <Modal
        visible={transcriptOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTranscriptOpen(false)}
      >
        <View style={s.tsOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setTranscriptOpen(false)} />
          <View style={s.tsSheet}>
            <TouchableOpacity style={s.tsHandle} onPress={() => setTranscriptOpen(false)} />
            <View style={s.tsHead}>
              <Text style={s.tsTitle}>Transcript</Text>
              <Pressable style={s.tsClose} onPress={() => setTranscriptOpen(false)}>
                <Text style={{ color: K.muted, fontSize: 16 }}>{"×"}</Text>
              </Pressable>
            </View>
            <ScrollView style={s.tsScroll} contentContainerStyle={{ padding: 20 }}>
              {transcript.split("\n\n").map((para, i) => (
                <Text key={i} style={s.tsBody}>{para}{"\n"}</Text>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: K.purple,
    paddingHorizontal: 20,
    paddingBottom: 22,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dots: { flexDirection: "row", gap: 5, marginBottom: 18, zIndex: 2 },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  dotDone: { backgroundColor: "rgba(255,255,255,0.25)" },
  dotCur: { backgroundColor: "rgba(255,255,255,0.25)" },
  dotFull: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  dotPulse: {
    position: "absolute",
    top: 0, left: 0,
    width: "60%", height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  pills: { flexDirection: "row", gap: 6, marginBottom: 16 },
  pill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
  },
  pillActive: { backgroundColor: "#fff", borderColor: "#fff" },
  pillText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  pillTextActive: { color: K.purple },
  stopLbl: {
    fontFamily: F.bold, fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5,
  },
  stopName: { fontFamily: F.bold, fontSize: 22, color: "#fff", lineHeight: 28 },
  duration: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 3 },

  body: {
    flex: 1,
    backgroundColor: K.purple,
    paddingHorizontal: 24,
    paddingBottom: 20,
    justifyContent: "center",
  },
  glass: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 28,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 16,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginBottom: 20,
  },
  skipBtn: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  playBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  playBtnGlow: {
    borderRadius: 50,
    borderWidth: 3.5,
    borderColor: "transparent",
    padding: 3,
  },
  playBtnGlowActive: {
    borderColor: "#F97316",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  status: {
    fontFamily: F.bold, fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center", marginBottom: 16,
  },
  progTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progFill: { height: "100%", backgroundColor: "#fff", borderRadius: 3 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { fontFamily: F.semibold, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  auxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voicePill: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  voiceText: { fontFamily: F.semibold, fontSize: 13, color: K.deep },
  transcriptBtn: {
    fontFamily: F.semibold, fontSize: 13, color: "#fff",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(255,255,255,0.5)",
  },
  nav: {
    backgroundColor: K.purple,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  navRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  backBtn: {
    width: 54, height: 54, borderRadius: 16,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  nextBtn: {
    flex: 1, height: 54,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  nextBtnText: { fontFamily: F.bold, fontSize: 17, color: K.purple },
  handBack: {
    fontFamily: F.semibold, fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center", paddingVertical: 6,
  },
  tsOverlay: {
    flex: 1,
    backgroundColor: "rgba(28,25,23,0.5)",
    justifyContent: "flex-end",
  },
  tsSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    height: "78%",
  },
  tsHandle: {
    width: 36, height: 4,
    backgroundColor: "rgba(28,25,23,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 14,
  },
  tsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(28,25,23,0.08)",
  },
  tsTitle: { fontFamily: F.bold, fontSize: 17, color: K.deep },
  tsClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F5F2EE",
    alignItems: "center", justifyContent: "center",
  },
  tsScroll: { flex: 1 },
  tsBody: {
    fontFamily: F.medium, fontSize: 16, color: K.deep,
    lineHeight: 28, marginBottom: 4,
  },
});
