import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { usePWA, useOfflineStorage } from '@/hooks/usePWA';
import { LOCATION_CARDS } from './gameData';
import { useSubscription } from './subscriptionContext';

interface StickerGrant {
  visitorId: string;
  playerId: string | null;
  city: string;
  country: string;
  timestamp?: number;
}

interface OfflineContextType {
  isOnline: boolean;
  isPremiumOffline: boolean;
  offlineCities: string[];
  cachedCityCount: number;
  maxFreeCities: number;
  syncPending: boolean;
  cacheAllCities: () => Promise<void>;
  getCachedCities: () => Promise<any[]>;
  saveOfflineProgress: (progress: any) => Promise<void>;
  syncProgress: () => Promise<void>;
  queueStickerGrant: (grant: StickerGrant) => void;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

const MAX_FREE_CITIES = 42;

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, cacheCities } = usePWA();
  const { saveCities, getCities, saveProgress, getProgress, addToSyncQueue, processSyncQueue } = useOfflineStorage();
  const subscription = useSubscription();
  
  const isPremiumOffline = subscription?.isPro ?? false;
  const [offlineCities, setOfflineCities] = useState<string[]>([]);
  const [cachedCityCount, setCachedCityCount] = useState(0);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    loadCachedCities();
  }, []);

  // Check for pending syncs on mount (stickers, stats, and stars)
  useEffect(() => {
    const STICKER_SYNC_KEY = 'geoquest_pending_sticker_grants';
    const STATS_SYNC_KEY = 'geoquest_pending_stats_sync';
    const STAR_SYNC_KEY = 'geoquest_pending_star_sync';
    const pendingGrants = JSON.parse(localStorage.getItem(STICKER_SYNC_KEY) || '[]');
    const pendingStats = localStorage.getItem(STATS_SYNC_KEY);
    const pendingStars = JSON.parse(localStorage.getItem(STAR_SYNC_KEY) || '[]');
    if (pendingGrants.length > 0 || pendingStats || pendingStars.length > 0) {
      setSyncPending(true);
    }
  }, []);

  useEffect(() => {
    if (isOnline && syncPending) {
      syncProgress();
    }
  }, [isOnline, syncPending]);

  // Listen for online event to trigger sync immediately
  useEffect(() => {
    const handleOnline = () => {
      const STICKER_SYNC_KEY = 'geoquest_pending_sticker_grants';
      const STATS_SYNC_KEY = 'geoquest_pending_stats_sync';
      const STAR_SYNC_KEY = 'geoquest_pending_star_sync';
      const pendingGrants = JSON.parse(localStorage.getItem(STICKER_SYNC_KEY) || '[]');
      const pendingStats = localStorage.getItem(STATS_SYNC_KEY);
      const pendingStars = JSON.parse(localStorage.getItem(STAR_SYNC_KEY) || '[]');
      if (pendingGrants.length > 0 || pendingStats || pendingStars.length > 0) {
        console.log('[Offline] Back online - syncing pending data...');
        setSyncPending(true);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const loadCachedCities = useCallback(async () => {
    try {
      const cities = await getCities();
      setOfflineCities(cities.map(c => c.id));
      setCachedCityCount(cities.length);
    } catch (error) {
      console.error('Failed to load cached cities:', error);
    }
  }, [getCities]);

  const cacheAllCities = useCallback(async () => {
    try {
      const citiesToCache = isPremiumOffline 
        ? LOCATION_CARDS 
        : LOCATION_CARDS.slice(0, MAX_FREE_CITIES);
      
      const cityData = citiesToCache.map(card => {
        const cardAny = card as any;
        return {
          id: card.id,
          city: card.city,
          country: card.country,
          continent: card.continent,
          didYouKnow: card.didYouKnow,
          landmarkIcon: card.landmarkIcon,
          language: card.language,
          currency: card.currency,
          clues: card.clues,
          cluesAlt: cardAny.cluesAlt,
          cluesAlt2: cardAny.cluesAlt2,
          flagUrl: card.flagUrl,
        };
      });
      
      await saveCities(cityData);
      
      const allFlagUrls = LOCATION_CARDS
        .filter(c => c.flagUrl)
        .map(c => c.flagUrl);
      const uniqueFlagUrls = Array.from(new Set(allFlagUrls));
      
      cacheCities(uniqueFlagUrls);
      
      setOfflineCities(cityData.map(c => c.id));
      setCachedCityCount(cityData.length);
      
      console.log(`[Offline] Cached ${cityData.length} cities`);
    } catch (error) {
      console.error('Failed to cache cities:', error);
    }
  }, [isPremiumOffline, saveCities, cacheCities]);

  const getCachedCities = useCallback(async () => {
    try {
      const cities = await getCities();
      return isPremiumOffline ? cities : cities.slice(0, MAX_FREE_CITIES);
    } catch (error) {
      console.error('Failed to get cached cities:', error);
      return [];
    }
  }, [getCities, isPremiumOffline]);

  const saveOfflineProgress = useCallback(async (progress: any) => {
    try {
      await saveProgress(progress);
      
      if (!isOnline) {
        await addToSyncQueue({
          type: 'UPDATE_PROGRESS',
          data: progress,
        });
        setSyncPending(true);
      }
    } catch (error) {
      console.error('Failed to save offline progress:', error);
    }
  }, [saveProgress, addToSyncQueue, isOnline]);

  const syncProgress = useCallback(async () => {
    if (!isOnline) return;
    
    try {
      const queuedItems = await processSyncQueue();
      
      for (const item of queuedItems) {
        if (item.type === 'UPDATE_PROGRESS') {
          await fetch('/api/players/' + item.data.playerId + '/stats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
        }
      }
      
      // Sync pending sticker grants from Daily Quest
      const STICKER_SYNC_KEY = 'geoquest_pending_sticker_grants';
      try {
        const pendingGrants = JSON.parse(localStorage.getItem(STICKER_SYNC_KEY) || '[]');
        if (pendingGrants.length > 0) {
          console.log(`[Offline] Syncing ${pendingGrants.length} pending sticker grants...`);
          const successfulGrants: number[] = [];
          
          for (let i = 0; i < pendingGrants.length; i++) {
            const grant = pendingGrants[i];
            try {
              const res = await fetch('/api/stickers/grant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(grant),
              });
              if (res.ok) {
                successfulGrants.push(i);
              }
            } catch (err) {
              console.error(`[Offline] Failed to sync sticker grant for ${grant.city}:`, err);
            }
          }
          
          // Remove successfully synced grants
          const remainingGrants = pendingGrants.filter((_: any, idx: number) => !successfulGrants.includes(idx));
          localStorage.setItem(STICKER_SYNC_KEY, JSON.stringify(remainingGrants));
          console.log(`[Offline] Synced ${successfulGrants.length} sticker grants`);
        }
      } catch (stickerErr) {
        console.error('[Offline] Failed to sync sticker grants:', stickerErr);
      }
      
      // Sync pending player stats (streaks, etc. - but NOT stars)
      const STATS_SYNC_KEY = 'geoquest_pending_stats_sync';
      try {
        const pendingStats = localStorage.getItem(STATS_SYNC_KEY);
        if (pendingStats) {
          const { playerId, payload, timestamp } = JSON.parse(pendingStats);
          console.log(`[Offline] Syncing pending stats for player ${playerId}...`);
          
          const res = await fetch(`/api/players/${playerId}/stats`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (res.ok) {
            localStorage.removeItem(STATS_SYNC_KEY);
            console.log(`[Offline] Successfully synced stats for player ${playerId}`);
          } else {
            console.error(`[Offline] Failed to sync stats - server returned ${res.status}`);
          }
        }
      } catch (statsErr) {
        console.error('[Offline] Failed to sync player stats:', statsErr);
      }
      
      // Sync pending star additions (these go via /add-game-rewards endpoint)
      const STAR_SYNC_KEY = 'geoquest_pending_star_sync';
      try {
        const pendingStars = JSON.parse(localStorage.getItem(STAR_SYNC_KEY) || '[]');
        if (pendingStars.length > 0) {
          console.log(`[Offline] Syncing ${pendingStars.length} pending star additions...`);
          
          // Group entries by playerId, tracking which entry IDs belong to each player
          const starsByPlayer: { [playerId: string]: { totalStars: number; entryIds: string[] } } = {};
          for (const entry of pendingStars) {
            if (!starsByPlayer[entry.playerId]) {
              starsByPlayer[entry.playerId] = { totalStars: 0, entryIds: [] };
            }
            starsByPlayer[entry.playerId].totalStars += entry.stars;
            starsByPlayer[entry.playerId].entryIds.push(entry.id);
          }
          
          const syncedEntryIds: string[] = [];
          
          for (const [playerId, { totalStars, entryIds }] of Object.entries(starsByPlayer)) {
            try {
              const res = await fetch(`/api/players/${playerId}/add-game-rewards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stars: totalStars }),
              });
              
              if (res.ok) {
                // Mark all entries for this player as synced
                syncedEntryIds.push(...entryIds);
                console.log(`[Offline] Synced ${totalStars} stars for player ${playerId}`);
                
                // Update explorer context with new star total
                const data = await res.json();
                if (data?.player) {
                  const EXPLORER_STORAGE_KEY = 'geoquest_active_explorer';
                  const storedExplorer = localStorage.getItem(EXPLORER_STORAGE_KEY);
                  if (storedExplorer) {
                    try {
                      const explorer = JSON.parse(storedExplorer);
                      if (explorer.id === playerId) {
                        const updatedExplorer = {
                          ...explorer,
                          starsEarnedTotal: data.player.starsEarnedTotal,
                        };
                        localStorage.setItem(EXPLORER_STORAGE_KEY, JSON.stringify(updatedExplorer));
                        window.dispatchEvent(new CustomEvent('explorerStatsUpdated', { detail: updatedExplorer }));
                      }
                    } catch (e) { /* ignore */ }
                  }
                }
              }
            } catch (err) {
              console.error(`[Offline] Failed to sync stars for player ${playerId}:`, err);
              // Entries for this player remain in queue for retry
            }
          }
          
          // Remove only the successfully synced entries by their unique IDs
          const remainingStars = pendingStars.filter((entry: any) => !syncedEntryIds.includes(entry.id));
          localStorage.setItem(STAR_SYNC_KEY, JSON.stringify(remainingStars));
          console.log(`[Offline] Synced ${syncedEntryIds.length} star entries, ${remainingStars.length} remaining`);
        }
      } catch (starErr) {
        console.error('[Offline] Failed to sync star additions:', starErr);
      }
      
      setSyncPending(false);
      console.log(`[Offline] Synced ${queuedItems.length} items`);
    } catch (error) {
      console.error('Failed to sync progress:', error);
    }
  }, [isOnline, processSyncQueue]);

  const STICKER_SYNC_KEY = 'geoquest_pending_sticker_grants';
  
  const queueStickerGrant = useCallback((grant: StickerGrant) => {
    try {
      const pendingGrants = JSON.parse(localStorage.getItem(STICKER_SYNC_KEY) || '[]');
      pendingGrants.push({
        ...grant,
        timestamp: grant.timestamp || Date.now(),
      });
      localStorage.setItem(STICKER_SYNC_KEY, JSON.stringify(pendingGrants));
      
      // Set syncPending so sync runs when online
      setSyncPending(true);
      
      // If already online, trigger sync immediately
      if (isOnline) {
        setTimeout(() => syncProgress(), 100);
      }
      
      console.log(`[Offline] Queued sticker grant for ${grant.city}`);
    } catch (e) {
      console.error("Failed to queue sticker for sync:", e);
    }
  }, [isOnline, syncProgress]);

  return (
    <OfflineContext.Provider value={{
      isOnline,
      isPremiumOffline,
      offlineCities,
      cachedCityCount,
      maxFreeCities: MAX_FREE_CITIES,
      syncPending,
      cacheAllCities,
      getCachedCities,
      saveOfflineProgress,
      syncProgress,
      queueStickerGrant,
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

// Track if we've already reported this issue to avoid spamming
let hasReportedMissingProvider = false;

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    // Return safe defaults for edge cases where components briefly render 
    // before OfflineProvider is ready (e.g., during initial React render)
    if (!hasReportedMissingProvider && typeof window !== 'undefined') {
      hasReportedMissingProvider = true;
      console.warn('[useOffline] Called outside OfflineProvider, using fallback defaults');
    }
    return {
      isOnline: navigator.onLine,
      isPremiumOffline: false,
      offlineCities: [],
      cachedCityCount: 0,
      maxFreeCities: 42,
      syncPending: false,
      cacheAllCities: async () => {},
      getCachedCities: async () => [],
      saveOfflineProgress: async () => {},
      syncProgress: async () => {},
      queueStickerGrant: () => {},
    };
  }
  return context;
}
