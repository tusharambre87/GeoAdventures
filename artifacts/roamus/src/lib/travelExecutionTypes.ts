import type { TravelStop } from "@shared/schema";

/**
 * Runtime-enriched TravelStop with optional fields that may be populated
 * from planner data or AI intelligence, but are not in the database schema.
 * Use this type in execution screens instead of casting to `any`.
 */
export interface EnrichedTravelStop extends TravelStop {
  durationMinutes?: number | null;
  whyNow?: string | null;
  /** From planner data — may be present when trip was AI-planned */
  indoorOutdoor?: "indoor" | "outdoor" | "both" | null;
  /** From planner data — anchor stops must never be auto-replaced */
  familyAnchorType?: "anchor" | "support" | "filler" | "meal" | "reset" | "weather_backup" | null;
}
