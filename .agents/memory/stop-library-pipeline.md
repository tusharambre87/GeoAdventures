---
name: stop_library pipeline architecture
description: Four correctness invariants for stop_library inserts — normalized_name column, stop_type CHECK, dedup key, PSI auto-seeding.
---

## The four invariants (all applied as of June 2026)

### 1. Pre-computed normalized_name
- Column: `normalized_name varchar NOT NULL DEFAULT ''` on `stop_library`
- Computed by `normalizeStopName(name)` in `storage.ts` (exported)
- Set on every insert by `saveStopLibraryEntries` and `stopLibrarySeeder`
- Used as join key to `explore_cache` in `backfillExploreContent.ts`

### 2. stop_type CHECK constraint
- `chk_stop_library_stop_type` enforces 33 canonical values
- `normalizeStopType()` in `storage.ts` maps variants at insert time (food→restaurant, cultural→culture, etc.)
- Applied in `saveStopLibraryEntries` before every insert

### 3. Dedup key
- Unique index: `UQ_stop_library_normalized` on `(normalized_name, normalized_key)`
- Old index `UQ_stop_library_city_name` on `(normalized_key, name)` was dropped
- `onConflictDoUpdate` target updated in `saveStopLibraryEntries` and `stopLibrarySeeder`

### 4. PSI auto-seeding
- `psiTrigger.ts` exports `runPsiForStops`, `runPsiBackfill`, `runPsiForCity`
- `stopLibraryEnricher.ts` fires `runPsiBackfill()` fire-and-forget after enrichment completes
- For targeted backfills: `pnpm --filter @workspace/api-server run backfill:psi-cities` (edits `runPsiCities.ts`)

## DB migration notes
- Applied manually via SQL (drizzle push blocked by unrelated `trip_members_invite_token_unique` TTY prompt)
- Push will self-heal next time someone runs it from a TTY — the DB already matches the schema

**Why:** DC QA found 0 PSI records, 5 duplicate stops, food stop_type returning 0. These invariants ensure every new city gets correct data on first seed.
