import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/userContext';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  dailyQuestReminders: boolean;
  streakProtectionAlerts: boolean;
  weeklyProgressUpdates: boolean;
  monthlyUpdates: boolean;
  geoAdventuresNotifications: boolean;
}

interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  needsIOSInstall: boolean;
  preferences: NotificationPreferences | null;
}

export function usePushNotifications() {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
    isIOS: false,
    isStandalone: false,
    needsIOSInstall: false,
    preferences: null,
  });

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    const checkStatus = async () => {
      if (!isSupported) {
        setState({
          isSupported: false,
          permission: 'unsupported',
          isSubscribed: false,
          isLoading: false,
          isIOS,
          isStandalone,
          needsIOSInstall: isIOS && !isStandalone,
          preferences: null,
        });
        return;
      }

      const permission = Notification.permission;
      let isSubscribed = false;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch (err) {
        console.error('[Push] Error checking subscription:', err);
      }

      let preferences: NotificationPreferences | null = null;
      if (isSubscribed && user) {
        try {
          const prefsResponse = await fetch('/api/push/subscriptions', {
            credentials: 'include',
          });
          if (prefsResponse.ok) {
            const subs = await prefsResponse.json();
            if (subs.length > 0) {
              const sub = subs[0];
              preferences = {
                dailyQuestReminders: sub.dailyQuestReminders ?? false,
                streakProtectionAlerts: sub.streakProtectionAlerts ?? true,
                weeklyProgressUpdates: sub.weeklyProgressUpdates ?? false,
                monthlyUpdates: sub.monthlyUpdates ?? true,
                geoAdventuresNotifications: sub.geoAdventuresNotifications ?? true,
              };
            }
          }
        } catch (err) {
          console.error('[Push] Error fetching preferences:', err);
        }
      }

      setState({
        isSupported: true,
        permission,
        isSubscribed,
        isLoading: false,
        isIOS,
        isStandalone,
        needsIOSInstall: isIOS && !isStandalone,
        preferences,
      });
    };

    checkStatus();
  }, [isSupported, isIOS, isStandalone, user]);

  const subscribe = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to enable notifications',
        variant: 'destructive',
      });
      return false;
    }

    setState(s => ({ ...s, isLoading: true }));

    try {
      console.log('[Push] Starting subscription...');
      
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Push notifications not available');
      }
      const { publicKey } = await vapidResponse.json();
      console.log('[Push] Got VAPID key');

      const permission = await Notification.requestPermission();
      console.log('[Push] Permission result:', permission);
      if (permission !== 'granted') {
        setState(s => ({ ...s, permission, isLoading: false }));
        toast({
          title: 'Permission denied',
          description: 'Please allow notifications in your browser settings',
          variant: 'destructive',
        });
        return false;
      }

      console.log('[Push] Waiting for service worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready');
      
      let subscription = await registration.pushManager.getSubscription();
      console.log('[Push] Existing subscription:', !!subscription);
      
      if (!subscription) {
        console.log('[Push] Creating new subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        console.log('[Push] New subscription created');
      }

      const subscriptionJSON = subscription.toJSON();
      console.log('[Push] Saving subscription to backend...');
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscriptionJSON.keys?.p256dh,
              auth: subscriptionJSON.keys?.auth,
            },
          },
          deviceType: getDeviceType(),
          browserName: getBrowserName(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }
      
      const savedSubscription = await response.json();
      console.log('[Push] Subscription saved:', savedSubscription);

      setState(s => ({ 
        ...s, 
        permission: 'granted', 
        isSubscribed: true, 
        isLoading: false,
        preferences: {
          dailyQuestReminders: savedSubscription.dailyQuestReminders ?? false,
          streakProtectionAlerts: savedSubscription.streakProtectionAlerts ?? true,
          weeklyProgressUpdates: savedSubscription.weeklyProgressUpdates ?? false,
          monthlyUpdates: savedSubscription.monthlyUpdates ?? true,
          geoAdventuresNotifications: savedSubscription.geoAdventuresNotifications ?? true,
        },
      }));
      
      toast({
        title: 'Notifications enabled!',
        description: 'You can now customize which alerts you receive',
      });
      
      return true;
    } catch (err: any) {
      console.error('[Push] Subscribe error:', err);
      setState(s => ({ ...s, isLoading: false }));
      toast({
        title: 'Subscription failed',
        description: err.message || 'Could not enable notifications',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  const unsubscribe = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        
        await subscription.unsubscribe();
      }

      setState(s => ({ ...s, isSubscribed: false, isLoading: false }));
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications',
      });
      return true;
    } catch (err: any) {
      console.error('[Push] Unsubscribe error:', err);
      setState(s => ({ ...s, isLoading: false }));
      toast({
        title: 'Error',
        description: 'Could not disable notifications',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const sendTestNotification = useCallback(async () => {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
      
      toast({
        title: 'Test sent',
        description: 'Check for the notification',
      });
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!state.isSubscribed) return false;
    
    setState(s => ({ ...s, isLoading: true }));
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        setState(s => ({ ...s, isLoading: false }));
        return false;
      }
      
      const response = await fetch('/api/push/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          preferences: updates,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      
      const updated = await response.json();
      
      setState(s => ({
        ...s,
        isLoading: false,
        preferences: {
          dailyQuestReminders: updated.dailyQuestReminders ?? false,
          streakProtectionAlerts: updated.streakProtectionAlerts ?? true,
          weeklyProgressUpdates: updated.weeklyProgressUpdates ?? false,
          monthlyUpdates: updated.monthlyUpdates ?? true,
          geoAdventuresNotifications: updated.geoAdventuresNotifications ?? true,
        },
      }));
      
      return true;
    } catch (err: any) {
      console.error('[Push] Update preferences error:', err);
      setState(s => ({ ...s, isLoading: false }));
      toast({
        title: 'Error',
        description: 'Could not update notification preferences',
        variant: 'destructive',
      });
      return false;
    }
  }, [state.isSubscribed, toast]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    updatePreferences,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return 'tablet';
  if (/iPhone|iPod/.test(ua)) return 'mobile';
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return 'mobile';
    return 'tablet';
  }
  return 'desktop';
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (/Chrome/.test(ua) && !/Chromium|Edge/.test(ua)) return 'Chrome';
  if (/Firefox/.test(ua)) return 'Firefox';
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/Edge/.test(ua)) return 'Edge';
  return 'Unknown';
}
