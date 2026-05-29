import { useState, useEffect, useCallback } from 'react';
import { trackShareClick } from '@/lib/analytics';

const SHARE_PROMPT_DISMISSED_KEY = 'geoquest_share_prompt_dismissed';
const GUESS_GO_GAMES_KEY = 'geoquest_guess_go_games_count';

interface SharePromptState {
  shouldShowPrompt: boolean;
  dismissPrompt: () => void;
  recordGuessGoGame: () => void;
  checkStreakTrigger: (streak: number) => boolean;
}

export function useSharePrompt(): SharePromptState {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [guessGoGames, setGuessGoGames] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(SHARE_PROMPT_DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }
    
    const stored = localStorage.getItem(GUESS_GO_GAMES_KEY);
    if (stored) {
      const count = parseInt(stored, 10) || 0;
      setGuessGoGames(count);
      if (count >= 3) {
        setShouldShowPrompt(true);
      }
    }
  }, []);

  const recordGuessGoGame = useCallback(() => {
    const dismissed = localStorage.getItem(SHARE_PROMPT_DISMISSED_KEY);
    if (dismissed === 'true') return;
    
    setGuessGoGames(prev => {
      const newCount = prev + 1;
      localStorage.setItem(GUESS_GO_GAMES_KEY, String(newCount));
      
      if (newCount >= 3) {
        setShouldShowPrompt(true);
      }
      
      return newCount;
    });
  }, []);

  const checkStreakTrigger = useCallback((streak: number): boolean => {
    const dismissed = localStorage.getItem(SHARE_PROMPT_DISMISSED_KEY);
    if (dismissed === 'true') return false;
    
    if (streak >= 3) {
      setShouldShowPrompt(true);
      return true;
    }
    return false;
  }, []);

  const dismissPrompt = useCallback(() => {
    setShouldShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem(SHARE_PROMPT_DISMISSED_KEY, 'true');
  }, []);

  return {
    shouldShowPrompt: shouldShowPrompt && !isDismissed,
    dismissPrompt,
    recordGuessGoGame,
    checkStreakTrigger,
  };
}

export const SHARE_TEXT = "We tried this 5-min geography game — surprisingly fun. No ads.";
export const SHARE_URL = "https://geoquestgame.live";

export function shareViaWhatsApp() {
  trackShareClick('social', 'whatsapp');
  const text = encodeURIComponent(`${SHARE_TEXT} ${SHARE_URL}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

export function shareViaIMessage() {
  trackShareClick('social', 'imessage');
  const text = encodeURIComponent(`${SHARE_TEXT} ${SHARE_URL}`);
  window.location.href = `sms:&body=${text}`;
}

export function shareViaEmail() {
  trackShareClick('social', 'email');
  const subject = encodeURIComponent("Check out this fun geography game for kids!");
  const body = encodeURIComponent(`${SHARE_TEXT}\n\n${SHARE_URL}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
