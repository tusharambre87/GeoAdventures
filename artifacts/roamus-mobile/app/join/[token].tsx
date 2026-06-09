import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { API_BASE, useAuth } from "@/lib/authContext";
import { F } from "@/lib/tokens";

const C = {
  orange: '#E8692A',
  bg:     '#F5F2EE',
  deep:   '#1A1F2E',
  muted:  '#8A8FA8',
} as const;

export default function JoinTripScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { token: authToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Invalid invite link.'); return; }
    if (!authToken) {
      // Not signed in — redirect to auth, then come back
      router.replace(`/auth/splash?next=/join/${token}` as any);
      return;
    }

    async function acceptInvite() {
      try {
        const resp = await fetch(`${API_BASE}/api/travel/join/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });
        const data = await resp.json() as { success?: boolean; tripId?: string; message?: string; alreadyJoined?: boolean };
        if (!resp.ok) throw new Error(data.message || 'Could not join trip');
        if (data.tripId) {
          setStatus('success');
          setTimeout(() => router.replace(`/trip/${data.tripId}` as any), 800);
        } else {
          throw new Error('No trip ID in response');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.message || 'Something went wrong. The invite may have expired.');
      }
    }

    acceptInvite();
  }, [token, authToken]);

  return (
    <View style={s.root}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={s.msg}>Joining trip...</Text>
        </>
      )}
      {status === 'success' && (
        <Text style={s.msg}>Joined! Opening trip...</Text>
      )}
      {status === 'error' && (
        <>
          <Text style={s.title}>Invite not found</Text>
          <Text style={s.sub}>{errorMsg}</Text>
          <Text style={[s.sub, { marginTop: 24, color: C.orange }]} onPress={() => router.replace('/(tabs)')}>
            Go to my trips
          </Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: F.bold,
    color: C.deep,
    textAlign: 'center',
  },
  msg: {
    fontSize: 16,
    fontFamily: F.regular,
    color: C.muted,
    textAlign: 'center',
    marginTop: 12,
  },
  sub: {
    fontSize: 15,
    fontFamily: F.regular,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
