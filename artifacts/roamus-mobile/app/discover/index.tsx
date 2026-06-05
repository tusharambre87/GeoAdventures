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

import { API_BASE } from "@/lib/authContext";
import { useOnboarding } from "@/lib/onboardingContext";
import { CITY_IMGS, F, G } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscoverItem {
  id: string;
  slug: string;
  title: string;
  destination: string;
  description?: string;
  heroImageUrl?: string | null;
  durationDays: number;
  stopCount: number;
  familyCount?: number;
  ageRange?: string;
  focus?: string;
  badge?: string;
  isAiPick?: boolean;
  totalUpvotes?: number;
  tripId?: string;
}

interface CommunityShare {
  id: string;
  slug: string;
  title: string;
  destination: string;
  description?: string;
  heroImageUrl?: string | null;
  durationDays: number;
  totalViews?: number;
  totalUpvotes?: number;
}

// ─── Static AI Picks ─────────────────────────────────────────────────────────

const AI_PICKS: DiscoverItem[] = [
  {
    id: "ai-dc", slug: "ai-dc", destination: "Washington DC",
    title: "Washington DC Explorer", durationDays: 3, stopCount: 8,
    ageRange: "6-9", focus: "Free-entry focused",
    heroImageUrl: "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=600&q=70",
    badge: "AI curated", isAiPick: true,
  },
  {
    id: "ai-nashville", slug: "ai-nashville", destination: "Nashville",
    title: "Nashville Family Intro", durationDays: 2, stopCount: 7,
    ageRange: "5-12", focus: "Music & outdoors",
    heroImageUrl: CITY_IMGS["Nashville"] ?? null,
    badge: "AI curated", isAiPick: true,
  },
  {
    id: "ai-denver", slug: "ai-denver", destination: "Denver",
    title: "Denver Outdoors + Science", durationDays: 3, stopCount: 8,
    ageRange: "6-10", focus: "Science & nature",
    heroImageUrl: CITY_IMGS["Denver"] ?? null,
    badge: "AI curated", isAiPick: true,
  },
  {
    id: "ai-austin", slug: "ai-austin", destination: "Austin",
    title: "Austin Explorer Kids", durationDays: 2, stopCount: 6,
    ageRange: "5-10", focus: "Culture & food",
    heroImageUrl: CITY_IMGS["Austin"] ?? null,
    badge: "AI curated", isAiPick: true,
  },
  {
    id: "ai-seattle", slug: "ai-seattle", destination: "Seattle",
    title: "Seattle Science + Nature", durationDays: 3, stopCount: 9,
    ageRange: "6+", focus: "Museums & outdoors",
    heroImageUrl: CITY_IMGS["Seattle"] ?? null,
    badge: "AI curated", isAiPick: true,
  },
  {
    id: "ai-sandiego", slug: "ai-sandiego", destination: "San Diego",
    title: "San Diego Family Beach + Zoo", durationDays: 3, stopCount: 8,
    ageRange: "All ages", focus: "Beach & wildlife",
    heroImageUrl: CITY_IMGS["San Diego"] ?? null,
    badge: "AI curated", isAiPick: true,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getDestinationImage(destination: string): Promise<string | null> {
  try {
    const query = destination.replace(/\s+/g, '_');
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    const data = await res.json();
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

const DEST_COLORS: Record<string, string> = {
  default: '#1A2A3A',
  chicago: '#1A2A4A',
  'new york': '#2A1A3A',
  paris: '#1A3A2A',
  hawaii: '#1A3A3A',
  orlando: '#2A2A1A',
  boston: '#2A1A1A',
};

function getDestColor(destination: string): string {
  const key = destination.toLowerCase().split(',')[0].trim();
  return DEST_COLORS[key] ?? DEST_COLORS.default;
}

function normalizeShare(s: CommunityShare): DiscoverItem {
  const stopMatch = s.description?.match(/(\d+)\s+stops?/);
  const stopCount = stopMatch ? parseInt(stopMatch[1]) : 0;
  return {
    id: s.id,
    slug: s.slug,
    title: s.title || `${s.destination} Trip`,
    destination: s.destination,
    heroImageUrl: s.heroImageUrl || CITY_IMGS[s.destination] || null,
    durationDays: s.durationDays || 3,
    stopCount,
    familyCount: s.totalViews ? Math.max(1, Math.floor(s.totalViews / 3)) : undefined,
    totalUpvotes: s.totalUpvotes,
    isAiPick: false,
  };
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({ item, onPress, isUpvoted, onUpvote }: {
  item: DiscoverItem; onPress: () => void;
  isUpvoted?: boolean; onUpvote?: () => void;
}) {
  const imgSrc = item.heroImageUrl || CITY_IMGS[item.destination] || null;
  const upvotes = (item.totalUpvotes ?? 0) + (isUpvoted ? 1 : 0);
  return (
    <TouchableOpacity style={s.heroCard} onPress={onPress} activeOpacity={0.92}>
      <View style={s.heroImgWrap}>
        {imgSrc ? (
          <Image source={{ uri: imgSrc }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: getDestColor(item.destination) }]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(26,31,46,0.88)"]}
          style={StyleSheet.absoluteFill}
        />
        {item.badge && (
          <View style={s.heroBadge}><Text style={s.heroBadgeTxt}>{item.badge}</Text></View>
        )}
        {item.ageRange && (
          <View style={s.heroAge}>
            <Text style={s.heroAgeTxt}>Ages {item.ageRange}</Text>
          </View>
        )}
      </View>
      <View style={s.heroBody}>
        <Text style={s.heroTitle}>{item.title}</Text>
        {item.description ? (
          <Text numberOfLines={2} style={{ fontSize: 12, color: '#8A8FA8', marginTop: 3, lineHeight: 17 }}>
            {item.description}
          </Text>
        ) : null}
        <Text style={s.heroMeta}>
          {item.durationDays} days{item.stopCount > 0 ? ` · ${item.stopCount} stops` : ""}
          {item.familyCount ? ` · ${item.familyCount} families` : " · AI curated"}
          {upvotes > 0 ? ` · ♡ ${upvotes}` : ""}
        </Text>
        <TouchableOpacity style={s.heroCta} onPress={onPress} activeOpacity={0.88}>
          <Text style={s.heroCtaTxt}>Preview & use this trip →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function GridCard({ item, onPress, isUpvoted, onUpvote, currentActiveTripId }: {
  item: DiscoverItem; onPress: () => void;
  isUpvoted?: boolean; onUpvote?: () => void;
  currentActiveTripId?: string | null;
}) {
  const imgSrc = item.heroImageUrl || CITY_IMGS[item.destination] || null;
  const upvotes = (item.totalUpvotes ?? 0) + (isUpvoted ? 1 : 0);
  return (
    <TouchableOpacity style={s.gridCard} onPress={onPress} activeOpacity={0.92}>
      <View style={s.gridImg}>
        {imgSrc ? (
          <Image source={{ uri: imgSrc }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: getDestColor(item.destination) }]} />
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.65)"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={s.gridCity}>{item.destination}</Text>
        {item.tripId && item.tripId === currentActiveTripId && (
          <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#E8692A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Active trip</Text>
          </View>
        )}
      </View>
      <View style={s.gridBody}>
        <Text style={s.gridTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? (
          <Text numberOfLines={2} style={{ fontSize: 12, color: '#8A8FA8', marginTop: 3, lineHeight: 17 }}>
            {item.description}
          </Text>
        ) : null}
        <Text style={s.gridMeta}>
          {item.stopCount > 0 ? `${item.stopCount} stops` : item.durationDays + " days"}
          {" · "}{item.familyCount ? `${item.familyCount} families` : "AI curated"}
        </Text>
        <View style={s.gridFooter}>
          <View style={s.gridTags}>
            {item.ageRange && (
              <View style={s.tagAge}><Text style={s.tagAgeTxt}>Ages {item.ageRange}</Text></View>
            )}
            {item.durationDays > 0 && (
              <View style={s.tagDays}><Text style={s.tagDaysTxt}>{item.durationDays}d</Text></View>
            )}
          </View>
          {onUpvote && (
            <TouchableOpacity style={s.cardHeart} onPress={onUpvote} activeOpacity={0.7}>
              <Text style={s.cardHeartTxt}>{isUpvoted ? '♥' : '♡'} {upvotes > 0 ? upvotes : ''}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const CITY_FILTERS = ["All", "Chicago", "New York", "Washington DC", "Nashville", "Seattle", "San Diego"];
const DURATION_FILTERS: { id: string; label: string }[] = [
  { id: "weekend", label: "Weekend" },
  { id: "3-5", label: "3-5 days" },
];
const AGE_FILTERS: { id: string; label: string }[] = [
  { id: "toddlers", label: "Toddlers" },
  { id: "6-10", label: "Ages 6-10" },
  { id: "teens", label: "Teens" },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { data: onboardingData } = useOnboarding();
  const activeTripId = onboardingData.createdTripId;
  const [tab, setTab] = useState<"community" | "ai">("community");
  const [communityItems, setCommunityItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [quickUpvoted, setQuickUpvoted] = useState<Record<string, boolean>>({});

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
          normalized.map(async (item) => {
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
      params: { slug: item.slug, isAiPick: item.isAiPick ? "true" : "false" },
    });
  }

  const heroItem = filtered[0];
  const gridItems = filtered.slice(1);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity
          style={s.backPill}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={s.backPillTxt}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Discover</Text>
      </View>

      {/* Tabs */}
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter chips */}
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

        {/* AI personalisation banner */}
        {tab === "ai" && (
          <View style={s.aiBanner}>
            <Text style={s.aiBannerIco}>&#x2728;</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiBannerTitle}>Curated trips for families</Text>
              <Text style={s.aiBannerSub}>Pick a trip template — AI adapts stops for your kids' ages and your pace.</Text>
            </View>
          </View>
        )}

        {/* Loading */}
        {tab === "community" && loading && (
          <View style={s.center}>
            <ActivityIndicator color={G.orange} />
            <Text style={s.loadingTxt}>Finding community trips…</Text>
          </View>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <View style={s.center}>
            <Text style={s.emptyTxt}>No trips match your filters yet.</Text>
            <TouchableOpacity onPress={() => { setActiveCity("All"); setActiveDuration(null); setActiveAge(null); }}>
              <Text style={s.emptyReset}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero card */}
        {heroItem && (
          <HeroCard
            item={heroItem}
            onPress={() => handlePress(heroItem)}
            isUpvoted={!!quickUpvoted[heroItem.id]}
            onUpvote={heroItem.isAiPick ? undefined : () => handleQuickUpvote(heroItem.id)}
          />
        )}

        {/* Grid */}
        {gridItems.length > 0 && (
          <View style={s.grid}>
            {gridItems.map(item => (
              <GridCard
                key={item.id}
                item={item}
                onPress={() => handlePress(item)}
                isUpvoted={!!quickUpvoted[item.id]}
                onUpvote={item.isAiPick ? undefined : () => handleQuickUpvote(item.id)}
                currentActiveTripId={activeTripId}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  scroll: { flex: 1 },

  nav: {
    height: 54, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, gap: 12,
  },
  backPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(26,31,46,0.08)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  backPillTxt: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  navTitle: { fontFamily: F.bold, fontSize: 17, color: G.deep },

  tabsWrap: {
    flexDirection: "row", backgroundColor: "rgba(26,31,46,0.06)",
    borderRadius: 14, marginHorizontal: 16, marginBottom: 12, padding: 3,
  },
  tabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center",
  },
  tabBtnOn: { backgroundColor: G.card, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabBtnTxt: { fontFamily: F.bold, fontSize: 13, color: G.muted },
  tabBtnTxtOn: { color: G.deep },

  filterRow: { paddingHorizontal: 16, marginBottom: 12 },
  fchip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(26,31,46,0.08)",
    backgroundColor: G.card, marginRight: 7,
  },
  fchipOn: { backgroundColor: G.deep, borderColor: G.deep },
  fchipTxt: { fontFamily: F.bold, fontSize: 12, color: G.muted },
  fchipTxtOn: { color: "#fff" },

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

  center: { alignItems: "center", paddingVertical: 48, gap: 10 },
  loadingTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  emptyTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  emptyReset: { fontFamily: F.bold, fontSize: 14, color: G.orange },

  // Hero card
  heroCard: {
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 20, overflow: "hidden",
    backgroundColor: G.deep,
  },
  heroImgWrap: { height: 180, position: "relative" },
  heroBadge: {
    position: "absolute", top: 14, left: 14,
    backgroundColor: G.orange, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroBadgeTxt: { fontFamily: F.bold, fontSize: 10, color: "#fff", letterSpacing: 0.6 },
  heroAge: {
    position: "absolute", top: 14, right: 14,
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  heroAgeTxt: { fontFamily: F.bold, fontSize: 11, color: "#fff" },
  heroBody: { padding: 14 },
  heroTitle: { fontFamily: F.bold, fontSize: 20, color: "#fff", letterSpacing: -0.4, marginBottom: 4 },
  heroMeta: { fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 14 },
  heroCta: {
    backgroundColor: G.orange, borderRadius: 12,
    paddingVertical: 13, alignItems: "center",
  },
  heroCtaTxt: { fontFamily: F.bold, fontSize: 14, color: "#fff" },

  // Grid
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, gap: 10, marginBottom: 12,
  },
  gridCard: {
    width: "48%", backgroundColor: G.card,
    borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)", overflow: "hidden",
  },
  gridImg: { height: 95, position: "relative", backgroundColor: "#2A3540" },
  gridCity: {
    position: "absolute", bottom: 7, left: 10,
    fontFamily: F.bold, fontSize: 12, color: "#fff",
  },
  gridBody: { padding: 10 },
  gridTitle: { fontFamily: F.bold, fontSize: 13, color: G.deep, marginBottom: 3, lineHeight: 18 },
  gridMeta: { fontFamily: F.regular, fontSize: 11, color: G.muted, marginBottom: 6 },
  gridFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  gridTags: { flexDirection: "row", gap: 4, flexWrap: "wrap", flex: 1 },
  tagAge: { backgroundColor: "#F5F3FF", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagAgeTxt: { fontFamily: F.bold, fontSize: 10, color: "#7C3AED" },
  tagDays: { backgroundColor: G.oLt, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagDaysTxt: { fontFamily: F.bold, fontSize: 10, color: G.orange },
  cardHeart: { paddingHorizontal: 4, paddingVertical: 2 },
  cardHeartTxt: { fontFamily: F.bold, fontSize: 11, color: G.muted },
});
