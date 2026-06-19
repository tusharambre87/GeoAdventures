import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { F } from '@/lib/tokens';

interface Props {
  stop: {
    name: string;
    stopType: string | null;
    description?: string | null;
    address?: string | null;
    gpAddressVerified?: string | null;
    gpPriceLevel?: number | null;
    enrichment?: { bestTimeOfDay?: string } | Record<string, unknown> | null;
  };
  imageUrl?: string;
  imageLoading?: boolean;
  context: 'replace' | 'add' | 'swap';
  replacingName?: string;
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

function estimateDuration(stopType: string | null | undefined): number | null {
  const t = (stopType ?? '').toLowerCase().replace(/_/g, ' ');
  if (t.includes('zoo') || t.includes('aquarium') || t.includes('water park')) return 120;
  if (t.includes('museum') || t.includes('science') || t.includes('planetarium')) return 90;
  if (t.includes('park') || t.includes('garden') || t.includes('nature')) return 60;
  if (t.includes('landmark') || t.includes('gallery') || t.includes('monument')) return 45;
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe')) return 45;
  return null;
}

function openInMaps(address: string) {
  const q = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://maps.apple.com/?q=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
  Linking.openURL(url).catch(() => {});
}

function entryLabel(priceLevel: number | null | undefined): string | null {
  if (priceLevel === 0) return 'Free entry';
  if (priceLevel === 1) return '$';
  if (priceLevel === 2) return '$$';
  if (priceLevel === 3) return '$$$';
  if (priceLevel === 4) return '$$$$';
  return null;
}

function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function StopPreviewSheet({
  stop,
  imageUrl,
  imageLoading,
  context,
  replacingName,
  onClose,
  onConfirm,
}: Props) {
  const { height: screenH } = useWindowDimensions();

  const btnLabel = context === 'add' ? 'Add to my day \u2192' : 'Swap this stop \u2192';
  const typeLabel = stop.stopType
    ? (stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)).replace(/_/g, ' ')
    : null;
  const duration = estimateDuration(stop.stopType);
  const isVerified = !!stop.gpAddressVerified;
  const entryText = entryLabel(stop.gpPriceLevel) ?? 'Check website';
  const enrichmentObj = stop.enrichment as { bestTimeOfDay?: string } | null | undefined;
  const bestTime = capitalize(enrichmentObj?.bestTimeOfDay) || 'Anytime';

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 302 }]}>
      <Pressable
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
        onPress={onClose}
      />
      <View style={[s.previewPanel, { maxHeight: screenH * 0.88 }]}>
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
            {/* Type + Duration pills */}
            <View style={s.previewPillRow}>
              {!!typeLabel && (
                <View style={s.previewTypePill}>
                  <Text style={s.previewTypePillText}>{typeLabel}</Text>
                </View>
              )}
              {duration != null && (
                <View style={s.previewDurPill}>
                  <Text style={s.previewDurPillText}>{'\u23F1 '}{duration}{' min'}</Text>
                </View>
              )}
            </View>
            {/* Address */}
            {!!stop.address && (
              <View style={s.previewAddrBox}>
                {!isVerified && (
                  <Text style={s.previewAddrWarn}>{'\u26A0 Estimated \u2014 please verify'}</Text>
                )}
                <Text style={s.previewAddrText}>{stop.address}</Text>
                {!isVerified && (
                  <TouchableOpacity onPress={() => openInMaps(stop.address ?? '')}>
                    <Text style={s.previewAddrMapLink}>{'Open in Maps to verify'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {/* WHY KIDS LOVE IT */}
            {!!stop.description && (
              <View style={s.previewDescBox}>
                <Text style={s.previewDescLabel}>{'\u2605 WHY KIDS LOVE IT'}</Text>
                <Text style={s.previewDescText}>{stop.description}</Text>
              </View>
            )}
            {/* ENTRY + BEST TIME grid — always rendered */}
            <View style={s.previewMetaGrid}>
              <View style={s.previewMetaCell}>
                <Text style={s.previewMetaLabel}>{'ENTRY'}</Text>
                <Text style={[s.previewMetaValue, entryText === 'Free entry' ? { color: '#3DAA6E' } : {}]}>
                  {entryText}
                </Text>
              </View>
              <View style={s.previewMetaCell}>
                <Text style={s.previewMetaLabel}>{'BEST TIME'}</Text>
                <Text style={s.previewMetaValue}>{bestTime}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
        {!!replacingName && (
          <Text style={s.previewReplacingText}>{'Replacing ' + replacingName}</Text>
        )}
        <TouchableOpacity style={s.previewSwapBtn} activeOpacity={0.85} onPress={onConfirm}>
          <Text style={s.previewSwapBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
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
    borderColor: '#E8692A', borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  previewTypePillText: { fontSize: 12, fontWeight: '600', color: '#E8692A', fontFamily: F.semibold },
  previewDurPill: {
    backgroundColor: '#F5F2EE', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  previewDurPillText: { fontSize: 12, color: '#1A1F2E', fontFamily: F.regular },
  previewAddrBox: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: 'rgba(26,31,46,0.09)',
  },
  previewAddrWarn: {
    fontSize: 11, color: '#E8692A', fontFamily: F.semibold, marginBottom: 4,
  },
  previewAddrText: { fontSize: 13, color: '#1A1F2E', fontFamily: F.regular, lineHeight: 19 },
  previewAddrMapLink: {
    fontSize: 13, color: '#E8692A', fontFamily: F.semibold, marginTop: 6,
  },
  previewDescBox: {
    backgroundColor: '#F5F2EE', borderRadius: 12, padding: 14, marginBottom: 10,
  },
  previewDescLabel: {
    fontSize: 11, fontWeight: '700', color: '#1A1F2E',
    letterSpacing: 0.8, marginBottom: 5, fontFamily: F.bold,
  },
  previewDescText: { fontSize: 13, color: '#1A1F2E', fontFamily: F.regular, lineHeight: 19 },
  previewMetaGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  previewMetaCell: { flex: 1, backgroundColor: '#F5F2EE', borderRadius: 12, padding: 12 },
  previewMetaLabel: { fontSize: 10, color: '#8A8FA8', fontFamily: F.regular, marginBottom: 4 },
  previewMetaValue: { fontSize: 13, color: '#1A1F2E', fontFamily: F.semibold },
  previewReplacingText: {
    textAlign: 'center', fontSize: 12, color: '#8A8FA8',
    fontFamily: F.regular, paddingBottom: 8, paddingTop: 4,
  },
  previewSwapBtn: {
    marginHorizontal: 20, marginTop: 2,
    backgroundColor: '#E8692A', borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  previewSwapBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', fontFamily: F.bold },
});
