import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  onSaved?: () => void;
  tripId: string;
  dayIndex: number;
  kids: Kid[];
}

const STEPS = [
  {
    key: 'surprise',
    prompt: 'What surprised you today?',
    sub: 'A hidden gem, an unexpected moment, or something that delighted the whole family.',
    placeholder: 'Something we didn’t plan for…',
  },
  {
    key: 'learnMore',
    prompt: 'What do you want to know more about?',
    sub: 'A question the kids asked, a place that sparked curiosity, or a topic worth exploring at home.',
    placeholder: 'We were curious about…',
  },
  {
    key: 'doDifferently',
    prompt: 'What would you do differently tomorrow?',
    sub: 'Timing, pacing, a stop you’d swap — or nothing at all.',
    placeholder: 'Next time we’d… (or “Not much!”)',
  },
  {
    key: 'kidQuote',
    prompt: 'Capture a kid quote',
    sub: 'Something hilarious, surprisingly wise, or worth remembering forever.',
    placeholder: '“The best part was when…”',
  },
];

export default function EndOfDaySheet({ visible, onClose, onSaved, tripId, dayIndex, kids }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ surprise: '', learnMore: '', doDifferently: '' });
  const [quoteText, setQuoteText] = useState('');
  const [quoteKid, setQuoteKid] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setStep(0);
      // Prefill from the existing reflection for this day (if any)
      reflectionsAPI.list(tripId).then(rows => {
        const existing = rows
          .filter(r => (r.dayIndex ?? 0) === dayIndex)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (existing) {
          setAnswers({
            surprise: existing.surprise ?? '',
            learnMore: existing.learnMore ?? '',
            doDifferently: existing.doDifferently ?? '',
          });
          const firstQuote = existing.kidQuotes?.[0];
          setQuoteText(firstQuote?.text ?? '');
          setQuoteKid(firstQuote?.kid_name ?? kids[0]?.name ?? '');
        } else {
          setAnswers({ surprise: '', learnMore: '', doDifferently: '' });
          setQuoteText('');
          setQuoteKid(kids[0]?.name ?? '');
        }
      }).catch(() => {
        // On fetch failure, fall back to blank (don't block opening)
        setAnswers({ surprise: '', learnMore: '', doDifferently: '' });
        setQuoteText('');
        setQuoteKid(kids[0]?.name ?? '');
      });
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 26, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 600, damping: 26, stiffness: 200, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible, kids, tripId, dayIndex]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) { setStep(s => s - 1); return true; }
      onClose(); return true;
    });
    return () => sub.remove();
  }, [visible, step, onClose]);

  const handleNext = useCallback(async () => {
    if (step < STEPS.length - 1) { setSaveError(null); setStep(s => s + 1); return; }
    Keyboard.dismiss();
    setSaving(true);
    setSaveError(null);
    try {
      const kidQuotes: Array<{ text: string; kid_name: string }> = [];
      if (quoteText.trim()) kidQuotes.push({ text: quoteText.trim(), kid_name: quoteKid || '' });
      const result = await reflectionsAPI.save(tripId, {
        dayIndex,
        surprise: answers.surprise.trim() || undefined,
        learnMore: answers.learnMore.trim() || undefined,
        doDifferently: answers.doDifferently.trim() || undefined,
        kidQuotes,
      });
      // success — result contains { id, created_at }
      console.log('[EndOfDaySheet] saved reflection', result);
      setSaving(false);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EndOfDaySheet] save failed:', msg);
      setSaving(false);
      setSaveError(msg || 'Could not save — check your connection and try again.');
      // do NOT call onSaved or onClose
    }
  }, [step, answers, quoteText, quoteKid, tripId, dayIndex, onClose, onSaved]);

  const cur = STEPS[step];
  const isKidStep = step === 3;
  const isLastStep = step === STEPS.length - 1;
  const key = cur.key as keyof typeof answers;
  const value = isKidStep ? quoteText : (answers[key] ?? '');

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => (step > 0 ? setStep(s => s - 1) : onClose())}
    >
      <Animated.View style={[sh.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sh.kav}>
          <Animated.View
            style={[sh.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={sh.handle} />

            <View style={sh.headerRow}>
              <TouchableOpacity
                onPress={() => (step > 0 ? setStep(s => s - 1) : onClose())}
                hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              >
                <Text style={sh.backBtn}>{step === 0 ? 'Cancel' : '← Back'}</Text>
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
                  setSaveError(null);
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

            {!!saveError && (
              <View style={sh.errorBox}>
                <Text style={sh.errorText}>{'⚠️'} {saveError}</Text>
                <Text style={sh.errorRetry}>Fix any issues above, then tap the button again.</Text>
              </View>
            )}
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
                      ? (value.trim() ? 'Save reflection' : 'Skip — save reflection')
                      : 'Next →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const sh = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26,31,46,0.55)',
    justifyContent: 'flex-end',
  },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 16,
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
  errorBox: {
    marginHorizontal: 24, marginBottom: 8,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14,
  },
  errorText: { fontSize: 14, color: '#B91C1C', fontFamily: F.semibold, marginBottom: 4 },
  errorRetry: { fontSize: 12, color: '#B91C1C', fontFamily: F.regular },
});
