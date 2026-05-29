import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOOLTIPS_SHOWN_KEY = 'travel_trip_details_tooltips_shown';

interface TooltipStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOOLTIP_STEPS: TooltipStep[] = [
  {
    id: 'map',
    targetId: 'button-open-map',
    title: 'View Map',
    description: 'See all your adventure stops on an interactive map. Track your journey progress!',
    position: 'bottom',
  },
  {
    id: 'moment',
    targetId: 'button-save-moment',
    title: 'Save Moments',
    description: 'Capture photos and memories during your adventure. Build your travel journal!',
    position: 'bottom',
  },
  {
    id: 'share',
    targetId: 'button-share-trip',
    title: 'Share',
    description: 'Share your adventure itinerary with family and friends, or explore community adventures for inspiration!',
    position: 'bottom',
  },
  {
    id: 'download',
    targetId: 'button-offline-download',
    title: 'Download for Offline',
    description: 'Download before your adventure! Saves podcast stories, parent tips, and stop info so everything works without WiFi.',
    position: 'bottom',
  },
];

function hasSeenTooltips(): boolean {
  try {
    return localStorage.getItem(TOOLTIPS_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

function markTooltipsSeen() {
  try {
    localStorage.setItem(TOOLTIPS_SHOWN_KEY, 'true');
  } catch {}
}

export function TripDetailsTooltips() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (hasSeenTooltips()) return;
    
    const timer = setTimeout(() => {
      const target = document.querySelector(`[data-testid="${TOOLTIP_STEPS[0].targetId}"]`);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
        setIsVisible(true);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isVisible || currentStep >= TOOLTIP_STEPS.length) return;
    
    const findAndUpdateTarget = () => {
      const target = document.querySelector(`[data-testid="${TOOLTIP_STEPS[currentStep].targetId}"]`);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
        return true;
      }
      return false;
    };
    
    // If target not found, skip to next step
    if (!findAndUpdateTarget()) {
      if (currentStep < TOOLTIP_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleClose();
      }
      return;
    }
    
    window.addEventListener('resize', findAndUpdateTarget);
    window.addEventListener('scroll', findAndUpdateTarget, true);
    
    return () => {
      window.removeEventListener('resize', findAndUpdateTarget);
      window.removeEventListener('scroll', findAndUpdateTarget, true);
    };
  }, [currentStep, isVisible]);

  const handleNext = () => {
    setTargetRect(null); // Clear rect to trigger re-find
    if (currentStep < TOOLTIP_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    markTooltipsSeen();
    setIsVisible(false);
  };

  if (!isVisible || currentStep >= TOOLTIP_STEPS.length || !targetRect) {
    return null;
  }

  const step = TOOLTIP_STEPS[currentStep];
  const isLastStep = currentStep === TOOLTIP_STEPS.length - 1;

  const getTooltipPosition = () => {
    const padding = 12;
    const tooltipWidth = 280;
    
    switch (step.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + padding,
          left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left,
        };
    }
  };

  const position = getTooltipPosition();

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={handleClose}
          />
          
          <motion.div
            className="fixed z-[101] rounded-full ring-4 ring-amber-400 ring-offset-2 pointer-events-none"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          />
          
          <motion.div
            initial={{ opacity: 0, y: step.position === 'bottom' ? -10 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: step.position === 'bottom' ? -10 : 10 }}
            className="fixed z-[102] w-[280px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-amber-200 dark:border-amber-800 overflow-hidden"
            style={position}
          >
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 flex items-center justify-between">
              <span className="text-white text-sm font-bold">{step.title}</span>
              <button
                onClick={handleClose}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                data-testid="button-close-tooltip"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {TOOLTIP_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full ${idx === currentStep ? 'bg-amber-500' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
                  data-testid="button-next-tooltip"
                >
                  {isLastStep ? 'Got it!' : 'Next'}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
