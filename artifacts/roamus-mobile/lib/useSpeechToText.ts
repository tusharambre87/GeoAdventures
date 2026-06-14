import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

export function useSpeechToText() {
  const [isListening, setIsListening]         = useState(false);
  const [isTranscribing]                       = useState(false);
  const [partialResult, setPartialResult]      = useState<string>('');
  const onResultRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd   = () => setIsListening(false);

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0];
      if (text?.trim() && onResultRef.current) {
        onResultRef.current(text.trim());
        setPartialResult('');
      }
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      setPartialResult(e.value?.[0] ?? '');
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setIsListening(false);
      setPartialResult('');
      const code = e.error?.code;
      if (code === '7' || code === 'recognition_fail') return;
      if (code !== '5' && code !== 'client') {
        Alert.alert('Could not recognise speech', 'Please type your answer instead.');
      }
    };

    return () => {
      Voice.destroy().catch(() => {});
    };
  }, []);

  const stop = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {
      await Voice.cancel().catch(() => {});
    }
    setIsListening(false);
    setPartialResult('');
  }, []);

  const start = useCallback(async (onResult: (text: string) => void) => {
    if (Platform.OS === 'web') return;

    if (isListening) {
      stop();
      return;
    }

    try {
      const available = await Voice.isAvailable();
      if (!available) {
        Alert.alert(
          'Speech not available',
          'Your device does not support speech recognition.',
          [{ text: 'OK' }]
        );
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
