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
  computeFoodStop,
  computeFunDay,
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

  const [view, setView] = useState<SheetView>('picker');
  const [plan, setPlan] = useState<RescuePlan | null>(null);

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
      case 'tired':   computed = computeTiredDay(stops, currentStopIndex);   break;
      case 'late':    computed = computeLateDay(stops, currentStopIndex);    break;
      case 'weather': computed = computeWeatherDay(stops, currentStopIndex); break;
      case 'sick':    computed = computeSickDay();                           break;
      case 'skip':    computed = computeSkipDay(stops, currentStopIndex);   break;
      case 'done':    computed = computeDoneForDay(stops, currentStopIndex); break;
      case 'fun':     computed = computeFunDay(stops, currentStopIndex);    break;
      case 'food':    computed = computeFoodStop();                          break;
    }
    setPlan(computed);
    setView(id);
  }

  function applyPlan() {
    if (!plan) return;
    if ((plan.type === 'tired' || plan.type === 'late') && plan.dropStop) {
      onDropStop?.(plan.dropStop.id);
    }
    if (plan.type === 'done') {
      onWrapDay?.();
    }
    setView('applied');
  }

  const { primary, secondary } = getOptions(context);

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
              <Text style={s.headerSub}>What's going on?</Text>
            </View>
            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.pickerContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Zone 1 — 2x2 tile grid */}
              <View style={s.tileGrid}>
                {primary.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={s.tile}
                    activeOpacity={0.75}
                    onPress={() => selectOption(opt.id)}
                  >
                    <Text style={s.tileIcon}>{opt.icon}</Text>
                    <Text style={s.tileTitle}>{opt.title}</Text>
                    <Text style={s.tileSub}>{opt.subtitle}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Zone 2 — secondary list rows */}
              <Text style={s.moreLabel}>More options</Text>
              {secondary.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={s.secRow}
                  activeOpacity={0.75}
                  onPress={() => selectOption(opt.id)}
                >
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
            ctaLabel={plan.dropStop ? `Drop "${plan.dropStop.name}"` : 'Apply'}
          >
            {plan.dropStop && (
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
            )}
          </ResultView>
        )}

        {/* ── LATE VIEW ── */}
        {view === 'late' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel={plan.dropStop ? `Cut "${plan.dropStop.name}"` : 'Apply'}
          >
            {plan.dropStop && (
              <>
                <Text style={s.sectionLabel}>CUTTING THIS STOP</Text>
                <View style={s.stopCard}>
                  <View style={[s.stopDot, { backgroundColor: '#F5A623' }]} />
                  <View style={s.stopCardText}>
                    <Text style={s.stopCardName}>{plan.dropStop.name}</Text>
                    <Text style={s.stopCardMeta}>
                      {plan.dropStop.travelMinsFromPrevious
                        ? `${plan.dropStop.travelMinsFromPrevious} min away`
                        : 'Farthest stop'}
                      {plan.dropStop.durationMinutes ? ` · ${plan.dropStop.durationMinutes} min visit` : ''}
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
            )}
          </ResultView>
        )}

        {/* ── WEATHER VIEW ── */}
        {view === 'weather' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel={plan.swaps && plan.swaps.length > 0 ? 'Move indoors' : 'Got it'}
            ctaColor="#7A9E8E"
          >
            {plan.swaps && plan.swaps.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>OUTDOOR STOPS TO SWAP</Text>
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
              </>
            ) : (
              <View style={s.centeredNote}>
                <Text style={s.centeredNoteText}>Your remaining stops are mostly indoors already — you're good!</Text>
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
            ctaLabel="Mark as rest day"
            ctaColor="#7A9E8E"
          >
            <View style={s.centeredNote}>
              <Text style={[s.centeredNoteText, { color: '#1A1F2E', fontSize: 14, lineHeight: 22 }]}>
                Everyone deserves a break. Mark today as a rest day and your itinerary will be ready when you feel better.
              </Text>
            </View>
            <View style={[s.infoBox, { backgroundColor: '#EEF5F2', marginTop: 12 }]}>
              <Text style={[s.infoBoxText, { color: '#3D7A60' }]}>
                Your stops stay saved and can be visited on any day of the trip.
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
            ctaLabel="Skip today"
            ctaColor="#8A8FA8"
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
            <View style={[s.infoBox, { backgroundColor: '#FEF2F1', marginTop: 16 }]}>
              <Text style={[s.infoBoxText, { color: '#C0392B' }]}>
                This marks the whole day as skipped. This can't be undone from the app.
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
            ctaLabel="Wrap it up"
            ctaColor="#3DAA6E"
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

        {/* ── FUN VIEW (placeholder) ── */}
        {view === 'fun' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel="Find a swap"
            ctaColor="#E8692A"
          >
            <View style={s.centeredNote}>
              <Text style={s.centeredNoteText}>
                Stop swap suggestions are coming soon. For now, head to Discover to find something different.
              </Text>
            </View>
          </ResultView>
        )}

        {/* ── FOOD VIEW (placeholder) ── */}
        {view === 'food' && plan && (
          <ResultView
            plan={plan}
            onBack={() => setView('picker')}
            onApply={applyPlan}
            ctaLabel="Find food nearby"
            ctaColor="#F5A623"
          >
            <View style={s.centeredNote}>
              <Text style={s.centeredNoteText}>
                Food finder is coming soon. For now, check Google Maps for restaurants nearby.
              </Text>
            </View>
          </ResultView>
        )}

        {/* ── APPLIED VIEW ── */}
        {view === 'applied' && (
          <>
            <View style={s.appliedWrap}>
              <Text style={s.appliedEmoji}>{'\u2705'}</Text>
              <Text style={s.appliedTitle}>Day adjusted</Text>
              <Text style={s.appliedSub}>Your updated plan is live. Today tab reflects the changes.</Text>
            </View>
            <TouchableOpacity
              style={s.appliedBtn}
              activeOpacity={0.85}
              onPress={handleClose}
            >
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
  children: React.ReactNode;
}

function ResultView({ plan, onBack, onApply, ctaLabel, ctaColor = '#E8692A', children }: ResultViewProps) {
  return (
    <>
      <View style={s.resultHeader}>
        <Text style={s.resultTitle}>{plan.headline}</Text>
        <Text style={s.resultBody}>{plan.body}</Text>
      </View>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      <View style={s.resultFooter}>
        <TouchableOpacity style={s.goBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.goBackText}>Go back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: ctaColor, flex: 1 }]}
          activeOpacity={0.85}
          onPress={onApply}
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
    maxHeight: '82%',
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
    shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
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
  resultTitle: { fontSize: 18, fontWeight: '800', color: '#1A1F2E', fontFamily: F.bold, marginBottom: 4 },
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
  ctaBtn:   { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', fontFamily: F.bold },

  // ── Stop card ──
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#B0ADA8',
    letterSpacing: 0.8, fontFamily: F.bold,
    marginTop: 16, marginBottom: 8,
  },
  stopCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F2EE', borderRadius: 12, padding: 14,
  },
  stopDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
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

  // ── Weather swaps ──
  swapRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(26,31,46,0.07)',
  },
  swapFrom:     { flex: 1 },
  swapFromName: { fontSize: 13, fontWeight: '600', color: '#8A8FA8', textDecorationLine: 'line-through', fontFamily: F.semibold },
  swapFromMeta: { fontSize: 11, color: '#B0ADA8', fontFamily: F.regular },
  swapArrow:    { fontSize: 16, color: '#C4C8D8' },
  swapTo:       { flex: 1 },
  swapToName:   { fontSize: 13, fontWeight: '600', color: '#1A1F2E', fontFamily: F.semibold },
  swapToMeta:   { fontSize: 11, color: '#8A8FA8', fontFamily: F.regular },

  // ── Info / centered note ──
  centeredNote: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8 },
  centeredNoteText: { fontSize: 14, color: '#8A8FA8', fontFamily: F.regular, textAlign: 'center', lineHeight: 21 },
  infoBox: { borderRadius: 10, padding: 12 },
  infoBoxText: { fontSize: 12, fontFamily: F.regular, lineHeight: 17 },

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
    shadowOpacity: 0.3, shadowRadius: 20,
    elevation: 8,
  },
  appliedBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', fontFamily: F.bold },
});
