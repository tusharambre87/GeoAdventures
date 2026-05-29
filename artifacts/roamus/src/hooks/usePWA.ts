import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    isInstallable: false,
    isUpdateAvailable: false,
    registration: null,
  });
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleOnline = () => setState(s => ({ ...s, isOnline: true }));
    const handleOffline = () => setState(s => ({ ...s, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setState(s => ({ ...s, isInstalled: true }));
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState(s => ({ ...s, isInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service worker registered');
          setState(s => ({ ...s, registration }));

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(s => ({ ...s, isUpdateAvailable: true }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setState(s => ({ ...s, isInstalled: true, isInstallable: false }));
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(() => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage('skipWaiting');
    }
    window.location.reload();
  }, [state.registration]);

  const cacheCities = useCallback((imageUrls: string[]) => {
    if (state.registration?.active) {
      state.registration.active.postMessage({
        type: 'CACHE_CITIES',
        cities: imageUrls
      });
    }
  }, [state.registration]);

  // Cache app shell assets using Performance API telemetry
  const cacheAppShell = useCallback(async () => {
    try {
      // Wait for SW to be ready and get active worker
      const registration = await navigator.serviceWorker.ready;
      const activeWorker = registration.active;
      
      if (!activeWorker) {
        console.log('[PWA] No active worker yet, retrying in 1s...');
        setTimeout(() => cacheAppShell(), 1000);
        return;
      }
      
      // Increase resource timing buffer to capture all Vite modules
      if (typeof performance.setResourceTimingBufferSize === 'function') {
        performance.setResourceTimingBufferSize(2000);
      }
      
      const origin = window.location.origin;
      const collectedUrls = new Set<string>();
      const sentUrls = new Set<string>();
      
      // Helper to filter app shell URLs
      const isAppShellUrl = (url: string) => {
        if (!url.startsWith(origin)) return false;
        return url.match(/\.(js|mjs|css|tsx?|jsx?)(\?.*)?$/) ||
               url.includes('.vite') ||
               url.includes('/node_modules/') ||
               url.includes('/src/');
      };
      
      // Send new URLs to SW
      const sendNewUrlsToSW = () => {
        const newUrls = Array.from(collectedUrls).filter(url => !sentUrls.has(url));
        if (newUrls.length > 0) {
          console.log('[PWA] Sending', newUrls.length, 'new app shell assets to SW for caching');
          newUrls.forEach(url => sentUrls.add(url));
          
          activeWorker.postMessage({
            type: 'CACHE_APP_SHELL',
            urls: newUrls
          });
        }
      };
      
      // Get already-loaded resources
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      for (const r of resources) {
        if (isAppShellUrl(r.name)) {
          collectedUrls.add(r.name);
        }
      }
      
      // Add main document
      collectedUrls.add(window.location.origin + '/');
      
      // Initial send
      sendNewUrlsToSW();
      
      // Keep observing for lazy-loaded modules throughout the session
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          let hasNew = false;
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource' && isAppShellUrl(entry.name)) {
              if (!collectedUrls.has(entry.name)) {
                collectedUrls.add(entry.name);
                hasNew = true;
              }
            }
          }
          // Batch new URLs and send
          if (hasNew) {
            sendNewUrlsToSW();
          }
        });
        
        try {
          observer.observe({ type: 'resource', buffered: true });
          console.log('[PWA] Resource observer active - watching for new modules');
          
          // Don't disconnect - keep watching for the entire session
          // This ensures code-split chunks and lazy routes are cached
        } catch (e) {
          console.log('[PWA] PerformanceObserver failed, using fallback');
        }
      }
    } catch (err) {
      console.error('[PWA] Failed to gather app shell assets:', err);
    }
  }, []);

  // Auto-cache app shell after SW takes control
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    let timer: ReturnType<typeof setTimeout> | null = null;
    
    const triggerCaching = () => {
      // Wait for app to fully hydrate before caching
      timer = setTimeout(() => {
        cacheAppShell();
      }, 3000);
    };
    
    // If already controlled, trigger caching immediately
    if (navigator.serviceWorker.controller) {
      console.log('[PWA] Already controlled, scheduling app shell caching');
      triggerCaching();
    }
    
    // Always listen for controllerchange (handles first install and SW updates)
    const handleControllerChange = () => {
      console.log('[PWA] Controller changed, triggering app shell caching');
      // Clear any pending timer
      if (timer) clearTimeout(timer);
      triggerCaching();
    };
    
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    
    return () => {
      if (timer) clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [cacheAppShell]);

  return {
    ...state,
    installApp,
    updateApp,
    cacheCities,
    cacheAppShell,
  };
}

export function useOfflineStorage() {
  const DB_NAME = 'geoquest-offline';
  const DB_VERSION = 1;

  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cities')) {
          db.createObjectStore('cities', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }, []);

  const saveCities = useCallback(async (cities: any[]) => {
    const db = await openDB();
    const tx = db.transaction('cities', 'readwrite');
    const store = tx.objectStore('cities');
    
    for (const city of cities) {
      store.put(city);
    }
    
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }, [openDB]);

  const getCities = useCallback(async (): Promise<any[]> => {
    const db = await openDB();
    const tx = db.transaction('cities', 'readonly');
    const store = tx.objectStore('cities');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }, [openDB]);

  const saveProgress = useCallback(async (progress: any) => {
    const db = await openDB();
    const tx = db.transaction('progress', 'readwrite');
    const store = tx.objectStore('progress');
    store.put({ id: 'current', ...progress, lastUpdated: Date.now() });
    
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }, [openDB]);

  const getProgress = useCallback(async () => {
    const db = await openDB();
    const tx = db.transaction('progress', 'readonly');
    const store = tx.objectStore('progress');
    const request = store.get('current');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }, [openDB]);

  const addToSyncQueue = useCallback(async (action: any) => {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.add({ ...action, timestamp: Date.now() });
    
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }, [openDB]);

  const processSyncQueue = useCallback(async () => {
    const db = await openDB();
    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const request = store.getAll();
    
    return new Promise<any[]>((resolve, reject) => {
      request.onsuccess = async () => {
        const items = request.result;
        store.clear();
        db.close();
        resolve(items);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }, [openDB]);

  return {
    saveCities,
    getCities,
    saveProgress,
    getProgress,
    addToSyncQueue,
    processSyncQueue,
  };
}
