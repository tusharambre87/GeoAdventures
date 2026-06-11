/**
 * backfill-psi-logistics.ts
 *
 * One-shot migration: copies 7 logistics fields from planner_places into
 * planner_stop_intelligence for all stops that exist in both systems.
 *
 * Matching strategy: normalize planner_places.name (lowercase, strip
 * non-alphanumeric, collapse spaces) and JOIN against stop_library.normalized_name.
 * Duplicates in planner_places are handled by taking the first row per
 * normalized name ordered by created_at.
 *
 * Run: pnpm --filter @workspace/scripts run backfill-psi-logistics
 */

import "dotenv/config";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("[PSI Backfill] Starting logistics field migration...");

  const result = await sql`
    WITH ranked_places AS (
      -- De-duplicate planner_places: keep earliest row per normalized name
      SELECT DISTINCT ON (
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g'))
      )
        id AS place_id,
        family_anchor_type,
        effort_level,
        sensory_load,
        indoor_outdoor,
        min_age,
        max_age,
        duration_minutes,
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g')) AS norm_name
      FROM planner_places
      ORDER BY
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g')),
        created_at ASC
    ),
    matched AS (
      -- Join de-duped planner_places to stop_library via normalized name
      SELECT
        rp.place_id,
        rp.family_anchor_type,
        rp.effort_level,
        rp.sensory_load,
        rp.indoor_outdoor,
        rp.min_age,
        rp.max_age,
        rp.duration_minutes
      FROM ranked_places rp
      INNER JOIN stop_library sl
        ON sl.normalized_name = LOWER(REGEXP_REPLACE(REPLACE(rp.norm_name, ' ', ''), '[^a-z0-9]', '', 'g'))
        OR sl.normalized_name = rp.norm_name
      -- Only include planner_places rows that already have a PSI record
      INNER JOIN planner_stop_intelligence psi
        ON psi.place_id = rp.place_id
    )
    UPDATE planner_stop_intelligence AS psi
    SET
      family_anchor_type = m.family_anchor_type,
      effort_level       = m.effort_level,
      sensory_load       = m.sensory_load,
      indoor_outdoor     = m.indoor_outdoor,
      min_age            = m.min_age,
      max_age            = m.max_age,
      duration_minutes   = m.duration_minutes
    FROM matched m
    WHERE psi.place_id = m.place_id
      AND (
        psi.family_anchor_type IS NULL
        OR psi.effort_level IS NULL
        OR psi.duration_minutes IS NULL
      )
    RETURNING psi.id, psi.place_id
  `;

  console.log(`[PSI Backfill] Updated ${result.length} PSI rows from planner_places.`);

  // Also insert minimal PSI rows for planner_places that have NO PSI record at all,
  // but DO have a stop_library match (covers new stops never enriched via PSI pipeline).
  const inserted = await sql`
    WITH ranked_places AS (
      SELECT DISTINCT ON (
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g'))
      )
        id AS place_id,
        family_anchor_type,
        effort_level,
        sensory_load,
        indoor_outdoor,
        min_age,
        max_age,
        duration_minutes,
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g')) AS norm_name
      FROM planner_places
      ORDER BY
        LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g')),
        created_at ASC
    ),
    matched_no_psi AS (
      SELECT rp.place_id,
             rp.family_anchor_type,
             rp.effort_level,
             rp.sensory_load,
             rp.indoor_outdoor,
             rp.min_age,
             rp.max_age,
             rp.duration_minutes
      FROM ranked_places rp
      INNER JOIN stop_library sl
        ON sl.normalized_name = LOWER(REGEXP_REPLACE(REPLACE(rp.norm_name, ' ', ''), '[^a-z0-9]', '', 'g'))
        OR sl.normalized_name = rp.norm_name
      WHERE NOT EXISTS (
        SELECT 1 FROM planner_stop_intelligence psi2
        WHERE psi2.place_id = rp.place_id
      )
    )
    INSERT INTO planner_stop_intelligence (
      place_id, family_anchor_type, effort_level, sensory_load,
      indoor_outdoor, min_age, max_age, duration_minutes
    )
    SELECT
      place_id, family_anchor_type, effort_level, sensory_load,
      indoor_outdoor, min_age, max_age, duration_minutes
    FROM matched_no_psi
    ON CONFLICT (place_id) DO UPDATE SET
      family_anchor_type = EXCLUDED.family_anchor_type,
      effort_level       = EXCLUDED.effort_level,
      sensory_load       = EXCLUDED.sensory_load,
      indoor_outdoor     = EXCLUDED.indoor_outdoor,
      min_age            = EXCLUDED.min_age,
      max_age            = EXCLUDED.max_age,
      duration_minutes   = EXCLUDED.duration_minutes
    RETURNING id, place_id
  `;

  console.log(`[PSI Backfill] Inserted/upserted ${inserted.length} new PSI rows for unmatched stops.`);
  console.log(`[PSI Backfill] Done. Total affected: ${result.length + inserted.length} PSI records.`);

  await sql.end();
}

main().catch(err => {
  console.error("[PSI Backfill] Fatal:", err);
  process.exit(1);
});
