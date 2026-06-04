import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { F } from "@/lib/tokens";
import { API_BASE } from "@/lib/apiClient";

const C = {
  orange:   '#E8692A',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  border:   '#EDEFF6',
};

export interface IndoorAlternativesSheetProps {
  visible:  boolean;
  onClose:  () => void;
  stopId:   string;
  stopName: string;
}

interface KidsNearbyItem {
  name:         string;
  distance:     string;
  agesNote?:    string;
  description?: string;
}

function getStopEmoji(item: KidsNearbyItem): string {
  const text = `${item.name} ${item.description ?? ""}`.toLowerCase();
  if (text.includes("aquarium"))                              return "\uD83D\uDC20";
  if (text.includes("theater") || text.includes("theatre"))  return "\uD83C\uDFAD";
  if (text.includes("planetarium"))                           return "\uD83D\uDD2D";
  if (text.includes("science"))                               return "\uD83D\uDD2C";
  if (text.includes("art museum") || text.includes("art gal"))return "\uD83C\uDFA8";
  if (text.includes("history"))                               return "\uD83D\uDCDC";
  if (text.includes("children") || text.includes("kids"))    return "\uD83E\uDDD2";
  if (text.includes("shop") || text.includes("market") || text.includes("mall")) return "\uD83D\uDECD";
  return "\uD83C\uDFDB";
}

async function fetchNearby(stopId: string): Promise<KidsNearbyItem[]> {
  const token = await AsyncStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/api/travel/stops/${stopId}/nearby`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { food: unknown[]; breaks: unknown[]; kids: KidsNearbyItem[] };
  return data.kids ?? [];
}

export default function IndoorAlternativesSheet({
  visible,
  onClose,
  stopId,
  stopName,
}: IndoorAlternativesSheetProps) {
  const anim     = useRef(new Animated.Value(0)).current;
  const mounted  = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const [options, setOptions]   = useState<KidsNearbyItem[]>([]);
  const [loading, setLoading]   = useState(false);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderRelease:       (_, g) => { if (g.dy > 60) closeRef.current(); },
    })
  ).current;

  if (visible && !mounted.current) mounted.current = true;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (!visible || !stopId) return;
    setLoading(true);
    fetchNearby(stopId)
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [visible, stopId]);

  if (!mounted.current) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.overlay, { opacity: anim }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

      <Animated.View
        style={[s.sheet, {
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }],
        }]}
      >
        {/* Drag handle */}
        <View {...pan.panHandlers} style={s.handle} />

        <Text style={s.title}>Indoor alternatives nearby</Text>
        <Text style={s.sub}>Since weather may affect {stopName}</Text>

        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={s.emptyText}>Finding indoor options...</Text>
          ) : options.length === 0 ? (
            <Text style={s.emptyText}>No indoor alternatives found nearby</Text>
          ) : (
            options.map((item, idx) => (
              <View key={idx} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.cardEmoji}>{getStopEmoji(item)}</Text>
                  <View style={s.cardInfo}>
                    <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.cardMeta}>
                      {item.agesNote ?? "All ages"}
                      {item.distance ? `  ·  ~${item.distance}` : ""}
                    </Text>
                    {!!item.description && (
                      <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={s.switchBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    Alert.alert(
                      `Switch to ${item.name}?`,
                      `This will replace ${stopName} in your plan.`,
                      [{ text: "Cancel", style: "cancel" }, { text: "OK" }]
                    )
                  }
                >
                  <Text style={s.switchBtnText}>{"Switch to this stop \u2192"}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <TouchableOpacity style={s.keepBtn} activeOpacity={0.7} onPress={onClose}>
          <Text style={s.keepBtnText}>Keep original plan</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(15,18,30,0.48)",
    justifyContent: "flex-end",
    zIndex: 200,
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: "88%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 18,
    color: C.deep,
    marginBottom: 4,
  },
  sub: {
    fontFamily: F.medium,
    fontSize: 13,
    color: C.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  scroll: {
    maxHeight: 440,
  },
  emptyText: {
    fontFamily: F.medium,
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    paddingVertical: 36,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.card,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  cardEmoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: F.bold,
    fontSize: 15,
    color: C.deep,
    marginBottom: 2,
  },
  cardMeta: {
    fontFamily: F.medium,
    fontSize: 12,
    color: C.muted,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.muted,
    lineHeight: 17,
  },
  switchBtn: {
    backgroundColor: C.orange,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  switchBtnText: {
    fontFamily: F.bold,
    fontSize: 14,
    color: "#fff",
  },
  keepBtn: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  keepBtnText: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: C.muted,
  },
});
