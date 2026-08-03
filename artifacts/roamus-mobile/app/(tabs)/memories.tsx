import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { travelAPI, Trip, API_BASE } from '@/lib/apiClient';
import { F } from '@/lib/tokens';
import { parseLocalDate } from '@/lib/tripUtils';
import { useWikiPhoto } from '@/lib/useWikiPhoto';

// ─── Colours ─────────────────────────────────────────────────────────────────

const C = {
  bg:      '#EDEAE5',
  card:    '#FFFFFF',
  dark:    '#1A1A1A',
  muted:   '#8A8A9A',
  orange:  '#E8692A',
  green:   '#3DAA6E',
  chipBg:  '#FFFFFF',
  inputBg: '#FFFFFF',
} as const;

// Gradient palettes for cards without photos
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

// ─── Trip card (grid tile) ────────────────────────────────────────────────────

function TripCard({ trip, gradIndex }: { trip: Trip; gradIndex: number }) {
  const [imgErr, setImgErr] = React.useState(false);
  const kind = tripKind(trip);
  const { current, total } = getDayOf(trip);

  const tripCity: string = (trip as any).city ?? trip.destination ?? '';
  const wikiFallback = useWikiPhoto(tripCity, '', undefined);
  const firstStopId =
    (trip as any).stops?.find((s: any) => s.heroImageUrl)?.id ??
    (trip as any).stops?.[0]?.id;
  const photoUrl =
    (trip as any).firstPhotoUrl ??
    (trip as any).coverImageUrl ??
    (firstStopId ? `${API_BASE}/api/travel/stops/${firstStopId}/hero-img` : null);

  const dest =
    kind === 'completed'
      ? `/memories/${trip.id}/recap`
      : `/memories/${trip.id}`;

  const showPhoto = !!photoUrl && !imgErr;
  const showWiki  = (!showPhoto) && !!wikiFallback;

  return (
    <Pressable style={s.card} onPress={() => router.push(dest as any)}>
      {/* Background */}
      {showPhoto ? (
        <ExpoImage
          source={{ uri: photoUrl! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setImgErr(true)}
        />
      ) : showWiki ? (
        <ExpoImage
          source={{ uri: wikiFallback! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <LinearGradient colors={gradPair(gradIndex)} style={StyleSheet.absoluteFill} />
      )}

      {/* Dark scrim so text is always legible */}
      <LinearGradient
        colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content anchored to bottom */}
      <View style={s.cardContent}>
        {/* Status badge */}
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ insets }: { insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.heading}>Your trips</Text>
        <Text style={s.subheading}>Every adventure, all in one place</Text>
      </View>
      <View style={s.emptyCenter}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>{'\uD83D\uDCF8'}</Text>
        <Text style={s.emptyTitle}>Your stories start here</Text>
        <Text style={s.emptySub}>
          Every trip you take becomes a permanent chapter{'\u2014'}photos, kid quotes, and a shareable story.
        </Text>
        <Pressable style={s.orangePill} onPress={() => router.push('/onboarding/splash' as any)}>
          <Text style={s.orangePillText}>{'\uD83D\uDDFA\uFE0F'} Plan your first trip</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

type Filter = 'all' | 'active' | 'upcoming' | 'completed';

function Chip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
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

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter]   = useState<Filter>('all');
  const [query,  setQuery]    = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => travelAPI.getTrips(),
    staleTime: 0,
  });

  const allTrips = data?.trips ?? [];

  // Counts for chip labels
  const activeCount    = allTrips.filter(t => tripKind(t) === 'active').length;
  const upcomingCount  = allTrips.filter(t => tripKind(t) === 'upcoming').length;
  const completedCount = allTrips.filter(t => tripKind(t) === 'completed').length;

  // Search + filter
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTrips.filter(t => {
      // Filter chip
      if (filter === 'active'    && tripKind(t) !== 'active')    return false;
      if (filter === 'upcoming'  && tripKind(t) !== 'upcoming')  return false;
      if (filter === 'completed' && tripKind(t) !== 'completed') return false;
      // Search: name + destination + city
      if (q) {
        const name  = (t.name ?? '').toLowerCase();
        const dest  = (t.destination ?? '').toLowerCase();
        const city  = ((t as any).city ?? '').toLowerCase();
        if (!name.includes(q) && !dest.includes(q) && !city.includes(q)) return false;
      }
      return true;
    });
  }, [allTrips, filter, query]);

  if (isLoading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Text style={s.heading}>Your trips</Text>
          <Text style={s.subheading}>Every adventure, all in one place</Text>
        </View>
        <View style={s.centered}>
          <ActivityIndicator color={C.orange} size="large" />
        </View>
      </View>
    );
  }

  if (!isLoading && allTrips.length === 0) {
    return <EmptyState insets={insets} />;
  }

  // Sort: active first, then upcoming by start date, then completed newest-first
  const sorted = [...visible].sort((a, b) => {
    const ka = tripKind(a), kb = tripKind(b);
    const order = { active: 0, upcoming: 1, completed: 2 } as const;
    if (order[ka] !== order[kb]) return order[ka] - order[kb];
    const da = a.startDate ? new Date(a.startDate).getTime() : 0;
    const db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return ka === 'completed' ? db - da : da - db;
  });

  // Pair into rows of 2 for the grid
  const rows: Trip[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    rows.push(sorted.slice(i, i + 2));
  }

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.heading}>
            {allTrips.length} trip{allTrips.length !== 1 ? 's' : ''} in your journal
          </Text>
          <Text style={s.subheading}>Every adventure, all in one place</Text>
        </View>

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
          <Chip label={`All ${allTrips.length}`} active={filter === 'all'}       onPress={() => setFilter('all')} />
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
                {/* spacer so a lone card in the last row doesn't stretch full width */}
                {row.length === 1 && <View style={s.cardSpacer} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        {sorted.length > 0 && (
          <View style={s.footer}>
            <Text style={s.footerText}>
              See all {allTrips.length} trip{allTrips.length !== 1 ? 's' : ''} {'\u2192'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_GAP = 10;
const H_PAD    = 16;

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:    { paddingHorizontal: H_PAD, paddingBottom: 14 },
  heading:   { fontSize: 26, fontFamily: F.bold,   color: C.dark, lineHeight: 32 },
  subheading:{ fontSize: 13, fontFamily: F.medium, color: C.muted, marginTop: 3 },

  // Search
  searchWrap: {
    marginHorizontal: H_PAD, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.inputBg, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchIcon:  { fontSize: 15, marginRight: 8, color: C.muted },
  searchInput: { flex: 1, fontSize: 15, fontFamily: F.regular, color: C.dark, padding: 0 },

  // Filter chips
  chipScroll: { flexGrow: 0, marginBottom: 16 },
  chipRow:    { paddingHorizontal: H_PAD, gap: 8, flexDirection: 'row' },
  chip: {
    paddingVertical: 9, paddingHorizontal: 18,
    borderRadius: 40, backgroundColor: C.chipBg,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)',
  },
  chipActive: { backgroundColor: C.dark, borderColor: C.dark },
  chipText:   { fontSize: 14, fontFamily: F.semibold, color: C.dark },
  chipTextActive: { color: '#fff' },

  // Grid
  grid:    { paddingHorizontal: H_PAD, gap: CARD_GAP },
  gridRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP },

  // Card
  card: {
    flex: 1,
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1A2535',
  },
  cardSpacer: { flex: 1 },

  cardContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12,
  },
  cardName: {
    fontSize: 15, fontFamily: F.bold, color: '#FFFFFF',
    lineHeight: 20, marginTop: 6,
  },
  cardDate: {
    fontSize: 11, fontFamily: F.medium, color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },

  // Badges
  badgeActive: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: C.green,
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  badgeActiveText: { fontSize: 10, fontFamily: F.bold, color: '#fff', letterSpacing: 0.3 },

  badgeDone: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  badgeDoneText: { fontSize: 10, fontFamily: F.bold, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },

  // Footer
  footer:     { alignItems: 'center', marginTop: 8, paddingVertical: 16 },
  footerText: { fontSize: 15, fontFamily: F.semibold, color: C.orange },

  // No results
  noResults:     { paddingTop: 60, alignItems: 'center' },
  noResultsText: { fontSize: 14, fontFamily: F.regular, color: C.muted },

  // Empty state
  emptyCenter:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle:   { fontSize: 22, fontFamily: F.bold, color: C.dark, textAlign: 'center' },
  emptySub:     { fontSize: 14, fontFamily: F.regular, color: C.muted, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  orangePill:   { backgroundColor: C.orange, borderRadius: 40, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  orangePillText:{ fontSize: 15, fontFamily: F.bold, color: '#fff' },
});
