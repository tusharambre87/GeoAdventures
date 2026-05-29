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

export type TripStop = {
  id: string;
  name: string;
  city?: string;
  visited?: boolean;
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
};

export type TripsResponse = {
  trips: Trip[];
  counts?: {
    total: number;
    active: number;
    completed: number;
  };
};

export const travelAPI = {
  getTrips: () => apiFetch<TripsResponse>("/api/travel/trips"),
  getTrip: (tripId: string) => apiFetch<Trip>(`/api/travel/trips/${tripId}`),
  createTrip: (data: Partial<Trip>) =>
    apiFetch<Trip>("/api/travel/trips", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
