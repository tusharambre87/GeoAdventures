import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '@/lib/tokens';

interface Props {
  stop: {
    name: string;
    stopType: string;
    description?: string;
    address?: string;
  };
  imageUrl?: string;
  imageLoading?: boolean;
  context: 'replace' | 'add' | 'swap';
  onClose: () => void;
  onConfirm: () => void;
}

const STOP_TYPE_EMOJI: Record<string, string> = {
  restaurant:        '\uD83C\uDF7D',
  food:              '\uD83C\uDF54',
  cafe:              '\u2615',
  lunch:             '\uD83E\uDD6A',
  dining:            '\uD83C\uDF7D',
  street_food:       '\uD83E\uDDB4',
  museum:            '\uD83C\uDFDB',
  aquarium:          '\uD83D\uDC20',
  park:              '\uD83C\uDF33',
  zoo:               '\uD83E\uDD81',
  landmark:          '\uD83D\uDDFD',
  science_center:    '\uD83D\uDD2D',
  theater:           '\uD83C\uDFAD',
  gallery:           '\uD83D\uDDBC',
  indoor_attraction: '\uD83C\uDFAB',
};

function stopEmoji(type: string | null | undefined): string {
  return STOP_TYPE_EMOJI[type ?? ''] ?? '\uD83D\uDCCD';
}

const TAB_BAR_H = 49;

export default function StopPreviewSheet({
  stop,
  imageUrl,
  imageLoading,
  context,
  onClose,
  onConfirm,
}: Props) {
  const { height: screenH } = useWindowDimensions();
  const safeInsets = useSafeAreaInsets();
  const sheetBottom = TAB_BAR_H + safeInsets.bottom;

  const btnLabel = context === 'add' ? 'Add to my day \u2192' : 'Swap this stop \u2192';

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 302 }]} pointerEvents="box-none">
      <Pressable
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        onPress={onClose}
      />
      <View style={[s.previewPanel, { maxHeight: screenH * 0.72, bottom: sheetBottom }]}>
        <View style={s.previewHandle} />
        <View style={s.previewHeader}>
          <Text style={s.previewName} numberOfLines={2}>{stop.name}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={s.previewCloseX}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={s.previewHero}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                {imageLoading
                  ? <ActivityIndicator color="#E8692A" />
                  : <Text style={s.previewHeroEmoji}>{stopEmoji(stop.stopType)}</Text>
                }
              </View>
            )}
          </View>
          <View style={s.previewBody}>
            <View style={s.previewPillRow}>
              {!!stop.stopType && (
                <View style={s.previewTypePill}>
                  <Text style={s.previewTypePillText}>
                    {(stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)).replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
            </View>
            {!!stop.description && (
              <View style={s.previewDescBox}>
                <Text style={s.previewDescLabel}>WHY KIDS LOVE IT</Text>
                <Text style={s.previewDescText}>{stop.description}</Text>
              </View>
            )}
            {!!stop.address && (
              <View style={s.previewAddrBox}>
                <Text style={s.previewAddrText}>{stop.address}</Text>
              </View>
            )}
          </View>
        </ScrollView>
        <TouchableOpacity style={s.previewSwapBtn} activeOpacity={0.85} onPress={onConfirm}>
          <Text style={s.previewSwapBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
        <View style={{ height: 12 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  previewPanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 24,
  },
  previewHandle: {
    width: 36, height: 4, backgroundColor: '#D0CCC6',
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 2,
  },
  previewHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 10,
  },
  previewName: {
    flex: 1, fontSize: 18, fontWeight: '800', color: '#1A1F2E',
    fontFamily: F.bold, lineHeight: 24,
  },
  previewCloseX: { fontSize: 16, color: '#B0ADA8', paddingTop: 3 },
  previewHero: {
    height: 160, backgroundColor: '#1A1F2E',
    marginHorizontal: 20, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    overflow: 'hidden',
  },
  previewHeroEmoji: { fontSize: 38 },
  previewBody: { paddingHorizontal: 20 },
  previewPillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  previewTypePill: {
    backgroundColor: '#F5F2EE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  previewTypePillText: { fontSize: 12, fontWeight: '600', color: '#1A1F2E', fontFamily: F.semibold },
  previewDescBox: {
    backgroundColor: '#F5F2EE', borderRadius: 12, padding: 14, marginBottom: 10,
  },
  previewDescLabel: {
    fontSize: 10, fontWeight: '700', color: '#8A8FA8',
    letterSpacing: 0.8, marginBottom: 5, fontFamily: F.bold,
  },
  previewDescText: { fontSize: 13, color: '#1A1F2E', fontFamily: F.regular, lineHeight: 19 },
  previewAddrBox: {
    backgroundColor: '#F5F2EE', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  previewAddrText: { fontSize: 12, color: '#8A8FA8', fontFamily: F.regular },
  previewSwapBtn: {
    marginHorizontal: 20, marginTop: 6,
    backgroundColor: '#E8692A', borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  previewSwapBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', fontFamily: F.bold },
});
