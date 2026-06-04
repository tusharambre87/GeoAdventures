import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE, useAuth } from '@/lib/authContext';
import { F } from '@/lib/tokens';

interface FeedbackStop {
  id: string;
  name: string;
  stopType?: string | null;
  durationMinutes?: number | null;
}

interface StopFeedbackSheetProps {
  visible: boolean;
  stop: FeedbackStop;
  tripId: string;
  onComplete: () => void;
}

type Rating = 'big_hit' | 'good' | 'skip_next_time';

const OPTIONS: {
  id: Rating;
  emoji: string;
  label: string;
  sub: string;
  border: string;
  bg: string;
}[] = [
  { id: 'big_hit',        emoji: '\uD83C\uDF1F',  label: 'Big Hit',        sub: 'Kids loved it',        border: '#F59E0B', bg: '#FFFBEB' },
  { id: 'good',           emoji: '\uD83D\uDC4D',      label: 'Good',           sub: 'Worth the time',             border: '#10B981', bg: '#ECFDF5' },
  { id: 'skip_next_time', emoji: '⏭\uFE0F',      label: 'Skip next time', sub: 'Wouldn\u2019t return', border: '#7C3AED', bg: '#F5F3FF' },
];

export default function StopFeedbackSheet({
  visible,
  stop,
  tripId,
  onComplete,
}: StopFeedbackSheetProps) {
  const { token } = useAuth();
  const [selected, setSelected] = useState<Rating | null>(null);
  const [kidQuote, setKidQuote]   = useState('');
  const [saving, setSaving]       = useState(false);
  const translateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setKidQuote('');
      setSaving(false);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/travel/stops/${stop.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId,
          rating: selected,
          kidQuote: kidQuote.trim() || null,
        }),
      });
    } catch {
      // best-effort: endpoint may not exist yet; never show error to user
    }
    setSaving(false);
    onComplete();
  }

  if (!visible) return null;

  const stopTypeLabel = stop.stopType
    ? stop.stopType.charAt(0).toUpperCase() + stop.stopType.slice(1)
    : 'Stop';
  const metaLine = [stopTypeLabel, stop.durationMinutes ? `${stop.durationMinutes} min` : null]
    .filter(Boolean).join(' \u00b7 ');

  return (
    <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
      {/* Drag handle */}
      <View style={s.handle} />

      {/* Green visited pill */}
      <View style={s.visitedPill}>
        <View style={s.visitedDot} />
        <Text style={s.visitedLabel}>JUST VISITED</Text>
      </View>

      <Text style={s.stopName} numberOfLines={2}>{stop.name}</Text>
      <Text style={s.stopMeta}>{metaLine}</Text>

      <View style={s.divider} />

      <Text style={s.question}>How did this stop go for your family?</Text>

      <View style={s.optionRow}>
        {OPTIONS.map(opt => {
          const isSelected = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                s.optionCard,
                isSelected && { borderColor: opt.border, backgroundColor: opt.bg },
              ]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.75}
            >
              <Text style={s.optionEmoji}>{opt.emoji}</Text>
              <Text style={[s.optionLabel, isSelected && { color: opt.border }]}>
                {opt.label}
              </Text>
              <Text style={s.optionSub}>{opt.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.quoteLabel}>
        {'What did the kids say? '}
        <Text style={s.optional}>(optional)</Text>
      </Text>
      <TextInput
        style={s.quoteInput}
        value={kidQuote}
        onChangeText={setKidQuote}
        placeholder={'Type a quote\u2026'}
        placeholderTextColor={'#9CA3AF'}
        multiline
        numberOfLines={2}
        returnKeyType={'done'}
        blurOnSubmit
      />

      <TouchableOpacity
        style={[s.saveBtn, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Text style={s.saveBtnText}>{'Save & continue \u2192'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onComplete} style={s.skipBtn} activeOpacity={0.7}>
        <Text style={s.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    backgroundColor:      '#fff',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingHorizontal:    24,
    paddingTop:           12,
    paddingBottom:        Platform.OS === 'ios' ? 44 : 28,
    shadowColor:          '#000',
    shadowOpacity:        0.18,
    shadowRadius:         20,
    shadowOffset:         { width: 0, height: -4 },
    elevation:            12,
  },
  handle: {
    width:           36,
    height:          4,
    backgroundColor: 'rgba(26,31,46,0.15)',
    borderRadius:    2,
    alignSelf:       'center',
    marginBottom:    16,
  },
  visitedPill: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    backgroundColor:   '#ECFDF5',
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   4,
    marginBottom:      10,
    gap:               6,
  },
  visitedDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: '#10B981',
  },
  visitedLabel: {
    fontFamily:    F.bold,
    fontSize:      11,
    color:         '#059669',
    letterSpacing: 0.8,
  },
  stopName: {
    fontFamily:   F.bold,
    fontSize:     22,
    color:        '#1A1F2E',
    marginBottom: 4,
  },
  stopMeta: {
    fontFamily:   F.regular,
    fontSize:     13,
    color:        '#6B7280',
    marginBottom: 14,
  },
  divider: {
    height:          1,
    backgroundColor: '#F3F4F6',
    marginBottom:    14,
  },
  question: {
    fontFamily:   F.bold,
    fontSize:     14,
    color:        '#1A1F2E',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap:           8,
    marginBottom:  16,
  },
  optionCard: {
    flex:            1,
    padding:         12,
    borderRadius:    16,
    borderWidth:     2,
    borderColor:     '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems:      'center',
    gap:             3,
  },
  optionEmoji: {
    fontSize:     22,
    marginBottom: 2,
  },
  optionLabel: {
    fontFamily: F.bold,
    fontSize:   12,
    color:      '#1A1F2E',
    textAlign:  'center',
  },
  optionSub: {
    fontFamily: F.regular,
    fontSize:   10,
    color:      '#9CA3AF',
    textAlign:  'center',
  },
  quoteLabel: {
    fontFamily:   F.bold,
    fontSize:     13,
    color:        '#1A1F2E',
    marginBottom: 8,
  },
  optional: {
    fontFamily: F.regular,
    color:      '#9CA3AF',
  },
  quoteInput: {
    backgroundColor:   '#F5F2EE',
    borderRadius:      12,
    padding:           12,
    fontFamily:        F.regular,
    fontSize:          14,
    color:             '#1A1F2E',
    minHeight:         64,
    textAlignVertical: 'top',
    marginBottom:      16,
  },
  saveBtn: {
    backgroundColor: '#1A1F2E',
    borderRadius:    14,
    paddingVertical: 16,
    alignItems:      'center',
    marginBottom:    10,
  },
  saveBtnText: {
    fontFamily: F.bold,
    fontSize:   16,
    color:      '#fff',
  },
  skipBtn: {
    alignItems:      'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: F.regular,
    fontSize:   14,
    color:      '#9CA3AF',
  },
});
