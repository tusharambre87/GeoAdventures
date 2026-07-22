/**
 * Step 3 — Flat stop review screen
 *
 * Loads GET /api/travel/trips/:tripId/stop-pool and lets the user
 * add/remove stops before the itinerary is bucketed into days.
 *
 * Rules (non-negotiable per spec):
 *   - "Selected" tag on every item where selected === true. Nothing on others.
 *   - "Anchor" badge where familyAnchorType === 'anchor'. Real data, not decorative.
 *   - NO day labels or day mentions anywhere on this screen.
 *   - List mode: Add on unselected, Remove on selected.
 *   - Swipe left → rejects (removes if selected). Swipe right → selects (adds if not).
 *   - "Let us pick for you" submits algorithm defaults with zero edits.
 *   - Submit sends full pool-entry objects, not bare IDs.
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
  FlatList,
  Platform,
  Pressable,
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

// ─── Types ────────────────────────────────────────────────────────────────────

type PoolEntry = {
  name: string | null;
  type: string | null;
  familyAnchorType: string | null;
  scoreClassicFinal: number | null;
  durationMinutes: number | null;
  minAge: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  selected: boolean;
  dayIndex: number | null;
  displayOrder: number | null;
};

type ApplyResult = {
  success: boolean;
  placed: number;
  buckets: Array<{
    dayNumber: number;
    stopCount: number;
    targetCount: number;
    closedShort: boolean;
    stops: Array<{ name: string; familyAnchorType: string | null }>;
  }>;
  unplacedStops: Array<{
    name: string;
    familyAnchorType: string | null;
    scoreClassicFinal: number | null;
  }>;
};

// ─── Small UI atoms ───────────────────────────────────────────────────────────

function AnchorBadge() {
  return (
    <View style={a.badge}>
      <Text style={a.badgeTxt}>Anchor</Text>
    </View>
  );
}

function SelectedTag() {
  return (
    <View style={a.selTag}>
      <Text style={a.selTagTxt}>Selected</Text>
    </View>
  );
}

// ─── Swipe actions ───────────────────────────────────────────────────────────
// renderRightActions  →  revealed by swiping LEFT  →  Remove
// renderLeftActions   →  revealed by swiping RIGHT →  Add

function SwipeRemove({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={a.swipeRemove} onPress={onPress}>
      <Text style={a.swipeTxt}>Remove</Text>
    </Pressable>
  );
}

function SwipeAdd({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={a.swipeAdd} onPress={onPress}>
      <Text style={a.swipeTxt}>Add</Text>
    </Pressable>
  );
}

// ─── Stop row ─────────────────────────────────────────────────────────────────

type RowProps = {
  item: PoolEntry;
  isSelected: boolean;
  onToggle: (name: string) => void;
};

function StopRow({ item, isSelected, onToggle }: RowProps) {
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
      renderRightActions={isSelected ? () => <SwipeRemove onPress={closeAndToggle} /> : undefined}
      renderLeftActions={!isSelected ? () => <SwipeAdd onPress={closeAndToggle} /> : undefined}
    >
      <View style={[r.row, isSelected && r.rowSel]}>
        <View style={r.content}>
          <Text style={r.name} numberOfLines={2}>{name}</Text>
          <View style={r.metaRow}>
            {item.familyAnchorType === 'anchor' && <AnchorBadge />}
            {isSelected && <SelectedTag />}
            {item.durationMinutes != null && (
              <View style={r.chip}>
                <Text style={r.chipTxt}>{item.durationMinutes} min</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable
          style={[r.btn, isSelected ? r.btnRemove : r.btnAdd]}
          onPress={doToggle}
          hitSlop={10}
        >
          <Text style={[r.btnTxt, isSelected ? r.btnTxtRemove : r.btnTxtAdd]}>
            {isSelected ? 'Remove' : 'Add'}
          </Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}

// ─── Unplaced banner ─────────────────────────────────────────────────────────

type UnplacedBannerProps = {
  stops: ApplyResult['unplacedStops'];
};

function UnplacedBanner({ stops }: UnplacedBannerProps) {
  if (stops.length === 0) return null;
  return (
    <View style={u.banner}>
      <Text style={u.title}>
        {stops.length} stop{stops.length !== 1 ? 's' : ''} could not fit
      </Text>
      <Text style={u.sub}>
        These were evaluated against every day but couldn't be placed — geography
        or timing didn't allow it. You can remove them to keep your selection clean.
      </Text>
      {stops.map((s, i) => (
        <Text key={i} style={u.item}>
          {'\u2022'} {s.name}
          {s.familyAnchorType === 'anchor' ? '  [Anchor]' : ''}
        </Text>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReviewStopsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [pool, setPool] = useState<PoolEntry[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [algorithmNames, setAlgorithmNames] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [unplacedResult, setUnplacedResult] = useState<ApplyResult['unplacedStops']>([]);
  const [showResult, setShowResult] = useState(false);

  // name → full pool entry for submission (send full objects, not bare IDs)
  const poolByName = useMemo(() => {
    const m = new Map<string, PoolEntry>();
    for (const p of pool) {
      if (p.name) m.set(p.name, p);
    }
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
        const algoSel = new Set(
          p.filter(e => e.selected && e.name).map(e => e.name!)
        );
        setAlgorithmNames(algoSel);
        setSelectedNames(new Set(algoSel));
      })
      .catch(() => setFetchError('Failed to load stops. Please try again.'))
      .finally(() => setLoading(false));
  }, [tripId, token]);

  useEffect(() => { loadPool(); }, [loadPool]);

  // ── Selection state ────────────────────────────────────────────────────────

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
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ selectedStops }),
        }
      );
      const data: ApplyResult = await res.json();
      if (!res.ok) throw new Error((data as any).message ?? 'Failed');

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      if (data.unplacedStops?.length > 0) {
        setUnplacedResult(data.unplacedStops);
        setShowResult(true);
        return;
      }

      router.replace({
        pathname: '/trip/[tripId]' as any,
        params: { tripId },
      });
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Could not save your stop selection. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [tripId, token, poolByName]);

  const handleConfirm = useCallback(() => submit(selectedNames), [submit, selectedNames]);
  const handleAutoPick = useCallback(() => submit(algorithmNames), [submit, algorithmNames]);
  const handleContinueAnyway = useCallback(() => {
    if (!tripId) return;
    router.replace({ pathname: '/trip/[tripId]' as any, params: { tripId } });
  }, [tripId]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const filteredPool = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(p => (p.name ?? '').toLowerCase().includes(q));
  }, [pool, search]);

  const selectedCount = selectedNames.size;

  // ── Loading / error states ─────────────────────────────────────────────────

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

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Text style={s.backTxt}>{'\u2039'} Back</Text>
        </Pressable>
        <Text style={s.title}>Review stops</Text>
        <Text style={s.sub}>
          {selectedCount} stop{selectedCount !== 1 ? 's' : ''} selected
          {pool.length > 0 ? ` of ${pool.length}` : ''}
        </Text>
      </View>

      {/* ── Auto-pick row ── */}
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

      {/* ── Unplaced banner (shown after submit with unplaced stops) ── */}
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
              style={[s.ctaBtn, { flex: 1 }]}
              onPress={handleContinueAnyway}
            >
              <Text style={s.ctaBtnTxt}>Continue anyway</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* ── Submit error ── */}
      {submitError != null && (
        <View style={s.submitError}>
          <Text style={s.submitErrorTxt}>{submitError}</Text>
        </View>
      )}

      {/* ── Search bar ── */}
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

      {/* ── Pool list ── */}
      <FlatList
        data={filteredPool}
        keyExtractor={(item, i) => item.name ?? String(i)}
        renderItem={({ item }) => (
          <StopRow
            item={item}
            isSelected={selectedNames.has(item.name ?? '')}
            onToggle={toggle}
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

      {/* ── Sticky confirm CTA ── */}
      {!showResult && (
        <View style={[s.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            style={[
              s.ctaBtn,
              (submitting || selectedCount === 0) && { opacity: 0.45 },
            ]}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:  { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26,31,46,0.07)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  backTxt:  { fontFamily: F.bold, fontSize: 13, color: G.deep },
  title:    { fontFamily: F.bold, fontSize: 24, color: G.deep, letterSpacing: -0.4 },
  sub:      { fontFamily: F.regular, fontSize: 13, color: G.muted, marginTop: 2 },

  autoPick: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: G.oLt,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoPickBtn: {
    backgroundColor: G.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  autoPickTxt:  { fontFamily: F.bold,    fontSize: 13, color: '#fff' },
  autoPickNote: { fontFamily: F.regular, fontSize: 12, color: G.oDk, flex: 1, lineHeight: 17 },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar:  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F2EE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(26,31,46,0.09)',
  },
  searchIcon:  { fontSize: 15, color: '#8A8FA8' },
  searchInput: { flex: 1, fontSize: 14, color: G.deep, fontFamily: F.regular },

  ctaBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: G.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,31,46,0.08)',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  ctaBtn: {
    backgroundColor: G.orange,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: G.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaBtnTxt: { fontFamily: F.bold, fontSize: 15, color: '#fff' },

  submitError: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
  },
  submitErrorTxt: { fontFamily: F.regular, fontSize: 13, color: '#B91C1C', lineHeight: 19 },

  empty:    { alignItems: 'center', paddingVertical: 48 },
  emptyTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted },

  loadingTxt: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginTop: 12 },
  errorTxt:   { fontFamily: F.regular, fontSize: 14, color: G.deep, textAlign: 'center', lineHeight: 21 },
});

// Row styles
const r = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(26,31,46,0.07)',
    gap: 12,
  },
  rowSel: {
    borderColor: G.orange,
    backgroundColor: '#FFFAF7',
  },
  content: { flex: 1, gap: 6 },
  name: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: G.deep,
    lineHeight: 20,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },

  chip: {
    backgroundColor: 'rgba(26,31,46,0.07)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipTxt: { fontFamily: F.regular, fontSize: 11, color: G.muted },

  btn: {
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  btnAdd:    { backgroundColor: G.oLt },
  btnRemove: { backgroundColor: 'rgba(26,31,46,0.07)' },
  btnTxt:    { fontFamily: F.bold, fontSize: 12 },
  btnTxtAdd:    { color: G.orange },
  btnTxtRemove: { color: G.muted },
});

// Atom styles
const a = StyleSheet.create({
  badge: {
    backgroundColor: '#E8692A22',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTxt: { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 0.2 },

  selTag: {
    backgroundColor: '#F0FDF4',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  selTagTxt: { fontFamily: F.bold, fontSize: 10, color: '#15803D', letterSpacing: 0.2 },

  swipeRemove: {
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 8,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    marginRight: 16,
  },
  swipeAdd: {
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 8,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginLeft: 16,
  },
  swipeTxt: { fontFamily: F.bold, fontSize: 12, color: G.deep },
});

// Unplaced banner styles
const u = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  title: { fontFamily: F.bold,    fontSize: 14, color: '#92400E', marginBottom: 4 },
  sub:   { fontFamily: F.regular, fontSize: 12, color: '#78350F', lineHeight: 18, marginBottom: 8 },
  item:  { fontFamily: F.regular, fontSize: 12, color: '#92400E', lineHeight: 19 },
});
