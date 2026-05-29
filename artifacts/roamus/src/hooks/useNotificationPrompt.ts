import { useState, useEffect, useCallback } from 'react';
import { usePushNotifications } from './usePushNotifications';

const NOTIFICATION_PROMPT_DISMISSED_KEY = 'geoquest_notification_prompt_dismissed';
const NOTIFICATION_PROMPT_DISMISSED_AT_KEY = 'geoquest_notification_prompt_dismissed_at';
const DAILY_QUEST_COMPLETIONS_KEY = 'geoquest_daily_quest_completions';
const NOTIFICATION_PROMPT_SHOWN_KEY = 'geoquest_notification_prompt_shown';

const DISMISS_COOLDOWN_DAYS = 14;
const TRIGGER_AFTER_COMPLETIONS = 2;

interface NotificationPromptState {
  shouldShowPrompt: boolean;
  dismissPrompt: () => void;
  enableAndDismiss: () => Promise<boolean>;
  recordDailyQuestCompletion: () => void;
}

export function useNotificationPrompt(): NotificationPromptState {
  const { isSubscribed, isSupported, subscribe } = usePushNotifications();
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [completions, setCompletions] = useState(0);

  useEffect(() => {
    if (!isSupported) return;
    if (isSubscribed) {
      setShouldShowPrompt(false);
      return;
    }

    const dismissedAt = localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_AT_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt, 10));
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_COOLDOWN_DAYS) {
        return;
      }
    }

    const storedCompletions = localStorage.getItem(DAILY_QUEST_COMPLETIONS_KEY);
    if (storedCompletions) {
      const count = parseInt(storedCompletions, 10) || 0;
      setCompletions(count);
    }
  }, [isSupported, isSubscribed]);

  const checkIfShouldShow = useCallback((count: number): boolean => {
    if (!isSupported || isSubscribed) return false;
    
    const dismissedAt = localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_AT_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(parseInt(dismissedAt, 10));
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_COOLDOWN_DAYS) {
        return false;
      }
    }

    const alreadyShown = localStorage.getItem(NOTIFICATION_PROMPT_SHOWN_KEY);
    if (alreadyShown === 'true') {
      return false;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const isStandalone = (window.navigator as any).standalone === true;
      if (!isStandalone) {
        return false;
      }
    }

    return count >= TRIGGER_AFTER_COMPLETIONS;
  }, [isSupported, isSubscribed]);

  const recordDailyQuestCompletion = useCallback(() => {
    if (!isSupported || isSubscribed) return;
    
    setCompletions(prev => {
      const newCount = prev + 1;
      localStorage.setItem(DAILY_QUEST_COMPLETIONS_KEY, String(newCount));
      
      if (checkIfShouldShow(newCount)) {
        localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'true');
        setShouldShowPrompt(true);
      }
      
      return newCount;
    });
  }, [isSupported, isSubscribed, checkIfShouldShow]);

  const dismissPrompt = useCallback(() => {
    setShouldShowPrompt(false);
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_AT_KEY, String(Date.now()));
  }, []);

  const enableAndDismiss = useCallback(async () => {
    const success = await subscribe();
    if (success) {
      setShouldShowPrompt(false);
      localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_AT_KEY);
      localStorage.removeItem(NOTIFICATION_PROMPT_SHOWN_KEY);
    }
    return success;
  }, [subscribe]);

  return {
    shouldShowPrompt: shouldShowPrompt && !isSubscribed,
    dismissPrompt,
    enableAndDismiss,
    recordDailyQuestCompletion,
  };
}
