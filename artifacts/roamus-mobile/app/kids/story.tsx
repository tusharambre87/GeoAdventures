import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
  { label: "\uD83D\uDCD6 Main Story", duration: "5:12", key: "main" as const },
  { label: "\u26A1 Quick Hits", duration: "2:30", key: "quickHits" as const },
  { label: "\uD83C\uDFDB History", duration: "3:45", key: "history" as const },
];



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

  // Fetch audio binary from API with auth.
  // Retry up to 3 attempts with increasing delay — cold-start TTS takes
  // several seconds server-side; the first attempt often lands before
  // synthesis completes and returns non-200.
  const token = await AsyncStorage.getItem("auth_token");
  const retryDelays = [0, 2000, 4000];
  let res: Response | null = null;
  let lastFetchErr: unknown = null;
  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    if (retryDelays[attempt]) await new Promise(r => setTimeout(r, retryDelays[attempt]));
    try {
      const r = await fetch(
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
      if (r.ok) { res = r; break; }
      lastFetchErr = new Error(`Audio fetch failed: ${r.status}`);
    } catch (e) {
      lastFetchErr = e;
    }
  }
  if (!res) throw lastFetchErr ?? new Error("Audio fetch failed");

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
  const params = useLocalSearchParams<{ minChildAge?: string }>();
  const minChildAge = parseInt(params.minChildAge ?? '99');

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
  const storyLoading = kids.isLoadingExplore;
  const storyFetchError = kids.exploreError;

  const [callbackLine, setCallbackLine] = useState<string | null>(null);
  const cbFadeAnim = useRef(new Animated.Value(0)).current;

  const transcript =
    kids.exploreContent?.stories?.[storyKey]?.text ?? "";
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
        kids.exploreContent?.stories?.[key]?.text ?? "";
      if (!text) throw new Error("Story not loaded yet — please go back and try again");

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

  // Auto-play for very young children (age ≤ 5): speak the transcript on load
  useEffect(() => {
    if (minChildAge > 4 || !transcript || storyIdx !== 0) return;
    const timer = setTimeout(() => {
      Speech.speak(stripEmojis(transcript), { language: 'en', rate: 0.85 });
    }, 600);
    return () => { clearTimeout(timer); Speech.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minChildAge, transcript]);

  // Fade in the callback banner whenever a non-null line arrives
  useEffect(() => {
    if (!callbackLine) {
      cbFadeAnim.setValue(0);
      return;
    }
    Animated.timing(cbFadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [callbackLine, cbFadeAnim]);

  // Background fetch: personalized callback line from an earlier kid quote.
  // Hard 2-second display window — responses arriving after the deadline are ignored.
  // Resets on every stop/trip change so stale text never bleeds across stops.
  useEffect(() => {
    const tripId = kids.tripId;
    // Reset immediately so prior stop's callback never shows for a new stop
    setCallbackLine(null);
    if (!stopId || !tripId) return;
    let cancelled = false;
    const DISPLAY_DEADLINE_MS = 2000;
    const startedAt = Date.now();
    const deadlineTimer = setTimeout(() => { cancelled = true; }, DISPLAY_DEADLINE_MS);
    (async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const res = await fetch(
          `${API_BASE}/api/travel/trips/${tripId}/stops/${stopId}/story-callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (cancelled || !res.ok) return;
        // Double-check elapsed time in case the network response arrived just after deadline
        if (Date.now() - startedAt > DISPLAY_DEADLINE_MS) return;
        const data = await res.json();
        if (!cancelled && data.callbackLine && typeof data.callbackLine === "string") {
          setCallbackLine(data.callbackLine);
        } else {
          // Explicitly clear so null responses don't leave stale state
          setCallbackLine(null);
        }
      } catch (_err) {
        // fail silently — story always shows as-is
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(deadlineTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopId, kids.tripId]);

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
  if (storyLoading) statusText = "Loading story…";
  else if (storyFetchError) statusText = "Story’s taking a moment — tap ▶ to try again.";
  else if (audioLoading) statusText = "Loading audio…";
  else if (audioError) statusText = audioError.includes("not loaded") ? "Story loading — please go back and retry" : "Tap ▶ to retry";
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
        {/* Personalized callback banner — fades in above the glass panel */}
        {callbackLine ? (
          <Animated.View style={[s.cbBanner, s.cbBannerMain, { opacity: cbFadeAnim }]}>
            <Text style={s.cbText}>{callbackLine}</Text>
          </Animated.View>
        ) : null}

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
                disabled={audioLoading || storyLoading || storyFetchError}
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
            <Text style={s.voiceText}>{"\uD83D\uDD0A Eva ▾"}</Text>
          </View>
          <Pressable onPress={() => setTranscriptOpen(true)}>
            <Text style={s.transcriptBtn} numberOfLines={1}>
              {"\uD83D\uDCC4 Read transcript"}
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
              {callbackLine ? (
                <View style={s.cbBanner}>
                  <Text style={s.cbText}>{callbackLine}</Text>
                </View>
              ) : null}
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
  cbBanner: {
    backgroundColor: "#F0EBFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#7C3AED",
  },
  cbBannerMain: {
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 0,
  },
  cbText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: "#4C1D95",
    lineHeight: 22,
    fontStyle: "italic",
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
