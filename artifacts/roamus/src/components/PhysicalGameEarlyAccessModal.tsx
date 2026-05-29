import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, X, Sparkles, Mail, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhysicalGameEarlyAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinEarlyAccess: (name: string, email: string) => Promise<void>;
  onDismiss: () => Promise<void>;
  defaultName?: string;
  defaultEmail?: string;
}

export function PhysicalGameEarlyAccessModal({
  open,
  onOpenChange,
  onJoinEarlyAccess,
  onDismiss,
  defaultName = '',
  defaultEmail = '',
}: PhysicalGameEarlyAccessModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState('');

  const handleShowForm = () => {
    setShowForm(true);
    setError('');
  };

  const handleJoinEarlyAccess = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await onJoinEarlyAccess(name.trim(), email.trim());
      setHasJoined(true);
      setShowForm(false);
      setShowConfirmation(true);
    } catch (err) {
      console.error('Failed to join early access:', err);
      // Extract meaningful error message
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaybeLater = async () => {
    setIsLoading(true);
    try {
      await onDismiss();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to dismiss:', error);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowConfirmation(false);
    setShowForm(false);
    setHasJoined(false);
    setName(defaultName);
    setEmail(defaultEmail);
    setError('');
    onOpenChange(false);
  };
  
  // Handle any close action (X button, backdrop click, escape key)
  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && !showConfirmation && !hasJoined) {
      // User is closing without joining - record the dismiss
      try {
        await onDismiss();
      } catch (error) {
        console.error('Failed to record dismiss:', error);
      }
    }
    if (!isOpen) {
      setShowConfirmation(false);
      setShowForm(false);
      setHasJoined(false);
      setName(defaultName);
      setEmail(defaultEmail);
      setError('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 border-2 border-amber-200 dark:border-amber-700">
        <AnimatePresence mode="wait">
          {!showForm && !showConfirmation ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <button
                onClick={() => handleOpenChange(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
                data-testid="close-physical-game-modal"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  Loving GeoQuest Guess & Go?
                </h2>
                <p className="text-lg text-amber-600 dark:text-amber-400 font-semibold">
                  Take it off-screen.
                </p>
              </div>

              <div className="bg-white/60 dark:bg-gray-700/40 rounded-xl p-4 mb-6 border border-amber-100 dark:border-amber-800">
                <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
                  We're creating a <span className="font-semibold text-amber-700 dark:text-amber-300">physical version of Guess & Go</span> — a card game families can play together, anywhere.
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-center mt-3 text-sm">
                  Want early access when it's ready?
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleShowForm}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-base shadow-md"
                  data-testid="join-early-access-button"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Join the Early Access List
                  </span>
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleMaybeLater}
                  disabled={isLoading}
                  className="w-full h-10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                  data-testid="maybe-later-button"
                >
                  Maybe Later
                </Button>
              </div>
            </motion.div>
          ) : showForm && !showConfirmation ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <button
                onClick={() => handleOpenChange(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
                data-testid="close-physical-game-modal-form"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl mx-auto mb-3 flex items-center justify-center shadow-lg">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Almost there!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  We'll email you when the cards are ready.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="waitlist-name" className="text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4" />
                    Your Name
                  </Label>
                  <Input
                    id="waitlist-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 bg-white dark:bg-gray-700 border-amber-200 dark:border-amber-700 focus:border-amber-400"
                    data-testid="waitlist-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="waitlist-email" className="text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center gap-2 mb-1.5">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-white dark:bg-gray-700 border-amber-200 dark:border-amber-700 focus:border-amber-400"
                    data-testid="waitlist-email-input"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center mb-4">{error}</p>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleJoinEarlyAccess}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-base shadow-md"
                  data-testid="submit-waitlist-button"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                      Joining...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Join the Waitlist
                    </span>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  disabled={isLoading}
                  className="w-full h-10 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                  data-testid="back-button"
                >
                  Back
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-4xl">🌍</span>
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                You're on the list!
              </h2>
              
              <div className="bg-white/70 dark:bg-gray-700/50 rounded-xl p-4 my-4 border border-green-100 dark:border-green-800">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Thanks for joining, <span className="font-semibold">{name}</span>!
                </p>
                
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
                  <p className="text-amber-700 dark:text-amber-300 font-medium flex items-center justify-center gap-2">
                    <span>✨</span>
                    The first 100 families get 30% off — no code needed.
                  </p>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-3">
                  Check your inbox at <span className="font-medium">{email}</span> for confirmation.
                </p>
              </div>
              
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                That's it for now. Thanks for being part of GeoQuest!
              </p>
              
              <Button
                onClick={handleClose}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-8"
                data-testid="close-confirmation-button"
              >
                Continue Exploring
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
