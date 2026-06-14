import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, NativeModules, Platform } from 'react-native';

// @react-native-voice/voice needs a native module that is NOT bundled with
// Expo Go — it only works in a custom dev / production build.
// Guard every call so the hook degrades gracefully in Expo Go (mic button
// just stays inactive) while working fully in a real build.
const HAS_VOICE = Platform.OS !== 'web' && !!NativeModules.Voice;

export function useSpeechToText() {
  const [isListening, setIsListening]     = useState(false);
  const [isTranscribing]                   = useState(false);
  const [partialResult, setPartialResult]  = useState<string>('');
  const onResultRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    if (!HAS_VOICE) return;

    // Lazy import — avoids any module-level crash when native code is absent
    import('@react-native-voice/voice').then(({ default: Voice }) => {
      Voice.onSpeechStart = () => setIsListening(true);
      Voice.onSpeechEnd   = () => setIsListening(false);

      Voice.onSpeechResults = (e: any) => {
        const text = e.value?.[0];
        if (text?.trim() && onResultRef.current) {
          onResultRef.current(text.trim());
          setPartialResult('');
        }
      };

      Voice.onSpeechPartialResults = (e: any) => {
        setPartialResult(e.value?.[0] ?? '');
      };

      Voice.onSpeechError = (e: any) => {
        setIsListening(false);
        setPartialResult('');
        const code = String(e.error?.code ?? '');
        // code 7 = no match, code 5 / "client" = user cancelled — silent
        if (code === '7' || code === 'recognition_fail' || code === '5' || code === 'client') return;
        Alert.alert('Could not recognise speech', 'Please type your answer instead.');
      };
    }).catch(() => {});

    return () => {
      if (!HAS_VOICE) return;
      import('@react-native-voice/voice').then(({ default: Voice }) => {
        Voice.destroy().catch(() => {});
      }).catch(() => {});
    };
  }, []);

  const stop = useCallback(async () => {
    if (!HAS_VOICE) return;
    try {
      const { default: Voice } = await import('@react-native-voice/voice');
      await Voice.stop();
    } catch {
      try {
        const { default: Voice } = await import('@react-native-voice/voice');
        await Voice.cancel().catch(() => {});
      } catch {}
    }
    setIsListening(false);
    setPartialResult('');
  }, []);

  const start = useCallback(async (onResult: (text: string) => void) => {
    if (Platform.OS === 'web') return;

    if (!HAS_VOICE) {
      Alert.alert(
        'Voice input not available',
        'Voice input requires a full app build. Please type your answer instead.'
      );
      return;
    }

    if (isListening) { stop(); return; }

    try {
      const { default: Voice } = await import('@react-native-voice/voice');
      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert('Speech not available', 'Your device does not support speech recognition.');
        return;
      }
      await Voice.destroy().catch(() => {});
      onResultRef.current = onResult;
      await Voice.start('en-US');
    } catch (err) {
      console.error('[useSpeechToText] start error:', err);
      Alert.alert('Could not start voice input', 'Please type your answer instead.');
    }
  }, [isListening, stop]);

  return { isListening, isTranscribing, partialResult, start, stop };
}
