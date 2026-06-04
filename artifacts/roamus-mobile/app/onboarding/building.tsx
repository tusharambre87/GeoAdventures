import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
  useAnimatedStyle,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE } from '@/lib/authContext';
import { CITY_COUNTRY, STYLE_MAP, PACE_MAP } from '@/lib/tokens';
import { useOnboarding } from '@/lib/onboardingContext';

// ─── Constants ─────────────────────────────────────────────────────────────────────────

const MIN_ANIM_MS = 6500;

// ─── BuildingScreen ───────────────────────────────────────────────────────────────

export default function BuildingScreen() {
  const insets = useSafeAreaInsets();
  const { data, set } = useOnboarding();

  const city    = data.cities[0] ?? 'Chicago';
  const country = CITY_COUNTRY[city] ?? 'USA';

  const tripDays   = data.generatedTrip?.days?.length ?? 0;
  const totalStops = (data.generatedTrip?.days ?? []).reduce(
    (sum: number, day: { stops?: unknown[] }) => sum + (Array.isArray(day.stops) ? day.stops.length : 0),
    0,
  );
  const travelerCount = data.travelers.length;

  const MESSAGES = [
    `Mapping ${city}…`,
    'Finding family-friendly stops…',
    'Checking ages & interests…',
    'Calculating travel times…',
    'Finding free-entry options…',
    'Scoring stops for your pace…',
    'Adding wonder moments for kids…',
    'Building your day-by-day plan…',
    'Almost ready…',
  ];

  // ─ Phase & message state ─
  const [phase,    setPhase]    = useState<'building' | 'finishing'>('building');
  const [msgIdx,   setMsgIdx]   = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const [apiDone,  setApiDone]  = useState(false);
  const navigated = useRef(false);

  const mapLottieRef     = useRef<LottieView>(null);
  const successLottieRef = useRef<LottieView>(null);
  const msgOpacity       = useSharedValue(1);
  const msgStyle         = useAnimatedStyle(() => ({ opacity: msgOpacity.value }));

  // ─ Minimum animation timer ─
  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), MIN_ANIM_MS);
    return () => clearTimeout(t);
  }, []);

  // ─ Navigate when both gates clear ─
  useEffect(() => {
    if (animDone && apiDone && !navigated.current) {
      navigated.current = true;
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase('finishing');
      setTimeout(() => successLottieRef.current?.play(), 50);
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

  return (
    <View style={styles.root}>
      {/* Dark base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D1B2A' }]} />

      {/* Top gradient vignette */}
      <LinearGradient
        colors={['#060810', '#060810', 'transparent']}
        locations={[0, 0.25, 1]}
        style={[StyleSheet.absoluteFill, { height: '35%' }]}
      />

      {/* Bottom gradient vignette */}
      <LinearGradient
        colors={['transparent', '#060810', '#060810']}
        locations={[0, 0.6, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%' }}
      />

      {/* Map-pins Lottie — building phase */}
      {phase === 'building' && (
        <LottieView
          ref={mapLottieRef}
          source={require('../../assets/animations/map-pins.json')}
          autoPlay
          loop
          style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
          resizeMode="cover"
        />
      )}

      {/* Success Lottie — finishing phase */}
      {phase === 'finishing' && (
        <LottieView
          ref={successLottieRef}
          source={require('../../assets/animations/success.json')}
          autoPlay={false}
          loop={false}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Content layer */}
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 48 }]}>
        {/* Wordmark */}
        <View style={styles.logoRow}>
          <Text style={styles.logoRoam}>Roam</Text>
          <Text style={styles.logoUs}>Us</Text>
        </View>

        <View style={styles.center}>
          {phase === 'building' ? (
            <>
              <Text style={styles.heading}>
                {'Building your\n'}
                <Text style={styles.headingCity}>{city} adventure</Text>
              </Text>

              <Animated.Text style={[styles.message, msgStyle]}>
                {MESSAGES[msgIdx]}
              </Animated.Text>
            </>
          ) : (
            <Animated.View entering={FadeIn.duration(400)} style={styles.finishWrap}>
              <Text style={styles.finishTitle}>Your adventure is ready</Text>
              <Text style={styles.finishSub}>
                {city}{tripDays > 0 ? ` · ${tripDays} days` : ''}{totalStops > 0 ? ` · ${totalStops} stops` : ''}
              </Text>
            </Animated.View>
          )}
        </View>

        <Text style={styles.footer}>
          {`Personalised for ${travelerCount} traveller${travelerCount !== 1 ? 's' : ''} · ${city}`}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060810' },
  content: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  logoRow: { flexDirection: 'row', paddingHorizontal: 24 },
  logoRoam: { fontFamily: 'serif', fontSize: 22, color: '#fff', fontWeight: '900' },
  logoUs:   { fontFamily: 'serif', fontSize: 22, color: '#E8692A', fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 140, paddingHorizontal: 32 },
  heading: {
    fontSize: 34, fontWeight: '900', color: '#fff',
    textAlign: 'center', letterSpacing: -0.6, lineHeight: 40,
    marginBottom: 20,
  },
  headingCity: { color: '#E8692A' },
  message: {
    fontSize: 15, fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  finishWrap: { alignItems: 'center' },
  finishTitle: {
    fontFamily: 'serif', fontSize: 30, fontWeight: '900',
    color: '#fff', letterSpacing: -0.5, textAlign: 'center',
    marginBottom: 8,
  },
  finishSub: {
    fontSize: 15, color: 'rgba(255,255,255,0.55)',
    fontWeight: '600', textAlign: 'center',
  },
  footer: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)',
    fontWeight: '600', textAlign: 'center',
    paddingHorizontal: 24,
  },
});
