import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { F } from '@/lib/tokens';
import { apiFetch } from '@/lib/apiClient';
import {
  computeDoneForDay,
  computeFoodStop,
  computeFunDay,
  computeLateDay,
  computeSkipDay,
  computeTiredDay,
  computeWeatherDay,
  getOptions,
  type RescueOptionId,
  type RescuePlan,
  type StopLike,
} from '@/lib/rescueEngine';

interface LibraryStop {
  id: string;
  name: string;
  stopType: string | null;
  address: string | null;
  description: string | null;
  city?: string | null;
  gpAddressVerified?: string | null;
  gpPriceLevel?: number | null;
  enrichment?: { bestTimeOfDay?: string } | Record<string, unknown> | null;
}

interface OtherDayStop {
  id: string;
  name: string;
  stopType: string | null;
  dayIndex: number;
  durationMinutes?: number | null;
  address?: string | null;
  description?: string | null;
}

type Context = 'morning' | 'en_route' | 'stop_complete' | 'stop';
type SheetView = 'picker' | RescueOptionId | 'applied';

interface NeedRec {
  id: string;
  name: string;
  type?: string;
  travelTimeMinutes?: number;
  description?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  context: Context;
  stops: StopLike[];
  currentStopIndex: number;
  tripId?: string;
  dayIndex?: number;
  onDropStop?: (stopId: string) => Promise<void> | void;
  onWrapDay?: () => Promise<void> | void;
  onStopsChanged?: () => void;
  onPreviewStop?: (stop: any, imageUrl?: string) => void;
  initialOption?: SheetView;
  stopLat?: string | number | null;
  stopLng?: string | number | null;
  stopName?: string;
  destination?: string;
}

function getFoodLabel(hour: number): string {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack break';
  return 'dinner';
}

const STOP_TYPE_EMOJI: Record<string, string> = {
  restaurant: '\uD83C\uDF7D',
  food: '\uD83C\uDF54',
  cafe: '\u2615',
  lunch: '\uD83E\uDD6A',
  dining: '\uD83C\uDF7D',
  street_food: '\uD83E\uDDB4',
  museum: '\uD83C\uDFDB',
  aquarium: '\uD83D\uDC20',
  park: '\uD83C\uDF33',
  zoo: '\uD83E\uDD81',
  landmark: '\uD83D\uDDFD',
  science_center: '\uD83D\uDD2D',
  theater: '\uD83C\uDFAD',
  gallery: '\uD83D\uDDBC',
  indoor_attraction: '\uD83C\uDFAB',
};

function stopEmoji(type: string | null): string {
  return STOP_TYPE_EMOJI[type ?? ''] ?? '\uD83D\uDCCD';
}

export default function RescueSheet({
  visible,
  onClose,
  context,
  stops,
  currentStopIndex,
  tripId,
  dayIndex,
  onDropStop,
  onWrapDay,
  onStopsChanged,
  onPreviewStop,
  initialOption,
  stopLat,
  stopLng,
  stopName,
  destination,
}: Props) {
  const insets = useSafeAreaInsets();
  const isStopContext = !!(stopLat != null && stopLng != null);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(700)).current;

  const [view, setView] = useState<SheetView>('picker');
  const [plan, setPlan] = useState<RescuePlan | null>(null);

  useEffect(() => {
    if (visible && initialOption) setView(initialOption);
    if (!visible) setView('picker');
  }, [visible]);

  // Swap / fun
  const [swapLoading, setSwapLoading]           = useState(false);
  const [swapError, setSwapError]               = useState<string | null>(null);
  const [swapStep, setSwapStep]                 = useState<1 | 2>(1);
  const [selectedStopId, setSelectedStopId]     = useState<string | null>(null);
  const [selectedStopName, setSelectedStopName] = useState('');
  const [otherDayStops, setOtherDayStops]       = useState<OtherDayStop[]>([]);
  const [newOptions, setNewOptions]             = useState<LibraryStop[]>([]);
  const [lastSwapType, setLastSwapType]         = useState<'one_way' | 'two_way' | null>(null);

  // Food
  const [foodOptions, setFoodOptions] = useState<LibraryStop[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodError, setFoodError]     = useState<string | null>(null);
  const [foodCity, setFoodCity]       = useState('');

  // Weather indoor
  const [weatherOptions, setWeatherOptions] = useState<LibraryStop[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Apply state
  const [applyingPlan, setApplyingPlan] = useState(false);
  const [swappedToName, setSwappedToName] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Food selection
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const mealLabel = getFoodLabel(new Date().getHours());

  // Need-recs state (stop context: food/fun/weather)
  const [needRecsResults, setNeedRecsResults] = React.useState<NeedRec[]>([]);
  const [needRecsLoading, setNeedRecsLoading] = React.useState(false);
  const [needRecsError, setNeedRecsError] = React.useState<string | null>(null);
  const [applyingRec, setApplyingRec] = React.useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{ stop: LibraryStop | OtherDayStop; swapFn: () => void } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageLoading, setPreviewImageLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setView('picker');
      setPlan(null);
      setSwapLoading(false);
      setSwapError(null);
      setSwapStep(1);
      setSelectedStopId(null);
      setSelectedStopName('');
      setOtherDayStops([]);
      setNewOptions([]);
      setLastSwapType(null);
      setFoodOptions([]);
      setFoodError(null);
      setWeatherOptions([]);
      setApplyingPlan(false);
      setSwappedToName(null);
      setApplyError(null);
      setSelectedFoodId(null);
      setNeedRecsResults([]);
      setNeedRecsLoading(false);
      setNeedRecsError(null);
      setApplyingRec(null);
      setPreviewItem(null);
      setPreviewImageUrl(null);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetAnim,   { toValue: 0, damping: 26, stiffness: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.spring(sheetAnim,   { toValue: 700, damping: 26, stiffness: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Fetch hero image when preview opens
  useEffect(() => {
    if (!previewItem) { setPreviewImageUrl(null); return; }
    setPreviewImageUrl(null);
    setPreviewImageLoading(true);
    const endpoint = 'dayIndex' in previewItem.stop
      ? `/api/travel/stops/${previewItem.stop.id}/hero-image`
      : `/api/travel/stop-library/${previewItem.stop.id}/hero-image`;
    apiFetch<{ url: string | null }>(endpoint)
      .then(r => {
        setPreviewImageUrl(r.url ?? null);
        onPreviewStop?.(previewItem.stop, r.url ?? undefined);
      })
      .catch(() => setPreviewImageUrl(null))
      .finally(() => setPreviewImageLoading(false));
  }, [previewItem?.stop.id]);

  // Load swap options when fun view opens (skipped in stop context)
  useEffect(() => {
    if (view !== 'fun' || !tripId || isStopContext) return;
    setSwapLoading(true);
    setSwapError(null);
    apiFetch<{ options: LibraryStop[]; otherDayStops: OtherDayStop[] }>('/api/travel/rescue/swap-options', {
      method: 'POST',
      body: JSON.stringify({ tripId, dayIndex: dayIndex ?? 0 }),
    }).then(r => {
      setNewOptions(r.options ?? []);
      setOtherDayStops(r.otherDayStops ?? []);
    }).catch(() => {
      setSwapError('Could not load options. Check your connection.');
    }).finally(() => setSwapLoading(false));
  }, [view]);

  // Load food options when food view opens (skipped in stop context)
  useEffect(() => {
    if (view !== 'food' || !tripId || isStopContext) return;
    setFoodLoading(true);
    setFoodError(null);
    apiFetch<{ options: LibraryStop[]; city: string }>('/api/travel/rescue/food-options', {
      method: 'POST',
      body: JSON.stringify({ tripId }),
    }).then(r => {
      setFoodOptions(r.options ?? []);
      setFoodCity(r.city ?? '');
    }).catch(() => {
      setFoodError('Could not load food options. Check your connection.');
    }).finally(() => setFoodLoading(false));
  }, [view]);

  // Load indoor alternatives when weather view opens (skipped in stop context)
  useEffect(() => {
    if (view !== 'weather' || !tripId || isStopContext) return;
    setWeatherLoading(true);
    apiFetch<{ options: LibraryStop[] }>('/api/travel/rescue/swap-options', {
      method: 'POST',
      body: JSON.stringify({ tripId, dayIndex: dayIndex ?? 0, filterIndoor: true }),
    }).then(r => {
      setWeatherOptions(r.options ?? []);
    }).catch(() => {
      setWeatherOptions([]);
    }).finally(() => setWeatherLoading(false));
  }, [view]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.spring(sheetAnim,   { toValue: 700, damping: 26, stiffness: 220, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onClose(); });
  }

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  function selectOption(id: RescueOptionId) {
    if (id === 'sick') {
      // Silent rescue log — fire-and-forget
      const currentStop = stops[currentStopIndex] as (typeof stops[0] & { id?: string });
      if (tripId && currentStop?.id) {
        apiFetch(`/api/travel/stop-activity-log/${currentStop.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ tripId, rescueTriggered: true, rescueReason: 'sick' }),
        }).catch(() => {});
      }
      handleClose();
      setTimeout(() => router.push('/atstop/sos' as never), 300);
      return;
    }
    // Silent rescue log — fire-and-forget
    const currentStop = stops[currentStopIndex] as (typeof stops[0] & { id?: string });
    if (tripId && currentStop?.id) {
      const rescueReasonMap: Record<RescueOptionId, string> = {
        tired: 'tired',
        late: 'late',
        food: 'food',
        weather: 'weather',
        sick: 'sick',
        done: 'done',
        skip: 'done',
        fun: 'done',
      };
      const rescueReason = rescueReasonMap[id] ?? id;
      apiFetch(`/api/travel/stop-activity-log/${currentStop.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tripId, rescueTriggered: true, rescueReason }),
      }).catch(() => {});
    }
    let computed: RescuePlan;
    switch (id) {
      case 'tired':   computed = computeTiredDay(stops, currentStopIndex);   break;
      case 'late':    computed = computeLateDay(stops, currentStopIndex);    break;
      case 'weather': computed = computeWeatherDay(stops, currentStopIndex); break;
      case 'skip':    computed = computeSkipDay(stops, currentStopIndex);   break;
      case 'done':    computed = computeDoneForDay(stops, currentStopIndex); break;
      case 'fun':     computed = computeFunDay(stops, currentStopIndex);    break;
      case 'food':    computed = computeFoodStop();                          break;
      default:        computed = { type: id, headline: '', body: '' };
    }
    setPlan(computed);
    setView(id);
  }

  async function applyPlan() {
    if (!plan) return;
    setApplyingPlan(true);
    setApplyError(null);
    try {
      if (plan.type === 'tired' && plan.dropStop) {
        await onDropStop?.(plan.dropStop.id);
      }
      if (plan.type === 'done' || plan.type === 'skip') {
        await onWrapDay?.();
      }
      setView('applied');
    } catch {
      setApplyError('Something went wrong — your plan is unchanged.');
    } finally {
      setApplyingPlan(false);
    }
  }

  async function applySwap(chosen: LibraryStop | OtherDayStop, swapType: 'one_way' | 'two_way') {
    if (!tripId || !selectedStopId) return;
    setApplyingPlan(true);
    setSwappedToName(chosen.name);
    setLastSwapType(swapType);
    try {
      if (swapType === 'two_way') {
        await apiFetch('/api/travel/rescue/apply-swap', {
          method: 'POST',
          body: JSON.stringify({
            action: 'two_way_swap',
            tripId,
            stopAId: selectedStopId,
            stopBId: chosen.id,
          }),
        });
      } else {
        await apiFetch('/api/travel/rescue/apply-swap', {
          method: 'POST',
          body: JSON.stringify({
            action: 'one_way_swap',
            tripId,
            removeStopId: selectedStopId,
            addStopLibraryId: chosen.id,
          }),
        });
      }
      onStopsChanged?.();
    } catch { /* best-effort — plan still shown */ }
    setApplyingPlan(false);
    setView('applied');
  }

  async function applyWeather() {
    if (!plan?.swaps?.length) { setView('applied'); return; }
    if (tripId) {
      setApplyingPlan(true);
      await Promise.all(
        plan.swaps.map(async (swap, idx) => {
          const alt = weatherOptions[idx];
          try {
            if (alt) {
              await apiFetch('/api/travel/rescue/apply-swap', {
                method: 'POST',
                body: JSON.stringify({
                  tripId,
                  fromStopId: swap.from.id,
                  toLibraryStopId: alt.id,
                  dayIndex: dayIndex ?? 0,
                }),
              });
            } else {
              await apiFetch(`/api/travel/stops/${swap.from.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isSkipped: true }),
              });
            }
          } catch { /* best-effort */ }
        })
      );
      onStopsChanged?.();
      setApplyingPlan(false);
    }
    setView('applied');
  }

  // Load need-recs when food/fun/weather opens in stop context
  useEffect(() => {
    if (!isStopContext) return;
    if (view !== 'food' && view !== 'fun' && view !== 'weather') return;
    setNeedRecsLoading(true);
    setNeedRecsError(null);
    setNeedRecsResults([]);
    apiFetch<{ suggestions: NeedRec[] }>('/api/travel/need-recs', {
      method: 'POST',
      body: JSON.stringify({
        destination: destination ?? '',
        nearStopName: stopName ?? '',
        needType: view,
        lat: stopLat,
        lng: stopLng,
      }),
    }).then(r => {
      setNeedRecsResults(r.suggestions ?? []);
    }).catch(() => {
      setNeedRecsError("We couldn't find options right now.");
    }).finally(() => setNeedRecsLoading(false));
  }, [view, isStopContext]);

  async function handleNeedRecAction(rec: NeedRec, action: 'add' | 'swap') {
    console.log('handleNeedRecAction called:', action, rec.name, 'tripId:', tripId, 'dayIndex:', dayIndex);
    if (!tripId) return;
    setApplyingRec(rec.id);
    setApplyError(null);
    try {
      if (action === 'swap') {
        const nextStop = stops.slice(currentStopIndex + 1).find(s => !(s as any).isSkipped && !(s as any).isVisited);
        console.log('rescue swap: nextStop to skip:', nextStop?.name ?? '(none)');
        if (nextStop) {
          const skipResult = await apiFetch(`/api/travel/stops/${nextStop.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isSkipped: true }),
          });
          console.log('rescue swap: skip response:', JSON.stringify(skipResult));
        }
      }
      const addResult = await apiFetch(`/api/travel/trips/${tripId}/stops`, {
        method: 'POST',
        body: JSON.stringify({
          name: rec.name,
          stopType: rec.type ?? null,
          dayIndex: dayIndex ?? 0,
          durationMinutes: 60,
        }),
      });
      console.log('rescue swap: add response:', JSON.stringify(addResult));
      onStopsChanged?.();
      setView('applied');
    } catch (err) {
      console.log('rescue swap: ERROR', String(err));
      setApplyError('Could not add stop — try again.');
      setApplyingRec(null);
    }
  }

  const { primary, secondary } = getOptions(context);

  if (!visible) return null;

  return (
    <>
      <Animated.View style={[s.overlay, { opacity: overlayAnim, zIndex: 300 }]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: sheetAnim }], zIndex: 301 }]}
      >
        <View style={s.handle} />

        {/* ── PICKER VIEW ── */}
        {view === 'picker' && (
          <>
            <View style={s.header}>
              <Text style={s.headerTitle}>Day not going to plan?</Text>
              <Text style={s.headerSub}>What's going on?</Text>
            </View>
            <ScrollView style={s.scroll} contentContainerStyle={s.pickerContent} showsVerticalScrollIndicator={false}>
              <View style={s.tileGrid}>
                {primary.map(opt => (
                  <TouchableOpacity key={opt.id} style={s.tile} activeOpacity={0.75} onPress={() => selectOption(opt.id)}>
                    <Text style={s.tileIcon}>{opt.icon}</Text>
                    <Text style={s.tileTitle}>{opt.title}</Text>
                    <Text style={s.tileSub}>{opt.subtitle}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.moreLabel}>More options</Text>
              {secondary.map(opt => (
                <TouchableOpacity key={opt.id} style={s.secRow} activeOpacity={0.75} onPress={() => selectOption(opt.id)}>
                  <Text style={s.secIcon}>{opt.icon}</Text>
                  <View style={s.secText}>
                    <Text style={s.secTitle}>{opt.title}</Text>
                    <Text style={s.secSub}>{opt.subtitle}</Text>
                  </View>
                  <Text style={s.secChevron}>{'\u203A'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── TIRED VIEW ── */}
        {view === 'tired' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel={applyingPlan ? 'Dropping stop…' : plan.dropStop ? `Drop "${plan.dropStop.name}"` : 'Nothing to drop'}
            ctaColor={plan.dropStop && !applyingPlan ? '#E8692A' : '#8A8FA8'}
            headerColor="#2D6A4F"
            applyError={applyError}
          >
            {plan.dropStop ? (
              <>
                <Text style={s.sectionLabel}>DROPPING THIS STOP</Text>
                <View style={s.stopCard}>
                  <View style={[s.stopDot, { backgroundColor: '#E8692A' }]} />
                  <View style={s.stopCardText}>
                    <Text style={s.stopCardName}>{plan.dropStop.name}</Text>
                    <Text style={s.stopCardMeta}>
                      {plan.dropStop.stopType
                        ? plan.dropStop.stopType.charAt(0).toUpperCase() + plan.dropStop.stopType.slice(1)
                        : 'Stop'}
                      {plan.dropStop.durationMinutes ? ` · ${plan.dropStop.durationMinutes} min` : ''}
                      {' — lowest importance'}
                    </Text>
                  </View>
                </View>
                {plan.timeSavedMins != null && (
                  <View style={s.savingPill}>
                    <Text style={s.savingPillText}>{'\u23F1'} Saves ~{plan.timeSavedMins} min</Text>
                  </View>
                )}
                {plan.keptStops && plan.keptStops.length > 0 && (
                  <>
                    <Text style={[s.sectionLabel, { marginTop: 20 }]}>KEEPING</Text>
                    {plan.keptStops.map(st => (
                      <View key={st.id} style={s.keptRow}>
                        <Text style={s.keptCheck}>{'\u2713'}</Text>
                        <Text style={s.keptName} numberOfLines={1}>{st.name}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            ) : (
              <View style={s.centeredNote}>
                <Text style={s.centeredNoteText}>{plan.body}</Text>
              </View>
            )}
          </ResultView>
        )}

        {/* ── LATE VIEW ── */}
        {view === 'late' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel="Apply tighter schedule"
            ctaColor="#E8692A"
            headerColor="#B45309"
          >
            {plan.trimmedStops && plan.trimmedStops.length > 0 ? (
              <>
                {plan.totalRecovered != null && plan.totalRecovered > 0 && (
                  <View style={[s.savingPill, { marginTop: 0, marginBottom: 12, backgroundColor: '#FEF3C7' }]}>
                    <Text style={[s.savingPillText, { color: '#92400E' }]}>{'\u23F1'} Recover ~{plan.totalRecovered} min</Text>
                  </View>
                )}
                <Text style={s.sectionLabel}>PER-STOP TRIM PLAN</Text>
                {plan.trimmedStops.map(t => (
                  <View key={t.stop.id} style={s.trimRow}>
                    <View style={s.trimLeft}>
                      <Text style={s.trimStopName} numberOfLines={1}>{t.stop.name}</Text>
                      <Text style={s.trimNote} numberOfLines={2}>{t.note}</Text>
                    </View>
                    <View style={s.trimRight}>
                      {t.protected ? (
                        <View style={s.protectedBadge}>
                          <Text style={s.protectedBadgeText}>Protected</Text>
                        </View>
                      ) : t.trimBy > 0 ? (
                        <>
                          <Text style={s.trimFrom}>{t.stop.durationMinutes ?? 60} min</Text>
                          <Text style={s.trimArrow}>{'→'}</Text>
                          <Text style={s.trimTo}>{t.newDuration} min</Text>
                        </>
                      ) : (
                        <Text style={s.trimNoChange}>No change</Text>
                      )}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.centeredNote}>
                <Text style={s.centeredNoteText}>{plan.body}</Text>
              </View>
            )}
          </ResultView>
        )}

        {/* ── STOP CONTEXT: NEED-RECS VIEW (food / fun / weather) ── */}
        {isStopContext && (view === 'food' || view === 'fun' || view === 'weather') && (
          <>
            <View style={s.header}>
              <Text style={s.headerTitle}>
                {view === 'food' ? 'Need food now' : view === 'fun' ? 'Something more fun' : 'Weather changed'}
              </Text>
              <Text style={s.headerSub}>
                {view === 'food' ? 'Family-friendly spots nearby' : view === 'fun' ? 'Fun alternatives near this stop' : 'Indoor alternatives nearby'}
              </Text>
            </View>
            <ScrollView style={s.scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {needRecsLoading ? (
                <View style={s.centeredNote}>
                  <ActivityIndicator color="#E8692A" />
                  <Text style={[s.centeredNoteText, { marginTop: 10 }]}>Finding options nearby…</Text>
                </View>
              ) : needRecsResults.length === 0 && !needRecsLoading ? (
                <>
                  <View style={s.centeredNote}>
                    <Text style={s.centeredNoteText}>{needRecsError ?? "We couldn't find options right now."}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.ctaBtn, { backgroundColor: '#1A1F2E', marginTop: 12 }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      const q = view === 'weather' ? 'indoor+activities' : view === 'fun' ? 'family+activities' : 'family+restaurants';
                      Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + q + '+near+' + encodeURIComponent(stopName ?? ''));
                    }}
                  >
                    <Text style={s.ctaBtnText}>Search on Google Maps</Text>
                  </TouchableOpacity>
                </>
              ) : (
                needRecsResults.map(rec => (
                  <View key={rec.id} style={s.needRecCard}>
                    <Text style={s.needRecName}>{rec.name}</Text>
                    {!!rec.description && <Text style={s.needRecDesc}>{rec.description}</Text>}
                    {rec.travelTimeMinutes != null && (
                      <Text style={s.needRecMeta}>~{rec.travelTimeMinutes} min away</Text>
                    )}
                    {applyingRec === rec.id ? (
                      <ActivityIndicator color="#E8692A" style={{ marginTop: 10 }} />
                    ) : (
                      <View style={s.needRecActions}>
                        <TouchableOpacity style={s.needRecAddBtn} activeOpacity={0.85} onPress={() => handleNeedRecAction(rec, 'add')}>
                          <Text style={s.needRecBtnText}>+ Add to plan</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.needRecSwapBtn} activeOpacity={0.85} onPress={() => handleNeedRecAction(rec, 'swap')}>
                          <Text style={s.needRecBtnText}>Swap next stop</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <View style={s.resultFooter}>
              <TouchableOpacity style={[s.goBackBtn, { flex: 1 }]} onPress={() => setView('picker')} activeOpacity={0.7}>
                <Text style={s.goBackText}>Go back</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── SWAP / FUN VIEW ── */}
        {view === 'fun' && !isStopContext && (
          <>
            {/* Step 1: pick which stop to swap out */}
            {swapStep === 1 && (
              <>
                <View style={s.header}>
                  <Text style={s.headerTitle}>Swap a stop</Text>
                  <Text style={s.headerSub}>Pick the stop you want to replace</Text>
                </View>
                <ScrollView style={s.scroll}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={s.sectionLabel}>TODAY'S STOPS</Text>
                  {stops.map((stop, i) => (
                    <TouchableOpacity
                      key={stop.id}
                      style={s.stopSelectRow}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedStopId(stop.id);
                        setSelectedStopName(stop.name);
                        setSwapStep(2);
                      }}
                    >
                      <View style={s.stopNumBadge}>
                        <Text style={s.stopNumText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.stopSelectName} numberOfLines={1}>{stop.name}</Text>
                        <Text style={s.stopSelectMeta}>
                          {stop.durationMinutes ?? 60} min
                          {stop.stopType ? ' \u00B7 ' + stop.stopType : ''}
                        </Text>
                      </View>
                      <Text style={s.swapArrowCta}>Swap this {'\u2192'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={s.resultFooter}>
                  <TouchableOpacity style={[s.goBackBtn, { flex: 1 }]} onPress={() => setView('picker')} activeOpacity={0.7}>
                    <Text style={s.goBackText}>Go back</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 2: pick replacement */}
            {swapStep === 2 && (
              <>
                <View style={s.header}>
                  <Text style={s.headerTitle}>Swap a stop</Text>
                  <Text style={s.headerSub} numberOfLines={2}>
                    {'Replacing "' + selectedStopName + '" \u2014 pick what goes in'}
                  </Text>
                </View>
                <ScrollView style={s.scroll}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={s.swappingOutBanner}>
                    <Text style={s.swappingOutLabel}>SWAPPING OUT</Text>
                    <Text style={s.swappingOutName}>{selectedStopName}</Text>
                  </View>

                  {otherDayStops.length > 0 && (
                    <>
                      <Text style={s.sectionLabel}>FROM OTHER DAYS</Text>
                      {otherDayStops.map(stop => (
                        <View key={stop.id} style={s.otherDayRow}>
                          <View style={s.otherDayThumb}>
                            <Text style={{ fontSize: 22 }}>{stopEmoji(stop.stopType)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.stopSelectName} numberOfLines={1}>{stop.name}</Text>
                            <Text style={s.stopSelectMeta}>
                              {'Day ' + (stop.dayIndex + 1)}
                              {stop.durationMinutes ? ' \u00B7 ' + stop.durationMinutes + ' min' : ''}
                            </Text>
                          </View>
                          <View style={s.swapRowActions}>
                            <TouchableOpacity onPress={() => setPreviewItem({ stop, swapFn: () => applySwap(stop, 'two_way') })}>
                              <Text style={s.previewCtaMuted}>Preview</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => !applyingPlan && applySwap(stop, 'two_way')}>
                              <Text style={s.swapArrowCta}>Swap {'\u2192'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                      <View style={s.sectionDivider} />
                    </>
                  )}

                  {swapLoading ? (
                    <View style={s.centeredNote}>
                      <ActivityIndicator color="#E8692A" />
                      <Text style={[s.centeredNoteText, { marginTop: 10 }]}>Finding alternatives{'\u2026'}</Text>
                    </View>
                  ) : swapError ? (
                    <View style={s.centeredNote}>
                      <Text style={[s.centeredNoteText, { color: '#C0392B' }]}>{swapError}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={s.sectionLabel}>NEW OPTIONS</Text>
                      {newOptions.length === 0 ? (
                        <View style={s.centeredNote}>
                          <Text style={s.centeredNoteText}>No options found for your city. Head to Discover to explore more.</Text>
                        </View>
                      ) : (
                        <View style={s.swapGrid}>
                          {newOptions.slice(0, 6).map(opt => (
                            <View key={opt.id} style={s.swapCard}>
                              <Text style={s.swapCardIcon}>{stopEmoji(opt.stopType)}</Text>
                              <Text style={s.swapCardName} numberOfLines={2}>{opt.name}</Text>
                              <Text style={s.swapCardMeta} numberOfLines={1}>
                                {opt.stopType ?? 'attraction'}
                              </Text>
                              <View style={s.swapCardCtaRow}>
                                <TouchableOpacity onPress={() => setPreviewItem({ stop: opt, swapFn: () => applySwap(opt, 'one_way') })}>
                                  <Text style={s.previewCtaMuted}>{'Preview \u2192'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => !applyingPlan && applySwap(opt, 'one_way')}>
                                  <Text style={s.swapCardCta}>{'Swap in \u2192'}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                  {applyingPlan && (
                    <View style={[s.centeredNote, { paddingTop: 8 }]}>
                      <ActivityIndicator color="#E8692A" />
                      <Text style={[s.centeredNoteText, { marginTop: 8 }]}>Swapping{'\u2026'}</Text>
                    </View>
                  )}
                </ScrollView>
                <View style={s.resultFooter}>
                  <TouchableOpacity style={[s.goBackBtn, { flex: 1 }]} onPress={() => setSwapStep(1)} activeOpacity={0.7}>
                    <Text style={s.goBackText}>Go back</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* ── FOOD VIEW ── */}
        {view === 'food' && plan && !isStopContext && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={() => setView('applied')}
            ctaLabel={selectedFoodId
              ? `Add ${mealLabel} stop → ${foodOptions.find(o => o.id === selectedFoodId)?.name ?? ''}`
              : `Select a spot above`}
            ctaColor={selectedFoodId ? '#E8692A' : '#C4C8D8'}
            ctaDisabled={!selectedFoodId}
          >
            {foodLoading ? (
              <View style={s.centeredNote}>
                <ActivityIndicator color="#E8692A" />
                <Text style={[s.centeredNoteText, { marginTop: 10 }]}>Finding food options…</Text>
              </View>
            ) : foodError ? (
              <View style={s.centeredNote}>
                <Text style={[s.centeredNoteText, { color: '#C0392B' }]}>{foodError}</Text>
              </View>
            ) : (
              <>
                {foodOptions.length > 0 && (
                  <>
                    <Text style={s.sectionLabel}>NEARBY OPTIONS</Text>
                    {foodOptions.map(opt => {
                      const isSelected = opt.id === selectedFoodId;
                      return (
                        <View key={opt.id} style={[s.foodCard, isSelected && s.foodCardSelected]}>
                          <View style={s.foodCardTop}>
                            <View style={s.foodCardThumb}>
                              <Text style={s.foodCardIcon}>{stopEmoji(opt.stopType)}</Text>
                            </View>
                            <View style={s.foodCardInfo}>
                              <Text style={[s.foodCardName, isSelected && { color: '#E8692A' }]} numberOfLines={1}>{opt.name}</Text>
                              <Text style={s.foodCardMeta} numberOfLines={1}>
                                {(opt.stopType ?? 'restaurant').replace(/_/g, ' ')}
                                {opt.address ? ' \u00B7 ' + opt.address : ''}
                              </Text>
                            </View>
                            <TouchableOpacity
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              style={s.foodCardMapBtn}
                              onPress={() => {
                                const q = encodeURIComponent(`${opt.name} ${opt.city ?? foodCity}`);
                                Linking.openURL(`https://maps.google.com/?q=${q}`);
                              }}
                            >
                              <Text style={s.foodCardMapIcon}>{'\u2197\uFE0F'}</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={s.foodCardBtns}>
                            <Pressable
                              style={s.foodCardPreviewBtn}
                              onPress={() => setPreviewItem({ stop: opt, swapFn: () => setSelectedFoodId(opt.id) })}
                            >
                              <Text style={s.foodCardPreviewText}>{'Preview \u2192'}</Text>
                            </Pressable>
                            <Pressable
                              style={[s.foodCardAddBtn, isSelected && s.foodCardAddBtnSelected]}
                              onPress={() => setSelectedFoodId(opt.id === selectedFoodId ? null : opt.id)}
                            >
                              <Text style={[s.foodCardAddText, isSelected && s.foodCardAddTextSelected]}>
                                {isSelected ? '\u2713 Selected' : '+ Add to plan'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}
                {foodOptions.length === 0 && !foodLoading && (
                  <>
                    <View style={s.centeredNote}>
                      <Text style={s.centeredNoteText}>No restaurant data for your city yet.</Text>
                    </View>
                    <TouchableOpacity
                      style={[s.ctaBtn, { backgroundColor: '#1A1F2E', marginHorizontal: 0, marginTop: 8, marginBottom: 4 }]}
                      activeOpacity={0.8}
                      onPress={() => {
                        const city = foodCity || 'nearby';
                        Linking.openURL(`https://maps.google.com/?q=family+restaurants+in+${encodeURIComponent(city)}`);
                      }}
                    >
                      <Text style={s.ctaBtnText}>{'\uD83D\uDDFA\uFE0F'} Search restaurants on Maps</Text>
                    </TouchableOpacity>
                  </>
                )}
                <View style={[s.infoBox, { backgroundColor: '#F5F2EE', marginTop: 16 }]}>
                  <Text style={[s.infoBoxText, { color: '#6B7280' }]}>
                    {`We’ll add it after ${stops[currentStopIndex]?.name ?? 'your current stop'}.`}
                    {' Tap \u2197 to open in Maps.'}
                  </Text>
                </View>
              </>
            )}
          </ResultView>
        )}

        {/* ── WEATHER VIEW ── */}
        {view === 'weather' && plan && !isStopContext && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyWeather}
            ctaLabel={applyingPlan ? 'Moving indoors…' : plan.swaps && plan.swaps.length > 0 ? 'Move indoors' : 'Got it'}
            ctaColor={plan.swaps && plan.swaps.length > 0 && !applyingPlan ? '#1A1F2E' : '#8A8FA8'}
          >
            {plan.swaps && plan.swaps.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>OUTDOOR STOPS TO MOVE INDOORS</Text>
                {plan.swaps.map((swap, idx) => {
                  const alt = weatherOptions[idx] ?? null;
                  return (
                    <View key={swap.from.id} style={s.swapRow}>
                      <View style={s.swapFrom}>
                        <Text style={[s.swapFromName, { textDecorationLine: 'line-through', color: '#8A8FA8' }]} numberOfLines={1}>
                          {swap.from.name}
                        </Text>
                        <Text style={s.swapFromMeta}>
                          {swap.from.stopType ?? 'Outdoor'}
                        </Text>
                      </View>
                      <Text style={s.swapArrow}>{'→'}</Text>
                      <View style={s.swapTo}>
                        {weatherLoading ? (
                          <Text style={[s.swapToName, { color: '#B0ADA8', fontStyle: 'italic' }]}>Finding indoor alternative…</Text>
                        ) : alt ? (
                          <>
                            <Text style={s.swapToName} numberOfLines={2}>{alt.name}</Text>
                            <Text style={s.swapToMeta}>{alt.stopType ?? 'Indoor'}</Text>
                          </>
                        ) : (
                          <Text style={[s.swapToName, { color: '#B0ADA8', fontStyle: 'italic' }]}>Indoor option nearby</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={s.centeredNote}>
                <Text style={s.centeredNoteText}>Your remaining stops are mostly indoors already — you're good!</Text>
              </View>
            )}
          </ResultView>
        )}

        {/* ── SKIP VIEW ── */}
        {view === 'skip' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel={applyingPlan ? 'Skipping…' : 'Skip today'}
            ctaColor={applyingPlan ? '#8A8FA8' : '#6B7280'}
            applyError={applyError}
          >
            {plan.keptStops && plan.keptStops.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>STOPS BEING SKIPPED</Text>
                {plan.keptStops.map(st => (
                  <View key={st.id} style={[s.keptRow, { opacity: 0.55 }]}>
                    <Text style={[s.keptCheck, { color: '#8A8FA8' }]}>{'\u2715'}</Text>
                    <Text style={[s.keptName, { textDecorationLine: 'line-through', color: '#8A8FA8' }]} numberOfLines={1}>
                      {st.name}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.centeredNote}>
                <Text style={s.centeredNoteText}>No stops left to skip!</Text>
              </View>
            )}
            <View style={[s.infoBox, { backgroundColor: '#F5F2EE', marginTop: 16 }]}>
              <Text style={[s.infoBoxText, { color: '#6B7280' }]}>
                All stops for today will be marked as skipped. You can re-add them from Trip Plan anytime.
              </Text>
            </View>
          </ResultView>
        )}

        {/* ── DONE VIEW ── */}
        {view === 'done' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel={applyingPlan ? 'Wrapping up…' : 'Wrap it up'}
            ctaColor={applyingPlan ? '#8A8FA8' : '#3DAA6E'}
            applyError={applyError}
          >
            {plan.keptStops && plan.keptStops.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>REMAINING STOPS (SAVED)</Text>
                {plan.keptStops.map(st => (
                  <View key={st.id} style={s.keptRow}>
                    <Text style={[s.keptCheck, { color: '#C4C8D8' }]}>{'\u25CB'}</Text>
                    <Text style={[s.keptName, { color: '#8A8FA8' }]} numberOfLines={1}>{st.name}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.centeredNote}>
                <Text style={s.centeredNoteText}>You've covered everything — great day!</Text>
              </View>
            )}
            <View style={[s.infoBox, { backgroundColor: '#E8F7EF', marginTop: 16 }]}>
              <Text style={[s.infoBoxText, { color: '#2D6A4F' }]}>
                Wrapping up takes you to the Day Complete screen.
              </Text>
            </View>
          </ResultView>
        )}

        {/* ── APPLIED VIEW ── */}
        {view === 'applied' && (
          <>
            <View style={s.appliedWrap}>
              <Text style={s.appliedEmoji}>{'\u2705'}</Text>
              <Text style={s.appliedTitle}>
                {plan?.type === 'fun' ? 'Stop swapped!' :
                 plan?.type === 'weather' ? 'Moved indoors!' :
                 plan?.type === 'tired' ? 'Day lightened!' :
                 plan?.type === 'late' ? 'Schedule tightened!' :
                 plan?.type === 'skip' ? 'Day skipped.' :
                 plan?.type === 'done' ? 'Wrapping up!' :
                 'Day adjusted!'}
              </Text>
              <Text style={s.appliedSub}>
                {plan?.type === 'fun'
                  ? swappedToName
                    ? lastSwapType === 'two_way'
                      ? `${swappedToName} is now on Day ${(dayIndex ?? 0) + 1}. ${selectedStopName || 'Original stop'} moved to another day.`
                      : `${selectedStopName || stops[currentStopIndex]?.name || 'Old stop'} removed. Head to ${swappedToName} instead — it's now on your list.`
                    : 'Your Today tab will refresh with the new stop.'
                  : plan?.type === 'weather'
                  ? 'Outdoor stops swapped for indoor alternatives. Your Today tab is updated.'
                  : plan?.type === 'late'
                  ? 'Use the trim guide above to recover time at each stop.'
                  : plan?.type === 'tired' && plan?.dropStop
                  ? `${plan.dropStop.name} removed from today. Rest of the day is yours.`
                  : 'Your Today tab reflects the changes.'}
              </Text>
            </View>
            <TouchableOpacity style={s.appliedBtn} activeOpacity={0.85} onPress={handleClose}>
              <Text style={s.appliedBtnText}>Got it {'—'} continue day</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* ── STOP PREVIEW PANEL — sibling of sheet so it's not clipped ── */}
      {previewItem != null && (
        <PreviewPanel
          stop={previewItem.stop}
          imageUrl={previewImageUrl}
          imageLoading={previewImageLoading}
          onClose={() => setPreviewItem(null)}
          onSwap={() => { setPreviewItem(null); previewItem.swapFn(); }}
        />
      )}
    </>
  );
}

// ─── Shared result-view wrapper ───────────────────────────────────────────────

// ─── Stop Preview Panel ───────────────────────────────────────────────────────

interface PreviewPanelProps {
  stop: LibraryStop | OtherDayStop;
  imageUrl: string | null;
  imageLoading: boolean;
  onClose: () => void;
  onSwap: () => void;
}

function PreviewPanel({ stop, imageUrl, imageLoading, onClose, onSwap }: PreviewPanelProps) {
  const { height: screenH } = useWindowDimensions();
  // useSafeAreaInsets() can return 0 inside a RN Modal on iOS (separate window context).
  // Fall back to 34pt (home-indicator clearance) on iOS so the CTA is never hidden.
  const safeInsets = useSafeAreaInsets();
  const bottomSpace = Math.max(safeInsets.bottom, Platform.OS === 'ios' ? 34 : 16);
  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 99 }]} pointerEvents="box-none">
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
            <View style={s.previewPillRow}>
              {!!stop.stopType && (
                <View style={s.previewTypePill}>
                  <Text style={s.previewTypePillText}>
                    {(stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)).replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
              {'durationMinutes' in stop && stop.durationMinutes != null && (
                <View style={s.previewDurPill}>
                  <Text style={s.previewDurPillText}>{'\u23F1 '}{stop.durationMinutes}{' min'}</Text>
                </View>
              )}
              {'dayIndex' in stop && (
                <View style={s.previewDurPill}>
                  <Text style={s.previewDurPillText}>{'Day ' + (stop.dayIndex + 1)}</Text>
                </View>
              )}
            </View>
            {'description' in stop && !!stop.description && (
              <View style={s.previewDescBox}>
                <Text style={s.previewDescLabel}>WHY KIDS LOVE IT</Text>
                <Text style={s.previewDescText}>{stop.description}</Text>
              </View>
            )}
            {'address' in stop && !!stop.address && (
              <View style={s.previewAddrBox}>
                <Text style={s.previewAddrText}>{stop.address}</Text>
              </View>
            )}
          </View>
        </ScrollView>
        <TouchableOpacity style={s.previewSwapBtn} activeOpacity={0.85} onPress={onSwap}>
          <Text style={s.previewSwapBtnText}>{'Swap this stop \u2192'}</Text>
        </TouchableOpacity>
        <View style={{ height: bottomSpace }} />
      </View>
    </View>
  );
}

interface ResultViewProps {
  plan: RescuePlan;
  onBack: () => void;
  onApply: () => void;
  ctaLabel: string;
  ctaColor?: string;
  headerColor?: string;
  ctaDisabled?: boolean;
  applyError?: string | null;
  children: React.ReactNode;
}

function ResultView({ plan, onBack, onApply, ctaLabel, ctaColor = '#E8692A', headerColor = '#1A1F2E', ctaDisabled, applyError, children }: ResultViewProps) {
  return (
    <>
      <View style={s.resultHeader}>
        <Text style={[s.resultTitle, { color: headerColor }]}>{plan.headline}</Text>
        <Text style={s.resultBody}>{plan.body}</Text>
      </View>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {applyError && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
          <Text style={{ fontSize: 13, color: '#C0392B', fontFamily: F.regular, textAlign: 'center' }}>{applyError}</Text>
        </View>
      )}
      <View style={s.resultFooter}>
        <TouchableOpacity style={s.goBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.goBackText}>Go back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: ctaColor, flex: 1, opacity: ctaDisabled ? 0.45 : 1 }]}
          activeOpacity={ctaDisabled ? 1 : 0.85}
          onPress={ctaDisabled ? undefined : onApply}
          disabled={ctaDisabled}
        >
          <Text style={s.ctaBtnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,18,30,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    flexDirection: 'column',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: '#D0CCC6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.10)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1F2E', fontFamily: F.bold },
  headerSub:   { fontSize: 13, color: '#8A8FA8', marginTop: 2, fontFamily: F.regular },

  scroll: { flex: 1, flexShrink: 1 },

  // ── Picker: tile grid ──
  pickerContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tile: {
    width: '47%',
    backgroundColor: '#F5F2EE',
    borderWidth: 1.5, borderColor: 'transparent',
    borderRadius: 18, padding: 16, gap: 5,
  },
  tileIcon:  { fontSize: 26, marginBottom: 2 },
  tileTitle: { fontSize: 14, fontWeight: '800', color: '#1A1F2E', lineHeight: 19, fontFamily: F.bold },
  tileSub:   { fontSize: 12, color: '#8A8FA8', fontWeight: '500', lineHeight: 17, fontFamily: F.medium },

  // ── Picker: secondary rows ──
  moreLabel: {
    fontSize: 10, fontWeight: '700', color: '#8A8FA8',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, fontFamily: F.bold,
  },
  secRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 12, paddingHorizontal: 15,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 8,
    shadowColor: '#1A1F2E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  secIcon:    { fontSize: 20 },
  secText:    { flex: 1 },
  secTitle:   { fontSize: 13, fontWeight: '800', color: '#1A1F2E', fontFamily: F.bold },
  secSub:     { fontSize: 12, color: '#8A8FA8', fontWeight: '500', fontFamily: F.medium },
  secChevron: { color: '#D1D5E0', fontSize: 18 },

  // ── Result header ──
  resultHeader: {
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.10)',
  },
  resultTitle: { fontSize: 18, fontWeight: '800', fontFamily: F.bold, marginBottom: 4 },
  resultBody:  { fontSize: 13, color: '#8A8FA8', fontFamily: F.regular, lineHeight: 18 },

  // ── Result footer ──
  resultFooter: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(26,31,46,0.08)',
  },
  goBackBtn: {
    backgroundColor: '#F5F2EE', borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  goBackText: { fontSize: 14, fontWeight: '700', color: '#8A8FA8', fontFamily: F.bold },
  ctaBtn:     { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', fontFamily: F.bold },

  // ── Section label ──
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#B0ADA8',
    letterSpacing: 0.8, fontFamily: F.bold,
    marginTop: 16, marginBottom: 8,
  },

  // ── Stop card ──
  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F2EE', borderRadius: 12, padding: 14,
  },
  stopDot:      { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  stopCardText: { flex: 1 },
  stopCardName: { fontSize: 14, fontWeight: '600', color: '#1A1F2E', fontFamily: F.semibold },
  stopCardMeta: { fontSize: 12, color: '#8A8FA8', marginTop: 2, fontFamily: F.regular },

  savingPill: {
    alignSelf: 'flex-start', backgroundColor: '#E8F7EF',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10,
  },
  savingPillText: { fontSize: 12, fontWeight: '600', color: '#2D6A4F', fontFamily: F.semibold },

  keptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.07)',
  },
  keptCheck: { fontSize: 13, color: '#3DAA6E', fontWeight: '700', fontFamily: F.bold, width: 16 },
  keptName:  { flex: 1, fontSize: 13, color: '#1A1F2E', fontFamily: F.regular },

  // ── Late: trim rows ──
  trimRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.07)',
    gap: 12,
  },
  trimLeft:     { flex: 1 },
  trimRight:    { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  trimStopName: { fontSize: 13, fontWeight: '600', color: '#1A1F2E', fontFamily: F.semibold, marginBottom: 3 },
  trimNote:     { fontSize: 12, color: '#8A8FA8', fontFamily: F.regular, lineHeight: 17 },
  trimFrom:     { fontSize: 12, color: '#B0ADA8', fontFamily: F.regular, textDecorationLine: 'line-through' },
  trimArrow:    { fontSize: 12, color: '#8A8FA8' },
  trimTo:       { fontSize: 12, fontWeight: '700', color: '#E8692A', fontFamily: F.bold },
  trimNoChange: { fontSize: 12, color: '#C4C8D8', fontFamily: F.regular },
  protectedBadge: {
    backgroundColor: '#EEF5F2', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  protectedBadgeText: { fontSize: 11, fontWeight: '600', color: '#3D7A60', fontFamily: F.semibold },

  // ── Swap grid (fun view) ──
  swapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swapCard: {
    width: '47%', backgroundColor: '#F5F2EE',
    borderRadius: 16, padding: 14, gap: 4,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  swapCardSelected: {
    borderColor: '#E8692A', backgroundColor: '#FDF0E9',
  },
  swapCardIcon: { fontSize: 24, marginBottom: 2 },
  swapCardName: { fontSize: 13, fontWeight: '700', color: '#1A1F2E', fontFamily: F.bold, lineHeight: 18 },
  swapCardMeta: { fontSize: 11, color: '#8A8FA8', fontFamily: F.regular, textTransform: 'capitalize' },
  swapCardCta:  { fontSize: 12, fontWeight: '600', color: '#E8692A', fontFamily: F.semibold },
  swapCardCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  swapRowActions: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 0 },
  previewCtaMuted: { fontSize: 12, fontWeight: '600', color: '#B0ADA8', fontFamily: F.semibold },

  // ── Food rows ──
  foodCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 13, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#1A1F2E', shadowRadius: 12, shadowOpacity: 0.08, elevation: 2,
  },
  foodCardSelected: { borderColor: '#E8692A', backgroundColor: '#FDF0E9' },
  foodCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  foodCardThumb: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F2EE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  foodCardIcon:    { fontSize: 22 },
  foodCardInfo:    { flex: 1 },
  foodCardName:    { fontSize: 14, fontWeight: '700', color: '#1A1F2E', fontFamily: F.bold },
  foodCardMeta:    { fontSize: 12, color: '#8A8FA8', marginTop: 2, fontFamily: F.regular, textTransform: 'capitalize' },
  foodCardMapBtn:  { padding: 2 },
  foodCardMapIcon: { fontSize: 18 },
  foodCardBtns:    { flexDirection: 'row', gap: 8 },
  foodCardPreviewBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8692A', alignItems: 'center' },
  foodCardPreviewText: { fontSize: 13, fontFamily: F.bold, color: '#E8692A' },
  foodCardAddBtn:  { flex: 1.5, backgroundColor: 'rgba(26,31,46,0.06)', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  foodCardAddBtnSelected: { backgroundColor: '#3DAA6E' },
  foodCardAddText: { fontSize: 13, fontFamily: F.bold, color: '#1A1F2E' },
  foodCardAddTextSelected: { color: '#fff' },

  // ── Weather swap rows ──
  swapRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.08)',
  },
  swapFrom:     { flex: 1 },
  swapFromName: { fontSize: 13, fontWeight: '600', color: '#1A1F2E', fontFamily: F.semibold },
  swapFromMeta: { fontSize: 11, color: '#B0ADA8', fontFamily: F.regular, textTransform: 'capitalize', marginTop: 2 },
  swapArrow:    { fontSize: 16, color: '#C4C8D8', paddingHorizontal: 4 },
  swapTo:       { flex: 1 },
  swapToName:   { fontSize: 13, fontWeight: '600', color: '#1A1F2E', fontFamily: F.semibold },
  swapToMeta:   { fontSize: 11, color: '#B0ADA8', fontFamily: F.regular, textTransform: 'capitalize', marginTop: 2 },

  // ── Info box ──
  infoBox: {
    borderRadius: 12, padding: 14,
  },
  infoBoxText: { fontSize: 13, fontFamily: F.regular, lineHeight: 19 },

  // ── Need-recs (stop context) ──
  needRecCard:    { backgroundColor: '#F5F2EE', borderRadius: 16, padding: 16, marginBottom: 12 },
  needRecName:    { fontSize: 15, fontWeight: '800', color: '#1A1F2E', fontFamily: F.bold, marginBottom: 4 },
  needRecDesc:    { fontSize: 13, color: '#8A8FA8', fontFamily: F.regular, lineHeight: 18, marginBottom: 4 },
  needRecMeta:    { fontSize: 12, fontWeight: '600', color: '#E8692A', fontFamily: F.semibold, marginBottom: 12 },
  needRecActions: { flexDirection: 'row', gap: 8 },
  needRecAddBtn:  { flex: 1, backgroundColor: '#E8692A', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  needRecSwapBtn: { flex: 1, backgroundColor: '#1A1F2E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  needRecBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: F.bold },

  // ── Stop select rows (swap step 1) ──
  stopSelectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12, padding: 13, marginBottom: 8,
    shadowColor: '#1A1F2E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  stopNumBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#F5F2EE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopNumText: { fontSize: 12, fontWeight: '800', color: '#8A8FA8', fontFamily: F.bold },
  stopSelectName: { fontSize: 14, fontWeight: '700', color: '#1A1F2E', fontFamily: F.bold },
  stopSelectMeta: { fontSize: 12, color: '#8A8FA8', marginTop: 1, fontFamily: F.regular, textTransform: 'capitalize' },
  swapArrowCta: { fontSize: 12, fontWeight: '700', color: '#E8692A', fontFamily: F.bold, flexShrink: 0 },

  // ── Swapping out banner (swap step 2) ──
  swappingOutBanner: {
    backgroundColor: '#FDF0E9',
    borderWidth: 1, borderColor: 'rgba(232,105,42,0.2)',
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  swappingOutLabel: {
    fontSize: 10, fontWeight: '700', color: '#E8692A',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 2, fontFamily: F.bold,
  },
  swappingOutName: { fontSize: 15, fontWeight: '800', color: '#1A1F2E', fontFamily: F.bold },

  // ── Other day rows (swap step 2) ──
  otherDayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8,
    shadowColor: '#1A1F2E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  otherDayThumb: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F5F2EE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sectionDivider: {
    height: 1, backgroundColor: 'rgba(26,31,46,0.08)',
    marginVertical: 12,
  },

  // ── Centered note ──
  centeredNote: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8 },
  centeredNoteText: { fontSize: 14, color: '#8A8FA8', textAlign: 'center', lineHeight: 21, fontFamily: F.regular },

  // ── Applied ──
  appliedWrap: {
    alignItems: 'center', paddingTop: 40, paddingBottom: 24, paddingHorizontal: 24,
  },
  appliedEmoji: { fontSize: 52, marginBottom: 14 },
  appliedTitle: {
    fontSize: 22, fontWeight: '900', color: '#1A1F2E',
    marginBottom: 8, textAlign: 'center',
    fontFamily: F.serif,
  },
  appliedSub: {
    fontSize: 14, color: '#8A8FA8', fontWeight: '500',
    lineHeight: 21, textAlign: 'center',
    fontFamily: F.medium,
  },
  appliedBtn: {
    marginHorizontal: 16, marginTop: 4,
    backgroundColor: '#E8692A', borderRadius: 16, padding: 16,
    alignItems: 'center',
    shadowColor: '#E8692A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  appliedBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', fontFamily: F.bold },

  // ── Stop preview panel ──
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
  previewDurPill: {
    backgroundColor: '#F5F2EE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  previewDurPillText: { fontSize: 12, color: '#8A8FA8', fontFamily: F.regular },
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
