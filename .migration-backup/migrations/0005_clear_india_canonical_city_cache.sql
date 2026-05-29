-- Migration: Clear city_stop_pool_cache for canonical Indian cities
-- Date: 2026-04-17
-- Reason: Task #78 introduced the "package-first" canonical itinerary engine for 10 Indian
--         cities. Existing cached stop pools for these cities were generated with the old
--         AI-only approach and do not reflect the canonical templates.
--         Clearing these rows ensures the next trip creation for any of these cities
--         triggers generateCityStopPool() (fire-and-forget), which will re-seed the pool
--         using the new template-first prompts.
--
-- Cities cleared (11 rows): Goa, Ooty, Mysore, Jaipur, Delhi, Agra, Udaipur, Mumbai,
--                            Bangalore, Kochi, Munnar
--
-- NOTE: This migration is idempotent — if already applied, it safely deletes 0 rows.

DELETE FROM city_stop_pool_cache
WHERE LOWER(city) IN (
  'goa',
  'ooty',
  'mysore',
  'jaipur',
  'delhi',
  'agra',
  'udaipur',
  'mumbai',
  'bangalore',
  'kochi',
  'munnar'
);
