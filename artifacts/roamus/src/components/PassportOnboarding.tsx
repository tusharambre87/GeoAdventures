import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Compass, Star, Sparkles, Gift, Map, BookOpen, 
  ChevronLeft, ChevronRight, Info, Rocket
} from "lucide-react";
import { useExplorer } from "@/lib/explorerContext";

interface PassportOnboardingProps {
  open: boolean;
  onClose: () => void;
}

const ONBOARDING_SLIDES = [
  {
    icon: "🎒",
    title: "Your GeoQuest Passport",
    content: "This is where every city you discover is saved.\nAnd discovering a city is just the start.",
    color: "from-blue-500 to-indigo-600"
  },
  {
    icon: "⭐",
    title: "Passport Mastery",
    content: "Passport Mastery shows how well you know a city.",
    bullets: [
      { icon: "🎯", text: "Star 1: Discover it in Guess & Go" },
      { icon: "📍", text: "Star 2: Find it on the map (Map Me)" },
      { icon: "🎌", text: "Star 3: Recognize its flag (Flag Quiz)" },
      { icon: "✨", text: "Star 4: Match its personality (City Quiz)" },
      { icon: "🌍", text: "Star 5: Spin the Globe challenge" }
    ],
    color: "from-amber-500 to-orange-600"
  },
  {
    icon: "🌟",
    title: "City Remembered!",
    content: "When any 3 stars are complete, a city is mastered —\nyou really know this place.",
    color: "from-yellow-400 to-amber-500"
  },
  {
    icon: "🎁",
    title: "Rewards Along the Way",
    content: "As you remember cities, real-world rewards may unlock.\n\nStart by earning a printable GeoQuest Explorer Certificate.\n(More surprises may follow!)",
    color: "from-purple-500 to-pink-600"
  },
  {
    icon: "🎒",
    title: "Explorer Kit",
    content: "Gather fun collectibles in your Explorer Kit as you master cities.\n\nEarn gear like a Compass, Map Scroll, and Globe Lens — each one upgrades as you explore more of the world!",
    color: "from-teal-500 to-cyan-600"
  },
  {
    icon: "🧭",
    title: "How to Begin",
    steps: [
      "Play Guess & Go",
      "Tap a city in your Passport",
      "Earn stars and explore more"
    ],
    footer: "Take your time — every explorer learns at their own pace.",
    color: "from-emerald-500 to-teal-600"
  }
];

export function PassportOnboarding({ open, onClose }: PassportOnboardingProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const { activeExplorer } = useExplorer();
  const currentSlide = ONBOARDING_SLIDES[slideIndex];
  const isLastSlide = slideIndex === ONBOARDING_SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      markSeen();
      onClose();
    } else {
      setSlideIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (slideIndex > 0) {
      setSlideIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    markSeen();
    onClose();
  };

  const markSeen = () => {
    const explorerId = activeExplorer?.id || 'guest';
    localStorage.setItem(`geoquest_passport_onboarding_seen_${explorerId}`, 'true');
  };

  useEffect(() => {
    if (open) {
      setSlideIndex(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent 
        className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none"
        data-testid="dialog-passport-onboarding"
      >
        <DialogTitle className="sr-only">Passport Onboarding</DialogTitle>
        <motion.div 
          className="relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <div 
            className={`absolute inset-0 bg-gradient-to-br ${currentSlide.color} opacity-10`}
          />
          
          <div className="relative p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <motion.div 
                  className="text-6xl mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                >
                  {currentSlide.icon}
                </motion.div>
                
                <h2 className="text-2xl font-heading text-gray-800 dark:text-gray-100 mb-4">
                  {currentSlide.title}
                </h2>
                
                {currentSlide.content && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line leading-relaxed">
                    {currentSlide.content}
                  </p>
                )}
                
                {currentSlide.bullets && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Earn 5 stars for each city:</p>
                    <ul className="space-y-2">
                      {currentSlide.bullets.map((bullet, idx) => (
                        <motion.li 
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                          className="flex items-center gap-3 text-gray-700 dark:text-gray-200"
                        >
                          <span className="text-xl">{bullet.icon}</span>
                          <span className="text-sm">{bullet.text}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {currentSlide.steps && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 text-left">
                    <ol className="space-y-3">
                      {currentSlide.steps.map((step, idx) => (
                        <motion.li 
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                          className="flex items-center gap-3 text-gray-700 dark:text-gray-200"
                        >
                          <span className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-sm">{step}</span>
                        </motion.li>
                      ))}
                    </ol>
                    {currentSlide.footer && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic text-center">
                        {currentSlide.footer}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              {ONBOARDING_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSlideIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === slideIndex 
                      ? "w-6 bg-gradient-to-r from-blue-500 to-indigo-500" 
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  data-testid={`button-onboarding-dot-${idx}`}
                />
              ))}
            </div>
            
            <div className="flex gap-3">
              {slideIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  className="flex-1 rounded-xl"
                  data-testid="button-onboarding-prev"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className={`flex-1 rounded-xl bg-gradient-to-r ${currentSlide.color} hover:opacity-90 text-white border-0`}
                data-testid="button-onboarding-next"
              >
                {isLastSlide ? (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Start Exploring!
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
            
            {!isLastSlide && (
              <button
                onClick={handleSkip}
                className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                data-testid="button-onboarding-skip"
              >
                Got it, skip tour
              </button>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export function usePassportOnboarding() {
  const { activeExplorer } = useExplorer();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const checkAndShowOnboarding = () => {
    const explorerId = activeExplorer?.id || 'guest';
    const hasSeen = localStorage.getItem(`geoquest_passport_onboarding_seen_${explorerId}`) === 'true';
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  };

  const openOnboarding = () => {
    setShowOnboarding(true);
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
  };

  return {
    showOnboarding,
    checkAndShowOnboarding,
    openOnboarding,
    closeOnboarding
  };
}
