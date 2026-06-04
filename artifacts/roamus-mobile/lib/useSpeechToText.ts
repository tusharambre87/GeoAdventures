import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

type SpeechResultsEvent = { value?: string[] };
type SpeechErrorEvent = { error?: { message?: string } };

interface VoiceModule {
  onSpeechResults: ((e: SpeechResultsEvent) => void) | null;
  onSpeechPartialResults: ((e: SpeechResultsEvent) => void) | null;
  onSpeechEnd: (() => void) | null;
  onSpeechError: ((e: SpeechErrorEvent) => void) | null;
  isAvailable: () => Promise<boolean>;
  start: (locale: string) => Promise<void>;
  stop: () => Promise<void>;
  destroy: () => Promise<void>;
}

let Voice: VoiceModule | null = null;
try {
  Voice = require('@react-native-voice/voice').default as VoiceModule;
} catch {
  Voice = null;
}

const listeningSetters = new Set<(v: boolean) => void>();
let activeCallback: ((text: string) => void) | null = null;
let voiceInitialized = false;

function ensureVoice() {
  if (!Voice || voiceInitialized || Platform.OS === 'web') return;
  voiceInitialized = true;

  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    if (text) activeCallback?.(text);
  };
  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] ?? '';
    if (text) activeCallback?.(text);
  };
  Voice.onSpeechEnd = () => {
    listeningSetters.forEach(fn => fn(false));
  };
  Voice.onSpeechError = (_e: SpeechErrorEvent) => {
    listeningSetters.forEach(fn => fn(false));
  };
}

async function requestPermissions(): Promise<boolean> {
  if (!Voice || Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'RoamUs needs microphone access to transcribe what kids say.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Microphone access needed',
          'Please allow microphone access in Settings to use voice input.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch {
      return false;
    }
  }

  const available = await Voice.isAvailable();
  if (!available) {
    Alert.alert(
      'Speech recognition unavailable',
      'Your device does not support speech recognition.',
      [{ text: 'OK' }]
    );
    return false;
  }

  return true;
}

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!Voice) return;
    ensureVoice();
    listeningSetters.add(setIsListening);
    return () => {
      listeningSetters.delete(setIsListening);
      if (listeningSetters.size === 0) {
        activeCallback = null;
        voiceInitialized = false;
        Voice?.destroy().catch(() => {});
      }
    };
  }, []);

  const start = useCallback(async (onResult: (text: string) => void) => {
    if (!Voice || Platform.OS === 'web') return;

    const ok = await requestPermissions();
    if (!ok) return;

    listeningSetters.forEach(fn => fn(false));
    activeCallback = onResult;
    try {
      await Voice.start('en-US');
      setIsListening(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start voice input.';
      Alert.alert('Voice input error', message, [{ text: 'OK' }]);
    }
  }, []);

  const stop = useCallback(async () => {
    if (!Voice || Platform.OS === 'web') return;
    try {
      await Voice.stop();
    } catch {}
    listeningSetters.forEach(fn => fn(false));
  }, []);

  return { isListening, start, stop };
}
