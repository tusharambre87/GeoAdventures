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
  bg: "#FFF8F0",
  card: "#FFFFFF",
  deep: "#1C1917",
  muted: "#78716C",
  green: "#16A34A",
  greenLt: "#DCFCE7",
  border: "rgba(28,25,23,0.08)",
  borderMed: "rgba(28,25,23,0.14)",
} as const;

const MOCK_OBS = {
  instruction: "Look around carefully. Describe three things you see that surprise you or seem unusual about this place.",
  xp: 5,
};

export default function Mission2() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const [obs, setObs] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const instruction =
    kids.exploreContent?.missions[1]?.type === "observation"
      ? kids.exploreContent.missions[1].instruction
      : MOCK_OBS.instruction;

  async function handleSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    kids.setWonderObservation(obs);
    setSubmitting(true);
    try {
      if (kids.stopId) {
        await kidsAPI.completeMission(kids.stopId, {
          explorerId: kids.explorerId || "explorer",
          missionId: "observation",
          answer: obs || "—",
        });
      }
    } catch {
    }
    setSubmitting(false);
    router.push("/kids/mission-3");
  }

  return (
    <View style={[s.root, { backgroundColor: K.bg }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 16 }}
      >
        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Text style={s.counter}>Mission 2 of 3</Text>
          <View style={s.missionDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  s.mDot,
                  i === 0 && s.mDotDone,
                  i === 1 && s.mDotCur,
                ]}
              >
                <Text style={[s.mDotText, (i === 0 || i === 1) && s.mDotTextAlt]}>
                  {i === 0 ? "✓" : i + 1}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── White card ── */}
        <View style={s.card}>
          <Text style={s.typeLabel}>{"👁 OBSERVATION · +5 XP"}</Text>
          <Text style={s.question}>{instruction}</Text>
          <TextInput
            style={[s.textarea, focused && s.textareaFocused]}
            placeholder="Describe what you notice…"
            placeholderTextColor={K.muted}
            multiline
            numberOfLines={5}
            value={obs}
            onChangeText={setObs}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            textAlignVertical="top"
          />
          <View style={s.btnRow}>
            <Pressable
              style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={s.submitText}>
                {submitting ? "Saving…" : "Save memory"}
              </Text>
            </Pressable>
            <Pressable style={s.micBtn}>
              <Text style={{ fontSize: 24 }}>{"🎤"}</Text>
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
              router.push("/kids/mission-3");
            }}
          >
            <Text style={s.nextBtnText}>{"Next \u2192"}</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontFamily: F.bold,
    fontSize: 13,
    color: K.muted,
  },
  missionDots: {
    flexDirection: "row",
    gap: 8,
  },
  mDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: K.bg,
    borderWidth: 1.5,
    borderColor: K.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mDotDone: {
    backgroundColor: K.green,
    borderColor: K.green,
  },
  mDotCur: {
    backgroundColor: K.purple,
    borderColor: K.purple,
  },
  mDotText: {
    fontFamily: F.bold,
    fontSize: 12,
    color: K.muted,
  },
  mDotTextAlt: {
    color: "#fff",
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: K.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: K.border,
  },
  typeLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    color: K.green,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  question: {
    fontFamily: F.bold,
    fontSize: 19,
    color: K.deep,
    lineHeight: 27,
    marginBottom: 16,
  },
  textarea: {
    backgroundColor: K.bg,
    borderWidth: 1.5,
    borderColor: K.border,
    borderRadius: 14,
    padding: 14,
    fontFamily: F.regular,
    fontSize: 16,
    color: K.deep,
    minHeight: 120,
    marginTop: 4,
    marginBottom: 12,
  },
  textareaFocused: {
    borderColor: K.green,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: K.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: K.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  submitText: {
    fontFamily: F.bold,
    fontSize: 16,
    color: "#fff",
  },
  micBtn: {
    width: 52,
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
    fontSize: 17,
    color: "#fff",
  },
  handBack: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: K.muted,
    textAlign: "center",
    paddingVertical: 6,
  },
});
