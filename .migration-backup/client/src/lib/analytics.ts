declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Google Analytics not configured - missing VITE_GA_MEASUREMENT_ID');
    return;
  }

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

export const trackShareClick = async (
  shareType: 'native' | 'clipboard' | 'social',
  context: string
) => {
  trackEvent('share_click', 'engagement', `${shareType}_${context}`);
  
  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'share_click',
        gameMode: context,
        difficulty: shareType
      })
    });
  } catch (error) {
    console.error('Failed to track share click:', error);
  }
};

export const trackGameEvent = async (
  eventType: 'game_start' | 'game_complete' | 'daily_quest_complete' | 'crossworld_complete' | 'find_my_home_complete',
  gameMode: string,
  data: {
    score?: number;
    starsEarned?: number;
    timeSpentSeconds?: number;
    completed?: boolean;
    won?: boolean;
    difficulty?: string;
  }
) => {
  trackEvent(eventType, 'game', gameMode, data.starsEarned || data.score);
  
  try {
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        gameMode,
        ...data
      })
    });
  } catch (error) {
    console.error('Failed to track game event:', error);
  }
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export const trackPwaInstall = async (visitorId: string, playerId?: string) => {
  const deviceType = getDeviceType();
  trackEvent('pwa_install', 'engagement', deviceType);
  
  try {
    await fetch('/api/analytics/pwa-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        playerId: playerId || null,
        deviceType,
      })
    });
    console.log('📱 PWA install tracked');
  } catch (error) {
    console.error('Failed to track PWA install:', error);
  }
};
