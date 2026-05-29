import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AChip, BackBtn, BigBtn, OCard, ProgressDots } from "@/lib/onboardingAtoms";
import { F, G } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STYLES = [
  { id: "highlights", icon: "🏛️", label: "Iconic highlights", sub: "The must-see landmarks everyone loves" },
  { id: "balanced",   icon: "⚖️",  label: "Balanced explorer",  sub: "Mix of famous and hidden gems" },
  { id: "offbeat",    icon: "🧭", label: "Offbeat & local",    sub: "Skip the crowds, find the real city" },
  { id: "easy",       icon: "🌿", label: "Easy does it",       sub: "Slow pace, short stops, all ages happy" },
];

const PACES = [
  { id: "relaxed",  icon: "😌", label: "Relaxed",  sub: "2–3 stops/day, plenty of downtime" },
  { id: "moderate", icon: "🚶", label: "Moderate",  sub: "4–5 stops/day, good balance" },
  { id: "busy",     icon: "⚡",  label: "Go-getter", sub: "6+ stops/day, maximum experience" },
];

const TRANSPORTS = [
  { id: "walk",    icon: "🚶", label: "Mostly walking",     sub: "Best for central areas" },
  { id: "transit", icon: "🚇", label: "Public transit",     sub: "Metro, bus, tram" },
  { id: "drive",   icon: "🚗", label: "We have a car",      sub: "Flexible, great for suburbs" },
  { id: "mix",     icon: "🔀", label: "Mix it up",           sub: "Whatever works best each day" },
];

const INTERESTS = [
  "Animals 🦁","Art 🎨","Science 🔬","History 📜","Sports ⚽",
  "Food 🍕","Nature 🌿","Music 🎵","Shopping 🛍️","Architecture 🏛️","Interactive 🎮","Shows 🎭",
];

function useFadeIn(active: boolean) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: active ? 1 : 0, duration: 320, useNativeDriver: true }).start();
  }, [active]);
  return anim;
}

export default function HowScreen() {
  const insets = useSafeAreaInsets();
  const { set } = useOnboarding();

  const [style_, setStyle_] = useState<string | null>(null);
  const [pace, setPace] = useState<string | null>(null);
  const [transport, setTransport] = useState<string | null>(null);
  const [stroller, setStroller] = useState<boolean | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  const [step, setStep] = useState(0);

  const pace1 = useFadeIn(step >= 1);
  const transport2 = useFadeIn(step >= 2);
  const stroller3 = useFadeIn(step >= 3);
  const interests4 = useFadeIn(step >= 4);

  function selectStyle(id: string) {
    setStyle_(id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(1);
  }
  function selectPace(id: string) {
    setPace(id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(2);
  }
  function selectTransport(id: string) {
    setTransport(id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(3);
  }
  function selectStroller(val: boolean) {
    setStroller(val);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(4);
  }
  function toggleInterest(tag: string) {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function handleBuild() {
    set({ tripStyle: style_, pace, transport, stroller, interests });
    router.push("/onboarding/building");
  }

  const styleOption = STYLES.find(s => s.id === style_);
  const paceOption = PACES.find(p => p.id === pace);
  const transportOption = TRANSPORTS.find(t => t.id === transport);

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.navRow}>
          <BackBtn onPress={() => router.back()} />
          <View style={{ flex: 1, alignItems: "center" }}><ProgressDots total={4} cur={3} /></View>
          <View style={{ width: 40 }} />
        </View>
        <Text style={s.title}>How do you like to explore? 🧭</Text>
        <Text style={s.sub}>Build a vibe that fits your family.</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.scroll, { paddingBottom: 140 }]} showsVerticalScrollIndicator={false}>
        {/* Section 1: Style */}
        {style_ && step >= 1 ? (
          <AChip num="1" icon={styleOption?.icon ?? ""} label={styleOption?.label ?? ""} onEdit={() => { setStyle_(null); setStep(0); }} />
        ) : (
          <>
            <Text style={s.sectionTitle}>What's your vibe?</Text>
            {STYLES.map(o => (
              <OCard key={o.id} icon={o.icon} label={o.label} sub={o.sub}
                selected={style_ === o.id} onPress={() => selectStyle(o.id)} />
            ))}
          </>
        )}

        {/* Section 2: Pace */}
        <Animated.View style={{ opacity: pace1 }}>
          {step >= 1 && (
            pace && step >= 2 ? (
              <AChip num="2" icon={paceOption?.icon ?? ""} label={paceOption?.label ?? ""} onEdit={() => { setPace(null); setStep(1); }} />
            ) : (
              <>
                <Text style={s.sectionTitle}>What's your pace?</Text>
                {PACES.map(o => (
                  <OCard key={o.id} icon={o.icon} label={o.label} sub={o.sub}
                    selected={pace === o.id} onPress={() => selectPace(o.id)} />
                ))}
              </>
            )
          )}
        </Animated.View>

        {/* Section 3: Transport */}
        <Animated.View style={{ opacity: transport2 }}>
          {step >= 2 && (
            transport && step >= 3 ? (
              <AChip num="3" icon={transportOption?.icon ?? ""} label={transportOption?.label ?? ""} onEdit={() => { setTransport(null); setStep(2); }} />
            ) : (
              <>
                <Text style={s.sectionTitle}>Getting around the city?</Text>
                {TRANSPORTS.map(o => (
                  <OCard key={o.id} icon={o.icon} label={o.label} sub={o.sub}
                    selected={transport === o.id} onPress={() => selectTransport(o.id)} />
                ))}
              </>
            )
          )}
        </Animated.View>

        {/* Section 4: Stroller */}
        <Animated.View style={{ opacity: stroller3 }}>
          {step >= 3 && (
            stroller !== null && step >= 4 ? (
              <AChip num="4" icon={stroller ? "🚼" : "🚫"} label={stroller ? "Stroller-friendly stops" : "No stroller needed"} onEdit={() => { setStroller(null); setStep(3); }} />
            ) : (
              <>
                <Text style={s.sectionTitle}>Stroller-friendly stops? 🚼</Text>
                <OCard icon="✅" label="Yes please" sub="We'll prioritise accessible, pram-friendly venues"
                  selected={stroller === true} onPress={() => selectStroller(true)} />
                <OCard icon="🚫" label="Not needed" sub="Full range of stops available"
                  selected={stroller === false} onPress={() => selectStroller(false)} />
              </>
            )
          )}
        </Animated.View>

        {/* Section 5: Interests + CTA */}
        <Animated.View style={{ opacity: interests4 }}>
          {step >= 4 && (
            <>
              <Text style={s.sectionTitle}>What does your family love?</Text>
              <Text style={s.interestSub}>Pick anything that excites you</Text>
              <View style={s.tags}>
                {INTERESTS.map(tag => {
                  const sel = interests.includes(tag);
                  return (
                    <Pressable key={tag} onPress={() => toggleInterest(tag)} style={[s.tag, { backgroundColor: sel ? G.orange : G.card, borderColor: sel ? G.orange : "rgba(26,31,46,0.12)" }]}>
                      <Text style={[s.tagText, { color: sel ? "#fff" : G.deep }]}>{tag}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <BigBtn label="Build my trip →" onPress={handleBuild} />
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, flexShrink: 0 },
  navRow: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  title: { fontFamily: F.bold, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: G.deep, marginBottom: 6 },
  sub: { fontFamily: F.regular, fontSize: 16, color: G.muted, marginBottom: 20 },
  scroll: { paddingHorizontal: 24 },
  sectionTitle: { fontFamily: F.bold, fontSize: 18, fontWeight: "700", letterSpacing: -0.3, color: G.deep, marginBottom: 12, marginTop: 4 },
  interestSub: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginTop: -8, marginBottom: 14 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  tag: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1.5 },
  tagText: { fontFamily: F.medium, fontSize: 14, fontWeight: "500" },
});
