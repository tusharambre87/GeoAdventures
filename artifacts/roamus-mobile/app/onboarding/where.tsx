import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackBtn, BigBtn, ProgressDots } from "@/lib/onboardingAtoms";
import { ALL_CITIES, CITY_IMGS, F, G, POPULAR_CITIES, type CityEntry } from "@/lib/tokens";
import { useOnboarding } from "@/lib/onboardingContext";
import { API_BASE } from "@/lib/authContext";

const STOP_TIMES = ["9:30", "11:30", "2:00", "3:30"];

// City name → canonical name used when querying the API (handles abbreviations)
const CITY_CANONICAL: Record<string, string> = {
  "Saint Louis": "St. Louis",
  "Saint Paul":  "St. Paul",
};

const STOP_IMGS_MULTI: Record<string, string[]> = {
  museum:        [
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100&q=70",
    "https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=100&q=70",
    "https://images.unsplash.com/photo-1605359503512-2c17ae5f5c7d?w=100&q=70",
  ],
  park:          [
    "https://images.unsplash.com/photo-1585572219585-c6e1e19eec21?w=100&q=70",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&q=70",
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=100&q=70",
  ],
  nature:        [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100&q=70",
    "https://images.unsplash.com/photo-1448375240586-3b2ebb6a4caf?w=100&q=70",
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=100&q=70",
  ],
  food:          [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&q=70",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&q=70",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=100&q=70",
  ],
  restaurant:    [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&q=70",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&q=70",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&q=70",
  ],
  market:        [
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3df4?w=100&q=70",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&q=70",
  ],
  landmark:      [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=100&q=70",
    "https://images.unsplash.com/photo-1534430480872-0db0c9b7c843?w=100&q=70",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=100&q=70",
  ],
  aquarium:      [
    "https://images.unsplash.com/photo-1461696114087-397271a7aedc?w=100&q=70",
    "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=100&q=70",
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=100&q=70",
  ],
  zoo:           [
    "https://images.unsplash.com/photo-1503095396549-807759245b35?w=100&q=70",
    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=100&q=70",
    "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=100&q=70",
  ],
  art:           [
    "https://images.unsplash.com/photo-1531913223931-c43e5f4c6cd0?w=100&q=70",
    "https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=100&q=70",
    "https://images.unsplash.com/photo-1547826039-a80c2eb5d62b?w=100&q=70",
  ],
  science:       [
    "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=100&q=70",
    "https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=100&q=70",
    "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=100&q=70",
  ],
  garden:        [
    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=100&q=70",
    "https://images.unsplash.com/photo-1416879595882-3db3e9e8f162?w=100&q=70",
    "https://images.unsplash.com/photo-1567696911550-a2516e70bfa3?w=100&q=70",
  ],
  beach:         [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&q=70",
    "https://images.unsplash.com/photo-1510414696678-2415ad8474aa?w=100&q=70",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=100&q=70",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=100&q=70",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&q=70",
  ],
  playground:    [
    "https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=100&q=70",
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=100&q=70",
  ],
  neighborhood:  [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=100&q=70",
    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=100&q=70",
  ],
  viewpoint:     [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&q=70",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&q=70",
  ],
  palace:        [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=100&q=70",
    "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=100&q=70",
  ],
  temple:        [
    "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=100&q=70",
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=100&q=70",
  ],
  other:         [
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=100&q=70",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=100&q=70",
  ],
  default:       ["https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=100&q=70"],
};

// emoji → type fallback (when API type field is missing)
const EMOJI_TYPE: Record<string, string> = {
  "🏛️": "museum", "🌿": "nature", "🗺️": "landmark", "🌄": "nature",
  "🦁": "zoo", "🐠": "aquarium", "🏖️": "beach", "🛒": "market",
  "🛝": "playground", "🍽️": "restaurant", "🔭": "viewpoint",
  "🌸": "garden", "🏰": "palace", "🛕": "temple", "⭐": "other",
};

function stopImg(spot: { type?: string; emoji?: string }, idx = 0) {
  const type = spot.type || EMOJI_TYPE[spot.emoji ?? ""] || "";
  const fallback = STOP_IMGS_MULTI.default[0];
  if (!type) return fallback;
  const k = Object.keys(STOP_IMGS_MULTI).find(k => type.toLowerCase().includes(k));
  if (!k) return fallback;
  const urls = STOP_IMGS_MULTI[k];
  return urls[idx % urls.length];
}

function stopTag(type?: string): string {
  if (!type) return "Free · All ages";
  const t = type.toLowerCase();
  if (t.includes("museum") || t.includes("art") || t.includes("science") || t.includes("aquarium") || t.includes("zoo")) return "Ticket · Ages 5+";
  if (t.includes("food") || t.includes("restaurant") || t.includes("market")) return "Food · All ages";
  return "Free · All ages";
}

// ─── Stop row in dark card ──────────────────────────────────────────────────
function StopRow({ spot, time, idx = 0 }: { spot: any; time: string; idx?: number }) {
  return (
    <View style={d.stopRow}>
      <Text style={d.stopTime}>{time}</Text>
      <Image source={{ uri: stopImg(spot, idx) }} style={d.stopImg} contentFit="cover" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={d.stopName} numberOfLines={1}>{spot.name}</Text>
        <Text style={d.stopDesc} numberOfLines={2}>{spot.reason || `Great ${spot.type || "stop"} for families`}</Text>
      </View>
      <View style={d.stopTag}>
        <Text style={d.stopTagText}>{stopTag(spot.type)}</Text>
      </View>
    </View>
  );
}

// ─── Route visualization (multi-city) ──────────────────────────────────────
function RouteViz({ cities }: { cities: string[] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
      {cities.map((city, i) => (
        <React.Fragment key={city}>
          {i > 0 && (
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 3, marginHorizontal: 4 }}>
              {Array(7).fill(0).map((_, j) => (
                <View key={j} style={{ width: 4, height: 1.5, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 1 }} />
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={d.routeCircle}>
              <Text style={d.routeNum}>{i + 1}</Text>
            </View>
            <Text style={d.routeCity}>{city.split(",")[0]}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── One-city dark top-stops card ──────────────────────────────────────────
function TopStopsCard({ city, spots, isLoading }: { city: string; spots: any[]; isLoading: boolean }) {
  return (
    <View style={d.card}>
      <View style={d.cardHeader}>
        <Text style={d.cardCity}>{city}</Text>
        <View style={d.topBadge}><Text style={d.topBadgeText}>Top stops</Text></View>
      </View>
      <View style={d.divider} />
      {spots.slice(0, 3).map((spot, i) => (
        <StopRow key={i} spot={spot} time={STOP_TIMES[i]} idx={i} />
      ))}
      {isLoading && spots.length === 0 && (
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.4)", paddingVertical: 12, textAlign: "center" }}>
          Loading top stops…
        </Text>
      )}
      {!isLoading && spots.length === 0 && (
        <Text style={{ fontFamily: F.regular, fontSize: 13, color: "rgba(255,255,255,0.35)", paddingVertical: 12, textAlign: "center" }}>
          Your personalised stop plan will be built after you continue
        </Text>
      )}
      <Text style={d.moreStops}>+ more stops added when we build your plan</Text>
    </View>
  );
}

// ─── Multi-city combined dark card ─────────────────────────────────────────
function MultiStopsCard({ cities, previews }: { cities: string[]; previews: Record<string, any> }) {
  return (
    <View style={d.card}>
      <Text style={d.cardRoute}>{cities.join(" → ")}</Text>
      <RouteViz cities={cities} />
      <Text style={d.routeSub}>Top stops across your route — your plan will have more</Text>
      <View style={d.divider} />
      {cities.map((city, ci) => {
        // null = still fetching, undefined = not started, object = done
        const isLoading = previews[city] === null || previews[city] === undefined;
        const spots: any[] = previews[city]?.spots ?? [];
        return (
          <View key={city}>
            <Text style={d.citySection}>{city.toUpperCase()}</Text>
            {spots.slice(0, 2).map((spot, i) => (
              <StopRow key={i} spot={spot} time={STOP_TIMES[i]} idx={i} />
            ))}
            {isLoading && spots.length === 0 && (
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: "rgba(255,255,255,0.35)", paddingVertical: 8, paddingLeft: 4 }}>
                Loading stops…
              </Text>
            )}
            {!isLoading && spots.length === 0 && (
              <Text style={{ fontFamily: F.regular, fontSize: 12, color: "rgba(255,255,255,0.25)", paddingVertical: 8, paddingLeft: 4 }}>
                Preview not available for this city
              </Text>
            )}
            {ci < cities.length - 1 && <View style={[d.divider, { marginVertical: 6 }]} />}
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function WhereScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();

  const [mode, setMode] = useState<"one" | "multi">(data.cityMode);
  const [sel, setSel] = useState<string[]>(data.cities);
  const [query, setQuery] = useState("");
  const [previews, setPreviews] = useState<Record<string, any>>({});
  const searchRef = useRef<TextInput>(null);
  // Track which cities have already had a fetch started (survives re-renders without stale closure issues)
  const fetchingRef = useRef<Set<string>>(new Set());

  const suggestions = useMemo<CityEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return ALL_CITIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.state?.toLowerCase().includes(q) ?? false) ||
      c.country.toLowerCase().includes(q)
    ).slice(0, 7);
  }, [query]);

  function fetchPreview(city: string) {
    if (fetchingRef.current.has(city)) return;
    fetchingRef.current.add(city);
    // null = loading state; use canonical name for the API query (Saint Louis → St. Louis)
    const apiCity = CITY_CANONICAL[city] ?? city;
    setPreviews(prev => ({ ...prev, [city]: null }));
    fetch(`${API_BASE}/api/travel/builder-preview?city=${encodeURIComponent(apiCity)}&childAges=5,8`)
      .then(r => r.ok ? r.json() : { spots: [] })
      .then(body => setPreviews(prev => ({ ...prev, [city]: body })))
      .catch(() => setPreviews(prev => ({ ...prev, [city]: { spots: [] } })));
  }

  useEffect(() => {
    sel.forEach(fetchPreview);
  }, [sel]);

  function selectCity(name: string) {
    if (mode === "one") {
      setSel([name]);
      setQuery("");
      fetchPreview(name);
    } else {
      if (!sel.includes(name) && sel.length < 3) {
        setSel(prev => [...prev, name]);
        fetchPreview(name);
      }
      setQuery("");
    }
  }

  function removeCity(name: string) {
    setSel(prev => prev.filter(c => c !== name));
  }

  function switchMode(m: "one" | "multi") {
    setMode(m);
    if (m === "one") setSel(sel.slice(0, 1));
    setQuery("");
  }

  function handleContinue() {
    set({ cities: sel, cityMode: mode });
    router.push("/onboarding/who");
  }

  const isMulti = mode === "multi";
  const canContinue = isMulti ? sel.length >= 2 : sel.length === 1;
  const showSuggestions = suggestions.length > 0;
  const showOneCityGrid = !isMulti && !showSuggestions;
  const showOneCityCard = !isMulti && sel.length > 0 && !showSuggestions;
  const showMultiCard = isMulti && sel.length >= 1 && !showSuggestions;
  const CARD_W = 164;

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      {/* ── Sticky header ── */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.navRow}>
          <BackBtn onPress={() => router.back()} />
          <View style={{ flex: 1, alignItems: "center" }}><ProgressDots total={4} cur={0} /></View>
          <View style={{ width: 40 }} />
        </View>
        <Text style={s.title}>Where are you headed?</Text>
        <Text style={s.sub}>We'll build a family plan around it.</Text>

        {/* Mode toggle */}
        <View style={s.toggle}>
          {(["one", "multi"] as const).map(v => (
            <Pressable key={v} onPress={() => switchMode(v)} style={[s.toggleTab, mode === v && s.toggleTabActive]}>
              <Text style={[s.toggleText, { color: mode === v ? G.deep : G.muted }]}>
                {v === "one" ? "📍 One City" : "🗺️ Multi-City"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search bar */}
        <View style={[s.searchBar, query ? { borderColor: "rgba(232,105,42,0.4)" } : {}]}>
          <Text style={{ fontSize: 14, color: G.muted }}>🔍</Text>
          <TextInput
            ref={searchRef}
            style={s.searchInput}
            placeholder={isMulti ? "Search cities to add to your route…" : "Search city, state, or country…"}
            placeholderTextColor={G.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="words"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Text style={{ color: G.muted, fontSize: 16 }}>×</Text>
            </Pressable>
          )}
        </View>

        {/* Multi-city: selected city chips */}
        {isMulti && (
          <View style={s.chipsRow}>
            {sel.map((city, i) => (
              <View key={city} style={s.chip}>
                <Text style={s.chipText}>{i + 1} {city}</Text>
                <Pressable onPress={() => removeCity(city)} hitSlop={6}>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 16 }}>×</Text>
                </Pressable>
              </View>
            ))}
            {sel.length < 3 && (
              <Pressable style={s.addChip} onPress={() => searchRef.current?.focus()}>
                <Text style={s.addChipText}>+ Add city</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Autocomplete dropdown */}
        {showSuggestions && (
          <View style={s.dropdown}>
            <FlatList
              data={suggestions}
              keyExtractor={item => item.name}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "rgba(26,31,46,0.05)", marginLeft: 44 }} />}
              renderItem={({ item }) => {
                const isSel = sel.includes(item.name);
                return (
                  <Pressable
                    style={({ pressed }) => [s.suggestion, pressed && { backgroundColor: G.oLt }]}
                    onPress={() => selectCity(item.name)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <Text style={{ fontSize: 16 }}>📍</Text>
                      <View>
                        <Text style={[s.suggestName, isSel && { color: G.orange }]}>{item.name}</Text>
                        <Text style={s.suggestSub}>{item.state ? `${item.state}, ` : ""}{item.country}</Text>
                      </View>
                    </View>
                    {isSel && <Text style={{ color: G.orange }}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.body, { paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Popular grid (one-city only, no search active) */}
        {showOneCityGrid && (
          <>
            <Text style={s.gridLabel}>POPULAR WITH FAMILIES</Text>
            <View style={s.gridRow}>
              {POPULAR_CITIES.map(c => {
                const selected = sel.includes(c.name);
                const img = CITY_IMGS[c.name];
                return (
                  <Pressable
                    key={c.name}
                    onPress={() => selectCity(c.name)}
                    style={[s.gridCard, { width: CARD_W }, selected && s.gridCardSelected]}
                  >
                    {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: G.muted + "44" }]} />}
                    <View style={s.cardGrad} />
                    {selected && <View style={s.checkBadge}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✓</Text></View>}
                    <View style={s.cardLabel}>
                      <Text style={s.cardName}>{c.name}</Text>
                      <Text style={s.cardSub}>{c.state ?? c.country}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Popular label for multi-city (quick add hint) */}
        {isMulti && !showSuggestions && (
          <Text style={s.gridLabel}>POPULAR WITH FAMILIES</Text>
        )}

        {/* One-city: dark top stops card */}
        {showOneCityCard && (
          <TopStopsCard
            city={sel[0]}
            spots={previews[sel[0]]?.spots ?? []}
            isLoading={previews[sel[0]] === null || previews[sel[0]] === undefined}
          />
        )}

        {/* Multi-city: combined dark stops card */}
        {showMultiCard && (
          <MultiStopsCard cities={sel} previews={previews} />
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 20 }]}>
        <BigBtn
          label={isMulti ? `Plan ${sel.length}-city route →` : "Continue →"}
          onPress={handleContinue}
          disabled={!canContinue}
        />
      </View>
    </View>
  );
}

// ─── Dark card styles ───────────────────────────────────────────────────────
const BG = "#1C1F2E";
const d = StyleSheet.create({
  card: { backgroundColor: BG, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  cardCity: { fontFamily: F.bold, fontSize: 18, fontWeight: "800", color: "#fff" },
  topBadge: { backgroundColor: G.orange, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  topBadgeText: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: "#fff" },
  cardRoute: { fontFamily: F.bold, fontSize: 17, fontWeight: "800", color: "#fff", marginBottom: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 8 },
  routeCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: G.orange, alignItems: "center", justifyContent: "center" },
  routeNum: { fontFamily: F.bold, fontSize: 12, fontWeight: "700", color: "#fff" },
  routeCity: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  routeSub: { fontFamily: F.regular, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 },
  citySection: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.orange, letterSpacing: 1, marginVertical: 6 },
  stopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  stopTime: { fontFamily: F.regular, fontSize: 12, color: "rgba(255,255,255,0.4)", width: 36, paddingTop: 2 },
  stopImg: { width: 48, height: 56, borderRadius: 8, flexShrink: 0, backgroundColor: "rgba(255,255,255,0.08)" },
  stopName: { fontFamily: F.bold, fontSize: 13, fontWeight: "700", color: "#fff" },
  stopDesc: { fontFamily: F.regular, fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 15, marginTop: 1 },
  stopTag: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-start", marginTop: 2, flexShrink: 0 },
  stopTagText: { fontFamily: F.regular, fontSize: 10, color: "rgba(255,255,255,0.55)" },
  moreStops: { fontFamily: F.regular, fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", paddingTop: 10 },
});

// ─── Screen styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, flexShrink: 0 },
  navRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  title: { fontFamily: F.bold, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, color: G.deep, marginBottom: 4 },
  sub: { fontFamily: F.regular, fontSize: 15, color: G.muted, marginBottom: 12 },
  toggle: { flexDirection: "row", gap: 5, backgroundColor: "rgba(26,31,46,0.07)", borderRadius: 14, padding: 4, marginBottom: 10 },
  toggleTab: { flex: 1, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  toggleTabActive: { backgroundColor: G.card, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  toggleText: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600" },
  searchBar: { backgroundColor: G.card, borderRadius: 26, height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 8, borderWidth: 1.5, borderColor: "rgba(26,31,46,0.08)", marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 14, color: G.deep, paddingVertical: 0 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: G.orange, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: "#fff" },
  addChip: { borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(26,31,46,0.2)", paddingVertical: 6, paddingHorizontal: 12 },
  addChipText: { fontFamily: F.semibold, fontSize: 13, fontWeight: "600", color: G.muted },
  dropdown: { backgroundColor: G.card, borderRadius: 16, borderWidth: 1, borderColor: "rgba(26,31,46,0.08)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 6, overflow: "hidden", marginBottom: 8 },
  suggestion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 11 },
  suggestName: { fontFamily: F.semibold, fontSize: 14, fontWeight: "600", color: G.deep },
  suggestSub: { fontFamily: F.regular, fontSize: 12, color: G.muted, marginTop: 1 },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  gridLabel: { fontFamily: F.bold, fontSize: 11, fontWeight: "700", color: G.muted, letterSpacing: 1, marginBottom: 10 },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  gridCard: { height: 112, borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  gridCardSelected: { borderWidth: 3, borderColor: G.orange },
  cardGrad: { position: "absolute", left: 0, right: 0, bottom: 0, height: 60, backgroundColor: "rgba(0,0,0,0.3)" },
  checkBadge: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: G.orange, alignItems: "center", justifyContent: "center" },
  cardLabel: { position: "absolute", bottom: 0, left: 0, padding: 8 },
  cardName: { fontFamily: F.bold, fontSize: 13, fontWeight: "700", color: "#fff" },
  cardSub: { fontFamily: F.regular, fontSize: 11, color: "rgba(255,255,255,0.72)" },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: G.bg, borderTopWidth: 1, borderTopColor: "rgba(26,31,46,0.06)" },
});
