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
- The fix requires either:
  1. Re-running pool generation (via the pool backfill workflow) so new JSONB entries carry `neighborhoodZone` from the AI prompt at line ~2224.
  2. OR adding an explicit enrichment step that writes `neighborhoodZone` into existing pool JSONB rows.
- The `PRIOR DAYS' ZONES` prompt block (added to `generateDayStops`) is empty for call site 3 (single-city pool patch) until the pool data is refreshed. Call site 4 (full AI path) works immediately since AI-generated stops DO carry `neighborhoodZone`.
