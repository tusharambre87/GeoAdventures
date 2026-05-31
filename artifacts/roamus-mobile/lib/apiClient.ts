import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("auth_token");
}

async function apiFetch<T = unknown>(
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

export interface ExploreContent {
  stopId: string;
  stopName: string;
  stories: {
    main: { text: string; durationSeconds: number };
    quickHits: { text: string; durationSeconds: number };
    history: { text: string; durationSeconds: number };
  };
  wonderPrompt: string;
  wonderTopics: string[];
  missions: [
    { type: "quiz"; question: string; options: string[]; correctIndex: number; xp: number },
    { type: "observation"; instruction: string; xp: number },
    { type: "photo"; instruction: string; xp: number },
  ];
}

export const kidsAPI = {
  getExplore: (stopId: string) =>
    apiFetch<ExploreContent>(`/api/travel/stops/${stopId}/explore`),
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
