/**
 * Adventure Mode Utilities
 * 
 * Provides helper functions for differentiating At-Home Adventures (preview/learning)
 * from Travel Packs (real memory preservation).
 * 
 * Key Principles:
 * - At-Home: Build curiosity, preview experience, educational focus
 * - Travel: Preserve memories, completion, keepsakes, ownership
 */

import type { TravelTrip } from "@shared/schema";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AdventureContext = 'home' | 'travel';

export interface AdventureCapabilities {
  allowCompletion: boolean;
  allowKeepsakes: boolean;
  allowMediaCapture: boolean;
  allowOffline: boolean;
  allowMapDisplay: boolean;
  contentDepth: 'preview' | 'full';
}

// ============================================================================
// LANGUAGE SYSTEM - Context-aware copy
// ============================================================================

interface LanguageMap {
  // Stop/Visit language
  visited: string;
  visit: string;
  // Completion language  
  completed: string;
  complete: string;
  saved: string;
  save: string;
  collected: string;
  collect: string;
  earned: string;
  // Action language
  finishAdventure: string;
  saveMemory: string;
  // Celebration language
  tripComplete: string;
  memorySaved: string;
  // Card headers
  stopCardAction: string;
  // Progress indicators
  stopsProgress: string;
}

const HOME_LANGUAGE: LanguageMap = {
  visited: 'Explored',
  visit: 'Explore',
  completed: 'Discovered',
  complete: 'Discover',
  saved: 'Learned',
  save: 'Learn',
  collected: 'Discovered',
  collect: 'Discover',
  earned: 'Unlocked',
  finishAdventure: 'Keep Exploring',
  saveMemory: 'Learn More',
  tripComplete: 'Great exploring!',
  memorySaved: 'Knowledge gained!',
  stopCardAction: 'Explore this place',
  stopsProgress: 'explored',
};

const TRAVEL_LANGUAGE: LanguageMap = {
  visited: 'Visited',
  visit: 'Visit',
  completed: 'Completed',
  complete: 'Complete',
  saved: 'Saved',
  save: 'Save',
  collected: 'Collected',
  collect: 'Collect',
  earned: 'Earned',
  finishAdventure: 'Finish Adventure',
  saveMemory: 'Save Moment',
  tripComplete: 'Adventure Complete!',
  memorySaved: 'Memory Saved Forever!',
  stopCardAction: 'Mark as visited',
  stopsProgress: 'visited',
};

export function getAdventureLanguage(context: AdventureContext): LanguageMap {
  return context === 'home' ? HOME_LANGUAGE : TRAVEL_LANGUAGE;
}

export function getLanguageForTrip(trip: TravelTrip | null | undefined): LanguageMap {
  const context = trip?.adventureContext as AdventureContext || 'travel';
  return getAdventureLanguage(context);
}

// Convenience function to check if it's a home adventure
export function isHomeAdventure(trip: TravelTrip | null | undefined): boolean {
  return trip?.adventureContext === 'home';
}

export function isTravelAdventure(trip: TravelTrip | null | undefined): boolean {
  return !trip || trip.adventureContext === 'travel';
}

// ============================================================================
// CAPABILITY CHECKING
// ============================================================================

export function getCapabilities(trip: TravelTrip | null | undefined): AdventureCapabilities {
  if (!trip) {
    // Default to travel capabilities
    return {
      allowCompletion: true,
      allowKeepsakes: true,
      allowMediaCapture: true,
      allowOffline: true,
      allowMapDisplay: true,
      contentDepth: 'full',
    };
  }
  
  return {
    allowCompletion: trip.allowCompletion !== false,
    allowKeepsakes: trip.allowKeepsakes !== false,
    allowMediaCapture: trip.allowMediaCapture !== false,
    allowOffline: trip.allowOffline !== false,
    allowMapDisplay: trip.allowMapDisplay !== false,
    contentDepth: (trip.contentDepth as 'preview' | 'full') || 'full',
  };
}

// ============================================================================
// COLOR THEME SYSTEM
// ============================================================================

interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  
  // Background colors
  bgCard: string;
  bgCardDark: string;
  bgAccent: string;
  bgAccentDark: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  
  // Border colors
  borderPrimary: string;
  borderLight: string;
  
  // Button classes (Tailwind)
  buttonPrimary: string;
  buttonSecondary: string;
  
  // Badge classes
  badge: string;
  
  // Icon accent
  iconColor: string;
}

// At-Home: Teal/Mint palette - calm, educational, exploratory
const HOME_THEME: ThemeColors = {
  primary: 'teal-500',
  primaryHover: 'teal-600',
  primaryLight: 'teal-100',
  primaryDark: 'teal-900',
  
  bgCard: 'bg-teal-50',
  bgCardDark: 'dark:bg-teal-950/30',
  bgAccent: 'bg-teal-100',
  bgAccentDark: 'dark:bg-teal-900/50',
  
  textPrimary: 'text-teal-700 dark:text-teal-300',
  textSecondary: 'text-teal-600 dark:text-teal-400',
  textAccent: 'text-teal-500',
  
  borderPrimary: 'border-teal-500',
  borderLight: 'border-teal-200 dark:border-teal-800',
  
  buttonPrimary: 'bg-teal-500 hover:bg-teal-600 text-white',
  buttonSecondary: 'bg-teal-100 hover:bg-teal-200 text-teal-700 dark:bg-teal-900 dark:hover:bg-teal-800 dark:text-teal-200',
  
  badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  
  iconColor: 'text-teal-500',
};

// Travel: Navy/Gold palette - premium, memory-preserving, achievement
const TRAVEL_THEME: ThemeColors = {
  primary: 'amber-500',
  primaryHover: 'amber-600',
  primaryLight: 'amber-100',
  primaryDark: 'amber-900',
  
  bgCard: 'bg-slate-50',
  bgCardDark: 'dark:bg-slate-800/50',
  bgAccent: 'bg-amber-50',
  bgAccentDark: 'dark:bg-amber-900/30',
  
  textPrimary: 'text-slate-800 dark:text-slate-100',
  textSecondary: 'text-slate-600 dark:text-slate-300',
  textAccent: 'text-amber-600 dark:text-amber-400',
  
  borderPrimary: 'border-amber-500',
  borderLight: 'border-slate-200 dark:border-slate-700',
  
  buttonPrimary: 'bg-amber-500 hover:bg-amber-600 text-white',
  buttonSecondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200',
  
  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  
  iconColor: 'text-amber-500',
};

export function getThemeColors(context: AdventureContext): ThemeColors {
  return context === 'home' ? HOME_THEME : TRAVEL_THEME;
}

export function getThemeForTrip(trip: TravelTrip | null | undefined): ThemeColors {
  const context = trip?.adventureContext as AdventureContext || 'travel';
  return getThemeColors(context);
}

// ============================================================================
// COMBINED HELPER HOOKS
// ============================================================================

export interface AdventureMode {
  context: AdventureContext;
  isHome: boolean;
  isTravel: boolean;
  language: LanguageMap;
  theme: ThemeColors;
  capabilities: AdventureCapabilities;
}

export function getAdventureMode(trip: TravelTrip | null | undefined): AdventureMode {
  const context = (trip?.adventureContext as AdventureContext) || 'travel';
  
  return {
    context,
    isHome: context === 'home',
    isTravel: context === 'travel',
    language: getAdventureLanguage(context),
    theme: getThemeColors(context),
    capabilities: getCapabilities(trip),
  };
}

// ============================================================================
// SOFT AUTO-COMPLETION LOGIC
// ============================================================================

/**
 * Configuration for soft auto-completion
 */
export const SOFT_COMPLETION_CONFIG = {
  // Days of inactivity before suggesting completion
  inactiveDaysTrigger: 14,
  // Maximum days before automatically moving to suggested completion
  maxInactiveDays: 21,
};

export type SoftCompletionStatus = 
  | 'active'           // Still actively working on adventure
  | 'all_stops_done'   // All stops visited, ready to complete
  | 'inactive_suggest' // 14+ days inactive, suggest completion
  | 'inactive_auto'    // 21+ days inactive, auto-suggest completion
  | 'completed';       // Already completed

export interface SoftCompletionResult {
  status: SoftCompletionStatus;
  daysSinceActivity: number;
  shouldSuggestCompletion: boolean;
  message?: string;
}

/**
 * Check if an adventure should be soft-completed based on:
 * 1. Trip start date has passed + 1 month grace period
 * 2. All stops have been visited
 * 3. Inactivity period (14-21 days)
 */
export function checkSoftCompletion(
  trip: TravelTrip | null | undefined,
  stopsVisitedCount: number,
  totalStopsCount: number
): SoftCompletionResult {
  if (!trip) {
    return { status: 'active', daysSinceActivity: 0, shouldSuggestCompletion: false };
  }

  // Already completed or locked
  if (trip.status === 'completed' || trip.isLocked) {
    return { status: 'completed', daysSinceActivity: 0, shouldSuggestCompletion: false };
  }

  // At-Home adventures don't soft-complete (perpetual preview)
  if (trip.adventureContext === 'home') {
    return { status: 'active', daysSinceActivity: 0, shouldSuggestCompletion: false };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // IMPORTANT: Don't show "Finish Adventure" for future trips
  // Check startDate first, then fall back to travelMonth/travelYear
  if (trip.startDate) {
    const tripStartDate = new Date(trip.startDate);
    const oneMonthAfterStart = new Date(tripStartDate);
    oneMonthAfterStart.setMonth(oneMonthAfterStart.getMonth() + 1);
    
    if (now < oneMonthAfterStart) {
      // Trip start date + 1 month is still in the future, don't suggest completion
      return { status: 'active', daysSinceActivity: 0, shouldSuggestCompletion: false };
    }
  } else if (trip.travelYear && trip.travelMonth) {
    // Use travelMonth/travelYear if startDate is not available
    // Don't show completion prompts if the trip is planned for a future month
    if (trip.travelYear > currentYear) {
      return { status: 'active', daysSinceActivity: 0, shouldSuggestCompletion: false };
    }
    if (trip.travelYear === currentYear && trip.travelMonth > currentMonth) {
      return { status: 'active', daysSinceActivity: 0, shouldSuggestCompletion: false };
    }
    // Also don't show until 1 month after the planned travel date
    const tripPlannedDate = new Date(trip.travelYear, trip.travelMonth - 1, 1);
    const oneMonthAfterPlanned = new Date(tripPlannedDate);
    oneMonthAfterPlanned.setMonth(oneMonthAfterPlanned.getMonth() + 1);
    if (now < oneMonthAfterPlanned) {
      return { status: 'active', daysSinceActivity: 0, shouldSuggestCompletion: false };
    }
  }

  // Calculate days since last activity
  const lastActive = trip.updatedAt ? new Date(trip.updatedAt) : 
                     trip.createdAt ? new Date(trip.createdAt) : new Date();
  const daysSinceActivity = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  // Check if all stops are visited
  const allStopsDone = totalStopsCount > 0 && stopsVisitedCount >= totalStopsCount;

  // Priority 1: All stops visited
  if (allStopsDone) {
    return {
      status: 'all_stops_done',
      daysSinceActivity,
      shouldSuggestCompletion: true,
      message: "You've visited all stops! Ready to finish this adventure?",
    };
  }

  // Priority 2: 21+ days inactive - strong suggestion
  if (daysSinceActivity >= SOFT_COMPLETION_CONFIG.maxInactiveDays) {
    return {
      status: 'inactive_auto',
      daysSinceActivity,
      shouldSuggestCompletion: true,
      message: `It's been ${daysSinceActivity} days since your last activity. Would you like to finish this adventure?`,
    };
  }

  // Priority 3: 14+ days inactive - gentle suggestion
  if (daysSinceActivity >= SOFT_COMPLETION_CONFIG.inactiveDaysTrigger) {
    return {
      status: 'inactive_suggest',
      daysSinceActivity,
      shouldSuggestCompletion: true,
      message: `It's been a couple weeks. Ready to wrap up this adventure?`,
    };
  }

  // Still active
  return { status: 'active', daysSinceActivity, shouldSuggestCompletion: false };
}

/**
 * Get a list of adventures that should be suggested for completion
 */
export function getAdventuresForSoftCompletion(
  trips: TravelTrip[],
  stopsMap: Record<string, { visited: number; total: number }>
): Array<{ trip: TravelTrip; completionResult: SoftCompletionResult }> {
  return trips
    .filter(trip => !trip.isLocked && trip.status !== 'completed')
    .map(trip => {
      const stops = stopsMap[trip.id] || { visited: 0, total: 0 };
      const completionResult = checkSoftCompletion(trip, stops.visited, stops.total);
      return { trip, completionResult };
    })
    .filter(({ completionResult }) => completionResult.shouldSuggestCompletion);
}
