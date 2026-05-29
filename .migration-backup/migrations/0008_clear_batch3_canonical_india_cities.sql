-- Migration 0008: Clear stop pool cache for 3 new Indian canonical cities (batch 3)
--
-- Cities gaining canonical templates in this batch:
--   Chennai (+ Madras), Mahabaleshwar, Matheran
--
-- Safe to run multiple times (no rows = no-op).

DELETE FROM city_stop_pool_cache
WHERE country = 'India'
  AND city IN (
    'Chennai',
    'Madras',
    'Mahabaleshwar',
    'Matheran'
  );
