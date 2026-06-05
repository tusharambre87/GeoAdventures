import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, G } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";
import { getAiPickTemplateStops } from "@/lib/discoverData";

// ─── Calendar helpers ─────────────────────────────────────────────────────────

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

// ─── AI notes by days count ───────────────────────────────────────────────────

function getDayNote(requested: number, templateDays: number, destination: string): string {
  if (requested < templateDays) {
    return `Fewer than template — AI keeps the top ${requested * 3} stops and removes the rest`;
  }
  if (requested === templateDays) {
    return `Same as template — all stops included, timing personalised for your kids`;
  }
  return `More than template — AI adds ${(requested - templateDays) * 3} new ${destination} stops your kids will love`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE_DAYS = 3;

export default function DiscoverCustomizeScreen() {
  const { slug, isAiPick, destination: destParam, templateDays: tdParam } = useLocalSearchParams<{
    slug: string;
    isAiPick: string;
    destination: string;
    templateDays: string;
  }>();
  const insets = useSafeAreaInsets();
  const { set: setOnboarding } = useOnboarding();

  const destination = destParam ? decodeURIComponent(destParam) : slug.replace(/^ai-/, "").replace(/-/g, " ");
  const templateDays = tdParam ? parseInt(tdParam, 10) || DEFAULT_TEMPLATE_DAYS : DEFAULT_TEMPLATE_DAYS;

  const today = useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; },[]);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [start, setStart] = useState<Date|null>(null);
  const [end, setEnd] = useState<Date|null>(null);
  const [days, setDays] = useState(templateDays);

  const canPrev = viewYear > today.getFullYear() || (viewYear===today.getFullYear() && viewMonth>today.getMonth());

  function onDay(day: number) {
    const tapped = new Date(viewYear, viewMonth, day);
    if (tapped < today) return;
    if (!start || (start && end)) { setStart(tapped); setEnd(null); }
    else if (tapped < start) { setEnd(start); setStart(tapped); }
    else setEnd(tapped);
  }

  function handleBuild() {
    const startIso = start ? toISO(start) : null;
    const endIso = end ? toISO(end) : null;
    const isAi = isAiPick === "true";
    setOnboarding({
      cities: [destination],
      cityMode: "one",
      startDate: startIso,
      endDate: endIso,
      returningUser: true,
      onboardingInProgress: true,
      templateSlug: slug,
      isTemplate: true,
      tripDays: days,
      templateStops: isAi ? getAiPickTemplateStops(slug) : null,
    });
    router.push("/onboarding/building" as any);
  }

  const dayNote = getDayNote(days, templateDays, destination);
  const canBuild = true; // date is optional — we allow proceeding without dates

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
            Tell us when and how long — AI adapts the {destination} template for your family.
          </Text>
          <View style={s.tmplPill}>
            <Text style={s.tmplPillTxt}>
              {"📋"} Template: {templateDays} Days in {destination} · {templateDays * 3} stops
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
          </View>
        </View>

        {/* Days card */}
        <View style={s.card}>
          <View style={s.cardHdr}>
            <Text style={s.cardIco}>{"🗓"}</Text>
            <Text style={s.cardTitle}>How many days?</Text>
          </View>
          <View style={s.cardBody}>
            <View style={s.dayBtns}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[s.dayBtn, days === n && s.dayBtnOn]}
                  onPress={() => setDays(n)}
                >
                  <Text style={[s.dayBtnN, days === n && s.dayBtnNOn]}>{n}</Text>
                  <Text style={[s.dayBtnLbl, days === n && s.dayBtnLblOn]}>day{n !== 1 ? "s" : ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.dayNote}>{dayNote}</Text>
          </View>
        </View>

        {/* AI adaptation card */}
        <View style={s.card}>
          <View style={s.cardHdr}>
            <Text style={s.cardIco}>{"✨"}</Text>
            <Text style={s.cardTitle}>How AI adapts this trip</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={s.adaptNote}>
              AI adjusts stop order, travel time estimates, and kid-friendly pacing to match your family.
              {days < templateDays
                ? `\nFewer days: keeps the highest-rated ${destination} stops.`
                : days > templateDays
                ? `\nExtra days: adds more ${destination} stops your kids will love.`
                : `\nSame length as the template — personalised timing for your travelers.`
              }
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky build CTA */}
      <View style={[s.ctaBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={[s.ctaBtn, !canBuild && s.ctaBtnDisabled]}
          onPress={canBuild ? handleBuild : undefined}
          activeOpacity={0.88}
        >
          <Text style={s.ctaBtnTxt}>Build my {destination} trip →</Text>
        </TouchableOpacity>
        <Text style={s.ctaNote}>Takes about 10 seconds · Personalised for your family</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  dayBtns: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 12 },
  dayBtn: {
    width: 52, height: 56, borderRadius: 14,
    borderWidth: 2, borderColor: "rgba(26,31,46,0.08)",
    backgroundColor: G.card,
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  dayBtnOn: { borderColor: G.orange, backgroundColor: G.oLt },
  dayBtnN: { fontFamily: F.bold, fontSize: 15, color: G.muted },
  dayBtnNOn: { color: G.orange },
  dayBtnLbl: { fontFamily: F.bold, fontSize: 9, color: G.muted },
  dayBtnLblOn: { color: G.orange },
  dayNote: { fontFamily: F.regular, fontSize: 13, color: G.muted, textAlign: "center", lineHeight: 20 },

  adaptNote: { fontFamily: F.regular, fontSize: 13, color: G.muted, lineHeight: 20 },

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
  ctaBtnDisabled: { backgroundColor: "rgba(232,105,42,0.35)" },
  ctaBtnTxt: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  ctaNote: { fontFamily: F.regular, fontSize: 12, color: G.muted, textAlign: "center" },
});
