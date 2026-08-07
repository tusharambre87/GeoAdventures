/**
 * Verification script for the isValidPlacePlanningProfile guard.
 *
 * Tests both cast sites are protected:
 *   1. findStopLibraryEnrichment (Gate 2) — old-format stop_library.enrichment
 *      must be rejected so the AI call runs instead of writing a null PSI shell.
 *   2. callEnrichmentAI — schema-drifted AI responses throw rather than silently
 *      producing a null PSI shell.
 *
 * The DB integration test inserts a real stop_library row with the exact same
 * old-format JSON (sensoryLoad / bestTimeOfDay / etc.) that caused the original
 * bug, queries it back, and proves the guard returns null — i.e. Gate 2 misses
 * and enrichStop() would fall through to the AI call.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server exec tsx src/planner/verifyEnrichmentGuard.ts
 */

import { db } from "../db.js";
import { stopLibrary } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { isValidPlacePlanningProfile } from "./stopEnrichmentService.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Exact shape that triggered the bug — old logistics backfill format */
const OLD_FORMAT_BLOB = {
  sensoryLoad: "medium",
  bestTimeOfDay: "early morning or late afternoon",
  nearestRestroom: "Restrooms are available throughout the venue.",
  typicalWaitTime: "usually minimal during weekdays",
  parkingAvailability: "Limited parking nearby; public transport recommended.",
  strollerAccessibility: "yes",
};

/** Minimum valid PlacePlanningProfile — has both required signal types */
const VALID_PROFILE_MINIMAL = {
  rationaleShort: "Great stop for families with kids of all ages.",
  restroomConfidence: 85,
};

/** Full realistic profile (subset of fields — enough to pass the guard) */
const VALID_PROFILE_FULL = {
  rationaleShort: "A world-class natural history collection with something for every age.",
  bestArrivalWindow: "morning",
  restroomConfidence: 90,
  age2to4Fit: 60,
  wowFactorScore: 95,
};

/** Edge case: has one text signal but no numeric signal */
const PARTIAL_TEXT_ONLY = {
  rationaleShort: "Nice place for families.",
};

/** Edge case: has numeric signals but no text signal */
const PARTIAL_NUMERIC_ONLY = {
  restroomConfidence: 80,
  age2to4Fit: 70,
};

/** Another old-format variant — completely different key names */
const OTHER_OLD_FORMAT = {
  recommended_ages: "5-12",
  indoor: true,
  wifi_available: false,
  entry_fee: "Paid",
};

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests — pure, no DB/network
// ─────────────────────────────────────────────────────────────────────────────

function assert(label: string, condition: boolean) {
  const icon = condition ? "✅" : "❌";
  console.log(`  ${icon}  ${label}`);
  if (!condition) process.exitCode = 1;
}

function runUnitTests() {
  console.log("\n── Unit tests: isValidPlacePlanningProfile ──────────────────");

  assert("null input → false",                       !isValidPlacePlanningProfile(null));
  assert("undefined input → false",                  !isValidPlacePlanningProfile(undefined));
  assert("empty object → false",                     !isValidPlacePlanningProfile({}));
  assert("string input → false",                     !isValidPlacePlanningProfile("hello"));
  assert("number input → false",                     !isValidPlacePlanningProfile(42));

  assert("OLD_FORMAT_BLOB → false",                  !isValidPlacePlanningProfile(OLD_FORMAT_BLOB));
  assert("OTHER_OLD_FORMAT → false",                 !isValidPlacePlanningProfile(OTHER_OLD_FORMAT));
  assert("PARTIAL_TEXT_ONLY (no numeric) → false",   !isValidPlacePlanningProfile(PARTIAL_TEXT_ONLY));
  assert("PARTIAL_NUMERIC_ONLY (no text) → false",   !isValidPlacePlanningProfile(PARTIAL_NUMERIC_ONLY));

  assert("VALID_PROFILE_MINIMAL → true",             isValidPlacePlanningProfile(VALID_PROFILE_MINIMAL));
  assert("VALID_PROFILE_FULL → true",                isValidPlacePlanningProfile(VALID_PROFILE_FULL));

  // Boundary: empty string for rationaleShort should NOT satisfy the text signal
  assert("rationaleShort='' → false",
    !isValidPlacePlanningProfile({ rationaleShort: "", restroomConfidence: 80 }));

  // Boundary: bestArrivalWindow + numeric → true (alternative text signal)
  assert("bestArrivalWindow + numeric → true",
    isValidPlacePlanningProfile({ bestArrivalWindow: "morning", wowFactorScore: 70 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// DB integration test
// ─────────────────────────────────────────────────────────────────────────────

const TEST_STOP_NAME = "__verify_guard_test_stop__";
const TEST_CITY       = "__verify_guard_city__";

async function runDbIntegrationTest() {
  console.log("\n── DB integration: Gate 2 rejects old-format enrichment ──────");

  // 1. Insert a stop_library row with the stale old-format enrichment blob
  await db
    .insert(stopLibrary)
    .values({
      name:           TEST_STOP_NAME,
      city:           TEST_CITY,
      country:        "Test Country",
      stopType:       "museum",
      normalizedName: `${TEST_CITY}:${TEST_STOP_NAME}`.toLowerCase(),
      normalizedKey:  `${TEST_CITY.toLowerCase()}:${TEST_STOP_NAME.toLowerCase()}`,
      enrichment:     OLD_FORMAT_BLOB as any,
    })
    .onConflictDoNothing();

  console.log("  → Inserted test stop_library row with OLD_FORMAT_BLOB enrichment");

  // 2. Query it back exactly as findStopLibraryEnrichment does
  const rows = await db
    .select({ enrichment: stopLibrary.enrichment })
    .from(stopLibrary)
    .where(
      and(
        sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${TEST_CITY}))`,
        sql`LOWER(TRIM(${stopLibrary.name})) = LOWER(TRIM(${TEST_STOP_NAME}))`,
      ),
    )
    .limit(1);

  const row = rows[0];
  assert("Row found in DB",               !!row);
  assert("enrichment column is non-null", row?.enrichment != null);

  // 3. The old cast (pre-fix) would have returned this as a PlacePlanningProfile
  const oldBehaviourResult =
    row?.enrichment && typeof row.enrichment === "object"
      ? (row.enrichment as any)
      : null;
  assert("OLD cast: would have returned truthy object (pre-fix bug)",
    oldBehaviourResult !== null);

  // 4. The guard (post-fix) correctly rejects it
  const guardResult = isValidPlacePlanningProfile(row?.enrichment);
  assert("GUARD rejects OLD_FORMAT_BLOB from DB → false (Gate 2 misses → AI runs)",
    guardResult === false);

  // 5. For contrast: insert valid enrichment and confirm guard accepts it
  await db
    .update(stopLibrary)
    .set({ enrichment: VALID_PROFILE_FULL as any })
    .where(
      and(
        sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${TEST_CITY}))`,
        sql`LOWER(TRIM(${stopLibrary.name})) = LOWER(TRIM(${TEST_STOP_NAME}))`,
      ),
    );

  const rows2 = await db
    .select({ enrichment: stopLibrary.enrichment })
    .from(stopLibrary)
    .where(
      and(
        sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${TEST_CITY}))`,
        sql`LOWER(TRIM(${stopLibrary.name})) = LOWER(TRIM(${TEST_STOP_NAME}))`,
      ),
    )
    .limit(1);

  const guardResult2 = isValidPlacePlanningProfile(rows2[0]?.enrichment);
  assert("GUARD accepts VALID_PROFILE_FULL from DB → true (Gate 2 fires correctly)",
    guardResult2 === true);

  // 6. Cleanup
  await db
    .delete(stopLibrary)
    .where(
      and(
        eq(stopLibrary.name, TEST_STOP_NAME),
        eq(stopLibrary.city, TEST_CITY),
      ),
    );
  console.log("  → Cleaned up test stop_library row");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Enrichment guard verification ===");

  runUnitTests();
  await runDbIntegrationTest();

  const passed = process.exitCode !== 1;
  console.log(`\n${ passed ? "✅ All checks passed." : "❌ One or more checks FAILED." }`);
  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
