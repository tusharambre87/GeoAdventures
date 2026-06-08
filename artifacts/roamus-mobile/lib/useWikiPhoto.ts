import { useEffect, useState } from "react";

const cache = new Map<string, string | null>();

const AMBIGUOUS_TERMS = [
  'bridge', 'zoo', 'park', 'museum', 'garden', 'library',
  'center', 'centre', 'aquarium', 'monument', 'memorial', 'falls',
];

const WIKI_TITLE_OVERRIDES: Record<string, string> = {
  'Como Zoo': 'Como_Park_Zoo_and_Conservatory',
  'Stone Arch Bridge': 'Stone_Arch_Bridge_(Minneapolis)',
  'The Stone Arch Bridge': 'Stone_Arch_Bridge_(Minneapolis)',
  'St. Louis Zoo': 'Saint_Louis_Zoo',
  'Saint Louis Zoo': 'Saint_Louis_Zoo',
};

function buildWikiTitle(stopName: string, city?: string): string {
  const base = stopName.replace(/\s+/g, '_');
  if (!city) return base;
  const isAmbiguous = AMBIGUOUS_TERMS.some(term =>
    stopName.toLowerCase().includes(term)
  );
  if (isAmbiguous) {
    return `${base},_${city.replace(/\s+/g, '_')}`;
  }
  return base;
}

async function fetchWikiThumbnail(stopName: string, city?: string): Promise<string | null> {
  const overrideTitle = WIKI_TITLE_OVERRIDES[stopName];
  if (overrideTitle) {
    console.log('[useWikiPhoto] override:', overrideTitle);
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(overrideTitle)}`);
      if (r.ok) {
        const d = (await r.json()) as { thumbnail?: { source: string } };
        if (d.thumbnail?.source) {
          console.log('[useWikiPhoto] override hit:', d.thumbnail.source);
          return d.thumbnail.source;
        }
      }
    } catch {}
    return null;
  }

  const titleWithCity = buildWikiTitle(stopName, city);
  console.log('[useWikiPhoto] trying:', decodeURIComponent(titleWithCity));

  try {
    const r1 = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleWithCity)}`
    );
    if (r1.ok) {
      const d1 = (await r1.json()) as { thumbnail?: { source: string } };
      if (d1.thumbnail?.source) {
        console.log('[useWikiPhoto] hit with city context:', d1.thumbnail.source);
        return d1.thumbnail.source;
      }
    }
  } catch {}

  if (city && titleWithCity !== stopName.replace(/\s+/g, '_')) {
    const titleOnly = stopName.replace(/\s+/g, '_');
    console.log('[useWikiPhoto] fallback (no city):', decodeURIComponent(titleOnly));
    try {
      const r2 = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleOnly)}`
      );
      if (r2.ok) {
        const d2 = (await r2.json()) as { thumbnail?: { source: string } };
        if (d2.thumbnail?.source) {
          console.log('[useWikiPhoto] hit without city:', d2.thumbnail.source);
          return d2.thumbnail.source;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Returns a Wikipedia thumbnail URL for a named place.
 * Shows `fallback` immediately; replaces with the Wikipedia photo once loaded.
 * Pass `city` for ambiguous stop names (parks, bridges, zoos, museums, etc.)
 * to disambiguate — tries "Stop_Name,_City" first, plain name as fallback.
 * Results are cached in-module so repeated mounts cost nothing.
 */
export function useWikiPhoto(name: string, fallback: string, city?: string): string {
  const cacheKey = city ? `${name}|${city}` : name;

  const [src, setSrc] = useState<string>(() => {
    const hit = cache.get(cacheKey);
    return hit ? hit : fallback;
  });

  useEffect(() => {
    if (cache.has(cacheKey)) {
      const hit = cache.get(cacheKey);
      if (hit) setSrc(hit);
      return;
    }

    let active = true;
    fetchWikiThumbnail(name, city)
      .then(url => {
        cache.set(cacheKey, url);
        if (active && url) setSrc(url);
      })
      .catch(() => {
        cache.set(cacheKey, null);
      });

    return () => { active = false; };
  }, [cacheKey]);

  return src;
}
