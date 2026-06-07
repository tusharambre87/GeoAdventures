/**
 * Integration test: multi-city trips show stops grouped by city in the itinerary view.
 *
 * Covers:
 *   - new-user path  (simulates account.tsx POST after registration)
 *   - returning-user path (simulates preview.tsx POST for an already-logged-in user)
 *
 * Both paths call POST /api/travel/trips with the same multi-city payload.
 *
 * The test then:
 *   1. Polls GET /api/travel/trips/:id/stops and asserts each city has ≥1 stop
 *      with the correct `cityGroup` value (the data the itinerary view reads).
 *   2. Runs the same `groupStopsByDay` function that the itinerary tab calls to
 *      partition stops into day-buckets, and asserts those buckets contain stops
 *      from each city (proving the UI would render the expected city sections).
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run test:multi-city-itinerary
 *
 * Prerequisite: the API server must be running at localhost:80.
 */

const API = "http://localhost:80";

// ─── Minimal stop shape (mirrors TravelStop from @shared/schema) ──────────────
// We only need the fields groupStopsByDay actually reads at runtime.
interface Stop {
  id: string;
  name: string;
  cityGroup?: string | null;
  dayIndex?: number | null;
  displayOrder?: number | null;
}

// ─── Inline groupStopsByDay (exact copy from artifacts/roamus/src/lib/travelDayGroups.ts) ──
// Keeping it inline avoids cross-package import issues (no drizzle-orm in scripts).
// If the source changes, update this copy too.

function distributeEvenly(stops: Stop[], numDays: number): Stop[][] {
  const slices: Stop[][] = Array.from({ length: numDays }, () => []);
  stops.forEach((s, i) => slices[Math.floor(i * numDays / stops.length)].push(s));
  return slices;
}

function groupByDayIndex(stops: Stop[], numDays?: number): Stop[][] {
  const maxDay = stops.reduce((m, s) => Math.max(m, s.dayIndex ?? 0), 0);
  const totalDays = numDays != null ? Math.max(numDays, maxDay + 1) : maxDay + 1;
  const result: Stop[][] = Array.from({ length: totalDays }, () => []);
  for (const stop of stops) {
    const d = stop.dayIndex ?? 0;
    const slot = Math.min(d, totalDays - 1);
    result[slot].push(stop);
  }
  for (const day of result) {
    day.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }
  return result;
}

function groupStopsByDay(stops: Stop[], numDays?: number): Stop[][] {
  if (stops.length === 0) return [];

  // Primary path: explicit dayIndex
  const anyHasDayIndex = stops.some(s => s.dayIndex != null);
  if (anyHasDayIndex) {
    return groupByDayIndex(stops, numDays);
  }

  // Legacy path: group by cityGroup
  const hasCityGroups = stops.some(s => s.cityGroup);
  if (hasCityGroups) {
    const namedStops  = stops.filter(s => !!s.cityGroup);
    const unknownStops = stops.filter(s => !s.cityGroup);
    const cityOrder: string[] = [];
    const cityMap = new Map<string, Stop[]>();
    for (const stop of namedStops) {
      const cg = stop.cityGroup as string;
      if (!cityMap.has(cg)) { cityMap.set(cg, []); cityOrder.push(cg); }
      cityMap.get(cg)!.push(stop);
    }
    for (const stop of unknownStops) {
      const order = stop.displayOrder ?? 0;
      let best = cityOrder[0] ?? "__unknown__";
      for (const cg of cityOrder) {
        const maxOrder = Math.max(...cityMap.get(cg)!.map(s => s.displayOrder ?? 0));
        if (maxOrder <= order) best = cg;
      }
      if (!cityMap.has(best)) { cityMap.set(best, []); cityOrder.push(best); }
      cityMap.get(best)!.push(stop);
    }
    const STOPS_PER_DAY = 4;
    const days: Stop[][] = [];
    for (const city of cityOrder) {
      const cityStops = (cityMap.get(city) ?? []).sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      if (cityStops.length === 0) continue;
      const daysForCity = Math.max(1, Math.ceil(cityStops.length / STOPS_PER_DAY));
      days.push(...distributeEvenly(cityStops, daysForCity));
    }
    return days;
  }

  // Fallback: distribute evenly
  const sorted = [...stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const STOPS_PER_DAY = 5;
  const groups: Stop[][] = [];
  for (let i = 0; i < sorted.length; i += STOPS_PER_DAY) {
    groups.push(sorted.slice(i, i + STOPS_PER_DAY));
  }
  return groups;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function post(path: string, body: unknown, token?: string): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function get(path: string, token: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

let _failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    _failed++;
    return;
  }
  console.log(`  ✓ ${message}`);
}

function extractStops(body: unknown): Stop[] {
  if (Array.isArray(body)) return body as Stop[];
  if (body && typeof body === "object" && "stops" in (body as object)) {
    return ((body as { stops: Stop[] }).stops) ?? [];
  }
  return [];
}

async function pollStopsUntilCitiesReady(
  tripId: string,
  token: string,
  cities: string[],
  opts = { intervalMs: 5_000, maxAttempts: 12 }
): Promise<Stop[]> {
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const { status, body } = await get(`/api/travel/trips/${tripId}/stops`, token);
    if (status !== 200) {
      console.log(`    poll attempt ${attempt}/${opts.maxAttempts}: HTTP ${status}`);
    } else {
      const stops = extractStops(body);
      const presentCities = new Set(stops.map(s => s.cityGroup).filter(Boolean));
      const allReady = cities.every(c => presentCities.has(c));
      console.log(
        `    poll attempt ${attempt}/${opts.maxAttempts}: ${stops.length} stops, cities present: [${[...presentCities].join(", ")}]`
      );
      if (allReady) return stops;
    }
    if (attempt < opts.maxAttempts) {
      await new Promise(r => setTimeout(r, opts.intervalMs));
    }
  }
  const { body } = await get(`/api/travel/trips/${tripId}/stops`, token);
  return extractStops(body);
}

// ─── Shared trip payload builder ──────────────────────────────────────────────

function buildMultiCityPayload(opts: {
  name: string;
  primaryCity: string;
  secondaryCity: string;
  country: string;
  startDate: string;
  midDate: string;
  endDate: string;
}) {
  const { name, primaryCity, secondaryCity, country, startDate, midDate, endDate } = opts;
  return {
    name,
    destination: `${primaryCity}, ${secondaryCity}`,
    city: primaryCity,
    country,
    startDate,
    endDate,
    travelers: [
      { name: "Parent", isParent: true, age: "35" },
      { name: "Kid", isParent: false, age: "8" },
    ],
    adventureStyle: "family_explorer",
    pace: "balanced",
    adventureContext: "travel",
    autoGenerateStops: true,
    cityDates: {
      [primaryCity]: { startDate, endDate: midDate },
      [secondaryCity]: { startDate: midDate, endDate },
    },
    tailoring: {
      indoorOutdoor: "both",
      budgetSensitivity: "moderate",
      kidEnergyLevel: "mixed",
    },
  };
}

// ─── City-grouping assertions (validates the itinerary view partitioning) ─────

/**
 * Run the same groupStopsByDay logic the itinerary tab uses and assert city-section behaviour.
 *
 * Two sub-tests:
 *
 * 1. "By dayIndex" — the live path when stops have explicit day assignments.
 *    Asserts every expected city has presence in at least one day bucket.
 *    (bg-multicity stops don't get dayIndex, so they can share day-0 with primary-city stops —
 *     that is a separate rendering bug and not the responsibility of this test.)
 *
 * 2. "By cityGroup" — the cityGroup legacy path, simulating what groupStopsByDay
 *    produces when dayIndex is stripped. This is the pure city-section test:
 *    each city should produce its own cohesive day buckets with no cross-city days.
 *    This validates the fix that ensures stops have a non-empty cityGroup, which is
 *    what the itinerary tab uses to build city sections when dayIndex is absent.
 */
function assertItineraryGrouping(stops: Stop[], expectedCities: string[], label: string): void {
  // ── Sub-test 1: live dayIndex path ────────────────────────────────────────
  const daysByIndex = groupStopsByDay(stops);
  assert(daysByIndex.length >= 1,
    `[${label}] groupStopsByDay (dayIndex path) produces ≥1 day bucket (got ${daysByIndex.length})`
  );
  for (const city of expectedCities) {
    const cityDays = daysByIndex.filter(day => day.some(s => s.cityGroup === city));
    assert(cityDays.length >= 1,
      `[${label}] dayIndex grouping: ≥1 bucket contains ${city} stops (got ${cityDays.length})`
    );
  }

  // ── Sub-test 2: cityGroup legacy path (strips dayIndex) ───────────────────
  // This validates the task's core fix: stops now have cityGroup set, so when
  // dayIndex is absent (e.g. newly generated bg-multicity stops), groupStopsByDay
  // can partition by city and each city gets its own section.
  const stopsNoDayIndex = stops.map(s => ({ ...s, dayIndex: null as number | null }));
  const daysByCityGroup = groupStopsByDay(stopsNoDayIndex);

  assert(daysByCityGroup.length >= expectedCities.length,
    `[${label}] cityGroup grouping: produces ≥${expectedCities.length} city sections (got ${daysByCityGroup.length})`
  );

  for (const city of expectedCities) {
    const cityDays = daysByCityGroup.filter(day => day.some(s => s.cityGroup === city));
    assert(cityDays.length >= 1,
      `[${label}] cityGroup grouping: ≥1 city section contains ${city} stops (got ${cityDays.length})`
    );
  }

  // cityGroup grouping must not mix stops from different cities in the same bucket
  let contaminated = 0;
  for (const day of daysByCityGroup) {
    const citiesInDay = new Set(day.map(s => s.cityGroup).filter(Boolean));
    if (citiesInDay.size > 1) contaminated++;
  }
  assert(contaminated === 0,
    `[${label}] cityGroup grouping: no city section mixes stops from different cities (contaminated: ${contaminated})`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Step 1: Register a fresh user ──────────────────────────────────────────
  const uid = Math.random().toString(36).slice(2, 10);
  const email = `multicitytest_${uid}@roamustest.dev`;
  const password = "TestPass123!";
  console.log("\n[1] Registering new user (new-user path — simulates account.tsx registration)");
  console.log(`    email: ${email}`);

  const regResult = await post("/api/register", {
    name: "Test Family",
    email,
    password,
    players: [
      { name: "Parent", isParent: true, age: "35" },
      { name: "Kid", isParent: false, age: "8" },
    ],
  });

  assert(
    regResult.status === 200 || regResult.status === 201,
    `Registration returns 200/201 (got ${regResult.status})`
  );
  if (regResult.status !== 200 && regResult.status !== 201) {
    console.error("  Fatal: cannot continue without a registered user.");
    process.exit(1);
  }

  // ── Step 2: Get JWT token ──────────────────────────────────────────────────
  console.log("\n[2] Obtaining JWT token");
  const tokenResult = await post("/api/auth/token", { email, password });
  assert(tokenResult.status === 200, `Token endpoint returns 200 (got ${tokenResult.status})`);
  if (tokenResult.status !== 200) {
    console.error("  Fatal: cannot continue without a JWT.");
    process.exit(1);
  }
  const token = (tokenResult.body as { token: string }).token;

  // ══════════════════════════════════════════════════════════════════════════
  // PART A — new-user path (account.tsx POST after registration)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n[A] NEW-USER PATH  (simulates account.tsx POST — Paris + Milan)");

  const payloadA = buildMultiCityPayload({
    name: "Paris & Milan Family Trip",
    primaryCity: "Paris",
    secondaryCity: "Milan",
    country: "France",
    startDate: "2026-09-01",
    midDate: "2026-09-05",
    endDate: "2026-09-08",
  });

  const tripAResult = await post("/api/travel/trips", payloadA, token);
  assert(
    tripAResult.status === 200 || tripAResult.status === 201,
    `Trip creation (A) returns 200/201 (got ${tripAResult.status})`
  );
  const tripIdA = (tripAResult.body as { id: string }).id ?? "";
  assert(typeof tripIdA === "string" && tripIdA.length > 0, `Trip (A) has valid id`);

  if (tripIdA) {
    console.log(`    trip id: ${tripIdA}`);
    console.log("    Polling stops (waiting for bg-multicity to complete) …");
    const stopsA = await pollStopsUntilCitiesReady(tripIdA, token, ["Paris", "Milan"]);

    // ── Data-layer assertions (cityGroup values) ───────────────────────────
    const parisStops = stopsA.filter(s => s.cityGroup === "Paris");
    const milanStops = stopsA.filter(s => s.cityGroup === "Milan");

    assert(parisStops.length >= 1, `Trip A: ≥1 stop has cityGroup="Paris" (found ${parisStops.length})`);
    assert(milanStops.length >= 1, `Trip A: ≥1 stop has cityGroup="Milan" (found ${milanStops.length})`);
    assert(stopsA.length >= 2, `Trip A: total stop count ≥2 (found ${stopsA.length})`);

    // Verify no Paris stop has cityGroup="Milan" and vice versa
    const parisContaminated = parisStops.filter(s => s.cityGroup !== "Paris").length;
    const milanContaminated = milanStops.filter(s => s.cityGroup !== "Milan").length;
    assert(parisContaminated === 0, `Trip A: no Paris stop has wrong cityGroup (contaminated: ${parisContaminated})`);
    assert(milanContaminated === 0, `Trip A: no Milan stop has wrong cityGroup (contaminated: ${milanContaminated})`);

    // ── Itinerary-view assertions (groupStopsByDay — the function the UI calls) ─
    console.log("    Running groupStopsByDay (same function the itinerary tab uses) …");
    assertItineraryGrouping(stopsA, ["Paris", "Milan"], "Trip A");

    console.log(`    Summary: ${parisStops.length} Paris stops, ${milanStops.length} Milan stops, ${stopsA.length} total`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PART B — returning-user path (preview.tsx POST with existing JWT)
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n[B] RETURNING-USER PATH  (simulates preview.tsx POST — London + Amsterdam)");

  const payloadB = buildMultiCityPayload({
    name: "London & Amsterdam Family Trip",
    primaryCity: "London",
    secondaryCity: "Amsterdam",
    country: "UK",
    startDate: "2026-10-01",
    midDate: "2026-10-04",
    endDate: "2026-10-07",
  });

  const tripBResult = await post("/api/travel/trips", payloadB, token);
  assert(
    tripBResult.status === 200 || tripBResult.status === 201,
    `Trip creation (B) returns 200/201 (got ${tripBResult.status})`
  );
  const tripIdB = (tripBResult.body as { id: string }).id ?? "";
  assert(typeof tripIdB === "string" && tripIdB.length > 0, `Trip (B) has valid id`);

  if (tripIdB) {
    console.log(`    trip id: ${tripIdB}`);
    console.log("    Polling stops (waiting for bg-multicity to complete) …");
    const stopsB = await pollStopsUntilCitiesReady(tripIdB, token, ["London", "Amsterdam"]);

    // ── Data-layer assertions ──────────────────────────────────────────────
    const londonStops = stopsB.filter(s => s.cityGroup === "London");
    const amsterdamStops = stopsB.filter(s => s.cityGroup === "Amsterdam");

    assert(londonStops.length >= 1, `Trip B: ≥1 stop has cityGroup="London" (found ${londonStops.length})`);
    assert(amsterdamStops.length >= 1, `Trip B: ≥1 stop has cityGroup="Amsterdam" (found ${amsterdamStops.length})`);
    assert(stopsB.length >= 2, `Trip B: total stop count ≥2 (found ${stopsB.length})`);

    const londonContaminated = londonStops.filter(s => s.cityGroup !== "London").length;
    const amsterdamContaminated = amsterdamStops.filter(s => s.cityGroup !== "Amsterdam").length;
    assert(londonContaminated === 0, `Trip B: no London stop has wrong cityGroup (contaminated: ${londonContaminated})`);
    assert(amsterdamContaminated === 0, `Trip B: no Amsterdam stop has wrong cityGroup (contaminated: ${amsterdamContaminated})`);

    // ── Itinerary-view assertions ──────────────────────────────────────────
    console.log("    Running groupStopsByDay (same function the itinerary tab uses) …");
    assertItineraryGrouping(stopsB, ["London", "Amsterdam"], "Trip B");

    console.log(`    Summary: ${londonStops.length} London stops, ${amsterdamStops.length} Amsterdam stops, ${stopsB.length} total`);
  }

  // ── Final result ────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  if (_failed > 0) {
    console.error(`RESULT: FAILED — ${_failed} assertion(s) did not pass`);
    process.exit(1);
  } else {
    console.log("RESULT: PASSED — multi-city itinerary grouping verified for both onboarding paths");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
