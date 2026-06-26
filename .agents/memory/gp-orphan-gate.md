---
name: GP floor orphan gate
description: Correct definition of "orphan" in the recompute-gp-floor script; why 13 false positives fired and the fix.
---

## Rule

An orphan in the GP floor recompute is a `stop_library` row where:
1. `gp_ratings_total IS NOT NULL` (floor-eligible)
2. Has at least one **non-overridden** PSI match via LOWER(TRIM) name+city join
3. That non-overridden PSI match still has `score_classic_final IS NULL` after the loop

Stops whose ONLY PSI rows are `manually_overridden = true` are **correctly skipped** — they are NOT orphans.

**Why:** The original gate used an in-process `processedSlIds` set (stop_library IDs joined to non-overridden PSI rows). Stops whose only PSI match is overridden never enter the set, so they looked like orphans. They aren't.

**How to apply:** The orphan gate in `recompute-gp-floor.ts` and `recompute-gp-floor-cache-bust.ts` uses a DB-side EXISTS query:
```sql
EXISTS (
  SELECT 1 FROM planner_places pp
  INNER JOIN planner_stop_intelligence psi ON psi.place_id = pp.id
  WHERE LOWER(TRIM(pp.name)) = LOWER(TRIM(sl.name))
    AND LOWER(TRIM(pp.city)) = LOWER(TRIM(sl.city))
    AND psi.manually_overridden IS NOT TRUE
    AND psi.score_classic_final IS NULL
)
```
0 results = gate passes. No in-process set needed.

## What fired (historical)

13 false positives: DC landmarks (Washington Monument, Capitol, Lincoln Memorial, White House, Library of Congress, National Mall, United States Capitol ×2) and Yellowstone core stops (Old Faithful, Grand Prismatic Spring, Lamar Valley, Grand Canyon of Yellowstone, Mammoth Hot Springs). Every one had exactly one PSI row with `manually_overridden = t`.
