import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/lib/authContext';
import { formatOpenStatus } from '@/lib/formatOpenStatus';
import { F } from '@/lib/tokens';

const C = {
  orange:    '#E8692A',
  orangeLt:  '#FDF0E9',
  bg:        '#F5F2EE',
  card:      '#FFFFFF',
  deep:      '#1A1F2E',
  muted:     '#8A8FA8',
  green:     '#3DAA6E',
  greenLt:   '#E8F7EF',
  border:    'rgba(26,31,46,0.09)',
  borderMed: 'rgba(26,31,46,0.16)',
} as const;

const STOP_HERO_BG: Record<string, string> = {
  park:     '#C8E6C9',
  museum:   '#BBDEFB',
  zoo:      '#FFE0B2',
  landmark: '#E1BEE7',
  shopping: '#FCE4EC',
  nature:   '#DCEDC8',
  culture:  '#FFF3E0',
  default:  '#E0E0E0',
};

const TICKET_TYPES = new Set([
  'museum', 'zoo', 'aquarium', 'palace', 'castle', 'theater', 'theatre',
  'observatory', 'observation_deck', 'theme_park', 'science_museum',
  'childrens_museum', 'art_museum', 'history_museum', 'planetarium',
  'water_park', 'amusement_park',
]);

const TAB_BAR_H = 49;
const _heroCache = new Map<string, string>();

type StopEnrichment = {
  whyNow?: string;
  parkingNotes?: string;
  bestTimeOfDay?: string;
  practicalTips?: string;
  bathroomNotes?: string;
};

type StopMetadata = {
  ticketSignal?: boolean;
  restroomConfidence?: string;
  sessionFit?: 'morning' | 'afternoon' | 'evening';
};

export type TripPlanStop = {
  id: string;
  name: string;
  stopType?: string | null;
  address?: string | null;
  durationMinutes?: number | null;
  tip?: string | null;
  description?: string | null;
  storyPack?: { story?: string } | null;
  enrichment?: StopEnrichment | null;
  metadata?: StopMetadata | null;
};

function stopHeroBg(stopType?: string | null): string {
  if (!stopType) return STOP_HERO_BG.default;
  const t = stopType.toLowerCase();
  const key = Object.keys(STOP_HERO_BG).find(k => k !== 'default' && t.includes(k));
  return key ? STOP_HERO_BG[key] : STOP_HERO_BG.default;
}

function needsTicket(stop: TripPlanStop): boolean {
  if (stop.metadata?.ticketSignal === true) return true;
  if (stop.metadata?.ticketSignal === false) return false;
  if (!stop.stopType) return false;
  const t = stop.stopType.toLowerCase();
  return Array.from(TICKET_TYPES).some(k => t.includes(k));
}

function getStopDuration(stop: TripPlanStop): number {
  if (stop.durationMinutes) return stop.durationMinutes;
  const t = stop.stopType?.toLowerCase() ?? '';
  if (t.includes('zoo') || t.includes('aquarium') || t.includes('beach')) return 120;
  if (t.includes('museum') || t.includes('palace') || t.includes('castle') || t.includes('adventure')) return 90;
  if (t.includes('park') || t.includes('garden') || t.includes('nature') || t.includes('restaurant')) return 60;
  if (t.includes('landmark') || t.includes('monument') || t.includes('temple')) return 45;
  return 60;
}

function waitTimeForType(stopType?: string | null): string {
  const t = stopType?.toLowerCase() ?? '';
  if (t.includes('zoo') || t.includes('aquarium') || t.includes('museum')) return '15\u201320 min weekends';
  if (t.includes('park') || t.includes('nature')) return 'No wait';
  return 'Varies';
}

function useStopHeroImage(stopId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() =>
    stopId ? (_heroCache.get(stopId) ?? null) : null
  );
  useEffect(() => {
    if (!stopId) return;
    const id = stopId;
    if (_heroCache.has(id)) { setUrl(_heroCache.get(id)!); return; }
    let cancelled = false;
    async function load() {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}/api/travel/stops/${id}/hero-image`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.url) { _heroCache.set(id, data.url); setUrl(data.url); }
        }
      } catch { /* silent — color bg stays */ }
    }
    load();
    return () => { cancelled = true; };
  }, [stopId]);
  return url;
}

function Grip() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
      <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
    </View>
  );
}

function isReal(v: string | null | undefined): v is string {
  return v != null && v !== '' && v !== '\u2014' && v !== '-';
}

export default function TripPlanStopSheet({
  stop,
  onClose,
  onReplace,
  onDelete,
}: {
  stop: TripPlanStop | null;
  onClose: () => void;
  onReplace: (s: TripPlanStop) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const heroImg = useStopHeroImage(stop?.id ?? null);

  useEffect(() => {
    Animated.timing(rotAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotAnim]);

  if (!stop) return null;

  const enrichment = stop.enrichment;
  const meta = stop.metadata;
  const heroBg = stopHeroBg(stop.stopType);
  const duration = getStopDuration(stop);
  const ticket = needsTicket(stop);

  const storyText = stop.storyPack?.story ?? enrichment?.whyNow ?? stop.tip ?? stop.description;

  let timingTitle = 'Good time to visit';
  if (meta?.sessionFit === 'morning')   timingTitle = 'Best in the morning';
  if (meta?.sessionFit === 'afternoon') timingTitle = 'Good this afternoon';
  if (meta?.sessionFit === 'evening')   timingTitle = 'Great for the evening';
  if (!meta?.sessionFit && enrichment?.bestTimeOfDay) {
    timingTitle = `Best: ${enrichment.bestTimeOfDay}`;
  }
  const timingSub = enrichment?.practicalTips
    ? enrichment.practicalTips.split('.')[0] + '.'
    : 'Great pick for families of all ages.';

  const practicalRows = [
    { label: 'Parking',   value: enrichment?.parkingNotes ?? null },
    { label: 'Restrooms', value: meta?.restroomConfidence ?? null },
    { label: 'Best time', value: enrichment?.bestTimeOfDay ?? null },
    { label: 'Wait time', value: waitTimeForType(stop.stopType) },
  ].filter((r): r is { label: string; value: string } => isReal(r.value));

  const arrowRotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  function openMaps() {
    const addr = stop?.address;
    if (!addr) return;
    const q = encodeURIComponent(addr);
    const url = Platform.OS === 'ios' ? `maps://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={{ flex: 1 }}>
      <Grip />

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName} numberOfLines={2}>{stop.name}</Text>
          <Text style={s.headerSub}>
            {stop.stopType?.replace(/_/g, ' ')} {'\u00b7'} {duration} Min
          </Text>
        </View>
        <Pressable style={s.closeBtn} onPress={onClose} hitSlop={8}>
          <Text style={s.closeX}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Hero image */}
        <View style={[s.hero, { backgroundColor: heroBg }]}>
          {heroImg ? (
            <ExpoImage
              source={{ uri: heroImg }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={300}
            />
          ) : null}
          <LinearGradient
            colors={['transparent', 'rgba(26,31,46,0.65)']}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={s.heroName}>{stop.name}</Text>
        </View>

        <View style={s.bodyPad}>
          {/* Timing insight banner */}
          <View style={s.timCard}>
            <Text style={s.timStar}>{'\u2605'}</Text>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.timMain}>{timingTitle}</Text>
              <Text style={s.timSub}>{timingSub}</Text>
            </View>
          </View>

          {/* What to expect */}
          <Text style={s.sectionLabel}>WHAT TO EXPECT</Text>
          <Text style={s.storyText}>
            {storyText != null && storyText !== ''
              ? storyText
              : 'We\u2019re still learning about this stop. Check back soon.'}
          </Text>

          {/* Ticket status */}
          {ticket ? (
            <View style={s.ticketRow}>
              <View style={s.ticketPill}>
                <Text style={s.ticketPillText}>Ticket</Text>
              </View>
              <Text style={s.ticketNote}>Book in advance recommended</Text>
            </View>
          ) : (
            <Text style={s.noTicket}>No ticket needed</Text>
          )}

          {/* Practical info accordion — hidden entirely when all rows are empty */}
          {practicalRows.length > 0 && (
            <>
              <Pressable style={s.expToggle} onPress={() => setExpanded(v => !v)}>
                <Text style={s.expToggleText}>Practical info</Text>
                <Animated.Text style={[s.expArrow, { transform: [{ rotate: arrowRotate }] }]}>
                  {'\u25be'}
                </Animated.Text>
              </Pressable>

              {expanded && (
                <View style={s.expContent}>
                  {practicalRows.map(row => (
                    <View key={row.label} style={s.expRow}>
                      <Text style={s.expRl}>{row.label}</Text>
                      <Text style={s.expRv}>{row.value}</Text>
                    </View>
                  ))}
                  {stop.address ? (
                    <Pressable style={s.mapsBtn} onPress={openMaps}>
                      <Text style={s.mapsBtnText}>Open in Maps</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer: Replace + placeholder + Remove */}
      <View style={[s.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 12 }]}>
        <Pressable
          style={s.replaceBtn}
          onPress={() => { onClose(); onReplace(stop); }}
        >
          <Text style={s.replaceBtnText}>Replace this stop</Text>
        </Pressable>

        {/* TODO: Move to different day */}

        <Pressable
          style={s.removeBtn}
          onPress={() => { onDelete(stop.id); onClose(); }}
        >
          <Text style={s.removeBtnText}>Remove this stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,31,46,0.09)',
  },
  headerName: {
    fontFamily: F.bold,
    fontSize: 18,
    color: '#1A1F2E',
    letterSpacing: -0.02,
    lineHeight: 24,
  },
  headerSub: {
    fontFamily: F.regular,
    fontSize: 12,
    color: '#8A8FA8',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 8,
  },
  closeX: { fontSize: 13, color: '#8A8FA8', lineHeight: 18 },
  hero: { height: 200, justifyContent: 'flex-end' },
  heroName: {
    fontFamily: F.bold,
    fontSize: 20,
    color: '#fff',
    padding: 14,
    paddingLeft: 18,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    letterSpacing: -0.02,
  },
  bodyPad: { padding: 18, paddingTop: 16 },
  timCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#3DAA6E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    backgroundColor: '#E8F7EF',
  },
  timStar: { fontSize: 14, color: '#3DAA6E', lineHeight: 18 },
  timMain: { fontFamily: F.bold, fontSize: 13, color: '#1A6B3A' },
  timSub:  { fontFamily: F.regular, fontSize: 12, color: '#2D7A50', marginTop: 2, lineHeight: 17 },
  sectionLabel: {
    fontFamily: F.bold,
    fontSize: 9,
    color: '#8A8FA8',
    letterSpacing: 0.09,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  storyText: {
    fontFamily: F.regular,
    fontSize: 13,
    color: '#1A1F2E',
    lineHeight: 20,
    marginBottom: 18,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  ticketPill: {
    backgroundColor: '#FDF0E9',
    borderWidth: 1,
    borderColor: '#E8692A',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  ticketPillText: { fontFamily: F.bold, fontSize: 11, color: '#E8692A' },
  ticketNote: { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8' },
  noTicket: { fontFamily: F.regular, fontSize: 13, color: '#8A8FA8', marginBottom: 16 },
  expToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,31,46,0.09)',
  },
  expToggleText: { fontFamily: F.semibold, fontSize: 13, color: '#1A1F2E' },
  expArrow: { fontFamily: F.regular, fontSize: 11, color: '#8A8FA8' },
  expContent: { marginBottom: 14 },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26,31,46,0.09)',
  },
  expRl: { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8' },
  expRv: { fontFamily: F.semibold, fontSize: 12, color: '#1A1F2E', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  mapsBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(26,31,46,0.16)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  mapsBtnText: { fontFamily: F.semibold, fontSize: 12, color: '#1A1F2E' },
  footer: {
    padding: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,31,46,0.09)',
    flexShrink: 0,
  },
  replaceBtn: {
    borderWidth: 1,
    borderColor: 'rgba(26,31,46,0.16)',
    borderRadius: 13,
    padding: 13,
    alignItems: 'center',
    marginBottom: 4,
  },
  replaceBtnText: { fontFamily: F.semibold, fontSize: 14, color: '#1A1F2E' },
  removeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  removeBtnText: { fontFamily: F.medium, fontSize: 15, color: '#E53E3E' },
});
