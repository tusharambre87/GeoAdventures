import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { travelAPI, memoriesAPI, reflectionsAPI, Trip, Moment, DayReflection } from '@/lib/apiClient';
import StopPickerSheet from '@/components/StopPickerSheet';
import { F } from '@/lib/tokens';

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  green:    '#3DAA6E',
  quoteBar: '#E8692A',
} as const;

const GRAD_PAIRS: [string, string][] = [
  ['#1a3a5f', '#0d1f2d'],
  ['#1a2a1a', '#0d1f0d'],
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

// ─── Moment helpers ───────────────────────────────────────────────────────────

function parseKidQuote(response: string | null | undefined): { name: string | null; text: string } {
  if (!response) return { name: null, text: '' };
  const sep = response.indexOf('|');
  if (sep === -1) return { name: null, text: response };
  return { name: response.slice(0, sep).trim() || null, text: response.slice(sep + 1).trim() };
}

function getDayForMoment(moment: Moment, trip: Trip): number {
  if (moment.stopId) {
    const stop = trip.stops?.find(s => s.id === moment.stopId);
    if (stop?.dayIndex != null) return stop.dayIndex + 1;
  }
  if (trip.startDate && moment.createdAt) {
    const start = new Date(trip.startDate).setHours(0, 0, 0, 0);
    const created = new Date(moment.createdAt).setHours(0, 0, 0, 0);
    const diff = Math.floor((created - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }
  return 1;
}

type DayGroup = {
  day: number;
  photos: string[];
  quotes: Array<{ name: string | null; text: string }>;
};

function groupMomentsByDay(moments: Moment[], trip: Trip): DayGroup[] {
  const map = new Map<number, DayGroup>();

  for (const m of moments) {
    const day = getDayForMoment(m, trip);
    if (!map.has(day)) map.set(day, { day, photos: [], quotes: [] });
    const g = map.get(day)!;

    const urls = m.photoUrls ?? (m.photoUrl ? [m.photoUrl] : []);
    g.photos.push(...urls);

    if (m.kidPromptResponse) {
      const parsed = parseKidQuote(m.kidPromptResponse);
      if (parsed.text) g.quotes.push(parsed);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.day - b.day);
}

// ─── Photo Journal section ─────────────────────────────────────────────────────

function PhotoJournalSection({ trip, moments }: { trip: Trip; moments: Moment[] }) {
  const groups = groupMomentsByDay(moments, trip)
    .filter(g => g.photos.length > 0 || g.quotes.length > 0);
  if (groups.length === 0) return null;

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.sectionLabel}>Photo Journal</Text>
      {groups.map(g => (
        <View key={g.day} style={pj.dayBlock}>
          {/* Day label */}
          <View style={pj.dayChip}>
            <Text style={pj.dayChipText}>Day {g.day}</Text>
          </View>

          {/* Photo grid */}
          {g.photos.length > 0 && (
            <View style={pj.photoGrid}>
              {g.photos.slice(0, 6).map((uri, idx) => (
                <View key={idx} style={[pj.photoCell, g.photos.length === 1 && pj.photoCellFull]}>
                  <ExpoImage source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                </View>
              ))}
            </View>
          )}

          {/* Kid quotes */}
          {g.quotes.map((q, idx) => (
            <View key={idx} style={pj.quoteRow}>
              <View style={pj.quoteBar} />
              <View style={pj.quoteBody}>
                <Text style={pj.quoteText}>"{q.text}"</Text>
                {q.name && <Text style={pj.quoteName}>— {q.name}</Text>}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── State A: truly no trips ──────────────────────────────────────────────────

// ─── Day Reflections section ──────────────────────────────────────────────────────────

const dr = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#1A1F2E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  dayChip: {
    alignSelf: 'flex-start', backgroundColor: '#FDF0E9', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
  },
  dayChipText: { fontSize: 11, fontWeight: '700', color: '#E8692A', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { marginBottom: 10 },
  rowLabel: { fontSize: 10, fontWeight: '700', color: '#8A8FA8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  rowText: { fontSize: 15, color: '#1A1F2E', lineHeight: 22 },
});

function DayReflectionsSection({ tripId }: { tripId: string }) {
  const { data: reflections } = useQuery({
    queryKey: ['day-reflections', tripId],
    queryFn: () => reflectionsAPI.list(tripId),
    enabled: !!tripId,
    staleTime: 0,
  });

  if (!reflections || reflections.length === 0) return null;

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.sectionLabel}>Day Reflections</Text>
      {reflections.map((r: DayReflection, idx: number) => (
        <View key={r.id ?? idx} style={dr.card}>
          {r.dayIndex != null && (
            <View style={dr.dayChip}>
              <Text style={dr.dayChipText}>Day {r.dayIndex + 1}</Text>
            </View>
          )}
          {!!r.surprise && (
            <View style={dr.row}>
              <Text style={dr.rowLabel}>SURPRISED US</Text>
              <Text style={dr.rowText}>{r.surprise}</Text>
            </View>
          )}
          {!!r.learnMore && (
            <View style={dr.row}>
              <Text style={dr.rowLabel}>WANT TO KNOW MORE</Text>
              <Text style={dr.rowText}>{r.learnMore}</Text>
            </View>
          )}
          {!!r.doDifferently && (
            <View style={dr.row}>
              <Text style={dr.rowLabel}>NEXT TIME</Text>
              <Text style={dr.rowText}>{r.doDifferently}</Text>
            </View>
          )}
          {(r.kidQuotes ?? []).filter((q: { text: string; kid_name: string }) => q.text).map((q: { text: string; kid_name: string }, qi: number) => (
            <View key={qi} style={pj.quoteRow}>
              <View style={pj.quoteBar} />
              <View style={pj.quoteBody}>
                <Text style={pj.quoteText}>\u201c{q.text}\u201d</Text>
                {!!q.kid_name && <Text style={pj.quoteName}>\u2014 {q.kid_name}</Text>}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}


function NoTripsState({ insets }: { insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Memories</Text>
        <Text style={s.pageSub}>Your family travel journal</Text>
      </View>
      <View style={s.emptyCenter}>
        <View style={s.emptyIcon}>
          <Text style={{ fontSize: 36 }}>{'\uD83D\uDCF8'}</Text>
        </View>
        <Text style={s.emptyTitle}>Your stories start here</Text>
        <Text style={s.emptySub}>
          Every trip you take becomes a permanent chapter — photos, kid quotes, and a shareable story.
        </Text>
        <Pressable style={s.orangePill} onPress={() => router.push('/onboarding/splash' as any)}>
          <Text style={s.orangePillText}>{'\uD83D\uDDFA'} Plan your first trip</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Hero card — for the one active/current trip ──────────────────────────────

function HeroCard({ trip, isExplicitlyActive, onAddPhoto }: { trip: Trip; isExplicitlyActive: boolean; onAddPhoto: () => void }) {
  const { current, total } = getDayOf(trip);
  const visited = visitedCount(trip);
  const total_ = stopCount(trip);
  const remaining = Math.max(0, total_ - visited);
  const heroPhoto = (trip as any).firstPhotoUrl ?? (trip as any).coverImageUrl ?? null;

  return (
    <Pressable
      style={s.heroCard}
      onPress={() => router.push(`/memories/${trip.id}` as any)}
    >
      {/* Photo / gradient */}
      <View style={s.heroPhotoArea}>
        {heroPhoto
          ? <ExpoImage source={{ uri: heroPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
          : <LinearGradient colors={['#1a3a5f', '#0d1f2d']} style={StyleSheet.absoluteFill} />
        }
        <LinearGradient
          colors={['transparent', 'rgba(26,31,46,0.2)', 'rgba(26,31,46,1)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Status pill */}
        <View style={s.livePill}>
          {isExplicitlyActive && <View style={s.greenDot} />}
          <Text style={s.livePillText}>
            {isExplicitlyActive ? `Day ${current} of ${total}` : 'Upcoming'}
          </Text>
        </View>
        <View style={s.heroNameWrap}>
          <Text style={s.heroName}>{trip.name}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={s.heroFooter}>
        <View style={{ flex: 1 }}>
          <Text style={s.heroMeta}>
            {formatDate(trip.startDate)}{total_ > 0 ? `  ·  ${total_} stops` : ''}
          </Text>
          {isExplicitlyActive && (
            <View style={s.chipRow}>
              {visited > 0 && (
                <View style={s.chipDone}>
                  <Text style={s.chipDoneText}>{'\uD83D\uDCCD'} {visited} stops done</Text>
                </View>
              )}
              {remaining > 0 && (
                <View style={s.chipRemain}>
                  <Text style={s.chipRemainText}>{remaining} remaining</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <Pressable style={s.addBtn} onPress={onAddPhoto}>
          <Text style={s.addBtnText}>{'\uD83D\uDCF7'} Add</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Compact trip card ────────────────────────────────────────────────────────

type CompactCardVariant = 'current' | 'completed';

function CompactCard({ trip, gradIndex, variant }: { trip: Trip; gradIndex: number; variant: CompactCardVariant }) {
  const total_ = stopCount(trip);
  const thumbPhoto = (trip as any).firstPhotoUrl ?? (trip as any).coverImageUrl ?? null;
  const hasStory = !!(trip as any).storySaved;

  const dest = variant === 'completed'
    ? `/memories/${trip.id}/recap`
    : `/memories/${trip.id}`;

  return (
    <Pressable style={s.compactCard} onPress={() => router.push(dest as any)}>
      {/* Thumbnail */}
      <View style={s.compactThumb}>
        {thumbPhoto
          ? <ExpoImage source={{ uri: thumbPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
          : <LinearGradient colors={gradPair(gradIndex)} style={StyleSheet.absoluteFill} />
        }
      </View>

      {/* Body */}
      <View style={s.compactBody}>
        <View style={s.compactRow}>
          <Text style={s.compactName} numberOfLines={2}>{trip.name}</Text>
          {variant === 'completed' ? (
            <View style={[s.badge, hasStory ? s.badgeStory : s.badgeMuted]}>
              <Text style={[s.badgeText, hasStory ? s.badgeTextStory : s.badgeTextMuted]}>
                {hasStory ? '\u2728 Story' : 'Generate'}
              </Text>
            </View>
          ) : (
            <View style={[s.badge, s.badgeInProgress]}>
              <Text style={[s.badgeText, s.badgeTextInProgress]}>In Progress</Text>
            </View>
          )}
        </View>
        <Text style={s.compactMeta}>
          {formatDate(trip.startDate)}{total_ > 0 ? `  ·  ${total_} stops` : ''}
        </Text>
        {variant === 'completed' ? (
          hasStory
            ? <Text style={s.compactQuote} numberOfLines={1}>"A trip worth remembering"</Text>
            : <Text style={s.compactGenerate}>Tap to generate story</Text>
        ) : (
          <Text style={s.compactInProgressHint}>Tap to add memories</Text>
        )}
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const { focusDayIndex } = useLocalSearchParams<{ focusDayIndex?: string }>();
  const focusDay = focusDayIndex != null ? parseInt(focusDayIndex, 10) : null;
  const { data, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => travelAPI.getTrips(),
    staleTime: 0,
  });

  const trips = data?.trips ?? [];

  const activeTrip = trips.find(t => t.status === 'active' || t.status === 'in_progress');
  const currentTrips = trips.filter(t => !['completed', 'archived'].includes(t.status));
  const completedTrips = trips.filter(t => t.status === 'completed' || t.status === 'archived');

  const heroTrip = activeTrip ?? (currentTrips.length > 0 ? currentTrips[0] : null);
  const isExplicitlyActive = !!activeTrip;
  const otherCurrentTrips = currentTrips.filter(t => t.id !== heroTrip?.id);

  const { data: moments } = useQuery({
    queryKey: ['moments', heroTrip?.id],
    queryFn: () => memoriesAPI.getMoments(heroTrip!.id),
    enabled: !!heroTrip?.id,
    select: (d: unknown) => Array.isArray(d) ? d as Moment[] : ((d as { moments?: Moment[] })?.moments ?? []),
  });

  if (isLoading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, backgroundColor: C.bg }]}>
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Memories</Text>
          <Text style={s.pageSub}>Your family travel journal</Text>
        </View>
        <View style={s.centered}>
          <ActivityIndicator color={C.orange} size="large" />
        </View>
      </View>
    );
  }

  if (!isLoading && trips.length === 0) {
    return <NoTripsState insets={insets} />;
  }

  const handleStopSelect = (stopId: string | null, stopName: string, stopIcon: string) => {
    setShowPhotoSheet(false);
    if (heroTrip) {
      router.push({
        pathname: `/memories/${heroTrip.id}/add-photo` as never,
        params: { stopId: stopId ?? '', stopName, stopIcon },
      });
    }
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Memories</Text>
        <Text style={s.pageSub}>Your family travel journal</Text>
      </View>

      {/* ── Hero card (active or first current trip) ── */}
      {heroTrip && (
        <View style={{ marginHorizontal: 20, marginBottom: 4 }}>
          <Text style={[s.sectionLabel, { paddingTop: 0, paddingLeft: 0 }]}>
            {isExplicitlyActive ? 'In Progress' : 'Current Trip'}
          </Text>
          <HeroCard trip={heroTrip} isExplicitlyActive={isExplicitlyActive} onAddPhoto={() => setShowPhotoSheet(true)} />
        </View>
      )}

      {/* ── Focused day recap banner (when navigated from Day Complete screen) ── */}
      {focusDay !== null && heroTrip && (
        (() => {
          const dayNumber = focusDay + 1;
          const dayMoments = (moments ?? []).filter(m => {
            if (m.stopId) {
              const stop = heroTrip.stops?.find(s => s.id === m.stopId);
              if (stop?.dayIndex != null) return stop.dayIndex === focusDay;
            }
            return false;
          });
          const hasPhotos = dayMoments.some(m => (m.photoUrls ?? []).length > 0 || m.photoUrl);
          return (
            <View style={{
              marginHorizontal: 20, marginBottom: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              overflow: 'hidden',
              shadowColor: '#1A1F2E',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <LinearGradient
                colors={['#1A1F2E', '#163830']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ padding: 16, paddingBottom: 14 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
                  Day {dayNumber} Recap
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 }}>
                  {hasPhotos ? 'Your memories from this day' : 'No photos yet for this day'}
                </Text>
              </LinearGradient>
              {!hasPhotos && (
                <TouchableWithoutFeedback onPress={() => setShowPhotoSheet(true)}>
                  <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F2EE', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{'\uD83D\uDCF8'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1F2E' }}>Add photos from Day {dayNumber}</Text>
                      <Text style={{ fontSize: 12, color: '#8A8FA8', marginTop: 2 }}>Tap to upload from your library</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: '#E8692A' }}>{'\u203A'}</Text>
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>
          );
        })()
      )}

      {/* ── Photo Journal — day-grouped photos & kid quotes ── */}
      {heroTrip && moments && moments.length > 0 && (
        <View style={{ marginHorizontal: 20 }}>
          <PhotoJournalSection trip={heroTrip} moments={moments} />
        </View>
      )}

      {/* ── Day Reflections ── */}
      {heroTrip && (
        <View style={{ marginHorizontal: 20 }}>
          <DayReflectionsSection tripId={heroTrip.id} />
        </View>
      )}

      {/* ── Other in-progress / upcoming trips ── */}
      {otherCurrentTrips.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Upcoming ({otherCurrentTrips.length})</Text>
          {otherCurrentTrips.map((trip, i) => (
            <CompactCard key={trip.id} trip={trip} gradIndex={i} variant="current" />
          ))}
        </>
      )}

      {/* ── Completed trips ── */}
      {completedTrips.length > 0 && (
        <>
          <Text style={s.sectionLabel}>
            Completed ({completedTrips.length})
          </Text>
          {completedTrips.map((trip, i) => (
            <CompactCard key={trip.id} trip={trip} gradIndex={i + otherCurrentTrips.length} variant="completed" />
          ))}
        </>
      )}

      {/* ── If only hero, no others ── */}
      {completedTrips.length === 0 && otherCurrentTrips.length === 0 && heroTrip && !moments?.length && (
        <Text style={s.hintText}>Complete your trip to see it here as a story</Text>
      )}
      </ScrollView>
      {showPhotoSheet && heroTrip && (
        <StopPickerSheet
          trip={heroTrip}
          onDismiss={() => setShowPhotoSheet(false)}
          onSelect={handleStopSelect}
        />
      )}
    </View>
  );
}

// ─── Photo journal styles ──────────────────────────────────────────────────────

const CELL_GAP = 3;

const pj = StyleSheet.create({
  dayBlock: {
    marginBottom: 24,
  },
  dayChip: {
    alignSelf: 'flex-start',
    backgroundColor: C.deep,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  dayChipText: {
    fontSize: 11,
    fontFamily: F.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
    marginBottom: 10,
  },
  photoCell: {
    width: '32.3%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: C.muted,
  },
  photoCellFull: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  quoteBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: C.orange,
    minHeight: 36,
    marginTop: 2,
  },
  quoteBody: {
    flex: 1,
  },
  quoteText: {
    fontSize: 14,
    fontFamily: F.regular,
    color: C.deep,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  quoteName: {
    fontSize: 12,
    fontFamily: F.semibold,
    color: C.orange,
    marginTop: 3,
  },
});

const s = StyleSheet.create({
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
  hintText: {
    fontSize: 13, fontFamily: F.regular, color: C.muted,
    textAlign: 'center', paddingHorizontal: 40, paddingTop: 16,
  },

  // State A — no trips
  emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyIcon: { width: 80, height: 80, backgroundColor: C.orangeLt, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontFamily: F.bold, color: C.deep, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: F.regular, color: C.muted, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  orangePill: { backgroundColor: C.orange, borderRadius: 40, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  orangePillText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },

  // Hero card
  heroCard: { backgroundColor: C.deep, borderRadius: 20, overflow: 'hidden' },
  heroPhotoArea: { height: 180, position: 'relative', justifyContent: 'flex-end' },
  livePill: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  greenDot: { width: 8, height: 8, backgroundColor: C.green, borderRadius: 4 },
  livePillText: { fontSize: 12, fontFamily: F.bold, color: '#fff' },
  heroNameWrap: { padding: 14 },
  heroName: { fontSize: 22, fontFamily: F.bold, color: '#fff', lineHeight: 28 },
  heroFooter: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  heroMeta: { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.6)' },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chipDone: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  chipDoneText: { fontSize: 11, fontFamily: F.bold, color: 'rgba(255,255,255,0.7)' },
  chipRemain: { backgroundColor: 'rgba(232,105,42,0.2)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(232,105,42,0.4)', paddingVertical: 5, paddingHorizontal: 10 },
  chipRemainText: { fontSize: 11, fontFamily: F.bold, color: C.orange },
  addBtn: { backgroundColor: C.orange, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  addBtnText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },

  // Compact card
  compactCard: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: C.card, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
  },
  compactThumb: { width: 90, height: 90, overflow: 'hidden' },
  compactBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  compactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  compactName: { flex: 1, fontSize: 14, fontFamily: F.bold, color: C.deep, lineHeight: 20 },
  compactMeta: { fontSize: 12, fontFamily: F.regular, color: C.muted, marginTop: 4 },
  compactQuote: { fontSize: 12, fontFamily: F.regular, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  compactGenerate: { fontSize: 12, fontFamily: F.semibold, color: C.orange, marginTop: 3 },
  compactInProgressHint: { fontSize: 12, fontFamily: F.regular, color: C.muted, marginTop: 3 },
  chevron: { fontSize: 20, color: C.muted, paddingRight: 14 },

  // Badges
  badge: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 0 },
  badgeText: { fontSize: 10, fontFamily: F.bold },
  badgeStory: { backgroundColor: C.orangeLt },
  badgeTextStory: { color: C.orange },
  badgeMuted: { backgroundColor: C.bg },
  badgeTextMuted: { color: C.muted },
  badgeInProgress: { backgroundColor: 'rgba(61,170,110,0.12)', borderWidth: 1, borderColor: 'rgba(61,170,110,0.3)' },
  badgeTextInProgress: { color: '#3DAA6E' },
});
