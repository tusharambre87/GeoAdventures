import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { memoriesAPI } from '@/lib/apiClient';
import { F } from '@/lib/tokens';
import { useAuth, API_BASE } from '@/lib/authContext';
import NetInfo from '@react-native-community/netinfo';
import { queuePhoto } from '@/lib/photoQueue';

const { width: SW } = Dimensions.get('window');
const THUMB_SIZE = (SW - 32 - 8) / 2;

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  border:   'rgba(26,31,46,0.08)',
} as const;

export default function ConfirmPhotoScreen() {
  const { tripId, uris: urisParam, stopId, stopName, stopIcon, mode } = useLocalSearchParams<{
    tripId: string;
    uris: string;
    stopId: string;
    stopName: string;
    stopIcon: string;
    mode: string;
  }>();
  const insets = useSafeAreaInsets();

  const uris: string[] = JSON.parse((urisParam as string) ?? '[]');
  const isMulti = uris.length > 1;

  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const [captions, setCaptions] = useState<string[]>(() => uris.map(() => ''));
  const [saving, setSaving] = useState(false);
  const [saved, setSavedCount] = useState(0);
  const [done, setDone] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const updateCaption = (index: number, text: string) => {
    setCaptions((prev) => {
      const next = [...prev];
      next[index] = text;
      return next;
    });
  };

  const uploadPhoto = async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    const res = await fetch(`${API_BASE}/api/travel/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const { photoUrl } = await res.json();
    return photoUrl as string;
  };

  const savePhotos = async () => {
    if (!tripId || uris.length === 0) return;
    setSaving(true);
    setSavedCount(0);
    setFailedCount(0);
    let savedN = 0;
    let failedN = 0;
    try {
      const net = await NetInfo.fetch();
      const isOffline = !(net.isConnected ?? true);
      const isPaid = user?.subscriptionTier !== 'free';

      if (isOffline && isPaid) {
        await Promise.all(
          uris.map((uri, i) =>
            queuePhoto({
              localUri: uri,
              stopId: (stopId as string) || '',
              tripId: tripId as string,
              caption: captions[i] || '',
            })
          )
        );
        savedN = uris.length;
      } else {
        for (let i = 0; i < uris.length; i++) {
          try {
            const photoUrl = await uploadPhoto(uris[i]);
            await memoriesAPI.createMoment({
              tripId,
              stopId: (stopId as string) || null,
              photoUrls: [photoUrl],
              parentPromptResponse: captions[i] || null,
            });
            savedN++;
            setSavedCount(savedN);
          } catch {
            failedN++;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['moments', tripId] });
      setSavedCount(savedN);
      setFailedCount(failedN);
      setDone(true);
    } catch (err: any) {
      console.error('Save photos failed:', err);
      const msg = err?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Could not save photos', msg);
    } finally {
      setSaving(false);
    }
  };

  const decodedStopName = stopName ? decodeURIComponent(stopName as string) : 'this stop';

  // ── Success screen ───────────────────────────────────────────────────────
  if (done) {
    const allGood = failedCount === 0;
    return (
      <View style={[cf.screen, cf.successScreen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <Text style={cf.successEmoji}>{allGood ? '\uD83C\uDF04' : '\u26A0\uFE0F'}</Text>
        <Text style={cf.successTitle}>
          {allGood
            ? 'Memories saved!'
            : `${saved} of ${uris.length} saved`}
        </Text>
        <Text style={cf.successSub}>
          {allGood
            ? `Successfully uploaded your memories of ${decodedStopName}`
            : `${failedCount} photo${failedCount !== 1 ? 's' : ''} could not upload — try again later`}
        </Text>
        <TouchableOpacity
          style={[cf.saveBtn, { marginTop: 32, paddingHorizontal: 32 }]}
          onPress={() => router.dismissAll()}
          activeOpacity={0.85}
        >
          <Text style={cf.saveBtnText}>{'Done \u2192'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const TaggedRow = ({ compact }: { compact?: boolean }) => (
    <TouchableOpacity
      style={[cf.taggedRow, compact && cf.taggedRowCompact]}
      activeOpacity={0.8}
      onPress={() => router.back()}
    >
      <Text style={cf.taggedIcon}>{stopIcon ?? '\uD83D\uDCF8'}</Text>
      <Text style={cf.taggedName} numberOfLines={1}>{stopName ?? 'General trip photo'}</Text>
      <Text style={cf.taggedChange}>Change {'\u2192'}</Text>
    </TouchableOpacity>
  );

  // ── Uploading overlay (shown on top of either layout) ────────────────────
  const UploadingOverlay = () => (
    <View style={cf.overlay} pointerEvents="box-none">
      <View style={cf.overlayCard}>
        <ActivityIndicator color={C.orange} size="large" style={{ marginBottom: 14 }} />
        <Text style={cf.overlayTitle}>Adding your memories…</Text>
        {isMulti && (
          <Text style={cf.overlaySub}>{saved} of {uris.length} photos uploaded</Text>
        )}
        <Text style={cf.overlaySub} numberOfLines={1}>{decodedStopName}</Text>
      </View>
    </View>
  );

  // ── Single photo layout ──────────────────────────────────────────────────
  if (!isMulti) {
    return (
      <KeyboardAvoidingView
        style={[cf.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Nav */}
        <View style={cf.nav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={cf.navBack}>{'\u2190'} Retake</Text>
          </TouchableOpacity>
          <Text style={cf.navTitle}>Save photo</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Photo preview */}
        <View style={cf.preview}>
          {uris[0] ? (
            <ExpoImage source={{ uri: uris[0] }} style={{ flex: 1 }} contentFit="contain" />
          ) : (
            <View style={cf.previewPlaceholder}>
              <Text style={{ fontSize: 48, opacity: 0.4 }}>{'\uD83D\uDDBC\uFE0F'}</Text>
            </View>
          )}
        </View>

        {/* Confirm card */}
        <View style={cf.card}>
          <Text style={cf.sectionLabel}>TAGGED TO</Text>
          <TaggedRow />
          <TextInput
            style={cf.captionInput}
            placeholder={'"That was amazing!" \u2014 what did the kids say?'}
            placeholderTextColor="#D1D5E0"
            value={captions[0]}
            onChangeText={(t) => updateCaption(0, t)}
            multiline
          />
          <TouchableOpacity
            style={[cf.saveBtn, { marginBottom: insets.bottom + 16 }]}
            activeOpacity={0.85}
            onPress={savePhotos}
            disabled={saving}
          >
            <Text style={cf.saveBtnText}>Save to memories {'\u2192'}</Text>
          </TouchableOpacity>
        </View>

        {saving && <UploadingOverlay />}
      </KeyboardAvoidingView>
    );
  }

  // ── Multi-photo layout ───────────────────────────────────────────────────
  return (
    <View style={[cf.screen, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={cf.nav}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={cf.navBack}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={cf.navTitle}>Save photos</Text>
        <View style={cf.countPill}>
          <Text style={cf.countPillText}>{uris.length} selected</Text>
        </View>
      </View>

      {/* Photo grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={cf.grid}
        showsVerticalScrollIndicator={false}
      >
        {uris.map((uri, i) => (
          <View key={uri + i} style={cf.photoCard}>
            <ExpoImage
              source={{ uri }}
              style={{ height: 120, width: '100%' }}
              contentFit="cover"
            />
            <TextInput
              style={cf.gridCaption}
              placeholder="Add caption..."
              placeholderTextColor="#D1D5E0"
              value={captions[i]}
              onChangeText={(t) => updateCaption(i, t)}
              multiline
            />
          </View>
        ))}
      </ScrollView>

      {/* Sticky footer */}
      <View style={[cf.footer, { paddingBottom: insets.bottom + 8 }]}>
        <TaggedRow compact />
        <TouchableOpacity
          style={cf.saveBtnOrange}
          activeOpacity={0.85}
          onPress={savePhotos}
          disabled={saving}
        >
          <Text style={cf.saveBtnText}>
            Save {uris.length} photo{uris.length !== 1 ? 's' : ''} to memories {'\u2192'}
          </Text>
        </TouchableOpacity>
      </View>

      {saving && <UploadingOverlay />}
    </View>
  );
}

const cf = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  nav:         {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border,
  },
  navBack:     { fontSize: 13, fontFamily: F.bold, color: C.muted },
  navTitle:    { fontSize: 16, fontFamily: F.bold, color: C.deep },
  countPill:   { backgroundColor: C.orangeLt, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
  countPillText: { fontSize: 12, fontFamily: F.bold, color: C.orange },
  preview:     { flex: 1, backgroundColor: C.deep },
  previewPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:        { backgroundColor: '#fff', borderRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20 },
  sectionLabel:{ fontSize: 11, fontFamily: F.bold, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  taggedRow:   {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.orangeLt, borderRadius: 12, padding: 11, marginBottom: 12,
  },
  taggedRowCompact: { marginBottom: 10 },
  taggedIcon:  { fontSize: 18 },
  taggedName:  { fontFamily: F.bold, fontSize: 14, color: C.orange, flex: 1 },
  taggedChange:{ fontFamily: F.bold, fontSize: 12, color: C.orange, opacity: 0.65 },
  captionInput:{
    width: '100%',
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, padding: 12,
    fontSize: 14, fontFamily: F.regular, color: C.deep,
    backgroundColor: C.bg, height: 60, marginBottom: 14,
    textAlignVertical: 'top',
  },
  saveBtn:     {
    backgroundColor: C.deep, borderRadius: 16, padding: 17,
    alignItems: 'center',
  },
  saveBtnOrange: {
    backgroundColor: C.orange, borderRadius: 16, padding: 16,
    alignItems: 'center',
    shadowColor: C.orange, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  saveBtnText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingBottom: 40 },
  photoCard:   {
    width: THUMB_SIZE, backgroundColor: '#fff',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  gridCaption: {
    borderTopWidth: 1, borderTopColor: C.border,
    padding: 10, fontSize: 12, fontFamily: F.regular,
    color: C.deep, height: 50, textAlignVertical: 'top',
  },
  footer:      { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border, padding: 12 },

  // ── Uploading overlay ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,31,46,0.55)',
    zIndex: 100,
  },
  overlayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: SW - 64,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  overlayTitle: {
    fontSize: 17, fontFamily: F.bold, color: C.deep,
    marginBottom: 6, textAlign: 'center',
  },
  overlaySub: {
    fontSize: 13, fontFamily: F.regular, color: C.muted,
    marginTop: 4, textAlign: 'center',
  },

  // ── Success screen ──
  successScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: {
    fontSize: 26, fontFamily: F.bold, color: C.deep,
    textAlign: 'center', marginBottom: 10,
  },
  successSub: {
    fontSize: 15, fontFamily: F.regular, color: C.muted,
    textAlign: 'center', lineHeight: 22,
  },
});
