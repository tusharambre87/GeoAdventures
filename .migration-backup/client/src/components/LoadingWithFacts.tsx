import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRandomFact, getRandomFactExcluding } from "@/lib/geographyFacts";

interface LoadingWithFactsProps {
  message?: string;
  showFacts?: boolean;
  factInterval?: number;
}

export function LoadingWithFacts({ 
  message = "Loading...", 
  showFacts = true,
  factInterval = 4000 
}: LoadingWithFactsProps) {
  const [currentFact, setCurrentFact] = useState(getRandomFact());

  useEffect(() => {
    if (!showFacts) return;
    
    const interval = setInterval(() => {
      setCurrentFact(prev => getRandomFactExcluding(prev.fact));
    }, factInterval);

    return () => clearInterval(interval);
  }, [showFacts, factInterval]);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="loading-with-facts">
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        className="text-6xl mb-4"
      >
        🌍
      </motion.div>
      
      <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-6" data-testid="loading-message">
        {message}
      </p>
      
      {showFacts && (
        <div className="max-w-sm mx-auto text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFact.fact}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700"
              data-testid="loading-fact"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{currentFact.icon}</span>
                <div className="text-left">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
                    Did you know?
                  </p>
                  <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                    {currentFact.fact}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
