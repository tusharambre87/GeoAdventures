import { useEffect, useState } from "react";

const cache = new Map<string, string | null>();

/**
 * Returns a Wikipedia thumbnail URL for a named place.
 * Shows `fallback` immediately; replaces with the Wikipedia photo once loaded.
 * Results are cached in-module so repeated mounts cost nothing.
 */
export function useWikiPhoto(name: string, fallback: string): string {
  const [src, setSrc] = useState<string>(() => {
    const hit = cache.get(name);
    return hit ? hit : fallback;
  });

  useEffect(() => {
    if (cache.has(name)) {
      const hit = cache.get(name);
      if (hit) setSrc(hit);
      return;
    }

    let active = true;
    const title = name.replace(/\s+/g, "_");

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((data: { thumbnail?: { source: string } }) => {
        const url = data?.thumbnail?.source ?? null;
        cache.set(name, url);
        if (active && url) setSrc(url);
      })
      .catch(() => {
        cache.set(name, null);
      });

    return () => { active = false; };
  }, [name]);

  return src;
}
