import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackBtn, GhostBtn, Wordmark } from "@/lib/onboardingAtoms";
import { F, G } from "@/lib/tokens";
import { useAuth } from "@/lib/authContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pwRef = useRef<TextInput>(null);

  async function handleLogin() {
    if (!email.trim() || !pw) { setError("Please enter your email and password."); return; }
    setError(null);
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), pw);
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Login failed. Please try again.");
    }
  }

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 28 }}>
            <BackBtn onPress={() => router.back()} />
          </View>

          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <Wordmark size={32} />
          </View>

          <Text style={s.title}>Welcome back.</Text>
          <Text style={s.sub}>Sign in to continue your adventures.</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={[s.field, { borderColor: email ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
            <TextInput
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
              placeholder="Password"
              placeholderTextColor={G.muted}
              value={pw}
              onChangeText={setPw}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          <Text style={s.forgot}>Forgot password?</Text>

          <View style={{ flex: 1, minHeight: 40 }} />

          <Pressable
            style={({ pressed }) => [s.btn, { opacity: pressed || loading || !email || !pw ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading || !email || !pw}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign in →</Text>}
          </Pressable>

          <GhostBtn label="No account? Start planning free →" onPress={() => router.replace("/onboarding/where")} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  title: { fontFamily: F.bold, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: G.deep, marginBottom: 6 },
  sub: { fontFamily: F.regular, fontSize: 16, color: G.muted, marginBottom: 28 },
  errorBox: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: "#DC2626" },
  field: { backgroundColor: G.card, borderRadius: 14, borderWidth: 1.5, height: 52, justifyContent: "center", paddingHorizontal: 16, marginBottom: 12 },
  input: { fontFamily: F.regular, fontSize: 15 },
  forgot: { fontFamily: F.regular, fontSize: 14, color: G.orange, marginBottom: 32 },
  btn: { height: 56, borderRadius: 28, backgroundColor: G.orange, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  btnText: { fontFamily: F.bold, fontSize: 17, fontWeight: "700", color: "#fff" },
});
