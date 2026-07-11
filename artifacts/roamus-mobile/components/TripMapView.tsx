import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { Region } from 'react-native-maps';

type Stop = {
  id: string;
  name: string;
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

export default function TripMapView({ stops, totalDays, onMarkerPress }: Props) {
  const mapRef = useRef<MapView>(null);
  const mapReady = useRef(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const allPinStops = useMemo(() => stops.filter(hasCoord), [stops]);

  const pinStops = useMemo(() => {
    const base = selectedDay == null
      ? allPinStops
      : allPinStops.filter(s => s.dayIndex === selectedDay);
    return base.slice().sort((a, b) => {
      const dDay = (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
      return dDay !== 0 ? dDay : (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
  }, [allPinStops, selectedDay]);

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
    if (!mapRef.current || pinStops.length === 0) return;
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
        {pinStops.map((stop, i) => {
          const isVisited = stop.isVisited || stop.visited;
          const coord = toCoord(stop);
          // Truncate long names for the label
          const label = stop.name.length > 18
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
                <View style={[styles.pin, isVisited ? styles.pinVisited : styles.pinUnvisited]}>
                  <Text style={styles.pinLabel}>{i + 1}</Text>
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
    </View>
  );
}

const C = { orange: '#E8692A', green: '#65CC94', bg: '#F5F2EE', text: '#2E2E2E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  emptyText: { fontSize: 14, color: '#888' },

  // Marker
  markerWrap: {
    alignItems: 'center',
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 2,
    elevation: 3,
  },
  pinUnvisited: { backgroundColor: C.orange },
  pinVisited: { backgroundColor: C.green },
  pinLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  nameWrap: {
    marginTop: 3,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    maxWidth: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  nameTxt: {
    fontSize: 10,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },

  // Chips
  chipRow: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  chipContent: { paddingHorizontal: 12, gap: 6, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  chipOn: { backgroundColor: C.orange },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  chipTextOn: { color: '#fff' },
});
