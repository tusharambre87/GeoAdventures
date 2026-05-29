import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, CheckCircle, Map as MapIcon, Gamepad2, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeoBuddyCharacter } from "@/components/GeoBuddyCharacter";
import { soundManager } from "@/lib/sound";
import { useUser } from "@/lib/userContext";
import { useExplorer } from "@/lib/explorerContext";
import { apiRequest } from "@/lib/queryClient";
import { getCityImage } from "@/lib/cityImages";

function stripVoiceMarkers(text: string): string {
  return text.replace(/\[(GEOBUDDY|ARI|CHORUS|pause|long pause|sfx:[a-z0-9_-]+)\]\s*/gi, '');
}

const STORY_SFX = {
  intro: '/audio/intro-jingle.mp3',
  outro: '/audio/outro-jingle.mp3',
  transition: '/audio/footsteps-on-path.mp3',
  revealBuild: '/audio/reveal-build.mp3',
  revealSting: '/audio/reveal-sting.mp3',
  compassSpin: '/audio/compass-spinning.mp3',
  compassLock: '/audio/compass-lock-click.mp3',
  mapSparkle: '/audio/map-sparkle-discovery.mp3',
  brokenCompass: '/audio/broken-compass.mp3',
  ambience: {
    mountain: '/audio/mountain-wind.mp3',
    market: '/audio/market-city-ambience.mp3',
    desert: '/audio/desert-wind.mp3',
    jungle: '/audio/jungle-tropical.mp3',
    ocean: '/audio/ocean-harbor.mp3',
    temple: '/audio/quiet-temple-garden.mp3',
  },
};

type ChapterSfxConfig = { pre?: string | string[] };

function getChapterSfx(chapterIndex: number): ChapterSfxConfig {
  if (chapterIndex === 0) {
    return { pre: STORY_SFX.intro };
  }
  return {};
}

const SFX_NAME_MAP: Record<string, string> = {
  'mountain-wind': '/audio/mountain-wind.mp3',
  'broken-compass': '/audio/broken-compass.mp3',
  'compass-spinning': '/audio/compass-spinning.mp3',
  'compass-lock': '/audio/compass-lock-click.mp3',
  'market-ambience': '/audio/market-city-ambience.mp3',
  'desert-wind': '/audio/desert-wind.mp3',
  'jungle': '/audio/jungle-tropical.mp3',
  'ocean': '/audio/ocean-harbor.mp3',
  'temple': '/audio/quiet-temple-garden.mp3',
  'footsteps': '/audio/footsteps-on-path.mp3',
  'intro': '/audio/intro-jingle.mp3',
  'outro': '/audio/outro-jingle.mp3',
  'reveal-sting': '/audio/reveal-sting.mp3',
  'reveal-build': '/audio/reveal-build.mp3',
  'map-sparkle': '/audio/map-sparkle-discovery.mp3',
};

type ContentSegment = { type: 'text'; text: string } | { type: 'sfx'; url: string; name: string };

function parseInlineSfx(content: string): ContentSegment[] {
  const sfxPattern = /\[sfx:([a-z0-9_-]+)\]\s*/gi;
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sfxPattern.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      segments.push({ type: 'text', text: textBefore.trim() });
    }
    const sfxName = match[1].toLowerCase();
    const sfxUrl = SFX_NAME_MAP[sfxName];
    if (sfxUrl) {
      segments.push({ type: 'sfx', url: sfxUrl, name: sfxName });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    segments.push({ type: 'text', text: remaining.trim() });
  }

  return segments;
}

class StorySfxPlayer {
  private muted = false;
  audioContext: AudioContext | null = null;
  private unlocked = false;
  private sfxSource: AudioBufferSourceNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFadeInterval: ReturnType<typeof setInterval> | null = null;
  private rawDataCache = new Map<string, ArrayBuffer>();
  private decodedCache = new Map<string, AudioBuffer>();

  unlock() {
    if (this.unlocked) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      this.unlocked = true;
      console.log('[SFX] AudioContext created & unlocked in user gesture, state:', ctx.state);
    } catch (e) {
      console.warn('[SFX] Audio unlock failed:', e);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stopAll();
  }

  async prefetchAll(urls: string[]) {
    const unique = [...new Set(urls.filter(Boolean))];
    console.log('[SFX] Prefetching', unique.length, 'audio files (raw data only, no AudioContext)...');
    const results = await Promise.allSettled(unique.map(async (url) => {
      if (this.rawDataCache.has(url)) return;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn('[SFX] Fetch failed:', url.split('/').pop(), res.status);
          return;
        }
        const ab = await res.arrayBuffer();
        this.rawDataCache.set(url, ab);
        console.log('[SFX] Fetched:', url.split('/').pop(), `(${(ab.byteLength / 1024).toFixed(0)}KB)`);
      } catch (e) {
        console.warn('[SFX] Fetch error:', url.split('/').pop(), e);
      }
    }));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    console.log('[SFX] Prefetched', this.rawDataCache.size, 'audio files ready');
  }

  private async getDecodedBuffer(url: string): Promise<AudioBuffer | null> {
    const decoded = this.decodedCache.get(url);
    if (decoded) return decoded;

    if (!this.audioContext) {
      console.warn('[SFX] No AudioContext — call unlock() first');
      return null;
    }

    let raw = this.rawDataCache.get(url);
    if (!raw) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn('[SFX] Fetch failed:', url.split('/').pop(), res.status);
          return null;
        }
        raw = await res.arrayBuffer();
        this.rawDataCache.set(url, raw);
      } catch (e) {
        console.warn('[SFX] Fetch error:', url.split('/').pop(), e);
        return null;
      }
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(raw.slice(0));
      this.decodedCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.warn('[SFX] Decode error:', url.split('/').pop(), e);
      return null;
    }
  }

  async playSfx(url: string): Promise<void> {
    if (this.muted || !this.audioContext) return;
    return new Promise(async (resolve) => {
      try { this.sfxSource?.stop(); } catch {}
      this.sfxSource = null;

      const buffer = await this.getDecodedBuffer(url);
      if (!buffer) { resolve(); return; }

      const ctx = this.audioContext!;
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.7;
      source.connect(gain);
      gain.connect(ctx.destination);
      this.sfxSource = source;

      source.onended = () => {
        console.log('[SFX] Finished:', url.split('/').pop());
        this.sfxSource = null;
        resolve();
      };

      console.log('[SFX] Playing:', url.split('/').pop());
      source.start(0);
    });
  }

  async playAmbient(url: string) {
    if (this.muted || !this.audioContext) return;
    this.stopAmbient();

    const buffer = await this.getDecodedBuffer(url);
    if (!buffer) return;

    const ctx = this.audioContext!;
    if (ctx.state === 'suspended') await ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(ctx.destination);
    this.ambientSource = source;
    this.ambientGain = gain;

    console.log('[SFX] Ambient playing:', url.split('/').pop());
    source.start(0);

    let vol = 0;
    this.ambientFadeInterval = setInterval(() => {
      if (!this.ambientGain || this.ambientGain !== gain) {
        if (this.ambientFadeInterval) clearInterval(this.ambientFadeInterval);
        return;
      }
      vol = Math.min(vol + 0.03, 0.35);
      gain.gain.value = vol;
      if (vol >= 0.35) {
        if (this.ambientFadeInterval) clearInterval(this.ambientFadeInterval);
      }
    }, 100);
  }

  stopAmbient() {
    if (this.ambientFadeInterval) {
      clearInterval(this.ambientFadeInterval);
      this.ambientFadeInterval = null;
    }
    if (this.ambientGain) {
      const gain = this.ambientGain;
      const source = this.ambientSource;
      let vol = gain.gain.value;
      const fadeOut = setInterval(() => {
        vol = Math.max(vol - 0.03, 0);
        try { gain.gain.value = vol; } catch {}
        if (vol <= 0) {
          clearInterval(fadeOut);
          try { source?.stop(); } catch {}
        }
      }, 50);
    }
    this.ambientSource = null;
    this.ambientGain = null;
  }

  stopAll() {
    if (this.ambientFadeInterval) {
      clearInterval(this.ambientFadeInterval);
      this.ambientFadeInterval = null;
    }
    try { this.sfxSource?.stop(); } catch {}
    this.sfxSource = null;
    try { this.ambientSource?.stop(); } catch {}
    this.ambientSource = null;
    this.ambientGain = null;
  }
}

interface StoryChapter {
  title: string;
  narrator: "geobuddy" | "ari" | "both";
  content: string;
}

interface StoryData {
  id: string;
  cityId: string;
  title: string;
  subtitle: string;
  seasonNumber: number;
  episodeNumber: number;
  durationSeconds: number;
  summary: string;
  storyScript: StoryChapter[];
  releaseDate: string;
  coverImageUrl: string | null;
  cityName: string;
  countryName: string;
  cityFlag: string;
  cityImageUrl: string | null;
  isCompleted: boolean;
}

export default function GeoBuddyStoryPlayer() {
  const [, params] = useRoute("/stories/:storyId");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { loadExplorers } = useExplorer();
  const storyId = params?.storyId;

  const [currentChapter, setCurrentChapter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, string>>(new Map());
  const chapterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sfxPlayerRef = useRef<StorySfxPlayer>(new StorySfxPlayer());

  const { data: story, isLoading } = useQuery<StoryData>({
    queryKey: ["/api/stories", storyId],
    queryFn: async () => {
      const res = await fetch(`/api/stories/${storyId}`);
      if (!res.ok) throw new Error("Failed to fetch story");
      return res.json();
    },
    enabled: !!storyId,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/stories/${storyId}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      setCompletionData(data);
      setShowCompletion(true);
      sfxPlayerRef.current.playSfx(STORY_SFX.mapSparkle);
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      if (user?.id) {
        loadExplorers(user.id);
      }
      window.dispatchEvent(new CustomEvent('geoquest:spin-earned', { detail: { reason: 'city_discovered' } }));
    },
  });

  const chapters = story?.storyScript || [];
  const totalChapters = chapters.length;
  const chapter = chapters[currentChapter];

  useEffect(() => {
    if (chapters.length > 0) {
      const allSfxUrls: string[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const sfx = getChapterSfx(i);
        if (sfx.pre) {
          if (Array.isArray(sfx.pre)) allSfxUrls.push(...sfx.pre);
          else allSfxUrls.push(sfx.pre);
        }
        const inlineSegments = parseInlineSfx(chapters[i].content);
        for (const seg of inlineSegments) {
          if (seg.type === 'sfx') allSfxUrls.push(seg.url);
        }
      }
      sfxPlayerRef.current.prefetchAll(allSfxUrls);
    }
  }, [chapters.length]);

  const isLastChapter = currentChapter === totalChapters - 1;

  const stopAudio = useCallback((keepAmbient = false) => {
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      try { audioRef.current.currentTime = 0; } catch {}
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (chapterTimerRef.current) {
      clearTimeout(chapterTimerRef.current);
      chapterTimerRef.current = null;
    }
    if (!keepAmbient) {
      sfxPlayerRef.current.stopAmbient();
    }
  }, []);

  const getNarratorVoice = (narrator: string): string => {
    switch (narrator) {
      case "geobuddy": return "eva";
      case "ari": return "avi";
      case "both": return "eva";
      default: return "eva";
    }
  };

  const fetchAndPlayAudio = useCallback(async (text: string, narrator: string, onEnd?: () => void) => {
    if (isMuted || !text) return;
    stopAudio(true);

    const contentHash = text.length.toString(36) + '-' + text.slice(0, 20).replace(/\W/g, '');
    const cacheKey = `${storyId}-${currentChapter}-${contentHash}`;
    let audioUrl = audioCache.current.get(cacheKey);

    if (!audioUrl) {
      setIsLoadingAudio(true);
      try {
        const voice = getNarratorVoice(narrator);
        const res = await fetch("/api/tts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text, voice }),
        });

        if (res.ok) {
          const blob = await res.blob();
          audioUrl = URL.createObjectURL(blob);
          audioCache.current.set(cacheKey, audioUrl);
        }
      } catch (err) {
        console.warn("Cloud TTS failed, falling back to browser TTS");
      }
      setIsLoadingAudio(false);
    }

    if (audioUrl) {
      const sfxPlayer = sfxPlayerRef.current;
      const ctx = sfxPlayer.audioContext;

      if (ctx && ctx.state !== 'closed') {
        try {
          if (ctx.state === 'suspended') await ctx.resume();
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          const sourceRef = { current: source };
          audioRef.current = { pause: () => { try { sourceRef.current?.stop(); } catch {} }, src: '' } as any;
          source.onended = () => {
            console.log('[TTS] Narration finished via AudioContext');
            onEnd?.();
          };
          console.log('[TTS] Playing narration via AudioContext');
          source.start(0);
        } catch (e) {
          console.warn('[TTS] AudioContext playback failed, trying HTMLAudio:', e);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => onEnd?.();
          audio.onerror = () => {
            console.warn("[TTS] Audio element error, falling back to browser TTS");
            fallbackBrowserTTS(text, onEnd);
          };
          audio.play().catch(() => {
            console.warn("[TTS] Audio play blocked, falling back to browser TTS");
            fallbackBrowserTTS(text, onEnd);
          });
        }
      } else {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => onEnd?.();
        audio.onerror = () => {
          console.warn("[TTS] Audio element error, falling back to browser TTS");
          fallbackBrowserTTS(text, onEnd);
        };
        audio.play().catch(() => {
          console.warn("[TTS] Audio play blocked, falling back to browser TTS");
          fallbackBrowserTTS(text, onEnd);
        });
      }
    } else {
      console.warn("[TTS] No cloud audio URL, using browser TTS");
      fallbackBrowserTTS(text, onEnd);
    }
  }, [isMuted, stopAudio, storyId, currentChapter]);

  const fallbackBrowserTTS = (text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("SpeechSynthesis not available");
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = stripVoiceMarkers(text);
    const MAX_CHUNK = 200;
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
      if ((current + sentence).length > MAX_CHUNK && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    let index = 0;
    const speakNext = () => {
      if (index >= chunks.length) {
        onEnd?.();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        index++;
        speakNext();
      };
      utterance.onerror = (e) => {
        console.warn("Browser TTS chunk error:", e);
        index++;
        speakNext();
      };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  };

  const advanceChapter = useCallback(() => {
    if (!chapters.length) return;
    if (currentChapter < totalChapters - 1) {
      setCurrentChapter(prev => prev + 1);
    } else {
      setIsPlaying(false);
      stopAudio();
      if (!story?.isCompleted && !showCompletion) {
        completeMutation.mutate();
      }
    }
  }, [currentChapter, totalChapters, chapters.length, stopAudio, story?.isCompleted, showCompletion, completeMutation]);

  useEffect(() => {
    let cancelled = false;

    if (isPlaying && chapter && !isMuted) {
      const sfx = getChapterSfx(currentChapter);
      const sfxPlayer = sfxPlayerRef.current;

      const playChapterAudio = async () => {
        if (sfx.pre) {
          const preSounds = Array.isArray(sfx.pre) ? sfx.pre : [sfx.pre];
          for (const sound of preSounds) {
            if (cancelled) return;
            const name = sound.split('/').pop();
            console.log('[SFX] Playing pre SFX:', name);
            await sfxPlayer.playSfx(sound);
          }
        }

        if (cancelled) return;

        const contentSegments = parseInlineSfx(chapter.content);
        const hasInlineSfx = contentSegments.some(s => s.type === 'sfx');

        if (hasInlineSfx) {
          console.log(`[SFX] Chapter has ${contentSegments.length} segments (${contentSegments.filter(s => s.type === 'sfx').length} inline SFX)`);
          for (let i = 0; i < contentSegments.length; i++) {
            if (cancelled) return;
            const seg = contentSegments[i];
            if (seg.type === 'sfx') {
              console.log(`[SFX] Playing inline: ${seg.name}`);
              await sfxPlayer.playSfx(seg.url);
            } else {
              await new Promise<void>((resolve) => {
                fetchAndPlayAudio(seg.text, chapter.narrator, () => resolve());
              });
            }
          }
          if (!cancelled) {
            chapterTimerRef.current = setTimeout(() => {
              advanceChapter();
            }, 500);
          }
        } else {
          fetchAndPlayAudio(chapter.content, chapter.narrator, async () => {
            if (!cancelled) {
              chapterTimerRef.current = setTimeout(() => {
                advanceChapter();
              }, 500);
            }
          });
        }
      };

      playChapterAudio();
    }
    return () => {
      cancelled = true;
      if (chapterTimerRef.current) {
        clearTimeout(chapterTimerRef.current);
      }
    };
  }, [isPlaying, currentChapter, isMuted]);

  useEffect(() => {
    return () => {
      stopAudio();
      sfxPlayerRef.current.stopAll();
      audioCache.current.forEach(url => URL.revokeObjectURL(url));
      audioCache.current.clear();
    };
  }, [stopAudio]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const unlock = new SpeechSynthesisUtterance("");
        unlock.volume = 0;
        window.speechSynthesis.speak(unlock);
        window.speechSynthesis.cancel();
      }
      sfxPlayerRef.current.unlock();
      soundManager.resumeContext();
      setIsPlaying(true);
    }
  };

  const goToPrevChapter = () => {
    sfxPlayerRef.current.unlock();
    stopAudio();
    if (currentChapter > 0) {
      setCurrentChapter(prev => prev - 1);
    }
  };

  const goToNextChapter = () => {
    sfxPlayerRef.current.unlock();
    stopAudio();
    advanceChapter();
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    sfxPlayerRef.current.setMuted(newMuted);
    if (newMuted) {
      stopAudio();
    }
    setIsMuted(newMuted);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-blue-200 dark:from-gray-900 dark:to-gray-800">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-100 to-blue-200 dark:from-gray-900 dark:to-gray-800 p-4">
        <p className="text-lg text-gray-600 dark:text-gray-300">Story not found</p>
        <Button onClick={() => navigate("/geobuddy-adventures")} className="mt-4" data-testid="button-back-to-library">
          Back to Adventures
        </Button>
      </div>
    );
  }

  const bgImage = story.cityImageUrl || (story.cityName ? getCityImage(story.cityName, "") : null);
  const progressPercent = totalChapters > 0 ? ((currentChapter + 1) / totalChapters) * 100 : 0;

  const getNarratorLabel = (narrator: string) => {
    switch (narrator) {
      case "geobuddy": return "GeoBuddy";
      case "ari": return "Ari";
      case "both": return "GeoBuddy & Ari";
      default: return "Narrator";
    }
  };

  const getNarratorColor = (narrator: string) => {
    switch (narrator) {
      case "geobuddy": return "from-blue-500 to-cyan-500";
      case "ari": return "from-amber-500 to-orange-500";
      case "both": return "from-purple-500 to-pink-500";
      default: return "from-gray-500 to-gray-600";
    }
  };

  if (showCompletion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-100 via-green-50 to-teal-100 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-800 p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="text-center max-w-md"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mb-6 flex justify-center"
          >
            <GeoBuddyCharacter pose="celebrating" size="xl" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-2" data-testid="text-city-discovered">
              City Discovered!
            </h2>
            <p className="text-lg text-emerald-700 dark:text-emerald-300 mb-1">
              {story.cityFlag} {story.cityName}
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-6">
              {completionData?.explorersUpdated > 0
                ? `Star 1 awarded to ${completionData.explorersUpdated} explorer${completionData.explorersUpdated > 1 ? "s" : ""}!`
                : "This city is now on your map!"}
            </p>
          </motion.div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/explorer-map?openCity=${story.cityId}`)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              data-testid="button-view-on-map"
            >
              <MapIcon className="w-4 h-4 mr-2" /> View on Explorer Map
            </Button>
            <Button
              onClick={() => navigate(`/mini-games?masteryCity=${story.cityId}&returnTo=explorer-map`)}
              variant="outline"
              className="w-full border-emerald-300 text-emerald-700 dark:text-emerald-300"
              data-testid="button-play-game"
            >
              <Gamepad2 className="w-4 h-4 mr-2" /> Play a Game
            </Button>
            <Button
              onClick={() => navigate("/geobuddy-adventures")}
              variant="ghost"
              className="w-full text-emerald-600 dark:text-emerald-400"
              data-testid="button-more-stories"
            >
              <BookOpen className="w-4 h-4 mr-2" /> More Stories
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-100 to-blue-200 dark:from-gray-900 dark:to-gray-800">
      <div className="relative h-48 overflow-hidden">
        {bgImage && (
          <img src={bgImage} alt={story.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-sky-100 dark:to-gray-900" />

        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { stopAudio(); navigate("/geobuddy-adventures"); }}
            className="text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm"
            data-testid="button-back-to-library"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Adventures
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm"
            data-testid="button-toggle-mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <p className="text-white/80 text-xs font-medium">
            Season {story.seasonNumber} — Episode {story.episodeNumber}
          </p>
          <h1 className="text-white text-xl font-bold leading-tight" data-testid="text-story-title">
            {story.title}
          </h1>
          <p className="text-white/70 text-xs">{story.subtitle}</p>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="flex items-center gap-1">
          {chapters.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                idx < currentChapter
                  ? "bg-blue-500"
                  : idx === currentChapter
                  ? "bg-blue-400"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center" data-testid="text-chapter-progress">
          Chapter {currentChapter + 1} of {totalChapters}
        </p>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentChapter}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-5 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              {chapter && (
                <>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 border-2 border-blue-200 dark:border-blue-700">
                    {chapter.narrator === "ari" ? "🧒" : chapter.narrator === "both" ? "🌍" : "🧭"}
                  </div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getNarratorColor(chapter.narrator)}`}>
                      {getNarratorLabel(chapter.narrator)}
                    </span>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1" data-testid="text-chapter-title">
                      {chapter.title}
                    </h3>
                  </div>
                </>
              )}
            </div>

            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed" data-testid="text-chapter-content">
              {chapter?.content ? stripVoiceMarkers(chapter.content) : ''}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevChapter}
            disabled={currentChapter === 0}
            className="rounded-full"
            data-testid="button-prev-chapter"
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            onClick={togglePlay}
            className={`rounded-full w-14 h-14 ${
              isPlaying
                ? "bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500"
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            } text-white shadow-lg`}
            data-testid="button-play-pause"
          >
            {isLoadingAudio ? <Loader2 className="w-6 h-6 animate-spin" /> : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextChapter}
            disabled={isLastChapter && story.isCompleted}
            className="rounded-full"
            data-testid="button-next-chapter"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {story.isCompleted && !showCompletion && (
          <div className="flex items-center justify-center gap-1 mt-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Story Completed</span>
          </div>
        )}
      </div>
    </div>
  );
}
