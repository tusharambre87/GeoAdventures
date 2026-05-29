import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Shield, X } from "lucide-react";
import { motion } from "framer-motion";

interface NotificationPromptProps {
  open: boolean;
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}

export function NotificationPrompt({ open, onEnable, onDismiss }: NotificationPromptProps) {
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      await onEnable();
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="max-w-sm">
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          data-testid="notification-prompt-close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        <DialogHeader className="text-center pb-2">
          <motion.div 
            className="mx-auto mb-3 w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Bell className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </motion.div>
          <DialogTitle className="text-xl">Keep the streak going!</DialogTitle>
          <DialogDescription className="text-center text-sm mt-2">
            Get gentle reminders so your explorers never miss a day.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">One more day</span> and you'll unlock 2 streak freezes to protect your progress!
            </p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
          <Button 
            onClick={handleEnable}
            disabled={isEnabling}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            data-testid="notification-prompt-enable"
          >
            {isEnabling ? 'Enabling...' : 'Turn on reminders'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-700 text-sm"
            data-testid="notification-prompt-dismiss"
          >
            Maybe later
          </Button>
        </div>
        
        <p className="text-xs text-center text-slate-400 mt-1">
          You can change this anytime in Email Preferences
        </p>
      </DialogContent>
    </Dialog>
  );
}
