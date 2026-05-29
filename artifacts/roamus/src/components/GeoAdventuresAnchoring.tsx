import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Compass, Play, Eye, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GeoBuddyCharacter } from './GeoBuddyCharacter';

const ANCHORING_SHOWN_KEY = 'geoadventures_anchoring_shown';

interface GeoAdventuresAnchoringProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'first_entry' | 'first_adventure';
}

export function hasSeenAnchoring(): boolean {
  try {
    return localStorage.getItem(ANCHORING_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markAnchoringAsSeen(): void {
  try {
    localStorage.setItem(ANCHORING_SHOWN_KEY, 'true');
  } catch {}
}

export function GeoAdventuresAnchoring({ isOpen, onClose, trigger = 'first_entry' }: GeoAdventuresAnchoringProps) {
  const [step, setStep] = useState(0);

  const handleClose = () => {
    markAnchoringAsSeen();
    onClose();
  };

  const phases = [
    {
      icon: <Play className="w-5 h-5 text-teal-600" />,
      label: "Before",
      title: "Listen & Wonder",
      description: "Get curious about the place before you arrive.",
      color: "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700"
    },
    {
      icon: <Eye className="w-5 h-5 text-amber-600" />,
      label: "During",
      title: "Explore Together",
      description: "Put the phone away and experience the place.",
      color: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700"
    },
    {
      icon: <Gamepad2 className="w-5 h-5 text-violet-600" />,
      label: "After",
      title: "Play & Remember",
      description: "Reflect on what you saw and collect a memory.",
      color: "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
          data-testid="geoadventures-anchoring-overlay"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 p-6 text-white relative">
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  data-testid="button-close-anchoring"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-4">
                  <motion.div 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="w-16 h-16 flex-shrink-0"
                  >
                    <GeoBuddyCharacter state="wondering" size="md" autoHide={false} />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Compass className="w-5 h-5" />
                      <span className="text-sm font-medium opacity-90">GeoAdventures</span>
                    </div>
                    <h2 className="text-xl font-bold leading-tight">
                      Explore Places Together
                    </h2>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                <p className="text-center text-muted-foreground text-sm">
                  GeoAdventures helps families explore places together — before, during, and after each stop.
                </p>

                <div className="space-y-3">
                  {phases.map((phase, index) => (
                    <motion.div
                      key={phase.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.15 }}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 ${phase.color}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                        {phase.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {phase.label}
                          </span>
                          <span className="text-xs text-gray-400">→</span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                            {phase.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {phase.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold"
                  data-testid="button-got-it-anchoring"
                >
                  Start Exploring
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface QuietPromiseBannerProps {
  variant?: 'subtle' | 'prominent';
  className?: string;
  onDismiss?: () => void;
}

export function QuietPromiseBanner({ variant = 'subtle', className = '', onDismiss }: QuietPromiseBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  if (variant === 'subtle') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className={`flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 ${className}`} 
        data-testid="quiet-promise-banner"
      >
        <span className="text-base">📴</span>
        <span className="font-medium flex-1">We go quiet during the stop — explore with your eyes, not the screen!</span>
        {onDismiss && (
          <button 
            onClick={handleDismiss}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-1 rounded"
            data-testid="button-dismiss-quiet-banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700 ${className}`} data-testid="quiet-promise-section">
      <div className="flex items-start gap-3">
        <span className="text-2xl">📴</span>
        <div>
          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
            We go quiet during the stop
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            GeoAdventures prepares kids before a place — then encourages them to put the phone away and explore.
          </p>
        </div>
      </div>
    </div>
  );
}
