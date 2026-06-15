---
name: stop_library name normalization
description: Three normalizers that must stay in sync; word-expansion rules for common abbreviation variants.
---

## The three normalizers (must stay in sync)

1. `artifacts/api-server/src/storage.ts` — `normalizeStopName()` — writes the DB `normalized_name` column (used by seeder, stopLibrarySeeder.ts)
2. `artifacts/api-server/src/planner/plannerService.ts` — `normStopName()` — in-memory dedup during pool selection
3. `artifacts/api-server/src/routes/routes.ts` — `normN()` — safety-net dedup in the pool insert loop

**Why:** The unique constraint `UQ_stop_library_normalized` is on `(normalized_name, normalized_key)`. If the three normalizers diverge, stop dedup breaks at different layers and allows duplicate rows for the same real-world location.

## Word-expansion rules (apply BEFORE punct-strip)

```ts
.replace(/\bunited\s+states\b/g, 'us')   // "United States X" → "us x"
.replace(/\bmount\b/g, 'mt')              // "Mount Rainier" → "mt rainier"
.replace(/\bsaint\b/g, 'st')             // "Saint Louis Zoo" → "st louis zoo"
```

These must come before `.replace(/[^a-z0-9\s]+/, '')` so that the abbreviated form ("U.S.", "Mt.", "St.") — which the punct-strip already collapses to "us", "mt", "st" — ends up with the same hash.

**Why:** Without expansion, "U.S. Botanic Garden" → "us botanic garden" but "United States Botanic Garden" → "united states botanic garden" — two different hashes, two separate rows for the same place.

## storage.ts formula (simpler, no "the"/"of art" rules)

```ts
export function normalizeStopName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bunited\s+states\b/g, 'us')
    .replace(/\bmount\b/g, 'mt')
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

## plannerService / routes formula (richer, also strips "the", "of art", parks, etc.)

```ts
n.toLowerCase()
  .replace(/^the\s+/, '')
  .replace(/\bunited\s+states\b/g, 'us')
  .replace(/\bmount\b/g, 'mt')
  .replace(/\bsaint\b/g, 'st')
  .replace(/\bof\s+arts?\b/g, 'of art')
  .replace(/\s+regional\s+/g, ' ')
  .replace(/\s+state\s+park\b/g, '')
  .replace(/\s+national\s+park\b/g, '')
  .replace(/\s+county\s+park\b/g, '')
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ').slice(0, 5).join(' ')
```

## DB backfill procedure (for future normalization changes)

1. Find collisions: rows where `new_norm` matches another row's `normalized_name` on the same `normalized_key`
2. Delete the weaker duplicate first (no FK constraints exist on `stop_library`)
3. Update non-colliding rows: `UPDATE ... WHERE normalized_name IS NOT NULL AND normalized_name <> new_norm AND NOT EXISTS (collision check)`
4. Skip or delete remaining collision pairs (they are pre-existing duplicates)

**How to apply:** Any time a new word-expansion or normalization rule is added, update all three normalizers simultaneously and run the backfill procedure above.
