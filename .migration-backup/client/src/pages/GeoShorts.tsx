import { useState, useEffect, useRef, useCallback, Component, ReactNode } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RotateCcw, ChevronRight, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GEO_SHORTS, GeoShort, GeoShortFact } from '@/lib/geoShortsData';
import { soundManager } from '@/lib/sound';
import { cn } from '@/lib/utils';
import Globe3D from 'react-globe.gl';

type ViewMode = 'library' | 'player';

// Static fallback background when WebGL is not supported
const StaticGlobeFallback = () => (
  <div 
    className="absolute inset-0 flex items-center justify-center"
    style={{
      background: 'radial-gradient(ellipse at center, #1e3a5f 0%, #0f172a 70%, #020617 100%)'
    }}
    data-testid="globe-fallback"
  >
    <div className="relative">
      <div className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-blue-400 via-green-500 to-blue-600 opacity-30 blur-xl animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Globe className="w-32 h-32 md:w-48 md:h-48 text-blue-300/50" />
      </div>
    </div>
  </div>
);

// Error boundary to catch WebGL failures and render fallback
interface GlobeErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface GlobeErrorBoundaryState {
  hasError: boolean;
}

class GlobeErrorBoundary extends Component<GlobeErrorBoundaryProps, GlobeErrorBoundaryState> {
  constructor(props: GlobeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GlobeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('GeoShorts: WebGL not available, using fallback', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Check if WebGL is supported
function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

export default function GeoShorts() {
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  const [currentShortIndex, setCurrentShortIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showGlobe, setShowGlobe] = useState(true);
  const [globeReady, setGlobeReady] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  
  // Check WebGL support on mount
  useEffect(() => {
    setWebglSupported(isWebGLSupported());
  }, []);
  
  const globeRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const factTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentShort = GEO_SHORTS[currentShortIndex];
  const currentFact = currentShort?.facts[currentFactIndex];
  const factDuration = (currentShort?.duration || 25) / (currentShort?.facts.length || 5);

  const speakFact = useCallback((fact: GeoShortFact) => {
    if (!isMuted) {
      // Resume audio context first (required for user gesture)
      soundManager.resumeContext();
      soundManager.stopSpeaking();
      soundManager.speak(fact.text);
    }
  }, [isMuted]);

  // Zoom globe to fact-specific coordinates when fact changes
  const zoomToFact = useCallback((fact: GeoShortFact, shortLocation: GeoShort['location']) => {
    if (!globeRef.current) return;
    
    const location = fact.location || shortLocation;
    globeRef.current.pointOfView({
      lat: location.lat,
      lng: location.lng,
      altitude: location.altitude || 1.8,
    }, 1200); // Smooth 1.2s transition
  }, []);

  const resetPlayback = useCallback(() => {
    setCurrentFactIndex(0);
    setProgress(0);
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (factTimerRef.current) clearTimeout(factTimerRef.current);
    soundManager.stopSpeaking();
  }, []);

  const startPlayback = useCallback(() => {
    if (!currentShort) return;
    
    // Resume audio context on user gesture
    soundManager.resumeContext();
    
    setIsPlaying(true);
    setCurrentFactIndex(0);
    setProgress(0);
    
    // Zoom to first fact's location
    const firstFact = currentShort.facts[0];
    if (firstFact) {
      zoomToFact(firstFact, currentShort.location);
      // Small delay to let zoom start, then speak
      setTimeout(() => speakFact(firstFact), 500);
    }
  }, [currentShort, speakFact, zoomToFact]);

  useEffect(() => {
    if (!isPlaying || !currentShort) return;

    const totalDuration = currentShort.duration * 1000;
    const factCount = currentShort.facts.length;
    const factDurationMs = totalDuration / factCount;
    const progressInterval = 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (progressInterval / totalDuration) * 100;
        if (newProgress >= 100) {
          setIsPlaying(false);
          soundManager.stopSpeaking();
          return 100;
        }
        return newProgress;
      });
    }, progressInterval);

    factTimerRef.current = setTimeout(function advanceFact() {
      setCurrentFactIndex(prev => {
        const next = prev + 1;
        if (next < factCount) {
          const nextFact = currentShort.facts[next];
          // Zoom to next fact's location
          zoomToFact(nextFact, currentShort.location);
          // Small delay to sync with zoom, then speak
          setTimeout(() => speakFact(nextFact), 300);
          factTimerRef.current = setTimeout(advanceFact, factDurationMs);
          return next;
        }
        return prev;
      });
    }, factDurationMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (factTimerRef.current) clearTimeout(factTimerRef.current);
    };
  }, [isPlaying, currentShort, speakFact, zoomToFact]);

  useEffect(() => {
    return () => {
      soundManager.stopSpeaking();
      if (timerRef.current) clearInterval(timerRef.current);
      if (factTimerRef.current) clearTimeout(factTimerRef.current);
    };
  }, []);

  const handleSelectShort = (index: number) => {
    setCurrentShortIndex(index);
    setViewMode('player');
    resetPlayback();
    setShowGlobe(true);
  };

  const handleNextShort = () => {
    const nextIndex = (currentShortIndex + 1) % GEO_SHORTS.length;
    setCurrentShortIndex(nextIndex);
    resetPlayback();
  };

  const handlePrevShort = () => {
    const prevIndex = (currentShortIndex - 1 + GEO_SHORTS.length) % GEO_SHORTS.length;
    setCurrentShortIndex(prevIndex);
    resetPlayback();
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      soundManager.stopSpeaking();
      if (timerRef.current) clearInterval(timerRef.current);
      if (factTimerRef.current) clearTimeout(factTimerRef.current);
    } else {
      if (progress >= 100) {
        resetPlayback();
        setTimeout(startPlayback, 100);
      } else if (progress === 0) {
        startPlayback();
      } else {
        setIsPlaying(true);
        if (currentFact) speakFact(currentFact);
      }
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      soundManager.stopSpeaking();
    }
  };

  if (viewMode === 'library') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-back-home">
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-heading flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-yellow-400" />
                GeoShorts
              </h1>
              <p className="text-purple-200 text-sm">Quick geography facts that amaze!</p>
            </div>
          </div>

          <div className="space-y-3">
            {GEO_SHORTS.map((short, index) => (
              <motion.button
                key={short.id}
                onClick={() => handleSelectShort(index)}
                className="w-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-4 text-left hover:border-yellow-400/50 transition-all group"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                data-testid={`card-geoshort-${short.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-3xl shrink-0">
                    {short.thumbnail}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight mb-0.5 group-hover:text-yellow-300 transition-colors">
                      {short.title}
                    </h3>
                    <p className="text-sm text-purple-200 line-clamp-1">
                      {short.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-purple-300">
                      <Globe className="w-3 h-3" />
                      <span>{short.location.name}</span>
                      <span className="text-purple-500">•</span>
                      <span>{short.duration}s</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-400/20 text-yellow-300">
                      {short.category}
                    </span>
                    <ChevronRight className="w-5 h-5 text-purple-400 group-hover:text-yellow-400 transition-colors" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-8 text-center text-purple-300 text-sm">
            <p>More shorts coming soon! 🌍✨</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        {webglSupported && showGlobe ? (
          <GlobeErrorBoundary fallback={<StaticGlobeFallback />}>
            <Globe3D
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              width={typeof window !== 'undefined' ? window.innerWidth : 800}
              height={typeof window !== 'undefined' ? window.innerHeight : 600}
              animateIn={true}
              onGlobeReady={() => {
                setGlobeReady(true);
                if (globeRef.current && currentShort?.location) {
                  globeRef.current.pointOfView({
                    lat: currentShort.location.lat,
                    lng: currentShort.location.lng,
                    altitude: currentShort.location.altitude || 2.0,
                  }, 0);
                }
              }}
            />
          </GlobeErrorBoundary>
        ) : (
          <StaticGlobeFallback />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header with back button and controls */}
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              resetPlayback();
              setViewMode('library');
            }}
            className="text-white hover:bg-white/10"
            data-testid="button-back-library"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          {/* Title in header */}
          <div className="text-center flex-1 px-4">
            <motion.h2
              key={currentShort.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg md:text-xl font-heading text-white truncate"
            >
              {currentShort.title}
            </motion.h2>
            <p className="text-purple-300 text-xs flex items-center justify-center gap-1">
              <Globe className="w-3 h-3" />
              {currentShort.location.name}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/10"
              data-testid="button-toggle-mute"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Main content - flex grow to push subtitle to bottom */}
        <div className="flex-1 relative">
          {/* Floating image for current fact - positioned in corner */}
          <AnimatePresence mode="wait">
            {currentFact?.image && (
              <motion.div
                key={`image-${currentShort.id}-${currentFactIndex}`}
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ duration: 0.5 }}
                className="absolute top-4 right-4 z-20"
              >
                <div className="relative w-32 h-24 md:w-48 md:h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-white/30">
                  <img 
                    src={currentFact.image} 
                    alt=""
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom section - Subtitle-style fact display */}
        <div className="px-4 pb-4">
          {/* Fact dots indicator */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {currentShort.facts.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentFactIndex
                    ? "w-6 bg-yellow-400"
                    : index < currentFactIndex
                    ? "bg-white/60"
                    : "bg-white/20"
                )}
              />
            ))}
          </div>

          {/* Subtitle-style fact card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentShort.id}-${currentFactIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl mx-auto mb-4"
            >
              {currentFact && (
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    {currentFact.emoji && (
                      <div className="text-3xl md:text-4xl shrink-0">{currentFact.emoji}</div>
                    )}
                    <p className="text-base md:text-lg font-medium leading-relaxed text-white">
                      {currentFact.highlight ? (
                        <>
                          {currentFact.text.split(currentFact.highlight).map((part, i, arr) => (
                            <span key={i}>
                              {part}
                              {i < arr.length - 1 && (
                                <span className="text-yellow-400 font-bold">{currentFact.highlight}</span>
                              )}
                            </span>
                          ))}
                        </>
                      ) : (
                        currentFact.text
                      )}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="w-full max-w-md mx-auto mb-4">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevShort}
              className="text-white hover:bg-white/10 w-12 h-12"
              data-testid="button-prev-short"
            >
              <SkipBack className="w-6 h-6" />
            </Button>

            <Button
              onClick={togglePlay}
              className={cn(
                "w-16 h-16 rounded-full",
                isPlaying
                  ? "bg-white/20 hover:bg-white/30"
                  : "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
              )}
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : progress >= 100 ? (
                <RotateCcw className="w-7 h-7" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextShort}
              className="text-white hover:bg-white/10 w-12 h-12"
              data-testid="button-next-short"
            >
              <SkipForward className="w-6 h-6" />
            </Button>
          </div>

          <div className="text-center mt-3 text-sm text-purple-300">
            {currentShortIndex + 1} of {GEO_SHORTS.length}
          </div>
        </div>
      </div>
    </div>
  );
}
