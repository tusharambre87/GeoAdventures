import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { travelAPI, Trip } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  green:    '#3DAA6E',
} as const;

const GRAD_PAIRS: [string, string][] = [
  ['#1a3a5f', '#0d1f2d'],
  ['#1a3a1a', '#0d1f0d'],
  ['#3a1a1a', '#2a0d0d'],
  ['#2d1b4e', '#1a1f2e'],
  ['#1a2a3a', '#0d1520'],
];

function gradPair(i: number): [string, string] {
  return GRAD_PAIRS[i % GRAD_PAIRS.length];
}

function formatDate(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString('default', { month: 'short', year: 'numeric' });
}

function getDayOf(trip: Trip): { current: number; total: number } {
  const total = trip.tripDays ?? 1;
  if (!trip.startDate) return { current: 1, total };
  const start = new Date(trip.startDate);
  const today = new Date();
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return { current: Math.max(1, Math.min(diff + 1, total)), total };
}

function stopCount(trip: Trip): number {
  return trip.stops?.length ?? (trip as any).totalStops ?? 0;
}

function visitedCount(trip: Trip): number {
  return trip.stops?.filter(s => s.isVisited || s.visited).length ?? (trip as any).visitedStops ?? 0;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ insets }: { insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Memories</Text>
        <Text style={styles.pageSub}>Your family travel journal</Text>
      </View>
      <View style={styles.emptyCenter}>
        <View style={styles.emptyIcon}>
          <Text style={{ fontSize: 36 }}>📸</Text>
        </View>
        <Text style={styles.emptyTitle}>Your stories start here</Text>
        <Text style={styles.emptySub}>
          Every trip you take becomes a permanent chapter — photos, kid quotes, and a shareable story.
        </Text>
        <Pressable style={styles.orangePill} onPress={() => router.push('/onboarding/splash')}>
          <Text style={styles.orangePillText}>🗺 Plan your first trip</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Active trip hero card ────────────────────────────────────────────────────

function ActiveTripCard({ trip }: { trip: Trip }) {
  const { current, total } = getDayOf(trip);
  const visited = visitedCount(trip);
  const total_ = stopCount(trip);
  const remaining = Math.max(0, total_ - visited);
  const heroPhoto = (trip as any).firstPhotoUrl ?? (trip as any).coverImageUrl ?? null;

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
      <Text style={[styles.sectionLabel, { paddingTop: 0, paddingLeft: 0 }]}>In Progress</Text>
      <Pressable
        style={styles.activeCard}
        onPress={() => router.push(`/memories/${trip.id}` as any)}
      >
        {/* Hero photo / gradient */}
        <View style={styles.activeHero}>
          {heroPhoto ? (
            <ExpoImage source={{ uri: heroPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#1a3a5f', '#0d1f2d']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(26,31,46,0.2)', 'rgba(26,31,46,1)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Live pulse */}
          <View style={styles.livePill}>
            <View style={styles.greenDot} />
            <Text style={styles.livePillText}>Day {current} of {total}</Text>
          </View>
          {/* Trip name */}
          <View style={styles.activeHeroName}>
            <Text style={styles.activeHeroTitle}>{trip.name}</Text>
          </View>
        </View>

        {/* Card footer */}
        <View style={styles.activeFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeFooterMeta}>
              {formatDate(trip.startDate)}
              {total_ > 0 ? `  ·  ${total_} stops` : ''}
            </Text>
            <View style={styles.chipRow}>
              {visited > 0 && (
                <View style={styles.chipDone}>
                  <Text style={styles.chipDoneText}>📍 {visited} stops done</Text>
                </View>
              )}
              {remaining > 0 && (
                <View style={styles.chipRemain}>
                  <Text style={styles.chipRemainText}>{remaining} remaining</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => router.push(`/memories/${trip.id}` as any)}
          >
            <Text style={styles.addBtnText}>📷 Add</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Completed trip compact card ──────────────────────────────────────────────

function CompletedCard({ trip, gradIndex }: { trip: Trip; gradIndex: number }) {
  const total_ = stopCount(trip);
  const hasStory = !!(trip as any).storySaved;
  const thumbPhoto = (trip as any).firstPhotoUrl ?? (trip as any).coverImageUrl ?? null;

  return (
    <Pressable
      style={styles.completedCard}
      onPress={() => router.push(`/memories/${trip.id}/recap` as any)}
    >
      {/* Thumbnail */}
      <View style={styles.completedThumb}>
        {thumbPhoto ? (
          <ExpoImage source={{ uri: thumbPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={gradPair(gradIndex)} style={StyleSheet.absoluteFill} />
        )}
      </View>

      {/* Body */}
      <View style={styles.completedBody}>
        <View style={styles.completedRow}>
          <Text style={styles.completedName} numberOfLines={2}>{trip.name}</Text>
          <View style={[styles.storyBadge, hasStory ? styles.storyBadgeOn : styles.storyBadgeOff]}>
            <Text style={[styles.storyBadgeText, hasStory ? styles.storyBadgeTextOn : styles.storyBadgeTextOff]}>
              {hasStory ? '✨ Story' : 'Generate'}
            </Text>
          </View>
        </View>
        <Text style={styles.completedMeta}>
          {formatDate(trip.startDate)}{total_ > 0 ? `  ·  ${total_} stops` : ''}
        </Text>
        {hasStory ? (
          <Text style={styles.completedQuote} numberOfLines={1}>"A trip worth remembering"</Text>
        ) : (
          <Text style={styles.completedGenerate}>Tap to generate story</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => travelAPI.getTrips(),
  });

  const trips = data?.trips ?? [];
  const activeTrip = trips.find(t => t.status === 'active' || t.status === 'in_progress');
  const completedTrips = trips.filter(t => t.status === 'completed');
  const listTrips = activeTrip ? completedTrips : trips.filter(t => t.status !== 'active' && t.status !== 'in_progress');

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Memories</Text>
          <Text style={styles.pageSub}>Your family travel journal</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={C.orange} size="large" />
        </View>
      </View>
    );
  }

  if (!isLoading && trips.length === 0) {
    return <EmptyState insets={insets} />;
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.bg }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Memories</Text>
        <Text style={styles.pageSub}>Your family travel journal</Text>
      </View>

      {activeTrip && <ActiveTripCard trip={activeTrip} />}

      {listTrips.length > 0 && (
        <Text style={styles.sectionLabel}>
          {activeTrip
            ? `Completed (${completedTrips.length})`
            : `All Trips (${listTrips.length})`}
        </Text>
      )}

      {listTrips.map((trip, i) => (
        <CompletedCard key={trip.id} trip={trip} gradIndex={i} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  pageTitle: { fontSize: 26, fontFamily: F.bold, color: C.deep },
  pageSub: { fontSize: 13, fontFamily: F.medium, color: C.muted, marginTop: 1 },
  sectionLabel: {
    fontSize: 11, fontFamily: F.bold, color: C.muted,
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },

  // Empty
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 80, height: 80, backgroundColor: C.orangeLt, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontFamily: F.bold, color: C.deep, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: F.regular, color: C.muted, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  orangePill: { backgroundColor: C.orange, borderRadius: 40, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  orangePillText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },

  // Active card
  activeCard: { backgroundColor: C.deep, borderRadius: 20, overflow: 'hidden' },
  activeHero: { height: 180, position: 'relative', justifyContent: 'flex-end' },
  livePill: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  greenDot: { width: 8, height: 8, backgroundColor: '#3DAA6E', borderRadius: 4 },
  livePillText: { fontSize: 12, fontFamily: F.bold, color: '#fff' },
  activeHeroName: { padding: 14 },
  activeHeroTitle: { fontSize: 22, fontFamily: F.bold, color: '#fff', lineHeight: 28 },
  activeFooter: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  activeFooterMeta: { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.6)' },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chipDone: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  chipDoneText: { fontSize: 11, fontFamily: F.bold, color: 'rgba(255,255,255,0.7)' },
  chipRemain: { backgroundColor: 'rgba(232,105,42,0.2)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(232,105,42,0.4)', paddingVertical: 5, paddingHorizontal: 10 },
  chipRemainText: { fontSize: 11, fontFamily: F.bold, color: C.orange },
  addBtn: { backgroundColor: C.orange, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  addBtnText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },

  // Completed card
  completedCard: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: C.card, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
  },
  completedThumb: { width: 90, height: 90, overflow: 'hidden' },
  completedBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  completedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  completedName: { flex: 1, fontSize: 14, fontFamily: F.bold, color: C.deep, lineHeight: 20 },
  storyBadge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
  storyBadgeOn: { backgroundColor: C.orangeLt },
  storyBadgeOff: { backgroundColor: C.bg },
  storyBadgeText: { fontSize: 10, fontFamily: F.bold },
  storyBadgeTextOn: { color: C.orange },
  storyBadgeTextOff: { color: C.muted },
  completedMeta: { fontSize: 12, fontFamily: F.regular, color: C.muted, marginTop: 4 },
  completedQuote: { fontSize: 12, fontFamily: F.regular, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  completedGenerate: { fontSize: 12, fontFamily: F.semibold, color: C.orange, marginTop: 3 },
  chevron: { fontSize: 20, color: C.muted, paddingRight: 14 },
});
