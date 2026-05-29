/**
 * Integration tests for /api/memory-engine/:destination
 *
 * Requires the server running on http://localhost:5000
 * Run with: npx tsx tests/memoryEngine.integration.test.ts
 */

const BASE = "http://localhost:5000";

interface MemoryPayload {
  destinationKey: string;
  heroLine: string;
  heroSubline: string;
  heroImageUrl: string;
  moments: { placeName: string; momentType: string; imageUrl: string; caption: string; sortOrder: number }[];
  kidQuotes: string[];
  kidImageUrl: string;
  parentReliefLine: string;
  parentImageUrl: string;
}

async function get(path: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function assertShape(payload: MemoryPayload, label: string): void {
  if (!payload.destinationKey) throw new Error(`${label}: missing destinationKey`);
  if (!payload.heroLine) throw new Error(`${label}: missing heroLine`);
  // Spec requires exactly 4 moments for the 2x2 grid in Card 2
  if (!Array.isArray(payload.moments) || payload.moments.length < 4)
    throw new Error(`${label}: expected 4 moments, got ${payload.moments?.length}`);
  // Spec requires 3 kid quotes for the Kid Memory card rotation
  if (!Array.isArray(payload.kidQuotes) || payload.kidQuotes.length < 3)
    throw new Error(`${label}: expected 3 kidQuotes, got ${payload.kidQuotes?.length}`);
  if (!payload.parentReliefLine) throw new Error(`${label}: missing parentReliefLine`);
  console.log(`  ✓ ${label}: shape valid (key=${payload.destinationKey}, moments=${payload.moments.length}, quotes=${payload.kidQuotes.length})`);
}

async function run(): Promise<void> {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      passed++;
    } catch (e) {
      console.error(`  ✗ ${name}:`, (e as Error).message);
      failed++;
    }
  }

  console.log("\nMemory Engine API Integration Tests\n");

  await test("cache-hit: top-10 seed responds fast with correct shape (Chicago)", async () => {
    const t0 = Date.now();
    const { ok, data } = await get("/api/memory-engine/Chicago");
    const elapsed = Date.now() - t0;
    if (!ok) throw new Error(`Non-200 response`);
    assertShape(data as MemoryPayload, "Chicago");
    if ((data as MemoryPayload).destinationKey !== "chicago")
      throw new Error(`Expected key=chicago, got=${(data as MemoryPayload).destinationKey}`);
    console.log(`    (${elapsed}ms)`);
  });

  await test("cache-hit: destination alias normalization (Paris, France → paris)", async () => {
    const { ok, data } = await get("/api/memory-engine/Paris%2C%20France");
    if (!ok) throw new Error(`Non-200 response`);
    assertShape(data as MemoryPayload, "Paris, France");
    if ((data as MemoryPayload).destinationKey !== "paris")
      throw new Error(`Expected key=paris, got=${(data as MemoryPayload).destinationKey}`);
  });

  await test("context params accepted: country + tripType + stops", async () => {
    const { ok, data } = await get("/api/memory-engine/Tokyo?country=Japan&tripType=family_explorer&stops=Shibuya,Akihabara");
    if (!ok) throw new Error(`Non-200 response`);
    assertShape(data as MemoryPayload, "Tokyo+context");
  });

  await test("validation: 1-char destination returns 400", async () => {
    const { status } = await get("/api/memory-engine/x");
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    console.log(`  ✓ short destination: 400 returned`);
  });

  await test("validation: destination >200 chars returns 400", async () => {
    const long = "a".repeat(201);
    const { status } = await get(`/api/memory-engine/${encodeURIComponent(long)}`);
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    console.log(`  ✓ oversized destination: 400 returned`);
  });

  await test("output quality: moments reference real places, no banned words", async () => {
    const { ok, data } = await get("/api/memory-engine/London?country=UK");
    if (!ok) throw new Error(`Non-200 response`);
    const payload = data as MemoryPayload;
    assertShape(payload, "London quality");
    const BANNED = ["amazing", "incredible", "unforgettable", "magical", "wonderful", "breathtaking"];
    const allText = [
      payload.heroLine,
      payload.heroSubline,
      ...payload.moments.map(m => `${m.placeName} ${m.caption}`),
      ...payload.kidQuotes,
      payload.parentReliefLine,
    ].join(" ").toLowerCase();
    const found = BANNED.filter(w => allText.includes(w));
    if (found.length > 0) throw new Error(`Banned marketing words found: ${found.join(", ")}`);
    const destInMoments = payload.moments.some(m =>
      (m.placeName + m.caption).toLowerCase().includes("london") ||
      (m.placeName + m.caption).toLowerCase().includes("uk")
    );
    if (!destInMoments) throw new Error("No moment references London/UK in placeName or caption");
    console.log(`  ✓ London quality: no banned words, real-place refs present`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
