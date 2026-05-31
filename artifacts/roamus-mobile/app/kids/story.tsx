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
  main: `Welcome to this incredible stop on your adventure!\n\nThis place has a fascinating story that stretches back hundreds of years. Explorers just like you have stood here and marveled at what they saw.\n\nThe architecture, the sounds, the smells — everything here tells a story. Look around. What do you notice first?\n\nLegend has it that if you look carefully, you can spot secret symbols hidden by the original builders. They left clues for curious young adventurers to find.\n\nYour mission today starts with simply being present — look up, look around, and let the story come to you.`,
  quickHits: `🌟 This place is one of the most visited spots in the entire city — over 2 million people each year!\n\n🎨 The design took 14 years to complete.\n\n🌍 People come from over 50 countries to visit here.\n\n🦉 At night, owls sometimes nest in the towers!\n\n🎵 On special days, you can hear live music echoing through the halls.`,
  history: `The history of this remarkable place begins long before any of us were born.\n\nOriginal inhabitants of this land used this very spot for ceremonies and celebrations for thousands of years.\n\nWhen European settlers arrived, they recognized the special nature of this location and made it a place of commerce and community.\n\nThe famous structure you see today was built in the early 20th century, and has survived wars, floods, and great social change.\n\nIt has been a place of protest, of joy, of mourning, and of hope. Today, it stands as a symbol of everything your city has been through — and everything it hopes to become.`,
};

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Audio helpers ────────────────────────────────────────────────────────────

async function fetchAndCacheAudio(
  stopId: string,
  storyKey: string,
  storyText: string
): Promise<string> {
  const localUri = `${FileSystem.cacheDirectory}kids_audio_${stopId}_${storyKey}.mp3`;

  // Return cached file if it exists
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

      const uri = await fetchAndCacheAudio(stopId, key, text);

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

  let statusText = "Tap ▶ to listen";
  if (audioLoading) statusText = "Loading audio…";
  else if (audioError) statusText = "Tap ▶ to retry";
  else if (isPlaying) statusText = "Now playing…";
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
            <Pressable style={s.skipBtn} onPress={handleRestart}>
              <Text style={{ color: "#fff", fontSize: 22 }}>{"⏮"}</Text>
            </Pressable>

            <Pressable
              style={s.playBtn}
              onPress={audioError ? () => loadAudio(storyIdx) : handlePlay}
              disabled={audioLoading}
            >
              {audioLoading ? (
                <ActivityIndicator color={K.purple} size="large" />
              ) : (
                <Text style={{ color: K.purple, fontSize: 32, paddingLeft: isPlaying ? 0 : 4 }}>
                  {audioError ? "↺" : isPlaying ? "⏸" : "▶"}
                </Text>
              )}
            </Pressable>

            <Pressable style={s.skipBtn} onPress={handleSkipEnd}>
              <Text style={{ color: "#fff", fontSize: 22 }}>{"⏭"}</Text>
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
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
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
