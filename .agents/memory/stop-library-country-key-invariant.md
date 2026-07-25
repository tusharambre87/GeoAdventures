---
name: stop_library country+key invariant
description: normalized_key is a derived column; country values must be consistent across stop_library and its source tables or seeder deduplication silently breaks
---

## The Rule

`stop_library.normalized_key` must always equal `LOWER(TRIM(city)) || ':' || LOWER(TRIM(country))`.
Any `UPDATE` that changes `city` or `country` **must also update `normalized_key`** in the same statement:

```sql
UPDATE stop_library
SET city = 'New York', country = 'US',
    normalized_key = 'new york:us'
WHERE city = 'New York City';
```

Or after a bulk column-only update, recompute in a second pass:
```sql
UPDATE stop_library
SET normalized_key = LOWER(TRIM(city)) || ':' || LOWER(TRIM(country))
WHERE normalized_key != LOWER(TRIM(city)) || ':' || LOWER(TRIM(country));
```
Before running that pass, resolve conflicts with:
```sql
-- stale-vs-stale: delete higher-id duplicate per (correct_key, normalized_name) group
-- stale-vs-correct: delete stale rows that conflict with an already-correct row
```

## Why

`getStopLibraryByCity(city, country)` in `storage.ts` queries **only** by `normalized_key` — it does not compare `city`/`country` columns. The USA seeder (`usaLibrarySeeder`) and international seeder both rely on this method to detect existing stops before deciding whether to generate new ones. If `normalized_key` is stale:
- Seeder finds 0 existing stops for a city → generates AI duplicates on every restart
- `onConflictDoUpdate` in `saveStopLibraryEntries` targets `(normalized_name, normalized_key)` — mismatched keys won't catch duplicates

## Canonical country values

| Geography | Canonical value | Old value (banned) |
|-----------|----------------|--------------------|
| USA       | `"US"`         | `"USA"`, `"United States"` |
| Others    | full name      | ISO-2 or abbreviations |

**Source tables must match:**
- `city_stop_pool_cache.country` → must be `"US"` for US cities (not `"USA"`)
- `city_adventure_templates.country` → must be `"US"` for US cities (not `"United States"`)
- `usaLibrarySeeder.ts` runtime: uses `"US"` in query, insert, and enrichment call (fixed)
- `cityPoolSeeder.ts`: still uses `"USA"` internally — only runs on new cities (skips existing); lower-priority fix

## How to apply

Whenever bulk-editing city or country:
1. Run the stale-key conflict pre-check before the UPDATE
2. Delete stale-vs-stale conflicts (keep lower id)
3. Delete stale-vs-correct conflicts (keep correct-key row)
4. Then run the bulk `normalized_key` recompute UPDATE
5. Verify with `SELECT COUNT(*) FROM stop_library WHERE normalized_key != LOWER(TRIM(city)) || ':' || LOWER(TRIM(country))` — must be 0
