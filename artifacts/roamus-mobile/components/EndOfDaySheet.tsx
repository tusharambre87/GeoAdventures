import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reflectionsAPI } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  bg: '#F5F2EE', orange: '#E8692A', deep: '#1A1F2E',
  muted: '#8A8FA8', green: '#3DAA6E',
} as const;

interface Kid { name: string; age?: number | null; }

interface Props {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  dayIndex: number;
  kids: Kid[];
}

const STEPS = [
  {
    key: 'surprise',
    prompt: 'What surprised you today?',
    sub: 'A hidden gem, an unexpected moment, or something that delighted the whole family.',
    placeholder: 'Something we didn\u2019t plan for\u2026',
  },
  {
    key: 'learnMore',
    prompt: 'What do you want to know more about?',
    sub: 'A question the kids asked, a place that sparked curiosity, or a topic worth exploring at home.',
    placeholder: 'We were curious about\u2026',
  },
  {
    key: 'doDifferently',
    prompt: 'What would you do differently tomorrow?',
    sub: 'Timing, pacing, a stop you\u2019d swap \u2014 or nothing at all.',
    placeholder: 'Next time we\u2019d\u2026 (or \u201cNot much!\u201d)',
  },
  {
    key: 'kidQuote',
    prompt: 'Capture a kid quote',
    sub: 'Something hilarious, surprisingly wise, or worth remembering forever.',
    placeholder: '\u201cThe best part was when\u2026\u201d',
  },
];

export default function EndOfDaySheet({ visible, onClose, tripId, dayIndex, kids }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ surprise: '', learnMore: '', doDifferently: '' });
  const [quoteText, setQuoteText] = useState('');
  const [quoteKid, setQuoteKid] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setStep(0);
      setAnswers({ surprise: '', learnMore: '', doDifferently: '' });
      setQuoteText('');
      setQuoteKid(kids[0]?.name ?? '');
    }
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      tension: 65, friction: 12, useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, kids]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) { setStep(s => s - 1); return true; }
      onClose(); return true;
    });
    return () => sub.remove();
  }, [visible, step, onClose]);

  const handleNext = useCallback(async () => {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const kidQuotes: Array<{ text: string; kid_name: string }> = [];
      if (quoteText.trim()) kidQuotes.push({ text: quoteText.trim(), kid_name: quoteKid || '' });
      await reflectionsAPI.save(tripId, {
        dayIndex,
        surprise: answers.surprise.trim() || undefined,
        learnMore: answers.learnMore.trim() || undefined,
        doDifferently: answers.doDifferently.trim() || undefined,
        kidQuotes,
      });
    } catch { /* best-effort */ }
    setSaving(false);
    onClose();
  }, [step, answers, quoteText, quoteKid, tripId, dayIndex, onClose]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [800, 0] });
  const backdropOpacity = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  if (!mounted) return null;

  const cur = STEPS[step];
  const isKidStep = step === 3;
  const isLastStep = step === STEPS.length - 1;
  const key = cur.key as keyof typeof answers;
  const value = isKidStep ? quoteText : (answers[key] ?? '');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26,31,46,0.55)', opacity: backdropOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[sh.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + 16 }]}
        pointerEvents="box-none"
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={sh.handle} />

          <View style={sh.headerRow}>
            <TouchableOpacity
              onPress={() => (step > 0 ? setStep(s => s - 1) : onClose())}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            >
              <Text style={sh.backBtn}>{step === 0 ? 'Cancel' : '\u2190 Back'}</Text>
            </TouchableOpacity>
            <View style={sh.dots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[sh.dot, i === step && sh.dotActive, i < step && sh.dotDone]} />
              ))}
            </View>
            <Text style={sh.stepLabel}>{step + 1} / {STEPS.length}</Text>
          </View>

          <ScrollView
            contentContainerStyle={sh.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={sh.prompt}>{cur.prompt}</Text>
            <Text style={sh.sub}>{cur.sub}</Text>

            {isKidStep && kids.length > 1 && (
              <View style={sh.kidRow}>
                {kids.map(k => (
                  <TouchableOpacity
                    key={k.name}
                    style={[sh.kidChip, quoteKid === k.name && sh.kidChipSel]}
                    onPress={() => setQuoteKid(k.name)}
                  >
                    <Text style={[sh.kidChipText, quoteKid === k.name && sh.kidChipTextSel]}>
                      {k.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={sh.input}
              value={value}
              onChangeText={v => {
                if (isKidStep) setQuoteText(v);
                else setAnswers(prev => ({ ...prev, [key]: v }));
              }}
              placeholder={cur.placeholder}
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={4}
              returnKeyType="default"
              autoFocus
            />
          </ScrollView>

          <View style={sh.footer}>
            <TouchableOpacity
              style={[sh.btn, saving && sh.btnDim]}
              activeOpacity={0.85}
              disabled={saving}
              onPress={handleNext}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={sh.btnText}>
                  {isLastStep
                    ? (value.trim() ? 'Save reflection' : 'Skip \u2014 save reflection')
                    : 'Next \u2192'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const sh = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    minHeight: 520,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14, shadowRadius: 16, elevation: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#D8D4CF',
    alignSelf: 'center', marginTop: 12, marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backBtn: { fontSize: 14, color: '#8A8FA8', fontFamily: F.medium },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E0DDD9' },
  dotActive: { backgroundColor: '#E8692A', width: 20 },
  dotDone: { backgroundColor: '#3DAA6E' },
  stepLabel: { fontSize: 12, color: '#8A8FA8', fontFamily: F.medium, minWidth: 36, textAlign: 'right' },
  body: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 4 },
  prompt: { fontSize: 22, fontWeight: '800', color: '#1A1F2E', letterSpacing: -0.3, marginBottom: 8, marginTop: 4 },
  sub: { fontSize: 14, color: '#8A8FA8', lineHeight: 20, marginBottom: 20 },
  kidRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  kidChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0DDD9', backgroundColor: '#F5F2EE',
  },
  kidChipSel: { borderColor: '#E8692A', backgroundColor: '#FDF0E9' },
  kidChipText: { fontSize: 14, color: '#8A8FA8', fontFamily: F.medium },
  kidChipTextSel: { color: '#E8692A' },
  input: {
    backgroundColor: '#F9F8F6', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E8E5E1',
    padding: 16, fontSize: 16, color: '#1A1F2E',
    minHeight: 120, textAlignVertical: 'top',
    fontFamily: F.regular, lineHeight: 24,
  },
  footer: { paddingHorizontal: 24, paddingTop: 8 },
  btn: { backgroundColor: '#E8692A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDim: { opacity: 0.65 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});
