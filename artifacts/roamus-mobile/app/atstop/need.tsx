import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, F } from '@/lib/tokens';

type NeedItem = {
  icon: string;
  title: string;
  sub: string;
  onPress: () => void;
};

export default function NeedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    stopName?: string;
    address?: string;
    stopId?: string;
    tripId?: string;
  }>();

  const stopName = params.stopName ? decodeURIComponent(params.stopName) : 'This Stop';
  const address  = params.address  ? decodeURIComponent(params.address)  : '';

  const foodQuery   = encodeURIComponent(`family restaurants near ${address || stopName}`);
  const foodUrl     = `https://www.google.com/maps/search/?api=1&query=${foodQuery}`;
  const activityUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`fun activities near ${address || stopName}`)}`;

  const items: NeedItem[] = [
    {
      icon: '\u23E9',
      title: 'Running behind',
      sub: 'Shorten this stop or shift the timeline',
      onPress: () =>
        Alert.alert('Running behind?', 'Here\'s how to catch up', [
          { text: 'Tighten travel gaps', onPress: () => router.back() },
          { text: 'Highlights only — 45 min', onPress: () => router.back() },
          { text: 'Skip this stop', style: 'destructive', onPress: () => router.back() },
          { text: 'Cancel', style: 'cancel' },
        ]),
    },
    {
      icon: '\U0001f62d',
      title: 'Kids are tired',
      sub: 'Find a break spot or easier next stop',
      onPress: () =>
        Alert.alert('Need a break?', 'Let\'s find somewhere to recharge', [
          {
            text: 'Find a park or cafe nearby',
            onPress: () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`park cafe near ${address || stopName}`)}`),
          },
          { text: 'Go back to trip', onPress: () => router.back() },
          { text: 'Cancel', style: 'cancel' },
        ]),
    },
    {
      icon: '\U0001f389',
      title: 'Need more fun',
      sub: 'Swap for something more exciting nearby',
      onPress: () => Linking.openURL(activityUrl),
    },
    {
      icon: '\U0001f355',
      title: 'Find food nearby',
      sub: 'Family-friendly options near you',
      onPress: () => Linking.openURL(foodUrl),
    },
    {
      icon: '\u23ED',
      title: 'Skip this stop',
      sub: 'Move on to the next one',
      onPress: () =>
        Alert.alert('Skip this stop?', `You\'ll mark "${stopName}" as not visited and move to the next stop.`, [
          {
            text: 'Skip it',
            style: 'destructive',
            onPress: () => router.back(),
          },
          { text: 'Stay here', style: 'cancel' },
        ]),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Dark header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{'\u2190'} At Stop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeText}>{'\u00D7'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>What do you need?</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{stopName}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.row, idx === 0 && { borderTopWidth: 0 }]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <Text style={styles.chevron}>{'\u203A'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: G.bg },
  header:     { backgroundColor: '#1A1F2E', paddingHorizontal: 20, paddingBottom: 28 },
  nav:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn:    { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:   { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  closeBtn:   { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText:  { fontFamily: F.bold, fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  title:      { fontFamily: F.bold, fontSize: 24, color: '#fff', marginBottom: 4 },
  subtitle:   { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  body:       { flex: 1, padding: 16 },
  card:       {
    backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12,
    overflow: 'hidden',
  },
  row:        {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  iconWrap:   {
    width: 40, height: 40, borderRadius: 12, backgroundColor: G.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  icon:       { fontSize: 20 },
  rowText:    { flex: 1 },
  rowTitle:   { fontFamily: F.bold, fontSize: 15, color: G.deep, marginBottom: 2 },
  rowSub:     { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 18 },
  chevron:    { fontFamily: F.bold, fontSize: 20, color: 'rgba(0,0,0,0.2)', marginLeft: 8 },
});
