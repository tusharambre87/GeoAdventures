import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, F } from '@/lib/tokens';

export default function ExpectScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    stopName?: string;
    address?: string;
    enrichment?: string;
    meta?: string;
    duration?: string;
  }>();

  const stopName   = params.stopName   ? decodeURIComponent(params.stopName)   : 'This Stop';
  const address    = params.address    ? decodeURIComponent(params.address)    : '';
  const enrichment = params.enrichment ? JSON.parse(decodeURIComponent(params.enrichment)) : {};
  const meta       = params.meta       ? JSON.parse(decodeURIComponent(params.meta))       : {};
  const duration   = params.duration   ? Number(params.duration) : 60;

  const openDirections = () =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || stopName)}&travelmode=walking`);

  const practicalTips: string[] = enrichment.practicalTips
    ? enrichment.practicalTips
        .split(/\.\s+/)
        .map((s: string) => s.replace(/\.$/, '').trim())
        .filter((s: string) => s.length > 8)
    : [];

  const timingRows = [
    duration            ? ['Recommended time', `~${duration} min`]                                    : null,
    meta.sessionFit     ? ['Best for',         meta.sessionFit]                                       : null,
    enrichment.bestTimeOfDay
                        ? ['Best time',        enrichment.bestTimeOfDay]                              : null,
    enrichment.strollerFriendly != null
                        ? ['Stroller friendly', enrichment.strollerFriendly ? 'Yes' : 'No']          : null,
    meta.hoursToday     ? ['Hours today',      meta.hoursToday]                                       : null,
  ].filter((x): x is [string, string] => Array.isArray(x));

  const accessRows = [
    enrichment.parkingNotes  ? ['Parking',          enrichment.parkingNotes]                : null,
    enrichment.strollerFriendly != null
                             ? ['Stroller friendly', enrichment.strollerFriendly ? 'Yes' : 'No'] : null,
    meta.restroomConfidence  ? ['Restrooms',         meta.restroomConfidence]                : null,
    enrichment.admissionCost ? ['Admission',         enrichment.admissionCost]               : null,
    meta.ticketSignal === true && !enrichment.admissionCost
                             ? ['Admission',         'Ticket required']                      : null,
    meta.ticketSignal === false && !enrichment.admissionCost
                             ? ['Admission',         'Free entry']                           : null,
    enrichment.bookingNotes  ? ['Booking required',  enrichment.bookingNotes]                : null,
    address                  ? ['Address',            address]                               : null,
  ].filter((x): x is [string, string] => Array.isArray(x));

  const nearbyItems: string[] = enrichment.foodOptions
    ? enrichment.foodOptions.split(/[;,\n]/).map((s: string) => s.trim()).filter((s: string) => s.length > 2)
    : [];

  return (
    <View style={styles.container}>
      {/* Dark header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{'\u2190'} At Stop</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.stopLabel} numberOfLines={1}>{stopName}</Text>
        <Text style={styles.title}>What you'll experience</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>

        {/* Directions + Tickets row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openDirections}>
            <Text style={styles.actionBtnText}>{'\u2197'}  Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.ticketBtn]}
            onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(stopName + ' tickets')}`)}>
            <Text style={[styles.actionBtnText, { color: '#D97706' }]}>{'\U0001f3ab'}  Book tickets</Text>
          </TouchableOpacity>
        </View>

        {/* 1. What you'll experience */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT YOU{'\u2019'}LL EXPERIENCE</Text>
          {enrichment.whyNow ? (
            <Text style={styles.highlight}>{enrichment.whyNow}</Text>
          ) : (
            <Text style={styles.highlight}>
              {stopName} is a great stop for families — explore at your own pace and look out for the highlights listed below.
            </Text>
          )}
        </View>

        {/* 2. Best way to do this stop */}
        {practicalTips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BEST WAY TO DO THIS STOP</Text>
            <View style={styles.tipsWrap}>
              {practicalTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}.</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 3. Timing & Logistics */}
        {timingRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TIMING {'&'} LOGISTICS</Text>
            {timingRows.map(([k, v], i) => (
              <View key={k} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={styles.infoVal}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 4. Parking & Access */}
        {accessRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PARKING {'&'} ACCESS</Text>
            {accessRows.map(([k, v], i) => (
              <View key={k} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={[styles.infoVal, { color: k === 'Parking' || k === 'Stroller friendly' ? G.green : G.deep }]}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 5. Nearby Essentials */}
        {nearbyItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NEARBY ESSENTIALS</Text>
            {nearbyItems.slice(0, 5).map((item, i) => (
              <View key={i} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.infoKey}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: G.bg },
  header:       { backgroundColor: '#1A1F2E', paddingHorizontal: 20, paddingBottom: 24 },
  nav:          { flexDirection: 'row', marginBottom: 16 },
  backBtn:      { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:     { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  stopLabel:    { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  title:        { fontFamily: F.bold, fontSize: 24, color: '#fff', lineHeight: 30 },
  body:         { flex: 1, padding: 16 },
  actionRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn:    {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  actionBtnText: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  ticketBtn:    { borderWidth: 1.5, borderColor: 'rgba(245,166,35,0.4)' },
  section:      {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  highlight:    { fontFamily: F.semibold, fontSize: 14, color: G.deep, lineHeight: 22 },
  tipsWrap:     { gap: 8 },
  tipRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 2 },
  tipDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: G.orange, marginTop: 7, flexShrink: 0 },
  tipText:      { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 20, flex: 1 },
  infoRow:      {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  infoKey:      { fontFamily: F.medium, fontSize: 13, color: G.muted, flex: 1 },
  infoVal:      { fontFamily: F.bold, fontSize: 13, color: G.deep, textAlign: 'right', flex: 1 },
});
