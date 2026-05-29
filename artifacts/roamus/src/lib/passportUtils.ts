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

export type PassportStampState = 
  | 'new' 
  | 'collected' 
  | 'learning' 
  | 'remembered' 
  | 'visited';

export interface StampVisualState {
  state: PassportStampState;
  isFaded: boolean;
  daysSinceInteraction: number;
  starsEarned: number;
  showRevisitPrompt: boolean;
}

export function getStampVisualState(
  cityId: string,
  isCollected: boolean,
  mastery: PassportMasteryEntry | undefined
): StampVisualState {
  let starsEarned = 0;
  if (mastery) {
    if (mastery.star1) starsEarned++;
    if (mastery.star2) starsEarned++;
    if (mastery.star3) starsEarned++;
    if (mastery.star4) starsEarned++;
    if (mastery.star5) starsEarned++;
  }
  
  const isFaded = false;
  const showRevisitPrompt = false;
  
  const lastInteractionDate = mastery?.lastInteraction 
    ? new Date(mastery.lastInteraction)
    : mastery?.discoveredDate 
    ? new Date(mastery.discoveredDate)
    : null;
  
  const daysSinceInteraction = lastInteractionDate
    ? Math.floor((new Date().getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  let state: PassportStampState = 'new';
  
  if (mastery?.visitedInGeoAdventures) {
    state = 'visited';
  } else if (starsEarned >= 3) {
    state = 'remembered';
  } else if (starsEarned >= 2) {
    state = 'learning';
  } else if (isCollected || starsEarned >= 1) {
    state = 'collected';
  }
  
  return {
    state,
    isFaded,
    daysSinceInteraction,
    starsEarned,
    showRevisitPrompt,
  };
}

export function getStateLabel(state: PassportStampState): string {
  switch (state) {
    case 'visited':
      return 'Visited';
    case 'remembered':
      return 'Remembered';
    case 'learning':
      return '';
    case 'collected':
      return 'Discovered';
    default:
      return '';
  }
}

export function getStateStyles(state: PassportStampState, isFaded: boolean): {
  containerClass: string;
  badgeClass: string;
  opacity: string;
} {
  switch (state) {
    case 'visited':
      return {
        containerClass: 'ring-2 ring-amber-400',
        badgeClass: 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300',
        opacity: 'opacity-100',
      };
    case 'remembered':
      return {
        containerClass: 'ring-2 ring-purple-400',
        badgeClass: 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300',
        opacity: 'opacity-100',
      };
    case 'learning':
      return {
        containerClass: 'ring-1 ring-blue-300',
        badgeClass: '',
        opacity: 'opacity-100',
      };
    case 'collected':
      return {
        containerClass: 'ring-2 ring-green-400',
        badgeClass: 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300',
        opacity: 'opacity-100',
      };
    default:
      return {
        containerClass: '',
        badgeClass: '',
        opacity: 'opacity-40',
      };
  }
}

export function getFadeGradient(daysSinceInteraction: number): number {
  return 1;
}
