/**
 * Backfill: populate numeric PSI scores for DC (and optionally Minneapolis) stops
 * using GPT-4o. Updates existing planner_stop_intelligence rows in-place.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:psi-scores
 */

import OpenAI from "openai";
import { db } from "../db.js";
import { plannerStopIntelligence, plannerPlaces, stopLibrary } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";

const LOG = "[BackfillPsiScores]";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const BATCH_SIZE = 6;
const BATCH_PAUSE_MS = 1500;

const SYSTEM_PROMPT =
  "You are a family travel intelligence engine. Given a stop name, city, and stop type, return a JSON object with integer scores 0-100 for each field. Base scores on what a real family with kids aged 4-12 would experience. Be opinionated — don't return 50 for everything.";

const INT_SCORE_FIELDS = [
  "kid_fit_score",
  "final_score",
  "wow_factor_score",
  "hassle_to_joy_ratio_score",
  "stroller_ease_score",
  "meltdown_recovery_ease_score",
  "anchor_stop_fit_score",
  "age5to7_fit",
  "age8to12_fit",
  "age2to4_fit",
  "movement_release_score",
  "hands_on_level_score",
  "rainy_day_fit_score",
  "parking_availability_score",
  "restroom_confidence",
  "entry_friction_score",
  "duration_minutes",
  "min_age",
  "max_age",
] as const;

const STR_FIELDS = [
  "best_arrival_window",
  "worst_arrival_window",
  "effort_level",
  "sensory_load",
  "indoor_outdoor",
] as const;

type ScoreResult = {
  kid_fit_score: number;
  final_score: number;
  wow_factor_score: number;
  hassle_to_joy_ratio_score: number;
  stroller_ease_score: number;
  meltdown_recovery_ease_score: number;
  anchor_stop_fit_score: number;
  age5to7_fit: number;
  age8to12_fit: number;
  age2to4_fit: number;
  movement_release_score: number;
  hands_on_level_score: number;
  rainy_day_fit_score: number;
  parking_availability_score: number;
  restroom_confidence: number;
  entry_friction_score: number;
  duration_minutes: number;
  min_age: number;
  max_age: number;
  best_arrival_window: string;
  worst_arrival_window: string;
  effort_level: string;
  sensory_load: string;
  indoor_outdoor: string;
};

async function scoreStop(
  name: string,
  city: string,
  stopType: string
): Promise<ScoreResult> {
  const allFields = [...INT_SCORE_FIELDS, ...STR_FIELDS];
  const userMsg = `Name: ${name}\nCity: ${city}\nStop type: ${stopType}\n\nReturn ONLY a raw JSON object (no markdown) with these fields:\n${allFields.join(", ")}\n\nFor effort_level use: low/moderate/high\nFor sensory_load use: low/moderate/high\nFor indoor_outdoor use: indoor/outdoor/both\nAll numeric fields must be integers 0-100 (duration_minutes, min_age, max_age can exceed 100).`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ],
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(resp.choices[0].message.content ?? "{}");
  return raw as ScoreResult;
}

async function main() {
  const city = process.argv[2] ?? "Washington DC";
  console.log(`${LOG} Scoring PSI rows for city: ${city}`);

  // Get all PSI rows for the city that have null kid_fit_score
  const rows = await db
    .select({
      psiId: plannerStopIntelligence.id,
      name: plannerPlaces.name,
      stopType: stopLibrary.stopType,
    })
    .from(plannerStopIntelligence)
    .innerJoin(plannerPlaces, eq(plannerStopIntelligence.placeId, plannerPlaces.id))
    .innerJoin(
      stopLibrary,
      and(eq(stopLibrary.name, plannerPlaces.name), eq(stopLibrary.city, plannerPlaces.city))
    )
    .where(and(eq(plannerPlaces.city, city), isNull(plannerStopIntelligence.kidFitScore)));

  console.log(`${LOG} Found ${rows.length} stops needing scores`);

  let done = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (row) => {
        try {
          const scores = await scoreStop(row.name, city, row.stopType ?? "attraction");

          await db
            .update(plannerStopIntelligence)
            .set({
              kidFitScore: scores.kid_fit_score,
              finalScore: scores.final_score,
              wowFactorScore: scores.wow_factor_score,
              hassleToJoyRatioScore: scores.hassle_to_joy_ratio_score,
              strollerEaseScore: scores.stroller_ease_score,
              meltdownRecoveryEaseScore: scores.meltdown_recovery_ease_score,
              anchorStopFitScore: scores.anchor_stop_fit_score,
              age5to7Fit: scores.age5to7_fit,
              age8to12Fit: scores.age8to12_fit,
              age2to4Fit: scores.age2to4_fit,
              movementReleaseScore: scores.movement_release_score,
              handsOnLevelScore: scores.hands_on_level_score,
              rainyDayFitScore: scores.rainy_day_fit_score,
              parkingAvailabilityScore: scores.parking_availability_score,
              restroomConfidence: scores.restroom_confidence,
              entryFrictionScore: scores.entry_friction_score,
              durationMinutes: scores.duration_minutes,
              minAge: scores.min_age,
              maxAge: scores.max_age,
              bestArrivalWindow: scores.best_arrival_window,
              worstArrivalWindow: scores.worst_arrival_window,
              effortLevel: scores.effort_level,
              sensoryLoad: scores.sensory_load,
              indoorOutdoor: scores.indoor_outdoor,
            })
            .where(eq(plannerStopIntelligence.id, row.psiId));

          done++;
          console.log(`${LOG} ✅ ${row.name} — kid_fit=${scores.kid_fit_score} final=${scores.final_score} anchor=${scores.anchor_stop_fit_score}`);
        } catch (err) {
          failed++;
          console.error(`${LOG} ❌ ${row.name}:`, err instanceof Error ? err.message : err);
        }
      })
    );

    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
    }
  }

  console.log(`\n${LOG} Done. ✅ ${done} updated, ❌ ${failed} failed`);
}

main().catch((err) => {
  console.error(`${LOG} Fatal:`, err);
  process.exit(1);
});
