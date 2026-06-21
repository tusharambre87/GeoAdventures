# RoamUs / GeoAdventures — Cowork Instructions

## What this repo is
RoamUs (externally branded GeoAdventures) — a family travel app for parents with kids 4–12.
Positioning: "We don't help you plan trips. We help your family actually enjoy them."

**Monorepo structure:**
- `artifacts/roamus-mobile/` — Expo Go / React Native mobile app (file-based routing)
- `artifacts/api-server/src/` — Node.js backend, live at `geoquestgame.live`
- `artifacts/api-server/src/planner/` — all trip generation logic lives here
- `artifacts/api-server/src/routes/routes.ts` — main API routes file

**Database:** Neon PostgreSQL (shared between RoamUs and GeoAdventures legacy — same DB)
**Deploy:** Replit (two projects — RoamUs active, GeoAdventures legacy)

---

## Non-negotiable working rules

1. **One change at a time.** Never fix multiple things in one pass. Implement exactly what was asked, nothing else.
2. **Never touch onboarding.** `artifacts/roamus-mobile/app/onboarding/` — leave it alone always.
3. **No Modal components anywhere in React Native.** Use absolute `Animated.View` with `activeSheet` state only. Any Modal will cause sheet stacking bugs.
4. **Emoji must be pasted literally in JSX.** Never unicode escape sequences.
5. **Surgical edits only.** No broad rewrites. Change the minimum lines needed.
6. **Never run two database backfills simultaneously.** Neon connection pool exhaustion kills both.
7. **Screenshot confirmation before next step.** Don't proceed to next fix without confirmation.
8. **Never change things that weren't asked for.**

---

## Critical database facts

### PSI join path — NEVER shortcut this
```sql
-- WRONG: returns zero rows
stop_library → planner_stop_intelligence

-- RIGHT: always 3-table join
stop_library → planner_places → planner_stop_intelligence
JOIN: LOWER(TRIM(pp.name)) = LOWER(TRIM(sl.name)) AND LOWER(TRIM(pp.city)) = LOWER(TRIM(sl.city))
```

### Key tables
- `stop_library` — ~1,263 US stops. Has `latitude varchar`, `longitude varchar` (nullable). No `duration_class` column.
- `planner_places` — intermediary. Has `duration_minutes`. Join by name+city text match.
- `planner_stop_intelligence` — PSI scores, keyed to `planner_places.id`. Has `manually_overridden boolean` — NEVER update rows where this is true.
- `explore_cache` — keyed on `(normalized_name, city_group, age_band)`. THREE rows per stop. `city_group` is LOWERCASE; `stop_library.city` is Title Case — join needs `LOWER(sl.city)`.
- `travel_trips` — has `current_day_index` (nullable int) for day lifecycle. Has `parent_suggestions` JSONB.
- `travel_stops` — per-trip stop instances. Has `addedByParent boolean`.
- `city_stop_pool_cache` — column is `city` not `city_name`. Delete after ANY PSI score or duration change.

### After any PSI or duration change
```sql
DELETE FROM city_stop_pool_cache; -- always, no exceptions
```

### explore_cache data structure
Single `explore_data` JSONB column. NOT separate columns. Never assume column names other than `explore_data`.

---

## Critical planner architecture

### File: `artifacts/api-server/src/planner/plannerService.ts`

**`getStopsPerDay(pace)`** — line ~528:
```
chill: 3, balanced: 3, packed: 5
```
Food stops are ALWAYS additive on top. Never count food in pace-based stop counts.

**`selectStopsFromPool(pool, input, qualityProfile?, targetCity?)`** — line ~2469:
- Returns `{ stops, parentSuggestions }` — NOT a flat array
- `effectiveStopsPerDay` = `stopsPerDay` unless `napActive` (youngest child < 3)
- Geographic enforcement uses haversine — only fires when BOTH last stop AND candidate have non-null lat/lng
- `usedNormNames` Set prevents exact name duplicates but NOT proximity duplicates
- `IMMERSIVE_TYPES = ['museum', 'zoo', 'aquarium', 'activity', 'palace']` — max 1 per day with durationMinutes ≥ 90
- `isMealType` stops are hard-skipped during activity selection, appended after

**`haversineKm(lat1, lon1, lat2, lon2)`** — line ~2409. Already exists, use it everywhere.

**Leg caps:**
- chill: single leg ≤ 20 min, daily ≤ 60 min
- balanced: single leg ≤ 40 min, daily ≤ 90 min
- packed: single leg ≤ 40 min, daily ≤ 120 min

**Travel speed estimates:**
- driving: 35 km/h
- walking: 5 km/h
- transit: 20 km/h

### Pool key format
`buildCityPoolKey()` must be used at all 7 key-construction points.
DC pool key: `"washington dc:usa"` (lowercase, no extra spaces)

### Trip generation rules
- `tripDays` must use `?? 2` not `|| 2` (falsy bug caused empty days)
- Food stops always additive — never in pace stop counts
- Pace selection takes priority over child age for stop count
- `parentSuggestions`: stops where `minAge > youngestAge + 2` that score above 60th percentile

---

## React Native architecture (mobile app)

### Sheet pattern (locked)
- **NO Modal components** — use absolute `Animated.View` with `activeSheet` state
- `StopPreviewSheet`: zIndex 302
- `RescueSheet overlay`: zIndex 300, sheet: 301
- Fragment pattern in `today.tsx` — StopPreviewSheet hoisted outside root View

### Tab layout
- `ClassicTabLayout` forced in `_layout.tsx` — NativeTabs bypassed (iOS 26 Liquid Glass incompatible with RN absolute views)

### Component locations (mobile)
- `artifacts/roamus-mobile/app/` — screens (file-based routing)
- `artifacts/roamus-mobile/components/` — shared components
- `ParentSuggestionsSection.tsx` — in components, rendered in `trip/[tripId].tsx` as ListFooterComponent

---

## Design system (never deviate)

```
Colors:
  orange:   #E8692A  (primary CTA, active tab)
  bg:       #F5F2EE
  card:     #FFFFFF
  deep:     #1A1F2E  (primary text)
  muted:    #8A8FA8
  sage:     #7A9E8E
  amber:    #F5A623
  green:    #3DAA6E
  purpleLt: #F0EBFF
  purple:   #6B4FA8
  red:      #E8433A
  kidsPurple: #7C3AED

Fonts:
  Body: Plus Jakarta Sans
  Display moments: Fraunces (serif)

Wordmark: Georgia serif "Roam" in deep + "Us" in orange. No icon.
Buttons: border-radius 13px, orange shadow rgba(232,105,42,0.28)
Tab bar: monochrome SVG icons, orange on active only
Kids screens: #7C3AED purple unified, warm cream #FFF8F0 for non-player screens
```

---

## What NOT to do

- Never use `Modal` in React Native — ever
- Never shortcut PSI join to 2 tables
- Never update `planner_stop_intelligence` rows where `manually_overridden = true`
- Never run backfill scripts simultaneously
- Never assume `city_stop_pool_cache` column is `city_name` — it's `city`
- Never put `duration_class` on `stop_library` — it doesn't exist there
- Never join `explore_cache` without `LOWER()` on city
- Never use unicode escape sequences for emoji in JSX
- Never touch onboarding files
- Never make changes beyond what was explicitly asked

---

## Common mistakes to avoid

**Geo enforcement silent bypass:** Geographic leg cap only fires when BOTH the previous stop AND candidate have non-null `latitude`/`longitude`. If first stop of day has null coords, entire day's geo sequencing is bypassed. Always ensure DC stops have lat/lng populated.

**explore_cache city case mismatch:** `city_group` in `explore_cache` is lowercase. `stop_library.city` is Title Case. Always use `LOWER(sl.city)` in joins.

**Pool cache not cleared:** Any PSI score change, duration change, or stop data change requires deleting `city_stop_pool_cache`. Without this, changes don't appear in new trips.

**parentSuggestions return shape:** `selectStopsFromPool()` returns `{ stops, parentSuggestions }`. Any code that treats the return value as a flat array will break silently.

---

## Current state (June 20, 2026)

### Working
- Day lifecycle gating (`current_day_index`, Start Day CTA)
- Rescue sheet (Animated.View, no Modal)
- StopPreviewSheet (real component, proper data binding)
- Interests system (emoji stripped before lookup)
- Anchor-aware PSI scoring
- DC iconic stops appearing (Lincoln Memorial, Zoo, Natural History)
- Explore cache (~1,266 stops × 3 age bands)
- ParentSuggestionsSection component (built, proximity-distributed by day)
- PostHog installed (EXPO_PUBLIC_POSTHOG_KEY in Replit secrets)

### Known issues to fix (in priority order)
1. Stop proximity dedup — Tidal Basin + Tidal Basin Paddle Boats on consecutive days
2. DC lat/lng null values causing geo enforcement silent bypass
3. Balanced pace → should be 3 activity stops (currently 4)
4. Apple Developer account ($99, developer.apple.com/enroll) — FOUNDER ACTION, blocks TestFlight/IAP/push

### Blocked on Apple Developer account
- IAP (RevenueCat)
- TestFlight
- Apple Sign In
- Push notifications
- PostHog verification
