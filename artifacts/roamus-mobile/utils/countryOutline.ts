// Offline country silhouette utility — no network required.
// Uses world-atlas (110m Natural Earth TopoJSON) + topojson-client + d3-geo.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const topology = require("world-atlas/countries-110m.json");
import * as topojson from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";

// Cache the extracted FeatureCollection so we only run feature() once.
let _featureCollection: FeatureCollection | null = null;

function getFeatureCollection(): FeatureCollection {
  if (_featureCollection) return _featureCollection;
  _featureCollection = topojson.feature(
    topology,
    topology.objects.countries
  ) as unknown as FeatureCollection;
  return _featureCollection;
}

// Memoised path strings — computing the projection is cheap but no need to repeat.
const pathCache = new Map<number, string | null>();

/**
 * Returns the SVG `d` attribute string for a country identified by its
 * ISO 3166-1 numeric code, projected into a 500×500 viewBox.
 * Returns null if the country has no geometry in the 110m dataset.
 */
export function getCountryPath(numericId: number): string | null {
  if (pathCache.has(numericId)) return pathCache.get(numericId) ?? null;

  const fc = getFeatureCollection();
  const feature = fc.features.find(
    (f) => String(f.id) === String(numericId)
  ) as Feature<Geometry> | undefined;

  if (!feature || !feature.geometry) {
    pathCache.set(numericId, null);
    return null;
  }

  try {
    const projection = geoMercator().fitSize([500, 500], feature);
    const pathGen = geoPath(projection);
    const d = pathGen(feature) ?? null;
    pathCache.set(numericId, d);
    return d;
  } catch {
    pathCache.set(numericId, null);
    return null;
  }
}
