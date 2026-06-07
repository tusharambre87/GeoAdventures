import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '@/lib/tokens';

type StayLocation = { cityName: string; address?: string };

type Stop = {
  id: string;
  name: string;
  stopType?: string | null;
  durationMinutes?: number | null;
  metadata?: { sessionFit?: string } | null;
  address?: string | null;
  cityGroup?: string | null;
};

type Trip = {
  id: string;
  destination?: string | null;
  city?: string | null;
  cities?: string[] | null;
  stayLocations?: StayLocation[] | null;
};

type ParkingStop = {
  beforeStopId: string;
  address: string;
  confirmed: boolean;
};

interface Props {
  stops: Stop[];
  trip: Trip;
  currentDayIndex: number;
  onClose: () => void;
}

export default function DirectionsSheet({ stops, trip, currentDayIndex, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(600)).current;

  const [parkingStops, setParkingStops]           = useState<ParkingStop[]>([]);
  const [editingParkingFor, setEditingParkingFor] = useState<string | null>(null);
  const [parkingInput, setParkingInput]           = useState('');
  const [manualStartPoint, setManualStartPoint]   = useState<string | null>(null);
  const [editingStart, setEditingStart]           = useState(false);
  const [startInput, setStartInput]               = useState('');

  // Resolve starting point — try today's city first, then destination/city, then first entry
  const resolvedStayLocation = (() => {
    const locs = trip.stayLocations;
    if (!locs || locs.length === 0) return null;
    const dayCity =
      trip.cities?.[currentDayIndex] ??
      trip.cities?.[0] ??
      trip.destination ??
      trip.city ??
      '';
    return (
      locs.find(s => !s.cityName || s.cityName === dayCity) ??
      locs[0]
    );
  })();

  const startingPoint: string | null =
    manualStartPoint ??
    resolvedStayLocation?.address ??
    (resolvedStayLocation?.cityName ? resolvedStayLocation.cityName : null);

  // Diagnostics — visible in Metro/Expo logs
  console.log('DIRECTIONS_START_DEBUG', {
    stayLocations: trip?.stayLocations,
    cities: trip?.cities,
    destination: trip?.destination,
    currentDayIndex,
    resolved: startingPoint,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(sheetAnim,   { toValue: 0, damping: 24, stiffness: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  function handleClose() {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.spring(sheetAnim,   { toValue: 600, damping: 24, stiffness: 200, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onClose(); });
  }

  function handleOpenMaps() {
    const waypoints: string[] = [];

    // Start
    if (startingPoint) waypoints.push(encodeURIComponent(startingPoint));

    // Stops — parking address replaces stop when present
    for (const stop of stops) {
      const parking = parkingStops.find(p => p.beforeStopId === stop.id && p.confirmed);
      if (parking) {
        waypoints.push(encodeURIComponent(parking.address));
      } else {
        waypoints.push(encodeURIComponent(`${stop.name} ${trip.destination ?? trip.city ?? ''}`));
      }
    }

    // Return to hotel / start (loop route)
    if (startingPoint) waypoints.push(encodeURIComponent(startingPoint));

    const googleUrl    = `https://www.google.com/maps/dir/${waypoints.join('/')}`;
    const googleAppUrl = `comgooglemaps://?waypoints=${waypoints.join('|')}`;

    Linking.canOpenURL('comgooglemaps://').then(supported => {
      Linking.openURL(supported ? googleAppUrl : googleUrl);
    }).catch(() => Linking.openURL(googleUrl));
  }

  const confirmedCount = parkingStops.filter(p => p.confirmed).length;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kav}
        >
          <Animated.View
            style={[s.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetAnim }] }]}
          >
            {/* Handle */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <Text style={s.title}>Directions for today</Text>
              <Text style={s.sub}>
                {stops.length} stop{stops.length !== 1 ? 's' : ''}
                {confirmedCount > 0
                  ? ` + ${confirmedCount} parking`
                  : ' \u00B7 tap a stop to add parking'}
              </Text>
            </View>

            {/* Route list */}
            <ScrollView
              style={s.routeScroll}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {/* No hotel prompt */}
              {!startingPoint && !editingStart && (
                <TouchableOpacity
                  onPress={() => { setEditingStart(true); setStartInput(''); }}
                  style={s.addStartPrompt}
                >
                  <Text style={s.addStartLabel}>+ Add hotel or starting address</Text>
                  <Text style={s.addStartSub}>for accurate directions</Text>
                </TouchableOpacity>
              )}

              {/* Inline start point input */}
              {editingStart && (
                <View style={[s.addStartPrompt, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <TextInput
                    value={startInput}
                    onChangeText={setStartInput}
                    placeholder="Hotel name or address"
                    placeholderTextColor="#8A8FA8"
                    autoFocus
                    style={[s.parkingInput, { flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const raw = startInput.trim();
                      if (raw) {
                        const resolved = raw.includes(',')
                          ? raw
                          : `${raw}, ${trip.destination ?? trip.city ?? ''}`;
                        setManualStartPoint(resolved);
                      }
                      setEditingStart(false);
                      setStartInput('');
                    }}
                  >
                    <Text style={s.parkingDone}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Starting point row */}
              <View style={s.routeItem}>
                <View style={s.lineWrap}>
                  <View style={[s.dot, s.dotStart]} />
                  {stops.length > 0 && <View style={s.connector} />}
                </View>
                <View style={s.routeContent}>
                  <Text style={s.routeName}>
                    {startingPoint ?? 'Your current location'}
                  </Text>
                  <Text style={s.routeMeta}>
                    {startingPoint ? 'Starting point' : 'Add hotel above for accurate route'}
                  </Text>
                </View>
              </View>

              {/* Stop rows */}
              {stops.map((stop, i) => {
                const isLast  = i === stops.length - 1;
                const parking = parkingStops.find(p => p.beforeStopId === stop.id && p.confirmed);
                const session = stop.metadata?.sessionFit;
                const dur     = stop.durationMinutes;
                const metaStr = [
                  dur     ? `${dur} min` : null,
                  session ? session.charAt(0).toUpperCase() + session.slice(1) : null,
                ].filter(Boolean).join(' \u00B7 ');

                return (
                  <React.Fragment key={stop.id}>
                    {/* Confirmed parking waypoint */}
                    {parking && (
                      <View style={s.routeItem}>
                        <View style={s.lineWrap}>
                          <View style={[s.dot, s.dotParking]} />
                          <View style={s.connector} />
                        </View>
                        <View style={s.routeContent}>
                          <View style={s.parkingPillRow}>
                            <View style={s.parkingPill}>
                              <Text style={s.parkingPillTxt}>P</Text>
                            </View>
                            <Text style={s.parkingAddr} numberOfLines={1}>
                              {parking.address}
                            </Text>
                            <Pressable
                              onPress={() =>
                                setParkingStops(prev =>
                                  prev.filter(p => p.beforeStopId !== stop.id)
                                )
                              }
                              hitSlop={10}
                            >
                              <Text style={s.removeX}>{'\u00D7'}</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Stop row */}
                    <View style={s.routeItem}>
                      <View style={s.lineWrap}>
                        <View style={[s.dot, isLast && !startingPoint ? s.dotEnd : s.dotStop]} />
                        {(!isLast || !!startingPoint) && <View style={s.connector} />}
                      </View>
                      <View style={s.routeContent}>
                        {/* Stop name — muted when parking is navigating there instead */}
                        <Text style={[s.routeName, parking ? s.routeNameMuted : null]}>
                          {stop.name}
                        </Text>

                        {/* Parking active label */}
                        {parking && (
                          <Text style={s.navigatingLabel}>Navigating to parking lot</Text>
                        )}

                        {/* Duration / session meta */}
                        {!!metaStr && (
                          <Text style={s.routeMeta}>{metaStr}</Text>
                        )}

                        {/* Add parking link — hidden once parking is confirmed */}
                        {!parking && editingParkingFor !== stop.id && (
                          <Pressable
                            onPress={() => {
                              setEditingParkingFor(stop.id);
                              setParkingInput('');
                            }}
                          >
                            <Text style={s.addParkingLink}>
                              + Add parking stop before this
                            </Text>
                          </Pressable>
                        )}

                        {/* Inline parking input */}
                        {editingParkingFor === stop.id && (
                          <View style={s.parkingInputRow}>
                            <TextInput
                              value={parkingInput}
                              onChangeText={setParkingInput}
                              placeholder="Parking lot name or address"
                              placeholderTextColor="#8A8FA8"
                              autoFocus
                              style={s.parkingInput}
                            />
                            <TouchableOpacity
                              onPress={() => {
                                if (parkingInput.trim()) {
                                  setParkingStops(prev => [
                                    ...prev.filter(p => p.beforeStopId !== stop.id),
                                    {
                                      beforeStopId: stop.id,
                                      address: parkingInput.trim(),
                                      confirmed: true,
                                    },
                                  ]);
                                }
                                setEditingParkingFor(null);
                                setParkingInput('');
                              }}
                            >
                              <Text style={s.parkingDone}>Done</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}

              {/* Return to hotel row (loop route) */}
              {startingPoint && (
                <View style={s.routeItem}>
                  <View style={s.lineWrap}>
                    <View style={[s.dot, s.dotEnd]} />
                  </View>
                  <View style={s.routeContent}>
                    <Text style={s.routeName}>{startingPoint}</Text>
                    <Text style={s.routeMeta}>Return to hotel</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Open Maps CTA */}
            <TouchableOpacity
              style={s.cta}
              onPress={handleOpenMaps}
              activeOpacity={0.85}
            >
              <Text style={s.ctaTxt}>
                {'\uD83D\uDDFA\uFE0F'}{'  '}Open route in Google Maps
              </Text>
            </TouchableOpacity>
            <Text style={s.ctaNote}>
              Falls back to Google Maps web if app isn&apos;t installed
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#D0CCC6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0EDE8',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1F2E',
    fontFamily: F.bold,
  },
  sub: {
    fontSize: 12,
    color: '#8A8FA8',
    marginTop: 2,
    fontFamily: F.regular,
  },
  routeScroll: {
    paddingHorizontal: 20,
    flex: 1,
  },
  addStartPrompt: {
    backgroundColor: '#FDF0E9',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addStartLabel: {
    fontSize: 13,
    color: '#E8692A',
    fontWeight: '600',
    fontFamily: F.semibold,
  },
  addStartSub: {
    fontSize: 12,
    color: '#8A8FA8',
    flex: 1,
    fontFamily: F.regular,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 10,
  },
  lineWrap: {
    alignItems: 'center',
    width: 20,
    flexShrink: 0,
    paddingTop: 3,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotStart:   { backgroundColor: '#3DAA6E' },
  dotStop:    { backgroundColor: '#E8692A' },
  dotEnd:     { backgroundColor: '#1A1F2E' },
  dotParking: { backgroundColor: '#F5A623' },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0DDD8',
    minHeight: 24,
    marginTop: 3,
  },
  routeContent: {
    flex: 1,
    paddingBottom: 8,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F2E',
    fontFamily: F.semibold,
  },
  routeMeta: {
    fontSize: 12,
    color: '#8A8FA8',
    marginTop: 1,
    fontFamily: F.regular,
  },
  routeNameMuted: {
    color: '#8A8FA8',
  },
  navigatingLabel: {
    fontSize: 11,
    color: '#F5A623',
    marginTop: 2,
    fontFamily: F.regular,
  },
  addParkingLink: {
    fontSize: 12,
    color: '#E8692A',
    fontWeight: '600',
    marginTop: 5,
    fontFamily: F.semibold,
  },
  parkingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  parkingInput: {
    flex: 1,
    height: 34,
    borderWidth: 1.5,
    borderColor: '#E8692A',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1A1F2E',
    backgroundColor: '#FDF0E9',
    fontFamily: F.regular,
  },
  parkingDone: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8692A',
    fontFamily: F.bold,
  },
  parkingPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  parkingPill: {
    backgroundColor: '#F5A623',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  parkingPillTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    fontFamily: F.bold,
  },
  parkingAddr: {
    flex: 1,
    fontSize: 13,
    color: '#1A1F2E',
    fontFamily: F.regular,
  },
  removeX: {
    fontSize: 18,
    color: '#8A8FA8',
    lineHeight: 20,
  },
  cta: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#E8692A',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: F.bold,
  },
  ctaNote: {
    fontSize: 11,
    color: '#B0ADA8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    marginBottom: 4,
    fontFamily: F.regular,
  },
});
