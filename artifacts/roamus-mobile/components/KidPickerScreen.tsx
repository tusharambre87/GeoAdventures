import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '@/lib/tokens';
import type { PlayerRecord } from '@/lib/apiClient';

export type AgeBand = 'young' | 'middle' | 'older';

export function getAgeBand(age: string | number | null | undefined): AgeBand {
  const n = Number(age ?? 99);
  if (n <= 6) return 'young';
  if (n <= 9) return 'middle';
  return 'older';
}

export interface PickedKid {
  playerId: string;
  playerName: string;
  ageBand: AgeBand;
  avatarKey: string;
}

const AVATAR_EMOJI: Record<string, string> = {
  panda: '\uD83D\uDC3C', lion: '\uD83E\uDD81', fox: '\uD83E\uDD8A',
  owl: '\uD83E\uDD89', bear: '\uD83D\uDC3B', rabbit: '\uD83D\uDC30',
  tiger: '\uD83D\uDC2F', elephant: '\uD83D\uDC18', dog: '\uD83D\uDC36',
  cat: '\uD83D\uDC31', penguin: '\uD83D\uDC27', koala: '\uD83D\uDC28',
};

// Deterministic color per name — cycles through brand palette
const AVATAR_COLORS = ['#E8692A', '#7C3AED', '#3DAA6E', '#F5A623', '#7A9E8E', '#E86A9A'];
function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

type RichPlayer = PlayerRecord & { age?: string | number; avatarKey?: string; isArchived?: boolean };

function avatarDisplay(player: RichPlayer): { emoji: string | null; initial: string; color: string } {
  // 'panda' is the DB default — treat it as "no avatar chosen yet"; show initial instead.
  // Non-panda keys are explicit user choices and show their emoji.
  const key = player.avatarKey;
  const emoji = (key && key !== 'panda') ? (AVATAR_EMOJI[key] ?? null) : null;
  return {
    emoji,
    initial: (player.name?.[0] ?? 'K').toUpperCase(),
    color: nameColor(player.name ?? ''),
  };
}

interface Props {
  visible: boolean;
  kids: RichPlayer[];
  onSelect: (kid: PickedKid) => void;
  onClose: () => void;
}

export default function KidPickerScreen({ visible, kids, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [showGuest, setShowGuest] = useState(false);
  const [guestName, setGuestName] = useState('');

  function handleSelect(player: RichPlayer) {
    setShowGuest(false);
    setGuestName('');
    onSelect({
      playerId: player.id,
      playerName: player.name,
      ageBand: getAgeBand(player.age),
      avatarKey: player.avatarKey ?? 'panda',
    });
  }

  function handleGuestConfirm() {
    const name = guestName.trim() || 'Explorer';
    setShowGuest(false);
    setGuestName('');
    onSelect({ playerId: '', playerName: name, ageBand: 'middle', avatarKey: 'panda' });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.inner,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 36 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.heading}>{'Who\u2019s exploring?'}</Text>
          <Text style={s.subtitle}>{"We'll pick the right missions for them"}</Text>

          <View style={s.list}>
            {kids.map(player => {
              const { emoji, initial, color } = avatarDisplay(player);
              return (
                <Pressable
                  key={player.id}
                  style={({ pressed }) => [s.card, pressed && { opacity: 0.82 }]}
                  onPress={() => handleSelect(player)}
                >
                  <View style={[s.avatar, { backgroundColor: color }]}>
                    {emoji ? (
                      <Text style={s.avatarEmoji}>{emoji}</Text>
                    ) : (
                      <Text style={s.avatarInitial}>{initial}</Text>
                    )}
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.kidName}>{player.name}</Text>
                    {player.age != null && (
                      <Text style={s.kidAge}>{`Age ${player.age}`}</Text>
                    )}
                  </View>
                  <Text style={s.chevron}>{'\u203A'}</Text>
                </Pressable>
              );
            })}
          </View>

          {!showGuest ? (
            <Pressable style={s.guestLink} onPress={() => setShowGuest(true)}>
              <Text style={s.guestLinkText}>{'Someone else is using the phone \u2192'}</Text>
            </Pressable>
          ) : (
            <View style={s.guestBox}>
              <Text style={s.guestLabel}>{'Enter their name'}</Text>
              <TextInput
                style={s.guestInput}
                placeholder="Explorer"
                placeholderTextColor="#8A8FA8"
                value={guestName}
                onChangeText={setGuestName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleGuestConfirm}
              />
              <Pressable style={s.guestBtn} onPress={handleGuestConfirm}>
                <Text style={s.guestBtnText}>{'Start exploring \u2192'}</Text>
              </Pressable>
              <Pressable
                style={s.guestCancel}
                onPress={() => { setShowGuest(false); setGuestName(''); }}
              >
                <Text style={s.guestCancelText}>{'Cancel'}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F2EE' },
  inner: { alignItems: 'center', paddingHorizontal: 24 },
  heading: {
    fontFamily: F.bold, fontSize: 24, color: '#1A1F2E',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: F.regular, fontSize: 14, color: '#8A8FA8',
    textAlign: 'center', marginBottom: 32,
  },
  list: { width: '100%', gap: 12, marginBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  avatarInitial: { fontFamily: F.bold, fontSize: 20, color: '#FFFFFF' },
  cardInfo: { flex: 1 },
  kidName: { fontFamily: F.bold, fontSize: 16, color: '#1A1F2E' },
  kidAge: { fontFamily: F.regular, fontSize: 13, color: '#8A8FA8', marginTop: 2 },
  chevron: { fontSize: 22, color: '#8A8FA8' },
  guestLink: { paddingVertical: 8 },
  guestLinkText: {
    fontFamily: F.regular, fontSize: 14, color: '#8A8FA8',
    textDecorationLine: 'underline',
  },
  guestBox: { width: '100%', gap: 10, alignItems: 'center' },
  guestLabel: {
    fontFamily: F.bold, fontSize: 14, color: '#1A1F2E', alignSelf: 'flex-start',
  },
  guestInput: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    fontFamily: F.regular, color: '#1A1F2E',
    borderWidth: 1, borderColor: 'rgba(26,31,46,0.1)',
  },
  guestBtn: {
    width: '100%', backgroundColor: '#7C3AED', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  guestBtnText: { fontFamily: F.bold, fontSize: 16, color: '#FFFFFF' },
  guestCancel: { paddingVertical: 8 },
  guestCancelText: { fontFamily: F.regular, fontSize: 13, color: '#8A8FA8' },
});
