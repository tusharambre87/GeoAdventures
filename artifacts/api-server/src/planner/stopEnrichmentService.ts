import OpenAI from "openai";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { plannerPlaces, plannerStopIntelligence, stopLibrary } from "@workspace/db";
import { GEOQUEST_SAFETY_PROMPT } from "../contentSafety";
import { type PlacePlanningProfile } from "./scoringEngine";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// ── Cache TTL tiers ───────────────────────────────────────────────────────────
// High-confidence stops (sourceConfidence ≥ 75) rotate less frequently because
// their intelligence data is based on well-documented, stable places.
// Standard stops use a shorter window to catch operational changes sooner.
const CACHE_TTL_HIGH_CONFIDENCE_DAYS = 180;
const CACHE_TTL_STANDARD_DAYS = 60;

/**
 * India canonical cities (lowercase slug). Stops from these cities always use
 * the 180-day TTL tier because their intelligence data reflects well-established
 * family-travel destinations with stable characteristics.
 * Kept in sync with the keys in INDIA_CANONICAL_ITINERARIES in plannerService.ts.
 */
const INDIA_CANONICAL_CITIES = new Set([
  "goa", "ooty", "mysore", "jaipur", "delhi", "agra", "udaipur", "mumbai",
  "bangalore", "kochi", "munnar", "manali", "shimla", "darjeeling", "varanasi",
  "amritsar", "coorg", "hyderabad", "kolkata", "alleppey", "pondicherry",
  "rishikesh", "hampi", "jaisalmer", "lonavala", "madurai", "mahabalipuram",
  "ranthambore", "varkala", "ahmedabad", "chennai", "mahabaleshwar", "matheran",
]);

type IntelligenceRow = typeof plannerStopIntelligence.$inferSelect;

/**
 * Returns true if the cached intelligence row should be refreshed.
 * - If `invalidatedAt` is set, the row is always considered stale (forced refresh).
 * - If `cachedAt` is null (legacy rows written before this feature), treat as stale.
 * - India canonical stops always use the 180-day tier (city override).
 * - Otherwise, compare age against the TTL tier based on sourceConfidence.
 *
 * @param row     Raw intelligence DB row
 * @param city    Optional city name (extracted from stop destination). Used for India canonical override.
 */
function isCacheStale(row: IntelligenceRow, city?: string): boolean {
  if (row.invalidatedAt) return true;
  if (!row.cachedAt) return true;

  // India canonical stops are well-documented — always use the longer TTL
  const isIndiaCanonical = city
    ? INDIA_CANONICAL_CITIES.has(city.toLowerCase().trim())
    : false;

  const ttlDays =
    isIndiaCanonical || (row.sourceConfidence ?? 0) >= 75
      ? CACHE_TTL_HIGH_CONFIDENCE_DAYS
      : CACHE_TTL_STANDARD_DAYS;

  const ageMs = Date.now() - row.cachedAt.getTime();
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

export interface StopInput {
  name: string;
  type: string;
  destination: string;
  effortLevel?: string;
  indoorOutdoor?: string;
  sensoryLoad?: string;
  familyAnchorType?: string;
  minAge?: number;
  durationMinutes?: number;
}

/**
 * Three-tier completeness state describing the stop's cached data availability
 * at the moment of serving.
 *
 * - `raw`             – no pre-existing data; AI enrichment was (or will be) called.
 * - `content_complete`– stop_library row has storyPack/audioUrl but no logistics
 *                       enrichment yet (backfill pending).
 * - `fully_enriched`  – logistics intelligence data was available from either
 *                       planner_stop_intelligence (Gate 1) or stop_library.enrichment
 *                       (Gate 2); AI call skipped.
 */
export type StopCompletenessState = "raw" | "content_complete" | "fully_enriched";

export interface EnrichedStopData extends PlacePlanningProfile {
  placeId: string;
  /** Completeness state of the stop's cached data at serve time. */
  stopCompletenessState: StopCompletenessState;
}

function extractCityFromDestination(destination: string): string {
  return destination.split(",")[0]?.trim() || destination;
}

/**
 * Map a raw DB row to the EnrichedStopData shape used throughout the planner.
 */
function rowToEnrichedData(row: IntelligenceRow): EnrichedStopData {
  return {
    placeId: row.placeId,
    // Phase 1 — Core logistics
    restroomConfidence: row.restroomConfidence ?? undefined,
    foodConfidence: row.foodConfidence ?? undefined,
    entryFrictionScore: row.entryFrictionScore ?? undefined,
    exitEaseScore: row.exitEaseScore ?? undefined,
    escapeEaseScore: row.escapeEaseScore ?? undefined,
    parkingAvailabilityScore: row.parkingAvailabilityScore ?? undefined,
    shadeOrClimateRelief: row.shadeOrClimateRelief ?? undefined,
    seatingAvailability: row.seatingAvailability ?? undefined,
    shortenabilityScore: row.shortenabilityScore ?? undefined,
    skipCostScore: row.skipCostScore ?? undefined,
    queueRiskMorning: row.queueRiskMorning ?? undefined,
    queueRiskMidday: row.queueRiskMidday ?? undefined,
    queueRiskAfternoon: row.queueRiskAfternoon ?? undefined,
    lateDayRisk: row.lateDayRisk ?? undefined,
    sourceConfidence: row.sourceConfidence ?? undefined,
    bestArrivalWindow: row.bestArrivalWindow ?? undefined,
    worstArrivalWindow: row.worstArrivalWindow ?? undefined,
    rationaleShort: row.rationaleShort ?? undefined,
    socialLabel: row.socialLabel ?? undefined,
    discoveryLabel: row.discoveryLabel ?? undefined,
    // Phase 2 — Age-band fit
    age2to4Fit: row.age2to4Fit ?? undefined,
    age5to7Fit: row.age5to7Fit ?? undefined,
    age8to12Fit: row.age8to12Fit ?? undefined,
    teenFit: row.teenFit ?? undefined,
    mixedSiblingFit: row.mixedSiblingFit ?? undefined,
    // Phase 2 — Parent reality
    strollerEaseScore: row.strollerEaseScore ?? undefined,
    waitingToleranceRequiredScore: row.waitingToleranceRequiredScore ?? undefined,
    meltdownRecoveryEaseScore: row.meltdownRecoveryEaseScore ?? undefined,
    hungerRecoveryEaseScore: row.hungerRecoveryEaseScore ?? undefined,
    bathroomUrgencyResilienceScore: row.bathroomUrgencyResilienceScore ?? undefined,
    weatherFallbackStrengthScore: row.weatherFallbackStrengthScore ?? undefined,
    ticketValueConfidenceScore: row.ticketValueConfidenceScore ?? undefined,
    hassleToJoyRatioScore: row.hassleToJoyRatioScore ?? undefined,
    parentEffortScore: row.parentEffortScore ?? undefined,
    // Phase 2 — Kid delight
    wowFactorScore: row.wowFactorScore ?? undefined,
    handsOnLevelScore: row.handsOnLevelScore ?? undefined,
    freePlayLevelScore: row.freePlayLevelScore ?? undefined,
    movementReleaseScore: row.movementReleaseScore ?? undefined,
    sensoryRewardScore: row.sensoryRewardScore ?? undefined,
    curiosityHookScore: row.curiosityHookScore ?? undefined,
    // Phase 2 — Day-fit
    morningFitScore: row.morningFitScore ?? undefined,
    afterLunchFitScore: row.afterLunchFitScore ?? undefined,
    lateDayFitScore: row.lateDayFitScore ?? undefined,
    rainyDayFitScore: row.rainyDayFitScore ?? undefined,
    hotDayFitScore: row.hotDayFitScore ?? undefined,
    coldDayFitScore: row.coldDayFitScore ?? undefined,
    quickWinFitScore: row.quickWinFitScore ?? undefined,
    treatStopFitScore: row.treatStopFitScore ?? undefined,
    anchorStopFitScore: row.anchorStopFitScore ?? undefined,
    // Phase 2 — Family evidence
    familyEvidenceScore: row.familyEvidenceScore ?? undefined,
    ageMatchConfidenceScore: row.ageMatchConfidenceScore ?? undefined,
    worthTheHassleConfidenceScore: row.worthTheHassleConfidenceScore ?? undefined,
    hiddenGemFamilyScore: row.hiddenGemFamilyScore ?? undefined,
    supportingEvidenceCount: row.supportingEvidenceCount ?? undefined,
    commonParentPros: row.commonParentPros ?? undefined,
    commonParentCautions: row.commonParentCautions ?? undefined,
    // Phase 2 — Parent-facing labels
    bestForAgesLabel: row.bestForAgesLabel ?? undefined,
    timeNeededLabel: row.timeNeededLabel ?? undefined,
    effortLabel: row.effortLabel ?? undefined,
    weatherLabel: row.weatherLabel ?? undefined,
    cautionLabel: row.cautionLabel ?? undefined,
    whyWorthItLabel: row.whyWorthItLabel ?? undefined,
    goodMomentLabel: row.goodMomentLabel ?? undefined,
    // rowToEnrichedData is only called in the Gate 1 cache-hit path, so the
    // stop is fully enriched by definition.
    stopCompletenessState: "fully_enriched" as const,
  };
}

/**
 * Look up a canonical place using a DB-level LOWER() comparison so normalization
 * is handled by Postgres rather than loading rows into memory. Returns the canonical
 * placeId if found, null otherwise.
 */
async function findCanonicalPlace(name: string, city: string): Promise<string | null> {
  const rows = await db.select({ id: plannerPlaces.id })
    .from(plannerPlaces)
    .where(
      and(
        sql`LOWER(TRIM(${plannerPlaces.city})) = LOWER(TRIM(${city}))`,
        sql`LOWER(TRIM(${plannerPlaces.name})) = LOWER(TRIM(${name}))`
      )
    )
    .orderBy(plannerPlaces.createdAt)
    .limit(1);

  return rows.length > 0 ? rows[0].id : null;
}

/**
 * Upsert a canonical place record.
 * If a place with the same normalized name+city already exists, return its id.
 * Otherwise, the newly inserted placeId (already in DB via generateItinerary)
 * is the canonical one.
 */
async function resolveCanonicalPlaceId(
  name: string,
  city: string,
  newPlaceId: string
): Promise<string> {
  const existing = await findCanonicalPlace(name, city);
  if (existing && existing !== newPlaceId) {
    return existing;
  }
  return newPlaceId;
}

async function findExistingIntelligence(placeId: string): Promise<IntelligenceRow | null> {
  const rows = await db.select().from(plannerStopIntelligence)
    .where(eq(plannerStopIntelligence.placeId, placeId))
    .limit(1);

  return rows.length ? rows[0] : null;
}

/**
 * Look up a stop_library row by name+city and return its pre-populated `enrichment`
 * JSONB plus whether the stop has story content (storyPack or audioUrl).
 *
 * - `enrichment` is non-null only after the logistics backfill (task #180) runs.
 * - `hasStoryContent` is true as soon as the content backfill (task #179) runs.
 *
 * This is Cache Gate 2: a non-null `enrichment` lets the stop enrichment path
 * skip the AI call entirely and hydrate planner_stop_intelligence directly.
 */
async function findStopLibraryEnrichment(
  name: string,
  city: string,
): Promise<{ enrichment: PlacePlanningProfile | null; hasStoryContent: boolean }> {
  const rows = await db
    .select({
      enrichment: stopLibrary.enrichment,
      storyPack: stopLibrary.storyPack,
      audioUrl: stopLibrary.audioUrl,
    })
    .from(stopLibrary)
    .where(
      and(
        sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${city}))`,
        sql`LOWER(TRIM(${stopLibrary.name})) = LOWER(TRIM(${name}))`,
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return { enrichment: null, hasStoryContent: false };

  const enrichment =
    row.enrichment && typeof row.enrichment === "object"
      ? (row.enrichment as PlacePlanningProfile)
      : null;
  const hasStoryContent = !!(row.storyPack || row.audioUrl);

  return { enrichment, hasStoryContent };
}

async function callEnrichmentAI(stop: StopInput): Promise<PlacePlanningProfile> {
  const systemMessage = `You are a family travel intelligence expert. Your job is to analyze real-world travel stops and produce structured scoring data for family trip planning.${GEOQUEST_SAFETY_PROMPT}`;

  const userMessage = `Analyze the following stop and return a PlacePlanningProfile JSON with all numeric fields scored 0-100 (integer).

Stop Details:
- Name: ${stop.name}
- Type: ${stop.type}
- Destination/City: ${stop.destination}
- Effort Level: ${stop.effortLevel ?? "moderate"}
- Indoor/Outdoor: ${stop.indoorOutdoor ?? "outdoor"}
- Sensory Load: ${stop.sensoryLoad ?? "moderate"}
- Family Anchor Type: ${stop.familyAnchorType ?? "support"}
- Min Age: ${stop.minAge ?? 0}
- Duration (min): ${stop.durationMinutes ?? 60}

Return JSON with all of the following fields:

// ── Phase 1 — Core logistics ─────────────────────────────────────────────────
{
  "restroomConfidence": <0=none, 100=excellent clean restrooms on-site>,
  "foodConfidence": <0=no food nearby, 100=abundant family-friendly food on-site>,
  "entryFrictionScore": <0=easy walk-in, 100=very hard ticketed queue>,
  "exitEaseScore": <0=difficult, 100=very easy to leave when ready>,
  "escapeEaseScore": <0=hard to leave early, 100=trivially easy to exit mid-visit>,
  "parkingAvailabilityScore": <0=very hard, 100=abundant free parking>,
  "shadeOrClimateRelief": <0=none, 100=fully sheltered from weather>,
  "seatingAvailability": <0=none, 100=plentiful benches or seating>,
  "shortenabilityScore": <0=all-or-nothing, 100=very flexible visit length>,
  "skipCostScore": <0=low regret if skipped, 100=high regret if skipped>,
  "queueRiskMorning": <0=no queue, 100=extreme queue in morning>,
  "queueRiskMidday": <0=no queue, 100=extreme queue at midday>,
  "queueRiskAfternoon": <0=no queue, 100=extreme queue in afternoon>,
  "lateDayRisk": <0=fine late in day, 100=very risky or closed late>,
  "sourceConfidence": <0=unknown place, 100=very well-known and documented>,
  "bestArrivalWindow": "morning|midday|afternoon|evening|anytime",
  "worstArrivalWindow": "morning|midday|afternoon|evening|none",
  "rationaleShort": "1-2 sentence summary of why this stop works or doesn't for families with kids",
  "socialLabel": "Short label like 'Hidden gem' or 'Family classic' or 'Crowd pleaser'",
  "discoveryLabel": "Short label like 'Off the beaten path' or 'Local favourite' or 'Must-see landmark'",

  // ── Phase 2 — Age-band fit ────────────────────────────────────────────────
  // How well does this stop work for children of each age band? 0=terrible fit, 100=perfect fit
  "age2to4Fit": <fit for children aged 2-4>,
  "age5to7Fit": <fit for children aged 5-7>,
  "age8to12Fit": <fit for children aged 8-12>,
  "teenFit": <fit for teenagers aged 13+>,
  "mixedSiblingFit": <fit when a family has children spanning multiple age bands simultaneously>,

  // ── Phase 2 — Parent reality ─────────────────────────────────────────────
  // How manageable is this stop for parents in practice?
  "strollerEaseScore": <0=stroller nightmare, 100=completely stroller-friendly>,
  "waitingToleranceRequiredScore": <0=no waiting needed, 100=long patient waiting required>,
  "meltdownRecoveryEaseScore": <0=very hard to recover if a child has a meltdown, 100=very easy>,
  "hungerRecoveryEaseScore": <0=no food accessible, 100=food immediately available if kids get hungry>,
  "bathroomUrgencyResilienceScore": <0=no bathroom access, 100=bathrooms always immediately accessible>,
  "weatherFallbackStrengthScore": <0=completely ruined by bad/hot/cold weather, 100=totally weather-proof>,
  "ticketValueConfidenceScore": <0=poor value for money, 100=excellent value for a family visit>,
  "hassleToJoyRatioScore": <0=all hassle no joy, 100=minimal hassle maximum joy for families>,
  "parentEffortScore": <0=exhausting for parents, 100=very easy and low-effort for parents>,

  // ── Phase 2 — Kid delight ─────────────────────────────────────────────────
  // How exciting and engaging is this stop for the children themselves?
  "wowFactorScore": <0=nothing wow, 100=jaw-dropping visual or emotional moment>,
  "handsOnLevelScore": <0=look-only, 100=lots of touching/doing/experimenting>,
  "freePlayLevelScore": <0=structured only, 100=lots of free unstructured play space>,
  "movementReleaseScore": <0=sedentary, 100=lots of physical movement and running>,
  "sensoryRewardScore": <0=sensory flat, 100=vivid sounds/sights/smells/textures kids love>,
  "curiosityHookScore": <0=nothing to discover, 100=lots of 'look at that!' discovery moments>,

  // ── Phase 2 — Day-fit ─────────────────────────────────────────────────────
  // How well does this stop work at different points in a family's day?
  "morningFitScore": <0=bad in morning, 100=ideal first thing in the morning>,
  "afterLunchFitScore": <0=bad after lunch, 100=ideal right after a meal>,
  "lateDayFitScore": <0=bad late in day, 100=ideal for tired families late afternoon/evening>,
  "rainyDayFitScore": <0=ruined by rain, 100=ideal for rainy days>,
  "hotDayFitScore": <0=miserable in heat, 100=ideal on a hot day>,
  "coldDayFitScore": <0=miserable in cold, 100=ideal on a cold day>,
  "quickWinFitScore": <0=needs lots of time, 100=great as a quick 15-30 min stop>,
  "treatStopFitScore": <0=not suitable as a reward/treat stop, 100=perfect as a treat>,
  "anchorStopFitScore": <0=not suitable as the main event of the day, 100=ideal anchor stop>,

  // ── Phase 2 — Family evidence ─────────────────────────────────────────────
  // How confident are we that real families with kids enjoy this stop?
  "familyEvidenceScore": <0=no family evidence, 100=strong documented family popularity>,
  "ageMatchConfidenceScore": <0=no age-specific evidence, 100=very strong evidence for families with kids of this type>,
  "worthTheHassleConfidenceScore": <0=not worth the hassle, 100=clearly worth any hassle for families>,
  "hiddenGemFamilyScore": <0=not a hidden gem, 100=unexpectedly great family stop not many know about>,
  "supportingEvidenceCount": <integer 0-20: rough number of evidence signals supporting the family assessment>,
  "commonParentPros": ["up to 3 short strings: common positive things parents say about this for families"],
  "commonParentCautions": ["up to 3 short strings: common practical cautions parents mention"],

  // ── Phase 2 — Parent-facing labels ───────────────────────────────────────
  // Short human-readable labels shown directly to parents in the app
  "bestForAgesLabel": "e.g. 'Best for ages 5-10' or 'All ages' or 'Ages 8+'",
  "timeNeededLabel": "e.g. '45-60 min' or '2+ hours' or 'Quick 20 min'",
  "effortLabel": "e.g. 'Easy stroll' or 'Moderate effort' or 'Bring snacks'",
  "weatherLabel": "e.g. 'Great in rain' or 'Best on sunny days' or 'Outdoor only'",
  "cautionLabel": "e.g. 'Can get crowded' or 'Book ahead' or 'Long queues possible' or null if none",
  "whyWorthItLabel": "e.g. 'Kids can touch real fossils' or 'Jaw-dropping city views'",
  "goodMomentLabel": "e.g. 'Perfect morning stop' or 'Ideal after lunch' or 'Great treat stop'"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No enrichment content returned for stop: ${stop.name}`);

  return JSON.parse(content) as PlacePlanningProfile;
}

function buildIntelligenceValues(placeId: string, profile: PlacePlanningProfile) {
  return {
    placeId,
    // Cache freshness timestamp — always set to now on every write
    cachedAt: new Date(),
    invalidatedAt: null,
    // Phase 1 — Core logistics
    restroomConfidence: profile.restroomConfidence ?? null,
    foodConfidence: profile.foodConfidence ?? null,
    entryFrictionScore: profile.entryFrictionScore ?? null,
    exitEaseScore: profile.exitEaseScore ?? null,
    escapeEaseScore: profile.escapeEaseScore ?? null,
    parkingAvailabilityScore: profile.parkingAvailabilityScore ?? null,
    shadeOrClimateRelief: profile.shadeOrClimateRelief ?? null,
    seatingAvailability: profile.seatingAvailability ?? null,
    shortenabilityScore: profile.shortenabilityScore ?? null,
    skipCostScore: profile.skipCostScore ?? null,
    queueRiskMorning: profile.queueRiskMorning ?? null,
    queueRiskMidday: profile.queueRiskMidday ?? null,
    queueRiskAfternoon: profile.queueRiskAfternoon ?? null,
    lateDayRisk: profile.lateDayRisk ?? null,
    sourceConfidence: profile.sourceConfidence ?? null,
    bestArrivalWindow: profile.bestArrivalWindow ?? null,
    worstArrivalWindow: profile.worstArrivalWindow ?? null,
    rationaleShort: profile.rationaleShort ?? null,
    socialLabel: profile.socialLabel ?? null,
    discoveryLabel: profile.discoveryLabel ?? null,
    // Phase 2 — Age-band fit
    age2to4Fit: profile.age2to4Fit ?? null,
    age5to7Fit: profile.age5to7Fit ?? null,
    age8to12Fit: profile.age8to12Fit ?? null,
    teenFit: profile.teenFit ?? null,
    mixedSiblingFit: profile.mixedSiblingFit ?? null,
    // Phase 2 — Parent reality
    strollerEaseScore: profile.strollerEaseScore ?? null,
    waitingToleranceRequiredScore: profile.waitingToleranceRequiredScore ?? null,
    meltdownRecoveryEaseScore: profile.meltdownRecoveryEaseScore ?? null,
    hungerRecoveryEaseScore: profile.hungerRecoveryEaseScore ?? null,
    bathroomUrgencyResilienceScore: profile.bathroomUrgencyResilienceScore ?? null,
    weatherFallbackStrengthScore: profile.weatherFallbackStrengthScore ?? null,
    ticketValueConfidenceScore: profile.ticketValueConfidenceScore ?? null,
    hassleToJoyRatioScore: profile.hassleToJoyRatioScore ?? null,
    parentEffortScore: profile.parentEffortScore ?? null,
    // Phase 2 — Kid delight
    wowFactorScore: profile.wowFactorScore ?? null,
    handsOnLevelScore: profile.handsOnLevelScore ?? null,
    freePlayLevelScore: profile.freePlayLevelScore ?? null,
    movementReleaseScore: profile.movementReleaseScore ?? null,
    sensoryRewardScore: profile.sensoryRewardScore ?? null,
    curiosityHookScore: profile.curiosityHookScore ?? null,
    // Phase 2 — Day-fit
    morningFitScore: profile.morningFitScore ?? null,
    afterLunchFitScore: profile.afterLunchFitScore ?? null,
    lateDayFitScore: profile.lateDayFitScore ?? null,
    rainyDayFitScore: profile.rainyDayFitScore ?? null,
    hotDayFitScore: profile.hotDayFitScore ?? null,
    coldDayFitScore: profile.coldDayFitScore ?? null,
    quickWinFitScore: profile.quickWinFitScore ?? null,
    treatStopFitScore: profile.treatStopFitScore ?? null,
    anchorStopFitScore: profile.anchorStopFitScore ?? null,
    // Phase 2 — Family evidence
    familyEvidenceScore: profile.familyEvidenceScore ?? null,
    ageMatchConfidenceScore: profile.ageMatchConfidenceScore ?? null,
    worthTheHassleConfidenceScore: profile.worthTheHassleConfidenceScore ?? null,
    hiddenGemFamilyScore: profile.hiddenGemFamilyScore ?? null,
    supportingEvidenceCount: profile.supportingEvidenceCount ?? null,
    commonParentPros: profile.commonParentPros ?? null,
    commonParentCautions: profile.commonParentCautions ?? null,
    // Phase 2 — Parent-facing labels
    bestForAgesLabel: profile.bestForAgesLabel ?? null,
    timeNeededLabel: profile.timeNeededLabel ?? null,
    effortLabel: profile.effortLabel ?? null,
    weatherLabel: profile.weatherLabel ?? null,
    cautionLabel: profile.cautionLabel ?? null,
    whyWorthItLabel: profile.whyWorthItLabel ?? null,
    goodMomentLabel: profile.goodMomentLabel ?? null,
  };
}

/**
 * Fire-and-forget background re-enrichment. Calls the AI pipeline, then upserts
 * all intelligence fields plus cachedAt=now and invalidatedAt=null. Never throws
 * to the caller — all errors are logged and swallowed.
 */
function scheduleReenrichment(stop: StopInput, placeId: string): void {
  (async () => {
    try {
      console.log(`[StopEnrichment] Background re-enrichment started: ${stop.name} (${placeId})`);
      const profile = await callEnrichmentAI(stop);
      const values = buildIntelligenceValues(placeId, profile);
      await db.insert(plannerStopIntelligence)
        .values(values)
        .onConflictDoUpdate({
          target: plannerStopIntelligence.placeId,
          set: values,
        });
      console.log(`[StopEnrichment] Background re-enrichment complete: ${stop.name} (${placeId})`);
    } catch (err) {
      console.error(`[StopEnrichment] Background re-enrichment failed: ${stop.name}`, err);
    }
  })();
}

/**
 * Enrich a stop with PlacePlanningProfile intelligence.
 *
 * Canonical place resolution:
 * 1. The stop has already been inserted into planner_places (placeId is known).
 * 2. We look up any older place with the same normalized name+city via DB LOWER().
 * 3. If an older canonical place exists, we use its placeId for cache lookups.
 * 4. If cached intelligence exists for the canonical place, we propagate it to
 *    the new placeId (without a new AI call) and return.
 * 5. If no cached intelligence, we call GPT-4o, write intelligence for both
 *    the new placeId and the canonical placeId.
 *
 * Serve-then-refresh (TTL):
 * When a cache hit is found but the row is stale (age > TTL tier), the cached
 * data is returned immediately so the caller is never blocked. A non-blocking
 * background re-enrichment job is then fired to refresh the entry silently.
 *
 * This guarantees: every trip stop's placeId has an intelligence record.
 */
export async function enrichStop(
  stop: StopInput,
  placeId: string
): Promise<EnrichedStopData> {
  const city = extractCityFromDestination(stop.destination);
  const canonicalPlaceId = await resolveCanonicalPlaceId(stop.name, city, placeId);

  // ── Cache Gate 1: planner_stop_intelligence ──────────────────────────────
  const cachedRow = await findExistingIntelligence(canonicalPlaceId);
  if (cachedRow) {
    console.log(`[StopEnrichment] stop_completeness=fully_enriched: ${stop.name} (canonical: ${canonicalPlaceId}) — planner_stop_intelligence hit`);

    // Serve-then-refresh: return cached data immediately, queue background refresh if stale.
    // Pass city so isCacheStale can apply the India canonical 180-day TTL override.
    if (isCacheStale(cachedRow, city)) {
      console.log(`[StopEnrichment] Cache stale for: ${stop.name} — scheduling background refresh`);
      scheduleReenrichment(stop, canonicalPlaceId);
    }

    const enriched = rowToEnrichedData(cachedRow);
    if (canonicalPlaceId !== placeId) {
      await db.insert(plannerStopIntelligence)
        .values(buildIntelligenceValues(placeId, enriched))
        .onConflictDoNothing();
    }
    return { ...enriched, placeId, stopCompletenessState: "fully_enriched" as const };
  }

  // ── Cache Gate 2: stop_library.enrichment ────────────────────────────────
  // Check whether the logistics backfill (task #180) has pre-populated
  // stop_library.enrichment for this stop. If so, write the data directly into
  // planner_stop_intelligence and return — no AI call needed.
  const { enrichment: libraryEnrichment, hasStoryContent } = await findStopLibraryEnrichment(stop.name, city);

  if (libraryEnrichment) {
    console.log(`[StopEnrichment] stop_completeness=fully_enriched (gate2): ${stop.name} — using stop_library.enrichment, skipping AI`);

    const values = buildIntelligenceValues(placeId, libraryEnrichment);
    await db.insert(plannerStopIntelligence)
      .values(values)
      .onConflictDoNothing();

    if (canonicalPlaceId !== placeId) {
      await db.insert(plannerStopIntelligence)
        .values(buildIntelligenceValues(canonicalPlaceId, libraryEnrichment))
        .onConflictDoNothing();
    }

    return { placeId, ...libraryEnrichment, stopCompletenessState: "fully_enriched" as const };
  }

  // ── Cache miss on both gates — determine pre-call completeness state ──────
  // content_complete: stop_library row exists with storyPack/audioUrl but no
  // logistics enrichment yet (backfill pending).
  // raw: nothing cached at all.
  const preCallState: StopCompletenessState = hasStoryContent ? "content_complete" : "raw";
  console.log(`[StopEnrichment] stop_completeness=${preCallState}: ${stop.name} (placeId: ${placeId}) — calling AI enrichment`);

  const profile = await callEnrichmentAI(stop);

  await db.insert(plannerStopIntelligence)
    .values(buildIntelligenceValues(placeId, profile))
    .onConflictDoNothing();

  if (canonicalPlaceId !== placeId) {
    await db.insert(plannerStopIntelligence)
      .values(buildIntelligenceValues(canonicalPlaceId, profile))
      .onConflictDoNothing();
  }

  // After enrichment the stop is fully enriched — the pre-call state is surfaced
  // as the logging label so callers know the reason the AI was invoked.
  return { placeId, ...profile, stopCompletenessState: preCallState };
}
