/**
 * Tests for quality-profile-driven stop selection
 *
 * Covers:
 *  - buildUserStopTypeProfile(): big-hit boosts, not_worth_it penalties, exclusion threshold
 *  - selectStopsFromPool(): excluded types filtered, boosted types rank above penalised types
 *
 * No database required — all data is mocked inline.
 * Run with: npx tsx tests/stopQualityProfile.test.ts
 */

import { buildUserStopTypeProfile } from "../server/stopQualityScoring";
import { selectStopsFromPool, type PlannerInput } from "../server/planner/plannerService";
import type { CachedStopCandidate } from "@shared/schema";
import type { StopQualitySignal } from "@shared/schema";

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}:`, (e as Error).message);
    failed++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}


/**
 * Builds a minimal StopQualitySignal with sensible defaults so tests only
 * specify the fields that matter.
 */
function sig(
  overrides: Partial<StopQualitySignal> & Pick<StopQualitySignal, "signalType">,
): StopQualitySignal & { stopType: string; tripCity?: string } {
  return {
    id: "test-id",
    userId: "user-1",
    tripId: "trip-1",
    stopId: "stop-1",
    signalValue: null,
    signalReason: null,
    createdAt: new Date(),
    stopType: "museum",
    tripCity: null,
    ...overrides,
  } as StopQualitySignal & { stopType: string; tripCity?: string };
}

/**
 * Builds a minimal CachedStopCandidate for pool-selection tests.
 */
function candidate(
  overrides: Partial<CachedStopCandidate> & { type: string; name: string },
): CachedStopCandidate {
  return {
    stopType: overrides.type,
    description: "",
    latitude: undefined,
    longitude: undefined,
    address: undefined,
    durationMinutes: 60,
    effortLevel: "moderate",
    indoorOutdoor: "both",
    sensoryLoad: "moderate",
    familyAnchorType: "support",
    minAge: 3,
    whyNow: "",
    parentSupportData: {
      breakSuggestion: "",
      foodSuggestion: "",
      keepGoingSuggestion: "",
      moreFunSuggestion: "",
      shortenSuggestion: "",
    },
    placeReferenceData: {
      directionsNote: "",
      openingHours: "",
      priceRange: "free",
      bookingRequired: false,
    },
    placeProfileData: {
      whyItWorks: "",
      bathroomNotes: "",
      foodOptions: "",
      parkingNotes: "",
      bestTimeOfDay: "",
      weatherSensitive: false,
      strollerFriendly: true,
      nearbyStops: [],
      practicalTips: [],
    },
    ...overrides,
  };
}

/** Minimal PlannerInput for pool selection tests (1 day, moderate pace → 3 stops) */
const basePlannerInput: PlannerInput = {
  destination: "Chicago",
  tripDays: 1,
  childrenAges: [8],
  pace: "moderate",
};

// ── Tests: buildUserStopTypeProfile ──────────────────────────────────────────

console.log("\nbuildUserStopTypeProfile() unit tests\n");

await test("big-hit signal: type appears in bigHitTypes", () => {
  const signals = [
    sig({ signalType: "worth_it", signalValue: "big_hit", stopType: "zoo" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert(profile.bigHitTypes.has("zoo"), "expected 'zoo' in bigHitTypes");
});

await test("big-hit signal: typeScores for that type is positive", () => {
  const signals = [
    sig({ signalType: "worth_it", signalValue: "big_hit", stopType: "zoo" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert((profile.typeScores["zoo"] ?? 0) > 0, `expected positive typeScore for 'zoo', got ${profile.typeScores["zoo"]}`);
});

await test("single not_worth_it skipped signal: typeScore is negative but type NOT excluded", () => {
  const signals = [
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert((profile.typeScores["museum"] ?? 0) < 0, `expected negative typeScore for 'museum', got ${profile.typeScores["museum"]}`);
  assert(!profile.excludedTypes.has("museum"), "expected 'museum' NOT in excludedTypes after just 1 not_worth_it");
});

await test("not_worth_it via skip_next_time signal: typeScore is negative but type NOT excluded on its own", () => {
  const signals = [
    sig({ signalType: "worth_it", signalValue: "skip_next_time", stopType: "history" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert((profile.typeScores["history"] ?? 0) < 0, `expected negative typeScore for 'history', got ${profile.typeScores["history"]}`);
  assert(!profile.excludedTypes.has("history"), "expected 'history' NOT excluded on first skip_next_time");
});

await test("two not_worth_it skipped signals: type IS added to excludedTypes (≥2 threshold)", () => {
  const signals = [
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert(profile.excludedTypes.has("museum"), "expected 'museum' in excludedTypes after 2 not_worth_it signals");
});

await test("mixed: skip_next_time + not_worth_it skipped → both count towards ≥2 exclusion threshold", () => {
  const signals = [
    sig({ signalType: "worth_it", signalValue: "skip_next_time", stopType: "park" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "park" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert(profile.excludedTypes.has("park"), "expected 'park' excluded when skip_next_time + not_worth_it together reach ≥2");
});

await test("positive signals (visited, favorite): typeScore is positive, type not excluded", () => {
  const signals = [
    sig({ signalType: "visited", stopType: "aquarium" }),
    sig({ signalType: "favorite", signalValue: "true", stopType: "aquarium" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert((profile.typeScores["aquarium"] ?? 0) > 0, `expected positive typeScore for 'aquarium'`);
  assert(!profile.excludedTypes.has("aquarium"), "expected 'aquarium' not excluded");
});

await test("city-scoped signals: cityTypeScores populated separately from global typeScores", () => {
  const signals = [
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum", tripCity: "Chicago" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum", tripCity: "Chicago" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert(
    profile.cityExcludedTypes["chicago"]?.has("museum") ?? false,
    "expected 'museum' in cityExcludedTypes['chicago'] after 2 city-scoped not_worth_it signals",
  );
});

await test("typeScores clamp at maximum +6", () => {
  const signals = [
    sig({ signalType: "worth_it", signalValue: "big_hit", stopType: "park" }),
    sig({ signalType: "worth_it", signalValue: "big_hit", stopType: "park" }),
    sig({ signalType: "worth_it", signalValue: "big_hit", stopType: "park" }),
    sig({ signalType: "favorite", signalValue: "true", stopType: "park" }),
    sig({ signalType: "favorite", signalValue: "true", stopType: "park" }),
    sig({ signalType: "photo_added", stopType: "park" }),
    sig({ signalType: "note_added", stopType: "park" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert((profile.typeScores["park"] ?? 0) <= 6, `typeScore should be capped at +6, got ${profile.typeScores["park"]}`);
});

await test("typeScores clamp at minimum -8", () => {
  const signals = [
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "lecture" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "lecture" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "lecture" }),
    sig({ signalType: "worth_it", signalValue: "skip_next_time", stopType: "lecture" }),
    sig({ signalType: "short_dwell", stopType: "lecture" }),
  ];
  const profile = buildUserStopTypeProfile(signals);
  assert((profile.typeScores["lecture"] ?? 0) >= -8, `typeScore should be capped at -8, got ${profile.typeScores["lecture"]}`);
});

// ── Tests: selectStopsFromPool (integration-level) ────────────────────────────

console.log("\nselectStopsFromPool() integration-level tests\n");

await test("excluded type is filtered out of selected stops", () => {
  const pool: CachedStopCandidate[] = [
    candidate({ name: "City Museum", type: "museum" }),
    candidate({ name: "Art Gallery", type: "museum" }),
    candidate({ name: "Riverwalk Park", type: "park" }),
    candidate({ name: "Millennium Park", type: "park" }),
    candidate({ name: "Navy Pier", type: "attraction" }),
    candidate({ name: "Lincoln Park Zoo", type: "zoo" }),
  ];

  const profile = buildUserStopTypeProfile([
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum" }),
  ]);

  const results = selectStopsFromPool(pool, basePlannerInput, profile);
  const resultTypes = results.map(s => s.type);
  assert(
    !resultTypes.includes("museum"),
    `expected no 'museum' stops in results; got types: ${resultTypes.join(", ")}`,
  );
});

await test("boosted type (big hit) ranks above penalised type in results", () => {
  // Moderate pace = 3 stops/day. Use exactly 3 stops so all must be selected,
  // then verify the order reflects the quality-profile scoring.
  const pool: CachedStopCandidate[] = [
    candidate({ name: "City Zoo", type: "zoo" }),
    candidate({ name: "City Market", type: "market" }),
    candidate({ name: "Neutral Spot A", type: "landmark" }),
  ];

  // zoo = big hit → typeScores positive + in bigHitTypes
  // market = 1× not_worth_it → penalty but not excluded
  const profile = buildUserStopTypeProfile([
    sig({ signalType: "worth_it", signalValue: "big_hit", stopType: "zoo" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "market" }),
  ]);

  const results = selectStopsFromPool(pool, basePlannerInput, profile);

  const zooIdx = results.findIndex(s => s.type === "zoo");
  const marketIdx = results.findIndex(s => s.type === "market");

  assert(zooIdx !== -1, "expected 'zoo' stop to appear in results");
  assert(marketIdx !== -1, "expected 'market' stop to appear in results");
  assert(
    zooIdx < marketIdx,
    `expected 'zoo' (index ${zooIdx}) to appear before 'market' (index ${marketIdx}) in results`,
  );
});

await test("city-scoped exclusion filters type only when targetCity matches and pool is large enough", () => {
  // Pool has 4 stops, need 3 (moderate, 1 day). Chicago exclusion of museum leaves
  // exactly 3 → filter is applied and museum is removed.
  const pool: CachedStopCandidate[] = [
    candidate({ name: "Museum of Science", type: "museum" }),
    candidate({ name: "Lincoln Park Zoo", type: "zoo" }),
    candidate({ name: "Millennium Park", type: "park" }),
    candidate({ name: "Navy Pier", type: "attraction" }),
  ];

  const profile = buildUserStopTypeProfile([
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum", tripCity: "Chicago" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum", tripCity: "Chicago" }),
  ]);

  const resultsChicago = selectStopsFromPool(pool, basePlannerInput, profile, "Chicago");
  const chicagoTypes = resultsChicago.map(s => s.type);
  assert(
    !chicagoTypes.includes("museum"),
    `expected 'museum' excluded for Chicago; got: ${chicagoTypes.join(", ")}`,
  );
});

await test("city-scoped exclusion is not applied when pool has too few stops after filtering", () => {
  // Pool has exactly 3 stops (= totalStopsNeeded). Excluding museum would leave only
  // 2 — fewer than needed — so the exclusion must NOT be applied and museum must appear.
  const pool: CachedStopCandidate[] = [
    candidate({ name: "Museum of Science", type: "museum" }),
    candidate({ name: "Lincoln Park Zoo", type: "zoo" }),
    candidate({ name: "Millennium Park", type: "park" }),
  ];

  const profile = buildUserStopTypeProfile([
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum", tripCity: "Chicago" }),
    sig({ signalType: "skipped", signalReason: "not_worth_it", stopType: "museum", tripCity: "Chicago" }),
  ]);

  const results = selectStopsFromPool(pool, basePlannerInput, profile, "Chicago");
  const resultTypes = results.map(s => s.type);
  assert(
    resultTypes.includes("museum"),
    `expected 'museum' to survive when the pool would fall below totalStopsNeeded after exclusion; got: ${resultTypes.join(", ")}`,
  );
});

await test("no quality profile: all stops eligible for selection (no exclusion applied)", () => {
  const pool: CachedStopCandidate[] = [
    candidate({ name: "Museum A", type: "museum" }),
    candidate({ name: "Park B", type: "park" }),
    candidate({ name: "Zoo C", type: "zoo" }),
  ];
  const results = selectStopsFromPool(pool, basePlannerInput);
  assert(results.length === 3, `expected 3 stops selected, got ${results.length}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
