import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

const HOTEL_CHAINS = [
  'Marriott', 'JW Marriott', 'Marriott Marquis', 'The Ritz-Carlton',
  'Sheraton', 'Westin', 'W Hotels', 'Renaissance by Marriott',
  'Autograph Collection', 'Courtyard by Marriott', 'Residence Inn',
  'Fairfield Inn', 'SpringHill Suites', 'TownPlace Suites', 'AC Hotels',
  'Hilton', 'Hilton Garden Inn', 'DoubleTree by Hilton', 'Hampton Inn',
  'Embassy Suites', 'Curio Collection by Hilton', 'Tapestry Collection',
  'Canopy by Hilton', 'Tru by Hilton', 'Home2 Suites', 'Signia by Hilton',
  'Hyatt', 'Grand Hyatt', 'Park Hyatt', 'Hyatt Regency', 'Andaz',
  'Thompson Hotels', 'Alila Hotels', 'Caption by Hyatt',
  'InterContinental', 'Crowne Plaza', 'Holiday Inn', 'Holiday Inn Express',
  'Hotel Indigo', 'voco Hotels', 'Staybridge Suites', 'Kimpton Hotels',
  'Four Seasons', 'St. Regis', 'Waldorf Astoria', 'Conrad Hotels',
  'Omni Hotels', 'Loews Hotels', 'Radisson Blu', 'Radisson',
  'Best Western', 'Best Western Plus', 'BW Premier Collection',
  'Wyndham', 'La Quinta', 'Ramada', 'Travelodge', 'Days Inn',
  'Aloft Hotels', 'Element Hotels', 'EVEN Hotels', 'Le Méridien',
  'Sofitel', 'Novotel', 'MGallery', 'Swissôtel', 'Delta Hotels',
  'Tribute Portfolio', 'Moxy Hotels', 'Edition Hotels', 'Pendry Hotels',
];

function getSuggestions(query: string, city: string): Array<{ name: string; sub: string }> {
  if (query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return HOTEL_CHAINS
    .filter(c => c.toLowerCase().includes(q))
    .slice(0, 6)
    .map(c => ({ name: `${c} ${city}`, sub: c }));
}

interface Props {
  visible: boolean;
  tripId: string;
  destination: string;
  initialName?: string;
  initialAddress?: string;
  onClose: () => void;
  onSaved: (hotelName: string, fullAddress: string) => void;
}

export default function AddHotelSheet({ visible, tripId, destination, initialName, initialAddress, onClose, onSaved }: Props) {
  const insets      = useSafeAreaInsets();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(500)).current;
  const [mounted, setMounted] = useState(false);

  const [hotelName,          setHotelName]          = useState('');
  const [address,            setAddress]            = useState('');
  const [suggestions,        setSuggestions]        = useState<Array<{ name: string; sub: string }>>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [saved,              setSaved]              = useState(false);
  const [inputY,             setInputY]             = useState(0);
  const [inputHeight,        setInputHeight]        = useState(48);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setSaved(false);
      setHotelName(initialName ?? '');
      setAddress(initialAddress ?? '');
      setSuggestions([]);
      setAddressSuggestions([]); setIsSearchingAddress(false);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetAnim,   { toValue: 0, damping: 24, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.spring(sheetAnim,   { toValue: 500, damping: 24, stiffness: 200, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible]);

  useEffect(() => {
    setSuggestions(getSuggestions(hotelName, destination));
  }, [hotelName, destination]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  async function triggerAddressSearch(query: string) {
    setIsSearchingAddress(true);
    try {
      const q = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'RoamUs/1.0', 'Accept-Language': 'en' } });
      if (!res.ok) { setAddressSuggestions([]); return; }
      const data = await res.json() as Array<{ display_name?: string }>;
      const results = data.slice(0, 3).map(r => r.display_name ?? '').filter(Boolean);
      if (results.length === 1) {
        setAddress(results[0]);
        setAddressSuggestions([]);
      } else {
        setAddressSuggestions(results);
      }
    } catch {
      setAddressSuggestions([]);
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function handleHotelNameChange(text: string) {
    setHotelName(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void triggerAddressSearch(`${text.trim()}, ${destination}`);
    }, 800);
  }

  function selectSuggestion(item: { name: string; sub: string }) {
    setHotelName(item.sub);
    setSuggestions([]);
    Keyboard.dismiss();
    void triggerAddressSearch(item.name);
  }

  function selectAddressSuggestion(addr: string) {
    setAddress(addr);
    setAddressSuggestions([]);
  }

  function handleSave() {
    const name = hotelName.trim();
    const addr = address.trim();
    if (!name && !addr) return;
    const combined = name && addr ? `${name}, ${addr}` : (name || addr);
    setSaved(true);
    setTimeout(() => { onSaved(name, combined); onClose(); }, 500);
  }

  const canSave = (hotelName.trim().length > 0 || address.trim().length > 0) && !saved;

  return (
    <Modal visible={mounted} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 24, transform: [{ translateY: sheetAnim }] }]}>
            <View style={s.handle} />

            <View style={s.header}>
              <Text style={s.title}>Add hotel / start point</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={s.closeBtn}>{'×'}</Text>
              </Pressable>
            </View>
            <Text style={s.sub}>Set your daily starting point for better travel times</Text>

            <Text style={s.fieldLabel}>HOTEL NAME</Text>
            <View
              style={s.inputWrap}
              onLayout={(e) => {
                setInputY(e.nativeEvent.layout.y);
                setInputHeight(e.nativeEvent.layout.height);
              }}
            >
              <Text style={s.inputIcon}>{'\uD83C\uDFE8'}</Text>
              <TextInput
                style={s.input}
                placeholder={`Search hotel in ${destination}...`}
                placeholderTextColor={C.muted}
                value={hotelName}
                onChangeText={handleHotelNameChange}
                autoFocus
                returnKeyType="next"
              />
              {hotelName.length > 0 && (
                <Pressable onPress={() => { setHotelName(''); setSuggestions([]); }} hitSlop={8}>
                  <Text style={s.clearBtn}>{'×'}</Text>
                </Pressable>
              )}
            </View>

            {suggestions.length > 0 && (
              <ScrollView
                style={[s.suggList, {
                  position: 'absolute',
                  top: inputY + inputHeight + 4,
                  left: 0,
                  right: 0,
                  zIndex: 999,
                  elevation: 10,
                }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {suggestions.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.suggRow, i < suggestions.length - 1 && s.suggRowBorder]}
                    onPress={() => selectSuggestion(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.suggIco}>{'\uD83D\uDCCD'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.suggName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.suggSub} numberOfLines={1}>{item.sub} · {destination}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {isSearchingAddress && (
              <Text style={s.searchingLabel}>Looking up address...</Text>
            )}

            {addressSuggestions.length > 0 && (
              <ScrollView
                style={s.suggList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {addressSuggestions.map((addr, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.suggRow, i < addressSuggestions.length - 1 && s.suggRowBorder]}
                    onPress={() => selectAddressSuggestion(addr)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.suggIco}>{'\uD83D\uDCCD'}</Text>
                    <Text style={[s.suggName, { flex: 1 }]} numberOfLines={2}>{addr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>ADDRESS (optional)</Text>
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>{'\uD83D\uDCCD'}</Text>
              <TextInput
                style={s.input}
                placeholder={`e.g. 540 N Michigan Ave, ${destination}`}
                placeholderTextColor={C.muted}
                value={address}
                onChangeText={setAddress}
                returnKeyType="done"
                onSubmitEditing={canSave ? handleSave : undefined}
              />
              {address.length > 0 && (
                <Pressable onPress={() => setAddress('')} hitSlop={8}>
                  <Text style={s.clearBtn}>{'×'}</Text>
                </Pressable>
              )}
            </View>

            {suggestions.length === 0 && (
              <>
                <Pressable
                  style={[s.saveBtn, saved && s.saveBtnDone, !canSave && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!canSave}
                >
                  <Text style={s.saveBtnText}>{saved ? '\u2713 Saved!' : 'Save starting point'}</Text>
                </Pressable>
                <Pressable style={s.skipBtn} onPress={onClose} hitSlop={12}>
                  <Text style={s.skipBtnText}>Skip for now</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kav:   { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '90%',
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
  title:      { fontFamily: F.bold, fontSize: 18, color: C.deep },
  closeBtn:   { fontSize: 24, color: C.muted, lineHeight: 28 },
  sub:        { fontFamily: F.regular, fontSize: 13, color: C.muted, marginBottom: 14 },
  fieldLabel: {
    fontFamily: F.semibold, fontSize: 10, color: C.muted,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    marginBottom: 4,
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
  suggList: {
    maxHeight: 220,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 4,
  },
  suggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggRowBorder:   { borderBottomWidth: 1, borderBottomColor: C.border },
  searchingLabel: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  suggIco:  { fontSize: 16 },
  suggName: { fontFamily: F.semibold, fontSize: 14, color: C.deep },
  suggSub:  { fontFamily: F.regular, fontSize: 12, color: C.muted, marginTop: 1 },
  saveBtn: {
    backgroundColor: C.orange,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDone: { backgroundColor: '#16A34A' },
  saveBtnText: { fontFamily: F.bold, fontSize: 16, color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipBtnText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
});
