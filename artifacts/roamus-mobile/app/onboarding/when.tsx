import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackBtn, BigBtn, ProgressDots } from "@/lib/onboardingAtoms";
import { F, G } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fromISO(s: string | null): Date | null {
  if (!s) return null;
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
function fmt(d: Date | null): string {
  if (!d) return "";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function nights(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000);
}
function buildGrid(year: number, month: number): (number|null)[][] {
  const first = new Date(year,month,1).getDay();
  const dim = new Date(year,month+1,0).getDate();
  const weeks: (number|null)[][] = [];
  let wk: (number|null)[] = Array(first).fill(null);
  for (let d=1; d<=dim; d++) {
    wk.push(d);
    if (wk.length===7) { weeks.push([...wk]); wk=[]; }
  }
  if (wk.length>0) { while(wk.length<7) wk.push(null); weeks.push(wk); }
  return weeks;
}
function ordinalCity(n: number): string {
  const sfx = ["TH","ST","ND","RD"];
  const v = n%100;
  return `${n}${sfx[(v-20)%10]||sfx[v]||sfx[0]} CITY`;
}

// ─── Mini calendar ────────────────────────────────────────────────────────────
function MiniCalendar({
  start, end, viewYear, viewMonth,
  onDay, onPrev, onNext, canPrev,
}: {
  start: Date|null; end: Date|null;
  viewYear: number; viewMonth: number;
  onDay: (d:number)=>void;
  onPrev:()=>void; onNext:()=>void; canPrev:boolean;
}) {
  const today = useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; },[]);
  const grid = buildGrid(viewYear, viewMonth);
  const ep=(d:Date|null,day:number)=>!!d && new Date(viewYear,viewMonth,day).toDateString()===d.toDateString();
  const inRange=(day:number)=>{
    if (!start||!end) return false;
    const d=new Date(viewYear,viewMonth,day);
    return d>start && d<end;
  };
  const isPast=(day:number)=>new Date(viewYear,viewMonth,day)<today;
  const n = nights(start,end);
  return (
    <View style={c.cal}>
      <View style={c.monthRow}>
        <Pressable onPress={canPrev?onPrev:undefined} style={{opacity:canPrev?1:0.3}} hitSlop={12}>
          <Text style={c.navTxt}>‹</Text>
        </Pressable>
        <Text style={c.monthTxt}>{MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={onNext} hitSlop={12}>
          <Text style={c.navTxt}>›</Text>
        </Pressable>
      </View>
      <View style={c.daysRow}>
        {DAYS.map(d=><Text key={d} style={c.dayHdr}>{d}</Text>)}
      </View>
      {grid.map((week,wi)=>(
        <View key={wi} style={c.weekRow}>
          {week.map((day,di)=>{
            const s=day?ep(start,day):false;
            const e=day?ep(end,day):false;
            const ir=day?inRange(day):false;
            const past=day?isPast(day):false;
            const endpt=s||e;
            return (
              <Pressable
                key={di}
                onPress={day&&!past?()=>onDay(day):undefined}
                style={[c.cell,ir&&c.cellRange,s&&{borderTopLeftRadius:18,borderBottomLeftRadius:18},e&&{borderTopRightRadius:18,borderBottomRightRadius:18}]}
              >
                <View style={[c.inner,endpt&&{backgroundColor:G.orange}]}>
                  <Text style={[c.dayTxt,!day&&{opacity:0},past&&{color:"rgba(26,31,46,0.2)"},endpt&&{color:"#fff"},ir&&{color:G.oDk}]}>
                    {day??"·"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      {start && (
        <View style={c.summary}>
          <Text style={c.summaryTxt}>
            {fmt(start)}{end?` – ${fmt(end)}`:" → tap end date"}
            {end&&n>0?`  ·  ${n} night${n>1?"s":""}` : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Date summary row ─────────────────────────────────────────────────────────
function DateSummaryRow({ city, start, end }: { city: string; start: Date|null; end: Date|null }) {
  if (!start || !end) return null;
  const n = nights(start, end);
  return (
    <View style={q.summaryRow}>
      <Text style={q.summaryText}>{city}: {fmt(start)} → {fmt(end)}</Text>
      <Text style={q.summaryNights}>{n} night{n!==1?"s":""}</Text>
    </View>
  );
}

// ─── Days-in-city adjuster ─────────────────────────────────────────────────────
const DAY_OPTIONS = Array.from({ length: 21 }, (_, i) => i + 1);

function DaysInCityRow({ city, days, onDaysChange }: {
  city: string;
  days: number;
  onDaysChange: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={d.wrapper}>
      <Pressable style={d.row} onPress={() => setOpen(o => !o)}>
        <Text style={d.label}>Days in {city}</Text>
        <View style={d.pill}>
          <Text style={d.pillTxt}>{days} day{days !== 1 ? "s" : ""}</Text>
          <Text style={d.chevron}>{open ? "▲" : "▼"}</Text>
        </View>
      </Pressable>
      {open && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={d.scroll}
          contentContainerStyle={d.scrollContent}
        >
          {DAY_OPTIONS.map(n => (
            <Pressable
              key={n}
              onPress={() => { onDaysChange(n); setOpen(false); }}
              style={[d.opt, n === days && d.optSel]}
            >
              <Text style={[d.optTxt, n === days && d.optTxtSel]}>{n}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Locked selection row ─────────────────────────────────────────────────────
function LockedRow({ icon, label, onEdit }: { icon: string; label: string; onEdit: ()=>void }) {
  return (
    <View style={q.locked}>
      <View style={q.lockedArrow}><Text style={q.lockedArrowTxt}>→</Text></View>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={q.lockedLabel}>{label}</Text>
      <Pressable onPress={onEdit} hitSlop={10}>
        <Text style={q.lockedChange}>Change</Text>
      </Pressable>
    </View>
  );
}

// ─── Question section ─────────────────────────────────────────────────────────
type Option = { id: string; icon: string; label: string; sub: string };
function QSection({
  title, sub, iconEmoji, options, selected, onSelect,
}: { title:string; sub:string; iconEmoji:string; options:Option[]; selected:string|null; onSelect:(id:string)=>void }) {
  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection:"row", alignItems:"flex-start", gap:10, marginBottom:14 }}>
        <View style={q.qIcon}><Text style={{fontSize:16}}>{iconEmoji}</Text></View>
        <View style={{flex:1}}>
          <Text style={q.qTitle}>{title}</Text>
          <Text style={q.qSub}>{sub}</Text>
        </View>
      </View>
      {options.map(opt=>(
        <Pressable
          key={opt.id}
          onPress={()=>onSelect(opt.id)}
          style={[q.option, selected===opt.id && q.optionSel]}
        >
          <View style={[q.optIcon, selected===opt.id && {backgroundColor:G.oLt}]}>
            <Text style={{fontSize:20}}>{opt.icon}</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={[q.optLabel, selected===opt.id && {color:G.orange}]}>{opt.label}</Text>
            <Text style={q.optSub}>{opt.sub}</Text>
          </View>
          <View style={[q.radio, selected===opt.id && {backgroundColor:G.orange, borderColor:G.orange}]}>
            {selected===opt.id && <Text style={{color:"#fff",fontSize:10,fontWeight:"700"}}>✓</Text>}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TRANSPORT: Option[] = [
  {id:"flight", icon:"✈️", label:"Flying in", sub:"Arriving by plane"},
  {id:"drive",  icon:"🚗", label:"Road trip", sub:"Driving to the destination"},
  {id:"train",  icon:"🚂", label:"Train",     sub:"Arriving by rail"},
  {id:"local",  icon:"🏠", label:"Day trip / we live here", sub:"No travel needed"},
];
const ARRIVAL: Option[] = [
  {id:"morning",   icon:"☀️",  label:"Morning",    sub:"Before noon — full day ahead"},
  {id:"afternoon", icon:"🌤️", label:"Afternoon",  sub:"12–5pm — about half a day"},
  {id:"evening",   icon:"🌆",  label:"Evening",    sub:"After 5pm — dinner and settle in"},
  {id:"late",      icon:"🌙",  label:"Late night", sub:"After 9pm — Day 1 is rest"},
];
const LASTDAY: Option[] = [
  {id:"travel",   icon:"✈️", label:"Travel day",            sub:"Heading home — can't do stops"},
  {id:"late",     icon:"🌅", label:"Leaving late afternoon", sub:"Room for a morning stop or two"},
  {id:"full",     icon:"🎉", label:"Full day available",     sub:"Leaving after 5pm — use the whole day"},
];
const TRANSITION_OPTS: Option[] = [
  {id:"morning", icon:"☀️", label:"Traveling in the morning", sub:"We'll plan stops in the second city that afternoon"},
  {id:"midday",  icon:"🌤️",label:"Traveling midday",          sub:"Keep it light — no major stops, arrive and settle"},
  {id:"evening", icon:"🌆", label:"Traveling in the evening",  sub:"We'll finish stops in the first city that morning"},
];

// ─── Main screen ──────────────────────────────────────────────────────────────
type CalState = { viewYear:number; viewMonth:number; start:Date|null; end:Date|null };

export default function WhenScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();
  const today = useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; },[]);
  const isMulti = data.cityMode === "multi" && data.cities.length >= 2;

  // ── Calendar state (shared for single-city, per-city for multi) ──
  function mkCal(city?: string): CalState {
    const d = data.cityDates?.[city ?? ""];
    return {
      viewYear: today.getFullYear(),
      viewMonth: today.getMonth(),
      start: fromISO(d?.arrive ?? data.startDate),
      end: fromISO(d?.leave ?? data.endDate),
    };
  }

  const [cals, setCals] = useState<Record<string, CalState>>(() => {
    if (isMulti) {
      const m: Record<string, CalState> = {};
      data.cities.forEach(c => { m[c] = mkCal(c); });
      return m;
    }
    return { __single: mkCal() };
  });

  function updateCal(key: string, patch: Partial<CalState>) {
    setCals(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function onDay(key: string, day: number) {
    const st = cals[key];
    const tapped = new Date(st.viewYear, st.viewMonth, day);
    if (tapped < today) return;
    let ns = st.start, ne = st.end;
    if (!ns || (ns && ne)) { ns = tapped; ne = null; }
    else if (tapped < ns) { ne = ns; ns = tapped; }
    else ne = tapped;

    // Auto-seed next city's arrival = this city's departure + 1 day
    const newCals = { ...cals, [key]: { ...st, start: ns, end: ne } };
    if (ne && isMulti) {
      const idx = data.cities.indexOf(key);
      if (idx >= 0 && idx < data.cities.length - 1) {
        const next = data.cities[idx + 1];
        const nextCal = newCals[next];
        if (!nextCal.start) {
          const suggest = new Date(ne); suggest.setDate(suggest.getDate());
          newCals[next] = { ...nextCal, start: suggest, viewYear: suggest.getFullYear(), viewMonth: suggest.getMonth() };
        }
      }
    }
    setCals(newCals);
  }

  // ── Progressive question state ──
  const [transport, setTransport] = useState<string|null>(data.arrivalMethod);
  const [arrivalTime, setArrivalTime] = useState<string|null>(data.arrivalTime);
  const [lastDay, setLastDay] = useState<string|null>(data.lastDay);
  const [transitions, setTransitions] = useState<Record<string,string>>(data.cityTransitions ?? {});

  const transportOpacity = useRef(new Animated.Value(data.arrivalMethod ? 1 : 0)).current;
  const arrivalOpacity   = useRef(new Animated.Value(data.arrivalTime  ? 1 : 0)).current;
  const lastDayOpacity   = useRef(new Animated.Value(data.lastDay      ? 1 : 0)).current;
  const transOpacity     = useRef(new Animated.Value(Object.keys(data.cityTransitions ?? {}).length > 0 ? 1 : 0)).current;

  const allDatesComplete = useMemo(() => {
    if (isMulti) return data.cities.every(c => cals[c]?.start && cals[c]?.end);
    return !!(cals["__single"]?.start && cals["__single"]?.end);
  }, [cals, isMulti, data.cities]);

  useEffect(() => {
    if (allDatesComplete) Animated.timing(transportOpacity, { toValue:1, duration:350, useNativeDriver:true }).start();
  }, [allDatesComplete]);

  useEffect(() => {
    if (transport && transport !== "local") Animated.timing(arrivalOpacity, { toValue:1, duration:350, useNativeDriver:true }).start();
    if (transport === "local") Animated.timing(lastDayOpacity, { toValue:1, duration:350, useNativeDriver:true }).start();
  }, [transport]);

  useEffect(() => {
    if (arrivalTime) Animated.timing(lastDayOpacity, { toValue:1, duration:350, useNativeDriver:true }).start();
  }, [arrivalTime]);

  useEffect(() => {
    if (lastDay && isMulti) Animated.timing(transOpacity, { toValue:1, duration:350, useNativeDriver:true }).start();
  }, [lastDay, isMulti]);

  // ── canContinue ──
  const isLocal = transport === "local";
  const transitionPairs = data.cities.slice(0,-1).map((c,i)=>`${c}→${data.cities[i+1]}`);
  const allTransitions = isMulti ? transitionPairs.every(k => !!transitions[k]) : true;
  const canContinue = allDatesComplete && !!transport && (isLocal || !!arrivalTime) && !!lastDay && allTransitions;

  // ── handleContinue ──
  function handleContinue() {
    let startDate: string | null = null;
    let endDate: string | null = null;
    const cityDates: Record<string, { arrive: string|null; leave: string|null }> = {};

    if (isMulti) {
      data.cities.forEach(c => {
        const cal = cals[c];
        cityDates[c] = { arrive: cal.start ? toISO(cal.start) : null, leave: cal.end ? toISO(cal.end) : null };
      });
      const arrives = data.cities.map(c => cals[c].start).filter(Boolean) as Date[];
      const leaves  = data.cities.map(c => cals[c].end).filter(Boolean) as Date[];
      if (arrives.length) startDate = toISO(arrives.reduce((a,b) => a<b?a:b));
      if (leaves.length)  endDate   = toISO(leaves.reduce((a,b) => a>b?a:b));
    } else {
      const cal = cals["__single"];
      startDate = cal.start ? toISO(cal.start) : null;
      endDate   = cal.end   ? toISO(cal.end)   : null;
    }

    set({ startDate, endDate, cityDates, arrivalMethod: transport, arrivalTime: isLocal ? null : arrivalTime, lastDay, cityTransitions: transitions });
    router.push("/onboarding/how");
  }

  // ─── render ──────────────────────────────────────────────────────────────
  const singleCal = cals["__single"];
  const lastCityKey = isMulti ? data.cities[data.cities.length-1] : "__single";
  const summaryStart = isMulti ? cals[lastCityKey]?.start : singleCal?.start;
  const summaryEnd   = isMulti ? cals[lastCityKey]?.end   : singleCal?.end;
  const summaryCity  = isMulti ? lastCityKey : (data.cities[0] ?? "Your City");

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.navRow}>
          <BackBtn onPress={() => router.back()} />
          <View style={{ flex:1, alignItems:"center" }}><ProgressDots total={4} cur={2} /></View>
          <View style={{ width:40 }} />
        </View>
        <Text style={s.title}>When is your trip? 📅</Text>
        <Text style={s.sub}>We'll plan the right stops for each day.</Text>
      </View>

      <ScrollView style={{ flex:1 }} contentContainerStyle={[s.scroll, { paddingBottom:140 }]} showsVerticalScrollIndicator={false}>

        {isMulti ? (
          /* ── Per-city calendars ── */
          data.cities.map((city, i) => {
            const cal = cals[city];
            const calPrev = () => updateCal(city, cal.viewMonth===0 ? {viewYear:cal.viewYear-1,viewMonth:11} : {viewMonth:cal.viewMonth-1});
            const calNext = () => updateCal(city, cal.viewMonth===11 ? {viewYear:cal.viewYear+1,viewMonth:0} : {viewMonth:cal.viewMonth+1});
            const canPrev = cal.viewYear > today.getFullYear() || (cal.viewYear === today.getFullYear() && cal.viewMonth > today.getMonth());
            const cityNights = cal.start && cal.end ? nights(cal.start, cal.end) : 0;
            return (
              <View key={city}>
                <Text style={s.cityHeader}>{ordinalCity(i+1)} — {city.toUpperCase()}</Text>
                <MiniCalendar
                  start={cal.start} end={cal.end}
                  viewYear={cal.viewYear} viewMonth={cal.viewMonth}
                  onDay={d => onDay(city, d)}
                  onPrev={calPrev} onNext={calNext} canPrev={canPrev}
                />
                <DateSummaryRow city={city} start={cal.start} end={cal.end} />
                {cal.start && cal.end && cityNights > 0 && (
                  <DaysInCityRow
                    city={city}
                    days={cityNights}
                    onDaysChange={n => {
                      if (!cal.start) return;
                      const newEnd = new Date(cal.start.getTime() + n * 86400000);
                      const newCals = { ...cals, [city]: { ...cal, end: newEnd } };
                      // Auto-seed next city's arrival
                      if (i < data.cities.length - 1) {
                        const next = data.cities[i + 1];
                        const nextCal = newCals[next];
                        if (!nextCal.start || nextCal.start.toDateString() === cal.end?.toDateString()) {
                          newCals[next] = { ...nextCal, start: newEnd, viewYear: newEnd.getFullYear(), viewMonth: newEnd.getMonth() };
                        }
                      }
                      setCals(newCals);
                    }}
                  />
                )}
              </View>
            );
          })
        ) : (
          /* ── Single calendar ── */
          <>
            <MiniCalendar
              start={singleCal.start} end={singleCal.end}
              viewYear={singleCal.viewYear} viewMonth={singleCal.viewMonth}
              onDay={d => onDay("__single", d)}
              onPrev={()=>updateCal("__single", singleCal.viewMonth===0?{viewYear:singleCal.viewYear-1,viewMonth:11}:{viewMonth:singleCal.viewMonth-1})}
              onNext={()=>updateCal("__single", singleCal.viewMonth===11?{viewYear:singleCal.viewYear+1,viewMonth:0}:{viewMonth:singleCal.viewMonth+1})}
              canPrev={singleCal.viewYear>today.getFullYear()||(singleCal.viewYear===today.getFullYear()&&singleCal.viewMonth>today.getMonth())}
            />
            <DateSummaryRow city={data.cities[0]??""} start={singleCal.start} end={singleCal.end} />
          </>
        )}

        {/* ── Progressive questions ── */}
        <Animated.View style={{ opacity: transportOpacity }}>
          {transport ? (
            <LockedRow
              icon={TRANSPORT.find(t=>t.id===transport)?.icon??""}
              label={TRANSPORT.find(t=>t.id===transport)?.label??""}
              onEdit={()=>{ setTransport(null); setArrivalTime(null); setLastDay(null); setTransitions({}); }}
            />
          ) : (
            <QSection
              title="How are you getting there?"
              sub="Affects how we plan your first day."
              iconEmoji="ℹ️"
              options={TRANSPORT}
              selected={transport}
              onSelect={setTransport}
            />
          )}
        </Animated.View>

        {!isLocal && (
          <Animated.View style={{ opacity: arrivalOpacity }}>
            {arrivalTime ? (
              <LockedRow
                icon={ARRIVAL.find(a=>a.id===arrivalTime)?.icon??""}
                label={ARRIVAL.find(a=>a.id===arrivalTime)?.label??""}
                onEdit={()=>{ setArrivalTime(null); setLastDay(null); setTransitions({}); }}
              />
            ) : transport ? (
              <QSection
                title="When do you arrive on Day 1?"
                sub="We'll match Day 1 activity to your arrival."
                iconEmoji="⏰"
                options={ARRIVAL}
                selected={arrivalTime}
                onSelect={setArrivalTime}
              />
            ) : null}
          </Animated.View>
        )}

        <Animated.View style={{ opacity: lastDayOpacity }}>
          {lastDay ? (
            <LockedRow
              icon={LASTDAY.find(l=>l.id===lastDay)?.icon??""}
              label={LASTDAY.find(l=>l.id===lastDay)?.label??""}
              onEdit={()=>{ setLastDay(null); setTransitions({}); }}
            />
          ) : (transport && (isLocal || arrivalTime)) ? (
            <QSection
              title="What about your last day?"
              sub="Is it a travel day or do you have time for stops?"
              iconEmoji="◉"
              options={LASTDAY}
              selected={lastDay}
              onSelect={setLastDay}
            />
          ) : null}
        </Animated.View>

        {/* Transition question (multi-city only) */}
        {isMulti && lastDay && data.cities.slice(0,-1).map((city, i) => {
          const nextCity = data.cities[i+1];
          const key = `${city}→${nextCity}`;
          const chosen = transitions[key] ?? null;
          return (
            <Animated.View key={key} style={{ opacity: transOpacity }}>
              {chosen ? (
                <LockedRow
                  icon={TRANSITION_OPTS.find(t=>t.id===chosen)?.icon??""}
                  label={`${city} → ${nextCity}: ${TRANSITION_OPTS.find(t=>t.id===chosen)?.label??""}`}
                  onEdit={()=>setTransitions(p=>{ const n={...p}; delete n[key]; return n; })}
                />
              ) : (
                <QSection
                  title={`When do you travel from ${city} to ${nextCity}?`}
                  sub="We'll plan that day around your travel timing."
                  iconEmoji="↔️"
                  options={TRANSITION_OPTS}
                  selected={chosen}
                  onSelect={v=>setTransitions(p=>({...p,[key]:v}))}
                />
              )}
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={[s.cta, { paddingBottom: insets.bottom + 20 }]}>
        <BigBtn label="Continue →" onPress={handleContinue} disabled={!canContinue} />
      </View>
    </View>
  );
}

// ─── Calendar styles ──────────────────────────────────────────────────────────
const c = StyleSheet.create({
  cal: { backgroundColor:G.card, borderRadius:18, padding:16, marginBottom:12, shadowColor:"#000", shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:10, elevation:3 },
  monthRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  navTxt: { fontFamily:F.bold, fontSize:22, color:G.deep, paddingHorizontal:4 },
  monthTxt: { fontFamily:F.bold, fontSize:17, fontWeight:"700", color:G.deep },
  daysRow: { flexDirection:"row", marginBottom:6 },
  dayHdr: { flex:1, textAlign:"center", fontFamily:F.semibold, fontSize:12, fontWeight:"600", color:G.muted },
  weekRow: { flexDirection:"row", marginBottom:2 },
  cell: { flex:1, alignItems:"center", paddingVertical:2, backgroundColor:"transparent" },
  cellRange: { backgroundColor:"rgba(232,105,42,0.1)" },
  inner: { width:36, height:36, borderRadius:18, alignItems:"center", justifyContent:"center" },
  dayTxt: { fontFamily:F.regular, fontSize:14, color:G.deep },
  summary: { marginTop:10, paddingTop:10, borderTopWidth:1, borderTopColor:"rgba(26,31,46,0.07)", alignItems:"center" },
  summaryTxt: { fontFamily:F.semibold, fontSize:14, fontWeight:"600", color:G.orange },
});

// ─── Question/UI styles ───────────────────────────────────────────────────────
const q = StyleSheet.create({
  summaryRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", backgroundColor:G.oLt, borderRadius:12, paddingHorizontal:14, paddingVertical:10, marginBottom:6 },
  summaryText: { fontFamily:F.semibold, fontSize:14, fontWeight:"600", color:G.orange },
  summaryNights: { fontFamily:F.regular, fontSize:13, color:G.orange },
  locked: { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"rgba(232,105,42,0.08)", borderRadius:14, borderWidth:1, borderColor:"rgba(232,105,42,0.2)", paddingHorizontal:14, paddingVertical:13, marginTop:8, marginBottom:4 },
  lockedArrow: { width:28, height:28, borderRadius:14, backgroundColor:G.orange, alignItems:"center", justifyContent:"center" },
  lockedArrowTxt: { color:"#fff", fontFamily:F.bold, fontSize:14, fontWeight:"700" },
  lockedLabel: { fontFamily:F.semibold, fontSize:14, fontWeight:"600", color:G.deep, flex:1 },
  lockedChange: { fontFamily:F.regular, fontSize:13, color:G.orange },
  qIcon: { width:36, height:36, borderRadius:18, backgroundColor:"rgba(26,31,46,0.08)", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 },
  qTitle: { fontFamily:F.bold, fontSize:16, fontWeight:"700", color:G.deep, marginBottom:3 },
  qSub: { fontFamily:F.regular, fontSize:13, color:G.muted },
  option: { flexDirection:"row", alignItems:"center", gap:12, backgroundColor:G.card, borderRadius:14, borderWidth:1.5, borderColor:"rgba(26,31,46,0.08)", padding:13, marginBottom:8 },
  optionSel: { borderColor:G.orange, backgroundColor:"rgba(232,105,42,0.04)" },
  optIcon: { width:44, height:44, borderRadius:12, backgroundColor:"rgba(26,31,46,0.05)", alignItems:"center", justifyContent:"center", flexShrink:0 },
  optLabel: { fontFamily:F.bold, fontSize:15, fontWeight:"700", color:G.deep },
  optSub: { fontFamily:F.regular, fontSize:13, color:G.muted, marginTop:2 },
  radio: { width:22, height:22, borderRadius:11, borderWidth:2, borderColor:"rgba(138,143,168,0.35)", alignItems:"center", justifyContent:"center", flexShrink:0 },
});

// ─── Days-in-city styles ──────────────────────────────────────────────────────
const d = StyleSheet.create({
  wrapper: { marginBottom: 10, marginTop: 2 },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: G.card, borderRadius: 12, borderWidth: 1.5,
    borderColor: "rgba(26,31,46,0.1)", paddingHorizontal: 14, paddingVertical: 11,
  },
  label: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.deep },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: G.oLt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  pillTxt: { fontFamily: F.bold, fontSize: 13, fontWeight: "700", color: G.orange },
  chevron: { fontFamily: F.regular, fontSize: 9, color: G.orange },
  scroll: { marginTop: 8 },
  scrollContent: { paddingHorizontal: 2, gap: 6, flexDirection: "row" },
  opt: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: "rgba(26,31,46,0.12)", backgroundColor: G.card, alignItems: "center", justifyContent: "center" },
  optSel: { borderColor: G.orange, backgroundColor: G.orange },
  optTxt: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.deep },
  optTxtSel: { color: "#fff" },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex:1 },
  header: { paddingHorizontal:24, flexShrink:0 },
  navRow: { flexDirection:"row", alignItems:"center", marginBottom:20 },
  title: { fontFamily:F.bold, fontSize:28, fontWeight:"800", letterSpacing:-0.6, color:G.deep, marginBottom:6 },
  sub: { fontFamily:F.regular, fontSize:15, color:G.muted, marginBottom:20 },
  scroll: { paddingHorizontal:24 },
  cityHeader: { fontFamily:F.bold, fontSize:12, fontWeight:"700", color:G.orange, letterSpacing:1, marginBottom:8, marginTop:4 },
  cta: { position:"absolute", left:0, right:0, bottom:0, paddingHorizontal:24, paddingTop:14, backgroundColor:"transparent" },
});
