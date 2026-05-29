import { useState } from 'react';
import { useOffline } from '@/lib/offlineContext';
import { Button } from '@/components/ui/button';
import { Download, Check, WifiOff, HelpCircle, X } from 'lucide-react';
import { OfflineSettings } from './OfflineSettings';
import { motion, AnimatePresence } from 'framer-motion';

export function WorldOfflineButton() {
  const offlineContext = useOffline();
  const [showSettings, setShowSettings] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const cachedCityCount = offlineContext?.cachedCityCount ?? 0;
  const maxFreeCities = offlineContext?.maxFreeCities ?? 5;
  const isPremiumOffline = offlineContext?.isPremiumOffline ?? false;
  
  const isOfflineReady = cachedCityCount >= (isPremiumOffline ? 50 : maxFreeCities);
  
  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <Button
          variant={isOfflineReady ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowSettings(true)}
          className={`gap-2 ${isOfflineReady 
            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 border-green-300" 
            : "bg-white/30 hover:bg-white/40 text-white border-white/40"}`}
          data-testid="button-world-offline"
        >
          {isOfflineReady ? (
            <>
              <Check className="w-4 h-4" />
              Offline Ready
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {cachedCityCount > 0 ? `${cachedCityCount} Cities` : 'Download'}
            </>
          )}
        </Button>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="What is offline mode?"
        >
          <HelpCircle className="w-4 h-4 text-white/70" />
        </button>
      </div>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50"
          >
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
            <div className="flex items-start gap-2 mb-2">
              <WifiOff className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Play Offline!</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Download cities to play Guess & Go without internet. Perfect for road trips!
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <strong>How:</strong> Tap the button, then tap "Download for Offline" to save cities to your device.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <OfflineSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
