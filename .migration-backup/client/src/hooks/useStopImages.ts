import { useState, useEffect, useRef } from "react";
import type { TravelStop } from "@shared/schema";

export type StopImageStatus = "loading" | "ready" | "failed";

export interface StopImageEntry {
  imagePath: string | null;
  status: StopImageStatus;
}

/**
 * Fetches AI-generated illustrated images for a list of stops.
 * - Calls the batch endpoint immediately on mount (triggers DALL-E generation if not cached).
 * - Polls every 4 s for stops still being generated.
 * - Images are cached in DB + disk by city+stop slug, shared across ALL users.
 *   The same Chicago → Navy Pier image is only ever generated once.
 */
export function useStopImages(
  stops: Pick<TravelStop, "id" | "name" | "stopType">[],
  cityName: string,
  country?: string
): Record<string, StopImageEntry> {
  const [images, setImages] = useState<Record<string, StopImageEntry>>({});
  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const stopKey = stops.map(s => s.id).join(",");
  const cityKey = `${cityName}|${country ?? ""}`;

  useEffect(() => {
    if (!stops.length || !cityName) return;
    let cancelled = false;
    const pending = new Set<string>();
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled || pending.size === 0) return;

      for (const stopId of Array.from(pending)) {
        const stop = stopsRef.current.find(s => s.id === stopId);
        if (!stop) { pending.delete(stopId); continue; }

        try {
          const res = await fetch("/api/adventure/generate-stop-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ stopName: stop.name, cityName, stopType: stop.stopType, country }),
          });
          if (cancelled || !res.ok) continue;
          const data = await res.json();
          if (data.imagePath && data.status === "ready") {
            pending.delete(stopId);
            setImages(prev => ({ ...prev, [stopId]: { imagePath: data.imagePath, status: "ready" } }));
          }
        } catch {}
      }

      if (!cancelled && pending.size > 0) {
        pollTimer = setTimeout(poll, 4000);
      }
    }

    async function start() {
      const initialMap: Record<string, StopImageEntry> = {};
      stops.forEach(s => { initialMap[s.id] = { imagePath: null, status: "loading" }; });
      setImages(initialMap);

      try {
        const res = await fetch("/api/adventure/generate-stop-images-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            stops: stops.map(s => ({ name: s.name, stopType: s.stopType })),
            cityName,
            country,
          }),
        });
        if (cancelled || !res.ok) return;
        const results: Array<{ stopName: string; imagePath: string | null; status: string }> = await res.json();

        const updated: Record<string, StopImageEntry> = {};
        results.forEach((r, i) => {
          const stop = stops[i];
          if (!stop) return;
          if (r.imagePath && r.status === "ready") {
            updated[stop.id] = { imagePath: r.imagePath, status: "ready" };
          } else if (r.status === "generating") {
            updated[stop.id] = { imagePath: null, status: "loading" };
            pending.add(stop.id);
          } else {
            updated[stop.id] = { imagePath: null, status: "failed" };
          }
        });

        if (!cancelled) {
          setImages(prev => ({ ...prev, ...updated }));
          if (pending.size > 0) pollTimer = setTimeout(poll, 4000);
        }
      } catch {
        if (!cancelled) {
          const failed: Record<string, StopImageEntry> = {};
          stops.forEach(s => { failed[s.id] = { imagePath: null, status: "failed" }; });
          setImages(failed);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      pending.clear();
    };
  }, [stopKey, cityKey]);

  return images;
}
