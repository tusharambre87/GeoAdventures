import { router, useLocalSearchParams } from "expo-router";
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

const API_BASE = "https://geoquestgame.live";

const C = {
  bg: "#F5F2EE",
  deep: "#1A1F2E",
  orange: "#E8692A",
  orLt: "#FDF0E9",
  muted: "#8A8FA8",
  mutedLt: "#C4C7D4",
  card: "#fff",
  border: "rgba(26,31,46,0.09)",
  borderFocus: "rgba(232,105,42,0.55)",
  borderErr: "rgba(220,38,38,0.45)",
  errBg: "#FEF2F2",
  errText: "#DC2626",
};

const CODE_LEN = 6;

export default function VerifyCode() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [digits, setDigits]     = useState<string[]>(Array(CODE_LEN).fill(""));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent]     = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LEN).fill(null));

  function handleDigit(idx: number, val: string) {
    // Allow paste of full code
    if (val.length > 1) {
      const clean = val.replace(/\D/g, "").slice(0, CODE_LEN);
      const next = Array(CODE_LEN).fill("");
      for (let i = 0; i < clean.length; i++) next[i] = clean[i];
      setDigits(next);
      setError(null);
      const focusIdx = Math.min(clean.length, CODE_LEN - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const clean = val.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);
    setError(null);

    if (clean && idx < CODE_LEN - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyPress(idx: number, key: string) {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < CODE_LEN) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push({ pathname: "/auth/new-password" as any, params: { email, code } });
      } else {
        setError(data.message || "Invalid or expired code. Try again.");
        setDigits(Array(CODE_LEN).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 80);
      }
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending || !email) return;
    setResending(true);
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* silent */ }
    setResending(false);
    setResent(true);
    setDigits(Array(CODE_LEN).fill(""));
    setError(null);
    setTimeout(() => inputRefs.current[0]?.focus(), 80);
  }

  const codeComplete = digits.every(d => d.length === 1);
  const shortEmail   = email ? (email.length > 28 ? email.slice(0, 28) + "\u2026" : email) : "your inbox";

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        {/* Icon */}
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>{"\uD83D\uDD10"}</Text>
        </View>

        <Text style={styles.heading}>Enter your code</Text>
        <Text style={styles.subheading}>
          {"We sent a 6-digit code to "}
          <Text style={styles.emailBold}>{shortEmail}</Text>
          {". It expires in 10 minutes."}
        </Text>

        {/* Error banner */}
        {!!error && (
          <View style={styles.errBanner}>
            <Text style={styles.errIcon}>{"\u26A0\uFE0F"}</Text>
            <Text style={styles.errText}>{error}</Text>
          </View>
        )}

        {/* Code boxes */}
        <View style={styles.codeRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              style={[
                styles.codeBox,
                d ? styles.codeBoxFilled : null,
                !!error ? styles.codeBoxErr : null,
              ]}
              value={d}
              onChangeText={v => handleDigit(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              returnKeyType={i === CODE_LEN - 1 ? "done" : "next"}
              onSubmitEditing={i === CODE_LEN - 1 ? handleVerify : undefined}
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendRow}>
          {resent ? (
            <Text style={styles.resentText}>New code sent! Check your inbox.</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7} disabled={resending}>
              <Text style={styles.resendText}>
                {resending ? "Resending\u2026" : "Didn\u2019t get it? Resend \u2192"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 12 }]}>
        <TouchableOpacity
          style={[styles.verifyBtn, (!codeComplete || loading) && styles.verifyBtnDisabled]}
          activeOpacity={codeComplete && !loading ? 0.88 : 1}
          onPress={handleVerify}
          disabled={!codeComplete || loading}
        >
          <Text style={styles.verifyBtnText}>
            {loading ? "Checking\u2026" : "Verify code \u2192"}
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  iconBox:       { width: 72, height: 72, borderRadius: 22, backgroundColor: C.orLt, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  iconEmoji:     { fontSize: 32 },
  heading:       { fontSize: 26, fontWeight: "800", color: C.deep, letterSpacing: -0.5, marginBottom: 10 },
  subheading:    { fontSize: 15, color: C.muted, lineHeight: 26, marginBottom: 24 },
  emailBold:     { fontWeight: "800", color: C.deep },
  errBanner:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.errBg, borderWidth: 1.5, borderColor: "rgba(220,38,38,0.25)", borderRadius: 12, padding: 12, marginBottom: 16 },
  errIcon:       { fontSize: 16 },
  errText:       { fontSize: 13, fontWeight: "700", color: C.errText, flex: 1 },
  codeRow:       { flexDirection: "row", gap: 10, marginBottom: 20 },
  codeBox:       { flex: 1, height: 58, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, textAlign: "center", fontSize: 24, fontWeight: "800", color: C.deep },
  codeBoxFilled: { borderColor: C.borderFocus },
  codeBoxErr:    { borderColor: C.borderErr },
  resendRow:     { alignItems: "center", marginTop: 4 },
  resendText:    { fontSize: 14, fontWeight: "700", color: C.orange },
  resentText:    { fontSize: 14, fontWeight: "600", color: C.muted },
  footer:        { paddingHorizontal: 24, paddingTop: 12, backgroundColor: C.bg },
  verifyBtn:     { backgroundColor: C.deep, borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  verifyBtnDisabled: { opacity: 0.3 },
  verifyBtnText: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.1 },
});
