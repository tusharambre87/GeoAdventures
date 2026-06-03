import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
};

export default function EmailSent() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const displayEmail = email ?? "your inbox";

  const [resending, setResending] = useState(false);
  const [resent, setResent]       = useState(false);

  async function handleResend() {
    if (resending || !email) return;
    setResending(true);
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // silent — always show success
    } finally {
      setResending(false);
      setResent(true);
    }
  }

  return (
    <View style={styles.root}>
      <View style={{ height: insets.top || 44 }} />

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Mailbox icon */}
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>{"\uD83D\uDCEC"}</Text>
        </View>

        <Text style={styles.heading}>Check your inbox</Text>
        <Text style={styles.subheading}>
          {"We sent a reset link to "}
          <Text style={styles.emailBold}>{displayEmail}</Text>
          {". It expires in 30 minutes."}
        </Text>

        {/* Resend card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>DIDN{"\u2019"}T GET IT?</Text>
          {resent ? (
            <Text style={styles.cardBody}>
              {"Link resent! Check your spam folder if you still don\u2019t see it."}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} activeOpacity={0.75}>
              <Text style={styles.cardBody}>
                {"Check spam, or "}
                <Text style={styles.cardLink}>
                  {resending ? "resending…" : "resend the link \u2192"}
                </Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Back to sign in */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 12 }]}>
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => router.replace("/auth/signin")}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostBtnText}>{"\u2190"} Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  body:       { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 48, textAlign: "center" },
  iconBox:    { width: 88, height: 88, borderRadius: 26, backgroundColor: C.orLt, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  iconEmoji:  { fontSize: 40 },
  heading:    { fontSize: 26, fontWeight: "800", color: C.deep, letterSpacing: -0.4, marginBottom: 10, textAlign: "center" },
  subheading: { fontSize: 15, color: C.muted, lineHeight: 26, marginBottom: 28, textAlign: "center" },
  emailBold:  { fontWeight: "800", color: C.deep },
  infoCard:   { backgroundColor: C.orLt, borderRadius: 16, padding: 16, width: "100%", marginBottom: 8 },
  cardLabel:  { fontSize: 11, fontWeight: "800", color: C.orange, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 },
  cardBody:   { fontSize: 13, color: C.deep, lineHeight: 22 },
  cardLink:   { color: C.orange, fontWeight: "700" },
  footer:     { paddingHorizontal: 24, paddingTop: 8, backgroundColor: C.bg },
  ghostBtn:   { paddingVertical: 14, alignItems: "center" },
  ghostBtnText: { fontSize: 14, fontWeight: "700", color: C.muted },
});
