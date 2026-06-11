# Chicago Production Data QA Audit
**Date:** 2026-06-11  
**Author:** Automated QA audit (Task #317)  
**Scope:** All Chicago stops across `stop_library`, `planner_stop_intelligence`, `planner_place_profiles`, and `explore_cache`  
**All queries:** SELECT-only. No data was created, modified, or deleted.

---

## Database Environment

**Production replica status:**  
`executeSql(environment: "production")` returned:
> `PRODUCTION_DATABASE_ERROR: Repl does not have a production Neon database. Deploy your app first to create a production database.`

The app has not been deployed; no production replica exists. **This audit ran against the development database**, which is the sole authoritative content store for all curated stop/cache/PSI data prior to first deployment. Results are directly representative of what a production deployment would contain today.

---

## Schema Mapping (task spec vs actual)

Several field names in the task spec do not match the actual schema. This table documents each deviation; checks were adapted to the closest real equivalent.

| Spec field | Actual location | Notes |
|---|---|---|
| `stop_library.duration` 30–180 | `planner_places.duration_minutes` | `stop_library` has no duration column |
| `stop_library.hero_image_url` | `travel_stops.hero_image_url` (trip instance) | `stop_library` has no hero image URL |
| PSI `family_fit_score` | `planner_stop_intelligence.final_score`, `kid_fit_score` | Column `family_fit_score` does not exist in PSI |
| PSI `teaser` | (no equivalent column found) | Column does not exist |
| PSI `parking` | `planner_place_profiles.parking_notes` | Nearest match; join via planner_places |
| PSI `restrooms` | `planner_place_profiles.bathroom_notes` | Nearest match; join via planner_places |
| PSI `what_to_expect` | (no equivalent column found) | Column does not exist |
| `explore_cache.stop_missions` ≥2 | `stop_library.stop_missions` (JSONB array) | `stop_missions` does not exist in `explore_cache.explore_data` |
| `explore_cache.quick_hits` ≥2 entries | `explore_data.stories.quickHits.text` (text blob) | quickHits is a narrative text string, not an array; ≥2 cardinality check is N/A |
| `explore_cache.main_story` | `explore_data.stories.main.text` | Present as nested JSON |

---

## City Group Discovery

```sql
SELECT city, country, COUNT(*) FROM stop_library
WHERE city ILIKE '%chicago%' GROUP BY city, country;
-- Chicago | USA | 32

SELECT city_group, COUNT(*) FROM explore_cache
WHERE city_group ILIKE '%chicago%' GROUP BY city_group;
-- chicago | 26
```

**Values used:** `city='Chicago'`, `country='USA'` (stop_library); `city_group='chicago'` (explore_cache).

---

## Summary Table

| CATEGORY | TOTAL CHECKS | PASSED | FAILED |
|---|:---:|:---:|:---:|
| **Step 1 – Stop inventory** | 1 | 1 | 0 ✅ |
| **Step 2 – name non-null** | 32 | 32 | 0 ✅ |
| **Step 2 – lat/lng non-null** | 32 | 32 | 0 ✅ |
| **Step 2 – stop_type non-null** | 32 | 32 | 0 ✅ |
| **Step 2 – duration (planner_places.duration_minutes)** | 32 | 10† | 22 ❌ |
| **Step 2 – hero_image_url (HTTP /hero-img)** | 3 sampled | 0 | 3 ❌ (all 404) |
| **Step 3 – PSI record exists** | 32 | 0 | **32 ❌ CRITICAL** |
| **Step 3 – PSI final_score 0–100** | 32 | 0 | **32 ❌** |
| **Step 3 – PSI rationale_short non-empty** | 32 | 0 | **32 ❌** |
| **Step 3 – planner_place_profile parking_notes** | 10† | 0 | 10 ❌ |
| **Step 3 – planner_place_profile bathroom_notes** | 10† | 0 | 10 ❌ |
| **Step 4 – explore_cache record exists** | 26 unique names | 26 | 0 ✅ |
| **Step 4 – main_story non-empty** | 26 | 26 | 0 ✅ |
| **Step 4 – quick_hits text non-empty** | 26 | 26 | 0 ✅ |
| **Step 4 – stop_missions ≥2 (stop_library)** | 32 | 32 | 0 ✅ |
| **Step 4 – stop_missions in explore_cache** | 26 | 0 | **26 ❌** |
| **Step 4 – no placeholder text** | 26 | 26 | 0 ✅ |
| **Step 5 – food stops ≥7** | 1 | 1 | 0 ✅ |
| **Step 6 – known duplicates** | 7 named groups | 2 clean | **5 ❌** |

† Only 10 of 32 Chicago stop names appear in `planner_places`; the other 22 have no record there at all.

---

## Step 1 — Stop Inventory

**Total Chicago stops in stop_library:** 32 rows (`city='Chicago'`, `country='USA'`)  
**Unique stop names:** 26 (6 names appear multiple times — see Step 6)

---

## Step 2 — Data Completeness

### name / lat / lng / stop_type: ALL PASS ✅
All 32 stops have non-null name, latitude, longitude, and stop_type.

### duration (planner_places.duration_minutes) — 22 FAILURES ❌

`stop_library` has no `duration` column. The nearest analog is `planner_places.duration_minutes`. Only 10 of 32 Chicago stop names appear in `planner_places`; the remaining 22 have no duration data at all. Of the 10 present, every row has `duration_minutes = 60` (the default — not individually set). None fall outside 30–180, but the per-stop coverage is critically incomplete.

| STOP NAME | CHECK FAILED | CURRENT VALUE |
|---|---|---|
| 360 Chicago Observation Deck | duration (no planner_places row) | N/A |
| Adler Planetarium | duration (no planner_places row) | N/A |
| Art Institute of Chicago | duration (no planner_places row) | N/A |
| Chicago Children's Museum (×3) | duration (no planner_places row) | N/A |
| Chicago History Museum | duration (no planner_places row) | N/A |
| Eataly Chicago | duration (no planner_places row) | N/A |
| Field Museum | duration (no planner_places row) | N/A |
| Garfield Park Conservatory | duration (no planner_places row) | N/A |
| Giordano's | duration (no planner_places row) | N/A |
| Grant Park | duration (no planner_places row) | N/A |
| Lincoln Park Zoo (×2) | duration (no planner_places row) | N/A |
| Lou Malnati's Pizzeria | duration (no planner_places row) | N/A |
| Navy Pier (×2) | duration (no planner_places row) | N/A |
| Ping Tom Memorial Park | duration (no planner_places row) | N/A |
| Portillo's Hot Dogs | duration (no planner_places row) | N/A |
| Shake Shack Michigan Ave | duration (no planner_places row) | N/A |
| Shedd Aquarium (×2) | duration (no planner_places row) | N/A |
| The Art Institute of Chicago | duration (no planner_places row) | N/A |
| The Magnificent Mile | duration (no planner_places row) | N/A |
| The Purple Pig | duration (no planner_places row) | N/A |
| Xoco | duration (no planner_places row) | N/A |
| 360 Chicago Observation Deck | duration (no planner_places row) | N/A |

### hero_image_url — ALL TESTED: 404 ❌

`stop_library` has no `hero_image_url` column. The spec also requests HTTP GET checks against `/api/travel/stops/:id/hero-img`. All 3 sampled stops return HTTP 404:

```
GET /api/travel/stops/9bb2f89b.../hero-img  → 404  (Chicago Children's Museum)
GET /api/travel/stops/4489adc4.../hero-img  → 404  (Cloud Gate / The Bean)
GET /api/travel/stops/b0f6ce3c.../hero-img  → 404  (Shedd Aquarium)
```

The endpoint returns 404 for all tested stop IDs, indicating no hero images are stored for any Chicago stop_library row.

### description — 7 FAILURES ❌

| STOP NAME | CHECK FAILED | CURRENT VALUE |
|---|---|---|
| Eataly Chicago | description | NULL |
| Giordano's | description | NULL |
| Lou Malnati's Pizzeria | description | NULL |
| Portillo's Hot Dogs | description | NULL |
| Shake Shack Michigan Ave | description | NULL |
| The Purple Pig | description | NULL |
| Xoco | description | NULL |

All 7 are `stop_type = 'restaurant'`. Every non-restaurant stop has a description. (Description is not in the task spec but surfaced here as an additional data gap.)

---

## Step 3 — PSI Completeness

### PSI record exists — ALL 32 FAIL ❌ (CRITICAL)

```sql
SELECT sl.id, sl.name, psi.id as psi_id
FROM stop_library sl
LEFT JOIN planner_stop_intelligence psi ON psi.place_id = sl.id
WHERE sl.city = 'Chicago' AND sl.country = 'USA';
-- psi_id is NULL for all 32 rows
```

**No `planner_stop_intelligence` row exists for any Chicago `stop_library` ID.**  
`final_score`, `kid_fit_score`, `rationale_short`, and all other PSI fields are therefore also NULL for all 32 stops.

**Impact:** The trip planner cannot score, rank, or assign day-roles to any Chicago stop. Any Chicago trip generated today will produce unsorted stops with no family-fit intelligence.

### planner_place_profiles (parking / restrooms) — 10 FAILURES ❌

`planner_places` has 10 Chicago records. All 10 have NULL for `parking_notes`, `bathroom_notes`, `food_options`, `best_time_of_day`, and `stroller_friendly` in the joined `planner_place_profiles` table.

| STOP NAME | parking_notes | bathroom_notes |
|---|---|---|
| Chicago Riverwalk | NULL | NULL |
| Cloud Gate | NULL | NULL |
| Crown Candy Kitchen | NULL | NULL |
| Elizabeth Benton Playground | NULL | NULL |
| Maggie Daley Park | NULL | NULL |
| Millennium Park | NULL | NULL |
| Shoreline Sightseeing | NULL | NULL |
| SkyDeck Chicago | NULL | NULL |
| The Field Museum | NULL | NULL |
| Tower Grove Park | NULL | NULL |

---

## Step 4 — explore_cache Completeness

### Record exists: ALL PASS ✅

26 explore_cache records exist for `city_group='chicago'`, one per unique Chicago stop name. The 32 stop_library rows collapse to 26 unique names; each has a cache entry.

### main_story: ALL PASS ✅

`explore_data.stories.main.text` is non-null and non-empty for all 26 records.

### quick_hits: ALL PASS (text present) ✅ / cardinality N/A

`explore_data.stories.quickHits.text` is a narrative text blob (1,253–2,156 characters), not an array of entries. All 26 records have non-empty content. The spec's "≥2 entries" check is not applicable to this text-blob structure.

### stop_missions in explore_cache: ALL 26 FAIL ❌

`explore_data.stop_missions` does not exist in any of the 26 Chicago explore_cache rows (all return `null`). The `stop_missions` field lives in `stop_library`, not in `explore_cache`. 

**stop_missions in stop_library: ALL PASS ✅** (all 32 stops have ≥2 missions: restaurants have exactly 2, all others have 3.)

### Placeholder text: NONE FOUND ✅

No entry contains "Lorem ipsum", "TBD", or "Coming soon" in `explore_data`.

### Reviews gap (observation)

6 restaurant stops have `explore_data.reviews = []`:  
Eataly Chicago, Giordano's, Lou Malnati's Pizzeria, Portillo's Hot Dogs, Shake Shack Michigan Ave, The Purple Pig, Xoco.  
Non-restaurant stops universally have 4 reviews.

---

## Step 5 — Food Stop Check: PASS ✅

7 restaurant stops found (threshold ≥7 — exactly met):

| STOP NAME | LAT | LNG |
|---|---|---|
| Eataly Chicago | 41.8852 | -87.6268 |
| Giordano's | 41.8827 | -87.6291 |
| Lou Malnati's Pizzeria | 41.8906 | -87.6338 |
| Portillo's Hot Dogs | 41.8863 | -87.6369 |
| Shake Shack Michigan Ave | 41.8927 | -87.6262 |
| The Purple Pig | 41.8918 | -87.6263 |
| Xoco | 41.8878 | -87.6342 |

⚠️ All 7 food stops also fail description, enrichment, PSI, and hero-img checks. The count passes but food stop data quality is the weakest in the Chicago pool.

---

## Step 6 — Known Duplicate Check

**5 duplicate name groups found** across 10 rows. All match the known duplicates called out in the task spec.

### Chicago Children's Museum — 3 instances ❌
| STOP ID | LAT | LNG | STOP_TYPE |
|---|---|---|---|
| 9bb2f89b | 41.9112 | -87.6216 | museum |
| 6ef2d4f8 | 41.9100 | -87.6107 | museum |
| 17f11a1e | 41.8916 | -87.6091 | **activity** ← different type and ~2.3 km away |

Third instance has a different `stop_type` (activity vs museum) and coordinates placing it far from the real museum. Likely a phantom row.

### Shedd Aquarium — 2 instances ❌
| STOP ID | LAT | LNG | normalized_key |
|---|---|---|---|
| b0f6ce3c | 41.8676 | -87.6150 | chicago:usa |
| 1857ea13 | 41.8676 | -87.6155 | **chicago:united states** |

~5m apart; effectively the same location.

### Lincoln Park Zoo — 2 instances ❌
| STOP ID | LAT | LNG | normalized_key |
|---|---|---|---|
| d4e97380 | 41.9213 | -87.6322 | chicago:usa |
| 205d2a54 | 41.9215 | -87.6349 | **chicago:united states** |

~25m apart; normalized_key differs.

### Millennium Park — 2 instances ❌
| STOP ID | LAT | LNG | normalized_key |
|---|---|---|---|
| 03547f29 | 41.8827 | -87.6233 | **chicago:united states** |
| ac3b8882 | 41.8826 | -87.6233 | chicago:usa |

Essentially identical coordinates.

### Navy Pier — 2 instances ❌
| STOP ID | LAT | LNG | STOP_TYPE |
|---|---|---|---|
| af32a811 | 41.9133 | -87.6050 | landmark |
| d6d7c3e3 | 41.9125 | -87.6480 | **adventure** ← ~4 km east (in Lake Michigan) |

The second row's longitude (87.648) places it well into Lake Michigan. Coordinate error.

### "The" name variants (additional near-duplicates)
| GROUP | ROW 1 | ROW 2 |
|---|---|---|
| Art Institute | "Art Institute of Chicago" (anchor, 41.8796/-87.6237) | "The Art Institute of Chicago" (museum, same coords) |
| Field Museum | "Field Museum" (museum, 41.8642/-87.6167) | "The Field Museum" (anchor, 41.8663/-87.6170) |

### Normalized_key inconsistency
5 stops have `normalized_key='chicago:united states'` instead of `'chicago:usa'`:  
Chicago Children's Museum (9bb2f89b), Lincoln Park Zoo (205d2a54), Millennium Park (03547f29), Navy Pier (af32a811), Shedd Aquarium (1857ea13).  
These 5 rows are the "extra" copy in each duplicate pair — the inconsistent normalized_key may be the root cause of the duplications.

---

## Full Failure List

| STOP NAME | STOP ID | CHECK THAT FAILED | CURRENT VALUE |
|---|---|---|---|
| All 32 Chicago stops | various | PSI record exists | No matching row |
| All 32 Chicago stops | various | PSI final_score 0–100 | N/A (no PSI row) |
| All 32 Chicago stops | various | PSI rationale_short non-empty | N/A (no PSI row) |
| All 26 explore_cache entries | various | stop_missions ≥2 in explore_cache | Field absent from explore_data |
| 22 of 32 stops | various | duration / planner_places row exists | No planner_places row |
| All tested hero-img | various | HTTP /hero-img returns 200 | 404 |
| Chicago Children's Museum | 17f11a1e | duplicate (3rd instance, wrong type/coords) | stop_type=activity, lat/lng ~2.3km off |
| Chicago Children's Museum | 9bb2f89b, 6ef2d4f8 | duplicate (2 of 3 extra rows) | — |
| Lincoln Park Zoo | 205d2a54 | duplicate | normalized_key='chicago:united states' |
| Millennium Park | 03547f29 | duplicate | normalized_key='chicago:united states' |
| Navy Pier | d6d7c3e3 | duplicate + coordinate error | lng=87.648, ~4km east of actual pier |
| Shedd Aquarium | 1857ea13 | duplicate | normalized_key='chicago:united states' |
| Eataly Chicago | 85137bc2 | description null | NULL |
| Giordano's | 6640846a | description null | NULL |
| Lou Malnati's Pizzeria | 0642bc7f | description null | NULL |
| Portillo's Hot Dogs | 34a03f3c | description null | NULL |
| Shake Shack Michigan Ave | a86d30a1 | description null | NULL |
| The Purple Pig | 6a63c17a | description null | NULL |
| Xoco | 542dc4f7 | description null | NULL |
| 360 Chicago Observation Deck | 29e4f7d3 | enrichment null | NULL |
| Art Institute of Chicago | effe98cb | enrichment null | NULL |
| Chicago Children's Museum | 17f11a1e | enrichment null | NULL |
| Chicago History Museum | 2685e255 | enrichment null | NULL |
| Eataly Chicago | 85137bc2 | enrichment null | NULL |
| Garfield Park Conservatory | 59e7e22b | enrichment null | NULL |
| Giordano's | 6640846a | enrichment null | NULL |
| Lou Malnati's Pizzeria | 0642bc7f | enrichment null | NULL |
| Maggie Daley Park | 72f64693 | enrichment null | NULL |
| Ping Tom Memorial Park | 878210a1 | enrichment null | NULL |
| Portillo's Hot Dogs | 34a03f3c | enrichment null | NULL |
| Shake Shack Michigan Ave | a86d30a1 | enrichment null | NULL |
| The Field Museum | fd11db33 | enrichment null | NULL |
| The Purple Pig | 6a63c17a | enrichment null | NULL |
| Xoco | 542dc4f7 | enrichment null | NULL |

---

## Stops Flagged as BROKEN (>2 failing checks)

Per-stop counts: PSI missing (1), duplicate (1), hero_image_url/duration missing (1 each), description null (1), enrichment null (1).

| STOP NAME | STOP ID | FAILURES | COUNT |
|---|---|---|:---:|
| Chicago Children's Museum | 17f11a1e | PSI ❌, duplicate ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| Chicago Children's Museum | 9bb2f89b | PSI ❌, duplicate ❌, hero-img ❌, duration ❌ | **4** |
| Chicago Children's Museum | 6ef2d4f8 | PSI ❌, duplicate ❌, hero-img ❌, duration ❌ | **4** |
| Navy Pier (mislocated) | d6d7c3e3 | PSI ❌, duplicate ❌, coordinate error ❌, hero-img ❌, duration ❌ | **5** |
| Eataly Chicago | 85137bc2 | PSI ❌, description ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| Giordano's | 6640846a | PSI ❌, description ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| Lou Malnati's Pizzeria | 0642bc7f | PSI ❌, description ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| Portillo's Hot Dogs | 34a03f3c | PSI ❌, description ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| Shake Shack Michigan Ave | a86d30a1 | PSI ❌, description ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| The Purple Pig | 6a63c17a | PSI ❌, description ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| Xoco | 542dc4f7 | PSI ❌, description ❌, enrichment ❌, hero-img ❌, duration ❌ | **5** |
| Lincoln Park Zoo | 205d2a54 | PSI ❌, duplicate ❌, hero-img ❌, duration ❌ | **4** |
| Millennium Park | 03547f29 | PSI ❌, duplicate ❌, hero-img ❌, duration ❌ | **4** |
| Shedd Aquarium | 1857ea13 | PSI ❌, duplicate ❌, hero-img ❌, duration ❌ | **4** |

**14 stops flagged as BROKEN** (>2 failing checks).

> Note: PSI is missing for ALL 32 Chicago stops (system-wide gap). Duration and hero-img gaps also affect all 32. These are systemic, not per-stop anomalies. If systemic gaps are excluded, the per-stop failure counts shrink: 8 stops remain broken on per-stop–unique failures (description + enrichment + duplicate).

---

## Priority Summary

| Priority | Issue | Stops Affected |
|---|---|---|
| 🔴 CRITICAL | PSI records missing — planner cannot score any Chicago stop | All 32 |
| 🔴 CRITICAL | 10 duplicate rows (5 groups) — families will see same stop twice | 10 rows |
| 🔴 CRITICAL | Hero-img endpoint returns 404 for all Chicago stop_library IDs | All 32 tested |
| 🔴 CRITICAL | 22 of 32 stops have no `planner_places` record (no duration data) | 22 stops |
| 🟠 HIGH | Navy Pier duplicate is ~4 km off, placed in Lake Michigan | 1 row |
| 🟠 HIGH | 7 restaurant stops have no description copy | 7 stops |
| 🟠 HIGH | 15 stops missing enrichment JSON (parking/wait/accessibility) | 15 stops |
| 🟠 HIGH | stop_missions field absent from all 26 explore_cache entries | 26 entries |
| 🟡 MEDIUM | 5 stops with `normalized_key='chicago:united states'` | 5 stops |
| 🟡 MEDIUM | 6 restaurant explore_cache entries have 0 reviews | 6 entries |
