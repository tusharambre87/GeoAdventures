import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '@/lib/tokens';
import {
  computeDoneForDay,
  computeLateDay,
  computeSickDay,
  computeSkipDay,
  computeTiredDay,
  computeWeatherDay,
  getOptions,
  type RescueOptionId,
  type RescuePlan,
  type StopLike,
} from '@/lib/rescueEngine';

type Context = 'morning' | 'en_route' | 'stop_complete';
type SheetView = 'picker' | RescueOptionId | 'applied';

interface Props {
  visible: boolean;
  onClose: () => void;
  context: Context;
  stops: StopLike[];
  currentStopIndex: number;
  onDropStop?: (stopId: string) => void;
  onWrapDay?: () => void;
}

export default function RescueSheet({
  visible,
  onClose,
  context,
  stops,
  currentStopIndex,
  onDropStop,
  onWrapDay,
}: Props) {
  const insets = useSafeAreaInsets();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(700)).current;

  const [view,  setView]  = useState<SheetView>('picker');
  const [plan,  setPlan]  = useState<RescuePlan | null>(null);
  const [appliedLabel, setAppliedLabel] = useState('');

  useEffect(() => {
    if (visible) {
      setView('picker');
      setPlan(null);
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

  function handleClose() {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.spring(sheetAnim,   { toValue: 700, damping: 26, stiffness: 220, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onClose(); });
  }

  function selectOption(id: RescueOptionId) {
    let computed: RescuePlan;
    switch (id) {
      case 'tired':   computed = computeTiredDay(stops, currentStopIndex); break;
      case 'late':    computed = computeLateDay(stops, currentStopIndex);  break;
      case 'weather': computed = computeWeatherDay(stops, currentStopIndex); break;
      case 'sick':    computed = computeSickDay(); break;
      case 'skip':    computed = computeSkipDay(stops, currentStopIndex);  break;
      case 'done':    computed = computeDoneForDay(stops, currentStopIndex); break;
    }
    setPlan(computed);
    setView(id);
  }

  function applyPlan() {
    if (!plan) return;
    let label = 'Changes applied';
    switch (plan.type) {
      case 'tired':
      case 'late':
        if (plan.dropStop) {
          onDropStop?.(plan.dropStop.id);
          label = `\u201C${plan.dropStop.name}\u201D removed`;
        }
        break;
      case 'weather':
        label = 'Outdoor stops flagged for swaps';
        break;
      case 'sick':
        label = 'Rest day marked';
        break;
      case 'skip':
        label = 'Day skipped';
        break;
      case 'done':
        onWrapDay?.();
        label = 'Day wrapped up';
        break;
    }
    setAppliedLabel(label);
    setView('applied');
  }

  const options = getOptions(context);

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[s.sheet, { paddingBottom: insets.bottom + 20, transform: [{ translateY: sheetAnim }] }]}
      >
        {/* Handle */}
        <View style={s.handle} />

        {/* ── PICKER VIEW ── */}
        {view === 'picker' && (
          <>
            <View style={s.header}>
              <Text style={s.headerTitle}>Day not going to plan?</Text>
              <Text style={s.headerSub}>What\u2019s going on?</Text>
            </View>
            <ScrollView
              style={s.scroll}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {options.map((opt, i) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[s.optionRow, i < options.length - 1 && s.optionBorder]}
                  activeOpacity={0.75}
                  onPress={() => selectOption(opt.id)}
                >
                  <View style={s.optionIconWrap}>
                    <Text style={s.optionIcon}>{opt.emoji}</Text>
                  </View>
                  <View style={s.optionText}>
                    <Text style={s.optionLabel}>{opt.label}</Text>
                    <Text style={s.optionSub}>{opt.sub}</Text>
                  </View>
                  <Text style={s.optionChevron}>{'\u203A'}</Text>
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
            ctaLabel={plan.dropStop ? `Drop \u201C${plan.dropStop.name}\u201D` : 'Apply'}
          >
            {plan.dropStop && (
              <>
                <Text style={s.resultSectionLabel}>DROPPING THIS STOP</Text>
                <View style={s.stopCard}>
                  <View style={[s.stopDot, { backgroundColor: '#E8693A' }]} />
                  <View style={s.stopCardText}>
                    <Text style={s.stopCardName}>{plan.dropStop.name}</Text>
                    <Text style={s.stopCardMeta}>
                      {plan.dropStop.stopType
                        ? plan.dropStop.stopType.charAt(0).toUpperCase() + plan.dropStop.stopType.slice(1)
                        : 'Stop'}
                      {plan.dropStop.durationMinutes ? ` \u00B7 ${plan.dropStop.durationMinutes} min` : ''}
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
                    <Text style={[s.resultSectionLabel, { marginTop: 20 }]}>KEEPING</Text>
                    {plan.keptStops.map(st => (
                      <View key={st.id} style={s.keptRow}>
                        <Text style={s.keptCheck}>{'\u2713'}</Text>
                        <Text style={s.keptName} numberOfLines={1}>{st.name}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </ResultView>
        )}

        {/* ── LATE VIEW ── */}
        {view === 'late' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel={plan.dropStop ? `Cut \u201C${plan.dropStop.name}\u201D` : 'Apply'}
          >
            {plan.dropStop && (
              <>
                <Text style={s.resultSectionLabel}>CUTTING THIS STOP</Text>
                <View style={s.stopCard}>
                  <View style={[s.stopDot, { backgroundColor: '#F5A623' }]} />
                  <View style={s.stopCardText}>
                    <Text style={s.stopCardName}>{plan.dropStop.name}</Text>
                    <Text style={s.stopCardMeta}>
                      {plan.dropStop.travelMinsFromPrevious
                        ? `${plan.dropStop.travelMinsFromPrevious} min away`
                        : 'Furthest stop'}
                      {plan.dropStop.durationMinutes ? ` \u00B7 ${plan.dropStop.durationMinutes} min visit` : ''}
                    </Text>
                  </View>
                </View>
                {plan.timeSavedMins != null && (
                  <View style={s.savingPill}>
                    <Text style={s.savingPillText}>{'\u23F1'} Recovers ~{plan.timeSavedMins} min</Text>
                  </View>
                )}
                {plan.keptStops && plan.keptStops.length > 0 && (
                  <>
                    <Text style={[s.resultSectionLabel, { marginTop: 20 }]}>KEEPING</Text>
                    {plan.keptStops.map(st => (
                      <View key={st.id} style={s.keptRow}>
                        <Text style={s.keptCheck}>{'\u2713'}</Text>
                        <Text style={s.keptName} numberOfLines={1}>{st.name}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </ResultView>
        )}

        {/* ── WEATHER VIEW ── */}
        {view === 'weather' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel={plan.swaps && plan.swaps.length > 0 ? 'Move indoors \u2192' : 'Got it'}
          >
            {plan.swaps && plan.swaps.length > 0 ? (
              <>
                <Text style={s.resultSectionLabel}>OUTDOOR STOPS TO SWAP</Text>
                {plan.swaps.map(swap => (
                  <View key={swap.from.id} style={s.swapRow}>
                    <View style={s.swapFrom}>
                      <Text style={s.swapFromName} numberOfLines={1}>{swap.from.name}</Text>
                      <Text style={s.swapFromMeta}>
                        {swap.from.stopType
                          ? swap.from.stopType.charAt(0).toUpperCase() + swap.from.stopType.slice(1)
                          : 'Outdoor'}
                      </Text>
                    </View>
                    <Text style={s.swapArrow}>{'\u2192'}</Text>
                    <View style={s.swapTo}>
                      <Text style={s.swapToName} numberOfLines={2}>{swap.toLabel}</Text>
                      <Text style={s.swapToMeta}>Suggested swap</Text>
                    </View>
                  </View>
                ))}
                <Text style={s.swapNote}>
                  {'\uD83D\uDCA1'} Indoor suggestions are a starting point \u2014 you choose what fits best.
                </Text>
              </>
            ) : (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>{'\uD83C\uDF7A'}</Text>
                <Text style={s.emptyText}>Your remaining stops are mostly indoors already \u2014 you\u2019re good!</Text>
              </View>
            )}
          </ResultView>
        )}

        {/* ── SICK VIEW ── */}
        {view === 'sick' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel="Mark as rest day \u2192"
            ctaColor="#7A9E8E"
          >
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>{'\uD83E\uDD12'}</Text>
              <Text style={s.sickBody}>
                Everyone deserves a break. Mark today as a rest day and your itinerary will be ready when you feel better.
              </Text>
            </View>
            <View style={[s.infoBox, { backgroundColor: '#EEF5F2' }]}>
              <Text style={[s.infoBoxText, { color: '#3D7A60' }]}>
                {'\u2139\uFE0F'}{'  '}Your stops stay saved and can be revisited on any day of the trip.
              </Text>
            </View>
          </ResultView>
        )}

        {/* ── SKIP VIEW ── */}
        {view === 'skip' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel="Skip today \u2192"
            ctaColor="#8A8FA8"
          >
            {plan.keptStops && plan.keptStops.length > 0 ? (
              <>
                <Text style={s.resultSectionLabel}>STOPS THAT WILL BE SKIPPED</Text>
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
              <View style={s.emptyWrap}>
                <Text style={s.emptyText}>No stops left to skip \u2014 you\u2019re already done!</Text>
              </View>
            )}
            <View style={[s.infoBox, { backgroundColor: '#FEF2F1', marginTop: 16 }]}>
              <Text style={[s.infoBoxText, { color: '#C0392B' }]}>
                {'\u26A0\uFE0F'}{'  '}This will mark the whole day as skipped. This can\u2019t be undone from the app.
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
            ctaLabel="Wrap it up \u2192"
            ctaColor="#3DAA6E"
          >
            {plan.keptStops && plan.keptStops.length > 0 ? (
              <>
                <Text style={s.resultSectionLabel}>REMAINING STOPS (SAVED)</Text>
                {plan.keptStops.map(st => (
                  <View key={st.id} style={s.keptRow}>
                    <Text style={[s.keptCheck, { color: '#B0ADA8' }]}>{'\u25CB'}</Text>
                    <Text style={[s.keptName, { color: '#8A8FA8' }]} numberOfLines={1}>{st.name}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>{'\uD83C\uDFC1'}</Text>
                <Text style={s.emptyText}>You\u2019ve covered everything \u2014 great day!</Text>
              </View>
            )}
            <View style={[s.infoBox, { backgroundColor: '#E8F7EF', marginTop: 16 }]}>
              <Text style={[s.infoBoxText, { color: '#2D6A4F' }]}>
                {'\u2139\uFE0F'}{'  '}Wrapping up will take you to the Day Complete screen.
              </Text>
            </View>
          </ResultView>
        )}

        {/* ── APPLIED VIEW ── */}
        {view === 'applied' && (
          <View style={s.appliedWrap}>
            <View style={s.appliedIconCircle}>
              <Text style={s.appliedIcon}>{'\u2713'}</Text>
            </View>
            <Text style={s.appliedTitle}>{appliedLabel}</Text>
            <Text style={s.appliedSub}>Your plan has been updated.</Text>
            <TouchableOpacity style={s.appliedBtn} activeOpacity={0.85} onPress={handleClose}>
              <Text style={s.appliedBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
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
  children: React.ReactNode;
}

function ResultView({ plan, onBack, onApply, ctaLabel, ctaColor = '#E8692A', children }: ResultViewProps) {
  return (
    <>
      {/* Result header */}
      <View style={s.resultHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={12} activeOpacity={0.7}>
          <Text style={s.backBtnText}>{'\u2039'} Back</Text>
        </TouchableOpacity>
        <Text style={s.resultTitle}>{plan.headline}</Text>
        <Text style={s.resultBody}>{plan.body}</Text>
      </View>

      {/* Scrollable result content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {/* CTA */}
      <TouchableOpacity
        style={[s.cta, { backgroundColor: ctaColor }]}
        activeOpacity={0.85}
        onPress={onApply}
      >
        <Text style={s.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
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
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    flexDirection: 'column',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D0CCC6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // ── Picker ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.10)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1F2E',
    fontFamily: F.bold,
  },
  headerSub: {
    fontSize: 13,
    color: '#8A8FA8',
    marginTop: 2,
    fontFamily: F.regular,
  },
  scroll: {
    flex: 1,
    flexShrink: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.08)',
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F2E',
    fontFamily: F.semibold,
  },
  optionSub: {
    fontSize: 12,
    color: '#8A8FA8',
    marginTop: 2,
    fontFamily: F.regular,
  },
  optionChevron: {
    fontSize: 20,
    color: '#C4C8D8',
    fontFamily: F.regular,
  },

  // ── Result header ──
  resultHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.10)',
  },
  backBtn: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: 14,
    color: '#E8692A',
    fontWeight: '600',
    fontFamily: F.semibold,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1F2E',
    fontFamily: F.bold,
    marginBottom: 4,
  },
  resultBody: {
    fontSize: 13,
    color: '#8A8FA8',
    fontFamily: F.regular,
    lineHeight: 18,
  },

  // ── Stop card (tired / late) ──
  resultSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0ADA8',
    letterSpacing: 0.8,
    fontFamily: F.bold,
    marginTop: 18,
    marginBottom: 8,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F2EE',
    borderRadius: 12,
    padding: 14,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  stopCardText: {
    flex: 1,
  },
  stopCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F2E',
    fontFamily: F.semibold,
  },
  stopCardMeta: {
    fontSize: 12,
    color: '#8A8FA8',
    marginTop: 2,
    fontFamily: F.regular,
  },

  // ── Savings pill ──
  savingPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F7EF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
  },
  savingPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D6A4F',
    fontFamily: F.semibold,
  },

  // ── Kept stops list ──
  keptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.07)',
  },
  keptCheck: {
    fontSize: 13,
    color: '#3DAA6E',
    fontWeight: '700',
    fontFamily: F.bold,
    width: 16,
  },
  keptName: {
    flex: 1,
    fontSize: 13,
    color: '#1A1F2E',
    fontFamily: F.regular,
  },

  // ── Weather swaps ──
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.07)',
  },
  swapFrom: {
    flex: 1,
  },
  swapFromName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8FA8',
    textDecorationLine: 'line-through',
    fontFamily: F.semibold,
  },
  swapFromMeta: {
    fontSize: 11,
    color: '#B0ADA8',
    fontFamily: F.regular,
  },
  swapArrow: {
    fontSize: 16,
    color: '#C4C8D8',
  },
  swapTo: {
    flex: 1,
  },
  swapToName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1F2E',
    fontFamily: F.semibold,
  },
  swapToMeta: {
    fontSize: 11,
    color: '#8A8FA8',
    fontFamily: F.regular,
  },
  swapNote: {
    fontSize: 12,
    color: '#8A8FA8',
    fontFamily: F.regular,
    marginTop: 16,
    lineHeight: 17,
  },

  // ── Sick body ──
  sickBody: {
    fontSize: 14,
    color: '#1A1F2E',
    fontFamily: F.regular,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },

  // ── Info box ──
  infoBox: {
    borderRadius: 10,
    padding: 12,
  },
  infoBoxText: {
    fontSize: 12,
    fontFamily: F.regular,
    lineHeight: 17,
  },

  // ── Empty / centered ──
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8A8FA8',
    fontFamily: F.regular,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── CTA ──
  cta: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: F.bold,
  },

  // ── Applied ──
  appliedWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  appliedIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  appliedIcon: {
    fontSize: 32,
    color: '#3DAA6E',
    fontWeight: '700',
  },
  appliedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1F2E',
    fontFamily: F.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  appliedSub: {
    fontSize: 14,
    color: '#8A8FA8',
    fontFamily: F.regular,
    textAlign: 'center',
    marginBottom: 32,
  },
  appliedBtn: {
    backgroundColor: '#F5F2EE',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  appliedBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1F2E',
    fontFamily: F.semibold,
  },
});
