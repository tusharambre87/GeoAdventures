/**
 * Story Slides Carousel — 5 slides, swipeable
 * Brief: memories-replit-brief.md — Screen 4
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { memoriesAPI, travelAPI, Moment, API_BASE } from '@/lib/apiClient';
import { F } from '@/lib/tokens';
import { useAuth } from '@/lib/authContext';
import { isFreePlan } from '@/lib/subscription';
import UpgradeSheet from '@/components/UpgradeSheet';

const { width: SW } = Dimensions.get('window');
const TOTAL_SLIDES = 5;

const C = {
  orange: '#E8692A',
  amber:  '#F5A623',
  deep:   '#1A1F2E',
  muted:  '#8A8FA8',
} as const;

function Wordmark({ opacity = 0.4, right = false }: { opacity?: number; right?: boolean }) {
  return (
    <Text style={[styles.wordmark, right && { left: undefined, right: 24 }, { color: `rgba(255,255,255,${opacity})` }]}>
      ROAMUS
    </Text>
  );
}

// ─── Individual slides ────────────────────────────────────────────────────────

function Slide1Cover({ trip, heroPhoto }: { trip: any; heroPhoto?: string | null }) {
  const [imgErr, setImgErr] = React.useState(false);
  const stopTotal = trip?.stops?.length ?? 0;
  return (
    <View style={styles.slide}>
      {heroPhoto && !imgErr
        ? <ExpoImage source={{ uri: heroPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setImgErr(true)} />
        : <LinearGradient colors={['#1a2a1a', '#0d1f2d']} style={StyleSheet.absoluteFill} />
      }
      <LinearGradient
        colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.slide1Content}>
        <Text style={styles.eyebrow}>Family Adventure</Text>
        <Text style={styles.slide1Title}>This is what they'll remember</Text>
        <Text style={styles.slide1Meta}>
          {stopTotal > 0 ? `${stopTotal} stops` : ''}
          {trip?.destination ? `  \u00B7  ${trip.destination}` : ''}
        </Text>
      </View>
      <Wordmark right opacity={0.4} />
    </View>
  );
}

function Slide2Map({ trip }: { trip: any }) {
  const mapRef = React.useRef<MapView>(null);
  const allStops: any[] = trip?.stops ?? [];
  const city = trip?.destination ?? '';
  const numDays = trip?.tripDays ?? trip?.days ?? 0;

  const pinStops = React.useMemo(() => {
    return allStops
      .filter((s: any) => {
        const lat = parseFloat(String(s.latitude));
        const lon = parseFloat(String(s.longitude));
        return s.latitude != null && s.longitude != null &&
          !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0);
      })
      .sort((a: any, b: any) => {
        const di = (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
        return di !== 0 ? di : (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      });
  }, [allStops]);

  const toCoord = (s: any) => ({
    latitude: parseFloat(String(s.latitude)),
    longitude: parseFloat(String(s.longitude)),
  });

  const initialRegion = React.useMemo(() => {
    if (pinStops.length === 0) {
      return { latitude: 39.5, longitude: -98.35, latitudeDelta: 30, longitudeDelta: 30 };
    }
    const lats = pinStops.map((s: any) => parseFloat(String(s.latitude)));
    const lons = pinStops.map((s: any) => parseFloat(String(s.longitude)));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.04) * 1.7,
      longitudeDelta: Math.max(maxLon - minLon, 0.04) * 1.7,
    };
  }, [pinStops]);

  function fitMap() {
    if (!mapRef.current || pinStops.length === 0) return;
    if (pinStops.length === 1) {
      mapRef.current.animateToRegion({ ...toCoord(pinStops[0]), latitudeDelta: 0.08, longitudeDelta: 0.08 }, 0);
    } else {
      mapRef.current.fitToCoordinates(pinStops.map(toCoord), {
        edgePadding: { top: 100, right: 48, bottom: 64, left: 48 },
        animated: false,
      });
    }
  }

  return (
    <View style={styles.slide}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        onMapReady={() => setTimeout(fitMap, 120)}
      >
        {pinStops.length > 1 && (
          <Polyline
            coordinates={pinStops.map(toCoord)}
            strokeColor="rgba(232,105,42,0.75)"
            strokeWidth={2.5}
            lineDashPattern={[6, 4]}
          />
        )}
        {pinStops.map((stop: any, i: number) => {
          const label = stop.name.length > 16
            ? stop.name.slice(0, 15).trimEnd() + '\u2026'
            : stop.name;
          return (
            <Marker
              key={stop.id}
              coordinate={toCoord(stop)}
              anchor={{ x: 0.5, y: 0 }}
              tracksViewChanges={false}
            >
              <View style={s2m.wrap}>
                <View style={s2m.pin}>
                  <Text style={s2m.num}>{i + 1}</Text>
                </View>
                <View style={s2m.badge}>
                  <Text style={s2m.badgeTxt} numberOfLines={1}>{label}</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top gradient overlay */}
      <LinearGradient
        colors={['rgba(10,14,26,0.88)', 'rgba(10,14,26,0.55)', 'transparent']}
        style={styles.mapTopOverlay}
      >
        <Text style={styles.mapEyebrow}>YOUR JOURNEY</Text>
        <Text style={styles.mapTripName}>{trip?.name ?? 'Our Trip'}</Text>
        <Text style={styles.mapSubline}>
          {[city, pinStops.length > 0 ? `${pinStops.length} stops` : null, numDays > 0 ? `${numDays} days` : null]
            .filter(Boolean).join(' \u00B7 ')}
        </Text>
      </LinearGradient>

      <Wordmark opacity={0.35} />
    </View>
  );
}
function Slide3Collage({ collagePhotos, trip, onAddPhoto }: {
  collagePhotos: (string | null)[];
  trip?: any;
  onAddPhoto?: () => void;
}) {
  const [failedIdx, setFailedIdx] = React.useState<Set<number>>(new Set());
  const cells = [0, 1, 2, 3];
  // Distinct warm/cool gradients so each cell reads as a different place
  const gradients: [string, string][] = [
    ['#1d3a2a', '#2e5c42'],
    ['#1a2d4a', '#2d4472'],
    ['#3a1e0a', '#6b3420'],
    ['#2a1a3a', '#4a2d6b'],
  ];
  // First 4 stops as fallback content when no image loads
  const fallbackStops: any[] = (trip?.stops ?? []).slice(0, 4);

  return (
    <View style={styles.slide}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.deep }]} />
      <View style={styles.collageHeader}>
        <Text style={styles.eyebrow}>The Moments That Mattered</Text>
        <Text style={styles.collageTitle}>A few things we won't forget</Text>
      </View>
      <View style={styles.collageGrid}>
        {cells.map(i => {
          const url = collagePhotos[i];
          const hasPhoto = !!url && !failedIdx.has(i);
          const stop = fallbackStops[i];
          return (
            <LinearGradient key={i} colors={gradients[i]} style={styles.collageCell}>
              {hasPhoto ? (
                <ExpoImage
                  source={{ uri: url! }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  onError={() => setFailedIdx(prev => new Set([...prev, i]))}
                />
              ) : stop ? (
                <View style={s3m.card}>
                  <View style={s3m.numBadge}>
                    <Text style={s3m.numTxt}>{i + 1}</Text>
                  </View>
                  <Text style={s3m.stopName} numberOfLines={3}>{stop.name}</Text>
                </View>
              ) : (
                <Pressable
                  style={[StyleSheet.absoluteFill, styles.collagePlaceholder]}
                  onPress={onAddPhoto}
                >
                  <Text style={styles.collagePlaceholderIcon}>{'\uFF0B'}</Text>
                  <Text style={styles.collagePlaceholderText}>Add a photo</Text>
                </Pressable>
              )}
            </LinearGradient>
          );
        })}
      </View>
      <Wordmark opacity={0.3} />
    </View>
  );
}

function Slide4Quotes({
  highlights,
  generating,
  onAddQuote,
}: {
  highlights: string[];
  generating?: boolean;
  onAddQuote?: () => void;
}) {
  const hasHighlights = highlights && highlights.length > 0;

  return (
    <View style={styles.slide}>
      <LinearGradient colors={['#2d1b4e', '#1a1f2e']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.quotesContent}>
        <Text style={styles.eyebrow}>Through Your Explorer's Eyes</Text>
        <Text style={styles.quotesTitle}>What they'll remember most</Text>

        {hasHighlights ? (
          highlights.slice(0, 4).map((h, i) => {
            const hasPipe = h.includes('|');
            const kidName = hasPipe ? h.split('|')[0].trim() : null;
            const quoteBody = hasPipe ? h.split('|').slice(1).join('|').trim() : h;
            return (
              <View key={i} style={styles.quoteItem}>
                <Text style={styles.quoteStar}>{'\u2726'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteText}>"{quoteBody}"</Text>
                  {kidName && (
                    <Text style={styles.quoteAttrib}>{'\u2014'} {kidName}</Text>
                  )}
                </View>
              </View>
            );
          })
        ) : generating ? (
          <View style={styles.generateCard}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
            <Text style={[styles.generateSub, { marginTop: 12, textAlign: 'center' }]}>
              Building your story{'\u2026'}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyQuotes}>
            <Text style={styles.emptyQuotesText}>No kid quotes yet</Text>
            <Text style={[styles.emptyQuotesText, { fontSize: 13, marginTop: 8, opacity: 0.65, lineHeight: 20 }]}>
              Wrap up a day and add what the kids said{' —'} they'll appear here.
            </Text>
          </View>
        )}
      </View>
      <Wordmark opacity={0.2} />
    </View>
  );
}

function Slide5Closing({ trip, closingPhoto }: { trip: any; closingPhoto?: string | null }) {
  const [imgErr, setImgErr] = React.useState(false);
  return (
    <View style={styles.slide}>
      {closingPhoto && !imgErr
        ? <ExpoImage source={{ uri: closingPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setImgErr(true)} />
        : <LinearGradient colors={['#0d1a0d', '#1a1f0d']} style={StyleSheet.absoluteFill} />
      }
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      <View style={styles.slide5Content}>
        <Text style={styles.eyebrow}>Already dreaming about the next one</Text>
        <Text style={styles.slide5Title}>Our {trip?.destination ?? ''} adventure</Text>
        <Text style={styles.slide5Sub}>The kind of trip that sticks with you</Text>
        <Text style={[styles.wordmark, { position: 'relative', bottom: undefined, left: undefined, marginTop: 12, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }]}>
          ROAMUS
        </Text>
      </View>
    </View>
  );
}

// ─── Main carousel ────────────────────────────────────────────────────────────

export default function StoryScreen() {
  const { tripId, fromComplete, regenerated } = useLocalSearchParams<{ tripId: string; fromComplete?: string; regenerated?: string }>();
  const insets = useSafeAreaInsets();

  // Slide state + cross-fade animation
  const [slide, setSlide] = useState(0);
  const [displaySlide, setDisplaySlide] = useState(0);
  const slideOpacity = useRef(new Animated.Value(1)).current;
  // Mutable ref so panResponder always reads the latest slide index (avoids stale closure)
  const slideIndexRef = useRef(0);

  // Toast opacity refs
  const savedToastOpacity = useRef(new Animated.Value(0)).current;
  const photoToastOpacity = useRef(new Animated.Value(0)).current;
  const [photoToastMessage, setPhotoToastMessage] = useState('\uD83D\uDCF7 Photo saved to camera roll');
  const [savingAll, setSavingAll] = useState(false);

  // ViewShot capture ref (on the slide area only, not chrome)
  const slideRef = useRef<View>(null);

  const { data: trip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => travelAPI.getTrip(tripId),
    enabled: !!tripId,
  });
  const { data: moments = [] } = useQuery({
    queryKey: ['moments', tripId],
    queryFn: () => memoriesAPI.getMoments(tripId),
    enabled: !!tripId,
    select: (d: unknown) => Array.isArray(d) ? d as Moment[] : ((d as { moments?: Moment[] })?.moments ?? []),
  });
  const { data: story, isError: storyMissing, refetch: refetchStory } = useQuery({
    queryKey: ['story', tripId],
    queryFn: () => memoriesAPI.getStory(tripId),
    enabled: !!tripId,
    retry: false,
  });
  const [generating, setGenerating] = React.useState(false);
  const [genError, setGenError]     = React.useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const isFree = !authLoading && isFreePlan(user?.subscriptionTier);
  const [upgradeVisible, setUpgradeVisible] = React.useState(false);

  // ── Replace-image overrides (user picks from their trip photos) ────────────
  const [overrideHero,    setOverrideHero]    = useState<string | null>(null);
  const [overrideClosing, setOverrideClosing] = useState<string | null>(null);
  const [overrideCollage, setOverrideCollage] = useState<(string|null)[]>([null,null,null,null]);
  const overridesLoaded = useRef(false);
  const [photoSeed, setPhotoSeed] = useState(() => regenerated === '1' ? 1 : 0);
  const [pickerMode, setPickerMode] = useState<'hero'|'collage'|'closing'|null>(null);
  const [collageSelected, setCollageSelected] = useState<string[]>([]);

  // ── Persist image overrides so they survive navigation ──────────────
  const storageKey = tripId ? `story-overrides-${tripId}` : null;

  // Load saved overrides — server is source of truth, AsyncStorage is fallback
  useEffect(() => {
    overridesLoaded.current = false;
    if (!tripId) { overridesLoaded.current = true; return; }
    const applyRaw = (raw: string | null) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved.hero)    setOverrideHero(saved.hero);
        if (saved.closing) setOverrideClosing(saved.closing);
        if (saved.collage) setOverrideCollage(saved.collage);
      } catch {}
    };
    const loadFromAsyncStorage = () => {
      if (!storageKey) { overridesLoaded.current = true; return; }
      AsyncStorage.getItem(storageKey).then(raw => { applyRaw(raw); overridesLoaded.current = true; });
    };
    memoriesAPI.getStoryOverrides(tripId)
      .then(serverOverrides => {
        if (serverOverrides?.hero || serverOverrides?.closing || serverOverrides?.collage?.some(Boolean)) {
          if (serverOverrides.hero)    setOverrideHero(serverOverrides.hero);
          if (serverOverrides.closing) setOverrideClosing(serverOverrides.closing);
          if (serverOverrides.collage) setOverrideCollage(serverOverrides.collage);
          overridesLoaded.current = true;
        } else {
          loadFromAsyncStorage();
        }
      })
      .catch(loadFromAsyncStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Save overrides to server (source of truth) + AsyncStorage (cache) after initial load
  useEffect(() => {
    if (!storageKey || !overridesLoaded.current) return;
    const payload = { hero: overrideHero, closing: overrideClosing, collage: overrideCollage };
    AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    if (tripId) memoriesAPI.saveStoryOverrides(tripId, payload);
  }, [storageKey, overrideHero, overrideClosing, overrideCollage]);

  // Show "Saved to Memories" toast when arriving from trip complete
  useEffect(() => {
    if (fromComplete === '1') {
      showSavedToast();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromComplete]);

  // Auto-generate story if it doesn't exist yet (fire once per session)
  const autoGeneratedRef = useRef(false);
  useEffect(() => {
    if (storyMissing && !generating && tripId && !autoGeneratedRef.current) {
      autoGeneratedRef.current = true;
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyMissing, tripId]);

  function showSavedToast() {
    savedToastOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(2800),
      Animated.timing(savedToastOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }

  function showPhotoToast(message?: string) {
    if (message) setPhotoToastMessage(message);
    photoToastOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(2200),
      Animated.timing(photoToastOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }

  // Cross-fade to new slide index — reads slideIndexRef so panResponder never goes stale
  function changeSlide(newIdx: number) {
    if (newIdx === slideIndexRef.current) return;
    slideIndexRef.current = newIdx;
    Animated.timing(slideOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setSlide(newIdx);
      setDisplaySlide(newIdx);
      Animated.timing(slideOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  async function handleGenerate() {
    if (!tripId) return;
    setGenerating(true);
    setGenError(false);
    try {
      await memoriesAPI.regenerateStory(tripId);
      await refetchStory();
      setPhotoSeed(prev => prev + 1);
    } catch {
      setGenError(true);
    } finally {
      setGenerating(false);
    }
  }

  // ── Ranked photo pool: non-food stops first so hero/collage use landmark photos ──
  const rankedPhotos = useMemo(() => {
    const stops = trip?.stops ?? [] as any[];
    const stopTypeMap = new Map<string, string>(stops.map((s: any) => [s.id ?? '', s.stopType ?? '']));
    const foodTypes = new Set(['restaurant', 'cafe', 'food', 'lunch', 'dinner', 'breakfast', 'meal', 'street_food']);
    type PE = { url: string; isFood: boolean };
    const entries: PE[] = (moments as Moment[]).flatMap(m => {
      const type = m.stopId ? (stopTypeMap.get(m.stopId) ?? '') : '';
      const isFood = foodTypes.has(type);
      const urls = m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl as string] : [];
      return urls.map(url => ({ url, isFood }));
    });
    entries.sort((a, b) => Number(a.isFood) - Number(b.isFood));
    return entries.map(e => e.url);
  }, [moments, trip]);

  const { heroPhoto, collagePhotos, closingPhoto, highlights } = useMemo(() => {
    const allPhotos = rankedPhotos;
    const offset = allPhotos.length > 1 ? photoSeed % allPhotos.length : 0;
    const photos = offset > 0 ? [...allPhotos.slice(offset), ...allPhotos.slice(0, offset)] : allPhotos;
    // Stop hero-img URLs — actual photos of each place (populated by Stop Image Backfill)
    const stopPhotos = (trip?.stops ?? [] as any[])
      .map((s: any) => s.id ? `${API_BASE}/api/travel/stops/${s.id}/hero-img` : null)
      .filter(Boolean) as string[];
    // Kid quotes from in-app entries; fall back to AI highlights
    const kidQuotes = (moments as Moment[])
      .filter(m => m.kidPromptResponse?.trim())
      .map(m => m.kidPromptResponse!.trim());
    return {
      heroPhoto: photos[0] ?? stopPhotos[0] ?? null,
      collagePhotos: ([0, 1, 2, 3].map(i => photos[i] ?? stopPhotos[i] ?? null)) as (string | null)[],
      closingPhoto: photos[photos.length - 1] ?? photos[0]
        ?? stopPhotos[stopPhotos.length - 1] ?? stopPhotos[0] ?? null,
      highlights: kidQuotes.length > 0 ? kidQuotes : (story?.highlights ?? []),
    };
  }, [rankedPhotos, moments, story, trip]);

  function nextSlide() {
    const cur = slideIndexRef.current;
    if (cur >= TOTAL_SLIDES - 1) { router.back(); return; }
    changeSlide(cur + 1);
  }
  function prevSlide() {
    const cur = slideIndexRef.current;
    if (cur <= 0) return;
    changeSlide(cur - 1);
  }

  // panResponder uses a stable ref-based wrapper so it never closes over stale state
  const nextSlideRef = useRef(nextSlide);
  const prevSlideRef = useRef(prevSlide);
  nextSlideRef.current = nextSlide;
  prevSlideRef.current = prevSlide;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) nextSlideRef.current();
        if (g.dx > 50) prevSlideRef.current();
      },
    })
  ).current;

  // Capture the slide view as a PNG and return the local URI
  async function captureSlide(): Promise<string | null> {
    if (!slideRef.current) return null;
    try {
      return await captureRef(slideRef, { format: 'png', quality: 0.92 });
    } catch {
      return null;
    }
  }

  async function handleSave() {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to save story slides to your camera roll.');
      return;
    }
    const uri = await captureSlide();
    if (!uri) { Alert.alert('Could not save', 'Please try again.'); return; }
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      showPhotoToast('\uD83D\uDCF7 Photo saved to camera roll');
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
  }

  async function handleSaveAll() {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to save story slides to your camera roll.');
      return;
    }
    setSavingAll(true);
    const originalSlide = slideIndexRef.current;
    let savedCount = 0;
    try {
      for (let i = 0; i < TOTAL_SLIDES; i++) {
        // Switch to slide i without animation so captureRef sees the right content
        slideOpacity.setValue(1);
        setDisplaySlide(i);
        // Wait for the state update and layout to flush before capturing
        await new Promise<void>(resolve => setTimeout(resolve, 1500));
        const uri = await captureSlide();
        if (uri) {
          await MediaLibrary.saveToLibraryAsync(uri);
          savedCount++;
        }
      }
    } finally {
      // Restore the slide the user was on
      setDisplaySlide(originalSlide);
      setSavingAll(false);
    }
    if (savedCount === 0) {
      Alert.alert('Could not save', 'Please try again.');
    } else {
      showPhotoToast(`\uD83D\uDCF7 ${savedCount} photo${savedCount === 1 ? '' : 's'} saved to camera roll`);
    }
  }

  async function handleShareImage() {
    const uri = await captureSlide();
    if (!uri) {
      try { await Share.share({ url: `https://roamus.app/s/${tripId}`, message: `Our ${trip?.name ?? ''} trip on RoamUs` }); } catch {}
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        // expo-sharing works on both iOS and Android with local file URIs
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your story slide' });
      } else {
        // Fallback: iOS Share.share with url, or message-only on Android
        await Share.share({ url: uri, message: `Our ${trip?.name ?? ''} trip on RoamUs` });
      }
    } catch {}
  }

  async function handleShareInstagram() {
    const uri = await captureSlide();
    if (!uri) { Alert.alert('Could not prepare image', 'Please try again.'); return; }
    // Save to camera roll first (Instagram reads from library)
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access so we can share your story slide to Instagram.');
      return;
    }
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      // iOS deep link: opens Instagram and pre-selects the photo from library
      const iosDeepLink = `instagram://library?LocalIdentifier=${asset.id}`;
      // Android: Instagram Play Store intent fallback
      const androidDeepLink = 'instagram://app';
      const deepLink = Platform.OS === 'ios' ? iosDeepLink : androidDeepLink;
      const canOpen = await Linking.canOpenURL(deepLink).catch(() => false);
      if (canOpen) {
        await Linking.openURL(deepLink);
      } else {
        // Instagram not installed — fall through to native share with the image
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share to Instagram' });
        } else {
          Alert.alert('Instagram not installed', 'Your photo has been saved to your camera roll — you can share it from there.');
        }
      }
    } catch {
      Alert.alert('Could not open Instagram', 'Your slide has been saved to your camera roll.');
    }
  }

  async function handleShareLink() {
    try {
      await Share.share({
        url: `https://roamus.app/s/${tripId}`,
        message: `Check out our ${trip?.name ?? ''} on RoamUs!`,
      });
    } catch {}
  }

  const handleAddPhoto = () => router.push({ pathname: '/(tabs)/today', params: { tripId } } as any);
  const handleAddQuote = () => router.push({ pathname: '/(tabs)/today', params: { tripId } } as any);

  const finalHero    = overrideHero    ?? heroPhoto;
  const finalClosing = overrideClosing ?? closingPhoto;
  const finalCollage = overrideCollage.some(p => p !== null)
    ? ([0,1,2,3].map(i => overrideCollage[i] ?? collagePhotos[i] ?? null) as (string|null)[])
    : collagePhotos;

  const slideContent = [
    <Slide1Cover key="1" trip={trip} heroPhoto={finalHero} />,
    <Slide2Map key="2" trip={trip} />,
    <Slide3Collage key="3" collagePhotos={finalCollage} trip={trip} onAddPhoto={handleAddPhoto} />,
    <Slide4Quotes key="4" highlights={highlights} generating={generating} onAddQuote={handleAddQuote} />,
    <Slide5Closing key="5" trip={trip} closingPhoto={finalClosing} />,
  ];

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]} {...panResponder.panHandlers}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Slide content — wrapped in a capturable ref + animated fade */}
      <View ref={slideRef} style={StyleSheet.absoluteFill} collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: slideOpacity }]}>
          {slideContent[displaySlide]}
        </Animated.View>
      </View>

      {/* Top bar — close + progress */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarRow}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>{'\u00D7'}</Text>
          </Pressable>
          <Text style={styles.slideCounter}>{slide + 1}/{TOTAL_SLIDES}</Text>
        </View>
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <Pressable key={i} onPress={() => changeSlide(i)} style={{ flex: 1 }}>
              <View
                style={[
                  styles.progressBar,
                  i < slide && styles.progressDone,
                  i === slide && styles.progressCurrent,
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.sharePrimaryRow}>
          <Pressable style={[styles.shareMain, { flex: 1 }]} onPress={handleShareImage}>
            <Text style={styles.shareMainText}>{'\u2197'} Share as image</Text>
          </Pressable>
          {(slide === 0 || slide === 2 || slide === 4) && (
            <Pressable
              style={styles.replaceBtn}
              onPress={() => {
                if (slide === 0) setPickerMode('hero');
                else if (slide === 2) { setCollageSelected([]); setPickerMode('collage'); }
                else setPickerMode('closing');
              }}
            >
              <Text style={styles.replaceBtnText}>
                {slide === 2 ? 'Collage' : 'Replace'}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.shareRow}>
          <Pressable style={styles.shareSmall} onPress={handleShareLink}>
            <Text style={styles.shareSmallText}>{'\uD83D\uDD17'} Share link</Text>
          </Pressable>
          <Pressable style={styles.shareSmall} onPress={nextSlide}>
            <Text style={styles.shareSmallText}>{slide < TOTAL_SLIDES - 1 ? 'Next \u2192' : 'Done \u2713'}</Text>
          </Pressable>
          <Pressable
            style={[styles.shareSmall, savingAll && { opacity: 0.6 }]}
            onPress={handleSave}
            onLongPress={handleSaveAll}
            delayLongPress={500}
            disabled={savingAll}
          >
            {savingAll
              ? <ActivityIndicator size="small" color={C.orange} />
              : <Text style={styles.shareSmallText}>{'\u2B07'} Save</Text>
            }
          </Pressable>
        </View>
      </View>

      {/* "Saved to Memories" toast — shown when coming from trip complete */}
      <Animated.View style={[styles.toast, styles.toastBottom, { opacity: savedToastOpacity, bottom: insets.bottom + 110 }]} pointerEvents="none">
        <Text style={styles.toastText}>{'\u2728'} Story saved to your Memories tab</Text>
      </Animated.View>

      {/* "Photo saved!" toast */}
      <Animated.View style={[styles.toast, styles.toastBottom, { opacity: photoToastOpacity, bottom: insets.bottom + 110 }]} pointerEvents="none">
        <Text style={styles.toastText}>{photoToastMessage}</Text>
      </Animated.View>

      {isFree && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 44, marginBottom: 16 }}>{'\uD83D\uDD12'}</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 8, paddingHorizontal: 32 }}>Your Family Story</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 40 }}>Upgrade to unlock your AI-generated trip memory.</Text>
          <Pressable
            style={{ backgroundColor: '#E8692A', borderRadius: 24, paddingHorizontal: 32, paddingVertical: 14 }}
            onPress={() => setUpgradeVisible(true)}
          >
            <Text style={{ fontFamily: F.bold, fontSize: 16, color: '#fff' }}>Unlock story {'\u2192'}</Text>
          </Pressable>
        </View>
      )}
      <UpgradeSheet
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
        context="story"
      />

      {/* ── Photo picker modal ─────────────────────────────────────────── */}
      <Modal
        visible={pickerMode !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerMode(null)}
      >
        <View style={pkr.root}>
          <View style={pkr.header}>
            <Text style={pkr.title}>
              {pickerMode === 'collage' ? 'Select up to 4 photos' : 'Choose a photo'}
            </Text>
            <TouchableOpacity onPress={() => setPickerMode(null)} style={pkr.cancelBtn}>
              <Text style={pkr.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {rankedPhotos.length === 0 ? (
            <View style={pkr.empty}>
              <Text style={pkr.emptyTxt}>No photos found. Add photos to your stops first.</Text>
            </View>
          ) : (
            <FlatList
              data={rankedPhotos}
              numColumns={3}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={pkr.grid}
              renderItem={({ item }) => {
                const selIdx = collageSelected.indexOf(item);
                const selected = selIdx >= 0;
                return (
                  <Pressable
                    style={pkr.cell}
                    onPress={() => {
                      if (pickerMode === 'hero')    { setOverrideHero(item);    setPickerMode(null); }
                      else if (pickerMode === 'closing') { setOverrideClosing(item); setPickerMode(null); }
                      else if (pickerMode === 'collage') {
                        if (selected) {
                          setCollageSelected(prev => prev.filter(p => p !== item));
                        } else if (collageSelected.length < 4) {
                          setCollageSelected(prev => [...prev, item]);
                        }
                      }
                    }}
                  >
                    <ExpoImage source={{ uri: item }} style={pkr.thumb} contentFit="cover" />
                    {pickerMode === 'collage' && selected && (
                      <View style={pkr.badge}>
                        <Text style={pkr.badgeNum}>{selIdx + 1}</Text>
                      </View>
                    )}
                    {pickerMode === 'collage' && !selected && collageSelected.length >= 4 && (
                      <View style={[pkr.badge, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}
          {pickerMode === 'collage' && (
            <View style={pkr.doneRow}>
              <TouchableOpacity
                style={[pkr.doneBtn, collageSelected.length === 0 && { opacity: 0.45 }]}
                disabled={collageSelected.length === 0}
                onPress={() => {
                  const filled: (string|null)[] = [null,null,null,null];
                  collageSelected.forEach((p,i) => { filled[i] = p; });
                  setOverrideCollage(filled);
                  setPickerMode(null);
                }}
              >
                <Text style={pkr.doneTxt}>
                  Done {collageSelected.length > 0 ? `(${collageSelected.length}/4 selected)` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slide: { ...StyleSheet.absoluteFillObject },

  // Top bar
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, zIndex: 10 },
  topBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 20, color: '#fff' },
  slideCounter: { fontSize: 13, fontFamily: F.bold, color: 'rgba(255,255,255,0.7)' },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: 14 },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressDone: { backgroundColor: '#fff' },
  progressCurrent: { backgroundColor: '#E8692A' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
  },
  sharePrimaryRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  shareMain: {
    backgroundColor: '#E8692A',
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  shareMainText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },

  shareRow: { flexDirection: 'row', gap: 8 },

  // Replace Image button (compact, sits next to Share as image)
  replaceBtn: {
    width: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  replaceBtnText: { fontSize: 12, fontFamily: F.bold, color: '#E8692A', textAlign: 'center' },
  shareSmall: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  shareSmallText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },

  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(26,31,46,0.92)',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    zIndex: 99,
  },
  toastBottom: {},
  toastText: { fontSize: 13, fontFamily: F.bold, color: '#fff', textAlign: 'center' },

  // Wordmark
  wordmark: { position: 'absolute', bottom: 115, left: 24, fontSize: 11, fontFamily: F.bold, letterSpacing: 2, textTransform: 'uppercase' },

  // Slide 1
  slide1Content: { position: 'absolute', bottom: 158, left: 0, right: 0, paddingHorizontal: 24 },
  eyebrow: { fontSize: 11, fontFamily: F.bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  slide1Title: { fontFamily: 'Georgia', fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 34, marginBottom: 8 },
  slide1Meta: { fontSize: 14, fontFamily: F.regular, color: 'rgba(255,255,255,0.6)' },

  // Slide 2 Map — Google Static Map with gradient overlays
  mapTopOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 210, paddingTop: 68, paddingHorizontal: 28 },
  mapBottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 44, paddingBottom: 36, paddingHorizontal: 28 },
  mapEyebrow: { fontSize: 10, fontFamily: F.bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 7 },
  mapTripName: { fontFamily: 'Georgia', fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32, marginBottom: 5 },
  mapSubline: { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.6)' },
  mapStopList: { marginBottom: 12 },
  mapStopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mapNumberBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E8692A', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  mapNumberText: { fontSize: 11, fontFamily: F.bold, color: '#fff' },
  mapStopInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapStopName: { flex: 1, fontSize: 13, fontFamily: F.semibold, color: '#fff' },
  mapStopTime: { fontSize: 11, fontFamily: F.regular, color: 'rgba(255,255,255,0.5)', marginLeft: 8 },
  mapPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 12 },
  mapPillText: { fontSize: 12, fontFamily: F.medium, color: 'rgba(255,255,255,0.8)' },
  mapEmptyHint: { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginBottom: 10 },
  // legacy (unused after map redesign)
  mapTopBlock: { position: 'absolute', top: 100, left: 28, right: 28 },
  mapDotCol: { alignItems: 'center', width: 20, paddingTop: 4 },
  mapDot: { width: 10, height: 10, borderRadius: 5 },
  mapDotFilled: { backgroundColor: '#fff' },
  mapDotOutline: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'transparent' },
  mapConnector: { width: 1, flex: 1, minHeight: 24, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // Slide 3 Collage
  collageHeader: { paddingTop: 100, paddingHorizontal: 24, paddingBottom: 20, position: 'relative', zIndex: 2 },
  collageTitle: { fontFamily: 'Georgia', fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32 },
  collageGrid: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', gap: 3, position: 'relative', zIndex: 2 },
  collageCell: { width: (SW - 40 - 3) / 2, aspectRatio: 1, overflow: 'hidden' },
  collagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  collagePlaceholderIcon: { fontSize: 28, opacity: 0.5 },
  collagePlaceholderText: { fontSize: 11, fontFamily: F.medium, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 15 },

  // Slide 4 Quotes
  quotesContent: { position: 'absolute', inset: 0, paddingHorizontal: 24, paddingTop: 100, paddingBottom: 180, justifyContent: 'center', gap: 16 },
  quotesTitle: { fontFamily: 'Georgia', fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32, marginBottom: 8 },
  quoteItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  quoteStar: { color: '#F5A623', fontSize: 14, marginTop: 2 },
  quoteText: { fontSize: 15, fontFamily: F.regular, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: 24 },
  quoteAttrib: { fontFamily: F.bold, fontSize: 12, color: '#E8692A', marginTop: 4, letterSpacing: 0.3 },

  // Generate story card
  generateCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginTop: 8,
  },
  generateTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: '#fff',
    marginBottom: 8,
  },
  generateSub: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
    marginBottom: 16,
  },
  generateError: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: '#fc8181',
    marginBottom: 8,
  },
  generateBtn: {
    backgroundColor: '#E8692A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  generateBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: '#fff',
  },

  // Slide 5 Closing
  slide5Content: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 32, paddingBottom: 180, alignItems: 'center', textAlign: 'center' },
  slide5Title: { fontFamily: 'Georgia', fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 38, marginBottom: 8, textAlign: 'center' },
  slide5Sub: { fontSize: 14, fontFamily: F.regular, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  // Slide 4 empty quotes state
  emptyQuotes: { alignItems: 'center', gap: 16, paddingTop: 8 },
  emptyQuotesText: { fontFamily: F.medium, fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  addQuoteBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  addQuoteBtnText: { fontFamily: F.semibold, fontSize: 14, color: '#fff' },
});

// Slide 3 collage stop-name fallback card styles
const s3m = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
  },
  numBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  numTxt: { fontSize: 12, fontFamily: F.bold, color: '#fff' },
  stopName: {
    fontSize: 13, fontFamily: F.semibold, color: '#fff',
    lineHeight: 18, opacity: 0.92,
  },
});

// ── Picker modal styles ────────────────────────────────────────────────────────
const pkr = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F2EE' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  title: { fontFamily: F.bold, fontSize: 17, color: '#1A1F2E' },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  cancelTxt: { fontFamily: F.medium, fontSize: 15, color: '#E8692A' },
  grid: { padding: 2 },
  cell: { width: (SW - 4) / 3 - 2, height: (SW - 4) / 3 - 2, margin: 1, overflow: 'hidden', backgroundColor: '#e0dcd8' },
  thumb: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E8692A', alignItems: 'center', justifyContent: 'center',
  },
  badgeNum: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  doneRow: {
    padding: 16, borderTopWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F5F2EE',
  },
  doneBtn: {
    backgroundColor: '#E8692A', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
  },
  doneTxt: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTxt: { fontFamily: F.medium, fontSize: 15, color: '#8A8FA8', textAlign: 'center', lineHeight: 22 },
});

// Slide 2 map marker styles
const s2m = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 3 },
  pin: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8692A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  num: { fontSize: 12, fontFamily: F.bold, color: '#fff', lineHeight: 14 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    maxWidth: 110,
  },
  badgeTxt: { fontSize: 10, fontFamily: F.medium, color: '#1A1F2E', lineHeight: 14 },
});
