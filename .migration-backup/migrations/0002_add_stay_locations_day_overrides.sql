-- Add stay_locations and day_overrides to travel_trips for Task #43 Stay Location System
-- Add stay_locations and stop_intelligence_enabled to planner_trip_plans
-- Note: Columns were applied directly to the live database; this migration file documents them.

ALTER TABLE "travel_trips"
  ADD COLUMN IF NOT EXISTS "stay_locations" jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "day_overrides" jsonb DEFAULT NULL;
--> statement-breakpoint

ALTER TABLE "planner_trip_plans"
  ADD COLUMN IF NOT EXISTS "stay_locations" jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "stop_intelligence_enabled" boolean DEFAULT false;
