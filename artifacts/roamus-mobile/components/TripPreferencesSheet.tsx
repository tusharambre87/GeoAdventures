import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { F } from '@/lib/tokens';

const { height: SCREEN_H } = Dimensions.get('window');

const C = {
  orange:    '#E8692A',
  orangeLt:  '#FDF0E9',
  bg:        '#F5F2EE',
  card:      '#FFFFFF',
  deep:      '#1A1F2E',
  muted:     '#8A8FA8',
  border:    'rgba(26,31,46,0.09)',
  borderMed: 'rgba(26,31,46,0.16)',
} as const;

type PaceOption  = 'relaxed' | 'balanced' | 'packed';
type MealsOption = 'lunch-stop' | 'snacks-only' | 'keep';

const PACE_OPTIONS: Array<{ value: PaceOption; label: string; desc: string }> = [
  { value: 'relaxed',  label: 'Relaxed',  desc: 'Removes one lower-priority stop if you have more than 3' },
  { value: 'balanced', label: 'Balanced', desc: 'Keeps your plan as-is' },
  { value: 'packed',   label: 'Packed',   desc: 'Noted — no stops are added automatically' },
];

const MEAL_OPTIONS: Array<{ value: MealsOption; label: string; desc: string }> = [
  { value: 'lunch-stop',   label: 'Add a lunch stop', desc: 'Inserts a lunch break stop at mid-day if none exists' },
  { value: 'snacks-only',  label: 'Snacks only',      desc: 'Removes all unvisited meal stops' },
  { value: 'keep',         label: 'Keep as is',       desc: 'No change to meal stops' },
];

function normalisePace(storedPace: string | null | undefined): PaceOption {
  if (storedPace === 'chill')   return 'relaxed';
  if (storedPace === 'packed')  return 'packed';
  return 'balanced';
}

export interface TripPreferencesSheetProps {
  visible:      boolean;
  tripId:       string;
  currentPace:  string | null | undefined;
  onClose:      () => void;
  onRefresh:    () => void;
  showToast:    (msg: string) => void;
  apiFetch:     <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
}

export default function TripPreferencesSheet({
  visible,
  tripId,
  currentPace,
  onClose,
  onRefresh,
  showToast,
  apiFetch,
}: TripPreferencesSheetProps) {
  const anim   = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted]       = useState(false);
  const [dismissable, setDismissable] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const [selectedPace,  setSelectedPace]  = useState<PaceOption>('balanced');
  const [selectedMeals, setSelectedMeals] = useState<MealsOption>('keep');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedPace(normalisePace(currentPace));
      setSelectedMeals('keep');
      setApplying(false);
    }
  }, [visible, currentPace]);

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
      toValue:   visible ? 1 : 0,
      useNativeDriver: true,
      damping:   22,
      stiffness: 180,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderRelease:       (_, g) => { if (g.dy > 60) closeRef.current(); },
    })
  ).current;

  const translateY = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [SCREEN_H, 0],
  });

  async function handleApply() {
    if (applying) return;
    setApplying(true);
    console.log('Applying preferences:', { pace: selectedPace, meals: selectedMeals });
    try {
      const body: Record<string, string> = {};
      if (selectedPace  !== 'balanced')  body.pace  = selectedPace;
      if (selectedMeals !== 'keep')      body.meals = selectedMeals;
      const result = await apiFetch(`/api/travel/trips/${tripId}/apply-preferences`, {
        method:  'POST',
        body:    JSON.stringify(body),
      });
      console.log('apply-preferences result:', result);
      showToast('Trip updated');
      onRefresh();
      onClose();
    } catch {
      showToast("Couldn't apply changes — try again");
    } finally {
      setApplying(false);
    }
  }

  return (
    // TODO: convert to SheetModal pattern (same bug as ChecklistSheet)
    <Modal visible={mounted} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, s.overlay, { opacity: anim }]} pointerEvents="box-none">
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={dismissable ? onClose : undefined}
        />

        <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
          {/* Drag handle */}
          <View {...pan.panHandlers} style={s.handleWrap}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Adjust your trip</Text>
            <Text style={s.subtitle}>Changes apply immediately to remaining stops</Text>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TODAY'S PACE */}
            <Text style={s.sectionLabel}>TODAY'S PACE</Text>
            <View style={s.chipGroup}>
              {PACE_OPTIONS.map(opt => {
                const selected = selectedPace === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[s.chip, selected && s.chipSelected]}
                    onPress={() => setSelectedPace(opt.value)}
                  >
                    <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[s.chipDesc, selected && s.chipDescSelected]}>
                      {opt.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* MEAL STOPS */}
            <Text style={[s.sectionLabel, { marginTop: 24 }]}>MEAL STOPS</Text>
            <View style={s.chipGroup}>
              {MEAL_OPTIONS.map(opt => {
                const selected = selectedMeals === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[s.chip, selected && s.chipSelected]}
                    onPress={() => setSelectedMeals(opt.value)}
                  >
                    <Text style={[s.chipLabel, selected && s.chipLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[s.chipDesc, selected && s.chipDescSelected]}>
                      {opt.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <Pressable
              style={[s.applyBtn, applying && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={applying}
            >
              <Text style={s.applyBtnText}>
                {applying ? 'Applying…' : 'Apply changes \u2192'}
              </Text>
            </Pressable>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingBottom:     16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontFamily:    F.bold,
    fontSize:      18,
    color:         C.deep,
    letterSpacing: -0.01,
  },
  subtitle: {
    fontFamily: F.regular,
    fontSize:   12,
    color:      C.muted,
    marginTop:  3,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop:        20,
  },
  sectionLabel: {
    fontFamily:    F.semibold,
    fontSize:      11,
    color:         C.muted,
    letterSpacing: 0.6,
    marginBottom:  10,
  },
  chipGroup: {
    gap: 8,
  },
  chip: {
    borderWidth:   1.5,
    borderColor:   C.borderMed,
    borderRadius:  12,
    paddingVertical:   12,
    paddingHorizontal: 14,
    backgroundColor:   C.bg,
  },
  chipSelected: {
    borderColor:     C.orange,
    backgroundColor: '#FDF0E9',
  },
  chipLabel: {
    fontFamily: F.semibold,
    fontSize:   14,
    color:      C.deep,
  },
  chipLabelSelected: {
    color: C.orange,
  },
  chipDesc: {
    fontFamily: F.regular,
    fontSize:   12,
    color:      C.muted,
    marginTop:  3,
  },
  chipDescSelected: {
    color: '#C4561E',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop:        16,
    borderTopWidth:    1,
    borderTopColor:    C.border,
    gap:               10,
  },
  applyBtn: {
    backgroundColor: C.orange,
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      'center',
  },
  applyBtnText: {
    fontFamily: F.bold,
    fontSize:   15,
    color:      '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontFamily: F.medium,
    fontSize:   14,
    color:      C.muted,
  },
});
