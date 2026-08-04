---
name: selectStopsFromPool fill-up block behavior
description: The fill-up block (lines 3501-3510) rescues candidates after the greedy while loop without geo/duration checks — gates ⑫-⑮ alone cannot produce zero stops
---

## Rule
The fill-up block at lines 3501-3510 of plannerService.ts runs after the greedy while loop. It iterates `remaining` and adds any stop that doesn't hit the museum cap or nature cap — WITHOUT any distance, travel-time, or type-diversity check. This is intentional; the code has a TODO noting "Leg-cap and type-diversity are deliberately deferred."

**Why:** The fill-up was added as a safety net to ensure `selected.length >= totalStopsNeeded`. But because it bypasses geo/duration checks, it can produce geographically nonsensical trips (e.g. London filler after NYC anchor).

**How to apply:**
- Gates ⑫-⑮ (leg-cap, daily-travel-cap, etc.) in `findBest` CAN reject candidates in the greedy loop. But those candidates remain in `remaining` and will be added by fill-up if the count is still short.
- The actual zero-stop scenario is narrower: it requires `remaining` to be empty BEFORE the while loop starts. This happens when Pass-1 takes ALL candidates from `remaining` (pool size === totalAnchorsNeeded). The while loop condition `remaining.size > 0` is false; the loop never runs; anchors stored in `anchorsByDay` are never injected.
- The zero-stop guard added at both pool call-sites (`if (stops.length === 0) throw`) catches this narrow case correctly.
- The "sparse-but-wrong-geo" problem (fill-up adds geo-distant stops) is a separate unscoped issue requiring a post-selection resequencing pass or a fill-up geo check.

## Test coverage
`artifacts/api-server/src/planner/__tests__/selectStopsFromPool.test.ts` has 3 tests:
1. Zero-stop via Pass-1 exhausting remaining (1-anchor pool, stopsPerDayOverride=1)
2. Call-site guard throws on zero-stop result
3. Fill-up masking leg-cap gate (NYC anchor + London filler → 2 stops despite geo distance)
