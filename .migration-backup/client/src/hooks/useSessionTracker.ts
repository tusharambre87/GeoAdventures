import { useEffect, useRef, useCallback } from 'react';
import { getDeviceType } from '../lib/analytics';

const STORAGE_KEY = 'geoquest_visitor_id';
const SESSION_KEY = 'geoquest_session_id';
const SESSION_START_KEY = 'geoquest_session_start';
const GAME_TIME_KEY = 'geoquest_game_time';
const FIRST_GAME_STARTED_KEY = 'geoquest_first_game_started';
const FIRST_GAME_COMPLETED_KEY = 'geoquest_first_game_completed';
const UPDATE_INTERVAL = 60000;

function generateVisitorId(): string {
  return 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function getVisitorId(): string {
  let visitorId = localStorage.getItem(STORAGE_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  return visitorId;
}

export function useSessionTracker(playerId?: string) {
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const gameTimeRef = useRef<number>(0);
  const isInGameRef = useRef<boolean>(false);
  const gameStartTimeRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstSessionRef = useRef<boolean>(false);
  const firstGameStartedRef = useRef<boolean>(false);
  const firstGameCompletedRef = useRef<boolean>(false);

  const startSession = useCallback(async () => {
    const visitorId = getVisitorId();
    
    const existingSessionId = sessionStorage.getItem(SESSION_KEY);
    const existingStart = sessionStorage.getItem(SESSION_START_KEY);
    const existingGameTime = sessionStorage.getItem(GAME_TIME_KEY);
    
    if (existingSessionId && existingStart) {
      sessionIdRef.current = existingSessionId;
      sessionStartRef.current = parseInt(existingStart, 10);
      gameTimeRef.current = existingGameTime ? parseInt(existingGameTime, 10) : 0;
      firstGameStartedRef.current = sessionStorage.getItem(FIRST_GAME_STARTED_KEY) === 'true';
      firstGameCompletedRef.current = sessionStorage.getItem(FIRST_GAME_COMPLETED_KEY) === 'true';
      return;
    }
    
    try {
      const deviceType = getDeviceType();
      const landingPage = window.location.pathname;
      const hostname = window.location.hostname;
      
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, playerId, deviceType, landingPage, hostname }),
      });
      
      if (response.ok) {
        const data = await response.json();
        sessionIdRef.current = data.sessionId;
        sessionStartRef.current = Date.now();
        gameTimeRef.current = 0;
        isFirstSessionRef.current = data.isFirstSession || false;
        firstGameStartedRef.current = false;
        firstGameCompletedRef.current = false;
        
        sessionStorage.setItem(SESSION_KEY, data.sessionId);
        sessionStorage.setItem(SESSION_START_KEY, sessionStartRef.current.toString());
        sessionStorage.setItem(GAME_TIME_KEY, '0');
        sessionStorage.setItem(FIRST_GAME_STARTED_KEY, 'false');
        sessionStorage.setItem(FIRST_GAME_COMPLETED_KEY, 'false');
      }
    } catch (error) {
      // Silently fail - will retry on next update interval
    }
  }, [playerId]);

  const createNewSession = useCallback(async () => {
    const visitorId = getVisitorId();
    
    try {
      const deviceType = getDeviceType();
      const landingPage = window.location.pathname;
      const hostname = window.location.hostname;
      
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, playerId, deviceType, landingPage, hostname }),
      });
      
      if (response.ok) {
        const data = await response.json();
        sessionIdRef.current = data.sessionId;
        sessionStartRef.current = Date.now();
        gameTimeRef.current = 0;
        isFirstSessionRef.current = data.isFirstSession || false;
        firstGameStartedRef.current = false;
        firstGameCompletedRef.current = false;
        
        sessionStorage.setItem(SESSION_KEY, data.sessionId);
        sessionStorage.setItem(SESSION_START_KEY, sessionStartRef.current.toString());
        sessionStorage.setItem(GAME_TIME_KEY, '0');
        sessionStorage.setItem(FIRST_GAME_STARTED_KEY, 'false');
        sessionStorage.setItem(FIRST_GAME_COMPLETED_KEY, 'false');
        return true;
      }
    } catch (error) {
      // Silently fail - will retry on next update
    }
    return false;
  }, [playerId]);

  const updateSession = useCallback(async () => {
    if (!sessionIdRef.current) {
      await createNewSession();
      return;
    }
    
    const totalTimeSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    
    sessionStorage.setItem(GAME_TIME_KEY, gameTimeRef.current.toString());
    
    try {
      const response = await fetch('/api/session/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          totalTimeSeconds,
          gameTimeSeconds: gameTimeRef.current,
        }),
      });
      
      if (response.status === 404) {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_START_KEY);
        sessionStorage.removeItem(GAME_TIME_KEY);
        sessionIdRef.current = null;
        await createNewSession();
      }
    } catch (error) {
      // Network error - silently continue, will retry on next interval
    }
  }, [createNewSession]);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    
    if (isInGameRef.current && gameStartTimeRef.current) {
      const additionalGameTime = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      gameTimeRef.current += additionalGameTime;
    }
    
    const totalTimeSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    
    try {
      await fetch('/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          totalTimeSeconds,
          gameTimeSeconds: gameTimeRef.current,
        }),
      });
    } catch (error) {
      // Silently handle - session may already be gone
    }
    
    // Always clean up local storage regardless of API response
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_START_KEY);
    sessionStorage.removeItem(GAME_TIME_KEY);
    sessionStorage.removeItem(FIRST_GAME_STARTED_KEY);
    sessionStorage.removeItem(FIRST_GAME_COMPLETED_KEY);
    sessionIdRef.current = null;
  }, []);

  const startGameTimer = useCallback(async () => {
    if (isInGameRef.current) return;
    isInGameRef.current = true;
    gameStartTimeRef.current = Date.now();
    
    if (!firstGameStartedRef.current && sessionIdRef.current) {
      firstGameStartedRef.current = true;
      sessionStorage.setItem(FIRST_GAME_STARTED_KEY, 'true');
      
      try {
        await fetch('/api/session/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            firstGameStartedAt: new Date().toISOString(),
          }),
        });
      } catch (error) {
        // Silently fail
      }
    }
  }, []);

  const stopGameTimer = useCallback(async (gameCompleted?: boolean) => {
    if (!isInGameRef.current || !gameStartTimeRef.current) return;
    
    const additionalGameTime = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    gameTimeRef.current += additionalGameTime;
    
    isInGameRef.current = false;
    gameStartTimeRef.current = null;
    
    sessionStorage.setItem(GAME_TIME_KEY, gameTimeRef.current.toString());
    
    if (gameCompleted && !firstGameCompletedRef.current && sessionIdRef.current) {
      firstGameCompletedRef.current = true;
      sessionStorage.setItem(FIRST_GAME_COMPLETED_KEY, 'true');
      
      try {
        await fetch('/api/session/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            firstGameCompletedAt: new Date().toISOString(),
          }),
        });
      } catch (error) {
        // Silently fail
      }
    }
  }, []);

  const getSessionStats = useCallback(() => {
    const totalTimeSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    let currentGameTime = gameTimeRef.current;
    
    if (isInGameRef.current && gameStartTimeRef.current) {
      currentGameTime += Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    }
    
    return {
      totalTimeSeconds,
      gameTimeSeconds: currentGameTime,
      browsingTimeSeconds: totalTimeSeconds - currentGameTime,
    };
  }, []);

  useEffect(() => {
    startSession();
    
    updateIntervalRef.current = setInterval(updateSession, UPDATE_INTERVAL);
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateSession();
      }
    };
    
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const totalTimeSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        let finalGameTime = gameTimeRef.current;
        
        if (isInGameRef.current && gameStartTimeRef.current) {
          finalGameTime += Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
        }
        
        navigator.sendBeacon('/api/session/end', JSON.stringify({
          sessionId: sessionIdRef.current,
          totalTimeSeconds,
          gameTimeSeconds: finalGameTime,
        }));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [startSession, updateSession]);

  return {
    startGameTimer,
    stopGameTimer,
    getSessionStats,
    endSession,
  };
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
