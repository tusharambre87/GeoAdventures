/**
 * Completed Trip Recap
 * Brief: memories-replit-brief.md — Screen 3
 */
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { memoriesAPI, travelAPI, Moment } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  border:   'rgba(26,31,46,0.06)',
} as const;

const STOP_EMOJI: Record<string, string> = {
  museum: '\uD83C\uDFDB', landmark: '\uD83D\uDCCD', park: '\uD83C\uDF3F', restaurant: '\uD83C\uDF7D',
  beach: '\uD83C\uDFD6', market: '\uD83D\uDECD', viewpoint: '\uD83C\uDF05', temple: '\u26E9',
  activity: '\uD83C\uDFAF', hotel: '\uD83C\uDFE8', cafe: '\u2615',
};
function stopEmoji(t?: string | null) { return STOP_EMOJI[t ?? ''] ?? '\uD83D\uDCCD'; }

function formatDate(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString('default', { month: 'short', year: 'numeric' });
}

export default function RecapScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);

  const { data: trip, isLoading: tripLoading } = useQuery({
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

  const { heroPhoto, momentsByStop, kidQuotes, visitedStops, photoCount } = useMemo(() => {
    const allPhotos = moments.flatMap((m: Moment) =>
      m.photoUrls?.length ? m.photoUrls : m.photoUrl ? [m.photoUrl] : []
    );
    const heroPhoto = allPhotos[0] ?? null;
    const photoCount = allPhotos.length;

    const momentsByStop: Record<string, { name: string; count: number }> = {};
    for (const m of moments) {
      const key = m.stopId ?? 'unassigned';
      const stop = trip?.stops?.find(s => s.id === m.stopId);
      const name = stop?.name ?? 'Untagged';
      if (!momentsByStop[key]) momentsByStop[key] = { name, count: 0 };
      momentsByStop[key].count++;
    }

    const kidQuotes: { text: string; attr: string }[] = [];
    const highlights = story?.highlights ?? [];
    if (highlights.length > 0) {
      highlights.slice(0, 3).forEach(h => {
        if (typeof h === 'string' && h.trim()) {
          kidQuotes.push({ text: h, attr: trip?.destination ?? '' });
        }
      });
    }
    if (kidQuotes.length === 0) {
      moments
        .filter((m: Moment) => m.kidPromptResponse)
        .slice(0, 3)
        .forEach((m: Moment) => {
          const stop = trip?.stops?.find(s => s.id === m.stopId);
          kidQuotes.push({ text: m.kidPromptResponse!, attr: stop?.name ?? trip?.destination ?? '' });
        });
    }

    const visitedStopIds = new Set(moments.map((m: Moment) => m.stopId).filter(Boolean));
    const visitedStops = (trip?.stops ?? []).filter(s => visitedStopIds.has(s.id));

    return { heroPhoto, momentsByStop, kidQuotes, visitedStops, photoCount };
  }, [moments, trip, story]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await memoriesAPI.regenerateStory(tripId);
      await queryClient.invalidateQueries({ queryKey: ['story', tripId] });
    } catch {
      Alert.alert('Error', 'Could not regenerate story. Please try again.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        url: `https://roamus.app/story/${tripId}`,
        message: `Our ${trip?.destination ?? ''} family adventure \uD83D\uDDFA`,
      });
    } catch {}
  }

  if (tripLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ActivityIndicator color={C.orange} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const tripName = trip?.name ?? 'Trip';
  const stopTotal = trip?.stops?.length ?? 0;

  return (
    <View style={[styles.root]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={styles.hero}>
          {heroPhoto ? (
            <ExpoImage source={{ uri: heroPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#1a3a5f', '#0d1f2d']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(26,31,46,0.95)', 'rgba(26,31,46,0.3)', 'transparent']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Nav */}
          <View style={[styles.heroNav, { top: insets.top + 8 }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>← Memories</Text>
            </Pressable>
            <Pressable style={styles.shareIconBtn} onPress={handleShare}>
              <Text style={{ color: '#fff', fontSize: 16 }}>↗</Text>
            </Pressable>
          </View>

          {/* Hero content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTripName}>{tripName}</Text>
            <Text style={styles.heroMeta}>
              {formatDate(trip?.startDate)}{stopTotal > 0 ? `  ·  ${stopTotal} stops` : ''}
              {trip?.destination ? `  ·  ${trip.destination}` : ''}
            </Text>
            {kidQuotes[0] && (
              <Text style={styles.heroQuote}>"{kidQuotes[0].text}"</Text>
            )}
          </View>
        </View>

        {/* 2×2 Actions */}
        <View style={styles.actionsGrid}>
          {[
            { icon: '\uD83D\uDCD6', title: 'View your story', sub: 'Full trip recap', onPress: () => router.push(`/memories/${tripId}/story` as any) },
            { icon: '\uD83D\uDCF7', title: 'View memories', sub: 'Photos & moments', onPress: () => {} },
            { icon: '\uD83D\uDDFA', title: 'See journey', sub: 'Map & places', onPress: () => router.push(`/memories/${tripId}/story` as any) },
            { icon: '\uD83D\uDCCB', title: 'View trip plan', sub: 'Day by day', onPress: () => router.push(`/trip/${tripId}` as any) },
          ].map(a => (
            <Pressable key={a.title} style={styles.actionCard} onPress={a.onPress}>
              <Text style={{ fontSize: 24 }}>{a.icon}</Text>
              <Text style={styles.actionTitle}>{a.title}</Text>
              <Text style={styles.actionSub}>{a.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Story strip */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.stripLabel}>Your trip story</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            {/* Cover card */}
            <Pressable style={[styles.storyCard, { backgroundColor: '#1a2a3a' }]} onPress={() => router.push(`/memories/${tripId}/story` as any)}>
              {heroPhoto && <ExpoImage source={{ uri: heroPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill} />
              <View style={styles.storyCardLabel}>
                <Text style={styles.storyCardTitle}>Cover</Text>
                <Text style={styles.storyCardSub} numberOfLines={2}>{tripName}</Text>
              </View>
            </Pressable>
            {/* Stats card */}
            <Pressable style={[styles.storyCard, { backgroundColor: '#1a3a5f', alignItems: 'center', justifyContent: 'center' }]} onPress={() => router.push(`/memories/${tripId}/story` as any)}>
              <Text style={styles.storyCardNum}>{stopTotal}</Text>
              <Text style={styles.storyCardNumLabel}>PLACES EXPLORED</Text>
            </Pressable>
            {/* Collage card */}
            <Pressable style={[styles.storyCard, { backgroundColor: '#2a1a0a' }]} onPress={() => router.push(`/memories/${tripId}/story` as any)}>
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill} />
              <View style={styles.storyCardLabel}>
                <Text style={styles.storyCardTitle}>Collage</Text>
                <Text style={styles.storyCardSub}>{photoCount} photos</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>

        {/* Kid quotes */}
        {kidQuotes.length > 0 && (
          <View style={styles.quotesSection}>
            <Text style={styles.sectionTitle}>What they'll remember</Text>
            <Text style={styles.sectionSub}>Through your explorer's eyes</Text>
            <View style={{ gap: 8 }}>
              {kidQuotes.map((q, i) => (
                <View key={i} style={styles.quoteCard}>
                  <Text style={styles.quoteText}>"{q.text}"</Text>
                  {q.attr ? <Text style={styles.quoteAttr}>{q.attr}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stop log */}
        {visitedStops.length > 0 && (
          <View style={styles.stopLog}>
            <Text style={styles.sectionTitle}>Your adventure</Text>
            {visitedStops.map(s => {
              const count = momentsByStop[s.id]?.count ?? 0;
              const memLines = ['Took it all in', 'Explored every corner', 'Discovered something new', 'Took a break and ran around'];
              const line = memLines[Math.abs(s.id.charCodeAt(0) ?? 0) % memLines.length];
              return (
                <View key={s.id} style={styles.stopLogRow}>
                  <View style={styles.stopLogIcon}>
                    <Text style={{ fontSize: 16 }}>{stopEmoji(s.stopType)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopLogName}>{s.name}</Text>
                    <Text style={styles.stopLogMem}>
                      → {line}{count > 0 ? ` · ${count} photo${count !== 1 ? 's' : ''}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* CTAs */}
        <View style={styles.ctas}>
          <Pressable style={styles.ctaPrimary} onPress={() => router.push(`/memories/${tripId}/story` as any)}>
            <Text style={styles.ctaPrimaryText}>{'\uD83D\uDCD6'} View Your Story</Text>
          </Pressable>
          <Pressable style={styles.ctaOutline} onPress={handleRegenerate} disabled={regenerating}>
            {regenerating
              ? <ActivityIndicator color={C.orange} />
              : <Text style={styles.ctaOutlineText}>↺ Regenerate story</Text>
            }
          </Pressable>
        </View>

        {/* Where to next */}
        <View style={styles.whereNext}>
          <Text style={styles.whereNextTitle}>Where to next? {'\uD83D\uDDFA'}</Text>
          <Pressable style={styles.whereNextPrimary} onPress={() => router.push('/onboarding/splash' as any)}>
            <Text style={styles.whereNextPrimaryText}>{'\uD83C\uDF0D'} Try another city</Text>
          </Pressable>
          <Pressable style={styles.whereNextGhost} onPress={() => router.back()}>
            <Text style={styles.whereNextGhostText}>← Back to Memories</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F2EE' },

  hero: { height: 300, position: 'relative', justifyContent: 'flex-end' },
  heroNav: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  backBtnText: { fontSize: 14, fontFamily: F.bold, color: '#fff' },
  shareIconBtn: { width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  heroContent: { padding: 20 },
  heroTripName: { fontFamily: 'Georgia', fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 32, marginBottom: 4 },
  heroMeta: { fontSize: 13, fontFamily: F.medium, color: 'rgba(255,255,255,0.65)' },
  heroQuote: { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginTop: 6, lineHeight: 20 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, margin: 20 },
  actionCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 6, width: '47%' },
  actionTitle: { fontSize: 14, fontFamily: F.bold, color: '#1A1F2E' },
  actionSub: { fontSize: 12, fontFamily: F.regular, color: '#8A8FA8' },

  stripLabel: { fontSize: 18, fontFamily: F.bold, color: '#1A1F2E', paddingHorizontal: 20, paddingBottom: 12 },
  storyCard: { width: 150, height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  storyCardLabel: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  storyCardTitle: { fontSize: 12, fontFamily: F.bold, color: '#fff' },
  storyCardSub: { fontSize: 11, fontFamily: F.regular, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  storyCardNum: { fontFamily: 'Georgia', fontSize: 42, fontWeight: '800', color: '#fff', lineHeight: 48 },
  storyCardNumLabel: { fontSize: 11, fontFamily: F.bold, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, textTransform: 'uppercase' },

  quotesSection: { margin: 20, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontFamily: F.bold, color: '#1A1F2E', marginBottom: 4 },
  sectionSub: { fontSize: 13, fontFamily: F.regular, color: '#8A8FA8', marginBottom: 14 },
  quoteCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#E8692A', marginBottom: 8 },
  quoteText: { fontSize: 14, fontFamily: F.regular, color: '#1A1F2E', fontStyle: 'italic', lineHeight: 22 },
  quoteAttr: { fontSize: 11, fontFamily: F.bold, color: '#8A8FA8', marginTop: 6 },

  stopLog: { marginHorizontal: 20, marginTop: 20 },
  stopLogRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  stopLogIcon: { width: 36, height: 36, backgroundColor: '#FDF0E9', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stopLogName: { fontSize: 14, fontFamily: F.bold, color: '#1A1F2E' },
  stopLogMem: { fontSize: 12, fontFamily: F.regular, color: '#8A8FA8', marginTop: 2 },

  ctas: { margin: 24, marginBottom: 0, gap: 10 },
  ctaPrimary: { backgroundColor: '#1A1F2E', borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center' },
  ctaPrimaryText: { fontSize: 16, fontFamily: F.bold, color: '#fff' },
  ctaOutline: { borderWidth: 2, borderColor: '#E8692A', borderRadius: 14, padding: 14, alignItems: 'center' },
  ctaOutlineText: { fontSize: 14, fontFamily: F.bold, color: '#E8692A' },

  whereNext: { backgroundColor: '#FDF0E9', borderRadius: 18, padding: 20, margin: 20, gap: 8 },
  whereNextTitle: { fontSize: 17, fontFamily: F.bold, color: '#1A1F2E', marginBottom: 4 },
  whereNextPrimary: { backgroundColor: '#E8692A', borderRadius: 12, padding: 14, alignItems: 'center' },
  whereNextPrimaryText: { fontSize: 14, fontFamily: F.bold, color: '#fff' },
  whereNextGhost: { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center' },
  whereNextGhostText: { fontSize: 14, fontFamily: F.bold, color: '#1A1F2E' },
});
