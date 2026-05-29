import { apiRequest } from "./queryClient";
import { trackActivity } from "./identityTracking";
import { 
  getTripOffline, 
  saveTripOffline, 
  savePendingMoment 
} from "./travelOfflineStorage";
import type { TravelMoment, TravelTrip, TravelStop } from "@shared/schema";

/**
 * T007: Centralized travel event functions for the kid flow.
 * These functions handle API calls, offline queuing, and identity tracking.
 */

/**
 * Marks a stop as visited and updates the local cache and identity traits.
 */
export async function markStopVisited(
  stopId: string, 
  tripId: string, 
  explorerId?: string,
  stopType?: string
) {
  // 1. Trigger identity tracking
  if (explorerId) {
    trackActivity(explorerId, 'stop_visited', { stopType });
    if (stopType === 'nature') {
      trackActivity(explorerId, 'nature_stop_visited');
    } else if (stopType === 'landmark' || stopType === 'museum') {
      trackActivity(explorerId, 'cultural_stop_visited');
    }
  }

  // 2. API call
  try {
    if (navigator.onLine) {
      await apiRequest("POST", `/api/travel/stops/${stopId}/visit`, { explorerId });
    }
  } catch (error) {
    console.error('[TravelEvents] Failed to mark stop visited on server:', error);
    // Continue to update local cache even if server call fails
  }

  // 3. Update local IndexedDB cache
  try {
    const cached = await getTripOffline(tripId);
    if (cached) {
      const updatedStops = cached.stops.map(s => 
        s.id === stopId ? { ...s, isVisited: true, visitedAt: new Date() } : s
      );
      await saveTripOffline(cached.trip, updatedStops, cached.moments);
    }
  } catch (cacheError) {
    console.error('[TravelEvents] Failed to update local cache for visited stop:', cacheError);
  }
}

/**
 * Saves a moment (photo/response) and handles offline queuing.
 */
export async function saveMoment(momentPayload: {
  tripId: string;
  stopId?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  kidPromptResponse?: string | null;
  parentPromptResponse?: string | null;
  geoFact?: string | null;
  createdByExplorerId?: string | null;
  stopType?: string;
}) {
  const { createdByExplorerId, stopType, ...payload } = momentPayload;

  // 1. Identity Tracking
  if (createdByExplorerId) {
    trackActivity(createdByExplorerId, 'moment_created', { stopType });
  }

  // 2. Handle Offline vs Online
  if (!navigator.onLine) {
    const tempId = `temp_${Date.now()}`;
    const pendingMoment = {
      ...payload,
      tempId,
      createdAt: new Date().toISOString(),
      createdByExplorerId
    } as any;
    
    await savePendingMoment(pendingMoment);
    return { tempId, ...pendingMoment };
  }

  try {
    const res = await apiRequest("POST", "/api/travel/moments", {
      ...payload,
      createdByExplorerId
    });
    const newMoment = await res.json();

    // Update local cache with new moment
    const cached = await getTripOffline(payload.tripId);
    if (cached) {
      await saveTripOffline(cached.trip, cached.stops, [...cached.moments, newMoment]);
    }

    return newMoment;
  } catch (error) {
    console.error('[TravelEvents] Failed to save moment:', error);
    throw error;
  }
}

/**
 * Completes a specific section of a stop (e.g., 'quiet', 'reflect')
 */
export async function completeSection(
  stopId: string, 
  tripId: string, 
  sectionName: string,
  explorerId?: string
) {
  // 1. Identity Tracking for reflection
  if (sectionName === 'reflect' && explorerId) {
    trackActivity(explorerId, 'wonder_response');
  }

  // 2. API Call
  try {
    if (navigator.onLine) {
      await apiRequest("POST", `/api/travel/stops/${stopId}/complete-section`, { sectionName });
    }
  } catch (error) {
    console.error(`[TravelEvents] Failed to complete section ${sectionName} on server:`, error);
  }

  // 3. Update local cache
  try {
    const cached = await getTripOffline(tripId);
    if (cached) {
      const updatedStops = cached.stops.map(s => {
        if (s.id === stopId) {
          // Note: travelStops table in schema.ts doesn't have completedSections array yet,
          // but the task T007 mentions using it. We use a cast to satisfy TypeScript
          // if it's missing from the current schema.
          const stop = s as any;
          const completedSections = Array.isArray(stop.completedSections) ? [...stop.completedSections] : [];
          if (!completedSections.includes(sectionName)) {
            completedSections.push(sectionName);
          }
          return { ...s, completedSections };
        }
        return s;
      });
      await saveTripOffline(cached.trip, updatedStops as any, cached.moments);
    }
  } catch (cacheError) {
    console.error('[TravelEvents] Failed to update local cache for completed section:', cacheError);
  }
}
