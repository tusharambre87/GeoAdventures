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

export default function DayMapCard({ stops, dayNum }: Props) {
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);

  // dayIndex in DB is 0-based; dayNum prop is 1-based
  const dayStops = useMemo(() =>
    stops
      .filter(s => hasCoord(s) && s.dayIndex === dayNum - 1)
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [stops, dayNum],
  );

  const initialRegion = useMemo(() => {
    if (dayStops.length === 0) return undefined;
    const lats = dayStops.map(s => parseFloat(String(s.latitude)));
    const lons = dayStops.map(s => parseFloat(String(s.longitude)));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.04) * 1.6,
      longitudeDelta: Math.max(maxLon - minLon, 0.04) * 1.6,
    };
  }, [dayStops]);

  function fitMap() {
    if (!mapRef.current || dayStops.length === 0) return;
    if (dayStops.length === 1) {
      mapRef.current.animateToRegion(
        { ...toCoord(dayStops[0]), latitudeDelta: 0.1, longitudeDelta: 0.1 },
        300,
      );
    } else {
      mapRef.current.fitToCoordinates(dayStops.map(toCoord), {
        edgePadding: EDGE,
        animated: true,
      });
    }
  }

  function toggle() {
    const next = !expanded;
    // Mount first, then animate open — unmount after animating closed
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

  return (
    <View style={styles.card}>
      <Pressable onPress={toggle} style={styles.header} hitSlop={4}>
        <View style={styles.iconWrap}>
          <View style={styles.iconPin} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Trip Map</Text>
          <Text style={styles.sub}>
            {dayStops.length > 0
              ? `Day ${dayNum} \u00b7 ${dayStops.length} stop${dayStops.length !== 1 ? 's' : ''}`
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
              // Delay slightly so animation has started and map has a real frame
              setTimeout(fitMap, 220);
            }}
          >
            {dayStops.length > 1 && (
              <Polyline
                coordinates={dayStops.map(toCoord)}
                strokeColor="rgba(232,105,42,0.8)"
                strokeWidth={2.5}
                lineDashPattern={[6, 4]}
              />
            )}
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
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, shadowRadius: 2, elevation: 3,
  },
  pinUnvisited: { backgroundColor: C.orange },
  pinVisited: { backgroundColor: C.green },
  pinHotel: { backgroundColor: C.hotel },
  pinLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },
  nameWrap: {
    marginTop: 2, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2,
    maxWidth: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  nameTxt: { fontSize: 10, fontWeight: '600', color: '#2E2E2E', textAlign: 'center' },
});
