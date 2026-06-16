import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("auth_token");
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.message || message;
    } catch {}
    const error = new Error(message) as Error & { status: number };
    error.status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

export type StopMission = {
  type: "knowledge" | "observation" | "photo";
  question: string;
  options?: string[];
  correctOption?: number;
  xpReward: number;
  completed: boolean;
  skipped: boolean;
  attempts: number;
};

export type TripStop = {
  id: string;
  name: string;
  city?: string;
  visited?: boolean;
  isVisited?: boolean;
  stopType?: string | null;
  dayIndex?: number | null;
  displayOrder?: number | null;
  cityGroup?: string | null;
  description?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  stopMissions?: StopMission[] | null;
  metadata?: Record<string, unknown> | null;
  address?: string | null;
};

export type Trip = {
  id: string;
  name: string;
  status: "active" | "planned" | "completed" | "archived" | string;
  startDate?: string | null;
  endDate?: string | null;
  destination?: string | null;
  coverImageUrl?: string | null;
  firstPhotoUrl?: string | null;
  totalStops: number;
  visitedStops: number;
  stops: TripStop[];
  travelers?: Array<{ name: string; avatarKey?: string }> | null;
  tripDays?: number | null;
  cityDates?: Record<string, { start: string; end: string }> | null;
};

export type TripsResponse = {
  trips: Trip[];
  counts?: {
    total: number;
    active: number;
    completed: number;
  };
};

export type ReplacementSuggestion = {
  id: string;
  name: string;
  stopType?: string;
  description?: string;
  imageUrl?: string;
};

export interface Mission {
  type: 'detective' | 'scientist' | 'photographer' | 'reporter' | 'collector' | 'decider' | 'family';
  enRouteBrief: string;
  instruction: string;
  proof: 'photo' | 'tap' | 'number' | 'text';
  xp: number;
}

export interface ExploreContent {
  stopId: string;
  stopName: string;
  stopIndex?: number;
  totalStops?: number;
  stories: {
    main: { text: string; durationSeconds: number };
    quickHits: { text: string; durationSeconds: number };
    history: { text: string; durationSeconds: number };
  };
  wonderPrompt: string;
  wonderTopics: string[];
  missions?: {
    individual: Mission[];
    family: Mission;
  };
}

export type GuessRound = {
  question: string;
  options: { emoji: string; label: string }[];
};
export type ThisOrThatRound = {
  question: string;
  optionA: { emoji: string; label: string };
  optionB: { emoji: string; label: string };
  funFact: string;
};
export type SpotItRound = { prompt: string };
export type BuildItRound = {
  prompt: string;
  options: { emoji: string; label: string }[];
};
export type GameContentRounds = {
  guess: GuessRound[];
  thisorthat: ThisOrThatRound[];
  spotit: SpotItRound[];
  buildit: BuildItRound[];
  connectionFact?: string;
};

export type PlayerRecord = {
  id: string;
  name: string;
  isParent?: boolean;
  isArchived?: boolean;
  age?: string | number;
  avatarKey?: string;
  profileType?: string;
  totalXp?: number;
};

export async function getMyPlayers(): Promise<PlayerRecord[]> {
  return apiFetch<PlayerRecord[]>('/api/players/me');
}

export const kidsAPI = {
  getExplore: (stopId: string, ageBand?: string) =>
    apiFetch<ExploreContent>(
      `/api/travel/stops/${stopId}/explore${ageBand ? `?ageBand=${ageBand}` : ''}`
    ),
  getGames: (stopId: string) =>
    apiFetch<GameContentRounds>(`/api/travel/stops/${stopId}/games`),
  postWonderResponse: (
    stopId: string,
    data: { explorerId: string; topic: string; observation: string }
  ) =>
    apiFetch(`/api/travel/stops/${stopId}/wonder-response`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  completeMission: (
    stopId: string,
    data: { explorerId: string; missionId: string; answer: string }
  ) =>
    apiFetch(`/api/travel/stops/${stopId}/complete-mission`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getProgress: (tripId: string, explorerId: string) =>
    apiFetch<{ xp: number; level: number }>(
      `/api/travel/trips/${tripId}/progress/${explorerId}`
    ),
};

export type Moment = {
  id: string;
  tripId: string;
  stopId?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[];
  kidPromptResponse?: string | null;
  parentPromptResponse?: string | null;
  geoFact?: string | null;
  isFavorite?: boolean;
  isSharedCommunity?: boolean;
  createdAt?: string;
};

export type TripStory = {
  id: string;
  tripId: string;
  title: string;
  storyHtml?: string | null;
  storySummary?: string | null;
  highlights?: string[];
  photoUrls?: string[];
  geoFactsUsed?: string[];
  generatedAt?: string;
  regeneratedAt?: string | null;
};

export const memoriesAPI = {
  getMoments: (tripId: string) =>
    apiFetch<Moment[]>(`/api/travel/trips/${tripId}/moments`),
  createMoment: (data: {
    tripId: string;
    stopId?: string | null;
    photoUrls?: string[];
    photoUrl?: string | null;
    kidPromptResponse?: string | null;
    parentPromptResponse?: string | null;
  }) =>
    apiFetch<Moment>('/api/travel/moments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteMoment: (momentId: string) =>
    apiFetch(`/api/travel/moments/${momentId}`, { method: 'DELETE' }),
  getStory: (tripId: string) =>
    apiFetch<TripStory>(`/api/travel/trips/${tripId}/story`),
  regenerateStory: (tripId: string) =>
    apiFetch<TripStory>(`/api/travel/trips/${tripId}/story/regenerate`, {
      method: 'POST',
    }),
};

export const travelAPI = {
  getTrips: () => apiFetch<TripsResponse>("/api/travel/trips"),
  getTrip: (tripId: string) => apiFetch<Trip>(`/api/travel/trips/${tripId}`),
  createTrip: (data: Partial<Trip>) =>
    apiFetch<Trip>("/api/travel/trips", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getStops: (tripId: string) =>
    apiFetch<{ stops: TripStop[] }>(`/api/travel/trips/${tripId}/stops`),
  replaceStop: (stopId: string, data: Partial<TripStop>) =>
    apiFetch<TripStop>(`/api/travel/stops/${stopId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getReplacementSuggestions: (tripId: string, stopId: string, day: number) =>
    apiFetch<{ suggestions: ReplacementSuggestion[] }>(
      `/api/travel/trips/${tripId}/replacement-suggestions?stopId=${stopId}&day=${day}`
    ),
};
