import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackBtn, BigBtn, ProgressDots } from "@/lib/onboardingAtoms";
import { CHIP_COLORS, F, G } from "@/lib/tokens";
import { useOnboarding, type Traveler } from "@/lib/onboardingContext";

const AGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

export default function WhoScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();

  const [travelers, setTravelers] = useState<Traveler[]>(
    data.travelers.length > 0
      ? data.travelers
      : [{ id: 0, init: "Y", name: "You", isParent: true }]
  );
  const [addingType, setAddingType] = useState<"child" | "adult" | null>(null);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState(8);

  const children = travelers.filter(t => !t.isParent);
  const adults = travelers.filter(t => t.isParent);
  const youngest = children.sort((a, b) => (a.age ?? 99) - (b.age ?? 99))[0];
  const hasU5 = children.some(t => (t.age ?? 99) <= 5);

  function confirmAdd() {
    if (!newName.trim()) return;
    setTravelers(prev => [
      ...prev,
      {
        id: Date.now(),
        init: newName.trim()[0].toUpperCase(),
        name: newName.trim(),
        isParent: addingType === "adult",
        ...(addingType === "child" ? { age: newAge } : {}),
      },
    ]);
    setNewName(""); setNewAge(8); setAddingType(null);
  }

  function remove(id: number) {
    setTravelers(prev => prev.filter(t => t.id !== id));
  }

  function handleContinue() {
    set({ travelers });
    router.push("/onboarding/when");
  }

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.navRow}>
          <BackBtn onPress={() => router.back()} />
          <View style={{ flex: 1, alignItems: "center" }}><ProgressDots total={4} cur={1} /></View>
          <View style={{ width: 40 }} />
        </View>
        <Text style={s.title}>Who's going? 👨‍👩‍👧‍👦</Text>
        <Text style={s.sub}>We'll adjust every stop for their ages.</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.scroll, { paddingBottom: 140 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Traveler bubbles */}
        <View style={s.bubbles}>
          {travelers.map((t, i) => {
            const bg = t.isParent ? G.deep : CHIP_COLORS[i % CHIP_COLORS.length];
            return (
              <View key={t.id} style={s.bubbleWrap}>
                <View style={[s.bubble, { backgroundColor: bg, shadowColor: bg }]}>
                  <Text style={s.bubbleInit}>{t.init}</Text>
                  {!t.isParent && (
                    <View style={s.ageBadge}>
                      <Text style={[s.ageBadgeText, { color: bg }]}>{t.age}</Text>
                    </View>
                  )}
                  {i > 0 && (
                    <Pressable onPress={() => remove(t.id)} style={s.removeBtn}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>×</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={s.bubbleName}>{t.name}</Text>
                <Text style={s.bubbleRole}>{t.isParent ? "Adult" : `Age ${t.age}`}</Text>
              </View>
            );
          })}
        </View>

        {/* Add buttons */}
        {!addingType && (
          <View style={s.addRow}>
            <Pressable onPress={() => setAddingType("child")} style={s.addChildBtn}>
              <View style={s.addIcon}>
                <Text style={{ color: "#fff", fontSize: 20 }}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.addLabel, { color: G.orange }]}>Add a child</Text>
                <Text style={s.addSub}>Name and age</Text>
              </View>
            </Pressable>
            {adults.length < 3 && (
              <Pressable onPress={() => setAddingType("adult")} style={s.addAdultBtn}>
                <View style={s.addIconGray}>
                  <Text style={{ color: G.muted, fontSize: 20 }}>+</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.addLabel}>Add an adult</Text>
                  <Text style={s.addSub} numberOfLines={2}>Partner, grandparent…</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* Add form */}
        {addingType && (
          <View style={s.form}>
            <Text style={s.formTitle}>ADD {addingType === "child" ? "A CHILD" : "AN ADULT"}</Text>
            <Text style={s.formLabel}>NAME</Text>
            <View style={[s.formInput, { borderColor: newName ? "rgba(232,105,42,0.4)" : "rgba(26,31,46,0.1)" }]}>
              <TextInput
                style={{ fontFamily: F.regular, fontSize: 15, color: G.deep, flex: 1 }}
                value={newName}
                onChangeText={setNewName}
                placeholder={addingType === "child" ? "e.g. Aarav" : "e.g. Partner"}
                placeholderTextColor={G.muted}
                autoFocus
              />
            </View>
            {addingType === "child" && (
              <>
                <Text style={[s.formLabel, { marginTop: 4 }]}>AGE</Text>
                <View style={s.ageGrid}>
                  {AGES.map(a => (
                    <Pressable key={a} onPress={() => setNewAge(a)} style={[s.ageChip, { backgroundColor: newAge === a ? G.orange : "rgba(26,31,46,0.06)", borderColor: newAge === a ? G.orange : "transparent" }]}>
                      <Text style={{ fontFamily: newAge === a ? F.bold : F.regular, fontSize: 14, fontWeight: newAge === a ? "700" : "400", color: newAge === a ? "#fff" : G.deep }}>{a}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <View style={s.formActions}>
              <Pressable onPress={() => { setAddingType(null); setNewName(""); setNewAge(8); }} style={s.cancelBtn}>
                <Text style={{ fontFamily: F.semibold, fontSize: 14, color: G.muted }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmAdd} disabled={!newName.trim()} style={[s.confirmBtn, { backgroundColor: newName.trim() ? G.orange : "rgba(232,105,42,0.3)" }]}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, fontWeight: "700", color: "#fff" }}>Add {newName || addingType}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Smart adaptation note */}
        {youngest && (
          <View style={s.note}>
            <Text style={s.noteTitle}>✓ Plan adapts for your family</Text>
            <Text style={s.noteBody}>
              {(youngest.age ?? 0) <= 4
                ? `With a ${youngest.age}-year-old, we'll keep stops under 45 min and build in rest breaks.`
                : (youngest.age ?? 0) <= 7
                ? "We'll mix hands-on experiences with landmarks — right for ages 5–7."
                : "Old enough for deep exploration, missions, and real discovery."}
            </Text>
            {hasU5 && <Text style={s.noteExtra}>🚼 Stroller-friendly stops prioritised</Text>}
          </View>
        )}
      </ScrollView>

      <View style={[s.cta, { paddingBottom: insets.bottom + 20 }]}>
        <BigBtn label="Continue →" onPress={handleContinue} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, flexShrink: 0 },
  navRow: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  title: { fontFamily: F.bold, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, color: G.deep, marginBottom: 6 },
  sub: { fontFamily: F.regular, fontSize: 16, color: G.muted, marginBottom: 20 },
  scroll: { paddingHorizontal: 24 },
  bubbles: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 24 },
  bubbleWrap: { alignItems: "center", gap: 5 },
  bubble: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 4 },
  bubbleInit: { fontFamily: F.bold, fontSize: 20, fontWeight: "700", color: "#fff" },
  ageBadge: { position: "absolute", bottom: -4, right: -4, backgroundColor: G.card, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1.5, borderColor: G.bg },
  ageBadgeText: { fontFamily: F.bold, fontSize: 11, fontWeight: "700" },
  removeBtn: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: G.muted, alignItems: "center", justifyContent: "center" },
  bubbleName: { fontFamily: F.medium, fontSize: 12 },
  bubbleRole: { fontFamily: F.regular, fontSize: 11, color: G.muted },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  addChildBtn: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(232,105,42,0.4)", padding: 12, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: G.oLt },
  addAdultBtn: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(138,143,168,0.3)", padding: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  addIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: G.orange, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addIconGray: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(26,31,46,0.08)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addLabel: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.deep },
  addSub: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  form: { backgroundColor: G.card, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: G.orange, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  formTitle: { fontFamily: F.bold, fontSize: 13, fontWeight: "700", color: G.orange, letterSpacing: 1, marginBottom: 14 },
  formLabel: { fontFamily: F.semibold, fontSize: 12, fontWeight: "600", color: G.muted, letterSpacing: 0.4, marginBottom: 6 },
  formInput: { backgroundColor: G.bg, borderRadius: 12, borderWidth: 1.5, height: 48, paddingHorizontal: 14, justifyContent: "center", marginBottom: 16 },
  ageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 18 },
  ageChip: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  formActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: "rgba(26,31,46,0.06)", alignItems: "center", justifyContent: "center" },
  confirmBtn: { flex: 2, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  note: { backgroundColor: G.sageLt, borderWidth: 1, borderColor: "rgba(122,158,142,0.25)", borderRadius: 16, padding: 14 },
  noteTitle: { fontFamily: F.bold, fontSize: 13, fontWeight: "700", color: G.sage, marginBottom: 6 },
  noteBody: { fontFamily: F.regular, fontSize: 13, color: G.deep, lineHeight: 20 },
  noteExtra: { fontFamily: F.regular, fontSize: 12, color: G.sage, marginTop: 6 },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 14 },
});
