import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Share2, Gamepad2, X, MessageCircle, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { shareViaWhatsApp, shareViaIMessage, shareViaEmail } from "@/hooks/useSharePrompt";
import { useState } from "react";

interface SharePromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SharePrompt({ isOpen, onClose }: SharePromptProps) {
  const [, setLocation] = useLocation();
  const [showShareOptions, setShowShareOptions] = useState(false);

  const handlePlayAnother = () => {
    onClose();
    setLocation("/mini-games");
  };

  const handleShare = (method: 'whatsapp' | 'imessage' | 'email') => {
    switch (method) {
      case 'whatsapp':
        shareViaWhatsApp();
        break;
      case 'imessage':
        shareViaIMessage();
        break;
      case 'email':
        shareViaEmail();
        break;
    }
    onClose();
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
            <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-6 text-center">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                data-testid="button-close-share-prompt"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 15 }}
                className="w-20 h-20 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center"
              >
                <span className="text-4xl">🎉</span>
              </motion.div>
              
              <h2 className="text-xl font-bold text-white mb-2">
                This was fun — want to send it to another parent?
              </h2>
            </div>

            <div className="p-6 space-y-3">
              <AnimatePresence mode="wait">
                {!showShareOptions ? (
                  <motion.div
                    key="buttons"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <Button
                      onClick={() => setShowShareOptions(true)}
                      className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg"
                      data-testid="button-share"
                    >
                      <Share2 className="w-5 h-5 mr-2" />
                      Share with a friend
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handlePlayAnother}
                      className="w-full h-12 text-base font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                      data-testid="button-play-another-share"
                    >
                      <Gamepad2 className="w-5 h-5 mr-2" />
                      Play another game
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="share-options"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Choose how to share:
                    </p>
                    
                    <Button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full h-12 text-base font-semibold rounded-xl bg-green-500 hover:bg-green-600 text-white"
                      data-testid="button-share-whatsapp"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      WhatsApp
                    </Button>
                    
                    <Button
                      onClick={() => handleShare('imessage')}
                      className="w-full h-12 text-base font-semibold rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                      data-testid="button-share-imessage"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      iMessage
                    </Button>
                    
                    <Button
                      onClick={() => handleShare('email')}
                      className="w-full h-12 text-base font-semibold rounded-xl bg-gray-600 hover:bg-gray-700 text-white"
                      data-testid="button-share-email"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Email
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={() => setShowShareOptions(false)}
                      className="w-full text-gray-500 hover:text-gray-700"
                    >
                      Back
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
