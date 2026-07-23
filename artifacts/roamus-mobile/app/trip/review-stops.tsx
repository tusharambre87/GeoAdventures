/**
 * Step 3 — Stop review screen
 *
 * Two modes, shared selected-name state:
 *
 *   LIST mode  — flat list with swipe-gesture actions (left=Remove, right=Add),
 *                per-row 56×56 Wikipedia thumbnail, inline Add/Remove buttons,
 *                and a per-row "Preview" link.
 *
 *   SWIPE mode — card-stack.  Photo hero (Wikipedia, gradient fallback) on each
 *                card.  Preview pill top-right of white body, active card only.
 *
 * StopPreviewSheet — rich detail sheet matching the visual language of
 *   AddStopDetailSheet in [tripId].tsx: photo hero, "Good time to visit"
 *   green banner, WHY KIDS LOVE IT, ENTRY / BEST TIME info row, timing card,
 *   address card, Add/Remove footer.
 *
 * Spec invariants:
 *   - No "Anchor" tags anywhere — internal scoring detail, not user-facing.
 *   - "Selected" tag uses real data.
 *   - NO day labels anywhere on this screen.
 *   - Submit sends full PoolEntry objects, not bare IDs.
 *   - handleContinueAnyway runs the real submit then navigates regardless of
 *     unplaced status — user edits are never silently discarded.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { API_BASE, useAuth } from '@/lib/authContext';
import { F, G } from '@/lib/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 110;

function cardGradient(type: string | null | undefined): [string, string] {
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

/** Derive ticket/entry status from stop type — best-effort, no external data needed. */
function entryStatus(type: string | null | undefined): 'free' | 'paid' | 'check' {
  const t = (type ?? '').toLowerCase();
  if (t.includes('park') || t.includes('beach') || t.includes('nature') ||
      t.includes('viewpoint') || t.includes('bridge') || t.includes('boardwalk')) return 'free';
  if (t.includes('museum') || t.includes('aquarium') || t.includes('zoo') ||
      t.includes('theater') || t.includes('castle') || t.includes('palace') ||
      t.includes('science') || t.includes('indoor_attraction')) return 'paid';
  return 'check';
}

function bestTime(type: string | null | undefined): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('beach')) return 'Midday';
  if (t.includes('museum') || t.includes('indoor') || t.includes('aquarium')) return 'Anytime';
  if (t.includes('nature') || t.includes('park') || t.includes('viewpoint')) return 'Morning';
  if (t.includes('restaurant') || t.includes('food')) return 'Lunchtime';
  return 'Check ahead';
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
  description:       string | null;
  imageUrl:          string | null;
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

// ─── Stop image hook ──────────────────────────────────────────────────────────
// Prefers a stop_library imageUrl (from the pool API enrichment) over Wikipedia.
// Wikipedia fetch is skipped entirely when imageUrl is already provided.

function useStopImage(name: string | null, imageUrl: string | null, size = 400): string | null {
  const [wikiUri, setWikiUri] = useState<string | null>(null);
  useEffect(() => {
    if (imageUrl) return; // stop_library image available — skip Wikipedia
    if (!name) return;
    let cancelled = false;
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=pageimages&format=json&pithumbsize=${size}&origin=*`
    )
      .then(r => r.json())
      .then(d => {
        const page = Object.values((d?.query?.pages ?? {}) as Record<string, any>)[0] as any;
        if (!cancelled && page?.thumbnail?.source) setWikiUri(page.thumbnail.source as string);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [name, imageUrl, size]);
  return imageUrl ?? wikiUri;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function SelectedTag({ small }: { small?: boolean }) {
  return (
    <View style={[at.selTag, small && at.selTagSm]}>
      <Text style={[at.selTxt, small && at.selTxtSm]}>Selected</Text>
    </View>
  );
}

// ─── Stop thumbnail (list rows) ───────────────────────────────────────────────

function StopThumbnail({ name, type, imageUrl }: { name: string | null; type: string | null; imageUrl: string | null }) {
  const uri = useStopImage(name, imageUrl, 200);
  const [c1] = cardGradient(type);
  return (
    <View style={tn.wrap}>
      {uri
        ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />}
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
  const heroUri = useStopImage(entry.name, entry.imageUrl, 600);
  const [c1] = cardGradient(entry.type);

  const dur = entry.durationMinutes != null
    ? entry.durationMinutes < 60
      ? `${entry.durationMinutes} min`
      : `${Math.floor(entry.durationMinutes / 60)}\u20132 hr`
    : '1\u20132 hours';

  const mapsUrl = entry.name
    ? `https://maps.apple.com/?q=${encodeURIComponent(entry.name)}`
    : null;

  const entry_ = entryStatus(entry.type);
  const bestT  = bestTime(entry.type);

  const parkingUrl = entry.address
    ? `https://maps.apple.com/?q=parking+near+${encodeURIComponent(entry.address)}`
    : entry.name
      ? `https://maps.apple.com/?q=parking+near+${encodeURIComponent(entry.name)}`
      : null;

  return (
    <View style={ps.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[ps.sheet, { paddingBottom: 0 }]}>
        <View style={ps.handle} />

        {/* Header */}
        <View style={ps.hdrRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={ps.hdrName} numberOfLines={2}>{entry.name ?? ''}</Text>
            <Text style={ps.hdrSub}>{typeLabel(entry.type)}{dur ? ` \u00B7 ${dur}` : ''}</Text>
          </View>
          <Pressable style={ps.closeBtn} onPress={onClose} hitSlop={10}>
            <Text style={ps.closeTxt}>{'\u2715'}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={ps.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero photo */}
          <View style={ps.hero}>
            {heroUri
              ? <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(26,31,46,0.22)' }]} />
            <Text style={ps.heroName}>{entry.name ?? ''}</Text>
          </View>

          {/* Pills */}
          <View style={ps.pillRow}>
            <View style={ps.typePill}>
              <Text style={ps.typePillTxt}>{typeLabel(entry.type)}</Text>
            </View>
            <View style={ps.durPill}>
              <Text style={ps.durPillTxt}>{dur}</Text>
            </View>
            {(entry.minAge == null || entry.minAge === 0) && (
              <View style={ps.kidPill}>
                <Text style={ps.kidPillTxt}>{'\u2713 Kid-friendly'}</Text>
              </View>
            )}
          </View>

          {/* Good time to visit — green banner */}
          {entry.description != null && entry.description.length > 0 && (
            <View style={ps.goodTimeBanner}>
              <Text style={ps.goodTimeStar}>{'\u2605'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ps.goodTimeTitle}>Good time to visit</Text>
                <Text style={ps.goodTimeSub}>Great pick for families of all ages.</Text>
              </View>
            </View>
          )}

          {/* WHY KIDS LOVE IT */}
          {entry.description != null && entry.description.length > 0 && (
            <View style={ps.loveCard}>
              <View style={ps.loveHdr}>
                <Text style={ps.loveStar}>{'\u2605'}</Text>
                <Text style={ps.loveLbl}>{'WHY KIDS LOVE IT'}</Text>
              </View>
              <Text style={ps.loveTxt}>{entry.description}</Text>
            </View>
          )}

          {/* ENTRY / BEST TIME */}
          <View style={ps.infoRow}>
            <View style={ps.infoCell}>
              <Text style={ps.infoLbl}>{'ENTRY'}</Text>
              {entry_ === 'free'
                ? <Text style={[ps.infoVal, { color: '#3DAA6E' }]}>{'Free entry'}</Text>
                : entry_ === 'paid'
                  ? (
                    <>
                      <Text style={[ps.infoVal, { color: '#E8433A' }]}>{'Ticket required'}</Text>
                      <Pressable onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent((entry.name ?? '') + ' tickets buy')}`).catch(() => {})}>
                        <Text style={ps.bookLink}>{'Book tickets \u2192'}</Text>
                      </Pressable>
                    </>
                  )
                  : <Text style={[ps.infoVal, { color: '#8A8FA8' }]}>{'Check at gate'}</Text>}
            </View>
            <View style={ps.infoCell}>
              <Text style={ps.infoLbl}>{'BEST TIME'}</Text>
              <Text style={ps.infoVal}>{bestT}</Text>
            </View>
          </View>

          {/* Timing card */}
          {(entry.durationMinutes != null || parkingUrl != null) && (
            <View style={ps.addrCard}>
              <Text style={ps.addrCardLabel}>{'TIMING & LOGISTICS'}</Text>
              {entry.durationMinutes != null && (
                <View style={ps.timingRow}>
                  <Text style={ps.timingKey}>Recommended duration</Text>
                  <Text style={ps.timingVal}>{entry.durationMinutes} min</Text>
                </View>
              )}
              {parkingUrl != null && (
                <Pressable onPress={() => Linking.openURL(parkingUrl!).catch(() => {})}>
                  <Text style={ps.parkingLink}>{'Find parking nearby \u2192'}</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Address */}
          <View style={ps.addrCard}>
            <View style={ps.addrWarnRow}>
              <Text style={ps.addrWarnTxt}>{'Estimated \u2014 please verify'}</Text>
            </View>
            <Text style={ps.addrTxt}>
              {entry.address != null && entry.address.length > 0
                ? entry.address
                : 'Address not confirmed \u2014 tap to open in Maps'}
            </Text>
            {mapsUrl != null && (
              <Pressable
                style={ps.addrLinkRow}
                onPress={() => Linking.openURL(mapsUrl!).catch(() => {})}
              >
                <Text style={ps.addrLinkTxt}>{'Open in Maps to verify'}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[ps.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[ps.footerBtn, isSelected && ps.footerBtnRemove]}
            onPress={() => { onToggle(entry.name ?? ''); onClose(); }}
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
        {/* Thumbnail */}
        <StopThumbnail name={item.name} type={item.type} imageUrl={item.imageUrl} />

        {/* Content */}
        <View style={lt.content}>
          <Text style={lt.name} numberOfLines={2}>{name}</Text>
          <View style={lt.metaRow}>
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

        {/* Toggle button */}
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
  const heroUri = useStopImage(item.name, item.imageUrl, 500);
  const [c1] = cardGradient(item.type);
  const label = typeLabel(item.type);

  return (
    <View style={sw.cardInner}>
      {/* Photo hero — Wikipedia with gradient fallback */}
      <View style={sw.cardHero}>
        {heroUri
          ? <Image source={{ uri: heroUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />}
        {/* Dark scrim for legibility */}
        <View style={[StyleSheet.absoluteFillObject, sw.heroScrim]} />
        {/* Type label overlay — bottom-left */}
        <Text style={sw.heroTypeLbl}>{label}</Text>
        {/* Selected tag — bottom-right */}
        {isSelected && (
          <View style={sw.heroSelTag}>
            <Text style={sw.heroSelTxt}>Selected</Text>
          </View>
        )}
      </View>

      {/* White body */}
      <View style={sw.cardBody}>
        {/* Preview pill — absolute top-right, active card only */}
        {showPreview && (
          <Pressable style={sw.previewPill} onPress={onPreview} hitSlop={8}>
            <Text style={sw.previewPillTxt}>Preview</Text>
          </Pressable>
        )}

        {/* Name — right-padded on active card to clear pill */}
        <Text style={[sw.cardName, showPreview && sw.cardNameWithPill]} numberOfLines={3}>
          {item.name ?? ''}
        </Text>

        {/* Description — shown when present; silently absent when null */}
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
        </View>
      </View>
    </View>
  );
}

function SwipeDoneView({ count, onViewList }: { count: number; onViewList: () => void }) {
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
      Animated.timing(pan.x, {
        toValue: action === 'heart' ? 700 : -700,
        duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true,
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
      onPanResponderMove:   (_, g) => { pan.setValue({ x: g.dx, y: 0 }); },
      onPanResponderRelease: (_, g) => {
        if      (g.dx >  SWIPE_THRESHOLD) advanceRef.current('heart');
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
    inputRange: [-200, 0, 200], outputRange: ['-12deg', '0deg', '12deg'], extrapolate: 'clamp',
  });
  const xOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const heartOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp',
  });

  return (
    <View style={sw.root}>
      <View style={sw.progressRow}>
        <View style={sw.progressTrack}>
          <View style={[sw.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={sw.progressTxt}>{swipeIndex + 1} of {pool.length}</Text>
      </View>

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
        <Animated.View style={[sw.hintOverlay, sw.hintX, { opacity: xOpacity }]} pointerEvents="none">
          <Text style={[sw.hintTxt, { color: '#EF4444' }]}>REMOVE</Text>
        </Animated.View>
        <Animated.View style={[sw.hintOverlay, sw.hintHeart, { opacity: heartOpacity }]} pointerEvents="none">
          <Text style={[sw.hintTxt, { color: '#22C55E' }]}>ADD</Text>
        </Animated.View>
      </View>

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
      {stops.map((st, i) => (
        <View key={i} style={i > 0 ? { marginTop: 10 } : undefined}>
          <Text style={ub.stopName}>{st.name}</Text>
          <Text style={ub.sub}>
            {'A bit far from your other picks. Keep it and we\u2019ll place it if we can, or add it to a specific day later from Add a Stop.'}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

type Mode = 'list' | 'swipe';

export default function ReviewStopsScreen() {
  const { tripId }  = useLocalSearchParams<{ tripId: string }>();
  const { token }   = useAuth();
  const insets      = useSafeAreaInsets();

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
  //
  // navigateAlways = true  →  "Continue anyway" path: run the real submission
  //   (user edits are persisted) then navigate regardless of unplaced stops.
  // navigateAlways = false →  normal path: show unplaced banner on partial fit.

  const submit = useCallback(async (names: Set<string>, navigateAlways = false) => {
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
          body:    JSON.stringify({ selectedStops, forcePlace: navigateAlways }),
        },
      );
      const data: ApplyResult = await res.json();
      if (!res.ok) throw new Error((data as any).message ?? 'Failed');

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      // Show unplaced banner only when caller did NOT explicitly ask to navigate anyway.
      if (!navigateAlways && (data.unplacedStops?.length ?? 0) > 0) {
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

  // "Continue anyway" — runs the real submission with current edits, then navigates.
  const handleConfirm        = useCallback(() => submit(selectedNames),        [submit, selectedNames]);
  const handleAutoPick       = useCallback(() => submit(algorithmNames),       [submit, algorithmNames]);
  const handleContinueAnyway = useCallback(() => submit(selectedNames, true),  [submit, selectedNames]);

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
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={s.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Text style={s.backTxt}>{'\u2039'} Back</Text>
          </Pressable>
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
              <Text style={s.autoPickTxt}>Skip ahead</Text>
            </Pressable>
            <Text style={s.autoPickNote}>
              {'These are the stops families like yours pick most often.'}
            </Text>
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
                <Pressable
                  style={[s.ctaBtn, { flex: 1 }, submitting && { opacity: 0.55 }]}
                  onPress={handleContinueAnyway}
                  disabled={submitting}
                >
                  <Text style={s.ctaBtnTxt}>
                    {submitting ? 'Saving...' : 'Continue anyway'}
                  </Text>
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

      {/* Preview sheet — shared between list and swipe */}
      {previewEntry != null && (
        <StopPreviewSheet
          entry={previewEntry}
          isSelected={selectedNames.has(previewEntry.name ?? '')}
          onClose={() => setPreviewEntry(null)}
          onToggle={toggle}
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

  backBtn: { backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  backTxt: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  title:   { fontFamily: F.bold, fontSize: 24, color: G.deep, letterSpacing: -0.4 },
  sub:     { fontFamily: F.regular, fontSize: 13, color: G.muted, marginTop: 2 },

  modeToggle:       { flexDirection: 'row', backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 10, padding: 3, gap: 2 },
  modeBtn:          { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  modeBtnActive:    { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1 },
  modeBtnTxt:       { fontFamily: F.bold, fontSize: 13, color: G.muted },
  modeBtnTxtActive: { color: G.deep },

  autoPick: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: G.oLt, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  autoPickBtn:  { backgroundColor: G.orange, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  autoPickTxt:  { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  autoPickNote: { fontFamily: F.regular, fontSize: 12, color: G.oDk, flex: 1, lineHeight: 17 },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar:  {
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
  ctaBtn:    {
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

// ─── Thumbnail styles ─────────────────────────────────────────────────────────

const tn = StyleSheet.create({
  wrap: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: '#DDD', flexShrink: 0 },
});

// ─── List mode styles ─────────────────────────────────────────────────────────

const lt = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: 'rgba(26,31,46,0.07)', gap: 10,
  },
  rowSel:   { borderColor: G.orange, backgroundColor: '#FFFAF7' },
  content:  { flex: 1, gap: 5 },
  name:     { fontFamily: F.semibold, fontSize: 14, color: G.deep, lineHeight: 19 },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip:     { backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  chipTxt:  { fontFamily: F.regular, fontSize: 11, color: G.muted },
  previewLink: { fontFamily: F.bold, fontSize: 11, color: G.orange },

  btn:          { borderRadius: 9, paddingHorizontal: 13, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', minWidth: 68 },
  btnAdd:       { backgroundColor: G.oLt },
  btnRemove:    { backgroundColor: 'rgba(26,31,46,0.07)' },
  btnTxt:       { fontFamily: F.bold, fontSize: 12 },
  btnTxtAdd:    { color: G.orange },
  btnTxtRemove: { color: G.muted },

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
  root: { flex: 1, paddingHorizontal: 8 },

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

  cardInner: { overflow: 'hidden', borderRadius: 20 },

  // Photo hero (replaces flat color header)
  cardHero:  { height: 200, position: 'relative' },
  heroScrim: { backgroundColor: 'rgba(26,31,46,0.30)' },
  heroTypeLbl: {
    position: 'absolute', bottom: 10, left: 14,
    fontFamily: F.bold, fontSize: 10, color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.8, textTransform: 'uppercase',
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  heroSelTag: {
    position: 'absolute', bottom: 10, right: 14,
    backgroundColor: 'rgba(61,170,110,0.88)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  heroSelTxt: { fontFamily: F.bold, fontSize: 10, color: '#fff' },

  cardBody:        { backgroundColor: '#fff', padding: 16, minHeight: 110 },
  cardName:        { fontFamily: F.bold, fontSize: 19, color: G.deep, letterSpacing: -0.3, lineHeight: 24, marginBottom: 6 },
  cardNameWithPill:{ paddingRight: 72 },
  cardDesc:        { fontFamily: F.regular, fontSize: 13, color: '#4A5568', lineHeight: 18, marginBottom: 8 },
  cardChips:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  cardChip:        { backgroundColor: 'rgba(26,31,46,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cardChipTxt:     { fontFamily: F.regular, fontSize: 12, color: G.muted },

  previewPill:    { position: 'absolute', top: 12, right: 14, zIndex: 1, borderWidth: 1.5, borderColor: G.orange, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: G.oLt },
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

// ─── Preview sheet styles (mirrors AddStopDetailSheet visual language) ─────────

const ps = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(26,31,46,0.42)', zIndex: 100 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '88%' as any,
    backgroundColor: '#F5F2EE', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    flexDirection: 'column',
  },
  handle: { width: 32, height: 3, backgroundColor: '#E0DDD8', borderRadius: 2, alignSelf: 'center', marginTop: 10 },

  hdrRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, flexShrink: 0 },
  hdrName: { fontFamily: F.bold, fontSize: 19, color: G.deep, lineHeight: 23 },
  hdrSub:  { fontFamily: F.medium, fontSize: 12, color: G.muted, marginTop: 2 },
  closeBtn:{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECEAE6', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  closeTxt:{ fontSize: 12, color: G.deep, fontFamily: F.bold },

  body: { paddingHorizontal: 18, paddingBottom: 12 },

  // Hero — matches asd.heroWrap (120px, rounded 14, overflow hidden)
  hero:     { height: 120, borderRadius: 14, marginTop: 12, overflow: 'hidden', backgroundColor: '#CCC' },
  heroName: { position: 'absolute', bottom: 10, left: 12, fontFamily: F.bold, fontSize: 16, color: '#fff', lineHeight: 20 },

  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  typePill:    { paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20, borderWidth: 1.5, borderColor: G.orange },
  typePillTxt: { fontSize: 11, fontFamily: F.bold, color: G.orange },
  durPill:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0DDD8' },
  durPillTxt:  { fontSize: 11, fontFamily: F.medium, color: G.muted },
  kidPill:     { paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20, backgroundColor: 'rgba(61,170,110,0.10)' },
  kidPillTxt:  { fontSize: 11, fontFamily: F.bold, color: '#3DAA6E' },

  // "Good time to visit" green banner
  goodTimeBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 10, backgroundColor: '#F0FDF4',
    borderRadius: 12, borderWidth: 1, borderColor: '#86EFAC',
    padding: 12,
  },
  goodTimeStar:  { fontSize: 16, color: '#3DAA6E', marginTop: 1 },
  goodTimeTitle: { fontSize: 13, fontFamily: F.bold, color: '#15803D' },
  goodTimeSub:   { fontSize: 12, fontFamily: F.regular, color: '#16A34A', marginTop: 2, lineHeight: 17 },

  // WHY KIDS LOVE IT — matches asd.loveCard
  loveCard: { marginTop: 8, backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  loveHdr:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  loveStar: { fontSize: 15 },
  loveLbl:  { fontSize: 10, fontFamily: F.bold, color: G.deep, letterSpacing: 0.5, textTransform: 'uppercase' },
  loveTxt:  { fontSize: 12, fontFamily: F.medium, color: '#4A5568', lineHeight: 18 },

  // ENTRY / BEST TIME — matches asd.infoRow
  infoRow:  { flexDirection: 'row', gap: 8, marginTop: 8 },
  infoCell: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 11 },
  infoLbl:  { fontSize: 9, fontFamily: F.bold, color: G.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  infoVal:  { fontSize: 13, fontFamily: F.bold, color: G.deep },

  // Timing card
  addrCard:      { marginTop: 8, backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  addrCardLabel: { fontSize: 9, fontFamily: F.bold, color: G.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  timingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  timingKey:     { fontSize: 13, fontFamily: F.regular, color: G.muted },
  timingVal:     { fontSize: 13, fontFamily: F.bold, color: G.deep },
  parkingLink:   { fontSize: 11, fontFamily: F.bold, color: G.orange, marginTop: 2 },

  // Address card
  addrWarnRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  addrWarnTxt: { fontSize: 10, fontFamily: F.bold, color: '#F5A623', letterSpacing: 0.2 },
  addrTxt:     { fontSize: 12, fontFamily: F.medium, color: G.deep, lineHeight: 17 },
  addrLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  addrLinkTxt: { fontSize: 11, fontFamily: F.bold, color: G.orange },

  bookLink:       { fontSize: 11, fontFamily: F.bold, color: G.orange, marginTop: 3 },
  footer:         { paddingHorizontal: 18, paddingTop: 10, backgroundColor: '#F5F2EE', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', flexShrink: 0 },
  footerBtn:      { backgroundColor: G.orange, borderRadius: 13, paddingVertical: 14, alignItems: 'center', shadowColor: G.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
  footerBtnRemove:   { backgroundColor: '#FEE2E2', shadowColor: 'transparent', elevation: 0 },
  footerBtnTxt:      { fontSize: 14, fontFamily: F.bold, color: '#fff' },
  footerBtnTxtRemove:{ color: '#B91C1C' },
});

// ─── Atom styles ──────────────────────────────────────────────────────────────

const at = StyleSheet.create({
  selTag:   { backgroundColor: '#F0FDF4', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#86EFAC' },
  selTagSm: { paddingHorizontal: 5, paddingVertical: 2 },
  selTxt:   { fontFamily: F.bold, fontSize: 10, color: '#15803D', letterSpacing: 0.2 },
  selTxtSm: { fontFamily: F.bold, fontSize: 9,  color: '#15803D' },
});

// ─── Unplaced banner styles ───────────────────────────────────────────────────

const ub = StyleSheet.create({
  banner: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  stopName: { fontFamily: F.bold,    fontSize: 14, color: '#92400E', marginBottom: 4 },
  sub:      { fontFamily: F.regular, fontSize: 13, color: '#78350F', lineHeight: 19 },
});
