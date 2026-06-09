import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, useAuth } from "@/lib/authContext";
import { F, G } from "@/lib/tokens";

interface TripProp {
  id: string;
  name: string | null;
  destination?: string | null;
  stops?: any[];
}

interface CommunityShareSheetProps {
  visible: boolean;
  onClose: () => void;
  trip: TripProp;
}

export default function CommunityShareSheet({ visible, onClose, trip }: CommunityShareSheetProps) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const slideAnim = useRef(new Animated.Value(700)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const [sharePhotos, setSharePhotos] = useState(false);
  const [showName, setShowName] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(bgAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 700, duration: 220, useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const authFetch = async <T = unknown>(path: string, opts: RequestInit = {}): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers as Record<string, string>),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error((err as any).message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  };

  const handlePublish = async () => {
    setLoading(true);
    try {
      const shareResult = await authFetch<{ id: string; slug: string }>(`/api/travel/trips/${trip.id}/share`, {
        method: "POST",
        body: JSON.stringify({
          title: trip.name,
          description: `${trip.destination ?? trip.name ?? "Trip"} \u00b7 ${trip.stops?.length ?? 0} stops`,
          status: "published",
          includePhotos: sharePhotos,
          authorLabel: showName ? `${(user as any)?.firstName ?? "Your"}'s family` : "A RoamUs family",
        }),
      });

      if (sharePhotos && shareResult.id) {
        const moments = await authFetch<any[]>(`/api/travel/trips/${trip.id}/moments`).catch(() => []);
        const photoUrls = (moments as any[])
          .flatMap((m: any) => m.photoUrls ?? (m.photoUrl ? [m.photoUrl] : []))
          .slice(0, 8);
        if (photoUrls.length > 0) {
          await authFetch(`/api/travel/shares/${shareResult.id}/photos`, {
            method: "POST",
            body: JSON.stringify({ photoUrls }),
          }).catch(() => {});
        }
      }

      onClose();
      Alert.alert(
        "Trip published!",
        "Your trip is now visible in the RoamUs community.",
        [
          {
            text: "Share link",
            onPress: () =>
              Share.share({
                message: `Check out our ${trip.destination ?? trip.name ?? "trip"} family adventure!\nhttps://roamus.app/itinerary/${shareResult.slug}`,
                url: `https://roamus.app/itinerary/${shareResult.slug}`,
              }),
          },
          { text: "Done", style: "cancel" },
        ]
      );
    } catch {
      Alert.alert("Could not publish", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrivateShare = async () => {
    try {
      const shareResult = await authFetch<{ id: string; slug: string }>(`/api/travel/trips/${trip.id}/share`, {
        method: "POST",
        body: JSON.stringify({ title: trip.name, status: "private" }),
      });
      onClose();
      Share.share({
        message: `Check out our ${trip.destination ?? trip.name ?? "trip"} family adventure!\nhttps://roamus.app/itinerary/${shareResult.slug}`,
        url: `https://roamus.app/itinerary/${shareResult.slug}`,
      });
    } catch {
      Alert.alert("Could not share", "Please try again.");
    }
  };

  const firstName = (user as any)?.firstName ?? "Your";

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.48)", opacity: bgAnim }]}
        pointerEvents="box-only"
        onTouchEnd={onClose}
      />
      <Animated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={s.handle} />

        <Text style={s.title}>Share with the community</Text>
        <Text style={s.sub}>Help other families discover great trips</Text>

        {/* ── WHAT GETS SHARED ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>WHAT GETS SHARED</Text>
          {[
            "Trip name and destination",
            "Stop names and descriptions",
            "Days, pace, and family size",
            "Your first name only",
          ].map((line, i) => (
            <View key={i} style={s.checkRow}>
              <Text style={s.checkIcon}>\u2713</Text>
              <Text style={s.checkTxt}>{line}</Text>
            </View>
          ))}
        </View>

        {/* ── YOUR PHOTOS ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>YOUR PHOTOS</Text>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>Share my trip photos</Text>
              <Text style={s.toggleSub}>
                Photos you've added inspire other families planning the same destination
              </Text>
            </View>
            <Switch
              value={sharePhotos}
              onValueChange={setSharePhotos}
              trackColor={{ false: "rgba(26,31,46,0.15)", true: G.orange }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── YOUR NAME ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>YOUR NAME</Text>
          <Text style={s.namePrompt}>Show as:</Text>
          {([
            { label: '"A RoamUs family"', val: false },
            { label: `"${firstName}'s family"`, val: true },
          ] as { label: string; val: boolean }[]).map((opt) => (
            <TouchableOpacity
              key={String(opt.val)}
              style={s.radioRow}
              onPress={() => setShowName(opt.val)}
              activeOpacity={0.7}
            >
              <View style={[s.radioOuter, showName === opt.val && s.radioActive]}>
                {showName === opt.val && <View style={s.radioInner} />}
              </View>
              <Text style={s.radioLabel}>{opt.label}</Text>
              {!opt.val && <View style={s.defaultBadge}><Text style={s.defaultBadgeTxt}>default</Text></View>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.footer}>
          Your sharing helps families like yours discover better trips together.
        </Text>

        <TouchableOpacity style={s.publishBtn} onPress={handlePublish} disabled={loading} activeOpacity={0.88}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.publishBtnTxt}>Publish to community →</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={s.privateBtn} onPress={handlePrivateShare} activeOpacity={0.7}>
          <Text style={s.privateBtnTxt}>Share private link only</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={s.cancelBtnTxt}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 14,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(26,31,46,0.15)",
    alignSelf: "center", marginBottom: 18,
  },
  title: { fontFamily: F.bold, fontSize: 20, color: "#1A1F2E", marginBottom: 4 },
  sub: { fontFamily: F.regular, fontSize: 13, color: "#8A8FA8", marginBottom: 14 },

  section: {
    borderTopWidth: 1, borderTopColor: "rgba(26,31,46,0.07)",
    paddingTop: 14, marginBottom: 12,
  },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, color: "#8A8FA8", letterSpacing: 0.9, marginBottom: 8 },

  checkRow: { flexDirection: "row", gap: 8, marginBottom: 5, alignItems: "flex-start" },
  checkIcon: { fontFamily: F.bold, fontSize: 13, color: "#3DAA6E", width: 16 },
  checkTxt: { fontFamily: F.regular, fontSize: 13, color: "#1A1F2E", flex: 1 },

  toggleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  toggleTitle: { fontFamily: F.bold, fontSize: 14, color: "#1A1F2E", marginBottom: 2 },
  toggleSub: { fontFamily: F.regular, fontSize: 12, color: "#8A8FA8", lineHeight: 17 },

  namePrompt: { fontFamily: F.medium, fontSize: 13, color: "#1A1F2E", marginBottom: 8 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "rgba(26,31,46,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: "#E8692A" },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#E8692A" },
  radioLabel: { fontFamily: F.regular, fontSize: 14, color: "#1A1F2E", flex: 1 },
  defaultBadge: {
    backgroundColor: "rgba(26,31,46,0.07)", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  defaultBadgeTxt: { fontFamily: F.bold, fontSize: 10, color: "#8A8FA8" },

  footer: {
    fontFamily: F.regular, fontSize: 12, color: "#8A8FA8",
    textAlign: "center", marginBottom: 16, lineHeight: 17,
  },

  publishBtn: {
    backgroundColor: "#E8692A", borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginBottom: 10,
  },
  publishBtnTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  privateBtn: { paddingVertical: 10, alignItems: "center", marginBottom: 2 },
  privateBtnTxt: { fontFamily: F.medium, fontSize: 14, color: "#8A8FA8" },
  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelBtnTxt: { fontFamily: F.regular, fontSize: 14, color: "#8A8FA8" },
});
