import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Sparkles, Trophy } from "lucide-react";
import { FlagImage } from "./FlagImage";
import { GeoBuddyCharacter } from "./GeoBuddyCharacter";

interface MasteryCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  countryName: string;
  flagUrl?: string;
  isFullMastery?: boolean;
}

export function MasteryCompleteModal({
  isOpen,
  onClose,
  cityName,
  countryName,
  flagUrl,
  isFullMastery = false,
}: MasteryCompleteModalProps) {
  const hasTriggeredConfetti = useRef(false);

  useEffect(() => {
    if (isOpen && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      
      const duration = isFullMastery ? 5000 : 4000;
      const animationEnd = Date.now() + duration;
      const colors = isFullMastery
        ? ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#E040FB", "#7C4DFF"]
        : ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"];

      const frame = () => {
        if (Date.now() > animationEnd) return;

        confetti({
          particleCount: isFullMastery ? 5 : 3,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.6 },
          colors: colors,
          startVelocity: 45,
          gravity: 0.8,
        });
        confetti({
          particleCount: isFullMastery ? 5 : 3,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.6 },
          colors: colors,
          startVelocity: 45,
          gravity: 0.8,
        });

        requestAnimationFrame(frame);
      };

      frame();

      setTimeout(() => {
        confetti({
          particleCount: isFullMastery ? 150 : 100,
          spread: 100,
          origin: { x: 0.5, y: 0.4 },
          colors: colors,
          startVelocity: 50,
          gravity: 0.6,
        });
      }, 300);
    }
  }, [isOpen, isFullMastery]);

  useEffect(() => {
    if (!isOpen) {
      hasTriggeredConfetti.current = false;
    }
  }, [isOpen]);

  const filledStars = isFullMastery ? 5 : 3;
  const title = isFullMastery ? "City Mastered!" : "City Learned!";
  const bodyText = isFullMastery
    ? `Amazing work, explorer! You've fully mastered ${cityName}! All 5 stars earned — you're a true geography champion!`
    : `Amazing work, explorer! You have learned ${cityName}! Keep going to earn all 5 stars for bonus rewards!`;
  const dialogLabel = isFullMastery ? "City Mastered" : "City Learned";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-md overflow-hidden bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 border-4 border-amber-400 dark:border-amber-600 rounded-3xl"
        data-testid="modal-mastery-complete"
      >
        <DialogTitle className="sr-only">{dialogLabel}</DialogTitle>
        
        <div className="flex flex-col items-center text-center py-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative mb-4"
          >
            <div className="absolute inset-0 bg-amber-400/30 dark:bg-amber-500/30 rounded-full blur-xl scale-150" />
            
            <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 p-6 rounded-full shadow-lg">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, y: -20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                  >
                    <Star className={`w-6 h-6 drop-shadow-md ${i < filledStars ? 'fill-yellow-300 text-yellow-300' : 'fill-gray-300 text-gray-300'}`} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="mb-3"
          >
            {isFullMastery ? (
              <Trophy className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-pulse" />
            ) : (
              <Sparkles className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-pulse" />
            )}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-heading font-black text-amber-700 dark:text-amber-300 mb-2"
          >
            {title}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 mb-4 px-4 py-3 bg-white/60 dark:bg-black/30 rounded-xl"
          >
            {flagUrl && (
              <FlagImage 
                src={flagUrl} 
                alt={`${countryName} flag`}
                className="w-10 h-7 object-cover rounded shadow-sm"
                countryCode={countryName}
              />
            )}
            <div className="text-left">
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{cityName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {countryName}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            <GeoBuddyCharacter
              state={isFullMastery ? "celebrating" : "remembering"}
              size="lg"
              showGlow={isFullMastery}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-700 dark:text-gray-300 text-sm mb-4 px-4"
          >
            {bodyText}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={onClose}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-full shadow-lg"
              data-testid="button-close-mastery-modal"
            >
              Continue Exploring!
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
