import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Wifi, WifiOff, Check, Loader2, Plane, MapPin, Volume2, Package, AlertCircle, Compass, Lock, Crown, Map, Gamepad2, Zap, BookOpen } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { useSubscription } from "@/hooks/useSubscription";
import type { TravelTrip, TravelStop, TravelMoment, JourneyPack } from "@shared/schema";
import {
  saveTripOffline,
  saveJourneyPackOffline,
  isTripCachedOffline,
  removeTripOffline,
  getJourneyPackOffline,
  clearJourneyPacksOffline,
  saveExperienceContentOffline,
  getExperienceContentOffline,
  saveAudioOffline,
  getAudioOffline,
  saveMapImageOffline,
  getMapImageOffline,
} from "@/lib/travelOfflineStorage";
import { OfflineTravelGate, ComingSoonModal } from "@/components/UpgradePrompt";
import type { ExperienceContent } from "@shared/schema";

interface TravelOfflineDownloadProps {
  trip: TravelTrip;
  stops: TravelStop[];
  moments?: TravelMoment[];
  forceOpen?: boolean;
  onForceOpenHandled?: () => void;
  onOfflineReady?: (ready: boolean) => void;
}

interface DownloadItem {
  id: string;
  name: string;
  type: "trip" | "pack" | "audio" | "experience" | "missions" | "games" | "map" | "explore_stop";
  stopId?: string;
  stopName?: string;
  country?: string;
  status: "pending" | "downloading" | "completed" | "error" | "skipped";
  errorMessage?: string;
}

const TRAVEL_OFFLINE_KEY = "geoquest_travel_offline";

function getOfflineTrips(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TRAVEL_OFFLINE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setTripOfflineFlag(tripId: string, offline: boolean) {
  const trips = getOfflineTrips();
  if (offline && !trips.includes(tripId)) {
    trips.push(tripId);
  } else if (!offline && trips.includes(tripId)) {
    const index = trips.indexOf(tripId);
    trips.splice(index, 1);
  }
  localStorage.setItem(TRAVEL_OFFLINE_KEY, JSON.stringify(trips));
}

export function TravelOfflineDownload({ trip, stops, moments = [], forceOpen, onForceOpenHandled, onOfflineReady }: TravelOfflineDownloadProps) {
  const { isOnline } = usePWA();
  const { isAdmin, isPaidTier } = useSubscription();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadItems, setDownloadItems] = useState<DownloadItem[]>([]);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [packSuccessCount, setPackSuccessCount] = useState(0);
  const [showUpgradeGate, setShowUpgradeGate] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  
  const canDownloadThisTrip = isPaidTier || isAdmin;

  // Track stops for revalidation
  const stopsKey = stops.map(s => s.id).join(',');
  
  useEffect(() => {
    // Quick sync check first (non-blocking for initial render)
    const offlineTrips = getOfflineTrips();
    if (offlineTrips.includes(trip.id)) {
      setIsOfflineReady(true); // Optimistic - show as ready initially
      // Then verify in background
      checkOfflineStatusAsync();
    } else {
      setIsOfflineReady(false);
    }
  }, [trip.id, stopsKey]);

  useEffect(() => {
    onOfflineReady?.(isOfflineReady);
  }, [isOfflineReady]);

  useEffect(() => {
    if (forceOpen) {
      setShowDialog(true);
      onForceOpenHandled?.();
    }
  }, [forceOpen]);

  const checkOfflineStatusAsync = async () => {
    try {
      const isCached = await isTripCachedOffline(trip.id);
      if (!isCached) {
        setIsOfflineReady(false);
        setTripOfflineFlag(trip.id, false);
        return;
      }
      
      // Verify ALL journey packs exist
      if (stops.length > 0) {
        let validPackCount = 0;
        for (const stop of stops) {
          const pack = await getJourneyPackOffline(stop.id);
          const hasContent = pack && (pack.storyContent || pack.audioFactText) && pack.parentTip;
          if (hasContent) {
            validPackCount++;
          }
        }
        
        // All packs must be valid
        if (validPackCount !== stops.length) {
          setIsOfflineReady(false);
          setTripOfflineFlag(trip.id, false);
          // Set partial state info
          setPackSuccessCount(validPackCount);
          setErrorCount(stops.length - validPackCount);
          return;
        }
        
        // All packs valid
        setPackSuccessCount(validPackCount);
        setErrorCount(0);
      }
      
      setIsOfflineReady(true);
    } catch {
      // Silently fail - don't block UI
    }
  };

  const initializeDownloadItems = (): DownloadItem[] => {
    const items: DownloadItem[] = [];

    items.push({
      id: `trip-${trip.id}`,
      name: "Trip Data & Moments",
      type: "trip",
      status: "pending",
    });

    stops.forEach((stop) => {
      const stopCity = stop.city || stop.name?.split(',')[0]?.trim() || stop.name;
      const stopCountry = stop.country || trip.country;

      items.push({
        id: `pack-${stop.id}`,
        name: `${stop.name} — Journey Pack`,
        type: "pack",
        stopId: stop.id,
        status: "pending",
      });

      items.push({
        id: `audio-${stop.id}`,
        name: `${stop.name} — Story Audio`,
        type: "audio",
        stopId: stop.id,
        status: "pending",
      });

      items.push({
        id: `missions-${stop.id}`,
        name: `${stop.name} — Explorer Challenges`,
        type: "missions",
        stopId: stop.id,
        status: "pending",
      });

      items.push({
        id: `games-${stop.id}`,
        name: `${stop.name} — Journey Games`,
        type: "games",
        stopId: stop.id,
        status: "pending",
      });

      items.push({
        id: `explore-${stop.id}`,
        name: `${stop.name} — Explore City`,
        type: "explore_stop",
        stopId: stop.id,
        stopName: stopCity,
        country: stopCountry || undefined,
        status: "pending",
      });

      if ((stop as any).latitude && (stop as any).longitude) {
        items.push({
          id: `map-${stop.id}`,
          name: `${stop.name} — Map`,
          type: "map",
          stopId: stop.id,
          status: "pending",
        });
      }
    });

    // Also cache Experience City for the overall trip destination
    const tripDestinationName = trip.city || trip.destination?.split(',')[0]?.trim() || trip.name;
    const tripCountry = trip.country || trip.destination?.split(',').slice(1).join(',')?.trim();
    items.push({
      id: `experience-${trip.id}`,
      name: `Experience ${tripDestinationName} (Trip Overview)`,
      type: "experience",
      stopId: trip.id,
      stopName: tripDestinationName,
      country: tripCountry || undefined,
      status: "pending",
    });

    return items;
  };

  const updateItemStatus = (itemId: string, status: DownloadItem["status"], errorMessage?: string) => {
    setDownloadItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status, errorMessage } : item
      )
    );
  };

  const fetchJourneyPack = async (stopId: string, retryCount = 0): Promise<JourneyPack | null> => {
    const MAX_RETRIES = 2;
    
    try {
      // First check if pack already has content
      const res = await fetch(`/api/travel/stops/${stopId}/journey-pack`, {
        credentials: "include"
      });
      if (!res.ok) {
        console.warn(`Journey pack fetch failed for stop ${stopId}: ${res.status}`);
        return null;
      }
      
      const existingPack = await res.json();
      
      // Handle null/missing pack - pack may not exist yet
      if (!existingPack) {
        console.warn(`No journey pack exists for stop ${stopId}`);
        return null;
      }
      
      // If pack already has content, use it directly
      if ((existingPack.storyContent || existingPack.audioFactText) && existingPack.parentTip) {
        return existingPack;
      }
      
      // Otherwise, generate content in parallel with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout for AI generation
      
      try {
        const [storyRes, tipRes] = await Promise.all([
          fetch(`/api/travel/stops/${stopId}/generate-story`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal
          }),
          fetch(`/api/travel/stops/${stopId}/generate-tip`, {
            method: "POST", 
            credentials: "include",
            signal: controller.signal
          })
        ]);
        
        clearTimeout(timeout);
        
        // If both failed, retry or return null
        if (!storyRes.ok && !tipRes.ok) {
          console.warn(`Content generation failed for stop ${stopId}: story=${storyRes.status}, tip=${tipRes.status}`);
          if (retryCount < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
            return fetchJourneyPack(stopId, retryCount + 1);
          }
          return null;
        }
      } catch (e) {
        clearTimeout(timeout);
        console.warn(`Content generation error for stop ${stopId}:`, e);
        if (retryCount < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
          return fetchJourneyPack(stopId, retryCount + 1);
        }
        return null;
      }
      
      // Re-fetch the pack to get the cached content
      const updatedRes = await fetch(`/api/travel/stops/${stopId}/journey-pack`, {
        credentials: "include"
      });
      if (!updatedRes.ok) return null;
      
      const pack = await updatedRes.json();
      
      // Handle null pack after generation attempt
      if (!pack) {
        console.warn(`Pack still null after generation for stop ${stopId}`);
        return null;
      }
      
      // Verify pack has the required offline content (story or legacy facts)
      if (!(pack.storyContent || pack.audioFactText) || !pack.parentTip) {
        console.warn(`Pack missing required content for stop ${stopId}`);
        return null;
      }
      
      return pack;
    } catch (e) {
      console.warn(`fetchJourneyPack error for stop ${stopId}:`, e);
      if (retryCount < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return fetchJourneyPack(stopId, retryCount + 1);
      }
      return null;
    }
  };

  const fetchAudio = async (stopId: string, stopName: string, stopType: string): Promise<Blob | null> => {
    try {
      const res = await fetch("/api/travel/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: `Welcome to ${stopName}. This is a wonderful ${stopType} to explore.`,
          voice: "nova"
        })
      });
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  };

  const fetchExperienceContent = async (
    destinationName: string, 
    country?: string, 
    retryCount = 0
  ): Promise<ExperienceContent | null> => {
    const MAX_RETRIES = 2;
    
    try {
      // Use correct endpoint: /api/experience/:destinationName?country=...
      const params = new URLSearchParams();
      if (country) params.append("country", country);
      const queryString = params.toString() ? `?${params}` : "";
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      
      const res = await fetch(`/api/experience/${encodeURIComponent(destinationName)}${queryString}`, {
        credentials: "include",
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!res.ok) {
        console.warn(`Experience content fetch failed for ${destinationName}: ${res.status}`);
        if (retryCount < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
          return fetchExperienceContent(destinationName, country, retryCount + 1);
        }
        return null;
      }
      
      return await res.json();
    } catch (e) {
      console.warn(`fetchExperienceContent error for ${destinationName}:`, e);
      if (retryCount < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return fetchExperienceContent(destinationName, country, retryCount + 1);
      }
      return null;
    }
  };

  const fetchStoryAudio = async (stopId: string, retryCount = 0): Promise<Blob | null> => {
    const MAX_RETRIES = 1;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`/api/travel/stops/${stopId}/generate-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000));
          return fetchStoryAudio(stopId, retryCount + 1);
        }
        return null;
      }
      return await res.blob();
    } catch {
      if (retryCount < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 2000));
        return fetchStoryAudio(stopId, retryCount + 1);
      }
      return null;
    }
  };

  const fetchAndEnsureMissions = async (stopId: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`/api/travel/stops/${stopId}/generate-missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  };

  const fetchAndUnlockGames = async (stopId: string): Promise<boolean> => {
    try {
      const packRes = await fetch(`/api/travel/stops/${stopId}/journey-pack`, { credentials: "include" });
      if (!packRes.ok) return false;
      const pack = await packRes.json();
      if (!pack?.id) return false;
      const unlockRes = await fetch(`/api/travel/journey-packs/${pack.id}/unlock-games`, {
        method: "POST",
        credentials: "include",
      });
      return unlockRes.ok;
    } catch {
      return false;
    }
  };

  const fetchStaticMapImage = async (stop: TravelStop): Promise<Blob | null> => {
    const lat = (stop as any).latitude;
    const lng = (stop as any).longitude;
    if (!lat || !lng) return null;
    try {
      const zoom = 14;
      const width = 400;
      const height = 280;
      const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=mapnik&markers=${lat},${lng},red`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  };

  const handleDownload = async () => {
    if (!isOnline) return;

    // Clear any existing offline-ready flag before starting fresh download
    setTripOfflineFlag(trip.id, false);
    setIsOfflineReady(false);
    
    // Clear ALL stale cached data including journey packs
    try {
      await removeTripOffline(trip.id);
      const stopIds = stops.map(s => s.id);
      await clearJourneyPacksOffline(stopIds);
    } catch {}

    setIsDownloading(true);
    setDownloadProgress(0);
    setErrorCount(0);
    setPackSuccessCount(0);

    const items = initializeDownloadItems();
    setDownloadItems(items);

    let completedCount = 0;
    let packErrors = 0;
    let packSuccesses = 0;
    let tripSaved = false;
    const totalItems = items.length;

    // First, save trip data (required before packs)
    const tripItem = items.find(i => i.type === "trip");
    if (tripItem) {
      updateItemStatus(tripItem.id, "downloading");
      try {
        await saveTripOffline(trip, stops, moments);
        const savedTrip = await isTripCachedOffline(trip.id);
        if (savedTrip) {
          updateItemStatus(tripItem.id, "completed");
          tripSaved = true;
        } else {
          updateItemStatus(tripItem.id, "error", "Failed to save trip");
        }
      } catch (error) {
        updateItemStatus(tripItem.id, "error", error instanceof Error ? error.message : "Unknown error");
      }
      completedCount++;
      setDownloadProgress((completedCount / totalItems) * 100);
    }

    // If trip failed, don't continue with packs
    if (!tripSaved) {
      setErrorCount(stops.length);
      setPackSuccessCount(0);
      setIsDownloading(false);
      return;
    }

    // Download packs in parallel with concurrency limit
    const packItems = items.filter(i => i.type === "pack" && i.stopId);
    const CONCURRENCY = 2; // Process 2 packs at a time to avoid overwhelming the server
    
    const downloadPack = async (item: DownloadItem): Promise<{ success: boolean }> => {
      updateItemStatus(item.id, "downloading");
      try {
        const pack = await fetchJourneyPack(item.stopId!);
        if (pack) {
          await saveJourneyPackOffline(item.stopId!, pack);
          const savedPack = await getJourneyPackOffline(item.stopId!);
          if (savedPack && (savedPack.storyContent || savedPack.audioFactText) && savedPack.parentTip) {
            updateItemStatus(item.id, "completed");
            return { success: true };
          } else {
            updateItemStatus(item.id, "error", "Failed to save offline");
            return { success: false };
          }
        } else {
          updateItemStatus(item.id, "error", "Failed to generate content");
          return { success: false };
        }
      } catch (error) {
        updateItemStatus(item.id, "error", error instanceof Error ? error.message : "Unknown error");
        return { success: false };
      }
    };

    // Process packs in batches with concurrency
    for (let i = 0; i < packItems.length; i += CONCURRENCY) {
      const batch = packItems.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(downloadPack));
      
      results.forEach(r => {
        if (r.success) packSuccesses++;
        else packErrors++;
        completedCount++;
      });
      setDownloadProgress((completedCount / totalItems) * 100);
    }

    // Phase 3: Story Audio (optional — failures don't block readiness)
    const audioItems = items.filter(i => i.type === "audio" && i.stopId);
    const downloadAudio = async (item: DownloadItem): Promise<void> => {
      updateItemStatus(item.id, "downloading");
      try {
        const blob = await fetchStoryAudio(item.stopId!);
        if (blob) {
          await saveAudioOffline(item.stopId!, blob);
          const saved = await getAudioOffline(item.stopId!);
          updateItemStatus(item.id, saved ? "completed" : "error");
        } else {
          updateItemStatus(item.id, "skipped");
        }
      } catch {
        updateItemStatus(item.id, "skipped");
      } finally {
        completedCount++;
        setDownloadProgress((completedCount / totalItems) * 100);
      }
    };
    for (let i = 0; i < audioItems.length; i += CONCURRENCY) {
      await Promise.all(audioItems.slice(i, i + CONCURRENCY).map(downloadAudio));
    }

    // Phase 4: Explorer Missions (ensure generated, then re-save trip with fresh stop data)
    const missionItems = items.filter(i => i.type === "missions" && i.stopId);
    const downloadMissions = async (item: DownloadItem): Promise<void> => {
      updateItemStatus(item.id, "downloading");
      try {
        const ok = await fetchAndEnsureMissions(item.stopId!);
        updateItemStatus(item.id, ok ? "completed" : "skipped");
      } catch {
        updateItemStatus(item.id, "skipped");
      } finally {
        completedCount++;
        setDownloadProgress((completedCount / totalItems) * 100);
      }
    };
    for (let i = 0; i < missionItems.length; i += CONCURRENCY) {
      await Promise.all(missionItems.slice(i, i + CONCURRENCY).map(downloadMissions));
    }

    // Phase 5: Journey Games (unlock per stop)
    const gamesItems = items.filter(i => i.type === "games" && i.stopId);
    const downloadGames = async (item: DownloadItem): Promise<void> => {
      updateItemStatus(item.id, "downloading");
      try {
        const ok = await fetchAndUnlockGames(item.stopId!);
        updateItemStatus(item.id, ok ? "completed" : "skipped");
      } catch {
        updateItemStatus(item.id, "skipped");
      } finally {
        completedCount++;
        setDownloadProgress((completedCount / totalItems) * 100);
      }
    };
    for (let i = 0; i < gamesItems.length; i += CONCURRENCY) {
      await Promise.all(gamesItems.slice(i, i + CONCURRENCY).map(downloadGames));
    }

    // Phase 6: Explore City content — per stop + trip destination
    const experienceItems = items.filter(i => (i.type === "experience" || i.type === "explore_stop") && i.stopName);
    const downloadExperience = async (item: DownloadItem): Promise<void> => {
      updateItemStatus(item.id, "downloading");
      try {
        const content = await fetchExperienceContent(item.stopName!, item.country);
        if (content) {
          await saveExperienceContentOffline(item.stopName!, item.country, content);
          const savedContent = await getExperienceContentOffline(item.stopName!, item.country);
          updateItemStatus(item.id, savedContent ? "completed" : "error");
        } else {
          updateItemStatus(item.id, "skipped");
        }
      } catch {
        updateItemStatus(item.id, "skipped");
      } finally {
        completedCount++;
        setDownloadProgress((completedCount / totalItems) * 100);
      }
    };
    for (let i = 0; i < experienceItems.length; i += CONCURRENCY) {
      await Promise.all(experienceItems.slice(i, i + CONCURRENCY).map(downloadExperience));
    }

    // Phase 7: Static Map Images (inbuilt map tiles per stop)
    const mapItems = items.filter(i => i.type === "map" && i.stopId);
    const downloadMap = async (item: DownloadItem): Promise<void> => {
      updateItemStatus(item.id, "downloading");
      try {
        const stop = stops.find(s => s.id === item.stopId);
        if (!stop) { updateItemStatus(item.id, "skipped"); completedCount++; setDownloadProgress((completedCount / totalItems) * 100); return; }
        const blob = await fetchStaticMapImage(stop);
        if (blob) {
          await saveMapImageOffline(item.stopId!, blob);
          const saved = await getMapImageOffline(item.stopId!);
          updateItemStatus(item.id, saved ? "completed" : "error");
        } else {
          updateItemStatus(item.id, "skipped");
        }
      } catch {
        updateItemStatus(item.id, "skipped");
      } finally {
        completedCount++;
        setDownloadProgress((completedCount / totalItems) * 100);
      }
    };
    for (let i = 0; i < mapItems.length; i += CONCURRENCY) {
      await Promise.all(mapItems.slice(i, i + CONCURRENCY).map(downloadMap));
    }

    setErrorCount(packErrors);
    setPackSuccessCount(packSuccesses);

    if (tripSaved && packSuccesses > 0 && packErrors === 0) {
      setTripOfflineFlag(trip.id, true);
      setIsOfflineReady(true);
    } else {
      setTripOfflineFlag(trip.id, false);
      setIsOfflineReady(false);
    }

    setIsDownloading(false);
  };

  const handleRemoveOffline = async () => {
    try {
      await removeTripOffline(trip.id);
    } catch (e) {
      console.error("Error removing offline data:", e);
    }
    setTripOfflineFlag(trip.id, false);
    setIsOfflineReady(false);
    setDownloadItems([]);
    setDownloadProgress(0);
    setErrorCount(0);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          variant={isOfflineReady ? "secondary" : "outline"}
          size="sm"
          className={`gap-2 ${isOfflineReady ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300" : ""}`}
          data-testid="button-offline-download"
        >
          {isOfflineReady ? (
            <>
              <Check className="w-4 h-4" />
              Offline Ready
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-500" />
            Offline Download
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-slate-50 dark:bg-slate-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <Plane className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{trip.name}</h3>
                  <p className="text-sm text-muted-foreground">{trip.destination}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stops.length} stops</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isOnline && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">You're offline</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Connect to download trip content</p>
              </div>
            </div>
          )}

          {isDownloading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Downloading...</span>
                <span className="text-muted-foreground">{Math.round(downloadProgress)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />

              <div className="max-h-48 overflow-y-auto space-y-2">
                {downloadItems.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-sm p-2 bg-white dark:bg-slate-900 rounded-lg"
                  >
                    {item.status === "downloading" && (
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500 flex-shrink-0" />
                    )}
                    {item.status === "completed" && (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    {item.status === "pending" && (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    {item.status === "skipped" && (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-200 bg-gray-100 flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate text-xs">{item.name}</span>
                    {item.type === "pack" && <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {item.type === "audio" && <Volume2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {item.type === "missions" && <Zap className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {item.type === "games" && <Gamepad2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {(item.type === "experience" || item.type === "explore_stop") && <Compass className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {item.type === "map" && <Map className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    {item.type === "trip" && <Plane className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {!isDownloading && (
            <div className="space-y-3">
              {isOfflineReady ? (
                <>
                  {/* Fully ready - all packs downloaded */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Ready for offline use!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {stops.length} Journey Packs saved to your device
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleRemoveOffline}
                    data-testid="button-remove-offline"
                  >
                    Remove Offline Data
                  </Button>
                </>
              ) : packSuccessCount > 0 && errorCount > 0 ? (
                <>
                  {/* Partial success - some packs downloaded but not all */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Partially downloaded
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {packSuccessCount} of {stops.length} Journey Packs saved
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleRemoveOffline}
                      data-testid="button-remove-partial"
                    >
                      Clear
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500"
                      onClick={handleDownload}
                      disabled={!isOnline}
                      data-testid="button-retry-download"
                    >
                      Retry Download
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Not downloaded or complete failure */}
                  {errorCount > 0 && packSuccessCount === 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div className="text-red-800 dark:text-red-200">
                        <p className="font-medium">Download failed</p>
                        <p className="text-xs mt-1 text-red-700 dark:text-red-300">
                          Content is being generated for the first time. Please try again in a few moments.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2 font-medium">Download includes:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-xs">Journey Packs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs">Story Audio</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-xs">Explorer Missions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs">Journey Games</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5 text-teal-500" />
                        <span className="text-xs">Explore City</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Map className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs">Stop Maps</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500"
                    onClick={handleDownload}
                    disabled={!isOnline}
                    data-testid="button-start-download"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download for Offline ({stops.length} stops)
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
      
      <ComingSoonModal 
        isOpen={showComingSoon} 
        onClose={() => setShowComingSoon(false)}
        featureName="Offline Download"
      />
      
      <OfflineTravelGate 
        isOpen={showUpgradeGate} 
        onClose={() => setShowUpgradeGate(false)}
        cityName={trip.city || trip.name}
      />
    </Dialog>
  );
}
