import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Animated, Linking, Alert, Platform,
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
    destination?: string;
  }>();

  const stopName = params.stopName ? decodeURIComponent(params.stopName) : 'This Stop';
  const address  = params.address  ? decodeURIComponent(params.address)  : '';
  const stopId   = params.stopId   ?? '';
  const tripId     = params.tripId      ?? '';
  const destination = params.destination ? decodeURIComponent(params.destination) : stopName;

  // ── Running behind sub-sheet animation ────────────────────────────────────
  const [showRunning, setShowRunning] = useState(false);
  const [showRescue, setShowRescue]   = useState(false);
  const [rescueTitle, setRescueTitle] = useState('');
  const [rescueLoading, setRescueLoading] = useState(false);
  const [rescueResults, setRescueResults] = useState<Array<{ name: string; distance?: string; description?: string }>>([]);
  const rescueOverlayAnim = useRef(new Animated.Value(0)).current;
  const rescueSheetAnim   = useRef(new Animated.Value(400)).current;
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

  function openRescue(title: string) {
    setRescueTitle(title);
    setRescueResults([]);
    setShowRescue(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(rescueOverlayAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 180 }),
      Animated.spring(rescueSheetAnim,   { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 180 }),
    ]).start();
  }

  function closeRescue() {
    Animated.parallel([
      Animated.spring(rescueOverlayAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 180 }),
      Animated.spring(rescueSheetAnim,   { toValue: 400, useNativeDriver: true, damping: 22, stiffness: 180 }),
    ]).start(() => setShowRescue(false));
  }

  async function handleRescueExtras(type: 'break' | 'kids') {
    openRescue(type === 'break' ? 'Break spots nearby' : 'Fun options nearby');
    setRescueLoading(true);
    try {
      const data = await apiFetch<{ places?: Array<{ name: string; distance?: string; description?: string }> }>(
        '/api/travel/stops/rescue-extras',
        { method: 'POST', body: JSON.stringify({ type, destination, stopName }) }
      );
      setRescueResults(data.places ?? []);
    } catch { setRescueResults([]); }
    finally { setRescueLoading(false); }
  }

  async function handleFoodNearby() {
    openRescue('Food nearby');
    setRescueLoading(true);
    try {
      const data = await apiFetch<{ food?: Array<{ name: string; distance?: string; description?: string }> }>(
        `/api/travel/stops/${stopId}/nearby`
      );
      setRescueResults(data.food ?? []);
    } catch { setRescueResults([]); }
    finally { setRescueLoading(false); }
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

  // ── Cards ─────────────────────────────────────────────────────────────────
  const items = [
    {
      icon: '\u23E9',
      title: 'Running behind',
      sub: 'Shorten this stop or shift the timeline',
      onPress: openRunning,
    },
    {
      icon: '\uD83D\uDE25',
      title: 'Kids are tired',
      sub: 'Find a break spot or easier next stop',
      onPress: () => handleRescueExtras('break'),
    },
    {
      icon: '\uD83C\uDF89',
      title: 'Need more fun',
      sub: 'Swap for something more exciting nearby',
      onPress: () => handleRescueExtras('kids'),
    },
    {
      icon: '\uD83C\uDF55',
      title: 'Find food nearby',
      sub: 'Family-friendly restaurants near your stop',
      onPress: () => handleFoodNearby(),
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
                  <Text style={{ fontSize: 20 }}>{'\u26A1'}</Text>
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

      {/* ── Rescue Results sheet (Kids tired / Need fun / Food nearby) ── */}
      {showRescue && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.overlay, { opacity: rescueOverlayAnim }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeRescue} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: rescueSheetAnim }] }]}>
            <View style={styles.sheetDarkHeader}>
              <TouchableOpacity onPress={closeRescue} style={styles.sheetBackWrap}>
                <Text style={styles.sheetBackBtn}>{'←'} Back</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{rescueTitle}</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {rescueLoading ? (
                <ActivityIndicator size="large" color="#E8692A" style={{ marginTop: 32 }} />
              ) : rescueResults.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#8A8FA8', marginTop: 32, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14 }}>No results found nearby</Text>
              ) : (
                rescueResults.map((place, i) => (
                  <View key={i} style={{ backgroundColor: '#F9F6F2', borderRadius: 14, padding: 14 }}>
                    <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#1A1F2E', marginBottom: 3 }}>{place.name}</Text>
                    {place.distance ? <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: '#E8692A', marginBottom: 2 }}>{place.distance}</Text> : null}
                    {place.description ? <Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: '#6B7280', lineHeight: 18 }}>{place.description}</Text> : null}
                  </View>
                ))
              )}
            </ScrollView>
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
