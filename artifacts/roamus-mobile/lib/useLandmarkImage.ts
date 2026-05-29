import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/authContext";

/**
 * Fetches the cached storybook landmark art for a city from the API.
 * Returns null while loading or if no art is available (caller should fall back
 * to a photo or colour placeholder).
 */
export function useLandmarkImage(city: string | null | undefined): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    setImageUrl(null);

    fetch(`${API_BASE}/api/travel/city-landmark-image/${encodeURIComponent(city)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: { imageUrl: string | null } | null) => {
        if (!cancelled && data?.imageUrl) {
          setImageUrl(data.imageUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [city]);

  return imageUrl;
}
