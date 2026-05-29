/**
 * Stop Library Seeder
 *
 * Reads city_stop_pool_cache and city_adventure_templates rows,
 * expands JSON stop blobs, and upserts them into stop_library.
 * Idempotent — safe to run on every startup; duplicate (normalizedKey, name)
 * rows are silently skipped via ON CONFLICT DO NOTHING.
 */

import { db } from "../db";
import { cityStopPoolCache, cityAdventureTemplates, stopLibrary } from "@workspace/db";
import { sql } from "drizzle-orm";

function normalizeKey(city: string, country: string): string {
  return `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
}

export async function seedStopLibrary(): Promise<void> {
  console.log("[StopLibrarySeeder] Starting stop library seeding...");
  let totalInserted = 0;
  let totalSkipped = 0;

  // ── 1. Seed from city_stop_pool_cache (100 cities × ~30 stops each) ─────────
  try {
    const pools = await db.select().from(cityStopPoolCache);
    for (const pool of pools) {
      if (!pool.stopPool || !Array.isArray(pool.stopPool) || pool.stopPool.length === 0) continue;
      const nk = normalizeKey(pool.city, pool.country ?? "");
      const rows = (pool.stopPool as any[]).map((s: any) => ({
        city: pool.city,
        country: pool.country ?? "",
        normalizedKey: nk,
        name: String(s.name ?? "").trim(),
        address: s.address ?? null,
        latitude: s.latitude != null ? String(s.latitude) : null,
        longitude: s.longitude != null ? String(s.longitude) : null,
        stopType: s.stopType ?? s.type ?? "landmark",
        description: s.description ?? null,
        stopMissions: s.stopMissions ?? null,
        source: "seeded" as const,
      })).filter(r => r.name.length > 0);

      if (rows.length === 0) continue;

      try {
        const result = await db
          .insert(stopLibrary)
          .values(rows)
          .onConflictDoNothing()
          .returning({ id: stopLibrary.id });
        totalInserted += result.length;
        totalSkipped += rows.length - result.length;
      } catch (err) {
        console.warn(`[StopLibrarySeeder] city_stop_pool_cache insert failed for ${pool.city}:`, (err as Error).message);
      }
    }
    console.log(`[StopLibrarySeeder] city_stop_pool_cache: ${pools.length} cities processed`);
  } catch (err) {
    console.error("[StopLibrarySeeder] city_stop_pool_cache read error:", err);
  }

  // ── 2. Seed from city_adventure_templates (42 cities × stops) ────────────────
  try {
    const templates = await db.select().from(cityAdventureTemplates);
    for (const tmpl of templates) {
      const city = tmpl.cityName;
      const country = tmpl.country ?? "";
      const nk = normalizeKey(city, country);

      // stops live in stopsData (JSONB array)
      let rawStops: any[] = [];
      if (Array.isArray(tmpl.stopsData)) {
        rawStops = tmpl.stopsData as any[];
      } else if (tmpl.stopsData && Array.isArray((tmpl.stopsData as any).stops)) {
        rawStops = (tmpl.stopsData as any).stops;
      }

      if (rawStops.length === 0) continue;

      const rows = rawStops.map((s: any) => ({
        city,
        country,
        normalizedKey: nk,
        name: String(s.name ?? "").trim(),
        address: s.address ?? null,
        latitude: s.latitude != null ? String(s.latitude) : null,
        longitude: s.longitude != null ? String(s.longitude) : null,
        stopType: s.stopType ?? s.type ?? "landmark",
        description: s.description ?? null,
        stopMissions: s.stopMissions ?? null,
        source: "canonical" as const,
      })).filter(r => r.name.length > 0);

      if (rows.length === 0) continue;

      try {
        const result = await db
          .insert(stopLibrary)
          .values(rows)
          .onConflictDoNothing()
          .returning({ id: stopLibrary.id });
        totalInserted += result.length;
        totalSkipped += rows.length - result.length;
      } catch (err) {
        console.warn(`[StopLibrarySeeder] city_adventure_templates insert failed for ${city}:`, (err as Error).message);
      }
    }
    console.log(`[StopLibrarySeeder] city_adventure_templates: ${templates.length} templates processed`);
  } catch (err) {
    console.error("[StopLibrarySeeder] city_adventure_templates read error:", err);
  }

  console.log(`[StopLibrarySeeder] Complete — inserted: ${totalInserted}, already existed: ${totalSkipped}`);

  // Kick off background enrichment for any unenriched stops (fire-and-forget)
  import('../planner/stopLibraryEnricher.js').then(({ startEnrichmentQueue }) => {
    startEnrichmentQueue();
  }).catch((err: any) => {
    console.warn('[StopLibrarySeeder] Could not start enrichment queue:', err.message);
  });
}
