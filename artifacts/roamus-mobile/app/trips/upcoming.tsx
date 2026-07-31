import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { travelAPI, type Trip, API_BASE } from "@/lib/apiClient";
import { CITY_IMGS, F, G } from "@/lib/tokens";

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = s.split('T')[0].split(' ')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function UpcomingTripCard({ trip }: { trip: Trip }) {
  const [bgErr, setBgErr] = React.useState(false);
  const city = trip.destination ?? (trip.name ?? '').replace(/\s+(family trip|trip|adventure)$/i, '').trim();
  const firstStopId = (trip as any).stops?.[0]?.id;
  const bg = !bgErr
    ? (CITY_IMGS[city] ?? trip.coverImageUrl ?? trip.firstPhotoUrl
        ?? (firstStopId ? `${API_BASE}/api/travel/stops/${firstStopId}/hero-img` : null))
    : null;
  const days = trip.tripDays ?? (trip.startDate && trip.endDate
    ? Math.round((parseLocalDate(trip.endDate)!.getTime() - parseLocalDate(trip.startDate)!.getTime()) / 86_400_000) + 1
    : null);
  const startLabel = trip.startDate ? parseLocalDate(trip.startDate)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  return (
    <Pressable
      style={({ pressed }) => [s.card, { opacity: pressed ? 0.88 : 1 }]}
      onPress={() => router.push(`/trip/${trip.id}` as any)}
    >
      {bg ? (
        <Image source={{ uri: bg }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} contentFit="cover" onError={() => setBgErr(true)} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D2118', borderRadius: 16 }]} />
      )}
      <LinearGradient colors={['transparent', 'rgba(6,8,16,0.82)']} locations={[0.35, 1]} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
      <View style={s.cardLabel}>
        <Text style={s.cardName} numberOfLines={2}>{trip.name}</Text>
        {(startLabel || days) && (
          <Text style={s.cardSub}>
            {[startLabel, days ? `${days} days` : null].filter(Boolean).join(' \u00b7 ')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function AllUpcomingTrips() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({ queryKey: ['trips'], queryFn: () => travelAPI.getTrips() });
  const trips = data?.trips ?? [];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = trips.filter(t => {
    if (t.status === 'completed' || t.status === 'archived') return false;
    if (!t.startDate) return true;
    const start = parseLocalDate(t.startDate);
    return start ? start > today : true;
  }).sort((a, b) => {
    const aD = a.startDate ?? ''; const bD = b.startDate ?? '';
    return aD.localeCompare(bD);
  });

  return (
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={G.deep} />
        </TouchableOpacity>
        <Text style={s.title}>Upcoming trips</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={G.orange} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {upcoming.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="calendar-outline" size={40} color={G.muted} />
              <Text style={{ fontFamily: F.semibold, fontSize: 15, color: G.muted, marginTop: 12 }}>No upcoming trips</Text>
            </View>
          ) : (
            upcoming.map(t => <UpcomingTripCard key={t.id} trip={t} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    backgroundColor: G.bg,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(26,31,46,0.06)', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.bold, fontSize: 17, color: G.deep },
  card: { height: 140, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardLabel: { padding: 14 },
  cardName: { fontFamily: F.bold, fontSize: 17, color: '#fff', marginBottom: 4, lineHeight: 21 },
  cardSub: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
});
