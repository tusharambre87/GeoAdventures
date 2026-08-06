---
name: RoamUs XP rank table — canonical location
description: Where the travel-themed 18-level rank table lives and how it's wired across web, mobile, and API server.
---

## The rule
`lib/api-client-react/src/rank.ts` is THE single source of truth for `ROAMUS_XP_RANKS` and `getRoamusRank()`. Nothing else defines rank names or thresholds.

**Why:** The old GeoQuest rank table (`EXPLORER_XP_RANKS` in schema.ts) drifted into CompassQuest.tsx twice. Moving the canonical definition to `lib/api-client-react` — already a dependency of both mobile and web — means every surface imports from one place with no possibility of a silent second copy.

## How it's wired

- `lib/api-client-react/package.json` exports `"./rank": "./src/rank.ts"` (scoped path avoids pulling in `custom-fetch.ts` browser types).
- `lib/db/src/schema/schema.ts` imports from `@workspace/api-client-react/rank` and re-exports backward-compat aliases (`EXPLORER_XP_RANKS`, `getExplorerRank`, `ELITE_XP_RANKS`, `ELITE_XP_THRESHOLD`) so all existing web/API-server consumers at `@shared/schema` continue working unchanged.
- `artifacts/roamus-mobile/app/(tabs)/me.tsx` imports `getRoamusRank` directly from `@workspace/api-client-react`.

## How to apply

- Any new surface that needs rank display: import from `@workspace/api-client-react` (mobile/web) or `@shared/schema` (web only). Never define a local rank table.
- Adding a new level: edit ONLY `lib/api-client-react/src/rank.ts`. All consumers see the change automatically.
- `lib/db` tsc check (`pnpm --filter @workspace/db exec tsc --noEmit`) must pass after any rank.ts edit.

## Table (18 levels, as of 2026-08-06)
| L | Name | minXp |
|---|------|-------|
| 1 | First Steps | 0 |
| 2 | Wanderer | 100 |
| 3 | Road Tripper | 300 |
| 4 | Trailblazer | 650 |
| 5 | Adventurer | 1,200 |
| 6 | Explorer | 2,000 |
| 7 | Journey Maker | 3,200 |
| 8 | Globe Chaser | 4,800 |
| 9 | Horizon Seeker | 7,000 |
| 10 | Master Traveler | 10,000 |
| 11 | Wayfinder | 14,000 |
| 12 | Voyage Legend | 19,000 |
| 13 (elite) | World Wanderer | 28,000 |
| 14 | Grand Voyager | 40,000 |
| 15 | Odyssey Master | 55,000 |
| 16 | Legendary Nomad | 72,000 |
| 17 | Trailblazing Icon | 88,000 |
| 18 | Ultimate Explorer | 100,000 |

`isElite = level >= 13`. `ROAMUS_ELITE_THRESHOLD = 28000`.
