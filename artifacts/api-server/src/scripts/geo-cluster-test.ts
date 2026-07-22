/**
 * geo-cluster-test.ts
 *
 * 1. Scans Yosemite / Yellowstone / LA city pools for within-400m near-duplicate pairs
 *    — these are what the stop-pool endpoint's proximity dedup must collapse.
 * 2. Runs selectStopsFromPool for each city and reports per-day intra-day distances
 *    and scatter metrics.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/geo-cluster-test.ts
 */

import { storage } from '../storage.js';
import { selectStopsFromPool } from '../planner/plannerService.js';

function havKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROX_KM = 0.4;

const CITIES = [
  { city: 'Yosemite',      country: 'USA', tripDays: 5, pace: 'moderate' as const },
  { city: 'Yellowstone',   country: 'USA', tripDays: 7, pace: 'moderate' as const },
  { city: 'Los Angeles',   country: 'USA', tripDays: 4, pace: 'moderate' as const },
];

async function run() {
  for (const cfg of CITIES) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`POOL NEAR-DUPLICATE SCAN — ${cfg.city}`);
    console.log('='.repeat(70));

    const poolRow = await storage.getCityStopPool(cfg.city, cfg.country);
    if (!poolRow?.stopPool || !(poolRow.stopPool as any[]).length) {
      console.log('  !! No pool cached — skip'); continue;
    }
    const pool = poolRow.stopPool as any[];
    const withCoords = pool.filter(c => c.latitude && c.longitude);
    console.log(`  Pool: ${pool.length} candidates, ${withCoords.length} with coords`);

    // Find all within-400m pairs
    const pairs: Array<{ a: string; aS: number | null; b: string; bS: number | null; m: number }> = [];
    for (let i = 0; i < withCoords.length; i++) {
      for (let j = i + 1; j < withCoords.length; j++) {
        const a = withCoords[i], b = withCoords[j];
        const km = havKm(parseFloat(a.latitude), parseFloat(a.longitude), parseFloat(b.latitude), parseFloat(b.longitude));
        if (km < PROX_KM) pairs.push({ a: a.name, aS: a.scoreClassicFinal ?? null, b: b.name, bS: b.scoreClassicFinal ?? null, m: Math.round(km * 1000) });
      }
    }

    if (!pairs.length) {
      console.log('  No within-400m pairs — nothing to collapse in endpoint');
    } else {
      console.log(`  ${pairs.length} within-400m pair(s) — endpoint will collapse each to one:`);
      pairs.forEach(p => {
        const keep = (p.aS !== null && p.bS !== null)
          ? (p.aS >= p.bS ? p.a : p.b)
          : p.a;
        console.log(`  ${String(p.m).padStart(3)}m: "${p.a}" [${p.aS ?? 'null'}] ↔ "${p.b}" [${p.bS ?? 'null'}] → keep "${keep}"`);
      });
    }

    // ── Selection + intra-day scatter ──────────────────────────────────────
    console.log(`\n  --- selectStopsFromPool (${cfg.tripDays} days, ${cfg.pace}) ---`);
    const input = { tripDays: cfg.tripDays, pace: cfg.pace, destination: cfg.city, childrenAges: [7], strollerNeeded: false, indoorLean: false, transportMode: 'driving' as const } as any;
    const { stops: selected } = selectStopsFromPool(pool as any, input, undefined, cfg.city);

    const byDay = new Map<number, typeof selected>();
    for (const s of selected) { const d = s.dayNumber ?? 1; if (!byDay.has(d)) byDay.set(d, []); byDay.get(d)!.push(s); }

    const intraProblems: string[] = [];
    for (const [day, stops] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      const cs = stops.filter(s => s.latitude && s.longitude).map(s => ({ name: s.name, lat: parseFloat(String(s.latitude)), lon: parseFloat(String(s.longitude)) }));
      const pairs2 = cs.flatMap((a, i) => cs.slice(i + 1).map(b => ({ a: a.name, b: b.name, km: havKm(a.lat, a.lon, b.lat, b.lon) })));
      const maxKm = pairs2.length ? Math.max(...pairs2.map(p => p.km)) : 0;
      const status = maxKm > 30 ? `!! SCATTER ${maxKm.toFixed(1)} km` : `OK (max ${maxKm.toFixed(1)} km)`;
      console.log(`  Day ${day}: ${stops.map(s => s.name).join(' | ')} — ${status}`);
      if (maxKm > 30) pairs2.filter(p => p.km > 30).forEach(p => intraProblems.push(`    Day${day}: "${p.a}" ↔ "${p.b}" = ${p.km.toFixed(1)} km`));
    }
    if (intraProblems.length) { console.log('  INTRA-DAY SCATTER PROBLEMS:'); intraProblems.forEach(s => console.log(s)); }
    else console.log('  Intra-day scatter: CLEAN');
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
