import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { triggerVerificationReminder } from "./verificationReminder";
import { STREAK_BADGES } from "./gameData";
import { getTodayDateString } from "./dailyReset";
import { dispatchXPGain } from "@/components/XPGainToast";

interface UserProfile {
  id?: string;
  username: string;
  email?: string;
  firstName?: string;
  age?: string;
  avatarColor?: string;
  registeredPlayers?: { name: string; age: string; id?: string }[];
  profileImageUrl?: string;
  onboardingCompleted?: Record<string, boolean>;
  isAdmin?: boolean;
  subscriptionTier?: string;
  trialEndDate?: string;
  subscriptionEndDate?: string;
  createdAt?: string;
  isFoundingFamily?: boolean;
  foundingFamilyNumber?: number | null;
  foundingFreeCityId?: string | null;
  purchasedCityIds?: string[];
  offlineGeoGamesEnabled?: boolean;
  offlineTravelEnabled?: boolean;
  videoMakerEnabled?: boolean;
  maxStopsPerAdventure?: number | null;
  pricingBand?: string;
}

interface GameResult {
  date: string;
  stars: number;
  won: boolean;
}

interface UserStats {
  gamesPlayed: number;
  starsEarnedTotal: number;
  missionsCompletedTotal: number;
  gameHistory: GameResult[];
  dailyQuestStreak?: number;
  dailyQuestWinStreak?: number;
  dailyQuestBestTime?: number;
  lastDailyQuestDate?: string;
  crossworldStreak?: number;
  crossworldLastPlayed?: string;
  crossworldBestTime?: number;
  crossworldStatus?: "WON" | "LOST" | "GIVEN_UP";
  crossworldMode?: "EASY" | "HARD";
  crossworldTotalGames?: number;
  crossworldTotalWins?: number;
  crossworldLastPlayedEasy?: string;
  crossworldLastPlayedHard?: string;
  crossworldStatusEasy?: "WON" | "LOST" | "GIVEN_UP";
  crossworldStatusHard?: "WON" | "LOST" | "GIVEN_UP";
  findMyHomeUnlockedIds?: string[];
  unlockedStreakBadgeIds?: string[];
  bonusHintsFromStreak?: number;
  longestStreak?: number;
  spellGeoCollectedStates?: string[];
  // Unified Explorer Streak (any game: Guess & Go, Daily Quest, CrossWorld)
  explorerStreak?: number;
  lastExplorerStreakDate?: string;
  lastExplorerGameType?: string;
  streakGraceAvailable?: boolean;
  longestExplorerStreak?: number;
  // Daily Quest max streak and streak freezes
  dailyQuestMaxStreak?: number;
  streakFreezes?: number;
}

export interface PerGameStats {
  totalGames: number;
  wins: number;
  losses: number;
  bestTimeMs?: number | null;
  recentOutcomes: { won: boolean; date: string; timeMs?: number }[];
}

export interface GameSessionResult {
  streakResult: {
    newStreak: number;
    dailyQuestStreak: number;
    graceUsed: boolean;
    streakReset: boolean;
    previousStreak: number;
  };
  gameStats: PerGameStats;
}

interface StreakBadgeUnlock {
  badge: { id: string; name: string; icon: string; description: string };
  bonusHints?: number;
}

interface PassportMasteryEntry {
  cityId: string;
  star1: boolean;
  star2: boolean;
  star3: boolean;
  star4: boolean;
  star5: boolean;
  discoveredDate: string;
  star2LastAttempt?: string;
  star3LastAttempt?: string;
  star4LastAttempt?: string;
  lastInteraction?: string;
  visitedInGeoAdventures?: boolean;
}

interface UserContextType {
  user: UserProfile | null;
  stats: UserStats;
  collectedCardIds: string[]; // IDs of cards collected
  collectedCardTimestamps: Record<string, string>; // cityId -> ISO timestamp when collected
  unlockedAchievementIds: string[];
  passportMastery: PassportMasteryEntry[];
  currentPlayerId: string | null;
  setCurrentPlayerId: (id: string | null) => void;
  login: (username: string, email?: string, age?: string, registeredPlayers?: { name: string; age: string; id?: string }[], options?: { registrationSource?: string; verified?: boolean; userId?: string }) => void;
  logout: () => void;
  addCollectedCard: (cardId: string) => void;
  getCollectedCardTimestamp: (cardId: string) => string | null;
  unlockAchievement: (achievementId: string) => void;
  awardPassportStar: (cityId: string, starNum: 1 | 2 | 3 | 4 | 5) => void;
  recordMasteryAttempt: (cityId: string, starNum: 2 | 3 | 4) => void;
  getPassportMastery: (cityId: string) => PassportMasteryEntry | undefined;
  refreshStampInteraction: (cityId: string) => void;
  markCityVisitedInGeoAdventures: (cityId: string) => void;
  recordGameResult: (stars: number, won: boolean) => void;
  recordDailyQuestPlayed: (won: boolean, timeInSeconds?: number) => void;
  recordCrossworldResult: (timeInSeconds: number, status: "WON" | "LOST" | "GIVEN_UP", mode: "EASY" | "HARD") => void;
  unlockFindMyHomeBuddy: (buddyId: string) => void;
  addMissionCompleted: () => void;
  addStars: (amount: number) => void;
  addSpellGeoState: (stateAbbr: string) => void;
  syncStatsToBackend: () => Promise<void>;
  loadPlayerFromBackend: (playerId: string) => Promise<void>;
  queueCardAdditionForSync: (playerId: string, cardIds: string[]) => void;
  syncPendingCards: (playerId: string) => Promise<void>;
  checkStreakBadges: (streak: number) => StreakBadgeUnlock[];
  getBonusHintsFromStreak: () => number;
  recordGameSession: (gameType: 'guess_and_go' | 'daily_quest' | 'crossworld', won: boolean, timeMs?: number) => Promise<GameSessionResult | null>;
  getPerGameStats: (gameType: 'guess_and_go' | 'daily_quest' | 'crossworld') => Promise<PerGameStats | null>;
  getAllGameStats: () => Promise<Record<string, PerGameStats>>;
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingPlayer: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ 
    gamesPlayed: 0, 
    starsEarnedTotal: 0, 
    missionsCompletedTotal: 0,
    gameHistory: [] 
  });
  const [collectedCardIds, setCollectedCardIds] = useState<string[]>([]);
  const [collectedCardTimestamps, setCollectedCardTimestamps] = useState<Record<string, string>>({});
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);
  const [passportMastery, setPassportMastery] = useState<PassportMasteryEntry[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncPendingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayerIdRef = useRef<string | null>(null);

  // Sync with authenticated user from backend
  useEffect(() => {
    if (isAuthenticated && authUser) {
      const backendUser = authUser as any;
      const userData: UserProfile = {
        id: backendUser.id,
        username: backendUser.firstName || backendUser.email?.split('@')[0] || 'Explorer',
        firstName: backendUser.firstName,
        email: backendUser.email,
        avatarColor: "bg-blue-500",
        profileImageUrl: backendUser.profileImageUrl,
        isAdmin: backendUser.isAdmin === true,
        subscriptionTier: backendUser.subscriptionTier,
        trialEndDate: backendUser.trialEndDate,
        subscriptionEndDate: backendUser.subscriptionEndDate,
        createdAt: backendUser.createdAt,
        isFoundingFamily: backendUser.isFoundingFamily,
        foundingFamilyNumber: backendUser.foundingFamilyNumber,
        foundingFreeCityId: backendUser.foundingFreeCityId,
        purchasedCityIds: backendUser.purchasedCityIds || [],
        offlineGeoGamesEnabled: backendUser.offlineGeoGamesEnabled,
        offlineTravelEnabled: backendUser.offlineTravelEnabled,
        videoMakerEnabled: backendUser.videoMakerEnabled,
        maxStopsPerAdventure: backendUser.maxStopsPerAdventure,
      };
      setUser(userData);
      // Save complete user data including ID for PWA standalone mode fallback
      localStorage.setItem("geoquest_user", JSON.stringify(userData));
    }
  }, [isAuthenticated, authUser]);

  // Load from localStorage on mount (User Persistence) - fallback for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      const savedUser = localStorage.getItem("geoquest_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Failed to parse user", e);
        }
      }
    }
  }, [isAuthenticated, authLoading]);

  // Load Stats/Collection from localStorage - only as fallback when no active explorer
  // When currentPlayerId is set, loadPlayerFromBackend handles loading stats
  useEffect(() => {
    // Skip localStorage load if we have an active player - backend data takes precedence
    if (currentPlayerId) {
      return;
    }
    
    // Determine key based on user (or guest)
    // Use email as primary key, fallback to username, fallback to 'guest'
    const userKey = user ? (user.email || user.username) : "guest";
    
    const statsKey = `geoquest_stats_${userKey}`;
    const collectionKey = `geoquest_collection_${userKey}`;
    const timestampsKey = `geoquest_timestamps_${userKey}`;
    const achievementsKey = `geoquest_achievements_${userKey}`;
    const masteryKey = `geoquest_mastery_${userKey}`;

    const savedStats = localStorage.getItem(statsKey);
    const savedCollection = localStorage.getItem(collectionKey);
    const savedTimestamps = localStorage.getItem(timestampsKey);
    const savedAchievements = localStorage.getItem(achievementsKey);
    const savedMastery = localStorage.getItem(masteryKey);

    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        // Migration/Safety check
        if (!parsed.gameHistory) parsed.gameHistory = [];
        setStats(parsed);
      } catch (e) {
        console.error("Failed to parse stats", e);
        setStats({ gamesPlayed: 0, starsEarnedTotal: 0, missionsCompletedTotal: 0, gameHistory: [] });
      }
    } else {
      // Reset to fresh stats for this new user/guest context
      setStats({ gamesPlayed: 0, starsEarnedTotal: 0, missionsCompletedTotal: 0, gameHistory: [] });
    }

    if (savedCollection) {
      try {
        setCollectedCardIds(JSON.parse(savedCollection));
      } catch (e) {
        setCollectedCardIds([]);
      }
    } else {
      setCollectedCardIds([]);
    }

    if (savedTimestamps) {
      try {
        setCollectedCardTimestamps(JSON.parse(savedTimestamps));
      } catch (e) {
        setCollectedCardTimestamps({});
      }
    } else {
      setCollectedCardTimestamps({});
    }

    if (savedAchievements) {
      try {
        setUnlockedAchievementIds(JSON.parse(savedAchievements));
      } catch (e) {
        setUnlockedAchievementIds([]);
      }
    } else {
      setUnlockedAchievementIds([]);
    }

    if (savedMastery) {
      try {
        setPassportMastery(JSON.parse(savedMastery));
      } catch (e) {
        setPassportMastery([]);
      }
    } else {
      setPassportMastery([]);
    }
  }, [user?.email, user?.username, currentPlayerId]); // Also depend on currentPlayerId

  // Track previous player ID to detect explorer switches
  const prevPlayerIdRef = useRef<string | null>(null);
  
  // Cancel pending syncs and reset stats when explorer changes to prevent cross-profile contamination
  useEffect(() => {
    const prevPlayerId = prevPlayerIdRef.current;
    
    // Keep ref in sync for setTimeout callbacks to access current value
    currentPlayerIdRef.current = currentPlayerId;
    
    // Detect explorer switch (not initial mount)
    if (prevPlayerId !== null && prevPlayerId !== currentPlayerId) {
      console.log('🔄 [Explorer Switch] Changing from', prevPlayerId, 'to', currentPlayerId);
      
      // Cancel any pending sync timeout to prevent sending wrong data
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      
      // Reset sync pending flag
      syncPendingRef.current = false;
      
      // Reset stats to clean slate - loadPlayerFromBackend will populate with correct data
      // This prevents showing stale metrics from previous explorer during load
      setStats({ gamesPlayed: 0, starsEarnedTotal: 0, missionsCompletedTotal: 0, gameHistory: [] });
      setCollectedCardIds([]);
      setCollectedCardTimestamps({});
      setUnlockedAchievementIds([]);
      setPassportMastery([]);
    }
    
    prevPlayerIdRef.current = currentPlayerId;
  }, [currentPlayerId]);

  // Save User persistence
  useEffect(() => {
    if (user) localStorage.setItem("geoquest_user", JSON.stringify(user));
    else localStorage.removeItem("geoquest_user");
  }, [user]);

  // Save Stats persistence - use explorer-scoped key when explorer is active
  useEffect(() => {
    if (isLoadingPlayer) return;
    const storageKey = currentPlayerId 
      ? `geoquest_stats_explorer_${currentPlayerId}`
      : `geoquest_stats_${user ? (user.email || user.username) : "guest"}`;
    localStorage.setItem(storageKey, JSON.stringify(stats));
  }, [stats, user?.email, user?.username, currentPlayerId, isLoadingPlayer]);

  // Save Collection persistence - use explorer-scoped key when explorer is active
  useEffect(() => {
    if (isLoadingPlayer) return;
    const storageKey = currentPlayerId 
      ? `geoquest_collection_explorer_${currentPlayerId}`
      : `geoquest_collection_${user ? (user.email || user.username) : "guest"}`;
    localStorage.setItem(storageKey, JSON.stringify(collectedCardIds));
  }, [collectedCardIds, user?.email, user?.username, currentPlayerId, isLoadingPlayer]);
  
  // Save Collection Timestamps persistence - use explorer-scoped key when explorer is active
  useEffect(() => {
    const storageKey = currentPlayerId 
      ? `geoquest_timestamps_explorer_${currentPlayerId}`
      : `geoquest_timestamps_${user ? (user.email || user.username) : "guest"}`;
    localStorage.setItem(storageKey, JSON.stringify(collectedCardTimestamps));
  }, [collectedCardTimestamps, user?.email, user?.username, currentPlayerId]);

  // Save Achievements persistence - use explorer-scoped key when explorer is active
  useEffect(() => {
    const storageKey = currentPlayerId 
      ? `geoquest_achievements_explorer_${currentPlayerId}`
      : `geoquest_achievements_${user ? (user.email || user.username) : "guest"}`;
    localStorage.setItem(storageKey, JSON.stringify(unlockedAchievementIds));
  }, [unlockedAchievementIds, user?.email, user?.username, currentPlayerId]);

  // Save Passport Mastery persistence - use explorer-scoped key when explorer is active
  // Guard: skip writing while loadPlayer is in progress to prevent overwriting freshly-saved stars
  useEffect(() => {
    if (isLoadingPlayer) return;
    const storageKey = currentPlayerId 
      ? `geoquest_mastery_explorer_${currentPlayerId}`
      : `geoquest_mastery_${user ? (user.email || user.username) : "guest"}`;
    localStorage.setItem(storageKey, JSON.stringify(passportMastery));
  }, [passportMastery, user?.email, user?.username, currentPlayerId, isLoadingPlayer]);

  const login = (username: string, email?: string, age?: string, registeredPlayers?: { name: string; age: string }[], options?: { registrationSource?: string; verified?: boolean; userId?: string }) => {
    const uniqueId = options?.userId || (email 
      ? `local_${btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}` 
      : `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
    
    setUser({
      id: uniqueId,
      username,
      email,
      age,
      registeredPlayers,
      avatarColor: "bg-blue-500" 
    });
    
    if (email) {
      localStorage.setItem('geoquest_email', email);
    }
    if (options?.registrationSource) {
      localStorage.setItem('geoquest_registration_source', options.registrationSource);
    }
    if (options?.verified) {
      localStorage.setItem('geoquest_email_verified', 'true');
    }
    
  };

  const logout = () => {
    setUser(null);
    setStats({ gamesPlayed: 0, starsEarnedTotal: 0, missionsCompletedTotal: 0, gameHistory: [] });
    setCollectedCardIds([]);
    setCollectedCardTimestamps({});
    setUnlockedAchievementIds([]);
    setPassportMastery([]);
    setCurrentPlayerId(null);
    localStorage.removeItem("geoquest_user");
    localStorage.removeItem("geoquest_active_explorer");
    localStorage.removeItem("geoquest_guest_explorer");
    localStorage.removeItem("geoquest_email");
    localStorage.removeItem("geoquest_email_verified");
    localStorage.removeItem("geoquest_registration_source");
    localStorage.removeItem("geoquest_last_user_id");
    
    // Dispatch custom event to notify explorer context to clear state in-session
    window.dispatchEvent(new CustomEvent('geoquest:logout'));
    
    if (isAuthenticated) {
      // Handle offline logout gracefully - don't navigate to API endpoint when offline
      if (!navigator.onLine) {
        // Clear session cookies and reload home page
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
        window.location.href = '/';
      } else {
        window.location.href = '/api/logout';
      }
    }
  };

  const addCollectedCard = (cardId: string) => {
    if (!collectedCardIds.includes(cardId)) {
      setCollectedCardIds(prev => [...prev, cardId]);
      setCollectedCardTimestamps(prev => ({
        ...prev,
        [cardId]: new Date().toISOString()
      }));
    }
  };

  const getCollectedCardTimestamp = (cardId: string): string | null => {
    return collectedCardTimestamps[cardId] || null;
  };

  const unlockAchievement = (achievementId: string) => {
    if (!unlockedAchievementIds.includes(achievementId)) {
      setUnlockedAchievementIds(prev => [...prev, achievementId]);
    }
  };

  const recordGameResult = (stars: number, won: boolean) => {
    // Guard: Don't record stats without an active explorer to prevent cross-profile bleed
    if (!currentPlayerId) {
      console.warn('⚠️ [Stats] recordGameResult called without active explorer - skipping');
      return;
    }
    
    const wasFirstGame = stats.gamesPlayed === 0;
    
    // NOTE: Do NOT add stars here - stars are already added via addStars() and awardPassportStar()
    // during gameplay. This function only records the game history and increments gamesPlayed.
    // The 'stars' parameter is for history tracking purposes only.
    setStats(prev => ({
      ...prev,
      gamesPlayed: prev.gamesPlayed + 1,
      // starsEarnedTotal is NOT modified here - stars already added during gameplay
      gameHistory: [
        ...prev.gameHistory, 
        { date: new Date().toISOString(), stars, won }
      ]
    }));
    
    // Record unified game session for Explorer Streak (Guess & Go)
    fetch(`/api/players/${currentPlayerId}/game-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType: 'guess_and_go', won }),
    }).then(response => {
      if (response.ok) {
        return response.json();
      }
    }).then(data => {
      if (data) {
        setStats(prev => ({
          ...prev,
          explorerStreak: data.player.explorerStreak,
          lastExplorerStreakDate: data.player.lastExplorerStreakDate,
          streakGraceAvailable: data.player.streakGraceAvailable,
          longestExplorerStreak: data.player.longestExplorerStreak,
        }));
        
        if (data.xpAwarded > 0) {
          dispatchXPGain(data.xpAwarded, data.leveledUp, data.newRankName, data.oldRankName, data.oldRankIcon, data.newRankIcon, data.totalXp);
        }
        
        if (data.streakResult?.graceUsed) {
          window.dispatchEvent(new CustomEvent('geoquest:grace-used', { 
            detail: { streak: data.streakResult.newStreak } 
          }));
        }
      }
    }).catch(err => console.error('Error recording game session:', err));
    
    if (wasFirstGame) {
      localStorage.setItem('geoquest-first-game-completed', 'true');
      window.dispatchEvent(new CustomEvent('geoquest:first-game-completed'));
    }
    
    if (won && stars > 0) {
      setTimeout(() => {
        triggerVerificationReminder({ email: user?.email, starsEarned: stars });
      }, 2000);
    }
  };

  const recordDailyQuestPlayed = (won: boolean, timeInSeconds?: number) => {
     // Guard: Don't record stats without an active explorer to prevent cross-profile bleed
     if (!currentPlayerId) {
       console.warn('⚠️ [Stats] recordDailyQuestPlayed called without active explorer - skipping');
       return;
     }
     
     const today = new Date().toDateString();
     
     // Helper to calculate calendar day difference using standardized date parsing
     const getCalendarDayDiff = (lastDateStr: string, todayStr: string): number => {
       // Handle both "Wed Dec 31 2025" and "2025-12-31" formats
       const parseDate = (dateStr: string): Date => {
         const d = new Date(dateStr);
         if (!isNaN(d.getTime())) return d;
         // Fallback: try ISO format
         const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
         if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
         return new Date(); // Fallback to now
       };
       
       const last = parseDate(lastDateStr);
       const current = parseDate(todayStr);
       // Reset to midnight to compare calendar days only
       last.setHours(0, 0, 0, 0);
       current.setHours(0, 0, 0, 0);
       const diffMs = current.getTime() - last.getTime();
       return Math.round(diffMs / (1000 * 60 * 60 * 24));
     };
     
     setStats(prev => {
        const lastDate = prev.lastDailyQuestDate;
        let newStreak = prev.dailyQuestStreak || 0;
        let newWinStreak = prev.dailyQuestWinStreak || 0;
        let streakFreezes = prev.streakFreezes || 0;
        let freezesUsed = 0;
        
        console.log('🔥 [Streak Debug]', { 
          prevStreak: prev.dailyQuestStreak, 
          lastDate, 
          today,
          currentPlayerId,
          streakFreezes
        });
        
        if (lastDate) {
            const diffDays = getCalendarDayDiff(lastDate, today);
            const missedDays = Math.max(0, diffDays - 1); // Days actually missed (diffDays=1 means 0 missed)
            console.log('🔥 [Streak Debug] diffDays:', diffDays, 'missedDays:', missedDays, 'streakFreezes:', streakFreezes);

            if (diffDays === 0) {
                // Already played today, keep current streak
                console.log('🔥 [Streak] Same day, keeping streak:', newStreak);
            } else if (diffDays === 1) {
                // Played yesterday, increment streak
                newStreak += 1;
                console.log('🔥 [Streak] Incrementing streak to:', newStreak);
            } else if (diffDays < 0) {
                // Date went backwards (possible timezone issue), keep streak
                console.log('🔥 [Streak] Negative diffDays (timezone?), keeping streak:', newStreak);
            } else if (missedDays <= streakFreezes) {
                // Missed days can be covered by available freezes
                streakFreezes -= missedDays;
                freezesUsed = missedDays;
                newStreak += 1; // Increment streak as if played continuously
                console.log('🔥 [Streak] Used', missedDays, 'freeze(s), streak:', newStreak, 'remaining freezes:', streakFreezes);
            } else if (missedDays > 2) {
                // Missed 3+ days - always reset (max 2-day grace)
                newStreak = 1;
                console.log('🔥 [Streak] Reset streak to 1 (missed', missedDays, 'days, max grace is 2)');
            } else {
                // Missed 1-2 days but not enough freezes
                if (streakFreezes > 0) {
                    freezesUsed = streakFreezes;
                    streakFreezes = 0;
                    console.log('🔥 [Streak] Used all', freezesUsed, 'freezes but needed', missedDays, '- reset streak');
                }
                newStreak = 1;
                console.log('🔥 [Streak] No freezes available, reset streak to 1');
            }
            // Ensure streak is at least 1 since player is playing today
            newStreak = Math.max(newStreak, 1);
        } else {
            // First time ever
            newStreak = 1;
            console.log('🔥 [Streak] First time playing, streak = 1');
        }
        
        // Replenish freezes to 2 whenever streak is at 3+ (keeps 2-day grace active)
        // This ensures players who already passed day 3 maintain their grace period
        if (newStreak >= 3 && streakFreezes < 2) {
            const previousFreezes = streakFreezes;
            streakFreezes = 2;
            console.log('🔥 [Streak] Streak is', newStreak, '- replenishing freezes from', previousFreezes, 'to 2');
        }

        // Calculate Win Streak
        if (!won) {
            newWinStreak = 0; // Reset win streak on loss
        } else {
             if (lastDate) {
                const diffDays = getCalendarDayDiff(lastDate, today);
                
                if (diffDays === 1) {
                    newWinStreak += 1;
                } else if (diffDays >= 2 && diffDays <= 3 && freezesUsed > 0) {
                    // Used freezes - count win streak as continuous
                    newWinStreak += 1;
                } else if (diffDays > 1) {
                    newWinStreak = 1;
                }
                newWinStreak = Math.max(newWinStreak, 1);
             } else {
                 newWinStreak = 1;
             }
        }

        // Calculate Best Time (only if won and time provided)
        let bestTime = prev.dailyQuestBestTime;
        if (won && timeInSeconds !== undefined) {
          if (!bestTime || timeInSeconds < bestTime) {
            bestTime = timeInSeconds;
          }
        }

        // Track longest streak ever achieved (max streak including freezes)
        const dailyQuestMaxStreak = Math.max(prev.dailyQuestMaxStreak || 0, newStreak);
        const longestStreak = Math.max(prev.longestStreak || 0, newStreak);
        
        console.log('🔥 [Streak] Final result:', { newStreak, dailyQuestMaxStreak, streakFreezes, today });
        
        // Add game to history for GAMES and WIN% tracking
        const newGameResult = { date: today, stars: won ? 3 : 0, won };
        const updatedHistory = [...(prev.gameHistory || []), newGameResult];
        
        return {
            ...prev,
            dailyQuestStreak: newStreak,
            dailyQuestWinStreak: newWinStreak,
            dailyQuestBestTime: bestTime,
            lastDailyQuestDate: today,
            longestStreak: longestStreak,
            dailyQuestMaxStreak: dailyQuestMaxStreak,
            streakFreezes: streakFreezes,
            gamesPlayed: (prev.gamesPlayed || 0) + 1,
            gameHistory: updatedHistory
        };
     });
     
     if (won) {
       setTimeout(() => {
         triggerVerificationReminder({ email: user?.email, starsEarned: 3 });
       }, 2000);
     }
     
     // Record unified game session for Explorer Streak (Daily Quest)
     // Send client's local date in YYYY-MM-DD format for timezone-correct streak calculation
     const timeMs = timeInSeconds ? timeInSeconds * 1000 : undefined;
     const now = new Date();
     const clientLocalDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
     
     fetch(`/api/players/${currentPlayerId}/game-session`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ gameType: 'daily_quest', won, timeMs, clientLocalDate }),
     }).then(response => {
       if (response.ok) return response.json();
     }).then(data => {
       if (data) {
         console.log('🔥 [Streak] Server response:', {
           dailyQuestStreak: data.streakResult?.dailyQuestStreak,
           streakFreezes: data.streakResult?.streakFreezes,
           explorerStreak: data.player.explorerStreak,
         });
         setStats(prev => ({
           ...prev,
           explorerStreak: data.player.explorerStreak,
           lastExplorerStreakDate: data.player.lastExplorerStreakDate,
           streakGraceAvailable: data.player.streakGraceAvailable,
           longestExplorerStreak: data.player.longestExplorerStreak,
           dailyQuestStreak: data.streakResult?.dailyQuestStreak ?? prev.dailyQuestStreak,
           dailyQuestMaxStreak: Math.max(prev.dailyQuestMaxStreak || 0, data.streakResult?.dailyQuestStreak || 0),
           streakFreezes: data.streakResult?.streakFreezes ?? prev.streakFreezes,
           lastDailyQuestDate: data.player.lastDailyQuestDate || prev.lastDailyQuestDate,
         }));
         if (data.xpAwarded > 0) {
           dispatchXPGain(data.xpAwarded, data.leveledUp, data.newRankName, data.oldRankName, data.oldRankIcon, data.newRankIcon, data.totalXp);
         }
         if (won) {
           window.dispatchEvent(new CustomEvent('geoquest:spin-earned', { detail: { reason: 'daily_quest_completed' } }));
         }
         if (data.streakResult?.graceUsed) {
           window.dispatchEvent(new CustomEvent('geoquest:grace-used', { 
             detail: { streak: data.streakResult.newStreak } 
           }));
         }
       }
     }).catch(err => console.error('Error recording game session:', err));
  };

  const recordCrossworldResult = (timeInSeconds: number, status: "WON" | "LOST" | "GIVEN_UP", mode: "EASY" | "HARD") => {
    // Guard: Don't record stats without an active explorer to prevent cross-profile bleed
    if (!currentPlayerId) {
      console.warn('⚠️ [Stats] recordCrossworldResult called without active explorer - skipping');
      return;
    }
    
    const today = getTodayDateString(); // Use local timezone for consistent midnight reset
    
    // Helper to calculate calendar day difference
    const getCalendarDayDiff = (lastDateStr: string, todayStr: string): number => {
      const last = new Date(lastDateStr);
      const current = new Date(todayStr);
      // Reset to midnight to compare calendar days only
      last.setHours(0, 0, 0, 0);
      current.setHours(0, 0, 0, 0);
      const diffMs = current.getTime() - last.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    };
    
    setStats(prev => {
      const lastDate = prev.crossworldLastPlayed;
      let newStreak = prev.crossworldStreak || 0;
      
      // Calculate Streak - counts consecutive days PLAYED, not just wins
      // Streak continues as long as user plays daily (win, lose, or give up all count)
      // Streak resets only if user misses more than 2 days (1-day grace period)
      if (lastDate) {
        const diffDays = getCalendarDayDiff(lastDate, today);
        
        if (diffDays === 0) {
          // Already played today - ensure streak is at least 1
          newStreak = Math.max(newStreak, 1);
        } else if (diffDays === 1) {
          // Playing consecutive day - increment streak
          newStreak += 1;
        } else if (diffDays === 2) {
          // Grace day: missed exactly 1 day, keep streak but don't increment
          newStreak = Math.max(newStreak, 1);
        } else if (diffDays > 2) {
          // Missed more than 1 day (outside grace period), reset streak
          newStreak = 1;
        }
      } else {
        // First time playing
        newStreak = 1;
      }

      let nextBestTime = prev.crossworldBestTime;
      if (status === "WON" && (!nextBestTime || timeInSeconds < nextBestTime)) {
        nextBestTime = timeInSeconds;
      }

      return {
        ...prev,
        crossworldStreak: newStreak,
        crossworldLastPlayed: today,
        crossworldBestTime: nextBestTime,
        crossworldStatus: status,
        crossworldMode: mode,
        crossworldTotalGames: (prev.crossworldTotalGames || 0) + 1,
        crossworldTotalWins: status === "WON" ? (prev.crossworldTotalWins || 0) + 1 : (prev.crossworldTotalWins || 0),
        ...(mode === "EASY" ? { crossworldLastPlayedEasy: today, crossworldStatusEasy: status } : {}),
        ...(mode === "HARD" ? { crossworldLastPlayedHard: today, crossworldStatusHard: status } : {})
      };
    });
    
    if (status === "WON") {
      setTimeout(() => {
        triggerVerificationReminder({ email: user?.email, starsEarned: 5 });
      }, 2000);
    }
    
    // Record unified game session for Explorer Streak (CrossWorld)
    // CrossWorld counts as playing regardless of outcome
    const won = status === "WON";
    const timeMs = timeInSeconds * 1000;
    fetch(`/api/players/${currentPlayerId}/game-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType: 'crossworld', won, timeMs }),
    }).then(response => {
      if (response.ok) return response.json();
    }).then(data => {
      if (data) {
        setStats(prev => ({
          ...prev,
          explorerStreak: data.player.explorerStreak,
          lastExplorerStreakDate: data.player.lastExplorerStreakDate,
          streakGraceAvailable: data.player.streakGraceAvailable,
          longestExplorerStreak: data.player.longestExplorerStreak,
        }));
        if (data.xpAwarded > 0) {
          dispatchXPGain(data.xpAwarded, data.leveledUp, data.newRankName, data.oldRankName, data.oldRankIcon, data.newRankIcon, data.totalXp);
        }
        if (data.streakResult?.graceUsed) {
          window.dispatchEvent(new CustomEvent('geoquest:grace-used', { 
            detail: { streak: data.streakResult.newStreak } 
          }));
        }
      }
    }).catch(err => console.error('Error recording game session:', err));
  };

  const unlockFindMyHomeBuddy = (buddyId: string) => {
    setStats(prev => {
        const currentUnlocked = prev.findMyHomeUnlockedIds || [];
        if (currentUnlocked.includes(buddyId)) return prev;
        return {
            ...prev,
            findMyHomeUnlockedIds: [...currentUnlocked, buddyId]
        };
    });
  };

  const addMissionCompleted = () => {
    setStats(prev => ({ ...prev, missionsCompletedTotal: prev.missionsCompletedTotal + 1 }));
  };

  const addStars = (amount: number) => {
    setStats(prev => ({ ...prev, starsEarnedTotal: prev.starsEarnedTotal + amount }));
    
    // Persist stars to backend via /add-game-rewards endpoint
    // Queue for offline sync if offline
    if (currentPlayerId && amount > 0) {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        fetch(`/api/players/${currentPlayerId}/add-game-rewards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stars: amount }),
        }).then(response => {
          if (response.ok) return response.json();
        }).then(data => {
          if (data?.player) {
            const EXPLORER_STORAGE_KEY = 'geoquest_active_explorer';
            const storedExplorer = localStorage.getItem(EXPLORER_STORAGE_KEY);
            if (storedExplorer) {
              try {
                const explorer = JSON.parse(storedExplorer);
                if (explorer.id === currentPlayerId) {
                  const updatedExplorer = {
                    ...explorer,
                    starsEarnedTotal: data.player.starsEarnedTotal,
                  };
                  localStorage.setItem(EXPLORER_STORAGE_KEY, JSON.stringify(updatedExplorer));
                  window.dispatchEvent(new CustomEvent('explorerStatsUpdated', { detail: updatedExplorer }));
                }
              } catch (e) { /* ignore */ }
            }
          }
        }).catch(err => {
          console.error('Failed to persist stars to backend, queueing for offline sync:', err);
          // Queue for offline sync on failure
          queueStarAdditionForSync(currentPlayerId, amount);
        });
      } else {
        // Offline - queue for later sync
        queueStarAdditionForSync(currentPlayerId, amount);
      }
    }
  };
  
  // Helper function to queue star additions for offline sync
  const queueStarAdditionForSync = (playerId: string, stars: number) => {
    const STAR_SYNC_KEY = 'geoquest_pending_star_sync';
    try {
      const pending = JSON.parse(localStorage.getItem(STAR_SYNC_KEY) || '[]');
      // Use unique ID for each entry to enable precise reconciliation
      const entryId = `${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      pending.push({ id: entryId, playerId, stars, timestamp: Date.now() });
      localStorage.setItem(STAR_SYNC_KEY, JSON.stringify(pending));
      console.log(`[Offline] Queued ${stars} stars for sync to player ${playerId} (entry: ${entryId})`);
    } catch (e) {
      console.error('Failed to queue stars for offline sync:', e);
    }
  };
  
  // Helper function to queue card additions for offline sync
  const queueCardAdditionForSync = useCallback((playerId: string, cardIds: string[]) => {
    const CARD_SYNC_KEY = 'geoquest_pending_card_sync';
    try {
      const pending = JSON.parse(localStorage.getItem(CARD_SYNC_KEY) || '[]');
      // Deduplicate by checking if card already queued for this player
      for (const cardId of cardIds) {
        const alreadyQueued = pending.some((e: any) => e.playerId === playerId && e.cardId === cardId);
        if (!alreadyQueued) {
          pending.push({ playerId, cardId, timestamp: Date.now() });
        }
      }
      localStorage.setItem(CARD_SYNC_KEY, JSON.stringify(pending));
      console.log(`[Offline] Queued ${cardIds.length} cards for sync to player ${playerId}`);
    } catch (e) {
      console.error('Failed to queue cards for offline sync:', e);
    }
  }, []);
  
  // Sync pending cards when back online - use standalone function to avoid initialization issues
  const syncPendingCardsImpl = async (playerId: string) => {
    const CARD_SYNC_KEY = 'geoquest_pending_card_sync';
    if (!navigator.onLine) return;
    
    let pending: any[];
    try {
      pending = JSON.parse(localStorage.getItem(CARD_SYNC_KEY) || '[]');
    } catch (e) {
      localStorage.removeItem(CARD_SYNC_KEY);
      return;
    }
    
    const playerCards = pending.filter((e: any) => e.playerId === playerId);
    if (playerCards.length === 0) return;
    
    const cardIds = Array.from(new Set(playerCards.map((e: any) => e.cardId)));
    
    try {
      const response = await fetch(`/api/players/${playerId}/add-game-rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds }),
      });
      
      if (response.ok) {
        const remaining = pending.filter((e: any) => e.playerId !== playerId);
        localStorage.setItem(CARD_SYNC_KEY, JSON.stringify(remaining));
      }
    } catch (e) {
      // Will retry on next online event or load
    }
  };
  
  // Stable callback wrapper for syncPendingCards
  const syncPendingCards = useCallback((playerId: string) => {
    return syncPendingCardsImpl(playerId);
  }, []);
  
  // Sync pending cards when connectivity is restored
  useEffect(() => {
    const handleOnline = () => {
      if (currentPlayerId) {
        // Sync pending cards after a short delay to ensure connection is stable
        setTimeout(() => {
          syncPendingCards(currentPlayerId);
        }, 1000);
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentPlayerId, syncPendingCards]);

  const addSpellGeoState = (stateAbbr: string) => {
    setStats(prev => {
      const currentStates = prev.spellGeoCollectedStates || [];
      if (currentStates.includes(stateAbbr)) return prev;
      return { ...prev, spellGeoCollectedStates: [...currentStates, stateAbbr] };
    });
  };

  const awardPassportStar = (cityId: string, starNum: 1 | 2 | 3 | 4 | 5) => {
    const starKey = `star${starNum}` as 'star1' | 'star2' | 'star3' | 'star4' | 'star5';
    
    // Check if star already exists to avoid duplicate awards
    const existingEntry = passportMastery.find(e => e.cityId === cityId);
    const alreadyHasStar = existingEntry?.[starKey] === true;
    
    const currentStarCount = existingEntry
      ? (existingEntry.star1 ? 1 : 0) + (existingEntry.star2 ? 1 : 0) + (existingEntry.star3 ? 1 : 0) + (existingEntry.star4 ? 1 : 0) + (existingEntry.star5 ? 1 : 0)
      : 0;
    const willCompleteMastery = !alreadyHasStar && currentStarCount === 2;
    const willCompleteFullMastery = !alreadyHasStar && currentStarCount === 4;
    
    // Update local stats FIRST (outside of setPassportMastery to avoid batching issues)
    if (!alreadyHasStar) {
      setStats(s => ({ ...s, starsEarnedTotal: s.starsEarnedTotal + 1 }));
      
      if (willCompleteFullMastery && currentPlayerId) {
        const masteredKey = `geoquest_mastered_xp_${currentPlayerId}`;
        const alreadyAwarded: string[] = JSON.parse(localStorage.getItem(masteredKey) || '[]');
        if (!alreadyAwarded.includes(cityId)) {
          fetch(`/api/players/${currentPlayerId}/award-xp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 50, reason: 'city_mastered' }),
          }).catch(() => {});
          alreadyAwarded.push(cityId);
          localStorage.setItem(masteredKey, JSON.stringify(alreadyAwarded));
        }
      }
      
      // Also persist the star to backend via /add-game-rewards endpoint
      // This is necessary because the regular stats sync ignores starsEarnedTotal
      // Supports offline mode - queues for sync if offline
      if (currentPlayerId) {
        const isOnline = navigator.onLine;
        
        if (isOnline) {
          fetch(`/api/players/${currentPlayerId}/add-game-rewards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stars: 1 }),
          }).then(response => {
            if (response.ok) {
              return response.json();
            }
          }).then(data => {
            if (data?.player) {
              // Update explorer context with new star total
              const EXPLORER_STORAGE_KEY = 'geoquest_active_explorer';
              const storedExplorer = localStorage.getItem(EXPLORER_STORAGE_KEY);
              if (storedExplorer) {
                try {
                  const explorer = JSON.parse(storedExplorer);
                  if (explorer.id === currentPlayerId) {
                    const updatedExplorer = {
                      ...explorer,
                      starsEarnedTotal: data.player.starsEarnedTotal,
                    };
                    localStorage.setItem(EXPLORER_STORAGE_KEY, JSON.stringify(updatedExplorer));
                    window.dispatchEvent(new CustomEvent('explorerStatsUpdated', { 
                      detail: updatedExplorer 
                    }));
                  }
                } catch (e) { /* ignore */ }
              }
            }
          }).catch(err => {
            console.error('Failed to persist passport star to backend, queueing for offline sync:', err);
            queueStarAdditionForSync(currentPlayerId, 1);
          });
        } else {
          // Offline - queue for later sync
          queueStarAdditionForSync(currentPlayerId, 1);
        }
      }
      
      if (willCompleteMastery) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cityMasteryComplete', {
            detail: { cityId, explorerId: currentPlayerId, isFullMastery: false }
          }));
        }, 500);
      }
      
      if (willCompleteFullMastery) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cityMasteryComplete', {
            detail: { cityId, explorerId: currentPlayerId, isFullMastery: true }
          }));
        }, 500);
      }
    }
    
    // Then update passport mastery with lastInteraction timestamp
    const now = new Date().toISOString();
    setPassportMastery(prev => {
      const existingIndex = prev.findIndex(e => e.cityId === cityId);
      
      let updatedMastery: PassportMasteryEntry[];
      if (existingIndex >= 0) {
        updatedMastery = [...prev];
        // Clear any attempt date for this star when it's successfully awarded
        // This ensures stale failed attempts don't block the user after success
        const attemptKey = `star${starNum}LastAttempt`;
        const updatedEntry = {
          ...updatedMastery[existingIndex],
          [starKey]: true,
          lastInteraction: now,
        };
        // Remove the attempt date if it exists (to clear stale failed attempts)
        if (attemptKey in updatedEntry) {
          delete (updatedEntry as any)[attemptKey];
        }
        updatedMastery[existingIndex] = updatedEntry;
      } else {
        const newEntry: PassportMasteryEntry = {
          cityId,
          star1: starNum === 1,
          star2: starNum === 2,
          star3: starNum === 3,
          star4: starNum === 4,
          star5: starNum === 5,
          discoveredDate: now,
          lastInteraction: now,
        };
        updatedMastery = [...prev, newEntry];
      }
      
      // IMMEDIATELY persist to localStorage to prevent data loss on page navigation
      // This is critical because useEffect may not fire before window.location.href redirects
      if (currentPlayerId) {
        const storageKey = `geoquest_mastery_explorer_${currentPlayerId}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedMastery));
      } else {
        // Fallback: try to find active explorer ID from localStorage
        try {
          const storedExplorer = localStorage.getItem('geoquest_active_explorer');
          if (storedExplorer) {
            const explorer = JSON.parse(storedExplorer);
            if (explorer?.id) {
              const storageKey = `geoquest_mastery_explorer_${explorer.id}`;
              localStorage.setItem(storageKey, JSON.stringify(updatedMastery));
            }
          }
        } catch (e) { /* ignore */ }
      }
      
      return updatedMastery;
    });
  };

  const recordMasteryAttempt = (cityId: string, starNum: 2 | 3 | 4) => {
    // Guard: Don't record stats without an active explorer to prevent cross-profile bleed
    if (!currentPlayerId) {
      console.warn('⚠️ [Stats] recordMasteryAttempt called without active explorer - skipping');
      return;
    }
    
    const today = new Date().toDateString();
    const now = new Date().toISOString();
    const attemptKey = `star${starNum}LastAttempt` as 'star2LastAttempt' | 'star3LastAttempt' | 'star4LastAttempt';
    
    // If the city is collected, star1 should always be true
    const isCollected = collectedCardIds.includes(cityId);
    
    setPassportMastery(prev => {
      const existingIndex = prev.findIndex(e => e.cityId === cityId);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          [attemptKey]: today,
          lastInteraction: now,
          // Fix star1 if city is collected but star1 was incorrectly false
          star1: updated[existingIndex].star1 || isCollected,
        };
        return updated;
      } else {
        const newEntry: PassportMasteryEntry = {
          cityId,
          star1: isCollected, // Set star1 true if city is collected
          star2: false,
          star3: false,
          star4: false,
          star5: false,
          discoveredDate: now,
          lastInteraction: now,
          [attemptKey]: today,
        };
        return [...prev, newEntry];
      }
    });
  };

  // Backfill Star 1 for existing collected cities that don't have mastery entries
  // Also fix any entries with star1: false that should be true
  useEffect(() => {
    if (collectedCardIds.length === 0) return;
    
    const missingCities = collectedCardIds.filter(
      cityId => !passportMastery.find(m => m.cityId === cityId)
    );
    
    // Also find entries with star1: false for collected cities
    const citiesToFixStar1 = passportMastery.filter(
      m => collectedCardIds.includes(m.cityId) && !m.star1
    ).map(m => m.cityId);
    
    if (missingCities.length > 0 || citiesToFixStar1.length > 0) {
      const now = new Date().toISOString();
      setPassportMastery(prev => {
        // Add new entries for missing cities
        const newEntries: PassportMasteryEntry[] = missingCities.map(cityId => ({
          cityId,
          star1: true,
          star2: false,
          star3: false,
          star4: false,
          star5: false,
          discoveredDate: now,
          lastInteraction: now,
        }));
        
        // Fix existing entries with star1: false
        const updated = prev.map(entry => {
          if (citiesToFixStar1.includes(entry.cityId)) {
            return { ...entry, star1: true };
          }
          return entry;
        });
        
        return [...updated, ...newEntries];
      });
    }
  }, [collectedCardIds, passportMastery]);

  const getPassportMastery = useCallback((cityId: string): PassportMasteryEntry | undefined => {
    return passportMastery.find(e => e.cityId === cityId);
  }, [passportMastery]);

  const refreshStampInteraction = useCallback((cityId: string) => {
    const now = new Date().toISOString();
    setPassportMastery(prev => {
      const existingIndex = prev.findIndex(e => e.cityId === cityId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastInteraction: now,
        };
        return updated;
      }
      return prev;
    });
  }, []);

  const markCityVisitedInGeoAdventures = useCallback((cityId: string) => {
    const now = new Date().toISOString();
    setPassportMastery(prev => {
      const existingIndex = prev.findIndex(e => e.cityId === cityId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          visitedInGeoAdventures: true,
          lastInteraction: now,
        };
        return updated;
      } else {
        const newEntry: PassportMasteryEntry = {
          cityId,
          star1: false,
          star2: false,
          star3: false,
          star4: false,
          star5: false,
          discoveredDate: now,
          lastInteraction: now,
          visitedInGeoAdventures: true,
        };
        return [...prev, newEntry];
      }
    });
  }, []);

  const checkStreakBadges = useCallback((streak: number): { badge: { id: string; name: string; icon: string; description: string }; bonusHints?: number }[] => {
    const newUnlocks: { badge: { id: string; name: string; icon: string; description: string }; bonusHints?: number }[] = [];
    const currentUnlocked = stats.unlockedStreakBadgeIds || [];
    let totalBonusHints = stats.bonusHintsFromStreak || 0;
    let hasNewBadges = false;

    for (const badge of STREAK_BADGES) {
      if (streak >= badge.daysRequired && !currentUnlocked.includes(badge.id)) {
        newUnlocks.push({
          badge: { id: badge.id, name: badge.name, icon: badge.icon, description: badge.description },
          bonusHints: badge.reward?.type === "bonus_hint" ? badge.reward.value : undefined
        });
        
        if (badge.reward?.type === "bonus_hint" && badge.reward.value) {
          totalBonusHints += badge.reward.value;
        }
        hasNewBadges = true;
      }
    }

    if (hasNewBadges) {
      const newBadgeIds = newUnlocks.map(u => u.badge.id);
      setStats(prev => ({
        ...prev,
        unlockedStreakBadgeIds: [...(prev.unlockedStreakBadgeIds || []), ...newBadgeIds],
        bonusHintsFromStreak: totalBonusHints,
        longestStreak: Math.max(prev.longestStreak || 0, streak)
      }));
    } else {
      setStats(prev => ({
        ...prev,
        longestStreak: Math.max(prev.longestStreak || 0, streak)
      }));
    }

    return newUnlocks;
  }, [stats.unlockedStreakBadgeIds, stats.bonusHintsFromStreak]);

  const getBonusHintsFromStreak = useCallback((): number => {
    return stats.bonusHintsFromStreak || 0;
  }, [stats.bonusHintsFromStreak]);

  const syncStatsToBackend = useCallback(async () => {
    if (!currentPlayerId) {
      return;
    }
    
    // Capture the player ID we're syncing for - verify it hasn't changed before POSTing
    const syncingForPlayerId = currentPlayerId;
    
    // Double-check against ref to catch rapid switches
    if (syncingForPlayerId !== currentPlayerIdRef.current) {
      console.log('⚠️ [Sync] Aborting sync - player changed before start');
      return;
    }
    
    if (syncPendingRef.current) {
      return;
    }
    
    syncPendingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    
    // NOTE: dailyQuestStreak, lastDailyQuestDate, and dailyQuestMaxStreak are NOT included here
    // These fields are managed ONLY by recordGameSession to prevent race conditions where
    // this sync could overwrite the correct server-calculated streak values
    const statsPayload = {
      gamesPlayed: stats.gamesPlayed,
      starsEarnedTotal: stats.starsEarnedTotal,
      missionsCompletedTotal: stats.missionsCompletedTotal,
      dailyQuestWinStreak: stats.dailyQuestWinStreak || 0,
      crossworldStreak: stats.crossworldStreak || 0,
      crossworldBestTime: stats.crossworldBestTime || null,
      crossworldLastPlayed: stats.crossworldLastPlayed || null,
      crossworldTotalGames: stats.crossworldTotalGames || 0,
      crossworldTotalWins: stats.crossworldTotalWins || 0,
      gameHistory: stats.gameHistory,
      collectedCardIds: collectedCardIds,
      collectedCardTimestamps: collectedCardTimestamps,
      unlockedAchievementIds: unlockedAchievementIds,
      findMyHomeUnlockedIds: stats.findMyHomeUnlockedIds || [],
      unlockedStreakBadgeIds: stats.unlockedStreakBadgeIds || [],
      bonusHintsFromStreak: stats.bonusHintsFromStreak || 0,
      longestStreak: stats.longestStreak || 0,
      passportMastery: passportMastery,
      streakFreezes: stats.streakFreezes || 0,
    };
    
    // Queue stats for offline sync
    const STATS_SYNC_KEY = 'geoquest_pending_stats_sync';
    const queueStatsForSync = () => {
      try {
        // Store the latest stats payload - overwrites previous (only need latest)
        // Use syncingForPlayerId to ensure we queue for the correct player
        localStorage.setItem(STATS_SYNC_KEY, JSON.stringify({
          playerId: syncingForPlayerId,
          payload: statsPayload,
          timestamp: Date.now(),
        }));
        console.log('[Offline] Stats queued for sync when online');
      } catch (e) {
        console.error('[Offline] Failed to queue stats:', e);
      }
    };
    
    // Check if offline before attempting sync
    if (!navigator.onLine) {
      queueStatsForSync();
      setSyncError("Offline - progress saved locally");
      syncPendingRef.current = false;
      setIsSyncing(false);
      return;
    }
    
    try {
      // Final check before POST - abort if explorer changed during payload preparation
      if (syncingForPlayerId !== currentPlayerIdRef.current) {
        console.log('⚠️ [Sync] Aborting sync - player changed during preparation');
        syncPendingRef.current = false;
        setIsSyncing(false);
        return;
      }
      
      const response = await fetch(`/api/players/${syncingForPlayerId}/stats`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statsPayload),
      });
      
      if (response.ok) {
        await response.json();
        setLastSyncTime(new Date());
        setSyncError(null);
        
        // Clear any pending stats sync since we just synced successfully
        localStorage.removeItem(STATS_SYNC_KEY);
        
        // Update the active explorer's localStorage and dispatch event to keep explorerContext in sync
        const EXPLORER_STORAGE_KEY = 'geoquest_active_explorer';
        const storedExplorer = localStorage.getItem(EXPLORER_STORAGE_KEY);
        if (storedExplorer) {
          try {
            const explorer = JSON.parse(storedExplorer);
            if (explorer.id === currentPlayerId) {
              const updatedExplorer = {
                ...explorer,
                starsEarnedTotal: stats.starsEarnedTotal,
                gamesPlayed: stats.gamesPlayed,
                missionsCompletedTotal: stats.missionsCompletedTotal,
                collectedCardIds: collectedCardIds,
                passportMastery: passportMastery,
              };
              localStorage.setItem(EXPLORER_STORAGE_KEY, JSON.stringify(updatedExplorer));
              // Dispatch custom event for same-tab updates
              window.dispatchEvent(new CustomEvent('explorerStatsUpdated', { 
                detail: updatedExplorer 
              }));
            }
          } catch (e) { /* ignore parsing errors */ }
        }
      } else {
        queueStatsForSync();
        setSyncError("Failed to save progress to cloud");
      }
    } catch (error) {
      queueStatsForSync();
      setSyncError("Connection error - progress saved locally");
    } finally {
      syncPendingRef.current = false;
      setIsSyncing(false);
    }
  }, [currentPlayerId, stats, collectedCardIds, unlockedAchievementIds, passportMastery]);

  const loadPlayerFromBackend = useCallback(async (playerId: string) => {
    // IMMEDIATELY set the new player ID before any async work
    // This ensures any pending syncs will detect the player change and abort
    setCurrentPlayerId(playerId);
    currentPlayerIdRef.current = playerId;
    
    // Cancel any pending sync from previous explorer
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    syncPendingRef.current = false;
    
    setIsLoadingPlayer(true);
    setSyncError(null);
    
    try {
      const response = await fetch(`/api/players/${playerId}`);
      
      if (response.ok) {
        const player = await response.json();
        
        // Check if explorer changed during fetch - if so, discard this response
        if (currentPlayerIdRef.current !== playerId) {
          console.log('⚠️ [LoadPlayer] Discarding stale response - explorer changed from', playerId, 'to', currentPlayerIdRef.current);
          return;
        }
        
        // Load any existing localStorage data for this explorer to merge mode-specific fields
        const localStorageKey = `geoquest_stats_explorer_${playerId}`;
        const localMasteryKey = `geoquest_mastery_explorer_${playerId}`;
        let localStats: any = {};
        let localMastery: PassportMasteryEntry[] = [];
        try {
          const saved = localStorage.getItem(localStorageKey);
          if (saved) localStats = JSON.parse(saved);
        } catch (e) { /* ignore */ }
        try {
          const savedMastery = localStorage.getItem(localMasteryKey);
          if (savedMastery) localMastery = JSON.parse(savedMastery);
        } catch (e) { /* ignore */ }
        
        console.log('🔥 [LoadPlayer] Loading stats from backend:', {
          playerId,
          explorerStreak: player.explorerStreak,
          dailyQuestStreak: player.dailyQuestStreak,
          streakFreezes: player.streakFreezes,
          longestExplorerStreak: player.longestExplorerStreak,
          gamesPlayed: player.gamesPlayed,
        });
        
        setStats({
          gamesPlayed: player.gamesPlayed || 0,
          starsEarnedTotal: player.starsEarnedTotal || 0,
          missionsCompletedTotal: player.missionsCompletedTotal || 0,
          gameHistory: player.gameHistory || [],
          dailyQuestStreak: player.dailyQuestStreak || 0,
          dailyQuestWinStreak: player.dailyQuestWinStreak || 0,
          lastDailyQuestDate: player.lastDailyQuestDate || undefined,
          crossworldStreak: player.crossworldStreak || 0,
          crossworldBestTime: player.crossworldBestTime || undefined,
          crossworldLastPlayed: player.crossworldLastPlayed || undefined,
          crossworldTotalGames: player.crossworldTotalGames || 0,
          crossworldTotalWins: player.crossworldTotalWins || 0,
          crossworldMode: localStats.crossworldMode || player.crossworldMode || undefined,
          crossworldStatus: localStats.crossworldStatus || player.crossworldStatus || undefined,
          crossworldLastPlayedEasy: localStats.crossworldLastPlayedEasy || undefined,
          crossworldLastPlayedHard: localStats.crossworldLastPlayedHard || undefined,
          crossworldStatusEasy: localStats.crossworldStatusEasy || undefined,
          crossworldStatusHard: localStats.crossworldStatusHard || undefined,
          findMyHomeUnlockedIds: player.findMyHomeUnlockedIds || [],
          unlockedStreakBadgeIds: player.unlockedStreakBadgeIds || [],
          bonusHintsFromStreak: player.bonusHintsFromStreak || 0,
          longestStreak: player.longestStreak || 0,
          // Unified Explorer Streak fields — use the higher of explorer/daily quest streaks
          explorerStreak: Math.max(player.explorerStreak || 0, player.dailyQuestStreak || 0),
          lastExplorerStreakDate: player.lastExplorerStreakDate || undefined,
          lastExplorerGameType: player.lastExplorerGameType || undefined,
          streakGraceAvailable: player.streakGraceAvailable !== false,
          longestExplorerStreak: Math.max(player.longestExplorerStreak || 0, player.dailyQuestStreak || 0),
          // Daily Quest max streak and freezes
          dailyQuestMaxStreak: player.dailyQuestMaxStreak || 0,
          streakFreezes: player.streakFreezes || 0,
        });
        
        // Merge local and server collected cards - keep cards from both to prevent data loss
        // This recovers cards that were collected locally but not synced to backend
        const localCardsKey = `geoquest_collection_explorer_${playerId}`;
        let localCardIds: string[] = [];
        try {
          const saved = localStorage.getItem(localCardsKey);
          if (saved) localCardIds = JSON.parse(saved);
        } catch (e) { /* ignore */ }
        
        const serverCardIds = player.collectedCardIds || [];
        const mergedCardIds = Array.from(new Set([...serverCardIds, ...localCardIds]));
        setCollectedCardIds(mergedCardIds);
        
        // Sync any cards that are in local but not in server to backend
        const cardsToSync = localCardIds.filter(id => !serverCardIds.includes(id));
        if (cardsToSync.length > 0 && navigator.onLine) {
          fetch(`/api/players/${playerId}/add-game-rewards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardIds: cardsToSync }),
          }).catch(() => { /* Will retry on next load */ });
        }
        
        // Also sync any pending cards from the offline queue
        syncPendingCards(playerId);
        
        setCollectedCardTimestamps(player.collectedCardTimestamps || {});
        setUnlockedAchievementIds(player.unlockedAchievementIds || []);
        
        // Sync the localStorage Daily Quest key so DailyQuest.tsx knows if already played today
        // This ensures cross-device sync works properly
        // DailyQuest.tsx uses activeExplorer?.id || user?.email || 'guest' as the key
        // So we need to write to ALL fallback keys to ensure sync works regardless of load order
        if (player.lastDailyQuestDate) {
          // Convert to standardized date format (YYYY-MM-DD)
          const dateString = player.lastDailyQuestDate.includes('-') 
            ? player.lastDailyQuestDate 
            : new Date(player.lastDailyQuestDate).toISOString().split('T')[0];
          
          // Write to explorer ID key (primary)
          const dailyQuestKey = `geoquest_daily_last_date_${playerId}`;
          localStorage.setItem(dailyQuestKey, dateString);
          
          // Also write to email fallback key if user has email (for cases where activeExplorer isn't loaded yet)
          const storedUser = localStorage.getItem("geoquest_user");
          let hasValidEmail = false;
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              // Check for non-empty email (empty string should fall through to guest)
              if (userData.email && userData.email.trim() !== '') {
                localStorage.setItem(`geoquest_daily_last_date_${userData.email}`, dateString);
                hasValidEmail = true;
              }
            } catch (e) { /* ignore */ }
          }
          
          // Always write to guest key as ultimate fallback (for guest sessions without email or empty email)
          // This ensures DailyQuest.tsx fallback to 'guest' works correctly
          localStorage.setItem(`geoquest_daily_last_date_guest`, dateString);
        }
        
        // Merge passportMastery: keep stars that are true in EITHER local OR server data
        const serverMastery: PassportMasteryEntry[] = player.passportMastery || [];
        const mergedMastery: PassportMasteryEntry[] = [];
        const allCityIds = Array.from(new Set([
          ...serverMastery.map(m => m.cityId),
          ...localMastery.map(m => m.cityId)
        ]));
        
        for (const cityId of allCityIds) {
          const serverEntry = serverMastery.find(m => m.cityId === cityId);
          const localEntry = localMastery.find(m => m.cityId === cityId);
          
          mergedMastery.push({
            cityId,
            star1: (serverEntry?.star1 || false) || (localEntry?.star1 || false),
            star2: (serverEntry?.star2 || false) || (localEntry?.star2 || false),
            star3: (serverEntry?.star3 || false) || (localEntry?.star3 || false),
            star4: (serverEntry?.star4 || false) || (localEntry?.star4 || false),
            star5: (serverEntry?.star5 || false) || (localEntry?.star5 || false),
            discoveredDate: serverEntry?.discoveredDate || localEntry?.discoveredDate || new Date().toISOString(),
            star2LastAttempt: localEntry?.star2LastAttempt || serverEntry?.star2LastAttempt,
            star3LastAttempt: localEntry?.star3LastAttempt || serverEntry?.star3LastAttempt,
            star4LastAttempt: localEntry?.star4LastAttempt || serverEntry?.star4LastAttempt,
          });
        }
        
        setPassportMastery(mergedMastery);
        setLastSyncTime(new Date());
        
      } else {
        setSyncError("Failed to load progress from cloud");
      }
    } catch (error) {
      setSyncError("Connection error - using local data");
    } finally {
      setIsLoadingPlayer(false);
    }
  }, [syncPendingCards]);

  useEffect(() => {
    if (currentPlayerId) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // Capture the playerId when timeout is queued
      const queuedPlayerId = currentPlayerId;
      
      syncTimeoutRef.current = setTimeout(() => {
        // Only sync if the player hasn't changed since queueing
        // This prevents sending wrong player data during rapid explorer switches
        // Use ref to get current value at execution time (not closure capture)
        if (queuedPlayerId === currentPlayerIdRef.current) {
          syncStatsToBackend();
        } else {
          console.log('⚠️ [Sync] Skipping sync - explorer changed from', queuedPlayerId, 'to', currentPlayerIdRef.current);
        }
      }, 2000);
      
      return () => {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
      };
    }
  }, [stats, collectedCardIds, unlockedAchievementIds, passportMastery, currentPlayerId, syncStatsToBackend]);

  // Record a unified game session (updates Explorer Streak + per-game stats)
  const recordGameSession = useCallback(async (
    gameType: 'guess_and_go' | 'daily_quest' | 'crossworld',
    won: boolean,
    timeMs?: number
  ): Promise<GameSessionResult | null> => {
    if (!currentPlayerId) {
      console.warn('⚠️ [GameSession] No player ID - cannot record game session');
      return null;
    }

    try {
      const response = await fetch(`/api/players/${currentPlayerId}/game-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType, won, timeMs }),
      });

      if (!response.ok) {
        throw new Error('Failed to record game session');
      }

      const data = await response.json();
      
      // Update local stats with the new unified streak data
      setStats(prev => ({
        ...prev,
        explorerStreak: data.player.explorerStreak,
        lastExplorerStreakDate: data.player.lastExplorerStreakDate,
        lastExplorerGameType: data.player.lastExplorerGameType,
        streakGraceAvailable: data.player.streakGraceAvailable,
        longestExplorerStreak: data.player.longestExplorerStreak,
        // Also update Daily Quest specific fields when recording daily_quest
        ...(gameType === 'daily_quest' && {
          dailyQuestStreak: data.player.dailyQuestStreak,
          lastDailyQuestDate: data.player.lastDailyQuestDate,
          dailyQuestMaxStreak: data.player.dailyQuestMaxStreak,
          streakFreezes: data.player.streakFreezes,
        }),
      }));

      if (data.xpAwarded > 0) {
        dispatchXPGain(data.xpAwarded, data.leveledUp, data.newRankName, data.oldRankName, data.oldRankIcon, data.newRankIcon, data.totalXp);
      }

      console.log('🎯 [GameSession] Recorded:', {
        gameType,
        won,
        newStreak: data.streakResult.newStreak,
        graceUsed: data.streakResult.graceUsed,
        xpAwarded: data.xpAwarded,
        ...(gameType === 'daily_quest' && { dailyQuestStreak: data.player.dailyQuestStreak }),
      });

      return {
        streakResult: data.streakResult,
        gameStats: data.gameStats,
      };
    } catch (error) {
      console.error('Error recording game session:', error);
      return null;
    }
  }, [currentPlayerId]);

  // Get per-game stats for a specific game type
  const getPerGameStats = useCallback(async (
    gameType: 'guess_and_go' | 'daily_quest' | 'crossworld'
  ): Promise<PerGameStats | null> => {
    if (!currentPlayerId) return null;

    try {
      const response = await fetch(`/api/players/${currentPlayerId}/game-stats/${gameType}`);
      if (!response.ok) throw new Error('Failed to fetch game stats');
      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error fetching game stats:', error);
      return null;
    }
  }, [currentPlayerId]);

  // Get all game stats for the current player
  const getAllGameStats = useCallback(async (): Promise<Record<string, PerGameStats>> => {
    if (!currentPlayerId) return {};

    try {
      const response = await fetch(`/api/players/${currentPlayerId}/game-stats`);
      if (!response.ok) throw new Error('Failed to fetch game stats');
      const data = await response.json();
      
      // Convert array to object keyed by gameType
      const statsMap: Record<string, PerGameStats> = {};
      for (const stat of data.stats) {
        statsMap[stat.gameType] = stat;
      }
      return statsMap;
    } catch (error) {
      console.error('Error fetching all game stats:', error);
      return {};
    }
  }, [currentPlayerId]);

  return (
    <UserContext.Provider value={{ 
       user, 
       stats, 
       collectedCardIds, 
       collectedCardTimestamps,
       unlockedAchievementIds,
       passportMastery,
       currentPlayerId,
       setCurrentPlayerId,
       login, 
       logout, 
       addCollectedCard,
       getCollectedCardTimestamp,
       unlockAchievement,
       awardPassportStar,
       recordMasteryAttempt,
       getPassportMastery,
       refreshStampInteraction,
       markCityVisitedInGeoAdventures,
       recordGameResult,
       recordDailyQuestPlayed, 
       recordCrossworldResult,
       unlockFindMyHomeBuddy,
       addMissionCompleted, 
       addStars,
       addSpellGeoState,
       syncStatsToBackend,
       loadPlayerFromBackend,
       queueCardAdditionForSync,
       syncPendingCards,
       checkStreakBadges,
       getBonusHintsFromStreak,
       recordGameSession,
       getPerGameStats,
       getAllGameStats,
       isLoading: authLoading,
       isSyncing,
       isLoadingPlayer,
       lastSyncTime,
       syncError
    }}>
      {children}
    </UserContext.Provider>
  );
}

// Default context value for when useUser is called outside provider (edge cases during lazy loading)
const defaultUserContext: UserContextType = {
  user: null,
  stats: { gamesPlayed: 0, starsEarnedTotal: 0, missionsCompletedTotal: 0, gameHistory: [] },
  collectedCardIds: [],
  collectedCardTimestamps: {},
  unlockedAchievementIds: [],
  passportMastery: [],
  currentPlayerId: null,
  setCurrentPlayerId: () => {},
  login: () => {},
  logout: () => {},
  addCollectedCard: () => {},
  getCollectedCardTimestamp: () => null,
  unlockAchievement: () => {},
  awardPassportStar: () => {},
  recordMasteryAttempt: () => {},
  getPassportMastery: () => undefined,
  refreshStampInteraction: () => {},
  markCityVisitedInGeoAdventures: () => {},
  recordGameResult: () => {},
  recordDailyQuestPlayed: () => {},
  recordCrossworldResult: () => {},
  unlockFindMyHomeBuddy: () => {},
  addMissionCompleted: () => {},
  addStars: () => {},
  addSpellGeoState: () => {},
  syncStatsToBackend: async () => {},
  loadPlayerFromBackend: async () => {},
  queueCardAdditionForSync: () => {},
  syncPendingCards: async () => {},
  checkStreakBadges: () => [],
  getBonusHintsFromStreak: () => 0,
  recordGameSession: async () => null,
  getPerGameStats: async () => null,
  getAllGameStats: async () => ({}),
  isLoading: false,
  isSyncing: false,
  isLoadingPlayer: false,
  lastSyncTime: null,
  syncError: null,
};

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    // Return safe fallback instead of throwing to handle edge cases
    // during lazy loading or when component mounts before provider
    console.warn("useUser called outside UserProvider, returning fallback");
    return defaultUserContext;
  }
  return context;
}
