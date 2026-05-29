import { createContext, useContext, useRef, ReactNode } from 'react';
import { GeoBuddyRef } from '@/components/GeoBuddy';

interface GeoBuddyContextType {
  celebrate: () => void;
  offerHint: () => void;
  showMessage: (message: string) => void;
}

const GeoBuddyContext = createContext<GeoBuddyContextType | null>(null);

export function useGeoBuddy() {
  const context = useContext(GeoBuddyContext);
  if (!context) {
    return {
      celebrate: () => {},
      offerHint: () => {},
      showMessage: () => {},
    };
  }
  return context;
}

interface GeoBuddyProviderProps {
  children: ReactNode;
  buddyRef: React.RefObject<GeoBuddyRef | null>;
}

export function GeoBuddyProvider({ children, buddyRef }: GeoBuddyProviderProps) {
  const celebrate = () => buddyRef.current?.celebrate();
  const offerHint = () => buddyRef.current?.offerHint();
  const showMessage = (message: string) => buddyRef.current?.showMessage(message);

  return (
    <GeoBuddyContext.Provider value={{ celebrate, offerHint, showMessage }}>
      {children}
    </GeoBuddyContext.Provider>
  );
}
