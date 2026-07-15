import React, { useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

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
  dayNum: number; // 1-based display day
  origin?: { lat: number; lng: number } | null; // hotel / starting point
};

const MAP_H = 220;
const EDGE = { top: 36, right: 32, bottom: 32, left: 32 };

function hasCoord(s: Stop): boolean {
  const lat = parseFloat(String(s.latitude));
  const lon = parseFloat(String(s.longitude));
  return (
    s.latitude != null && s.longitude != null &&
    !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)
  );
}

function toCoord(s: Stop) {
  return {
    latitude: parseFloat(String(s.latitude)),
    longitude: parseFloat(String(s.longitude)),
  };
}

function isHotel(s: Stop) {
  return s.stopType === 'hotel' || s.stopType === 'lodging' || s.stopType === 'accommodation';
}

export default function DayMapCard({ stops, dayNum, origin }: Props) {
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  // All stops for this day (for header count — includes stops without coords)
  const allDayStops = useMemo(() =>
    stops.filter(s => s.dayIndex === dayNum - 1),
    [stops, dayNum],
  );

  // dayIndex in DB is 0-based; dayNum prop is 1-based — only coord-valid for map pins
  const dayStops = useMemo(() =>
    stops
      .filter(s => hasCoord(s) && s.dayIndex === dayNum - 1)
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [stops, dayNum],
  );

  // Origin coord for hotel marker + polyline start
  const originCoord = useMemo(() => {
    if (!origin || isNaN(origin.lat) || isNaN(origin.lng)) return null;
    return { latitude: origin.lat, longitude: origin.lng };
  }, [origin]);

  // Full polyline: hotel → stop 1 → stop 2 → … stop N
  const polyCoords = useMemo(() => {
    const stopCoords = dayStops.map(toCoord);
    return originCoord ? [originCoord, ...stopCoords] : stopCoords;
  }, [dayStops, originCoord]);

  // All coords including origin (for fitToCoordinates)
  const allCoords = useMemo(() => {
    const base = dayStops.map(toCoord);
    return originCoord ? [originCoord, ...base] : base;
  }, [dayStops, originCoord]);

  const initialRegion = useMemo(() => {
    if (allCoords.length === 0) return undefined;
    const lats = allCoords.map(c => c.latitude);
    const lons = allCoords.map(c => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.04) * 1.6,
      longitudeDelta: Math.max(maxLon - minLon, 0.04) * 1.6,
    };
  }, [allCoords]);

  function fitMap() {
    if (!mapRef.current || allCoords.length === 0) return;
    if (allCoords.length === 1) {
      mapRef.current.animateToRegion(
        { ...allCoords[0], latitudeDelta: 0.1, longitudeDelta: 0.1 },
        300,
      );
    } else {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: EDGE,
        animated: true,
      });
    }
  }

  function toggle() {
    const next = !expanded;
    if (next) setExpanded(true);
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start(() => {
      if (!next) setExpanded(false);
    });
  }

  const mapHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, MAP_H] });

  // Header count uses all day stops (not just coord-filtered)
  const displayCount = allDayStops.length;

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.header} hitSlop={4}>
        <View style={styles.iconWrap}>
          <View style={styles.iconPin} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Trip Map</Text>
          <Text style={styles.sub}>
            {displayCount > 0
              ? `Day ${dayNum} \u00b7 ${displayCount} stop${displayCount !== 1 ? 's' : ''}`
              : `Day ${dayNum} \u00b7 no location data`}
          </Text>
        </View>
        <Animated.Text style={[styles.chevron, {
          transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }],
        }]}>
          {'›'}
        </Animated.Text>
      </Pressable>

      <Animated.View style={{ height: mapHeight, overflow: 'hidden' }}>
        {expanded && (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation={false}
            showsPointsOfInterest={false}
            showsBuildings={false}
            onMapReady={() => {
              setTimeout(fitMap, 220);
            }}
          >
            {/* Dashed route line from hotel → stops in order */}
            {polyCoords.length > 1 && (
              <Polyline
                coordinates={polyCoords}
                strokeColor="rgba(232,105,42,0.8)"
                strokeWidth={2.5}
                lineDashPattern={[6, 4]}
              />
            )}

            {/* Hotel / starting-point marker */}
            {originCoord && (
              <Marker
                key="__origin__"
                coordinate={originCoord}
                anchor={{ x: 0.5, y: 0 }}
                tracksViewChanges={false}
              >
                <View style={styles.markerWrap}>
                  <View style={[styles.pin, styles.pinHotel]}>
                    <Text style={styles.pinLabel}>H</Text>
                  </View>
                  <View style={styles.nameWrap}>
                    <Text style={styles.nameTxt} numberOfLines={1}>Start</Text>
                  </View>
                </View>
              </Marker>
            )}

            {/* Stop markers (numbered 1…N, skipping stops without coords) */}
            {dayStops.map((stop, i) => {
              const visited = stop.isVisited || stop.visited;
              const hotel = isHotel(stop);
              const label =
                stop.name.length > 18
                  ? stop.name.slice(0, 17).trimEnd() + '\u2026'
                  : stop.name;
              return (
                <Marker
                  key={stop.id}
                  coordinate={toCoord(stop)}
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
        )}
      </Animated.View>
    </View>
  );
}

const C = { orange: '#E8692A', green: '#65CC94', hotel: '#5B8DEF' };

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FDF0E9',
    alignItems: 'center', justifyContent: 'center',
  },
  iconPin: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.orange,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  sub: { fontSize: 12, color: '#888', marginTop: 1 },
  chevron: { fontSize: 22, color: '#bbb' },
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
  nameTxt: { fontSize: 10, fontWeight: '600', color: '#1A1A2E', textAlign: 'center' },
  // Chips (unused here, kept for compat)
  chipRow: { position: 'absolute', top: 10, left: 0, right: 0, zIndex: 10 },
  chipContent: { paddingHorizontal: 12, gap: 6, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  chipOn: { backgroundColor: C.orange },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  chipTextOn: { color: '#fff' },
});
