import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, WifiOff, Download, RefreshCw, Smartphone, Share, MoreVertical, Plus, ChevronRight, CloudDownload } from 'lucide-react';

// Routes where the offline banner should be hidden (gameplay and immersive experiences)
const GAME_ROUTES = [
  '/play', 
  '/crossworld', 
  '/find-my-home', 
  '/spell-geo', 
  '/mini-games', 
  '/spin-the-world',
  '/geo-art',
  '/map-me',
  '/sticker-book',
  '/explore',
  '/knowledge-hub'
];

export function OfflineBanner() {
  const { isOnline } = usePWA();
  const [location] = useLocation();
  const [show, setShow] = useState(false);

  const isGameRoute = GAME_ROUTES.some(route => location.startsWith(route));

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show || isGameRoute) return null;

  return (
    <div className={`fixed top-14 left-0 right-0 z-40 transition-all duration-300 ${
      isOnline ? 'bg-green-500' : 'bg-amber-500'
    }`}>
      <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-center gap-2 text-white text-sm font-medium">
        {isOnline ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Back online! Syncing...
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            You're offline - some features may be limited
          </>
        )}
      </div>
    </div>
  );
}

export function InstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const hasSeenPrompt = localStorage.getItem('pwa-prompt-dismissed');
    if (hasSeenPrompt) {
      const dismissedTime = parseInt(hasSeenPrompt);
      const daysSince = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
        return;
      }
    }

    const handleFirstGameCompleted = () => {
      if (isInstallable && !isInstalled && !dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('geoquest:first-game-completed', handleFirstGameCompleted);

    const hasCompletedGame = localStorage.getItem('geoquest-first-game-completed');
    if (hasCompletedGame && isInstallable && !isInstalled && !dismissed) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('geoquest:first-game-completed', handleFirstGameCompleted);
    };
  }, [isInstallable, isInstalled, dismissed]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
    }
  };

  if (!showPrompt || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto animate-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 shadow-2xl text-white">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          data-testid="dismiss-install-prompt"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-8 h-8" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Install GeoQuest</h3>
            <p className="text-white/80 text-sm mb-3">
              Add to your home screen for offline play and faster access!
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold"
                data-testid="install-app-button"
              >
                <Download className="w-4 h-4 mr-2" />
                Install
              </Button>
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="text-white/80 hover:text-white hover:bg-white/10"
                data-testid="maybe-later-button"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UpdatePrompt() {
  const { isUpdateAvailable, updateApp } = usePWA();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShow(true);
    }
  }, [isUpdateAvailable]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto animate-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 shadow-2xl text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold mb-1">Update Available!</h3>
            <p className="text-white/80 text-sm">
              A new version of GeoQuest is ready.
            </p>
          </div>
          
          <Button
            onClick={updateApp}
            className="bg-white text-green-600 hover:bg-green-50 font-bold"
            data-testid="update-app-button"
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PWAStatus() {
  const { isOnline, isInstalled } = usePWA();
  
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      {isInstalled && (
        <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          <Smartphone className="w-3 h-3" />
          Installed
        </span>
      )}
      {!isOnline && (
        <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
          <WifiOff className="w-3 h-3" />
          Offline
        </span>
      )}
    </div>
  );
}

type DeviceType = 'ios' | 'android' | 'desktop';

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function DownloadBanner() {
  const { isInstalled, isInstallable, installApp } = usePWA();
  const [showGuide, setShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Always show when not installed, unless user explicitly dismissed
  if (isInstalled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleClick = async () => {
    if (isInstallable) {
      const success = await installApp();
      if (success) setDismissed(true);
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-300 py-2 px-4 rounded-xl border border-blue-200/50 dark:border-blue-700/50 relative">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          <button 
            onClick={handleClick}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
            data-testid="download-banner-button"
          >
            <CloudDownload className="w-4 h-4" />
            <span>Download to play offline</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="absolute right-3 p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-full transition-colors"
            data-testid="dismiss-download-banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <InstallGuideDialog open={showGuide} onOpenChange={setShowGuide} />
    </>
  );
}

interface InstallGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallGuideDialog({ open, onOpenChange }: InstallGuideDialogProps) {
  const [device] = useState<DeviceType>(detectDevice);
  const { isInstallable, installApp } = usePWA();

  const handleNativeInstall = async () => {
    const success = await installApp();
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="w-6 h-6 text-blue-500" />
            Install GeoQuest
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isInstallable ? (
            <div className="text-center py-4">
              <p className="text-slate-600 mb-4">
                Click the button below to add GeoQuest to your home screen for offline play!
              </p>
              <Button 
                onClick={handleNativeInstall}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 py-3"
                data-testid="native-install-button"
              >
                <Download className="w-5 h-5 mr-2" />
                Install Now
              </Button>
            </div>
          ) : (
            <>
              {device === 'ios' && <IOSInstallGuide />}
              {device === 'android' && <AndroidInstallGuide />}
              {device === 'desktop' && <DesktopInstallGuide />}
            </>
          )}
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Why install?</h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
              <li>• Play games even without internet</li>
              <li>• Faster loading - opens like a real app</li>
              <li>• Easy access from your home screen</li>
              <li>• Your progress syncs when back online</li>
            </ul>
            <p className="mt-3 text-blue-600 dark:text-blue-400 text-xs">
              Want reminders? Enable notifications in Email Preferences after signing up.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IOSInstallGuide() {
  return (
    <div className="space-y-4">
      <p className="text-slate-600 dark:text-slate-300 text-sm">
        Follow these steps to install GeoQuest on your iPhone or iPad:
      </p>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600 dark:text-blue-300">
            1
          </div>
          <div>
            <p className="font-medium">Tap the Share button</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Look for <Share className="w-4 h-4 inline-block mx-1" /> at the bottom of Safari
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600 dark:text-blue-300">
            2
          </div>
          <div>
            <p className="font-medium">Scroll down and tap "Add to Home Screen"</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Look for <Plus className="w-4 h-4 inline-block mx-1" /> Add to Home Screen
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-600 dark:text-blue-300">
            3
          </div>
          <div>
            <p className="font-medium">Tap "Add" to confirm</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              GeoQuest will appear on your home screen!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AndroidInstallGuide() {
  return (
    <div className="space-y-4">
      <p className="text-slate-600 dark:text-slate-300 text-sm">
        Follow these steps to install GeoQuest on your Android device:
      </p>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-600 dark:text-green-300">
            1
          </div>
          <div>
            <p className="font-medium">Tap the menu button</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Look for <MoreVertical className="w-4 h-4 inline-block mx-1" /> in Chrome's top-right corner
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-600 dark:text-green-300">
            2
          </div>
          <div>
            <p className="font-medium">Tap "Install app" or "Add to Home screen"</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The option may say either depending on your browser
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-600 dark:text-green-300">
            3
          </div>
          <div>
            <p className="font-medium">Tap "Install" to confirm</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              GeoQuest will be added to your apps!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopInstallGuide() {
  return (
    <div className="space-y-4">
      <p className="text-slate-600 dark:text-slate-300 text-sm">
        Follow these steps to install GeoQuest on your computer:
      </p>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600 dark:text-purple-300">
            1
          </div>
          <div>
            <p className="font-medium">Look for the install icon</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              In Chrome, look for <Download className="w-4 h-4 inline-block mx-1" /> in the address bar
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600 dark:text-purple-300">
            2
          </div>
          <div>
            <p className="font-medium">Click the install icon</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Or use menu → "Install GeoQuest..."
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-purple-600 dark:text-purple-300">
            3
          </div>
          <div>
            <p className="font-medium">Click "Install" to confirm</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              GeoQuest will open in its own window!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
