/**
 * Trip Essentials — full-page "Before you go" checklist.
 * Navigated to from the home screen's upcoming-trip card.
 * Reuses the same AsyncStorage key as ChecklistSheet so state is shared.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F, G } from '@/lib/tokens';
import { apiFetch } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChecklistItem = {
  id: string;
  label: string;
  subtitle?: string;
  custom?: boolean;
  checked: boolean;
};

type StopShape = {
  id: string;
  name: string;
  stopType?: string | null;
  metadata?: { ticketSignal?: boolean } | null;
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const FIXED_SEEDS: Omit<ChecklistItem, 'checked'>[] = [
  { id: 'passports', label: 'Pack passports & travel docs',  subtitle: 'IDs, insurance cards, printed confirmations' },
  { id: 'maps',      label: 'Download offline maps',          subtitle: 'Google Maps or Apple Maps for the destination' },
  { id: 'weather',   label: 'Check the weather forecast',    subtitle: 'Pack layers or rain gear if needed' },
  { id: 'devices',   label: 'Charge devices & power banks',  subtitle: 'Phones, tablets, cameras' },
  { id: 'snacks',    label: 'Pack snacks for the road',      subtitle: 'Keeps energy up between stops' },
];

const TICKET_TYPES = new Set(['museum','zoo','aquarium','palace','castle','theater','theatre','observatory']);

function stopNeedsTicket(stop: StopShape): boolean {
  if (stop.metadata?.ticketSignal === true)  return true;
  if (stop.metadata?.ticketSignal === false) return false;
  if (!stop.stopType) return false;
  const t = stop.stopType.toLowerCase();
  return Array.from(TICKET_TYPES).some(k => t.includes(k));
}

function buildInitialItems(stops: StopShape[]): ChecklistItem[] {
  const fixed = FIXED_SEEDS.map(s => ({ ...s, checked: false }));
  const contextual = stops.filter(stopNeedsTicket).map(stop => ({
    id: `ticket_${stop.id}`,
    label: `Book tickets for ${stop.name}`,
    subtitle: 'Advance booking recommended',
    checked: false,
  }));
  return [...fixed, ...contextual];
}

function mergeWithSaved(fresh: ChecklistItem[], saved: ChecklistItem[]): ChecklistItem[] {
  const savedMap = new Map(saved.map(i => [i.id, i]));
  const merged = fresh.map(item => ({ ...item, checked: savedMap.get(item.id)?.checked ?? false }));
  const custom = saved.filter(i => i.custom && !merged.find(m => m.id === i.id));
  return [...merged, ...custom];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TripEssentialsScreen() {
  const insets = useSafeAreaInsets();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [tripName, setTripName] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const storageKey = tripId ? `roamus_checklist_${tripId}` : null;

  // Check animation refs
  const checkAnimRefs = useRef<Map<string, Animated.Value>>(new Map());
  function getCheckAnim(id: string): Animated.Value {
    if (!checkAnimRefs.current.has(id)) {
      checkAnimRefs.current.set(id, new Animated.Value(0));
    }
    return checkAnimRefs.current.get(id)!;
  }

  // Scroll to end when adding custom item
  useEffect(() => {
    if (!addingCustom) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [addingCustom]);

  // Load trip name + stops to build ticket items
  useEffect(() => {
    if (!tripId) return;
    (async () => {
      try {
        const data = await apiFetch<any>(`/api/travel/trips/${tripId}`);
        if (data?.trip?.name) setTripName(data.trip.name);
        else if (data?.name) setTripName(data.name);
        const stops: StopShape[] = data?.stops ?? data?.trip?.stops ?? [];
        const fresh = buildInitialItems(stops);
        const raw = await AsyncStorage.getItem(storageKey!);
        let final = fresh;
        if (raw) {
          try { final = mergeWithSaved(fresh, JSON.parse(raw)); } catch {}
        }
        final.forEach(item => getCheckAnim(item.id).setValue(item.checked ? 1 : 0));
        setItems(final);
        await AsyncStorage.setItem(storageKey!, JSON.stringify(final));
      } catch {
        const fresh = buildInitialItems([]);
        setItems(fresh);
      }
      setLoaded(true);
    })();
  }, [tripId]);

  async function toggleItem(id: string) {
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(updated);
    const anim = getCheckAnim(id);
    const item = updated.find(i => i.id === id);
    Animated.spring(anim, {
      toValue: item?.checked ? 1 : 0,
      useNativeDriver: false,
      tension: 180,
      friction: 12,
    }).start();
    if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
  }

  async function addCustomItem() {
    const label = customDraft.trim();
    if (!label) { setAddingCustom(false); setCustomDraft(''); return; }
    const id = `custom_${Date.now()}`;
    const newItem: ChecklistItem = { id, label, custom: true, checked: false };
    getCheckAnim(id).setValue(0);
    const updated = [...items, newItem];
    setItems(updated);
    setCustomDraft('');
    setAddingCustom(false);
    if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
  }

  async function deleteCustom(id: string) {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
  }

  const checkedCount = items.filter(i => i.checked).length;
  const total = items.length;

  return (
    <View style={[s.root, { backgroundColor: G.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={G.deep} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Trip Essentials</Text>
          {tripName ? <Text style={s.headerSub} numberOfLines={1}>{tripName}</Text> : null}
        </View>
      </View>

      {/* ── Progress bar ── */}
      {loaded && total > 0 && (
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.round((checkedCount / total) * 100)}%` as any }]} />
          </View>
          <Text style={s.progressLabel}>{checkedCount} of {total} done</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Section title ── */}
        <Text style={s.sectionTitle}>Before you go</Text>

        {!loaded ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyTxt}>Loading…</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {items.map((item, index) => {
              const anim = getCheckAnim(item.id);
              const isLast = index === items.length - 1 && !addingCustom;
              return (
                <View key={item.id}>
                  <TouchableOpacity
                    style={[s.row, isLast && s.rowLast]}
                    activeOpacity={0.75}
                    onPress={() => toggleItem(item.id)}
                  >
                    {/* Checkbox */}
                    <Animated.View style={[
                      s.checkbox,
                      {
                        backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['#fff', G.orange] }),
                        borderColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(26,31,46,0.25)', G.orange] }),
                      }
                    ]}>
                      <Animated.Text style={[s.checkmark, { opacity: anim }]}>{'\u2713'}</Animated.Text>
                    </Animated.View>

                    {/* Label */}
                    <View style={{ flex: 1 }}>
                      <Animated.Text style={[s.itemLabel, {
                        color: anim.interpolate({ inputRange: [0, 1], outputRange: [G.deep, G.muted] }),
                      }]} numberOfLines={2}>
                        {item.label}
                      </Animated.Text>
                      {item.subtitle ? (
                        <Text style={s.itemSub} numberOfLines={1}>{item.subtitle}</Text>
                      ) : null}
                    </View>

                    {/* Delete for custom */}
                    {item.custom && (
                      <Pressable
                        style={s.deleteBtn}
                        onPress={() => deleteCustom(item.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={16} color={G.muted} />
                      </Pressable>
                    )}
                  </TouchableOpacity>
                  {!isLast && <View style={s.divider} />}
                </View>
              );
            })}

            {/* Add custom item */}
            {addingCustom ? (
              <View style={s.addRow}>
                <View style={s.checkbox} />
                <TextInput
                  style={s.addInput}
                  placeholder="Add item…"
                  placeholderTextColor={G.muted}
                  value={customDraft}
                  onChangeText={setCustomDraft}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={addCustomItem}
                  onBlur={addCustomItem}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={s.addCta}
                activeOpacity={0.8}
                onPress={() => { setAddingCustom(true); setCustomDraft(''); }}
              >
                <View style={s.addCtaCircle}>
                  <Text style={s.addCtaPlus}>+</Text>
                </View>
                <Text style={s.addCtaLabel}>Add your own item</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: G.bg,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontFamily: F.bold,
    fontSize: 18,
    color: G.deep,
  },
  headerSub: {
    fontFamily: F.regular,
    fontSize: 13,
    color: G.muted,
    marginTop: 1,
  },
  progressWrap: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: G.bg,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(26,31,46,0.10)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: G.orange,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: F.medium,
    fontSize: 12,
    color: G.muted,
    minWidth: 60,
    textAlign: 'right',
  },
  sectionTitle: {
    fontFamily: F.bold,
    fontSize: 13,
    color: G.muted,
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingBottom: 10,
    textTransform: 'uppercase',
  },
  listCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(26,31,46,0.06)',
    marginLeft: 62,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(26,31,46,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    fontSize: 13,
    color: '#fff',
    fontFamily: F.bold,
  },
  itemLabel: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: G.deep,
    marginBottom: 2,
  },
  itemSub: {
    fontFamily: F.regular,
    fontSize: 12,
    color: G.muted,
    lineHeight: 16,
  },
  deleteBtn: {
    padding: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addInput: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 14,
    color: G.deep,
    paddingVertical: Platform.OS === 'ios' ? 0 : 4,
  },
  addCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,31,46,0.06)',
  },
  addCtaCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: G.orange,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCtaPlus: {
    fontSize: 16,
    color: G.orange,
    lineHeight: 18,
  },
  addCtaLabel: {
    fontFamily: F.semibold,
    fontSize: 14,
    color: G.orange,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTxt: {
    fontFamily: F.regular,
    fontSize: 14,
    color: G.muted,
  },
});
