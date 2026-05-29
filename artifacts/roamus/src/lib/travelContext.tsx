import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useUser } from "./userContext";
import type { TravelTrip, TravelStop, TravelMoment, JourneyPack } from "@shared/schema";
import { KNOWN_STOP_SUGGESTIONS } from "./travelDestinations";
import {
  getAllTripsOffline,
  getTripOffline,
  saveTripOffline,
  removeTripOffline,
  getJourneyPackOffline,
  savePendingMoment,
  getPendingMoments,
  removePendingMoment
} from "./travelOfflineStorage";
import { trackActivity } from "./identityTracking";

interface TravelContextType {
  isEnabled: boolean;
  isInTravelMode: boolean;
  setIsInTravelMode: (value: boolean) => void;
  trips: TravelTrip[];
  tripCounts: { travel: number; home: number; total: number } | null;
  currentTrip: TravelTrip | null;
  currentTripStops: TravelStop[];
  currentTripMoments: TravelMoment[];
  isLoading: boolean;
  travelHydrationState: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  fetchTrips: () => Promise<void>;
  fetchTrip: (tripId: string) => Promise<void>;
  ensureTripLoaded: (tripId: string) => Promise<void>;
  clearCurrentTrip: () => void;
  createTrip: (data: CreateTripData) => Promise<TravelTrip | null>;
  updateTrip: (tripId: string, data: Partial<CreateTripData>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  archiveTrip: (tripId: string, archived?: boolean) => Promise<void>;
  addStop: (tripId: string, data: CreateStopData) => Promise<TravelStop | null>;
  updateStop: (stopId: string, data: Partial<CreateStopData>) => Promise<void>;
  deleteStop: (stopId: string) => Promise<void>;
  markStopVisited: (stopId: string, explorerId?: string, stopType?: string) => Promise<{ showQualityPrompt?: boolean } | void>;
  toggleStopFavorite: (stopId: string) => Promise<void>;
  getJourneyPack: (stopId: string) => Promise<JourneyPack | null>;
  unlockJourneyGames: (packId: string) => Promise<void>;
  saveMoment: (data: CreateMomentData) => Promise<TravelMoment | null>;
  updateMoment: (momentId: string, data: Partial<CreateMomentData>) => Promise<void>;
  deleteMoment: (momentId: string) => Promise<void>;
  toggleFavorite: (momentId: string) => Promise<void>;
}

interface TripTraveler {
  explorerId?: string;
  name: string;
  avatarKey?: string;
  isParent?: boolean;
}

export interface TripMealPreferences {
  enabled: boolean;
  breakfast: boolean;
  lunch: boolean;
  snacks: boolean;
  dinner: boolean;
  diningStyle: "quick" | "sitdown" | "";
  cuisines: string[];
}

interface CreateTripData {
  name: string;
  destination: string;
  continent?: string;
  country: string;
  state?: string;
  city?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  travelMonth?: number;
  travelYear?: number;
  travelers?: TripTraveler[];
  travelerNames?: string[];
  autoGenerateStops?: boolean;
  adventureContext?: 'travel' | 'home';
  stopCount?: number;
  tripDays?: number | null;
  adventureStyle?: string;
  pace?: string;
  cityDates?: Record<string, { startDate: string; endDate: string }> | null;
  stayLocations?: Array<{ cityName?: string; name: string; address: string; checkIn: string; checkOut: string }> | null;
  meals?: TripMealPreferences | null;
  tailoring?: {
    gettingAround?: string | null;
    kidsEnergy?: string | null;
    indoorOutdoor?: string | null;
    kidInterests?: string[] | null;
    budgetLevel?: string | null;
    strollerFriendly?: boolean;
    smartStopDetails?: boolean;
  } | null;
}

interface CreateStopData {
  name: string;
  stopType?: string;
  displayOrder?: number;
  address?: string;
  description?: string;
  dayNumber?: number;
  tripNumDays?: number;
}

interface CreateMomentData {
  tripId: string;
  stopId?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  kidPromptResponse?: string | null;
  parentPromptResponse?: string | null;
  geoFact?: string | null;
  createdByExplorerId?: string | null;
  isSharedCommunity?: boolean;
}

const TravelContext = createContext<TravelContextType | null>(null);

export function TravelProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [isInTravelMode, setIsInTravelMode] = useState(false);
  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [tripCounts, setTripCounts] = useState<{ travel: number; home: number; total: number } | null>(null);
  const [currentTrip, setCurrentTrip] = useState<TravelTrip | null>(null);
  const [currentTripStops, setCurrentTripStops] = useState<TravelStop[]>([]);
  const [currentTripMoments, setCurrentTripMoments] = useState<TravelMoment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [travelHydrationState, setTravelHydrationState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track active trip fetch - prevents race conditions
  const activeTripFetchRef = useRef<string | null>(null);
  // Ref to track pending trip ID when user is still loading
  const pendingTripIdRef = useRef<string | null>(null);

  // Travel Mode is now always enabled
  const isEnabled = true;

  const fetchTrips = useCallback(async () => {
    if (!isEnabled) return;
    
    // Don't set isLoading if we're actively fetching a specific trip
    // This prevents race conditions where fetchTrips overwrites trip data
    if (!activeTripFetchRef.current) {
      setIsLoading(true);
    }
    setError(null);
    try {
      // Always try to load cached trips first (important for PWA standalone mode)
      const cachedTrips = await getAllTripsOffline();
      if (cachedTrips.length > 0) {
        setTrips(cachedTrips.map(ct => ct.trip));
        // Don't set isLoading to false yet - continue to try API fetch
      }
      
      // Distinguish between user loading (undefined) and logged out (null)
      if (user === undefined) {
        // User still loading - show cached trips, don't proceed with network fetch yet
        // The effect will re-trigger when user resolves
        setIsLoading(false);
        return;
      }
      
      if (user === null) {
        // User confirmed logged out - clear trips to prevent data leakage
        setTrips([]);
        setIsLoading(false);
        return;
      }
      
      if (!navigator.onLine) {
        // Offline - rely on cached trips
        setIsLoading(false);
        return;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const res = await fetch('/api/travel/trips', { 
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        // Handle 401 - try to use cached trips first (for PWA standalone mode where cookies may not persist)
        if (res.status === 401) {
          const cachedTripsOnAuth = await getAllTripsOffline();
          if (cachedTripsOnAuth.length > 0) {
            console.log('[Travel] Auth cookie missing but found cached trips, using offline data');
            setTrips(cachedTripsOnAuth.map(ct => ct.trip));
            setError(null);
            return;
          }
          // No cached trips and no auth - user needs to log in
          setError('Please log in to see your trips');
          setTrips([]);
          return;
        }
        
        if (!res.ok) throw new Error('Failed to fetch trips');
        const data = await res.json();
        // Support both new { trips, counts } format and legacy array format
        if (data && data.trips) {
          setTrips(Array.isArray(data.trips) ? data.trips : []);
          if (data.counts) setTripCounts(data.counts);
        } else {
          setTrips(Array.isArray(data) ? data : []);
        }
        
        // Trigger soft auto-completion check in background (don't await)
        fetch('/api/travel/trips/soft-complete', { 
          method: 'POST',
          credentials: 'include' 
        }).then(async (softRes) => {
          if (softRes.ok) {
            const result = await softRes.json();
            if (result.completedTripIds?.length > 0) {
              console.log('[Travel] Soft-completed trips:', result.completedTripIds);
              const refreshRes = await fetch('/api/travel/trips', { credentials: 'include' });
              if (refreshRes.ok) {
                const refreshedData = await refreshRes.json();
                if (refreshedData && refreshedData.trips) {
                  setTrips(Array.isArray(refreshedData.trips) ? refreshedData.trips : []);
                  if (refreshedData.counts) setTripCounts(refreshedData.counts);
                } else {
                  setTrips(Array.isArray(refreshedData) ? refreshedData : []);
                }
              }
            }
          }
        }).catch(err => {
          console.warn('[Travel] Soft-complete check failed:', err);
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (cachedTrips.length === 0) {
          throw fetchErr;
        }
        // Network failed but we have cached trips - don't throw
      }
    } catch (err) {
      try {
        const fallbackCache = await getAllTripsOffline();
        if (fallbackCache.length > 0) {
          setTrips(fallbackCache.map(ct => ct.trip));
          setError(null);
          return;
        }
      } catch {}
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user, isEnabled]);

  const fetchTrip = useCallback(async (tripId: string) => {
    if (!isEnabled) return;
    
    // User still loading - store pending trip ID and wait for auth to resolve
    // The useEffect below will retry when user changes
    if (user === undefined) {
      console.log('[Travel] fetchTrip: User still loading, storing pending tripId:', tripId);
      pendingTripIdRef.current = tripId;
      setIsLoading(true);
      return;
    }
    
    // Clear any pending trip ID since we're now processing
    pendingTripIdRef.current = null;
    
    console.log('[Travel] fetchTrip called:', tripId);
    
    // Mark that we're fetching a specific trip - prevents race conditions
    // When a new trip is clicked, this ref gets updated, invalidating any in-flight fetches
    activeTripFetchRef.current = tripId;
    
    setIsLoading(true);
    setError(null);
    
    // Helper to check if this fetch is still valid (no newer fetch has started)
    const isStillValidFetch = () => activeTripFetchRef.current === tripId;
    
    try {
      if (user === null) {
        // Check if this is a guest trip with a stored token
        let guestToken: string | null = null;
        try {
          guestToken = localStorage.getItem(`guest-trip-${tripId}`);
        } catch {}

        if (guestToken && navigator.onLine) {
          try {
            const guestRes = await fetch(`/api/travel/trips/${tripId}/guest-view?token=${encodeURIComponent(guestToken)}&_t=${Date.now()}`, {
              headers: { 'Cache-Control': 'no-cache' }
            });
            if (!isStillValidFetch()) return;
            if (guestRes.ok) {
              const data = await guestRes.json();
              setCurrentTrip({ ...data });
              setCurrentTripStops([...(data.stops || [])]);
              setCurrentTripMoments([...(data.moments || [])]);
              return;
            }
          } catch (guestErr) {
            console.warn('[Travel] Guest trip fetch failed, falling back to cache:', guestErr);
          }
        }

        // User confirmed logged out - rely on cached data only
        const cached = await getTripOffline(tripId);
        if (!isStillValidFetch()) {
          console.log('[Travel] Stale fetch discarded (logged out path):', tripId);
          return;
        }
        if (cached) {
          setCurrentTrip(cached.trip);
          setCurrentTripStops(cached.stops || []);
          setCurrentTripMoments(cached.moments || []);
        } else {
          setError('Please log in to view this trip');
        }
        return;
      }
      
      // User is authenticated - try to fetch fresh data from the network first
      if (navigator.onLine) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          const res = await fetch(`/api/travel/trips/${tripId}?_t=${Date.now()}`, { 
            credentials: 'include',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
          });
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const data = await res.json();
            console.log('[Travel] Fetched trip:', tripId, 'with', data.stops?.length || 0, 'stops');
            
            // RACE CONDITION FIX: Only update state if this is still the active fetch
            if (!isStillValidFetch()) {
              console.log('[Travel] Stale fetch discarded:', tripId, 'active is now:', activeTripFetchRef.current);
              return;
            }
            
            setCurrentTrip({ ...data });
            setCurrentTripStops([...(data.stops || [])]);
            setCurrentTripMoments([...(data.moments || [])]);
            
            // Save to offline cache for future use
            try {
              await saveTripOffline(data, data.stops || [], data.moments || []);
            } catch (cacheErr) {
              console.warn('Failed to cache trip offline:', cacheErr);
            }
            return;
          }
          
          // If response is not ok, try to get error details
          let errorMessage = `Server error (${res.status})`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {}
          console.warn('[Travel] Network fetch failed:', res.status, errorMessage);
          
          // For server errors (500), show the error to user
          if (res.status >= 500) {
            if (isStillValidFetch()) {
              setError(`Trip loading failed: ${errorMessage}`);
            }
            return;
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.warn('[Travel] Network fetch error:', fetchErr);
          // Fall through to use cached data
        }
      }
      
      // Network failed or offline - try cached data
      const cached = await getTripOffline(tripId);
      
      // RACE CONDITION FIX: Only update state if this is still the active fetch
      if (!isStillValidFetch()) {
        console.log('[Travel] Stale fetch discarded (cached path):', tripId);
        return;
      }
      
      if (cached) {
        console.log('[Travel] Using cached trip:', tripId, 'with', cached.stops?.length || 0, 'stops');
        setCurrentTrip(cached.trip);
        setCurrentTripStops(cached.stops || []);
        setCurrentTripMoments(cached.moments || []);
      } else {
        setError('Unable to load trip. Please check your connection.');
      }
    } finally {
      // Clean up if this was the active fetch
      if (isStillValidFetch()) {
        activeTripFetchRef.current = null;
        setIsLoading(false);
        setTravelHydrationState(prev => prev === 'loading' ? 'ready' : prev);
      }
    }
  }, [user, isEnabled]);

  const ensureTripLoaded = useCallback(async (tripId: string) => {
    if (!isEnabled) return;
    if (currentTrip?.id === tripId && travelHydrationState === 'ready') return;

    setTravelHydrationState('loading');
    
    try {
      // 1. Try IndexedDB cache first
      const cached = await getTripOffline(tripId);
      if (cached) {
        console.log('[Travel] ensureTripLoaded: Found cached trip:', tripId);
        setCurrentTrip(cached.trip);
        setCurrentTripStops(cached.stops || []);
        setCurrentTripMoments(cached.moments || []);
        setTravelHydrationState('ready');
        
        // If online, background refresh
        if (navigator.onLine && user !== null) {
          fetchTrip(tripId).catch(err => console.warn('[Travel] Background refresh failed:', err));
        }
        return;
      }

      // 2. Not in cache, try API fetch if online
      if (navigator.onLine && user !== null) {
        console.log('[Travel] ensureTripLoaded: Fetching from API:', tripId);
        await fetchTrip(tripId);
        // fetchTrip handles setting currentTrip and travelHydrationState (via the finally block)
        // Wait a bit to ensure states are updated if fetchTrip is async
        return;
      }

      // 3. Offline and not in cache
      if (!navigator.onLine) {
        console.warn('[Travel] ensureTripLoaded: Offline and no cache for trip:', tripId);
        setTravelHydrationState('error');
        setError('You are offline and this trip is not saved on your device.');
      } else if (user === null) {
        console.warn('[Travel] ensureTripLoaded: User not logged in');
        setTravelHydrationState('error');
        setError('Please log in to view this trip.');
      }
    } catch (err) {
      console.error('[Travel] ensureTripLoaded error:', err);
      setTravelHydrationState('error');
      setError(err instanceof Error ? err.message : 'Failed to load trip');
    }
  }, [isEnabled, currentTrip, travelHydrationState, user, fetchTrip]);

  const createTrip = useCallback(async (data: CreateTripData): Promise<TravelTrip | null> => {
    if (!user || !isEnabled) return null;
    
    try {
      // Backend now handles auto-generation of stops for any city
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout — server should respond in <2s now
      let res: Response;
      try {
        res = await fetch('/api/travel/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            ...data,
            startDate: data.startDate?.toISOString(),
            endDate: data.endDate?.toISOString(),
            autoGenerateStops: data.autoGenerateStops !== false, // Default to true
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) {
        let errorData: any = {};
        try { errorData = await res.json(); } catch {}
        let errorMessage: string;
        let errorCode: string | undefined;
        if (res.status === 401) {
          errorMessage = 'Please sign in again to continue';
          errorCode = 'SESSION_EXPIRED';
        } else if (res.status >= 500) {
          // Non-JSON 502/503 during server restart or real 500
          errorMessage = errorData.message || 'Server error — please try again in a moment';
        } else {
          errorMessage = errorData.message || 'Failed to create trip';
        }
        const error = new Error(errorMessage) as Error & { code?: string; existingTrip?: { id: string; name: string; destination: string }; detail?: string };
        error.code = errorCode || errorData.code;
        if (errorData.existingTrip) error.existingTrip = errorData.existingTrip;
        if (errorData.detail) error.detail = errorData.detail;
        console.error('[Travel] createTrip error:', res.status, errorMessage, errorData.detail || '');
        throw error;
      }
      const trip = await res.json();
      console.log('[Travel] Trip created with', trip.stops?.length || 0, 'auto-generated stops');
      setTrips(prev => [trip, ...prev]);
      // Update trip counts to reflect the new trip
      const isHome = data.adventureContext === 'home';
      setTripCounts(prev => prev ? {
        ...prev,
        total: prev.total + 1,
        home: isHome ? prev.home + 1 : prev.home,
        travel: isHome ? prev.travel : prev.travel + 1,
      } : null);
      
      return trip;
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      throw err; // Re-throw so caller can handle specific errors
    }
  }, [user, isEnabled]);

  const updateTrip = useCallback(async (tripId: string, data: Partial<CreateTripData>) => {
    if (!user || !isEnabled) return;
    
    try {
      const res = await fetch(`/api/travel/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update trip');
      const updated = await res.json();
      setTrips(prev => prev.map(t => t.id === tripId ? updated : t));
      if (currentTrip?.id === tripId) setCurrentTrip(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled, currentTrip]);

  const deleteTrip = useCallback(async (tripId: string) => {
    if (!user || !isEnabled) return;
    
    try {
      // Find trip context before deletion for count update
      const deletedTrip = trips.find(t => t.id === tripId);
      const res = await fetch(`/api/travel/trips/${tripId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete trip');
      setTrips(prev => prev.filter(t => t.id !== tripId));
      // Update trip counts
      if (deletedTrip) {
        const isHome = (deletedTrip as any).adventureContext === 'home';
        setTripCounts(prev => prev ? {
          ...prev,
          total: Math.max(0, prev.total - 1),
          home: isHome ? Math.max(0, prev.home - 1) : prev.home,
          travel: isHome ? prev.travel : Math.max(0, prev.travel - 1),
        } : null);
      }
      if (currentTrip?.id === tripId) {
        setCurrentTrip(null);
        setCurrentTripStops([]);
        setCurrentTripMoments([]);
      }
      
      // Remove from offline cache
      try {
        await removeTripOffline(tripId);
      } catch (cacheErr) {
        console.warn('Failed to remove trip from offline cache:', cacheErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled, currentTrip, trips]);

  const archiveTrip = useCallback(async (tripId: string, archived = true) => {
    if (!user || !isEnabled) return;
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/archive`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: archived }),
      });
      if (!res.ok) throw new Error('Failed to archive trip');
      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, isArchived: archived } : t));
      if (currentTrip?.id === tripId) setCurrentTrip(prev => prev ? { ...prev, isArchived: archived } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled, currentTrip]);

  const addStop = useCallback(async (tripId: string, data: CreateStopData): Promise<TravelStop | null> => {
    if (!isEnabled) return null;
    if (!user) throw new Error('SESSION_EXPIRED');
    
    try {
      const res = await fetch(`/api/travel/trips/${tripId}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (res.status === 401) throw new Error('SESSION_EXPIRED');
      if (!res.ok) throw new Error('Failed to add stop');
      const stop = await res.json();
      setCurrentTripStops(prev => [...prev, stop]);
      return stop;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      throw err;
    }
  }, [user, isEnabled]);

  const updateStop = useCallback(async (stopId: string, data: Partial<CreateStopData>) => {
    if (!user || !isEnabled) return;
    
    try {
      const res = await fetch(`/api/travel/stops/${stopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update stop');
      const updated = await res.json();
      setCurrentTripStops(prev => prev.map(s => s.id === stopId ? updated : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled]);

  const deleteStop = useCallback(async (stopId: string) => {
    if (!isEnabled) return;
    
    // Require user for stop deletion
    if (!user) {
      setError('Please log in to delete stops');
      return;
    }
    
    try {
      // Try server-side delete if online
      if (navigator.onLine) {
        const res = await fetch(`/api/travel/stops/${stopId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to delete stop' }));
          throw new Error(errorData.message || 'Failed to delete stop');
        }
        // Verify deletion succeeded before updating local state
        console.log('[Travel] Stop deleted successfully on server:', stopId);
      }
      // Update local state after successful server delete
      setCurrentTripStops(prev => prev.filter(s => s.id !== stopId));
      
      // Clear offline cache for this stop to prevent stale data
      try {
        const currentTripId = currentTripStops.find(s => s.id === stopId)?.tripId;
        if (currentTripId && currentTrip) {
          const remainingStops = currentTripStops.filter(s => s.id !== stopId);
          await saveTripOffline(currentTrip, remainingStops, currentTripMoments);
        }
      } catch (cacheErr) {
        console.warn('[Travel] Failed to update offline cache after stop deletion:', cacheErr);
      }
    } catch (err) {
      console.error('[Travel] deleteStop error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err; // Re-throw so the UI can show the error toast
    }
  }, [user, isEnabled, currentTrip, currentTripStops, currentTripMoments]);

  const markStopVisited = useCallback(async (stopId: string, explorerId?: string, stopType?: string): Promise<{ showQualityPrompt?: boolean } | void> => {
    if (!isEnabled) return;
    
    let showQualityPrompt: boolean | undefined;
    try {
      let updated = null;
      
      // Try server-side update if online
      if (navigator.onLine) {
        const res = await fetch(`/api/travel/stops/${stopId}/visit`, {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          updated = await res.json();
          showQualityPrompt = updated?.showQualityPrompt;
        }
      }
      
      // If server update failed or offline, update locally
      if (!updated) {
        updated = currentTripStops.find(s => s.id === stopId);
        if (updated) {
          updated = { ...updated, isVisited: true, visitedAt: new Date().toISOString() };
        }
      }
      
      if (!updated) return;
      
      // Update in-memory state
      setCurrentTripStops(prev => prev.map(s => s.id === stopId ? updated : s));
      
      // Update offline cache using in-memory state (avoids N+1 API call)
      if (currentTrip) {
        try {
          const updatedStops = currentTripStops.map(s => s.id === stopId ? updated : s);
          await saveTripOffline(currentTrip, updatedStops, currentTripMoments);
        } catch (cacheErr) {
          console.warn('Failed to update offline cache:', cacheErr);
        }
      }
      
      const STOPS_SINCE_GAME_KEY = 'travel_mode_stops_since_game';
      const current = parseInt(localStorage.getItem(STOPS_SINCE_GAME_KEY) || '0', 10);
      localStorage.setItem(STOPS_SINCE_GAME_KEY, String(current + 1));
      
      // Track identity traits for exploring
      if (explorerId) {
        trackActivity(explorerId, 'stop_visited');
        if (stopType === 'nature') {
          trackActivity(explorerId, 'nature_stop_visited');
        } else if (stopType === 'city' || stopType === 'landmark') {
          trackActivity(explorerId, 'cultural_stop_visited');
        }
      }
      return { showQualityPrompt };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [isEnabled, currentTrip, currentTripStops, currentTripMoments]);

  const toggleStopFavorite = useCallback(async (stopId: string) => {
    if (!isEnabled) return;
    const stop = currentTripStops.find(s => s.id === stopId);
    if (!stop) return;
    const newFav = !stop.isFavorite;
    setCurrentTripStops(prev => prev.map(s =>
      s.id === stopId ? { ...s, isFavorite: newFav, favoriteSource: 'manual' } : s
    ));
    try {
      await fetch(`/api/travel/stops/${stopId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isFavorite: newFav }),
      });
    } catch {
      setCurrentTripStops(prev => prev.map(s =>
        s.id === stopId ? { ...s, isFavorite: stop.isFavorite, favoriteSource: stop.favoriteSource } : s
      ));
    }
  }, [isEnabled, currentTripStops]);

  const getJourneyPack = useCallback(async (stopId: string): Promise<JourneyPack | null> => {
    if (!isEnabled) return null;
    
    try {
      if (!navigator.onLine) {
        const cached = await getJourneyPackOffline(stopId);
        if (cached) return cached;
        throw new Error('No internet connection and Journey Pack not cached');
      }
      
      const res = await fetch(`/api/travel/stops/${stopId}/journey-pack`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch journey pack');
      return await res.json();
    } catch (err) {
      try {
        const cached = await getJourneyPackOffline(stopId);
        if (cached) return cached;
      } catch {}
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [user, isEnabled]);

  const unlockJourneyGames = useCallback(async (packId: string) => {
    if (!user || !isEnabled) return;
    
    try {
      const res = await fetch(`/api/travel/journey-packs/${packId}/unlock-games`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to unlock games');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled]);

  const saveMoment = useCallback(async (data: CreateMomentData): Promise<TravelMoment | null> => {
    if (!user || !isEnabled) return null;
    
    try {
      const res = await fetch('/api/travel/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save moment');
      const moment = await res.json();
      
      // Update in-memory state
      setCurrentTripMoments(prev => [moment, ...prev]);
      
      // Update offline cache using in-memory state (avoids N+1 API call)
      if (currentTrip) {
        try {
          const updatedMoments = [moment, ...currentTripMoments];
          await saveTripOffline(currentTrip, currentTripStops, updatedMoments);
        } catch (cacheErr) {
          console.warn('Failed to update offline cache:', cacheErr);
        }
      }
      
      // Track identity traits for family moments and storytelling
      if (data.createdByExplorerId) {
        // Family photo moment = familyConnecting trait
        if (data.photoUrl || (data.photoUrls && data.photoUrls.length > 0)) {
          trackActivity(data.createdByExplorerId, 'photo_captured');
        }
        // Adding a caption or response = storyTelling trait
        if (data.kidPromptResponse) {
          trackActivity(data.createdByExplorerId, 'caption_added');
        }
        // Any moment = family connecting
        trackActivity(data.createdByExplorerId, 'family_moment');
      }
      
      return moment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [user, isEnabled, currentTrip, currentTripStops, currentTripMoments]);

  const updateMoment = useCallback(async (momentId: string, data: Partial<CreateMomentData>) => {
    if (!user || !isEnabled) return;
    
    try {
      const res = await fetch(`/api/travel/moments/${momentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update moment');
      const updated = await res.json();
      setCurrentTripMoments(prev => prev.map(m => m.id === momentId ? updated : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled]);

  const deleteMoment = useCallback(async (momentId: string) => {
    if (!user || !isEnabled) return;
    
    try {
      const res = await fetch(`/api/travel/moments/${momentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete moment');
      setCurrentTripMoments(prev => prev.filter(m => m.id !== momentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled]);

  const toggleFavorite = useCallback(async (momentId: string) => {
    if (!user || !isEnabled) return;
    
    try {
      const moment = currentTripMoments.find(m => m.id === momentId);
      if (!moment) return;
      
      const res = await fetch(`/api/travel/moments/${momentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isFavorite: !moment.isFavorite }),
      });
      if (!res.ok) throw new Error('Failed to update favorite');
      const updatedMoment = await res.json();
      setCurrentTripMoments(prev => prev.map(m => m.id === momentId ? updatedMoment : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [user, isEnabled, currentTripMoments]);

  // Fetch trips whenever travel is enabled and user state changes
  // (not conditional on isInTravelMode so Home page banner/context also works)
  useEffect(() => {
    if (isEnabled) {
      console.log('[Travel] fetchTrips triggered, user:', user === undefined ? 'loading' : (user ? 'authenticated' : 'logged out'));
      fetchTrips();
    }
  }, [user, isEnabled, fetchTrips]);

  // Retry pending trip fetch when user state resolves from undefined
  useEffect(() => {
    if (user !== undefined && pendingTripIdRef.current && isInTravelMode) {
      const tripId = pendingTripIdRef.current;
      console.log('[Travel] Retrying pending trip fetch:', tripId, 'user:', user ? 'authenticated' : 'logged out');
      pendingTripIdRef.current = null;
      fetchTrip(tripId);
    }
  }, [user, isInTravelMode, fetchTrip]);

  return (
    <TravelContext.Provider value={{
      isEnabled,
      isInTravelMode,
      setIsInTravelMode,
      trips,
      tripCounts,
      currentTrip,
      currentTripStops,
      currentTripMoments,
      isLoading,
      travelHydrationState,
      error,
      fetchTrips,
      fetchTrip,
      ensureTripLoaded,
      clearCurrentTrip: () => {
        setCurrentTrip(null);
        setCurrentTripStops([]);
        setCurrentTripMoments([]);
        setTravelHydrationState('idle');
        activeTripFetchRef.current = null;
      },
      createTrip,
      updateTrip,
      deleteTrip,
      archiveTrip,
      addStop,
      updateStop,
      deleteStop,
      markStopVisited,
      toggleStopFavorite,
      getJourneyPack,
      unlockJourneyGames,
      saveMoment,
      updateMoment,
      deleteMoment,
      toggleFavorite,
    }}>
      {children}
    </TravelContext.Provider>
  );
}

export function useTravel() {
  const context = useContext(TravelContext);
  if (!context) {
    throw new Error('useTravel must be used within a TravelProvider');
  }
  return context;
}
