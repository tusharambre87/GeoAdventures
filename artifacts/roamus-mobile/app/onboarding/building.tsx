import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/lib/authContext";
import { F, G, CITY_COUNTRY, STYLE_MAP, PACE_MAP } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ANIM_MS = 6500;

type Phase = "mapping" | "personalizing" | "finishing";
const PHASES: Phase[] = ["mapping", "personalizing", "finishing"];

const PHASE_DURATIONS: Record<Phase, number> = {
  mapping:       2200,
  personalizing: 3300,
  finishing:     1000,
};

const PHASE_MESSAGES: Record<Phase, string[]> = {
  mapping: [
    "Mapping family-friendly stops…",
    "Checking opening hours for your dates…",
    "Scanning kid ratings across the city…",
  ],
  personalizing: [
    "Tailoring for your youngest traveler…",
    "Building your day-by-day itinerary…",
    "Matching stops to your travel style…",
  ],
  finishing: [
    "Adding the magic touches…",
    "One last look before handoff…",
  ],
};

const PHASE_CONFIG: Record<Phase, { icon: string; label: string }> = {
  mapping:       { icon: "🗺️", label: "MAPPING YOUR CITY" },
  personalizing: { icon: "✨",           label: "PERSONALISING FOR YOUR FAMILY" },
  finishing:     { icon: "🎒",       label: "FINISHING YOUR PLAN" },
};

// ─── ActiveSegmentFill ────────────────────────────────────────────────────────
// Mounts fresh for each active phase (key={phase}); animates 0→100% over duration.

function ActiveSegmentFill({ duration }: { duration: number }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fillAnim.setValue(0);
    Animated.timing(fillAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
  }, []);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return <Animated.View style={[s.segmentFill, { width: fillWidth }]} />;
}

// ─── BuildingScreen ───────────────────────────────────────────────────────────

export default function BuildingScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();

  // Step 1: dynamic hero image
  const cityQuery = encodeURIComponent((data.cities[0] ?? "travel") + " city landmark");
  const heroImageUrl = `https://source.unsplash.com/800x600/?${cityQuery}`;

  const city    = data.cities[0] ?? "Chicago";
  const country = CITY_COUNTRY[city] ?? "USA";

  // Step 2: phase state
  const [phase,      setPhase]      = useState<Phase>("mapping");
  const [msgIdx,     setMsgIdx]     = useState(0);
  const [animDone,   setAnimDone]   = useState(false);
  const [apiDone,    setApiDone]    = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const navigated = useRef(false);

  // Step 4 animations (RN core)
  const phaseOpacity  = useRef(new Animated.Value(1)).current;
  const iconScale     = useRef(new Animated.Value(1)).current;
  const pulseLoopRef  = useRef<Animated.CompositeAnimation | null>(null);

  // Step 6 finish opacity (RN core)
  const finishOpacity = useRef(new Animated.Value(0)).current;

  // Step 5: Reanimated message opacity
  const msgOpacity   = useSharedValue(1);
  const msgAnimStyle = useAnimatedStyle(() => ({ opacity: msgOpacity.value }));

  // Step 6: Navigate when both gates clear
  useEffect(() => {
    if (animDone && apiDone && !navigated.current) {
      navigated.current = true;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowFinish(true);
      Animated.timing(finishOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        router.replace("/onboarding/preview");
      }, 300);
    }
  }, [animDone, apiDone]);

  // Step 2: phase advancement timers
  useEffect(() => {
    const t1 = setTimeout(
      () => setPhase("personalizing"),
      PHASE_DURATIONS.mapping,
    );
    const t2 = setTimeout(
      () => setPhase("finishing"),
      PHASE_DURATIONS.mapping + PHASE_DURATIONS.personalizing,
    );
    const t3 = setTimeout(() => setAnimDone(true), MIN_ANIM_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Step 4: phase change — fade icon/label, restart pulse, reset message index
  useEffect(() => {
    Animated.sequence([
      Animated.timing(phaseOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(phaseOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    if (pulseLoopRef.current) pulseLoopRef.current.stop();
    iconScale.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.08, duration: 750, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1.0,  duration: 750, useNativeDriver: true }),
      ]),
    );
    pulseLoopRef.current = loop;
    loop.start();

    setMsgIdx(0);

    return () => { if (pulseLoopRef.current) pulseLoopRef.current.stop(); };
  }, [phase]);

  // Step 5: Reanimated message cycling every 1800 ms
  useEffect(() => {
    const id = setInterval(() => {
      msgOpacity.value = withSequence(
        withTiming(0, { duration: 250 }),
        withTiming(1, { duration: 350 }),
      );
      setTimeout(() => {
        const msgs = PHASE_MESSAGES[phase];
        setMsgIdx(prev => (prev + 1) % msgs.length);
      }, 250);
    }, 1800);
    return () => clearInterval(id);
  }, [phase]);

  // API call (unchanged logic)
  useEffect(() => {
    (async () => {
      try {
        const adventureStyle = STYLE_MAP[data.tripStyle ?? ""] ?? "family_explorer";
        const players = data.travelers.map(t => ({
          name: t.name, isParent: t.isParent, age: String(t.age ?? 35),
        }));
        const res = await fetch(`${API_BASE}/api/travel/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: city, city, country,
            adventureStyle,
            pace: PACE_MAP[data.pace ?? ""] ?? "balanced",
            startDate: data.startDate, endDate: data.endDate,
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
      } catch {
        setApiDone(true);
      }
    })();
  }, []);

  const config     = PHASE_CONFIG[phase];
  const phaseIndex = PHASES.indexOf(phase);
  const messages   = PHASE_MESSAGES[phase];

  return (
    <View style={s.root}>
      {/* Step 1: dynamic hero */}
      <Image
        source={{ uri: heroImageUrl }}
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
          <Text style={s.heading}>{`Building your\n${city} adventure`}</Text>

          {/* Step 4: phase icon + label with fade and pulse */}
          <Animated.View style={[s.phaseHeaderWrap, { opacity: phaseOpacity }]}>
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              <Text style={s.phaseIcon}>{config.icon}</Text>
            </Animated.View>
            <Text style={s.phaseLabel}>{config.label}</Text>
          </Animated.View>

          {/* Step 3: segmented progress bar */}
          <View style={s.phaseBarContainer}>
            {PHASES.map((p, idx) => {
              const isComplete = idx < phaseIndex;
              const isActive   = idx === phaseIndex;
              return (
                <React.Fragment key={p}>
                  {idx > 0 && <View style={s.phaseDivider} />}
                  <View
                    style={[
                      s.phaseSegmentWrap,
                      isComplete && s.phaseSegmentComplete,
                      isActive   && s.phaseSegmentActive,
                    ]}
                  >
                    {isActive && (
                      <ActiveSegmentFill key={p} duration={PHASE_DURATIONS[p]} />
                    )}
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          {/* Step 5 + 6: message or finish state */}
          {showFinish ? (
            <Animated.View style={[s.finishWrap, { opacity: finishOpacity }]}>
              <Text style={s.finishEmoji}>{"🎉"}</Text>
              <Text style={s.finishText}>Your adventure is ready</Text>
            </Animated.View>
          ) : (
            <Reanimated.View style={[s.messageWrap, msgAnimStyle]}>
              <Text style={s.message}>{messages[msgIdx]}</Text>
            </Reanimated.View>
          )}
        </View>

        <Text style={s.footer}>
          {`Personalised for ${data.travelers.length} traveler${data.travelers.length !== 1 ? "s" : ""}${data.cities.length > 0 ? "  ·  " + data.cities.join(" + ") : ""}`}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: "#060810" },
  content: { flex: 1, paddingHorizontal: 32, justifyContent: "space-between" },

  logoRow: { flexDirection: "row" },
  logoRoam: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "Georgia" },
  logoUs:   { fontSize: 22, fontWeight: "700", color: G.orange, fontFamily: "Georgia" },

  center:  { alignItems: "center", gap: 20 },
  heading: {
    fontFamily: F.bold, fontSize: 26, fontWeight: "800",
    color: "#fff", textAlign: "center", letterSpacing: -0.5, lineHeight: 34,
  },

  // Step 4: phase header
  phaseHeaderWrap: { alignItems: "center", gap: 6 },
  phaseIcon:  { fontSize: 48, lineHeight: 56 },
  phaseLabel: {
    fontSize: 13, fontWeight: "700", fontFamily: F.bold,
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase", letterSpacing: 1.1,
  },

  // Step 3: segmented bar
  phaseBarContainer: {
    flexDirection: "row", alignItems: "center",
    width: "100%", height: 5, gap: 0,
  },
  phaseSegmentWrap: {
    flex: 1, height: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3, overflow: "hidden",
  },
  phaseSegmentComplete: { backgroundColor: G.orange },
  phaseSegmentActive:   { backgroundColor: "rgba(255,255,255,0.15)" },
  segmentFill: { height: "100%", backgroundColor: G.orange, borderRadius: 3 },
  phaseDivider: { width: 4 },

  // Step 5: message
  messageWrap: { width: "100%", alignItems: "center" },
  message: {
    fontFamily: F.semibold, fontSize: 15, fontWeight: "600",
    color: "rgba(255,255,255,0.7)", textAlign: "center",
    paddingHorizontal: 32, lineHeight: 22,
  },

  // Step 6: finish
  finishWrap:  { alignItems: "center", gap: 8 },
  finishEmoji: { fontSize: 44, lineHeight: 52 },
  finishText:  {
    fontSize: 20, fontFamily: "Georgia", fontWeight: "900",
    color: "#fff", letterSpacing: -0.3,
  },

  footer: {
    fontFamily: F.regular, fontSize: 13,
    color: "rgba(255,255,255,0.4)", textAlign: "center",
  },

  // kept for backwards compat (not rendered but avoids ts error if referenced)
  retryBtn:  { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28, backgroundColor: G.orange },
  retryText: { fontFamily: F.bold, fontSize: 15, fontWeight: "700", color: "#fff" },
});
