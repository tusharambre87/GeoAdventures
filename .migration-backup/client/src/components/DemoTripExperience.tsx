import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, ChevronRight, ChevronLeft, X, 
  Volume2, Camera, Lightbulb, Gamepad2, Check,
  Sparkles, Heart, Plane, ChevronDown, ChevronUp,
  Star, Play, Pause, Mic, MicOff
} from "lucide-react";
import { DEMO_TRIP, DEMO_STOP_PLACEHOLDER_IMAGES, type DemoStop } from "@/lib/demoTripData";
import { GeoBuddyCharacter } from "./GeoBuddyCharacter";

interface PendingDemoReflection {
  stopName: string;
  stopId: string;
  stopType: string;
}

interface DemoTripExperienceProps {
  onComplete: () => void;
  onExit: () => void;
  onCreateRealTrip: () => void;
}

function trackDemoEvent(event: string, data?: Record<string, any>) {
  try {
    const events = JSON.parse(localStorage.getItem('geoadventures-demo-analytics') || '[]');
    events.push({ event, timestamp: Date.now(), ...data });
    localStorage.setItem('geoadventures-demo-analytics', JSON.stringify(events.slice(-100)));
  } catch (e) {
    console.error('Failed to track demo event:', e);
  }
}

const STOP_TYPE_ICONS: Record<string, string> = {
  landmark: '🏛️',
  museum: '🖼️',
  nature: '🌿',
  beach: '🏖️',
  restaurant: '🍽️',
};

export function DemoTripExperience({ onComplete, onExit, onCreateRealTrip }: DemoTripExperienceProps) {
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [completedStops, setCompletedStops] = useState<string[]>([]);
  const [showKeepsakeScreen, setShowKeepsakeScreen] = useState(false);
  const [showPayoffScreen, setShowPayoffScreen] = useState(false);
  const [currentKeepsakeStop, setCurrentKeepsakeStop] = useState<DemoStop | null>(null);
  const [pendingReflection, setPendingReflection] = useState<PendingDemoReflection | null>(null);
  const [reflectionShownForStops, setReflectionShownForStops] = useState<string[]>([]);

  useEffect(() => {
    trackDemoEvent('demo_started');
  }, []);
  
  // Compute whether to show pending reflection SYNCHRONOUSLY (not in useEffect)
  // This ensures the reflection check happens BEFORE rendering the JourneyPack
  const shouldShowPendingReflection = (() => {
    if (selectedStopIndex === null || !pendingReflection) return false;
    const currentStop = DEMO_TRIP.stops[selectedStopIndex];
    // Show pending reflection if it's from a different stop and hasn't been shown for this stop yet
    return pendingReflection.stopId !== currentStop.id && !reflectionShownForStops.includes(currentStop.id);
  })();

  const handleStopComplete = (stop: DemoStop) => {
    setCompletedStops(prev => [...prev, stop.id]);
    setCurrentKeepsakeStop(stop);
    setSelectedStopIndex(null);
    setShowKeepsakeScreen(true);
    trackDemoEvent('stop_completed', { stopId: stop.id, stopName: stop.name });
    try { localStorage.setItem('geoadventures-user-engaged', 'true'); } catch(e) {}
  };

  const handleKeepsakeClose = () => {
    // Save pending reflection for the next stop
    if (currentKeepsakeStop) {
      setPendingReflection({
        stopName: currentKeepsakeStop.name,
        stopId: currentKeepsakeStop.id,
        stopType: currentKeepsakeStop.stopType
      });
    }
    
    setShowKeepsakeScreen(false);
    setCurrentKeepsakeStop(null);
    
    if (completedStops.length >= DEMO_TRIP.stops.length) {
      trackDemoEvent('demo_completed');
      setShowPayoffScreen(true);
      onComplete();
    }
  };
  
  const handlePendingReflectionClose = () => {
    // Mark this stop as having shown the reflection
    if (selectedStopIndex !== null) {
      const currentStop = DEMO_TRIP.stops[selectedStopIndex];
      setReflectionShownForStops(prev => [...prev, currentStop.id]);
    }
    setPendingReflection(null);
  };

  const handleCreateTrip = () => {
    trackDemoEvent('create_trip_after_demo');
    onCreateRealTrip();
  };

  const handleExplore = () => {
    trackDemoEvent('explore_later_after_demo');
    onExit();
  };

  if (showPayoffScreen) {
    return (
      <DemoPayoffScreen 
        onCreateTrip={handleCreateTrip}
        onExplore={handleExplore}
      />
    );
  }

  if (showKeepsakeScreen && currentKeepsakeStop) {
    return (
      <KeepsakeCompletionScreen
        stop={currentKeepsakeStop}
        onClose={handleKeepsakeClose}
        isLastStop={completedStops.length >= DEMO_TRIP.stops.length}
      />
    );
  }

  // Show pending reflection from previous stop FIRST
  if (selectedStopIndex !== null && shouldShowPendingReflection && pendingReflection) {
    return (
      <DemoGeoMomentReflection
        stopName={pendingReflection.stopName}
        onSave={() => {
          handlePendingReflectionClose();
          trackDemoEvent('demo_reflection_saved', { stopName: pendingReflection.stopName });
        }}
        onSkip={() => {
          handlePendingReflectionClose();
          trackDemoEvent('demo_reflection_skipped', { stopName: pendingReflection.stopName });
        }}
      />
    );
  }

  if (selectedStopIndex !== null) {
    return (
      <DemoJourneyPackPlayer
        stop={DEMO_TRIP.stops[selectedStopIndex]}
        onClose={() => setSelectedStopIndex(null)}
        onComplete={() => handleStopComplete(DEMO_TRIP.stops[selectedStopIndex])}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-sky-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <header className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={onExit} data-testid="button-exit-demo">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Exit Demo
          </Button>
          <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-3 py-1 rounded-full font-medium">
            Sample Adventure
          </span>
        </header>

        <div 
          className="rounded-3xl p-6 text-white mb-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="absolute top-4 right-4 text-6xl opacity-30"
          >
            <motion.span
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            >
              🗼
            </motion.span>
          </motion.div>
          
          <div className="relative z-10">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-3 mb-3"
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                className="text-4xl"
              >
                🥐
              </motion.span>
              <div>
                <h2 className="text-2xl font-bold">{DEMO_TRIP.name}</h2>
                <p className="opacity-90 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  {DEMO_TRIP.destination}
                </p>
              </div>
            </motion.div>
            
            <div className="flex items-center gap-4 text-sm opacity-80">
              <span>🧳 {DEMO_TRIP.travelers}</span>
              <span>📍 {DEMO_TRIP.stops.length} stops</span>
            </div>
          </div>
        </div>

        <Card className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧳</span>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Travel Keepsakes</h3>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {completedStops.length} of {DEMO_TRIP.stops.length} collected
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Exploration Spots</h3>
              <p className="text-sm text-muted-foreground">Places you'll explore on this trip</p>
            </div>
            <span className="text-sm text-muted-foreground">{DEMO_TRIP.stops.length} places</span>
          </div>

          <div className="space-y-3">
            {DEMO_TRIP.stops.map((stop, index) => {
              const isCompleted = completedStops.includes(stop.id);
              return (
                <motion.div
                  key={stop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : ''}`}
                    onClick={() => setSelectedStopIndex(index)}
                    data-testid={`stop-card-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">↕</span>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            {STOP_TYPE_ICONS[stop.stopType] || '📍'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{stop.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {stop.stopType} #{stop.displayOrder}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </span>
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <span className="text-lg">🧳</span>
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Complete all 3 stops to finish the sample adventure</p>
        </div>
      </div>
    </div>
  );
}

interface DemoJourneyPackPlayerProps {
  stop: DemoStop;
  onClose: () => void;
  onComplete: () => void;
}

function DemoJourneyPackPlayer({ stop, onClose, onComplete }: DemoJourneyPackPlayerProps) {
  const [expandedSection, setExpandedSection] = useState<string>('listen');
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [factsCompleted, setFactsCompleted] = useState(0);
  const [selectedGameAnswer, setSelectedGameAnswer] = useState<string | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const isPlayingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const markComplete = (section: string) => {
    if (!completedSections.includes(section)) {
      setCompletedSections(prev => [...prev, section]);
    }
  };

  const stopAudio = useCallback(() => {
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const handlePlayAudio = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentFactIndex(0);
    setFactsCompleted(0);

    const fullText = stop.listenFacts.join('\n\n');

    try {
      const response = await fetch('/api/demo/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, voice: 'eva' }),
      });

      if (!response.ok) throw new Error('TTS request failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setFactsCompleted(stop.listenFacts.length);
        setCurrentFactIndex(stop.listenFacts.length);
        markComplete('listen');
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        fallbackBrowserTTS();
      };

      await audio.play();
    } catch (err) {
      console.warn('Google Cloud TTS failed for demo, falling back to browser TTS:', err);
      fallbackBrowserTTS();
    }
  };

  const fallbackBrowserTTS = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      markComplete('listen');
      setIsPlaying(false);
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const speakFact = (index: number) => {
      if (!isPlayingRef.current) return;
      if (index >= stop.listenFacts.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        markComplete('listen');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(stop.listenFacts[index]);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        setCurrentFactIndex(index + 1);
        setFactsCompleted(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) markComplete('listen');
          return newCount;
        });
        setTimeout(() => { if (isPlayingRef.current) speakFact(index + 1); }, 500);
      };
      utterance.onerror = () => { isPlayingRef.current = false; setIsPlaying(false); };
      window.speechSynthesis.speak(utterance);
    };
    window.speechSynthesis.cancel();
    speakFact(0);
  };

  const allComplete = ['listen', 'wonder', 'parent_tip', 'game'].every(s => completedSections.includes(s));

  const sections = [
    { id: 'listen', icon: Volume2, title: 'Listen', subtitle: completedSections.includes('listen') ? 'Completed!' : 'Tap to expand' },
    { id: 'wonder', icon: Camera, title: 'Wonder', subtitle: completedSections.includes('wonder') ? 'Completed!' : 'Tap to expand' },
    { id: 'parent_tip', icon: Lightbulb, title: 'Parent Tip', subtitle: completedSections.includes('parent_tip') ? 'Completed!' : 'Tap to expand' },
    { id: 'game', icon: Gamepad2, title: 'Journey Games: Explore', subtitle: completedSections.includes('game') ? 'Completed!' : 'Tap to expand' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-purple-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="text-center mb-6">
          <button onClick={onClose} className="absolute left-4 top-4 p-2">
            <X className="w-6 h-6" />
          </button>
          <span className="text-4xl mb-2 block">⭐</span>
          <h1 className="text-xl font-bold">{stop.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            {STOP_TYPE_ICONS[stop.stopType] || '📍'} {stop.stopType}
          </p>
        </div>

        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-xl p-3 mb-6 text-center text-sm text-amber-800 dark:text-amber-200">
          🚗 Use this on the way to {stop.name}!
        </div>

        <div className="space-y-3">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            const isComplete = completedSections.includes(section.id);
            
            return (
              <Card 
                key={section.id}
                className={`overflow-hidden transition-all ${isComplete ? 'border-green-300 dark:border-green-700' : ''}`}
              >
                <button
                  className="w-full p-4 flex items-center gap-3 text-left"
                  onClick={() => setExpandedSection(isExpanded ? '' : section.id)}
                  data-testid={`section-${section.id}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isComplete ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {isComplete ? <Check className="w-5 h-5 text-green-600" /> : <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <CardContent className="pt-0 pb-4">
                        {section.id === 'listen' && (
                          <div className="space-y-4">
                            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
                              <h4 className="font-semibold mb-2">🎧 {stop.name} Adventure</h4>
                              <p className="text-sm text-muted-foreground mb-3">Tap play to hear fun facts!</p>
                              {stop.listenFacts.map((fact, i) => (
                                <p 
                                  key={i} 
                                  className={`text-sm mb-2 transition-all ${isPlaying && currentFactIndex === i ? 'bg-violet-100 dark:bg-violet-800/40 p-2 rounded-lg font-medium' : ''}`}
                                >
                                  {isPlaying && currentFactIndex === i && <span className="mr-1">🔊</span>}
                                  {fact}
                                </p>
                              ))}
                            </div>
                            <Button
                              onClick={handlePlayAudio}
                              className="w-full bg-gradient-to-r from-orange-400 to-pink-500"
                              data-testid="button-play-audio"
                            >
                              {isPlaying ? (
                                <div className="flex items-center gap-2">
                                  <Pause className="w-5 h-5" />
                                  Stop
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Play className="w-5 h-5" />
                                  {completedSections.includes('listen') ? 'Play Again' : 'Play Audio'}
                                </div>
                              )}
                            </Button>
                          </div>
                        )}

                        {section.id === 'wonder' && (
                          <div className="space-y-4">
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                              <p className="text-lg font-medium text-purple-800 dark:text-purple-200">
                                What do you think makes this place special?
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {['🌿 nature', '🦒 animals', '📜 history', '😮 it\'s huge', '✨ it\'s beautiful'].map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => markComplete('wonder')}
                                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                                  data-testid={`tag-${tag}`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-center text-muted-foreground italic">"{stop.wonderPrompt}"</p>
                          </div>
                        )}

                        {section.id === 'parent_tip' && (
                          <div className="space-y-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                              <p className="text-sm">{stop.parentTip}</p>
                            </div>
                            <Button
                              onClick={() => markComplete('parent_tip')}
                              variant="outline"
                              className="w-full"
                              data-testid="button-read-tip"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Got it!
                            </Button>
                          </div>
                        )}

                        {section.id === 'game' && (
                          <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                              <h4 className="font-semibold mb-2">🎮 {stop.journeyGame.title}</h4>
                              <p className="text-sm mb-3">{stop.journeyGame.question}</p>
                              {stop.journeyGame.options && !selectedGameAnswer && (
                                <div className="space-y-2">
                                  {stop.journeyGame.options.map((option, i) => (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        setSelectedGameAnswer(option);
                                        const isBuildIt = stop.journeyGame.type === 'build_it';
                                        const isCorrect = isBuildIt || option === stop.journeyGame.correctAnswer;
                                        if (!isCorrect) {
                                          setShowCorrectAnswer(true);
                                        } else {
                                          markComplete('game');
                                        }
                                      }}
                                      className="w-full p-3 text-left bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                                      data-testid={`game-option-${i}`}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {selectedGameAnswer && (
                                <div className="space-y-3">
                                  {stop.journeyGame.type === 'build_it' ? (
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-center">
                                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                                        🎨 Great imagination! "{selectedGameAnswer}" sounds amazing!
                                      </span>
                                    </div>
                                  ) : selectedGameAnswer === stop.journeyGame.correctAnswer ? (
                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                                      <span className="text-green-700 dark:text-green-300 font-medium">
                                        ✓ Correct! Great job!
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                                        <span className="text-red-600 dark:text-red-400 text-sm">
                                          Not quite! Your answer: {selectedGameAnswer}
                                        </span>
                                      </div>
                                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                                        <span className="text-green-700 dark:text-green-300 font-medium">
                                          ✓ The correct answer is: {stop.journeyGame.correctAnswer}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {!completedSections.includes('game') && (
                                    <Button
                                      onClick={() => markComplete('game')}
                                      className="w-full bg-amber-500 hover:bg-amber-600"
                                      data-testid="button-continue-game"
                                    >
                                      OK, Continue
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Save a Moment
          </Button>
          <Button
            className={`flex-1 ${allComplete ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={onComplete}
            disabled={!allComplete}
            data-testid="button-complete-stop"
          >
            {allComplete ? (
              <>
                <Star className="w-4 h-4 mr-2" />
                Done!
              </>
            ) : (
              `${completedSections.length}/4`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function KeepsakeCompletionScreen({ stop, onClose, isLastStop }: {
  stop: DemoStop;
  onClose: () => void;
  isLastStop: boolean;
}) {
  const stopImage = DEMO_STOP_PLACEHOLDER_IMAGES[stop.id];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="w-32 h-32 mx-auto rounded-2xl overflow-hidden shadow-lg border-4 border-amber-400"
        >
          <img 
            src={stopImage} 
            alt={stop.name}
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        <div className="space-y-2">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-slate-600 dark:text-slate-400"
          >
            You listened. You noticed. You played.
          </motion.p>
          
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-slate-800 dark:text-slate-100"
          >
            You earned a travel keepsake!
          </motion.h2>
        </div>

        <Card className="bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-3xl">
                {STOP_TYPE_ICONS[stop.stopType] || '📍'}
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg">{stop.name}</h3>
                <p className="text-sm text-muted-foreground">
                  This keepsake represents your time at this place.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-amber-600 dark:text-amber-400 italic"
        >
          "This moment is saved forever in your travel collection."
        </motion.p>
        
        <Button 
          onClick={onClose}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          data-testid="button-continue-adventure"
        >
          {isLastStop ? (
            <>
              Complete Adventure <Sparkles className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Continue Adventure <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

// Reflection prompts for demo
const DEMO_REFLECTION_PROMPTS = [
  "What was your favorite thing about this place?",
  "Did anything surprise you at this place?",
  "What will you remember about this place?",
  "What made you smile at this stop?",
];

function DemoGeoMomentReflection({ stopName, onSave, onSkip }: {
  stopName: string;
  onSave: () => void;
  onSkip: () => void;
}) {
  const [response, setResponse] = useState("");
  const [prompt] = useState(() => DEMO_REFLECTION_PROMPTS[Math.floor(Math.random() * DEMO_REFLECTION_PROMPTS.length)]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 overflow-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="w-20 h-20 mx-auto"
        >
          <GeoBuddyCharacter state="wondering" size="lg" autoHide={false} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            GeoMoment Reflection
          </h2>
          <p className="text-sm text-muted-foreground">
            at {stopName}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 shadow-lg"
        >
          <p className="text-lg font-medium text-purple-800 dark:text-purple-200 mb-4">
            {prompt}
          </p>
          
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Tell us what you think..."
            className="min-h-[120px] text-base mb-4"
            data-testid="input-reflection-response"
          />
          
          <p className="text-xs text-muted-foreground italic mb-4">
            This is a demo - in a real trip, your reflections are saved!
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <Button 
            variant="outline" 
            onClick={onSkip}
            className="flex-1"
            data-testid="button-skip-reflection"
          >
            Skip
          </Button>
          <Button 
            onClick={onSave}
            className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            data-testid="button-save-reflection"
          >
            Continue
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function DemoPayoffScreen({ onCreateTrip, onExplore }: {
  onCreateTrip: () => void;
  onExplore: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-100 via-purple-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <Heart className="w-12 h-12 text-white" />
        </div>
        
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            This is how trips become stories.
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400">
            Your child didn't just see places —
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            they noticed, wondered, and played.
          </p>
        </div>
        
        <Card className="bg-white/80 dark:bg-slate-800/80">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Memory Moments</h3>
            <div className="flex justify-around text-center">
              <div>
                <span className="text-2xl block mb-1">🧳</span>
                <span className="text-xs text-muted-foreground">3 Keepsakes</span>
              </div>
              <div>
                <Lightbulb className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                <span className="text-xs text-muted-foreground">3 Prompts</span>
              </div>
              <div>
                <Gamepad2 className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                <span className="text-xs text-muted-foreground">3 Games</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-xs text-muted-foreground italic">
          This is a preview. Create a real trip to save your memories.
        </p>
        
        <div className="space-y-3 pt-4">
          <Button 
            onClick={onCreateTrip}
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-base font-semibold"
            data-testid="button-create-real-trip"
          >
            <Plane className="w-5 h-5 mr-2" />
            Create My First Real Trip
          </Button>
          
          <Button 
            onClick={onExplore}
            variant="ghost"
            className="w-full text-slate-500"
            data-testid="button-explore-later"
          >
            Explore GeoAdventures Later
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
