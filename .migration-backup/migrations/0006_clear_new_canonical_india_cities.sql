-- Clear city_stop_pool_cache for the 10 newly canonicalized Indian cities.
-- These cities previously had AI-generated stop pools; now they use the
-- "package-first → AI-refined" canonical template engine, so their cached
-- pools must be regenerated against the new templates on next access.
--
-- Run this migration after deploying the plannerService.ts changes that add
-- INDIA_CANONICAL_ITINERARIES entries for these cities.

DELETE FROM city_stop_pool_cache
WHERE country = 'India'
  AND city IN (
    'Manali',
    'Shimla',
    'Darjeeling',
    'Varanasi',
    'Amritsar',
    'Coorg',
    'Hyderabad',
    'Kolkata',
    'Alleppey',
    'Pondicherry'
  );

-- Secondary clear: Kolkata Day 3 updated — Kalighat Temple replaced with
-- Birla Planetarium. Kalighat moved to optionalAlternatives (surfaces only
-- in the Replace Stop sheet, never as a default recommendation).
-- This is a no-op if Kolkata was already cleared above.
DELETE FROM city_stop_pool_cache
WHERE country = 'India' AND city = 'Kolkata';
