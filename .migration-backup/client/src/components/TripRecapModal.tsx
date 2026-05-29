import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, Star, BookOpen, Camera, Sparkles, ChevronLeft, ChevronRight, 
  Quote, MapPin, RefreshCw, Loader2, Heart, Volume2, VolumeX, Pause, Play, Video
} from "lucide-react";
import type { TripStory, TravelTrip, TravelMoment, TravelStop } from "@shared/schema";
import confetti from "canvas-confetti";
import { getRandomCompletionInsight, getCategoryBg, getCategoryColor, type ParentInsight } from "@/lib/parentInsights";
import { ExplorerInsightCard } from "./ExplorerInsightCard";
import { TripVideoGenerator } from "./TripVideoGenerator";
import { TripCollageGenerator } from "./TripCollageGenerator";
import DOMPurify from "dompurify";

interface TripRecapModalProps {
  trip: TravelTrip;
  story: TripStory | null;
  moments: TravelMoment[];
  stops?: TravelStop[];
  isLoading?: boolean;
  onClose: () => void;
  onRegenerate?: () => void;
  onSaveStory?: () => Promise<void>;
  explorerId?: string;
  explorerName?: string;
  explorerAge?: string;
}

const MEMORY_STRENGTH_CONFIG = {
  strong: { emoji: "💪", label: "Strong Memories", color: "from-green-500 to-emerald-500", stars: 3 },
  medium: { emoji: "🌟", label: "Good Memories", color: "from-yellow-500 to-orange-500", stars: 2 },
  light: { emoji: "✨", label: "Growing Memories", color: "from-blue-400 to-sky-500", stars: 1 },
};

export function TripRecapModal({ trip, story, moments, stops = [], isLoading, onClose, onRegenerate, onSaveStory, explorerId, explorerName, explorerAge }: TripRecapModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [showCollageGenerator, setShowCollageGenerator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(trip.storySaved === true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Sync isSaved state when trip prop changes
  useEffect(() => {
    setIsSaved(trip.storySaved === true);
  }, [trip.storySaved]);
  
  const photos = (() => {
    const seen = new Set<string>();
    const result: string[] = [];
    
    for (const m of moments) {
      const urls: string[] = [];
      if (m.photoUrl) urls.push(m.photoUrl);
      
      if (Array.isArray(m.photoUrls)) {
        urls.push(...m.photoUrls.filter((u): u is string => typeof u === 'string'));
      } else if (typeof m.photoUrls === 'string' && m.photoUrls) {
        try {
          const parsed = JSON.parse(m.photoUrls);
          if (Array.isArray(parsed)) {
            urls.push(...parsed.filter((u): u is string => typeof u === 'string'));
          }
        } catch {}
      }
      
      for (const url of urls) {
        if (url && !seen.has(url)) {
          seen.add(url);
          result.push(url);
        }
      }
    }
    return result;
  })();
  const memoryConfig = MEMORY_STRENGTH_CONFIG[story?.memoryStrength as keyof typeof MEMORY_STRENGTH_CONFIG] || MEMORY_STRENGTH_CONFIG.light;

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const handlePlayStory = () => {
    if (!story?.storyHtml) return;
    
    if (isPaused && utteranceRef.current) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();
    
    const text = stripHtml(story.storyHtml);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Karen') || v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePauseStory = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStopStory = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);
  
  useEffect(() => {
    if (story && !showCelebration) {
      setShowCelebration(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF69B4', '#FFD700', '#87CEEB', '#98FB98', '#DDA0DD']
      });
    }
  }, [story]);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-purple-100 via-pink-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-white/50 hover:bg-white/80"
            data-testid="button-close-recap"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoGenerator(!showVideoGenerator)}
              className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
              data-testid="button-toggle-video"
            >
              <Video className="w-4 h-4" />
              {showVideoGenerator ? "Hide Video" : "Make Video"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCollageGenerator(!showCollageGenerator)}
              className="gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
              data-testid="button-toggle-collage"
            >
              <Camera className="w-4 h-4" />
              {showCollageGenerator ? "Hide Collage" : "Collage"}
            </Button>
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <Sparkles className="w-16 h-16 text-purple-500" />
            </motion.div>
            <p className="text-lg font-medium mt-4">Creating your family story...</p>
            <p className="text-sm text-muted-foreground mt-2">This might take a moment</p>
          </div>
        ) : story ? (
          <>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center mb-8"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-6xl mb-4"
              >
                📖
              </motion.div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {story.title}
              </h1>
              <p className="text-muted-foreground">{trip.destination}</p>
            </motion.div>

            <AnimatePresence>
              {showVideoGenerator && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <TripVideoGenerator 
                    trip={trip} 
                    moments={moments}
                    stops={stops}
                    onClose={() => setShowVideoGenerator(false)} 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCollageGenerator && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <TripCollageGenerator 
                    trip={trip} 
                    moments={moments}
                    stops={stops}
                    onClose={() => setShowCollageGenerator(false)} 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <Card className={`bg-gradient-to-r ${memoryConfig.color} text-white shadow-lg`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{memoryConfig.emoji}</span>
                    <div>
                      <p className="font-bold">{memoryConfig.label}</p>
                      <p className="text-sm opacity-90">Based on your moments & reflections</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${i < memoryConfig.stars ? 'fill-white text-white' : 'text-white/30'}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {photos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <Card className="overflow-hidden">
                  <div className="relative">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentPhotoIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        src={photos[currentPhotoIndex]}
                        alt={`Memory ${currentPhotoIndex + 1}`}
                        className="w-full h-64 object-cover"
                      />
                    </AnimatePresence>
                    
                    {photos.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={prevPhoto}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={nextPhoto}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                    
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {photos.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm">{photos.length} memories captured</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <Card className="bg-white/80 dark:bg-slate-800/80">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      <h2 className="text-lg font-bold">Our Story</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPlaying ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePauseStory}
                          className="gap-1 text-purple-600"
                          data-testid="button-pause-story"
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePlayStory}
                          className="gap-1 text-purple-600"
                          data-testid="button-play-story"
                        >
                          <Volume2 className="w-4 h-4" />
                          {isPaused ? 'Resume' : 'Listen'}
                        </Button>
                      )}
                      {(isPlaying || isPaused) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleStopStory}
                          className="text-muted-foreground h-8 w-8"
                          data-testid="button-stop-story"
                        >
                          <VolumeX className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.storyHtml) }}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {trip.memoryAnchor && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mb-6"
              >
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Your Memory
                </h3>
                <Card className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-pink-200 dark:border-pink-800">
                  <CardContent className="p-4">
                    {trip.memoryPrompt && (
                      <p className="text-xs text-pink-600 dark:text-pink-400 mb-2">{trip.memoryPrompt}</p>
                    )}
                    <p className="italic text-sm">"{trip.memoryAnchor}"</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {story.highlights && Array.isArray(story.highlights) && (story.highlights as string[]).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-6"
              >
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Highlights
                </h3>
                <div className="space-y-2">
                  {(story.highlights as string[]).map((highlight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-start gap-3 bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
                    >
                      <span className="text-xl">✨</span>
                      <p className="text-sm">{highlight}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {moments.filter(m => m.kidPromptResponse).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-6"
              >
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Quote className="w-5 h-5 text-pink-500" />
                  Family Voices
                </h3>
                <div className="space-y-3">
                  {moments.filter(m => m.kidPromptResponse).slice(0, 5).map((moment, i) => (
                    <motion.div
                      key={moment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      <Card className="bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800">
                        <CardContent className="p-4">
                          <p className="italic text-sm mb-2">"{moment.kidPromptResponse}"</p>
                          <p className="text-xs text-pink-600 dark:text-pink-400">— Kid's voice</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {story.geoFactsUsed && Array.isArray(story.geoFactsUsed) && (story.geoFactsUsed as string[]).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-6"
              >
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-500" />
                  Geography Facts We Learned
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {(story.geoFactsUsed as string[]).slice(0, 4).map((fact, i) => (
                    <Card key={i} className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-3 flex items-start gap-2">
                        <span className="text-lg">🌍</span>
                        <p className="text-sm">{fact}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {explorerId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="mb-6"
              >
                <ExplorerInsightCard 
                  explorerId={explorerId}
                  explorerName={explorerName}
                  explorerAge={explorerAge}
                />
              </motion.div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-lg font-medium">No story yet</p>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Complete your trip to generate your Family Lore story!
            </p>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-transparent">
          <div className="max-w-2xl mx-auto space-y-2">
            {onSaveStory && !isSaved && (
              <Button
                size="lg"
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await onSaveStory();
                    setIsSaved(true);
                  } catch (error) {
                    // Error is already handled in the parent, just stop saving
                    console.error("Failed to save story:", error);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                data-testid="button-save-story"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving Story...
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5 mr-2" />
                    Save My Story
                  </>
                )}
              </Button>
            )}
            {isSaved && (
              <div className="text-center text-green-600 dark:text-green-400 text-sm font-medium py-2">
                ✓ Story saved! You can read it anytime from your adventure.
              </div>
            )}
            <Button
              size="lg"
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              data-testid="button-done-recap"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Done Reading
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
