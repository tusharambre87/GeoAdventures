import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/userContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const STORAGE_KEYS = {
  MINI_GAMES_TODAY: 'geoquest_free_minigames_today',
  MINI_GAMES_DATE: 'geoquest_free_minigames_date',
  DECLINED_TRIAL: 'geoquest_declined_trial',
  DECLINED_TRIAL_AT: 'geoquest_declined_trial_at',
  LAST_REINVITE_DATE: 'geoquest_last_reinvite_date',
  GUESS_AND_GO_GAMES: 'geoquest_free_guess_go_count',
  DAILY_QUEST_DAYS: 'geoquest_free_daily_quest_days',
  DAILY_QUEST_LAST_DATE: 'geoquest_free_daily_quest_last_date',
  VIRTUAL_ADVENTURES: 'geoquest_virtual_adventures_count',
  GAME_LIMIT_DAYS: 'geoquest_game_limit_days',
  EARLY_EXPLORER_SHOWN: 'geoquest_early_explorer_shown',
  PAID_TRIP_UNLOCK: 'geoquest_paid_trip_unlocked',
  PAID_TRIP_COMPLETED: 'geoquest_paid_trip_completed',
};

const FREE_LIMITS = {
  MINI_GAMES_PER_DAY: 3,
  VIRTUAL_ADVENTURES_LIFETIME: 2,
};

const PREMIUM_GAMES = ['flag_quiz', 'map_me', 'spin_globe', 'globe_spinner'];

export interface FreeLimitsState {
  miniGamesPlayedToday: number;
  hasReachedDailyGameLimit: boolean;
  hasReachedFreeLimit: boolean;
  hasDeclinedTrial: boolean;
  canPlayFreeGame: boolean;
  shouldShowFoundingInvitation: boolean;
  shouldShowReinvite: boolean;
  guessAndGoGamesPlayed: number;
  dailyQuestDaysUsed: number;
  canPlayGuessAndGo: boolean;
  canPlayDailyQuest: boolean;
  virtualAdventuresStarted: number;
  hasReachedVirtualAdventureCap: boolean;
  gameLimitDayCount: number;
  earlyExplorerShown: boolean;
  hasPaidTripUnlock: boolean;
  hasCompletedPaidTrip: boolean;
}

export function useFreeLimits() {
  const { user } = useUser();
  const { hasActiveSubscription, isTrialActive, tier, isAdmin } = useSubscription();
  const { foundingFamiliesEnabled, paywallEnabled } = useFeatureFlags();
  
  const [state, setState] = useState<FreeLimitsState>({
    miniGamesPlayedToday: 0,
    hasReachedDailyGameLimit: false,
    hasReachedFreeLimit: false,
    hasDeclinedTrial: false,
    canPlayFreeGame: true,
    shouldShowFoundingInvitation: false,
    shouldShowReinvite: false,
    guessAndGoGamesPlayed: 0,
    dailyQuestDaysUsed: 0,
    canPlayGuessAndGo: true,
    canPlayDailyQuest: true,
    virtualAdventuresStarted: 0,
    hasReachedVirtualAdventureCap: false,
    gameLimitDayCount: 0,
    earlyExplorerShown: false,
    hasPaidTripUnlock: false,
    hasCompletedPaidTrip: false,
  });

  const isPaidUser = !paywallEnabled || isAdmin || hasActiveSubscription || isTrialActive || tier !== 'free';
  
  const shouldGateFeatures = foundingFamiliesEnabled && paywallEnabled;

  const loadFromStorage = useCallback(() => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(STORAGE_KEYS.MINI_GAMES_DATE);
    
    let miniGamesPlayedToday = 0;
    if (storedDate === today) {
      miniGamesPlayedToday = parseInt(localStorage.getItem(STORAGE_KEYS.MINI_GAMES_TODAY) || '0', 10);
    } else {
      localStorage.setItem(STORAGE_KEYS.MINI_GAMES_DATE, today);
      localStorage.setItem(STORAGE_KEYS.MINI_GAMES_TODAY, '0');
    }

    const hasDeclinedTrial = localStorage.getItem(STORAGE_KEYS.DECLINED_TRIAL) === 'true';
    const lastReinviteDate = localStorage.getItem(STORAGE_KEYS.LAST_REINVITE_DATE);

    const hasReachedDailyGameLimit = miniGamesPlayedToday >= FREE_LIMITS.MINI_GAMES_PER_DAY;
    const hasReachedFreeLimit = hasReachedDailyGameLimit;

    const shouldShowReinvite = hasDeclinedTrial && hasReachedFreeLimit && lastReinviteDate !== today;

    const guessAndGoGamesPlayed = parseInt(localStorage.getItem(STORAGE_KEYS.GUESS_AND_GO_GAMES) || '0', 10);
    const dailyQuestDaysUsed = parseInt(localStorage.getItem(STORAGE_KEYS.DAILY_QUEST_DAYS) || '0', 10);

    const virtualAdventuresStarted = parseInt(localStorage.getItem(STORAGE_KEYS.VIRTUAL_ADVENTURES) || '0', 10);
    const hasReachedVirtualAdventureCap = !isPaidUser && virtualAdventuresStarted >= FREE_LIMITS.VIRTUAL_ADVENTURES_LIFETIME;

    const gameLimitDaysRaw = localStorage.getItem(STORAGE_KEYS.GAME_LIMIT_DAYS);
    let gameLimitDayCount = 0;
    try {
      const days: string[] = gameLimitDaysRaw ? JSON.parse(gameLimitDaysRaw) : [];
      gameLimitDayCount = days.length;
    } catch {}

    const earlyExplorerShown = localStorage.getItem(STORAGE_KEYS.EARLY_EXPLORER_SHOWN) === 'true';
    const hasPaidTripUnlock = localStorage.getItem(STORAGE_KEYS.PAID_TRIP_UNLOCK) === 'true';
    const hasCompletedPaidTrip = localStorage.getItem(STORAGE_KEYS.PAID_TRIP_COMPLETED) === 'true';

    setState({
      miniGamesPlayedToday,
      hasReachedDailyGameLimit,
      hasReachedFreeLimit,
      hasDeclinedTrial,
      canPlayFreeGame: !hasReachedDailyGameLimit || isPaidUser,
      shouldShowFoundingInvitation: shouldGateFeatures && hasReachedFreeLimit && !hasDeclinedTrial && !isPaidUser,
      shouldShowReinvite: shouldGateFeatures && shouldShowReinvite && !isPaidUser,
      guessAndGoGamesPlayed,
      dailyQuestDaysUsed,
      canPlayGuessAndGo: true,
      canPlayDailyQuest: true,
      virtualAdventuresStarted,
      hasReachedVirtualAdventureCap,
      gameLimitDayCount,
      earlyExplorerShown,
      hasPaidTripUnlock,
      hasCompletedPaidTrip,
    });
  }, [isPaidUser, shouldGateFeatures]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage, user]);

  const recordMiniGame = useCallback(() => {
    if (isPaidUser) return false;
    
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(STORAGE_KEYS.MINI_GAMES_DATE);
    
    let current = 0;
    if (storedDate === today) {
      current = parseInt(localStorage.getItem(STORAGE_KEYS.MINI_GAMES_TODAY) || '0', 10);
    } else {
      localStorage.setItem(STORAGE_KEYS.MINI_GAMES_DATE, today);
    }
    
    const newCount = current + 1;
    localStorage.setItem(STORAGE_KEYS.MINI_GAMES_TODAY, String(newCount));

    const hitLimit = newCount >= FREE_LIMITS.MINI_GAMES_PER_DAY;
    if (hitLimit) {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.GAME_LIMIT_DAYS);
        const days: string[] = raw ? JSON.parse(raw) : [];
        if (!days.includes(today)) {
          days.push(today);
          localStorage.setItem(STORAGE_KEYS.GAME_LIMIT_DAYS, JSON.stringify(days));
        }
      } catch {}
    }

    loadFromStorage();
    return hitLimit;
  }, [isPaidUser, loadFromStorage]);

  const recordAdventureCreated = useCallback(() => {
    return false;
  }, []);

  const recordVirtualAdventureStarted = useCallback(() => {
    const current = parseInt(localStorage.getItem(STORAGE_KEYS.VIRTUAL_ADVENTURES) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.VIRTUAL_ADVENTURES, String(current + 1));
    loadFromStorage();
  }, [loadFromStorage]);

  const markEarlyExplorerShown = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.EARLY_EXPLORER_SHOWN, 'true');
    loadFromStorage();
  }, [loadFromStorage]);

  const recordPaidTripUnlocked = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.PAID_TRIP_UNLOCK, 'true');
    loadFromStorage();
  }, [loadFromStorage]);

  const recordFirstPaidTripCompleted = useCallback(() => {
    if (localStorage.getItem(STORAGE_KEYS.PAID_TRIP_COMPLETED) === 'true') return;
    localStorage.setItem(STORAGE_KEYS.PAID_TRIP_COMPLETED, 'true');
    loadFromStorage();
  }, [loadFromStorage]);

  const recordGuessAndGoGame = useCallback(() => {
    if (isPaidUser) return;
    const current = parseInt(localStorage.getItem(STORAGE_KEYS.GUESS_AND_GO_GAMES) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.GUESS_AND_GO_GAMES, String(current + 1));
    loadFromStorage();
  }, [isPaidUser, loadFromStorage]);

  const recordDailyQuestDay = useCallback(() => {
    if (isPaidUser) return;
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(STORAGE_KEYS.DAILY_QUEST_LAST_DATE);
    if (lastDate === today) return false;
    localStorage.setItem(STORAGE_KEYS.DAILY_QUEST_LAST_DATE, today);
    const current = parseInt(localStorage.getItem(STORAGE_KEYS.DAILY_QUEST_DAYS) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.DAILY_QUEST_DAYS, String(current + 1));
    loadFromStorage();
  }, [isPaidUser, loadFromStorage]);

  const isPremiumGame = useCallback((gameId: string) => {
    return PREMIUM_GAMES.includes(gameId);
  }, []);

  const canPlayGame = useCallback((gameId: string) => {
    if (isPaidUser) return true;
    if (PREMIUM_GAMES.includes(gameId)) return false;
    return !state.hasReachedDailyGameLimit;
  }, [isPaidUser, state.hasReachedDailyGameLimit]);

  const declineTrial = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.DECLINED_TRIAL, 'true');
    localStorage.setItem(STORAGE_KEYS.DECLINED_TRIAL_AT, new Date().toISOString());
    loadFromStorage();
  }, [loadFromStorage]);

  const recordReinviteShown = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.LAST_REINVITE_DATE, new Date().toDateString());
    loadFromStorage();
  }, [loadFromStorage]);

  const resetForNewUser = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    loadFromStorage();
  }, [loadFromStorage]);

  const getRemainingGamesToday = useCallback(() => {
    return Math.max(0, FREE_LIMITS.MINI_GAMES_PER_DAY - state.miniGamesPlayedToday);
  }, [state.miniGamesPlayedToday]);

  return {
    ...state,
    recordMiniGame,
    recordAdventureCreated,
    recordVirtualAdventureStarted,
    markEarlyExplorerShown,
    recordPaidTripUnlocked,
    recordFirstPaidTripCompleted,
    recordGuessAndGoGame,
    recordDailyQuestDay,
    isPremiumGame,
    canPlayGame,
    declineTrial,
    recordReinviteShown,
    resetForNewUser,
    getRemainingGamesToday,
    FREE_LIMITS,
    isPaidUser,
  };
}
