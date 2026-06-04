import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

import { API_BASE } from '@/lib/apiClient';
import { F } from '@/lib/tokens';

const C = {
  bg:     '#F5F2EE',
  deep:   '#1A1F2E',
  orange: '#E8692A',
  muted:  '#8A8FA8',
  card:   '#fff',
  border: 'rgba(26,31,46,0.10)',
  green:  '#16A34A',
} as const;

interface Hotel { name: string; address?: string; placeId?: string }

interface Props {
  visible: boolean;
  tripId: string;
  destination: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddHotelSheet({ visible, tripId, destination, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(500)).current;

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Hotel[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected]   = useState<Hotel | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      setSaved(false);
      setQuery('');
      setResults([]);
      setSelected(null);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetAnim, { toValue: 0, damping: 24, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.spring(sheetAnim, { toValue: 500, damping: 24, stiffness: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Debounced hotel search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelected(null);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const enc   = encodeURIComponent(destination);
        const q     = encodeURIComponent(query.trim());
        const res   = await fetch(
          `${API_BASE}/api/travel/cities/${enc}/hotels?q=${q}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json() as { hotels?: Hotel[] };
          setResults(data.hotels ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 420);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, destination]);

  async function handleSave() {
    const address = selected?.address ?? selected?.name ?? query.trim();
    if (!address) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_BASE}/api/travel/trips/${tripId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          stayLocations: [{ cityName: destination, address }],
        }),
      });
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 700);
    } catch {
      setSaving(false);
    }
  }

  if (!visible) return null;

  const inputValue = selected ? (selected.address ?? selected.name) : query;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
        <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetAnim }] }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Add hotel / start point</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={s.closeBtn}>{'×'}</Text>
            </Pressable>
          </View>
          <Text style={s.sub}>We'll use this for directions and timing</Text>

          {/* Input */}
          <View style={s.inputWrap}>
            <Text style={s.inputIcon}>{'\uD83C\uDFE8'}</Text>
            <TextInput
              style={s.input}
              placeholder="Hotel name or address"
              placeholderTextColor={C.muted}
              value={inputValue}
              onChangeText={text => { setSelected(null); setQuery(text); }}
              autoFocus
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={C.orange} style={{ marginRight: 8 }} />}
            {inputValue.length > 0 && !searching && (
              <Pressable onPress={() => { setQuery(''); setSelected(null); setResults([]); }} hitSlop={8}>
                <Text style={s.clearBtn}>{'×'}</Text>
              </Pressable>
            )}
          </View>

          {/* Search results */}
          {results.length > 0 && !selected && (
            <ScrollView
              style={s.resultsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {results.map((h, i) => (
                <TouchableOpacity
                  key={h.placeId ?? i}
                  style={[s.resultRow, i < results.length - 1 && s.resultRowBorder]}
                  onPress={() => { setSelected(h); setResults([]); Keyboard.dismiss(); }}
                  activeOpacity={0.75}
                >
                  <Text style={s.resultIcon}>{'\uD83D\uDCCD'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultName} numberOfLines={1}>{h.name}</Text>
                    {h.address ? <Text style={s.resultAddr} numberOfLines={1}>{h.address}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Save button */}
          <Pressable
            style={[s.saveBtn, saved && s.saveBtnDone, (saving || !inputValue.trim()) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving || saved || !inputValue.trim()}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>{saved ? 'Saved!' : 'Save start point'}</Text>
            }
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(26,31,46,0.15)',
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title:    { fontFamily: F.bold, fontSize: 18, color: C.deep },
  closeBtn: { fontSize: 24, color: C.muted, lineHeight: 28 },
  sub:      { fontFamily: F.regular, fontSize: 13, color: C.muted, marginBottom: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  inputIcon: { fontSize: 18, flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: F.regular,
    fontSize: 15,
    color: C.deep,
    paddingVertical: 14,
  },
  clearBtn: { fontSize: 18, color: C.muted, paddingHorizontal: 4 },
  resultsList: {
    maxHeight: 200,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  resultIcon: { fontSize: 16 },
  resultName: { fontFamily: F.semibold, fontSize: 14, color: C.deep },
  resultAddr: { fontFamily: F.regular, fontSize: 12, color: C.muted, marginTop: 1 },
  saveBtn: {
    backgroundColor: C.orange,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDone: { backgroundColor: C.green },
  saveBtnText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
});
