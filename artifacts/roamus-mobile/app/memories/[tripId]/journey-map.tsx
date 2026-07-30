/**
 * Journey Map — full-screen interactive trip map reached from the memories recap.
 * Renders TripMapView (numbered stop pins) without the story carousel wrapper.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { travelAPI } from '@/lib/apiClient';
import TripMapView from '@/components/TripMapView';

const C = {
  orange: '#E8692A',
  bg:     '#F5F2EE',
  deep:   '#1A1F2E',
  white:  '#FFFFFF',
} as const;

export default function JourneyMapScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => travelAPI.getTrip(tripId),
    enabled: !!tripId,
  });

  const stops: any[] = (trip as any)?.stops ?? [];
  const totalDays: number = (trip as any)?.totalDays ?? trip?.days ?? stops.reduce((m: number, s: any) => Math.max(m, s.dayNumber ?? 1), 1);

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
          onMarkerPress={() => {}}
        />
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
});
