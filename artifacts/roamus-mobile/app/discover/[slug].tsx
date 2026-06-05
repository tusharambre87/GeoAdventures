import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE, useAuth } from "@/lib/authContext";
import { CITY_IMGS, F, G } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareStop {
  id: string;
  name: string;
  displayOrder: number;
  locationType?: string | null;
  listenSummary?: string | null;
  wonderPrompt?: string | null;
}

interface ShareDetail {
  id: string;
  slug: string;
  title?: string;
  destination: string;
  description?: string;
  heroImageUrl?: string | null;
  durationDays?: number;
  partySize?: number;
  totalViews?: number;
  totalUpvotes?: number;
  stops: ShareStop[];
}

interface CommentItem {
  id: string;
  authorName?: string | null;
  content: string;
  createdAt: string;
}

interface AiPickStop {
  name: string;
  type: string;
  isKidFriendly?: boolean;
  isOptional?: boolean;
}

interface AiPickDayDetail {
  label: string;
  stops: AiPickStop[];
}

interface AiPickDetail {
  title: string;
  destination: string;
  durationDays: number;
  description: string;
  ageRange: string;
  days: AiPickDayDetail[];
}

// ─── Static AI pick detail data ───────────────────────────────────────────────

const AI_PICKS_DETAIL: Record<string, AiPickDetail> = {
  "ai-dc": {
    title: "Washington DC Explorer", destination: "Washington DC",
    durationDays: 3, ageRange: "6-9", description: "Free-entry museums + monuments",
    days: [
      { label: "Day 1 — The Mall", stops: [
        { name: "National Air and Space Museum", type: "Museum", isKidFriendly: true },
        { name: "National Museum of Natural History", type: "Museum", isKidFriendly: true },
        { name: "Lincoln Memorial", type: "Monument" },
        { name: "Washington Monument", type: "Monument", isOptional: true },
      ]},
      { label: "Day 2 — Zoo & Gardens", stops: [
        { name: "National Zoo", type: "Zoo", isKidFriendly: true },
        { name: "National Botanic Garden", type: "Garden", isOptional: true },
        { name: "National Archives", type: "Museum", isKidFriendly: true },
      ]},
      { label: "Day 3 — Capitol Hill", stops: [
        { name: "US Capitol Visitor Center", type: "Landmark", isKidFriendly: true },
        { name: "Library of Congress", type: "Landmark", isOptional: true },
      ]},
    ],
  },
  "ai-nashville": {
    title: "Nashville Family Intro", destination: "Nashville",
    durationDays: 2, ageRange: "5-12", description: "Music & outdoors",
    days: [
      { label: "Day 1 — Music Row", stops: [
        { name: "Country Music Hall of Fame", type: "Museum", isKidFriendly: true },
        { name: "Ryman Auditorium", type: "Music Venue" },
        { name: "Printers Alley", type: "Neighborhood", isOptional: true },
      ]},
      { label: "Day 2 — Outdoors", stops: [
        { name: "Centennial Park & Parthenon", type: "Park", isKidFriendly: true },
        { name: "Adventure Science Center", type: "Science Center", isKidFriendly: true },
        { name: "Nashville Zoo", type: "Zoo", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-denver": {
    title: "Denver Outdoors + Science", destination: "Denver",
    durationDays: 3, ageRange: "6-10", description: "Science & nature",
    days: [
      { label: "Day 1 — Denver Downtown", stops: [
        { name: "Denver Museum of Nature & Science", type: "Museum", isKidFriendly: true },
        { name: "Denver Art Museum", type: "Museum", isOptional: true },
        { name: "16th Street Mall", type: "Neighborhood" },
      ]},
      { label: "Day 2 — Mountains", stops: [
        { name: "Red Rocks Amphitheatre", type: "Landmark", isKidFriendly: true },
        { name: "Denver Botanic Gardens", type: "Garden", isKidFriendly: true, isOptional: true },
      ]},
      { label: "Day 3 — Zoo & Park", stops: [
        { name: "Denver Zoo", type: "Zoo", isKidFriendly: true },
        { name: "City Park", type: "Park", isKidFriendly: true },
        { name: "Meow Wolf Denver", type: "Experience", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-austin": {
    title: "Austin Explorer Kids", destination: "Austin",
    durationDays: 2, ageRange: "5-10", description: "Culture & food",
    days: [
      { label: "Day 1 — Downtown & Culture", stops: [
        { name: "Texas State Capitol", type: "Landmark", isKidFriendly: true },
        { name: "Blanton Museum of Art", type: "Museum", isOptional: true },
        { name: "South Congress Avenue", type: "Neighborhood" },
      ]},
      { label: "Day 2 — Parks & Nature", stops: [
        { name: "Barton Springs Pool", type: "Park", isKidFriendly: true },
        { name: "Zilker Park", type: "Park", isKidFriendly: true },
        { name: "Natural Bridge Caverns", type: "Nature", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-seattle": {
    title: "Seattle Science + Nature", destination: "Seattle",
    durationDays: 3, ageRange: "6+", description: "Museums & outdoors",
    days: [
      { label: "Day 1 — Pike Place & Downtown", stops: [
        { name: "Pike Place Market", type: "Market", isKidFriendly: true },
        { name: "Seattle Great Wheel", type: "Attraction", isKidFriendly: true },
        { name: "Seattle Aquarium", type: "Aquarium", isKidFriendly: true },
      ]},
      { label: "Day 2 — Space Needle Area", stops: [
        { name: "Space Needle", type: "Landmark", isKidFriendly: true },
        { name: "Museum of Pop Culture", type: "Museum", isKidFriendly: true },
        { name: "Pacific Science Center", type: "Science Center", isKidFriendly: true },
      ]},
      { label: "Day 3 — Waterfront & Parks", stops: [
        { name: "Chihuly Garden and Glass", type: "Art", isOptional: true },
        { name: "Woodland Park Zoo", type: "Zoo", isKidFriendly: true },
        { name: "Discovery Park", type: "Park", isKidFriendly: true, isOptional: true },
      ]},
    ],
  },
  "ai-sandiego": {
    title: "San Diego Family Beach + Zoo", destination: "San Diego",
    durationDays: 3, ageRange: "All ages", description: "Beach & wildlife",
    days: [
      { label: "Day 1 — Balboa Park", stops: [
        { name: "San Diego Zoo", type: "Zoo", isKidFriendly: true },
        { name: "Fleet Science Center", type: "Science Center", isKidFriendly: true },
        { name: "Balboa Park Gardens", type: "Park", isOptional: true },
      ]},
      { label: "Day 2 — Beach Day", stops: [
        { name: "Mission Beach", type: "Beach", isKidFriendly: true },
        { name: "Pacific Beach Boardwalk", type: "Boardwalk", isKidFriendly: true },
        { name: "Ocean Beach Pier", type: "Landmark", isOptional: true },
      ]},
      { label: "Day 3 — Old Town & Harbor", stops: [
        { name: "Old Town San Diego", type: "Historic Site", isKidFriendly: true },
        { name: "USS Midway Museum", type: "Museum", isKidFriendly: true },
        { name: "Seaport Village", type: "Shopping", isOptional: true },
      ]},
    ],
  },
};

// ─── Stop icon by type ────────────────────────────────────────────────────────

const STOP_ICON: Record<string, string> = {
  museum: "🏛",
  zoo: "🦁",
  aquarium: "🐟",
  park: "🌳",
  beach: "🏖",
  monument: "🏻",
  landmark: "📍",
  science: "🔭",
  art: "🎨",
  market: "🛒",
  default: "📍",
};

function stopIcon(type?: string | null): string {
  if (!type) return STOP_ICON.default;
  const key = type.toLowerCase();
  for (const k of Object.keys(STOP_ICON)) {
    if (key.includes(k)) return STOP_ICON[k];
  }
  return STOP_ICON.default;
}

// ─── Login gate bottom sheet ──────────────────────────────────────────────────

function LoginGate({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(bgAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: bgAnim }]}
        pointerEvents="box-only"
        onTouchEnd={onClose}
      />
      <Animated.View
        style={[s.loginGate, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={s.lgHandle} />
        <Text style={s.lgTitle}>Sign in to use this trip</Text>
        <Text style={s.lgSub}>Create a free account and AI personalises this template for your family.</Text>
        <TouchableOpacity
          style={s.lgLogin}
          onPress={() => { onClose(); router.push("/onboarding/login" as any); }}
        >
          <Text style={s.lgLoginTxt}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.lgRegister}
          onPress={() => { onClose(); router.push("/onboarding/splash" as any); }}
        >
          <Text style={s.lgRegisterTxt}>Create free account →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={s.lgCancel}>
          <Text style={s.lgCancelTxt}>Not now</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

// ─── Shared stop row ──────────────────────────────────────────────────────────

function StopRow({ name, type, isKidFriendly, isOptional }: {
  name: string; type?: string | null; isKidFriendly?: boolean; isOptional?: boolean;
}) {
  return (
    <View style={s.stopRow}>
      <View style={s.stopIco}>
        <Text style={{ fontSize: 17 }}>{stopIcon(type)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.stopName}>{name}</Text>
        <Text style={s.stopMeta}>{type || "Stop"}</Text>
        <View style={s.stopTags}>
          {isKidFriendly && (
            <View style={s.tagKid}><Text style={s.tagKidTxt}>Kid-friendly</Text></View>
          )}
          {isOptional && (
            <View style={s.tagOpt}><Text style={s.tagOptTxt}>Optional</Text></View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DiscoverDetailScreen() {
  const { slug, isAiPick } = useLocalSearchParams<{ slug: string; isAiPick: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [itinerary, setItinerary] = useState<ShareDetail | null>(null);
  const [aiDetail, setAiDetail] = useState<AiPickDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginGate, setShowLoginGate] = useState(false);

  // Upvote
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  // Comments
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const isAi = isAiPick === "true";

  // Init upvote count from itinerary
  useEffect(() => {
    if (itinerary?.totalUpvotes != null) {
      setUpvoteCount(itinerary.totalUpvotes);
    }
  }, [itinerary?.totalUpvotes]);

  // Init visitor ID + check prior upvote
  useEffect(() => {
    if (isAi || !itinerary?.id) return;
    const shareId = itinerary.id;
    (async () => {
      try {
        let vid = await AsyncStorage.getItem("roamus_visitor_id");
        if (!vid || !/^v_[a-z0-9]{10,20}$/.test(vid)) {
          vid = "v_" + Math.random().toString(36).slice(2, 14);
          await AsyncStorage.setItem("roamus_visitor_id", vid);
        }
        const r = await fetch(`${API_BASE}/api/travel/shares/${shareId}/upvote/${vid}`);
        if (r.ok) {
          const data = await r.json();
          setHasUpvoted(data.hasUpvoted ?? false);
        }
      } catch {}
    })();
  }, [itinerary?.id, isAi]);

  // Load comments
  useEffect(() => {
    if (isAi || !itinerary?.id) return;
    fetch(`${API_BASE}/api/travel/shares/${itinerary.id}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any) => setComments(Array.isArray(data.comments ?? data) ? (data.comments ?? data) : []))
      .catch(() => {});
  }, [itinerary?.id, isAi]);

  async function handleUpvote() {
    if (isAi || !itinerary?.id || upvoteLoading) return;
    setUpvoteLoading(true);
    try {
      const vid = await AsyncStorage.getItem("roamus_visitor_id") ?? "v_" + Math.random().toString(36).slice(2, 14);
      const r = await fetch(`${API_BASE}/api/travel/shares/${itinerary.id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: vid }),
      });
      if (r.ok) {
        const data = await r.json();
        setUpvoteCount(data.totalUpvotes ?? upvoteCount);
        setHasUpvoted(data.hasUpvoted ?? !hasUpvoted);
      }
    } catch {} finally {
      setUpvoteLoading(false);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || commentLoading || isAi || !itinerary?.id) return;
    setCommentLoading(true);
    const text = newComment.trim();
    setNewComment("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const r = await fetch(`${API_BASE}/api/travel/shares/${itinerary.id}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: text }),
      });
      if (r.ok) {
        const data = await r.json();
        setComments(prev => [data.comment ?? data, ...prev]);
      }
    } catch {} finally {
      setCommentLoading(false);
    }
  }

  useEffect(() => {
    if (isAi) {
      const detail = AI_PICKS_DETAIL[slug];
      setAiDetail(detail ?? null);
      setLoading(false);
    } else {
      fetch(`${API_BASE}/api/travel/shares/${slug}`)
        .then(r => {
          if (!r.ok) throw new Error("not found");
          return r.json() as Promise<ShareDetail>;
        })
        .then(data => {
          setItinerary(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [slug, isAi]);

  function handleUseTrip() {
    if (!token) {
      setShowLoginGate(true);
      return;
    }
    router.push({
      pathname: "/discover/customize" as any,
      params: {
        slug,
        isAiPick: isAiPick ?? "false",
        destination: encodeURIComponent(destination),
        templateDays: String(durationDays),
      },
    });
  }

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top + 60 }]}>
        <ActivityIndicator color={G.orange} size="large" />
        <Text style={s.loadingTxt}>Loading itinerary…</Text>
      </View>
    );
  }

  if (!isAi && !itinerary) {
    return (
      <View style={[s.center, { paddingTop: insets.top + 60 }]}>
        <Text style={s.errorTxt}>This itinerary isn’t available.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.errorBack}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normalize community share into day groups
  const title = isAi
    ? (aiDetail?.title ?? slug)
    : (itinerary?.title ?? `${itinerary?.destination} Trip`);
  const destination = isAi ? (aiDetail?.destination ?? "") : (itinerary?.destination ?? "");
  const durationDays = isAi ? (aiDetail?.durationDays ?? 3) : (itinerary?.durationDays ?? 3);
  const heroImg = (!isAi && itinerary?.heroImageUrl)
    ? itinerary.heroImageUrl
    : CITY_IMGS[destination] ?? null;

  const totalStops = isAi
    ? (aiDetail?.days.reduce((s, d) => s + d.stops.length, 0) ?? 0)
    : (itinerary?.stops.length ?? 0);

  const totalFamilies = !isAi && itinerary?.totalViews
    ? Math.max(1, Math.floor(itinerary.totalViews / 3))
    : undefined;

  // Build day groups for community stops
  const communityDayGroups: { label: string; stops: ShareStop[] }[] = [];
  if (!isAi && itinerary?.stops && itinerary.stops.length > 0) {
    const sorted = [...itinerary.stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const stopsPerDay = Math.max(1, Math.ceil(sorted.length / durationDays));
    for (let d = 0; d < durationDays; d++) {
      const dayStops = sorted.slice(d * stopsPerDay, (d + 1) * stopsPerDay);
      if (dayStops.length > 0) {
        communityDayGroups.push({ label: `Day ${d + 1}`, stops: dayStops });
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={83}
    >
    <View style={[s.root]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.detailHero}>
          {heroImg ? (
            <Image source={{ uri: heroImg }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: G.deep }]} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "transparent", "rgba(0,0,0,0.72)"]}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Back button */}
          <TouchableOpacity
            style={[s.detailBack, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={s.detailBackTxt}>‹ Discover</Text>
          </TouchableOpacity>
          {/* Title overlay */}
          <View style={s.detailHeroBody}>
            <Text style={s.detailTitle}>{title}</Text>
            <Text style={s.detailMeta}>{destination} · {durationDays} days</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statN}>{durationDays}</Text>
            <Text style={s.statL}>Days</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statN}>{totalStops}</Text>
            <Text style={s.statL}>Stops</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statN}>{isAi ? (aiDetail?.ageRange ?? "All") : "All"}</Text>
            <Text style={s.statL}>Ages</Text>
          </View>
          <TouchableOpacity
            style={[s.stat, { borderRightWidth: 0 }]}
            onPress={handleUpvote}
            disabled={upvoteLoading || isAi}
            activeOpacity={0.7}
          >
            <Text style={[s.statN, !isAi && hasUpvoted ? { color: G.orange } : null]}>
              {isAi ? (aiDetail?.ageRange ?? "All") : (upvoteCount > 0 ? upvoteCount : "—")}
            </Text>
            <Text style={[s.statL, !isAi && hasUpvoted ? { color: G.orange } : null]}>
              {isAi ? "AI" : (hasUpvoted ? "♥ Helpful" : "♡ Helpful")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stop list */}
        {isAi && aiDetail ? (
          aiDetail.days.map((day, di) => (
            <View key={di}>
              <View style={s.dayDiv}>
                <Text style={s.dayDivTxt}>{day.label}</Text>
              </View>
              {day.stops.map((stop, si) => (
                <StopRow
                  key={si}
                  name={stop.name}
                  type={stop.type}
                  isKidFriendly={stop.isKidFriendly}
                  isOptional={stop.isOptional}
                />
              ))}
            </View>
          ))
        ) : (
          communityDayGroups.map((group, di) => (
            <View key={di}>
              <View style={s.dayDiv}>
                <Text style={s.dayDivTxt}>{group.label.toUpperCase()}</Text>
              </View>
              {group.stops.map((stop, si) => (
                <StopRow
                  key={stop.id ?? si}
                  name={stop.name}
                  type={stop.locationType}
                  isKidFriendly={!!stop.wonderPrompt}
                />
              ))}
            </View>
          ))
        )}

        {/* Comments section — community trips only */}
        {!isAi && itinerary?.id && (
          <View style={s.commentsSection}>
            <Text style={s.commentsTitle}>What families say</Text>

            {/* Add a comment */}
            <View style={s.commentInput}>
              <TextInput
                style={s.commentBox}
                placeholder="Share a tip or ask a question…"
                placeholderTextColor={G.muted}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={280}
                returnKeyType="send"
                onSubmitEditing={handleAddComment}
              />
              <TouchableOpacity
                style={[s.commentSend, (!newComment.trim() || commentLoading) && s.commentSendDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || commentLoading}
                activeOpacity={0.8}
              >
                {commentLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.commentSendTxt}>Post</Text>
                }
              </TouchableOpacity>
            </View>

            {comments.length === 0 && (
              <Text style={s.noCommentsTxt}>No comments yet — be the first to share a tip!</Text>
            )}
            {comments.map((c, i) => (
              <View key={c.id ?? i} style={s.commentRow}>
                <View style={s.commentAvatar}>
                  <Text style={s.commentAvatarTxt}>{(c.authorName ?? "F")[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.commentAuthor}>{c.authorName ?? "A family"}</Text>
                  <Text style={s.commentContent}>{c.content}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[s.ctaBar, { bottom: 83 }]}>
        <TouchableOpacity style={s.ctaBtn} onPress={handleUseTrip} activeOpacity={0.88}>
          <Text style={s.ctaBtnTxt}>Use this trip for my family →</Text>
        </TouchableOpacity>
        <Text style={s.ctaNote}>AI personalises stops for your kids’ ages and pace</Text>
      </View>

      {/* Login gate */}
      <LoginGate visible={showLoginGate} onClose={() => setShowLoginGate(false)} />
    </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: G.bg, gap: 12 },
  loadingTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  errorTxt: { fontFamily: F.medium, fontSize: 15, color: G.deep },
  errorBack: { fontFamily: F.bold, fontSize: 14, color: G.orange },

  // Hero
  detailHero: { height: 200, position: "relative", overflow: "hidden" },
  detailBack: {
    position: "absolute", left: 16, zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  detailBackTxt: { fontFamily: F.bold, fontSize: 13, color: "#fff" },
  detailHeroBody: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: 18,
  },
  detailTitle: { fontFamily: F.bold, fontSize: 24, color: "#fff", letterSpacing: -0.4, marginBottom: 2 },
  detailMeta: { fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.6)" },

  // Stats
  statsRow: {
    flexDirection: "row", borderBottomWidth: 1,
    borderBottomColor: "rgba(26,31,46,0.08)", backgroundColor: G.card,
  },
  stat: {
    flex: 1, paddingVertical: 13, alignItems: "center",
    borderRightWidth: 1, borderRightColor: "rgba(26,31,46,0.08)",
  },
  statN: { fontFamily: F.bold, fontSize: 17, color: G.deep, marginBottom: 1 },
  statL: { fontFamily: F.medium, fontSize: 11, color: G.muted },

  // Day divider
  dayDiv: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: "rgba(26,31,46,0.04)",
  },
  dayDivTxt: { fontFamily: F.bold, fontSize: 11, color: G.muted, letterSpacing: 0.8 },

  // Stop row
  stopRow: {
    flexDirection: "row", gap: 12, padding: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(26,31,46,0.06)",
    alignItems: "flex-start", backgroundColor: G.card,
  },
  stopIco: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: G.bg, alignItems: "center", justifyContent: "center",
  },
  stopName: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  stopMeta: { fontFamily: F.regular, fontSize: 12, color: G.muted, marginBottom: 4 },
  stopTags: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  tagKid: {
    backgroundColor: "#E8F7EF", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  tagKidTxt: { fontFamily: F.bold, fontSize: 10, color: "#3DAA6E" },
  tagOpt: {
    backgroundColor: "#FFFBEB", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  tagOptTxt: { fontFamily: F.bold, fontSize: 10, color: "#D97706" },

  // Comments section
  commentsSection: {
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24,
    backgroundColor: G.card,
    borderTopWidth: 1, borderTopColor: "rgba(26,31,46,0.07)",
  },
  commentsTitle: { fontFamily: F.bold, fontSize: 15, color: G.deep, marginBottom: 12 },
  commentInput: { flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "flex-end" },
  commentBox: {
    flex: 1, backgroundColor: G.bg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: F.regular, fontSize: 13, color: G.deep,
    minHeight: 44, maxHeight: 90,
  },
  commentSend: {
    backgroundColor: G.orange, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, justifyContent: "center",
  },
  commentSendDisabled: { backgroundColor: "rgba(26,31,46,0.15)" },
  commentSendTxt: { fontFamily: F.bold, fontSize: 13, color: "#fff" },
  noCommentsTxt: { fontFamily: F.regular, fontSize: 13, color: G.muted, textAlign: "center", paddingVertical: 12 },
  commentRow: { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "flex-start" },
  commentAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: G.orange, alignItems: "center", justifyContent: "center",
  },
  commentAvatarTxt: { fontFamily: F.bold, fontSize: 13, color: "#fff" },
  commentAuthor: { fontFamily: F.bold, fontSize: 12, color: G.deep, marginBottom: 2 },
  commentContent: { fontFamily: F.regular, fontSize: 13, color: G.deep, lineHeight: 19 },

  // Sticky CTA bar
  ctaBar: {
    position: "absolute", left: 0, right: 0,
    backgroundColor: G.bg,
    borderTopWidth: 1, borderTopColor: "rgba(26,31,46,0.08)",
    padding: 14,
  },
  ctaBtn: {
    backgroundColor: G.orange, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    shadowColor: G.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    marginBottom: 5,
  },
  ctaBtnTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  ctaNote: { fontFamily: F.regular, fontSize: 12, color: G.muted, textAlign: "center" },

  // Login gate
  loginGate: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: G.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 12,
  },
  lgHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(26,31,46,0.15)",
    alignSelf: "center", marginBottom: 20,
  },
  lgTitle: { fontFamily: F.bold, fontSize: 20, color: G.deep, marginBottom: 8 },
  lgSub: { fontFamily: F.regular, fontSize: 14, color: G.muted, lineHeight: 21, marginBottom: 20 },
  lgLogin: {
    borderWidth: 1.5, borderColor: "rgba(26,31,46,0.15)",
    borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 10,
  },
  lgLoginTxt: { fontFamily: F.bold, fontSize: 15, color: G.deep },
  lgRegister: {
    backgroundColor: G.orange, borderRadius: 14,
    paddingVertical: 14, alignItems: "center", marginBottom: 10,
  },
  lgRegisterTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  lgCancel: { paddingVertical: 10, alignItems: "center" },
  lgCancelTxt: { fontFamily: F.medium, fontSize: 14, color: G.muted },
});
