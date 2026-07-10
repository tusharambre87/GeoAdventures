/**
 * Story Slides Carousel — 5 slides, swipeable
 * Brief: memories-replit-brief.md — Screen 4
 */
import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Alert,
  Animated,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

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
  const stopTotal = trip?.stops?.length ?? 0;
  return (
    <View style={styles.slide}>
      {heroPhoto
        ? <ExpoImage source={{ uri: heroPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
  const [mapErr, setMapErr] = React.useState(false);
  const allStops = trip?.stops ?? [];
  const visited = allStops
    .filter((s: any) => s.isVisited || s.visited)
    .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const city = trip?.destination ?? '';
  const numDays = trip?.tripDays ?? trip?.days ?? 0;
  const visitedCount = visited.length;
  const mapUri = trip?.id ? `${API_BASE}/api/travel/trips/${trip.id}/story-map?v=2` : null;
  const showMap = !!mapUri && !mapErr;

  return (
    <View style={styles.slide}>
      {showMap ? (
        <ExpoImage
          source={{ uri: mapUri! }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          onError={() => setMapErr(true)}
        />
      ) : (
        <LinearGradient colors={['#1A1F2E', '#0d1520']} style={StyleSheet.absoluteFill} />
      )}

      {/* Top gradient overlay */}
      <LinearGradient
        colors={['rgba(10,14,26,0.88)', 'rgba(10,14,26,0.55)', 'transparent']}
        style={styles.mapTopOverlay}
      >
        <Text style={styles.mapEyebrow}>YOUR JOURNEY</Text>
        <Text style={styles.mapTripName}>{trip?.name ?? 'Our Trip'}</Text>
        <Text style={styles.mapSubline}>
          {[city, visitedCount > 0 ? `${visitedCount} stops` : null, numDays > 0 ? `${numDays} days` : null]
            .filter(Boolean).join(' \u00B7 ')}
        </Text>
      </LinearGradient>

      {/* Bottom gradient overlay — numbered stop list */}
      <LinearGradient
        colors={['transparent', 'rgba(10,14,26,0.75)', 'rgba(10,14,26,0.97)']}
        style={styles.mapBottomOverlay}
      >
        <View style={styles.mapStopList}>
          {visited.slice(0, 6).map((s: any, i: number) => {
            const visitedAt = s.visitedAt ?? s.updatedAt ?? null;
            const timeLabel = visitedAt
              ? new Date(visitedAt).toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' })
              : '';
            return (
              <View key={s.id} style={styles.mapStopRow}>
                <View style={styles.mapNumberBadge}>
                  <Text style={styles.mapNumberText}>{i + 1}</Text>
                </View>
                <View style={styles.mapStopInfo}>
                  <Text style={styles.mapStopName} numberOfLines={1}>{s.name}</Text>
                  {timeLabel ? <Text style={styles.mapStopTime}>{timeLabel}</Text> : null}
                </View>
              </View>
            );
          })}
          {visitedCount === 0 && (
            <Text style={styles.mapEmptyHint}>Stops you visit will appear here</Text>
          )}
        </View>
        <View style={styles.mapPill}>
          <Text style={styles.mapPillText}>{'\uD83D\uDCCD'} {visitedCount} places explored</Text>
        </View>
        <Wordmark opacity={0.35} />
      </LinearGradient>
    </View>
  );
}
function Slide3Collage({ collagePhotos, onAddPhoto }: { collagePhotos: (string | null)[]; onAddPhoto?: () => void }) {
  const cells = [0, 1, 2, 3];
  const placeholderBg = ['#2a4a3a', '#1a3a5f', '#3a2a1a', '#2a1a3a'];
  return (
    <View style={styles.slide}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.deep }]} />
      <View style={styles.collageHeader}>
        <Text style={styles.eyebrow}>The Moments That Mattered</Text>
        <Text style={styles.collageTitle}>A few things we won't forget</Text>
      </View>
      <View style={styles.collageGrid}>
        {cells.map(i => (
          <View key={i} style={[styles.collageCell, { backgroundColor: placeholderBg[i] }]}>
            {collagePhotos[i]
              ? <ExpoImage source={{ uri: collagePhotos[i]! }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : (
                <Pressable
                  style={[StyleSheet.absoluteFill, styles.collagePlaceholder]}
                  onPress={onAddPhoto}
                >
                  <Text style={styles.collagePlaceholderIcon}>{'\uFF0B'}</Text>
                  <Text style={styles.collagePlaceholderText}>Add a photo</Text>
                </Pressable>
              )
            }
          </View>
        ))}
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
          highlights.slice(0, 4).map((h, i) => (
            <View key={i} style={styles.quoteItem}>
              <Text style={styles.quoteStar}>{'\u2726'}</Text>
              <Text style={styles.quoteText}>"{h}"</Text>
            </View>
          ))
        ) : generating ? (
          <View style={styles.generateCard}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
            <Text style={[styles.generateSub, { marginTop: 12, textAlign: 'center' }]}>
              Building your story{'\u2026'}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyQuotes}>
            <Text style={styles.emptyQuotesText}>Add your explorers' words</Text>
            <Pressable style={styles.addQuoteBtn} onPress={onAddQuote}>
              <Text style={styles.addQuoteBtnText}>{'\uFF0B'} Add a kid quote</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Wordmark opacity={0.2} />
    </View>
  );
}

function Slide5Closing({ trip, closingPhoto }: { trip: any; closingPhoto?: string | null }) {
  return (
    <View style={styles.slide}>
      {closingPhoto
        ? <ExpoImage source={{ uri: closingPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
  const { tripId, fromComplete } = useLocalSearchParams<{ tripId: string; fromComplete?: string }>();
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
    } catch {
      setGenError(true);
    } finally {
      setGenerating(false);
    }
  }

  const { heroPhoto, collagePhotos, closingPhoto, highlights } = useMemo(() => {
    const photos = (moments as Moment[]).flatMap(m =>
      m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
    );
    return {
      heroPhoto: photos[0] ?? null,
      // Fall back to stop hero images when user hasn't taken photos yet
      ...((() => {
        // hero-img endpoint falls back to stop_library, so try for every stop
        const stopPhotos = (trip?.stops ?? [] as any[]).map((s: any) =>
          s.id ? `${API_BASE}/api/travel/stops/${s.id}/hero-img` : null
        ).filter(Boolean);
        const fill = (idx: number) => photos[idx] ?? stopPhotos[idx] ?? null;
        return { collagePhotos: [fill(0), fill(1), fill(2), fill(3)] as (string | null)[] };
      })()),
      closingPhoto: photos[photos.length - 1] ?? photos[0] ?? null,
      highlights: story?.highlights ?? [],
    };
  }, [moments, story, trip]);

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

  const slideContent = [
    <Slide1Cover key="1" trip={trip} heroPhoto={heroPhoto} />,
    <Slide2Map key="2" trip={trip} />,
    <Slide3Collage key="3" collagePhotos={collagePhotos} onAddPhoto={handleAddPhoto} />,
    <Slide4Quotes key="4" highlights={highlights} generating={generating} onAddQuote={handleAddQuote} />,
    <Slide5Closing key="5" trip={trip} closingPhoto={closingPhoto} />,
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
          <Pressable style={styles.instaBtn} onPress={handleShareInstagram}>
            <Text style={styles.instaBtnText}>{'\uD83D\uDCF7'}</Text>
          </Pressable>
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
  instaBtn: {
    width: 52, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  instaBtnText: { fontSize: 22 },
  shareRow: { flexDirection: 'row', gap: 8 },
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
  slide1Content: { position: 'absolute', bottom: 130, left: 0, right: 0, paddingHorizontal: 24 },
  eyebrow: { fontSize: 11, fontFamily: F.bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  slide1Title: { fontFamily: 'Georgia', fontSize: 34, fontWeight: '800', color: '#fff', lineHeight: 40, marginBottom: 8 },
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
  quoteText: { flex: 1, fontSize: 15, fontFamily: F.regular, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: 24 },

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
