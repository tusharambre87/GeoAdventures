import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Lock, Mic, MicOff, ChevronRight, Sparkles, X, Loader2, Heart } from "lucide-react";
import { TravelTrip, TravelStop, TravelMoment } from "@shared/schema";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import confetti from "canvas-confetti";

interface FinishAdventureModalProps {
  trip: TravelTrip;
  stops: TravelStop[];
  moments: TravelMoment[];
  isHomeAdventure?: boolean;
  onClose: () => void;
  onFinished: () => void;
}

const MEMORY_ANCHOR_PROMPTS = [
  "What was your favorite moment from this adventure?",
  "One thing that surprised you today",
  "What will you remember most about this place?",
  "Something that made you smile on this trip",
  "A moment you want to remember forever"
];

export function FinishAdventureModal({
  trip,
  stops,
  moments,
  isHomeAdventure = false,
  onClose,
  onFinished
}: FinishAdventureModalProps) {
  const [currentStep, setCurrentStep] = useState<"confirm" | "memory" | "badge" | "saving">("confirm");
  const [memoryAnchor, setMemoryAnchor] = useState("");
  const [memoryPrompt] = useState(() => 
    MEMORY_ANCHOR_PROMPTS[Math.floor(Math.random() * MEMORY_ANCHOR_PROMPTS.length)]
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const visitedStops = stops.filter(s => s.isVisited);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognitionConstructor = (window as any).webkitSpeechRecognition;
      const recog = new SpeechRecognitionConstructor();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";
      
      recog.onresult = (event: any) => {
        const transcript = Array.from(event.results as any[])
          .map((result: any) => result[0].transcript)
          .join(" ");
        setMemoryAnchor(transcript);
      };
      
      recog.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };
      
      recog.onend = () => setIsRecording(false);
      setRecognition(recog);
    }
  }, []);

  useEffect(() => {
    if (currentStep === "badge") {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 }
        });
      }, 300);
    }
  }, [currentStep]);

  const toggleRecording = () => {
    if (!recognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleSaveMemory = () => {
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }
    setCurrentStep("badge");
  };

  const handleSkipMemory = () => {
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }
    setMemoryAnchor("");
    setCurrentStep("badge");
  };

  const handleFinishAdventure = async () => {
    setIsSaving(true);
    setCurrentStep("saving");
    
    try {
      await apiRequest("PATCH", `/api/travel/trips/${trip.id}`, {
        isLocked: true,
        status: "completed",
        completedAt: new Date().toISOString(),
        recapCompleted: true,
        memoryAnchor: memoryAnchor.trim() || null,
        memoryPrompt: memoryAnchor.trim() ? memoryPrompt : null
      });
      
      toast.success("Adventure memories saved forever!");
      onFinished();
    } catch (error) {
      console.error("Failed to finish adventure:", error);
      toast.error("Couldn't save memories. Please try again.");
      setCurrentStep("badge");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-amber-900/95 via-orange-900/95 to-red-900/95 overflow-auto"
    >
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
          data-testid="button-close-finish"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {currentStep === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center max-w-md"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center"
              >
                <Lock className="w-10 h-10 text-white" />
              </motion.div>
              
              <h1 className="text-2xl font-bold text-white mb-4">
                Finish This Adventure?
              </h1>
              
              <div className="bg-white/10 rounded-2xl p-4 mb-6">
                <p className="text-white/90 mb-3">
                  You've {isHomeAdventure ? 'explored' : 'visited'} <span className="font-bold text-amber-400">{visitedStops.length}</span> places and captured <span className="font-bold text-pink-400">{moments.length}</span> moments together.
                </p>
                <p className="text-white/70 text-sm">
                  Once finished, this adventure becomes a permanent memory. You won't be able to add more stops or moments.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => setCurrentStep("memory")}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-lg py-6"
                  data-testid="button-confirm-finish"
                >
                  <Sparkles className="w-5 h-5" />
                  Yes, Let's Finish!
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  data-testid="button-cancel-finish"
                >
                  Not Yet
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "memory" && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-md"
            >
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center"
                >
                  <Heart className="w-8 h-8 text-white" />
                </motion.div>
                <p className="text-white/60 text-sm">
                  One memory to keep (optional)
                </p>
              </div>
              
              <Card className="bg-white/10 border-white/20 mb-6">
                <CardContent className="p-6">
                  <p className="text-xl text-white font-medium mb-6 text-center">
                    {memoryPrompt}
                  </p>
                  
                  <div className="relative">
                    <textarea
                      value={memoryAnchor}
                      onChange={(e) => setMemoryAnchor(e.target.value)}
                      placeholder="Share a memory or skip..."
                      className="w-full min-h-[100px] p-4 rounded-xl bg-white/10 text-white placeholder:text-white/50 border border-white/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                      data-testid="textarea-memory-anchor"
                    />
                    
                    <Button
                      onClick={toggleRecording}
                      variant={isRecording ? "destructive" : "secondary"}
                      size="icon"
                      className={`absolute bottom-3 right-3 ${
                        isRecording ? "animate-pulse bg-red-500" : "bg-white/20 hover:bg-white/30"
                      }`}
                      data-testid="button-toggle-recording"
                    >
                      {isRecording ? (
                        <MicOff className="w-5 h-5 text-white" />
                      ) : (
                        <Mic className="w-5 h-5 text-white" />
                      )}
                    </Button>
                  </div>
                  
                  {isRecording && (
                    <p className="text-sm text-amber-400 mt-2 animate-pulse">
                      🎤 Listening... speak your memory!
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleSkipMemory}
                  className="flex-1 text-white/70 hover:text-white hover:bg-white/10"
                  data-testid="button-skip-memory"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleSaveMemory}
                  disabled={!memoryAnchor.trim()}
                  className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500"
                  data-testid="button-save-memory"
                >
                  <Heart className="w-4 h-4" />
                  Save Memory
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "badge" && (
            <motion.div
              key="badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center max-w-md"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.4, delay: 0.3 }}
                className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/30"
              >
                <div className="w-28 h-28 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-6xl">🧭</span>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  Congratulations, Explorer!
                </h2>
                <p className="text-white/80 mb-6">
                  You explored with curiosity and created wonderful memories together.
                </p>
              </motion.div>

              {memoryAnchor.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/10 rounded-2xl p-4 mb-6"
                >
                  <div className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-pink-400 flex-shrink-0 mt-1" />
                    <div className="text-left">
                      <p className="text-white/60 text-xs mb-1">Your memory</p>
                      <p className="text-white text-sm italic">"{memoryAnchor}"</p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white/10 rounded-2xl p-4 mb-8"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-3xl">
                    📖
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Story Weaver Badge</p>
                    <p className="text-white/70 text-sm">Created your adventure story</p>
                  </div>
                </div>
              </motion.div>
              
              <Button
                onClick={handleFinishAdventure}
                disabled={isSaving}
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-lg py-6"
                data-testid="button-save-finish"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving Memories...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Save My Adventure Forever
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {currentStep === "saving" && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <Loader2 className="w-16 h-16 text-amber-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-xl">Saving your adventure...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
