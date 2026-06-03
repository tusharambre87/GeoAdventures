import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";

import { API_BASE } from "./apiClient";

const CACHE_KEY = (tripId: string) => `roamus_trip_cache_${tripId}`;
const AUDIO_DIR = `${FileSystem.documentDirectory}roamus_audio/`;

export async function preCacheTrip(
  tripId: string,
  token: string
): Promise<void> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  try {
    const res = await fetch(`${API_BASE}/api/travel/trips/${tripId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const trip = await res.json();
    await AsyncStorage.setItem(
      CACHE_KEY(tripId),
      JSON.stringify({ data: trip, cachedAt: Date.now() })
    );

    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
    const stops: Array<{ id: string; audioUrl?: string | null }> =
      trip.stops ?? [];

    for (const stop of stops) {
      if (stop.audioUrl) {
        const localPath = `${AUDIO_DIR}${stop.id}.mp3`;
        const info = await FileSystem.getInfoAsync(localPath);
        if (!info.exists) {
          await FileSystem.downloadAsync(stop.audioUrl, localPath);
        }
        await AsyncStorage.setItem(`roamus_audio_${stop.id}`, localPath);
      }
    }

    for (const stop of stops) {
      try {
        const exploreRes = await fetch(
          `${API_BASE}/api/travel/stops/${stop.id}/explore`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (exploreRes.ok) {
          const exploreData = await exploreRes.json();
          await AsyncStorage.setItem(
            `roamus_explore_${stop.id}`,
            JSON.stringify({ data: exploreData, cachedAt: Date.now() })
          );
        }
      } catch {
        // Explore cache failure is non-fatal
      }
    }

    await AsyncStorage.setItem(`roamus_cache_status_${tripId}`, "complete");
  } catch (err) {
    console.log("Trip pre-cache failed:", err);
  }
}

export async function getCachedTrip(tripId: string): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(tripId));
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw) as {
      data: unknown;
      cachedAt: number;
    };
    if (Date.now() - cachedAt > 1000 * 60 * 60 * 24 * 7) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getLocalAudioPath(
  stopId: string
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`roamus_audio_${stopId}`);
  } catch {
    return null;
  }
}

export async function getCachedExplore(
  stopId: string
): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(`roamus_explore_${stopId}`);
    if (!raw) return null;
    return (JSON.parse(raw) as { data: unknown }).data;
  } catch {
    return null;
  }
}

export async function clearTripCache(tripId: string): Promise<void> {
  await AsyncStorage.multiRemove([
    CACHE_KEY(tripId),
    `roamus_cache_status_${tripId}`,
  ]);
}
