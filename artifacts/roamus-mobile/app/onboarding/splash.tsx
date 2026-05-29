import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, G } from "@/lib/tokens";

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1, duration: 600, delay: 100, useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0, duration: 600, delay: 100, useNativeDriver: true,
        }),
      ]).start();
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80" }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0)", "rgba(0,0,0,0.52)", "rgba(0,0,0,0.93)"]}
        locations={[0, 0.2, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Wordmark */}
      <Animated.View style={[styles.wordmarkWrap, { top: insets.top + 44, opacity: logoOpacity }]}>
        <Text style={styles.wordmark}>
          <Text style={styles.wordmarkRoam}>Roam</Text>
          <Text style={styles.wordmarkUs}>Us</Text>
        </Text>
      </Animated.View>

      {/* Bottom content */}
      <Animated.View
        style={[
          styles.bottom,
          { paddingBottom: insets.bottom + 36 },
          { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
        ]}
      >
        <Text style={styles.headline}>Every trip{"\n"}becomes a story.</Text>
        <Text style={styles.sub}>Built for families who want to actually be present.</Text>

        <Pressable
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => router.push("/onboarding/where")}
        >
          <Text style={styles.btnText}>✈️  Start planning — it's free</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ghost, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.push("/onboarding/login")}
        >
          <Text style={styles.ghostText}>I already have an account</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#060810" },
  wordmarkWrap: { position: "absolute", left: 24 },
  wordmark: { fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }), fontSize: 22, letterSpacing: -0.3 },
  wordmarkRoam: { color: "#fff", fontWeight: "700" },
  wordmarkUs: { color: G.orange, fontWeight: "700" },
  bottom: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 24,
  },
  headline: {
    fontFamily: F.bold,
    fontSize: 40, fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.9, lineHeight: 46,
    marginBottom: 12,
  },
  sub: {
    fontFamily: F.regular,
    fontSize: 17, color: "rgba(255,255,255,0.62)",
    lineHeight: 27, marginBottom: 44,
  },
  btn: {
    height: 56, borderRadius: 28,
    backgroundColor: G.orange,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  btnText: {
    fontFamily: F.bold, fontSize: 17, fontWeight: "700", color: "#fff",
  },
  ghost: { paddingVertical: 12, alignItems: "center" },
  ghostText: {
    fontFamily: F.medium, fontSize: 14, fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
});
