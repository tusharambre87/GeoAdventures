import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  text: string;
  lang?: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const ttsCache = new Map<string, string>();

export function TTSButton({ text, lang = "en-US", className, size = "icon", variant = "ghost" }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);

    const cacheKey = `eva:${text}`;
    let audioUrl = ttsCache.get(cacheKey);

    if (!audioUrl) {
      try {
        const response = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'eva' }),
        });

        if (response.ok) {
          const blob = await response.blob();
          audioUrl = URL.createObjectURL(blob);
          ttsCache.set(cacheKey, audioUrl);
        }
      } catch {
      }
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        fallbackBrowserTTS(text, lang, () => setIsPlaying(false));
      };
      audio.play().catch(() => {
        setIsPlaying(false);
        fallbackBrowserTTS(text, lang, () => setIsPlaying(false));
      });
    } else {
      fallbackBrowserTTS(text, lang, () => setIsPlaying(false));
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("rounded-full transition-all hover:scale-110 active:scale-95", className, isPlaying && "text-red-500 animate-pulse")}
      onClick={handleSpeak}
      title={isPlaying ? "Stop" : "Listen"}
    >
      {isPlaying ? <VolumeX className="w-full h-full" /> : <Volume2 className="w-full h-full" />}
    </Button>
  );
}

function fallbackBrowserTTS(text: string, lang: string, onEnd: () => void) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    window.speechSynthesis.speak(utterance);
  } else {
    onEnd();
  }
}
