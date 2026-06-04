import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const splashBg = require("@/assets/images/splash-bg.jpg");

export default function AuthSplash() {
  const insets = useSafeAreaInsets();
  const [isReturningUser, setIsReturningUser] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("auth_token").then((token) => {
      setIsReturningUser(!!token);
    }).catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={splashBg} style={StyleSheet.absoluteFill} resizeMode="cover">
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.10)",
            "rgba(0,0,0,0.00)",
            "rgba(0,0,0,0.45)",
            "rgba(0,0,0,0.92)",
          ]}
          locations={[0, 0.18, 0.52, 1.0]}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Top bar ── */}
        <View style={[styles.topBar, { paddingTop: (insets.top || 44) + 10 }]}>
          <Text style={styles.wordmark}>
            <Text style={styles.wmRoam}>Roam</Text>
            <Text style={styles.wmUs}>Us</Text>
          </Text>
          {isReturningUser && (
            <View style={styles.welcomePill}>
              <Text style={styles.welcomeText}>WELCOME BACK</Text>
            </View>
          )}
        </View>

        {/* ── Bottom content ── */}
        <View style={[styles.bottomSection, { paddingBottom: (insets.bottom || 34) + 18 }]}>
          <Text style={styles.headline}>
            {"Your family\nadventures\nare "}
            <Text style={styles.headlineAccent}>waiting.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Sign in to pick up right where you left off.
          </Text>

          <TouchableOpacity
            style={styles.signinBtn}
            activeOpacity={0.88}
            onPress={() => router.push("/auth/signin")}
          >
            <Text style={styles.signinBtnText}>Sign in {"\u2192"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.replace("/onboarding/splash")}
          >
            <Text style={styles.newHere}>
              New here?{" "}
              <Text style={styles.newHereLink}>Start planning free</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060810",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    zIndex: 2,
  },
  wordmark: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 22,
    letterSpacing: -0.2,
  },
  wmRoam: {
    color: "#fff",
  },
  wmUs: {
    color: "#E8692A",
  },
  welcomePill: {
    backgroundColor: "rgba(232,105,42,0.18)",
    borderWidth: 1,
    borderColor: "rgba(232,105,42,0.35)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  welcomeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 0.9,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  headline: {
    fontSize: 38,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 12,
  },
  headlineAccent: {
    color: "#E8692A",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 26,
    marginBottom: 44,
  },
  signinBtn: {
    backgroundColor: "#E8692A",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#E8692A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  signinBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.1,
  },
  newHere: {
    textAlign: "center",
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  newHereLink: {
    color: "rgba(255,255,255,0.78)",
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(255,255,255,0.78)",
  },
});
