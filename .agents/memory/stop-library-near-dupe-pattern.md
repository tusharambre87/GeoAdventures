---
name: stop_library near-duplicate pattern
description: Same real-world venue stored under two slightly different names survives the normalized_key exact-match dedup and both end up in trip pool
---

## The rule

When two stop_library rows represent the same physical venue but have different names (e.g. "Smithsonian National Zoo" vs "Smithsonian National Zoological Park"), they have different `normalized_name` values and therefore different `normalized_key` values, so the unique-constraint dedup does **not** catch them. Both rows enter the pool and can both be selected for the same trip.

## Fingerprint

Genuine near-duplicates share identical or near-identical `gp_ratings_total` values (because they resolved to the same Google Places entry). Use this to detect them:

```sql
SELECT a.name, b.name, a.gp_ratings_total
FROM stop_library a
JOIN stop_library b ON a.city = b.city AND a.country = b.country
  AND a.id < b.id
  AND a.gp_ratings_total = b.gp_ratings_total
  AND a.gp_ratings_total IS NOT NULL
ORDER BY a.city, a.gp_ratings_total;
```

## Fix

1. Identify the canonical row (better stop_type, cleaner name, later `gp_verified_at`).
2. Confirm no FK constraints on stop_library.id (there are none as of this writing — PSI and planner tables use `place_id`, not `stop_library.id`).
3. Delete the inferior row directly.
4. Delete the `city_stop_pool_cache` row for that city so the next trip regenerates from the clean library.

**Why:** No FK guard means deletions are safe immediately, but the pool cache must be manually invalidated — it is populated eagerly and won't self-expire until a seeder or backfill touches it.

## DC example (fixed)

| Deleted (inferior) | Kept (canonical) |
|---|---|
| Smithsonian National Zoological Park (park) | Smithsonian National Zoo (zoo) |
| The Wharf DC (market) | The Wharf (activity) |
| Washington Monument & National Mall (landmark) | Washington Monument (landmark) + National Mall (landmark, separate row) |
