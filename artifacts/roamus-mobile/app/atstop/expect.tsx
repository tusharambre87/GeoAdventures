import React from 'react';
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

  const openDirections = () => {
    if (lat && lon) {
      const url = Platform.OS === "ios"
        ? "maps://app?daddr=" + lat + "," + lon + "&dirflg=d"
        : "google.navigation:q=" + lat + "," + lon;
      Linking.openURL(url);
    } else {
      Linking.openURL(
        "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(address || stopName) + "&travelmode=walking"
      );
    }
  };

  const showTickets = pRef.bookingRequired === true || meta.ticketSignal === true;
  const ticketHref  = bookingUrl
    || "https://www.google.com/search?q=" + encodeURIComponent(stopName + " tickets");

  const experienceText =
    enrichment.whyItWorks ?? pProf.whyItWorks ?? enrichment.whyNow
    ?? (stopName + " is a great stop for the whole family — explore at your own pace and look out for the highlights as you go.");

  const rawTips = enrichment.practicalTips ?? pProf.practicalTips;
  const practicalTips: string[] = rawTips
    ? (Array.isArray(rawTips)
        ? (rawTips as string[]).filter((s: string) => s.length > 2)
        : String(rawTips)
            .split(/\.\s+/)
            .map((s: string) => s.replace(/\.$/, "").trim())
            .filter((s: string) => s.length > 8))
    : [];

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
      ? { key: "Parking",          val: parking || "Nearby", color: "#D97706" }
      : null,
    { key: "Stroller friendly", val: stroller ? "Yes" : "Check ahead",
      color: stroller ? G.green : G.muted },
    { key: "Restrooms",  val: restrooms || "On site" },
    { key: "Admission",  val: admissionVal, color: admissionColor },
    address ? { key: "Address", val: address } : null,
  ].filter((x): x is AccessRow => x !== null);

  const foodOptions = enrichment.foodOptions ?? pProf.foodOptions;
  const nearbyItems: string[] = foodOptions
    ? String(foodOptions).split(/[;,\n]/).map((s: string) => s.trim()).filter((s: string) => s.length > 2)
    : [];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{"←"} At Stop</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.stopLabel} numberOfLines={1}>{stopName}</Text>
        <Text style={styles.title}>{"What you’ll experience"}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openDirections}>
            <Text style={styles.actionBtnText}>{"↗"}  Directions</Text>
          </TouchableOpacity>
          {showTickets && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.ticketBtn]}
              onPress={() => Linking.openURL(ticketHref)}>
              <Text style={[styles.actionBtnText, { color: "#D97706" }]}>
                {"🎟"}  Book tickets
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{"WHAT YOU’LL EXPERIENCE"}</Text>
          <Text style={styles.highlight}>{experienceText}</Text>
        </View>

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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NEARBY ESSENTIALS</Text>

          <TouchableOpacity
            style={styles.essentialRow}
            onPress={() => Linking.openURL(
              lat && lon
                ? `https://maps.apple.com/?q=family+restaurant&sll=${lat},${lon}&z=14`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("family restaurants near " + (address || stopName))}`
            ).catch(() => {})}
          >
            <Text style={styles.essentialIcon}>{"\U0001F355"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essentialTitle}>Food nearby</Text>
              <Text style={styles.essentialSub}>{foodOptions ? String(foodOptions).split(/[;,\n]/)[0].trim() : "Family-friendly options near you"}</Text>
            </View>
            <Text style={styles.essentialLink}>Maps {"\u2192"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.essentialRow}
            onPress={() => Linking.openURL(
              lat && lon
                ? `https://maps.apple.com/?q=parking&sll=${lat},${lon}&z=15`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("parking near " + (address || stopName))}`
            ).catch(() => {})}
          >
            <Text style={styles.essentialIcon}>{"\U0001F17F\uFE0F"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essentialTitle}>Parking</Text>
              <Text style={styles.essentialSub}>{parking ?? "Find parking nearby"}</Text>
            </View>
            <Text style={styles.essentialLink}>Maps {"\u2192"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.essentialRow, { borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL(
              lat && lon
                ? `https://maps.apple.com/?q=coffee+cafe&sll=${lat},${lon}&z=14`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("coffee cafe near " + (address || stopName))}`
            ).catch(() => {})}
          >
            <Text style={styles.essentialIcon}>{"\u2615"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essentialTitle}>Coffee {"\u0026"} cafes</Text>
              <Text style={styles.essentialSub}>Find a quick break nearby</Text>
            </View>
            <Text style={styles.essentialLink}>Maps {"\u2192"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: G.bg },
  header:       { backgroundColor: "#1A1F2E", paddingHorizontal: 20, paddingBottom: 24 },
  nav:          { flexDirection: "row", marginBottom: 16 },
  backBtn:      { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:     { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.7)" },
  stopLabel:    { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 },
  title:        { fontFamily: F.bold, fontSize: 24, color: "#fff", lineHeight: 30 },
  body:         { flex: 1, padding: 16 },
  actionRow:    { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionBtn:    {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  actionBtnText: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  ticketBtn:    { borderWidth: 1.5, borderColor: "rgba(245,166,35,0.4)" },
  section:      {
    backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  sectionLabel: { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  highlight:    { fontFamily: F.semibold, fontSize: 14, color: G.deep, lineHeight: 22 },
  tipsWrap:     { gap: 6 },
  tipRow:       { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 2 },
  tipDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: G.orange, marginTop: 7, flexShrink: 0 },
  tipText:      { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 20, flex: 1 },
  infoRow:      {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)",
  },
  infoKey:      { fontFamily: F.medium, fontSize: 13, color: G.muted, flex: 1 },
  infoVal:      { fontFamily: F.bold, fontSize: 13, color: G.deep, textAlign: "right", flex: 1 },
  essentialRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)",
  },
  essentialIcon:  { fontSize: 22, marginRight: 12, width: 28, textAlign: "center" },
  essentialTitle: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  essentialSub:   { fontFamily: F.medium, fontSize: 12, color: G.muted, lineHeight: 17 },
  essentialLink:  { fontFamily: F.bold, fontSize: 13, color: G.orange, marginLeft: 8 },
});
