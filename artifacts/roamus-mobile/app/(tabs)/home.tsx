/**
 * Home tab — "no active trip" discover state.
 * Reuses HeroCard, GridCard, filter chips, and data-fetching pattern from
 * app/discover/index.tsx (components exported from there, not duplicated here).
 */

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/lib/authContext";
import { API_BASE } from "@/lib/apiClient";
import { F, G } from "@/lib/tokens";
import {
  AI_PICKS,
  AGE_FILTERS,
  CITY_FILTERS,
  DURATION_FILTERS,
  DiscoverItem,
  CommunityShare,
  GridCard,
  HeroCard,
  getDestinationImage,
  normalizeShare,
} from "@/app/discover/index";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Teaser strip ─────────────────────────────────────────────────────────────

function TeaserStrip({
  emoji,
  title,
  subtitle,
  ctaLabel,
  accentColor,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  accentColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={ts.card} onPress={onPress} activeOpacity={0.88}>
      <View style={[ts.iconWrap, { backgroundColor: accentColor + "18" }]}>
        <Text style={ts.icon}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ts.title}>{title}</Text>
        <Text style={ts.sub}>{subtitle}</Text>
      </View>
      <View style={[ts.pill, { backgroundColor: accentColor }]}>
        <Text style={ts.pillTxt}>{ctaLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const ts = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: G.card,
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(26,31,46,0.07)",
    padding: 14,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  icon: { fontSize: 22 },
  title: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  sub: { fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 17 },
  pill: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  pillTxt: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const firstName = user?.firstName || user?.username || null;

  const [tab, setTab] = useState<"community" | "ai">("community");
  const [communityItems, setCommunityItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickUpvoted, setQuickUpvoted] = useState<Record<string, boolean>>({});

  const [activeCity, setActiveCity] = useState("All");
  const [activeDuration, setActiveDuration] = useState<string | null>(null);
  const [activeAge, setActiveAge] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/travel/shares?limit=30`)
      .then(r => r.json())
      .then(async (data: CommunityShare[]) => {
        if (!Array.isArray(data)) return;
        const normalized = data.map(normalizeShare);
        const enriched = await Promise.all(
          normalized.map(async item => {
            if (item.heroImageUrl) return item;
            const wikiImg = await getDestinationImage(item.destination);
            return { ...item, heroImageUrl: wikiImg };
          })
        );
        setCommunityItems(enriched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleQuickUpvote(itemId: string) {
    setQuickUpvoted(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    try {
      let vid = await AsyncStorage.getItem("roamus_visitor_id");
      if (!vid || !/^v_[a-z0-9]{10,20}$/.test(vid)) {
        vid = "v_" + Math.random().toString(36).slice(2, 14);
        await AsyncStorage.setItem("roamus_visitor_id", vid);
      }
      await fetch(`${API_BASE}/api/travel/shares/${itemId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: vid }),
      });
    } catch {}
  }

  const rawItems = tab === "community" ? communityItems : AI_PICKS;

  const filtered = useMemo(() => {
    return rawItems.filter(item => {
      if (activeCity !== "All" && !item.destination?.toLowerCase().includes(activeCity.toLowerCase())) return false;
      if (activeDuration === "weekend" && item.durationDays > 2) return false;
      if (activeDuration === "3-5" && (item.durationDays < 3 || item.durationDays > 5)) return false;
      if (activeAge && item.ageRange) {
        const ar = item.ageRange.toLowerCase();
        if (activeAge === "toddlers" && !ar.includes("1") && !ar.includes("2") && !ar.includes("3") && !ar.includes("toddler")) return false;
        if (activeAge === "6-10" && !ar.includes("6") && !ar.includes("7") && !ar.includes("8") && !ar.includes("9") && !ar.includes("10") && ar !== "all ages") return false;
        if (activeAge === "teens" && !ar.includes("12") && !ar.includes("teen") && !ar.includes("13") && ar !== "all ages") return false;
      }
      return true;
    });
  }, [rawItems, activeCity, activeDuration, activeAge]);

  function handlePress(item: DiscoverItem) {
    router.push({
      pathname: "/discover/[slug]" as any,
      params: {
        slug: item.slug,
        isAiPick: item.isAiPick ? "true" : "false",
        heroImageUrl: item.heroImageUrl || "",
      },
    });
  }

  const heroItem = filtered[0];
  const gridItems = filtered.slice(1);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </Text>
          <Text style={s.headerSub}>Plan your next adventure</Text>
        </View>
        <TouchableOpacity
          style={s.planBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/onboarding/where" as any)}
        >
          <Text style={s.planBtnTxt}>Plan a trip →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Community / AI tabs ─────────────────────────────────────── */}
      <View style={s.tabsWrap}>
        <TouchableOpacity
          style={[s.tabBtn, tab === "community" && s.tabBtnOn]}
          onPress={() => setTab("community")}
        >
          <Text style={[s.tabBtnTxt, tab === "community" && s.tabBtnTxtOn]}>Community</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === "ai" && s.tabBtnOn]}
          onPress={() => setTab("ai")}
        >
          <Text style={[s.tabBtnTxt, tab === "ai" && s.tabBtnTxtOn]}>AI Picks</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Filter chips ────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {CITY_FILTERS.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.fchip, activeCity === c && s.fchipOn]}
              onPress={() => setActiveCity(c)}
            >
              <Text style={[s.fchipTxt, activeCity === c && s.fchipTxtOn]}>{c}</Text>
            </TouchableOpacity>
          ))}
          {DURATION_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[s.fchip, activeDuration === f.id && s.fchipOn]}
              onPress={() => setActiveDuration(activeDuration === f.id ? null : f.id)}
            >
              <Text style={[s.fchipTxt, activeDuration === f.id && s.fchipTxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
          {AGE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[s.fchip, activeAge === f.id && s.fchipOn]}
              onPress={() => setActiveAge(activeAge === f.id ? null : f.id)}
            >
              <Text style={[s.fchipTxt, activeAge === f.id && s.fchipTxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── AI banner ───────────────────────────────────────────── */}
        {tab === "ai" && (
          <View style={s.aiBanner}>
            <Text style={s.aiBannerIco}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiBannerTitle}>Curated trips for families</Text>
              <Text style={s.aiBannerSub}>Pick a template — AI adapts stops for your kids' ages and pace.</Text>
            </View>
          </View>
        )}

        {/* ── Loading ─────────────────────────────────────────────── */}
        {tab === "community" && loading && (
          <View style={s.center}>
            <ActivityIndicator color={G.orange} />
            <Text style={s.loadingTxt}>Finding community trips…</Text>
          </View>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && (
          <View style={s.center}>
            <Text style={s.emptyTxt}>No trips match your filters.</Text>
            <TouchableOpacity onPress={() => { setActiveCity("All"); setActiveDuration(null); setActiveAge(null); }}>
              <Text style={s.emptyReset}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hero card ───────────────────────────────────────────── */}
        {heroItem && (
          <HeroCard
            item={heroItem}
            onPress={() => handlePress(heroItem)}
            isUpvoted={!!quickUpvoted[heroItem.id]}
            onUpvote={heroItem.isAiPick ? undefined : () => handleQuickUpvote(heroItem.id)}
          />
        )}

        {/* ── Grid ────────────────────────────────────────────────── */}
        {gridItems.length > 0 && (
          <View style={s.grid}>
            {gridItems.map(item => (
              <GridCard
                key={item.id}
                item={item}
                onPress={() => handlePress(item)}
                isUpvoted={!!quickUpvoted[item.id]}
                onUpvote={item.isAiPick ? undefined : () => handleQuickUpvote(item.id)}
              />
            ))}
          </View>
        )}

        {/* ── Divider ─────────────────────────────────────────────── */}
        <View style={s.divider} />

        {/* ── Teaser strips ───────────────────────────────────────── */}
        <Text style={s.sectionLabel}>YOUR ROAMUS</Text>

        <TeaserStrip
          emoji="📸"
          title="Trip Memories"
          subtitle="Relive your family's favourite moments"
          ctaLabel="See all"
          accentColor="#7C3AED"
          onPress={() => router.push("/(tabs)/memories" as any)}
        />

        <TeaserStrip
          emoji="🎮"
          title="Kids Zone"
          subtitle="See your rewards"
          ctaLabel="Explore"
          accentColor={G.orange}
          onPress={() => router.push("/(tabs)/kidszone" as any)}
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6,
  },
  greeting: { fontFamily: F.bold, fontSize: 20, color: G.deep, letterSpacing: -0.3 },
  headerSub: { fontFamily: F.regular, fontSize: 13, color: G.muted, marginTop: 2 },
  planBtn: {
    backgroundColor: G.orange, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  planBtnTxt: { fontFamily: F.bold, fontSize: 13, color: "#fff" },

  // Tabs
  tabsWrap: {
    flexDirection: "row", backgroundColor: "rgba(26,31,46,0.06)",
    borderRadius: 14, marginHorizontal: 16, marginBottom: 12, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  tabBtnOn: {
    backgroundColor: G.card,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  tabBtnTxt: { fontFamily: F.bold, fontSize: 13, color: G.muted },
  tabBtnTxtOn: { color: G.deep },

  // Filters
  filterRow: { paddingHorizontal: 16, marginBottom: 12 },
  fchip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(26,31,46,0.08)",
    backgroundColor: G.card, marginRight: 7,
  },
  fchipOn: { backgroundColor: G.deep, borderColor: G.deep },
  fchipTxt: { fontFamily: F.bold, fontSize: 12, color: G.muted },
  fchipTxtOn: { color: "#fff" },

  // AI banner
  aiBanner: {
    flexDirection: "row", gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "rgba(124,58,237,0.05)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.15)",
    borderRadius: 14, padding: 12,
  },
  aiBannerIco: { fontSize: 18 },
  aiBannerTitle: { fontFamily: F.bold, fontSize: 13, color: G.deep, marginBottom: 2 },
  aiBannerSub: { fontFamily: F.regular, fontSize: 12, color: G.muted, lineHeight: 18 },

  // States
  center: { alignItems: "center", paddingVertical: 48, gap: 10 },
  loadingTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  emptyTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  emptyReset: { fontFamily: F.bold, fontSize: 14, color: G.orange },

  // Grid
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, gap: 10, marginBottom: 12,
  },

  // Teaser section
  divider: {
    height: 1, backgroundColor: "rgba(26,31,46,0.07)",
    marginHorizontal: 16, marginTop: 8, marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: F.bold, fontSize: 11, color: G.muted,
    letterSpacing: 1, marginHorizontal: 16, marginBottom: 10,
  },
});
