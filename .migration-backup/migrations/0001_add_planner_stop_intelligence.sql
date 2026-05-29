-- Add planner_stop_intelligence table for Stop Intelligence Phase 1
-- This is an additive migration; existing tables/data are untouched.

CREATE TABLE IF NOT EXISTS "planner_stop_intelligence" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "place_id" varchar NOT NULL,
  "restroom_confidence" integer,
  "food_confidence" integer,
  "entry_friction_score" integer,
  "exit_ease_score" integer,
  "escape_ease_score" integer,
  "parking_availability_score" integer,
  "shade_or_climate_relief" integer,
  "seating_availability" integer,
  "shortenability_score" integer,
  "skip_cost_score" integer,
  "queue_risk_morning" integer,
  "queue_risk_midday" integer,
  "queue_risk_afternoon" integer,
  "late_day_risk" integer,
  "source_confidence" integer,
  "kid_fit_score" integer,
  "flow_fit_score" integer,
  "practicality_score" integer,
  "flexibility_score" integer,
  "social_proof_score" integer,
  "discovery_score" integer,
  "final_score" integer,
  "role_assigned" varchar,
  "best_arrival_window" varchar,
  "worst_arrival_window" varchar,
  "rationale_short" text,
  "social_label" varchar,
  "discovery_label" varchar,
  "enriched_at" timestamp DEFAULT now(),
  CONSTRAINT "planner_stop_intelligence_place_id_unique" UNIQUE ("place_id")
);
--> statement-breakpoint
ALTER TABLE "planner_stop_intelligence"
  ADD CONSTRAINT "planner_stop_intelligence_place_id_planner_places_id_fk"
  FOREIGN KEY ("place_id") REFERENCES "planner_places"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_planner_stop_intelligence_place"
  ON "planner_stop_intelligence" ("place_id");
