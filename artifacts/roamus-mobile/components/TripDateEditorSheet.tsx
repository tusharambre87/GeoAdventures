import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  orange:  '#E8692A',
  oLt:     'rgba(232,105,42,0.10)',
  bg:      '#F5F2EE',
  card:    '#FFFFFF',
  deep:    '#1A1F2E',
  muted:   '#8A8FA8',
  border:  'rgba(26,31,46,0.08)',
} as const;

const MONTHS       = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_HDR     = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmt(d: Date | null): string {
  if (!d) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function buildGrid(year: number, month: number): (number|null)[][] {
  const first = new Date(year, month, 1).getDay();
  const dim   = new Date(year, month+1, 0).getDate();
  const weeks: (number|null)[][] = [];
  let wk: (number|null)[] = Array(first).fill(null);
  for (let d = 1; d <= dim; d++) {
    wk.push(d);
    if (wk.length === 7) { weeks.push([...wk]); wk = []; }
  }
  if (wk.length > 0) { while (wk.length < 7) wk.push(null); weeks.push(wk); }
  return weeks;
}

function MiniCalendar({
  start, end, viewYear, viewMonth,
  onDay, onPrev, onNext, canPrev,
}: {
  start: Date|null; end: Date|null;
  viewYear: number; viewMonth: number;
  onDay: (d: number) => void;
  onPrev: () => void; onNext: () => void; canPrev: boolean;
}) {
  const grid   = buildGrid(viewYear, viewMonth);
  const ep     = (d: Date|null, day: number) => !!d && new Date(viewYear, viewMonth, day).toDateString() === d.toDateString();
  const inRange = (day: number) => {
    if (!start || !end) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d > start && d < end;
  };
  const nights = (start && end) ? Math.round(Math.abs(end.getTime()-start.getTime())/86400000) : 0;

  return (
    <View style={cal.cal}>
      <View style={cal.monthRow}>
        <Pressable onPress={canPrev ? onPrev : undefined} style={{ opacity: canPrev ? 1 : 0.3 }} hitSlop={12}>
          <Text style={cal.navTxt}>{'<'}</Text>
        </Pressable>
        <Text style={cal.monthTxt}>{MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={onNext} hitSlop={12}>
          <Text style={cal.navTxt}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={cal.dowRow}>
        {DAYS_HDR.map(d => <Text key={d} style={cal.dowLbl}>{d}</Text>)}
      </View>

      {grid.map((week, wi) => (
        <View key={wi} style={cal.weekRow}>
          {week.map((day, di) => {
            const ss    = day ? ep(start, day) : false;
            const ee    = day ? ep(end, day)   : false;
            const ir    = day ? inRange(day)   : false;
            const endpt = ss || ee;
            return (
              <Pressable
                key={di}
                onPress={day ? () => onDay(day) : undefined}
                style={[
                  cal.cell,
                  ir && cal.cellRange,
                  ss && { borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
                  ee && { borderTopRightRadius: 18, borderBottomRightRadius: 18 },
                ]}
              >
                <View style={[cal.inner, endpt && { backgroundColor: C.orange }]}>
                  <Text style={[
                    cal.dayTxt,
                    !day  && { opacity: 0 },
                    endpt && { color: '#fff' },
                    ir    && { color: '#C85315' },
                  ]}>
                    {day ?? ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {start && (
        <View style={cal.summary}>
          <Text style={cal.summaryTxt}>
            {fmt(start)}{end ? ` \u2013 ${fmt(end)}` : ' \u2192 tap end date'}
            {end && nights > 0 ? `  \u00b7  ${nights} night${nights > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

type Trip = {
  id: string;
  name: string;
  startDate?: string | Date | null;
  endDate?:   string | Date | null;
  tripDays?:  number | null;
};

export default function TripDateEditorSheet({
  trip,
  onClose,
  onSaved,
}: {
  trip: Trip;
  onClose: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const today  = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const currentStart = useMemo(() => {
    if (!trip.startDate) return null;
    const d = new Date(trip.startDate as string);
    d.setHours(0,0,0,0);
    return isNaN(d.getTime()) ? null : d;
  }, [trip.startDate]);

  const currentEnd = useMemo(() => {
    if (!trip.endDate) return null;
    const d = new Date(trip.endDate as string);
    d.setHours(0,0,0,0);
    return isNaN(d.getTime()) ? null : d;
  }, [trip.endDate]);

  const currentDays = trip.tripDays ?? (
    currentStart && currentEnd
      ? Math.round((currentEnd.getTime() - currentStart.getTime()) / 86400000) + 1
      : null
  );

  const [start,      setStart]      = useState<Date|null>(currentStart ?? today);
  const [end,        setEnd]        = useState<Date|null>(currentEnd);
  const [viewYear,   setViewYear]   = useState((currentStart ?? today).getFullYear());
  const [viewMonth,  setViewMonth]  = useState((currentStart ?? today).getMonth());
  const [saving,     setSaving]     = useState(false);

  const canPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  function onDay(day: number) {
    const tapped = new Date(viewYear, viewMonth, day);
    tapped.setHours(0,0,0,0);
    if (!start || (start && end)) { setStart(tapped); setEnd(null); }
    else if (tapped < start)      { setEnd(start); setStart(tapped); }
    else                          { setEnd(tapped); }
  }

  const newDays = useMemo(() => {
    if (!start || !end) return null;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, [start, end]);

  const dayDiff = (newDays !== null && currentDays !== null) ? newDays - currentDays : null;

  const isValid   = !!start && !!end && start <= end;
  const isChanged = isValid && (
    toISO(start!) !== (currentStart ? toISO(currentStart) : '') ||
    toISO(end!)   !== (currentEnd   ? toISO(currentEnd)   : '')
  );
  const canSave = isValid && isChanged && !saving;

  async function handleSave() {
    if (!canSave || !start || !end) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const patchRes = await fetch(`${API_BASE}/api/travel/trips/${trip.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ startDate: toISO(start), endDate: toISO(end), tripDays: newDays }),
      });
      if (!patchRes.ok) throw new Error('Failed to update dates');

      if (dayDiff !== null && dayDiff < 0 && newDays !== null) {
        await fetch(`${API_BASE}/api/travel/trips/${trip.id}/trim-days`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ keepDays: newDays }),
        });
      }

      onSaved();
      onClose();
    } catch {
      Alert.alert('Could not update dates', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const currentLabel = [
    currentStart ? fmt(currentStart) : null,
    currentEnd   ? fmt(currentEnd)   : null,
  ].filter(Boolean).join(' \u2013 ');

  return (
    <View style={{ flex: 1 }}>
      <View style={st.header}>
        <Text style={st.title}>Edit dates</Text>
        <Pressable onPress={onClose} style={st.closeBtn} hitSlop={8}>
          <Text style={st.closeTxt}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.body, { paddingBottom: insets.bottom + 24 }]}
      >
        {currentLabel ? (
          <Text style={st.currentLabel}>Currently {currentLabel}</Text>
        ) : null}

        <View style={st.card}>
          <MiniCalendar
            start={start}
            end={end}
            viewYear={viewYear}
            viewMonth={viewMonth}
            onDay={onDay}
            onPrev={() => {
              if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
              else setViewMonth(m => m - 1);
            }}
            onNext={() => {
              if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
              else setViewMonth(m => m + 1);
            }}
            canPrev={canPrev}
          />
        </View>

        {newDays !== null && (
          <Text style={st.dayCount}>{newDays} day{newDays !== 1 ? 's' : ''}</Text>
        )}

        {dayDiff !== null && dayDiff !== 0 && (
          <View style={[st.warning, dayDiff < 0 ? st.warningDanger : st.warningInfo]}>
            <Text style={[st.warningTxt, dayDiff < 0 ? st.warningTxtDanger : st.warningTxtInfo]}>
              {dayDiff < 0
                ? `This will remove the last ${Math.abs(dayDiff)} day${Math.abs(dayDiff) > 1 ? 's' : ''} from your trip`
                : `This will add ${dayDiff} empty day${dayDiff > 1 ? 's' : ''} to your trip`}
            </Text>
          </View>
        )}

        <Pressable
          style={[st.saveBtn, !canSave && st.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={st.saveBtnTxt}>Save dates</Text>}
        </Pressable>

        <Pressable style={st.cancelBtn} onPress={onClose}>
          <Text style={st.cancelTxt}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const cal = StyleSheet.create({
  cal:       { paddingHorizontal: 4 },
  monthRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navTxt:    { fontFamily: F.bold, fontSize: 20, color: C.deep, paddingHorizontal: 8 },
  monthTxt:  { fontFamily: F.bold, fontSize: 15, color: C.deep },
  dowRow:    { flexDirection: 'row', marginBottom: 6 },
  dowLbl:    { flex: 1, textAlign: 'center', fontFamily: F.bold, fontSize: 11, color: C.muted },
  weekRow:   { flexDirection: 'row' },
  cell:      { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellRange: { backgroundColor: C.oLt },
  inner:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayTxt:    { fontFamily: F.bold, fontSize: 13, color: C.muted },
  summary:   { marginTop: 10 },
  summaryTxt:{ fontFamily: F.bold, fontSize: 13, color: C.orange, textAlign: 'center' },
});

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title:    { flex: 1, fontFamily: F.bold, fontSize: 18, color: C.deep },
  closeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,31,46,0.06)', borderRadius: 15 },
  closeTxt: { fontFamily: F.bold, fontSize: 13, color: C.deep },

  body: { padding: 20, gap: 16 },

  currentLabel: { fontFamily: F.regular, fontSize: 13, color: C.muted, textAlign: 'center' },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },

  dayCount: { fontFamily: F.bold, fontSize: 22, color: C.deep, textAlign: 'center' },

  warning:         { borderRadius: 12, padding: 12, borderWidth: 1 },
  warningDanger:   { backgroundColor: '#FFF5F5', borderColor: '#FCA5A5' },
  warningInfo:     { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  warningTxt:      { fontFamily: F.regular, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  warningTxtDanger:{ color: '#DC2626' },
  warningTxtInfo:  { color: '#92400E' },

  saveBtn:         { backgroundColor: C.orange, borderRadius: 28, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnTxt:      { fontFamily: F.bold, fontSize: 16, color: '#fff' },

  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelTxt: { fontFamily: F.bold, fontSize: 14, color: C.muted },
});
