import { createContext, useContext, ReactNode } from 'react';
import { useSessionTracker } from '@/hooks/useSessionTracker';

interface SessionContextType {
  startGameTimer: () => void;
  stopGameTimer: () => void;
  getSessionStats: () => { totalTimeSeconds: number; gameTimeSeconds: number; browsingTimeSeconds: number };
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children, playerId }: { children: ReactNode; playerId?: string }) {
  const session = useSessionTracker(playerId);
  
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function useSessionOptional() {
  return useContext(SessionContext);
}
