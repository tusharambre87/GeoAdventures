import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { API_BASE, useAuth } from '@/lib/authContext';
import { F, G } from '@/lib/tokens';
import { Analytics } from '@/services/analytics/analytics';

const { height: SCREEN_H } = Dimensions.get('window');
const MAX_HEIGHT = SCREEN_H * 0.88;

export type UpgradeContext = 'run_day' | 'locked_day' | 'at_stop' | 'story';

export interface UpgradeSheetProps {
  visible: boolean;
  onClose: () => void;
  context: UpgradeContext;
  tripId?: string;
}

const HEADLINES: Record<UpgradeContext, string> = {
  run_day:    'Day 1 is on us. Keep going?',
  locked_day: 'Unlock your full itinerary.',
  at_stop:    'The full stop experience awaits.',
  story:      'Your family story is waiting.',
};

type Pricing = { symbol: string; geopass: string; trippack: string; cadence: string };

const SHEET_PLANS = [
  {
    id: 'roamus',
    name: 'RoamUs Pass',
    tagline: 'Full experience \u00b7 Whole family',
    badge: undefined, // 'MOST POPULAR' — re-enable with real data post-beta
    features: [
      'Step-by-step guide at every stop',
      'Kids missions + engagement layer',
      'Audio stories about each stop',
      'Works offline — no signal needed',
      'Auto-generated trip memory at the end',
      'Push notifications + smart reminders',
    ],
    cta: 'Get RoamUs Pass →',
  },
  {
    id: 'trippack',
    name: 'This Trip Only',
    tagline: 'One-time \u00b7 Your trip',
    features: [
      'Full guided experience for this trip',
      'All stops unlocked',
      'Kids missions included',
      'Trip memory auto-generated',
      'No subscription — one payment',
    ],
    cta: 'Unlock for {price} →',
  },
];

const BUNDLE_PLAN = {
  id: 'bundle',
  badge: undefined as string | undefined,
  name: 'Bundle of Trips',
  tagline: 'One-time \u00b7 Any 3 trips',
  features: [
    'Full guided experience on 3 trips',
    'All stops unlocked on each trip',
    'Kids missions included',
    'Trip memory auto-generated',
    'No subscription — one payment',
  ],
  cta: 'Unlock 3 Trips for $22.99 →',
};

export default function UpgradeSheet({ visible, onClose, context }: UpgradeSheetProps) {
  const insets = useSafeAreaInsets();
  const { token, refreshUser } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState('roamus');
  const [annual, setAnnual] = useState(false);
  const [pricing, setPricing] = useState<Pricing | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  const pan  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Analytics.track('paywall_shown', { trigger: context });
      Animated.spring(anim, {
        toValue: 1,
        damping: 22,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
        pan.setValue(0);
      });
    }
  }, [visible]);

  useEffect(() => {
    fetch(`${API_BASE}/api/pricing`)
      .then(r => r.ok ? r.json() : null)
      .then((json: Pricing | null) => { if (json?.geopass) setPricing(json); })
      .catch(() => null);
  }, []);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) pan.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80 || g.vy > 1.2) {
        onClose();
      } else {
        Animated.spring(pan, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
      }
    },
  })).current;

  if (!mounted) return null;

  const sym            = pricing?.symbol ?? '$';
  const passMonthly    = pricing ? `${sym}${pricing.geopass}` : '$4.99';
  const passAnnual     = '$39.99';
  const tripPrice      = pricing ? `${sym}${pricing.trippack}` : '$9.99';
  const bundlePrice    = '$22.99';
  const annualSavePct  = pricing
    ? Math.round((1 - 39.99 / (parseFloat(pricing.geopass) * 12)) * 100)
    : 33;

  const visiblePlans = [SHEET_PLANS[0], annual ? BUNDLE_PLAN : SHEET_PLANS[1]];

  function planPrice(id: string): string {
    if (id === 'roamus') return annual ? `${passAnnual}/yr` : `${passMonthly}/mo`;
    if (id === 'bundle') return bundlePrice;
    return tripPrice;
  }
  function planPeriod(id: string): string {
    if (id === 'roamus') return annual ? 'billed yearly \u00b7 whole family' : 'whole family';
    if (id === 'bundle') return 'one-time \u00b7 3 trips';
    return 'one-time';
  }

  const allPlans = [...SHEET_PLANS, BUNDLE_PLAN];
  const plan     = allPlans.find(p => p.id === selected) ?? SHEET_PLANS[0];
  const ctaLabel = plan.cta.replace('{price}', selected === 'trippack' ? tripPrice : '');

  async function handleCta() {
    Alert.alert(
      'Thank you!',
      'Thank you for subscribing to the plan, we hope you will enjoy your trip with RoamUs by your side.',
      [
        {
          text: 'OK',
          onPress: async () => {
            if (token) {
              try {
                await fetch(`${API_BASE}/api/auth/user/subscription`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ plan: selected, annual }),
                });
                await refreshUser();
              } catch {}
            }
            onClose();
          },
        },
      ],
    );
  }

  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const translateY = Animated.add(
    anim.interpolate({ inputRange: [0, 1], outputRange: [MAX_HEIGHT, 0] }),
    pan,
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dim overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlayOpacity }]}
        pointerEvents="auto"
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[s.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + 8 }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={s.handle} />

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={s.headline}>{HEADLINES[context]}</Text>
          <Text style={s.sub}>Your family just had a real day. Unlock the rest of the trip to keep it going.</Text>

          {/* Monthly / Annual toggle */}
          <View style={s.toggleRow}>
            <Pressable onPress={() => { setAnnual(false); if (selected === 'bundle') setSelected('trippack'); }} style={[s.toggleBtn, !annual && s.toggleBtnActive]}>
              <Text style={[s.toggleBtnText, !annual && s.toggleBtnTextActive]}>Monthly</Text>
            </Pressable>
            <Pressable onPress={() => { setAnnual(true); if (selected === 'trippack') setSelected('bundle'); }} style={[s.toggleBtn, annual && s.toggleBtnActive]}>
              <Text style={[s.toggleBtnText, annual && s.toggleBtnTextActive]}>Annual</Text>
              <View style={s.saveBadge}>
                <Text style={s.saveBadgeText}>Save {annualSavePct}%</Text>
              </View>
            </Pressable>
          </View>


          {/* Plan cards */}
          <View style={s.plans}>
            {visiblePlans.map(p => {
              const isSelected = selected === p.id;
              return (
                <View key={p.id}>
                  {p.badge && (
                    <View style={s.badgeAbove}>
                      <Text style={s.badgeAboveText}>{p.badge}</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => setSelected(p.id)}
                    style={[s.planCard, isSelected && s.planCardSelected]}
                  >
                    <View style={s.planRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.planName, isSelected && { color: G.orange }]}>{p.name}</Text>
                        <Text style={s.planTagline}>{p.tagline}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={[s.planPrice, isSelected && { color: G.orange }]}>{planPrice(p.id)}</Text>
                        <Text style={s.planPeriod}>{planPeriod(p.id)}</Text>
                      </View>
                      <View style={[s.radio, isSelected && s.radioSelected]}>
                        {isSelected && <View style={s.radioDot} />}
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Feature box */}
          <View style={s.featureBox}>
            <Text style={s.featureHeader}>{plan.name.toUpperCase()} INCLUDES</Text>
            {plan.features.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <Text style={s.featureCheck}>{'\u2713'}</Text>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <Text style={s.disclaimer}>
            Cancel anytime {'\u00b7'} Secure payment {'\u00b7'} Prices in USD
          </Text>
        </ScrollView>

        {/* CTA */}
        <View style={[s.cta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={({ pressed }) => [s.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={handleCta}
          >
            <Text style={s.ctaBtnText}>{ctaLabel}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.dismissLink}>
            <Text style={s.dismissText}>Maybe later — go to my trip</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: MAX_HEIGHT,
    backgroundColor: G.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(26,31,46,0.15)',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },

  headline: {
    fontFamily: F.bold, fontSize: 22, fontWeight: '800',
    letterSpacing: -0.5, color: G.deep, lineHeight: 30, marginBottom: 6,
  },
  sub: { fontFamily: F.regular, fontSize: 14, color: G.muted, lineHeight: 20, marginBottom: 18 },

  toggleRow: {
    flexDirection: 'row', backgroundColor: 'rgba(26,31,46,0.07)',
    borderRadius: 14, padding: 3, marginBottom: 16, alignSelf: 'flex-start', gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 11,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: G.card,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  toggleBtnText: { fontFamily: F.semibold, fontSize: 13, fontWeight: '600', color: G.muted },
  toggleBtnTextActive: { color: G.deep },
  saveBadge: { backgroundColor: G.orange, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeText: { fontFamily: F.bold, fontSize: 10, fontWeight: '700', color: '#fff' },

  plans: { gap: 0, marginBottom: 14 },
  badgeAbove: {
    backgroundColor: G.orange, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start', marginLeft: 12, marginBottom: -1, zIndex: 1,
  },
  badgeAboveText: { fontFamily: F.bold, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  planCard: {
    backgroundColor: G.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(26,31,46,0.1)', padding: 16, marginBottom: 10,
  },
  planCardSelected: { borderColor: G.orange, borderWidth: 2 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planName: { fontFamily: F.bold, fontSize: 16, fontWeight: '700', color: G.deep, marginBottom: 2 },
  planTagline: { fontFamily: F.regular, fontSize: 12, color: G.muted },
  planPrice: { fontFamily: F.bold, fontSize: 18, fontWeight: '800', color: G.deep },
  planPeriod: { fontFamily: F.regular, fontSize: 11, color: G.muted, textAlign: 'right' },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: 'rgba(26,31,46,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: G.orange, backgroundColor: G.orange },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  featureBox: {
    backgroundColor: G.sageLt, borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(122,158,142,0.25)', padding: 18, marginBottom: 14,
  },
  featureHeader: {
    fontFamily: F.bold, fontSize: 11, fontWeight: '700',
    color: G.sage, letterSpacing: 0.8, marginBottom: 12,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  featureCheck: { color: G.sage, fontSize: 14, fontWeight: '700', marginTop: 1 },
  featureText: { fontFamily: F.regular, fontSize: 13, color: G.deep, flex: 1, lineHeight: 19 },

  disclaimer: { fontFamily: F.regular, fontSize: 12, color: G.muted, textAlign: 'center', marginBottom: 4 },

  cta: {
    paddingHorizontal: 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(26,31,46,0.06)',
  },
  ctaBtn: {
    height: 54, borderRadius: 27, backgroundColor: G.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnText: { fontFamily: F.bold, fontSize: 16, fontWeight: '700', color: '#fff' },
  dismissLink: { paddingVertical: 14, alignItems: 'center' },
  dismissText: { fontFamily: F.regular, fontSize: 14, color: G.muted },
});
