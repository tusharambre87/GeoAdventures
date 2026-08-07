---
name: Pool neighborhoodZone gap
description: city_stop_pool_cache.stop_pool JSONB has no neighborhoodZone values (all null); stop_library has no neighborhood_zone column. Affects zone context for call site 3 (pool patch path).
---

## Rule
`city_stop_pool_cache.stop_pool` JSONB blobs do not contain `neighborhoodZone` — all null.
`stop_library` has no `neighborhood_zone` column (schema defines it but migration was never run).

**Why:** The pool was generated and cached before the zone field was added to the AI pool-generation prompt. `CachedStopCandidate.neighborhoodZone` passes through `candidateToGeneratedStop` correctly (line ~2870), so the plumbing is wired — the data just isn't there yet.

**How to apply:**
- Any feature that relies on `stop.neighborhoodZone` being populated for pool-served stops will silently degrade to empty for all current cached pools.
- **RESOLVED** via `backfillPoolZones.ts` (zone-enrichment patch script, `backfill:pool-zones` in package.json). 3201/3205 pool stops across all 167 cities now have `neighborhoodZone`. Re-run the script if new cities are added to the pool cache.
- Zone name drift risk: pool backfill and `generateDayStops` AI calls may assign different labels for the same area (e.g. "Upper Geyser Basin" vs "Old Faithful Area"). Mitigate by adding the destination to `CITY_ZONE_HINTS` in `plannerService.ts` — both the backfill script and the day-generation prompt will then use the exact same label list. Yellowstone was added as part of this work.
