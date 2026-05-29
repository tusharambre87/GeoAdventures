import { useState, useRef, useCallback, useEffect } from "react";

export type CompassVoice = "eva" | "ari";

const LS_VOICE_KEY = "compassTTSVoice";
const LS_MUTED_KEY = "compassTTSMuted";

const audioCache = new Map<string, string>();

export function useCompassTTS() {
  const [voice, setVoiceState] = useState<CompassVoice>(() => {
    const saved = localStorage.getItem(LS_VOICE_KEY);
    return saved === "ari" ? "ari" : "eva";
  });
  const voiceRef = useRef<CompassVoice>(voice);

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem(LS_MUTED_KEY) === "true";
  });
  const mutedRef = useRef(isMuted);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const lastTextRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
    pendingTextRef.current = null;
  }, []);

  const setVoice = useCallback((v: CompassVoice) => {
    voiceRef.current = v;
    setVoiceState(v);
    localStorage.setItem(LS_VOICE_KEY, v);
  }, []);

  // speak() — reads voice + muted from refs, always stable reference
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    lastTextRef.current = text;
    if (mutedRef.current) return;

    stop();
    pendingTextRef.current = text;
    setIsPlaying(true);

    const v = voiceRef.current;
    const cacheKey = `${v}:${text}`;
    let audioUrl = audioCache.get(cacheKey);

    if (!audioUrl) {
      try {
        const res = await fetch("/api/tts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: v }),
        });
        if (res.ok) {
          const blob = await res.blob();
          audioUrl = URL.createObjectURL(blob);
          audioCache.set(cacheKey, audioUrl);
        }
      } catch {
        // fall through to fallback
      }
    }

    if (pendingTextRef.current !== text) return;

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); audioRef.current = null; };
      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
        fallbackTTS(text, () => setIsPlaying(false));
      };
      audio.play().catch(() => {
        setIsPlaying(false);
        fallbackTTS(text, () => setIsPlaying(false));
      });
    } else {
      fallbackTTS(text, () => setIsPlaying(false));
    }
  }, [stop]);

  // toggleMute: mute stops audio; unmute replays the last spoken text
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      mutedRef.current = next;
      localStorage.setItem(LS_MUTED_KEY, String(next));

      if (next) {
        // Muting — stop current audio
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        // Unmuting — replay the last narration so user hears something immediately
        const text = lastTextRef.current;
        if (text) {
          // Small delay so state settles before speak() checks mutedRef
          setTimeout(() => speak(text), 80);
        }
      }
      return next;
    });
  }, [speak]);

  return { speak, stop, isPlaying, isMuted, toggleMute, voice, setVoice };
}

function fallbackTTS(text: string, onEnd: () => void) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 1.05;
    utt.lang = "en-US";
    utt.onend = onEnd;
    utt.onerror = onEnd;
    window.speechSynthesis.speak(utt);
  } else {
    onEnd();
  }
}
