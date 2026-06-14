---
name: PSI minAge vs planner_places.min_age
description: Which column actually controls pool stop age filtering, and the NULL vs 0 override semantics.
---

## The distinction

`planner_places.min_age` is NOT what controls a stop's minimum age in the city stop pool.
The pool reads `planner_stop_intelligence.min_age` aliased as `psiMinAge` in `generateCityStopPool()` (`plannerService.ts`).

## NULL vs 0 semantics (fixed)

After the fix, `psiMinAge` uses three-state semantics:
- `NULL` → "not set", falls through to age-band score derivation (`age2to4Fit`, `age5to7Fit`, `age8to12Fit`)
- `0` → explicit "no minimum age" override — bypasses band derivation entirely
- `> 0` → explicit minimum age (e.g. 6 for Capitol Building)

**Before the fix**, `(row.psiMinAge ?? 0) > 0` treated 0 and NULL identically, so stops with
`psiMinAge = 0` AND `age5to7Fit ≥ 60` (e.g. Lincoln Memorial: age5to7Fit=88) would wrongly get `minAge=5`
from band derivation, causing them to land in `parent_suggestions` for toddler trips.

**Fix location:** `plannerService.ts` around line 2209 — changed condition to `row.psiMinAge !== null && row.psiMinAge !== undefined`.

## DC data state (as of June 2026)

Pool has 51 stops:
- 48 stops at minAge = 0 (all family-friendly DC stops — Zoo, Lincoln Memorial, Air & Space, etc.)
- 3 stops at minAge = 6 (Capitol Building, Library of Congress, United States Capitol)

`planner_places.min_age` was also updated to match (Capitol=6, Holocaust Museum=6, Library=6, rest=0)
but this column is not read by pool generation. It may be used elsewhere in the app.

## Pool regeneration

Deleting from `city_stop_pool_cache` WHERE `normalized_key LIKE '%washington%'` and restarting
the API server causes CityPoolSeeder to regenerate the DC pool from stop_library + PSI data.
The seeder skips cities that already have a pool entry.
