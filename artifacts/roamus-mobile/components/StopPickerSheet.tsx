import React, { useRef, useEffect } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Trip, TripStop } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const STOP_BG: Record<string, string> = {
  museum: '#DBEAFE', park: '#DCFCE7', landmark: '#E0ECF8',
  food: '#FDF0E9', restaurant: '#FDF0E9', beach: '#CFFAFE',
  activity: '#FCE7F3', viewpoint: '#FEF9C3',
};
const STOP_ICON: Record<string, string> = {
  museum: '🏛', landmark: '📍', park: '🌿',
  restaurant: '🍽', food: '🍽', beach: '🏖',
  market: '🛍', viewpoint: '🌅', temple: '⛩',
  activity: '🎯', hotel: '🏨', cafe: '☕',
};
function getStopIcon(t?: string | null) { return STOP_ICON[t ?? ''] ?? '📍'; }
function getStopBg(t?: string | null)   { return STOP_BG[t ?? ''] ?? '#F5F2EE'; }

interface Props {
  trip: Trip | null;
  onDismiss: () => void;
  onSelect: (stopId: string | null, stopName: string, icon: string) => void;
}

export default function StopPickerSheet({ trip, onDismiss, onSelect }: Props) {
  const slideAnim = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, bounciness: 3, speed: 14,
    }).start();
  }, []);

  const rawStops: TripStop[] = trip?.stops ?? [];
  const sorted = [...rawStops].sort((a, b) => {
    if ((a.dayIndex ?? 0) !== (b.dayIndex ?? 0))
      return (a.dayIndex ?? 0) - (b.dayIndex ?? 0);
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });
  const currentStopId = sorted.find(s => !(s.visited || s.isVisited))?.id;

  const days: { day: number; stops: TripStop[] }[] = [];
  for (const stop of sorted) {
    const day = stop.dayIndex ?? 0;
    const last = days[days.length - 1];
    if (last && last.day === day) last.stops.push(stop);
    else days.push({ day, stops: [stop] });
  }

  return (
    <>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={[StyleSheet.absoluteFill, sh.dim]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[sh.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={sh.handle} />

        {/* Header */}
        <View style={sh.header}>
          <View style={{ flex: 1 }}>
            <Text style={sh.title}>Which stop is this for?</Text>
            <Text style={sh.subtitle}>Tag your photo to the right moment</Text>
          </View>
          <TouchableOpacity style={sh.closeBtn} onPress={onDismiss} hitSlop={8} activeOpacity={0.75}>
            <Text style={sh.closeBtnText}>{'✕'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stop list */}
        <ScrollView style={sh.list} showsVerticalScrollIndicator={false}>
          {days.map(({ day, stops: dayStops }) => (
            <View key={day}>
              <Text style={sh.dayLabel}>
                {day === 0 ? "TODAY'S STOPS" : `DAY ${day + 1}`}
              </Text>
              {dayStops.map((stop) => {
                const isCurrent = stop.id === currentStopId;
                const isVisited = !!(stop.visited || stop.isVisited);
                const ico = getStopIcon(stop.stopType);
                const bg  = getStopBg(stop.stopType);
                return (
                  <TouchableOpacity
                    key={stop.id}
                    style={[sh.stopRow, isCurrent && sh.stopRowCurrent]}
                    activeOpacity={0.7}
                    onPress={() => onSelect(stop.id, stop.name, ico)}
                  >
                    <View style={[sh.stopIconWrap, { backgroundColor: bg }]}>
                      <Text style={sh.stopIconText}>{ico}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        <Text style={[sh.stopName, isCurrent && sh.stopNameCurrent]} numberOfLines={1}>
                          {stop.name}
                        </Text>
                        {isVisited && (
                          <View style={sh.visitedBadge}>
                            <Text style={sh.visitedBadgeText}>{'✓'} Visited</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[sh.stopMeta, isCurrent && sh.stopMetaCurrent]}>
                        {stop.stopType
                          ? stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)
                          : 'Stop'}
                        {isCurrent
                          ? ' · You\'re here now'
                          : ` · Stop ${(stop.displayOrder ?? 0) + 1}`}
                      </Text>
                    </View>
                    <Text style={[sh.chevron, isCurrent && sh.chevronCurrent]}>{'›'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* General option */}
          <Text style={sh.dayLabel}>GENERAL</Text>
          <TouchableOpacity
            style={sh.stopRow}
            activeOpacity={0.7}
            onPress={() => onSelect(null, 'General trip photo', '📸')}
          >
            <View style={[sh.stopIconWrap, { backgroundColor: '#F5F2EE' }]}>
              <Text style={sh.stopIconText}>{'📸'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sh.stopName}>General trip photo</Text>
              <Text style={sh.stopMeta}>Not tied to a specific stop</Text>
            </View>
            <Text style={sh.chevron}>{'›'}</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>
    </>
  );
}

const sh = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 99 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    zIndex: 100, maxHeight: '88%',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#D1D5E0',
    borderRadius: 2, alignSelf: 'center', marginTop: 14, marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start',
    borderBottomWidth: 1, borderBottomColor: 'rgba(26,31,46,0.07)',
  },
  title:    { fontFamily: F.serif, fontSize: 22, color: '#1A1F2E' },
  subtitle: { fontFamily: F.medium, fontSize: 13, color: '#8A8FA8', marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, backgroundColor: 'rgba(26,31,46,0.07)',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 15, color: '#8A8FA8' },
  list:         { flex: 1 },
  dayLabel: {
    fontSize: 11, fontFamily: F.bold, color: '#8A8FA8',
    textTransform: 'uppercase', letterSpacing: 1.2,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  stopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: 'rgba(26,31,46,0.07)',
    backgroundColor: '#fff',
  },
  stopRowCurrent:  { backgroundColor: '#FDF0E9' },
  stopIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stopIconText:    { fontSize: 22 },
  stopName:        { fontFamily: F.bold, fontSize: 14, color: '#1A1F2E' },
  stopNameCurrent: { color: '#E8692A' },
  stopMeta:        { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8', marginTop: 2 },
  stopMetaCurrent: { color: '#E8692A' },
  chevron:         { fontSize: 20, color: '#D1D5E0' },
  chevronCurrent:  { color: '#E8692A' },
  visitedBadge: {
    backgroundColor: '#E8F7EF', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  visitedBadgeText: { fontSize: 10, fontFamily: F.bold, color: '#3DAA6E' },
});
