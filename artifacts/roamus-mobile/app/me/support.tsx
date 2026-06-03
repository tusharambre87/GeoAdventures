import React, { useState } from "react";
import {
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { F, G } from "@/lib/tokens";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    q: "How do I change my trip after it's built?",
    a: "Open your trip on the Trips tab, then tap any stop to edit or swap it. You can also add new stops or reorder them by tapping the pencil icon on the trip detail screen.",
  },
  {
    q: "Does RoamUs work offline?",
    a: "Yes — your trip plan, stop details, and Kids Explorer content are cached when you open your trip while connected. You'll have full access during your adventure even without signal.",
  },
  {
    q: "Can my partner use the same trip?",
    a: "Absolutely. Share the trip by tapping the share icon on the trip screen. Your partner can join using their own RoamUs account and see the full itinerary in real time.",
  },
  {
    q: "How do I cancel my RoamUs Pass?",
    a: 'On iOS, go to Settings → Apple ID → Subscriptions → RoamUs and tap Cancel. On Android, open the Play Store → Subscriptions → RoamUs → Cancel. Your access continues until the end of the billing period.',
  },
  {
    q: "What ages is Kids Explorer designed for?",
    a: "Kids Explorer Zone is built for ages 5–12. Stories, missions, and Wonder Time prompts adapt to the child's age you set during trip setup. Younger kids get simpler questions; older kids get more challenging content.",
  },
  {
    q: "Why is my trip showing the wrong photo?",
    a: "Trip cover photos are pulled automatically from your first city. If the image doesn't look right, tap the trip card on the Trips tab, then tap the photo to replace it with one from your camera roll.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggleFaq(i: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === i ? null : i));
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <Pressable style={s.backPill} onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backPillText}>{"← Me"}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View style={s.subHeader}>
          <Text style={s.subH}>Help & FAQ</Text>
          <Text style={s.subS}>Common questions answered</Text>
        </View>

        <View style={s.contactCard}>
          <Text style={s.contactIco}>{"👋"}</Text>
          <Text style={s.contactH}>{"We're here to help"}</Text>
          <Text style={s.contactS}>
            {"Can't find your answer? Reach us directly — we reply within a few hours."}
          </Text>
          <Pressable
            style={({ pressed }) => [s.contactBtn, pressed && { opacity: 0.85 }]}
            onPress={() => Linking.openURL("mailto:support@roamus.app").catch(() => {})}
          >
            <Text style={s.contactBtnText}>{"Contact support →"}</Text>
          </Pressable>
        </View>

        <Text style={s.secLbl}>FREQUENTLY ASKED</Text>
        <View style={s.card}>
          {FAQS.map((faq, i) => (
            <Pressable
              key={i}
              style={[s.faqItem, i < FAQS.length - 1 && s.faqBorder]}
              onPress={() => toggleFaq(i)}
            >
              <View style={s.faqQRow}>
                <Text style={s.faqQ}>{faq.q}</Text>
                <Text style={[s.faqChevron, openIndex === i && s.faqChevronOpen]}>
                  {"›"}
                </Text>
              </View>
              {openIndex === i && (
                <Text style={s.faqA}>{faq.a}</Text>
              )}
            </Pressable>
          ))}
        </View>

        <Text style={s.versionText}>{"RoamUs v1.0.0 · Made with love for families"}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,31,46,0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  backPillText: {
    fontFamily: F.bold,
    fontSize: 13,
    color: G.deep,
  },
  subHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  subH: {
    fontFamily: F.bold,
    fontSize: 26,
    color: G.deep,
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  subS: {
    fontFamily: F.regular,
    fontSize: 14,
    color: G.muted,
  },
  contactCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: G.deep,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
  },
  contactIco: {
    fontSize: 36,
    marginBottom: 10,
  },
  contactH: {
    fontFamily: F.bold,
    fontSize: 17,
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
  },
  contactS: {
    fontFamily: F.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  contactBtn: {
    backgroundColor: G.orange,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  contactBtnText: {
    fontFamily: F.bold,
    fontSize: 14,
    color: "#fff",
  },
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
  },
  faqItem: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  faqBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,31,46,0.08)",
  },
  faqQRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQ: {
    fontFamily: F.bold,
    fontSize: 14,
    color: G.deep,
    flex: 1,
    lineHeight: 20,
  },
  faqChevron: {
    fontFamily: F.regular,
    fontSize: 20,
    color: "#C4C8D8",
    flexShrink: 0,
    marginTop: 1,
  },
  faqChevronOpen: {
    transform: [{ rotate: "90deg" }],
    color: G.orange,
  },
  faqA: {
    fontFamily: F.regular,
    fontSize: 13,
    color: G.muted,
    lineHeight: 20,
    marginTop: 10,
  },
  versionText: {
    fontFamily: F.regular,
    fontSize: 11,
    color: "#C4C8D8",
    textAlign: "center",
    paddingVertical: 8,
  },
});
