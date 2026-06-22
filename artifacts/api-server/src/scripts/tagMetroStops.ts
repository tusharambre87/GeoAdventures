/**
 * Tags stop_library rows with metro_area when they fall within 120km of a
 * US city center but are stored under a different city name.
 *
 * Run once: pnpm --filter @workspace/api-server run script:tag-metro
 * Safe to re-run — overwrites with closest metro if already tagged.
 */

import { db } from '../db.js';
import { stopLibrary } from '@workspace/db';
import { sql } from 'drizzle-orm';

// City centroids for all 80 US cities in RoamUs — deduplicated (Minneapolis and New Orleans each appear once)
const US_CITY_CENTROIDS: Array<{ city: string; lat: number; lng: number }> = [
  { city: 'Minneapolis',     lat: 44.9778, lng: -93.2650 },
  { city: 'Washington DC',   lat: 38.9072, lng: -77.0369 },
  { city: 'Chicago',         lat: 41.8781, lng: -87.6298 },
  { city: 'New York City',   lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles',     lat: 34.0522, lng: -118.2437 },
  { city: 'San Francisco',   lat: 37.7749, lng: -122.4194 },
  { city: 'Seattle',         lat: 47.6062, lng: -122.3321 },
  { city: 'Boston',          lat: 42.3601, lng: -71.0589 },
  { city: 'Miami',           lat: 25.7617, lng: -80.1918 },
  { city: 'Denver',          lat: 39.7392, lng: -104.9903 },
  { city: 'Austin',          lat: 30.2672, lng: -97.7431 },
  { city: 'Nashville',       lat: 36.1627, lng: -86.7816 },
  { city: 'New Orleans',     lat: 29.9511, lng: -90.0715 },
  { city: 'Portland',        lat: 45.5051, lng: -122.6750 },
  { city: 'Las Vegas',       lat: 36.1699, lng: -115.1398 },
  { city: 'San Diego',       lat: 32.7157, lng: -117.1611 },
  { city: 'Philadelphia',    lat: 39.9526, lng: -75.1652 },
  { city: 'Atlanta',         lat: 33.7490, lng: -84.3880 },
  { city: 'Phoenix',         lat: 33.4484, lng: -112.0740 },
  { city: 'Dallas',          lat: 32.7767, lng: -96.7970 },
  { city: 'Houston',         lat: 29.7604, lng: -95.3698 },
  { city: 'San Antonio',     lat: 29.4241, lng: -98.4936 },
  { city: 'Charlotte',       lat: 35.2271, lng: -80.8431 },
  { city: 'Indianapolis',    lat: 39.7684, lng: -86.1581 },
  { city: 'Columbus',        lat: 39.9612, lng: -82.9988 },
  { city: 'Detroit',         lat: 42.3314, lng: -83.0458 },
  { city: 'Memphis',         lat: 35.1495, lng: -90.0490 },
  { city: 'Louisville',      lat: 38.2527, lng: -85.7585 },
  { city: 'Baltimore',       lat: 39.2904, lng: -76.6122 },
  { city: 'Milwaukee',       lat: 43.0389, lng: -87.9065 },
  { city: 'Albuquerque',     lat: 35.0844, lng: -106.6504 },
  { city: 'Tucson',          lat: 32.2226, lng: -110.9747 },
  { city: 'Fresno',          lat: 36.7378, lng: -119.7871 },
  { city: 'Sacramento',      lat: 38.5816, lng: -121.4944 },
  { city: 'Kansas City',     lat: 39.0997, lng: -94.5786 },
  { city: 'Mesa',            lat: 33.4152, lng: -111.8315 },
  { city: 'Virginia Beach',  lat: 36.8529, lng: -75.9780 },
  { city: 'Omaha',           lat: 41.2565, lng: -95.9345 },
  { city: 'Colorado Springs', lat: 38.8339, lng: -104.8214 },
  { city: 'Raleigh',         lat: 35.7796, lng: -78.6382 },
  { city: 'Long Beach',      lat: 33.7701, lng: -118.1937 },
  { city: 'Tampa',           lat: 27.9506, lng: -82.4572 },
  { city: 'Arlington',       lat: 32.7357, lng: -97.1081 },
  { city: 'Bakersfield',     lat: 35.3733, lng: -119.0187 },
  { city: 'Aurora',          lat: 39.7294, lng: -104.8319 },
  { city: 'Honolulu',        lat: 21.3069, lng: -157.8583 },
  { city: 'Anaheim',         lat: 33.8366, lng: -117.9143 },
  { city: 'Santa Ana',       lat: 33.7455, lng: -117.8677 },
  { city: 'Corpus Christi',  lat: 27.8006, lng: -97.3964 },
  { city: 'Riverside',       lat: 33.9806, lng: -117.3755 },
  { city: 'Lexington',       lat: 38.0406, lng: -84.5037 },
  { city: 'Pittsburgh',      lat: 40.4406, lng: -79.9959 },
  { city: 'Anchorage',       lat: 61.2181, lng: -149.9003 },
  { city: 'Stockton',        lat: 37.9577, lng: -121.2908 },
  { city: 'Cincinnati',      lat: 39.1031, lng: -84.5120 },
  { city: 'St. Louis',       lat: 38.6270, lng: -90.1994 },
  { city: 'St Paul',         lat: 44.9537, lng: -93.0900 },
  { city: 'Greensboro',      lat: 36.0726, lng: -79.7920 },
  { city: 'Newark',          lat: 40.7357, lng: -74.1724 },
  { city: 'Plano',           lat: 33.0198, lng: -96.6989 },
  { city: 'Henderson',       lat: 36.0395, lng: -114.9817 },
  { city: 'Lincoln',         lat: 40.8136, lng: -96.7026 },
  { city: 'Buffalo',         lat: 42.8864, lng: -78.8784 },
  { city: 'Fort Wayne',      lat: 41.0793, lng: -85.1394 },
  { city: 'Jersey City',     lat: 40.7178, lng: -74.0431 },
  { city: 'Chula Vista',     lat: 32.6401, lng: -117.0842 },
  { city: 'Orlando',         lat: 28.5383, lng: -81.3792 },
  { city: 'Salt Lake City',  lat: 40.7608, lng: -111.8910 },
  { city: 'St. Petersburg',  lat: 27.7676, lng: -82.6403 },
  { city: 'Laredo',          lat: 27.5306, lng: -99.4803 },
  { city: 'Madison',         lat: 43.0731, lng: -89.4012 },
  { city: 'Durham',          lat: 35.9940, lng: -78.8986 },
  { city: 'Lubbock',         lat: 33.5779, lng: -101.8552 },
  { city: 'Winston-Salem',   lat: 36.0999, lng: -80.2442 },
  { city: 'Garland',         lat: 32.9126, lng: -96.6389 },
  { city: 'Glendale',        lat: 33.5387, lng: -112.1860 },
  { city: 'Hialeah',         lat: 25.8576, lng: -80.2781 },
  { city: 'Chandler',        lat: 33.3062, lng: -111.8413 },
  { city: 'Baton Rouge',     lat: 30.4515, lng: -91.1871 },
  { city: 'Santa Barbara',  lat: 34.4208, lng: -119.6982 },
  { city: 'Monterey',       lat: 36.6002, lng: -121.8947 },
  { city: 'Asheville',      lat: 35.5951, lng: -82.5515 },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const METRO_RADIUS_KM = 120;

// Set of centroid city names for O(1) lookup — stops whose city is already a
// metro center belong to their own pool and must never be cross-tagged.
// Aliases cover common data-entry variants that aren't in the centroid list verbatim.
const METRO_CITY_NAMES = new Set([
  ...US_CITY_CENTROIDS.map(c => c.city.toLowerCase().trim()),
  'new york', // variant of 'New York City'
]);

async function tagMetroStops() {
  // Step 0: Clear any stale cross-tags from a previous run (stops that are
  // themselves metro cities but were incorrectly tagged to a neighbour city).
  const cleared = await db.execute(sql`
    UPDATE stop_library
    SET metro_area = NULL, distance_from_metro_km = NULL
    WHERE LOWER(TRIM(country)) IN ('us', 'united states', 'usa')
      AND metro_area IS NOT NULL
      AND LOWER(TRIM(city)) = ANY(
        ARRAY[${sql.raw(
          Array.from(METRO_CITY_NAMES).map(c => `'${c.replace(/'/g, "''")}'`).join(', ')
        )}]
      )
  `);
  console.log(`[MetroTag] Cleared stale cross-tags from metro-city stops: ${(cleared as any).rowCount ?? '?'} rows reset.`);

  console.log('[MetroTag] Loading all US stops from stop_library...');

  const allStops = await db
    .select({
      id: stopLibrary.id,
      name: stopLibrary.name,
      city: stopLibrary.city,
      country: stopLibrary.country,
      latitude: stopLibrary.latitude,
      longitude: stopLibrary.longitude,
    })
    .from(stopLibrary)
    .where(
      sql`LOWER(TRIM(${stopLibrary.country})) IN ('us', 'united states', 'usa')`
    );

  console.log(`[MetroTag] ${allStops.length} US stops loaded.`);

  let tagged = 0;
  let skipped = 0;

  for (const stop of allStops) {
    if (!stop.latitude || !stop.longitude) { skipped++; continue; }

    const stopLat = parseFloat(String(stop.latitude));
    const stopLng = parseFloat(String(stop.longitude));
    if (isNaN(stopLat) || isNaN(stopLng)) { skipped++; continue; }

    const stopCityNorm = stop.city?.toLowerCase().trim() ?? '';

    // Skip stops whose city is itself a metro center — they belong to their own pool.
    if (METRO_CITY_NAMES.has(stopCityNorm)) { skipped++; continue; }

    let closestCity: string | null = null;
    let closestDist = Infinity;

    for (const centroid of US_CITY_CENTROIDS) {
      if (stopCityNorm === centroid.city.toLowerCase().trim()) continue;

      const dist = haversineKm(stopLat, stopLng, centroid.lat, centroid.lng);
      if (dist <= METRO_RADIUS_KM && dist < closestDist) {
        closestDist = dist;
        closestCity = centroid.city;
      }
    }

    if (closestCity) {
      await db
        .update(stopLibrary)
        .set({
          metroArea: closestCity,
          distanceFromMetroKm: String(Math.round(closestDist * 10) / 10),
        })
        .where(sql`${stopLibrary.id} = ${stop.id}`);

      console.log(`[MetroTag] Tagged: "${stop.name}" (${stop.city}) → metro: ${closestCity} (${Math.round(closestDist)}km)`);
      tagged++;
    }
  }

  console.log(`\n[MetroTag] Complete. Tagged: ${tagged}, Skipped (no coords): ${skipped}`);

  const summary = await db.execute(sql`
    SELECT metro_area, COUNT(*) as stop_count
    FROM stop_library
    WHERE metro_area IS NOT NULL
    GROUP BY metro_area
    ORDER BY stop_count DESC
    LIMIT 20
  `);
  console.log('\n[MetroTag] Metro stop counts:');
  for (const row of summary.rows as Array<{ metro_area: string; stop_count: string }>) {
    console.log(`  ${row.metro_area}: ${row.stop_count}`);
  }
}

tagMetroStops().catch(console.error);
