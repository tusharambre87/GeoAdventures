---
name: Pool path skips distributeStopsToDays
description: Why the pool trip-generation path must bypass distributeStopsToDays to preserve anchor-per-day balance
---

## The Rule

In the pool trip-generation path (`routes.ts` around the `[Travel] [bg] Pool hit` branch), do **not** call `distributeStopsToDays` on the stops returned by `selectStopsFromPool`. Use the stops directly — their `dayNumber` values are already correct.

## Why

`selectStopsFromPool` assigns `dayNumber` to every stop using its anchor-constrained greedy algorithm (exactly `anchorsPerDay` anchors per day). But `distributeStopsToDays` ignores existing `dayNumber` values and re-assigns them by filling each day to its cap before advancing:

- `arrivalDayCap` = `stopsPerDayByPace` (e.g. 4 for balanced) when no arrival time is specified
- `effectivePerDay` = `Math.max(2, stopsPerDayByPace - 1)` = 3 when a toddler is present

With `caps = [4, 3, 4]` and 9 stops (3 per day from the pool), the first 4 stops all land on Day 1 — stealing the first stop of Day 2 (which was an anchor) and creating a 3-anchor Day 1.

## How to Apply

Pool path only. The AI path still calls `distributeStopsToDays` correctly (AI doesn't pre-assign `dayNumber`).

In `routes.ts`, after filtering meals from `activityOnlyStops`:

```typescript
// CORRECT — trust dayNumber from selectStopsFromPool
const rawDistributedPoolStops = activityOnlyStops;

// WRONG — overwrites dayNumbers using mismatched caps
const rawDistributedPoolStops = distributeStopsToDays(
  activityOnlyStops.slice(0, effectiveStopCount),
  plannerTripDays,
  arrivalDayCap,   // ← this can be > effectivePerDay
  lastDayCap,
  effectivePerDay,
);
```

**Side effect of fix**: arrival/departure day caps are no longer applied in the pool path (Day 1 gets `effectivePerDay` stops even if arrival is in the evening). Acceptable until pool path gets per-day cap awareness.
