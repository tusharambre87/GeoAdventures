import { useState } from 'react';
import { useOffline } from '@/lib/offlineContext';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Wifi, WifiOff, Download, Check, Lock, Crown, 
  Smartphone, HardDrive, RefreshCw, Globe 
} from 'lucide-react';
import { useLocation } from 'wouter';

interface OfflineSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OfflineSettings({ isOpen, onClose }: OfflineSettingsProps) {
  const { 
    isOnline, 
    isPremiumOffline, 
    cachedCityCount, 
    maxFreeCities,
    cacheAllCities,
    syncPending 
  } = useOffline();
  const { isInstalled, installApp, isInstallable } = usePWA();
  const [, setLocation] = useLocation();
  const [isCaching, setIsCaching] = useState(false);

  const handleCacheCities = async () => {
    setIsCaching(true);
    try {
      await cacheAllCities();
    } finally {
      setIsCaching(false);
    }
  };

  const handleInstall = async () => {
    await installApp();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-slate-50 to-white rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <WifiOff className="w-6 h-6 text-blue-500" />
            Offline Mode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isOnline ? 'bg-green-100' : 'bg-amber-100'
            }`}>
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800">
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-sm text-slate-500">
                {isOnline ? 'Connected to internet' : 'Playing offline'}
              </div>
            </div>
            {syncPending && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                Sync pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isInstalled ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              <Smartphone className={`w-5 h-5 ${isInstalled ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-800">
                {isInstalled ? 'App Installed' : 'Install App'}
              </div>
              <div className="text-sm text-slate-500">
                {isInstalled ? 'Playing from home screen' : 'Add to home screen for best experience'}
              </div>
            </div>
            {!isInstalled && isInstallable && (
              <Button size="sm" onClick={handleInstall} data-testid="install-app-settings">
                <Download className="w-4 h-4 mr-1" />
                Install
              </Button>
            )}
            {isInstalled && (
              <Check className="w-5 h-5 text-green-500" />
            )}
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-800">Cached Cities</span>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-2xl font-bold text-blue-600">{cachedCityCount}</span>
                <span className="text-slate-500 ml-1">
                  / {isPremiumOffline ? '100+' : maxFreeCities} cities
                </span>
              </div>
              
              {!isPremiumOffline && (
                <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  <Lock className="w-3 h-3" />
                  Free tier
                </span>
              )}
            </div>

            <Button 
              onClick={handleCacheCities}
              disabled={isCaching}
              className="w-full"
              variant="outline"
              data-testid="cache-cities-button"
            >
              {isCaching ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Caching...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {cachedCityCount > 0 ? 'Update Cache' : 'Download for Offline'}
                </>
              )}
            </Button>
          </div>

          {!isPremiumOffline && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-slate-800">Unlock Full Offline</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Get access to all 100+ cities offline! Play anywhere, anytime without internet.
              </p>
            </div>
          )}

          <div className="text-center text-xs text-slate-400">
            <Globe className="w-4 h-4 inline mr-1" />
            Your progress syncs automatically when online
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
