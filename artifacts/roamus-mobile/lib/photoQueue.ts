import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { API_BASE } from "./apiClient";

const QUEUE_KEY = (tripId: string) => `roamus_photo_queue_${tripId}`;
const PHOTO_DIR = `${FileSystem.documentDirectory}roamus_photos/`;

interface QueuedPhoto {
  localUri: string;
  stopId: string;
  tripId: string;
  caption: string;
  queuedAt: number;
}

export async function queuePhoto(
  photo: Omit<QueuedPhoto, "queuedAt">
): Promise<void> {
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  const filename = `${photo.stopId}_${Date.now()}.jpg`;
  const localPath = `${PHOTO_DIR}${filename}`;
  await FileSystem.copyAsync({ from: photo.localUri, to: localPath });

  const raw = await AsyncStorage.getItem(QUEUE_KEY(photo.tripId));
  const queue: QueuedPhoto[] = raw ? (JSON.parse(raw) as QueuedPhoto[]) : [];
  queue.push({ ...photo, localUri: localPath, queuedAt: Date.now() });
  await AsyncStorage.setItem(QUEUE_KEY(photo.tripId), JSON.stringify(queue));
}

export async function drainAllPhotoQueues(token: string): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const tripIds = allKeys
    .filter(k => k.startsWith("roamus_photo_queue_"))
    .map(k => k.replace("roamus_photo_queue_", ""));
  for (const tripId of tripIds) {
    await drainPhotoQueue(tripId, token);
  }
}

export async function drainPhotoQueue(
  tripId: string,
  token: string
): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY(tripId));
  if (!raw) return;
  const queue: QueuedPhoto[] = JSON.parse(raw) as QueuedPhoto[];
  if (queue.length === 0) return;

  const succeeded: number[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      const uploadRes = await FileSystem.uploadAsync(
        `${API_BASE}/api/travel/moments`,
        item.localUri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "photo",
          parameters: {
            stopId: item.stopId,
            tripId: item.tripId,
            caption: item.caption,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (uploadRes.status === 200 || uploadRes.status === 201) {
        succeeded.push(i);
        await FileSystem.deleteAsync(item.localUri, { idempotent: true });
      }
    } catch {
      // Keep failed items in queue for next drain
    }
  }

  const remaining = queue.filter((_, i) => !succeeded.includes(i));
  await AsyncStorage.setItem(QUEUE_KEY(tripId), JSON.stringify(remaining));
}
