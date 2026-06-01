---
name: At Stop data shape and placeProfileData architecture
description: How placeProfileData reaches (or doesn't) the execution layer — critical for Nearby Essentials sheets
---

## The architecture gap

`travelStops` DB table has NO `placeProfileData` column — only `metadata: jsonb` (StopExecutionSnapshot).

`placeProfileData` (including `nearbyStops`) lives on:
- `plannerTripPlanStops.placeProfileData` — planner world
- `plannerPlaceProfiles.nearbyStops` — separate enrichment table

`StopExecutionSnapshot` (stored in `travelStops.metadata`) does NOT include `nearbyStops` or the full profile. It only copies: `practicalHighlights`, `strollerFriendly`, `foodNearby`, `parkingSignal`, etc.

**Why:** Snapshot bridge (snapshotBridge.ts) was never updated to copy nearbyStops.

## The fix (as of 2026-06-01)

In `GET /api/travel/trips/:tripId` (routes.ts ~line 6454): batch-join `plannerTripPlanStops` via `metadata.plannerStopId` and inject `placeProfileData` onto each stop response.

**Limitation**: Most existing trips were created BEFORE the snapshot bridge, so `metadata.plannerStopId` is null. The join only works for planner-linked trips (trips where `plannerTripPlans.experienceTripId` is set). The Barcelona trip is the only current example.

## Data quality of existing nearbyStops

Old planner trips: `nearbyStops` is `string[]` — plain names like `["Barcelona Zoo", "El Born District"]`. No type/distance/description.

New planner trips (post 2026-06-01 prompt update): `nearbyStops` is structured objects `{name, distance, description, agesNote?, type}`.

The `type` field drives category filtering in expect.tsx (Food/Break/Kids sheets).

## expect.tsx fallback chain

1. nearbyStops filtered by category type → best
2. All nearbyStops when filter finds nothing (avoids blank)
3. parseFoodOptions: "Name - distance - cuisine - price" strings → food sheet only; detected by presence of ' - '
4. Prose foodOptions (no ' - '): shown as a bordered note card above Maps CTA
5. Empty state: prominent orange Maps CTA "Find X near [stopName]" using lat/lon + sll param

## pProf reading in atstop.tsx

`const pProf = currentStop.placeProfileData ?? {}` — reads from API response. Since TravelStop has no placeProfileData column, this is only populated when the API join succeeds (planner-linked trips with plannerStopId in metadata).

## Existing DB state (2026-06-01)

- plannerTripPlanStops: 165 rows
- Only 1 trip (Barcelona) has plannerTripPlans.experienceTripId set → only Barcelona gets placeProfileData via join
- All other trips: pProf = {} → falls back to Maps CTA
