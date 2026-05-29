import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop:
              Platform.OS === "web" ? insets.top + 67 : insets.top + 20,
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={56}
          color={colors.mutedForeground}
        />
        <Text style={[styles.title, { color: colors.foreground }]}>Today</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your daily itinerary will appear here once your trip begins.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
