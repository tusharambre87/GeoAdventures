import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
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

import { useKids } from "@/lib/kidsContext";
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

export default function StoryPlayer() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const [storyIdx, setStoryIdx] = useState(kids.currentStoryIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const playAnim = useRef<Animated.CompositeAnimation | null>(null);

  const story = STORIES[storyIdx];
  const stopName = kids.stopName || "Millennium Park";

  const nextLabels = ["Quick Hits \u2192", "History \u2192", "Continue \u2192 Wonder Time"];

  function handlePlay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      playAnim.current?.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playAnim.current = Animated.timing(progress, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: false,
      });
      playAnim.current.start(({ finished }) => {
        if (finished) {
          setIsPlaying(false);
          kids.markStoryComplete(storyIdx);
        }
      });
    }
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
      kids.setCurrentStoryIndex(storyIdx - 1);
      progress.setValue(0);
      setIsPlaying(false);
    } else {
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
      progress.setValue(0);
      setIsPlaying(false);
    } else {
      router.push("/kids/wonder");
    }
  }

  const progWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const doneCount = kids.completedStories.filter(Boolean).length;

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
              onPress={() => {
                setStoryIdx(i);
                kids.setCurrentStoryIndex(i);
                progress.setValue(0);
                setIsPlaying(false);
              }}
            >
              <Text style={[s.pillText, i === storyIdx && s.pillTextActive]}>
                {st.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.stopLbl}>STOP 1 OF 5</Text>
        <Text style={s.stopName}>{stopName}</Text>
        <Text style={s.duration}>{story.label} · ~{story.duration}</Text>
      </View>

      {/* ── Body (purple, glass panel vertically centered) ── */}
      <View style={s.body}>
        {/* Glass panel */}
        <View style={s.glass}>
          {/* Controls */}
          <View style={s.controls}>
            <Pressable
              style={s.skipBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                progress.setValue(0);
                setIsPlaying(false);
              }}
            >
              <Text style={{ color: "#fff", fontSize: 22 }}>{"⏮"}</Text>
            </Pressable>
            <Pressable style={s.playBtn} onPress={handlePlay}>
              <Text style={{ color: K.purple, fontSize: 32, paddingLeft: isPlaying ? 0 : 4 }}>
                {isPlaying ? "⏸" : "\u25B6"}
              </Text>
            </Pressable>
            <Pressable
              style={s.skipBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                kids.markStoryComplete(storyIdx);
                progress.setValue(0);
                setIsPlaying(false);
              }}
            >
              <Text style={{ color: "#fff", fontSize: 22 }}>{"⏭"}</Text>
            </Pressable>
          </View>
          <Text style={s.status}>{isPlaying ? "Now playing…" : "Tap to listen"}</Text>
          {/* Progress bar */}
          <View style={s.progTrack}>
            <Animated.View style={[s.progFill, { width: progWidth }]} />
          </View>
          <View style={s.timeRow}>
            <Text style={s.timeText}>0:00</Text>
            <Text style={s.timeText}>{story.duration} remaining</Text>
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

      {/* ── Bottom nav (purple) ── */}
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
          <Text style={s.handBack}>{"\u2190 Back"}</Text>
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
              {(MOCK_TEXTS[story.key] ?? "").split("\n\n").map((para, i) => (
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
  dots: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 18,
    zIndex: 2,
  },
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  dotPulse: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "60%",
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  pills: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  pillText: {
    fontFamily: F.bold,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  pillTextActive: {
    color: K.purple,
  },
  stopLbl: {
    fontFamily: F.bold,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  stopName: {
    fontFamily: F.bold,
    fontSize: 22,
    color: "#fff",
    lineHeight: 28,
  },
  duration: {
    fontFamily: F.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 3,
  },
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  status: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginBottom: 16,
  },
  progTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
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
  voiceText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.deep,
  },
  transcriptBtn: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: "#fff",
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
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  backBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    height: 54,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  nextBtnText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: K.purple,
  },
  handBack: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    paddingVertical: 6,
  },
  tsOverlay: {
    flex: 1,
    backgroundColor: "rgba(28,25,23,0.5)",
    justifyContent: "flex-end",
  },
  tsSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "78%",
  },
  tsHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(28,25,23,0.15)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 14,
  },
  tsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(28,25,23,0.08)",
  },
  tsTitle: {
    fontFamily: F.bold,
    fontSize: 17,
    color: K.deep,
  },
  tsClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5F2EE",
    alignItems: "center",
    justifyContent: "center",
  },
  tsScroll: { flex: 1 },
  tsBody: {
    fontFamily: F.medium,
    fontSize: 16,
    color: K.deep,
    lineHeight: 28,
    marginBottom: 4,
  },
});
