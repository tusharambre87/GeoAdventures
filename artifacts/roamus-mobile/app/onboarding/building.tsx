import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/lib/authContext";
import { F, G, CITY_COUNTRY, STYLE_MAP, PACE_MAP } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";

const MESSAGES = [
  "Mapping family-friendly stops…",
  "Checking opening hours for your dates…",
  "Tailoring for your youngest traveler…",
  "Building your day-by-day itinerary…",
  "Adding the magic touches…",
];

const MIN_ANIM_MS = 6500;
const STEP_MS = MIN_ANIM_MS / MESSAGES.length;

export default function BuildingScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();

  const [msgIdx, setMsgIdx] = useState(0);
  const [msgOpacity] = useState(new Animated.Value(1));
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [animDone, setAnimDone] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigated = useRef(false);

  const city = data.cities[0] ?? "Chicago";
  const country = CITY_COUNTRY[city] ?? "USA";

  // Navigate only when animation AND api BOTH complete successfully
  useEffect(() => {
    if (animDone && apiDone && !apiError && !navigated.current) {
      navigated.current = true;
      router.replace("/onboarding/preview");
    }
  }, [animDone, apiDone, apiError]);

  async function callPreviewApi() {
    setApiDone(false);
    setApiError(null);
    navigated.current = false;
    try {
      const adventureStyle = STYLE_MAP[data.tripStyle ?? ""] ?? "family_explorer";
      const players = data.travelers.map(t => ({
        name: t.name, isParent: t.isParent, age: String(t.age ?? 35),
      }));
      // POST /api/travel/preview accepts the same payload shape as POST /api/travel/trips
      // but requires no authentication — it returns a day-grouped AI itinerary draft.
      const res = await fetch(`${API_BASE}/api/travel/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: city,
          city,
          country,
          adventureStyle,
          pace: PACE_MAP[data.pace ?? ""] ?? "balanced",
          startDate: data.startDate,
          endDate: data.endDate,
          travelers: players,
          tailoring: { transport: data.transport, stroller: data.stroller, interests: data.interests },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Preview generation failed");
      }
      const body = await res.json();
      if (Array.isArray(body.days) && body.days.length > 0) {
        set({ generatedTrip: { days: body.days } });
      }
      setApiDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setApiError(msg);
      setApiDone(true);
    }
  }

  useEffect(() => {
    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: MIN_ANIM_MS,
      useNativeDriver: false,
    }).start(() => setAnimDone(true));

    // Message cycling
    let idx = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < MESSAGES.length; i++) {
      timers.push(
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(msgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => {
            idx = (idx + 1) % MESSAGES.length;
            setMsgIdx(idx);
            Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
          });
        }, STEP_MS * i)
      );
    }

    callPreviewApi();

    return () => timers.forEach(clearTimeout);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const stillWaiting = animDone && !apiDone;

  return (
    <View style={s.root}>
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80" }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(6,8,16,0.6)", "rgba(6,8,16,0.85)", "rgba(6,8,16,0.96)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[s.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 60 }]}>
        <View style={s.logoRow}>
          <Text style={s.logoRoam}>Roam</Text>
          <Text style={s.logoUs}>Us</Text>
        </View>

        <View style={s.center}>
          <Text style={s.heading}>
            {apiError
              ? "Something went wrong"
              : stillWaiting
              ? "Almost ready…"
              : `Building your\n${city} adventure`}
          </Text>

          {!apiError && (
            <View style={s.track}>
              <Animated.View style={[s.fill, { width: progressWidth }]} />
            </View>
          )}

          {apiError ? (
            <Pressable
              style={({ pressed }) => [s.retryBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={callPreviewApi}
            >
              <Text style={s.retryText}>Try again →</Text>
            </Pressable>
          ) : (
            <Animated.Text style={[s.message, { opacity: stillWaiting ? 1 : msgOpacity }]}>
              {stillWaiting ? "Finalising your itinerary…" : MESSAGES[msgIdx]}
            </Animated.Text>
          )}
        </View>

        <Text style={s.footer}>
          Personalised for {data.travelers.length} traveler
          {data.travelers.length !== 1 ? "s" : ""}
          {data.cities.length > 0 ? `  ·  ${data.cities.join(" + ")}` : ""}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#060810" },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: "space-between" },
  logoRow: { flexDirection: "row" },
  logoRoam: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "Georgia" },
  logoUs: { fontSize: 22, fontWeight: "700", color: G.orange, fontFamily: "Georgia" },
  center: { alignItems: "center", gap: 24 },
  heading: {
    fontFamily: F.bold, fontSize: 26, fontWeight: "800",
    color: "#fff", textAlign: "center", letterSpacing: -0.5, lineHeight: 34,
  },
  track: {
    width: "100%", height: 4, backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2, overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: G.orange, borderRadius: 2 },
  message: { fontFamily: F.regular, fontSize: 15, color: "rgba(255,255,255,0.65)", textAlign: "center" },
  footer: { fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28,
    backgroundColor: G.orange,
  },
  retryText: { fontFamily: F.bold, fontSize: 15, fontWeight: "700", color: "#fff" },
});
