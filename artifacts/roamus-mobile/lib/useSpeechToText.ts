import { useCallback, useRef, useState } from 'react';

// Native on-device STT (@react-native-voice/voice) requires a custom dev/
// production build and cannot run in Expo Go.  This hook is a safe no-op
// stub so the app loads in Expo Go without crashes.  The mic-off icon in
// the UI already signals that voice input is unavailable in this build.

export function useSpeechToText() {
  const [isListening]                 = useState(false);
  const [isTranscribing]              = useState(false);
  const [partialResult]               = useState<string>('');
  const _onResultRef                  = useRef<((t: string) => void) | null>(null);

  const start = useCallback((_onResult: (text: string) => void) => {
    _onResultRef.current = _onResult;
    // No-op in Expo Go — user can use the iOS keyboard dictation button instead
  }, []);

  const stop = useCallback(() => {
    // No-op
  }, []);

  return { isListening, isTranscribing, partialResult, start, stop };
}
