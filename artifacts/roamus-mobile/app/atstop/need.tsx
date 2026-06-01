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
  muted?: boolean;
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

  const foodUrl     = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`family restaurants near ${address || stopName}`)}`;
  const activityUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`fun activities near ${address || stopName}`)}`;
  const parkUrl     = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`park cafe near ${address || stopName}`)}`;

  const items: NeedItem[] = [
    {
      icon: '\u23E9',
      title: 'Running behind',
      sub: 'Shorten this stop or shift the timeline',
      onPress: () =>
        Alert.alert('Running behind?', "Here's how to catch up", [
          { text: 'Tighten travel gaps', onPress: () => router.back() },
          { text: 'Highlights only \u2014 45 min', onPress: () => router.back() },
          { text: 'Skip this stop', style: 'destructive', onPress: () => router.back() },
          { text: 'Cancel', style: 'cancel' },
        ]),
    },
    {
      icon: '\U0001f625',
      title: 'Kids are tired',
      sub: 'Find a break spot or easier next stop',
      onPress: () =>
        Alert.alert("Need a break?", "Let's find somewhere to recharge", [
          { text: 'Find a park or cafe nearby', onPress: () => Linking.openURL(parkUrl) },
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
      sub: '4 family options within 0.3 mi',
      onPress: () => Linking.openURL(foodUrl),
    },
    {
      icon: '\u23ED',
      title: 'Skip this stop',
      sub: 'Move on to the next one',
      muted: true,
      onPress: () =>
        Alert.alert('Skip this stop?', `You'll mark "${stopName}" as not visited and move to the next stop.`, [
          { text: 'Skip it', style: 'destructive', onPress: () => router.back() },
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
        <Text style={styles.stopLabel} numberOfLines={1}>{stopName}</Text>
        <Text style={styles.title}>What do you need?</Text>
        <Text style={styles.tagline}>We'll adjust the day around you</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.card}
            activeOpacity={0.75}
            onPress={item.onPress}
          >
            <View style={[styles.iconWrap, item.muted && { opacity: 0.4 }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, item.muted && { color: G.muted }]}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.sub}</Text>
            </View>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: G.bg },
  header:     { backgroundColor: '#1A1F2E', paddingHorizontal: 20, paddingBottom: 28 },
  nav:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn:    { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:   { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  closeBtn:   { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText:  { fontFamily: F.bold, fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  stopLabel:  { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 },
  title:      { fontFamily: F.bold, fontSize: 26, color: '#fff', marginBottom: 4 },
  tagline:    { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  body:       { flex: 1, padding: 16 },
  card:       {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  iconWrap:   {
    width: 44, height: 44, borderRadius: 12, backgroundColor: G.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0,
  },
  icon:       { fontSize: 22 },
  cardText:   { flex: 1 },
  cardTitle:  { fontFamily: F.bold, fontSize: 16, color: G.deep, marginBottom: 2 },
  cardSub:    { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 18 },
  chevron:    { fontFamily: F.bold, fontSize: 22, color: 'rgba(0,0,0,0.18)', marginLeft: 8 },
});
