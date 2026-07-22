/**
 * Step 3 — Stop review screen
 *
 * Two modes, shared selected-name state:
 *
 *   LIST mode  — flat list with swipe-gesture actions (left=Remove, right=Add),
 *                inline Add/Remove buttons, and a per-row "Preview" link.
 *
 *   SWIPE mode — card-stack (one card at a time, active decision on every item).
 *                Color header (type-based), category tag, name, description when
 *                present, duration, X/Heart buttons, progress bar.
 *                Preview pill on the active card only → same StopPreviewSheet.
 *
 * StopPreviewSheet — shared between both modes. Wikipedia hero image (gradient
 *   fallback), type/duration pills, address + Maps link, description ("WHY
 *   FAMILIES LOVE IT") when present, Add/Remove footer action.
 *
 * Spec invariants:
 *   - "Selected" tag — shown wherever selected === true, no confidence language.
 *   - "Anchor" badge — only where familyAnchorType === 'anchor', real data.
 *   - NO day labels anywhere on this screen.
 *   - Submit sends full pool-entry objects, not bare IDs.
 *   - "Let us pick for you" = submit algorithm defaults with zero edits.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  ActivityIndicator,
  Easing,
  FlatList,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { API_BASE, useAuth } from '@/lib/authContext';
import { F, G } from '@/lib/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 110;

// Saturated card-header backgrounds keyed on stop-type substrings.
// Deliberately darker than the pastel STOP_HERO_BG map so white text reads
// at WCAG AA contrast on the 140px card header.
const CARD_HEADER_BG: Record<string, string> = {
  museum:    '#1565C0',
  aquarium:  '#0277BD',
  zoo:       '#558B2F',
  park:      '#2E7D32',
  nature:    '#1B5E20',
  landmark:  '#6A1B9A',
  shopping:  '#880E4F',
  bridge:    '#37474F',
  beach:     '#01579B',
  restaurant:'#BF360C',
  food:      '#BF360C',
  cafe:      '#795548',
  culture:   '#E65100',
  theater:   '#4A148C',
  castle:    '#4E342E',
  palace:    '#4E342E',
  default:   '#C0560A',
};

function cardHeaderBg(type: string | null | undefined): string {
  const t = (type ?? '').toLowerCase();
  const key = Object.keys(CARD_HEADER_BG).find(k => k !== 'default' && t.includes(k));
  return key ? CARD_HEADER_BG[key] : CARD_HEADER_BG.default;
}

function previewGradient(type: string | null | undefined): [string, string] {
  const t = (type ?? '').toLowerCase();
  if (t.includes('park') || t.includes('garden') || t.includes('nature')) return ['#2D6A4F', '#7A9E8E'];
  if (t.includes('museum') || t.includes('gallery'))    return ['#1B3A5C', '#6B4FA8'];
  if (t.includes('aquarium') || t.includes('zoo'))      return ['#0277BD', '#2D6A4F'];
  if (t.includes('beach') || t.includes('lake'))        return ['#01579B', '#3DAA6E'];
  if (t.includes('bridge') || t.includes('viewpoint'))  return ['#37474F', '#546E7A'];
  if (t.includes('landmark') || t.includes('culture'))  return ['#4A148C', '#7B1FA2'];
  if (t.includes('restaurant') || t.includes('food') || t.includes('cafe')) return ['#BF360C', '#E8692A'];
  return ['#C0560A', '#E8692A'];
}

function typeLabel(type: string | null | undefined): string {
  if (!type) return 'Stop';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PoolEntry = {
  name:              string | null;
  type:              string | null;
  familyAnchorType:  string | null;
  scoreClassicFinal: number | null;
  durationMinutes:   number | null;
  minAge:            number | null;
  latitude:          number | null;
  longitude:         number | null;
  address:           string | null;
  description:       string | null;   // stop_library.description — 99.7% coverage
  selected:          boolean;
  dayIndex:          number | null;
  displayOrder:      number | null;
};

type ApplyResult = {
  success:    boolean;
  placed:     number;
  buckets:    Array<{
    dayNumber:   number;
    stopCount:   number;
    targetCount: number;
    closedShort: boolean;
    stops:       Array<{ name: string; familyAnchorType: string | null }>;
  }>;
  unplacedStops: Array<{
    name:              string;
    familyAnchorType:  string | null;
    scoreClassicFinal: number | null;
  }>;
};

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function AnchorBadge({ small }: { small?: boolean }) {
  return (
    <View style={[at.badge, small && at.badgeSm]}>
      <Text style={[at.badgeTxt, small && at.badgeTxtSm]}>Anchor</Text>
    </View>
  );
}

function SelectedTag({ small }: { small?: boolean }) {
  return (
    <View style={[at.selTag, small && at.selTagSm]}>
      <Text style={[at.selTxt, small && at.selTxtSm]}>Selected</Text>
    </View>
  );
}

// ─── Stop preview sheet (shared between list and swipe modes) ─────────────────

type PreviewSheetProps = {
  entry:      PoolEntry;
  isSelected: boolean;
  onClose:    () => void;
  onToggle:   (name: string) => void;
  insets:     { bottom: number; top: number };
};

function StopPreviewSheet({ entry, isSelected, onClose, onToggle, insets }: PreviewSheetProps) {
  const [heroUri, setHeroUri] = useState<string | null>(null);
  const grad = previewGradient(entry.type);
  const dur = entry.durationMinutes != null
    ? entry.durationMinutes < 60
      ? `${entry.durationMinutes} min`
      : `${Math.floor(entry.durationMinutes / 60)}\u2013${Math.floor(entry.durationMinutes / 60) + 1} hr`
    : null;
  const mapsUrl = entry.name
    ? `https://maps.apple.com/?q=${encodeURIComponent(entry.name)}`
    : null;

  useEffect(() => {
    if (!entry.name) return;
    let cancelled = false;
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(entry.name)}&prop=pageimages&format=json&pithumbsize=600&origin=*`
    )
      .then(r => r.json())
      .then(d => {
        const pages = (d?.query?.pages ?? {}) as Record<string, any>;
        const page = Object.values(pages)[0] as any;
        if (!cancelled && page?.thumbnail?.source) setHeroUri(page.thumbnail.source as string);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [entry.name]);

  return (
    <View style={ps.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[ps.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={ps.handle} />

        {/* Header row */}
        <View style={ps.hdrRow}>
          <Text style={ps.hdrName} numberOfLines={2}>{entry.name ?? ''}</Text>
          <Pressable style={ps.closeBtn} onPress={onClose} hitSlop={10}>
            <Text style={ps.closeTxt}>{'\u2715'}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={ps.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={ps.hero}>
            {heroUri ? (
              <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: grad[0] }]} />
            )}
            <View style={[ps.heroOverlay, { backgroundColor: `${grad[0]}55` }]} />
          </View>

          {/* Pills */}
          <View style={ps.pillRow}>
            <View style={ps.typePill}>
              <Text style={ps.typePillTxt}>{typeLabel(entry.type)}</Text>
            </View>
            {dur != null && (
              <View style={ps.durPill}>
                <Text style={ps.durPillTxt}>{dur}</Text>
              </View>
            )}
            {entry.familyAnchorType === 'anchor' && (
              <View style={ps.anchorPill}>
                <Text style={ps.anchorPillTxt}>Anchor stop</Text>
              </View>
            )}
            {entry.minAge != null && entry.minAge > 0 && (
              <View style={ps.durPill}>
                <Text style={ps.durPillTxt}>Ages {entry.minAge}+</Text>
              </View>
            )}
          </View>

          {/* Description — WHY FAMILIES LOVE IT */}
          {entry.description != null && entry.description.length > 0 && (
            <View style={ps.card}>
              <Text style={ps.cardLabel}>WHY FAMILIES LOVE IT</Text>
              <Text style={ps.cardBody}>{entry.description}</Text>
            </View>
          )}

          {/* Address */}
          <View style={ps.card}>
            <Text style={ps.cardLabel}>LOCATION</Text>
            {entry.address != null && entry.address.length > 0 ? (
              <Text style={ps.cardBody}>{entry.address}</Text>
            ) : (
              <Text style={[ps.cardBody, { color: G.muted, fontStyle: 'italic' }]}>
                Address not confirmed
              </Text>
            )}
            {mapsUrl != null && (
              <Pressable
                style={ps.mapsLink}
                onPress={() => Linking.openURL(mapsUrl).catch(() => {})}
              >
                <Text style={ps.mapsLinkTxt}>Open in Maps</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Footer action */}
        <View style={ps.footer}>
          <Pressable
            style={[ps.footerBtn, isSelected && ps.footerBtnRemove]}
            onPress={() => {
              onToggle(entry.name ?? '');
              onClose();
            }}
          >
            <Text style={[ps.footerBtnTxt, isSelected && ps.footerBtnTxtRemove]}>
              {isSelected ? 'Remove from trip' : 'Add to trip'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── List mode ────────────────────────────────────────────────────────────────

function SwipeRemove({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={lt.swipeRemove} onPress={onPress}>
      <Text style={lt.swipeTxt}>Remove</Text>
    </Pressable>
  );
}

function SwipeAdd({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={lt.swipeAdd} onPress={onPress}>
      <Text style={lt.swipeTxt}>Add</Text>
    </Pressable>
  );
}

type RowProps = {
  item:       PoolEntry;
  isSelected: boolean;
  onToggle:   (name: string) => void;
  onPreview:  (entry: PoolEntry) => void;
};

function StopRow({ item, isSelected, onToggle, onPreview }: RowProps) {
  const swipeRef = useRef<Swipeable>(null);
  const name = item.name ?? '';

  const doToggle = useCallback(() => {
    onToggle(name);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [name, onToggle]);

  const closeAndToggle = useCallback(() => {
    swipeRef.current?.close();
    setTimeout(doToggle, 80);
  }, [doToggle]);

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      renderRightActions={isSelected  ? () => <SwipeRemove onPress={closeAndToggle} /> : undefined}
      renderLeftActions={!isSelected  ? () => <SwipeAdd    onPress={closeAndToggle} /> : undefined}
    >
      <View style={[lt.row, isSelected && lt.rowSel]}>
        <View style={lt.content}>
          <Text style={lt.name} numberOfLines={2}>{name}</Text>
          <View style={lt.metaRow}>
            {item.familyAnchorType === 'anchor' && <AnchorBadge />}
            {isSelected && <SelectedTag />}
            {item.durationMinutes != null && (
              <View style={lt.chip}>
                <Text style={lt.chipTxt}>{item.durationMinutes} min</Text>
              </View>
            )}
            <Pressable onPress={() => onPreview(item)} hitSlop={8}>
              <Text style={lt.previewLink}>Preview</Text>
            </Pressable>
          </View>
        </View>
        <Pressable
          style={[lt.btn, isSelected ? lt.btnRemove : lt.btnAdd]}
          onPress={doToggle}
          hitSlop={10}
        >
          <Text style={[lt.btnTxt, isSelected ? lt.btnTxtRemove : lt.btnTxtAdd]}>
            {isSelected ? 'Remove' : 'Add'}
          </Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}

// ─── Swipe card mode ──────────────────────────────────────────────────────────

type CardContentProps = {
  item:        PoolEntry;
  isSelected:  boolean;
  showPreview: boolean;
  onPreview:   () => void;
};

function SwipeCardContent({ item, isSelected, showPreview, onPreview }: CardContentProps) {
  const hdrBg = cardHeaderBg(item.type);
  const label = typeLabel(item.type);

  return (
    <View style={sw.cardInner}>
      {/* Color header */}
      <View style={[sw.cardHeader, { backgroundColor: hdrBg }]}>
        <Text style={sw.cardTypeLbl}>{label}</Text>
        <View style={sw.cardBadgeRow}>
          {item.familyAnchorType === 'anchor' && <AnchorBadge small />}
          {isSelected && <SelectedTag small />}
        </View>
      </View>

      {/* Body */}
      <View style={sw.cardBody}>
        <Text style={sw.cardName} numberOfLines={3}>{item.name ?? ''}</Text>

        {/* Description — shown when present; silent when null (99.7% populated) */}
        {item.description != null && item.description.length > 0 && (
          <Text style={sw.cardDesc} numberOfLines={3}>{item.description}</Text>
        )}

        <View style={sw.cardChips}>
          {item.durationMinutes != null && (
            <View style={sw.cardChip}>
              <Text style={sw.cardChipTxt}>{item.durationMinutes} min</Text>
            </View>
          )}
          {item.minAge != null && item.minAge > 0 && (
            <View style={sw.cardChip}>
              <Text style={sw.cardChipTxt}>Ages {item.minAge}+</Text>
            </View>
          )}
          {/* Preview pill — active card only */}
          {showPreview && (
            <Pressable style={sw.previewPill} onPress={onPreview} hitSlop={8}>
              <Text style={sw.previewPillTxt}>Preview</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function SwipeDoneView({
  count,
  onViewList,
}: {
  count:      number;
  onViewList: () => void;
}) {
  return (
    <View style={sw.doneWrap}>
      <Text style={sw.doneEmoji}>{'\u2705'}</Text>
      <Text style={sw.doneTitle}>All done!</Text>
      <Text style={sw.doneSub}>
        {count} stop{count !== 1 ? 's' : ''} selected.{'\n'}Review your picks or confirm.
      </Text>
      <Pressable style={[s.ctaBtn, { marginTop: 24 }]} onPress={onViewList}>
        <Text style={s.ctaBtnTxt}>Review picks in list</Text>
      </Pressable>
    </View>
  );
}

type SwipeModeProps = {
  pool:          PoolEntry[];
  selectedNames: Set<string>;
  onToggle:      (name: string) => void;
  onPreview:     (entry: PoolEntry) => void;
  onSwitchList:  () => void;
};

function SwipeModeView({ pool, selectedNames, onToggle, onPreview, onSwitchList }: SwipeModeProps) {
  const [swipeIndex, setSwipeIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;

  // advanceRef pattern: PanResponder is created once; calls always use latest advance.
  const advanceRef = useRef<(action: 'heart' | 'x') => void>(() => {});

  const advance = useCallback(
    (action: 'heart' | 'x') => {
      const item = pool[swipeIndex];
      if (!item?.name) return;

      const isSelected = selectedNames.has(item.name);
      if (action === 'heart' && !isSelected) onToggle(item.name);
      if (action === 'x'     &&  isSelected) onToggle(item.name);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      const toX = action === 'heart' ? 700 : -700;
      Animated.timing(pan.x, {
        toValue:         toX,
        duration:        220,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        pan.setValue({ x: 0, y: 0 });
        setSwipeIndex(i => i + 1);
      });
    },
    [swipeIndex, pool, selectedNames, onToggle, pan],
  );

  advanceRef.current = advance;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove:  (_, g) => { pan.setValue({ x: g.dx, y: 0 }); },
      onPanResponderRelease: (_, g) => {
        if (g.dx >  SWIPE_THRESHOLD) advanceRef.current('heart');
        else if (g.dx < -SWIPE_THRESHOLD) advanceRef.current('x');
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    }),
  ).current;

  if (swipeIndex >= pool.length) {
    return <SwipeDoneView count={selectedNames.size} onViewList={onSwitchList} />;
  }

  const currentItem   = pool[swipeIndex];
  const nextItem      = pool[swipeIndex + 1];
  const isCurrentSel  = selectedNames.has(currentItem?.name ?? '');
  const progress      = pool.length > 0 ? swipeIndex / pool.length : 0;

  const rotate = pan.x.interpolate({
    inputRange:  [-200, 0, 200],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const xOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const heartOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp',
  });

  return (
    <View style={sw.root}>
      {/* Progress */}
      <View style={sw.progressRow}>
        <View style={sw.progressTrack}>
          <View style={[sw.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={sw.progressTxt}>{swipeIndex + 1} of {pool.length}</Text>
      </View>

      {/* Card stack */}
      <View style={sw.stack}>
        {nextItem != null && (
          <View style={sw.bgCard} pointerEvents="none">
            <SwipeCardContent
              item={nextItem}
              isSelected={selectedNames.has(nextItem.name ?? '')}
              showPreview={false}
              onPreview={() => {}}
            />
          </View>
        )}

        <Animated.View
          style={[sw.card, { transform: [{ translateX: pan.x }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          <SwipeCardContent
            item={currentItem}
            isSelected={isCurrentSel}
            showPreview={true}
            onPreview={() => onPreview(currentItem)}
          />
        </Animated.View>

        {/* Swipe-direction stamp overlays */}
        <Animated.View
          style={[sw.hintOverlay, sw.hintX, { opacity: xOpacity }]}
          pointerEvents="none"
        >
          <Text style={[sw.hintTxt, { color: '#EF4444' }]}>REMOVE</Text>
        </Animated.View>
        <Animated.View
          style={[sw.hintOverlay, sw.hintHeart, { opacity: heartOpacity }]}
          pointerEvents="none"
        >
          <Text style={[sw.hintTxt, { color: '#22C55E' }]}>ADD</Text>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={sw.actions}>
        <Pressable style={[sw.actionBtn, sw.xBtn]} onPress={() => advance('x')} hitSlop={8}>
          <Text style={sw.actionTxt}>{'\u2715'}</Text>
        </Pressable>
        <View style={sw.actionMid}>
          <Text style={sw.actionHintTxt}>
            {isCurrentSel ? 'Currently selected' : 'Not selected'}
          </Text>
          <Text style={sw.actionHintSub}>Swipe or tap</Text>
        </View>
        <Pressable style={[sw.actionBtn, sw.heartBtn]} onPress={() => advance('heart')} hitSlop={8}>
          <Text style={sw.actionTxt}>{'\u2665'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Unplaced banner ──────────────────────────────────────────────────────────

function UnplacedBanner({ stops }: { stops: ApplyResult['unplacedStops'] }) {
  if (stops.length === 0) return null;
  return (
    <View style={ub.banner}>
      <Text style={ub.title}>
        {stops.length} stop{stops.length !== 1 ? 's' : ''} could not fit
      </Text>
      <Text style={ub.sub}>
        Evaluated against every day but couldn{'\u2019'}t be placed — geography or
        timing blocked it. Remove them to keep your selection clean.
      </Text>
      {stops.map((st, i) => (
        <Text key={i} style={ub.item}>
          {'\u2022'} {st.name}{st.familyAnchorType === 'anchor' ? '  [Anchor]' : ''}
        </Text>
      ))}
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

type Mode = 'list' | 'swipe';

export default function ReviewStopsScreen() {
  const { tripId }     = useLocalSearchParams<{ tripId: string }>();
  const { token }      = useAuth();
  const insets         = useSafeAreaInsets();

  const [pool, setPool]                     = useState<PoolEntry[]>([]);
  const [selectedNames, setSelectedNames]   = useState<Set<string>>(new Set());
  const [algorithmNames, setAlgorithmNames] = useState<Set<string>>(new Set());
  const [search, setSearch]                 = useState('');
  const [mode, setMode]                     = useState<Mode>('list');
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [unplacedResult, setUnplacedResult] = useState<ApplyResult['unplacedStops']>([]);
  const [showResult, setShowResult]         = useState(false);
  const [previewEntry, setPreviewEntry]     = useState<PoolEntry | null>(null);

  const poolByName = useMemo(() => {
    const m = new Map<string, PoolEntry>();
    for (const p of pool) { if (p.name) m.set(p.name, p); }
    return m;
  }, [pool]);

  // ── Load pool ──────────────────────────────────────────────────────────────

  const loadPool = useCallback(() => {
    if (!tripId || !token) return;
    setLoading(true);
    setFetchError(null);
    fetch(`${API_BASE}/api/travel/trips/${tripId}/stop-pool`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { pool?: PoolEntry[] }) => {
        const p = data.pool ?? [];
        setPool(p);
        const algo = new Set(p.filter(e => e.selected && e.name).map(e => e.name!));
        setAlgorithmNames(algo);
        setSelectedNames(new Set(algo));
      })
      .catch(() => setFetchError('Failed to load stops. Please try again.'))
      .finally(() => setLoading(false));
  }, [tripId, token]);

  useEffect(() => { loadPool(); }, [loadPool]);

  // ── Toggle ─────────────────────────────────────────────────────────────────

  const toggle = useCallback((name: string) => {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
    setSubmitError(null);
    setShowResult(false);
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const submit = useCallback(async (names: Set<string>) => {
    if (!tripId || !token) return;
    const selectedStops = [...names]
      .map(name => poolByName.get(name))
      .filter(Boolean) as PoolEntry[];

    setSubmitting(true);
    setSubmitError(null);
    setShowResult(false);
    try {
      const res = await fetch(
        `${API_BASE}/api/travel/trips/${tripId}/apply-pool-selection`,
        {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ selectedStops }),
        },
      );
      const data: ApplyResult = await res.json();
      if (!res.ok) throw new Error((data as any).message ?? 'Failed');

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      if ((data.unplacedStops?.length ?? 0) > 0) {
        setUnplacedResult(data.unplacedStops);
        setShowResult(true);
        return;
      }

      router.replace({ pathname: '/trip/[tripId]' as any, params: { tripId } });
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Could not save your stop selection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [tripId, token, poolByName]);

  const handleConfirm        = useCallback(() => submit(selectedNames),  [submit, selectedNames]);
  const handleAutoPick       = useCallback(() => submit(algorithmNames), [submit, algorithmNames]);
  const handleContinueAnyway = useCallback(() => {
    if (!tripId) return;
    router.replace({ pathname: '/trip/[tripId]' as any, params: { tripId } });
  }, [tripId]);

  // ── Filtered pool (list mode) ──────────────────────────────────────────────

  const filteredPool = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(p => (p.name ?? '').toLowerCase().includes(q));
  }, [pool, search]);

  const selectedCount = selectedNames.size;

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.root, s.center, { backgroundColor: G.bg }]}>
        <ActivityIndicator color={G.orange} size="large" />
        <Text style={s.loadingTxt}>Loading stops...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={[s.root, s.center, { backgroundColor: G.bg, paddingHorizontal: 24 }]}>
        <Text style={s.errorTxt}>{fetchError}</Text>
        <Pressable style={[s.ctaBtn, { marginTop: 16 }]} onPress={loadPool}>
          <Text style={s.ctaBtnTxt}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Text style={s.backTxt}>{'\u2039'} Back</Text>
          </Pressable>
          {/* Mode toggle */}
          <View style={s.modeToggle}>
            <Pressable
              style={[s.modeBtn, mode === 'list' && s.modeBtnActive]}
              onPress={() => setMode('list')}
            >
              <Text style={[s.modeBtnTxt, mode === 'list' && s.modeBtnTxtActive]}>List</Text>
            </Pressable>
            <Pressable
              style={[s.modeBtn, mode === 'swipe' && s.modeBtnActive]}
              onPress={() => setMode('swipe')}
            >
              <Text style={[s.modeBtnTxt, mode === 'swipe' && s.modeBtnTxtActive]}>Swipe</Text>
            </Pressable>
          </View>
        </View>
        <Text style={s.title}>Review stops</Text>
        <Text style={s.sub}>
          {selectedCount} stop{selectedCount !== 1 ? 's' : ''} selected
          {pool.length > 0 ? ` of ${pool.length}` : ''}
        </Text>
      </View>

      {/* ── SWIPE mode ── */}
      {mode === 'swipe' && (
        <SwipeModeView
          pool={pool}
          selectedNames={selectedNames}
          onToggle={toggle}
          onPreview={setPreviewEntry}
          onSwitchList={() => setMode('list')}
        />
      )}

      {/* ── LIST mode ── */}
      {mode === 'list' && (
        <>
          {/* Auto-pick */}
          <View style={s.autoPick}>
            <Pressable
              style={[s.autoPickBtn, submitting && { opacity: 0.55 }]}
              onPress={handleAutoPick}
              disabled={submitting}
            >
              <Text style={s.autoPickTxt}>Let us pick for you</Text>
            </Pressable>
            <Text style={s.autoPickNote}>Accept AI selection — no changes needed</Text>
          </View>

          {/* Unplaced banner */}
          {showResult && (
            <>
              <UnplacedBanner stops={unplacedResult} />
              <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={[s.ctaBtn, { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: G.orange }]}
                  onPress={() => setShowResult(false)}
                >
                  <Text style={[s.ctaBtnTxt, { color: G.orange }]}>Edit selection</Text>
                </Pressable>
                <Pressable style={[s.ctaBtn, { flex: 1 }]} onPress={handleContinueAnyway}>
                  <Text style={s.ctaBtnTxt}>Continue anyway</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Submit error */}
          {submitError != null && (
            <View style={s.submitErr}>
              <Text style={s.submitErrTxt}>{submitError}</Text>
            </View>
          )}

          {/* Search */}
          <View style={s.searchWrap}>
            <View style={s.searchBar}>
              <Text style={s.searchIcon}>{'\uD83D\uDD0D'}</Text>
              <TextInput
                style={s.searchInput}
                placeholder="Search stops..."
                placeholderTextColor="#B0B5C4"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Text style={{ fontSize: 13, color: '#8A8FA8' }}>{'\u2715'}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Pool list */}
          <FlatList
            data={filteredPool}
            keyExtractor={(item, i) => item.name ?? String(i)}
            renderItem={({ item }) => (
              <StopRow
                item={item}
                isSelected={selectedNames.has(item.name ?? '')}
                onToggle={toggle}
                onPreview={setPreviewEntry}
              />
            )}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyTxt}>
                  {search.trim() ? 'No stops match your search.' : 'No stops in pool yet.'}
                </Text>
              </View>
            }
          />

          {/* Sticky confirm CTA */}
          {!showResult && (
            <View style={[s.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
              <Pressable
                style={[s.ctaBtn, (submitting || selectedCount === 0) && { opacity: 0.45 }]}
                onPress={handleConfirm}
                disabled={submitting || selectedCount === 0}
              >
                <Text style={s.ctaBtnTxt}>
                  {submitting
                    ? 'Saving...'
                    : `Confirm ${selectedCount} stop${selectedCount !== 1 ? 's' : ''}`}
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* Preview sheet — shared between list and swipe, rendered above everything */}
      {previewEntry != null && (
        <StopPreviewSheet
          entry={previewEntry}
          isSelected={selectedNames.has(previewEntry.name ?? '')}
          onClose={() => setPreviewEntry(null)}
          onToggle={name => { toggle(name); }}
          insets={insets}
        />
      )}
    </View>
  );
}

// ─── Shared screen styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  header:    { paddingHorizontal: 16, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },

  backBtn: {
    backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 18,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  backTxt: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  title:   { fontFamily: F.bold, fontSize: 24, color: G.deep, letterSpacing: -0.4 },
  sub:     { fontFamily: F.regular, fontSize: 13, color: G.muted, marginTop: 2 },

  modeToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(26,31,46,0.07)',
    borderRadius: 10, padding: 3, gap: 2,
  },
  modeBtn:        { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  modeBtnActive:  { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1 },
  modeBtnTxt:     { fontFamily: F.bold, fontSize: 13, color: G.muted },
  modeBtnTxtActive: { color: G.deep },

  autoPick: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: G.oLt, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  autoPickBtn:  { backgroundColor: G.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  autoPickTxt:  { fontFamily: F.bold,    fontSize: 13, color: '#fff' },
  autoPickNote: { fontFamily: F.regular, fontSize: 12, color: G.oDk, flex: 1, lineHeight: 17 },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F2EE', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 13,
    borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.09)',
  },
  searchIcon:  { fontSize: 15, color: '#8A8FA8' },
  searchInput: { flex: 1, fontSize: 14, color: G.deep, fontFamily: F.regular },

  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: G.bg,
    borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.08)',
    paddingTop: 12, paddingHorizontal: 16,
  },
  ctaBtn: {
    backgroundColor: G.orange, borderRadius: 13, paddingVertical: 15, alignItems: 'center',
    shadowColor: G.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 3,
  },
  ctaBtnTxt: { fontFamily: F.bold, fontSize: 15, color: '#fff' },

  submitErr:    { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  submitErrTxt: { fontFamily: F.regular, fontSize: 13, color: '#B91C1C', lineHeight: 19 },

  empty:    { alignItems: 'center', paddingVertical: 48 },
  emptyTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },

  loadingTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginTop: 12 },
  errorTxt:   { fontFamily: F.regular, fontSize: 14, color: G.deep, textAlign: 'center', lineHeight: 21 },
});

// ─── List mode styles ─────────────────────────────────────────────────────────

const lt = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.07)', gap: 12,
  },
  rowSel:   { borderColor: G.orange, backgroundColor: '#FFFAF7' },
  content:  { flex: 1, gap: 6 },
  name:     { fontFamily: F.semibold, fontSize: 14, color: G.deep, lineHeight: 20 },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip:     { backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  chipTxt:  { fontFamily: F.regular, fontSize: 11, color: G.muted },
  previewLink: { fontFamily: F.bold, fontSize: 11, color: G.orange },

  btn:           { borderRadius: 9, paddingHorizontal: 13, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', minWidth: 68 },
  btnAdd:        { backgroundColor: G.oLt },
  btnRemove:     { backgroundColor: 'rgba(26,31,46,0.07)' },
  btnTxt:        { fontFamily: F.bold, fontSize: 12 },
  btnTxtAdd:     { color: G.orange },
  btnTxtRemove:  { color: G.muted },

  swipeRemove: {
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 22, marginBottom: 8,
    borderTopRightRadius: 14, borderBottomRightRadius: 14, marginRight: 16,
  },
  swipeAdd: {
    backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 22, marginBottom: 8,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14, marginLeft: 16,
  },
  swipeTxt: { fontFamily: F.bold, fontSize: 12, color: G.deep },
});

// ─── Swipe card mode styles ───────────────────────────────────────────────────

const sw = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },

  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(26,31,46,0.12)', borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, backgroundColor: G.orange, borderRadius: 2 },
  progressTxt:   { fontFamily: F.bold, fontSize: 12, color: G.muted, minWidth: 48, textAlign: 'right' },

  stack: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  bgCard: {
    position: 'absolute', width: '100%',
    transform: [{ scale: 0.94 }, { translateY: 12 }],
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4,
  },
  card: {
    width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8,
  },

  cardInner:   { overflow: 'hidden', borderRadius: 20 },
  cardHeader:  { height: 130, padding: 18, justifyContent: 'space-between' },
  cardTypeLbl: { fontFamily: F.bold, fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 1, textTransform: 'uppercase' },
  cardBadgeRow:{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  cardBody:    { backgroundColor: '#fff', padding: 18, minHeight: 120 },
  cardName:    { fontFamily: F.bold, fontSize: 20, color: G.deep, letterSpacing: -0.3, lineHeight: 26, marginBottom: 8 },
  cardDesc:    { fontFamily: F.regular, fontSize: 13, color: '#4A5568', lineHeight: 19, marginBottom: 10 },
  cardChips:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  cardChip:    { backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cardChipTxt: { fontFamily: F.regular, fontSize: 12, color: G.muted },

  previewPill:    { borderWidth: 1.5, borderColor: G.orange, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  previewPillTxt: { fontFamily: F.bold, fontSize: 11, color: G.orange },

  hintOverlay: { position: 'absolute', top: 22, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 2.5 },
  hintX:       { left: 20,  borderColor: '#EF4444', backgroundColor: 'rgba(254,226,226,0.88)', transform: [{ rotate: '-12deg' }] },
  hintHeart:   { right: 20, borderColor: '#22C55E', backgroundColor: 'rgba(240,253,244,0.88)', transform: [{ rotate: '12deg'  }] },
  hintTxt:     { fontFamily: F.bold, fontSize: 13, letterSpacing: 1 },

  actions:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, gap: 12 },
  actionBtn:    { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.20, shadowRadius: 8, elevation: 4 },
  xBtn:         { backgroundColor: '#FEE2E2', shadowColor: '#EF4444' },
  heartBtn:     { backgroundColor: '#DCFCE7', shadowColor: '#22C55E' },
  actionTxt:    { fontFamily: F.bold, fontSize: 24, color: G.deep },

  actionMid:     { flex: 1, alignItems: 'center' },
  actionHintTxt: { fontFamily: F.bold,    fontSize: 12, color: G.deep,  textAlign: 'center' },
  actionHintSub: { fontFamily: F.regular, fontSize: 11, color: G.muted, textAlign: 'center', marginTop: 2 },

  doneWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  doneEmoji: { fontSize: 48, marginBottom: 16 },
  doneTitle: { fontFamily: F.bold, fontSize: 26, color: G.deep, letterSpacing: -0.4, marginBottom: 8 },
  doneSub:   { fontFamily: F.regular, fontSize: 15, color: G.muted, textAlign: 'center', lineHeight: 22 },
});

// ─── Preview sheet styles ─────────────────────────────────────────────────────

const ps = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(26,31,46,0.42)', zIndex: 100 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '86%' as any,
    backgroundColor: '#F5F2EE', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    flexDirection: 'column',
  },
  handle: { width: 32, height: 3, backgroundColor: '#E0DDD8', borderRadius: 2, alignSelf: 'center', marginTop: 10 },

  hdrRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4,
  },
  hdrName:  { fontFamily: F.bold, fontSize: 19, color: G.deep, lineHeight: 24, flex: 1, paddingRight: 10 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECEAE6', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  closeTxt: { fontSize: 12, color: G.deep, fontFamily: F.bold },

  body: { paddingHorizontal: 18, paddingBottom: 12 },

  hero:        { height: 130, borderRadius: 14, marginTop: 12, overflow: 'hidden', backgroundColor: '#DDD' },
  heroOverlay: { ...StyleSheet.absoluteFillObject },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  typePill: {
    paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20,
    borderWidth: 1.5, borderColor: G.orange,
  },
  typePillTxt: { fontFamily: F.bold, fontSize: 11, color: G.orange },
  durPill: {
    paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.15)',
  },
  durPillTxt: { fontFamily: F.medium, fontSize: 11, color: G.muted },
  anchorPill: {
    paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20,
    backgroundColor: '#E8692A22',
  },
  anchorPillTxt: { fontFamily: F.bold, fontSize: 11, color: G.orange },

  card:      { marginTop: 10, backgroundColor: '#fff', borderRadius: 14, padding: 13 },
  cardLabel: { fontFamily: F.bold, fontSize: 9, color: G.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  cardBody:  { fontFamily: F.regular, fontSize: 13, color: G.deep, lineHeight: 19 },

  mapsLink:    { marginTop: 7 },
  mapsLinkTxt: { fontFamily: F.bold, fontSize: 12, color: G.orange },

  footer: {
    paddingHorizontal: 18, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.07)',
  },
  footerBtn: {
    backgroundColor: G.orange, borderRadius: 13, paddingVertical: 14, alignItems: 'center',
    shadowColor: G.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 3,
  },
  footerBtnRemove:    { backgroundColor: '#FEE2E2', shadowColor: 'transparent', elevation: 0 },
  footerBtnTxt:       { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  footerBtnTxtRemove: { color: '#B91C1C' },
});

// ─── Atom styles ──────────────────────────────────────────────────────────────

const at = StyleSheet.create({
  badge:      { backgroundColor: '#E8692A22', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeSm:    { paddingHorizontal: 5, paddingVertical: 2 },
  badgeTxt:   { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 0.2 },
  badgeTxtSm: { fontFamily: F.bold, fontSize: 9,  color: G.orange },

  selTag:   { backgroundColor: '#F0FDF4', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#86EFAC' },
  selTagSm: { paddingHorizontal: 5, paddingVertical: 2 },
  selTxt:   { fontFamily: F.bold, fontSize: 10, color: '#15803D', letterSpacing: 0.2 },
  selTxtSm: { fontFamily: F.bold, fontSize: 9,  color: '#15803D' },
});

// ─── Unplaced banner styles ───────────────────────────────────────────────────

const ub = StyleSheet.create({
  banner: {
    marginHorizontal: 16, marginBottom: 10, backgroundColor: '#FFFBEB',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FDE68A',
  },
  title: { fontFamily: F.bold,    fontSize: 14, color: '#92400E', marginBottom: 4 },
  sub:   { fontFamily: F.regular, fontSize: 12, color: '#78350F', lineHeight: 18, marginBottom: 8 },
  item:  { fontFamily: F.regular, fontSize: 12, color: '#92400E', lineHeight: 19 },
});
