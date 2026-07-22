/**
 * geo-cluster-test.ts — geo-cluster fix validation
 *
 * Runs selectStopsFromPool against the live cached pool for three cities,
 * then reports:
 *   1. Coord coverage in the pool
 *   2. Per-day stop list with coordinates
 *   3. Non-adjacent-day scatter (close stops on days that are 2+ apart)
 *   4. Intra-day scatter (same-day stops > 30 km apart)
 *   5. Missing-coord chain-break analysis (LA-specific)
 *
 * Usage:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/geo-cluster-test.ts
 */

import { storage } from '../storage.js';
import { selectStopsFromPool } from '../planner/plannerService.js';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TEST_CITIES = [
  { city: 'Yosemite',      country: 'USA', tripDays: 5, pace: 'moderate' as const, label: 'Yosemite (dispersed national park)' },
  { city: 'Los Angeles',   country: 'USA', tripDays: 4, pace: 'moderate' as const, label: 'Los Angeles (26% missing coords)'     },
  { city: 'Washington DC', country: 'USA', tripDays: 3, pace: 'moderate' as const, label: 'Washington DC (compact, already clean)' },
];

async function run() {
  for (const cfg of TEST_CITIES) {
    console.log(`\n${'='.repeat(72)}`);
    console.log(`CITY: ${cfg.label}`);
    console.log('='.repeat(72));

    const poolRow = await storage.getCityStopPool(cfg.city, cfg.country);
    if (!poolRow?.stopPool || !(poolRow.stopPool as any[]).length) {
      console.log(`  !! No pool cached for "${cfg.city}" — skip`);
      continue;
    }

    const pool = poolRow.stopPool as any[];
    const withCoords = pool.filter(c => c.latitude && c.longitude);
    const noCoords   = pool.filter(c => !c.latitude || !c.longitude);
    console.log(`  Pool size: ${pool.length}  with-coords: ${withCoords.length}  missing: ${noCoords.length} (${Math.round(noCoords.length / pool.length * 100)}%)`);
    if (noCoords.length) console.log(`  Missing-coord pool stops: ${noCoords.map((c: any) => c.name).join(', ')}`);

    const plannerInput = {
      tripDays:        cfg.tripDays,
      pace:            cfg.pace,
      destination:     cfg.city,
      childrenAges:    [7],
      strollerNeeded:  false,
      indoorLean:      false,
      transportMode:   'driving' as const,
    } as any;

    const { stops: selected } = selectStopsFromPool(pool as any, plannerInput, undefined, cfg.city);

    const byDay = new Map<number, typeof selected>();
    for (const s of selected) {
      const d = s.dayNumber ?? 1;
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(s);
    }

    console.log(`\n  Selected: ${selected.length} stops / ${byDay.size} days`);
    for (const [day, stops] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`\n  Day ${day}:`);
      for (const s of stops) {
        const lat = s.latitude ? parseFloat(String(s.latitude)) : null;
        const lon = s.longitude ? parseFloat(String(s.longitude)) : null;
        const coord = lat && lon ? `${lat.toFixed(4)},${lon.toFixed(4)}` : 'NO_COORDS';
        console.log(`    [${(s.familyAnchorType ?? '?').padEnd(7)}] ${s.name.padEnd(50)} ${coord}`);
      }
    }

    // ── Non-adjacent-day scatter: pairs < 10 km, days differ by ≥ 2 ────────
    const cs = selected
      .filter(s => s.latitude && s.longitude)
      .map(s => ({ name: s.name, day: s.dayNumber ?? 1, lat: parseFloat(String(s.latitude)), lon: parseFloat(String(s.longitude)) }));

    const scatter: string[] = [];
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        if (cs[i].day === cs[j].day) continue;
        if (Math.abs(cs[i].day - cs[j].day) < 2) continue;
        const km = haversineKm(cs[i].lat, cs[i].lon, cs[j].lat, cs[j].lon);
        if (km < 10) scatter.push(`    Day${cs[i].day} "${cs[i].name}" ↔ Day${cs[j].day} "${cs[j].name}" → ${km.toFixed(1)} km`);
      }
    }
    console.log(`\n  ── Non-adjacent-day scatter (< 10 km, days ≥ 2 apart) ──`);
    console.log(scatter.length ? scatter.join('\n') : '    CLEAN');

    // ── Intra-day scatter: same-day pairs > 30 km ────────────────────────
    const intra: string[] = [];
    for (const [day, stops] of byDay.entries()) {
      const dc = stops.filter(s => s.latitude && s.longitude).map(s => ({ name: s.name, lat: parseFloat(String(s.latitude)), lon: parseFloat(String(s.longitude)) }));
      for (let i = 0; i < dc.length; i++) {
        for (let j = i + 1; j < dc.length; j++) {
          const km = haversineKm(dc[i].lat, dc[i].lon, dc[j].lat, dc[j].lon);
          if (km > 30) intra.push(`    Day${day}: "${dc[i].name}" ↔ "${dc[j].name}" → ${km.toFixed(1)} km`);
        }
      }
    }
    console.log(`\n  ── Intra-day scatter (same day, > 30 km apart) ──`);
    console.log(intra.length ? intra.join('\n') : '    CLEAN');

    // ── Missing-coord chain-break (LA-specific) ───────────────────────────
    const selNoCoord = selected.filter(s => !s.latitude || !s.longitude);
    if (selNoCoord.length) {
      console.log(`\n  ── Missing-coord chain-break ──`);
      console.log(`    ${selNoCoord.length} selected stop(s) lack coordinates:`);
      selNoCoord.forEach(s => console.log(`      "${s.name}" (Day ${s.dayNumber})`));
      console.log(`    Effect: each breaks the lastLat/lastLon chain → next stop's leg-cap`);
      console.log(`    and cluster-bonus both silently degrade to score-only for that pair.`);
    }
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
