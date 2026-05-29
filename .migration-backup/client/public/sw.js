const CACHE_NAME = 'geoquest-v19';
const STATIC_CACHE = 'geoquest-static-v19';
const DYNAMIC_CACHE = 'geoquest-dynamic-v19';
const IMAGE_CACHE = 'geoquest-images-v19';
const APP_SHELL_CACHE = 'geoquest-app-shell-v19';

const STATIC_ASSETS = [
  '/',
  '/favicon.png',
  '/manifest.json'
];

// Offline fallback HTML for when the app isn't cached yet
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoQuest - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .globe { font-size: 80px; margin-bottom: 20px; }
    h1 { color: #1e3a8a; font-size: 24px; margin-bottom: 12px; }
    p { color: #64748b; line-height: 1.6; margin-bottom: 20px; }
    .retry-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .retry-btn:hover { background: #2563eb; }
    .status { margin-top: 16px; font-size: 14px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="globe">🌍</div>
    <h1>You're Offline</h1>
    <p>GeoQuest needs an internet connection to load for the first time. Please check your connection and try again.</p>
    <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
    <p class="status">Once loaded, you can play offline!</p>
  </div>
</body>
</html>
`;

const FONT_CACHE = 'geoquest-fonts-v1';

const CACHE_LIMITS = {
  images: 150,
  dynamic: 50
};

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      console.log('[SW] Caching static assets');
      await staticCache.addAll(STATIC_ASSETS);
      
      const appShellCache = await caches.open(APP_SHELL_CACHE);
      try {
        const rootResponse = await fetch('/');
        if (rootResponse.ok) {
          const htmlText = await rootResponse.clone().text();
          await staticCache.put('/', rootResponse);
          
          const assetUrls = new Set();
          
          // Match ALL script src attributes
          const scriptMatches = htmlText.matchAll(/src=["']([^"']+)["']/g);
          for (const match of scriptMatches) {
            if (match[1] && !match[1].startsWith('http') && (match[1].endsWith('.js') || match[1].endsWith('.mjs') || match[1].includes('/assets/'))) {
              assetUrls.add(match[1]);
            }
          }
          
          // Match ALL CSS href attributes  
          const styleMatches = htmlText.matchAll(/href=["']([^"']+\.css)["']/g);
          for (const match of styleMatches) {
            if (match[1] && !match[1].startsWith('http')) {
              assetUrls.add(match[1]);
            }
          }
          
          // Match modulepreload links
          const modulepreloadMatches = htmlText.matchAll(/<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["']/g);
          for (const match of modulepreloadMatches) {
            if (match[1] && !match[1].startsWith('http')) {
              assetUrls.add(match[1]);
            }
          }
          
          const modulepreloadMatches2 = htmlText.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']modulepreload["']/g);
          for (const match of modulepreloadMatches2) {
            if (match[1] && !match[1].startsWith('http')) {
              assetUrls.add(match[1]);
            }
          }
          
          // Also match any /assets/ URLs in the HTML
          const assetMatches = htmlText.matchAll(/["']([^"']*\/assets\/[^"']+)["']/g);
          for (const match of assetMatches) {
            if (match[1] && !match[1].startsWith('http')) {
              assetUrls.add(match[1]);
            }
          }
          
          console.log('[SW] Pre-caching', assetUrls.size, 'app shell assets');
          for (const url of assetUrls) {
            try {
              const assetResponse = await fetch(url);
              if (assetResponse.ok) {
                await appShellCache.put(url, assetResponse);
              }
            } catch (err) {
              console.log('[SW] Failed to pre-cache:', url);
            }
          }
        }
      } catch (err) {
        console.log('[SW] App shell pre-cache failed:', err.message);
      }
      
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  const VALID_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !VALID_CACHES.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

async function limitCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Cache Google Fonts
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => caches.match(request))
    );
    return;
  }

  if (url.hostname === 'flagcdn.com' || 
      url.hostname === 'images.unsplash.com' ||
      url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok || networkResponse.type === 'opaque') {
            cache.put(request, networkResponse.clone());
            limitCache(IMAGE_CACHE, CACHE_LIMITS.images);
          }
          return networkResponse;
        } catch (error) {
          console.log('[SW] Image fetch failed:', error);
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const isTravelApi = url.pathname.startsWith('/api/travel/');
    const isExperienceApi = url.pathname.startsWith('/api/experience/');
    
    // Experience API - ALWAYS network-first, never serve cached errors
    if (isExperienceApi) {
      event.respondWith(
        (async () => {
          try {
            const response = await fetch(request);
            // Only cache successful responses for experience content
            if (response.ok) {
              const cache = await caches.open(DYNAMIC_CACHE);
              cache.put(request, response.clone());
            }
            return response;
          } catch (err) {
            // Network failed - try cache as fallback only for successful cached responses
            const cache = await caches.open(DYNAMIC_CACHE);
            const cachedResponse = await cache.match(request);
            if (cachedResponse && cachedResponse.ok) {
              console.log('[SW] Experience API: returning cached response');
              return cachedResponse;
            }
            // Don't return error - let the component handle it
            return new Response(JSON.stringify({ offline: true, message: 'You are offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })()
      );
      return;
    }
    
    if (isTravelApi) {
      // NETWORK-FIRST strategy for travel API to ensure fresh data
      // Only fall back to cache if network fails completely
      event.respondWith(
        (async () => {
          const cache = await caches.open(DYNAMIC_CACHE);
          
          // Longer timeout (30s) for travel API - these queries can be slow
          const NETWORK_TIMEOUT = 30000;
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
            
            const response = await fetch(request, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
              // Cache the fresh response for offline use
              cache.put(request, response.clone());
              limitCache(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
            }
            console.log('[SW] Travel API: network response OK');
            return response;
          } catch (err) {
            // Network failed - try cache as fallback
            console.log('[SW] Travel API: network failed, trying cache');
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
              console.log('[SW] Travel API: returning cached response');
              return cachedResponse;
            }
            return new Response(JSON.stringify({ offline: true, message: 'You are offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })()
      );
      return;
    }
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
              limitCache(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(JSON.stringify({ offline: true, message: 'You are offline' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Navigation requests - NETWORK-FIRST for SPA routing to ensure fresh HTML with correct chunk references
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/', cloned));
        }
        return response;
      }).catch(() => {
        return caches.match('/').then((cachedRoot) => {
          if (cachedRoot) return cachedRoot;
          return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } });
        });
      })
    );
    return;
  }

  // App shell assets (JS, CSS, etc.) - use NETWORK-FIRST to always serve fresh chunks after deployments
  const isAppShellAsset = url.pathname.match(/\.(js|css|mjs)$/) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/attached_assets/');

  if (isAppShellAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          console.log('[SW] App shell asset fetch failed:', url.pathname);
          return new Response('', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Default: cache-first for other static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clonedResponse = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      });
    }).catch(async () => {
      return new Response('', { status: 503, statusText: 'Offline' });
    })
  );
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'GeoQuest',
    body: 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    url: '/'
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (err) {
    console.error('[SW] Failed to parse push data:', err);
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || 'geoquest-notification',
    data: {
      url: data.url || '/',
      ...data.data
    },
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'open',
        title: 'Open'
      }
    ],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  // Handle app shell module telemetry from client
  if (event.data.type === 'CACHE_APP_SHELL') {
    const urls = event.data.urls || [];
    console.log('[SW] Received', urls.length, 'app shell URLs from client');
    
    caches.open(APP_SHELL_CACHE).then(async (cache) => {
      let cached = 0;
      for (const url of urls) {
        try {
          const existing = await cache.match(url);
          if (!existing) {
            const response = await fetch(url, { mode: 'cors' });
            if (response.ok) {
              await cache.put(url, response);
              cached++;
            }
          } else {
            cached++;
          }
        } catch (err) {
          console.log('[SW] Failed to cache app shell asset:', url);
        }
      }
      console.log('[SW] Cached', cached, '/', urls.length, 'app shell assets');
      
      // Notify client that caching is complete
      if (event.source) {
        event.source.postMessage({ type: 'APP_SHELL_CACHED', count: cached });
      }
    });
  }
  
  if (event.data.type === 'CACHE_CITIES') {
    const cities = event.data.cities || [];
    console.log('[SW] Pre-caching', cities.length, 'flag images...');
    caches.open(IMAGE_CACHE).then(async (cache) => {
      let cached = 0;
      for (const imageUrl of cities) {
        try {
          const existing = await cache.match(imageUrl);
          if (!existing) {
            const response = await fetch(imageUrl, { mode: 'cors' });
            if (response.ok) {
              await cache.put(imageUrl, response);
              cached++;
            }
          } else {
            cached++;
          }
        } catch (err) {
          console.log('[SW] Failed to cache:', imageUrl);
        }
      }
      console.log('[SW] Cached', cached, '/', cities.length, 'flag images');
    });
  }
});
