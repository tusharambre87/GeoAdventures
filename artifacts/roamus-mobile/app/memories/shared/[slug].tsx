import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/lib/authContext";
import { useWikiPhoto } from "@/lib/useWikiPhoto";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SharedStop {
  id: string;
  name: string;
  type?: string;
  cityGroup?: string;
  listenSummary?: string;
  imageUrl?: string;
}

interface SharedItinerary {
  title?: string;
  destination: string;
  durationDays?: number;
  partySize?: number;
  styleTags?: string[];
  stops?: SharedStop[];
}

// ─── Stop row ────────────────────────────────────────────────────────────────

function StopRow({ stop, index }: { stop: SharedStop; index: number }) {
  const thumb = useWikiPhoto(
    stop.name,
    stop.imageUrl ?? "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=60",
    stop.cityGroup
  );

  return (
    <View style={s.stopRow}>
      <View style={s.stopNumWrap}>
        <Text style={s.stopNum}>{index + 1}</Text>
      </View>
      <Image source={{ uri: thumb }} style={s.stopThumb} contentFit="cover" />
      <View style={s.stopBody}>
        <Text style={s.stopName} numberOfLines={1}>{stop.name}</Text>
        {stop.listenSummary ? (
          <Text style={s.stopSummary} numberOfLines={2}>{stop.listenSummary}</Text>
        ) : (
          <Text style={s.stopSummary} numberOfLines={1}>
            {stop.type ? `${stop.type.charAt(0).toUpperCase()}${stop.type.slice(1)}` : "Stop"}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <View style={s.center}>
      <ActivityIndicator color="#E8692A" size="large" />
      <Text style={s.loadingText}>Loading itinerary...</Text>
    </View>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <View style={s.center}>
      <Text style={s.errorIcon}>!</Text>
      <Text style={s.errorText}>{message}</Text>
      <Pressable style={s.errorBtn} onPress={() => router.push("/onboarding/where")}>
        <Text style={s.errorBtnText}>Plan your own trip</Text>
      </Pressable>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SharedItineraryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [itinerary, setItinerary] = useState<SharedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/api/travel/shares/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<SharedItinerary>;
      })
      .then(data => {
        setItinerary(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <LoadingState />;
  if (error || !itinerary) return <ErrorState message="This itinerary isn't available." />;

  const title = itinerary.title ?? `${itinerary.destination} Family Trip`;
  const meta = [
    itinerary.destination,
    itinerary.durationDays ? `${itinerary.durationDays} days` : null,
    itinerary.partySize ? `${itinerary.partySize} traveller${itinerary.partySize !== 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Back / close */}
      <Pressable
        style={[s.backBtn, { top: insets.top + 12 }]}
        hitSlop={12}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
      >
        <Text style={s.backArrow}>{"<"}</Text>
      </Pressable>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.badge}>
            <Text style={s.badgeText}>Shared trip</Text>
          </View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.meta}>{meta}</Text>
        </View>

        {/* ── Style tags ── */}
        {(itinerary.styleTags?.length ?? 0) > 0 && (
          <View style={s.tagsRow}>
            {itinerary.styleTags!.map(tag => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Stops ── */}
        {(itinerary.stops?.length ?? 0) > 0 ? (
          <>
            <Text style={s.sectionLabel}>
              {itinerary.stops!.length} stop{itinerary.stops!.length !== 1 ? "s" : ""}
            </Text>
            {itinerary.stops!.map((stop, i) => (
              <StopRow key={stop.id ?? i} stop={stop} index={i} />
            ))}
          </>
        ) : (
          <Text style={s.emptyStops}>No stops listed for this itinerary.</Text>
        )}

        {/* ── CTA ── */}
        <View style={s.ctaWrap}>
          <Pressable
            style={s.ctaBtn}
            onPress={() => router.push("/onboarding/where")}
          >
            <Text style={s.ctaText}>
              Plan your own {itinerary.destination} trip
            </Text>
            <Text style={s.ctaArrow}> →</Text>
          </Pressable>
          <Text style={s.ctaTagline}>Free to start. No credit card needed.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F2EE",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 56,
  },

  // Back button
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(26,31,46,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 18,
    color: "#1A1F2E",
    fontFamily: "PlusJakartaSans_600SemiBold",
    lineHeight: 22,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8692A",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#fff",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1A1F2E",
    marginBottom: 6,
    lineHeight: 32,
  },
  meta: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6B7280",
    lineHeight: 20,
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: "#1A1F2E",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#F5F2EE",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "rgba(26,31,46,0.1)",
    marginBottom: 20,
  },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Stop row
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stopNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8692A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stopNum: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#fff",
  },
  stopThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
  },
  stopBody: {
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1A1F2E",
    marginBottom: 3,
  },
  stopSummary: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6B7280",
    lineHeight: 18,
  },

  // CTA
  ctaWrap: {
    marginTop: 32,
    alignItems: "center",
  },
  ctaBtn: {
    flexDirection: "row",
    backgroundColor: "#E8692A",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#E8692A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#fff",
  },
  ctaArrow: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#fff",
  },
  ctaTagline: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#9CA3AF",
  },

  // Loading / error
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F2EE",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6B7280",
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(232,105,42,0.12)",
    textAlign: "center",
    lineHeight: 56,
    fontSize: 24,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#E8692A",
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#1A1F2E",
    textAlign: "center",
    marginBottom: 24,
  },
  errorBtn: {
    backgroundColor: "#1A1F2E",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  errorBtnText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#F5F2EE",
  },
  emptyStops: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 24,
  },
});
