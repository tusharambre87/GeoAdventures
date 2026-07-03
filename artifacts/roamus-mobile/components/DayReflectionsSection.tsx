import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { reflectionsAPI, DayReflection } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  orange:  '#E8692A',
  deep:    '#1A1F2E',
  muted:   '#8A8FA8',
};

interface Props {
  tripId: string;
  /** When provided, shows only reflections for this day (most recent wins on duplicate). */
  dayIndex?: number;
}

export default function DayReflectionsSection({ tripId, dayIndex }: Props) {
  const { data: allReflections } = useQuery({
    queryKey: ['day-reflections', tripId, dayIndex ?? 'all'],
    queryFn: () => reflectionsAPI.list(tripId),
    enabled: !!tripId,
    staleTime: 0,
  });

  const reflections = React.useMemo(() => {
    if (!allReflections) return [];
    if (dayIndex == null) return allReflections;
    return allReflections
      .filter((r: DayReflection) => r.dayIndex === dayIndex)
      .sort((a: DayReflection, b: DayReflection) =>
        new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
      )
      .slice(-1);
  }, [allReflections, dayIndex]);

  if (!reflections || reflections.length === 0) return null;

  return (
    <View style={{ marginTop: 8 }}>
      {dayIndex == null && (
        <Text style={s.sectionLabel}>Day Reflections</Text>
      )}
      {reflections.map((r: DayReflection, idx: number) => (
        <View key={r.id ?? idx} style={dr.card}>
          {dayIndex == null && r.dayIndex != null && (
            <View style={dr.dayChip}>
              <Text style={dr.dayChipText}>Day {r.dayIndex + 1}</Text>
            </View>
          )}
          {!!r.surprise && (
            <View style={dr.row}>
              <Text style={dr.rowLabel}>SURPRISED US</Text>
              <Text style={dr.rowText}>{r.surprise}</Text>
            </View>
          )}
          {!!r.learnMore && (
            <View style={dr.row}>
              <Text style={dr.rowLabel}>WANT TO KNOW MORE</Text>
              <Text style={dr.rowText}>{r.learnMore}</Text>
            </View>
          )}
          {!!r.doDifferently && (
            <View style={dr.row}>
              <Text style={dr.rowLabel}>NEXT TIME</Text>
              <Text style={dr.rowText}>{r.doDifferently}</Text>
            </View>
          )}
          {(r.kidQuotes ?? []).filter((q: { text: string; kid_name: string }) => q.text).map((q: { text: string; kid_name: string }, qi: number) => (
            <View key={qi} style={pj.quoteRow}>
              <View style={pj.quoteBar} />
              <View style={pj.quoteBody}>
                <Text style={pj.quoteText}>“{q.text}”</Text>
                {!!q.kid_name && <Text style={pj.quoteName}>— {q.kid_name}</Text>}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const dr = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#1A1F2E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  dayChip: {
    alignSelf: 'flex-start', backgroundColor: '#FDF0E9', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
  },
  dayChipText: { fontSize: 11, fontWeight: '700', color: '#E8692A', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { marginBottom: 10 },
  rowLabel: { fontSize: 10, fontWeight: '700', color: '#8A8FA8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  rowText: { fontSize: 15, color: '#1A1F2E', lineHeight: 22 },
});

const pj = StyleSheet.create({
  quoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  quoteBar: { width: 3, borderRadius: 2, backgroundColor: C.orange, minHeight: 36, marginTop: 2 },
  quoteBody: { flex: 1 },
  quoteText: { fontSize: 14, fontFamily: F.regular, color: C.deep, fontStyle: 'italic', lineHeight: 21 },
  quoteName: { fontSize: 12, fontFamily: F.semibold, color: C.orange, marginTop: 3 },
});

const s = StyleSheet.create({
  sectionLabel: {
    fontSize: 11, fontFamily: F.bold, color: C.muted,
    letterSpacing: 1, textTransform: 'uppercase',
    paddingTop: 12, paddingBottom: 8,
  },
});
