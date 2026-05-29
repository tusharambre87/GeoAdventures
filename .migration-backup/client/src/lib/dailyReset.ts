import { useState, useEffect } from 'react';

export function getLocalMidnight(): Date {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return midnight;
}

export function getNextMidnight(): Date {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return tomorrow;
}

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const nextMidnight = getNextMidnight();
  const diff = nextMidnight.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

export function formatCountdown(time: { hours: number; minutes: number; seconds: number }): string {
  return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`;
}

export function isNewDay(lastPlayedDate: string | undefined | null): boolean {
  if (!lastPlayedDate) return true;
  
  const today = getTodayDateString();
  
  if (lastPlayedDate.includes('-')) {
    return lastPlayedDate !== today;
  }
  
  const lastDate = new Date(lastPlayedDate);
  const todayDate = new Date();
  
  return lastDate.getFullYear() !== todayDate.getFullYear() ||
         lastDate.getMonth() !== todayDate.getMonth() ||
         lastDate.getDate() !== todayDate.getDate();
}

export function useCountdown() {
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getTimeUntilMidnight());
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return countdown;
}
