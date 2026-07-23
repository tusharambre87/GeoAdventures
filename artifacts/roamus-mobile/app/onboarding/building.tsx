import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useEffect, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE, useAuth } from '@/lib/authContext';
import { CITY_COUNTRY, STYLE_MAP, PACE_MAP, CITY_IMGS } from '@/lib/tokens';
import { useOnboarding } from '@/lib/onboardingContext';

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_ANIM_MS  = 6500;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Types ───────────────────────────────────────────────────────────────────

type PreviewSpot = {
  name: string;
  photoRef: string | null;
  imageUrl: string | null;
};

// ─── PulseDot ────────────────────────────────────────────────────────────────

function PulseDot({ delay }: { delay: number }) {
  const op = useSharedValue(0.2);
  useEffect(() => {
    op.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: 600 }),
          withTiming(0.2, { duration: 600 }),
        ),
        -1,
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Reanimated.View style={[styles.pulseDot, style]} />;
}

// ─── BuildingScreen ─────────────────────────────────────────────────────────

export default function BuildingScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ cityDatesParam?: string; citiesParam?: string; cityMode?: string }>();

  // Hydrate context from nav params when coming from the Discover/customize path.
  useEffect(() => {
    const updates: Record<string, unknown> = {};
    if (params.citiesParam) {
      try { updates.cities = JSON.parse(params.citiesParam); } catch {}
    }
    if (params.cityMode) {
      updates.cityMode = params.cityMode;
    }
    if (params.cityDatesParam) {
      try { updates.cityDates = JSON.parse(params.cityDatesParam); } catch {}
    }
    if (Object.keys(updates).length > 0) set(updates as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const city    = data.cities[0] ?? null;
  const country = city ? (CITY_COUNTRY[city] ?? 'USA') : 'USA';
  const heroImg = city ? (CITY_IMGS[city] ?? null) : null;

  // Derived traveler info
  const children  = data.travelers.filter(t => !t.isParent);
  const ageList   = children.map(c => c.age).filter((a): a is number => a != null);
  const childAges = ageList.length > 0 ? ageList.join(' and ') : 'your kids';
  const kidsLabel = ageList.length > 0 ? `Ages ${ageList.join(' & ')}` : 'Family';
  const tripDays  = data.tripDays ?? (data.generatedTrip?.days?.length ?? 0);

  const styleDisplayMap: Record<string, string> = {
    highlights: 'highlights explorer',
    balanced:   'family explorer',
    offbeat:    'off-the-beaten-path',
    easy:       'easy explorer',
  };
  const styleLabel = styleDisplayMap[data.tripStyle ?? ''] ?? 'family explorer';

  const transportRaw = (data.transport ?? '').toLowerCase();
  const transportLabel =
    transportRaw.includes('car') || transportRaw.includes('driv')        ? 'by car'        :
    transportRaw.includes('public') || transportRaw.includes('transit')  ? 'by transit'    :
    transportRaw.includes('walk')                                         ? 'on foot'       :
    transportRaw.includes('uber') || transportRaw.includes('ride')       ? 'by ride-share' : '';

  const footerParts = [kidsLabel, styleLabel, transportLabel].filter(Boolean);

  // Messages tied to stop index
  const MESSAGES = [
    { eyebrow: 'Scoring stops',       msg: `Matching stops for ages ${childAges}...` },
    { eyebrow: 'Checking fit',        msg: 'Finding the best stops for your pace...' },
    { eyebrow: 'Adding favourites',   msg: 'Boosting stops that match your interests...' },
    { eyebrow: 'Planning your days',  msg: tripDays > 0 ? `Spreading stops across ${tripDays} days...` : 'Building your day-by-day plan...' },
    { eyebrow: 'Adding the good stuff', msg: 'Wiring missions and wonder moments...' },
    { eyebrow: 'Almost ready',        msg: 'Your adventure is taking shape...' },
  ];

  // ─ Gate state ─
  const [animDone,   setAnimDone]   = useState(false);
  const [apiDone,    setApiDone]    = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const navigated = useRef(false);

  // ─ Builder-preview spots ─
  const [spots,   setSpots]   = useState<PreviewSpot[]>([]);
  const [stopIdx, setStopIdx] = useState(0);
  const [msgIdx,  setMsgIdx]  = useState(0);
  const stopIdxRef = useRef(0);

  // ─ A/B crossfade ─
  const [srcA, setSrcA] = useState<string | null>(null);
  const [srcB, setSrcB] = useState<string | null>(null);
  const opA         = useRef(new Animated.Value(1)).current;
  const opB         = useRef(new Animated.Value(0)).current;
  const frontA      = useRef(true);
  const pillOpacity = useRef(new Animated.Value(0)).current;

  // ─ Reanimated: message opacity ─
  const msgOpacity = useSharedValue(1);
  const msgStyle   = useAnimatedStyle(() => ({ opacity: msgOpacity.value }));

  // ─ Reanimated: finish fade-in ─
  const finishOpacity = useSharedValue(0);
  const finishStyle   = useAnimatedStyle(() => ({ opacity: finishOpacity.value }));

  // ─ Minimum animation timer ─
  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), MIN_ANIM_MS);
    return () => clearTimeout(t);
  }, []);

  // ─ Already-signed-in user: create the real trip here, skip preview ────────
  // Preview exists to sell RoamUs to a brand-new signup. An existing user
  // creating another trip already knows the product — sending them through
  // the teaser again just adds a screen between them and picking their stops.
  async function createTripAndGoToReviewStops() {
    try {
      const isMultiCity = data.cityMode === 'multi' && data.cities.length > 1;
      const tripName = isMultiCity
        ? `${data.cities.slice(0, -1).join(', ')} & ${data.cities[data.cities.length - 1]} Family Trip`
        : `${city ?? 'Chicago'} Family Trip`;
      const players = data.travelers.map(t => ({
        name: t.name, isParent: t.isParent, age: String(t.age ?? 35),
      }));

      const res = await fetch(`${API_BASE}/api/travel/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: tripName,
          destination: isMultiCity ? data.cities.join(', ') : city,
          city, country,
          startDate: data.startDate,
          endDate: data.endDate,
          travelers: players,
          adventureStyle: STYLE_MAP[data.tripStyle ?? ''] ?? 'family_explorer',
          pace: PACE_MAP[data.pace ?? ''] ?? 'balanced',
          adventureContext: 'travel',
          autoGenerateStops: true,
          templateSlug: data.templateSlug || undefined,
          tripDays: data.tripDays || undefined,
          ...(data.cityDates && Object.keys(data.cityDates).length > 0 ? {
            cityDates: Object.fromEntries(
              Object.entries(data.cityDates).map(([c, dates]) => [
                c,
                {
                  startDate: (dates as any).startDate ?? (dates as any).arrive,
                  endDate:   (dates as any).endDate   ?? (dates as any).leave,
                },
              ])
            ),
          } : {}),
          tailoring: {
            transport: data.transport,
            stroller: data.stroller,
            interests: data.interests,
            indoorOutdoor: data.indoorOutdoor ?? 'both',
            budgetSensitivity: data.budgetLevel ?? 'moderate',
            kidEnergyLevel: data.kidEnergyLevel ?? 'mixed',
            arrivalMethod: data.arrivalMethod ?? null,
            arrivalTime: data.arrivalTime ?? null,
            lastDay: data.lastDay ?? 'full',
            cityTransitions: data.cityTransitions ?? {},
          },
        }),
      });
      if (!res.ok) throw new Error('Trip creation failed');
      const trip = await res.json();
      set({ createdTripId: trip.id });
      set({ templateSlug: null, isTemplate: false, tripDays: null });

      fetch(`${API_BASE}/api/travel/trips/${trip.id}/preload-stories`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      router.replace({
        pathname: '/trip/review-stops' as any,
        params: { tripId: trip.id, fromGeneration: '1' },
      });
    } catch {
      // Don't strand the user on the building screen — fall back to the
      // normal preview flow if trip creation fails here for any reason.
      router.replace('/onboarding/preview');
    }
  }

  // ─ Navigate when both gates clear ─
  useEffect(() => {
    if (animDone && apiDone && !navigated.current) {
      navigated.current = true;
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => {
        setShowFinish(true);
        finishOpacity.value = withTiming(1, { duration: 400 });
      }, 300);
      setTimeout(() => {
        if (token) {
          createTripAndGoToReviewStops();
        } else {
          router.replace('/onboarding/preview');
        }
      }, 1800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animDone, apiDone, token]);

  // ─ Helper: resolve image URL from a spot ─
  function getImgUrl(spot: PreviewSpot): string | null {
    if (spot.imageUrl) return `${API_BASE}${spot.imageUrl}`;
    if (spot.photoRef) return `${API_BASE}/api/travel/place-photo?ref=${encodeURIComponent(spot.photoRef)}`;
    return heroImg;
  }

  // ─ Fetch builder-preview spots on mount ─
  useEffect(() => {
    if (!city) return;
    fetch(`${API_BASE}/api/travel/builder-preview?city=${encodeURIComponent(city)}`)
      .then(r => r.ok ? r.json() : { spots: [] })
      .then((body: { spots?: Array<{ name: string; photoRef: string | null; imageUrl: string | null }> }) => {
        const s = Array.isArray(body.spots) && body.spots.length > 0 ? body.spots : [];
        setSpots(s);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ Initialise A panel when spots first load; pre-load spot[1] into B ─
  useEffect(() => {
    const firstUrl = spots.length > 0 ? getImgUrl(spots[0]) : heroImg;
    setSrcA(firstUrl);
    opA.setValue(1);
    opB.setValue(0);
    frontA.current = true;
    stopIdxRef.current = 0;
    if (firstUrl) pillOpacity.setValue(1);
    // Pre-load the second image into the inactive B panel now, so it's
    // ready before the first crossfade fires at t=2.2s.
    if (spots.length > 1) setSrcB(getImgUrl(spots[1]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots.length]);

  // ─ Image + message cycling every 2.2 s ─
  // Inactive panel is always pre-loaded with the next image — never set src
  // immediately before starting the animation (async React state update would
  // mean the incoming panel starts fading in before its Image source renders).
  useEffect(() => {
    if (spots.length === 0) return;
    const iv = setInterval(() => {
      const nextIdx = (stopIdxRef.current + 1) % spots.length;

      // Fade pill + message out
      Animated.timing(pillOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      msgOpacity.value = withTiming(0, { duration: 200 });

      // Crossfade — inactive panel has next image already loaded
      if (frontA.current) {
        Animated.parallel([
          Animated.timing(opA, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(opB, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        frontA.current = false;
      } else {
        Animated.parallel([
          Animated.timing(opB, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(opA, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        frontA.current = true;
      }

      // After crossfade: update state + pre-load next+1 into now-inactive panel
      setTimeout(() => {
        stopIdxRef.current = nextIdx;
        setStopIdx(nextIdx);
        setMsgIdx(nextIdx % MESSAGES.length);
        Animated.timing(pillOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        msgOpacity.value = withTiming(1, { duration: 250 });
        // frontA.current is now the POST-swap value; inactive panel is the opposite
        const preloadIdx = (nextIdx + 1) % spots.length;
        const preloadUrl = getImgUrl(spots[preloadIdx]);
        if (frontA.current) {
          // A is front → B is inactive, pre-load into B
          setSrcB(preloadUrl);
        } else {
          // B is front → A is inactive, pre-load into A
          setSrcA(preloadUrl);
        }
      }, 320);
    }, 2200);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots.length]);

  // ─ Main API call: trip preview ─
  useEffect(() => {
    (async () => {
      if (!city) { setApiDone(true); return; }
      try {
        const adventureStyle = STYLE_MAP[data.tripStyle ?? ''] ?? 'family_explorer';
        const players = data.travelers.map(t => ({
          name: t.name, isParent: t.isParent, age: String(t.age ?? 35),
        }));
        const res = await fetch(`${API_BASE}/api/travel/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination: city, city, country,
            adventureStyle,
            pace: PACE_MAP[data.pace ?? ''] ?? 'balanced',
            startDate: data.startDate, endDate: data.endDate,
            travelers: players,
            tripDays: data.tripDays,
            tailoring: {
              transport: data.transport,
              stroller: data.stroller,
              interests: data.interests,
              indoorOutdoor: data.indoorOutdoor,
              budgetSensitivity: data.budgetLevel,
              kidEnergyLevel: data.kidEnergyLevel,
              arrivalMethod: data.arrivalMethod ?? null,
              arrivalTime: data.arrivalTime ?? null,
              lastDay: data.lastDay ?? "full",
              cityTransitions: data.cityTransitions ?? {},
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message ?? 'Preview generation failed');
        }
        const body = await res.json();
        if (Array.isArray(body.days) && body.days.length > 0) {
          set({ generatedTrip: null });
          set({ generatedTrip: { days: body.days }, previewStopIds: body.previewStopIds ?? [] });
        }
        setApiDone(true);
      } catch {
        setApiDone(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSpotName = spots.length > 0 ? spots[stopIdx].name : '';

  return (
    <View style={styles.root}>

      {/* Image A */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opA }]}>
        {srcA ? (
          <Image
            source={{ uri: srcA }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : null}
      </Animated.View>

      {/* Image B */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opB }]}>
        {srcB ? (
          <Image
            source={{ uri: srcB }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : null}
      </Animated.View>

      {/* Gradient scrim */}
      <LinearGradient
        colors={['rgba(6,8,16,0.60)', 'rgba(6,8,16,0.10)', 'rgba(6,8,16,0.10)', 'rgba(6,8,16,0.88)', '#060810']}
        locations={[0, 0.25, 0.50, 0.72, 1.0]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Content layer */}
      <View
        style={[
          styles.contentLayer,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 28 },
        ]}
      >
        {/* Wordmark */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmarkRoam}>Roam</Text>
          <Text style={styles.wordmarkUs}>Us</Text>
        </View>

        {/* Spacer pushes pill toward bottom */}
        <View style={styles.spacer} />

        {/* Stop name pill — fades with image */}
        {spots.length > 0 && (
          <Animated.View style={[styles.stopPill, { opacity: pillOpacity }]}>
            <View style={styles.stopDot} />
            <Text style={styles.stopPillText} numberOfLines={1}>{currentSpotName}</Text>
          </Animated.View>
        )}

        {/* Bottom block */}
        <View style={styles.bottomBlock}>

          {/* City title */}
          <View>
            <Text style={styles.cityPre}>Building your trip to</Text>
            <Text style={styles.cityTitle} numberOfLines={2}>{city ?? 'your destination'}</Text>
          </View>

          {/* Cycling message */}
          <Reanimated.View style={[styles.messageBlock, msgStyle]}>
            <Text style={styles.msgEyebrow}>{MESSAGES[msgIdx].eyebrow}</Text>
            <Text style={styles.msgText}>{MESSAGES[msgIdx].msg}</Text>
          </Reanimated.View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Profile row */}
          <View style={styles.profileRow}>
            <Text style={styles.profileValue} numberOfLines={1}>{footerParts.join(' \u00b7 ')}</Text>
            <View style={styles.pulseDotsRow}>
              <PulseDot delay={0} />
              <PulseDot delay={200} />
              <PulseDot delay={400} />
            </View>
          </View>

          {/* Image dots */}
          {spots.length > 0 && (
            <View style={styles.imageDotsRow}>
              {spots.map((_, i) => (
                <View key={i} style={[styles.imageDot, i === stopIdx && styles.imageDotActive]} />
              ))}
            </View>
          )}

        </View>
      </View>

      {/* Finish overlay */}
      {showFinish && (
        <Reanimated.View style={[styles.finishOverlay, finishStyle]}>
          <Text style={styles.finishTitle}>Your adventure is ready</Text>
          <Text style={styles.finishSub}>
            {city ?? ''}{tripDays > 0 ? ` \u00b7 ${tripDays} days` : ''}
          </Text>
        </Reanimated.View>
      )}

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060810',
  },

  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 28,
    flexDirection: 'column',
  },

  wordmarkRow: {
    flexDirection: 'row',
  },
  wordmarkRoam: { fontFamily: 'serif', fontSize: 20, color: '#fff',    fontWeight: '900' },
  wordmarkUs:   { fontFamily: 'serif', fontSize: 20, color: '#E8692A', fontWeight: '900' },

  spacer: { flex: 1 },

  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  stopDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E8692A',
    flexShrink: 0,
  },
  stopPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
    maxWidth: SCREEN_WIDTH - 120,
  },

  bottomBlock: {
    gap: 20,
  },

  cityPre: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cityTitle: {
    fontFamily: 'serif',
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  messageBlock: {
    minHeight: 48,
    gap: 5,
  },
  msgEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E8692A',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  msgText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.60)',
    fontWeight: '500',
    lineHeight: 21,
  },

  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },

  pulseDotsRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8692A',
  },

  imageDotsRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  imageDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  imageDotActive: {
    width: 16,
    backgroundColor: '#E8692A',
    borderRadius: 3,
  },

  finishOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060810',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  finishTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  finishSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
  },
});
