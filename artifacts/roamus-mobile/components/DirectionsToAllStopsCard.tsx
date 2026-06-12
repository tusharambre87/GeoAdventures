import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { F } from '@/lib/tokens';

export type DirectionsStop = {
  name: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  displayOrder?: number | null;
};

export type DirectionsHotel = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
};

function encStop(s: DirectionsStop): string {
  const lat = typeof s.latitude === 'string' ? parseFloat(s.latitude) : s.latitude;
  const lng = typeof s.longitude === 'string' ? parseFloat(s.longitude) : s.longitude;
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) return encodeURIComponent(`${lat},${lng}`);
  if (s.address) return encodeURIComponent(s.address);
  return encodeURIComponent(s.name);
}

export function buildDirectionsUrl(
  stops: DirectionsStop[],
  hotel?: DirectionsHotel | null,
): string {
  const ordered = [...stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  if (ordered.length === 0) return '';

  const origin: string | null =
    hotel?.lat && hotel?.lng ? encodeURIComponent(`${hotel.lat},${hotel.lng}`)
    : hotel?.address         ? encodeURIComponent(hotel.address)
    : null;

  // Without hotel, let Maps use current location (omit origin)
  const destination = encStop(ordered[ordered.length - 1]);
  const waypoints   = ordered.slice(0, -1).map(encStop);

  return (
    'https://www.google.com/maps/dir/?api=1' +
    (origin         ? `&origin=${origin}`                       : '') +
    `&destination=${destination}` +
    (waypoints.length ? `&waypoints=${waypoints.join('%7C')}` : '')
  );
}

export function openDirections(stops: DirectionsStop[], hotel?: DirectionsHotel | null) {
  const url = buildDirectionsUrl(stops, hotel);
  if (url) Linking.openURL(url);
}

interface Props {
  onPress: () => void;
  marginTop?: number;
  marginBottom?: number;
  marginHorizontal?: number;
}

export default function DirectionsToAllStopsCard({
  onPress,
  marginTop = 10,
  marginBottom = 4,
  marginHorizontal = 16,
}: Props) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: '#1D4A42',
        borderRadius: 14,
        padding: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop,
        marginHorizontal,
        marginBottom,
      }}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={{ fontSize: 20 }}>{'\uD83D\uDDFA\uFE0F'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: 'white', fontFamily: F.bold }}>
          Directions to all stops
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: 1, fontFamily: F.medium }}>
          Open full route in Google Maps
        </Text>
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>{'\u2197'}</Text>
    </TouchableOpacity>
  );
}
