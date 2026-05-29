import { apiRequest } from "./queryClient";

export type IdentityTrait = 
  | 'natureNoticing' 
  | 'questionAsking' 
  | 'culturalCuriosity' 
  | 'familyConnecting' 
  | 'worldExploring' 
  | 'storyTelling';

export interface ExplorerIdentityTraits {
  id: string;
  explorerId: string;
  natureNoticing: number;
  questionAsking: number;
  culturalCuriosity: number;
  familyConnecting: number;
  worldExploring: number;
  storyTelling: number;
  currentIdentityStatement: string | null;
  dominantTrait: string | null;
  lastStatementGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getExplorerIdentity(explorerId: string): Promise<ExplorerIdentityTraits> {
  const res = await apiRequest("GET", `/api/explorers/${explorerId}/identity`);
  return res.json();
}

export async function incrementIdentityTrait(
  explorerId: string, 
  trait: IdentityTrait, 
  amount: number = 1
): Promise<ExplorerIdentityTraits> {
  const res = await apiRequest("POST", `/api/explorers/${explorerId}/identity/increment`, {
    trait,
    amount,
  });
  return res.json();
}

export async function generateIdentityStatement(
  explorerId: string,
  explorerName?: string,
  explorerAge?: string
): Promise<ExplorerIdentityTraits> {
  const res = await apiRequest("POST", `/api/explorers/${explorerId}/identity/generate-statement`, {
    explorerName,
    explorerAge,
  });
  return res.json();
}

export function mapActivityToTrait(activityType: string, context?: { stopType?: string }): IdentityTrait | null {
  switch (activityType) {
    case 'wonder_response':
    case 'photo_captured':
    case 'moment_created':
      if (context?.stopType === 'nature') return 'natureNoticing';
      return 'storyTelling';
    
    case 'geobuddy_question':
      return 'questionAsking';
    
    case 'journey_listen':
    case 'cultural_stop_visited':
      return 'culturalCuriosity';
    
    case 'family_moment':
    case 'multiplayer_game':
      return 'familyConnecting';
    
    case 'stop_visited':
    case 'trip_completed':
    case 'new_location':
      return 'worldExploring';
    
    case 'caption_added':
    case 'story_shared':
      return 'storyTelling';
    
    case 'nature_stop_visited':
      return 'natureNoticing';
    
    default:
      return null;
  }
}

export async function trackActivity(
  explorerId: string | null | undefined,
  activityType: string,
  context?: { stopType?: string }
): Promise<void> {
  if (!explorerId) return;
  
  const trait = mapActivityToTrait(activityType, context);
  if (!trait) return;
  
  try {
    await incrementIdentityTrait(explorerId, trait);
  } catch (error) {
    console.error('[Identity] Failed to track activity:', error);
  }
}
