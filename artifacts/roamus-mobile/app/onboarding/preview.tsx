import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, G } from "@/lib/tokens";
import { useOnboarding, type PreviewDay } from "@/lib/onboardingContext";
import { useLandmarkImage } from "@/lib/useLandmarkImage";

// ─── Types ──────────────────────────────────────────────────────────────────
type DisplayStop = { time: string; name: string; desc: string; tag: string; tagColor: string; img: string };
type DisplayDay  = { label: string; city: string; stops: DisplayStop[] };

// ─── Stop type → tag + color ─────────────────────────────────────────────────
const STOP_TAG: Record<string, { label: string; color: string }> = {
  museum:        { label: "🏛️ Museum",   color: "#7B6FE8" },
  park:          { label: "🌿 Outdoors", color: G.sage   },
  nature:        { label: "🌿 Outdoors", color: G.sage   },
  garden:        { label: "🌿 Outdoors", color: G.sage   },
  food:          { label: "🍕 Food",     color: G.amber  },
  restaurant:    { label: "🍕 Food",     color: G.amber  },
  market:        { label: "🍕 Food",     color: G.amber  },
  landmark:      { label: "📍 Landmark", color: G.muted  },
  monument:      { label: "📍 Landmark", color: G.muted  },
  viewpoint:     { label: "🔭 Viewpoint", color: G.sage  },
  palace:        { label: "📍 Landmark", color: G.muted  },
  temple:        { label: "📍 Landmark", color: G.muted  },
  zoo:           { label: "🦁 Animals",  color: G.orange },
  aquarium:      { label: "🦁 Animals",  color: G.orange },
  art:           { label: "🎨 Art",      color: "#E86A9A"},
  gallery:       { label: "🎨 Art",      color: "#E86A9A"},
  science:       { label: "🔬 Science",  color: G.sage   },
  entertainment: { label: "🎡 Fun",      color: "#7B6FE8"},
  playground:    { label: "🎡 Fun",      color: "#7B6FE8"},
  beach:         { label: "🌊 Beach",    color: "#4B9EE8"},
  other:         { label: "⭐ Stop",     color: G.muted  },
};

// ─── Stop type → images (multiple per type for variety) ──────────────────────
const STOP_IMGS: Record<string, string[]> = {
  museum:        [
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200&q=80",
    "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=200&q=80",
    "https://images.unsplash.com/photo-1605359503512-2c17ae5f5c7d?w=200&q=80",
  ],
  park:          [
    "https://images.unsplash.com/photo-1585572219585-c6e1e19eec21?w=200&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=80",
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=200&q=80",
  ],
  nature:        [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&q=80",
    "https://images.unsplash.com/photo-1448375240586-3b2ebb6a4caf?w=200&q=80",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=200&q=80",
  ],
  food:          [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=80",
  ],
  restaurant:    [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80",
  ],
  market:        [
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3df4?w=200&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80",
  ],
  landmark:      [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&q=80",
    "https://images.unsplash.com/photo-1534430480872-0db0c9b7c843?w=200&q=80",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=80",
  ],
  monument:      [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&q=80",
    "https://images.unsplash.com/photo-1534430480872-0db0c9b7c843?w=200&q=80",
  ],
  viewpoint:     [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80",
    "https://images.unsplash.com/photo-1535440064982-89fa6c29be2e?w=200&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&q=80",
  ],
  palace:        [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&q=80",
    "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=200&q=80",
  ],
  temple:        [
    "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=200&q=80",
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&q=80",
  ],
  zoo:           [
    "https://images.unsplash.com/photo-1503095396549-807759245b35?w=200&q=80",
    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=200&q=80",
    "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=200&q=80",
  ],
  aquarium:      [
    "https://images.unsplash.com/photo-1461696114087-397271a7aedc?w=200&q=80",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=200&q=80",
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&q=80",
  ],
  art:           [
    "https://images.unsplash.com/photo-1531913223931-c43e5f4c6cd0?w=200&q=80",
    "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=200&q=80",
    "https://images.unsplash.com/photo-1547826039-a80c2eb5d62b?w=200&q=80",
  ],
  gallery:       [
    "https://images.unsplash.com/photo-1531913223931-c43e5f4c6cd0?w=200&q=80",
    "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=200&q=80",
  ],
  science:       [
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=200&q=80",
    "https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=200&q=80",
    "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=200&q=80",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=200&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80",
    "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200&q=80",
  ],
  playground:    [
    "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=200&q=80",
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=200&q=80",
  ],
  beach:         [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80",
    "https://images.unsplash.com/photo-1510414696678-2415ad8474aa?w=200&q=80",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=200&q=80",
  ],
  neighborhood:  [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&q=80",
    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=200&q=80",
  ],
  other:         [
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=200&q=80",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=80",
  ],
  default:       ["https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=200&q=80"],
};

function stopImg(type?: string, idx = 0): string {
  const fallback = STOP_IMGS.default[0];
  if (!type) return fallback;
  const k = Object.keys(STOP_IMGS).find(k => type.toLowerCase().includes(k));
  if (!k) return fallback;
  const urls = STOP_IMGS[k];
  return urls[idx % urls.length];
}

// ─── Convert API preview days to display format ──────────────────────────────
function toDisplayDays(previewDays: PreviewDay[], cities: string[]): DisplayDay[] {
  return previewDays.map((day, i) => {
    const city = cities[0] ?? "Your City";
    return {
      label: day.label,
      city,
      stops: day.stops.map((stop, si) => {
        const typeKey = Object.keys(STOP_TAG).find(k => stop.stopType?.toLowerCase().includes(k));
        const tagInfo = typeKey ? STOP_TAG[typeKey] : { label: "⭐ Stop", color: G.muted };
        return {
          time: stop.time,
          name: stop.name,
          desc: stop.description,
          tag: tagInfo.label,
          tagColor: tagInfo.color,
          img: stopImg(stop.stopType, si),
        };
      }),
    };
  });
}

// ─── Compute days from date range (extending beyond API data if needed) ───────
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function dateLabel(iso: string, dayIdx: number): string {
  const d = new Date(iso); d.setDate(d.getDate() + dayIdx);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function buildAllDays(
  apiDays: DisplayDay[],
  startDate: string | null,
  endDate:   string | null,
  cities:    string[],
  cityDates: Record<string, { arrive: string|null; leave: string|null }> | undefined,
): DisplayDay[] {
  const totalDays = (startDate && endDate)
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : Math.max(apiDays.length, 1);

  // Build a map of dayIndex → city (for multi-city trips)
  const dayCities: string[] = [];
  if (cities.length > 1 && cityDates) {
    cities.forEach(city => {
      const cd = cityDates[city];
      if (!cd?.arrive || !cd?.leave) return;
      const n = Math.max(1, Math.round((new Date(cd.leave).getTime() - new Date(cd.arrive).getTime()) / 86400000) + 1);
      for (let i = 0; i < n; i++) dayCities.push(city);
    });
  }
  while (dayCities.length < totalDays) dayCities.push(cities[0] ?? "Your City");

  // apiDays contain stops for the PRIMARY city only — never recycle them into
  // days that belong to a different city (fixes NY days showing Chicago stops)
  const primaryBase = apiDays.length > 0 ? apiDays : FALLBACK_DAYS;
  const primaryCity = cities[0] ?? "Your City";

  let primaryIdx = 0;
  let otherIdx   = 0;
  const result: DisplayDay[] = [];

  for (let i = 0; i < totalDays; i++) {
    const city      = dayCities[i] ?? primaryCity;
    const isPrimary = cities.length === 1 || city === primaryCity;

    let src: DisplayDay;
    if (isPrimary) {
      src = primaryBase[primaryIdx % primaryBase.length];
      primaryIdx++;
    } else {
      // Use generic FALLBACK_DAYS for non-primary cities so we never
      // display e.g. "Chicago Children's Museum" on a New York day
      src = FALLBACK_DAYS[otherIdx % FALLBACK_DAYS.length];
      otherIdx++;
    }

    result.push({ label: `Day ${i + 1}`, city, stops: src.stops.map(st => ({ ...st })) });
  }
  return result;
}

// ─── Fallback days ────────────────────────────────────────────────────────────
const FALLBACK_DAYS: DisplayDay[] = [
  {
    label: "Day 1", city: "Your City",
    stops: [
      { time: "9:30 AM",  name: "City Welcome Walk",  desc: "Get your bearings with a morning stroll through the historic heart.",        tag: "🌿 Outdoors", tagColor: G.sage,   img: STOP_IMGS.park[0] },
      { time: "12:00 PM", name: "Local Food Market",   desc: "Lunch surrounded by flavours the whole family will love.",                   tag: "🍕 Food",     tagColor: G.amber,  img: STOP_IMGS.food[0] },
      { time: "3:00 PM",  name: "Family Museum",       desc: "Interactive exhibits designed for curious minds at every age.",              tag: "🔬 Science",  tagColor: "#7B6FE8", img: STOP_IMGS.museum[0] },
    ],
  },
  {
    label: "Day 2", city: "Your City",
    stops: [
      { time: "10:00 AM", name: "Nature & Wildlife",  desc: "Connect with the local ecosystem — perfect for your youngest explorer.",     tag: "🦁 Animals",  tagColor: G.orange, img: STOP_IMGS.zoo[0] },
      { time: "2:00 PM",  name: "Iconic Landmark",    desc: "The shot everyone takes — and the story your family will tell for years.",   tag: "📍 Landmark", tagColor: G.muted,  img: STOP_IMGS.landmark[0] },
    ],
  },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useOnboarding();

  const primaryCity = data.cities[0] ?? "Your City";
  const isMulti = data.cities.length > 1;

  const apiDays = useMemo<DisplayDay[]>(() => {
    if (data.generatedTrip?.days && data.generatedTrip.days.length > 0) {
      return toDisplayDays(data.generatedTrip.days, data.cities);
    }
    return [];
  }, [data.generatedTrip, data.cities]);

  const allDays = useMemo<DisplayDay[]>(() => {
    return buildAllDays(apiDays, data.startDate, data.endDate, data.cities, data.cityDates);
  }, [apiDays, data.startDate, data.endDate, data.cities, data.cityDates]);

  const [activeDay, setActiveDay] = useState(0);
  const curDay = allDays[activeDay];
  const totalStops = allDays.reduce((a, d) => a + d.stops.length, 0);

  // Date range label
  const dateRange = useMemo(() => {
    if (!data.startDate || !data.endDate) return "";
    const s = new Date(data.startDate), e = new Date(data.endDate);
    return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}`;
  }, [data.startDate, data.endDate]);

  // Hero image: prefer cached landmark art; fall back to colour-only placeholder
  const landmarkImg = useLandmarkImage(primaryCity);

  // Title
  const tripTitle = isMulti
    ? `Your ${data.cities.slice(0,-1).join(", ")} & ${data.cities[data.cities.length-1]} trip is ready 🎉`
    : `Your ${primaryCity} trip is ready 🎉`;
  const routeStr = isMulti ? data.cities.join(" → ") : "";

  return (
    <View style={[s.root, { backgroundColor: "#1A1F2E" }]}>
      {/* ── Hero header ── */}
      <View style={[s.hero, { paddingTop: insets.top + 16 }]}>
        {landmarkImg ? (
          <Image source={{ uri: landmarkImg }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.heroPlaceholder]} />
        )}
        <LinearGradient colors={["rgba(26,31,46,0.15)","rgba(26,31,46,0.97)"]} locations={[0,1]} style={StyleSheet.absoluteFill} />
        <View style={s.heroContent}>
          <Text style={s.heroTitle}>{tripTitle}</Text>
          {routeStr ? <Text style={s.heroRoute}>{routeStr}</Text> : null}
          <Text style={s.heroMeta}>
            {allDays.length} day{allDays.length !== 1 ? "s" : ""}
            {totalStops > 0 ? ` · ${totalStops} stops` : ""}
            {dateRange ? ` · ${dateRange}` : ""}
          </Text>
        </View>
      </View>

      {/* ── Day tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabs}
      >
        {allDays.map((d, i) => (
          <Pressable key={i} onPress={() => setActiveDay(i)} style={[s.tab, activeDay === i && s.tabActive]}>
            <Text style={[s.tabDay, activeDay === i && s.tabDayActive]}>Day {i + 1}</Text>
            {isMulti && (
              <Text style={[s.tabCity, activeDay === i && s.tabCityActive]} numberOfLines={1}>{d.city}</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Stops list ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.stopList, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Day section header */}
        <Text style={s.dayHeader}>
          {curDay?.label.toUpperCase()}{isMulti && curDay?.city ? ` — ${curDay.city.toUpperCase()}` : ""}
        </Text>

        {curDay?.stops.map((stop, i) => (
          <View key={i} style={s.stopCard}>
            <Image source={{ uri: stop.img }} style={s.stopImg} contentFit="cover" />
            <View style={s.stopBody}>
              <Text style={s.stopTime}>{stop.time}</Text>
              <Text style={s.stopName}>{stop.name}</Text>
              <Text style={s.stopDesc} numberOfLines={2}>{stop.desc}</Text>
              <View style={[s.stopTag, { backgroundColor: stop.tagColor + "22", borderColor: stop.tagColor + "44" }]}>
                <Text style={[s.stopTagText, { color: stop.tagColor }]}>{stop.tag}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Lock teaser */}
        <View style={s.blurCard}>
          <Text style={s.blurIcon}>🔒</Text>
          <Text style={s.blurTitle}>Your full {allDays.length}-day plan is ready</Text>
          <Text style={s.blurSub}>Create a free account to unlock all stops, offline access, and photo journals</Text>
        </View>
      </ScrollView>

      {/* ── CTA ── */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [s.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => router.push("/onboarding/account")}
        >
          <Text style={s.ctaBtnText}>Save this trip — it's free →</Text>
        </Pressable>
        <Text style={s.ctaHint}>Free account · All stops visible · No card needed</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: { position: "relative", paddingHorizontal: 20, paddingBottom: 20 },
  heroPlaceholder: { backgroundColor: G.deep },
  heroContent: {},
  heroTitle: { fontFamily:F.bold, fontSize:20, fontWeight:"800", color:"#fff", letterSpacing:-0.4, lineHeight:27, marginBottom:4 },
  heroRoute: { fontFamily:F.semibold, fontSize:14, fontWeight:"600", color:G.orange, marginBottom:3 },
  heroMeta: { fontFamily:F.regular, fontSize:13, color:"rgba(255,255,255,0.55)" },
  tabsScroll: { flexShrink:0, height:68 },
  tabs: { paddingHorizontal:20, paddingVertical:10, gap:8, alignItems:"center" },
  tab: { paddingVertical:8, paddingHorizontal:14, borderRadius:20, backgroundColor:"rgba(255,255,255,0.08)", alignItems:"center", minWidth:72 },
  tabActive: { backgroundColor:G.orange },
  tabDay: { fontFamily:F.semibold, fontSize:13, fontWeight:"600", color:"rgba(255,255,255,0.5)" },
  tabDayActive: { color:"#fff" },
  tabCity: { fontFamily:F.regular, fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 },
  tabCityActive: { color:"rgba(255,255,255,0.8)" },
  dayHeader: { fontFamily:F.bold, fontSize:11, fontWeight:"700", color:G.orange, letterSpacing:1, marginBottom:10, paddingHorizontal:20 },
  stopList: { paddingTop:12, paddingBottom:0 },
  stopCard: { flexDirection:"row", backgroundColor:"rgba(255,255,255,0.06)", borderRadius:14, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.08)", marginHorizontal:20, marginBottom:10 },
  stopImg: { width:80, height:94 },
  stopBody: { flex:1, padding:12, gap:3 },
  stopTime: { fontFamily:F.regular, fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:0.2 },
  stopName: { fontFamily:F.bold, fontSize:15, fontWeight:"700", color:"#fff" },
  stopDesc: { fontFamily:F.regular, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:17 },
  stopTag: { alignSelf:"flex-start", borderRadius:8, borderWidth:1, paddingHorizontal:7, paddingVertical:3, marginTop:2 },
  stopTagText: { fontFamily:F.medium, fontSize:11, fontWeight:"500" },
  blurCard: { marginHorizontal:20, backgroundColor:"rgba(232,105,42,0.08)", borderWidth:1.5, borderColor:"rgba(232,105,42,0.2)", borderRadius:14, padding:20, alignItems:"center", marginTop:4 },
  blurIcon: { fontSize:24, marginBottom:8 },
  blurTitle: { fontFamily:F.bold, fontSize:15, fontWeight:"700", color:"#fff", marginBottom:4, textAlign:"center" },
  blurSub: { fontFamily:F.regular, fontSize:13, color:"rgba(255,255,255,0.5)", textAlign:"center" },
  cta: { position:"absolute", left:0, right:0, bottom:0, paddingHorizontal:24, paddingTop:14, backgroundColor:"rgba(26,31,46,0.95)" },
  ctaBtn: { height:56, borderRadius:28, backgroundColor:G.orange, alignItems:"center", justifyContent:"center", marginBottom:8 },
  ctaBtnText: { fontFamily:F.bold, fontSize:17, fontWeight:"700", color:"#fff" },
  ctaHint: { fontFamily:F.regular, fontSize:13, color:"rgba(255,255,255,0.5)", textAlign:"center" },
});
