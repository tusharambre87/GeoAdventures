-- Migration 0007: Clear stop pool cache for 10 new Indian canonical cities
--
-- Cities gaining canonical templates in this batch:
--   Rishikesh, Hampi, Jaisalmer, Leh Ladakh, Lonavala,
--   Madurai, Mahabalipuram, Ranthambore, Varkala, Ahmedabad
--
-- Run after deploying the plannerService.ts changes that add these cities
-- to INDIA_CANONICAL_ITINERARIES.
--
-- Safe to run multiple times (no rows = no-op).

DELETE FROM city_stop_pool_cache
WHERE country = 'India'
  AND city IN (
    'Rishikesh',
    'Hampi',
    'Jaisalmer',
    'Leh',
    'Ladakh',
    'Leh Ladakh',
    'Lonavala',
    'Madurai',
    'Mahabalipuram',
    'Mamallapuram',
    'Ranthambore',
    'Varkala',
    'Ahmedabad'
  );

-- Broad match for any Leh/Ladakh variant spellings stored with "India" suffix
DELETE FROM city_stop_pool_cache
WHERE country = 'India'
  AND (city ILIKE '%ladakh%' OR city ILIKE '%leh%');
