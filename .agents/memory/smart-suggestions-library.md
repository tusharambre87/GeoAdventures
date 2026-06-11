---
name: smart-suggestions library-first pattern
description: For kids/landmark contexts in /api/travel/stops/smart-suggestions, always query stop_library before AI; return early if enough results.
---

# Smart-Suggestions: Library-First for Kids / Landmarks

## The rule
For `context === 'fun'` (kids) and non-food/non-break contexts (landmarks), query the `stop_library` FIRST. Return early if ≥4 results found. Use AI only as a supplement for sparse cities. Always save library results so the catch block can use them as fallback.

## Why
gpt-5-mini `invalid_request_error` (response_format rejection) was silently causing the catch block to fire → `setOptions([])` → "No stops found". The stop_library has rich data for well-seeded cities (DC, NYC, etc.) and is milliseconds vs seconds for AI calls.

## How to apply
- libTypes for kids: `['playground', 'park', 'zoo', 'aquarium', 'adventure', 'kid_attraction', 'nature', 'anchor', 'support', 'other', 'attraction']`
- libTypes for landmarks: `['landmark', 'museum', 'park', 'zoo', 'aquarium', 'nature', 'anchor', 'historic', 'attraction', 'art', 'support', 'other']`
- City matching: first try `ilike(city, '%${cityFirst}%')` where cityFirst is `destination.split(',')[0]`. If <4 results, retry with `ilike(city, '%${cityWord}%')` where cityWord is the first space-delimited word (e.g. "Washington" for "Washington DC").
- Hoist `let libNearby/libPopular = []` OUTSIDE the try block so catch block can return them as graceful degradation.
- Return early when `libRows.length >= 4` — no AI call needed.
- The `nearby` response shape is what the mobile client expects: `{ nearby: StopOption[], popular: StopOption[] }`.
