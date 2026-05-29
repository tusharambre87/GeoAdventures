import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { travelAPI } from "@/lib/apiClient";
import { API_BASE } from "@/lib/authContext";
import { F, G } from "@/lib/tokens";
import { useLandmarkImage } from "@/lib/useLandmarkImage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STOP_TAG: Record<string, { label: string; color: string }> = {
  museum: { label: "Museum", color: "#7B6FE8" },
  park: { label: "Outdoors", color: G.sage },
  nature: { label: "Outdoors", color: G.sage },
  garden: { label: "Outdoors", color: G.sage },
  food: { label: "Food", color: G.amber },
  restaurant: { label: "Food", color: G.amber },
  landmark: { label: "Landmark", color: G.muted },
  zoo: { label: "Animals", color: G.orange },
  aquarium: { label: "Animals", color: G.orange },
  art: { label: "Art", color: "#E86A9A" },
  science: { label: "Science", color: G.sage },
  entertainment: { label: "Fun", color: "#7B6FE8" },
  beach: { label: "Beach", color: "#4B9EE8" },
};

function stopTag(stopType?: string | null) {
  if (!stopType) return { label: "Stop", color: G.muted };
  const key = Object.keys(STOP_TAG).find(k => stopType.toLowerCase().includes(k));
  return key ? STOP_TAG[key] : { label: "Stop", color: G.muted };
}

function StopRow({ stop }: { stop: { id: string; name: string; description?: string; stopType?: string; displayOrder?: number } }) {
  const [heroImg, setHeroImg] = useState<string | null>(null);
  const tag = stopTag(stop.stopType);

  useEffect(() => {
    let cancelled = false;
    async function loadImage() {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const res = await fetch(`${API_BASE}/api/travel/stops/${stop.id}/hero-image`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.url) setHeroImg(data.url);
        }
      } catch {
        // no image — stay null
      }
    }
    loadImage();
    return () => { cancelled = true; };
  }, [stop.id]);

  return (
    <View style={s.stopCard}>
      <View style={s.stopImgWrap}>
        {heroImg ? (
          <Image source={{ uri: heroImg }} style={s.stopImg} contentFit="cover" />
        ) : (
          <View style={[s.stopImg, s.stopImgPlaceholder]}>
            <Ionicons name="image-outline" size={20} color={G.muted} />
          </View>
        )}
      </View>
      <View style={s.stopBody}>
        <Text style={s.stopName} numberOfLines={1}>{stop.name}</Text>
        {stop.description ? (
          <Text style={s.stopDesc} numberOfLines={2}>{stop.description}</Text>
        ) : null}
        <View style={[s.stopTagPill, { backgroundColor: tag.color + "18", borderColor: tag.color + "33" }]}>
          <Text style={[s.stopTagText, { color: tag.color }]}>{tag.label}</Text>
        </View>
      </View>
    </View>
  );
}

export default function TripDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();

  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => travelAPI.getTrip(tripId!),
    enabled: !!tripId,
    retry: 1,
  });

  const city = trip?.destination ?? trip?.name ?? "";
  const landmarkImg = useLandmarkImage(city || null);
  // Prefer landmark art; fall back to trip's own photo; colour placeholder when null
  const heroImg = landmarkImg ?? trip?.coverImageUrl ?? trip?.firstPhotoUrl ?? null;
  const stops = (trip as any)?.stops ?? [];
  const sortedStops = [...stops].sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      {/* Hero */}
      <View style={[s.hero, { paddingTop: insets.top }]}>
        {heroImg ? (
          <Image source={{ uri: heroImg }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: G.deep }]} />
        )}
        <LinearGradient
          colors={["rgba(6,8,16,0.35)", "rgba(6,8,16,0.8)"]}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Back */}
        <Pressable
          style={[s.backBtn, { top: insets.top + 14 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={s.heroContent}>
          <Text style={s.heroCity}>{city || trip?.name}</Text>
          <Text style={s.heroMeta}>
            {(trip as any)?.travelers?.length
              ? `${(trip as any).travelers.length} traveler${(trip as any).travelers.length !== 1 ? "s" : ""}`
              : ""}
            {stops.length > 0 ? `  ·  ${stops.length} stops` : ""}
          </Text>
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={G.orange} />
          <Text style={s.loadingText}>Loading your trip…</Text>
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Ionicons name="wifi-outline" size={32} color="#DC2626" />
          <Text style={{ fontFamily: F.bold, fontSize: 16, color: "#DC2626", marginTop: 8 }}>Couldn't load trip</Text>
          <Pressable style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.sectionTitle}>Your Stops</Text>
          {sortedStops.length === 0 ? (
            <View style={s.emptyStops}>
              <ActivityIndicator size="small" color={G.orange} />
              <Text style={{ fontFamily: F.regular, fontSize: 14, color: G.muted, marginTop: 8 }}>
                Stops are being generated…
              </Text>
            </View>
          ) : (
            sortedStops.map((stop: any) => <StopRow key={stop.id} stop={stop} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: 240, position: "relative", justifyContent: "flex-end" },
  backBtn: { position: "absolute", left: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  heroContent: { padding: 20, paddingTop: 0 },
  heroCity: { fontFamily: F.bold, fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: -0.7, marginBottom: 4 },
  heroMeta: { fontFamily: F.regular, fontSize: 14, color: "rgba(255,255,255,0.7)" },

  body: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  sectionTitle: { fontFamily: F.bold, fontSize: 18, fontWeight: "700", color: G.deep, marginBottom: 4 },

  stopCard: {
    flexDirection: "row", backgroundColor: G.card, borderRadius: 16,
    overflow: "hidden", borderWidth: 1, borderColor: "rgba(26,31,46,0.07)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  stopImgWrap: { width: 86, flexShrink: 0 },
  stopImg: { width: 86, height: 90 },
  stopImgPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: G.muted + "18" },
  stopBody: { flex: 1, padding: 12, gap: 4 },
  stopName: { fontFamily: F.bold, fontSize: 15, fontWeight: "700", color: G.deep },
  stopDesc: { fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 17 },
  stopTagPill: { alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  stopTagText: { fontFamily: F.medium, fontSize: 11, fontWeight: "500" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  loadingText: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  retryBtn: { backgroundColor: G.orange, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  retryBtnText: { fontFamily: F.bold, fontSize: 14, fontWeight: "700", color: "#fff" },

  emptyStops: { alignItems: "center", paddingVertical: 32 },
});
