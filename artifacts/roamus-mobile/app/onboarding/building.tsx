import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useEffect, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE } from '@/lib/authContext';
import { CITY_COUNTRY, STYLE_MAP, PACE_MAP, CITY_IMGS } from '@/lib/tokens';
import { useOnboarding } from '@/lib/onboardingContext';

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_ANIM_MS  = 6500;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── BuildingScreen ─────────────────────────────────────────────────────────

export default function BuildingScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();

  const city    = data.cities[0] ?? 'Chicago';
  const country = CITY_COUNTRY[city] ?? 'USA';

  // ─ Multi-city hero image ─
  const cities  = data.cities.length > 0 ? data.cities : [city];
  const isMulti = cities.length > 1;
  const [imgIdx, setImgIdx] = useState(0);
  const heroCity = cities[imgIdx % cities.length];
  const heroImg  = CITY_IMGS[heroCity] ?? null;

  const tripDays   = data.generatedTrip?.days?.length ?? 0;
  const totalStops = (data.generatedTrip?.days ?? []).reduce(
    (sum: number, day: { stops?: unknown[] }) => sum + (Array.isArray(day.stops) ? day.stops.length : 0),
    0,
  );
  const travelerCount = data.travelers.length;

  const MESSAGES = [
    `Mapping ${city}\u2026`,
    'Finding family-friendly stops\u2026',
    'Checking ages & interests\u2026',
    'Calculating travel times\u2026',
    'Finding free-entry options\u2026',
    'Scoring stops for your pace\u2026',
    'Adding wonder moments for kids\u2026',
    'Building your day-by-day plan\u2026',
    'Almost ready\u2026',
  ];

  // ─ State ─
  const [msgIdx,     setMsgIdx]     = useState(0);
  const [animDone,   setAnimDone]   = useState(false);
  const [apiDone,    setApiDone]    = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const navigated = useRef(false);

  // ─ Progress bar (RN core Animated — width cannot use native driver) ─
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ─ Message opacity (Reanimated) ─
  const msgOpacity = useSharedValue(1);
  const msgStyle   = useAnimatedStyle(() => ({ opacity: msgOpacity.value }));

  // ─ Finish fade-in (Reanimated) ─
  const finishOpacity = useSharedValue(0);
  const finishStyle   = useAnimatedStyle(() => ({ opacity: finishOpacity.value }));

  // ─ Drive progress bar on mount ─
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: MIN_ANIM_MS,
      useNativeDriver: false,
    }).start();
  }, []);

  // ─ Minimum animation timer ─
  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), MIN_ANIM_MS);
    return () => clearTimeout(t);
  }, []);

  // ─ Multi-city image rotation every 3 s ─
  useEffect(() => {
    if (!isMulti) return;
    const iv = setInterval(() => setImgIdx(i => i + 1), 3000);
    return () => clearInterval(iv);
  }, [isMulti]);

  // ─ Navigate when both gates clear ─
  useEffect(() => {
    if (animDone && apiDone && !navigated.current) {
      navigated.current = true;
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => {
        setShowFinish(true);
        finishOpacity.value = withTiming(1, { duration: 400 });
      }, 300);
      setTimeout(() => router.replace('/onboarding/preview'), 1800);
    }
  }, [animDone, apiDone]);

  // ─ Message cycling every 2 s ─
  useEffect(() => {
    const interval = setInterval(() => {
      msgOpacity.value = withSequence(
        withTiming(0, { duration: 250 }),
        withDelay(50, withTiming(1, { duration: 300 })),
      );
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % MESSAGES.length);
      }, 250);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ─ API call ─
  useEffect(() => {
    (async () => {
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
            tripDays: data.tripDays || undefined,
            travelers: players,
            tailoring: { transport: data.transport, stroller: data.stroller, interests: data.interests },
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message ?? 'Preview generation failed');
        }
        const body = await res.json();
        if (Array.isArray(body.days) && body.days.length > 0) {
          set({ generatedTrip: { days: body.days } });
        }
        setApiDone(true);
      } catch {
        setApiDone(true);
      }
    })();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, SCREEN_WIDTH - 64],
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* City hero photo */}
      {heroImg && (
        <>
          <Image
            source={{ uri: heroImg }}
            style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(6,8,16,0.28)', 'rgba(6,8,16,0.68)', '#060810']}
            locations={[0, 0.52, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}

      {/* Orange radial glow — absolutely positioned */}
      <View style={[styles.glow, heroImg && styles.glowWithImage]} />

      {/* Wordmark top-left */}
      <View style={styles.wordmarkRow}>
        <Text style={styles.wordmarkRoam}>Roam</Text>
        <Text style={styles.wordmarkUs}>Us</Text>
      </View>

      {/* Center block */}
      <View style={styles.center}>

        {!showFinish ? (
          <>
            {/* Heading */}
            <Text style={styles.heading}>
              {'Building your\n'}
              <Text style={styles.headingCity}>{heroCity} adventure</Text>
            </Text>
            {isMulti && (
              <View style={styles.cityDots}>
                {cities.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.cityDot, i === imgIdx % cities.length && styles.cityDotActive]}
                  />
                ))}
              </View>
            )}

            {/* Progress track */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>

            {/* Cycling message */}
            <Reanimated.View style={msgStyle}>
              <Text style={styles.message}>{MESSAGES[msgIdx]}</Text>
            </Reanimated.View>
          </>
        ) : (
          /* Finish state — fades in */
          <Reanimated.View style={[styles.finishWrap, finishStyle]}>
            <Text style={styles.finishTitle}>Your adventure is ready</Text>
            <Text style={styles.finishSub}>
              {city}{tripDays > 0 ? ` \u00b7 ${tripDays} days` : ''}{totalStops > 0 ? ` \u00b7 ${totalStops} stops` : ''}
            </Text>
          </Reanimated.View>
        )}

      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        {`Personalised for ${travelerCount} traveller${travelerCount !== 1 ? 's' : ''} \u00b7 ${isMulti ? cities.join(' \u00b7 ') : city}`}
      </Text>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060810',
    justifyContent: 'space-between',
  },

  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(232,105,42,0.05)',
    alignSelf: 'center',
    top: '28%',
    shadowColor: '#E8692A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 20,
  },
  glowWithImage: {
    backgroundColor: 'rgba(232,105,42,0.02)',
    shadowOpacity: 0.18,
  },

  cityDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  cityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  cityDotActive: {
    backgroundColor: '#E8692A',
    width: 14,
  },

  wordmarkRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  wordmarkRoam: { fontFamily: 'serif', fontSize: 22, color: '#fff',     fontWeight: '900' },
  wordmarkUs:   { fontFamily: 'serif', fontSize: 22, color: '#E8692A',  fontWeight: '900' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  heading: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 42,
    marginBottom: 24,
  },
  headingCity: { color: '#E8692A' },

  progressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#E8692A',
    borderRadius: 1,
  },

  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    fontWeight: '500',
  },

  finishWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
});
