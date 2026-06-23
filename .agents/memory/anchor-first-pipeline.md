---
name: Anchor-First Selection pipeline (Pass 1)
description: How Pass 1 pre-selection works, key invariants, PSI family_anchor_type contamination fix, and the two-layer anchor enforcement in the planner.
---

## Architecture

`selectStopsFromPool` in `plannerService.ts` runs a two-pass selection:

**Pass 1** (lines ~2843–2888): Pre-select the best N anchors round-robin across all days _before_ the greedy loop starts.
- `anchorsPerDay` from `getStopsPerDay(pace).anchors`: relaxed=1, moderate=2, busy=3
- With `stopsPerDayOverride`: `Math.ceil(override * 0.5)`
- Filters: `familyAnchorType === 'anchor'` AND `scoreClassicFinal >= 54`
- Sorted descending by score; distributed round-robin across days
- Pre-selected anchors are removed from `remaining` and stored in `anchorsByDay`

**Pass 2** (greedy loop): Injects `anchorsByDay[currentDay]` at the day-reset block with `continue` so the flat-index slot model stays correct. Anchor cap for the greedy loop = `anchorsPerDay` (NOT `anchorsPerDay + 1` — the +1 caused over-anchoring, fixed).

**AnchorConstraint** (lines ~3118–3159): Post-greedy safety net.
- If a day has 0 anchors → promote highest-scored stop to anchor
- If a day has > `anchorsPerDay` anchors → keep top-N by score, demote rest to "support"
- Must use `anchorsPerDay` as the cap (NOT hardcoded 1) or it undoes Pass 1

## familyAnchorType persistence

`familyAnchorType` lives in the in-memory `CachedStopCandidate` object (NOT a top-level DB column). It must be explicitly written to `travel_stops.metadata` JSONB at save time (routes.ts ~line 5770). If omitted, it reads back as NULL and all stops appear as "filler" in the API.

`distributeStopsToDays` uses `{ ...stop, dayNumber }` spread so all fields including `familyAnchorType` are preserved through day assignment.

## PSI family_anchor_type contamination (fixed)

**The problem:**
`planner_places.family_anchor_type` has a PostgreSQL-level DB default of `'support'`.
`findOrCreatePlace()` in psiTrigger.ts never set the field on INSERT → every auto-seeded city
got 'support' for all stops including museums, landmarks, and zoos. A past data migration
bulk-copied `planner_places.family_anchor_type → psi.family_anchor_type`. Cities not manually
curated before that migration (Chicago, Amsterdam, Milan, etc.) all got PSI `family_anchor_type = 'support'` for everything.

**Why PSI 'support' cannot be trusted:**
Indistinguishable from the DB-default contamination. Explicit values (anchor, meal, reset, filler) CAN be trusted — those were set intentionally.

**Fixes applied:**
1. **Pool builder (plannerService.ts):** `(psiType && psiType !== 'support') ? psiType : anchorTypeByStopType(stopType)` — treats PSI 'support' same as null; falls back to stop-type derivation.
2. **findOrCreatePlace (psiTrigger.ts):** Added `deriveAnchorType(stopType)` helper — mirrors `anchorTypeByStopType`; called at INSERT to set correct value for new planner_places rows.
3. **Data fix:** SQL UPDATE corrected planner_places for all landmark/museum/zoo/aquarium/adventure stops globally. `city_stop_pool_cache` cleared (102 entries across all cities).

**How to apply going forward:**
- If a new stop type should be "anchor", add it to BOTH `anchorTypeByStopType` (plannerService.ts) AND `deriveAnchorType` (psiTrigger.ts) — they must stay in sync.
- After any change to pool classification logic, DELETE FROM city_stop_pool_cache to force pool rebuilds.

## Pool key format

City stop pool cache table: `city_stop_pool_cache`, keyed on `normalized_key` (e.g. `washington dc:usa`, `chicago:usa`). NOT `explore_cache`.
`getCityStopPool` has 3 fallbacks: full key → city-only key → ILIKE on `city` column directly.

## Test user credentials

Test users created in sessions: password is `Test1234!` for `anchortest@roamus.test`, `testA_mpls@roamus.test`, etc.
Auth endpoint: `POST /api/auth/token` (not `/api/auth/login` or `/api/auth/register`).
Register: `POST /api/register` (requires `players: [{name, age: string}]`).
Duplicate-city guard prevents re-creating a trip for the same destination.

**Why:** Pass 1 ensures anchor quality is locked in before any filler selection, preventing high-scoring anchors from being displaced by greedy order. AnchorConstraint must honor `anchorsPerDay` or it silently reverts to 1-anchor-per-day regardless of pace.
