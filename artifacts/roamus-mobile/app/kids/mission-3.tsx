import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  green: "#16A34A",
  border: "rgba(28,25,23,0.08)",
  borderMed: "rgba(28,25,23,0.14)",
} as const;

const MOCK_PHOTO = {
  instruction: "Find the most interesting detail at this stop and take a photo of it! Look for something others might walk right past.",
  xp: 5,
};

export default function Mission3() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const instruction =
    kids.exploreContent?.missions[2]?.type === "photo"
      ? kids.exploreContent.missions[2].instruction
      : MOCK_PHOTO.instruction;

  async function handleTakePhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera needed",
        "Please allow camera access to take your explorer photo!"
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handlePickPhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: K.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 16 }]}>
          <Text style={s.counter}>Mission 3 of 3</Text>
          <View style={s.missionDots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  s.mDot,
                  i < 2 && s.mDotDone,
                  i === 2 && s.mDotCur,
                ]}
              >
                <Text style={[s.mDotText, s.mDotTextAlt]}>
                  {i < 2 ? "✓" : "3"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── White card ── */}
        <View style={s.card}>
          <Text style={s.typeLabel}>{"📸 PHOTO · +5 XP"}</Text>
          <Text style={s.question}>{instruction}</Text>

          {photoUri ? (
            <View style={s.photoPreview}>
              <Image source={{ uri: photoUri }} style={s.previewImg} />
              <Pressable style={s.retakeBtn} onPress={() => setPhotoUri(null)}>
                <Text style={s.retakeText}>Retake photo</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.photoCenter}>
              <Text style={s.cameraIcon}>{"📷"}</Text>
              <Text style={s.photoSub}>Find something amazing to capture!</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [s.photoBtn, pressed && { opacity: 0.88 }]}
            onPress={handleTakePhoto}
          >
            <Text style={s.photoBtnText}>
              {photoUri ? "📷 Retake Photo" : "📷 Take a photo!"}
            </Text>
          </Pressable>
          <Pressable style={s.libraryLink} onPress={handlePickPhoto}>
            <Text style={s.libraryLinkText}>Or choose from library</Text>
          </Pressable>
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              if (kids.stopId) {
                kidsAPI.completeMission(kids.stopId, {
                  explorerId: "default",
                  missionId: "photo",
                  answer: photoUri ?? "skipped",
                }).catch(() => {});
              }
              router.push("/kids/celebration");
            }}
          >
            <Text style={s.nextBtnText}>{"Finish! \uD83C\uDF89"}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.dismiss();
          }}
        >
          <Text style={s.handBack}>{"\u2190 Hand back to parent"}</Text>
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
    color: K.purple,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  question: {
    fontFamily: F.bold,
    fontSize: 19,
    color: K.deep,
    lineHeight: 27,
    marginBottom: 20,
  },
  photoCenter: {
    alignItems: "center",
    paddingVertical: 16,
  },
  cameraIcon: {
    fontSize: 64,
    marginBottom: 10,
  },
  photoSub: {
    fontFamily: F.medium,
    fontSize: 14,
    color: K.muted,
  },
  photoPreview: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  previewImg: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  retakeBtn: {
    alignItems: "center",
    paddingTop: 10,
  },
  retakeText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.muted,
  },
  photoBtn: {
    backgroundColor: K.purple,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: K.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 4,
  },
  photoBtnText: {
    fontFamily: F.bold,
    fontSize: 17,
    color: "#fff",
  },
  libraryLink: {
    alignItems: "center",
    paddingTop: 12,
  },
  libraryLinkText: {
    fontFamily: F.medium,
    fontSize: 13,
    color: K.muted,
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
