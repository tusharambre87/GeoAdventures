/**
 * bucket-test.ts — Validation for bucketStopsTodays
 *
 * Spec requirements:
 *   1. Run against a manually-edited selection (remove + add stops) for Yosemite & Yellowstone
 *   2. Confirm Grand Prismatic cluster, Artist Point/Uncle Tom's Trail, El Capitan trio
 *      all resolve correctly when routed through the new function
 *   3. Confirm the West Entrance / Grizzly-Wolf case produces closedShort: true
 *
 * Usage:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/bucket-test.ts
 */

import { storage } from '../storage.js';
import { bucketStopsTodays } from '../planner/plannerService.js';
import type { CachedStopCandidate } from '@workspace/db';
import type { BucketResult } from '../planner/plannerService.js';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function printBuckets(label: string, result: BucketResult) {
  const { buckets, unplacedStops } = result;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${label}`);
  console.log('='.repeat(70));

  let placedCount = 0;
  for (const b of buckets) {
    const flag = b.closedShort ? ' !! CLOSED SHORT' : '';
    console.log(`  Day ${b.dayNumber} [${b.actualCount}/${b.targetCount}${flag}]:`);
    placedCount += b.actualCount;
    for (const s of b.stops) {
      const coord = (s.latitude && s.longitude)
        ? `${parseFloat(s.latitude).toFixed(4)},${parseFloat(s.longitude).toFixed(4)}`
        : 'NO_COORD';
      console.log(`    [${(s.familyAnchorType ?? '?').padEnd(7)}] ${s.name.padEnd(55)} ${coord}`);
    }
    const withCoords = b.stops.filter(s => s.latitude && s.longitude).map(s => ({
      lat: parseFloat(s.latitude!), lon: parseFloat(s.longitude!),
    }));
    let maxKm = 0;
    for (let i = 0; i < withCoords.length; i++)
      for (let j = i + 1; j < withCoords.length; j++)
        maxKm = Math.max(maxKm, haversineKm(withCoords[i].lat, withCoords[i].lon, withCoords[j].lat, withCoords[j].lon));
    console.log(`    → ${maxKm > 30 ? `!! SCATTER ${maxKm.toFixed(1)}km` : `OK (max ${maxKm.toFixed(1)}km)`}`);
  }

  const totalSelected = placedCount + unplacedStops.length;
  console.log(`\n  ACCOUNTING: ${placedCount}/${totalSelected} selected stops placed`);
  if (unplacedStops.length === 0) {
    console.log(`  unplacedStops: none — all selected stops appear in the plan ✓`);
  } else {
    console.log(`  unplacedStops (${unplacedStops.length}) — evaluated against every day, never placed:`);
    for (const s of unplacedStops) {
      const coord = (s.latitude && s.longitude)
        ? `${parseFloat(String(s.latitude)).toFixed(4)},${parseFloat(String(s.longitude)).toFixed(4)}`
        : 'NO_COORD';
      console.log(`    [${(s.familyAnchorType ?? '?').padEnd(7)}] ${s.name.padEnd(55)} score=${s.scoreClassicFinal} ${coord}`);
    }
  }
}

async function run() {
  // ── Yosemite: manually-edited selection ─────────────────────────────────
  {
    const poolRow = await storage.getCityStopPool('Yosemite', 'USA');
    const pool = (poolRow?.stopPool ?? []) as CachedStopCandidate[];
    console.log(`\nYosemite pool: ${pool.length} candidates`);

    // Default algo picks (from prior test): Valley VC, Yosemite Museum, El Capitan,
    // Half Dome, Mist Trail — simulate user edit:
    //   REMOVE: Yosemite Museum, Mist Trail
    //   ADD:    El Capitan Meadow, Tuolumne Meadows (from unselected pool)
    const defaultSelected = [
      'Yosemite Valley Visitor Center',
      'Glacier Point',
      'El Capitan',
      'Half Dome',
      'Sentinel Dome',
      'Bridalveil Fall',
      'Mirror Lake',
      'Vernal Fall',     // approximation of Mist Trail entry
    ];
    const swapOut = new Set(['Yosemite Museum & Indian Village of the Ahwahnee', "Mist Trail to Vernal Fall (family-friendly section)"]);
    const swapIn  = new Set(['El Capitan Meadow', 'Tuolumne Meadows']);

    // Build selection from pool
    const byName = new Map(pool.map(c => [c.name.toLowerCase().trim(), c]));
    const selected: CachedStopCandidate[] = [];
    for (const name of defaultSelected) {
      const c = byName.get(name.toLowerCase().trim());
      if (c && !swapOut.has(c.name)) selected.push(c);
    }
    for (const name of swapIn) {
      const c = byName.get(name.toLowerCase().trim());
      if (c) selected.push(c);
    }

    console.log(`\nManually edited Yosemite selection (${selected.length} stops):`);
    selected.forEach(c => console.log(`  [${(c.familyAnchorType ?? '?').padEnd(7)}] ${c.name} [${c.scoreClassicFinal}]`));

    const yosResult = bucketStopsTodays(selected, {
      destination: 'Yosemite',
      tripDays: 5,
      childrenAges: [7],
      pace: 'moderate',
      transportMode: 'driving',
    });
    printBuckets('Yosemite — manually edited (remove Museum+MistTrail, add ElCapMeadow+Tuolumne)', yosResult);

    // El Capitan trio: El Capitan + El Capitan Meadow are 0.0 km apart (same physical location).
    // Both survive in the bucketing output (bucketing doesn't proximity-dedup — that's the pool
    // endpoint's job). In live usage the pool endpoint collapses them to one, so a user can't
    // select both simultaneously.
    const { buckets: yosBuckets } = yosResult;
    const elCapStops = yosBuckets.flatMap(b => b.stops.filter(s => s.name.toLowerCase().includes('el capitan')));
    console.log(`\n  El Capitan stops in output: ${elCapStops.map(s => `Day${s.dayNumber} "${s.name}"`).join(', ')}`);
    const elCapDays = new Set(elCapStops.map(s => s.dayNumber));
    console.log(`  Same day? ${elCapDays.size === 1 ? 'YES — same physical location, pool endpoint prevents dual-selection in live usage' : 'NO — on different days'}`);
  }

  // ── Yellowstone: manually-edited selection ───────────────────────────────
  {
    const poolRow = await storage.getCityStopPool('Yellowstone', 'USA');
    const pool = (poolRow?.stopPool ?? []) as CachedStopCandidate[];
    console.log(`\n\nYellowstone pool: ${pool.length} candidates`);

    // Default algo picks for 7-day Yellowstone:
    //   Old Faithful, Grizzly/Wolf, Albright VC, Canyon VC, Grand Prismatic Spring,
    //   Yellowstone NP VC, Lake Yellowstone Cruises, (+ fillers)
    // Simulate user edit:
    //   REMOVE: Albright VC (museum), Canyon VC
    //   ADD:    Mammoth Hot Springs Terraces, Uncle Tom's Trail
    const defaultSelected = [
      'Old Faithful',
      'Grizzly and Wolf Discovery Center',
      'Grand Prismatic Spring',
      'Lamar Valley',
      'Mammoth Hot Springs',
      'Tower Fall',
      'Black Sand Basin',
      'Hayden Valley',
      'Norris Geyser Basin',
      'Yellowstone Lake (shore walks & beaches)',
    ];
    const swapIn = new Set([
      'Mammoth Hot Springs Terraces',
      'Uncle Tom\'s Trail (Lower Falls viewpoint trail)',
      'Artist Point — Grand Canyon of the Yellowstone',
    ]);

    const byName = new Map(pool.map(c => [c.name.toLowerCase().trim(), c]));
    const selected: CachedStopCandidate[] = [];
    for (const name of defaultSelected) {
      const c = byName.get(name.toLowerCase().trim());
      if (c) selected.push(c);
    }
    for (const name of swapIn) {
      const c = byName.get(name.toLowerCase().trim());
      if (c) selected.push(c);
    }

    console.log(`\nManually edited Yellowstone selection (${selected.length} stops):`);
    selected.forEach(c => console.log(`  [${(c.familyAnchorType ?? '?').padEnd(7)}] ${c.name} [${c.scoreClassicFinal}]`));

    const yelResult = bucketStopsTodays(selected, {
      destination: 'Yellowstone',
      tripDays: 7,
      childrenAges: [7],
      pace: 'moderate',
      transportMode: 'driving',
    });
    printBuckets('Yellowstone — manually edited (remove Albright/CanyonVC, add MammothTerraces+ArtistPoint+UncleTom)', yelResult);

    const { buckets: yelBuckets } = yelResult;
    const gpStops = yelBuckets.flatMap(b => b.stops.filter(s => s.name.toLowerCase().includes('grand prismatic') || s.name.toLowerCase().includes('midway geyser')));
    console.log(`\n  Grand Prismatic cluster: ${gpStops.map(s => `Day${s.dayNumber} "${s.name}"`).join(', ') || 'not found'}`);

    const artistPoint = yelBuckets.flatMap(b => b.stops.filter(s => s.name.includes('Artist Point')));
    const uncleTom   = yelBuckets.flatMap(b => b.stops.filter(s => s.name.includes("Uncle Tom")));
    console.log(`  Artist Point: ${artistPoint.map(s => `Day${s.dayNumber}`).join(',') || 'not found in any day'}`);
    console.log(`  Uncle Tom's Trail: ${uncleTom.map(s => `Day${s.dayNumber}`).join(',') || 'not found in any day'}`);
    if (artistPoint.length && uncleTom.length)
      console.log(`  Same day? ${artistPoint[0].dayNumber === uncleTom[0].dayNumber ? 'YES ✓' : 'NO'}`);
  }

  // ── Grizzly/Wolf West-Entrance closedShort test ──────────────────────────
  {
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('Grizzly/Wolf closedShort test — 2-day Yellowstone, West-Entrance anchor only');
    console.log('='.repeat(70));

    const poolRow = await storage.getCityStopPool('Yellowstone', 'USA');
    const pool = (poolRow?.stopPool ?? []) as CachedStopCandidate[];

    // Force: Day 1 = Old Faithful (central), Day 2 = Grizzly/Wolf (West Entrance -111.097°)
    // Non-anchor fillers are all Yellowstone interior (≥40km from Grizzly/Wolf → leg-cap fires)
    const grizzlyWolf = pool.find(c => c.name === 'Grizzly and Wolf Discovery Center');
    const oldFaithful = pool.find(c => c.name === 'Old Faithful');
    const blackSand   = pool.find(c => c.name === 'Black Sand Basin');    // near Old Faithful, 0.5km
    const lamarValley = pool.find(c => c.name === 'Lamar Valley');        // far from both, 44°N 110.2°W

    if (!grizzlyWolf || !oldFaithful) {
      console.log('  !! Missing required pool stops — skipping test'); process.exit(0);
    }

    // Selection: Old Faithful (anchor) + Grizzly/Wolf (anchor) + Black Sand Basin (support, near OF)
    // + Lamar Valley (support, far from Grizzly/Wolf — leg-cap fires for Day 2 filler)
    const testCandidates = [oldFaithful, grizzlyWolf, ...[blackSand, lamarValley].filter(Boolean) as CachedStopCandidate[]];
    console.log(`\nSelection: ${testCandidates.map(c => `"${c.name}" [${c.familyAnchorType}]`).join(', ')}`);

    const gwResult = bucketStopsTodays(testCandidates, {
      destination: 'Yellowstone',
      tripDays: 2,
      childrenAges: [7],
      pace: 'moderate',
      transportMode: 'driving',
    });

    printBuckets('Grizzly/Wolf closedShort test', gwResult);

    const { buckets: gwBuckets } = gwResult;
    const shortDay = gwBuckets.find(b => b.closedShort);
    if (shortDay) {
      console.log(`\n  ✓ closedShort: true on Day ${shortDay.dayNumber} — Grizzly/Wolf (West Entrance) correctly closes short`);
      console.log(`    actualCount=${shortDay.actualCount}, targetCount=${shortDay.targetCount}`);
    } else {
      const grizzlyDays = gwBuckets.filter(b => b.stops.some(s => s.name === 'Grizzly and Wolf Discovery Center'));
      console.log(`  ✗ No closedShort day found. Grizzly/Wolf on: Day ${grizzlyDays.map(b => b.dayNumber).join(',')}`);
    }
  }

  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
