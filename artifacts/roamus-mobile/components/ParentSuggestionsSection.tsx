import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParentSuggestion = {
  name: string;
  type?: string;
  stopType?: string;
  minAge?: number;
  durationMinutes?: number;
  latitude?: string | number;
  longitude?: string | number;
  address?: string;
  selectionReason?: string;
  recommendedPosition?: number;
  recommendedPositionReason?: string;
  lateDayFitScore?: number;
  placeReferenceData?: {
    priceRange?: string;
    bookingRequired?: boolean;
    openingHours?: string;
  };
  placeProfileData?: {
    strollerFriendly?: boolean;
    lateDayFitScore?: number;
  };
};

export type PmalStop = {
  id: string;
  name: string;
  displayOrder?: number | null;
  dayIndex?: number | null;
  durationMinutes?: number | null;
  stopType?: string | null;
  cityGroup?: string | null;
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  orange:    '#E8692A',
  orangeLt:  '#FDF0E9',
  bg:        '#F5F2EE',
  card:      '#FFFFFF',
  deep:      '#1A1F2E',
  muted:     '#8A8FA8',
  green:     '#3DAA6E',
  greenLt:   '#E8F7EF',
  greenBdr:  '#C8EDD9',
  greenNote: '#EBF7F1',
  greenBrd2: '#DCF0E8',
  greenTxt:  '#2d7a4f',
  bdr:       '#F0EDE8',
  bdrMed:    'rgba(26,31,46,0.09)',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStopDurationMins(stop: { stopType?: string | null; durationMinutes?: number | null }): number {
  if (stop.durationMinutes) return stop.durationMinutes;
  const t = (stop.stopType ?? '').toLowerCase();
  if (t.includes('zoo') || t.includes('aquarium') || t.includes('beach')) return 120;
  if (t.includes('museum') || t.includes('palace') || t.includes('castle')) return 90;
  if (t.includes('park') || t.includes('garden') || t.includes('nature')) return 60;
  return 60;
}

function getSuggestionDurationMins(s: ParentSuggestion): number {
  return s.durationMinutes ?? 60;
}

function formatMinsAsTime(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h < 12 ? 'am' : 'pm';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const paddedM = m.toString().padStart(2, '0');
  return `~${displayH}:${paddedM}${period}`;
}

function computeSlotTimes(dayStops: PmalStop[]): number[] {
  const START = 9 * 60;
  const TRAVEL = 15;
  const times: number[] = [START];
  let cur = START;
  for (const stop of dayStops) {
    cur += getStopDurationMins(stop) + TRAVEL;
    times.push(cur);
  }
  return times;
}

function suggestionNeedsTicket(s: ParentSuggestion): boolean {
  const TICKET_TYPES = ['museum', 'zoo', 'aquarium', 'palace', 'castle', 'theater', 'theatre',
    'observatory', 'theme_park', 'science_museum', 'art_museum', 'history_museum', 'planetarium', 'water_park'];
  const t = (s.stopType ?? s.type ?? '').toLowerCase();
  return TICKET_TYPES.some(k => t.includes(k)) || s.placeReferenceData?.bookingRequired === true;
}

function suggestionIsFree(s: ParentSuggestion): boolean {
  const pr = s.placeReferenceData?.priceRange ?? '';
  return pr === '$' || pr.toLowerCase() === 'free';
}

// ─── Suggestion Card ──────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion: s,
  dayNumber,
  onAddRequest,
}: {
  suggestion: ParentSuggestion;
  dayNumber: number;
  onAddRequest: (s: ParentSuggestion) => void;
}) {
  const minAge = s.minAge ?? 0;
  const dur = getSuggestionDurationMins(s);
  const durLabel = dur >= 60
    ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}`
    : `${dur} min`;
  const ticket = suggestionNeedsTicket(s);
  const free = suggestionIsFree(s);

  return (
    <View style={sc.wrap}>
      <LinearGradient
        colors={['#2a3a5c', '#1A1F2E']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={sc.hero}
      >
        <Text style={sc.heroName} numberOfLines={2}>{s.name}</Text>
        {minAge > 0 && (
          <View style={sc.ageBadge}>
            <Text style={sc.ageBadgeText}>{'Ages '}{String(minAge)}{'+'}</Text>
          </View>
        )}
      </LinearGradient>

      <View style={sc.body}>
        <View style={sc.tags}>
          <View style={sc.tagTime}>
            <Text style={sc.tagTimeText}>{durLabel}</Text>
          </View>
          {ticket && (
            <View style={sc.tagTicket}>
              <Text style={sc.tagTicketText}>{'Ticket'}</Text>
            </View>
          )}
          {free && (
            <View style={sc.tagFree}>
              <Text style={sc.tagFreeText}>{'Free'}</Text>
            </View>
          )}
        </View>

        {!!s.selectionReason && (
          <Text style={sc.why} numberOfLines={2}>{s.selectionReason}</Text>
        )}

        {!!s.recommendedPositionReason && (
          <View style={sc.recPill}>
            <View style={sc.recDot} />
            <Text style={sc.recText} numberOfLines={1}>{s.recommendedPositionReason}</Text>
          </View>
        )}

        <Pressable style={sc.addBtn} onPress={() => onAddRequest(s)}>
          <Text style={sc.addBtnText}>{`+ Add to Day ${dayNumber}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  wrap:         { width: 195, backgroundColor: C.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: C.bdr, flexShrink: 0 },
  hero:         { height: 76, justifyContent: 'flex-end', padding: 8 },
  heroName:     { fontFamily: F.bold, fontSize: 12, color: '#fff', lineHeight: 15, paddingRight: 40 },
  ageBadge:     { position: 'absolute', top: 7, right: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  ageBadgeText: { fontFamily: F.bold, fontSize: 9, color: '#fff' },
  body:         { padding: 8, gap: 5 },
  tags:         { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  tagTime:      { borderWidth: 1, borderColor: '#C8C5BF', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  tagTimeText:  { fontFamily: F.semibold, fontSize: 9, color: C.deep },
  tagTicket:    { borderWidth: 1, borderColor: C.orange, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  tagTicketText:{ fontFamily: F.semibold, fontSize: 9, color: C.orange },
  tagFree:      { borderWidth: 1, borderColor: C.green, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  tagFreeText:  { fontFamily: F.semibold, fontSize: 9, color: C.green },
  why:          { fontFamily: F.regular, fontSize: 10, color: C.muted, lineHeight: 14 },
  recPill:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.orangeLt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  recDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.orange, flexShrink: 0 },
  recText:      { fontFamily: F.bold, fontSize: 10, color: C.orange, flex: 1 },
  addBtn:       { borderWidth: 1.5, borderColor: C.orange, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  addBtnText:   { fontFamily: F.bold, fontSize: 11, color: C.orange },
});

// ─── Parent Suggestions Section (default export) ──────────────────────────────

type Props = {
  suggestions: ParentSuggestion[];
  dayStops: PmalStop[];
  dayIndex: number;
  tripId: string;
  youngestChildName: string;
  youngestChildAge: number;
  onStopAdded: () => void;
  onAddRequest?: (suggestion: ParentSuggestion, onAdded: () => void) => void;
  areaLandmarks?: any[];
  areaLoading?: boolean;
  areaLoaded?: boolean;
  onExpand?: () => void;
  onAddLandmark?: (placeId: string, name: string, type: string) => void;
};

export default function ParentSuggestionsSection({
  suggestions: initial,
  dayIndex,
  youngestChildName,
  youngestChildAge,
  onStopAdded,
  onAddRequest,
  areaLandmarks = [],
  areaLoading = false,
  areaLoaded = false,
  onExpand,
  onAddLandmark,
}: Props) {
  const [expanded, setExpanded]   = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const expandAnim = useRef(new Animated.Value(0)).current;

  const visible = initial.filter(s => !dismissed.has(s.name));
  if (visible.length === 0) return null;

  const toggle = () => {
    const next = !expanded;
    Animated.spring(expandAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 9,
    }).start();
    setExpanded(next);
    if (next) onExpand?.();
  };

  const maxH = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 760] });

  const handleAddRequest = (s: ParentSuggestion) => {
    if (onAddRequest) {
      onAddRequest(s, () => {
        setDismissed(prev => new Set([...prev, s.name]));
        onStopAdded();
      });
    }
  };

  return (
    <View style={ps.wrap}>
      <Pressable style={[ps.header, expanded && ps.headerOpen]} onPress={toggle}>
        <View style={ps.headerLeft}>
          <View style={ps.iconBox}>
            <Text style={ps.iconEmoji}>{'\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.title}>{'Parents might also like'}</Text>
            <Text style={ps.sub}>
              {expanded
                ? `${visible.length} stop${visible.length !== 1 ? 's' : ''} near today\u2019s route`
                : `We optimised today for ${youngestChildName} (${String(youngestChildAge)})`}
            </Text>
          </View>
        </View>
        <Text style={ps.chevron}>{expanded ? '\u2228' : '\u203A'}</Text>
      </Pressable>

      <Animated.View style={{ maxHeight: maxH, overflow: 'hidden' }}>
        <View style={ps.whyNote}>
          <Text style={{ fontSize: 13 }}>{'\uD83E\uDDD2'}</Text>
          <Text style={ps.whyText}>
            {'Today is optimised for '}
            {youngestChildName}
            {' (age '}
            {String(youngestChildAge)}
            {'). These stops suit older kids \u2014 add any that interest you.'}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ps.scrollContent}
          style={ps.scrollView}
        >
          {visible.map((s, i) => (
            <SuggestionCard
              key={s.name + i}
              suggestion={s}
              dayNumber={dayIndex + 1}
              onAddRequest={handleAddRequest}
            />
          ))}
        </ScrollView>

        {/* Also in this area */}
        <View style={{ marginTop: 16, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(26,31,46,0.07)' }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#8A8FA8', letterSpacing: 0.8, textTransform: 'uppercase' }}>{'Also in this area'}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(26,31,46,0.07)' }} />
          </View>

          {areaLoading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <ActivityIndicator size="small" color="#E8692A" />
              <Text style={{ fontSize: 12, color: '#8A8FA8' }}>{'Finding nearby landmarks...'}</Text>
            </View>
          )}

          {!areaLoading && areaLandmarks.map(place => (
            <View key={place.placeId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.06)' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF4F1', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ fontSize: 18 }}>{place.type === 'museum' ? '\uD83C\uDFDB\uFE0F' : place.type === 'park' ? '\uD83C\uDF3F' : '\uD83D\uDCCD'}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1F2E' }} numberOfLines={1}>{place.name}</Text>
                <Text style={{ fontSize: 11, color: '#8A8FA8', marginTop: 1 }}>{place.vicinity}</Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: '#1A1F2E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                onPress={() => onAddLandmark?.(place.placeId, place.name, place.type)}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{'+ Add'}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {!areaLoading && areaLoaded && areaLandmarks.length === 0 && (
            <Text style={{ fontSize: 12, color: '#8A8FA8', textAlign: 'center', paddingVertical: 8 }}>{'No additional landmarks found nearby.'}</Text>
          )}
        </View>

      </Animated.View>
    </View>
  );
}

const ps = StyleSheet.create({
  wrap:        { borderRadius: 14, borderWidth: 1.5, borderColor: C.greenBdr, overflow: 'hidden', marginBottom: 4 },
  header:      { backgroundColor: C.greenLt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingHorizontal: 14 },
  headerOpen:  { borderBottomWidth: 1, borderBottomColor: C.greenBdr },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBox:     { width: 34, height: 34, backgroundColor: C.card, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji:   { fontSize: 16 },
  title:       { fontFamily: F.bold, fontSize: 13, color: C.deep },
  sub:         { fontFamily: F.semibold, fontSize: 11, color: C.green, marginTop: 2 },
  chevron:     { fontFamily: F.bold, fontSize: 14, color: C.green, marginLeft: 8 },
  whyNote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, paddingHorizontal: 14, backgroundColor: C.greenNote, borderBottomWidth: 1, borderBottomColor: C.greenBrd2 },
  whyText:     { fontFamily: F.medium, fontSize: 11, color: C.greenTxt, lineHeight: 16, flex: 1 },
  scrollView:  { backgroundColor: C.bg },
  scrollContent:{ paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', gap: 10 },
});

// ─── Position Picker Sheet (named export) ─────────────────────────────────────

type PickerProps = {
  suggestion: ParentSuggestion;
  dayStops: PmalStop[];
  dayIndex: number;
  tripId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function PmalPositionPickerSheet({
  suggestion,
  dayStops,
  dayIndex,
  tripId,
  onSuccess,
  onClose,
}: PickerProps) {
  const insets = useSafeAreaInsets();
  const sorted = [...dayStops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const dayNum = dayIndex + 1;
  const recPos = suggestion.recommendedPosition ?? 0;

  const [selectedSlot, setSelectedSlot] = useState<number>(Math.min(recPos, sorted.length));
  const [adding, setAdding] = useState(false);
  const translateY = useRef(new Animated.Value(800)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 28,
      stiffness: 300,
    }).start();
  }, []);

  const slotTimes = computeSlotTimes(sorted);

  const slots = [
    {
      label: 'First stop of the day',
      sub: sorted.length > 0
        ? `Before ${sorted[0].name} \u00B7 ${formatMinsAsTime(slotTimes[0])} start`
        : `${formatMinsAsTime(slotTimes[0])} start`,
    },
    ...sorted.map((stop, i) => ({
      label: `After ${stop.name}`,
      sub: `${formatMinsAsTime(slotTimes[i + 1])}${sorted[i + 1] ? ` \u00B7 then ${sorted[i + 1].name}` : ' \u00B7 last stop'}`,
    })),
  ];

  const lateScore = suggestion.lateDayFitScore ?? (suggestion.placeProfileData?.lateDayFitScore ?? null);
  const showLateWarn = lateScore != null && lateScore < 30 && selectedSlot === slots.length - 1 && slots.length > 2;

  async function handleConfirm() {
    if (adding) return;
    setAdding(true);
    try {
      let insertAtOrder: number;
      if (sorted.length === 0) {
        insertAtOrder = 0;
      } else if (selectedSlot === 0) {
        insertAtOrder = sorted[0].displayOrder ?? 0;
      } else {
        const afterStop = sorted[selectedSlot - 1];
        insertAtOrder = (afterStop.displayOrder ?? 0) + 1;
      }

      await apiFetch(`/api/travel/trips/${tripId}/stops`, {
        method: 'POST',
        body: JSON.stringify({
          name: suggestion.name,
          stopType: suggestion.stopType ?? suggestion.type ?? 'landmark',
          latitude: suggestion.latitude != null ? String(suggestion.latitude) : undefined,
          longitude: suggestion.longitude != null ? String(suggestion.longitude) : undefined,
          address: suggestion.address,
          durationMinutes: suggestion.durationMinutes,
          dayIndex,
          insertAtOrder,
          addedByParent: true,
          ...(sorted[0]?.cityGroup ? { cityGroup: sorted[0].cityGroup } : {}),
        }),
      });

      onSuccess();
    } catch (err: any) {
      Alert.alert('Could not add stop', err?.message ?? 'Please try again.');
      setAdding(false);
    }
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,18,30,0.48)' }]}
        onPress={onClose}
      />
      <Animated.View
        style={[pp.sheet, { transform: [{ translateY }], paddingBottom: Math.max(insets.bottom + 16, 24) }]}
      >
        <View style={pp.handle} />

        <Text style={pp.title}>
          {'Where should '}
          <Text style={{ color: C.orange }}>{suggestion.name}</Text>
          {' go?'}
        </Text>
        <Text style={pp.subtitle}>{'Choose a position in Day '}{String(dayNum)}</Text>

        <View style={pp.preview}>
          <View style={pp.previewDot} />
          <View style={{ flex: 1 }}>
            <Text style={pp.previewName}>{suggestion.name}</Text>
            <Text style={pp.previewMeta} numberOfLines={2}>
              {String(getSuggestionDurationMins(suggestion))}{' min'}
              {suggestionNeedsTicket(suggestion) ? ' \u00B7 Ticket required' : ''}
              {!!suggestion.recommendedPositionReason ? ` \u00B7 ${suggestion.recommendedPositionReason}` : ''}
            </Text>
          </View>
        </View>

        <ScrollView style={pp.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {slots.map((slot, i) => {
            const isRec = i === recPos;
            const isSel = i === selectedSlot;
            const highlight = isRec || isSel;
            return (
              <View key={i}>
                <Pressable
                  style={[pp.row, highlight && pp.rowHighlight]}
                  onPress={() => setSelectedSlot(i)}
                >
                  <View style={[pp.numBox, highlight && pp.numBoxHL]}>
                    <Text style={[pp.numText, highlight && pp.numTextHL]}>{String(i + 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pp.rowLabel}>{slot.label}</Text>
                    <Text style={pp.rowSub}>{slot.sub}</Text>
                    {i === slots.length - 1 && showLateWarn && isSel && (
                      <Text style={pp.rowWarn}>{'\u26A0\uFE0F'}{' Late in the day \u2014 may feel rushed'}</Text>
                    )}
                  </View>
                  {isRec ? (
                    <View style={pp.recBadge}>
                      <Text style={pp.recBadgeTxt}>{'REC'}</Text>
                    </View>
                  ) : isSel ? (
                    <View style={pp.selDot} />
                  ) : null}
                </Pressable>
                {i < slots.length - 1 && (
                  <View style={pp.slotDiv} />
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={pp.ctaWrap}>
          <Pressable
            style={[pp.cta, adding && pp.ctaDisabled]}
            onPress={handleConfirm}
            disabled={adding}
          >
            {adding
              ? <ActivityIndicator color="#fff" />
              : <Text style={pp.ctaTxt}>{'Add '}{suggestion.name}{' to Day '}{String(dayNum)}</Text>}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const pp = StyleSheet.create({
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '88%', backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handle:     { width: 40, height: 4, backgroundColor: '#C8C5BF', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 14 },
  title:      { fontFamily: F.bold, fontSize: 17, color: C.deep, paddingHorizontal: 20, paddingBottom: 4, letterSpacing: -0.3 },
  subtitle:   { fontFamily: F.regular, fontSize: 12, color: C.muted, paddingHorizontal: 20, paddingBottom: 14 },
  preview:    { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.card, borderRadius: 12, padding: 12, paddingLeft: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: C.bdr },
  previewDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.orange, flexShrink: 0, marginTop: 3 },
  previewName:{ fontFamily: F.bold, fontSize: 14, color: C.deep },
  previewMeta:{ fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 16 },
  list:       { paddingHorizontal: 16, flex: 1 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 12, padding: 13, borderWidth: 1.5, borderColor: C.bdr },
  rowHighlight:{ borderColor: C.orange, backgroundColor: '#FFFAF7' },
  numBox:     { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F0EDE8', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  numBoxHL:   { backgroundColor: C.orangeLt },
  numText:    { fontFamily: F.bold, fontSize: 12, color: C.muted },
  numTextHL:  { color: C.orange },
  rowLabel:   { fontFamily: F.bold, fontSize: 13, color: C.deep },
  rowSub:     { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 2 },
  rowWarn:    { fontFamily: F.semibold, fontSize: 11, color: '#D97706', marginTop: 4 },
  recBadge:   { backgroundColor: C.orange, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  recBadgeTxt:{ fontFamily: F.bold, fontSize: 9, color: '#fff', letterSpacing: 0.5 },
  selDot:     { width: 16, height: 16, borderRadius: 8, backgroundColor: C.orange, flexShrink: 0 },
  slotDiv:    { height: 4 },
  ctaWrap:    { paddingHorizontal: 16, paddingTop: 10 },
  cta:        { backgroundColor: C.orange, borderRadius: 14, padding: 15, alignItems: 'center' },
  ctaDisabled:{ opacity: 0.6 },
  ctaTxt:     { fontFamily: F.bold, fontSize: 15, color: '#fff', letterSpacing: -0.2 },
});
