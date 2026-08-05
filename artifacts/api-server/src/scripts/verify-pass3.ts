/**
 * Verification script: force a fresh generateCityStopPool for a city with no
 * cache entry and confirm the resulting pool has zero normStopName duplicates.
 * Usage: VERIFY_CITY=Dubai VERIFY_COUNTRY=UAE tsx src/scripts/verify-pass3.ts
 */
import { generateCityStopPool } from "../planner/plannerService.js";

const CITY    = process.env.VERIFY_CITY    ?? "Dubai";
const COUNTRY = process.env.VERIFY_COUNTRY ?? "UAE";

const normStopName = (n: string): string =>
  n.toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^the\s+/, '')
    .replace(/\bunited\s+states\b/g, 'us')
    .replace(/\bmount\b/g, 'mt')
    .replace(/\bsaint\b/g, 'st')
    .replace(/\bof\s+arts?\b/g, 'of art')
    .replace(/\s+regional\s+/g, ' ')
    .replace(/\s+state\s+park\b/g, '')
    .replace(/\s+national\s+park\b/g, '')
    .replace(/\s+county\s+park\b/g, '')
    .replace(/&/g, 'and')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ').slice(0, 5).join(' ');

async function run() {
  console.log(`\n[verify-pass3] Generating fresh pool for ${CITY}, ${COUNTRY} …`);
  const pool = await generateCityStopPool(CITY, COUNTRY);
  console.log(`[verify-pass3] Pool size returned: ${pool.length}`);

  // Scan for normStopName duplicates — same logic the backfill verification uses
  const normGroups = new Map<string, string[]>();
  for (const stop of pool) {
    const norm = normStopName(stop.name ?? "");
    if (!normGroups.has(norm)) normGroups.set(norm, []);
    normGroups.get(norm)!.push(stop.name ?? "");
  }
  const dupGroups = [...normGroups.entries()].filter(([, names]) => names.length > 1);

  if (dupGroups.length === 0) {
    console.log(`[verify-pass3] ✓ CLEAN — 0 normStopName dup pairs in the generated pool.`);
  } else {
    console.log(`[verify-pass3] ✗ DUPS FOUND — ${dupGroups.length} group(s):`);
    for (const [norm, names] of dupGroups) {
      console.log(`  norm="${norm}" → ${names.map(n => `"${n}"`).join(", ")}`);
    }
  }

  console.log(`\n[verify-pass3] Done.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
