import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking,
  ActivityIndicator, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/lib/apiClient';
import { G, F } from '@/lib/tokens';

// ── Types ────────────────────────────────────────────────────────────────────
type FoodItem  = { name: string; distance: string; cuisine?: string; priceRange?: string; description?: string };
type BreakItem = { name: string; distance: string; description?: string };
type KidItem   = { name: string; distance: string; agesNote?: string; description?: string };
type NearbyData = { food: FoodItem[]; breaks: BreakItem[]; kids: KidItem[] } | null;
type NearbySheet = 'food' | 'breaks' | 'kids' | null;

type StopType = 'food' | 'break' | 'kid_attraction';

type CheckResult = {
  canInsert: boolean;
  position?: 'middle' | 'end_of_day';
  warning?: 'tight_timing' | 'time_sensitive' | null;
  affectedStop?: { name: string; isTimeSensitive: boolean };
  reason?: 'day_full';
  options?: string[];
  lastStop?: { name: string; stopId: string };
  tomorrowExists?: boolean;
};

type CardPhase =
  | 'idle' | 'checking' | 'confirming' | 'added'
  | 'warn_tight' | 'warn_end_of_day' | 'warn_day_full_soft' | 'warn_day_full_hard'
  | 'warn_kid_attraction';

type CardState = { phase: CardPhase; check?: CheckResult };

const DEFAULT_DURATIONS: Record<StopType, number> = { food: 45, break: 20, kid_attraction: 90 };

// ── Auth-aware fetch ─────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export default function ExpectScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    stopName?: string; address?: string; enrichment?: string; meta?: string;
    pRef?: string; pProf?: string; duration?: string; minAge?: string;
    openingHours?: string; lat?: string; lon?: string; bookingUrl?: string;
    tripId?: string; stopId?: string;
  }>();

  const stopName     = params.stopName ? decodeURIComponent(params.stopName) : 'This Stop';
  const address      = params.address  ? decodeURIComponent(params.address)  : '';
  const openingHours = params.openingHours ? decodeURIComponent(params.openingHours) : '';
  const enrichment   = params.enrichment ? JSON.parse(decodeURIComponent(params.enrichment)) : {};
  const meta         = params.meta       ? JSON.parse(decodeURIComponent(params.meta))       : {};
  const pRef         = params.pRef       ? JSON.parse(decodeURIComponent(params.pRef))       : {};
  const pProf        = params.pProf      ? JSON.parse(decodeURIComponent(params.pProf))      : {};
  const duration     = params.duration   ? Number(params.duration) : 60;
  const minAge       = params.minAge && params.minAge !== '' ? Number(params.minAge) : null;
  const lat          = params.lat  && params.lat  !== '' ? parseFloat(params.lat)  : null;
  const lon          = params.lon  && params.lon  !== '' ? parseFloat(params.lon)  : null;
  const bookingUrl   = params.bookingUrl ? decodeURIComponent(params.bookingUrl) : '';
  const tripId       = params.tripId ?? '';
  const stopId       = params.stopId  ?? '';

  const [nearbySheet,   setNearbySheet]   = useState<NearbySheet>(null);
  const [nearbyData,    setNearbyData]    = useState<NearbyData>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError,   setNearbyError]   = useState(false);
  const [cardStates,    setCardStates]    = useState<Record<string, CardState>>({});

  // ── Fetch nearby data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!stopId) return;
    setNearbyLoading(true);
    setNearbyError(false);
    apiFetch<NearbyData>(`/api/travel/stops/${stopId}/nearby`)
      .then(data => { setNearbyData(data); setNearbyLoading(false); })
      .catch(() => { setNearbyError(true); setNearbyLoading(false); });
  }, [stopId]);

  // ── Maps helpers ───────────────────────────────────────────────────────────
  const openDirections = () => {
    if (lat && lon) {
      const url = Platform.OS === 'ios'
        ? 'maps://app?daddr=' + lat + ',' + lon + '&dirflg=d'
        : 'google.navigation:q=' + lat + ',' + lon;
      Linking.openURL(url).catch(() => {});
    } else {
      Linking.openURL(
        'https://www.google.com/maps/dir/?api=1&destination=' +
        encodeURIComponent(address || stopName) + '&travelmode=walking'
      ).catch(() => {});
    }
  };

  const openMapsQuery = (q: string) => {
    const nearLabel = address || stopName;
    const query = nearLabel ? q + ' near ' + nearLabel : q;
    const url = lat && lon
      ? 'https://maps.apple.com/?q=' + encodeURIComponent(q) + '&sll=' + lat + ',' + lon + '&z=15'
      : 'https://maps.apple.com/?q=' + encodeURIComponent(query);
    Linking.openURL(url).catch(() => {});
  };

  const openMaps = (placeName: string) => {
    const q = encodeURIComponent(placeName + (address ? ' near ' + address : ''));
    Linking.openURL('maps://maps.apple.com/?q=' + q).catch(() =>
      Linking.openURL('https://maps.apple.com/?q=' + q).catch(() => {}));
  };

  // ── Add-to-plan core logic ─────────────────────────────────────────────────
  const setCard = (key: string, state: CardState) =>
    setCardStates(prev => ({ ...prev, [key]: state }));

  const doInsert = async (
    key: string,
    placeName: string,
    placeAddress: string,
    type: StopType,
    opts: { removeStopId?: string; moveTomorrow?: boolean } = {}
  ) => {
    setCard(key, { phase: 'confirming' });
    try {
      await apiFetch(`/api/travel/trips/${tripId}/insert-stop`, {
        method: 'POST',
        body: JSON.stringify({
          insertAfterStopId: stopId,
          place: {
            name: placeName,
            address: placeAddress,
            type,
            estimatedDurationMinutes: DEFAULT_DURATIONS[type],
          },
          confirmed: true,
          removeStopId: opts.removeStopId,
          moveTomorrow: opts.moveTomorrow ?? false,
        }),
      });
      setCard(key, { phase: 'added' });
    } catch {
      setCard(key, { phase: 'idle' });
    }
  };

  const handleAddToPlan = async (
    key: string,
    placeName: string,
    placeAddress: string,
    type: StopType
  ) => {
    if (!tripId || !stopId) {
      // Fallback: no IDs, open maps
      openMaps(placeName);
      return;
    }
    setCard(key, { phase: 'checking' });
    try {
      const check = await apiFetch<CheckResult>(`/api/travel/trips/${tripId}/insert-stop`, {
        method: 'POST',
        body: JSON.stringify({
          insertAfterStopId: stopId,
          place: { name: placeName, address: placeAddress, type, estimatedDurationMinutes: DEFAULT_DURATIONS[type] },
          confirmed: false,
        }),
      });

      // Clean insert — kid attractions get a pre-warning; food/break auto-confirm
      if (check.canInsert && !check.warning) {
        if (type === 'kid_attraction') {
          setCard(key, { phase: 'warn_kid_attraction', check });
          return;
        }
        await doInsert(key, placeName, placeAddress, type);
        return;
      }
      // Tight timing warning
      if (check.canInsert && check.warning === 'tight_timing') {
        setCard(key, { phase: 'warn_tight', check });
        return;
      }
      // End of day confirmation
      if (check.canInsert && check.position === 'end_of_day') {
        setCard(key, { phase: 'warn_end_of_day', check });
        return;
      }
      // Day full — soft (food/break) vs hard (kid)
      if (!check.canInsert && check.reason === 'day_full') {
        setCard(key, {
          phase: type === 'kid_attraction' ? 'warn_day_full_hard' : 'warn_day_full_soft',
          check,
        });
        return;
      }
      // Fallback: just insert
      await doInsert(key, placeName, placeAddress, type);
    } catch {
      setCard(key, { phase: 'idle' });
    }
  };

  // ── Per-card add-button renderer ───────────────────────────────────────────
  const renderAddBtn = (
    key: string,
    placeName: string,
    placeAddress: string,
    type: StopType,
    label: string
  ) => {
    const cs = cardStates[key] ?? { phase: 'idle' };

    if (cs.phase === 'added') {
      return (
        <View style={styles.addedRow}>
          <Text style={styles.addedText}>{"✓"} Added to your day</Text>
        </View>
      );
    }

    if (cs.phase === 'checking' || cs.phase === 'confirming') {
      return (
        <View style={styles.addBtn}>
          <ActivityIndicator size="small" color="white" />
        </View>
      );
    }

    if (cs.phase === 'warn_tight') {
      const isStrong = cs.check?.affectedStop?.isTimeSensitive;
      const nextName = cs.check?.affectedStop?.name ?? 'the next stop';
      return (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            {isStrong
              ? `${nextName} has a set start time — adding this may cause you to miss it.`
              : `This fits, but ${nextName} may run tight.`}
          </Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => doInsert(key, placeName, placeAddress, type)}
            >
              <Text style={styles.confirmBtnText}>Add anyway</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCard(key, { phase: 'idle' })}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (cs.phase === 'warn_end_of_day') {
      return (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>Add {placeName} to the end of today?</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => doInsert(key, placeName, placeAddress, type)}
            >
              <Text style={styles.confirmBtnText}>Yes, add it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCard(key, { phase: 'idle' })}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (cs.phase === 'warn_day_full_soft') {
      return (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>Your day is full, but we{"'"}ll squeeze this in.</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => doInsert(key, placeName, placeAddress, type)}
            >
              <Text style={styles.confirmBtnText}>Add anyway</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCard(key, { phase: 'idle' })}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (cs.phase === 'warn_day_full_hard') {
      const ch = cs.check!;
      return (
        <View style={styles.dayFullPanel}>
          <Text style={styles.dayFullTitle}>Your day is already full</Text>
          <Text style={styles.dayFullSub}>Adding this makes it a long day.</Text>

          <TouchableOpacity
            style={styles.dayFullOption}
            onPress={() => doInsert(key, placeName, placeAddress, type, { removeStopId: ch.lastStop?.stopId })}
          >
            <Text style={styles.dayFullOptionText}>Remove last stop + add this</Text>
            {ch.lastStop && (
              <Text style={styles.dayFullOptionSub}>Removes "{ch.lastStop.name}"</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dayFullOption}
            onPress={() => doInsert(key, placeName, placeAddress, type)}
          >
            <Text style={styles.dayFullOptionText}>Add anyway — longer day</Text>
          </TouchableOpacity>

          {ch.tomorrowExists && (
            <TouchableOpacity
              style={styles.dayFullOption}
              onPress={() => doInsert(key, placeName, placeAddress, type, { moveTomorrow: true })}
            >
              <Text style={styles.dayFullOptionText}>Move to tomorrow</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setCard(key, { phase: 'idle' })}>
            <Text style={styles.dayFullCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (cs.phase === 'warn_kid_attraction') {
      const estMin = DEFAULT_DURATIONS[type] ?? 90;
      return (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            {"⏱"} This adds ~{estMin} min to your day. Your plan will shift around it.
          </Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => doInsert(key, placeName, placeAddress, type)}
            >
              <Text style={styles.confirmBtnText}>Add to plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => openMaps(placeName)}
            >
              <Text style={styles.cancelBtnText}>Just open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => handleAddToPlan(key, placeName, placeAddress, type)}
      >
        <Text style={styles.addBtnText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  // ── Sheet content ──────────────────────────────────────────────────────────
  const renderNearbyContent = (category: 'food' | 'breaks' | 'kids') => {
    if (nearbyLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={G.orange} />
          <Text style={styles.loadingText}>Finding real places nearby…</Text>
          <Text style={styles.loadingSubText}>Asking AI for local recommendations</Text>
        </View>
      );
    }
    if (nearbyError || !nearbyData) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyMsg}>
            {nearbyError ? 'Could not load nearby places' : 'No data available'}
          </Text>
          <TouchableOpacity
            style={styles.mapsCta}
            onPress={() => openMapsQuery(
              category === 'food' ? 'restaurant' :
              category === 'breaks' ? 'park cafe' : 'kid activities'
            )}
          >
            <Text style={styles.mapsCtaText}>Search on Apple Maps →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (category === 'food') {
      const items = nearbyData.food;
      if (items.length === 0) return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyMsg}>No food spots found nearby</Text>
          <TouchableOpacity style={styles.mapsCta} onPress={() => openMapsQuery('restaurant')}>
            <Text style={styles.mapsCtaText}>Find restaurants near {stopName} →</Text>
          </TouchableOpacity>
        </View>
      );
      return (
        <>
          {items.map((place, i) => {
            const key = `food-${i}`;
            return (
              <View key={key} style={styles.placeCard}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.placeName, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                    {place.name}
                  </Text>
                  <TouchableOpacity onPress={() => openMaps(place.name)}>
                    <Text style={styles.mapsLink}>Maps →</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.placeMeta}>
                  {place.distance}{place.cuisine ? ' · ' + place.cuisine : ''}{place.priceRange ? ' · ' + place.priceRange : ''}
                </Text>
                {place.description ? (
                  <Text style={styles.placeDesc} numberOfLines={2}>{place.description}</Text>
                ) : null}
                {renderAddBtn(key, place.name, address, 'food', '+ Add to plan')}
              </View>
            );
          })}
        </>
      );
    }

    if (category === 'breaks') {
      const items = nearbyData.breaks;
      if (items.length === 0) return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyMsg}>No break spots found nearby</Text>
          <TouchableOpacity style={styles.mapsCta} onPress={() => openMapsQuery('park cafe')}>
            <Text style={styles.mapsCtaText}>Find parks & cafes near {stopName} →</Text>
          </TouchableOpacity>
        </View>
      );
      return (
        <>
          {items.map((place, i) => {
            const key = `breaks-${i}`;
            return (
              <View key={key} style={styles.placeCard}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.placeName, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                    {place.name}
                  </Text>
                  <TouchableOpacity onPress={() => openMaps(place.name)}>
                    <Text style={styles.mapsLink}>Maps →</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.placeMeta, { color: '#3DAA6E' }]}>{place.distance}</Text>
                {place.description ? (
                  <Text style={styles.placeDesc} numberOfLines={2}>{place.description}</Text>
                ) : null}
                {renderAddBtn(key, place.name, address, 'break', '+ Add as break')}
              </View>
            );
          })}
        </>
      );
    }

    // kids
    const items = nearbyData.kids;
    if (items.length === 0) return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyMsg}>No kid activities found nearby</Text>
        <TouchableOpacity style={styles.mapsCta} onPress={() => openMapsQuery('kid activities')}>
          <Text style={styles.mapsCtaText}>Find kid activities near {stopName} →</Text>
        </TouchableOpacity>
      </View>
    );
    return (
      <>
        {items.map((place, i) => {
          const key = `kids-${i}`;
          return (
            <View key={key} style={styles.placeCard}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.placeName, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  {place.name}
                </Text>
                <TouchableOpacity onPress={() => openMaps(place.name)}>
                  <Text style={styles.mapsLink}>Maps →</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.placeMeta}>
                {place.distance}{place.agesNote ? ' · ' + place.agesNote : ''}
              </Text>
              {place.description ? (
                <Text style={styles.placeDesc} numberOfLines={2}>{place.description}</Text>
              ) : null}
              {renderAddBtn(key, place.name, address, 'kid_attraction', '+ Add to plan')}
            </View>
          );
        })}
      </>
    );
  };

  // ── Derived content ───────────────────────────────────────────────────────
  const showTickets = pRef.bookingRequired === true || meta.ticketSignal === true;
  const ticketHref  = bookingUrl ||
    'https://www.google.com/search?q=' + encodeURIComponent(stopName + ' tickets');

  const experienceText =
    enrichment.whyItWorks ?? pProf.whyItWorks ?? enrichment.whyNow ??
    (stopName + ' is a great stop for the whole family — explore at your own pace and look out for the highlights as you go.');

  const rawTips = enrichment.practicalTips ?? pProf.practicalTips;
  const practicalTips: string[] = rawTips
    ? (Array.isArray(rawTips)
        ? (rawTips as string[]).filter((s: string) => s.length > 2)
        : String(rawTips)
            .split(/\.\s+/)
            .map((s: string) => s.replace(/\.$/, '').trim())
            .filter((s: string) => s.length > 8))
    : [];

  const hours = openingHours || pRef.openingHours || '';
  type TimingRow = [string, string, string?];
  const timingRows: TimingRow[] = [
    ['Recommended time', '~' + duration + ' min'],
    ['Best for', 'Ages ' + (minAge ?? 3) + '–12'],
    ['Crowd level now', 'Good timing', '#3DAA6E'],
    ...(enrichment.bestTimeOfDay ?? pProf.bestTimeOfDay
        ? [['Best time to visit', enrichment.bestTimeOfDay ?? pProf.bestTimeOfDay] as TimingRow]
        : []),
    ...(hours ? [['Hours today', hours] as TimingRow] : []),
  ];

  type AccessRow = { key: string; val: string; color?: string };
  const parking    = enrichment.parkingNotes ?? pProf.parkingNotes;
  const stroller   = enrichment.strollerFriendly ?? pProf.strollerFriendly;
  const restrooms  = enrichment.bathroomNotes ?? meta.restroomConfidence;
  const priceRange = pRef.priceRange ?? enrichment.priceRange;
  const admissionVal = priceRange ? priceRange
    : meta.ticketSignal === true  ? 'Ticket required'
    : meta.ticketSignal === false ? 'Free entry'
    : 'Free';
  const admissionColor =
    (meta.ticketSignal === false || (!priceRange && meta.ticketSignal !== true))
      ? G.green : G.deep;
  const accessRows: AccessRow[] = [
    parking ? { key: 'Parking', val: parking, color: '#D97706' } : null,
    stroller != null
      ? { key: 'Stroller friendly', val: stroller ? 'Yes' : 'No', color: stroller ? G.green : G.muted }
      : { key: 'Stroller friendly', val: 'Info not available', color: G.muted },
    typeof restrooms === 'string' && restrooms
      ? { key: 'Restrooms', val: restrooms }
      : { key: 'Restrooms', val: 'Info not available', color: G.muted },
    { key: 'Admission', val: admissionVal, color: admissionColor },
    address ? { key: 'Address', val: address } : null,
  ].filter((x): x is AccessRow => x !== null);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{"←"} At Stop</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.stopLabel} numberOfLines={1}>{stopName}</Text>
        <Text style={styles.title}>{"What you'll experience"}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openDirections}>
            <Text style={styles.actionBtnText}>{"↗  Directions"}</Text>
          </TouchableOpacity>
          {showTickets && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.ticketBtn]}
              onPress={() => Linking.openURL(ticketHref).catch(() => {})}
            >
              <Text style={[styles.actionBtnText, { color: '#D97706' }]}>{"🏟  Book tickets"}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{"WHAT YOU'LL EXPERIENCE"}</Text>
          <Text style={styles.highlight}>{experienceText}</Text>
        </View>

        {practicalTips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BEST WAY TO DO THIS STOP</Text>
            <View style={styles.tipsWrap}>
              {practicalTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>
                    {tip}{Array.isArray(rawTips) ? '' : '.'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {timingRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{"TIMING & LOGISTICS"}</Text>
            {timingRows.map(([k, v, c], i) => (
              <View key={k} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={[
                  styles.infoVal,
                  { color: c ?? (k === 'Best time to visit' ? G.green : G.deep) },
                ]}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        {accessRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{"PARKING & ACCESS"}</Text>
            {accessRows.map(({ key, val, color }, i) => (
              <View key={key} style={[styles.infoRow, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.infoKey}>{key}</Text>
                <Text style={[styles.infoVal, { color: color ?? G.deep }]}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NEARBY ESSENTIALS</Text>

          <TouchableOpacity style={styles.essRow} onPress={() => setNearbySheet('food')}>
            <Text style={styles.essIcon}>{"🍔"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essTitle}>Food nearby</Text>
              <Text style={styles.essSub}>
                {nearbyLoading ? 'Loading…' :
                 nearbyData?.food?.length ? nearbyData.food.length + ' options found' :
                 'Tap to find food nearby'}
              </Text>
            </View>
            <Text style={styles.essArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.essRow} onPress={() => setNearbySheet('breaks')}>
            <Text style={styles.essIcon}>{"🌿"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essTitle}>Quick break spots</Text>
              <Text style={styles.essSub}>
                {nearbyLoading ? 'Loading…' :
                 nearbyData?.breaks?.length ? nearbyData.breaks.length + ' spots found' :
                 'Parks and cafes nearby'}
              </Text>
            </View>
            <Text style={styles.essArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.essRow, { borderBottomWidth: 0 }]}
            onPress={() => setNearbySheet('kids')}
          >
            <Text style={styles.essIcon}>{"🧒"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.essTitle}>Kid-friendly extras</Text>
              <Text style={styles.essSub}>
                {nearbyLoading ? 'Loading…' :
                 nearbyData?.kids?.length ? nearbyData.kids.length + ' activities found' :
                 'More things for kids nearby'}
              </Text>
            </View>
            <Text style={styles.essArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── SHEET: Food Nearby ─────────────────────────────────────────────── */}
      {nearbySheet === 'food' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setNearbySheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={{ fontSize: 20 }}>{"🍔"}</Text>
              <Text style={styles.sheetTitle}>Food nearby</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderNearbyContent('food')}
              {nearbyData && nearbyData.food.length > 0 && (
                <TouchableOpacity
                  style={{ paddingVertical: 16, alignItems: 'center' }}
                  onPress={() => openMapsQuery('restaurant')}
                >
                  <Text style={styles.seeMore}>See more on Apple Maps →</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── SHEET: Quick Break Spots ──────────────────────────────────────── */}
      {nearbySheet === 'breaks' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setNearbySheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={{ fontSize: 20 }}>{"🌿"}</Text>
              <Text style={styles.sheetTitle}>Quick break spots</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderNearbyContent('breaks')}
              {nearbyData && nearbyData.breaks.length > 0 && (
                <TouchableOpacity
                  style={{ paddingVertical: 16, alignItems: 'center' }}
                  onPress={() => openMapsQuery('park cafe')}
                >
                  <Text style={styles.seeMore}>See more on Apple Maps →</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── SHEET: Kid-Friendly Extras ────────────────────────────────────── */}
      {nearbySheet === 'kids' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setNearbySheet(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={{ fontSize: 20 }}>{"🧒"}</Text>
              <Text style={styles.sheetTitle}>Kid-friendly extras</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderNearbyContent('kids')}
              {nearbyData && nearbyData.kids.length > 0 && (
                <TouchableOpacity
                  style={{ paddingVertical: 16, alignItems: 'center' }}
                  onPress={() => openMapsQuery('kid activities')}
                >
                  <Text style={styles.seeMore}>See more on Apple Maps →</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: G.bg },
  header:          { backgroundColor: '#1A1F2E', paddingHorizontal: 20, paddingBottom: 24 },
  nav:             { flexDirection: 'row', marginBottom: 16 },
  backBtn:         { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  backText:        { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  stopLabel:       { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  title:           { fontFamily: F.bold, fontSize: 24, color: '#fff', lineHeight: 30 },
  body:            { flex: 1, padding: 16 },
  actionRow:       { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn:       {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  actionBtnText:   { fontFamily: F.bold, fontSize: 13, color: G.deep },
  ticketBtn:       { borderWidth: 1.5, borderColor: 'rgba(245,166,35,0.4)' },
  section:         {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  sectionLabel:    { fontFamily: F.bold, fontSize: 10, color: G.orange, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  highlight:       { fontFamily: F.semibold, fontSize: 14, color: G.deep, lineHeight: 22 },
  tipsWrap:        { gap: 6 },
  tipRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 2 },
  tipDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: G.orange, marginTop: 7, flexShrink: 0 },
  tipText:         { fontFamily: F.medium, fontSize: 13, color: G.muted, lineHeight: 20, flex: 1 },
  infoRow:         {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  infoKey:         { fontFamily: F.medium, fontSize: 13, color: G.muted, flex: 1 },
  infoVal:         { fontFamily: F.bold, fontSize: 13, color: G.deep, textAlign: 'right', flex: 1 },
  essRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  essIcon:         { fontSize: 20, width: 36 },
  essTitle:        { fontFamily: F.bold, fontSize: 14, color: G.deep, marginBottom: 2 },
  essSub:          { fontFamily: F.medium, fontSize: 12, color: G.muted },
  essArrow:        { fontSize: 20, color: '#C4C9D4' },
  overlay:         {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 300,
  },
  sheet:           {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, maxHeight: '82%',
  },
  handle:          { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sheetTitle:      { fontFamily: F.bold, fontSize: 18, color: G.deep },
  loadingWrap:     { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText:     { fontFamily: F.semibold, fontSize: 15, color: G.deep, marginTop: 4 },
  loadingSubText:  { fontFamily: F.medium, fontSize: 13, color: G.muted },
  emptyWrap:       { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyMsg:        { fontFamily: F.medium, fontSize: 14, color: G.muted, textAlign: 'center' },
  mapsCta:         {
    backgroundColor: G.orange, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  mapsCtaText:     { fontFamily: F.bold, fontSize: 14, color: 'white' },
  placeCard:       { backgroundColor: '#F5F2EE', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTopRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  placeName:       { fontFamily: F.semibold, fontSize: 15, color: G.deep },
  placeMeta:       { fontFamily: F.medium, fontSize: 13, color: G.muted, marginBottom: 6 },
  placeDesc:       { fontFamily: F.medium, fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 6 },
  mapsLink:        { fontFamily: F.bold, fontSize: 13, color: G.orange },
  addBtn:          { backgroundColor: G.orange, borderRadius: 24, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  addBtnText:      { fontFamily: F.bold, fontSize: 14, color: 'white' },
  addedRow:        { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, paddingVertical: 6 },
  addedText:       { fontFamily: F.bold, fontSize: 14, color: '#3DAA6E' },
  warnBox:         { backgroundColor: '#FFF8EC', borderRadius: 10, padding: 12, marginTop: 8 },
  warnText:        { fontFamily: F.medium, fontSize: 13, color: '#92400E', lineHeight: 19, marginBottom: 10 },
  confirmRow:      { flexDirection: 'row', gap: 8 },
  confirmBtn:      { flex: 1, backgroundColor: G.orange, borderRadius: 20, height: 38, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText:  { fontFamily: F.bold, fontSize: 13, color: 'white' },
  cancelBtn:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20, height: 38, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText:   { fontFamily: F.bold, fontSize: 13, color: G.muted },
  dayFullPanel:    { backgroundColor: '#FFF8EC', borderRadius: 12, padding: 14, marginTop: 8, gap: 8 },
  dayFullTitle:    { fontFamily: F.bold, fontSize: 14, color: G.deep },
  dayFullSub:      { fontFamily: F.medium, fontSize: 13, color: G.muted, marginBottom: 4 },
  dayFullOption:   { backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  dayFullOptionText: { fontFamily: F.semibold, fontSize: 13, color: G.deep },
  dayFullOptionSub:  { fontFamily: F.medium, fontSize: 12, color: G.muted, marginTop: 2 },
  dayFullCancel:   { fontFamily: F.medium, fontSize: 13, color: G.muted, textAlign: 'center', paddingVertical: 6 },
  seeMore:         { fontFamily: F.medium, fontSize: 13, color: G.muted },
});
