import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download, Gamepad2, X, Smartphone } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { useLocation } from "wouter";

interface GameInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameInstallPrompt({ isOpen, onClose }: GameInstallPromptProps) {
  const { installApp, isInstallable } = usePWA();
  const [, setLocation] = useLocation();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      onClose();
    }
  };

  const handlePlayAnother = () => {
    onClose();
    setLocation("/mini-games");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-6 text-center">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                data-testid="button-close-install-prompt"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 15 }}
                className="w-20 h-20 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center"
              >
                <Smartphone className="w-10 h-10 text-blue-600" />
              </motion.div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                Want this on your home screen for tomorrow?
              </h2>
              <p className="text-white/80 text-sm">
                Play anytime, even offline!
              </p>
            </div>

            <div className="p-6 space-y-3">
              {isInstallable ? (
                <Button
                  onClick={handleInstall}
                  className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
                  data-testid="button-install-pwa"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Free Download Offline
                </Button>
              ) : (
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Add to Home Screen from your browser menu to play offline!
                  </p>
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={handlePlayAnother}
                className="w-full h-12 text-base font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                data-testid="button-play-another-game"
              >
                <Gamepad2 className="w-5 h-5 mr-2" />
                Play another game
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
