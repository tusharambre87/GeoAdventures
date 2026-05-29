import { useState, useEffect, useRef, useCallback } from "react";
import {
  getAdventureCityImage,
  getAdventureStopImage,
  requestCityImage,
  requestStopImage,
  isPilotCity,
} from "@/lib/adventureImages";

export function useOnDemandCityImage(
  cityName?: string | null,
  country?: string | null
): { image: string | null; loading: boolean } {
  const staticImage = getAdventureCityImage(cityName);
  const [dynamicImage, setDynamicImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (staticImage || !cityName) return;
    if (requestedRef.current === cityName) return;

    requestedRef.current = cityName;
    setLoading(true);
    cleanup();

    requestCityImage(cityName, country || undefined).then(({ imagePath, status }) => {
      if (status === "ready" && imagePath) {
        setDynamicImage(imagePath);
        setLoading(false);
        return;
      }
      if (status === "failed") {
        setLoading(false);
        return;
      }

      intervalRef.current = setInterval(async () => {
        const result = await requestCityImage(cityName, country || undefined);
        if (result.status === "ready" && result.imagePath) {
          setDynamicImage(result.imagePath);
          setLoading(false);
          cleanup();
        } else if (result.status === "failed") {
          setLoading(false);
          cleanup();
        }
      }, 5000);

      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        cleanup();
      }, 60000);
    });

    return cleanup;
  }, [cityName, country, staticImage, cleanup]);

  if (staticImage) return { image: staticImage, loading: false };
  return { image: dynamicImage, loading };
}

export function useOnDemandStopImage(
  stopName?: string | null,
  cityName?: string | null,
  stopType?: string | null,
  country?: string | null
): { image: string; loading: boolean; isGenerated: boolean } {
  const fallbackImage = stopName
    ? getAdventureStopImage(stopName, stopType, cityName)
    : "/images/adventure/stops/park.png";

  const [dynamicImage, setDynamicImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestedRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!stopName || !cityName) return;
    if (isPilotCity(cityName)) return;

    const requestKey = `${cityName}:${stopName}`;
    if (requestedRef.current === requestKey) return;
    requestedRef.current = requestKey;

    setLoading(true);
    cleanup();

    requestStopImage(stopName, cityName, stopType || undefined, country || undefined).then(
      ({ imagePath, status }) => {
        if (status === "ready" && imagePath) {
          setDynamicImage(imagePath);
          setLoading(false);
          return;
        }
        if (status === "failed") {
          setLoading(false);
          return;
        }

        intervalRef.current = setInterval(async () => {
          const result = await requestStopImage(
            stopName,
            cityName,
            stopType || undefined,
            country || undefined
          );
          if (result.status === "ready" && result.imagePath) {
            setDynamicImage(result.imagePath);
            setLoading(false);
            cleanup();
          } else if (result.status === "failed") {
            setLoading(false);
            cleanup();
          }
        }, 5000);

        timeoutRef.current = setTimeout(() => {
          setLoading(false);
          cleanup();
        }, 60000);
      }
    );

    return cleanup;
  }, [stopName, cityName, stopType, country, cleanup]);

  if (dynamicImage) return { image: dynamicImage, loading: false, isGenerated: true };
  return { image: fallbackImage, loading, isGenerated: false };
}
