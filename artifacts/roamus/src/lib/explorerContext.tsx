import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Player } from '@shared/schema';

interface ExplorerStatsUpdate {
  starsEarnedTotal?: number;
  gamesPlayed?: number;
  missionsCompletedTotal?: number;
  collectedCardIds?: string[];
  passportMastery?: any[];
}

interface ExplorerContextType {
  activeExplorer: Player | null;
  explorers: Player[];
  isLoading: boolean;
  setActiveExplorer: (explorer: Player | null) => void;
  loadExplorers: (userId: string) => Promise<void>;
  createExplorer: (data: CreateExplorerData) => Promise<Player | null>;
  createGuestExplorer: (data: CreateExplorerData) => Promise<Player | null>;
  updateExplorer: (explorerId: string, data: Partial<CreateExplorerData>) => Promise<Player | null>;
  archiveExplorer: (explorerId: string) => Promise<boolean>;
  convertGuestToUser: (explorerId: string, userId: string) => Promise<Player | null>;
  clearActiveExplorer: () => void;
  updateActiveExplorerStats: (stats: ExplorerStatsUpdate) => void;
}

interface CreateExplorerData {
  name: string;
  userId?: string;
  email?: string;
  profileType?: 'kid' | 'adult' | 'parent';
  ageRange?: '3-5' | '6-9' | '9+' | 'adult';
  avatarKey?: string;
  difficultyLevel?: 'easy' | 'medium' | 'hard';
}

const ExplorerContext = createContext<ExplorerContextType | undefined>(undefined);

const STORAGE_KEY = 'geoquest_active_explorer';
const GUEST_EXPLORER_KEY = 'geoquest_guest_explorer';
const EXPLORERS_CACHE_KEY = 'geoquest_explorers_cache';
const LAST_USER_ID_KEY = 'geoquest_last_user_id';

export function ExplorerProvider({ children }: { children: ReactNode }) {
  const [activeExplorer, setActiveExplorerState] = useState<Player | null>(null);
  const [explorers, setExplorers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate that the explorer has required fields
        if (parsed && parsed.id && parsed.name) {
          setActiveExplorerState(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
    
    // Listen for custom event from userContext sync to keep state in sync (same-tab updates)
    const handleStatsUpdate = (e: CustomEvent) => {
      if (e.detail) {
        const updated = e.detail;
        setActiveExplorerState(updated);
        // Also update the explorers array to keep WhosPlaying in sync
        setExplorers(prev => prev.map(exp => exp.id === updated.id ? updated : exp));
      }
    };
    
    // Listen for logout events to clear explorer data (in-session)
    const handleLogout = () => {
      setActiveExplorerState(null);
      setExplorers([]);
    };
    
    // Also listen for cross-tab logout via storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'geoquest_user' && e.newValue === null) {
        setActiveExplorerState(null);
        setExplorers([]);
      }
    };
    
    window.addEventListener('explorerStatsUpdated', handleStatsUpdate as EventListener);
    window.addEventListener('geoquest:logout', handleLogout);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('explorerStatsUpdated', handleStatsUpdate as EventListener);
      window.removeEventListener('geoquest:logout', handleLogout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setActiveExplorer = useCallback((explorer: Player | null) => {
    setActiveExplorerState(explorer);
    if (explorer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(explorer));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearActiveExplorer = useCallback(() => {
    setActiveExplorerState(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GUEST_EXPLORER_KEY);
  }, []);

  const loadExplorers = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Check if user changed - if so, clear active explorer from previous user
      const lastUserId = localStorage.getItem(LAST_USER_ID_KEY);
      if (lastUserId && lastUserId !== userId) {
        // User changed - clear previous explorer selection
        setActiveExplorerState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      localStorage.setItem(LAST_USER_ID_KEY, userId);
      
      // Validate active explorer belongs to this user
      const storedExplorer = localStorage.getItem(STORAGE_KEY);
      if (storedExplorer) {
        try {
          const parsed = JSON.parse(storedExplorer);
          // If the explorer has a userId and it doesn't match current user, clear it
          if (parsed.userId && parsed.userId !== userId) {
            setActiveExplorerState(null);
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      
      // If offline, try to load from cache first
      if (!navigator.onLine) {
        const cached = localStorage.getItem(`${EXPLORERS_CACHE_KEY}_${userId}`);
        if (cached) {
          try {
            const cachedExplorers = JSON.parse(cached);
            setExplorers(cachedExplorers);
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Failed to parse cached explorers:', e);
          }
        }
      }
      
      const response = await fetch(`/api/explorers/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setExplorers(data);
        // Cache explorers for offline use
        localStorage.setItem(`${EXPLORERS_CACHE_KEY}_${userId}`, JSON.stringify(data));
        
        // Validate that the active explorer is in this user's explorer list
        if (activeExplorer && !data.some((e: Player) => e.id === activeExplorer.id)) {
          // Active explorer doesn't belong to this user - clear it
          setActiveExplorerState(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load explorers:', error);
      // Try to load from cache as fallback
      const cached = localStorage.getItem(`${EXPLORERS_CACHE_KEY}_${userId}`);
      if (cached) {
        try {
          const cachedExplorers = JSON.parse(cached);
          setExplorers(cachedExplorers);
        } catch (e) {
          console.error('Failed to parse cached explorers:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeExplorer]);

  const createExplorer = useCallback(async (data: CreateExplorerData): Promise<Player | null> => {
    try {
      const response = await fetch('/api/explorers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const explorer = await response.json();
        setExplorers(prev => [...prev, explorer]);
        return explorer;
      }
      return null;
    } catch (error) {
      console.error('Failed to create explorer:', error);
      return null;
    }
  }, []);

  const createGuestExplorer = useCallback(async (data: CreateExplorerData): Promise<Player | null> => {
    try {
      const response = await fetch('/api/explorers/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const explorer = await response.json();
        localStorage.setItem(GUEST_EXPLORER_KEY, JSON.stringify(explorer));
        setActiveExplorer(explorer);
        return explorer;
      }
      return null;
    } catch (error) {
      console.error('Failed to create guest explorer:', error);
      return null;
    }
  }, [setActiveExplorer]);

  const updateExplorer = useCallback(async (explorerId: string, data: Partial<CreateExplorerData>): Promise<Player | null> => {
    try {
      const response = await fetch(`/api/explorers/${explorerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const updated = await response.json();
        setExplorers(prev => prev.map(e => e.id === explorerId ? updated : e));
        if (activeExplorer?.id === explorerId) {
          setActiveExplorer(updated);
        }
        return updated;
      }
      return null;
    } catch (error) {
      console.error('Failed to update explorer:', error);
      return null;
    }
  }, [activeExplorer, setActiveExplorer]);

  const archiveExplorer = useCallback(async (explorerId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/explorers/${explorerId}/archive`, {
        method: 'POST',
      });
      if (response.ok) {
        setExplorers(prev => prev.filter(e => e.id !== explorerId));
        if (activeExplorer?.id === explorerId) {
          clearActiveExplorer();
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to archive explorer:', error);
      return false;
    }
  }, [activeExplorer, clearActiveExplorer]);

  const convertGuestToUser = useCallback(async (explorerId: string, userId: string): Promise<Player | null> => {
    try {
      const response = await fetch('/api/explorers/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explorerId, userId }),
      });
      if (response.ok) {
        const explorer = await response.json();
        localStorage.removeItem(GUEST_EXPLORER_KEY);
        setExplorers(prev => [...prev, explorer]);
        setActiveExplorer(explorer);
        return explorer;
      }
      return null;
    } catch (error) {
      console.error('Failed to convert guest explorer:', error);
      return null;
    }
  }, [setActiveExplorer]);

  const updateActiveExplorerStats = useCallback((statsUpdate: ExplorerStatsUpdate) => {
    if (!activeExplorer) return;
    
    const updated = {
      ...activeExplorer,
      ...(statsUpdate.starsEarnedTotal !== undefined && { starsEarnedTotal: statsUpdate.starsEarnedTotal }),
      ...(statsUpdate.gamesPlayed !== undefined && { gamesPlayed: statsUpdate.gamesPlayed }),
      ...(statsUpdate.missionsCompletedTotal !== undefined && { missionsCompletedTotal: statsUpdate.missionsCompletedTotal }),
      ...(statsUpdate.collectedCardIds !== undefined && { collectedCardIds: statsUpdate.collectedCardIds }),
      ...(statsUpdate.passportMastery !== undefined && { passportMastery: statsUpdate.passportMastery }),
    };
    
    setActiveExplorerState(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    setExplorers(prev => prev.map(e => e.id === activeExplorer.id ? updated : e));
  }, [activeExplorer]);

  return (
    <ExplorerContext.Provider
      value={{
        activeExplorer,
        explorers,
        isLoading,
        setActiveExplorer,
        loadExplorers,
        createExplorer,
        createGuestExplorer,
        updateExplorer,
        archiveExplorer,
        convertGuestToUser,
        clearActiveExplorer,
        updateActiveExplorerStats,
      }}
    >
      {children}
    </ExplorerContext.Provider>
  );
}

// Default context value for when useExplorer is called outside provider (edge cases during lazy loading)
const defaultExplorerContext: ExplorerContextType = {
  activeExplorer: null,
  explorers: [],
  isLoading: false,
  setActiveExplorer: () => {},
  loadExplorers: async () => {},
  createExplorer: async () => null,
  createGuestExplorer: async () => null,
  updateExplorer: async () => null,
  archiveExplorer: async () => false,
  convertGuestToUser: async () => null,
  clearActiveExplorer: () => {},
  updateActiveExplorerStats: () => {},
};

export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (context === undefined) {
    // Return safe fallback instead of throwing to handle edge cases
    // during lazy loading or when component mounts before provider
    console.warn('useExplorer called outside ExplorerProvider, returning fallback');
    return defaultExplorerContext;
  }
  return context;
}

export function getStoredGuestExplorer(): Player | null {
  const stored = localStorage.getItem(GUEST_EXPLORER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}
