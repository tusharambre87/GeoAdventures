---
name: P1 pool join punctuation bug
description: Live production pool selection uses a fragile LOWER(TRIM()) name+city join that silently drops stops with punctuation mismatches — same bug that missed Kenilworth Park & Aquatic Gardens during image seeding.
---

## The bug

`plannerService.ts` pool selection joins `stop_library` → `planner_places` → `planner_stop_intelligence` using:

```sql
LOWER(TRIM(planner_places.name)) = LOWER(TRIM(stop_library.name))
AND LOWER(TRIM(planner_places.city)) = LOWER(TRIM(stop_library.city))
```

`LOWER(TRIM())` handles case and whitespace only. It does not normalize punctuation. Any stop whose name in `stop_library` differs from its `planner_places` counterpart by punctuation, ampersands, apostrophes, abbreviations, or spacing variations silently fails the join — the stop never enters the candidate pool, its PSI score is never read, and it is excluded from every trip for that city without any log entry.

**Why:** The `planner_places` table was originally populated by the AI enrichment pipeline, which sometimes writes slightly different name forms than what was inserted into `stop_library` directly (e.g. via the admin seeding scripts or the dedup pipeline). The two tables have drifted.

## Known manifestations

- "Kenilworth Park & Aquatic Gardens" missed during image-seeding backfill (confirmed)
- Old Faithful and other Yellowstone stops may be missing from pools partly due to this (suspected — join mismatch between seeded stop_library name and AI-written planner_places name)
- Any stop seeded via admin scripts after the initial AI enrichment run is at risk

## Fix (do NOT implement until after GP scoring migration lands)

Replace the text-match join with a FK-based join using a `stop_library_id` foreign key column on `planner_places`. When a `stop_library` row is inserted, the corresponding `planner_places` row should record `stop_library.id` directly, eliminating the name-match join entirely.

Migration path:
1. Add `stop_library_id uuid REFERENCES stop_library(id)` to `planner_places`
2. Backfill the FK via a one-time matching pass (using the current text join as a best-effort seed, then manual review of unmatched rows)
3. Rewrite the pool selection join to use the FK
4. Add a uniqueness constraint to prevent duplicate `planner_places` rows per `stop_library` row

**Why:** This is a correctness invariant — stops in the library must reliably appear in trips. The text join is an ongoing silent failure mode that cannot be fixed by better string normalization alone.

## Priority

P1 — fix immediately after the GP data + scoring floor migration (4-part plan) is complete and verified.
