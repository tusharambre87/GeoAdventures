import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Linking, Alert, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { G, F } from '@/lib/tokens';

// Minimal API helper (same pattern as atstop)
async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const base = typeof __DEV__ !== 'undefined' ? '' : '';
  const res = await fetch(base + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    credentials: 'include',
  });
  if (!res.ok) { const e = new Error(`API ${res.status}`); (e as any).status = res.status; throw e; }
  return res.json() as Promise<T>;
}

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
  const stopId   = params.stopId   ?? '';
  const tripId   = params.tripId   ?? '';

  // ── Running behind sub-sheet animation ────────────────────────────────────
  const [showRunning, setShowRunning] = useState(false);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(380)).current;

  function openRunning() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRunning(true);
    Animated.parallel([
      Animated.spring(overlayAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 180 }),
      Animated.spring(sheetAnim,   { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 180 }),
    ]).start();
  }

  function closeRunning() {
    Animated.parallel([
      Animated.spring(overlayAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 180 }),
      Animated.spring(sheetAnim,   { toValue: 380, useNativeDriver: true, damping: 22, stiffness: 180 }),
    ]).start(() => setShowRunning(false));
  }

  // ── Running behind handlers ────────────────────────────────────────────────
  async function handleTightenSchedule() {
    closeRunning();
    if (tripId) {
      try {
        await apiFetch(`/api/travel/trips/${tripId}/apply-preferences`, {
          method: 'POST',
          body: JSON.stringify({ preference: 'tighten_schedule' }),
        });
      } catch { /* best effort */ }
    }
    router.back();
  }

  function handleHighlightsOnly() {
    closeRunning();
    router.back();
  }

  async function handleSkipStop() {
    if (showRunning) closeRunning();
    if (stopId) {
      try {
        await apiFetch(`/api/travel/stops/${stopId}/quality-signal`, {
          method: 'POST',
          body: JSON.stringify({ signal: 'skip_next_time' }),
        });
        await apiFetch(`/api/travel/stops/${stopId}`, { method: 'DELETE' });
      } catch { /* best effort */ }
    }
    router.back();
  }

  // ── Map URLs ──────────────────────────────────────────────────────────────
  const foodUrl     = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`family restaurants near ${address || stopName}`)}`;
  const activityUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`fun activities near ${address || stopName}`)}`;
  const parkUrl     = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`park cafe near ${address || stopName}`)}`;

  // ── Cards ─────────────────────────────────────────────────────────────────
  const items = [
    {
      icon: '\u23E9',
      title: 'Running behind',
      sub: 'Shorten this stop or shift the timeline',
      onPress: openRunning,
    },
    {
      icon: '😥',
      title: 'Kids are tired',
      sub: 'Find a break spot or easier next stop',
      onPress: () => Alert.alert(
        'Kids are tired',
        'Break spot finder is coming soon. Want to search for parks and cafes near ' + stopName + ' on Google Maps?',
        [
          { text: 'Open Maps', onPress: () => Linking.openURL(parkUrl) },
          { text: 'Not now', style: 'cancel' },
        ]
      ),
    },
    {
      icon: '🎉',
      title: 'Need more fun',
      sub: 'Swap for something more exciting nearby',
      onPress: () => Alert.alert(
        'Need more fun',
        'Activity swap is coming soon. Want to search for fun things near ' + stopName + ' on Google Maps?',
        [
          { text: 'Open Maps', onPress: () => Linking.openURL(activityUrl) },
          { text: 'Not now', style: 'cancel' },
        ]
      ),
    },
    {
      icon: '🍕',
      title: 'Find food nearby',
      sub: 'Family-friendly restaurants near your stop',
      onPress: () => Alert.alert(
        'Find food nearby',
        'In-app food finder is coming soon. Want to open Google Maps for family restaurants near ' + stopName + '?',
        [
          { text: 'Open Maps', onPress: () => Linking.openURL(foodUrl) },
          { text: 'Not now', style: 'cancel' },
        ]
      ),
    },
    {
      icon: '\u23ED',
      title: 'Skip this stop',
      sub: 'Move on to the next one',
      muted: true,
      onPress: () =>
        Alert.alert('Skip this stop?', `You'll mark "${stopName}" as not visited and move to the next stop.`, [
          { text: 'Skip it', style: 'destructive', onPress: handleSkipStop },
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
            <Text style={styles.backText}>{'←'} At Stop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeText}>{'×'}</Text>
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
            <Text style={styles.chevron}>{'›'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Running Behind sub-sheet ──────────────────────────────────────── */}
      {showRunning && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayAnim }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeRunning}
          />
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}
          >
            {/* Dark header */}
            <View style={styles.sheetDarkHeader}>
              <TouchableOpacity onPress={closeRunning} style={styles.sheetBackWrap}>
                <Text style={styles.sheetBackBtn}>{'←'} Back</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Running behind?</Text>
              <Text style={styles.sheetSubtitle}>Here's how to catch up</Text>
            </View>

            {/* Options */}
            <View style={styles.sheetOptions}>
              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.8} onPress={handleTightenSchedule}>
                <View style={[styles.sheetOptIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={{ fontSize: 20 }}>{'⏩'}</Text>
                </View>
                <View style={styles.sheetOptBody}>
                  <Text style={styles.sheetOptTitle}>Tighten travel gaps</Text>
                  <Text style={styles.sheetOptSub}>We'll compress the gaps between stops</Text>
                </View>
                <Text style={styles.sheetOptArrow}>{'›'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.8} onPress={handleHighlightsOnly}>
                <View style={[styles.sheetOptIcon, { backgroundColor: '#EEF5F2' }]}>
                  <Text style={{ fontSize: 20 }}>{'⚡'}</Text>
                </View>
                <View style={styles.sheetOptBody}>
                  <Text style={styles.sheetOptTitle}>Highlights only — 45 min</Text>
                  <Text style={styles.sheetOptSub}>Shorten this stop to essentials only</Text>
                </View>
                <Text style={styles.sheetOptArrow}>{'›'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.sheetOption, styles.sheetOptionLast]} activeOpacity={0.8} onPress={handleSkipStop}>
                <View style={[styles.sheetOptIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={{ fontSize: 20 }}>{'⏭'}</Text>
                </View>
                <View style={styles.sheetOptBody}>
                  <Text style={[styles.sheetOptTitle, { color: '#DC2626' }]}>Skip this stop</Text>
                  <Text style={styles.sheetOptSub}>Move on to the next one</Text>
                </View>
                <Text style={styles.sheetOptArrow}>{'›'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Screen ─────────────────────────────────────────────────────────────────
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
  iconWrap:   { width: 44, height: 44, borderRadius: 12, backgroundColor: G.bg, alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  icon:       { fontSize: 22 },
  cardText:   { flex: 1 },
  cardTitle:  { fontFamily: F.bold, fontSize: 16, color: G.deep, marginBottom: 2 },
  cardSub:    { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 18 },
  chevron:    { fontFamily: F.bold, fontSize: 22, color: 'rgba(0,0,0,0.18)', marginLeft: 8 },

  // ── Running behind overlay ──────────────────────────────────────────────────
  overlay:    { backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20,
  },
  sheetDarkHeader: { backgroundColor: '#1A1F2E', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 22 },
  sheetBackWrap:   { marginBottom: 14 },
  sheetBackBtn:    { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  sheetTitle:      { fontFamily: F.bold, fontSize: 22, color: '#fff', marginBottom: 4 },
  sheetSubtitle:   { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  sheetOptions:    { paddingHorizontal: 0, paddingBottom: 12 },
  sheetOption:     {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sheetOptionLast: { borderBottomWidth: 0 },
  sheetOptIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  sheetOptBody:    { flex: 1 },
  sheetOptTitle:   { fontFamily: F.bold, fontSize: 15, color: G.deep, marginBottom: 2 },
  sheetOptSub:     { fontFamily: F.medium, fontSize: 12, color: G.muted, lineHeight: 17 },
  sheetOptArrow:   { fontFamily: F.bold, fontSize: 22, color: 'rgba(0,0,0,0.18)', marginLeft: 8 },
});
