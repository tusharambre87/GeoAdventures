import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackBtn, Wordmark } from "@/lib/onboardingAtoms";
import { F, G, CITY_COUNTRY, STYLE_MAP, PACE_MAP } from "@/lib/tokens";
import { API_BASE, useAuth } from "@/lib/authContext";
import { useOnboarding } from "@/lib/onboardingContext";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { register, token } = useAuth();
  const { data, set } = useOnboarding();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);

  async function createTripWithJwt(jwt: string) {
    try {
      const city = data.cities[0] ?? "Chicago";
      const country = CITY_COUNTRY[city] ?? "USA";
      const players = data.travelers.map(t => ({
        name: t.name, isParent: t.isParent, age: String(t.age ?? 35),
      }));
      const isMulti = data.cityMode === "multi" && data.cities.length > 1;
      const tripName = isMulti
        ? `${data.cities.slice(0, -1).join(", ")} & ${data.cities[data.cities.length - 1]} Family Trip`
        : `${city} Family Trip`;

      const res = await fetch(`${API_BASE}/api/travel/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          name: tripName,
          destination: isMulti ? data.cities.join(", ") : city,
          city,
          country,
          startDate: data.startDate,
          endDate: data.endDate,
          travelers: players,
          adventureStyle: STYLE_MAP[data.tripStyle ?? ""] ?? "family_explorer",
          pace: PACE_MAP[data.pace ?? ""] ?? "balanced",
          adventureContext: "travel",
          autoGenerateStops: true,
          tailoring: { transport: data.transport, stroller: data.stroller, interests: data.interests },
        }),
      });
      if (res.ok) {
        const trip = await res.json();
        set({ createdTripId: trip.id });
      }
    } catch {
      // Trip creation is best-effort here; user is already registered
    }
  }

  async function handleCreate() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (pw.length < 6) { setError("Password must be at least 6 characters."); return; }

    setError(null);
    setLoading(true);

    // Mark onboarding in progress BEFORE registration so AuthGate
    // doesn't redirect the newly-registered user away from the upgrade screen.
    set({ onboardingInProgress: true });

    const players = data.travelers.map(t => ({
      name: t.name, isParent: t.isParent, age: String(t.age ?? 35),
    }));

    const result = await register(name.trim(), email.trim().toLowerCase(), pw, players);

    if (!result.success) {
      set({ onboardingInProgress: false });
      setError(result.error ?? "Registration failed.");
      setLoading(false);
      return;
    }

    // Retrieve the fresh JWT from auth context (register stores it)
    // and create the real trip in the background (best-effort).
    const jwt = await import("@react-native-async-storage/async-storage")
      .then(m => m.default.getItem("auth_token"));
    if (jwt) await createTripWithJwt(jwt);

    setLoading(false);
    router.replace("/onboarding/upgrade");
  }

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 24 }}>
            <BackBtn onPress={() => router.back()} />
          </View>

          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Wordmark size={32} />
          </View>

          <Text style={s.title}>Save your trip.</Text>
          <Text style={s.sub}>Create a free account to keep this itinerary and unlock the full adventure.</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {data.cities.length > 0 && (
            <View style={s.tripCard}>
              <Text style={s.tripCardLabel}>Your itinerary for</Text>
              <Text style={s.tripCardCity}>{data.cities.join(" + ")}</Text>
              <Text style={s.tripCardMeta}>
                {data.travelers.length} traveler{data.travelers.length !== 1 ? "s" : ""}
                {data.tripStyle ? `  ·  ${data.tripStyle} vibe` : ""}
              </Text>
            </View>
          )}

          <View style={[s.field, { borderColor: name ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
            <TextInput
              style={[s.input, { color: G.deep }]}
              placeholder="Your first name"
              placeholderTextColor={G.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>

          <View style={[s.field, { borderColor: email ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
            <TextInput
              ref={emailRef}
              style={[s.input, { color: G.deep }]}
              placeholder="Email address"
              placeholderTextColor={G.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
            />
          </View>

          <View style={[s.field, { borderColor: pw ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
            <TextInput
              ref={pwRef}
              style={[s.input, { color: G.deep }]}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={G.muted}
              value={pw}
              onChangeText={setPw}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleCreate}
            />
          </View>

          <Text style={s.terms} numberOfLines={1} adjustsFontSizeToFit>
            {"By continuing you agree to our "}
            <Text style={s.termsLink} onPress={() => Linking.openURL("https://roamus.app/terms")}>Terms of Service</Text>
            {" and "}
            <Text style={s.termsLink} onPress={() => Linking.openURL("https://roamus.app/privacy")}>Privacy Policy</Text>
            {"."}
          </Text>

          <Pressable
            style={({ pressed }) => [s.btn, { opacity: pressed || loading || !name || !email || pw.length < 6 ? 0.7 : 1 }]}
            onPress={handleCreate}
            disabled={loading || !name || !email || pw.length < 6}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Create free account →</Text>}
          </Pressable>

          <Pressable onPress={() => router.push("/onboarding/login")} style={{ alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ fontFamily: F.regular, fontSize: 14, color: G.muted }}>
              Already have an account?{" "}
              <Text style={{ color: G.orange }}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  title: { fontFamily: F.bold, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: G.deep, marginBottom: 6 },
  sub: { fontFamily: F.regular, fontSize: 15, color: G.muted, lineHeight: 22, marginBottom: 20 },
  errorBox: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontFamily: F.regular, fontSize: 14, color: "#DC2626" },
  tripCard: {
    backgroundColor: G.oLt, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(232,105,42,0.25)",
    padding: 14, marginBottom: 20, gap: 3,
  },
  tripCardLabel: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  tripCardCity: { fontFamily: F.bold, fontSize: 18, fontWeight: "700", color: G.orange },
  tripCardMeta: { fontFamily: F.regular, fontSize: 13, color: G.deep },
  field: {
    backgroundColor: G.card, borderRadius: 14, borderWidth: 1.5,
    height: 52, justifyContent: "center", paddingHorizontal: 16, marginBottom: 12,
  },
  input: { fontFamily: F.regular, fontSize: 15 },
  terms: { fontFamily: F.regular, fontSize: 12, color: G.muted, marginBottom: 20, textAlign: "center" },
  termsLink: { color: G.orange, textDecorationLine: "underline" },
  btn: { height: 56, borderRadius: 28, backgroundColor: G.orange, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  btnText: { fontFamily: F.bold, fontSize: 16, fontWeight: "700", color: "#fff" },
});
