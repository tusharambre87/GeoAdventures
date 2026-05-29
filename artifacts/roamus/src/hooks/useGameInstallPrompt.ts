import { useState, useEffect, useCallback } from 'react';

const GAMES_PLAYED_KEY = 'geoquest_games_for_install_prompt';
const INSTALL_PROMPT_DISMISSED_KEY = 'geoquest_install_prompt_dismissed';

interface GameInstallPromptState {
  shouldShowPrompt: boolean;
  gamesPlayed: number;
  dismissPrompt: () => void;
  recordGameCompleted: (gameType: string) => void;
  resetGamesCount: () => void;
}

export function useGameInstallPrompt(): GameInstallPromptState {
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    
    if (dismissed === 'true') {
      setIsDismissed(true);
      setShouldShowPrompt(false);
      setInitialized(true);
      return;
    }
    
    const stored = localStorage.getItem(GAMES_PLAYED_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setGamesPlayed(data.count || 0);
      } catch {
        setGamesPlayed(0);
      }
    }
    
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized || isDismissed) {
      setShouldShowPrompt(false);
      return;
    }
    
    if (gamesPlayed >= 2) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      if (!isStandalone) {
        setShouldShowPrompt(true);
      }
    }
  }, [gamesPlayed, isDismissed, initialized]);

  const recordGameCompleted = useCallback((gameType: string) => {
    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    if (dismissed === 'true') {
      return;
    }
    
    setGamesPlayed(prev => {
      const newCount = prev + 1;
      const stored = localStorage.getItem(GAMES_PLAYED_KEY);
      let data = { count: 0, games: [] as string[] };
      
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch {}
      }
      
      data.count = newCount;
      if (!data.games.includes(gameType)) {
        data.games.push(gameType);
      }
      
      localStorage.setItem(GAMES_PLAYED_KEY, JSON.stringify(data));
      return newCount;
    });
  }, []);

  const dismissPrompt = useCallback(() => {
    setShouldShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
    localStorage.removeItem(GAMES_PLAYED_KEY);
  }, []);

  const resetGamesCount = useCallback(() => {
    setGamesPlayed(0);
    localStorage.removeItem(GAMES_PLAYED_KEY);
    localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
    setIsDismissed(false);
  }, []);

  return {
    shouldShowPrompt,
    gamesPlayed,
    dismissPrompt,
    recordGameCompleted,
    resetGamesCount,
  };
}
