import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE, useAuth } from "@/lib/authContext";
import { F } from "@/lib/tokens";

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  orange:   '#E8692A',
  orangeLt: '#FDF0E9',
  bg:       '#F5F2EE',
  card:     '#FFFFFF',
  deep:     '#1A1F2E',
  muted:    '#8A8FA8',
  mutedLt:  '#C4C8D8',
  green:    '#3DAA6E',
  greenLt:  '#E8F7EF',
  border:   'rgba(26,31,46,0.09)',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  userId: string | null;
  invitedEmail: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type InviteResp = { success: boolean; inviteToken: string; inviteUrl: string; message: string };
type MembersResp = { members: Member[] };

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(path: string, token: string | null, opts: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!resp.ok) {
    let msg = 'Unknown error';
    try { const j = await resp.json() as { message?: string }; msg = j.message ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  tripDestination: string;
};

export default function InviteCoParentSheet({ visible, onClose, tripId, tripName, tripDestination }: Props) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const translateY   = useRef(new Animated.Value(800)).current;
  const keyboardShift = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Slide sheet in/out
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 800,
      useNativeDriver: true,
      damping: 28,
      stiffness: 300,
    }).start();
  }, [visible]);

  // Load members when visible
  useEffect(() => {
    if (!visible || !tripId || !token) return;
    loadMembers();
  }, [visible, tripId, token]);

  // Shift sheet up when keyboard appears so the email field stays visible
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardShift, {
        toValue: -e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration ?? 250 : 250,
        useNativeDriver: true,
      }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration ?? 220 : 220,
        useNativeDriver: true,
      }).start();
    });

    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  function loadMembers() {
    setLoadingMembers(true);
    apiFetch<MembersResp>(`/api/travel/trips/${tripId}/members`, token)
      .then(data => setMembers(data.members ?? []))
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }

  if (!visible) return null;

  async function handleShareLink() {
    setSharing(true);
    try {
      const data = await apiFetch<InviteResp>(
        `/api/travel/trips/${tripId}/invite`,
        token,
        { method: 'POST', body: JSON.stringify({}) },
      );
      await Share.share({
        message: `Join my RoamUs trip "${tripName}"! Tap the link to join: ${data.inviteUrl}`,
        url: data.inviteUrl,
      });
      loadMembers();
    } catch (err: any) {
      if (err?.message !== 'The user did not share') {
        Alert.alert('Error', err?.message || 'Could not create invite link. Try again.');
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleSendInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const data = await apiFetch<InviteResp>(
        `/api/travel/trips/${tripId}/invite`,
        token,
        { method: 'POST', body: JSON.stringify({ email: trimmed }) },
      );
      setEmail('');
      const already = data.message?.includes('already a collaborator');
      Alert.alert(
        already ? 'Already joined' : 'Invite sent',
        already ? `${trimmed} is already a co-parent on this trip.` : `An invite link has been sent to ${trimmed}.`,
      );
      loadMembers();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not send invite. Try again.');
    } finally {
      setSending(false);
    }
  }

  const collaborators = members.filter(m => m.role !== 'owner');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,18,30,0.48)' }]}
        onPress={() => { Keyboard.dismiss(); onClose(); }}
      />
      <Animated.View
        style={[
          s.sheet,
          {
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: Animated.add(translateY, keyboardShift) }],
          },
        ]}
      >
        {/* Grip */}
        <View style={s.grip} />

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Invite a co-parent</Text>
          <Pressable style={s.closeBtn} onPress={() => { Keyboard.dismiss(); onClose(); }} hitSlop={8}>
            <Text style={s.closeX}>&#x2715;</Text>
          </Pressable>
        </View>
        <Text style={s.sub}>{tripName} &middot; {tripDestination}</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Share link */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>SHARE INVITE LINK</Text>
            <Pressable
              style={[s.shareBtn, sharing && s.shareBtnDisabled]}
              onPress={handleShareLink}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color={C.orange} size="small" />
              ) : (
                <Text style={s.shareBtnText}>Share link with partner</Text>
              )}
            </Pressable>
          </View>

          {/* Email invite */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>OR SEND BY EMAIL</Text>
            <View style={s.emailRow}>
              <TextInput
                style={s.emailInput}
                value={email}
                onChangeText={setEmail}
                placeholder="partner@email.com"
                placeholderTextColor={C.mutedLt}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSendInvite}
              />
              <Pressable
                style={[s.sendBtn, sending && s.sendBtnDisabled]}
                onPress={handleSendInvite}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.sendBtnText}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Current members */}
          {collaborators.length > 0 ? (
            <View style={s.section}>
              <Text style={s.sectionLabel}>CO-PLANNERS</Text>
              {collaborators.map(m => (
                <View key={m.id} style={s.memberRow}>
                  <View style={s.memberAvatar}>
                    <Text style={s.memberAvatarText}>
                      {(m.invitedEmail ?? 'U').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.memberInfo}>
                    <Text style={s.memberEmail}>{m.invitedEmail ?? 'Joined user'}</Text>
                    <View style={[s.statusBadge, m.status === 'accepted' ? s.statusAccepted : s.statusPending]}>
                      <Text style={[s.statusText, m.status === 'accepted' ? s.statusTextAccepted : s.statusTextPending]}>
                        {m.status === 'accepted' ? 'Active' : 'Invite sent'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : loadingMembers ? (
            <ActivityIndicator color={C.orange} style={{ marginTop: 16 }} />
          ) : null}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  grip: {
    width: 40, height: 4,
    backgroundColor: C.mutedLt,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 2,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: F.bold,
    color: C.deep,
  },
  closeBtn: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 12,
    color: C.muted,
  },
  sub: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    fontSize: 13,
    color: C.muted,
    fontFamily: F.regular,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: F.semibold,
    color: C.muted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  shareBtn: {
    backgroundColor: C.orangeLt,
    borderWidth: 1.5,
    borderColor: C.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    fontSize: 15,
    fontFamily: F.semibold,
    color: C.orange,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    fontFamily: F.regular,
    color: C.deep,
  },
  sendBtn: {
    backgroundColor: C.orange,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 14,
    fontFamily: F.semibold,
    color: '#fff',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.orangeLt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 15,
    fontFamily: F.bold,
    color: C.orange,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberEmail: {
    fontSize: 14,
    fontFamily: F.regular,
    color: C.deep,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusAccepted: {
    backgroundColor: C.greenLt,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontFamily: F.semibold,
  },
  statusTextAccepted: {
    color: '#15803D',
  },
  statusTextPending: {
    color: '#92400E',
  },
});
