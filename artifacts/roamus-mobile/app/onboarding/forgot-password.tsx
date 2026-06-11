import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { BackBtn, Wordmark } from "@/lib/onboardingAtoms";
import { F, G } from "@/lib/tokens";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeRef     = useRef<TextInput>(null);
  const newPwRef    = useRef<TextInput>(null);
  const confirmRef  = useRef<TextInput>(null);

  async function handleSendCode() {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to send reset code.");
      } else {
        setStep("reset");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!code.trim()) { setError("Please enter the code from your email."); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Reset failed. Check your code and try again.");
      } else {
        Alert.alert("Password reset", "Your password has been updated. You can now sign in.", [
          { text: "Sign in", onPress: () => router.replace("/onboarding/login") },
        ]);
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
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

          {step === "email" ? (
            <>
              <Text style={s.title}>Forgot password?</Text>
              <Text style={s.sub}>Enter the email you used to sign up and we'll send a reset code.</Text>

              {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

              <View style={[s.field, { borderColor: email ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
                <TextInput
                  style={[s.input, { color: G.deep }]}
                  placeholder="Email address"
                  placeholderTextColor={G.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSendCode}
                  autoFocus
                />
              </View>

              <View style={{ flex: 1, minHeight: 40 }} />

              <Pressable
                style={({ pressed }) => [s.btn, { opacity: pressed || loading || !email ? 0.7 : 1 }]}
                onPress={handleSendCode}
                disabled={loading || !email.trim()}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Send reset code</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.title}>Check your email</Text>
              <Text style={s.sub}>We sent a reset code to {email}. Enter it below along with your new password.</Text>

              {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

              <View style={[s.field, { borderColor: code ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
                <TextInput
                  ref={codeRef}
                  style={[s.input, { color: G.deep }]}
                  placeholder="Reset code"
                  placeholderTextColor={G.muted}
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => newPwRef.current?.focus()}
                  autoFocus
                />
              </View>

              <View style={[s.field, { borderColor: newPw ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
                <TextInput
                  ref={newPwRef}
                  style={[s.input, { color: G.deep }]}
                  placeholder="New password (8+ chars)"
                  placeholderTextColor={G.muted}
                  value={newPw}
                  onChangeText={setNewPw}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
              </View>

              <View style={[s.field, { borderColor: confirmPw ? "rgba(232,105,42,0.35)" : "rgba(26,31,46,0.1)" }]}>
                <TextInput
                  ref={confirmRef}
                  style={[s.input, { color: G.deep }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={G.muted}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>

              <View style={{ flex: 1, minHeight: 24 }} />

              <Pressable
                style={({ pressed }) => [s.btn, { opacity: pressed || loading || !code || !newPw || !confirmPw ? 0.7 : 1 }]}
                onPress={handleReset}
                disabled={loading || !code.trim() || !newPw || !confirmPw}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Reset password</Text>}
              </Pressable>

              <Pressable style={s.resendBtn} onPress={() => { setStep("email"); setCode(""); setNewPw(""); setConfirmPw(""); setError(null); }}>
                <Text style={s.resendText}>Didn't get the code? Try again</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  scroll:     { paddingHorizontal: 24, flexGrow: 1 },
  title:      { fontFamily: F.bold, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: G.deep, marginBottom: 6 },
  sub:        { fontFamily: F.regular, fontSize: 16, color: G.muted, marginBottom: 28 },
  errorBox:   { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:  { fontSize: 14, color: "#DC2626" },
  field:      { backgroundColor: G.card, borderRadius: 14, borderWidth: 1.5, height: 52, justifyContent: "center", paddingHorizontal: 16, marginBottom: 12 },
  input:      { fontFamily: F.regular, fontSize: 15 },
  btn:        { height: 56, borderRadius: 28, backgroundColor: G.orange, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  btnText:    { fontFamily: F.bold, fontSize: 17, fontWeight: "700", color: "#fff" },
  resendBtn:  { alignItems: "center", paddingVertical: 12 },
  resendText: { fontFamily: F.regular, fontSize: 14, color: G.orange },
});
