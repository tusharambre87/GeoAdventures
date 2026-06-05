import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { F } from '@/lib/tokens';

const { height: SCREEN_H } = Dimensions.get('window');

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  green:    '#3DAA6E',
  greenLt:  '#E8F7EF',
  border:   'rgba(26,31,46,0.09)',
  borderMed:'rgba(26,31,46,0.16)',
  red:      '#E53E3E',
  redLt:    '#FFF5F5',
} as const;

const TICKET_TYPES = new Set([
  'museum', 'zoo', 'aquarium', 'palace', 'castle',
  'theater', 'theatre', 'observatory',
]);

export type ChecklistStop = {
  id: string;
  name: string;
  stopType?: string | null;
  metadata?: { ticketSignal?: boolean } | null;
};

function stopNeedsTicket(stop: ChecklistStop): boolean {
  if (stop.metadata?.ticketSignal === true)  return true;
  if (stop.metadata?.ticketSignal === false) return false;
  if (!stop.stopType) return false;
  const t = stop.stopType.toLowerCase();
  return Array.from(TICKET_TYPES).some(k => t.includes(k));
}

export type ChecklistItem = {
  id:       string;
  label:    string;
  subtitle?: string;
  custom?:  boolean;
  checked:  boolean;
};

const FIXED_SEEDS: Omit<ChecklistItem, 'checked'>[] = [
  { id: 'passports',    label: 'Pack passports & travel docs',     subtitle: 'IDs, insurance cards, printed confirmations' },
  { id: 'maps',        label: 'Download offline maps',              subtitle: 'Google Maps or Apple Maps for the destination' },
  { id: 'weather',     label: 'Check the weather forecast',        subtitle: 'Pack layers or rain gear if needed' },
  { id: 'devices',     label: 'Charge devices & power banks',      subtitle: 'Phones, tablets, cameras' },
  { id: 'snacks',      label: 'Pack snacks for the road',          subtitle: 'Keeps energy up between stops' },
];

function buildInitialItems(stops: ChecklistStop[]): ChecklistItem[] {
  const fixed: ChecklistItem[] = FIXED_SEEDS.map(s => ({ ...s, checked: false }));
  const contextual: ChecklistItem[] = stops
    .filter(stopNeedsTicket)
    .map(stop => ({
      id:       `ticket_${stop.id}`,
      label:    `Book tickets for ${stop.name}`,
      subtitle: 'Advance booking recommended',
      checked:  false,
    }));
  return [...fixed, ...contextual];
}

function mergeWithSaved(
  fresh: ChecklistItem[],
  saved: ChecklistItem[],
): ChecklistItem[] {
  const savedMap = new Map(saved.map(i => [i.id, i]));
  const merged = fresh.map(item => ({
    ...item,
    checked: savedMap.get(item.id)?.checked ?? false,
  }));
  const customItems = saved.filter(i => i.custom);
  const customIds   = new Set(merged.map(i => i.id));
  const newCustom   = customItems.filter(i => !customIds.has(i.id));
  return [...merged, ...newCustom];
}

export interface ChecklistSheetProps {
  visible:  boolean;
  onClose:  () => void;
  tripId:   string;
  stops:    ChecklistStop[];
}

function DeleteAction({ onDelete }: { onDelete: () => void }) {
  return (
    <TouchableOpacity
      style={s.deleteAction}
      onPress={onDelete}
      activeOpacity={0.8}
    >
      <Text style={s.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );
}

export default function ChecklistSheet({
  visible,
  onClose,
  tripId,
  stops,
}: ChecklistSheetProps) {
  const anim      = useRef(new Animated.Value(0)).current;
  const progressA = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted]       = useState(false);
  const [dismissable, setDismissable] = useState(false);
  const closeRef  = useRef(onClose);
  closeRef.current = onClose;

  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const [items,       setItems]       = useState<ChecklistItem[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customDraft,  setCustomDraft]  = useState('');
  const [loaded,       setLoaded]       = useState(false);
  const checkAnimRefs = useRef<Map<string, Animated.Value>>(new Map());

  const storageKey = `roamus_checklist_${tripId}`;


  function getCheckAnim(id: string): Animated.Value {
    if (!checkAnimRefs.current.has(id)) {
      checkAnimRefs.current.set(id, new Animated.Value(0));
    }
    return checkAnimRefs.current.get(id)!;
  }

  async function load() {
    try {
      const raw   = await AsyncStorage.getItem(storageKey);
      const fresh = buildInitialItems(stops);
      if (raw) {
        const saved  = JSON.parse(raw) as ChecklistItem[];
        const merged = mergeWithSaved(fresh, saved);
        setItems(merged);
        merged.forEach(item => {
          getCheckAnim(item.id).setValue(item.checked ? 1 : 0);
        });
        const pct = merged.length > 0
          ? merged.filter(i => i.checked).length / merged.length
          : 0;
        progressA.setValue(pct);
        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
      } else {
        setItems(fresh);
        fresh.forEach(item => getCheckAnim(item.id).setValue(0));
        progressA.setValue(0);
        await AsyncStorage.setItem(storageKey, JSON.stringify(fresh));
      }
    } catch {
      const fresh = buildInitialItems(stops);
      setItems(fresh);
    }
    setLoaded(true);
  }

  async function persist(next: ChecklistItem[]) {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  function updateProgress(next: ChecklistItem[]) {
    const pct = next.length > 0
      ? next.filter(i => i.checked).length / next.length
      : 0;
    Animated.timing(progressA, { toValue: pct, duration: 300, useNativeDriver: false }).start();
  }

  function toggleItem(id: string) {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item;
        const newChecked = !item.checked;
        Animated.timing(getCheckAnim(id), {
          toValue: newChecked ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        return { ...item, checked: newChecked };
      });
      persist(next);
      updateProgress(next);
      return next;
    });
  }

  function deleteItem(id: string) {
    swipeableRefs.current.get(id)?.close();
    setItems(prev => {
      const next = prev.filter(item => item.id !== id);
      checkAnimRefs.current.delete(id);
      swipeableRefs.current.delete(id);
      persist(next);
      updateProgress(next);
      return next;
    });
  }

  function submitCustom() {
    const label = customDraft.trim();
    if (!label) return;
    Keyboard.dismiss();
    const newItem: ChecklistItem = {
      id:       `custom_${Date.now()}`,
      label,
      subtitle: 'Added by you',
      custom:   true,
      checked:  false,
    };
    getCheckAnim(newItem.id).setValue(0);
    setItems(prev => {
      const next = [...prev, newItem];
      persist(next);
      updateProgress(next);
      return next;
    });
    setCustomDraft('');
    setAddingCustom(false);
  }

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setDismissable(false);
      const t = setTimeout(() => setDismissable(true), 350);
      return () => clearTimeout(t);
    }
    setDismissable(false);
  }, [visible]);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      damping:   22,
      stiffness: 180,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
        setAddingCustom(false);
        setCustomDraft('');
      }
    });
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderRelease:       (_, g) => { if (g.dy > 60) closeRef.current(); },
    })
  ).current;


  const checkedCount = items.filter(i => i.checked).length;
  const totalCount   = items.length;
  const allDone      = checkedCount === totalCount && totalCount > 0;

  const translateY = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [SCREEN_H, 0],
  });

  function renderItem(item: ChecklistItem) {
    const checkAnim = getCheckAnim(item.id);
    const row = (
      <TouchableOpacity
        style={s.itemRow}
        activeOpacity={0.75}
        onPress={() => toggleItem(item.id)}
      >
        {/* Animated checkbox */}
        <View style={s.checkboxWrap}>
          <View style={[s.checkboxBase, item.checked && s.checkboxChecked]}>
            <Animated.View
              style={{
                opacity: checkAnim,
                transform: [{ scale: checkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              }}
            >
              <Text style={s.checkmark}>{'\u2713'}</Text>
            </Animated.View>
          </View>
        </View>

        {/* Label */}
        <View style={s.itemText}>
          <Text
            style={[
              s.itemLabel,
              item.checked && s.itemLabelDone,
            ]}
            numberOfLines={2}
          >
            {item.label}
          </Text>
          {!!item.subtitle && (
            <Text style={s.itemSub}>{item.subtitle}</Text>
          )}
        </View>
      </TouchableOpacity>
    );

    if (!item.custom) return <React.Fragment key={item.id}>{row}</React.Fragment>;

    return (
      <Swipeable
        key={item.id}
        ref={ref => { swipeableRefs.current.set(item.id, ref); }}
        friction={2}
        rightThreshold={40}
        renderRightActions={() => (
          <DeleteAction onDelete={() => deleteItem(item.id)} />
        )}
        overshootRight={false}
      >
        {row}
      </Swipeable>
    );
  }

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 300 }]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,18,30,0.48)', opacity: anim }]}
        pointerEvents="auto"
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissable ? onClose : undefined} />
      </Animated.View>

      <Animated.View style={[s.sheet, { position: 'absolute', bottom: 0, left: 0, right: 0, transform: [{ translateY }] }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Drag handle */}
        <View {...pan.panHandlers} style={s.handleWrap}>
          <View style={s.handle} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Before you go</Text>
            <Text style={s.sub}>
              {allDone
                ? 'All done \u2713 — you\'re ready to roll'
                : `${checkedCount} of ${totalCount} done`}
            </Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={8} activeOpacity={0.7}>
            <Text style={s.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <Animated.View
            style={[
              s.progressFill,
              {
                width: progressA.interpolate({
                  inputRange:  [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: allDone ? C.green : C.orange,
              },
            ]}
          />
        </View>

        {/* Items list */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loaded && items.length === 0 && (
            <Text style={s.emptyText}>Nothing to check off yet.</Text>
          )}

          {items.map(item => renderItem(item))}

          {/* Add custom item */}
          {addingCustom ? (
            <View style={s.addInputRow}>
              <TextInput
                style={s.addInput}
                value={customDraft}
                onChangeText={setCustomDraft}
                placeholder="e.g. Print hotel confirmation"
                placeholderTextColor={C.muted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submitCustom}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[s.addConfirmBtn, !customDraft.trim() && { opacity: 0.4 }]}
                onPress={submitCustom}
                disabled={!customDraft.trim()}
                activeOpacity={0.8}
              >
                <Text style={s.addConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={s.addRow}
              activeOpacity={0.7}
              onPress={() => setAddingCustom(true)}
            >
              <View style={s.addCircle}>
                <Text style={s.addCircleText}>+</Text>
              </View>
              <Text style={s.addRowText}>Add your own item</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(15,18,30,0.48)',
    justifyContent:  'flex-end',
    zIndex:          300,
  },
  sheet: {
    backgroundColor:      C.card,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight:            SCREEN_H * 0.85,
    paddingBottom:        Platform.OS === 'ios' ? 34 : 20,
  },
  handleWrap: {
    alignItems:    'center',
    paddingTop:    12,
    paddingBottom: 8,
  },
  handle: {
    width:           36,
    height:          4,
    backgroundColor: 'rgba(26,31,46,0.15)',
    borderRadius:    2,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 20,
    paddingBottom:  12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontFamily:   F.bold,
    fontSize:     18,
    color:        C.deep,
    letterSpacing: -0.01,
  },
  sub: {
    fontFamily:   F.regular,
    fontSize:     12,
    color:        C.muted,
    marginTop:    2,
  },
  closeBtn: {
    backgroundColor:   C.bg,
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderWidth:       1,
    borderColor:       C.borderMed,
  },
  closeBtnText: {
    fontFamily: F.semibold,
    fontSize:   13,
    color:      C.deep,
  },
  progressTrack: {
    height:          4,
    backgroundColor: C.bg,
    marginHorizontal: 0,
  },
  progressFill: {
    height:       '100%',
    borderRadius: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop:        16,
  },
  emptyText: {
    fontFamily: F.regular,
    fontSize:   14,
    color:      C.muted,
    textAlign:  'center',
    paddingVertical: 32,
  },
  itemRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  checkboxWrap: {
    paddingTop: 1,
    flexShrink: 0,
  },
  checkboxBase: {
    width:           22,
    height:          22,
    borderRadius:    6,
    borderWidth:     1.5,
    borderColor:     C.borderMed,
    backgroundColor: '#fff',
    alignItems:      'center',
    justifyContent:  'center',
  },
  checkboxChecked: {
    backgroundColor: '#3DAA6E',
    borderColor:     '#3DAA6E',
  },
  checkmark: {
    fontSize:   13,
    color:      '#fff',
    fontWeight: '700',
    lineHeight: 16,
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontFamily: F.semibold,
    fontSize:   14,
    color:      C.deep,
    lineHeight: 20,
  },
  itemLabelDone: {
    textDecorationLine: 'line-through',
    color:              C.muted,
  },
  itemSub: {
    fontFamily: F.regular,
    fontSize:   11,
    color:      C.muted,
    marginTop:  2,
  },
  deleteAction: {
    backgroundColor:   C.red,
    justifyContent:    'center',
    alignItems:        'center',
    width:             80,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  deleteActionText: {
    fontFamily: F.semibold,
    fontSize:   14,
    color:      '#fff',
  },
  addRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    paddingVertical: 14,
  },
  addCircle: {
    width:           28,
    height:          28,
    borderRadius:    14,
    borderWidth:     1.5,
    borderStyle:     'dashed',
    borderColor:     '#E8692A',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  addCircleText: {
    fontFamily: F.bold,
    fontSize:   18,
    color:      '#E8692A',
    lineHeight: 22,
  },
  addRowText: {
    fontFamily: F.semibold,
    fontSize:   14,
    color:      '#E8692A',
  },
  addInputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    paddingVertical: 12,
    backgroundColor: '#FDF0E9',
    borderRadius:    12,
    paddingHorizontal: 12,
    marginTop:       8,
    marginBottom:    4,
    borderWidth:     1,
    borderColor:     'rgba(232,105,42,0.2)',
  },
  addInput: {
    flex:       1,
    fontFamily: F.regular,
    fontSize:   14,
    color:      C.deep,
    paddingVertical: 0,
  },
  addConfirmBtn: {
    backgroundColor:   '#E8692A',
    borderRadius:      8,
    paddingHorizontal: 14,
    paddingVertical:   7,
    flexShrink:        0,
  },
  addConfirmText: {
    fontFamily: F.bold,
    fontSize:   13,
    color:      '#fff',
  },
});

export async function loadChecklistCounts(
  tripId: string,
  stops: ChecklistStop[],
): Promise<{ checked: number; total: number }> {
  try {
    const key   = `roamus_checklist_${tripId}`;
    const raw   = await AsyncStorage.getItem(key);
    const fresh = buildInitialItems(stops);
    if (raw) {
      const saved  = JSON.parse(raw) as ChecklistItem[];
      const merged = mergeWithSaved(fresh, saved);
      return { checked: merged.filter(i => i.checked).length, total: merged.length };
    }
    return { checked: 0, total: fresh.length };
  } catch {
    return { checked: 0, total: FIXED_SEEDS.length };
  }
}
