-- Add city_stop_pool_cache table for pre-seeded stop pools
-- Stores 15-25 fully-enriched candidate stops per city for fast itinerary assembly.
-- Personalization (scoring, selection, sequencing) runs per-user on top of the pool.
-- This is an additive migration; existing tables/data are untouched.

CREATE TABLE IF NOT EXISTS "city_stop_pool_cache" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "city" varchar(200) NOT NULL,
  "country" varchar(200) NOT NULL,
  "normalized_key" varchar(450) NOT NULL,
  "stop_pool" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "cached_at" timestamp DEFAULT now(),
  CONSTRAINT "city_stop_pool_cache_normalized_key_unique" UNIQUE ("normalized_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_city_stop_pool_cache_key"
  ON "city_stop_pool_cache" ("normalized_key");
