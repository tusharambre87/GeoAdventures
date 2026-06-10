import * as Speech from 'expo-speech';
import { useState, useEffect } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speak = (text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      const clean = text.replace(/[*_~`#>]/g, '').trim();
      setIsSpeaking(true);
      Speech.speak(clean, {
        language: 'en-US',
        rate: 0.88,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const stop = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
}
