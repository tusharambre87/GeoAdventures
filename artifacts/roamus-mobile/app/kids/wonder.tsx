import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { kidsAPI } from "@/lib/apiClient";
import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";

const K = {
  purple: "#7C3AED",
  purpleLt: "#F5F3FF",
  bg: "#FFF8F0",
  card: "#FFFFFF",
  deep: "#1C1917",
  muted: "#78716C",
  border: "rgba(28,25,23,0.08)",
  borderMed: "rgba(28,25,23,0.14)",
} as const;

const TOPIC_CHIPS = [
  "🌿 nature",
  "🦎 animals",
  "📜 history",
  "😮 it's huge!",
  "✨ beautiful",
  "💬 other",
];

export default function WonderTime() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const [selected, setSelected] = useState<string[]>(kids.selectedTopics);
  const [text, setText] = useState(kids.wonderObservation);
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const stopName = kids.stopName || "Millennium Park";
  const topicChips =
    kids.exploreContent?.wonderTopics?.length
      ? kids.exploreContent.wonderTopics
      : TOPIC_CHIPS;

  function toggleChip(chip: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  }

  async function handleSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    kids.setWonderObservation(text);
    kids.setSelectedTopics(selected);
    setSubmitting(true);
    try {
      if (kids.stopId) {
        await kidsAPI.postWonderResponse(kids.stopId, {
          explorerId: kids.explorerId || "explorer",
          topic: selected.join(", ") || "general",
          observation: text || "—",
        });
      }
    } catch {
    }
    setSubmitting(false);
    router.push("/kids/mission-1");
  }

  return (
    <View style={[s.root, { backgroundColor: K.bg }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Purple header ── */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <View style={s.circle} />
          <Text style={s.headerLabel}>{"🤔 WONDER TIME"}</Text>
          <Text style={s.headerTitle}>What are you curious about?</Text>
          <Text style={s.headerSub}>{stopName}</Text>
        </View>

        {/* ── White card ── */}
        <View style={s.card}>
          <Text style={s.question}>
            {"What's one thing you're wondering about this place?"}
          </Text>
          {/* Topic chips */}
          <View style={s.chips}>
            {topicChips.map((chip) => {
              const on = selected.includes(chip);
              return (
                <Pressable
                  key={chip}
                  style={[s.chip, on && s.chipOn]}
                  onPress={() => toggleChip(chip)}
                >
                  <Text style={[s.chipText, on && s.chipTextOn]}>{chip}</Text>
                </Pressable>
              );
            })}
          </View>
          {/* Textarea */}
          <TextInput
            style={[s.textarea, focused && s.textareaFocused]}
            placeholder="Anything you notice…"
            placeholderTextColor={K.muted}
            multiline
            numberOfLines={4}
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            textAlignVertical="top"
          />
          {/* Submit row */}
          <View style={s.btnRow}>
            <Pressable
              style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={s.submitText}>
                {submitting ? "Saving…" : "📍 I found something!"}
              </Text>
            </Pressable>
            <Pressable style={s.micBtn}>
              <Text style={{ fontSize: 22 }}>{"🎤"}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom nav ── */}
      <View style={[s.nav, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.navRow}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>{"←"}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.nextBtn, pressed && { opacity: 0.88 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              kids.setWonderObservation(text);
              kids.setSelectedTopics(selected);
              router.push("/kids/mission-1");
            }}
          >
            <Text style={s.nextBtnText}>{"On to missions \u2192"}</Text>
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    backgroundColor: K.purple,
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: "hidden",
  },
  circle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  headerLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: F.bold,
    fontSize: 26,
    color: "#fff",
    lineHeight: 32,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: K.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: K.border,
  },
  question: {
    fontFamily: F.bold,
    fontSize: 17,
    color: K.deep,
    lineHeight: 24,
    marginBottom: 16,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: K.bg,
    borderWidth: 1.5,
    borderColor: K.border,
  },
  chipOn: {
    backgroundColor: "#F5F3FF",
    borderColor: K.purple,
  },
  chipText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.deep,
  },
  chipTextOn: {
    color: K.purple,
  },
  textarea: {
    backgroundColor: K.bg,
    borderWidth: 1.5,
    borderColor: K.border,
    borderRadius: 13,
    padding: 13,
    fontFamily: F.regular,
    fontSize: 15,
    color: K.deep,
    minHeight: 96,
    marginBottom: 12,
  },
  textareaFocused: {
    borderColor: K.purple,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: K.purple,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: K.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  submitText: {
    fontFamily: F.bold,
    fontSize: 15,
    color: "#fff",
  },
  micBtn: {
    width: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: K.border,
    backgroundColor: K.card,
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    backgroundColor: K.card,
    borderTopWidth: 1,
    borderTopColor: K.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  backBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: K.borderMed,
    backgroundColor: K.card,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontFamily: F.bold,
    fontSize: 20,
    color: K.deep,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: K.purple,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    shadowColor: K.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  nextBtnText: {
    fontFamily: F.bold,
    fontSize: 16,
    color: "#fff",
  },
  handBack: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.muted,
    textAlign: "center",
    paddingVertical: 6,
  },
});
