import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

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
  onMarkerPress: (stop: Stop) => void;
};

export default function TripMapView({ stops, onMarkerPress }: Props) {
  const pinStops = useMemo(() => {
    return stops
      .filter(s => {
        if (s.latitude == null || s.longitude == null) return false;
        const lat = parseFloat(String(s.latitude));
        const lon = parseFloat(String(s.longitude));
        return !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0);
      })
      .slice()
      .sort((a, b) => {
        const dDay = (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
        return dDay !== 0 ? dDay : (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      });
  }, [stops]);

  const region = useMemo(() => {
    if (pinStops.length === 0) return null;
    const lats = pinStops.map(s => parseFloat(String(s.latitude)));
    const lons = pinStops.map(s => parseFloat(String(s.longitude)));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const latDelta = Math.max(maxLat - minLat, 0.025) * 1.5;
    const lonDelta = Math.max(maxLon - minLon, 0.025) * 1.5;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    };
  }, [pinStops]);

  if (!region) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No location data for this trip yet</Text>
      </View>
    );
  }

  const polyCoords = pinStops.map(s => ({
    latitude: parseFloat(String(s.latitude)),
    longitude: parseFloat(String(s.longitude)),
  }));

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
      >
        {polyCoords.length > 1 && (
          <Polyline
            coordinates={polyCoords}
            strokeColor="rgba(232,105,42,0.6)"
            strokeWidth={2}
          />
        )}
        {pinStops.map((stop, i) => {
          const isVisited = stop.isVisited || stop.visited;
          const lat = parseFloat(String(stop.latitude));
          const lon = parseFloat(String(stop.longitude));
          return (
            <Marker
              key={stop.id}
              coordinate={{ latitude: lat, longitude: lon }}
              onPress={() => onMarkerPress(stop)}
              title={stop.name}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.pin, isVisited ? styles.pinVisited : styles.pinUnvisited]}>
                <Text style={styles.pinLabel}>{i + 1}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F2EE',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  pinUnvisited: {
    backgroundColor: '#E8692A',
  },
  pinVisited: {
    backgroundColor: '#3DAA6E',
  },
  pinLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
