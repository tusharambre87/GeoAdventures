-- Add trip_story_moments table for Memory Generation Engine cache
-- Stores destination-specific memory content: hero moments, captions, kid quotes, parent relief lines.
-- Pre-seeded for top 10 destinations at server startup; AI-generated and cached for all others.
-- This is an additive migration; existing tables/data are untouched.

CREATE TABLE IF NOT EXISTS "trip_story_moments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_key" text NOT NULL,
  "place_name" text NOT NULL,
  "moment_type" text NOT NULL,
  "image_url" text NOT NULL,
  "caption" text NOT NULL,
  "kid_quote" text,
  "tags" text[] NOT NULL DEFAULT '{}',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_trip_story_moments_dest"
  ON "trip_story_moments" ("destination_key");
--> statement-breakpoint
-- Unique constraint ensures onConflictDoNothing() is idempotent for cache writes.
-- Duplicate rows cannot accumulate for the same destination+role+position.
CREATE UNIQUE INDEX IF NOT EXISTS "UNQ_trip_story_moments_dest_type_order"
  ON "trip_story_moments" ("destination_key", "moment_type", "sort_order");
