/**
 * Active Trip Memory Index — per-stop photo grids + capture
 * Brief: memories-replit-brief.md — Screen 2
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { memoriesAPI, travelAPI, Moment, API_BASE } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

import StopPickerSheet from '@/components/StopPickerSheet';

/** Normalise stored photo URIs — older records may have relative paths */
function absPhotoUrl(uri: string): string {
  if (!uri || uri.startsWith('http')) return uri;
  return `${API_BASE}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

const { width: SW } = Dimensions.get('window');
const PHOTO_SIZE = (SW - 40 - 12) / 3;

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  border:   'rgba(26,31,46,0.08)',
} as const;

const STOP_EMOJI: Record<string, string> = {
  museum: '\uD83C\uDFDB', landmark: '\uD83D\uDCCD', park: '\uD83C\uDF3F', restaurant: '\uD83C\uDF7D',
  beach: '\uD83C\uDFD6', market: '\uD83D\uDECD', viewpoint: '\uD83C\uDF05', temple: '\u26E9',
  activity: '\uD83C\uDFAF', hotel: '\uD83C\uDFE8', cafe: '\u2615',
};
function stopEmoji(t?: string | null) { return STOP_EMOJI[t ?? ''] ?? '\uD83D\uDCCD'; }

function formatTime(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' });
}

export default function TripMemoryIndex() {
  const { tripId, dayIndex: dayIndexParam } = useLocalSearchParams<{ tripId: string; dayIndex?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  // When opened from "Wrap Day", dayIndex is set — show day-level "Today's Story" view
  const focusDayIndex = dayIndexParam != null && dayIndexParam !== '' ? Number(dayIndexParam) : null;
  const isDayView = focusDayIndex != null && !isNaN(focusDayIndex);

  const { data: trip, isLoading: tripLoading, isError: tripError } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => travelAPI.getTrip(tripId),
    enabled: !!tripId,
    retry: 1,
  });

  const { data: momentsRaw, isLoading: momentsLoading, isError: momentsError } = useQuery({
    queryKey: ['moments', tripId],
    queryFn: () => memoriesAPI.getMoments(tripId),
    enabled: !!tripId,
    retry: 1,
  });
  const moments: Moment[] = Array.isArray(momentsRaw)
    ? momentsRaw
    : ((momentsRaw as any)?.moments ?? []);

  const { visitedStops, momentsByStop, allPhotos, dayStops, dayMoments, dayPhotos, kidQuotes } = useMemo(() => {
    const allStops = ((trip?.stops ?? []) as any[])
      .filter((s: any) => s.isVisited || s.visited)
      .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    const visitedStops = allStops;

    const momentsByStop: Record<string, Moment[]> = {};
    for (const m of moments) {
      const key = m.stopId ?? '__none__';
      if (!momentsByStop[key]) momentsByStop[key] = [];
      momentsByStop[key].push(m);
    }

    const allPhotos = moments.flatMap(m =>
      m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
    );

    // Day-level filter
    const dayStops = isDayView
      ? allStops.filter((s: any) => (s.dayIndex ?? 0) === focusDayIndex)
      : [];

    const dayStopIds = new Set(dayStops.map((s: any) => s.id));
    const dayMoments = isDayView
      ? moments.filter(m => m.stopId ? dayStopIds.has(m.stopId) : false)
      : [];

    const dayPhotos = dayMoments.flatMap(m =>
      m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
    );

    // Parse kid quotes: stored as "name|quote" or plain quote
    const kidQuotes = (isDayView ? dayMoments : moments)
      .filter(m => m.kidPromptResponse)
      .map(m => {
        const raw = m.kidPromptResponse ?? '';
        const pipeIdx = raw.indexOf('|');
        if (pipeIdx > 0) {
          return { name: raw.slice(0, pipeIdx).trim(), quote: raw.slice(pipeIdx + 1).trim() };
        }
        return { name: null, quote: raw.trim() };
      })
      .filter(q => q.quote.length > 0);

    return { visitedStops, momentsByStop, allPhotos, dayStops, dayMoments, dayPhotos, kidQuotes };
  }, [trip, moments, isDayView, focusDayIndex]);

  function openPhotoSheet() { setShowPhotoSheet(true); }

  async function shareDay() {
    const dayNum = (focusDayIndex ?? 0) + 1;
    const name = trip?.name ?? 'our family trip';
    const stopNames = dayStops.map((s: any) => s.name).join(', ');
    const quotePart = kidQuotes.length > 0
      ? '\n\nKid highlights:\n' + kidQuotes.map(q => q.name ? `${q.name}: "${q.quote}"` : `"${q.quote}"`).join('\n')
      : '';
    const url = `https://roamus.app/s/${tripId}`;
    const message = `Day ${dayNum} of ${name}!\nWe visited: ${stopNames}${quotePart}\n\n${url}`;
    try {
      await Share.share({ message, url });
    } catch (_) {}
  }

  async function shareTrip() {
    const url = `https://roamus.app/s/${tripId}`;
    const name = trip?.name ?? 'our family trip';
    try {
      await Share.share({ message: `Check out ${name}! ${url}`, url });
    } catch (_) {}
  }

  function handleStopSelect(stopId: string | null, stopName: string, stopIcon: string) {
    setShowPhotoSheet(false);
    router.push({
      pathname: `/memories/${tripId}/add-photo` as never,
      params: { stopId: stopId ?? '', stopName, stopIcon },
    });
  }

  if (tripLoading || momentsLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.orange} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (tripError || momentsError) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Trip</Text>
          <View style={{ width: 72 }} />
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Can't load this trip</Text>
          <Text style={styles.emptyBody}>
            This trip may belong to a different account. Go back and open it from your trips list.
          </Text>
        </View>
      </View>
    );
  }

  const tripName = trip?.name ?? 'Trip';
  const dayNum = (focusDayIndex ?? 0) + 1;

  // ── Day-level "Today's Story" view ─────────────────────────────────────────
  if (isDayView) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.replace('/(tabs)/memories' as never)} hitSlop={12}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>Day {dayNum} Story</Text>
          <Pressable style={styles.addBtn} onPress={openPhotoSheet} hitSlop={8}>
            <Text style={styles.addBtnText}>{'\uD83D\uDCF7'} Add</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
          {/* Day header */}
          <View style={dayStyles.heroCard}>
            <Text style={dayStyles.heroEmoji}>{'\uD83C\uDF89'}</Text>
            <Text style={dayStyles.heroTitle}>Day {dayNum} Complete!</Text>
            <Text style={dayStyles.heroSub}>{dayStops.length} stop{dayStops.length !== 1 ? 's' : ''} visited</Text>
          </View>

          {/* Stops with photos and quotes */}
          {dayStops.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No stops recorded for Day {dayNum}</Text>
              <Text style={styles.emptyBody}>Mark stops as visited to see them here.</Text>
            </View>
          ) : (
            dayStops.map((stop: any, idx: number) => {
              const stopMoments = momentsByStop[stop.id] ?? [];
              const photos = stopMoments.flatMap((m: Moment) =>
                m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
              );
              const stopQuotes = stopMoments
                .filter(m => m.kidPromptResponse)
                .map(m => {
                  const raw = m.kidPromptResponse ?? '';
                  const pipeIdx = raw.indexOf('|');
                  if (pipeIdx > 0) return { name: raw.slice(0, pipeIdx).trim(), quote: raw.slice(pipeIdx + 1).trim() };
                  return { name: null, quote: raw.trim() };
                })
                .filter(q => q.quote.length > 0);

              return (
                <View key={stop.id} style={{ marginBottom: 4 }}>
                  <View style={styles.stopRow}>
                    <View style={styles.stopIconWrap}>
                      <Text style={{ fontSize: 18 }}>{stopEmoji(stop.stopType)}</Text>
                    </View>
                    <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                  </View>

                  {photos.length > 0 && (
                    <View style={styles.photoGrid}>
                      {photos.map((uri: string, i: number) => (
                        <View key={i} style={styles.photoCell}>
                          <ExpoImage source={{ uri: absPhotoUrl(uri) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        </View>
                      ))}
                      <Pressable style={styles.addSlot} onPress={openPhotoSheet}>
                        <Text style={styles.addSlotPlus}>+</Text>
                      </Pressable>
                    </View>
                  )}

                  {photos.length === 0 && (
                    <Pressable style={dayStyles.addPhotoRow} onPress={openPhotoSheet}>
                      <Text style={dayStyles.addPhotoText}>{'\uD83D\uDCF7'} Add photos from {stop.name}</Text>
                    </Pressable>
                  )}

                  {stopQuotes.map((q, qi) => (
                    <View key={qi} style={dayStyles.quoteRow}>
                      <View style={dayStyles.quoteBar} />
                      <View style={{ flex: 1 }}>
                        {q.name && <Text style={dayStyles.quoteName}>{q.name}</Text>}
                        <Text style={dayStyles.quoteText}>{'\u201C'}{q.quote}{'\u201D'}</Text>
                      </View>
                    </View>
                  ))}

                  {idx < dayStops.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })
          )}

          {/* Share button */}
          <View style={[styles.shareSection, { marginTop: 16 }]}>
            <Pressable style={styles.shareBtn} onPress={shareDay}>
              <Text style={styles.shareBtnText}>Share Day {dayNum}</Text>
            </Pressable>
            <Text style={dayStyles.shareHint}>Shareable on Instagram, WhatsApp, and more</Text>
          </View>
        </ScrollView>

        {showPhotoSheet && (
          <StopPickerSheet
            trip={trip ?? null}
            onDismiss={() => setShowPhotoSheet(false)}
            onSelect={handleStopSelect}
          />
        )}
      </View>
    );
  }

  // ── Full trip view (default) ────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{tripName}</Text>
        <Pressable style={styles.addBtn} onPress={openPhotoSheet} hitSlop={8}>
          <Text style={styles.addBtnText}>{'\uD83D\uDCF7'} Add</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        {/* Empty state */}
        {visitedStops.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No visited stops yet</Text>
            <Text style={styles.emptyBody}>
              Mark stops as visited on the Today tab to see them here.
            </Text>
          </View>
        )}

        {/* Per-stop sections */}
        {visitedStops.map((stop: any, idx: number) => {
          const stopMoments = momentsByStop[stop.id] ?? [];
          const photos = stopMoments.flatMap((m: Moment) =>
            m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
          );
          const visitedAt = stop.visitedAt ?? stop.updatedAt ?? null;

          return (
            <View key={stop.id}>
              {/* Stop header row */}
              <View style={styles.stopRow}>
                <View style={styles.stopIconWrap}>
                  <Text style={{ fontSize: 18 }}>{stopEmoji(stop.stopType)}</Text>
                </View>
                <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                {visitedAt ? (
                  <Text style={styles.stopTime}>{formatTime(visitedAt)}</Text>
                ) : null}
              </View>

              {/* 3-column photo grid */}
              <View style={styles.photoGrid}>
                {photos.map((uri: string, i: number) => (
                  <View key={i} style={styles.photoCell}>
                    <ExpoImage
                      source={{ uri: absPhotoUrl(uri) }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  </View>
                ))}
                {/* Dashed add slot */}
                <Pressable style={styles.addSlot} onPress={openPhotoSheet}>
                  <Text style={styles.addSlotPlus}>+</Text>
                </Pressable>
              </View>

              {/* Divider between stops */}
              {idx < visitedStops.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}

        {/* All Moments section */}
        {allPhotos.length > 0 && (
          <View style={styles.allMomentsSection}>
            <Text style={styles.sectionLabel}>ALL MOMENTS</Text>
            <View style={styles.photoGrid}>
              {allPhotos.map((uri: string, i: number) => (
                <View key={i} style={styles.photoCell}>
                  <ExpoImage
                    source={{ uri: absPhotoUrl(uri) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Share CTA */}
        {(allPhotos.length > 0 || visitedStops.length > 0) && (
          <View style={styles.shareSection}>
            <Pressable style={styles.shareBtn} onPress={shareTrip}>
              <Text style={styles.shareBtnText}>Share Trip</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {showPhotoSheet && (
        <StopPickerSheet
          trip={trip ?? null}
          onDismiss={() => setShowPhotoSheet(false)}
          onSelect={handleStopSelect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, color: C.deep, fontFamily: F.bold },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: F.bold,
    color: C.deep,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  addBtn: {
    backgroundColor: '#E8692A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },

  emptyBox: { margin: 24, alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontFamily: F.bold, color: C.deep, marginBottom: 6 },
  emptyBody: {
    fontSize: 13, fontFamily: F.regular, color: C.muted,
    textAlign: 'center', lineHeight: 20,
  },

  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10,
  },
  stopIconWrap: {
    width: 36, height: 36,
    backgroundColor: C.orangeLt,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  stopName: { flex: 1, fontSize: 14, fontFamily: F.bold, color: C.deep },
  stopTime: { fontSize: 12, fontFamily: F.regular, color: C.muted },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 14,
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#DDD',
  },
  addSlot: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotPlus: { fontSize: 24, color: C.muted, lineHeight: 28 },

  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 20 },

  allMomentsSection: { marginTop: 24 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: F.bold,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  shareSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  shareBtn: {
    backgroundColor: '#E8692A',
    borderRadius: 28,
    paddingVertical: 15,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  shareBtnText: {
    fontFamily: F.bold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.2,
  },
});

const dayStyles = StyleSheet.create({
  heroCard: {
    margin: 20,
    backgroundColor: '#1D4A42',
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  heroTitle: { fontFamily: F.bold, fontSize: 22, color: '#fff', marginBottom: 4 },
  heroSub: { fontFamily: F.regular, fontSize: 14, color: 'rgba(255,255,255,0.7)' },

  addPhotoRow: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#F5F2EE',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5E0',
    alignItems: 'center',
  },
  addPhotoText: { fontFamily: F.medium, fontSize: 13, color: '#8A8FA8' },

  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    gap: 10,
  },
  quoteBar: { width: 3, borderRadius: 2, backgroundColor: '#E8692A', marginTop: 2, alignSelf: 'stretch' },
  quoteName: { fontFamily: F.semibold, fontSize: 11, color: '#8A8FA8', letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  quoteText: { fontFamily: F.regular, fontSize: 14, color: '#1A1F2E', lineHeight: 20, fontStyle: 'italic' },

  shareHint: { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8', marginTop: 8, textAlign: 'center' },
});
