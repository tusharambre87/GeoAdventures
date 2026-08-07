/**
 * Regression script: verify that every entry in CITY_MUST_SEE_ANCHORS has
 * an exact-normalised match among the stop_library rows for that city.
 *
 * Usage:
 *   tsx src/scripts/verify-must-see-anchors.ts
 *
 * Exit code 0 = all anchors satisfied.
 * Exit code 1 = one or more anchors have no matching pool stop.
 *
 * The normaliser here MUST stay in sync with the one inside isCityMustSee
 * in plannerService.ts:
 *   (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
 */
import { db } from "../db.js";
import { stopLibrary } from "@workspace/db";
import { sql } from "drizzle-orm";

// ── Must be kept in sync with CITY_MUST_SEE_ANCHORS in plannerService.ts ──
const CITY_MUST_SEE_ANCHORS: Record<string, string[]> = {
  "new york": ["Statue of Liberty", "Empire State Building", "Times Square", "Central Park"],
  "new york city": ["Statue of Liberty", "Empire State Building", "Times Square", "Central Park"],
  "washington dc": ["Lincoln Memorial", "Washington Monument", "United States Capitol", "National Mall"],
  "washington d.c.": ["Lincoln Memorial", "Washington Monument", "United States Capitol", "National Mall"],
  "washington": ["Lincoln Memorial", "Washington Monument", "United States Capitol", "National Mall"],
  "minneapolis": ["Mall of America", "Minnehaha Falls", "Stone Arch Bridge"],
  "st. louis": ["Gateway Arch", "St. Louis Zoo"],
  "st louis": ["Gateway Arch", "St. Louis Zoo"],
  "saint louis": ["Gateway Arch", "St. Louis Zoo"],
  "chicago": ["Millennium Park", "Navy Pier", "Skydeck Chicago"],
  "boston": ["Freedom Trail", "Boston Common", "New England Aquarium"],
  "san francisco": ["Golden Gate Bridge", "Alcatraz Island", "Pier 39"],
  "seattle": ["Space Needle", "Pike Place Market"],
  "philadelphia": ["Liberty Bell", "Independence Hall"],
  "los angeles": ["Griffith Observatory", "Santa Monica Pier"],
  "yellowstone": ["Old Faithful", "Mammoth Hot Springs"],
};

/**
 * Maps anchor keys (which may be aliases) to the canonical city name stored in
 * stop_library.city. When a key isn't listed here the query uses the key
 * itself (case-insensitive), which works for most cities.
 */
const DB_CITY_OVERRIDE: Record<string, string> = {
  "new york city": "New York",
  "washington d.c.": "Washington DC",
  "washington": "Washington DC",
  "st louis": "St. Louis",
  "saint louis": "St. Louis",
};

/** Same normaliser as isCityMustSee in plannerService.ts */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function run() {
  console.log("\n[verify-must-see-anchors] Checking CITY_MUST_SEE_ANCHORS against stop_library…\n");

  // De-duplicate: multiple anchor keys can point to the same physical city.
  // Track which (dbCity, anchorName) pairs we've already verified.
  const verified = new Set<string>();

  let failures = 0;

  for (const [cityKey, anchors] of Object.entries(CITY_MUST_SEE_ANCHORS)) {
    const dbCity = DB_CITY_OVERRIDE[cityKey] ?? cityKey;

    // Query stop_library for all stops in this canonical city
    const rows = await db
      .select({ name: stopLibrary.name })
      .from(stopLibrary)
      .where(sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(${dbCity})`);

    const poolNorms = new Set(rows.map(r => norm(r.name)));

    const missing: string[] = [];
    for (const anchor of anchors) {
      const dedupeKey = `${dbCity}::${norm(anchor)}`;
      if (verified.has(dedupeKey)) continue; // already checked for this city
      verified.add(dedupeKey);

      if (!poolNorms.has(norm(anchor))) {
        missing.push(anchor);
      }
    }

    if (missing.length > 0) {
      failures++;
      console.error(`✗ ${cityKey}  (db city="${dbCity}")`);
      for (const m of missing) {
        console.error(`    MISSING: "${m}" (norm="${norm(m)}")`);
        // Show closest candidates to help diagnose
        const firstWord = m.split(" ")[0].toLowerCase();
        const candidates = rows
          .map(r => r.name)
          .filter(n => n.toLowerCase().includes(firstWord))
          .slice(0, 5);
        if (candidates.length > 0) {
          console.error(`    Closest in pool: ${candidates.map(c => `"${c}"`).join(", ")}`);
        }
      }
    } else if (anchors.some(a => !verified.has(`${dbCity}::${norm(a)}`))) {
      // Some were skipped as duplicates — only print if we had at least one fresh check
      console.log(`✓ ${cityKey}  (alias — already verified via another key)`);
    } else {
      console.log(`✓ ${cityKey}  (${anchors.length} anchor(s) all matched)`);
    }
  }

  console.log(`\n[verify-must-see-anchors] Done — ${failures === 0 ? "ALL PASSED ✓" : `${failures} city key(s) FAILED ✗`}`);
  process.exit(failures > 0 ? 1 : 0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
