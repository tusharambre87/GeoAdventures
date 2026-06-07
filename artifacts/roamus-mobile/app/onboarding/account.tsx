import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackBtn, Wordmark } from "@/lib/onboardingAtoms";
import { F, G, CITY_COUNTRY, STYLE_MAP, PACE_MAP } from "@/lib/tokens";
import { API_BASE, useAuth } from "@/lib/authContext";
import { useOnboarding } from "@/lib/onboardingContext";

// ─── Validation helpers ───────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email.trim());
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  message: string;
} {
  if (password.length === 0) return { score: 0, label: "", color: "", message: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password) || /[A-Z]/.test(password)) score++;
  if (score === 1) return { score: 1, label: "Weak",   color: "#DC2626", message: "Add numbers or symbols" };
  if (score === 2) return { score: 2, label: "Fair",   color: "#D97706", message: "Good — add uppercase or symbols" };
  return              { score: 3, label: "Strong", color: "#3DAA6E", message: "Great password" };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { register, token } = useAuth();
  const { data, set } = useOnboarding();

  const [name,            setName]            = useState("");
  const [email,           setEmail]           = useState("");
  const [pw,              setPw]              = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [emailError,      setEmailError]      = useState("");
  const [passwordError,   setPasswordError]   = useState("");
  const [confirmError,    setConfirmError]    = useState("");

  const emailRef   = useRef<TextInput>(null);
  const pwRef      = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const strength = getPasswordStrength(pw);

  // If already logged in, skip registration — just create the trip and advance
  useEffect(() => {
    if (!token) return;
    set({ onboardingInProgress: true });
    setLoading(true);
    const jwt = token;
    createTripWithJwt(jwt).then(() => {
      setLoading(false);
      router.replace("/onboarding/upgrade");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          templateSlug: data.templateSlug || undefined,
          tripDays: data.tripDays || undefined,
          templateStops: data.templateStops || undefined,
          ...(data.cityDates && Object.keys(data.cityDates).length > 0 ? {
            cityDates: Object.fromEntries(
              Object.entries(data.cityDates).map(([city, dates]) => [
                city,
                {
                  startDate: (dates as any).arrive    ?? (dates as any).startDate,
                  endDate:   (dates as any).leave     ?? (dates as any).endDate,
                },
              ])
            ),
          } : {}),
          tailoring: {
            transport: data.transport,
            stroller: data.stroller,
            interests: data.interests,
            indoorOutdoor: data.indoorOutdoor ?? "both",
            budgetSensitivity: data.budgetLevel ?? "moderate",
            kidEnergyLevel: data.kidEnergyLevel ?? "mixed",
            arrivalMethod: data.arrivalMethod ?? null,
            arrivalTime: data.arrivalTime ?? null,
            lastDay: data.lastDay ?? "full",
            cityTransitions: data.cityTransitions ?? {},
          },
        }),
      });
      if (res.ok) {
        const trip = await res.json();
        set({ createdTripId: trip.id });
        set({ templateSlug: null, isTemplate: false, tripDays: null, templateStops: null });
        fetch(`${API_BASE}/api/travel/trips/${trip.id}/preload-stories`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
        }).catch(() => {});
      }
    } catch {
      // Trip creation is best-effort here; user is already registered
    }
  }

  // ─── Blur handlers ──────────────────────────────────────────────────────────

  function handleEmailBlur() {
    if (email && !isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }

  function handleConfirmBlur() {
    if (confirmPassword && confirmPassword !== pw) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    // Clear all field errors; keep only the first failing one
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (pw.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (strength.score < 2) {
      setPasswordError("Password is too weak — add numbers or symbols");
      return;
    }
    if (pw !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    setLoading(true);
    set({ onboardingInProgress: true });

    const rawPlayers = data.travelers.map(t => ({
      name: t.name, isParent: t.isParent, age: String(t.age ?? 35),
    }));
    const players = rawPlayers.length > 0
      ? rawPlayers
      : [{ name: name.trim() || "Traveler", isParent: true, age: "35" }];

    const result = await register(name.trim(), email.trim().toLowerCase(), pw, players);

    if (!result.success) {
      set({ onboardingInProgress: false });
      setError(result.error ?? "Registration failed.");
      setLoading(false);
      return;
    }

    const jwt = await import("@react-native-async-storage/async-storage")
      .then(m => m.default.getItem("auth_token"));
    if (jwt) await createTripWithJwt(jwt);

    setLoading(false);
    router.replace("/onboarding/upgrade");
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const canSubmit = !loading && !!name && !!email && pw.length >= 8 && !!confirmPassword;

  // ─── JSX ────────────────────────────────────────────────────────────────────

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
                {data.tripStyle ? `  \u00b7  ${data.tripStyle} vibe` : ""}
              </Text>
            </View>
          )}

          {/* Name */}
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

          {/* Email */}
          <View style={[s.field, emailError ? s.fieldError : { borderColor: email ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
            <TextInput
              ref={emailRef}
              style={[s.input, { color: G.deep }]}
              placeholder="Email address"
              placeholderTextColor={G.muted}
              value={email}
              onChangeText={v => { setEmail(v); if (emailError) setEmailError(""); }}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
            />
          </View>
          {emailError ? <Text style={s.inlineError}>{emailError}</Text> : null}

          {/* Password */}
          <View style={[s.field, passwordError ? s.fieldError : { borderColor: pw ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
            <TextInput
              ref={pwRef}
              style={[s.input, { color: G.deep }]}
              placeholder="Password (min 8 characters)"
              placeholderTextColor={G.muted}
              value={pw}
              onChangeText={v => { setPw(v); if (passwordError) setPasswordError(""); }}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          </View>
          {pw.length > 0 && (
            <View style={s.strengthWrap}>
              <View style={s.strengthBar}>
                <View style={[s.strengthFill, { width: `${(strength.score / 3) * 100}%` as any, backgroundColor: strength.color }]} />
              </View>
              <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}
          {passwordError ? <Text style={s.inlineError}>{passwordError}</Text> : null}

          {/* Confirm password */}
          <View style={[s.field, confirmError ? s.fieldError : { borderColor: confirmPassword ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
            <TextInput
              ref={confirmRef}
              style={[s.input, { color: G.deep }]}
              placeholder="Confirm password"
              placeholderTextColor={G.muted}
              value={confirmPassword}
              onChangeText={v => { setConfirmPassword(v); if (confirmError) setConfirmError(""); }}
              onBlur={handleConfirmBlur}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={handleCreate}
            />
          </View>
          {confirmError ? <Text style={s.inlineError}>{confirmError}</Text> : null}

          <Pressable
            style={({ pressed }) => [s.btn, { opacity: pressed || !canSubmit ? 0.7 : 1 }]}
            onPress={handleCreate}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Create free account {"\u2192"}</Text>}
          </Pressable>

          <Text style={s.termsNote}>
            {"By continuing you agree to our "}
            <Text style={s.termsLink} onPress={() => Linking.openURL("https://roamus.app/terms")}>
              {"Terms of Service"}
            </Text>
            {" and "}
            <Text style={s.termsLink} onPress={() => Linking.openURL("https://roamus.app/privacy")}>
              {"Privacy Policy"}
            </Text>
            {"."}
          </Text>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    height: 52, justifyContent: "center", paddingHorizontal: 16, marginBottom: 4,
  },
  fieldError: { borderColor: "#DC2626", borderWidth: 1.5, marginBottom: 4 },
  input: { fontFamily: F.regular, fontSize: 15 },
  inlineError: { fontSize: 12, color: "#DC2626", fontWeight: "600", marginTop: 2, marginBottom: 8, marginLeft: 4 },
  strengthWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 2 },
  strengthBar: { flex: 1, height: 4, backgroundColor: "rgba(26,31,46,0.1)", borderRadius: 2, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "700", width: 50, fontFamily: F.bold },
  termsNote: { fontSize: 11, color: "#8A8FA8", textAlign: "center", lineHeight: 17, paddingHorizontal: 24, marginTop: 10, marginBottom: 4 },
  termsLink: { color: G.orange, fontWeight: "700", textDecorationLine: "underline" },
  btn: { height: 56, borderRadius: 28, backgroundColor: G.orange, alignItems: "center", justifyContent: "center", marginBottom: 10, marginTop: 8 },
  btnText: { fontFamily: F.bold, fontSize: 16, fontWeight: "700", color: "#fff" },
});
