/**
 * familySignals.ts — Place Family Signals Service
 *
 * A learning knowledge base that accumulates engagement data from our users
 * (per age group) combined with AI knowledge for cold-start, so stop generation
 * can recommend places with progressively higher confidence.
 *
 * Signal priority (highest → lowest):
 *   1. Internal engagement data (real user visits, mission completion per age group)
 *   2. AI cold-start knowledge (OpenAI's training data on family-friendliness)
 *
 * Data flow:
 *   Stop Visited       → upsertVisitSignal()         → place_family_signals DB
 *   Trip Generated     → generateAIColdStartSignals() → place_family_signals DB
 *   generateCityStops  → getTopSignalsForCity()       → inject into AI prompt
 *   Admin trigger      → aggregateAllHistorical()     → batch update all trips
 */

import { db } from "./db";
import {
  placeFamilySignals,
  travelStops,
  travelTrips,
  players,
  AgeGroupSignalData,
  AIColdStartSignal,
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize a place into a stable lookup key */
export function buildPlaceKey(city: string, country: string, stopName: string): string {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${normalize(city)}:${normalize(country)}:${normalize(stopName)}`;
}

/** Map a numeric age to our 4 age buckets */
export function ageToGroup(age: number): string {
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 11) return "9-11";
  return "12+";
}

/** Parse age from the players.age varchar (e.g. "7" or "7 years") */
function parseAge(ageStr: string | null | undefined): number | null {
  if (!ageStr) return null;
  const n = parseInt(ageStr.replace(/\D/g, ""), 10);
  return isNaN(n) ? null : n;
}

/**
 * Compute a 0-100 confidence score for a signal record.
 * Internal visit data is trusted 3× more than AI cold-start knowledge.
 * Optionally weight toward specific age groups if provided.
 */
export function computeConfidenceScore(
  signal: typeof placeFamilySignals.$inferSelect,
  ageGroups?: string[]
): number {
  let internalScore = 0;
  let aiScore = 0;

  // ── Internal data score (0-100, higher with more visits) ──────────────────
  if (signal.totalVisits > 0) {
    const completionRatio = signal.totalCompleted / signal.totalVisits;
    const missionBonus = (signal.avgMissionCompletionRate ?? 0) * 20;
    const volumeBonus = Math.min(30, signal.totalVisits * 3); // up to 30 bonus for volume
    internalScore = Math.min(100, completionRatio * 50 + missionBonus + volumeBonus);

    // Age-group specificity boost
    if (ageGroups && ageGroups.length > 0) {
      const ags = (signal.ageGroupSignals ?? {}) as Record<string, AgeGroupSignalData>;
      let ageGroupTotal = 0;
      let ageGroupVisits = 0;
      for (const ag of ageGroups) {
        const d = ags[ag];
        if (d) {
          ageGroupVisits += d.visitCount;
          ageGroupTotal += d.avgMissionRate * d.visitCount;
        }
      }
      if (ageGroupVisits > 0) {
        const ageGroupRate = ageGroupTotal / ageGroupVisits;
        internalScore = Math.min(100, internalScore * 0.7 + ageGroupRate * 30 + Math.min(20, ageGroupVisits * 2));
      }
    }
  }

  // ── AI cold-start score ────────────────────────────────────────────────────
  if (signal.aiColdStart) {
    const cs = signal.aiColdStart as AIColdStartSignal;
    aiScore = cs.kidFriendlyScore * 0.6 + cs.globalIconicScore * 0.4;

    if (ageGroups && ageGroups.length > 0) {
      const ageFit = cs.ageGroupFit ?? {};
      const avgAgeFit = ageGroups.reduce((sum, ag) => sum + (ageFit[ag] ?? 50), 0) / ageGroups.length;
      aiScore = aiScore * 0.5 + avgAgeFit * 0.5;
    }
  }

  // ── Weighted blend: internal data trusted 3× over AI ─────────────────────
  if (signal.totalVisits >= 5) {
    return Math.round(internalScore * 0.85 + aiScore * 0.15);
  }
  if (signal.totalVisits > 0) {
    const w = signal.totalVisits / 5;
    return Math.round(internalScore * w * 0.85 + aiScore * (1 - w * 0.85));
  }
  return Math.round(aiScore);
}

// ─── Core: Upsert a visit signal ─────────────────────────────────────────────

interface VisitSignalInput {
  city: string;
  country: string;
  stopName: string;
  stopType?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  wasCompleted: boolean;        // true = "completed", false = "skipped"
  missionsTotal: number;
  missionsCompleted: number;
  explorerAges: number[];       // array of numeric ages of explorers on the trip
}

export async function upsertVisitSignal(input: VisitSignalInput): Promise<void> {
  try {
    const placeKey = buildPlaceKey(input.city, input.country, input.stopName);

    const existing = await db
      .select()
      .from(placeFamilySignals)
      .where(eq(placeFamilySignals.placeKey, placeKey))
      .limit(1);

    const missionRate = input.missionsTotal > 0
      ? input.missionsCompleted / input.missionsTotal
      : input.wasCompleted ? 1 : 0;

    if (existing.length === 0) {
      // First visit for this place — create record
      const ageGroupSignals: Record<string, AgeGroupSignalData> = {};
      for (const age of input.explorerAges) {
        const ag = ageToGroup(age);
        ageGroupSignals[ag] = {
          visitCount: 1,
          completedCount: input.wasCompleted ? 1 : 0,
          skippedCount: input.wasCompleted ? 0 : 1,
          avgMissionRate: missionRate,
          lastUpdated: new Date().toISOString(),
        };
      }

      await db.insert(placeFamilySignals).values({
        placeKey,
        city: input.city,
        country: input.country,
        stopName: input.stopName,
        stopType: input.stopType ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        totalVisits: 1,
        totalCompleted: input.wasCompleted ? 1 : 0,
        totalSkipped: input.wasCompleted ? 0 : 1,
        avgMissionCompletionRate: missionRate,
        ageGroupSignals,
        lastAggregatedAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      const rec = existing[0];
      const newTotal = rec.totalVisits + 1;
      const newCompleted = rec.totalCompleted + (input.wasCompleted ? 1 : 0);
      const newSkipped = rec.totalSkipped + (input.wasCompleted ? 0 : 1);

      // Incremental running average for mission rate
      const prevRate = rec.avgMissionCompletionRate ?? 0;
      const newAvgMission = (prevRate * rec.totalVisits + missionRate) / newTotal;

      // Merge age group signals
      const ags = { ...((rec.ageGroupSignals ?? {}) as Record<string, AgeGroupSignalData>) };
      for (const age of input.explorerAges) {
        const ag = ageToGroup(age);
        const prev = ags[ag];
        if (prev) {
          const newVisits = prev.visitCount + 1;
          ags[ag] = {
            visitCount: newVisits,
            completedCount: prev.completedCount + (input.wasCompleted ? 1 : 0),
            skippedCount: prev.skippedCount + (input.wasCompleted ? 0 : 1),
            avgMissionRate: (prev.avgMissionRate * prev.visitCount + missionRate) / newVisits,
            lastUpdated: new Date().toISOString(),
          };
        } else {
          ags[ag] = {
            visitCount: 1,
            completedCount: input.wasCompleted ? 1 : 0,
            skippedCount: input.wasCompleted ? 0 : 1,
            avgMissionRate: missionRate,
            lastUpdated: new Date().toISOString(),
          };
        }
      }

      await db
        .update(placeFamilySignals)
        .set({
          totalVisits: newTotal,
          totalCompleted: newCompleted,
          totalSkipped: newSkipped,
          avgMissionCompletionRate: newAvgMission,
          ageGroupSignals: ags,
          lastAggregatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(placeFamilySignals.placeKey, placeKey));
    }
  } catch (err) {
    console.error("[FamilySignals] upsertVisitSignal failed:", err);
  }
}

// ─── AI Cold-Start Signal ─────────────────────────────────────────────────────

/**
 * For a list of stops (just generated for a city), ask OpenAI to rate each stop's
 * family-friendliness per age group. Stored as cold-start signal until real user
 * data accumulates.
 * Only runs for places that don't already have a cold-start signal.
 */
export async function generateAIColdStartSignals(
  city: string,
  country: string,
  stops: Array<{ name: string; stopType?: string; latitude?: string; longitude?: string }>
): Promise<void> {
  try {
    // Check which stops already have signals
    const keys = stops.map(s => buildPlaceKey(city, country, s.name));
    if (keys.length === 0) return;
    const existing = await db
      .select({ placeKey: placeFamilySignals.placeKey })
      .from(placeFamilySignals)
      .where(inArray(placeFamilySignals.placeKey, keys));
    const existingKeys = new Set(existing.map(e => e.placeKey));
    const newStops = stops.filter(s => !existingKeys.has(buildPlaceKey(city, country, s.name)));

    if (newStops.length === 0) return;

    console.log(`[FamilySignals] Generating AI cold-start for ${newStops.length} new stops in ${city}, ${country}`);

    const stopListText = newStops.map((s, i) => `${i + 1}. "${s.name}" (${s.stopType ?? "landmark"})`).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a family travel intelligence system. You analyze popular tourist attractions and rate their suitability for families with children of different ages, drawing on your knowledge of the world's attractions.`,
        },
        {
          role: "user",
          content: `Rate the following stops in ${city}, ${country} for family visits with children.

Stops:
${stopListText}

For EACH stop, provide a JSON object with:
- "name": exact stop name (match input exactly)
- "globalIconicScore": 0-100 (how globally famous/iconic is this place?)
- "kidFriendlyScore": 0-100 (overall kid-friendliness, ages 3-12)
- "ageGroupFit": object with scores 0-100 for each age group:
  - "3-5": toddler/preschool fit
  - "6-8": early school fit  
  - "9-11": middle school fit
  - "12+": teen fit
- "rationale": 1-sentence why kids love or don't love this place

Return JSON: { "stops": [...] }`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return;

    const parsed = JSON.parse(content);
    const rated: Array<{
      name: string;
      globalIconicScore: number;
      kidFriendlyScore: number;
      ageGroupFit: Record<string, number>;
      rationale: string;
    }> = parsed.stops ?? [];

    const now = new Date().toISOString();

    for (const stop of newStops) {
      const rating = rated.find(r => r.name.toLowerCase() === stop.name.toLowerCase());
      if (!rating) continue;

      const coldStart: AIColdStartSignal = {
        globalIconicScore: Math.max(0, Math.min(100, rating.globalIconicScore ?? 50)),
        kidFriendlyScore: Math.max(0, Math.min(100, rating.kidFriendlyScore ?? 50)),
        ageGroupFit: {
          "3-5": Math.max(0, Math.min(100, rating.ageGroupFit?.["3-5"] ?? 50)),
          "6-8": Math.max(0, Math.min(100, rating.ageGroupFit?.["6-8"] ?? 50)),
          "9-11": Math.max(0, Math.min(100, rating.ageGroupFit?.["9-11"] ?? 50)),
          "12+": Math.max(0, Math.min(100, rating.ageGroupFit?.["12+"] ?? 50)),
        },
        rationale: rating.rationale ?? "",
        generatedAt: now,
      };

      const placeKey = buildPlaceKey(city, country, stop.name);
      await db.insert(placeFamilySignals).values({
        placeKey,
        city,
        country,
        stopName: stop.name,
        stopType: stop.stopType ?? null,
        latitude: stop.latitude ?? null,
        longitude: stop.longitude ?? null,
        totalVisits: 0,
        totalCompleted: 0,
        totalSkipped: 0,
        aiColdStart: coldStart,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: placeFamilySignals.placeKey,
        set: {
          aiColdStart: coldStart,
          updatedAt: new Date(),
        },
      });
    }

    console.log(`[FamilySignals] Cold-start signals saved for ${newStops.length} stops in ${city}`);
  } catch (err) {
    console.error("[FamilySignals] generateAIColdStartSignals failed:", err);
  }
}

// ─── Query: Top signals for stop generation ───────────────────────────────────

export interface TopSignalEntry {
  stopName: string;
  stopType: string | null;
  confidenceScore: number;
  ageGroupFit: string;           // human-readable label e.g. "Great for ages 6-8 (87% engagement)"
  totalVisits: number;
  rationale?: string;
}

/**
 * Returns the top-scoring stops for a city + country, optionally filtered by age groups.
 * Used by generateCityStops to inject "family-verified favorites" into the AI prompt.
 */
export async function getTopSignalsForCity(
  city: string,
  country: string,
  ageGroups?: string[],
  limit = 12
): Promise<TopSignalEntry[]> {
  try {
    const cityNorm = city.toLowerCase();
    const countryNorm = country.toLowerCase();

    const rows = await db
      .select()
      .from(placeFamilySignals)
      .where(
        and(
          sql`LOWER(${placeFamilySignals.city}) = ${cityNorm}`,
          sql`LOWER(${placeFamilySignals.country}) = ${countryNorm}`
        )
      )
      .orderBy(desc(placeFamilySignals.totalVisits))
      .limit(50);

    if (rows.length === 0) return [];

    const scored = rows.map(row => {
      const score = computeConfidenceScore(row, ageGroups);
      const ags = (row.ageGroupSignals ?? {}) as Record<string, AgeGroupSignalData>;
      const cs = row.aiColdStart as AIColdStartSignal | null;

      // Build human-readable age group fit label
      let ageGroupFit = "";
      if (ageGroups && ageGroups.length > 0) {
        for (const ag of ageGroups) {
          const d = ags[ag];
          if (d && d.visitCount > 0) {
            const pct = Math.round(d.avgMissionRate * 100);
            ageGroupFit = `⭐ ${d.visitCount} families with kids ages ${ag} visited — ${pct}% completed all missions`;
            break;
          }
        }
        if (!ageGroupFit && cs) {
          const agFit = ageGroups.map(ag => cs.ageGroupFit?.[ag] ?? 50);
          const avg = agFit.reduce((a, b) => a + b, 0) / agFit.length;
          ageGroupFit = `AI rating for ages ${ageGroups.join("/")}:  ${Math.round(avg)}/100`;
        }
      } else if (row.totalVisits > 0) {
        const pct = Math.round((row.avgMissionCompletionRate ?? 0) * 100);
        ageGroupFit = `${row.totalVisits} families visited — ${pct}% mission completion`;
      }

      return {
        stopName: row.stopName,
        stopType: row.stopType,
        confidenceScore: score,
        ageGroupFit,
        totalVisits: row.totalVisits,
        rationale: cs?.rationale,
      };
    });

    return scored
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, limit);
  } catch (err) {
    console.error("[FamilySignals] getTopSignalsForCity failed:", err);
    return [];
  }
}

/**
 * Format top signals for injection into the AI stop generation prompt.
 */
export function formatSignalsForPrompt(signals: TopSignalEntry[], ageGroups?: string[]): string {
  if (signals.length === 0) return "";

  const ageLabel = ageGroups && ageGroups.length > 0
    ? ` for families with kids ages ${ageGroups.join(", ")}`
    : "";

  const lines = signals.map(s => {
    const trustLabel = s.totalVisits >= 10
      ? "HIGHLY VERIFIED"
      : s.totalVisits >= 3
        ? "VERIFIED"
        : "AI RATED";
    const context = s.ageGroupFit ? ` — ${s.ageGroupFit}` : "";
    const rationale = s.rationale ? ` (${s.rationale})` : "";
    return `  • "${s.stopName}" [${trustLabel}, score ${s.confidenceScore}/100${context}${rationale}]`;
  }).join("\n");

  return `\nFAMILY-VERIFIED FAVORITES${ageLabel} (from real GeoQuest families and AI knowledge — prioritize these in your selection):
${lines}
Treat HIGHLY VERIFIED stops as near-certain inclusions. VERIFIED stops should be strongly preferred. AI RATED stops are good candidates when verified options are limited.`;
}

// ─── Batch historical aggregation ─────────────────────────────────────────────

/**
 * Admin-triggered: reads all historical trips that have visited stops
 * and re-computes signals. Idempotent — safe to run multiple times.
 */
export async function aggregateAllHistorical(): Promise<{ processed: number; updated: number }> {
  console.log("[FamilySignals] Starting full historical aggregation...");
  let processed = 0;
  let updated = 0;

  try {
    // Get all trips that have visited stops
    const allTrips = await db
      .select({
        id: travelTrips.id,
        city: travelTrips.city,
        country: travelTrips.country,
        destination: travelTrips.destination,
        travelers: travelTrips.travelers,
      })
      .from(travelTrips)
      .where(sql`${travelTrips.status} IN ('active', 'completed')`);

    for (const trip of allTrips) {
      const city = trip.city ?? trip.destination ?? "";
      const country = trip.country ?? "";
      if (!city || !country) continue;

      // Get explorer ages for this trip
      const travelers = (trip.travelers ?? []) as Array<{ explorerId?: string; name?: string }>;
      const explorerIds = travelers.map(t => t.explorerId).filter(Boolean) as string[];
      let explorerAges: number[] = [];

      if (explorerIds.length > 0) {
        const explorerRows = await db
          .select({ age: players.age })
          .from(players)
          .where(inArray(players.id, explorerIds));
        explorerAges = explorerRows
          .map(e => parseAge(e.age))
          .filter((a): a is number => a !== null);
      }

      // Get visited stops for this trip
      const visitedStops = await db
        .select()
        .from(travelStops)
        .where(
          and(
            eq(travelStops.tripId, trip.id),
            eq(travelStops.isVisited, true)
          )
        );

      for (const stop of visitedStops) {
        processed++;
        const stopMissions = (stop.stopMissions ?? []) as Array<{ completed: boolean }>;
        const missionsTotal = stopMissions.length > 0 ? stopMissions.length : (stop.missionCompleted ? 1 : 0);
        const missionsCompleted = stopMissions.length > 0
          ? stopMissions.filter(m => m.completed).length
          : (stop.missionCompleted ? 1 : 0);

        await upsertVisitSignal({
          city,
          country,
          stopName: stop.name,
          stopType: stop.stopType,
          latitude: stop.latitude,
          longitude: stop.longitude,
          wasCompleted: stop.visitedMode !== "skipped",
          missionsTotal,
          missionsCompleted,
          explorerAges,
        });
        updated++;
      }
    }

    console.log(`[FamilySignals] Historical aggregation complete: ${processed} stops processed, ${updated} signals updated`);
    return { processed, updated };
  } catch (err) {
    console.error("[FamilySignals] aggregateAllHistorical failed:", err);
    return { processed, updated };
  }
}
