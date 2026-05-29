import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/lib/authContext";
import { F, G } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";

type Pricing = { symbol: string; geopass: string; trippack: string; cadence: string };

const PLANS = [
  {
    id: "free",
    name: "Free Explorer",
    tagline: "Save and access the plan only",
    yearlyPrice: "$0",
    monthlyPrice: "$0",
    period: "",
    features: [
      "View your full trip plan",
      "Access from any device",
      "No execution features",
    ],
    cta: "Continue on free →",
  },
  {
    id: "roamus",
    name: "RoamUs Pass",
    tagline: "Full experience · Whole family",
    badge: "MOST POPULAR",
    features: [
      "Step-by-step guide at every stop",
      "Kids missions + engagement layer",
      "Audio stories about each stop",
      "Works offline — no signal needed",
      "Auto-generated trip memory at the end",
      "Push notifications + smart reminders",
    ],
    cta: "Get RoamUs Pass →",
  },
  {
    id: "trippack",
    name: "This Trip Only",
    features: [
      "Full guided experience for this trip",
      "All stops unlocked",
      "Kids missions included",
      "Trip memory auto-generated",
      "No subscription — one payment",
    ],
    cta: "Unlock for {price} →",
  },
];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const { data, completeOnboarding } = useOnboarding();
  const [selected, setSelected] = useState("roamus");
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/pricing`)
      .then(r => r.ok ? r.json() : null)
      .then((json: Pricing | null) => { if (json?.geopass) setPricing(json); })
      .catch(() => null);
  }, []);

  const sym = pricing?.symbol ?? "$";
  const passMonthly = pricing ? `${sym}${pricing.geopass}` : "$4.99";
  const passAnnual = pricing ? `${sym}${(parseFloat(pricing.geopass) * 10).toFixed(0)}` : "$49";
  const tripPrice = pricing ? `${sym}${pricing.trippack}` : "$9.99";
  const cadence = pricing?.cadence ?? "month";

  function planPrice(id: string): string {
    if (id === "free") return "$0";
    if (id === "roamus") return annual ? `${passAnnual}/yr` : `${passMonthly}/mo`;
    return tripPrice;
  }

  function planPeriod(id: string): string {
    if (id === "free") return "";
    if (id === "roamus") return annual ? "billed yearly · whole family" : "whole family";
    return "one-time";
  }

  function planTagline(id: string): string {
    if (id === "free") return "Save and access the plan only";
    if (id === "roamus") return "Full experience · Whole family";
    const cities = data.cities.join(" & ");
    return `One-time · ${cities || "Your trip"}`;
  }

  function planCta(): string {
    const p = PLANS.find(p => p.id === selected)!;
    return p.cta.replace("{price}", selected === "trippack" ? tripPrice : "");
  }

  function handleContinue() {
    completeOnboarding();
    router.replace("/(tabs)");
  }

  const plan = PLANS.find(p => p.id === selected) ?? PLANS[1];

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>This is where your{"\n"}trip comes alive.</Text>
        <Text style={s.sub}>Upgrade to unlock the full RoamUs experience.</Text>

        {/* Monthly / Annual toggle */}
        <View style={s.toggleRow}>
          <Pressable
            onPress={() => setAnnual(false)}
            style={[s.toggleBtn, !annual && s.toggleBtnActive]}
          >
            <Text style={[s.toggleBtnText, !annual && s.toggleBtnTextActive]}>Monthly</Text>
          </Pressable>
          <Pressable
            onPress={() => setAnnual(true)}
            style={[s.toggleBtn, annual && s.toggleBtnActive]}
          >
            <Text style={[s.toggleBtnText, annual && s.toggleBtnTextActive]}>Annual</Text>
            <View style={s.saveBadge}><Text style={s.saveBadgeText}>Save 17%</Text></View>
          </Pressable>
        </View>

        {!pricing && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ActivityIndicator size="small" color={G.orange} />
            <Text style={{ fontFamily: F.regular, fontSize: 13, color: G.muted }}>Loading prices…</Text>
          </View>
        )}

        {/* Plan cards */}
        <View style={s.plans}>
          {PLANS.map(p => {
            const isSelected = selected === p.id;
            return (
              <View key={p.id}>
                {p.badge && (
                  <View style={s.badgeAbove}>
                    <Text style={s.badgeAboveText}>{p.badge}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => setSelected(p.id)}
                  style={[
                    s.planCard,
                    isSelected && s.planCardSelected,
                  ]}
                >
                  <View style={s.planRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.planName, isSelected && { color: G.orange }]}>{p.name}</Text>
                      <Text style={s.planTagline}>{planTagline(p.id)}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={[s.planPrice, isSelected && { color: G.orange }]}>{planPrice(p.id)}</Text>
                      {planPeriod(p.id) ? (
                        <Text style={s.planPeriod}>{planPeriod(p.id)}</Text>
                      ) : null}
                    </View>
                    <View style={[s.radio, isSelected && s.radioSelected]}>
                      {isSelected && <View style={s.radioDot} />}
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Feature box */}
        <View style={s.featureBox}>
          <Text style={s.featureHeader}>{plan.name.toUpperCase()} INCLUDES</Text>
          {plan.features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.featureCheck}>✓</Text>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={s.disclaimer}>
          Cancel anytime · Secure payment · Prices in USD
        </Text>
      </ScrollView>

      <View style={[s.cta, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          style={({ pressed }) => [s.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={handleContinue}
        >
          <Text style={s.ctaBtnText}>{planCta()}</Text>
        </Pressable>
        <Pressable onPress={handleContinue} style={{ paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ fontFamily: F.regular, fontSize: 14, color: G.muted }}>
            Maybe later — go to my trip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  title: { fontFamily: F.bold, fontSize: 28, fontWeight: "800", letterSpacing: -0.7, color: G.deep, lineHeight: 36, marginBottom: 8 },
  sub: { fontFamily: F.regular, fontSize: 15, color: G.muted, lineHeight: 22, marginBottom: 20 },

  toggleRow: { flexDirection: "row", backgroundColor: "rgba(26,31,46,0.07)", borderRadius: 14, padding: 3, marginBottom: 20, alignSelf: "flex-start", gap: 2 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 11, flexDirection: "row", alignItems: "center", gap: 6 },
  toggleBtnActive: { backgroundColor: G.card, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleBtnText: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.muted },
  toggleBtnTextActive: { color: G.deep },
  saveBadge: { backgroundColor: G.orange, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeText: { fontFamily: F.bold, fontSize: 10, fontWeight: "700", color: "#fff" },

  plans: { gap: 0, marginBottom: 16 },
  badgeAbove: {
    backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: "flex-start", marginLeft: 12, marginBottom: -1, zIndex: 1,
  },
  badgeAboveText: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
  planCard: {
    backgroundColor: G.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: "rgba(26,31,46,0.1)", padding: 16, marginBottom: 10,
  },
  planCardSelected: {
    borderColor: G.orange, borderWidth: 2,
  },
  planRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  planName: { fontFamily: F.bold, fontSize: 17, fontWeight: "700", color: G.deep, marginBottom: 2 },
  planTagline: { fontFamily: F.regular, fontSize: 13, color: G.muted },
  planPrice: { fontFamily: F.bold, fontSize: 20, fontWeight: "800", color: G.deep },
  planPeriod: { fontFamily: F.regular, fontSize: 11, color: G.muted, textAlign: "right" },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: "rgba(26,31,46,0.2)", alignItems: "center", justifyContent: "center",
  },
  radioSelected: { borderColor: G.orange, backgroundColor: G.orange },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },

  featureBox: {
    backgroundColor: G.sageLt, borderRadius: 14, borderWidth: 1.5,
    borderColor: "rgba(122,158,142,0.25)", padding: 18, marginBottom: 16,
  },
  featureHeader: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.sage, letterSpacing: 0.8, marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  featureCheck: { color: G.sage, fontSize: 14, fontWeight: "700", marginTop: 1 },
  featureText: { fontFamily: F.regular, fontSize: 14, color: G.deep, flex: 1, lineHeight: 20 },

  disclaimer: { fontFamily: F.regular, fontSize: 12, color: G.muted, textAlign: "center" },

  cta: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 24, paddingTop: 14,
    backgroundColor: G.bg,
    borderTopWidth: 1, borderTopColor: "rgba(26,31,46,0.06)",
  },
  ctaBtn: { height: 56, borderRadius: 28, backgroundColor: G.orange, alignItems: "center", justifyContent: "center" },
  ctaBtnText: { fontFamily: F.bold, fontSize: 17, fontWeight: "700", color: "#fff" },
});
