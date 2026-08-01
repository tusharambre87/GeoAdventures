import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/lib/authContext";

const C = {
  bg: "#F5F2EE",
  deep: "#1A1F2E",
  orange: "#E8692A",
  muted: "#8A8FA8",
  mutedLt: "#C4C7D4",
  card: "#fff",
  border: "rgba(26,31,46,0.09)",
  borderFocus: "rgba(232,105,42,0.4)",
  borderErr: "rgba(220,38,38,0.35)",
  errBg: "#FEF2F2",
  errBorder: "rgba(220,38,38,0.25)",
  errText: "#DC2626",
};

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [emailFocus, setEmailFocus]     = useState(false);
  const [pwFocus, setPwFocus]         = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(false);

  const pwRef = useRef<TextInput>(null);

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(false);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (result.success) {
      router.replace("/(tabs)/home");
    } else {
      setError(true);
    }
  }

  const emailFilled  = email.trim().length > 0;
  const pwFilled     = password.length > 0;
  const canSubmit    = emailFilled && pwFilled && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Status-bar spacer */}
      <View style={{ height: insets.top || 44 }} />

      {/* Back pill */}
      <View style={styles.sbar}>
        <TouchableOpacity style={styles.backPill} onPress={() => router.back()} activeOpacity={0.75}>
          <Text style={styles.backArrow}>{"\u2190"}</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <View style={styles.wmRow}>
          <Text style={styles.wordmark}>
            <Text style={styles.wmRoam}>Roam</Text>
            <Text style={styles.wmUs}>Us</Text>
          </Text>
        </View>

        <Text style={styles.heading}>Welcome back.</Text>
        <Text style={styles.subheading}>Sign in to continue your adventures.</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errBanner}>
            <Text style={styles.errIcon}>{"\u26a0\ufe0f"}</Text>
            <Text style={styles.errText}>Wrong email or password — try again.</Text>
          </View>
        )}

        {/* Email field */}
        <View style={[
          styles.field,
          (emailFocus || emailFilled) && styles.fieldActive,
          error && styles.fieldErr,
        ]}>
          <Text style={styles.fieldIcon}>{"\u2709\ufe0f"}</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={C.mutedLt}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            value={email}
            onChangeText={t => { setEmail(t); setError(false); }}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            onSubmitEditing={() => pwRef.current?.focus()}
          />
        </View>

        {/* Password field */}
        <View style={[
          styles.field,
          (pwFocus || pwFilled) && styles.fieldActive,
          error && styles.fieldErr,
        ]}>
          <Text style={styles.fieldIcon}>{"\uD83D\uDD12"}</Text>
          <TextInput
            ref={pwRef}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={C.mutedLt}
            secureTextEntry
            returnKeyType="done"
            value={password}
            onChangeText={t => { setPassword(t); setError(false); }}
            onFocus={() => setPwFocus(true)}
            onBlur={() => setPwFocus(false)}
            onSubmitEditing={handleSignIn}
          />
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => router.push("/auth/forgot")}
          activeOpacity={0.75}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 12 }]}>
        <TouchableOpacity
          style={[styles.signinBtn, !canSubmit && styles.signinBtnDisabled]}
          activeOpacity={canSubmit ? 0.88 : 1}
          onPress={handleSignIn}
          disabled={!canSubmit}
        >
          <Text style={styles.signinBtnText}>
            {loading ? "Signing in…" : "Sign in →"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  sbar:          { height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 20 },
  backPill:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(26,31,46,0.07)", borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  backArrow:     { fontSize: 14, color: C.deep, fontWeight: "700" },
  backText:      { fontSize: 13, fontWeight: "700", color: C.deep },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  wmRow:         { alignItems: "center", paddingVertical: 20 },
  wordmark:      { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 32, letterSpacing: -0.4 },
  wmRoam:        { color: C.deep },
  wmUs:          { color: C.orange },
  heading:       { fontSize: 30, fontWeight: "800", color: C.deep, letterSpacing: -0.6, marginBottom: 6 },
  subheading:    { fontSize: 16, color: C.muted, marginBottom: 28 },
  errBanner:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.errBg, borderWidth: 1.5, borderColor: C.errBorder, borderRadius: 12, padding: 12, marginBottom: 16 },
  errIcon:       { fontSize: 16 },
  errText:       { fontSize: 13, fontWeight: "700", color: C.errText, flex: 1 },
  field:         { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, height: 54, paddingHorizontal: 16, marginBottom: 12 },
  fieldActive:   { borderColor: C.borderFocus },
  fieldErr:      { borderColor: C.borderErr },
  fieldIcon:     { fontSize: 18, marginRight: 10 },
  input:         { flex: 1, fontSize: 15, color: C.deep, fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" },
  forgotRow:     { alignSelf: "flex-start", marginTop: 2, marginBottom: 8 },
  forgotText:    { fontSize: 14, fontWeight: "700", color: C.orange },
  footer:        { paddingHorizontal: 24, paddingTop: 12, backgroundColor: C.bg },
  signinBtn:     { backgroundColor: C.deep, borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  signinBtnDisabled: { opacity: 0.35 },
  signinBtnText: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.1 },
});
