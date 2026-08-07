---
name: stop_library.enrichment schema drift — Gate 2 silent empty-shell
description: Old-format logistics JSON in stop_library.enrichment causes Gate 2 to fire but write all-null PSI rows via an unsafe object cast.
---

## The Rule
If `stop_library.enrichment` is a non-null object whose keys do NOT match `PlacePlanningProfile` fields (e.g. it's old-format logistics data: `sensoryLoad`, `bestTimeOfDay`, `parkingAvailability`, etc.), Gate 2 in `findStopLibraryEnrichment` still fires because the object is truthy. The cast `row.enrichment as PlacePlanningProfile` succeeds silently; `buildIntelligenceValues` maps every field to `undefined → null`; a fully-null PSI row is written with `cached_at` set, making it look fresh and preventing re-enrichment.

**Why:** `findStopLibraryEnrichment` (stopEnrichmentService.ts) does `row.enrichment && typeof row.enrichment === 'object' ? row.enrichment as PlacePlanningProfile : null`. No field-presence validation before the cast.

**How to apply:**
- Any stop whose `stop_library.enrichment` was populated by an older backfill (pre-`PlacePlanningProfile` schema) will exhibit this. Symptom: `IntelligencePanel` header renders (truthy object passes the `intelligence &&` check) but body is entirely empty.
- Fix for affected stops: set `stop_library.enrichment = NULL` for the affected rows → Gate 2 misses → AI runs → real PSI written.
- Then run `psiScoreFourStops`-style targeted scoring to populate `kid_fit_score`, `final_score`, `role_assigned` (these are NOT in the AI prompt — they come from the scoring backfill).
- Long-term fix (not yet applied): add a field-presence guard in `findStopLibraryEnrichment` before returning the enrichment object — e.g. check that at least `rationaleShort` or `kidFitScore` is present, otherwise return null to let the AI run.
- Same unsafe cast exists in `callEnrichmentAI`: `JSON.parse(content) as PlacePlanningProfile` — if the AI schema drifts, another silent empty-shell batch can occur.
