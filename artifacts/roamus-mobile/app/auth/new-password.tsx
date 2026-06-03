import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
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
  green: "#3DAA6E",
  greenLt: "#E8F7EF",
  muted: "#8A8FA8",
  mutedLt: "#C4C7D4",
  card: "#fff",
  border: "rgba(26,31,46,0.09)",
  borderFocus: "rgba(232,105,42,0.4)",
  borderErr: "rgba(220,38,38,0.35)",
  errBg: "#FEF2F2",
  errText: "#DC2626",
};

function strength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length < 8)  return { level: 0, label: "Too short (min 8 chars)", color: "#E5E7EB" };
  let score = 0;
  if (pw.length >= 10)            score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))    score++;
  if (score <= 1) return { level: 1, label: "Weak",   color: "#F87171" };
  if (score <= 2) return { level: 2, label: "Fair",   color: "#FBBF24" };
  return             { level: 3, label: "Strong", color: C.green };
}

export default function NewPassword() {
  const insets = useSafeAreaInsets();
  const { email, code } = useLocalSearchParams<{ email?: string; code?: string }>();

  const [pw, setPw]           = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [showCf, setShowCf]   = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [cfFocus, setCfFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);

  const str       = strength(pw);
  const mismatch  = confirm.length > 0 && pw !== confirm;
  const canSubmit = pw.length >= 8 && pw === confirm && !loading && !done;

  async function handleSave() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: pw }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDone(true);
        setTimeout(() => router.replace("/auth/signin"), 1800);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={styles.successRoot}>
        <View style={styles.successIconBox}>
          <Text style={styles.successIcon}>{"\u2713"}</Text>
        </View>
        <Text style={styles.successHeading}>Password updated!</Text>
        <Text style={styles.successSub}>Taking you to sign in{"\u2026"}</Text>
      </View>
    );
  }

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
          <Text style={styles.iconEmoji}>{"\uD83D\uDD13"}</Text>
        </View>

        <Text style={styles.heading}>Set new password</Text>
        <Text style={styles.subheading}>
          Choose something memorable — at least 8 characters.
        </Text>

        {/* Error banner */}
        {!!error && (
          <View style={styles.errBanner}>
            <Text style={styles.errIcon}>{"\u26A0\uFE0F"}</Text>
            <Text style={styles.errText}>{error}</Text>
          </View>
        )}

        {/* New password field */}
        <View style={[
          styles.field,
          pwFocus && styles.fieldActive,
        ]}>
          <Text style={styles.fieldIcon}>{"\uD83D\uDD12"}</Text>
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={C.mutedLt}
            secureTextEntry={!showPw}
            value={pw}
            onChangeText={v => { setPw(v); setError(null); }}
            onFocus={() => setPwFocus(true)}
            onBlur={() => setPwFocus(false)}
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={8}>
            <Text style={styles.toggleEye}>{showPw ? "\uD83D\uDC41" : "\uD83D\uDC41\uFE0F"}</Text>
          </TouchableOpacity>
        </View>

        {/* Strength bar */}
        {pw.length > 0 && (
          <View style={styles.strengthWrap}>
            <View style={styles.strengthTrack}>
              {[1, 2, 3].map(n => (
                <View
                  key={n}
                  style={[
                    styles.strengthSeg,
                    { backgroundColor: str.level >= n ? str.color : "#E5E7EB" },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: str.level === 0 ? C.muted : str.color }]}>
              {str.label}
            </Text>
          </View>
        )}

        {/* Confirm password field */}
        <View style={[
          styles.field,
          cfFocus && styles.fieldActive,
          mismatch && styles.fieldErr,
        ]}>
          <Text style={styles.fieldIcon}>{"\u2705"}</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={C.mutedLt}
            secureTextEntry={!showCf}
            value={confirm}
            onChangeText={v => { setConfirm(v); setError(null); }}
            onFocus={() => setCfFocus(true)}
            onBlur={() => setCfFocus(false)}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <TouchableOpacity onPress={() => setShowCf(v => !v)} hitSlop={8}>
            <Text style={styles.toggleEye}>{showCf ? "\uD83D\uDC41" : "\uD83D\uDC41\uFE0F"}</Text>
          </TouchableOpacity>
        </View>

        {mismatch && (
          <Text style={styles.mismatchText}>Passwords don{"\u2019"}t match</Text>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 12 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
          activeOpacity={canSubmit ? 0.88 : 1}
          onPress={handleSave}
          disabled={!canSubmit}
        >
          <Text style={styles.saveBtnText}>
            {loading ? "Saving\u2026" : "Save new password \u2192"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  successRoot:    { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 12 },
  successIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: C.greenLt, alignItems: "center", justifyContent: "center" },
  successIcon:    { fontSize: 36, color: C.green, fontWeight: "900" },
  successHeading: { fontSize: 22, fontWeight: "800", color: C.deep },
  successSub:     { fontSize: 15, color: C.muted },
  sbar:           { height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 20 },
  backPill:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(26,31,46,0.07)", borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  backArrow:      { fontSize: 14, color: C.deep, fontWeight: "700" },
  backText:       { fontSize: 13, fontWeight: "700", color: C.deep },
  scrollContent:  { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  iconBox:        { width: 72, height: 72, borderRadius: 22, backgroundColor: C.orLt, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  iconEmoji:      { fontSize: 32 },
  heading:        { fontSize: 26, fontWeight: "800", color: C.deep, letterSpacing: -0.5, marginBottom: 10 },
  subheading:     { fontSize: 15, color: C.muted, lineHeight: 26, marginBottom: 24 },
  errBanner:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.errBg, borderWidth: 1.5, borderColor: "rgba(220,38,38,0.25)", borderRadius: 12, padding: 12, marginBottom: 16 },
  errIcon:        { fontSize: 16 },
  errText:        { fontSize: 13, fontWeight: "700", color: C.errText, flex: 1 },
  field:          { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, height: 54, paddingHorizontal: 16, marginBottom: 12 },
  fieldActive:    { borderColor: C.borderFocus },
  fieldErr:       { borderColor: C.borderErr },
  fieldIcon:      { fontSize: 18, marginRight: 10 },
  input:          { flex: 1, fontSize: 15, color: C.deep, fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" },
  toggleEye:      { fontSize: 16, paddingLeft: 8 },
  strengthWrap:   { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -4, marginBottom: 12 },
  strengthTrack:  { flexDirection: "row", gap: 4, flex: 1 },
  strengthSeg:    { flex: 1, height: 4, borderRadius: 4 },
  strengthLabel:  { fontSize: 12, fontWeight: "700", minWidth: 52 },
  mismatchText:   { fontSize: 12, color: C.errText, fontWeight: "600", marginTop: -6, marginBottom: 8, marginLeft: 4 },
  footer:         { paddingHorizontal: 24, paddingTop: 12, backgroundColor: C.bg },
  saveBtn:        { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 17, alignItems: "center", shadowColor: C.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 8 },
  saveBtnDisabled:{ opacity: 0.35, shadowOpacity: 0 },
  saveBtnText:    { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.1 },
});
