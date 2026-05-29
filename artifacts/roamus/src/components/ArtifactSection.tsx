import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Lock, CheckCircle, Camera, Headphones, HelpCircle, Search, X } from "lucide-react";
import type { TravelArtifact, TravelStop, TravelTrip, ExplorerCollectedArtifact } from "@shared/schema";
import { useExplorer } from "@/lib/explorerContext";
import { GeoBuddyCharacter } from "./GeoBuddyCharacter";

interface ArtifactSectionProps {
  stop: TravelStop;
  trip: TravelTrip;
  onArtifactCollected?: (artifact: TravelArtifact) => void;
  onRequestListen?: (artifact: TravelArtifact) => void;
  onRequestPhoto?: (artifact: TravelArtifact) => void;
  listenCompleted?: boolean;
}

type UnlockType = "listen" | "photo" | "find_icon" | "quiz";

const UNLOCK_ICONS: Record<UnlockType, typeof Headphones> = {
  listen: Headphones,
  photo: Camera,
  find_icon: Search,
  quiz: HelpCircle,
};

const UNLOCK_LABELS: Record<UnlockType, string> = {
  listen: "Listen to the story",
  photo: "Take a photo",
  find_icon: "Find the hidden treasure",
  quiz: "Answer a question",
};

const RARITY_COLORS: Record<string, string> = {
  common: "from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700",
  rare: "from-blue-200 to-purple-300 dark:from-blue-600 dark:to-purple-700",
  legendary: "from-amber-200 to-orange-300 dark:from-amber-500 dark:to-orange-600",
};

const RARITY_BORDER: Record<string, string> = {
  common: "border-slate-400",
  rare: "border-purple-500",
  legendary: "border-amber-500",
};

export function ArtifactSection({ stop, trip, onArtifactCollected, onRequestListen, onRequestPhoto, listenCompleted }: ArtifactSectionProps) {
  const { activeExplorer } = useExplorer();
  const [artifacts, setArtifacts] = useState<TravelArtifact[]>([]);
  const [collectedArtifactIds, setCollectedArtifactIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<TravelArtifact | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizError, setQuizError] = useState(false);
  const [showFindIcon, setShowFindIcon] = useState(false);
  const [foundIconPosition, setFoundIconPosition] = useState<{ x: number; y: number } | null>(null);
  const [celebrateArtifact, setCelebrateArtifact] = useState<TravelArtifact | null>(null);
  const [showKeepsakeOnboarding, setShowKeepsakeOnboarding] = useState(false);

  useEffect(() => {
    const storageKey = "geobuddy-keepsake-onboarding-shown";
    try {
      const hasSeenOnboarding = localStorage.getItem(storageKey);
      if (!hasSeenOnboarding && artifacts.length > 0) {
        setShowKeepsakeOnboarding(true);
        localStorage.setItem(storageKey, "true");
      }
    } catch {
    }
  }, [artifacts.length]);

  const dismissKeepsakeOnboarding = () => {
    setShowKeepsakeOnboarding(false);
  };

  useEffect(() => {
    fetchArtifacts();
  }, [stop.name, activeExplorer?.id]);

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      const artifactRes = await fetch(`/api/travel/artifacts/by-stop/${encodeURIComponent(stop.name)}`, { credentials: 'include' });
      const artifactsData: TravelArtifact[] = artifactRes.ok ? await artifactRes.json() : [];
      
      let collectedData: (ExplorerCollectedArtifact & { artifact: TravelArtifact })[] = [];
      if (activeExplorer?.id) {
        const collectedRes = await fetch(`/api/travel/artifacts/collected/${activeExplorer.id}/${trip.id}`, { credentials: 'include' });
        collectedData = collectedRes.ok ? await collectedRes.json() : [];
      }
      
      setArtifacts(artifactsData);
      setCollectedArtifactIds(new Set(collectedData.map(c => c.artifactId)));
    } catch (error) {
      console.error("Error fetching artifacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const collectArtifact = async (artifact: TravelArtifact, completionData?: any) => {
    if (!activeExplorer?.id) return;
    
    if (collectedArtifactIds.has(artifact.id)) {
      return;
    }
    
    try {
      const response = await fetch("/api/travel/artifacts/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          explorerId: activeExplorer.id,
          tripId: trip.id,
          stopId: stop.id,
          artifactId: artifact.id,
          completionData,
        }),
      });
      
      if (response.status === 409) {
        setCollectedArtifactIds(prev => new Set(Array.from(prev).concat([artifact.id])));
        setCelebrateArtifact(artifact);
        onArtifactCollected?.(artifact);
        setTimeout(() => setCelebrateArtifact(null), 3000);
        return;
      }
      
      if (!response.ok) {
        throw new Error("Failed to collect artifact");
      }
      
      setCollectedArtifactIds(prev => new Set(Array.from(prev).concat([artifact.id])));
      setCelebrateArtifact(artifact);
      onArtifactCollected?.(artifact);
      
      setTimeout(() => {
        setCelebrateArtifact(null);
      }, 3000);
    } catch (error) {
      console.error("Error collecting artifact:", error);
    }
  };

  const handleArtifactClick = (artifact: TravelArtifact) => {
    if (collectedArtifactIds.has(artifact.id)) {
      return;
    }
    
    setSelectedArtifact(artifact);
    
    switch (artifact.unlockType as UnlockType) {
      case "quiz":
        setQuizAnswer("");
        setQuizError(false);
        setShowQuizModal(true);
        break;
      case "find_icon":
        setFoundIconPosition({
          x: Math.random() * 60 + 20,
          y: Math.random() * 60 + 20,
        });
        setShowFindIcon(true);
        break;
      case "listen":
        if (listenCompleted) {
          collectArtifact(artifact, { completedAt: new Date().toISOString() });
        } else if (onRequestListen) {
          onRequestListen(artifact);
        }
        break;
      case "photo":
        collectArtifact(artifact, { capturedAt: new Date().toISOString() });
        if (onRequestPhoto) {
          onRequestPhoto(artifact);
        }
        break;
    }
  };

  const handleQuizSubmit = () => {
    if (!selectedArtifact) return;
    
    const config = selectedArtifact.unlockConfig as { question: string; answer: string } | null;
    if (!config) return;
    
    const normalizedAnswer = quizAnswer.toLowerCase().trim();
    const correctAnswer = config.answer.toLowerCase().trim();
    
    const answerWords = normalizedAnswer.split(/\s+/);
    const correctWords = correctAnswer.split(/\s+/);
    const hasMatchingWord = answerWords.some(word => 
      word.length > 2 && correctWords.some(cWord => cWord.includes(word) || word.includes(cWord))
    );
    
    if (normalizedAnswer.includes(correctAnswer) || correctAnswer.includes(normalizedAnswer) || hasMatchingWord) {
      setQuizError(false);
      collectArtifact(selectedArtifact, { quizAnswer });
      setShowQuizModal(false);
      setSelectedArtifact(null);
    } else {
      setQuizError(true);
    }
  };

  const handleFoundIcon = () => {
    if (!selectedArtifact) return;
    collectArtifact(selectedArtifact, { foundAt: new Date().toISOString() });
    setShowFindIcon(false);
    setSelectedArtifact(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-lg">Travel Keepsakes</h3>
        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
          {collectedArtifactIds.size}/{artifacts.length}
        </span>
      </div>

      <AnimatePresence>
        {showKeepsakeOnboarding && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <Card className="bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-900/30 dark:to-emerald-900/30 border-sky-200 dark:border-sky-700 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full hover:bg-sky-200/50 dark:hover:bg-sky-700/50"
                onClick={dismissKeepsakeOnboarding}
                data-testid="button-dismiss-keepsake-onboarding"
              >
                <X className="w-3 h-3" />
              </Button>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-shrink-0">
                  <GeoBuddyCharacter state="chatting" size="sm" autoHide={false} />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-slate-700 dark:text-slate-200 font-medium mb-1">
                    "Travel Keepsakes are special treasures you can only find at each stop!"
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Complete activities like listening to stories, answering questions, or finding hidden items to unlock these rare collectibles. Let's explore together!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex gap-3 overflow-x-auto pb-2">
        {artifacts.map((artifact) => {
          const isCollected = collectedArtifactIds.has(artifact.id);
          const UnlockIcon = UNLOCK_ICONS[artifact.unlockType as UnlockType] || Lock;
          const isListenArtifact = artifact.unlockType === "listen";
          const canUnlock = !isListenArtifact || listenCompleted;
          
          return (
            <motion.div
              key={artifact.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0"
            >
              <Card 
                className={`w-28 cursor-pointer transition-all ${
                  isCollected 
                    ? `border-2 ${RARITY_BORDER[artifact.rarity || 'common']} shadow-lg` 
                    : 'border-dashed border-2 border-slate-300 dark:border-slate-600 opacity-80 hover:opacity-100'
                }`}
                onClick={() => handleArtifactClick(artifact)}
                data-testid={`artifact-${artifact.id}`}
              >
                <CardContent className="p-3 text-center">
                  <motion.div
                    animate={isCollected ? { 
                      rotate: [0, -5, 5, 0],
                      scale: [1, 1.1, 1],
                    } : {}}
                    transition={{ duration: 0.5, repeat: isCollected ? 0 : Infinity, repeatDelay: 3 }}
                    className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-3xl mb-2 bg-gradient-to-br ${
                      isCollected ? RARITY_COLORS[artifact.rarity || 'common'] : 'from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
                    }`}
                  >
                    {isCollected ? artifact.imageEmoji : (
                      <Lock className="w-6 h-6 text-slate-400" />
                    )}
                  </motion.div>
                  
                  <p className="text-xs font-semibold truncate mb-1">
                    {isCollected ? artifact.name : "???"}
                  </p>
                  
                  {isCollected ? (
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span className="text-[10px]">Collected!</span>
                    </div>
                  ) : isListenArtifact && listenCompleted ? (
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-[10px]">Tap to claim!</span>
                    </div>
                  ) : isListenArtifact ? (
                    <div className="flex items-center justify-center gap-1 text-orange-500">
                      <Headphones className="w-3 h-3" />
                      <span className="text-[10px]">Listen first</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <UnlockIcon className="w-3 h-3" />
                      <span className="text-[10px]">{UNLOCK_LABELS[artifact.unlockType as UnlockType]?.split(' ')[0]}</span>
                    </div>
                  )}
                  
                  <div className={`text-[9px] mt-1 capitalize ${
                    artifact.rarity === 'legendary' ? 'text-amber-600 font-bold' :
                    artifact.rarity === 'rare' ? 'text-purple-600 font-semibold' :
                    'text-slate-500'
                  }`}>
                    {artifact.rarity}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showQuizModal && selectedArtifact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQuizModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{selectedArtifact.imageEmoji}</div>
                <h3 className="font-bold text-lg">Answer to Unlock!</h3>
              </div>
              
              <p className="text-center mb-4 text-muted-foreground">
                {(selectedArtifact.unlockConfig as any)?.question}
              </p>
              
              <Input
                value={quizAnswer}
                onChange={e => {
                  setQuizAnswer(e.target.value);
                  setQuizError(false);
                }}
                placeholder="Type your answer..."
                className={`mb-2 ${quizError ? 'border-red-500' : ''}`}
                onKeyDown={e => e.key === 'Enter' && handleQuizSubmit()}
                data-testid="quiz-answer-input"
              />
              
              {quizError && (
                <p className="text-red-500 text-sm mb-3 text-center">
                  That's not quite right. Try again with a different answer!
                </p>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQuizModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
                  onClick={handleQuizSubmit}
                  disabled={!quizAnswer.trim()}
                  data-testid="submit-quiz-answer"
                >
                  Submit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFindIcon && selectedArtifact && foundIconPosition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-sky-100 to-green-100 dark:from-sky-900/80 dark:to-green-900/80 z-50"
          >
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-4xl opacity-20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                >
                  {['🌿', '🌺', '🌴', '🐚', '🦋', '🌸'][i % 6]}
                </motion.div>
              ))}
            </div>
            
            <div className="absolute top-4 left-0 right-0 text-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                Find the Hidden Treasure!
              </h2>
              <p className="text-muted-foreground">Tap on the {selectedArtifact.imageEmoji} to collect it!</p>
            </div>
            
            <motion.button
              initial={{ scale: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                delay: 0.5,
                scale: { duration: 1, repeat: Infinity }
              }}
              className="absolute text-5xl cursor-pointer hover:scale-125 transition-transform"
              style={{
                left: `${foundIconPosition.x}%`,
                top: `${foundIconPosition.y}%`,
              }}
              onClick={handleFoundIcon}
              data-testid="find-hidden-icon"
            >
              {selectedArtifact.imageEmoji}
            </motion.button>
            
            <Button
              variant="outline"
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              onClick={() => {
                setShowFindIcon(false);
                setSelectedArtifact(null);
              }}
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrateArtifact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-8xl mb-4"
              >
                {celebrateArtifact.imageEmoji}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-white mb-2">
                  Keepsake Collected!
                </h2>
                <p className="text-xl text-amber-300 font-semibold mb-2">
                  {celebrateArtifact.name}
                </p>
                <p className="text-white/80 max-w-xs mx-auto">
                  {celebrateArtifact.description}
                </p>
              </motion.div>
              
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  initial={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function notifyListenComplete(artifacts: TravelArtifact[], collectArtifact: (artifact: TravelArtifact) => void) {
  const listenArtifacts = artifacts.filter(a => a.unlockType === 'listen');
  listenArtifacts.forEach(artifact => collectArtifact(artifact));
}

export function notifyPhotoTaken(artifacts: TravelArtifact[], collectArtifact: (artifact: TravelArtifact) => void) {
  const photoArtifacts = artifacts.filter(a => a.unlockType === 'photo');
  photoArtifacts.forEach(artifact => collectArtifact(artifact));
}
