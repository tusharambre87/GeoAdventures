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

import { API_BASE } from "@/lib/apiClient";

const C = {
  bg: "#F5F2EE",
  deep: "#1A1F2E",
  orange: "#E8692A",
  orLt: "#FDF0E9",
  muted: "#8A8FA8",
  mutedLt: "#C4C7D4",
  card: "#fff",
  border: "rgba(26,31,46,0.09)",
  borderFocus: "rgba(232,105,42,0.4)",
};

export default function ForgotPassword() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail]       = useState(params.email ?? "");
  const [emailFocus, setFocus]  = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSend() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        console.log("[forgot] endpoint returned", res.status, "— navigating anyway");
      }
    } catch (err) {
      console.log("[forgot] network error:", err);
    } finally {
      setLoading(false);
    }
    router.push({ pathname: "/auth/email-sent", params: { email: email.trim().toLowerCase() } });
  }

  const emailFilled = email.trim().length > 0;

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
        {/* Key icon */}
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>{"\uD83D\uDD11"}</Text>
        </View>

        <Text style={styles.heading}>Reset your password</Text>
        <Text style={styles.subheading}>
          Enter your email and we{"’"}ll send a reset link. Check your inbox — it arrives in under a minute.
        </Text>

        {/* Email field */}
        <View style={[
          styles.field,
          (emailFocus || emailFilled) && styles.fieldActive,
        ]}>
          <Text style={styles.fieldIcon}>{"\u2709\ufe0f"}</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={C.mutedLt}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onSubmitEditing={handleSend}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 12 }]}>
        <TouchableOpacity
          style={[styles.sendBtn, (!emailFilled || loading) && styles.sendBtnDisabled]}
          activeOpacity={emailFilled && !loading ? 0.88 : 1}
          onPress={handleSend}
          disabled={!emailFilled || loading}
        >
          <Text style={styles.sendBtnText}>
            {loading ? "Sending…" : "Send reset link →"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostBtnText}>Back to sign in</Text>
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
  subheading:    { fontSize: 15, color: C.muted, lineHeight: 26, marginBottom: 28 },
  field:         { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, height: 54, paddingHorizontal: 16, marginBottom: 12 },
  fieldActive:   { borderColor: C.borderFocus },
  fieldIcon:     { fontSize: 18, marginRight: 10 },
  input:         { flex: 1, fontSize: 15, color: C.deep, fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" },
  footer:        { paddingHorizontal: 24, paddingTop: 12, backgroundColor: C.bg },
  sendBtn:       { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 17, alignItems: "center", marginBottom: 8, shadowColor: C.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 8 },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText:   { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.1 },
  ghostBtn:      { paddingVertical: 12, alignItems: "center" },
  ghostBtnText:  { fontSize: 14, fontWeight: "700", color: C.muted },
});
