---
name: unplacedStops UI contract
description: BucketResult.unplacedStops must surface in the flat review screen when Step 3 is built — not be silently discarded.
---

## Rule

When the flat stop-review screen (Step 3 of the planner edit flow) is built, it **must** surface `unplacedStops` to the user — not silently discard them.

**Why:** `bucketStopsTodays` returns `BucketResult { buckets, unplacedStops }`. Stops in `unplacedStops` were evaluated against every day and could not be placed due to leg-cap or score competition. If the review screen ignores this array, users who selected stops see them vanish from their itinerary with no explanation — exactly the invisible-data-loss problem the redesign was built to eliminate.

**How to apply:**

- The review screen receives `BucketResult`, not bare `DayBucket[]`.
- If `unplacedStops.length > 0`, show a distinct "Couldn't fit these in" section (exact copy TBD) — separate from `closedShort` days, which are a per-day shortfall signal, not a per-stop one.
- `closedShort` and `unplacedStops` are complementary, not redundant: a stop can appear in `unplacedStops` *because* of `closedShort` days (e.g. Lamar Valley in Grizzly/Wolf test), but they each serve different UX purposes (day-level vs. stop-level feedback).
- Do not merge them into one UI bucket — they answer different user questions ("why is Day 2 short?" vs. "where did Hayden Valley go?").
