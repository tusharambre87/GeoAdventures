import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { F, G } from "@/lib/tokens";

export function Wordmark({ size = 22, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <Text style={{ fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }), fontSize: size, letterSpacing: -0.3 }}>
      <Text style={{ fontWeight: "700", color: dark ? "#fff" : G.deep }}>Roam</Text>
      <Text style={{ fontWeight: "700", color: G.orange }}>Us</Text>
    </Text>
  );
}

export function ProgressDots({ total, cur }: { total: number; cur: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === cur ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor:
              i < cur
                ? "rgba(232,105,42,0.35)"
                : i === cur
                ? G.orange
                : "rgba(138,143,168,0.2)",
          }}
        />
      ))}
    </View>
  );
}

export function BackBtn({ onPress, dark = false }: { onPress: () => void; dark?: boolean }) {
  return (
    <Pressable
      onPress={() => { Keyboard.dismiss(); onPress(); }}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      style={[a.backBtn, { backgroundColor: dark ? "rgba(255,255,255,0.15)" : "rgba(26,31,46,0.07)" }]}
    >
      <Ionicons name="arrow-back" size={20} color={dark ? "#fff" : G.deep} />
    </Pressable>
  );
}

export function OCard({
  icon, label, sub, selected, onPress,
}: {
  icon: string; label: string; sub?: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[a.oCard, { backgroundColor: selected ? "rgba(232,105,42,0.06)" : G.card, borderColor: selected ? G.orange : "rgba(26,31,46,0.09)" }]}
    >
      <View style={[a.oCardIcon, { backgroundColor: selected ? G.oLt : "rgba(26,31,46,0.05)" }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, paddingTop: 1 }}>
        <Text style={[a.oCardLabel, { color: selected ? G.orange : G.deep }]}>{label}</Text>
        {sub ? <Text style={a.oCardSub}>{sub}</Text> : null}
      </View>
      <View style={[a.oCardRadio, { borderColor: selected ? G.orange : "rgba(138,143,168,0.3)", backgroundColor: selected ? G.orange : "transparent" }]}>
        {selected && <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>✓</Text>}
      </View>
    </Pressable>
  );
}

export function AChip({ num, icon, label, onEdit }: { num: string; icon: string; label: string; onEdit: () => void }) {
  return (
    <View style={a.achip}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        <View style={a.achipNum}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>{num}</Text>
        </View>
        <Text style={a.achipLabel}>{icon} {label}</Text>
      </View>
      <Pressable onPress={onEdit}>
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: G.orange }}>Change</Text>
      </Pressable>
    </View>
  );
}

export function BigBtn({
  label, onPress, disabled = false, style = {},
}: {
  label: string; onPress: () => void; disabled?: boolean; style?: object;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [a.bigBtn, { backgroundColor: disabled ? "rgba(232,105,42,0.3)" : G.orange, opacity: pressed && !disabled ? 0.88 : 1 }, style]}
    >
      <Text style={a.bigBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostBtn({ label, onPress, color = G.muted }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [a.ghost, { opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[a.ghostText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const a = StyleSheet.create({
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  oCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 13, borderWidth: 1.5, borderRadius: 14, marginBottom: 8,
  },
  oCardIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  oCardLabel: { fontFamily: F.bold, fontSize: 15, fontWeight: "700" },
  oCardSub: { fontFamily: F.regular, fontSize: 13, color: G.muted, marginTop: 2 },
  oCardRadio: { width: 20, height: 20, borderRadius: 10, marginTop: 4, flexShrink: 0, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  achip: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 15,
    backgroundColor: "rgba(232,105,42,0.06)", borderWidth: 1.5, borderColor: "rgba(232,105,42,0.2)", borderRadius: 13, marginBottom: 8,
  },
  achipNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: G.orange, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  achipLabel: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.deep },
  bigBtn: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  bigBtnText: { fontFamily: F.bold, fontSize: 17, fontWeight: "700", color: "#fff" },
  ghost: { paddingVertical: 12, alignItems: "center" },
  ghostText: { fontFamily: F.medium, fontSize: 14, fontWeight: "500" },
});
