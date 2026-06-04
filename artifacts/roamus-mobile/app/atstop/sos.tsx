import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, F } from '@/lib/tokens';

export default function SosScreen() {
  const insets = useSafeAreaInsets();
  const { tripId, destination } = useLocalSearchParams<{ tripId?: string; destination?: string }>();

  const options = [
    {
      bg: '#FEF2F2',
      emoji: '\uD83E\uDD12',
      title: "Someone isn't feeling well",
      sub: 'Find urgent care or pharmacy nearby',
      onPress: () => router.push({ pathname: '/atstop/sos-care' as never, params: { tripId, destination } }),
    },
    {
      bg: '#FEF2F2',
      emoji: '\uD83D\uDEA8',
      title: 'We need emergency help',
      sub: 'Call emergency services',
      onPress: () => router.push({ pathname: '/atstop/sos-emergency' as never, params: { tripId, destination } }),
    },
    {
      bg: '#EFF6FF',
      emoji: '\uD83D\uDCCD',
      title: "We're lost",
      sub: 'Get back to your hotel or a safe place',
      onPress: () => router.push({ pathname: '/atstop/sos-lost' as never, params: { tripId, destination } }),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← At Stop</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Help & Safety</Text>
        <Text style={styles.sub}>We've got you — tap what's happening</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {options.map((opt) => (
          <TouchableOpacity key={opt.title} style={styles.option} activeOpacity={0.8} onPress={opt.onPress}>
            <View style={[styles.optIcon, { backgroundColor: opt.bg }]}>
              <Text style={styles.optEmoji}>{opt.emoji}</Text>
            </View>
            <View style={styles.optBody}>
              <Text style={styles.optTitle}>{opt.title}</Text>
              <Text style={styles.optSub}>{opt.sub}</Text>
            </View>
            <Text style={styles.optArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>
            {'\uD83D\uDD12'} Your location is only used to find nearby help. Never stored or shared.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: G.bg },
  header:      { backgroundColor: '#1A1F2E', paddingHorizontal: 20, paddingBottom: 24 },
  nav:         { flexDirection: 'row', marginBottom: 16 },
  backBtn:     { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:    { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  title:       { fontFamily: F.bold, fontSize: 26, color: '#fff', marginBottom: 4 },
  sub:         { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  body:        { flex: 1, padding: 16 },
  option:      {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  optIcon:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optEmoji:    { fontSize: 24 },
  optBody:     { flex: 1 },
  optTitle:    { fontFamily: F.bold, fontSize: 15, color: G.deep, marginBottom: 3 },
  optSub:      { fontFamily: F.medium, fontSize: 12, color: G.muted, lineHeight: 18 },
  optArrow:    { fontSize: 20, color: '#C4C9D4' },
  privacyNote: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, marginTop: 4,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)',
  },
  privacyText: { fontFamily: F.medium, fontSize: 12, color: '#B91C1C', lineHeight: 20 },
});
