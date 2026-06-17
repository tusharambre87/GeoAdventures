import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Linking, TextInput, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { G, F } from '@/lib/tokens';
import { API_BASE } from '@/lib/apiClient';

export default function SosLostScreen() {
  const insets = useSafeAreaInsets();
  const { hotelName, hotelAddress, tripId, destination } = useLocalSearchParams<{
    hotelName?: string;
    hotelAddress?: string;
    tripId?: string;
    destination?: string;
  }>();

  const [hotelInput, setHotelInput]     = useState('');
  const [coords, setCoords]             = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocLoading] = useState(true);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') { setLocLoading(false); return; }
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(loc => { setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude }); setLocLoading(false); })
        .catch(() => setLocLoading(false));
    });
  }, []);

  const navigateToHotel = (dest: string) =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=walking`);

  const openCurrentLocation = () => {
    if (coords) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`);
  };

  async function saveAndNavigate(dest: string) {
    if (!tripId || saving) { void navigateToHotel(dest); return; }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/api/travel/trips/${tripId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          stayLocations: [{
            cityName: destination ?? '',
            name: dest,
            address: dest,
          }],
        }),
      });
    } catch {
    } finally {
      setSaving(false);
      void navigateToHotel(dest);
    }
  }

  const savedHotel = hotelName ?? hotelAddress;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Get back safely</Text>
        <Text style={styles.sub}>We'll help you navigate to safety</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

        {/* Hotel card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>YOUR HOTEL</Text>
          {savedHotel ? (
            <>
              <Text style={styles.cardTitle}>{hotelName ?? 'Your accommodation'}</Text>
              {!!hotelAddress && <Text style={styles.cardBody}>{hotelAddress}</Text>}
              <TouchableOpacity style={styles.navBtn}
                onPress={() => navigateToHotel(hotelAddress ?? hotelName ?? '')}>
                <Text style={styles.navBtnText}>{'\uD83D\uDCCD'}  Navigate to hotel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardBody}>
                Enter your hotel name or address to get directions back. We'll also save it as your starting point.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Hotel name or address…"
                placeholderTextColor={G.muted}
                value={hotelInput}
                onChangeText={setHotelInput}
                returnKeyType="go"
                onSubmitEditing={() => hotelInput.trim() && void saveAndNavigate(hotelInput.trim())}
              />
              <TouchableOpacity
                style={[styles.navBtn, (!hotelInput.trim() || saving) && styles.navBtnDisabled]}
                disabled={!hotelInput.trim() || saving}
                onPress={() => void saveAndNavigate(hotelInput.trim())}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.navBtnText}>{'\uD83D\uDCCD'}  Save & Navigate</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Current location card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>YOUR LOCATION</Text>
          {locationLoading ? (
            <ActivityIndicator color={G.orange} style={{ marginVertical: 12 }} />
          ) : coords ? (
            <>
              <Text style={styles.cardTitle}>Location found</Text>
              <Text style={styles.cardBody}>
                {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={openCurrentLocation}>
                <Text style={styles.secondaryBtnText}>{'\uD83D\uDDFA'}  Open in Maps</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.cardBody}>
              Location unavailable. Stay in a public place and share your surroundings with someone you trust.
            </Text>
          )}
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipText}>
            {'\uD83D\uDCA1'} If you're lost, stay calm. Stay visible in a public, busy place. Ask a staff member or
            security guard for help — they're usually trained for this.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: G.bg },
  header:           { backgroundColor: '#1E3A5F', paddingHorizontal: 20, paddingBottom: 24 },
  nav:              { flexDirection: 'row', marginBottom: 16 },
  backBtn:          { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:         { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  title:            { fontFamily: F.bold, fontSize: 26, color: '#fff', marginBottom: 4 },
  sub:              { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  body:             { flex: 1, padding: 16 },
  card:             {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  cardLabel:        { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  cardTitle:        { fontFamily: F.bold, fontSize: 16, color: G.deep, marginBottom: 4 },
  cardBody:         { fontFamily: F.medium, fontSize: 14, color: G.muted, lineHeight: 21, marginBottom: 14 },
  input:            {
    fontFamily: F.regular, fontSize: 14, color: G.deep,
    backgroundColor: G.bg, borderRadius: 12, borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)', padding: 13, marginBottom: 12,
  },
  navBtn:           { backgroundColor: G.orange, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  navBtnDisabled:   { opacity: 0.4 },
  navBtnText:       { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  secondaryBtn:     { backgroundColor: G.bg, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.09)' },
  secondaryBtnText: { fontFamily: F.bold, fontSize: 14, color: G.deep },
  tipCard:          { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(37,99,235,0.15)' },
  tipText:          { fontFamily: F.medium, fontSize: 13, color: '#1D4ED8', lineHeight: 20 },
});
