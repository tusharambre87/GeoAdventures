import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { getStopTypeEmoji } from "@/lib/travelAvatars";
import type { TravelStop } from "@shared/schema";

interface DontMissThis {
  highlights: string[];
  shortOnTime: string;
}

interface StoryPackData {
  title: string;
  mainStory: string;
  quickHits: string[];
  whoMadeThis: string;
  dontMissThis?: DontMissThis | null;
  curiousQuestion?: string;
  duration?: string;
}

type AudioTab = "mainStory" | "quickHits" | "whoMadeThis";

const TAB_CONFIG: { id: AudioTab; label: string; emoji: string }[] = [
  { id: "mainStory", label: "Main Story", emoji: "📖" },
  { id: "quickHits", label: "Quick Hits", emoji: "⚡" },
  { id: "whoMadeThis", label: "History", emoji: "🏛️" },
];

interface StoryPlayerLiteProps {
  stop: TravelStop;
  stopNumber: number;
  totalStops: number;
}

export function StoryPlayerLite({ stop, stopNumber, totalStops }: StoryPlayerLiteProps) {
  const [storyPack, setStoryPack] = useState<StoryPackData | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<AudioTab>("mainStory");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [narratorVoice, setNarratorVoice] = useState<'eva' | 'avi'>(() => {
    try {
      return (localStorage.getItem('geoquest_narrator_voice') as 'eva' | 'avi') || 'eva';
    } catch { return 'eva'; }
  });
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);

  const handleVoiceChange = (voice: 'eva' | 'avi') => {
    setNarratorVoice(voice);
    try { localStorage.setItem('geoquest_narrator_voice', voice); } catch {}
    setShowVoiceMenu(false);
    if (audioPlaying || audioPaused) {
      stopAudio();
    }
  };

  const serverAudioRef = useRef<HTMLAudioElement | null>(null);
  const serverAudioUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!stop.id) return;
    setIsLoadingStory(true);
    setStoryPack(null);

    const loadStory = async () => {
      try {
        const res = await apiRequest("POST", `/api/travel/stops/${stop.id}/generate-story`);
        const data: StoryPackData = await res.json();
        setStoryPack(data);
      } catch (err) {
        console.error("[StoryPlayerLite] Failed to load Story Pack:", err);
      } finally {
        setIsLoadingStory(false);
      }
    };
    loadStory();
  }, [stop.id, retryCount]);

  const stopAudio = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (serverAudioRef.current) {
      serverAudioRef.current.pause();
      serverAudioRef.current.onended = null;
      serverAudioRef.current.onerror = null;
      serverAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setAudioPlaying(false);
    setAudioPaused(false);
    setIsLoadingAudio(false);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
      if (serverAudioUrlRef.current) {
        URL.revokeObjectURL(serverAudioUrlRef.current);
      }
    };
  }, [stopAudio]);

  const cleanTextForTTS = (raw: string): string =>
    raw
      .replace(/\[(GEOBUDDY|ARI|CHORUS)\]\s*/gi, '')
      .replace(/\[long pause\]/gi, ' ... ')
      .replace(/\[pause\]/gi, ', ')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const fallbackBrowserTTS = useCallback((text: string, onEnded?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanTextForTTS(text));
    utterance.rate = 0.9;
    utterance.onend = () => {
      setAudioPlaying(false);
      setAudioPaused(false);
      onEnded?.();
    };
    window.speechSynthesis.speak(utterance);
    setAudioPlaying(true);
  }, []);

  const playAudioForText = useCallback(async (
    textToPlay: string,
    onEnded?: () => void
  ) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (navigator.onLine) {
      try {
        setIsLoadingAudio(true);
        const response = await fetch(`/api/travel/stops/${stop.id}/generate-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text: textToPlay, voice: narratorVoice }),
          signal: controller.signal
        });

        if (controller.signal.aborted) return;

        if (response.ok) {
          const audioBlob = await response.blob();
          if (controller.signal.aborted) return;

          if (serverAudioUrlRef.current) URL.revokeObjectURL(serverAudioUrlRef.current);
          const audioUrl = URL.createObjectURL(audioBlob);
          serverAudioUrlRef.current = audioUrl;

          const audio = new Audio(audioUrl);
          audio.volume = 1.0;
          serverAudioRef.current = audio;

          audio.onended = () => {
            setAudioPlaying(false);
            setAudioPaused(false);
            onEnded?.();
          };

          audio.onerror = () => {
            setAudioPlaying(false);
            setIsLoadingAudio(false);
            fallbackBrowserTTS(textToPlay, onEnded);
          };

          try {
            await audio.play();
            setAudioPlaying(true);
            setIsLoadingAudio(false);

            if ('mediaSession' in navigator) {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Story Pack',
                artist: 'GeoQuest',
                album: stop.name,
              });
              navigator.mediaSession.playbackState = 'playing';
            }
            return;
          } catch (playErr) {
            setIsLoadingAudio(false);
            fallbackBrowserTTS(textToPlay, onEnded);
            return;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      } finally {
        setIsLoadingAudio(false);
      }
    }

    fallbackBrowserTTS(textToPlay, onEnded);
  }, [stop.id, narratorVoice, fallbackBrowserTTS]);

  const getTextForTab = (tab: AudioTab): string => {
    if (!storyPack) return "";
    if (tab === "mainStory") return storyPack.mainStory || "";
    if (tab === "quickHits") return (storyPack.quickHits ?? []).join("\n\n");
    if (tab === "whoMadeThis") return storyPack.whoMadeThis || "";
    return "";
  };

  const playTab = useCallback(async (tab: AudioTab, autoAdvance = false) => {
    stopAudio();
    setActiveTab(tab);
    const text = getTextForTab(tab);
    if (!text) return;
    const onEnded = autoAdvance ? () => {
      const idx = TAB_CONFIG.findIndex(t => t.id === tab);
      if (idx < TAB_CONFIG.length - 1) {
        playTab(TAB_CONFIG[idx + 1].id, true);
      }
    } : undefined;
    await playAudioForText(text, onEnded);
  }, [storyPack, stopAudio, playAudioForText]);

  const togglePlayPause = useCallback(() => {
    // If audio is loading, cancel the in-flight request and restart — don't silently ignore the tap
    if (isLoadingAudio) {
      stopAudio();
      playTab(activeTab);
      return;
    }

    if (serverAudioRef.current && audioPlaying && !audioPaused) {
      serverAudioRef.current.pause();
      setAudioPlaying(false);
      setAudioPaused(true);
      return;
    }
    if (serverAudioRef.current && audioPaused) {
      serverAudioRef.current.play();
      setAudioPlaying(true);
      setAudioPaused(false);
      return;
    }
    if (audioPlaying && !audioPaused) {
      window.speechSynthesis.pause();
      setAudioPlaying(false);
      setAudioPaused(true);
      return;
    }
    if (audioPaused) {
      window.speechSynthesis.resume();
      setAudioPlaying(true);
      setAudioPaused(false);
      return;
    }

    playTab(activeTab);
  }, [audioPlaying, audioPaused, isLoadingAudio, activeTab, playTab, stopAudio]);

  const goToNextTab = () => {
    const idx = TAB_CONFIG.findIndex(t => t.id === activeTab);
    if (idx < TAB_CONFIG.length - 1) {
      playTab(TAB_CONFIG[idx + 1].id);
    }
  };

  const goToPrevTab = () => {
    const idx = TAB_CONFIG.findIndex(t => t.id === activeTab);
    if (idx > 0) {
      playTab(TAB_CONFIG[idx - 1].id);
    }
  };

  const activeTabIndex = TAB_CONFIG.findIndex(t => t.id === activeTab);
  const activeTranscriptText = storyPack ? getTextForTab(activeTab) : "";

  if (isLoadingStory) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mx-5 mt-4" data-testid="story-player-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Creating your Story Pack...</p>
        </div>
      </div>
    );
  }

  if (!storyPack) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mx-5 mt-4" data-testid="story-player-empty">
        <div className="text-center">
          <span className="text-3xl mb-2 block">🎧</span>
          <p className="text-sm text-gray-500 mb-1">Story Pack couldn't be loaded</p>
          <p className="text-xs text-gray-400 mb-4">This usually resolves in a moment</p>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-80"
            style={{ background: "#D4872B" }}
            data-testid="button-story-retry"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mt-4 space-y-3" data-testid="story-player-lite">
      {/* Main player card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getStopTypeEmoji(stop.stopType || "other")}</span>
            <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">
              Stop {stopNumber} of {totalStops} · Story Pack
            </p>
          </div>
          <h3 className="font-bold text-gray-900 text-lg" data-testid="text-story-title">
            {storyPack.title || `Story Pack: ${stop.name}`}
          </h3>
          {storyPack.duration && (
            <p className="text-xs text-gray-400 mt-0.5">{storyPack.duration}</p>
          )}
        </div>

        {/* Audio tab selector */}
        <div className="px-5 pb-2">
          <div className="flex gap-1.5 bg-gray-50 rounded-2xl p-1" data-testid="story-pack-tabs">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  playTab(tab.id, false);
                }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-center transition-all ${
                  activeTab === tab.id
                    ? "bg-white shadow-sm text-orange-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <span className="text-sm">{tab.emoji}</span>
                <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-5 py-4 px-5">
          <button
            onClick={goToPrevTab}
            disabled={activeTabIndex === 0}
            className={`p-2 rounded-full transition-colors ${activeTabIndex === 0 ? 'text-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}
            data-testid="button-prev-chapter"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {activeTranscriptText ? (
            <button
              onClick={togglePlayPause}
              disabled={isLoadingAudio}
              className="w-16 h-16 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-all disabled:opacity-70"
              data-testid="button-play-pause"
            >
              {isLoadingAudio ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : audioPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-1" />
              )}
            </button>
          ) : (
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 active:scale-95 transition-all"
              data-testid="button-story-section-retry"
              title="Tap to regenerate this section"
            >
              <span className="text-lg">↺</span>
              <span className="text-[9px] font-semibold leading-tight mt-0.5">Retry</span>
            </button>
          )}

          <button
            onClick={goToNextTab}
            disabled={activeTabIndex >= TAB_CONFIG.length - 1}
            className={`p-2 rounded-full transition-colors ${activeTabIndex >= TAB_CONFIG.length - 1 ? 'text-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}
            data-testid="button-next-chapter"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Empty tab notice */}
        {!activeTranscriptText && !isLoadingStory && (
          <p className="text-center text-xs text-gray-400 pb-3 px-5" data-testid="text-story-unavailable">
            Oops, our story teller is having some trouble, tap ↺ to try again
          </p>
        )}

        {/* Audio visualizer */}
        {audioPlaying && (
          <div className="flex items-center justify-center gap-1 pb-3">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-orange-400 rounded-full"
                animate={{ height: [8, 16 + Math.random() * 12, 8] }}
                transition={{ repeat: Infinity, duration: 0.6 + i * 0.1, ease: "easeInOut" }}
              />
            ))}
          </div>
        )}

        {/* Voice selector */}
        <div className="flex items-center justify-end px-5 pb-3 relative z-30">
          <div className="relative">
            <button
              onClick={() => setShowVoiceMenu(!showVoiceMenu)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-200 transition-colors"
              data-testid="button-voice-selector"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="capitalize font-medium">{narratorVoice}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showVoiceMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowVoiceMenu(false)} />
                <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden min-w-[120px]">
                  <button
                    onClick={() => handleVoiceChange('eva')}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 ${narratorVoice === 'eva' ? 'text-orange-600 font-medium' : 'text-gray-700'}`}
                    data-testid="button-voice-eva"
                  >
                    Eva
                    {narratorVoice === 'eva' && <span className="text-orange-500">✓</span>}
                  </button>
                  <button
                    onClick={() => handleVoiceChange('avi')}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 border-t border-gray-100 ${narratorVoice === 'avi' ? 'text-orange-600 font-medium' : 'text-gray-700'}`}
                    data-testid="button-voice-avi"
                  >
                    Avi
                    {narratorVoice === 'avi' && <span className="text-orange-500">✓</span>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Don't Miss This panel (text only, not audio) */}
      {storyPack.dontMissThis && storyPack.dontMissThis.highlights && storyPack.dontMissThis.highlights.length > 0 && (
        <div
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 shadow-sm overflow-hidden"
          data-testid="dont-miss-this-panel"
        >
          <div className="px-5 py-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-sm">⭐</span>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Don't Miss This
              </p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2">
            {storyPack.dontMissThis.highlights.map((highlight, i) => (
              <div key={i} className="flex items-start gap-2.5" data-testid={`dont-miss-highlight-${i}`}>
                <span className="text-amber-500 font-bold text-sm mt-0.5">•</span>
                <p className="text-sm text-gray-700 leading-snug">{highlight}</p>
              </div>
            ))}
            {storyPack.dontMissThis.shortOnTime && (
              <div
                className="mt-3 pt-3 border-t border-amber-100 rounded-xl bg-amber-100/50 px-3 py-2.5"
                data-testid="dont-miss-short-on-time"
              >
                <p className="text-xs font-semibold text-amber-700 mb-1">If you're short on time:</p>
                <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">
                  {storyPack.dontMissThis.shortOnTime}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Curious Question */}
      {storyPack.curiousQuestion && (
        <div
          className="bg-blue-50 rounded-2xl border border-blue-100 px-5 py-4"
          data-testid="curious-question-panel"
        >
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Think about this…</p>
          <p className="text-sm text-blue-800 font-medium leading-snug">{storyPack.curiousQuestion}</p>
        </div>
      )}

      {/* Transcript toggle */}
      <button
        onClick={() => setShowTranscript(!showTranscript)}
        className="flex items-center gap-2 text-orange-500 text-sm font-medium mx-1"
        data-testid="button-toggle-transcript"
      >
        {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showTranscript ? "Hide transcript" : "Show transcript"}
      </button>

      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mx-0 text-sm text-gray-600 leading-relaxed max-h-60 overflow-y-auto" data-testid="story-transcript">
              {activeTranscriptText || "No transcript available."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
