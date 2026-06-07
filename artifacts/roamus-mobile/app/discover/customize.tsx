import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, G } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";
import { getAiPickTemplateStops } from "@/lib/discoverData";

// ─ Calendar helpers ─────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_HDR = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmt(d: Date | null): string {
  if (!d) return "";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
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
  const nights = (start && end) ? Math.round(Math.abs(end.getTime()-start.getTime())/86400000) : 0;
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
      <View style={c.dowRow}>
        {DAYS_HDR.map(d=><Text key={d} style={c.dowLbl}>{d}</Text>)}
      </View>
      {grid.map((week,wi)=>(
        <View key={wi} style={c.weekRow}>
          {week.map((day,di)=>{
            const ss=day?ep(start,day):false;
            const ee=day?ep(end,day):false;
            const ir=day?inRange(day):false;
            const past=day?isPast(day):false;
            const endpt=ss||ee;
            return (
              <Pressable
                key={di}
                onPress={day&&!past?()=>onDay(day):undefined}
                style={[c.cell,ir&&c.cellRange,ss&&{borderTopLeftRadius:18,borderBottomLeftRadius:18},ee&&{borderTopRightRadius:18,borderBottomRightRadius:18}]}
              >
                <View style={[c.inner,endpt&&{backgroundColor:G.orange}]}>
                  <Text style={[c.dayTxt,!day&&{opacity:0},past&&{color:"rgba(26,31,46,0.2)"},endpt&&{color:"#fff"},ir&&{color:G.oDk}]}>
                    {day??""}
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
            {end&&nights>0?`  ·  ${nights} night${nights>1?"s":""}` : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─ Main screen ──────────────────────────────────────────────────────

const DEFAULT_TEMPLATE_DAYS = 3;

export default function DiscoverCustomizeScreen() {
  const { slug, isAiPick, destination: destParam, templateDays: tdParam } = useLocalSearchParams<{
    slug: string;
    isAiPick: string;
    destination: string;
    templateDays: string;
  }>();
  const insets = useSafeAreaInsets();
  const { set: setOnboarding, reset, data: onboardingData } = useOnboarding();

  const destination = destParam ? decodeURIComponent(destParam) : slug.replace(/^ai-/, "").replace(/-/g, " ");
  const templateDays = tdParam ? parseInt(tdParam, 10) || DEFAULT_TEMPLATE_DAYS : DEFAULT_TEMPLATE_DAYS;

  const todayBase = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [viewYear, setViewYear] = useState(todayBase.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayBase.getMonth());

  const [start, setStart] = useState<Date|null>(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  const [end, setEnd] = useState<Date|null>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (templateDays ?? 3));
    d.setHours(0,0,0,0);
    return d;
  });

  const canPrev = viewYear > todayBase.getFullYear() || (viewYear===todayBase.getFullYear() && viewMonth>todayBase.getMonth());

  function onDay(day: number) {
    const tapped = new Date(viewYear, viewMonth, day);
    if (tapped < todayBase) return;
    if (!start || (start && end)) { setStart(tapped); setEnd(null); }
    else if (tapped < start) { setEnd(start); setStart(tapped); }
    else setEnd(tapped);
  }

  const tripDays = useMemo(() => {
    if (!start || !end) return templateDays;
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [start, end, templateDays]);

  const [secondCity, setSecondCity]         = useState<string | null>(null);
  const [showSecondCity, setShowSecondCity]  = useState(false);
  const [city1Days, setCity1Days]            = useState<number>(() => Math.ceil(templateDays / 2));
  const [city2Days, setCity2Days]            = useState<number>(() => templateDays - Math.ceil(templateDays / 2));

  // Keep day split in sync whenever total trip length changes
  useEffect(() => {
    const half = Math.ceil(tripDays / 2);
    setCity1Days(half);
    setCity2Days(tripDays - half);
  }, [tripDays]);

  const adaptNote = useMemo(() => {
    if (!start || !end) {
      return `Select your dates — AI will adapt the ${templateDays}-day template for your family.`;
    }
    if (tripDays < templateDays) {
      return `${tripDays} days selected — AI will keep the top ${tripDays * 3} stops and mark the rest optional.`;
    }
    if (tripDays === templateDays) {
      return `${tripDays} days — same as the template. AI personalises timing for your kids’ ages and pace.`;
    }
    return `${tripDays} days selected — AI will add ${(tripDays - templateDays) * 2} new stops to fill the extra days.`;
  }, [tripDays, templateDays, start, end]);

  const canBuild = !showSecondCity || (!!secondCity && secondCity.trim().length > 0);

  function handleBuild() {
    if (!canBuild) return;
    const startIso = start ? toISO(start) : null;
    const endIso   = end   ? toISO(end)   : null;
    const isAi     = isAiPick === "true";
    const isMulti  = showSecondCity && !!secondCity && secondCity.trim().length > 0;

    // Compute per-city date ranges from the day-split stepper
    const city1End = startIso
      ? new Date(new Date(startIso).getTime() + city1Days * 86400000)
      : null;
    const midIso = city1End ? toISO(city1End) : null;

    const cityDates = isMulti && midIso ? {
      [destination]:          { arrive: startIso, leave: midIso },
      [secondCity!.trim()]:   { arrive: midIso,   leave: endIso },
    } : {};

    const savedTravelers = onboardingData.travelers;
    reset();
    setOnboarding({
      travelers: savedTravelers,
      cities:    isMulti ? [destination, secondCity!.trim()] : [destination],
      cityMode:  isMulti ? "multi" : "one",
      cityDates,
      startDate: startIso,
      endDate:   endIso,
      returningUser: true,
      onboardingInProgress: true,
      templateSlug: slug,
      isTemplate: true,
      tripDays,
      templateStops: isAi ? getAiPickTemplateStops(slug) : null,
    });
    router.push("/onboarding/building" as any);
  }

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[s.hdr, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backTxt}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Make it yours</Text>
          <Text style={s.sub}>
            Pick your dates — AI adapts the {destination} template for your family.
          </Text>
          <View style={s.tmplPill}>
            <Text style={s.tmplPillTxt}>
              {"📋"} Template: {templateDays} days in {destination}
            </Text>
          </View>
        </View>

        {/* Calendar card */}
        <View style={s.card}>
          <View style={s.cardHdr}>
            <Text style={s.cardIco}>{"📅"}</Text>
            <Text style={s.cardTitle}>When are you going?</Text>
          </View>
          <View style={s.cardBody}>
            <MiniCalendar
              start={start} end={end}
              viewYear={viewYear} viewMonth={viewMonth}
              onDay={onDay}
              onPrev={()=>{
                if (viewMonth===0) { setViewYear(y=>y-1); setViewMonth(11); }
                else setViewMonth(m=>m-1);
              }}
              onNext={()=>{
                if (viewMonth===11) { setViewYear(y=>y+1); setViewMonth(0); }
                else setViewMonth(m=>m+1);
              }}
              canPrev={canPrev}
            />
            {start && end && (
              <View style={s.adaptNoteRow}>
                <Text style={s.adaptNoteIco}>{"✨"}</Text>
                <Text style={s.adaptNoteTxt}>{adaptNote}</Text>
              </View>
            )}
          </View>
        </View>
        {/* Second city card */}
        {!showSecondCity ? (
          <TouchableOpacity
            onPress={() => setShowSecondCity(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 4 }}
          >
            <Text style={{ fontSize: 14, color: G.orange, fontWeight: '600', fontFamily: F.semibold }}>
              + Add a second city
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{
            backgroundColor: '#fff', borderRadius: 16, padding: 16,
            marginBottom: 12, borderWidth: 1, borderColor: '#EDE9E3',
          }}>
            {/* Second city input */}
            <Text style={{ fontSize: 11, color: '#8A8FA8', letterSpacing: 0.08, textTransform: 'uppercase', marginBottom: 6, fontFamily: F.regular }}>
              Second city
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TextInput
                value={secondCity ?? ''}
                onChangeText={setSecondCity}
                placeholder="e.g. Chicago"
                placeholderTextColor="#8A8FA8"
                style={{
                  flex: 1, height: 44, borderWidth: 1, borderColor: '#E0DDD8',
                  borderRadius: 10, paddingHorizontal: 14, fontSize: 15,
                  color: '#1A1F2E', backgroundColor: '#F5F2EE', fontFamily: F.regular,
                }}
              />
              <TouchableOpacity onPress={() => { setShowSecondCity(false); setSecondCity(null); }}>
                <Text style={{ fontSize: 13, color: '#8A8FA8', fontFamily: F.regular }}>Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Day stepper — only when second city has text */}
            {secondCity && secondCity.trim().length > 0 && (
              <>
                <Text style={{ fontSize: 11, color: '#8A8FA8', letterSpacing: 0.08, textTransform: 'uppercase', marginBottom: 10, fontFamily: F.regular }}>
                  Days per city
                </Text>

                {/* City 1 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, color: '#1A1F2E', flex: 1, fontFamily: F.regular }}>{destination}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => { if (city1Days > 1 && city2Days < tripDays - 1) { setCity1Days(d => d - 1); setCity2Days(d => d + 1); } }}>
                      <Text style={{ fontSize: 20, color: G.orange, fontWeight: '600' }}>{'\u2212'}</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1F2E', minWidth: 24, textAlign: 'center', fontFamily: F.bold }}>{city1Days}</Text>
                    <TouchableOpacity onPress={() => { if (city2Days > 1 && city1Days < tripDays - 1) { setCity1Days(d => d + 1); setCity2Days(d => d - 1); } }}>
                      <Text style={{ fontSize: 20, color: G.orange, fontWeight: '600' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* City 2 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: '#1A1F2E', flex: 1, fontFamily: F.regular }}>{secondCity}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => { if (city2Days > 1 && city1Days < tripDays - 1) { setCity2Days(d => d - 1); setCity1Days(d => d + 1); } }}>
                      <Text style={{ fontSize: 20, color: G.orange, fontWeight: '600' }}>{'\u2212'}</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1F2E', minWidth: 24, textAlign: 'center', fontFamily: F.bold }}>{city2Days}</Text>
                    <TouchableOpacity onPress={() => { if (city1Days > 1 && city2Days < tripDays - 1) { setCity2Days(d => d + 1); setCity1Days(d => d - 1); } }}>
                      <Text style={{ fontSize: 20, color: G.orange, fontWeight: '600' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={{ fontSize: 11, color: '#8A8FA8', textAlign: 'center', marginTop: 10, fontFamily: F.regular }}>
                  {city1Days + city2Days} days total{'\u00B7 adjusts automatically'}
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sticky build CTA */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[s.ctaBtn, !canBuild && { opacity: 0.45 }]}
          onPress={handleBuild}
          activeOpacity={canBuild ? 0.88 : 1}
        >
          <Text style={s.ctaBtnTxt}>
            {showSecondCity && secondCity?.trim()
              ? `Build my ${destination} + ${secondCity.trim()} trip \u2192`
              : `Build my ${destination} trip \u2192`}
          </Text>
        </TouchableOpacity>
        <Text style={s.ctaNote}>Takes about 10 seconds · Personalised for your family</Text>
      </View>
    </View>
  );
}

// ─ Styles ───────────────────────────────────────────────────────────────

const c = StyleSheet.create({
  cal: { backgroundColor: G.card, borderRadius: 14 },
  monthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  navTxt: { fontFamily: F.bold, fontSize: 22, color: G.deep, lineHeight: 28 },
  monthTxt: { fontFamily: F.bold, fontSize: 15, color: G.deep },
  dowRow: { flexDirection: "row", marginBottom: 6 },
  dowLbl: { flex: 1, textAlign: "center", fontFamily: F.bold, fontSize: 11, color: G.muted },
  weekRow: { flexDirection: "row" },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellRange: { backgroundColor: G.oLt },
  inner: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dayTxt: { fontFamily: F.bold, fontSize: 13, color: G.muted },
  summary: { marginTop: 10 },
  summaryTxt: { fontFamily: F.bold, fontSize: 13, color: G.orange, textAlign: "center" },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  hdr: { marginBottom: 16 },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(26,31,46,0.08)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14,
  },
  backTxt: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  title: { fontFamily: F.bold, fontSize: 26, color: G.deep, letterSpacing: -0.5, marginBottom: 4 },
  sub: { fontFamily: F.regular, fontSize: 14, color: G.muted, lineHeight: 22, marginBottom: 12 },
  tmplPill: {
    alignSelf: "flex-start",
    backgroundColor: G.oLt, borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 7,
  },
  tmplPillTxt: { fontFamily: F.bold, fontSize: 12, color: G.orange },

  card: {
    backgroundColor: G.card, borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(26,31,46,0.08)",
    marginBottom: 14, overflow: "hidden",
  },
  cardHdr: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(26,31,46,0.06)",
  },
  cardIco: { fontSize: 17 },
  cardTitle: { fontFamily: F.bold, fontSize: 15, color: G.deep },
  cardBody: { padding: 14 },

  adaptNoteRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: 14, backgroundColor: "rgba(232,105,42,0.06)",
    borderRadius: 12, padding: 12,
  },
  adaptNoteIco: { fontSize: 14 },
  adaptNoteTxt: { flex: 1, fontFamily: F.regular, fontSize: 13, color: G.deep, lineHeight: 20 },

  ctaBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: G.bg,
    borderTopWidth: 1, borderTopColor: "rgba(26,31,46,0.08)",
    paddingTop: 14, paddingHorizontal: 16,
  },
  ctaBtn: {
    backgroundColor: G.orange, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    shadowColor: G.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    marginBottom: 5,
  },
  ctaBtnTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  ctaNote: { fontFamily: F.regular, fontSize: 12, color: G.muted, textAlign: "center" },
});
