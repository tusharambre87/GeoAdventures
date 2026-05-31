/**
 * Story Slides Carousel — 5 slides, swipeable
 * Brief: memories-replit-brief.md — Screen 4
 */
import React, { useRef, useState, useMemo } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { memoriesAPI, travelAPI, Moment } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

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
          {trip?.destination ? `  ·  ${trip.destination}` : ''}
        </Text>
      </View>
      <Wordmark right opacity={0.4} />
    </View>
  );
}

function Slide2Map({ trip }: { trip: any }) {
  const stops = trip?.stops ?? [];
  return (
    <View style={styles.slide}>
      <LinearGradient colors={['#b8d4c8', '#a8c4b8']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: 140 }]}
      />
      <View style={styles.mapLabel}>
        <Text style={styles.eyebrow}>Your Journey</Text>
        <Text style={styles.mapTitle}>{stops.length} places explored</Text>
      </View>
      {/* Placeholder pins */}
      {stops.slice(0, 5).map((s: any, i: number) => {
        const top = 200 + i * 70 + (i % 2 === 0 ? 0 : 40);
        const left = 60 + (i % 2 === 0 ? 0 : 180);
        return (
          <View key={s.id} style={[styles.mapPin, { top, left }]}>
            <Text style={styles.mapPinText}>{i + 1}</Text>
          </View>
        );
      })}
      <Wordmark opacity={0.5} />
    </View>
  );
}

function Slide3Collage({ collagePhotos }: { collagePhotos: (string | null)[] }) {
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
              : null
            }
          </View>
        ))}
      </View>
      <Wordmark opacity={0.3} />
    </View>
  );
}

function Slide4Quotes({ highlights }: { highlights: string[] }) {
  return (
    <View style={styles.slide}>
      <LinearGradient colors={['#2d1b4e', '#1a1f2e']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.quotesContent}>
        <Text style={styles.eyebrow}>Through Your Explorer's Eyes</Text>
        <Text style={styles.quotesTitle}>What they'll remember most</Text>
        {(highlights.length > 0 ? highlights : ['The whole family, together', 'Adventures around every corner']).slice(0, 4).map((h, i) => (
          <View key={i} style={styles.quoteItem}>
            <Text style={styles.quoteStar}>✦</Text>
            <Text style={styles.quoteText}>"{h}"</Text>
          </View>
        ))}
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
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();
  const [slide, setSlide] = useState(0);

  const { data: trip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => travelAPI.getTrip(tripId),
    enabled: !!tripId,
  });
  const { data: moments = [] } = useQuery({
    queryKey: ['moments', tripId],
    queryFn: () => memoriesAPI.getMoments(tripId),
    enabled: !!tripId,
  });
  const { data: story } = useQuery({
    queryKey: ['story', tripId],
    queryFn: () => memoriesAPI.getStory(tripId),
    enabled: !!tripId,
    retry: false,
  });

  const { heroPhoto, collagePhotos, closingPhoto, highlights } = useMemo(() => {
    const photos = (moments as Moment[]).flatMap(m =>
      m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
    );
    return {
      heroPhoto: photos[0] ?? null,
      collagePhotos: [photos[0] ?? null, photos[1] ?? null, photos[2] ?? null, photos[3] ?? null],
      closingPhoto: photos[photos.length - 1] ?? photos[0] ?? null,
      highlights: story?.highlights ?? [],
    };
  }, [moments, story]);

  function nextSlide() {
    if (slide >= TOTAL_SLIDES - 1) { router.back(); return; }
    setSlide(s => Math.min(s + 1, TOTAL_SLIDES - 1));
  }
  function prevSlide() { setSlide(s => Math.max(s - 1, 0)); }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) nextSlide();
        if (g.dx > 50) prevSlide();
      },
    })
  ).current;

  async function handleShare() {
    try {
      await Share.share({
        url: `https://roamus.app/story/${tripId}`,
        message: `Our ${trip?.destination ?? ''} family adventure 🗺`,
      });
    } catch {}
  }

  const slideContent = [
    <Slide1Cover key="1" trip={trip} heroPhoto={heroPhoto} />,
    <Slide2Map key="2" trip={trip} />,
    <Slide3Collage key="3" collagePhotos={collagePhotos} />,
    <Slide4Quotes key="4" highlights={highlights} />,
    <Slide5Closing key="5" trip={trip} closingPhoto={closingPhoto} />,
  ];

  return (
    <View style={[styles.root, { backgroundColor: '#000' }]} {...panResponder.panHandlers}>
      {/* Slide content */}
      {slideContent[slide]}

      {/* Top bar — close + progress */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarRow}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>
          <Text style={styles.slideCounter}>{slide + 1}/{TOTAL_SLIDES}</Text>
        </View>
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressBar,
                i < slide && styles.progressDone,
                i === slide && styles.progressCurrent,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.shareMain} onPress={handleShare}>
          <Text style={styles.shareMainText}>↗ Post on Social Media</Text>
        </Pressable>
        <View style={styles.shareRow}>
          <Pressable style={styles.shareSmall} onPress={handleShare}>
            <Text style={styles.shareSmallText}>🔗 Share link</Text>
          </Pressable>
          <Pressable style={styles.shareSmall} onPress={nextSlide}>
            <Text style={styles.shareSmallText}>{slide < TOTAL_SLIDES - 1 ? 'Next →' : 'Done ✓'}</Text>
          </Pressable>
          <Pressable
            style={styles.shareSmall}
            onPress={() => {}} // save functionality placeholder
          >
            <Text style={styles.shareSmallText}>⬇ Save</Text>
          </Pressable>
        </View>
      </View>
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
  progressBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressDone: { backgroundColor: '#fff' },
  progressCurrent: { backgroundColor: '#E8692A' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
  },
  shareMain: {
    backgroundColor: '#E8692A',
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginBottom: 10,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  shareMainText: { fontSize: 15, fontFamily: F.bold, color: '#fff' },
  shareRow: { flexDirection: 'row', gap: 8 },
  shareSmall: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  shareSmallText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },

  // Wordmark
  wordmark: { position: 'absolute', bottom: 115, left: 24, fontSize: 11, fontFamily: F.bold, letterSpacing: 2, textTransform: 'uppercase' },

  // Slide 1
  slide1Content: { position: 'absolute', bottom: 130, left: 0, right: 0, paddingHorizontal: 24 },
  eyebrow: { fontSize: 11, fontFamily: F.bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  slide1Title: { fontFamily: 'Georgia', fontSize: 34, fontWeight: '800', color: '#fff', lineHeight: 40, marginBottom: 8 },
  slide1Meta: { fontSize: 14, fontFamily: F.regular, color: 'rgba(255,255,255,0.6)' },

  // Slide 2 Map
  mapLabel: { position: 'absolute', top: 70, left: 24, zIndex: 3 },
  mapTitle: { fontSize: 22, fontFamily: F.bold, color: '#fff', marginTop: 4 },
  mapPin: { position: 'absolute', width: 36, height: 36, backgroundColor: '#E8692A', borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', zIndex: 2 },
  mapPinText: { fontSize: 13, fontFamily: F.bold, color: '#fff' },

  // Slide 3 Collage
  collageHeader: { paddingTop: 100, paddingHorizontal: 24, paddingBottom: 20, position: 'relative', zIndex: 2 },
  collageTitle: { fontFamily: 'Georgia', fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32 },
  collageGrid: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', gap: 3, position: 'relative', zIndex: 2 },
  collageCell: { width: (SW - 40 - 3) / 2, aspectRatio: 1, overflow: 'hidden' },

  // Slide 4 Quotes
  quotesContent: { position: 'absolute', inset: 0, paddingHorizontal: 24, paddingTop: 100, paddingBottom: 180, justifyContent: 'center', gap: 16 },
  quotesTitle: { fontFamily: 'Georgia', fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32, marginBottom: 8 },
  quoteItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  quoteStar: { color: '#F5A623', fontSize: 14, marginTop: 2 },
  quoteText: { flex: 1, fontSize: 15, fontFamily: F.regular, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: 24 },

  // Slide 5 Closing
  slide5Content: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 32, paddingBottom: 180, alignItems: 'center', textAlign: 'center' },
  slide5Title: { fontFamily: 'Georgia', fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 38, marginBottom: 8, textAlign: 'center' },
  slide5Sub: { fontSize: 14, fontFamily: F.regular, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
});
