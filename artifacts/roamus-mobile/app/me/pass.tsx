import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "@/lib/authContext";
import { F, G } from "@/lib/tokens";

type UserData = {
  id: string;
  email: string;
  firstName?: string;
  subscriptionTier?: string;
  subscriptionEndDate?: string | null;
  isFoundingFamily?: boolean;
  foundingFamilyNumber?: number | null;
};

const FEATURES = [
  { icon: "🗺️", title: "Full trip plans", sub: "Day-by-day itineraries for every city" },
  { icon: "🧭", title: "Kids Explorer Zone", sub: "Stories, missions, and games" },
  { icon: "📸", title: "Memories & stories", sub: "Auto-generated photo journals" },
  { icon: "✈️", title: "Unlimited trips", sub: "Plan as many adventures as you like" },
  { icon: "📶", title: "Offline mode", sub: "Access your trip without signal" },
];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function PassScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load user");
      const data = await res.json();
      setUser(data.user ?? data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const tier = user?.subscriptionTier?.toLowerCase() ?? 'free';

  const isFree = !user?.subscriptionTier ||
    tier === 'free' ||
    tier === 'explorer';

  const isAnnual =
    tier === 'annual' ||
    tier === 'geopass_annual' ||
    tier.includes('annual');

  const isMonthly = !isFree && !isAnnual;

  const planName = isAnnual ? 'RoamUs Pass Annual' : 'RoamUs Pass Monthly';
  const planPrice = isAnnual ? '$24.99/year · Up to 4 kids' : '$2.99/month · Up to 4 kids';
  const isSubscribed = !isFree;
  const planPriceShort = planPrice.split(' · ')[0];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <Pressable style={s.backPill} onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backPillText}>{"← Me"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={G.orange} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          <View style={s.subHeader}>
            <Text style={s.subH}>RoamUs Pass</Text>
            <Text style={s.subS}>
              {isSubscribed ? "Manage your subscription" : "Unlock the full experience"}
            </Text>
          </View>

          {isSubscribed ? (
            <>
              {/* Hero card */}
              <LinearGradient
                colors={["#1A1F2E", "#0F2236"]}
                style={s.passHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={s.passActivePill}>
                  <View style={s.passDot} />
                  <Text style={s.passActiveText}>{"ACTIVE"}</Text>
                </View>
                <Text style={s.planName}>{planName}</Text>
                <Text style={s.priceRow}>{planPrice}</Text>
                <View style={s.renewCard}>
                  <Text style={s.renewText}>
                    {"Next renewal: "}
                    <Text style={s.renewStrong}>{formatDate(user?.subscriptionEndDate)}</Text>
                  </Text>
                </View>
              </LinearGradient>

              {/* Founding Explorer */}
              {user?.isFoundingFamily && (
                <View style={s.foundingCard}>
                  <Text style={s.foundingIco}>{"🌟"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.foundingTitle}>
                      {"Founding Explorer #"}{user.foundingFamilyNumber ?? ""}
                    </Text>
                    <Text style={s.foundingSub}>
                      {"You're one of our first 100 families. Thank you."}
                    </Text>
                  </View>
                </View>
              )}

              {/* Features checklist */}
              <Text style={s.secLbl}>{"WHAT'S INCLUDED"}</Text>
              <View style={s.card}>
                {FEATURES.map((f, i) => (
                  <View key={f.title} style={[s.featRow, i < FEATURES.length - 1 && s.featBorder]}>
                    <Text style={s.featIco}>{f.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.featTitle}>{f.title}</Text>
                      <Text style={s.featSub}>{f.sub}</Text>
                    </View>
                    <Text style={s.featCheck}>{"✓"}</Text>
                  </View>
                ))}
              </View>

              {/* Annual upgrade (monthly only) */}
              {isMonthly && (
                <>
                  <Text style={s.secLbl}>{"SAVE MORE"}</Text>
                  <View style={s.card}>
                    <Pressable
                      style={({ pressed }) => [s.upgradeRow, pressed && { opacity: 0.8 }]}
                      onPress={() =>
                        Alert.alert(
                          "Coming Soon",
                          "Annual upgrade is coming shortly — check back soon!"
                        )
                      }
                    >
                      <View style={s.upgradeIconWrap}>
                        <Text style={{ fontSize: 20 }}>{"📅"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.upgradeTitle}>{"Switch to Annual"}</Text>
                        {/* TODO: pull from pricing API */}
                        <Text style={s.upgradeSub}>{"$24.99/yr — save 30%"}</Text>
                      </View>
                      <View style={s.saveTag}>
                        <Text style={s.saveTagText}>{"Save 30%"}</Text>
                      </View>
                      <Text style={s.rowArrow}>{"›"}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Manage link */}
              <Pressable
                style={s.manageLink}
                onPress={() =>
                  Linking.openURL(
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com/account/subscriptions'
                    : 'https://play.google.com/store/account/subscriptions'
                ).catch(() => {})
                }
              >
                <Text style={s.manageLinkText}>{"Manage subscription →"}</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Free user upgrade prompt */}
              <View style={s.upgradePromptCard}>
                <Text style={s.upgradePHeading}>{"Unlock the full RoamUs experience"}</Text>
                <Text style={s.upgradePSub}>
                  {"Everything your family needs for an unforgettable adventure."}
                </Text>
              </View>

              <Text style={s.secLbl}>{"INCLUDED WITH PASS"}</Text>
              <View style={s.card}>
                {FEATURES.map((f, i) => (
                  <View key={f.title} style={[s.featRow, i < FEATURES.length - 1 && s.featBorder]}>
                    <Text style={s.featIco}>{f.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.featTitle}>{f.title}</Text>
                      <Text style={s.featSub}>{f.sub}</Text>
                    </View>
                    <Text style={s.featLock}>{"🔒"}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [s.upgradeCTA, pressed && { opacity: 0.88 }]}
                onPress={() => router.push("/onboarding/upgrade" as never)}
              >
                <Text style={s.upgradeCTAText}>{"Upgrade to RoamUs Pass — " + planPriceShort}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginBottom: 16, textAlign: "center" },
  retryBtn: {
    backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  retryText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  backPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,31,46,0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  backPillText: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  subHeader: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  subH: { fontFamily: F.bold, fontSize: 26, color: G.deep, letterSpacing: -0.5, marginBottom: 3 },
  subS: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  passHero: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
  },
  passActivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(61,170,110,0.2)",
    borderWidth: 1,
    borderColor: "rgba(61,170,110,0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  passDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: G.green },
  passActiveText: { fontFamily: F.bold, fontSize: 10, color: G.green, letterSpacing: 0.6 },
  planName: { fontFamily: F.bold, fontSize: 26, color: "#fff", marginBottom: 4 },
  priceRow: { fontFamily: F.regular, fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 16 },
  renewCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  renewText: { fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.55)" },
  renewStrong: { fontFamily: F.bold, color: "#fff" },
  foundingCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F59E0B",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  foundingIco: { fontSize: 28, flexShrink: 0 },
  foundingTitle: { fontFamily: F.bold, fontSize: 15, color: "#92400E", marginBottom: 2 },
  foundingSub: { fontFamily: F.regular, fontSize: 13, color: "#B45309" },
  secLbl: {
    fontFamily: F.bold,
    fontSize: 11,
    color: G.muted,
    letterSpacing: 0.8,
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
  },
  featRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  featBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(26,31,46,0.08)" },
  featIco: { fontSize: 20, width: 32, textAlign: "center", flexShrink: 0 },
  featTitle: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  featSub: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  featCheck: { fontFamily: F.bold, fontSize: 16, color: G.green, flexShrink: 0 },
  featLock: { fontSize: 16, flexShrink: 0 },
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  upgradeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: G.oLt,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  upgradeTitle: { fontFamily: F.bold, fontSize: 15, color: G.deep, marginBottom: 2 },
  upgradeSub: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  saveTag: {
    backgroundColor: G.oLt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saveTagText: { fontFamily: F.bold, fontSize: 11, color: G.orange },
  rowArrow: { fontFamily: F.regular, fontSize: 20, color: "#C4C8D8" },
  manageLink: { alignItems: "center", paddingVertical: 16 },
  manageLinkText: { fontFamily: F.semibold, fontSize: 13, color: G.muted },
  upgradePromptCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: G.deep,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  upgradePHeading: {
    fontFamily: F.bold,
    fontSize: 20,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  upgradePSub: {
    fontFamily: F.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 20,
  },
  upgradeCTA: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: G.orange,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  upgradeCTAText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
});
