-- Migration 0009: Add canonical_cities_used to planner_trip_plans
-- Tracks per-city canonical template usage for multi-city India trips.
-- For a Delhi → Jaipur → Agra itinerary, this stores e.g. ["jaipur", "agra"]
-- while canonicalTemplateUsed remains null (top-level destination may not match a canonical key).

ALTER TABLE planner_trip_plans
  ADD COLUMN IF NOT EXISTS canonical_cities_used TEXT[];
