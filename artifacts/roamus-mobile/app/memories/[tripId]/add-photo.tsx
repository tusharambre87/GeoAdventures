import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { F } from '@/lib/tokens';

export default function AddPhotoScreen() {
  const { tripId, stopId, stopName, stopIcon } = useLocalSearchParams<{
    tripId: string;
    stopId: string;
    stopName: string;
    stopIcon: string;
  }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const launchCamera = async () => {
    setLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        router.push({
          pathname: `/memories/${tripId}/confirm-photo` as never,
          params: {
            uris:      JSON.stringify([result.assets[0].uri]),
            stopId:    stopId ?? '',
            stopName:  stopName ?? 'General trip photo',
            stopIcon:  stopIcon ?? '\uD83D\uDCF8',
            mode:      'camera',
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const launchLibrary = async () => {
    setLoading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 20,
      });
      if (!result.canceled && result.assets.length > 0) {
        router.push({
          pathname: `/memories/${tripId}/confirm-photo` as never,
          params: {
            uris:     JSON.stringify(result.assets.map((a) => a.uri)),
            stopId:   stopId ?? '',
            stopName: stopName ?? 'General trip photo',
            stopIcon: stopIcon ?? '\uD83D\uDCF8',
            mode:     'library',
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[sc.screen, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={sc.header}>
        <TouchableOpacity style={sc.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={sc.backIcon}>{'\u2190'}</Text>
        </TouchableOpacity>
        <View style={sc.stopPill}>
          <Text style={sc.stopPillIcon}>{stopIcon ?? '\uD83D\uDCF8'}</Text>
          <Text style={sc.stopPillName} numberOfLines={1}>{stopName ?? 'General trip photo'}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Central prompt ─────────────────────────────────────────── */}
      <View style={sc.prompt}>
        <Text style={sc.promptIcon}>{'\uD83D\uDCF8'}</Text>
        <Text style={sc.promptTitle}>{'How do you want\nto add photos?'}</Text>
        <Text style={sc.promptSub}>
          Take a new photo or pick from your library{'\u00a0—'} you can select multiple from library
        </Text>
      </View>

      {/* ── Action buttons ─────────────────────────────────────────── */}
      <View style={sc.actions}>
        <TouchableOpacity
          style={[sc.btn, sc.btnPrimary]}
          activeOpacity={0.85}
          onPress={launchCamera}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1A1F2E" />
          ) : (
            <View style={sc.btnInner}>
              <Text style={sc.btnIcon}>{'\uD83D\uDCF7'}</Text>
              <View>
                <Text style={[sc.btnLabel, { color: '#1A1F2E' }]}>Take a photo</Text>
                <Text style={[sc.btnSub, { color: 'rgba(26,31,46,0.5)' }]}>Opens native camera</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[sc.btn, sc.btnSecondary]}
          activeOpacity={0.85}
          onPress={launchLibrary}
          disabled={loading}
        >
          <View style={sc.btnInner}>
            <Text style={sc.btnIcon}>{'\uD83D\uDDBC\uFE0F'}</Text>
            <View>
              <Text style={[sc.btnLabel, { color: '#fff' }]}>Choose from library</Text>
              <Text style={[sc.btnSub, { color: 'rgba(255,255,255,0.45)' }]}>Select multiple photos at once</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#1A1F2E' },
  header:        {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    justifyContent: 'space-between',
  },
  backBtn:       {
    width: 36, height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  backIcon:      { fontSize: 18, color: '#fff' },
  stopPill:      {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 30, paddingHorizontal: 14, paddingVertical: 7,
    maxWidth: 220,
  },
  stopPillIcon:  { fontSize: 15 },
  stopPillName:  { fontSize: 12, fontFamily: F.bold, color: '#fff', flexShrink: 1 },
  prompt:        {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  promptIcon:    { fontSize: 52, marginBottom: 12 },
  promptTitle:   {
    fontFamily: F.serif, fontSize: 22, color: '#fff',
    lineHeight: 30, textAlign: 'center',
  },
  promptSub:     {
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    fontFamily: F.medium, lineHeight: 20,
    textAlign: 'center', marginTop: 12, maxWidth: 280,
  },
  actions:       { paddingHorizontal: 20, paddingBottom: 110, gap: 10 },
  btn:           { width: '100%', borderRadius: 16, padding: 18 },
  btnPrimary:    { backgroundColor: '#fff' },
  btnSecondary:  {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
  },
  btnInner:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnIcon:       { fontSize: 20 },
  btnLabel:      { fontFamily: F.bold, fontSize: 15 },
  btnSub:        { fontFamily: F.semibold, fontSize: 11, marginTop: 2 },
});
