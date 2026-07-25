import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Region } from 'react-native-maps';

type Stop = {
  id: string;
  name: string;
  stopType?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  displayOrder?: number | null;
  dayIndex?: number | null;
  isVisited?: boolean;
  visited?: boolean;
};

type Props = {
  stops: Stop[];
  totalDays: number;
  onMarkerPress: (stop: Stop) => void;
};

const EDGE_PADDING = { top: 64, right: 48, bottom: 48, left: 48 };

function hasCoord(s: Stop): boolean {
  const lat = parseFloat(String(s.latitude));
  const lon = parseFloat(String(s.longitude));
  return (
    s.latitude != null &&
    s.longitude != null &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    (lat !== 0 || lon !== 0)
  );
}

function toCoord(s: Stop) {
  return {
    latitude: parseFloat(String(s.latitude)),
    longitude: parseFloat(String(s.longitude)),
  };
}

function isHotel(s: Stop) {
  return (
    s.stopType === 'hotel' ||
    s.stopType === 'lodging' ||
    s.stopType === 'accommodation'
  );
}

// Duplicated from app/trip/[tripId].tsx's isMealStop() — that copy is locally
// scoped, not shared, which is why this map was the one place still plotting
// meal stops as numbered pins instead of treating them as always-additive.
const MEAL_TYPES = new Set(['restaurant', 'food', 'cafe', 'market', 'meal', 'street_food', 'diner', 'eatery']);
function isMealStop(s: Stop) {
  const t = (s.stopType || '').toLowerCase();
  return Array.from(MEAL_TYPES).some(k => t.includes(k));
}

export default function TripMapView({ stops, totalDays, onMarkerPress }: Props) {
  const mapRef = useRef<MapView>(null);
  const mapReady = useRef(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const allPinStops = useMemo(() => stops.filter(s => hasCoord(s) && !isMealStop(s)), [stops]);

  // dayIndex in the DB is 0-based; chip selectedDay is 1-based
  const pinStops = useMemo(() => {
    const base = selectedDay == null
      ? allPinStops
      : allPinStops.filter(s => s.dayIndex === selectedDay - 1);
    return base.slice().sort((a, b) => {
      const dDay = (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
      return dDay !== 0 ? dDay : (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
  }, [allPinStops, selectedDay]);

  // Fallback region from all coord-valid stops
  const initialRegion = useMemo<Region | undefined>(() => {
    if (allPinStops.length === 0) return undefined;
    const lats = allPinStops.map(s => parseFloat(String(s.latitude)));
    const lons = allPinStops.map(s => parseFloat(String(s.longitude)));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.025) * 1.5,
      longitudeDelta: Math.max(maxLon - minLon, 0.025) * 1.5,
    };
  }, [allPinStops]);

  function fitToPins(animated: boolean) {
    if (!mapRef.current) return;
    if (pinStops.length === 0) return;
    if (pinStops.length === 1) {
      // fitToCoordinates with a single point can behave unexpectedly — use animateToRegion
      const c = toCoord(pinStops[0]);
      mapRef.current.animateToRegion(
        { ...c, latitudeDelta: 0.12, longitudeDelta: 0.12 },
        animated ? 400 : 0,
      );
      return;
    }
    mapRef.current.fitToCoordinates(pinStops.map(toCoord), {
      edgePadding: EDGE_PADDING,
      animated,
    });
  }

  useEffect(() => {
    if (mapReady.current) fitToPins(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinStops]);

  const polyCoords = pinStops.map(toCoord);
  // Dashed polyline only for single-day view (all-days is pins-only)
  const showPolyline = selectedDay !== null && polyCoords.length > 1;

  if (!initialRegion) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No location data for this trip yet</Text>
      </View>
    );
  }

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onMapReady={() => {
          mapReady.current = true;
          fitToPins(false);
        }}
        showsUserLocation={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
      >
        {showPolyline && (
          <Polyline
            coordinates={polyCoords}
            strokeColor="rgba(232,105,42,0.8)"
            strokeWidth={2.5}
            lineDashPattern={[6, 4]}
          />
        )}
        {pinStops.length === 0 ? null : pinStops.map((stop, i) => {
          const visited = stop.isVisited || stop.visited;
          const hotel = isHotel(stop);
          const coord = toCoord(stop);
          const label =
            stop.name.length > 18
              ? stop.name.slice(0, 17).trimEnd() + '\u2026'
              : stop.name;
          return (
            <Marker
              key={stop.id}
              coordinate={coord}
              onPress={() => onMarkerPress(stop)}
              anchor={{ x: 0.5, y: 0 }}
              tracksViewChanges={false}
            >
              <View style={styles.markerWrap}>
                <View style={[
                  styles.pin,
                  hotel ? styles.pinHotel : visited ? styles.pinVisited : styles.pinUnvisited,
                ]}>
                  <Text style={styles.pinLabel}>{hotel ? 'H' : i + 1}</Text>
                </View>
                <View style={styles.nameWrap}>
                  <Text style={styles.nameTxt} numberOfLines={1}>{label}</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Chip row floats above the map */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}
        pointerEvents="box-none"
      >
        <Pressable
          style={[styles.chip, selectedDay === null && styles.chipOn]}
          onPress={() => setSelectedDay(null)}
        >
          <Text style={[styles.chipText, selectedDay === null && styles.chipTextOn]}>
            All days
          </Text>
        </Pressable>
        {days.map(d => (
          <Pressable
            key={d}
            style={[styles.chip, selectedDay === d && styles.chipOn]}
            onPress={() => setSelectedDay(d)}
          >
            <Text style={[styles.chipText, selectedDay === d && styles.chipTextOn]}>
              Day {d}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Empty state overlay when a day has no coord-valid stops */}
      {selectedDay !== null && pinStops.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeText}>No location data for Day {selectedDay}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const C = { orange: '#E8692A', green: '#65CC94', hotel: '#5B8DEF', bg: '#F5F2EE', text: '#2E2E2E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  emptyText: { fontSize: 14, color: '#888' },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    top: 52, // below chip row
  },
  emptyBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyBadgeText: { fontSize: 13, fontWeight: '600', color: '#555' },
  // Markers
  markerWrap: { alignItems: 'center' },
  pin: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28, shadowRadius: 2, elevation: 3,
  },
  pinUnvisited: { backgroundColor: C.orange },
  pinVisited: { backgroundColor: C.green },
  pinHotel: { backgroundColor: C.hotel },
  pinLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  nameWrap: {
    marginTop: 3, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
    maxWidth: 110,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14, shadowRadius: 2, elevation: 2,
  },
  nameTxt: { fontSize: 10, fontWeight: '600', color: C.text, textAlign: 'center' },
  // Chips
  chipRow: { position: 'absolute', top: 10, left: 0, right: 0, zIndex: 10 },
  chipContent: { paddingHorizontal: 12, gap: 6, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  chipOn: { backgroundColor: C.orange },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  chipTextOn: { color: '#fff' },
});
