/**
 * Day Highlights screen
 * — 2×2 swappable photo grid (swap from day photos or upload from library)
 * — Captures the collage with react-native-view-shot
 * — Shares natively (Instagram, Facebook, Messages…) via expo-sharing
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { memoriesAPI } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  bg:       '#1C1410',
  orange:   '#E8692A',
  card:     'rgba(255,255,255,0.07)',
  border:   'rgba(255,255,255,0.12)',
  text:     '#FFFFFF',
  muted:    'rgba(255,255,255,0.55)',
} as const;

type SlotPhoto = {
  stopId: string;
  stopName: string;
  photoUrl: string;
  isHeroStop: boolean;
};

export default function DayHighlightsScreen() {
  const { tripId, dayIndex: dayIndexParam } = useLocalSearchParams<{ tripId: string; dayIndex: string }>();
  const dayIndex = parseInt(dayIndexParam ?? '0', 10);
  const insets = useSafeAreaInsets();

  // Which slot is open in the swap picker (null = closed)
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  // Local overrides for each of the 4 slots
  const [localSelections, setLocalSelections] = useState<Record<number, SlotPhoto>>({});
  // Sharing in progress
  const [isSharing, setIsSharing] = useState(false);
  // 'idle' | 'prefetching' | 'capturing'
  const [shareStatus, setShareStatus] = useState<'idle' | 'prefetching' | 'capturing'>('idle');
  // Ref to the clean collage view for view-shot capture
  const collageRef = useRef<View>(null);

  const { data: highlights, isLoading, isError, refetch } = useQuery({
    queryKey: ['day-highlights', tripId, dayIndex],
    queryFn: () => memoriesAPI.getDayHighlights(tripId, dayIndex),
    enabled: !!tripId && !isNaN(dayIndex),
    staleTime: 0,
  });

  // ── Loading / error states ──────────────────────────────────────────────

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
        <Text style={{ fontFamily: F.regular, fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24 }}>
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: C.orange, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}
          onPress={() => void refetch()}
        >
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff' }}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16, padding: 8 }} onPress={() => router.back()}>
          <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.muted }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Data helpers ────────────────────────────────────────────────────────

  const h = highlights;
  const dayNum = dayIndex + 1;

  // Build the 4-slot grid, falling back to allDayPhotos for any slot the server
  // left empty (e.g. stops with no backfilled image yet).
  const serverPhotos = h?.selectedPhotos ?? [];
  const allPhotos   = h?.allDayPhotos   ?? [];
  // Track URLs used by server-selected photos so fallback doesn't duplicate
  const usedPhotoUrls = new Set<string>(serverPhotos.map(p => p.photoUrl));
  const displayPhotos: (SlotPhoto | null)[] = Array.from({ length: 4 }, (_, i) => {
    if (localSelections[i]) return localSelections[i];
    if (serverPhotos[i])    return serverPhotos[i];
    // Fill from allDayPhotos — skip anything already shown in a server slot
    const fallback = allPhotos.find(p => !usedPhotoUrls.has(p.photoUrl));
    if (fallback) { usedPhotoUrls.add(fallback.photoUrl); return { ...fallback, isHeroStop: false }; }
    return null;
  });

  const filledCount = displayPhotos.filter(Boolean).length;

  // ── Handlers ────────────────────────────────────────────────────────────

  function openSwapPicker(idx: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSwapTarget(idx);
  }

  function pickFromDay(photo: { stopId: string; stopName: string; photoUrl: string }) {
    if (swapTarget === null) return;
    const cur = displayPhotos[swapTarget];
    setLocalSelections(prev => ({
      ...prev,
      [swapTarget]: { ...photo, isHeroStop: cur?.isHeroStop ?? false },
    }));
    setSwapTarget(null);
  }

  async function pickFromLibrary() {
    if (swapTarget === null) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload your own photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const uri = result.assets[0].uri;
    const cur = displayPhotos[swapTarget];
    setLocalSelections(prev => ({
      ...prev,
      [swapTarget!]: {
        stopId: 'custom',
        stopName: 'My photo',
        photoUrl: uri,
        isHeroStop: cur?.isHeroStop ?? false,
      },
    }));
    setSwapTarget(null);
  }

  async function handleShareCollage() {
    if (filledCount === 0) {
      Alert.alert('No photos yet', 'Add at least one photo to the collage before sharing.');
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing not available', 'Native sharing is not available on this device.');
      return;
    }

    setIsSharing(true);
    setShareStatus('prefetching');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Pre-fetch all remote photo URLs so the hidden collage has them in
      // cache before captureRef takes its snapshot. Local file:// URIs
      // (camera roll picks) are already on-device and don't need prefetching.
      const remoteUrls = displayPhotos
        .filter((slot): slot is SlotPhoto => slot !== null && /^https?:\/\//.test(slot.photoUrl))
        .map(slot => slot.photoUrl);

      if (remoteUrls.length > 0) {
        const PREFETCH_TIMEOUT_MS = 5000;
        const timeout = new Promise<void>(resolve => setTimeout(resolve, PREFETCH_TIMEOUT_MS));
        const prefetchAll = Promise.all(
          remoteUrls.map(url => ExpoImage.prefetch(url).catch(() => null)),
        );
        await Promise.race([prefetchAll, timeout]);
      }

      setShareStatus('capturing');

      const uri = await captureRef(collageRef, {
        format: 'jpg',
        quality: 0.92,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Day ${dayNum} Highlights`,
        UTI: 'public.jpeg', // iOS
      });
    } catch (err) {
      console.error('[highlights] share failed', err);
      Alert.alert('Could not share', 'Something went wrong capturing the collage. Try again.');
    } finally {
      setIsSharing(false);
      setShareStatus('idle');
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

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
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
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

        {/* ── 2×2 Photo grid (interactive — shows swap hints) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR COLLAGE</Text>
          <Text style={styles.sectionHint}>Tap any slot to swap from today's photos or your library</Text>

          {/* This interactive grid is what the user sees and taps */}
          <View style={styles.photoGrid}>
            {displayPhotos.map((slot, i) => (
              <Pressable
                key={i}
                style={[styles.photoSlot, slot?.isHeroStop && styles.photoSlotHero]}
                onPress={() => openSwapPicker(i)}
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
                    <Text style={styles.emptySlotIcon}>{'\uD83D\uDDBC'}</Text>
                    <Text style={styles.emptySlotText}>Add photo</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

        </View>

        {/* ── Share Collage button ── */}
        <View style={styles.shareSection}>
          <TouchableOpacity
            style={[styles.shareBtn, isSharing && styles.shareBtnDisabled]}
            activeOpacity={0.85}
            disabled={isSharing}
            onPress={handleShareCollage}
          >
            {isSharing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.shareBtnText}>
                  {shareStatus === 'prefetching' ? 'Loading photos…' : 'Preparing collage…'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>{'\uD83D\uDCF2'}</Text>
                <Text style={styles.shareBtnText}>Share Collage</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.shareHint}>
            Opens your share sheet — Instagram, Facebook, Messages and more
          </Text>
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
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.back(); }}
        >
          <Text style={styles.doneBtnText}>Done {'\u2713'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Hidden clean collage — lives OUTSIDE ScrollView so its 800px width
           cannot corrupt the interactive grid's percentage-based layout.
           Positioned off-screen so it never appears to the user. ── */}
      <View
        ref={collageRef}
        collapsable={false}
        style={styles.hiddenCollage}
        pointerEvents="none"
      >
        <View style={styles.collageGrid}>
          {displayPhotos.map((slot, i) => (
            <View key={i} style={styles.collageCell}>
              {slot ? (
                <ExpoImage
                  source={{ uri: slot.photoUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#163830', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 32 }}>{'\uD83C\uDF89'}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <View style={styles.collageFooter}>
          <Text style={styles.collageFooterDay} numberOfLines={1}>
            {`Day ${dayNum}${h?.city ? ` in ${h.city}` : ''}`}
          </Text>
          <Text style={styles.collageFooterBrand}>RoamUs</Text>
        </View>
      </View>

      {/* ── Swap picker modal ── */}
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
              {/* Upload from library — always first */}
              <Pressable style={[styles.pickerThumb, styles.pickerUploadBtn]} onPress={pickFromLibrary}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>{'\uD83D\uDDBC'}</Text>
                <Text style={styles.pickerUploadText}>My{'\n'}library</Text>
              </Pressable>

              {/* Photos from the day */}
              {(h?.allDayPhotos ?? []).map((photo, i) => (
                <Pressable
                  key={i}
                  style={styles.pickerThumb}
                  onPress={() => pickFromDay(photo)}
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

              {/* If no day photos at all */}
              {(h?.allDayPhotos ?? []).length === 0 && (
                <View style={[styles.pickerThumb, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.muted, textAlign: 'center', padding: 8 }}>
                    No photos from today yet
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setSwapTarget(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

// The hidden collage is 800×900 — 800×800 photo grid + 100px branded footer
const COLLAGE_SIZE = 800;
const FOOTER_HEIGHT = 100;
const COLLAGE_CELL = COLLAGE_SIZE / 2 - 2; // 2px half-gap

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
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

  // Section
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1.2, color: C.muted, marginBottom: 4 },
  sectionHint: { fontFamily: F.regular, fontSize: 11, color: C.muted, marginBottom: 12 },

  // Interactive 2×2 grid
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot: {
    width: '47.5%' as unknown as number,
    aspectRatio: 1, borderRadius: 16,
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
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  emptySlotIcon: { fontSize: 22, opacity: 0.4 },
  emptySlotText: { fontFamily: F.medium, fontSize: 11, color: C.muted },

  // Hidden collage — off-screen, used only by view-shot
  hiddenCollage: {
    position: 'absolute',
    top: -COLLAGE_SIZE * 2, // way off-screen
    left: 0,
    width: COLLAGE_SIZE,
    height: COLLAGE_SIZE + FOOTER_HEIGHT,
    flexDirection: 'column',
    backgroundColor: '#1C1410',
  },
  collageGrid: {
    width: COLLAGE_SIZE,
    height: COLLAGE_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  collageCell: {
    width: COLLAGE_CELL,
    height: COLLAGE_CELL,
    overflow: 'hidden',
    borderRadius: 0,
  },
  // Branded footer for the shared collage
  collageFooter: {
    width: COLLAGE_SIZE,
    height: FOOTER_HEIGHT,
    backgroundColor: '#1C1410',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  collageFooterDay: {
    fontFamily: F.bold,
    fontSize: 24,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.2,
    flexShrink: 1,
    marginRight: 12,
  },
  collageFooterBrand: {
    fontFamily: F.bold,
    fontSize: 28,
    color: '#E8692A',
    letterSpacing: 1.5,
    flexShrink: 0,
  },

  // Share section
  shareSection: { paddingHorizontal: 16, marginTop: 20 },
  shareBtn: {
    backgroundColor: C.orange, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.orange, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  shareBtnDisabled: { opacity: 0.6 },
  shareBtnText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  shareHint: {
    fontFamily: F.regular, fontSize: 12, color: C.muted,
    textAlign: 'center', marginTop: 8,
  },

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
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  summaryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  summaryText: { fontFamily: F.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20, flex: 1 },

  // Done
  doneBtn: {
    marginHorizontal: 16, marginTop: 20,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
  },
  doneBtnText: { fontFamily: F.bold, fontSize: 15, color: C.muted },

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
  pickerUploadBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.orange, borderStyle: 'dashed',
    gap: 2,
  },
  pickerUploadText: { fontFamily: F.bold, fontSize: 11, color: C.orange, textAlign: 'center' },
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
