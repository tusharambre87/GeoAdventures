import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
}

type Context = 'morning' | 'en_route' | 'stop_complete';
type SheetView = 'picker' | RescueOptionId | 'applied';

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
}: Props) {
  const insets = useSafeAreaInsets();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(700)).current;

  const [view, setView] = useState<SheetView>('picker');
  const [plan, setPlan] = useState<RescuePlan | null>(null);

  // Swap / fun
  const [swapOptions, setSwapOptions] = useState<LibraryStop[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError]     = useState<string | null>(null);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);

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

  useEffect(() => {
    if (visible) {
      setView('picker');
      setPlan(null);
      setSwapOptions([]);
      setSwapError(null);
      setSelectedSwapId(null);
      setFoodOptions([]);
      setFoodError(null);
      setWeatherOptions([]);
      setApplyingPlan(false);
      setSwappedToName(null);
      setApplyError(null);
      setSelectedFoodId(null);
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

  // Load swap options when fun view opens
  useEffect(() => {
    if (view !== 'fun' || !tripId) return;
    setSwapLoading(true);
    setSwapError(null);
    const swapStop = stops[currentStopIndex];
    apiFetch<{ options: LibraryStop[] }>('/api/travel/rescue/swap-options', {
      method: 'POST',
      body: JSON.stringify({ tripId, dayIndex: dayIndex ?? 0, swapStopId: swapStop?.id }),
    }).then(r => {
      setSwapOptions(r.options ?? []);
    }).catch(() => {
      setSwapError('Could not load options. Check your connection.');
    }).finally(() => setSwapLoading(false));
  }, [view]);

  // Load food options when food view opens
  useEffect(() => {
    if (view !== 'food' || !tripId) return;
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

  // Load indoor alternatives when weather view opens
  useEffect(() => {
    if (view !== 'weather' || !tripId) return;
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

  function selectOption(id: RescueOptionId) {
    if (id === 'sick') {
      handleClose();
      setTimeout(() => router.push('/atstop/sos' as never), 300);
      return;
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

  async function applySwap() {
    const chosen = swapOptions.find(o => o.id === selectedSwapId);
    if (!chosen) return;
    const fromStop = stops[currentStopIndex];
    setSwappedToName(chosen.name);
    if (tripId && fromStop) {
      setApplyingPlan(true);
      try {
        await apiFetch('/api/travel/rescue/apply-swap', {
          method: 'POST',
          body: JSON.stringify({
            tripId,
            fromStopId: fromStop.id,
            toLibraryStopId: chosen.id,
            dayIndex: dayIndex ?? 0,
          }),
        });
        onStopsChanged?.();
      } catch { /* best-effort — plan still shown */ }
      setApplyingPlan(false);
    }
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

  const { primary, secondary } = getOptions(context);

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: sheetAnim }] }]}
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
                      {' \u2014 lowest importance'}
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
                          <Text style={s.trimArrow}>{'\u2192'}</Text>
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

        {/* ── SWAP / FUN VIEW ── */}
        {view === 'fun' && plan && (
          <ResultView
            plan={plan}
            onBack={() => { setView('picker'); setSelectedSwapId(null); }}
            onApply={applySwap}
            ctaLabel={applyingPlan ? 'Swapping…' : selectedSwapId
              ? `Swap in ${swapOptions.find(o => o.id === selectedSwapId)?.name ?? ''} \u2192`
              : 'Select a stop below'}
            ctaColor={selectedSwapId && !applyingPlan ? '#E8692A' : '#C4C8D8'}
          >
            {swapLoading ? (
              <View style={s.centeredNote}>
                <ActivityIndicator color="#E8692A" />
                <Text style={[s.centeredNoteText, { marginTop: 10 }]}>Finding alternatives…</Text>
              </View>
            ) : swapError ? (
              <View style={s.centeredNote}>
                <Text style={[s.centeredNoteText, { color: '#C0392B' }]}>{swapError}</Text>
              </View>
            ) : swapOptions.length === 0 ? (
              <View style={s.centeredNote}>
                <Text style={s.centeredNoteText}>No swap options found for your city. Head to Discover to explore more.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionLabel}>PICK AN ALTERNATIVE</Text>
                <View style={s.swapGrid}>
                  {swapOptions.slice(0, 6).map(opt => {
                    const selected = opt.id === selectedSwapId;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[s.swapCard, selected && s.swapCardSelected]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedSwapId(opt.id === selectedSwapId ? null : opt.id)}
                      >
                        <Text style={s.swapCardIcon}>{stopEmoji(opt.stopType)}</Text>
                        <Text style={s.swapCardName} numberOfLines={2}>{opt.name}</Text>
                        <Text style={s.swapCardMeta} numberOfLines={1}>
                          {opt.stopType ?? 'attraction'}
                        </Text>
                        <Text style={[s.swapCardCta, selected && { color: '#E8692A' }]}>
                          {selected ? '\u2713 Selected' : 'Swap in \u2192'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ResultView>
        )}

        {/* ── FOOD VIEW ── */}
        {view === 'food' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={() => setView('applied')}
            ctaLabel={selectedFoodId
              ? `Add ${mealLabel} stop \u2192 ${foodOptions.find(o => o.id === selectedFoodId)?.name ?? ''}`
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
                        <TouchableOpacity
                          key={opt.id}
                          style={[s.foodRow, isSelected && s.foodRowSelected]}
                          activeOpacity={0.75}
                          onPress={() => setSelectedFoodId(opt.id === selectedFoodId ? null : opt.id)}
                        >
                          <Text style={s.foodRowIcon}>{stopEmoji(opt.stopType)}</Text>
                          <View style={s.foodRowText}>
                            <Text style={[s.foodRowName, isSelected && { color: '#E8692A' }]} numberOfLines={1}>{opt.name}</Text>
                            <Text style={s.foodRowMeta} numberOfLines={1}>
                              {opt.stopType ?? 'restaurant'}
                              {opt.address ? ` \u00B7 ${opt.address}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            onPress={e => {
                              e.stopPropagation();
                              const q = encodeURIComponent(`${opt.name} ${opt.city ?? foodCity}`);
                              Linking.openURL(`https://maps.google.com/?q=${q}`);
                            }}
                          >
                            <Text style={s.foodRowMap}>{'\u2197\uFE0F'}</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
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
                    {`We\u2019ll add it after ${stops[currentStopIndex]?.name ?? 'your current stop'}.`}
                    {' Tap \u2197 to open in Maps.'}
                  </Text>
                </View>
              </>
            )}
          </ResultView>
        )}

        {/* ── WEATHER VIEW ── */}
        {view === 'weather' && plan && (
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
                      <Text style={s.swapArrow}>{'\u2192'}</Text>
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
                    ? `${stops[currentStopIndex]?.name ?? 'Old stop'} removed. Head to ${swappedToName} instead — it's now on your list.`
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
              <Text style={s.appliedBtnText}>Got it {'\u2014'} continue day</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Shared result-view wrapper ───────────────────────────────────────────────

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
  swapCardCta:  { fontSize: 12, fontWeight: '600', color: '#8A8FA8', fontFamily: F.semibold, marginTop: 6 },

  // ── Food rows ──
  foodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 10, marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.07)',
  },
  foodRowSelected: {
    backgroundColor: 'rgba(232,105,42,0.08)',
    borderBottomColor: 'rgba(232,105,42,0.2)',
  },
  foodRowIcon: { fontSize: 22 },
  foodRowText: { flex: 1 },
  foodRowName: { fontSize: 14, fontWeight: '600', color: '#1A1F2E', fontFamily: F.semibold },
  foodRowMeta: { fontSize: 12, color: '#8A8FA8', marginTop: 2, fontFamily: F.regular, textTransform: 'capitalize' },
  foodRowMap:  { fontSize: 18, color: '#8A8FA8' },

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
});
