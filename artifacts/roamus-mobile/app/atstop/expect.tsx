import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { G, F } from '@/lib/tokens';

export default function ExpectScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    stopName?: string;
    address?: string;
    enrichment?: string;
    meta?: string;
    pRef?: string;
    pProf?: string;
    duration?: string;
    minAge?: string;
    openingHours?: string;
    lat?: string;
    lon?: string;
    bookingUrl?: string;
    tripId?: string;
    stopId?: string;
  }>();

  const stopName     = params.stopName ? decodeURIComponent(params.stopName) : "This Stop";
  const address      = params.address  ? decodeURIComponent(params.address)  : "";
  const openingHours = params.openingHours ? decodeURIComponent(params.openingHours) : "";
  const enrichment   = params.enrichment ? JSON.parse(decodeURIComponent(params.enrichment)) : {};
  const meta         = params.meta       ? JSON.parse(decodeURIComponent(params.meta))       : {};
  const pRef         = params.pRef       ? JSON.parse(decodeURIComponent(params.pRef))       : {};
  const pProf        = params.pProf      ? JSON.parse(decodeURIComponent(params.pProf))      : {};
  const duration     = params.duration   ? Number(params.duration) : 60;
  const minAge       = params.minAge && params.minAge !== "" ? Number(params.minAge) : null;
  const lat          = params.lat && params.lat !== "" ? parseFloat(params.lat) : null;
  const lon          = params.lon && params.lon !== "" ? parseFloat(params.lon) : null;
  const bookingUrl   = params.bookingUrl ? decodeURIComponent(params.bookingUrl) : "";
  const tripId       = params.tripId ?? "";
  const stopId       = params.stopId  ?? "";

  // ── Nearby sub-sheet state ─────────────────────────────────────────────────
  type NearbySheet = 'food' | 'breaks' | 'kids' | null;
  const [nearbySheet, setNearbySheet] = useState<NearbySheet>(null);

  // ── Directions + Tickets ───────────────────────────────────────────────────
  const openDirections = () => {
    if (lat && lon) {
      const url = Platform.OS === "ios"
        ? "maps://app?daddr=" + lat + "," + lon + "&dirflg=d"
        : "google.navigation:q=" + lat + "," + lon;
      Linking.openURL(url).catch(() => {});
    } else {
      Linking.openURL(
        "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(address || stopName) + "&travelmode=walking"
      ).catch(() => {});
    }
  };

  const showTickets = pRef.bookingRequired === true || meta.ticketSignal === true;
  const ticketHref  = bookingUrl
    || "https://www.google.com/search?q=" + encodeURIComponent(stopName + " tickets");

  // ── Experience + Tips ─────────────────────────────────────────────────────
  const experienceText =
    enrichment.whyItWorks ?? pProf.whyItWorks ?? enrichment.whyNow
    ?? (stopName + " is a great stop for the whole family \u2014 explore at your own pace and look out for the highlights as you go.");

  const rawTips = enrichment.practicalTips ?? pProf.practicalTips;
  const practicalTips: string[] = rawTips
    ? (Array.isArray(rawTips)
        ? (rawTips as string[]).filter((s: string) => s.length > 2)
        : String(rawTips)
            .split(/\.\s+/)
            .map((s: string) => s.replace(/\.$/, "").trim())
            .filter((s: string) => s.length > 8))
    : [];

  // ── Timing rows ───────────────────────────────────────────────────────────
  const hours = openingHours || pRef.openingHours || "";
  type TimingRow = [string, string, string?];
  const timingRows: TimingRow[] = [
    ["Recommended time", "~" + duration + " min"],
    ["Best for", "Ages " + (minAge ?? 3) + "\u201312"],
    ["Crowd level now", "Good timing", "#3DAA6E"],
    ...(enrichment.bestTimeOfDay ?? pProf.bestTimeOfDay
        ? [["Best time to visit", enrichment.bestTimeOfDay ?? pProf.bestTimeOfDay] as TimingRow]
        : []),
    ...(hours ? [["Hours today", hours] as TimingRow] : []),
  ];

  // ── Access rows ───────────────────────────────────────────────────────────
  type AccessRow = { key: string; val: string; color?: string };
  const parking    = enrichment.parkingNotes ?? pProf.parkingNotes;
  const stroller   = enrichment.strollerFriendly ?? pProf.strollerFriendly;
  const restrooms  = enrichment.bathroomNotes ?? meta.restroomConfidence;
  const priceRange = pRef.priceRange ?? enrichment.priceRange;
  const admissionVal = priceRange
    ? priceRange
    : meta.ticketSignal === true
      ? "Ticket required"
      : meta.ticketSignal === false
        ? "Free entry"
        : "Free";
  const admissionColor = (meta.ticketSignal === false || (!priceRange && meta.ticketSignal !== true))
    ? G.green : G.deep;
  const accessRows: AccessRow[] = [
    parking != null
      ? { key: "Parking", val: parking || "Nearby", color: "#D97706" }
      : null,
    { key: "Stroller friendly", val: stroller ? "Yes" : "Check ahead",
      color: stroller ? G.green : G.muted },
    { key: "Restrooms",  val: restrooms || "On site" },
    { key: "Admission",  val: admissionVal, color: admissionColor },
    address ? { key: "Address", val: address } : null,
  ].filter((x): x is AccessRow => x !== null);

  // ── Nearby Essentials data helpers ────────────────────────────────────────
  const foodOptions  = enrichment.foodOptions ?? pProf.foodOptions ?? "";
  const nearbyStops: string[] = pProf.nearbyStops ?? enrichment.nearbyStops ?? [];

  type FoodItem  = { name: string; distance: string; cuisine: string; price: string };
  type PlaceItem = { name: string; distance: string; ageRange?: string; description: string | null };

  const getFoodNearby = (): FoodItem[] => {
    if (!foodOptions) return [{ name: "Restaurants nearby", distance: "Nearby", cuisine: "Various", price: "$$" }];
    return String(foodOptions)
      .split(/[\n;]/)
      .filter(Boolean)
      .slice(0, 4)
      .map(line => {
        const parts = line.split(" - ");
        return {
          name:     parts[0]?.trim() ?? line.trim(),
          distance: parts[1]?.trim() ?? "Nearby",
          cuisine:  parts[2]?.trim() ?? "Restaurant",
          price:    parts[3]?.trim() ?? "$$",
        };
      });
  };

  const getBreakSpots = (): PlaceItem[] => {
    const breakTypes = ["park", "cafe", "coffee", "garden", "plaza", "bench", "rest"];
    const filtered = nearbyStops
      .filter(s => breakTypes.some(t => s.toLowerCase().includes(t)))
      .slice(0, 4)
      .map(s => ({ name: s, distance: "Nearby", description: null }));
    if (filtered.length === 0) return [
      { name: "Parks nearby",  distance: "Tap Maps to find one", description: null },
      { name: "Cafes nearby",  distance: "Tap Maps to find one", description: null },
    ];
    return filtered;
  };

  const getKidExtras = (): PlaceItem[] => {
    const kidTypes = ["museum", "playground", "zoo", "aquarium", "theatre", "theater",
      "ice cream", "children", "kids", "play", "game", "library"];
    const filtered = nearbyStops
      .filter(s => kidTypes.some(t => s.toLowerCase().includes(t)))
      .slice(0, 4)
      .map(s => ({ name: s, distance: "Nearby", ageRange: "All ages", description: null }));
    if (filtered.length === 0) return [
      { name: "Kid-friendly places nearby", distance: "Tap Maps to explore", ageRange: "All ages", description: null },
    ];
    return filtered;
  };

  const handleAddFoodToPlan = async (restaurant: FoodItem) => {
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/add-stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: restaurant.name, type: "restaurant",
          latitude: lat, longitude: lon,
          dayIndex: 0,
          insertAfterStopId: stopId || undefined,
        }),
      });
      if (!res.ok) throw new Error("not ok");
      setNearbySheet(null);
    } catch {
      // Endpoint not ready — open Maps as fallback
      if (lat && lon)
        Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(restaurant.name)}&sll=${lat},${lon}`).catch(() => {});
      setNearbySheet(null);
    }
  };

  const mapsCoords = (q: string, z = 14) =>
    lat && lon
      ? `https://maps.apple.com/?q=${encodeURIComponent(q)}&sll=${lat},${lon}&z=${z}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + " near " + (address || stopName))}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{"←"} At Stop</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.stopLabel} numberOfLines={1}>{stopName}</Text>
        <Text style={styles.title}>{"What you'll experience"}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Directions + Tickets */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openDirections}>
            <Text style={styles.actionBtnText}>{"↗"}  Directions</Text>
          </TouchableOpacity>
          {showTickets && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.ticketBtn]}
              onPress={() => Linking.openURL(ticketHref).catch(() => {})}>
              <Text style={[styles.actionBtnText, { color: "#D97706" }]}>
                {"\U0001F3DF"}  Book tickets
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* What you'll experience */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{"WHAT YOU'LL EXPERIENCE"}</Text>
          <Text style={styles.highlight}>{experienceText}</Text>
        </View>

        {/* Best way */}
        {practicalTips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BEST WAY TO DO THIS STOP</Text>
            <View style={styles.tipsWrap}>
              {practicalTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>
                    {tip}{Array.isArray(rawTips) ? "" : "."}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Timing & Logistics */}
        {timingRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{"TIMING & LOGISTICS"}</Text>
            {timingRows.map(([k, v, c], i) => (
              <View key={k} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={[
                  styles.infoVal,
                  { color: c ?? (k === "Best time to visit" ? G.green : G.deep) },
                ]}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Parking & Access */}
        {accessRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{"PARKING & ACCESS"}</Text>
            {accessRows.map(({ key, val, color }, i) => (
              <View key={key} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.infoKey}>{key}</Text>
                <Text style={[styles.infoVal, { color: color ?? G.deep }]}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Nearby Essentials — 3 rows open sub-sheets */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NEARBY ESSENTIALS</Text>

          <TouchableOpacity
            style={styles.essRow}
            onPress={() => setNearbySheet('food')}
          >
            <Text style={styles.essIcon}>🍔</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essTitle}>Food nearby</Text>
              <Text style={styles.essSub}>
                {foodOptions
                  ? `${String(foodOptions).split(/[\n;]/).filter(Boolean).length} options found`
                  : "Family-friendly options nearby"}
              </Text>
            </View>
            <Text style={styles.essArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.essRow}
            onPress={() => setNearbySheet('breaks')}
          >
            <Text style={styles.essIcon}>🌿</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essTitle}>Quick break spots</Text>
              <Text style={styles.essSub}>Parks and cafes nearby</Text>
            </View>
            <Text style={styles.essArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.essRow, { borderBottomWidth: 0 }]}
            onPress={() => setNearbySheet('kids')}
          >
            <Text style={styles.essIcon}>🧒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essTitle}>Kid-friendly extras</Text>
              <Text style={styles.essSub}>More things for kids nearby</Text>
            </View>
            <Text style={styles.essArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── SHEET: Food Nearby ─────────────────────────────────────────────── */}
      {nearbySheet === 'food' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setNearbySheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 20 }}>🍔</Text>
              <Text style={styles.sheetTitle}>Food nearby</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getFoodNearby().map((r, i) => (
                <View key={i} style={styles.placeCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.placeName} numberOfLines={1}>{r.name}</Text>
                    <TouchableOpacity onPress={() =>
                      Linking.openURL(mapsCoords(r.name)).catch(() => {})}>
                      <Text style={styles.mapsLink}>Maps →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.placeMeta}>{r.distance} · {r.cuisine} · {r.price}</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddFoodToPlan(r)}
                  >
                    <Text style={styles.addBtnText}>+ Add to plan</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={{ paddingVertical: 16, alignItems: 'center' }}
                onPress={() => Linking.openURL(mapsCoords("family restaurant", 14)).catch(() => {})}>
                <Text style={styles.seeMore}>See more on Apple Maps →</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── SHEET: Quick Break Spots ──────────────────────────────────────── */}
      {nearbySheet === 'breaks' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setNearbySheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 20 }}>🌿</Text>
              <Text style={styles.sheetTitle}>Quick break spots</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getBreakSpots().map((place, i) => (
                <View key={i} style={styles.placeCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                    <TouchableOpacity onPress={() =>
                      Linking.openURL(mapsCoords(place.name)).catch(() => {})}>
                      <Text style={styles.mapsLink}>Maps →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.placeMeta}>{place.distance}</Text>
                  {place.description ? (
                    <Text style={styles.placeDesc}>{place.description}</Text>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity
                style={{ paddingVertical: 16, alignItems: 'center' }}
                onPress={() => Linking.openURL(mapsCoords("park cafe", 14)).catch(() => {})}>
                <Text style={styles.seeMore}>See more on Apple Maps →</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── SHEET: Kid-Friendly Extras ────────────────────────────────────── */}
      {nearbySheet === 'kids' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setNearbySheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 20 }}>🧒</Text>
              <Text style={styles.sheetTitle}>Kid-friendly extras</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getKidExtras().map((place, i) => (
                <View key={i} style={styles.placeCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                    <TouchableOpacity onPress={() =>
                      Linking.openURL(mapsCoords(place.name)).catch(() => {})}>
                      <Text style={styles.mapsLink}>Maps →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.placeMeta}>
                    {place.distance}{place.ageRange ? ` · ${place.ageRange}` : ""}
                  </Text>
                  {place.description ? (
                    <Text style={styles.placeDesc}>{place.description}</Text>
                  ) : null}
                </View>
              ))}
              <TouchableOpacity
                style={{ paddingVertical: 16, alignItems: 'center' }}
                onPress={() => Linking.openURL(mapsCoords("kids activities", 13)).catch(() => {})}>
                <Text style={styles.seeMore}>See more on Apple Maps →</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Screen ─────────────────────────────────────────────────────────────────
  container:     { flex: 1, backgroundColor: G.bg },
  header:        { backgroundColor: "#1A1F2E", paddingHorizontal: 20, paddingBottom: 24 },
  nav:           { flexDirection: "row", marginBottom: 16 },
  backBtn:       { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:      { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  stopLabel:     { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 },
  title:         { fontFamily: F.bold, fontSize: 24, color: "#fff", lineHeight: 30 },
  body:          { flex: 1, padding: 16 },
  actionRow:     { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionBtn:     {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  actionBtnText: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  ticketBtn:     { borderWidth: 1.5, borderColor: "rgba(245,166,35,0.4)" },
  // ── Sections ───────────────────────────────────────────────────────────────
  section:       {
    backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  sectionLabel:  { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  highlight:     { fontFamily: F.semibold, fontSize: 14, color: G.deep, lineHeight: 22 },
  tipsWrap:      { gap: 6 },
  tipRow:        { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 2 },
  tipDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: G.orange, marginTop: 7, flexShrink: 0 },
  tipText:       { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 20, flex: 1 },
  infoRow:       {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)",
  },
  infoKey:       { fontFamily: F.medium, fontSize: 13, color: G.muted, flex: 1 },
  infoVal:       { fontFamily: F.bold, fontSize: 13, color: G.deep, textAlign: "right", flex: 1 },
  // ── Nearby Essentials rows ─────────────────────────────────────────────────
  essRow:        { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  essIcon:       { fontSize: 20, width: 36 },
  essTitle:      { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  essSub:        { fontFamily: F.medium, fontSize: 12, color: G.muted },
  essArrow:      { fontSize: 20, color: "#C4C9D4" },
  // ── Sheet overlay ──────────────────────────────────────────────────────────
  overlay:       {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", zIndex: 300,
  },
  sheet:         {
    backgroundColor: "white",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: "82%",
  },
  handle:        { width: 36, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle:    { fontFamily: F.bold, fontSize: 18, color: G.deep },
  // ── Place cards ────────────────────────────────────────────────────────────
  placeCard:     {
    backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
  },
  placeName:     { fontFamily: F.bold, fontSize: 15, color: G.deep, flex: 1, marginBottom: 2 },
  placeMeta:     { fontFamily: F.medium, fontSize: 12, color: G.muted, marginBottom: 10 },
  placeDesc:     { fontFamily: F.medium, fontSize: 13, color: "#4B5563", lineHeight: 18 },
  mapsLink:      { fontFamily: F.bold, fontSize: 13, color: G.orange },
  addBtn:        { backgroundColor: G.orange, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  addBtnText:    { fontFamily: F.bold, fontSize: 14, color: "white" },
  seeMore:       { fontFamily: F.medium, fontSize: 13, color: G.muted },
});
