import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function useSpeechToText() {
  const [isListening, setIsListening]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef  = useRef<Audio.Recording | null>(null);
  const onResultRef   = useRef<((text: string) => void) | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoStopTimer.current) { clearTimeout(autoStopTimer.current); autoStopTimer.current = null; }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(async () => {
    if (autoStopTimer.current) { clearTimeout(autoStopTimer.current); autoStopTimer.current = null; }
    const recording = recordingRef.current;
    const callback  = onResultRef.current;
    if (!recording) return;

    recordingRef.current = null;
    onResultRef.current  = null;
    setIsListening(false);

    try {
      setIsTranscribing(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri || !callback) return;

      const token = await AsyncStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/m4a', name: 'recording.m4a' } as any);

      const res = await fetch(`${API_BASE}/api/travel/transcribe`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { text } = await res.json() as { text: string };
      if (text?.trim()) callback(text.trim());
    } catch (err) {
      console.error('[useSpeechToText] transcription error:', err);
      Alert.alert('Could not transcribe', 'Please type your answer instead.');
    } finally {
      setIsTranscribing(false);
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    }
  }, []);

  const start = useCallback(async (onResult: (text: string) => void) => {
    if (Platform.OS === 'web') return;
    if (isListening) { stop(); return; }

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone needed',
          'Please allow microphone access in Settings to use voice input.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Always unload any existing recording before creating a new one.
      // Skipping this causes "Only one Recording object can be prepared at a
      // given time" when tapping mic twice quickly or after navigating screens.
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
        recordingRef.current = null;
      }
      if (autoStopTimer.current) { clearTimeout(autoStopTimer.current); autoStopTimer.current = null; }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      // createAsync atomically prepares and starts the recording — no partial-init
      // window where a second tap could race in between prepare and start.
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      onResultRef.current  = onResult;
      setIsListening(true);

      autoStopTimer.current = setTimeout(() => stop(), 30_000);
    } catch (err) {
      console.error('[useSpeechToText] start error:', err);
      Alert.alert('Could not start recording', 'Please try again.');
    }
  }, [isListening, stop]);

  return { isListening, isTranscribing, start, stop };
}
