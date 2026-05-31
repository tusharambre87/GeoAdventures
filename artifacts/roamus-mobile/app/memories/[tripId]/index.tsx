/**
 * Active Trip Photo View
 * Brief: memories-replit-brief.md — Screen 2
 */
import React, { useMemo } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { memoriesAPI, travelAPI, Moment, TripStop } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  green:    '#3DAA6E',
  border:   'rgba(26,31,46,0.08)',
} as const;

const STOP_EMOJI: Record<string, string> = {
  museum: '🏛', landmark: '📍', park: '🌿', restaurant: '🍽',
  beach: '🏖', market: '🛍', viewpoint: '🌅', temple: '⛩',
  activity: '🎯', hotel: '🏨', cafe: '☕', shop: '🛍',
};
function stopEmoji(type?: string | null) {
  return STOP_EMOJI[type ?? ''] ?? '📍';
}

function PhotoThumb({ uri, placeholder }: { uri?: string | null; placeholder?: string }) {
  if (uri) {
    return (
      <ExpoImage
        source={{ uri }}
        style={styles.stopPhoto}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[styles.stopPhoto, { backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 28 }}>{placeholder ?? '📸'}</Text>
    </View>
  );
}

export default function ActiveTripPhotoView() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();

  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => travelAPI.getTrip(tripId),
    enabled: !!tripId,
  });

  const { data: moments = [], isLoading: momentsLoading } = useQuery({
    queryKey: ['moments', tripId],
    queryFn: () => memoriesAPI.getMoments(tripId),
    enabled: !!tripId,
  });

  const isLoading = tripLoading || momentsLoading;

  const { byStop, visitedStopIds, unvisited, allPhotos, totalPhotos } = useMemo(() => {
    const byStop: Record<string, { stop: TripStop | null; name: string; moments: Moment[] }> = {};
    for (const m of moments) {
      const key = m.stopId ?? 'unassigned';
      if (!byStop[key]) {
        const stop = trip?.stops?.find(s => s.id === m.stopId) ?? null;
        byStop[key] = { stop, name: stop?.name ?? 'Untagged', moments: [] };
      }
      byStop[key].moments.push(m);
    }
    const visitedStopIds = new Set(moments.map(m => m.stopId).filter(Boolean));
    const unvisited = (trip?.stops ?? []).filter(s => !visitedStopIds.has(s.id));
    const allPhotos = moments.flatMap(m =>
      m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
    );
    return { byStop, visitedStopIds, unvisited, allPhotos, totalPhotos: allPhotos.length };
  }, [moments, trip]);

  const stopsDone = visitedStopIds.size;
  const stopsTotal = trip?.stops?.length ?? 0;
  const progressPct = stopsTotal > 0 ? stopsDone / stopsTotal : 0;

  function handleCapture() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', '📷 Take a photo', '🖼 Choose from library', '📝 Add a note'], cancelButtonIndex: 0 },
        () => {}
      );
    } else {
      Alert.alert('Capture', 'Choose an option', [
        { text: '📷 Take a photo', onPress: () => {} },
        { text: '🖼 Choose from library', onPress: () => {} },
        { text: '📝 Add a note', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.orange} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const tripName = trip?.name ?? 'Trip';
  const tripDays = trip?.tripDays ?? 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>{tripName}</Text>
            <Text style={styles.headerSub}>Day 1 of {tripDays} · In progress</Text>
          </View>
        </View>
        <Pressable style={styles.capturePill} onPress={handleCapture}>
          <Text style={styles.capturePillText}>📷 Capture</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Progress card */}
        <View style={styles.progressCard}>
          <View style={styles.greenDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>
              {totalPhotos > 0 ? 'Keep capturing moments' : 'Start capturing moments'}
            </Text>
            <Text style={styles.progressSub}>
              {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
              {stopsTotal > 0 ? ` · ${stopsDone}/${stopsTotal} stops visited` : ''}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progressPct * 100)}%` }]} />
          </View>
        </View>

        {/* By Stop */}
        {Object.keys(byStop).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>By Stop</Text>
            {Object.entries(byStop).map(([key, { stop, name, moments: ms }]) => (
              <View key={key} style={styles.stopRow}>
                <View style={styles.stopRowHeader}>
                  <Text style={styles.stopRowName}>
                    {stopEmoji(stop?.stopType)} {name}
                  </Text>
                  <Text style={styles.stopRowCount}>{ms.length}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 4 }}>
                  {ms.map((m, i) => {
                    const uri = m.photoUrls?.[0] ?? m.photoUrl;
                    return <PhotoThumb key={m.id ?? i} uri={uri} />;
                  })}
                </ScrollView>
              </View>
            ))}
          </>
        )}

        {/* Up Next */}
        {unvisited.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Up Next ({unvisited.length} stop{unvisited.length !== 1 ? 's' : ''})</Text>
            <View style={{ marginHorizontal: 20, marginBottom: 16, gap: 8 }}>
              {unvisited.slice(0, 4).map(s => (
                <View key={s.id} style={styles.upNextRow}>
                  <Text style={{ fontSize: 20 }}>{stopEmoji(s.stopType)}</Text>
                  <Text style={styles.upNextName}>{s.name}</Text>
                  <Text style={styles.upNextBadge}>Not visited</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* All Moments */}
        <View style={styles.allMomentsHeader}>
          <Text style={styles.sectionLabel} >All Moments ({totalPhotos})</Text>
          <Pressable onPress={handleCapture}>
            <Text style={styles.addLink}>+ Add</Text>
          </Pressable>
        </View>
        <View style={styles.momentsGrid}>
          {allPhotos.slice(0, 8).map((uri, i) => (
            <ExpoImage key={i} source={{ uri }} style={styles.momentThumb} contentFit="cover" />
          ))}
          {allPhotos.length === 0 && Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.momentThumb, { backgroundColor: '#e0ddd9', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 24, opacity: 0.3 }}>📸</Text>
            </View>
          ))}
          <Pressable style={styles.momentAdd} onPress={handleCapture}>
            <Text style={{ fontSize: 24, color: C.orange }}>+</Text>
          </Pressable>
        </View>

        {/* Create Something */}
        <Text style={styles.sectionLabel}>Create Something</Text>
        <View style={styles.createGrid}>
          {[
            { icon: '🎬', label: 'Make Video', bg: '#f0ebff' },
            { icon: '🖼', label: 'Make Collage', bg: '#fdf0e9' },
            { icon: '↗', label: 'Share Story', bg: '#eef5f2' },
            { icon: '⬇', label: 'Download', bg: '#fffbeb' },
          ].map(item => (
            <Pressable
              key={item.label}
              style={styles.createCard}
              onPress={() => Alert.alert('Coming soon', 'This feature will be available after your trip is complete.')}
            >
              <View style={[styles.createIcon, { backgroundColor: item.bg }]}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              </View>
              <Text style={styles.createLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F2EE' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16,
  },
  backArrow: { fontSize: 22, color: C.deep },
  headerTitle: { fontSize: 20, fontFamily: F.bold, color: C.deep },
  headerSub: { fontSize: 13, fontFamily: F.medium, color: C.muted },
  capturePill: { backgroundColor: C.orange, borderRadius: 40, paddingVertical: 10, paddingHorizontal: 18 },
  capturePillText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },

  progressCard: {
    marginHorizontal: 20, marginBottom: 4,
    backgroundColor: C.deep, borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  greenDot: { width: 10, height: 10, backgroundColor: C.green, borderRadius: 5 },
  progressTitle: { fontSize: 13, fontFamily: F.bold, color: '#fff' },
  progressSub: { fontSize: 12, fontFamily: F.regular, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  progressBarTrack: { height: 3, width: 80, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: C.orange, borderRadius: 2 },

  sectionLabel: {
    fontSize: 11, fontFamily: F.bold, color: C.muted,
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },

  stopRow: { paddingHorizontal: 20, paddingBottom: 16 },
  stopRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  stopRowName: { fontSize: 14, fontFamily: F.bold, color: C.deep },
  stopRowCount: { fontSize: 13, fontFamily: F.semibold, color: C.muted },
  stopPhoto: { width: 80, height: 80, borderRadius: 12, marginRight: 8 },

  upNextRow: {
    backgroundColor: C.card, borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.6,
  },
  upNextName: { flex: 1, fontSize: 14, fontFamily: F.semibold, color: C.deep },
  upNextBadge: { fontSize: 12, fontFamily: F.regular, color: C.muted },

  allMomentsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingRight: 20,
  },
  addLink: { fontSize: 13, fontFamily: F.bold, color: C.orange },
  momentsGrid: {
    marginHorizontal: 20, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginBottom: 0,
  },
  momentThumb: { width: '32%', aspectRatio: 1 },
  momentAdd: {
    width: '32%', aspectRatio: 1,
    borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(232,105,42,0.4)',
    borderRadius: 4, alignItems: 'center', justifyContent: 'center',
  },

  createGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20, marginBottom: 40 },
  createCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 20,
    alignItems: 'center', gap: 8, width: '47%', opacity: 0.45,
  },
  createIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  createLabel: { fontSize: 13, fontFamily: F.bold, color: C.deep },
});
