import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Linking, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { G, F } from '@/lib/tokens';

export default function SosCareScreen() {
  const insets = useSafeAreaInsets();
  const { destination } = useLocalSearchParams<{ destination?: string }>();
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationDenied, setLocationDenied]   = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') { setLocationDenied(true); setLocationLoading(false); return; }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(loc => {
          setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
          setLocationLoading(false);
        })
        .catch(() => { setLocationDenied(true); setLocationLoading(false); });
    });
  }, []);

  const openSearch = (query: string) => {
    const base = coords
      ? `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${coords.lat},${coords.lon},14z`
      : `https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + (destination ?? 'near me'))}`;
    Linking.openURL(base);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Care near you</Text>
        <Text style={styles.sub}>
          {locationLoading ? 'Getting your location…' : coords ? 'Location found' : 'Searching by destination'}
        </Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {locationLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={G.orange} />
            <Text style={styles.loadingText}>Finding nearby help…</Text>
          </View>
        )}

        {locationDenied && (
          <View style={styles.warnCard}>
            <Text style={styles.warnText}>
              Location access denied. We'll search by your trip destination instead.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>URGENT CARE</Text>
          <Text style={styles.cardTitle}>Nearest urgent care clinic</Text>
          <Text style={styles.cardBody}>
            For non-emergency needs — cuts, fever, stomach bugs, minor injuries.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openSearch('urgent care')}>
            <Text style={styles.primaryBtnText}>↗ Find urgent care in Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>PHARMACY</Text>
          <Text style={styles.cardTitle}>Nearest pharmacy</Text>
          <Text style={styles.cardBody}>
            Medications, first aid supplies, and over-the-counter remedies.
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => openSearch('pharmacy')}>
            <Text style={styles.secondaryBtnText}>↗ Find pharmacy in Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>HOSPITAL</Text>
          <Text style={styles.cardTitle}>Nearest hospital</Text>
          <Text style={styles.cardBody}>For more serious medical needs requiring a full emergency room.</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => openSearch('hospital emergency room')}>
            <Text style={styles.secondaryBtnText}>↗ Find hospital in Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            {'\uD83D\uDCA1'} Tip: Save your travel insurance number in your phone contacts before every trip.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: G.bg },
  header:         { backgroundColor: '#1A1F2E', paddingHorizontal: 20, paddingBottom: 24 },
  nav:            { flexDirection: 'row', marginBottom: 16 },
  backBtn:        { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:       { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  title:          { fontFamily: F.bold, fontSize: 26, color: '#fff', marginBottom: 4 },
  sub:            { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  body:           { flex: 1, padding: 16 },
  loadingRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  loadingText:    { fontFamily: F.medium, fontSize: 13, color: G.muted },
  warnCard:       { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(232,105,42,0.2)' },
  warnText:       { fontFamily: F.medium, fontSize: 13, color: '#92400E', lineHeight: 20 },
  card:           {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  cardLabel:      { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  cardTitle:      { fontFamily: F.bold, fontSize: 16, color: G.deep, marginBottom: 6 },
  cardBody:       { fontFamily: F.medium, fontSize: 14, color: G.muted, lineHeight: 21, marginBottom: 14 },
  primaryBtn:     { backgroundColor: G.orange, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  secondaryBtn:   { backgroundColor: G.bg, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.09)' },
  secondaryBtnText: { fontFamily: F.bold, fontSize: 14, color: G.deep },
  tipCard:        { backgroundColor: '#FFF3E0', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(232,105,42,0.2)' },
  tipText:        { fontFamily: F.medium, fontSize: 13, color: '#92400E', lineHeight: 20 },
});
