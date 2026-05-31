import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";

const K = {
  purple: "#7C3AED",
  purpleLt: "#F5F3FF",
  bg: "#FFF8F0",
  card: "#FFFFFF",
  deep: "#1C1917",
  muted: "#78716C",
  amber: "#D97706",
  border: "rgba(28,25,23,0.08)",
  borderPurple: "rgba(124,58,237,0.15)",
} as const;

export default function Celebration() {
  const insets = useSafeAreaInsets();
  const kids = useKids();
  const starScale = useRef(new Animated.Value(0)).current;
  const starRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(starScale, {
          toValue: 1.2,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(starRotate, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(starScale, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotate = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-15deg", "4deg"],
  });

  const stopName = kids.stopName || "This Stop";
  const wonder = kids.wonderObservation || "Something amazing!";

  return (
    <View style={[s.root, { backgroundColor: K.card }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.inner,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Star */}
        <Animated.Text
          style={[s.starEmoji, { transform: [{ scale: starScale }, { rotate }] }]}
        >
          {"⭐"}
        </Animated.Text>

        <Text style={s.title}>You leveled up!</Text>
        <Text style={s.sub}>{stopName}</Text>

        {/* Achievement rows */}
        <View style={s.list}>
          <View style={s.row}>
            <Text style={s.rowIcon}>{"🎧"}</Text>
            <Text style={s.rowText}>You listened to the story</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowIcon}>{"🎯"}</Text>
            <Text style={s.rowText}>You completed 3 missions!</Text>
          </View>
          <View style={[s.row, s.rowPurple]}>
            <Text style={s.rowIcon}>{"💬"}</Text>
            <Text style={[s.rowText, s.rowTextPurple]} numberOfLines={2}>
              {`You noticed "${wonder.length > 50 ? wonder.slice(0, 50) + "…" : wonder}"`}
            </Text>
          </View>
        </View>

        {/* XP badge */}
        <View style={s.xpBadge}>
          <Text style={s.xpText}>{"✨ +15 XP earned"}</Text>
        </View>

        {/* Primary button */}
        <Pressable
          style={({ pressed }) => [s.primaryBtn, pressed && { transform: [{ scale: 0.98 }] }]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.navigate("/(tabs)/today" as never);
          }}
        >
          <Text style={s.primaryBtnText}>{"👆 Show your parent!"}</Text>
        </Pressable>

        {/* Game link */}
        <Pressable
          style={s.gameLink}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/kids/games");
          }}
        >
          <Text style={s.gameLinkText}>{"🎮 Play a quick game \u2192"}</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  starEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 30,
    color: "#1C1917",
    marginBottom: 5,
    textAlign: "center",
  },
  sub: {
    fontFamily: F.bold,
    fontSize: 15,
    color: K.purple,
    marginBottom: 28,
    textAlign: "center",
  },
  list: {
    width: "100%",
    gap: 10,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: K.bg,
    borderWidth: 1,
    borderColor: K.border,
  },
  rowPurple: {
    backgroundColor: K.purpleLt,
    borderColor: K.borderPurple,
  },
  rowIcon: {
    fontSize: 22,
    flexShrink: 0,
  },
  rowText: {
    fontFamily: F.bold,
    fontSize: 14,
    color: "#1C1917",
    flex: 1,
  },
  rowTextPurple: {
    color: K.purple,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: K.purpleLt,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: K.borderPurple,
  },
  xpText: {
    fontFamily: F.bold,
    fontSize: 22,
    color: K.purple,
  },
  primaryBtn: {
    width: "100%",
    paddingVertical: 18,
    backgroundColor: K.purple,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: K.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: F.bold,
    fontSize: 18,
    color: "#fff",
  },
  gameLink: {
    paddingVertical: 8,
    marginTop: 4,
  },
  gameLinkText: {
    fontFamily: F.bold,
    fontSize: 14,
    color: K.muted,
  },
  handBackLink: {
    paddingVertical: 8,
    marginTop: 4,
  },
  handBackText: {
    fontFamily: F.semibold,
    fontSize: 13,
    color: K.muted,
    textAlign: "center",
  },
});
