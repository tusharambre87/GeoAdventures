/**
 * Journey Map — full-screen interactive trip map reached from the memories recap.
 * Renders TripMapView (numbered stop pins) without the story carousel wrapper.
 * Tapping a pin opens a bottom-sheet card with stop details + thumbnail.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { travelAPI, memoriesAPI, Moment, API_BASE } from '@/lib/apiClient';
import TripMapView from '@/components/TripMapView';

const STOP_EMOJI: Record<string, string> = {
  museum:     '\uD83C\uDFDB',
  landmark:   '\uD83D\uDCCD',
  park:       '\uD83C\uDF3F',
  restaurant: '\uD83C\uDF7D',
  beach:      '\uD83C\uDFD6',
  market:     '\uD83D\uDECD',
  viewpoint:  '\uD83C\uDF05',
  temple:     '\u26E9',
  activity:   '\uD83C\uDFAF',
  hotel:      '\uD83C\uDFE8',
  cafe:       '\u2615',
};
function stopEmoji(t?: string | null) { return STOP_EMOJI[t ?? ''] ?? '\uD83D\uDCCD'; }

function absPhotoUrl(uri: string): string {
  if (!uri || uri.startsWith('http')) return uri;
  return `${API_BASE}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

type Stop = {
  id: string;
  name: string;
  stopType?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  displayOrder?: number | null;
  dayIndex?: number | null;
  isVisited?: boolean;
  visited?: boolean;
};

const C = {
  orange: '#E8692A',
  bg:     '#F5F2EE',
  deep:   '#1A1F2E',
  white:  '#FFFFFF',
  muted:  '#8A8FA8',
} as const;

export default function JourneyMapScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => travelAPI.getTrip(tripId),
    enabled: !!tripId,
  });

  const { data: momentsRaw } = useQuery({
    queryKey: ['moments', tripId],
    queryFn: () => memoriesAPI.getMoments(tripId),
    enabled: !!tripId,
  });
  const moments: Moment[] = Array.isArray(momentsRaw)
    ? momentsRaw
    : ((momentsRaw as any)?.moments ?? []);

  // Build a map of stopId → first photo URL
  const firstPhotoByStop: Record<string, string> = {};
  for (const m of moments) {
    if (!m.stopId) continue;
    if (firstPhotoByStop[m.stopId]) continue;
    const photos = m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : [];
    if (photos[0]) firstPhotoByStop[m.stopId] = photos[0];
  }

  const stops: any[] = (trip as any)?.stops ?? [];
  const totalDays: number = (trip as any)?.totalDays ?? trip?.days ?? stops.reduce((m: number, s: any) => Math.max(m, s.dayNumber ?? 1), 1);

  function handleViewMemories() {
    if (!selectedStop) return;
    setSelectedStop(null);
    router.push({
      pathname: `/memories/${tripId}` as never,
      params: { stopId: selectedStop.id },
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={C.deep} />
          <Text style={styles.backLabel}>Memories</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{trip?.name ?? 'Your Journey'}</Text>
        <View style={{ width: 80 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.orange} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn't load trip map</Text>
        </View>
      )}

      {!isLoading && !isError && trip && (
        <TripMapView
          stops={stops}
          totalDays={Math.max(totalDays, 1)}
          onMarkerPress={(stop) => setSelectedStop(stop as Stop)}
        />
      )}

      {/* Stop detail bottom sheet */}
      {selectedStop && (
        <>
          {/* Tap-outside dismiss overlay */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedStop(null)}
            pointerEvents="box-only"
          />

          {/* Card */}
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Grip */}
            <View style={styles.grip} />

            <View style={styles.sheetInner}>
              {/* Left: icon + text */}
              <View style={styles.sheetLeft}>
                <View style={styles.iconBubble}>
                  <Text style={styles.iconEmoji}>{stopEmoji(selectedStop.stopType)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopName} numberOfLines={2}>{selectedStop.name}</Text>
                  {selectedStop.stopType ? (
                    <Text style={styles.stopType}>{selectedStop.stopType}</Text>
                  ) : null}
                </View>
              </View>

              {/* Right: thumbnail (if any photos exist for this stop) */}
              {firstPhotoByStop[selectedStop.id] ? (
                <View style={styles.thumb}>
                  <ExpoImage
                    source={{ uri: absPhotoUrl(firstPhotoByStop[selectedStop.id]) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                </View>
              ) : null}
            </View>

            {/* View memories CTA */}
            <TouchableOpacity
              style={styles.cta}
              activeOpacity={0.85}
              onPress={handleViewMemories}
            >
              <Text style={styles.ctaText}>View memories</Text>
              <Ionicons name="chevron-forward" size={16} color={C.white} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(245,242,238,0.92)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 80,
  },
  backLabel: {
    fontSize: 15,
    color: '#1A1F2E',
    fontWeight: '500',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1F2E',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#8A8FA8',
  },
  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  grip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0DDD8',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sheetLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDF0E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 22 },
  stopName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.deep,
    lineHeight: 20,
  },
  stopType: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EEE',
    flexShrink: 0,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: C.orange,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 4,
  },
  ctaText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
