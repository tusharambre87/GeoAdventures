/**
 * Day Highlights screen
 * Shown after wrapping a day — curated photo grid, kid quote, day summary.
 * Entry point: "Day N Highlights" button on the day-complete card in today.tsx
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { memoriesAPI } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  bg:       '#1C1410',
  orange:   '#E8692A',
  card:     'rgba(255,255,255,0.07)',
  border:   'rgba(255,255,255,0.12)',
  text:     '#FFFFFF',
  muted:    'rgba(255,255,255,0.55)',
  green:    '#059669',
} as const;

export default function DayHighlightsScreen() {
  const { tripId, dayIndex: dayIndexParam } = useLocalSearchParams<{ tripId: string; dayIndex: string }>();
  const dayIndex = parseInt(dayIndexParam ?? '0', 10);
  const insets = useSafeAreaInsets();
  const [swapTarget, setSwapTarget] = useState<number | null>(null); // index into selectedPhotos
  const [localSelections, setLocalSelections] = useState<Record<number, { stopId: string; stopName: string; photoUrl: string; isHeroStop: boolean }>>({});

  const { data: highlights, isLoading, isError, refetch } = useQuery({
    queryKey: ['day-highlights', tripId, dayIndex],
    queryFn: () => memoriesAPI.getDayHighlights(tripId, dayIndex),
    enabled: !!tripId && !isNaN(dayIndex),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={C.orange} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 36, marginBottom: 16 }}>{'\uD83D\uDE14'}</Text>
        <Text style={{ fontFamily: F.bold, fontSize: 17, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
          Couldn't load highlights
        </Text>
        <Text style={{ fontFamily: F.regular, fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 24 }}>
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: C.orange, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}
          onPress={() => void refetch()}
        >
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff' }}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16, padding: 8 }} onPress={() => router.back()}>
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const h = highlights;
  const dayNum = dayIndex + 1;

  // Merge local slot swaps into selectedPhotos
  const displayPhotos = h?.selectedPhotos
    ? h.selectedPhotos.map((p, i) => localSelections[i] ?? p)
    : [];

  // Pad to 4 slots (null = empty placeholder)
  const slots: (typeof displayPhotos[0] | null)[] = [
    ...displayPhotos,
    ...Array(Math.max(0, 4 - displayPhotos.length)).fill(null),
  ];

  function handleSlotPress(idx: number) {
    if (!h?.allDayPhotos?.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSwapTarget(idx);
  }

  function handleSwapPick(photo: { stopId: string; stopName: string; photoUrl: string }) {
    if (swapTarget === null) return;
    const current = displayPhotos[swapTarget];
    setLocalSelections(prev => ({
      ...prev,
      [swapTarget]: {
        stopId: photo.stopId,
        stopName: photo.stopName,
        photoUrl: photo.photoUrl,
        isHeroStop: current?.isHeroStop ?? false,
      },
    }));
    setSwapTarget(null);
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Hero banner */}
        <LinearGradient
          colors={['#1D4A42', '#163830']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
        >
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={12}
          >
            <Text style={styles.backBtnText}>{'\u2190'} Back</Text>
          </Pressable>
          <Text style={styles.heroEmoji}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.heroLabel}>DAY {dayNum} HIGHLIGHTS</Text>
          {h?.stopsVisited != null && (
            <Text style={styles.heroMeta}>
              {h.stopsVisited} stop{h.stopsVisited !== 1 ? 's' : ''} explored
            </Text>
          )}
        </LinearGradient>

        {/* 2×2 Photo grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TODAY'S PHOTOS</Text>
          <Text style={styles.sectionHint}>Tap a photo to swap it</Text>
          <View style={styles.photoGrid}>
            {slots.map((slot, i) => (
              <Pressable
                key={i}
                style={[styles.photoSlot, slot?.isHeroStop && styles.photoSlotHero]}
                onPress={() => handleSlotPress(i)}
              >
                {slot ? (
                  <>
                    <ExpoImage
                      source={{ uri: slot.photoUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.55)']}
                      style={styles.photoOverlay}
                    />
                    {slot.isHeroStop && (
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>{'\u2B50'}</Text>
                      </View>
                    )}
                    <Text style={styles.photoLabel} numberOfLines={1}>{slot.stopName}</Text>
                    <View style={styles.swapHint}>
                      <Text style={styles.swapHintText}>{'\uD83D\uDD04'}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotPlus}>+</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Kid quote */}
        {h?.quote && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>KID QUOTE</Text>
            <View style={styles.quoteCard}>
              <Text style={styles.quoteMark}>{'\u201C'}</Text>
              <Text style={styles.quoteText}>{h.quote.text}</Text>
              {h.quote.stopName ? (
                <Text style={styles.quoteAttr}>at {h.quote.stopName}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Day summary */}
        {h?.summaryLines && h.summaryLines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>THE DAY IN THREE LINES</Text>
            <View style={styles.summaryCard}>
              {h.summaryLines.map((line, i) => (
                <View key={i} style={[styles.summaryRow, i < h.summaryLines.length - 1 && styles.summaryRowBorder]}>
                  <View style={[styles.summaryDot, { backgroundColor: i === 0 ? C.orange : C.muted }]} />
                  <Text style={styles.summaryText}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Done button */}
        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.back();
          }}
        >
          <Text style={styles.doneBtnText}>Done {'\u2713'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Swap picker modal */}
      <Modal
        visible={swapTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSwapTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSwapTarget(null)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalGrip} />
            <Text style={styles.modalTitle}>Choose a photo</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerRow}
            >
              {(h?.allDayPhotos ?? []).map((photo, i) => (
                <Pressable
                  key={i}
                  style={styles.pickerThumb}
                  onPress={() => handleSwapPick(photo)}
                >
                  <ExpoImage
                    source={{ uri: photo.photoUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.photoOverlay} />
                  <Text style={styles.pickerLabel} numberOfLines={1}>{photo.stopName}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setSwapTarget(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const GRID_GAP = 8;
const GRID_SIDE = '47.5%' as unknown as number;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  hero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  backBtn: {
    alignSelf: 'flex-start', marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  backBtnText: { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  heroEmoji: { fontSize: 40, marginBottom: 8 },
  heroLabel: { fontFamily: F.bold, fontSize: 24, color: C.text, letterSpacing: 0.5, marginBottom: 4 },
  heroMeta: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: {
    fontFamily: F.bold, fontSize: 10, letterSpacing: 1.2,
    color: C.muted, marginBottom: 4,
  },
  sectionHint: { fontFamily: F.regular, fontSize: 11, color: C.muted, marginBottom: 12 },

  // 2×2 grid
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  photoSlot: {
    width: GRID_SIDE, aspectRatio: 1, borderRadius: 16,
    overflow: 'hidden', backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.border,
  },
  photoSlotHero: { borderColor: C.orange },
  photoOverlay: { ...StyleSheet.absoluteFillObject },
  heroBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  heroBadgeText: { fontSize: 11 },
  photoLabel: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    fontFamily: F.bold, fontSize: 11, color: C.text,
  },
  swapHint: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  swapHintText: { fontSize: 11 },
  emptySlot: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  emptySlotPlus: { fontFamily: F.bold, fontSize: 28, color: C.muted },

  // Quote
  quoteCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderLeftWidth: 3, borderLeftColor: C.orange,
  },
  quoteMark: { fontFamily: F.bold, fontSize: 36, color: C.orange, lineHeight: 32, marginBottom: 4 },
  quoteText: { fontFamily: F.regular, fontSize: 15, color: C.text, fontStyle: 'italic', lineHeight: 22 },
  quoteAttr: { fontFamily: F.bold, fontSize: 11, color: C.muted, marginTop: 8 },

  // Summary
  summaryCard: {
    backgroundColor: C.card, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14,
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  summaryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  summaryText: {
    fontFamily: F.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)',
    lineHeight: 20, flex: 1,
  },

  // Done button
  doneBtn: {
    marginHorizontal: 16, marginTop: 28,
    backgroundColor: C.orange, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  doneBtnText: { fontFamily: F.bold, fontSize: 16, color: C.text },

  // Swap modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1C1F2E', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 16,
  },
  modalGrip: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontFamily: F.bold, fontSize: 17, color: C.text, marginBottom: 16, textAlign: 'center' },
  pickerRow: { gap: 10, paddingBottom: 4 },
  pickerThumb: {
    width: 110, height: 110, borderRadius: 14,
    overflow: 'hidden', backgroundColor: C.card,
  },
  pickerLabel: {
    position: 'absolute', bottom: 6, left: 6, right: 6,
    fontFamily: F.bold, fontSize: 10, color: C.text,
  },
  modalCancel: {
    marginTop: 12, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14,
  },
  modalCancelText: { fontFamily: F.bold, fontSize: 15, color: C.muted },
});
