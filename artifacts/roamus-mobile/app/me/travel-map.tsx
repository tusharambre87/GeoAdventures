import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CITY_COORDS, F, G } from "@/lib/tokens";

type Stop = {
  id: string;
  name: string;
  isVisited?: boolean;
  visited?: boolean;
  stopType?: string | null;
  displayOrder?: number | null;
};

type Trip = {
  id: string;
  name: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  visitedStops: number;
  totalStops: number;
  stops: Stop[];
  tripDays?: number | null;
};

type CityEntry = {
  name: string;
  tripId: string;
  date?: string | null;
  visitedStops: number;
  totalStops: number;
  stops: Stop[];
  tripDays?: number | null;
};

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return "";
  const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${s} – ${e}`;
}

const CITY_EMOJI: Record<string, string> = {
  USA: "🇺🇸", UK: "🇬🇧", France: "🇫🇷", Italy: "🇮🇹", Spain: "🇪🇸",
  Japan: "🇯🇵", Australia: "🇦🇺", Canada: "🇨🇦", Mexico: "🇲🇽",
  Netherlands: "🇳🇱", Ireland: "🇮🇪", Portugal: "🇵🇹", "Czech Republic": "🇨🇿",
  Austria: "🇦🇹",
};

export default function TravelMapScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Record<string, number>>({});

  const { tripsJson } = useLocalSearchParams<{ tripsJson: string }>();
  // NOTE: trips[n].stops may be empty on list response; fetch individual
  // trip on city card tap if stop names are missing.
  const trips: Trip[] = tripsJson ? (JSON.parse(tripsJson as string) as Trip[]) : [];
  const [expandedCity, setExpandedCity] = useState<string | null>(null);

  const cities: CityEntry[] = trips
    .filter((t) => t.visitedStops > 0 && t.destination)
    .map((t) => ({
      name: t.destination!,
      tripId: t.id,
      date: t.startDate,
      visitedStops: t.visitedStops,
      totalStops: t.totalStops,
      stops: t.stops ?? [],
      tripDays: t.tripDays,
    }));

  const totalStops = cities.reduce((s, c) => s + c.visitedStops, 0);
  const totalDays = cities.reduce((s, c) => s + (c.tripDays ?? 0), 0);

  function pinPosition(cityName: string, idx: number): { topPct: number; leftPct: number } {
    const coords = CITY_COORDS[cityName];
    if (coords) {
      const latRange = [20, 65];
      const lonRange = [-130, 50];
      const top = ((latRange[1] - coords.lat) / (latRange[1] - latRange[0])) * 80 + 5;
      const left = ((coords.lon - lonRange[0]) / (lonRange[1] - lonRange[0])) * 88 + 4;
      return { topPct: Math.max(5, Math.min(85, top)), leftPct: Math.max(4, Math.min(92, left)) };
    }
    const spread = [
      { topPct: 30, leftPct: 20 }, { topPct: 55, leftPct: 35 },
      { topPct: 25, leftPct: 65 }, { topPct: 60, leftPct: 75 },
      { topPct: 40, leftPct: 50 }, { topPct: 70, leftPct: 22 },
    ];
    return spread[idx % spread.length];
  }

  function handlePinPress(cityName: string) {
    setExpandedCity(cityName);
    setTimeout(() => {
      const offset = cardOffsets.current[cityName];
      if (offset != null) {
        scrollRef.current?.scrollTo({ y: offset - 16, animated: true });
      }
    }, 120);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <Pressable style={s.backPill} onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backPillText}>{"← Me"}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
          <View style={s.subHeader}>
            <Text style={s.subH}>Travel Map</Text>
            <Text style={s.subS}>Everywhere your family has explored</Text>
          </View>

          {/* Map */}
          <View style={s.mapWrap}>
            {/* Grid overlay */}
            <View style={s.mapGrid} pointerEvents="none" />

            {/* Continent blobs */}
            <View style={[s.blob, { width: 160, height: 100, top: "22%", left: "8%", transform: [{ rotate: "-10deg" }] }]} />
            <View style={[s.blob, { width: 130, height: 90, top: "18%", left: "36%", transform: [{ rotate: "5deg" }] }]} />
            <View style={[s.blob, { width: 150, height: 120, top: "14%", left: "58%", transform: [{ rotate: "-5deg" }] }]} />
            <View style={[s.blob, { width: 75, height: 55, top: "58%", left: "73%", transform: [{ rotate: "10deg" }] }]} />
            <View style={[s.blob, { width: 90, height: 130, top: "44%", left: "21%", transform: [{ rotate: "-8deg" }] }]} />

            {/* City pins */}
            {cities.length === 0 ? (
              <View style={s.mapEmptyWrap}>
                <Text style={s.mapEmptyText}>{"Visit stops on a trip to see cities here"}</Text>
              </View>
            ) : (
              cities.map((city, idx) => {
                const pos = pinPosition(city.name, idx);
                const isExpanded = expandedCity === city.name;
                return (
                  <Pressable
                    key={city.name}
                    style={[s.pin, { top: `${pos.topPct}%` as `${number}%`, left: `${pos.leftPct}%` as `${number}%` }]}
                    onPress={() => handlePinPress(city.name)}
                  >
                    <View style={[s.pinDot, isExpanded && s.pinDotActive]}>
                      <Text style={s.pinEmoji}>{"📍"}</Text>
                    </View>
                    <View style={s.pinLabel}>
                      <Text style={s.pinLabelText}>{city.name}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              ["Cities", String(cities.length)],
              ["Stops", String(totalStops)],
              ["Days", String(totalDays || "—")],
            ].map(([label, val]) => (
              <View key={label} style={s.statCard}>
                <Text style={s.statNum}>{val}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* City cards */}
          {cities.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>No explored cities yet</Text>
              <Text style={s.emptyBody}>
                Mark stops as visited on your trip to see them on the map.
              </Text>
            </View>
          ) : (
            cities.map((city) => {
              const isExpanded = expandedCity === city.name;
              return (
                <View
                  key={city.name}
                  onLayout={(e) => { cardOffsets.current[city.name] = e.nativeEvent.layout.y; }}
                  style={[s.cityCard, isExpanded && s.cityCardExpanded]}
                >
                  <Pressable
                    style={s.cityHeader}
                    onPress={() =>
                      setExpandedCity((prev) => (prev === city.name ? null : city.name))
                    }
                  >
                    <View style={s.cityFlag}>
                      <Text style={{ fontSize: 22 }}>{"📍"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cityName}>{city.name}</Text>
                      <Text style={s.cityMeta}>{formatDateRange(city.date)}</Text>
                    </View>
                    <View style={s.stopsBadge}>
                      <Text style={s.stopsBadgeText}>
                        {city.visitedStops} stop{city.visitedStops !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Text style={[s.expandArrow, isExpanded && s.expandArrowOpen]}>{"›"}</Text>
                  </Pressable>

                  {isExpanded && (
                    <View style={s.stopsList}>
                      {city.stops.length === 0 ? (
                        <Text style={s.noStopsText}>No stop details available</Text>
                      ) : (
                        city.stops.map((stop) => {
                          const visited = stop.isVisited || stop.visited;
                          return (
                            <View key={stop.id} style={s.stopRow}>
                              <View style={s.stopDot} />
                              <Text style={s.stopName} numberOfLines={1}>{stop.name}</Text>
                              <Text style={visited ? s.visitedTag : s.skippedTag}>
                                {visited ? "✓ Visited" : "Skipped"}
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
      </ScrollView>
    
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: G.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { fontFamily: F.regular, fontSize: 14, color: G.muted, marginBottom: 16, textAlign: "center" },
  retryBtn: { backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  backPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26,31,46,0.08)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  backPillText: { fontFamily: F.bold, fontSize: 13, color: G.deep },
  subHeader: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 },
  subH: { fontFamily: F.bold, fontSize: 26, color: G.deep, letterSpacing: -0.5, marginBottom: 3 },
  subS: { fontFamily: F.regular, fontSize: 14, color: G.muted },
  mapWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    height: 280,
    backgroundColor: "#0D1B2A",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
    borderWidth: 0,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.12,
    backgroundColor: "#4a9eff",
  },
  mapEmptyWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  mapEmptyText: {
    fontFamily: F.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  pin: {
    position: "absolute",
    alignItems: "center",
    zIndex: 3,
  },
  pinDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232,105,42,0.9)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  pinDotActive: {
    backgroundColor: G.orange,
    transform: [{ scale: 1.15 }],
  },
  pinEmoji: { fontSize: 14 },
  pinLabel: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  pinLabelText: {
    fontFamily: F.bold,
    fontSize: 9,
    color: "#fff",
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
    paddingVertical: 14,
    alignItems: "center",
  },
  statNum: { fontFamily: F.bold, fontSize: 22, color: G.deep, marginBottom: 2 },
  statLabel: { fontFamily: F.semibold, fontSize: 11, color: G.muted },
  emptyBox: { margin: 24, alignItems: "center", paddingVertical: 32 },
  emptyTitle: { fontFamily: F.bold, fontSize: 16, color: G.deep, marginBottom: 6 },
  emptyBody: { fontFamily: F.regular, fontSize: 13, color: G.muted, textAlign: "center", lineHeight: 20 },
  cityCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(26,31,46,0.08)",
    overflow: "hidden",
  },
  cityCardExpanded: {
    borderColor: G.orange,
    borderWidth: 1.5,
  },
  cityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  cityFlag: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: G.oLt,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cityName: { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  cityMeta: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  stopsBadge: {
    backgroundColor: G.oLt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stopsBadgeText: { fontFamily: F.bold, fontSize: 11, color: G.orange },
  expandArrow: {
    fontFamily: F.regular,
    fontSize: 20,
    color: "#C4C8D8",
    marginLeft: 4,
  },
  expandArrowOpen: {
    transform: [{ rotate: "90deg" }],
    color: G.orange,
  },
  stopsList: { paddingHorizontal: 16, paddingBottom: 14 },
  noStopsText: { fontFamily: F.regular, fontSize: 13, color: G.muted },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,31,46,0.08)",
  },
  stopDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: G.orange, flexShrink: 0 },
  stopName: { fontFamily: F.semibold, fontSize: 13, color: G.deep, flex: 1 },
  visitedTag: { fontFamily: F.bold, fontSize: 11, color: G.green, marginLeft: "auto" },
  skippedTag: { fontFamily: F.regular, fontSize: 11, color: G.muted, marginLeft: "auto" },
});
