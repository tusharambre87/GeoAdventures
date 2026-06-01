import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, F } from '@/lib/tokens';

const INDIA_PATTERN = /india|delhi|mumbai|bangalore|hyderabad|chennai|kolkata|pune|jaipur|ahmedabad/i;

export default function SosEmergencyScreen() {
  const insets = useSafeAreaInsets();
  const { destination } = useLocalSearchParams<{ destination?: string }>();

  const isIndia         = INDIA_PATTERN.test(destination ?? '');
  const primaryNumber   = isIndia ? '112' : '911';

  const numbers = isIndia
    ? [
        { label: 'All emergencies',  num: '112' },
        { label: 'Police',           num: '100' },
        { label: 'Ambulance',        num: '108' },
        { label: 'Fire',             num: '101' },
        { label: "Women's helpline", num: '1091' },
      ]
    : [
        { label: 'Emergency',        num: '911' },
        { label: 'Poison control',   num: '1-800-222-1222' },
        { label: 'Crisis line',      num: '988' },
      ];

  const callTips = [
    'Your exact location or nearest landmark',
    'What has happened',
    'How many people are affected',
    'Your name and callback number',
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.sub}>Stay calm — help is a call away</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Big call card */}
        <View style={styles.callCard}>
          <Text style={styles.phoneEmoji}>📞</Text>
          <Text style={styles.callTitle}>Call emergency services</Text>
          <Text style={styles.emergencyNum}>{primaryNumber}</Text>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${primaryNumber}`)}>
            <Text style={styles.callBtnText}>📞  Call {primaryNumber} now</Text>
          </TouchableOpacity>
        </View>

        {/* All numbers */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {isIndia ? 'INDIA EMERGENCY NUMBERS' : 'EMERGENCY NUMBERS'}
          </Text>
          {numbers.map((r, i) => (
            <TouchableOpacity key={r.num} style={[styles.numRow, i === 0 && { borderTopWidth: 0 }]}
              onPress={() => Linking.openURL(`tel:${r.num}`)}>
              <Text style={styles.numKey}>{r.label}</Text>
              <Text style={styles.numVal}>{r.num}  →</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>WHEN YOU CALL, TELL THEM</Text>
          {callTips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: G.bg },
  header:       { backgroundColor: '#7F1D1D', paddingHorizontal: 20, paddingBottom: 24 },
  nav:          { flexDirection: 'row', marginBottom: 16 },
  backBtn:      { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:     { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  title:        { fontFamily: F.bold, fontSize: 26, color: '#fff', marginBottom: 4 },
  sub:          { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  body:         { flex: 1, padding: 16 },
  callCard:     {
    backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16,
    borderWidth: 2, borderColor: 'rgba(239,68,68,0.15)',
  },
  phoneEmoji:   { fontSize: 48, marginBottom: 10 },
  callTitle:    { fontFamily: F.bold, fontSize: 17, color: G.deep, marginBottom: 10 },
  emergencyNum: { fontFamily: F.bold, fontSize: 60, color: '#DC2626', marginBottom: 16, letterSpacing: 3 },
  callBtn:      { backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, alignSelf: 'stretch', alignItems: 'center' },
  callBtnText:  { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  card:         {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  cardLabel:    { fontFamily: F.bold, fontSize: 10, color: G.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  numRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  numKey:       { fontFamily: F.medium, fontSize: 14, color: G.deep },
  numVal:       { fontFamily: F.bold, fontSize: 14, color: '#DC2626' },
  tipRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DC2626', marginTop: 6, flexShrink: 0 },
  tipText:      { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 21, flex: 1 },
});
