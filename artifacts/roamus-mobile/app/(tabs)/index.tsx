import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/lib/authContext";
import { travelAPI, type Trip, API_BASE } from "@/lib/apiClient";
import { CITY_IMGS, F, G } from "@/lib/tokens";
import { getDestinationImage } from "@/app/discover/index";
import { selectActiveTrip } from "@/lib/tripUtils";
import { preCacheTrip } from "@/lib/tripCache";
import { useOnboarding } from "@/lib/onboardingContext";
import UpgradeSheet from "@/components/UpgradeSheet";

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  bg:      '#EDEAE5',
  dark:    '#1A1A1A',
  muted:   '#8A8A9A',
  orange:  '#E8692A',
  green:   '#3DAA6E',
  white:   '#FFFFFF',
} as const;

const GRAD_PAIRS: [string, string][] = [
  ['#1B2A4A', '#0F1929'],
  ['#1A2E1A', '#0D1A0D'],
  ['#2A2010', '#181008'],
  ['#1A2535', '#0F1825'],
  ['#2D1B4E', '#1A1030'],
];
function gradPair(i: number): [string, string] {
  return GRAD_PAIRS[i % GRAD_PAIRS.length];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = s.split('T')[0].split(' ')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatMonthYear(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString('default', { month: 'short', year: 'numeric' });
}

function getDayOf(trip: Trip): { current: number; total: number } {
  const total = trip.tripDays ?? 1;
  if (!trip.startDate) return { current: 1, total };
  const start = parseLocalDate(trip.startDate)!;
  start.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return { current: Math.max(1, Math.min(diff + 1, total)), total };
}

function tripHasStarted(trip: Trip): boolean {
  if (!trip.startDate) return true;
  const start = parseLocalDate(trip.startDate)!;
  start.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return today.getTime() >= start.getTime();
}

type TripKind = 'active' | 'upcoming' | 'completed';

function tripKind(trip: Trip): TripKind {
  if (trip.status === 'active' || trip.status === 'in_progress') return 'active';
  if (trip.status === 'completed' || trip.status === 'archived') return 'completed';
  return tripHasStarted(trip) ? 'active' : 'upcoming';
}

// ─── Trip grid card ───────────────────────────────────────────────────────────

function TripCard({ trip, gradIndex }: { trip: Trip; gradIndex: number }) {
  const [imgErr, setImgErr] = React.useState(false);
  const [wikiImage, setWikiImage] = React.useState<string | null>(null);
  const kind = tripKind(trip);
  const { current, total } = getDayOf(trip);

  const rawCity = trip.destination ?? '';
  const city = rawCity || (trip.name ?? '').replace(/\s+(family trip|trip|adventure)$/i, '').trim();
  const firstStopId = (trip as any).stops?.find((s: any) => s.heroImageUrl)?.id
    ?? (trip as any).stops?.[0]?.id;
  const staticPhoto = (trip as any).firstPhotoUrl ?? (trip as any).coverImageUrl
    ?? CITY_IMGS[city]
    ?? (firstStopId ? `${API_BASE}/api/travel/stops/${firstStopId}/hero-img` : null);

  React.useEffect(() => {
    if (staticPhoto) return;
    let cancelled = false;
    getDestinationImage(city).then(url => { if (!cancelled && url) setWikiImage(url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [city, staticPhoto]);

  const photoUrl = (!imgErr && staticPhoto) ? staticPhoto : wikiImage;

  function handlePress() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (kind === 'completed') {
      router.push(`/memories/${trip.id}/recap` as any);
    } else if (kind === 'active') {
      router.push({ pathname: '/(tabs)/today', params: { tripId: trip.id } } as any);
    } else {
      router.push(`/trip/${trip.id}` as any);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [s.card, { opacity: pressed ? 0.92 : 1 }]}
      onPress={handlePress}
    >
      {/* Background */}
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <LinearGradient colors={gradPair(gradIndex)} style={StyleSheet.absoluteFill} />
      )}

      {/* Scrim */}
      <LinearGradient
        colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View style={s.cardContent}>
        {kind === 'active' ? (
          <View style={s.badgeActive}>
            <View style={s.liveDot} />
            <Text style={s.badgeActiveText}>DAY {current} OF {total}</Text>
          </View>
        ) : kind === 'completed' ? (
          <View style={s.badgeDone}>
            <Text style={s.badgeDoneText}>COMPLETED</Text>
          </View>
        ) : (
          <View style={s.badgeDone}>
            <Text style={s.badgeDoneText}>UPCOMING</Text>
          </View>
        )}
        <Text style={s.cardName} numberOfLines={2}>{trip.name}</Text>
        <Text style={s.cardDate}>{formatMonthYear(trip.startDate)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

type Filter = 'all' | 'active' | 'upcoming' | 'completed';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const { reset: resetOnboarding, set: setOnboarding, data: onboardingData } = useOnboarding();

  const [filter, setFilter]         = useState<Filter>('all');
  const [query, setQuery]           = useState('');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [cachedTrips, setCachedTrips]       = useState<Trip[] | null>(null);
  const [fromCache, setFromCache]           = useState(false);
  const [fabExpanded, setFabExpanded]       = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['trips'],
    queryFn: () => travelAPI.getTrips(),
    retry: 1,
  });

  const trips: Trip[] = (isError && fromCache && cachedTrips)
    ? cachedTrips
    : (data?.trips ?? []);

  // Cache fallback
  useEffect(() => {
    if (data?.trips?.length) {
      AsyncStorage.setItem('cache_trips', JSON.stringify(data)).catch(() => {});
    }
  }, [data]);

  useEffect(() => {
    if (!isError) { setFromCache(false); return; }
    AsyncStorage.getItem('cache_trips').then(raw => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { trips: Trip[] };
        if (parsed.trips?.length) { setCachedTrips(parsed.trips); setFromCache(true); }
      } catch {}
    }).catch(() => {});
  }, [isError]);

  // Background pre-cache for paid users
  useEffect(() => {
    if (!token || user?.subscriptionTier === 'free') return;
    const upcoming = trips.filter(t => {
      if (t.status === 'completed' || t.status === 'archived') return false;
      if (!t.startDate) return true;
      return new Date(t.startDate).getTime() - Date.now() <= 48 * 60 * 60 * 1000;
    });
    upcoming.forEach(t => { preCacheTrip(t.id, token!).catch(() => {}); });
    NetInfo.fetch().then(() => {}).catch(() => {});
  }, [trips, token, user?.subscriptionTier]);

  // FAB
  function handleFabPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (fabExpanded) {
      if (fabCollapseTimer.current) { clearTimeout(fabCollapseTimer.current); fabCollapseTimer.current = null; }
      setFabExpanded(false);
      Animated.spring(fabAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }).start();
      startNewTrip();
    } else {
      if (fabCollapseTimer.current) clearTimeout(fabCollapseTimer.current);
      setFabExpanded(true);
      Animated.spring(fabAnim, { toValue: 1, useNativeDriver: false, tension: 80, friction: 10 }).start();
      fabCollapseTimer.current = setTimeout(() => {
        setFabExpanded(false);
        Animated.spring(fabAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }).start();
        fabCollapseTimer.current = null;
      }, 3000);
    }
  }

  function startNewTrip() {
    const existingTravelers = onboardingData.travelers ?? [];
    resetOnboarding();
    setOnboarding({ onboardingInProgress: true, returningUser: true, travelers: existingTravelers });
    router.push('/onboarding/where' as any);
  }

  // Counts
  const activeCount    = trips.filter(t => tripKind(t) === 'active').length;
  const upcomingCount  = trips.filter(t => tripKind(t) === 'upcoming').length;
  const completedCount = trips.filter(t => tripKind(t) === 'completed').length;

  // Filtered + searched list
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trips.filter(t => {
      if (filter === 'active'    && tripKind(t) !== 'active')    return false;
      if (filter === 'upcoming'  && tripKind(t) !== 'upcoming')  return false;
      if (filter === 'completed' && tripKind(t) !== 'completed') return false;
      if (q) {
        const name = (t.name ?? '').toLowerCase();
        const dest = (t.destination ?? '').toLowerCase();
        const city = ((t as any).city ?? '').toLowerCase();
        if (!name.includes(q) && !dest.includes(q) && !city.includes(q)) return false;
      }
      return true;
    });
  }, [trips, filter, query]);

  // Sort: active first → upcoming by start date → completed newest-first
  const sorted = useMemo(() => [...visible].sort((a, b) => {
    const ka = tripKind(a), kb = tripKind(b);
    const order = { active: 0, upcoming: 1, completed: 2 } as const;
    if (order[ka] !== order[kb]) return order[ka] - order[kb];
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return ka === 'completed' ? db - da : da - db;
  }), [visible]);

  // Build rows of 2
  const rows: Trip[][] = [];
  for (let i = 0; i < sorted.length; i += 2) rows.push(sorted.slice(i, i + 2));

  const displayName = user?.firstName || user?.username || user?.email?.split('@')[0] || '';

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.orange} />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heading}>
                {isLoading
                  ? 'Your trips'
                  : `${trips.length} trip${trips.length !== 1 ? 's' : ''} in your journal`}
              </Text>
              <Text style={s.subheading}>Every adventure, all in one place</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.logoutBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={async () => { await logout(); router.replace('/auth/splash'); }}
              hitSlop={8}
            >
              <Ionicons name="log-out-outline" size={20} color={C.muted} />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={s.centered}>
            <ActivityIndicator color={C.orange} size="large" />
          </View>
        ) : isError && !fromCache ? (
          <View style={s.errorCard}>
            <Ionicons name="wifi-outline" size={28} color="#DC2626" />
            <Text style={s.errorTitle}>Couldn't load trips</Text>
            <Text style={s.errorMsg}>Check your connection and pull to refresh.</Text>
            <Pressable style={s.retryBtn} onPress={() => refetch()}>
              <Text style={s.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : trips.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>{'\uD83D\uDCF8'}</Text>
            <Text style={s.emptyTitle}>Your stories start here</Text>
            <Text style={s.emptySub}>Every trip becomes a permanent chapter — photos, kid quotes, and a shareable story.</Text>
            <Pressable style={s.orangePill} onPress={startNewTrip}>
              <Text style={s.orangePillText}>{'\uD83D\uDDFA\uFE0F'} Plan your first trip</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {fromCache && (
              <View style={s.offlineBanner}>
                <Text style={s.offlineBannerText}>Offline — showing saved trips</Text>
              </View>
            )}

            {/* ── Search bar ── */}
            <View style={s.searchWrap}>
              <Text style={s.searchIcon}>{'\uD83D\uDD0D'}</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search your trips"
                placeholderTextColor={C.muted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>

            {/* ── Filter chips ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipRow}
              style={s.chipScroll}
            >
              <Chip label={`All ${trips.length}`}  active={filter === 'all'}       onPress={() => setFilter('all')} />
              <Chip label={activeCount > 0 ? `Active ${activeCount}` : 'Active'}
                    active={filter === 'active'}    onPress={() => setFilter('active')} />
              <Chip label={upcomingCount > 0 ? `Upcoming ${upcomingCount}` : 'Upcoming'}
                    active={filter === 'upcoming'}  onPress={() => setFilter('upcoming')} />
              <Chip label={completedCount > 0 ? `Completed ${completedCount}` : 'Completed'}
                    active={filter === 'completed'} onPress={() => setFilter('completed')} />
            </ScrollView>

            {/* ── 2-column grid ── */}
            {rows.length === 0 ? (
              <View style={s.noResults}>
                <Text style={s.noResultsText}>
                  {query ? `No trips matching "${query}"` : 'No trips in this category'}
                </Text>
              </View>
            ) : (
              <View style={s.grid}>
                {rows.map((row, ri) => (
                  <View key={ri} style={s.gridRow}>
                    {row.map((trip, ci) => (
                      <TripCard key={trip.id} trip={trip} gradIndex={ri * 2 + ci} />
                    ))}
                    {row.length === 1 && <View style={s.cardSpacer} />}
                  </View>
                ))}
              </View>
            )}

            {/* ── Footer ── */}
            {sorted.length > 0 && (
              <View style={s.footer}>
                <Text style={s.footerText}>
                  See all {trips.length} trip{trips.length !== 1 ? 's' : ''} {'\u2192'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Plan a trip FAB ── */}
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + 90 }]}
        onPress={handleFabPress}
        activeOpacity={0.85}
      >
        <Animated.View style={[s.fabInner, {
          width: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [52, 164] }),
        }]}>
          <Ionicons name="add" size={26} color="#fff" />
          <Animated.View style={{
            overflow: 'hidden',
            width: fabAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 104] }),
            opacity: fabAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }),
          }}>
            <Text style={s.fabLabel} numberOfLines={1}>Plan a trip</Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      <UpgradeSheet
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        context="at_stop"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_GAP = 10;
const H_PAD    = 16;

const s = StyleSheet.create({
  root:    { flex: 1 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  // Header
  header:     { paddingHorizontal: H_PAD, paddingBottom: 14 },
  headerRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  heading:    { fontSize: 26, fontFamily: F.bold, color: C.dark, lineHeight: 32 },
  subheading: { fontSize: 13, fontFamily: F.medium, color: C.muted, marginTop: 3 },
  logoutBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(26,31,46,0.07)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  // Offline banner
  offlineBanner:     { marginHorizontal: H_PAD, marginBottom: 10, backgroundColor: '#1F2937', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
  offlineBannerText: { fontFamily: F.medium, fontSize: 12, color: '#D1FAE5' },

  // Search
  searchWrap: {
    marginHorizontal: H_PAD, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchIcon:  { fontSize: 15, marginRight: 8, color: C.muted },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.regular, color: C.dark, padding: 0 },

  // Filter chips
  chipScroll: { flexGrow: 0, marginBottom: 16 },
  chipRow:    { paddingHorizontal: H_PAD, gap: 8, flexDirection: 'row' },
  chip:       { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 40, backgroundColor: C.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)' },
  chipActive: { backgroundColor: C.dark, borderColor: C.dark },
  chipText:   { fontSize: 14, fontFamily: F.semibold, color: C.dark },
  chipTextActive: { color: '#fff' },

  // Grid
  grid:    { paddingHorizontal: H_PAD, gap: CARD_GAP },
  gridRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP },

  // Card
  card: {
    flex: 1, height: 200, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#1A2535',
  },
  cardSpacer: { flex: 1 },
  cardContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12,
  },
  cardName: { fontSize: 15, fontFamily: F.bold, color: '#FFFFFF', lineHeight: 20, marginTop: 6 },
  cardDate: { fontSize: 11, fontFamily: F.medium, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  // Badges
  badgeActive: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: C.green, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  liveDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  badgeActiveText: { fontSize: 10, fontFamily: F.bold, color: '#fff', letterSpacing: 0.3 },
  badgeDone: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  badgeDoneText: { fontSize: 10, fontFamily: F.bold, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },

  // Footer
  footer:     { alignItems: 'center', marginTop: 8, paddingVertical: 16 },
  footerText: { fontSize: 15, fontFamily: F.semibold, color: C.orange },

  // No results
  noResults:     { paddingTop: 60, alignItems: 'center' },
  noResultsText: { fontSize: 14, fontFamily: F.regular, color: C.muted },

  // Empty
  emptyWrap:     { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 12 },
  emptyTitle:    { fontSize: 22, fontFamily: F.bold, color: C.dark, textAlign: 'center' },
  emptySub:      { fontSize: 14, fontFamily: F.regular, color: C.muted, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  orangePill:    { backgroundColor: C.orange, borderRadius: 40, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  orangePillText:{ fontSize: 15, fontFamily: F.bold, color: '#fff' },

  // Error
  errorCard:  { margin: 20, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  errorTitle: { fontFamily: F.bold, fontSize: 16, color: '#DC2626' },
  errorMsg:   { fontFamily: F.regular, fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn:   { backgroundColor: C.orange, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryBtnText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },

  // FAB
  fab: { position: 'absolute', right: 20, shadowColor: '#E8692A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  fabInner: { height: 52, borderRadius: 26, backgroundColor: C.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fabLabel: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
