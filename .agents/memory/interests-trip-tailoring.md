---
name: interests-trip-tailoring storage bug
description: How trip interests reach selectStopsFromPool — the bug and the fix
---

## The rule
`interests` passed at the top-level of `POST /api/travel/trips` body was NOT stored in the trip's `tailoring` JSONB column. The background stop generator reads `fullTrip.tailoring.interests`, so interests were always null and never boosted scoring.

**Fix (routes.ts ~line 6859):** Destructure `interests: rawInterests` from `req.body` and merge it into the stored tailoring object when `tailoring.interests` is not already set:
```typescript
const merged = (!base.interests && rawInterests && Array.isArray(rawInterests))
  ? { ...base, interests: rawInterests }
  : base;
```

**Why:** The mobile app sends interests at the top level of the request payload (not nested under `tailoring`). The routes.ts destructure didn't capture it, so it was silently dropped.

**How to apply:** Any time trip interests behavior seems broken, check `trip.tailoring.interests` in the DB first — if null with a non-null request, this was the cause.

## Redundant note
There is already an emoji-strip transform at routes.ts ~line 5656 before `selectStopsFromPool` (`i.replace(/\s*[^\w\s].*$/, '').trim().toLowerCase()`), so the plannerService.ts fix (replacing `toLowerCase` with a non-ASCII strip) is redundant but harmless.
