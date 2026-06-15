import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import type { Mission } from "@/lib/apiClient";
import { useSpeech } from "@/lib/useSpeech";
import { SpeakButton } from "@/components/SpeakButton";
import { useSpeechToText } from "@/lib/useSpeechToText";
import { F } from "@/lib/tokens";

const K = {
  purple:    "#7C3AED",
  purpleLt:  "#F5F3FF",
  bg:        "#FFF8F0",
  card:      "#FFFFFF",
  deep:      "#1C1917",
  muted:     "#78716C",
  green:     "#16A34A",
  border:    "rgba(28,25,23,0.08)",
  borderMed: "rgba(28,25,23,0.14)",
} as const;

const TYPE_COLOR: Record<Mission["type"], string> = {
  detective:    "#7C3AED",
  scientist:    "#2563EB",
  photographer: "#7C3AED",
  reporter:     "#16A34A",
  collector:    "#D97706",
  decider:      "#D97706",
  family:       "#7C3AED",
};

const TYPE_LABEL: Record<Mission["type"], string> = {
  detective:    "DETECTIVE",
  scientist:    "SCIENTIST",
  photographer: "PHOTOGRAPHER",
  reporter:     "REPORTER",
  collector:    "COLLECTOR",
  decider:      "DECIDER",
  family:       "FAMILY MISSION",
};

export interface MissionCardProps {
  mission: Mission;
  index: number;
  onComplete: (proof: string | null) => void;
  isSubmitting?: boolean;
}

export function MissionCard({ mission, index, onComplete, isSubmitting }: MissionCardProps) {
  const { speak, isSpeaking } = useSpeech();
  const { isListening, isTranscribing, start: startListening, stop: stopListening } = useSpeechToText();
  const [textProof, setTextProof] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [textFocused, setTextFocused] = useState(false);

  const color = TYPE_COLOR[mission.type];
  const label = `${TYPE_LABEL[mission.type]} \u00b7 +${mission.xp} XP`;

  async function takePhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera needed", "Please allow camera access to complete this mission!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  return (
    <View style={s.card}>

      {mission.type === "family" && (
        <View style={[s.familyBanner, { borderColor: color }]}>
          <Text style={[s.familyBannerText, { color }]}>
            {"For the whole family \u2014 everyone joins this one!"}
          </Text>
        </View>
      )}

      <Text style={[s.typeLabel, { color }]}>{label}</Text>

      <View style={s.instrRow}>
        <Text style={[s.instruction, { flex: 1, marginRight: 8 }]}>
          {mission.instruction}
        </Text>
        <SpeakButton
          text={mission.instruction}
          isSpeaking={isSpeaking}
          onPress={speak}
          size="sm"
          color={color}
        />
      </View>

      {mission.proof === "photo" && (
        <>
          {photoUri ? (
            <View style={s.photoPreview}>
              <Image source={{ uri: photoUri }} style={s.previewImg} />
              <Pressable style={s.retakeBtn} onPress={() => setPhotoUri(null)}>
                <Text style={s.retakeText}>Retake photo</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.photoCtr}>
              <Text style={s.cameraIcon}>{"\uD83D\uDCF7"}</Text>
              <Text style={s.photoSub}>Find something amazing to capture!</Text>
            </View>
          )}
          <Pressable
            style={[s.actionBtn, { backgroundColor: color }]}
            onPress={takePhoto}
          >
            <Text style={s.actionBtnText}>
              {photoUri ? "\uD83D\uDCF7 Retake Photo" : "\uD83D\uDCF7 Take a photo!"}
            </Text>
          </Pressable>
          <Pressable style={s.libraryLink} onPress={pickPhoto}>
            <Text style={s.libraryLinkText}>Or choose from library</Text>
          </Pressable>
          {!!photoUri && (
            <Pressable
              style={[s.actionBtn, { backgroundColor: K.green, marginTop: 10 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onComplete(photoUri);
              }}
              disabled={isSubmitting}
            >
              <Text style={s.actionBtnText}>
                {isSubmitting ? "Saving..." : "Submit photo"}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {mission.proof === "text" && (
        <>
          <TextInput
            style={[s.textarea, textFocused && { borderColor: color }]}
            placeholder="Write your answer here..."
            placeholderTextColor={K.muted}
            multiline
            numberOfLines={4}
            value={textProof}
            onChangeText={setTextProof}
            onFocus={() => setTextFocused(true)}
            onBlur={() => setTextFocused(false)}
            textAlignVertical="top"
          />
          <View style={s.btnRow}>
            <Pressable
              style={[s.actionBtn, { flex: 1, backgroundColor: color }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onComplete(textProof || null);
              }}
              disabled={isSubmitting}
            >
              <Text style={s.actionBtnText}>
                {isSubmitting ? "Saving..." : "Save answer"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                s.micBtn,
                isListening && { borderColor: color, backgroundColor: K.purpleLt },
                isTranscribing && { opacity: 0.6 },
              ]}
              disabled={isTranscribing}
              onPress={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening((t) => setTextProof((p) => p ? p + " " + t : t));
                }
              }}
            >
              <Ionicons
                name="mic-off"
                size={22}
                color={isListening ? color : "#E8692A"}
              />
            </Pressable>
          </View>
        </>
      )}

      {(mission.proof === "tap" || mission.proof === "number") && (
        <Pressable
          style={[s.actionBtn, { backgroundColor: color, marginTop: 16 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onComplete("completed");
          }}
          disabled={isSubmitting}
        >
          <Text style={s.actionBtnText}>
            {isSubmitting ? "Saving..." : "Mark complete"}
          </Text>
        </Pressable>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    backgroundColor: K.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: K.border,
  },
  familyBanner: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  familyBannerText: {
    fontFamily: F.bold,
    fontSize: 13,
    textAlign: "center",
  },
  typeLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  instrRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  instruction: {
    fontFamily: F.bold,
    fontSize: 19,
    color: K.deep,
    lineHeight: 27,
  },
  photoCtr: {
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
    marginBottom: 12,
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
  textarea: {
    backgroundColor: K.bg,
    borderWidth: 1.5,
    borderColor: K.border,
    borderRadius: 14,
    padding: 14,
    fontFamily: F.regular,
    fontSize: 16,
    color: K.deep,
    minHeight: 110,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  actionBtnText: {
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
  libraryLink: {
    alignItems: "center",
    paddingTop: 10,
  },
  libraryLinkText: {
    fontFamily: F.medium,
    fontSize: 13,
    color: K.muted,
  },
});
