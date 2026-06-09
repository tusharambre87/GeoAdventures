---
name: stop_library dedup safety order
description: Safe procedure for deduplicating stop_library entries — must reassign live trip references before deleting any duplicate row.
---

## Rule

When deduplicating `stop_library` rows (e.g. Task #310 — DC / Chicago duplicates), the required order is:

1. **Reassign** — before deleting any duplicate, run:
   ```sql
   SELECT DISTINCT s.stop_library_id, count(*) as trip_count
   FROM travel_stops s
   WHERE s.stop_library_id IN ([list of IDs being deleted])
   GROUP BY s.stop_library_id;
   ```
   For any ID with `trip_count > 0`, UPDATE those `travel_stops` rows to point to the kept ID.

2. **Verify** — re-run the query and confirm 0 trips still reference the about-to-be-deleted IDs.

3. **Delete** — only now run the DELETE on the duplicate `stop_library` rows.

**Never delete first.** Skipping this order causes trips to silently lose stops with no error.

**Why:** `travel_stops` rows hold a `stop_library_id` FK. Deleting the library row orphans any in-progress trip stop, with no cascade error to alert you.

## Additional context

- Task #310 is parked until after beta launch — do not start it earlier.
- The dedup query (Step 4 in the task) is the critical step; the reassign check above must precede it.
