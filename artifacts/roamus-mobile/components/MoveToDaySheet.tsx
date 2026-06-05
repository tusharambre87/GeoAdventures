import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/lib/authContext';
import { F } from '@/lib/tokens';

const C = {
  orange:    '#E8692A',
  orangeLt:  '#FDF0E9',
  bg:        '#F5F2EE',
  deep:      '#1A1F2E',
  muted:     '#8A8FA8',
  border:    'rgba(26,31,46,0.09)',
  borderMed: 'rgba(26,31,46,0.16)',
} as const;

const TAB_BAR_H = 49;

export type MoveStop = {
  id: string;
  name: string;
  stopType?: string | null;
  durationMinutes?: number | null;
  dayIndex?: number | null;
  displayOrder?: number | null;
};

export type DayInfo = {
  dayIndex: number;
  dayNum: number;
  date: string | null;
  stops: MoveStop[];
};

function computeDisplayOrder(targetStops: MoveStop[], afterStopId: string | null): number {
  const sorted = [...targetStops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  if (afterStopId === null) {
    return sorted.length === 0 ? 0 : (sorted[0].displayOrder ?? 0) - 1;
  }
  const idx = sorted.findIndex(s => s.id === afterStopId);
  if (idx < 0) return (sorted[sorted.length - 1]?.displayOrder ?? 0) + 1;
  const after = sorted[idx];
  const next  = sorted[idx + 1];
  if (!next) return (after.displayOrder ?? idx) + 1;
  return ((after.displayOrder ?? idx) + (next.displayOrder ?? idx + 1)) / 2;
}

function getDurationMins(stop: MoveStop): number {
  if (stop.durationMinutes) return stop.durationMinutes;
  const t = stop.stopType?.toLowerCase() ?? '';
  if (t.includes('zoo') || t.includes('aquarium') || t.includes('beach')) return 120;
  if (t.includes('museum') || t.includes('palace') || t.includes('castle')) return 90;
  if (t.includes('park') || t.includes('garden') || t.includes('nature')) return 60;
  if (t.includes('landmark') || t.includes('monument')) return 45;
  return 60;
}

type Step = 1 | 2 | 3;
const UNSET = '__unset__';

function ProgressBar({ step }: { step: Step }) {
  return (
    <View style={pb.row}>
      {[1, 2, 3].map(n => (
        <View key={n} style={[pb.seg, step >= n && pb.segDone]} />
      ))}
    </View>
  );
}

const pb = StyleSheet.create({
  row:     { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 14 },
  seg:     { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#E0DDD8' },
  segDone: { backgroundColor: C.orange },
});

function Grip() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
      <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
    </View>
  );
}

export default function MoveToDaySheet({
  stop,
  tripDays,
  currentDayIndex,
  tripId,
  onMove,
  onClose,
}: {
  stop: MoveStop;
  tripDays: DayInfo[];
  currentDayIndex: number;
  tripId: string;
  onMove: (stopId: string, targetDayIndex: number, afterStopId: string | null) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep]                 = useState<Step>(1);
  const [targetDayIdx, setTargetDayIdx] = useState<number | null>(null);
  const [afterStopId, setAfterStopId]   = useState<string | null | typeof UNSET>(UNSET);
  const [moving, setMoving]             = useState(false);

  const otherDays  = tripDays.filter(d => d.dayIndex !== currentDayIndex);
  const targetDay  = targetDayIdx !== null ? tripDays.find(d => d.dayIndex === targetDayIdx) ?? null : null;
  const posSelected = afterStopId !== UNSET;

  const currentDay   = tripDays.find(d => d.dayIndex === currentDayIndex);
  const stopPosInDay = currentDay
    ? currentDay.stops.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).findIndex(s => s.id === stop.id) + 1
    : 1;

  const targetStopsSorted = (targetDay?.stops ?? [])
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  function positionLabel(): string {
    if (afterStopId === UNSET || afterStopId === null) return 'First stop';
    const s = targetStopsSorted.find(x => x.id === afterStopId);
    return s ? `After ${s.name}` : 'First stop';
  }

  async function handleConfirm() {
    if (!targetDay || afterStopId === UNSET || moving) return;
    const realAfterStopId = afterStopId === null ? null : afterStopId as string;
    setMoving(true);
    try {
      const newDisplayOrder = computeDisplayOrder(targetDay.stops, realAfterStopId);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/travel/trips/${tripId}/reorder-stops`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          stopOrders: [{ stopId: stop.id, displayOrder: newDisplayOrder, dayIndex: targetDay.dayIndex }],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onMove(stop.id, targetDay.dayIndex, realAfterStopId);
      onClose();
    } catch {
      setMoving(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Grip />
      <ProgressBar step={step} />

      {/* ── Step 1: Day picker ─────────────────────────── */}
      {step === 1 && (
        <View style={{ flex: 1 }}>
          <View style={s.movingLabel}>
            <Text style={s.movingCaption}>MOVING STOP</Text>
            <Text style={s.movingName} numberOfLines={2}>{stop.name}</Text>
          </View>

          <Text style={s.sectionLabel}>MOVE TO WHICH DAY?</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pillRow}
          >
            {otherDays.map(day => {
              const sel = day.dayIndex === targetDayIdx;
              return (
                <Pressable
                  key={day.dayIndex}
                  style={[s.pill, sel && s.pillSel]}
                  onPress={() => setTargetDayIdx(day.dayIndex)}
                >
                  <Text style={[s.pillDn, sel && s.pillDnSel]}>Day {day.dayNum}</Text>
                  {day.date ? <Text style={s.pillDd}>{day.date}</Text> : null}
                  <Text style={s.pillSc}>
                    {day.stops.length} {day.stops.length === 1 ? 'stop' : 'stops'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[s.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 8 }]}>
            <Pressable
              style={[s.ctaBtn, targetDayIdx === null && s.ctaBtnDisabled]}
              onPress={() => targetDayIdx !== null && setStep(2)}
              disabled={targetDayIdx === null}
            >
              <Text style={s.ctaBtnText}>Next \u2014 pick position \u2192</Text>
            </Pressable>
            <Pressable style={s.secBtn} onPress={onClose}>
              <Text style={s.secBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Step 2: Position picker ────────────────────── */}
      {step === 2 && targetDay && (
        <View style={{ flex: 1 }}>
          <View style={s.navRow}>
            <Pressable onPress={() => setStep(1)} hitSlop={8}>
              <Text style={s.navBack}>{'\u2190'} Day {targetDay.dayNum}</Text>
            </Pressable>
            <Text style={s.navTitle}>Where in the day?</Text>
          </View>
          <Text style={s.sectionLabel}>WHERE IN THE DAY?</Text>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* First stop row */}
            {(() => {
              const sel = afterStopId === null;
              const firstStop = targetStopsSorted[0];
              return (
                <Pressable
                  style={s.posRow}
                  onPress={() => setAfterStopId(null)}
                >
                  <View style={[s.posDot, sel && s.posDotSel]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.posText}>First stop of the day</Text>
                    {firstStop
                      ? <Text style={s.posSub}>Before {firstStop.name}</Text>
                      : <Text style={s.posSub}>Only stop on this day</Text>}
                  </View>
                  <View style={[s.posRadio, sel && s.posRadioSel]}>
                    {sel && <View style={s.posRadioDot} />}
                  </View>
                </Pressable>
              );
            })()}

            {/* After each existing stop */}
            {targetStopsSorted.map((ts, i) => {
              const sel = afterStopId === ts.id;
              const dur = getDurationMins(ts);
              const next = targetStopsSorted[i + 1];
              const sub  = next ? `${dur} min \u00b7 then ${next.name}` : `${dur} min \u00b7 last stop`;
              return (
                <Pressable
                  key={ts.id}
                  style={s.posRow}
                  onPress={() => setAfterStopId(ts.id)}
                >
                  <View style={[s.posDot, sel && s.posDotSel]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.posText}>After {ts.name}</Text>
                    <Text style={s.posSub}>{sub}</Text>
                  </View>
                  <View style={[s.posRadio, sel && s.posRadioSel]}>
                    {sel && <View style={s.posRadioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[s.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 8 }]}>
            <Pressable
              style={[s.ctaBtn, !posSelected && s.ctaBtnDisabled]}
              onPress={() => posSelected && setStep(3)}
              disabled={!posSelected}
            >
              <Text style={s.ctaBtnText}>Next \u2014 confirm \u2192</Text>
            </Pressable>
            <Pressable style={s.secBtn} onPress={() => setStep(1)}>
              <Text style={s.secBtnText}>Back</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Step 3: Confirm ───────────────────────────── */}
      {step === 3 && targetDay && (
        <View style={{ flex: 1 }}>
          <View style={s.navRow}>
            <Pressable onPress={() => setStep(2)} hitSlop={8}>
              <Text style={s.navBack}>{'\u2190'} Position</Text>
            </Pressable>
            <Text style={s.navTitle}>Confirm move</Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
            <View style={s.confirmCard}>
              <View style={s.confirmRow}>
                <Text style={s.confirmLabel}>Stop</Text>
                <Text style={[s.confirmVal, { fontSize: 12, flexShrink: 1, marginLeft: 16, textAlign: 'right' }]}
                  numberOfLines={2}
                >
                  {stop.name}
                </Text>
              </View>
              <View style={[s.confirmRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={s.confirmLabel}>From</Text>
                <Text style={s.confirmVal}>Day {currentDayIndex + 1} \u00b7 Stop {stopPosInDay}</Text>
              </View>
              <View style={[s.confirmRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={s.confirmLabel}>To</Text>
                <Text style={[s.confirmVal, { color: C.orange }]}>
                  Day {targetDay.dayNum} \u00b7 {positionLabel()}
                </Text>
              </View>
            </View>

            <Text style={s.impactText}>
              {'Day '}{currentDayIndex + 1}{' will have '}{Math.max(0, (currentDay?.stops.length ?? 1) - 1)}{' stop'}{(currentDay?.stops.length ?? 1) - 1 === 1 ? '' : 's'}{' remaining.\nDay '}{targetDay.dayNum}{' will have '}{targetDay.stops.length + 1}{' stop'}{targetDay.stops.length + 1 === 1 ? '' : 's'}{'.'}
            </Text>
          </ScrollView>

          <View style={[s.footer, { paddingBottom: TAB_BAR_H + insets.bottom + 8 }]}>
            <Pressable
              style={[s.ctaBtn, moving && s.ctaBtnDisabled]}
              onPress={handleConfirm}
              disabled={moving}
            >
              {moving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.ctaBtnText}>Move stop</Text>}
            </Pressable>
            <Pressable style={s.secBtn} onPress={onClose} disabled={moving}>
              <Text style={s.secBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 30,
  },
  movingLabel:   { paddingHorizontal: 20, paddingBottom: 14 },
  movingCaption: { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.09, textTransform: 'uppercase', marginBottom: 4 },
  movingName:    { fontFamily: F.bold, fontSize: 18, color: C.deep, letterSpacing: -0.02, textDecorationLine: 'line-through', textDecorationColor: C.orange },
  sectionLabel:  { fontFamily: F.bold, fontSize: 9, color: C.muted, letterSpacing: 0.09, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 },
  pillRow: { paddingHorizontal: 20, paddingBottom: 4, gap: 8 },
  pill: {
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: '#E0DDD8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    minWidth: 76,
  },
  pillSel:   { borderColor: C.orange, backgroundColor: C.orangeLt },
  pillDn:    { fontFamily: F.semibold, fontSize: 11, color: C.deep },
  pillDnSel: { color: C.orange },
  pillDd:    { fontFamily: F.regular, fontSize: 10, color: C.muted, marginTop: 1 },
  pillSc:    { fontFamily: F.regular, fontSize: 10, color: C.muted, marginTop: 1 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  navBack:  { fontFamily: F.regular, fontSize: 13, color: C.muted },
  navTitle: { fontFamily: F.semibold, fontSize: 13, color: C.deep, marginLeft: 'auto' },
  posRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  posDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0DDD8', flexShrink: 0 },
  posDotSel:   { backgroundColor: C.orange },
  posText:     { fontFamily: F.semibold, fontSize: 13, color: C.deep },
  posSub:      { fontFamily: F.regular, fontSize: 11, color: C.muted, marginTop: 1 },
  posRadio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: '#E0DDD8',
    marginLeft: 'auto', flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  posRadioSel: { borderColor: C.orange, backgroundColor: C.orange },
  posRadioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  confirmCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmLabel: { fontFamily: F.regular, fontSize: 12, color: C.muted, flexShrink: 0 },
  confirmVal:   { fontFamily: F.semibold, fontSize: 13, color: C.deep },
  impactText: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer:       { padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.border },
  ctaBtn:       { backgroundColor: C.orange, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8 },
  ctaBtnDisabled: { opacity: 0.45 },
  ctaBtnText:   { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  secBtn:       { borderWidth: 1.5, borderColor: '#E0DDD8', borderRadius: 14, padding: 12, alignItems: 'center' },
  secBtnText:   { fontFamily: F.semibold, fontSize: 14, color: C.muted },
});
