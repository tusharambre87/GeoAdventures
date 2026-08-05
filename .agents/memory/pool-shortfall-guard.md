---
name: Pool shortfall guard
description: The selectStopsFromPool result-assembly loop cascades on empty days; guard must compare against totalStopsNeeded, not zero.
---

## The rule
The call-site guard after `selectStopsFromPool` must be `rawSelectedStops.length < totalStopsNeeded`, NOT `=== 0`.

**Why:** The result-assembly loop inside `selectStopsFromPool` does `if (daySlice.length === 0) break` — once any day comes up empty, every subsequent day is also silently dropped. A 3-day trip whose pool ran out on day 3 returns 4 stops (non-zero), so a `=== 0` guard never fires and the trip is persisted with blank days.

**How to apply:** `totalStopsNeeded` is now part of `StopPoolResult` (sum of per-day caps, computed where `stopsForDay` is built). Destructure it at the call site and compare against it. Same throw, same catch block, same AI-fallback path.

The single-city call site (plannerService.ts ~4582) was fixed in commit `5f3f79c`. The multi-city guard (~4488) still uses `=== 0` — has the same latent issue.

## Trade-off (documented, not resolved)
The guard causes the entire trip to regenerate via AI when even one day is short. A future improvement could supplement only the shortfall and preserve pool-generated days, but needs new plumbing (partial AI call + merge).

## Connection to dedup work
Pass 3 / normStopNameGlobal (commit `cbe2ce8`) shrinks pool sizes by removing genuine duplicates. For small city pools, this can push the effective count below `totalStopsNeeded` — exactly the condition that cascades. The guard fix prevents silent bad trips.
