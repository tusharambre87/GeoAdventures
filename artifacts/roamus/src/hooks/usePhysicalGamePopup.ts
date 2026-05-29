import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/userContext';

interface PhysicalGamePopupState {
  shouldShow: boolean;
  isEligible: boolean;
  hasJoined: boolean;
  impressionCount: number;
}

interface UsePhysicalGamePopupReturn {
  shouldShowPopup: boolean;
  isEligible: boolean;
  hasJoined: boolean;
  showPopup: () => void;
  hidePopup: () => void;
  joinEarlyAccess: (name: string, email: string) => Promise<void>;
  dismissPopup: () => Promise<void>;
  checkEligibility: () => Promise<boolean>;
}

export function usePhysicalGamePopup(): UsePhysicalGamePopupReturn {
  const { user, stats } = useUser();
  const [state, setState] = useState<PhysicalGamePopupState>({
    shouldShow: false,
    isEligible: false,
    hasJoined: false,
    impressionCount: 0,
  });

  const checkEligibility = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const response = await fetch(`/api/physical-game/eligibility/${user.id}`);
      if (!response.ok) return false;
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        isEligible: data.isEligible,
        hasJoined: data.hasJoined,
        impressionCount: data.impressionCount || 0,
      }));
      
      return data.isEligible && !data.hasJoined && (data.impressionCount || 0) < 2;
    } catch (error) {
      console.error('Failed to check physical game eligibility:', error);
      return false;
    }
  }, [user?.id]);

  const showPopup = useCallback(() => {
    setState(prev => ({ ...prev, shouldShow: true }));
  }, []);

  const hidePopup = useCallback(() => {
    setState(prev => ({ ...prev, shouldShow: false }));
  }, []);

  const joinEarlyAccess = useCallback(async (name: string, email: string) => {
    // userId is optional - waitlist works for both logged-in and anonymous users
    const response = await fetch('/api/physical-game/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, name, email }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to join early access';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Use default message if response isn't JSON
      }
      
      // Log with context for debugging
      console.error('[PhysicalGame] Join failed:', { 
        status: response.status, 
        message: errorMessage,
        userId: user?.id 
      });
      
      // Provide user-friendly messages based on status
      if (response.status === 401) {
        throw new Error('Your session has expired. Please refresh and try again.');
      } else if (response.status === 403) {
        throw new Error('Unable to verify your account. Please refresh and try again.');
      } else if (response.status === 400) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    setState(prev => ({
      ...prev,
      hasJoined: true,
      impressionCount: prev.impressionCount + 1,
    }));
    
    return data;
  }, [user?.id]);

  const dismissPopup = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/physical-game/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        console.warn('[PhysicalGame] Dismiss failed silently:', response.status);
        // Don't throw - just update local state
      }
      
      setState(prev => ({
        ...prev,
        shouldShow: false,
        impressionCount: prev.impressionCount + 1,
      }));
    } catch (err) {
      console.error('[PhysicalGame] Dismiss error:', err);
      // Still update local state on network errors
      setState(prev => ({
        ...prev,
        shouldShow: false,
      }));
    }
  }, [user?.id]);

  return {
    shouldShowPopup: state.shouldShow,
    isEligible: state.isEligible,
    hasJoined: state.hasJoined,
    showPopup,
    hidePopup,
    joinEarlyAccess,
    dismissPopup,
    checkEligibility,
  };
}

export function shouldShowPhysicalGamePopup(
  totalGamesPlayed: number,
  guessAndGoWins: number,
  totalMinutesPlayed: number,
  impressionCount: number,
  hasJoined: boolean,
  lastDismissedDate: Date | null,
  isInTravelMode: boolean,
  isInGame: boolean
): boolean {
  if (hasJoined) return false;
  if (impressionCount >= 2) return false;
  if (isInTravelMode) return false;
  if (isInGame) return false;
  
  if (lastDismissedDate) {
    const daysSinceDismiss = Math.floor(
      (Date.now() - lastDismissedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceDismiss < 14) return false;
  }
  
  const hasMinimumGames = totalGamesPlayed >= 10;
  const hasGuessAndGoWins = guessAndGoWins >= 2;
  const hasMinimumTime = totalMinutesPlayed >= 10;
  
  return hasMinimumGames && hasGuessAndGoWins && hasMinimumTime;
}
