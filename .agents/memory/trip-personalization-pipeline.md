---
name: Trip Personalization Pipeline
description: Architecture rules for how onboarding inputs flow through to stop selection in selectStopsFromPool and generateStopsInBackground.
---

## Meal stops are additive — never count toward pace target

The greedy selection loop in `selectStopsFromPool` skips meal types entirely (`if (isMealType) continue`). After the loop, one meal per day is appended at the end of each day's `orderedSlice`. The `effectiveStopsPerDay` variable drives the activity slot count only; meals are on top of it.

**Why:** Historically, meals counted as one of the activity stops, so relaxed pace (3/day) would give families 2 museums and 1 restaurant. That was wrong. Meals should be bonus additions.

**How to apply:** Any new stop-count logic must use `effectiveStopsPerDay` for activity stops and add meals separately. Do NOT include meal stops in `totalStopsNeeded`.

## Preview endpoint groups by dayNumber, not CHUNK

`selectStopsFromPool` sets `dayNumber` on each returned `GeneratedStop`. The preview endpoint MUST group poolStops by `dayNumber` to build its `days[]` response. Flat-slicing by `CHUNK` causes meals (which are appended at end of each day) to bleed into the next day's chunk.

**Why:** Before Fix 1, each day had exactly `CHUNK` stops. After adding additive meals, each day has `CHUNK + 1` stops, making flat slicing by CHUNK break.

**How to apply:** In any route that calls `selectStopsFromPool` and then slices the result, use `s.dayNumber` grouping instead of `slice(d * CHUNK, (d+1) * CHUNK)`.

## City stop pool cache must be invalidated when mapper fields change

`generateCityStopPool` maps DB rows to `CachedStopCandidate` objects which are serialized to `city_stop_pool_cache.stop_pool` (JSON). If you add new fields to the mapper (e.g. `scoreClassicFinal`), existing cached JSON blobs won't have those fields. The scoring in `selectStopsFromPool` will see `undefined` for those fields and the boost won't apply.

**Why:** Discovered when Fix 2 (PSI vibe scores) added profile score fields but DC still got identical stop lists across vibes because the cache was stale.

**How to apply:** After adding fields to the `CachedStopCandidate` mapper, invalidate the relevant city caches: `DELETE FROM city_stop_pool_cache WHERE LOWER(city) = 'city name'`.

## plannerInput must include ALL tailoring fields for both paths

There are two `plannerInput` construction sites in routes.ts:
1. **Trip creation path** (~line 5600) inside `generateStopsInBackground`
2. **Preview path** (~line 6400) in the `/api/travel/preview` handler

Both must include: `adventureStyle`, `strollerNeeded`, `indoorLean`, `budgetSensitivity`, `kidEnergyLevel`, `interests`. Before Fix 5, the trip creation path was missing all tailoring fields — only preview had them.

## Arrival/last day cap values

- `morning` → full stops per day
- `afternoon` → 2 stops cap (Day 1)
- `evening` → 1 stop cap (Day 1)
- `late` / `late_night` → 0 stops (Day 1 is rest)
- Last day `full` → normal
- Last day `late` → 2 stops cap
- Last day `travel` → 0 stops ("heading home — can't do stops")

Note: `travel` last day was incorrectly 1 stop before Fix 7.

## PSI profile score differentiation is city-dependent

DC stops score similarly (65-79) across all four profiles (classic/urban/adventure/toddler) because DC is a family destination that appeals broadly. The vibe boost (+4 pts max) only creates visible differentiation in cities where stops are more profile-specific (e.g. national parks for adventure, food halls for urban).

**Why:** The backfill scored all profiles at similar levels for iconic/multi-faceted cities. Don't be alarmed if DC preview shows same stops for different vibes.
