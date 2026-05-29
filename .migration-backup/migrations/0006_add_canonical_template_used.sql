-- Migration 0006: Add canonical_template_used to planner_trip_plans
-- Tracks whether a trip plan was generated using a canonical India template
-- or pure AI, enabling quality comparison between the two approaches.

ALTER TABLE planner_trip_plans
  ADD COLUMN IF NOT EXISTS canonical_template_used VARCHAR;
