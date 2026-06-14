---
name: PMAL relative fallback gate
description: The correct trigger condition for the age-band relative fallback in selectStopsFromPool (parent suggestions)
---

## Rule

Use `rawAgeFilteredCandidates.length < 3` as the trigger for the relative fallback, not `=== 0`.

**Why:** Cities like Washington DC have one or two pool stops with a non-zero minAge (e.g. minAge=5 for Capitol Building), so `rawAgeFilteredCandidates` is never exactly 0 — the strict equality gate never opens, and PMAL always returns empty.

**How to apply:** In `selectStopsFromPool` (plannerService.ts), the relative fallback fires when raw yields fewer than 3 candidates — not enough to populate 3 PMAL suggestions. Merge both lists: `effectiveAgeFilteredCandidates = [...rawAgeFilteredCandidates, ...relativeAgeFilteredCandidates]`.

## Additional pitfall — threshold bypass

Relative candidates (a8-a2 ≥ 20, a2 < 75) share the same score range as main-pool stops (they ARE the same landmarks). Applying the 60th-percentile `AGE_FILTER_THRESHOLD` to them would eliminate all of them (score equals, not exceeds, threshold). Bypass it with `relativeSet.has(c) || score > threshold`.

## DC specifics

- Pool has 42 stops; nearly all minAge=0; ~1-2 have minAge=5 (Capitol Building, etc.)
- `rawAgeFilteredCandidates` condition: `minAge > minChildAge + 2` (minChildAge=4 → minAge ≥ 7)
- Actually only 1 stop has minAge=5 which is > 4 but let's confirm with the condition
- 20 relative candidates qualify (a2 < 75, a8-a2 ≥ 20) — International Spy Museum, Lincoln Memorial, Washington Monument, White House, etc.
