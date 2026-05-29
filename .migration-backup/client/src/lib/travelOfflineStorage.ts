import type { TravelTrip, TravelStop, TravelMoment, JourneyPack, ExperienceContent } from "@shared/schema";

const DB_NAME = "geoquest-travel";
const DB_VERSION = 3;

interface StoredJourneyPack extends JourneyPack {
  stopId: string;
  cachedAt: string;
}

interface StoredAudio {
  stopId: string;
  audioBlob: Blob;
  cachedAt: string;
}

interface StoredExperienceContent {
  destinationKey: string;
  content: ExperienceContent;
  cachedAt: string;
}

interface CachedTrip {
  trip: TravelTrip;
  stops: TravelStop[];
  moments: TravelMoment[];
  cachedAt: string;
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains("trips")) {
        database.createObjectStore("trips", { keyPath: "trip.id" });
      }

      if (!database.objectStoreNames.contains("journeyPacks")) {
        const packStore = database.createObjectStore("journeyPacks", { keyPath: "stopId" });
        packStore.createIndex("by_cachedAt", "cachedAt");
      }

      if (!database.objectStoreNames.contains("audio")) {
        database.createObjectStore("audio", { keyPath: "stopId" });
      }

      if (!database.objectStoreNames.contains("pendingMoments")) {
        database.createObjectStore("pendingMoments", { keyPath: "tempId" });
      }

      if (!database.objectStoreNames.contains("experienceContent")) {
        database.createObjectStore("experienceContent", { keyPath: "destinationKey" });
      }

      if (!database.objectStoreNames.contains("mapImages")) {
        database.createObjectStore("mapImages", { keyPath: "stopId" });
      }
    };
  });
}

interface StoredMapImage {
  stopId: string;
  imageBlob: Blob;
  cachedAt: string;
}

export async function saveMapImageOffline(stopId: string, imageBlob: Blob): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("mapImages", "readwrite");
  const store = transaction.objectStore("mapImages");
  const stored: StoredMapImage = { stopId, imageBlob, cachedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const request = store.put(stored);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMapImageOffline(stopId: string): Promise<Blob | null> {
  const database = await openDB();
  const transaction = database.transaction("mapImages", "readonly");
  const store = transaction.objectStore("mapImages");
  return new Promise((resolve, reject) => {
    const request = store.get(stopId);
    request.onsuccess = () => resolve(request.result?.imageBlob || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTripOffline(
  trip: TravelTrip,
  stops: TravelStop[],
  moments: TravelMoment[]
): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("trips", "readwrite");
  const store = transaction.objectStore("trips");

  const cachedTrip: CachedTrip = {
    trip,
    stops,
    moments,
    cachedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(cachedTrip);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getTripOffline(tripId: string): Promise<CachedTrip | null> {
  const database = await openDB();
  const transaction = database.transaction("trips", "readonly");
  const store = transaction.objectStore("trips");

  return new Promise((resolve, reject) => {
    const request = store.get(tripId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTripsOffline(): Promise<CachedTrip[]> {
  const database = await openDB();
  const transaction = database.transaction("trips", "readonly");
  const store = transaction.objectStore("trips");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function removeTripOffline(tripId: string): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("trips", "readwrite");
  const store = transaction.objectStore("trips");

  return new Promise((resolve, reject) => {
    const request = store.delete(tripId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearJourneyPacksOffline(stopIds: string[]): Promise<void> {
  if (stopIds.length === 0) return;
  
  const database = await openDB();
  const transaction = database.transaction("journeyPacks", "readwrite");
  const store = transaction.objectStore("journeyPacks");

  await Promise.all(
    stopIds.map((stopId) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(stopId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    })
  );
}

export async function saveJourneyPackOffline(stopId: string, pack: JourneyPack): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("journeyPacks", "readwrite");
  const store = transaction.objectStore("journeyPacks");

  const storedPack: StoredJourneyPack = {
    ...pack,
    stopId,
    cachedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(storedPack);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getJourneyPackOffline(stopId: string): Promise<JourneyPack | null> {
  const database = await openDB();
  const transaction = database.transaction("journeyPacks", "readonly");
  const store = transaction.objectStore("journeyPacks");

  return new Promise((resolve, reject) => {
    const request = store.get(stopId);
    request.onsuccess = () => {
      if (request.result) {
        const { stopId: _, cachedAt: __, ...pack } = request.result;
        resolve(pack as JourneyPack);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioOffline(stopId: string, audioBlob: Blob): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("audio", "readwrite");
  const store = transaction.objectStore("audio");

  const storedAudio: StoredAudio = {
    stopId,
    audioBlob,
    cachedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(storedAudio);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAudioOffline(stopId: string): Promise<Blob | null> {
  const database = await openDB();
  const transaction = database.transaction("audio", "readonly");
  const store = transaction.objectStore("audio");

  return new Promise((resolve, reject) => {
    const request = store.get(stopId);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.audioBlob);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAudioOffline(stopId: string): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("audio", "readwrite");
  const store = transaction.objectStore("audio");

  return new Promise((resolve, reject) => {
    const request = store.delete(stopId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingMoment(moment: Partial<TravelMoment> & { tempId: string }): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("pendingMoments", "readwrite");
  const store = transaction.objectStore("pendingMoments");

  return new Promise((resolve, reject) => {
    const request = store.put(moment);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingMoments(): Promise<(Partial<TravelMoment> & { tempId: string })[]> {
  const database = await openDB();
  const transaction = database.transaction("pendingMoments", "readonly");
  const store = transaction.objectStore("pendingMoments");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingMoment(tempId: string): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("pendingMoments", "readwrite");
  const store = transaction.objectStore("pendingMoments");

  return new Promise((resolve, reject) => {
    const request = store.delete(tempId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function isStopCachedOffline(stopId: string): Promise<boolean> {
  const pack = await getJourneyPackOffline(stopId);
  return pack !== null;
}

export async function saveExperienceContentOffline(
  destinationName: string,
  country: string | undefined,
  content: ExperienceContent
): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("experienceContent", "readwrite");
  const store = transaction.objectStore("experienceContent");

  const destinationKey = country 
    ? `${destinationName.toLowerCase()}_${country.toLowerCase()}` 
    : destinationName.toLowerCase();

  const stored: StoredExperienceContent = {
    destinationKey,
    content,
    cachedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const request = store.put(stored);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getExperienceContentOffline(
  destinationName: string,
  country?: string
): Promise<ExperienceContent | null> {
  const database = await openDB();
  const transaction = database.transaction("experienceContent", "readonly");
  const store = transaction.objectStore("experienceContent");

  const destinationKey = country 
    ? `${destinationName.toLowerCase()}_${country.toLowerCase()}` 
    : destinationName.toLowerCase();

  return new Promise((resolve, reject) => {
    const request = store.get(destinationKey);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.content);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearExperienceContentOffline(destinationKey: string): Promise<void> {
  const database = await openDB();
  const transaction = database.transaction("experienceContent", "readwrite");
  const store = transaction.objectStore("experienceContent");

  return new Promise((resolve, reject) => {
    const request = store.delete(destinationKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function isTripCachedOffline(tripId: string): Promise<boolean> {
  const trip = await getTripOffline(tripId);
  return trip !== null;
}

export async function getOfflineStorageStats(): Promise<{
  tripsCount: number;
  packsCount: number;
  audioCount: number;
  pendingMomentsCount: number;
  experienceContentCount: number;
}> {
  const database = await openDB();

  const getCount = (storeName: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const [tripsCount, packsCount, audioCount, pendingMomentsCount, experienceContentCount] = await Promise.all([
    getCount("trips"),
    getCount("journeyPacks"),
    getCount("audio"),
    getCount("pendingMoments"),
    getCount("experienceContent")
  ]);

  return { tripsCount, packsCount, audioCount, pendingMomentsCount, experienceContentCount };
}

export async function clearAllOfflineData(): Promise<void> {
  const database = await openDB();
  const storeNames = ["trips", "journeyPacks", "audio", "pendingMoments", "experienceContent"];

  await Promise.all(
    storeNames.map((storeName) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    })
  );
}
