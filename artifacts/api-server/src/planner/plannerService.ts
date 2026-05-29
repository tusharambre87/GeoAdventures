import OpenAI from "openai";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  plannerTripPlans,
  plannerTripPlanStops,
  plannerPasses,
  plannerPlaces,
  plannerPlaceProfiles,
  plannerParentSupport,
  plannerPlaceReference,
  plannerStopIntelligence,
  stopLibrary,
  travelTrips,
  travelStops,
  type PlannerTripPlan,
  type PlannerTripPlanStop,
  type InsertPlannerTripPlanStop,
  type ParentSupportJsonb,
  type InsertTravelTrip,
  type CachedStopCandidate,
} from "@workspace/db";
import { storage } from "../storage";
import { runSnapshotPassForTrip } from "./snapshotBridge";
import { computeCityGroupsForStops } from "./cityGroupUtils";
import { GEOQUEST_SAFETY_PROMPT } from "../contentSafety";
import { isStopIntelligenceEnabled } from "./featureFlags";
import { enrichStop } from "./stopEnrichmentService";
import { computeScores, type FamilyProfile } from "./scoringEngine";
import { buildUserStopTypeProfile, type UserStopTypeProfile } from "../stopQualityScoring";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// ── City Must-Do Iconic Stops ──────────────────────────────────────────────
// These stops are considered unskippable anchors for their city.
// No matter the pace, age, or preferences, at least one MUST appear in the trip.
// For relaxed pace or very young children: shorten/adapt — do NOT skip entirely.
// ──────────────────────────────────────────────────────────────────────────────
const CITY_MUST_DO_STOPS: Record<string, {
  stops: Array<{ name: string; note: string }>;
  rationale: string;
}> = {
  "new york city": {
    stops: [
      { name: "Statue of Liberty & Ellis Island", note: "For young kids or relaxed pace: do the grounds at Battery Park + Crown Point view — skip the ferry but face the icon." },
      { name: "Empire State Building or Top of the Rock Observatory", note: "NYC's sky-high view — perfect for all ages. Evening works beautifully for families." },
    ],
    rationale: "No NYC trip is complete without a skyline experience and the Statue of Liberty. These are the two stops families remember for life.",
  },
  "washington dc": {
    stops: [
      { name: "Lincoln Memorial & Reflecting Pool", note: "Evening light makes this magic. Stroller-friendly, zero cost, deeply iconic for all ages." },
      { name: "White House (exterior & grounds)", note: "Walk the perimeter — free, no booking, and unmissable. Kids respond to seeing the real building." },
      { name: "Washington Monument", note: "The National Mall anchor — combine with a Mall walk to the Lincoln or WWII Memorial." },
    ],
    rationale: "Washington DC's power is in its landmarks, not just its museums. Every family must see the Lincoln Memorial, White House, and Washington Monument — these define the city.",
  },
  "paris": {
    stops: [
      { name: "Eiffel Tower", note: "For young kids: go at dusk and watch it light up from Champ de Mars — no queue, magical, unforgettable." },
      { name: "Sacré-Cœur & Montmartre", note: "Short hill walk with incredible panorama. Street artists delight kids of all ages." },
    ],
    rationale: "The Eiffel Tower is non-negotiable — adapt the experience, never skip it.",
  },
  "chicago": {
    stops: [
      { name: "Willis Tower Skydeck", note: "The glass ledge is thrilling even for young kids. Go early to avoid queues." },
      { name: "Millennium Park & The Bean", note: "Cloud Gate (the Bean) is free, walkable, and every kid loves the reflections." },
    ],
    rationale: "Willis Tower and the Bean are Chicago's two unavoidable icons — always include at least one.",
  },
  "london": {
    stops: [
      { name: "Tower of London", note: "Crown Jewels + ravens = instant kid magic. Book ahead." },
      { name: "Buckingham Palace & St James's Park", note: "Changing of the Guard (free) is a must-see spectacle. Combine with the park." },
    ],
    rationale: "The Tower of London and Buckingham Palace are London's anchor experiences — no family trip is complete without them.",
  },
  "sydney": {
    stops: [
      { name: "Sydney Opera House & Harbour Bridge walk", note: "Even for young kids: the harbour walk is free, stroller-accessible, and breathtaking." },
      { name: "Bondi Beach", note: "The Bondi to Coogee coastal walk is doable with kids ages 5+ — or just play on Bondi for younger ones." },
    ],
    rationale: "The Opera House and Bondi are Sydney's defining icons — every family visit must include them.",
  },
  "dubai": {
    stops: [
      { name: "Burj Khalifa (At the Top observation deck)", note: "World's tallest building — book level 124 or 125; kids are awestruck." },
      { name: "Dubai Creek & Gold Souk", note: "An abra boat ride across Dubai Creek costs almost nothing and is a genuine cultural experience for all ages." },
    ],
    rationale: "The Burj Khalifa is Dubai's defining icon — always include it regardless of pace.",
  },
  "rome": {
    stops: [
      { name: "Colosseum", note: "Book skip-the-line tickets. Older kids (8+) love the history; younger kids love the scale." },
      { name: "Trevi Fountain & coin toss", note: "Free, walkable, and the coin toss tradition delights every kid." },
    ],
    rationale: "The Colosseum and Trevi Fountain are Rome's irreplaceable icons — always include at least one.",
  },
  "tokyo": {
    stops: [
      { name: "Senso-ji Temple & Nakamise Shopping Street", note: "Asakusa's temple is accessible, colourful, and perfect for all ages. Free to enter." },
      { name: "teamLab Borderless or Planets (digital art museum)", note: "Book well ahead — immersive, child-friendly, and unlike anything else in the world." },
    ],
    rationale: "Senso-ji and teamLab are Tokyo's two unmissable family anchors — always include at least one of each.",
  },
  "singapore": {
    stops: [
      { name: "Gardens by the Bay (Supertrees & Cloud Forest)", note: "Evening Supertree light show is free and spectacular. Cloud Forest dome wows kids of all ages." },
      { name: "Marina Bay Sands SkyPark Observation Deck", note: "The iconic infinity-pool roofline view — kids love the panorama." },
    ],
    rationale: "Gardens by the Bay is Singapore's most iconic family stop — never skip it regardless of pace.",
  },
};

function getCityMustDoBlock(destination: string, localDayNumber: number, usedStopNames: string[]): string {
  const key = destination.toLowerCase().trim();
  // Strip country suffix if present (e.g. "New York City, USA" → "new york city")
  const keyNormalized = key.replace(/,\s*\w+$/, "").trim();

  const entry = CITY_MUST_DO_STOPS[keyNormalized];
  if (!entry) return "";

  // Only mandate on Day 1 & 2 of the city segment. After Day 2, if none used, still remind.
  const alreadyUsed = entry.stops.some(s =>
    usedStopNames.some(u => u.toLowerCase().includes(s.name.split(" ")[0].toLowerCase()))
  );
  if (alreadyUsed) return ""; // already included — no need to mandate again

  const stopLines = entry.stops
    .map((s, i) => `  ${i + 1}. ${s.name}\n     → Adaptation note: ${s.note}`)
    .join("\n");

  return `
CITY ICONIC STOPS — NON-NEGOTIABLE FOR THIS DESTINATION:
${entry.rationale}

The following stop(s) MUST appear in this trip's plan for ${destination}. Include at least one — this is a HARD RULE, not a suggestion:
${stopLines}

CRITICAL PACE ADAPTATION RULES (do NOT use these as a reason to skip):
- Relaxed pace or toddlers: shorten the experience (e.g. exterior view, shorter version, grounds only) but ALWAYS include it.
- Do NOT substitute a museum in place of an iconic landmark. Museums support the trip; iconic stops define it.
- If this is Day 1 of the city: put the must-do stop on this day.
- If already planned on a previous day: this rule is satisfied — ignore it.
`;
}

// ── Destination Intelligence (web-search fallback for unknown destinations) ──
// Caches research per destination so we don't call the AI multiple times
// for the same place across different days of the same trip.
const destinationIntelligenceCache = new Map<string, string>();

async function fetchDestinationIntelligence(destination: string): Promise<string | null> {
  const cacheKey = destination.toLowerCase().trim();
  if (destinationIntelligenceCache.has(cacheKey)) {
    console.log(`[WebIntelligence] Cache hit for "${destination}"`);
    return destinationIntelligenceCache.get(cacheKey)!;
  }

  console.log(`[WebIntelligence] Researching unknown destination: "${destination}"`);

  const researchPrompt = `Research the destination "${destination}" for a family trip with children ages 4-12.

Find and list the 12-15 most popular and well-known tourist attractions there. For each, include:
- Exact official name of the attraction
- Type: museum / park / landmark / market / beach / viewpoint / activity / other
- Why families with kids love it (1-2 sentences)
- Approximate visit duration (e.g., 1-2 hours)
- Indoor or outdoor
- Any entry fee or booking requirement

Also include:
- Best local food areas or kid-friendly restaurant streets (with names)
- Any seasonal tips (best months, weather, crowd levels)
- Recommended trip length for families
- Any neighbourhoods or districts worth staying in or exploring

Focus only on real, named, specific places. Avoid vague descriptions like "explore the old town" — name the actual street, square, or site.`;

  // Try web-search model first (has live internet access), fall back to gpt-4o training knowledge
  const models = ["gpt-4o-search-preview", "gpt-4o"] as const;
  for (const model of models) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: researchPrompt }],
        max_tokens: 1600,
      });
      const result = response.choices[0]?.message?.content;
      if (result && result.length > 200) {
        destinationIntelligenceCache.set(cacheKey, result);
        console.log(`[WebIntelligence] ${result.length} chars retrieved for "${destination}" via ${model}`);
        return result;
      }
    } catch (err: any) {
      if (model === "gpt-4o-search-preview") {
        console.log(`[WebIntelligence] gpt-4o-search-preview unavailable — falling back to gpt-4o`);
        continue;
      }
      console.warn(`[WebIntelligence] Research failed for "${destination}":`, err?.message ?? err);
      return null;
    }
  }
  return null;
}

/**
 * Minimum sourceConfidence score (0–100) required for a stop to pass the
 * confidence gate. Below this threshold a stop is flagged `reviewRequired`.
 * Tunable: raise to tighten the gate, lower to allow more uncertain stops.
 */
export const MIN_SOURCE_CONFIDENCE = 55;

export interface StayLocation {
  cityName?: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
}

export interface MealPreferences {
  enabled: boolean;
  breakfast: boolean;
  lunch: boolean;
  snacks: boolean;
  dinner: boolean;
  diningStyle: "quick" | "sitdown" | "";
  cuisines: string[];
}

export interface FixedAnchor {
  name: string;
  day: number;
  time: string | null;
  durationMinutes: number | null;
  anchorType: string;
  flexibility?: string; // "hard" (non-negotiable) | "soft" (preferred, can shift)
}

export interface PlannerInput {
  destination: string;
  tripDays: number;
  childrenAges: number[];
  pace: "relaxed" | "moderate" | "busy";
  tripStyle?: "highlights" | "balanced" | "offbeat" | "easy";
  transportMode?: "walking" | "driving" | "transit";
  budgetSensitivity?: "budget" | "moderate" | "premium";
  kidEnergyLevel?: "full" | "mixed" | "low";
  indoorLean?: "outdoor" | "mix" | "indoor";
  interests?: string[];
  strollerNeeded?: boolean;
  stayLocations?: StayLocation[];
  meals?: MealPreferences;
  routeStops?: Array<{ name: string; countryName?: string; nights?: number }>;
  fixedAnchors?: FixedAnchor[];
  experienceTripId?: string;
  userId?: string;
}

export interface GeneratedStop {
  dayNumber: number;
  displayOrder: number;
  name: string;
  type: string;
  durationMinutes: number;
  effortLevel: "low" | "moderate" | "high";
  indoorOutdoor: "indoor" | "outdoor" | "both";
  sensoryLoad: "low" | "moderate" | "high";
  familyAnchorType: "anchor" | "support" | "filler" | "meal" | "reset";
  minAge: number;
  whyNow: string;
  travelMinutes?: number;
  travelMode?: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  neighborhoodZone?: string;
  parentSupportData: {
    breakSuggestion: string;
    foodSuggestion: string;
    keepGoingSuggestion: string;
    moreFunSuggestion: string;
    shortenSuggestion: string;
  };
  placeReferenceData: {
    directionsNote: string;
    openingHours: string;
    priceRange: string;
    bookingRequired: boolean;
    bookingUrl?: string;
    /** AI-reported confidence that this place exists and is accurately described (0–100). */
    sourceConfidence?: number;
  };
  placeProfileData: {
    whyItWorks: string;
    bathroomNotes: string;
    foodOptions: string;
    parkingNotes: string;
    nearbyStops: string[];
    practicalTips: string[];
  };
  /** True when sourceConfidence < MIN_SOURCE_CONFIDENCE — shown as an amber badge in the UI. */
  reviewRequired?: boolean;
  /** Explanation shown to the parent when they tap the reviewRequired badge. */
  reviewNote?: string;
}

/**
 * Returns how long a family will realistically spend at a stop given the youngest child's age.
 * Base durations (e.g. AMNH = 180 min) are adult estimates; toddler families leave earlier.
 * - Age ≤ 2: hard cap at 45 min
 * - Age ≤ 4: hard cap at 75 min
 * - Age ≤ 7: 80% of base (round to nearest minute)
 * - Age 8+: full base duration (no adjustment)
 */
export function effectiveDuration(baseDurationMins: number, youngestChildAge: number): number {
  if (youngestChildAge <= 2) return Math.min(baseDurationMins, 45);
  if (youngestChildAge <= 4) return Math.min(baseDurationMins, 75);
  if (youngestChildAge <= 7) return Math.round(baseDurationMins * 0.8);
  return baseDurationMins;
}

/**
 * Create a "Rest / Nap time" placeholder stop for families with children under 3.
 * This stop is persisted to the DB for display but is NOT passed through Stop Intelligence enrichment.
 */
function createNapStop(dayNumber: number, displayOrder: number): GeneratedStop {
  return {
    dayNumber,
    displayOrder,
    name: "Rest / Nap time",
    type: "rest",
    durationMinutes: 90,
    effortLevel: "low",
    indoorOutdoor: "indoor",
    sensoryLoad: "low",
    familyAnchorType: "reset",
    minAge: 0,
    whyNow: "A midday rest keeps little ones recharged — this works with nap schedules for children under 3.",
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
      whyItWorks: "Midday rest prevents overtiredness and meltdowns — keeping the afternoon enjoyable for the whole family.",
      bathroomNotes: "",
      foodOptions: "",
      parkingNotes: "",
      nearbyStops: [],
      practicalTips: [
        "Find a quiet spot at your accommodation or a nearby café",
        "Keep rest to 60–90 minutes so the afternoon stays productive",
      ],
    },
  };
}

/**
 * Insert a "Rest / Nap time" stop after the first activity of each day in the list.
 * Used when youngest child is under 3. Re-assigns displayOrders after insertion.
 * Returns a new array — does not mutate the input.
 */
function insertNapStopsIntoStopList(stops: GeneratedStop[]): GeneratedStop[] {
  const dayMap = new Map<number, GeneratedStop[]>();
  for (const s of stops) {
    if (!dayMap.has(s.dayNumber)) dayMap.set(s.dayNumber, []);
    dayMap.get(s.dayNumber)!.push(s);
  }
  const result: GeneratedStop[] = [];
  for (const [day, dayStops] of [...dayMap.entries()].sort((a, b) => a[0] - b[0])) {
    dayStops.sort((a, b) => a.displayOrder - b.displayOrder);
    const insertAt = Math.min(1, dayStops.length);
    dayStops.splice(insertAt, 0, createNapStop(day, 0));
    dayStops.forEach((s, i) => { s.displayOrder = i; });
    result.push(...dayStops);
  }
  return result;
}

/**
 * Post-generation normalization for AI-generated stops under toddler nap mode.
 * Enforces the same hard constraints as the pool selection greedy loop:
 *   - At most `Math.min(stopsPerDay, 3)` activity stops per day
 *   - Meal-type stops cannot be the first activity of the day
 *   - For non-relaxed pace: last activity stop must have effectiveDuration < 45 min
 * Must be called BEFORE insertNapStopsIntoStopList.
 */
function normalizeNapDayStops(
  stops: GeneratedStop[],
  pace: string,
  minChildAge: number,
): GeneratedStop[] {
  const stopsPerDay = getStopsPerDay(pace);
  const effectiveStopsPerDay = Math.min(stopsPerDay, 3);
  const isRelaxed = pace === "relaxed";
  const mealTypes = new Set(["restaurant", "meal", "food", "cafe"]);

  const dayMap = new Map<number, GeneratedStop[]>();
  for (const s of stops) {
    if (!dayMap.has(s.dayNumber)) dayMap.set(s.dayNumber, []);
    dayMap.get(s.dayNumber)!.push(s);
  }

  const result: GeneratedStop[] = [];
  for (const [, dayStops] of [...dayMap.entries()].sort((a, b) => a[0] - b[0])) {
    dayStops.sort((a, b) => a.displayOrder - b.displayOrder);

    // 1. Move meal stops away from position 0 (enforce after-nap meal timing)
    const firstMealIdx = dayStops.findIndex((s, i) => i === 0 && mealTypes.has(s.type ?? ""));
    if (firstMealIdx === 0 && dayStops.length > 1) {
      const [mealStop] = dayStops.splice(0, 1);
      // Insert the meal stop at position 2 (after first activity and future nap position)
      dayStops.splice(Math.min(2, dayStops.length), 0, mealStop);
    }

    // 2. Cap activity stops to effectiveStopsPerDay
    const capped = dayStops.slice(0, effectiveStopsPerDay);

    // 3. For non-relaxed pace: ensure last stop has effective duration < 45 min
    if (!isRelaxed && capped.length === effectiveStopsPerDay) {
      const lastStop = capped[capped.length - 1];
      const effDur = effectiveDuration(lastStop.durationMinutes ?? 60, minChildAge);
      if (effDur >= 45) {
        // Try to find a qualifying short stop in the overflow stops
        const overflow = dayStops.slice(effectiveStopsPerDay);
        const shortStop = overflow.find(s => effectiveDuration(s.durationMinutes ?? 60, minChildAge) < 45);
        if (shortStop) {
          capped[capped.length - 1] = shortStop;
        } else {
          // Drop the last stop — better fewer stops than a spec violation
          capped.pop();
        }
      }
    }

    result.push(...capped);
  }
  return result;
}

interface PaceConfig {
  mainStops: { min: number; max: number };
  totalStopMinutes: { min: number; max: number };
  totalEffortMinutes: { min: number; max: number };
  maxTransitions: number;
  maxHighEffortStops: number;
  maxLearningHeavyStops: number;
  breakEveryMinutes: number;
  maxTicketedStops: number;
  label: string;
}

function getPaceConfig(pace: string): PaceConfig {
  if (pace === "relaxed") return {
    mainStops: { min: 1, max: 2 },
    totalStopMinutes: { min: 90, max: 180 },
    totalEffortMinutes: { min: 120, max: 210 },
    maxTransitions: 2,
    maxHighEffortStops: 1,
    maxLearningHeavyStops: 1,
    breakEveryMinutes: 90,
    maxTicketedStops: 1,
    label: "Easy & relaxed — 1–2 main stops, max 2 transitions, 2–3.5 hrs total effort",
  };
  if (pace === "busy") return {
    mainStops: { min: 3, max: 5 },
    totalStopMinutes: { min: 240, max: 360 },
    totalEffortMinutes: { min: 300, max: 420 },
    maxTransitions: 4,
    maxHighEffortStops: 2,
    maxLearningHeavyStops: 2,
    breakEveryMinutes: 120,
    maxTicketedStops: 2,
    label: "Active & packed — 3–5 stops, max 4 transitions, 5–7 hrs total effort",
  };
  return {
    mainStops: { min: 2, max: 3 },
    totalStopMinutes: { min: 150, max: 240 },
    totalEffortMinutes: { min: 210, max: 330 },
    maxTransitions: 3,
    maxHighEffortStops: 1,
    maxLearningHeavyStops: 2,
    breakEveryMinutes: 120,
    maxTicketedStops: 2,
    label: "Balanced — 2–3 stops, max 3 transitions, 3.5–5.5 hrs total effort",
  };
}

function getPaceConstraints(pace: string): { min: number; max: number; maxHours: number; label: string } {
  const cfg = getPaceConfig(pace);
  return {
    min: cfg.mainStops.min,
    max: cfg.mainStops.max,
    maxHours: cfg.totalStopMinutes.max / 60,
    label: cfg.label,
  };
}

function getStopsPerDay(pace: string): number {
  if (pace === "relaxed") return 2;
  if (pace === "busy") return 4;
  return 3;
}

function getAgeContext(ages: number[]): string {
  if (ages.length === 0) return "mixed-age children";
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  if (max <= 4) return "toddlers (under 5)";
  if (min <= 5 && max <= 8) return "young children (5-8)";
  if (min <= 9 && max <= 12) return "kids (9-12)";
  if (max <= 6) return "young kids (under 7)";
  return `children ages ${min}-${max}`;
}

function buildFamilyContext(input: PlannerInput): string {
  const lines: string[] = [];

  if (input.tripStyle) {
    const map = {
      highlights: "Highlights & must-sees — prioritise iconic, socially proven family attractions",
      balanced:   "Balanced family day — mix iconic and relaxed; blend activity types",
      offbeat:    "Off the beaten path — prefer local gems, hidden spots, lower tourist saturation",
      easy:       "Easy & low-key day — gentle pace, low-effort stops, maximum flexibility",
    };
    lines.push(`Trip Style: ${map[input.tripStyle]}`);
  }

  if (input.kidEnergyLevel) {
    const map = {
      full:  "High — kids are fully charged; morning anchor can be high-energy and long",
      mixed: "Moderate — normal energy; follow standard energy arc",
      low:   "Low — tired kids; prioritise shorter stops, more rest breaks, avoid high-effort activities",
    };
    lines.push(`Kid Energy: ${map[input.kidEnergyLevel]}`);
  }

  if (input.indoorLean) {
    const map = {
      outdoor: "Strong outdoor preference — maximise open-air stops, parks, outdoor landmarks",
      mix:     "Balanced — mix indoor and outdoor stops naturally",
      indoor:  "Indoor preference — prioritise museums, galleries, covered venues; limit exposed outdoor walking",
    };
    lines.push(`Indoor/Outdoor Preference: ${map[input.indoorLean]}`);
  }

  if (input.interests && input.interests.length > 0) {
    lines.push(`Kid Interests: ${input.interests.join(", ")} — strongly weight stops that match these interests; avoid stops with zero relevance to them`);
  }

  if (input.strollerNeeded) {
    lines.push("Stroller: yes — only include fully stroller-accessible stops; flag and avoid stairs/cobblestones/uneven terrain");
  }

  if (input.meals?.enabled) {
    const activeMeals: string[] = [];
    if (input.meals.breakfast) activeMeals.push("breakfast");
    if (input.meals.lunch) activeMeals.push("lunch");
    if (input.meals.snacks) activeMeals.push("snacks");
    if (input.meals.dinner) activeMeals.push("dinner");
    if (activeMeals.length > 0) {
      const styleNote = input.meals.diningStyle === "quick"
        ? "quick-service / takeaway"
        : input.meals.diningStyle === "sitdown"
          ? "sit-down restaurants"
          : "a mix of quick and sit-down";
      lines.push(`Meal Planning: include dedicated kid-friendly ${styleNote} meal stops for ${activeMeals.join(", ")} — insert them at appropriate times in the day arc and mark them familyAnchorType="meal"`);
    }
    if (input.meals.cuisines && input.meals.cuisines.length > 0) {
      const cleanCuisines = input.meals.cuisines.map(c => c.replace(/^[^\s]+\s/, "").trim());
      lines.push(`Cuisine Preferences: favour ${cleanCuisines.join(", ")} options when suggesting meal stops`);
    }
  }

  if (input.stayLocations && input.stayLocations.length > 0) {
    const stayLines = input.stayLocations.map((s) => {
      const city = s.cityName ? ` (${s.cityName})` : "";
      const parts = [`${s.name}${city}`];
      if (s.address) parts.push(`at ${s.address}`);
      if (s.checkIn && s.checkOut) parts.push(`(check-in ${s.checkIn}, check-out ${s.checkOut})`);
      return parts.join(" ");
    });
    lines.push(`Stay Locations: ${stayLines.join("; ")} — consider proximity to stay when ordering stops, and include early/end-of-day stops near the accommodation`);
  }

  if (lines.length === 0) return "";
  return `\nFAMILY PROFILE (apply these as hard constraints to every stop decision):\n${lines.map((l) => `- ${l}`).join("\n")}\n`;
}

async function generateDayStops(
  dayNumber: number,
  input: PlannerInput,
  stopsPerDay: number,
  ageContext: string,
  usedStopNames: string[] = [],
  localDayNumber?: number,  // city-local day index for canonical template lookup in multi-city trips
  qualityProfile?: UserStopTypeProfile,
  targetCity?: string,
): Promise<GeneratedStop[]> {
  const pace = getPaceConstraints(input.pace);
  const excludeBlock = usedStopNames.length > 0
    ? `\nALREADY USED IN OTHER DAYS (do NOT include these or any very similar places):\n${usedStopNames.map((n) => `- ${n}`).join("\n")}\n`
    : "";

  const cfg = getPaceConfig(input.pace);
  const familyContext = buildFamilyContext(input);
  const aiChildAges = input.childrenAges || [];
  const aiMinChildAge = aiChildAges.length > 0 ? Math.min(...aiChildAges) : 5;
  const aiNapActive = aiMinChildAge < 3;

  // Inject canonical template for known Indian cities (package-first → AI-refined model)
  const canonicalContext = getIndiaCanonicalContext(input.destination);
  const canonicalDayTemplate = canonicalContext
    ? (() => {
        const key = getIndiaCanonicalCityKey(input.destination);
        if (!key) return null;
        const template = INDIA_CANONICAL_ITINERARIES[key];
        if (!template) return null;
        // Use city-local day for template lookup (localDayNumber) if provided (multi-city trips),
        // otherwise use the global itinerary day number (single-city trips).
        const templateDay = localDayNumber ?? dayNumber;
        const canonicalDay = template.days.find(d => d.dayNumber === templateDay)
          || template.days[Math.min(templateDay - 1, template.days.length - 1)];
        if (!canonicalDay || canonicalDay.stops.length === 0) return null;
        return [
          `CANONICAL TEMPLATE — Day ${dayNumber} (${canonicalDay.theme}):`,
          `The following is the MANDATORY stop sequence used by Indian travel planners for Day ${dayNumber} in ${input.destination}.`,
          `You are a REFINER, not a creator. Your job is to enrich and pace this exact sequence for this family.`,
          `Do NOT invent, swap in, or replace canonical stops with unfamiliar locations.`,
          ``,
          `Canonical Day ${dayNumber} stops (use these as your main stops, in this order):`,
          ...canonicalDay.stops.map((s, i) => `  ${i + 1}. ${s}`),
          `Why this sequence works: ${canonicalDay.whyItWorks}`,
          ``,
          `STRICT RULES — follow in order of priority:`,
          `1. Include canonical stops in the ORDER listed above as your main stops`,
          `2. You MAY insert 1-2 break/meal/reset stops between them to match pace — do not let these replace canonical stops`,
          `3. For relaxed pace with 4+ canonical stops: include the first 2-3 from the list in order, skip later ones`,
          `4. Do NOT swap canonical stops for substitutes — these are the stops families specifically come here for`,
          `5. Reordering is only permitted when geographic clustering demands it — explain in whyNow`,
        ].join("\n");
      })()
    : null;

  const canonicalBlock = canonicalDayTemplate ? `\n${canonicalDayTemplate}\n` : "";

  if (canonicalDayTemplate) {
    const canonicalKey = getIndiaCanonicalCityKey(input.destination);
    console.log(`[CanonicalEngine] Using template "${canonicalKey}" for destination "${input.destination}" (Day ${dayNumber})`);
  }

  // For destinations without a canonical template, fetch real-world research
  // on Day 1 only (cache handles all subsequent days automatically).
  let webIntelligenceBlock = "";
  if (!canonicalDayTemplate) {
    const intelligence = await fetchDestinationIntelligence(input.destination);
    if (intelligence) {
      webIntelligenceBlock = `
DESTINATION INTELLIGENCE (researched for this specific place):
The following real attractions have been verified for "${input.destination}".
Use these as your PRIMARY source for stop names — these are actual, named places that exist.
Do NOT invent generic substitutes when specific names are available below.

${intelligence}

INSTRUCTION: Build your day using the named places above. Prefer the most iconic/well-known ones first.
`;
    }
  }

  // Build session-aware anchor block for today — tells the AI exactly which session slots are free
  const dayAnchors = (input.fixedAnchors || []).filter(a => a.day === dayNumber);
  let fixedAnchorBlock = "";
  if (dayAnchors.length > 0) {
    const M_START = 9 * 60 + 30;   // 9:30 AM
    const M_END   = 12 * 60 + 30;  // 12:30 PM
    const A_START = 13 * 60 + 30;  // 1:30 PM
    const A_END   = 16 * 60 + 30;  // 4:30 PM
    const E_START = 17 * 60;       // 5:00 PM
    const E_END   = 19 * 60;       // 7:00 PM
    const TRAVEL  = 40;

    const parseT = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
    const fmtT = (mins: number) => { const h = Math.floor(mins / 60); const m = mins % 60; const ap = h >= 12 ? "PM" : "AM"; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${h12}:${String(m).padStart(2, "0")} ${ap}`; };
    const freeLabel = (mins: number) => mins <= 0 ? "FULLY BLOCKED — skip this session" : mins <= 60 ? `${mins} min free — 1 SHORT stop only (30-45 min)` : mins <= 120 ? `${mins} min free — 1 medium stop (60-90 min)` : `${mins} min free — up to ${Math.floor(mins / 90)} stops`;

    const anchorLines: string[] = [];
    let sessionAnalysis = "";

    for (const a of dayAnchors) {
      const isHard = (a.flexibility || "hard") !== "soft";
      const flexLabel = isHard ? "FIXED (non-negotiable)" : "FLEXIBLE (aim for this time, can shift ±30 min)";
      const timeStr = a.time ? ` at ${a.time}` : "";
      const durStr  = a.durationMinutes ? ` (~${a.durationMinutes} min)` : "";
      anchorLines.push(`  - "${a.name}"${timeStr}${durStr} [${a.anchorType}] [${flexLabel}]`);

      if (a.time) {
        const tMins  = parseT(a.time);
        const dur    = a.durationMinutes || 90;
        const endMin = tMins + dur;

        let mFree = M_END - M_START;
        let aFree = A_END - A_START;
        let eFree = E_END - E_START;

        if (tMins < M_END) {
          // Morning anchor
          mFree = Math.max(0, tMins - TRAVEL - M_START);
          aFree = Math.max(0, A_END - Math.max(A_START, endMin + TRAVEL));
        } else if (tMins < A_END) {
          // Afternoon anchor
          aFree = Math.max(0, tMins - TRAVEL - A_START);
          eFree = Math.max(0, E_END - Math.max(E_START, endMin + TRAVEL));
        } else {
          // Evening anchor
          eFree = Math.max(0, tMins - TRAVEL - E_START);
        }

        const paceLabel = cfg.label.toLowerCase();
        const totalFree = mFree + aFree + eFree;
        const stopsHint = paceLabel.includes("relax") || paceLabel.includes("chill")
          ? `Relaxed: use 1 session only — pick the largest free block.`
          : paceLabel.includes("busy") || paceLabel.includes("packed")
            ? `Packed: fill ALL free sessions — 1 main stop per session, optionally 1 short paired stop if geographically adjacent. Max ${Math.min(3, Math.max(1, Math.floor(totalFree / 75)))} stops.`
            : `Balanced: use 2 free sessions — 1 medium stop each. Skip the smallest session if it has <60 min. Max ${Math.min(2, Math.max(1, Math.floor(totalFree / 90)))} stops.`;

        sessionAnalysis += `\n  Session availability after "${a.name}" (${fmtT(tMins)}–${fmtT(endMin)}):\n`;
        sessionAnalysis += `    Morning   9:30–12:30: ${freeLabel(mFree)}\n`;
        sessionAnalysis += `    Afternoon 1:30–4:30:  ${freeLabel(aFree)}\n`;
        sessionAnalysis += `    Evening   5:00–7:00:  ${freeLabel(eFree)}\n`;
        sessionAnalysis += `    → ${stopsHint}\n`;
      }
    }

    fixedAnchorBlock = `
FAMILY'S EXISTING PLANS — build today's itinerary AROUND these:
${anchorLines.join("\n")}

CRITICAL RULES:
- NEVER output any of the above as a new generated stop — they are already locked in.
- FIXED anchors: leave a ${TRAVEL}-min clear buffer before and after — no stops may overlap this window.
- FLEXIBLE anchors: aim for stated time but may shift ±30 min if it improves the day flow.
- Give generated stops on this day dropPriority 1 (protect them — the day is anchored).
- Only generate stops for sessions with meaningful free time (40+ min).
${sessionAnalysis}`;
  }

  // Build city must-do iconic stop mandate (injected early; AI must respect it)
  const mustDoBlock = getCityMustDoBlock(
    targetCity ?? input.destination,
    localDayNumber ?? dayNumber,
    usedStopNames,
  );

  // Build quality-signal context block if the family has historical feedback
  let qualityContextBlock = "";
  if (qualityProfile) {
    const cityKey = targetCity?.toLowerCase() ?? "";
    const cityScores = qualityProfile.cityTypeScores[cityKey] ?? {};

    const lovedTypes: string[] = [];
    const avoidTypes: string[] = [];

    const typeScoreSource: Record<string, number> = {
      ...qualityProfile.typeScores,
      ...cityScores,
    };

    for (const [type, adj] of Object.entries(typeScoreSource)) {
      if (adj >= 3) lovedTypes.push(type);
      else if (adj <= -3) avoidTypes.push(type);
    }

    const lines: string[] = [];
    if (lovedTypes.length > 0) {
      lines.push(`- FAMILY LOVES: ${lovedTypes.join(", ")} — rank these stop types HIGHER and prefer them when multiple options are available`);
    }
    if (avoidTypes.length > 0) {
      lines.push(`- FAMILY DISLIKES: ${avoidTypes.join(", ")} — DEPRIORITIZE these stop types; only include if there are no better alternatives for the destination`);
    }
    if (qualityProfile.excludedTypes.size > 0) {
      lines.push(`- SKIP ENTIRELY if possible: ${[...qualityProfile.excludedTypes].join(", ")} — this family has consistently found these not worth it`);
    }

    if (lines.length > 0) {
      qualityContextBlock = `\nFAMILY HISTORY (learned from past trip feedback — apply when choosing stop types):\n${lines.join("\n")}\n`;
    }
  }

  const prompt = `You are a family travel expert planning Day ${dayNumber} of a ${input.tripDays}-day family trip.

CONTEXT
Destination: ${input.destination}
Day: ${dayNumber} of ${input.tripDays}
Children: ${ageContext}
Pace: ${cfg.label}
Transport: ${input.transportMode ?? "walking"}
Budget: ${input.budgetSensitivity ?? "moderate"}
${familyContext}${qualityContextBlock}${mustDoBlock}${canonicalBlock}${webIntelligenceBlock}${fixedAnchorBlock}${excludeBlock}
HARD CONSTRAINTS (these are firm rules, not suggestions):

1. SESSION-BASED DAY PLANNING: Plan using 3 natural family sessions, not by counting stops
   Morning session:   9:30 AM – 12:30 PM (~180 min of visit time)
   Afternoon session: 1:30 PM – 4:30 PM  (~180 min of visit time, after lunch break)
   Evening session:   5:00 PM – 7:00 PM  (~120 min of visit time)
   Day ceiling:       8:00 PM (absolute hard stop)
   - ${cfg.label} pace means: ${
     cfg.label.toLowerCase().includes("relax") || cfg.label.toLowerCase().includes("chill")
       ? "use 1–2 sessions; one major stop or one major + one light stop; one session may be intentionally empty"
       : cfg.label.toLowerCase().includes("busy") || cfg.label.toLowerCase().includes("packed")
         ? "use all 3 sessions; each session gets 1 main stop; only add a short paired mini-stop if it is geographically adjacent"
         : "use 2–3 sessions; 2 solid stops or 1 major + 1 medium + 1 light stop"
   }
   - Total durationMinutes of all stops must be between ${cfg.totalStopMinutes.min} and ${cfg.totalStopMinutes.max} min
   - Total effort must stay under ${cfg.totalEffortMinutes.max} min (${Math.round(cfg.totalEffortMinutes.max/60*10)/10} hrs)
   - Anchor stops (major forts, museums, zoos, safaris, theme parks) may use 120–240 min — do NOT cap them at 120 min
   - If the day gets tight, remove low-value filler first (generic temples, repeat viewpoints, duplicate stop types)
   - Assign sessionFit to each stop: morning / afternoon / evening / flexible
   - Assign durationClass: short (30–60) / medium (60–120) / long (120–180) / extra_long (180–240)

2. TRANSITIONS: Max ${cfg.maxTransitions} transitions between stops per day
   - Each travelMinutes should be under 20 min
   - Cluster stops geographically before scoring content

3. ENERGY ARC — follow this structure every day:
   - Morning (first stop): High-energy anchor. Interactive, iconic, or movement-based. MUST be the strongest kid-engagement stop.
   - Midday: Lower effort or meal break. Indoor or shaded preferred.
   - Afternoon: Flexible — scenic, hands-on, or shorter experience.
   - Late day (last stop if pace allows): Calm finish. Visual, passive, or open space.
   ⚠️ Do NOT start the day with a weak or passive stop.
   ⚠️ STOP ORDERING: Use each stop's natural best time of day to sequence within the day — morning-fit stops (museums, iconic landmarks) come first; afternoon/evening-fit stops (scenic viewpoints, cruises, parks) come last. Assign sessionFit accordingly.

4. COGNITIVE BALANCE:
   - Max ${cfg.maxLearningHeavyStops} learning-heavy/museum stops per day
   - Always mix active + passive + at least one outdoor stop when weather allows
   - Do not stack 2+ high-sensory-load stops back-to-back
   - LANDMARK DIVERSITY: Across the full city segment, iconic landmarks (monuments, observatories, historic sites) must appear at least as often as museums. A city visit that is all museums is WRONG — always balance with at least 1 iconic outdoor/landmark stop per 2 museum days. The city's defining icons (see CITY ICONIC STOPS above) count as landmark stops.

5. BREAKS: Insert a break (as a stop with familyAnchorType="reset" or "meal") when:
   - Cumulative active time exceeds ${cfg.breakEveryMinutes} min
   - After a high-effort stop
   - Before a ticketed queue-heavy venue
   Break types: meal, snack café, playground, scenic rest stop

6. TICKET FRICTION: Max ${cfg.maxTicketedStops} stops requiring pre-booked tickets per day
   - Prefer walk-in venues when possible
   - If ticketed venue is high-value, include it but flag bookingRequired=true

7. REDUNDANCY: Never place on the same day:
   - 2+ similar venue types (e.g., 2 art museums, 2 science museums, 2 history museums)
   - 2+ high-walking outdoor stops in heat
   - 2+ queue-heavy ticketed venues back-to-back
   - MUSEUM CAP: Do not plan 2 consecutive days that are museum-only. Every day with a museum must also contain at least 1 landmark, park, or outdoor active stop.
   - CONSECUTIVE TYPE RULE: Never place 3 or more stops of the same type back-to-back within a single day (e.g., museum → museum → museum). After any 2 consecutive same-type stops, the next stop MUST be a different type.

8. AGE RULES:
   - Ages 0–4: Prioritize parks, playgrounds, aquariums, short interactive stops. Max 1 learning-heavy stop. No stop over 90 min.
   - Ages 5–7: Prefer hands-on museums, zoos, landmarks with visual payoff. Alternate active/passive.
   - Ages 8–12: Can handle variety. Do not stack 2+ learning-heavy stops without a reset.
   - Mixed ages: Plan stamina to youngest child, content variety to oldest.${aiNapActive ? `
   - TODDLER NAP WINDOW (youngest child under 3): A 90-min midday rest block is added automatically after the first stop. Plan at most ${Math.min(stopsPerDay, 3)} activity stops for this day (${stopsPerDay === 2 ? "relaxed pace: up to 2" : "balanced/busy pace: 2 main stops + 1 short stop under 45 min"}) — effective visit durations are much shorter than base values (e.g. a 3-hour museum becomes a 45-min visit). No stop should exceed 60 min in practice. Meal stops should come after the midday nap, not first thing in the morning.` : ""}

9. INDOOR FALLBACK: Every day must have at least 1 indoor stop as weather backup.

10. QUALITY OVER QUANTITY: Fewer great stops beats many rushed ones. Do not pad the day.

EVERY STOP MUST:
- Be UNIQUE (not repeated across days)
- Have a real address and coordinates for ${input.destination}
- Have "whyNow" that explains why it fits THIS position in the day arc
- displayOrder starts at 0

SOURCE CONFIDENCE:
Set placeReferenceData.sourceConfidence (0–100) for each stop:
- 90–100: Very well-known, globally documented place (e.g. Eiffel Tower, Central Park)
- 70–89:  Known local attraction, well-documented online
- 55–69:  Lesser-known but real, limited documentation
- Below 55: Uncertain — you are less confident this exact place exists as described

Return a JSON object:
{
  "stops": [
    {
      "dayNumber": ${dayNumber},
      "displayOrder": 0,
      "name": "Stop name",
      "type": "museum|park|landmark|restaurant|beach|viewpoint|market|garden|activity|other",
      "durationMinutes": 90,
      "effortLevel": "low|moderate|high",
      "indoorOutdoor": "indoor|outdoor|both",
      "sensoryLoad": "low|moderate|high",
      "familyAnchorType": "anchor|support|filler|meal|reset",
      "minAge": 4,
      "whyNow": "Why this stop fits here (1-2 sentences)",
      "travelMinutes": 10,
      "travelMode": "walking|driving|transit",
      "address": "Street address or area",
      "latitude": "latitude as string",
      "longitude": "longitude as string",
      "neighborhoodZone": "Neighbourhood or area name (e.g. 'Upper West Side', 'South Bank', 'Midtown'). Use the city's main neighbourhood names — this groups nearby stops for clustering.",
      "parentSupportData": {
        "breakSuggestion": "Where to rest nearby",
        "foodSuggestion": "Nearest food option with distance",
        "keepGoingSuggestion": "What to do next if energy is high",
        "moreFunSuggestion": "A fun add-on at or near this stop",
        "shortenSuggestion": "What to skip if short on time"
      },
      "placeReferenceData": {
        "directionsNote": "How to get there",
        "openingHours": "Hours or 'Check website'",
        "priceRange": "free|$|$$|$$$",
        "bookingRequired": false,
        "bookingUrl": "Official ticket/reservation URL if booking is required (e.g. https://www.neonmuseum.org/tickets), or empty string if free",
        "sourceConfidence": 85
      },
      "placeProfileData": {
        "whyItWorks": "Why this works for families with ${ageContext}",
        "bathroomNotes": "Bathroom info",
        "foodOptions": "Food on site or nearby",
        "parkingNotes": "Parking info",
        "bestTimeOfDay": "morning|afternoon|evening|anytime",
        "weatherSensitive": false,
        "strollerFriendly": true,
        "nearbyStops": ["Nearby place 1", "Nearby place 2"],
        "practicalTips": ["Tip 1", "Tip 2"]
      }
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: `You are a family travel expert. Return only valid JSON.${GEOQUEST_SAFETY_PROMPT}` },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No content from AI for day ${dayNumber}`);

  const parsed = JSON.parse(content);
  const stops = (parsed.stops || []) as GeneratedStop[];

  // Confidence gate (AI path): flag stops below MIN_SOURCE_CONFIDENCE.
  // Bypassed for India canonical trips — canonical stops are trusted by definition.
  const isAiCanonical = !!canonicalContext;
  if (!isAiCanonical) {
    for (const stop of stops) {
      const sc = stop.placeReferenceData?.sourceConfidence;
      if (sc != null && sc < MIN_SOURCE_CONFIDENCE) {
        stop.reviewRequired = true;
        stop.reviewNote = "We found this stop but couldn't fully verify it — worth confirming before you visit.";
      }
    }
  }

  return stops;
}

async function persistStop(
  stop: GeneratedStop,
  planId: string,
  cityName: string,
  countryName: string
): Promise<{ place: { id: string }; inserted: PlannerTripPlanStop }> {
  const [place] = await db.insert(plannerPlaces).values({
    city: cityName,
    country: countryName,
    name: stop.name,
    type: stop.type,
    durationMinutes: stop.durationMinutes,
    effortLevel: stop.effortLevel,
    indoorOutdoor: stop.indoorOutdoor,
    sensoryLoad: stop.sensoryLoad || "moderate",
    familyAnchorType: stop.familyAnchorType || "support",
    minAge: stop.minAge,
    whyNow: stop.whyNow,
    latitude: stop.latitude || undefined,
    longitude: stop.longitude || undefined,
    address: stop.address || undefined,
    neighborhoodZone: stop.neighborhoodZone || undefined,
  }).returning();

  if (stop.placeProfileData) {
    await db.insert(plannerPlaceProfiles).values({
      placeId: place.id,
      whyItWorks: stop.placeProfileData.whyItWorks || undefined,
      bathroomNotes: stop.placeProfileData.bathroomNotes || undefined,
      foodOptions: stop.placeProfileData.foodOptions || undefined,
      parkingNotes: stop.placeProfileData.parkingNotes || undefined,
      bestTimeOfDay: stop.placeProfileData.bestTimeOfDay || "anytime",
      weatherSensitive: stop.placeProfileData.weatherSensitive ?? false,
      strollerFriendly: stop.placeProfileData.strollerFriendly ?? true,
      nearbyStops: stop.placeProfileData.nearbyStops || [],
      practicalTips: stop.placeProfileData.practicalTips || [],
    });
  }

  if (stop.parentSupportData) {
    await db.insert(plannerParentSupport).values({
      placeId: place.id,
      breakSuggestion: stop.parentSupportData.breakSuggestion || undefined,
      foodSuggestion: stop.parentSupportData.foodSuggestion || undefined,
      keepGoingSuggestion: stop.parentSupportData.keepGoingSuggestion || undefined,
      moreFunSuggestion: stop.parentSupportData.moreFunSuggestion || undefined,
      shortenSuggestion: stop.parentSupportData.shortenSuggestion || undefined,
    });
  }

  if (stop.placeReferenceData) {
    await db.insert(plannerPlaceReference).values({
      placeId: place.id,
      directionsNote: stop.placeReferenceData.directionsNote || undefined,
      openingHours: stop.placeReferenceData.openingHours || undefined,
      priceRange: stop.placeReferenceData.priceRange || undefined,
      bookingRequired: stop.placeReferenceData.bookingRequired ?? false,
      bookingUrl: stop.placeReferenceData.bookingUrl || undefined,
    });
  }

  const [inserted] = await db.insert(plannerTripPlanStops).values({
    planId,
    placeId: place.id,
    dayNumber: stop.dayNumber,
    displayOrder: stop.displayOrder,
    name: stop.name,
    type: stop.type,
    durationMinutes: stop.durationMinutes,
    effortLevel: stop.effortLevel,
    indoorOutdoor: stop.indoorOutdoor,
    sensoryLoad: stop.sensoryLoad || "moderate",
    familyAnchorType: stop.familyAnchorType || "support",
    minAge: stop.minAge,
    whyNow: stop.whyNow,
    travelMinutes: stop.travelMinutes || 0,
    travelMode: stop.travelMode || "walking",
    latitude: stop.latitude,
    longitude: stop.longitude,
    address: stop.address,
    parentSupportData: stop.parentSupportData,
    placeReferenceData: stop.placeReferenceData,
    placeProfileData: stop.placeProfileData,
    reviewRequired: stop.reviewRequired ?? false,
    reviewNote: stop.reviewNote ?? null,
  }).returning();

  return { place, inserted };
}

async function enrichAndPersistScores(
  stop: GeneratedStop,
  placeId: string,
  input: PlannerInput
): Promise<void> {
  if (!isStopIntelligenceEnabled()) return;

  const city = input.destination.split(",")[0]?.trim() || input.destination;

  const enriched = await enrichStop(
    {
      name: stop.name,
      type: stop.type,
      destination: input.destination,
      effortLevel: stop.effortLevel,
      indoorOutdoor: stop.indoorOutdoor,
      sensoryLoad: stop.sensoryLoad,
      familyAnchorType: stop.familyAnchorType,
      minAge: stop.minAge,
      durationMinutes: stop.durationMinutes,
    },
    placeId
  );

  // ── Per-stop completeness log in the serving path ─────────────────────────
  // This is the canonical observability log for stop cache coverage.
  // stop_completeness values: fully_enriched | content_complete | raw
  console.log(JSON.stringify({
    event: "stop_served",
    stopName: stop.name,
    city,
    placeId,
    stop_completeness_state: enriched.stopCompletenessState,
  }));

  const family: FamilyProfile = {
    childrenAges: input.childrenAges,
    pace: input.pace,
    transportMode: input.transportMode,
    stopType: stop.type,
    effortLevel: stop.effortLevel,
    indoorOutdoor: stop.indoorOutdoor,
    sensoryLoad: stop.sensoryLoad,
    familyAnchorType: stop.familyAnchorType,
    minAge: stop.minAge,
    durationMinutes: stop.durationMinutes,
  };

  const scores = computeScores(enriched, family);

  await db.update(plannerStopIntelligence)
    .set({
      kidFitScore: scores.ageAndKidFitScore,
      practicalityScore: scores.parentPracticalityScore,
      flowFitScore: scores.flowAndDayFitScore,
      flexibilityScore: scores.flexibilityAndRecoveryScore,
      socialProofScore: scores.delightScore,
      discoveryScore: scores.familyEvidenceConfidenceScore,
      finalScore: scores.finalScore,
      roleAssigned: scores.roleAssigned,
    })
    .where(eq(plannerStopIntelligence.placeId, placeId));

  console.log(`[StopIntelligence] ${stop.name}: finalScore=${scores.finalScore}, role=${scores.roleAssigned}`);
}

/**
 * Generate a large pool of 15-25 candidate stops for a city.
 * This is used for caching and is NOT personalized — it produces a broad,
 * diverse set of high-quality stops covering different types and effort levels.
 * Personalization happens later via selectStopsFromPool().
 */
/** India-specific mandatory landmark anchors — mirrors travelContent.ts */
const INDIA_POOL_ANCHORS = `
India — mandatory anchors (if destination matches, these MUST appear in Batch A):
- Delhi → Red Fort AND India Gate | Agra → Taj Mahal (non-negotiable #1)
- Jaipur → Amber Fort AND Hawa Mahal | Mumbai → Gateway of India AND Marine Drive
- Goa → Baga/Anjuna Beach AND Se Cathedral | Varanasi → Dashashwamedh Ghat (Ganga Aarti)
- Bangalore → Bangalore Palace AND Lalbagh Botanical Garden AND Cubbon Park
- Mysore → Mysore Palace (non-negotiable) AND Chamundi Hill AND Brindavan Gardens
- Ooty → Nilgiri Mountain Railway (UNESCO) AND Doddabetta Peak AND Ooty Botanical Gardens AND Ooty Lake AND Pykara Falls AND Thread Garden AND Rose Garden AND Ketti Valley Viewpoint
- Kochi → Fort Kochi Chinese Fishing Nets AND St. Francis Church
- Munnar → Tea Museum AND Echo Point AND Top Station AND Mattupetty Dam AND Kundala Lake AND Eravikulam National Park (Nilgiri Tahr) AND Attukal Waterfalls AND Pothamedu Viewpoint AND Lakkam Waterfalls AND Carmelagiri Elephant Park AND Blossom Park AND Marayoor Sandalwood Forests
- Manali → Hadimba Temple AND Solang Valley | Shimla → Mall Road AND Christ Church | Darjeeling → Tiger Hill AND Tea estates
- Udaipur → City Palace AND Pichola Lake | Jodhpur → Mehrangarh Fort | Jaisalmer → Jaisalmer Fort
- Rishikesh → Laxman Jhula AND Triveni Ghat AND Beatles Ashram | Amritsar → Golden Temple (non-negotiable)
- Hampi → Virupaksha Temple AND Vittala Temple (Stone Chariot + Musical Pillars) AND Elephant Stables AND Queen's Bath AND Lotus Mahal AND Hemakuta Hill AND Matanga Hill AND Royal Enclosure AND Tungabhadra River Coracle Ride AND Anegundi Village AND Hazara Rama Temple AND Zanana Enclosure
- Coorg → Abbey Falls AND Raja's Seat AND Dubare Elephant Camp AND Namdroling Monastery (Golden Temple) AND Iruppu Falls AND Brahmagiri Hills AND Coffee Estate Walk
- Hyderabad → Golconda Fort AND Charminar AND Ramoji Film City AND Hussain Sagar Lake AND Nehru Zoological Park AND Salar Jung Museum AND Birla Mandir AND NTR Gardens
- Kolkata → Victoria Memorial AND Howrah Bridge AND Science City Kolkata AND Indian Museum AND Birla Planetarium AND Nicco Park AND Kalighat Temple AND Belur Math AND Dakshineswar Temple AND Eco Park AND Marble Palace AND Tagore's House (Jorasanko) AND Kumartuli Pottery District AND Sundarbans day trip AND Prinsep Ghat
- Chennai → Marina Beach AND Kapaleeshwarar Temple AND Arignar Anna Zoological Park AND Government Museum AND Elliot's Beach (Besant Nagar) AND Valluvar Kottam AND Semmozhi Poonga AND DakshinaChitra Heritage Museum AND Mahabalipuram day trip
- Mahabalipuram → Shore Temple AND Arjuna's Penance AND Five Rathas AND Varaha Cave Temple AND Krishna's Butter Ball AND Mahishasuramardini Cave AND Crocodile Bank AND Tiger Cave
- Madurai → Meenakshi Amman Temple (non-negotiable) AND Thirumalai Nayakkar Palace AND Gandhi Museum AND Vaigai River Promenade AND Alagar Kovil AND Pazhamudir Cholai AND Koodal Azhagar Temple
- Pondicherry → Promenade Beach AND Auroville (Matrimandir) AND Sri Aurobindo Ashram AND French Quarter (White Town) AND Ousteri Lake AND Botanical Garden AND Chunnambar Boat House
- Ranthambore → Ranthambore Fort AND Zone 1-5 Tiger Safari AND Padam Talao Lake AND Rajbagh Ruins AND Jogi Mahal AND Trinetra Ganesh Temple AND Kachida Valley
- Andaman Islands → Radhanagar Beach AND Cellular Jail (Light & Sound Show) AND Elephant Beach AND Ross Island AND Baratang Limestone Caves AND Neil Island AND Jolly Buoy Island AND Chidiya Tapu
- Pushkar → Brahma Temple AND Pushkar Lake (Ghats) AND Savitri Temple AND Pushkar Camel Fair Grounds AND Old Rangji Temple AND Varaha Temple AND Rose Garden AND Sunset Viewpoint
- Leh Ladakh → Thiksey Monastery AND Pangong Tso Lake AND Nubra Valley AND Shanti Stupa AND Diskit Monastery AND Khardung La Pass AND Magnetic Hill AND Hall of Fame AND Hemis Monastery
- Alleppey → Alappuzha Backwaters Houseboat AND Vembanad Lake AND Krishnapuram Palace AND Alleppey Lighthouse AND Pathiramanal Island AND Marari Beach AND Ambalapuzha Sri Krishna Temple AND Coir Museum AND Kuttanad Rice Bowl AND Kumarakom Bird Sanctuary
- Varkala → Varkala Cliff AND Papanasam Beach AND Janardhana Swami Temple AND Kappil Lake AND Anjengo Fort AND Sivagiri Mutt AND Black Beach (Odayam) AND Varkala Tunnel
- Lonavala → Bhushi Dam AND Karla Caves AND Bhaja Caves AND Tiger's Leap viewpoint AND Rajmachi Fort AND Lohagad Fort AND Lonavala Lake AND Della Adventure Park AND Duke's Nose
- Bikaner → Junagarh Fort AND Camel Research Centre AND Karni Mata Temple AND Lalgarh Palace AND National Research Centre on Camel AND Bhand Sagar Temple AND Gajner Palace AND Deshnok Desert
`;

/** Expansion hint for small/rural destinations that have <20 named attractions */
const SMALL_CITY_EXPANSION = `
For compact hill stations, wildlife reserves, and small towns: expand your pool by including:
- Nearby day-trip destinations reachable within 90 minutes
- Local tea/coffee/spice estate tours
- Nature walks, trekking starting points, and sunrise viewpoints
- Boat rides, river crossings, or lake activities
- Village experiences, local markets, and artisan workshops
- Cultural performances and temple festivals
These count as valid stops — include them to reach 10 stops per batch.
`;

/**
 * Proven day-by-day stop sequences for the top 10 Indian family destinations,
 * sourced from real Indian travel package flows (not AI-generated).
 * Used as the base template for the "package-first → AI-refined" itinerary model.
 * Only applies to Indian destinations — all others fall back to AI generation.
 *
 * Cache management: when templates are updated, clear city_stop_pool_cache rows
 * for affected cities. See migrations/0005_clear_india_canonical_city_cache.sql.
 */
const INDIA_CANONICAL_ITINERARIES: Record<string, {
  days: Array<{ dayNumber: number; theme: string; stops: string[]; whyItWorks: string }>;
  /**
   * Stops that are culturally or historically significant for this city but are NOT
   * included in the default family itinerary. They can be surfaced in the Replace Stop
   * sheet when parents actively ask for alternatives — with their context note shown —
   * but the AI should never default to recommending them.
   */
  optionalAlternatives?: Array<{ name: string; context: string }>;
}> = {
  goa: {
    days: [
      {
        dayNumber: 1, theme: "North Goa — Fun + Energy",
        stops: ["Baga Beach", "Calangute Beach", "Fort Aguada", "Candolim Beach"],
        whyItWorks: "Easy movement, short distances between beaches, kids love beach hopping — natural energy arc from play to sunset"
      },
      {
        dayNumber: 2, theme: "Experiences + Heat Break",
        stops: ["Dolphin Boat Ride", "Snow Park Indoor Play Area", "Anjuna Beach", "Vagator Beach"],
        whyItWorks: "Morning sea adventure, indoor cool-down in the heat, relaxed beach evening"
      },
      {
        dayNumber: 3, theme: "Chill + Culture",
        stops: ["Basilica of Bom Jesus Old Goa", "Panjim Latin Quarter", "Mandovi River Cruise"],
        whyItWorks: "Gentle cultural immersion, compact walkable quarter, river cruise is a calm family closer"
      },
    ]
  },
  ooty: {
    days: [
      {
        dayNumber: 1, theme: "Core Ooty",
        stops: ["Ooty Lake", "Ooty Botanical Gardens", "Rose Garden"],
        whyItWorks: "Central cluster, easy walking between all three, boat ride at the lake is a kid favourite"
      },
      {
        dayNumber: 2, theme: "Scenic + Factory Day",
        stops: ["Doddabetta Peak", "Tea Factory and Museum", "Chocolate Factory"],
        whyItWorks: "Morning peak energy for the hike, then relaxed factory visits — chocolate factory is the highlight for kids"
      },
      {
        dayNumber: 3, theme: "Coonoor Loop",
        stops: ["Nilgiri Mountain Railway Toy Train", "Sim's Park Coonoor", "Dolphin's Nose Viewpoint"],
        whyItWorks: "The classic Coonoor day trip — toy train is the #1 kid highlight in the Nilgiris"
      },
    ]
  },
  mysore: {
    days: [
      {
        dayNumber: 1, theme: "Heritage Core",
        stops: ["Mysore Palace", "Mysore Zoo", "Brindavan Gardens"],
        whyItWorks: "Palace grandeur in the morning, zoo is one of India's best for kids, Brindavan evening lights show is magical"
      },
      {
        dayNumber: 2, theme: "Short Excursion",
        stops: ["Chamundi Hill", "St. Philomena's Church", "Devaraja Market"],
        whyItWorks: "Hill drive with panoramic views, quick cultural stops, local market sensory experience"
      },
    ]
  },
  jaipur: {
    days: [
      {
        dayNumber: 1, theme: "Forts Day",
        stops: ["Amber Fort", "Jaigarh Fort", "Jal Mahal"],
        whyItWorks: "Forts cluster together on the same hill, kids love the elephant steps and fort walk, Jal Mahal is a scenic photo stop"
      },
      {
        dayNumber: 2, theme: "City Core",
        stops: ["City Palace Jaipur", "Jantar Mantar", "Hawa Mahal"],
        whyItWorks: "Compact city center circuit, all within walking distance, royal history and iconic architecture"
      },
      {
        dayNumber: 3, theme: "Kids + Experience Day",
        stops: ["Elefantastic Animal Experience", "Chokhi Dhani Cultural Village"],
        whyItWorks: "Morning animal interaction, evening cultural village with folk art, food, and camel rides — the trip highlight for most families"
      },
    ]
  },
  delhi: {
    days: [
      {
        dayNumber: 1, theme: "Old + New Mix",
        stops: ["India Gate", "Rashtrapati Bhavan", "Lodhi Garden"],
        whyItWorks: "Open green spaces for kids to run, iconic monuments, comfortable walking pace across central Delhi"
      },
      {
        dayNumber: 2, theme: "Old Delhi Immersion",
        stops: ["Red Fort", "Jama Masjid", "Chandni Chowk"],
        whyItWorks: "Rickshaw ride through Chandni Chowk is a top kid experience in India; Red Fort is non-negotiable Delhi"
      },
      {
        dayNumber: 3, theme: "Family Flex Day",
        stops: ["Akshardham Temple Delhi", "National Rail Museum Delhi"],
        whyItWorks: "Akshardham has the best kids' engagement in Delhi (boat ride, film, gardens); Rail Museum is a classic Indian family stop"
      },
    ]
  },
  agra: {
    days: [
      {
        dayNumber: 1, theme: "Agra Essentials",
        stops: ["Taj Mahal", "Agra Fort", "Mehtab Bagh"],
        whyItWorks: "Taj at dawn is non-negotiable; Agra Fort midday; Mehtab Bagh offers the best sunset view of the Taj across the river"
      },
      {
        dayNumber: 2, theme: "Day Trip (Optional)",
        stops: ["Fatehpur Sikri"],
        whyItWorks: "Abandoned Mughal ghost city — uniquely immersive, compact enough for families, 40 min from Agra"
      },
    ]
  },
  udaipur: {
    days: [
      {
        dayNumber: 1, theme: "Lake City Core",
        stops: ["City Palace Udaipur", "Lake Pichola Boat Ride"],
        whyItWorks: "Palace grandeur in the morning, magical lake boat ride with island palace views in the afternoon"
      },
      {
        dayNumber: 2, theme: "Scenic Excursion",
        stops: ["Sajjangarh Palace Monsoon Palace", "Saheliyon ki Bari"],
        whyItWorks: "Hilltop palace sunset views, then tranquil garden fountains that kids love running through"
      },
      {
        dayNumber: 3, theme: "Relax + Markets (Optional)",
        stops: ["Udaipur Old City Markets"],
        whyItWorks: "Easy chill day — browsing the local markets and street food, no pressure sightseeing before departure"
      },
    ]
  },
  mumbai: {
    days: [
      {
        dayNumber: 1, theme: "Iconic Mumbai",
        stops: ["Gateway of India", "Ferry Ride from Gateway", "Marine Drive"],
        whyItWorks: "Gateway of India is iconic; ferry ride across the harbour is a kid highlight; Marine Drive evening walk is quintessential Mumbai"
      },
      {
        dayNumber: 2, theme: "Kids + Experience",
        stops: ["Nehru Science Centre Mumbai", "Juhu Beach"],
        whyItWorks: "Nehru Science Centre is one of India's best interactive museums for kids; Juhu beach is relaxed and fun"
      },
    ]
  },
  bangalore: {
    days: [
      {
        dayNumber: 1, theme: "Parks + Learning",
        stops: ["Lalbagh Botanical Garden", "Cubbon Park", "Visvesvaraya Industrial and Technological Museum"],
        whyItWorks: "Green park morning, then the best science museum in Bangalore — kids love the interactive exhibits"
      },
      {
        dayNumber: 2, theme: "Wildlife + Indoor Play",
        stops: ["Bannerghatta National Park Zoo and Safari", "Indoor Play Zone or Family Mall Break"],
        whyItWorks: "Morning safari and zoo, afternoon indoor play or air-conditioned mall break — gives young kids recovery time after the morning energy"
      },
    ]
  },
  kochi: {
    days: [
      {
        dayNumber: 1, theme: "Kochi Heritage",
        stops: ["Fort Kochi Walk", "Chinese Fishing Nets", "Kerala Kathakali Centre"],
        whyItWorks: "Fort Kochi is compact and charming; fishing nets are iconic; Kathakali is a unique cultural performance kids find fascinating"
      },
      {
        dayNumber: 2, theme: "Travel to Munnar",
        stops: ["Scenic Drive Kochi to Munnar", "Waterfalls Stop en route"],
        whyItWorks: "Scenic mountain drive through the Western Ghats with roadside waterfall stops — the journey is part of the experience"
      },
      {
        dayNumber: 3, theme: "Munnar Highlights",
        stops: ["Tea Plantations Walk Munnar", "Eravikulam National Park"],
        whyItWorks: "Morning tea estate walk for scenic beauty, then Eravikulam for rare Nilgiri Tahr wildlife spotting — the iconic Munnar day"
      },
      {
        dayNumber: 4, theme: "Chill + Return",
        stops: [],  // Source intentionally has no specific stops — open day for relaxed departure
        whyItWorks: "Final day is intentionally unstructured — families leave at their own pace"
      },
    ]
  },
  munnar: {
    days: [
      {
        dayNumber: 1, theme: "Munnar Highlights",
        stops: ["Eravikulam National Park", "Tea Plantations Walk Munnar", "Mattupetty Dam"],
        whyItWorks: "Rare Nilgiri Tahr spotting; endless green tea hills for stunning photos; dam boat ride"
      },
      {
        dayNumber: 2, theme: "Scenic + Viewpoints",
        stops: ["Echo Point Munnar", "Top Station Munnar", "Attukad Waterfalls"],
        whyItWorks: "Morning echo point fun for kids, highest point scenic views, waterfall afternoon"
      },
    ]
  },
  manali: {
    days: [
      {
        dayNumber: 1, theme: "Valley Arrival + Nature + Culture",
        stops: ["Hadimba Temple", "Manu Temple", "Old Manali Market"],
        whyItWorks: "Hadimba Temple is the iconic cedar-forest shrine — magical atmosphere for kids; Manu Temple is a short forest hike with a big reward; Old Manali market has the village-apple-adventure energy families love as a gentle first evening"
      },
      {
        dayNumber: 2, theme: "Snow + Adventure Day",
        stops: ["Solang Valley", "Rohtang Pass"],
        whyItWorks: "Solang Valley is the #1 kids moment — snow play, zorbing, rope cars, yak rides; Rohtang Pass adds a genuine high-altitude wow. Start pre-dawn for Rohtang to beat permit queues and afternoon snow-glare"
      },
      {
        dayNumber: 3, theme: "Hot Springs + History + Departure",
        stops: ["Vashisht Hot Springs and Temple", "Naggar Castle"],
        whyItWorks: "Natural hot-spring pools are a relaxed, sensory morning; Naggar Castle (now a heritage hotel + museum) is a short valley detour with the Roerich Art Gallery — a hidden gem before the scenic drive out"
      },
    ]
  },
  shimla: {
    days: [
      {
        dayNumber: 1, theme: "Mall Road + Ridge + Jakhu",
        stops: ["Mall Road Shimla", "Scandal Point", "Ridge Shimla", "Christ Church Shimla", "Jakhu Temple"],
        whyItWorks: "Mall Road is Shimla's car-free pedestrian heart — safe and easy for young children; Scandal Point and Ridge are the natural extensions; Christ Church is the landmark Victorian church; Jakhu Temple rewarded by a short cable car or monkey-filled forest hike"
      },
      {
        dayNumber: 2, theme: "Kufri Excursion",
        stops: ["Kufri Hill Station", "Himalayan Nature Park Kufri"],
        whyItWorks: "Kufri is the #1 family day trip — Yak rides, snow activity in season, and Himalayan Nature Park with bar-headed geese and musk deer; compact enough to do both without rushing"
      },
      {
        dayNumber: 3, theme: "Heritage + Waterfall",
        stops: ["Viceregal Lodge Shimla", "Chadwick Falls"],
        whyItWorks: "Viceregal Lodge (now IIAS) is a grand Tudor-Gothic mansion that feels like a palace to kids — sprawling lawns, dramatic architecture; Chadwick Falls is a refreshing 45-minute forest walk before departure"
      },
    ]
  },
  darjeeling: {
    days: [
      {
        dayNumber: 1, theme: "Sunrise + Monastery Loop",
        stops: ["Tiger Hill Sunrise Viewpoint", "Batasia Loop", "Ghum Monastery"],
        whyItWorks: "Tiger Hill at 4 AM is the crown jewel — the Kanchenjunga silhouette at sunrise is a once-in-a-lifetime moment; Batasia Loop (circular toy-train track with war memorial) and Ghum Monastery are the natural compact follow-ons"
      },
      {
        dayNumber: 2, theme: "Wildlife + Culture + Plaza",
        stops: ["Darjeeling Zoo", "Himalayan Mountaineering Institute", "Chowrasta Mall"],
        whyItWorks: "Darjeeling Zoo has rare Snow Leopard, Red Panda, and Himalayan Wolf — kids are captivated; HMI is inspiring for young explorers; Chowrasta is the breezy central plaza for pony rides and relaxed people-watching"
      },
      {
        dayNumber: 3, theme: "Tea + Toy Train",
        stops: ["Darjeeling Himalayan Railway Toy Train", "Happy Valley Tea Estate"],
        whyItWorks: "The UNESCO Darjeeling Himalayan Railway toy train is non-negotiable — even a short 2-hour joyride is iconic; Happy Valley Tea Estate is the most accessible estate with guided farm-to-cup walks families love"
      },
    ]
  },
  varanasi: {
    days: [
      {
        dayNumber: 1, theme: "Ganges + Ghats + Aarti",
        stops: ["Assi Ghat Sunrise Boat Ride", "Dashashwamedh Ghat", "Ganga Aarti Ceremony"],
        whyItWorks: "Dawn boat ride on the Ganges past 80 ghats is the defining Varanasi experience; Dashashwamedh Ghat is the grand central ghat for afternoon exploration; the evening Ganga Aarti is a dramatic fire-and-chant spectacle children remember for life"
      },
      {
        dayNumber: 2, theme: "Temples + Buddhist Circuit",
        stops: ["Kashi Vishwanath Temple", "Sarnath Day Trip"],
        whyItWorks: "Kashi Vishwanath is the great golden temple at the spiritual heart of Varanasi; Sarnath is where the Buddha gave his first teaching — a peaceful deer park with India's finest Buddhist stupa and a superb museum"
      },
    ]
  },
  amritsar: {
    days: [
      {
        dayNumber: 1, theme: "Golden Temple Circuit",
        stops: ["Golden Temple Harmandir Sahib", "Langar Community Kitchen", "Jallianwala Bagh"],
        whyItWorks: "Golden Temple is one of the most spiritually powerful places on Earth — the reflection pool and marble causeway are breathtaking; Langar (free community kitchen feeding 100,000 daily) is a transformative shared-meal experience for children; Jallianwala Bagh is a moving memorial a short walk away"
      },
      {
        dayNumber: 2, theme: "Border Ceremony + Fort + Bazaar",
        stops: ["Wagah Border Retreat Ceremony", "Gobindgarh Fort", "Amritsar Street Food Bazaar"],
        whyItWorks: "Wagah Border beating-retreat flag ceremony is a flag-waving, chanting, synchronised spectacle kids absolutely love — arrive early for front seats; Gobindgarh Fort is immersive with cannons, folk performances, and a laser show; bazaar street food (kulcha, lassi, jalebi) is the final feast"
      },
    ]
  },
  coorg: {
    days: [
      {
        dayNumber: 1, theme: "Waterfalls + Viewpoints + Fort",
        stops: ["Abbey Falls", "Raja's Seat Viewpoint", "Madikeri Fort"],
        whyItWorks: "Abbey Falls is the icon — a short 500m jungle walk leads to a powerful cascade, kids love the mist; Raja's Seat is a manicured sunset garden with Sahyadri valley views; Madikeri Fort is compact, colourful, and has a small museum"
      },
      {
        dayNumber: 2, theme: "Elephants + Monastery",
        stops: ["Dubare Elephant Camp", "Namdroling Monastery Bylakuppe"],
        whyItWorks: "Dubare Elephant Camp (on the Kaveri River) is the highlight of Coorg for kids — bathing, feeding, and riding elephants in the river; Namdroling Monastery (the 'Golden Temple of Coorg') is a stunning Tibetan Buddhist monastery with 18m golden statues"
      },
      {
        dayNumber: 3, theme: "Coffee + Nature Walk",
        stops: ["Coffee Estate Walk Coorg", "Iruppu Falls"],
        whyItWorks: "A guided Coorg coffee estate walk teaches kids farm-to-cup; Iruppu Falls is a powerful forest waterfall 1km into the jungle — perfect last-day energy before departure"
      },
    ]
  },
  hyderabad: {
    days: [
      {
        dayNumber: 1, theme: "Old City Heritage",
        stops: ["Charminar", "Laad Bazaar", "Mecca Masjid"],
        whyItWorks: "Charminar is the city icon — climb to the top for sweeping old-city views; Laad Bazaar overflows with bangles, street food, and Hyderabadi culture; Mecca Masjid is a grand historic mosque right next door — a tightly clustered heritage morning"
      },
      {
        dayNumber: 2, theme: "Fort + Lake + Temple",
        stops: ["Golconda Fort", "Hussain Sagar Lake", "Birla Mandir"],
        whyItWorks: "Golconda Fort has a legendary hand-clap acoustic trick kids love, plus a thrilling rampart climb; Hussain Sagar sunset boat to the giant Buddha island statue; Birla Mandir's white marble temple glows against the hillside at night"
      },
      {
        dayNumber: 3, theme: "Entertainment + Wildlife",
        stops: ["Ramoji Film City", "Nehru Zoological Park Hyderabad"],
        whyItWorks: "Ramoji Film City (world's largest film studio complex) has rides, shows, and movie-set backdrops — the ultimate full-day kids attraction; Nehru Zoo is one of India's best with tigers, rhinos, and a safari"
      },
    ]
  },
  kolkata: {
    optionalAlternatives: [
      {
        name: "Kalighat Temple",
        context: "One of India's 51 Shakti Peethas and deeply atmospheric — but active ritual animal sacrifice (goats) happens daily in an open courtyard. Not recommended for young or sensitive children. Worth considering for older kids (10+) who have been prepared for the experience with cultural context."
      }
    ],
    days: [
      {
        dayNumber: 1, theme: "Colonial Icons + Riverside",
        stops: ["Victoria Memorial Kolkata", "Howrah Bridge Walk", "Prinsep Ghat"],
        whyItWorks: "Victoria Memorial is Kolkata's most stunning building — gleaming white marble with a compelling museum inside; Howrah Bridge is iconic and thrilling to walk across; Prinsep Ghat is a beautiful neoclassical riverside promenade for a golden-hour stroll"
      },
      {
        dayNumber: 2, theme: "Science + Theme Park",
        stops: ["Science City Kolkata", "Nicco Park"],
        whyItWorks: "Science City is one of India's largest and best hands-on science museums — kids easily spend 3-4 hours; Nicco Park (adjacent) is the natural afternoon follow-on with rides and a big wheel"
      },
      {
        dayNumber: 3, theme: "Temples + Planetarium + Museum",
        stops: ["Dakshineswar Temple", "Birla Planetarium Kolkata", "Indian Museum Kolkata"],
        whyItWorks: "Dakshineswar's vast riverfront temple complex (where Ramakrishna lived) is serene and fascinating; Birla Planetarium is the largest in Asia — star shows and astronomy displays kids love; Indian Museum is the oldest museum in Asia with mummies, fossils, and a brilliant collection"
      },
    ]
  },
  alleppey: {
    days: [
      {
        dayNumber: 1, theme: "Backwaters Houseboat",
        stops: ["Kerala Backwaters Houseboat Cruise", "Vembanad Lake", "Kuttanad Village Walk"],
        whyItWorks: "Overnight on an Alleppey rice-boat houseboat is THE defining Kerala family experience — sleeping on the water, canoe-width canals, rice paddies to the horizon; Vembanad Lake is the widest lake in Kerala; Kuttanad village walk shows real below-sea-level farming life"
      },
      {
        dayNumber: 2, theme: "Beach + Lighthouse + Palace",
        stops: ["Alappuzha Beach", "Alleppey Lighthouse", "Krishnapuram Palace"],
        whyItWorks: "Alappuzha Beach is calm and non-touristy — good for young children; the lighthouse climb gives panoramic backwaters views kids love; Krishnapuram Palace has a fascinating mural painting collection and beautiful grounds"
      },
    ]
  },
  pondicherry: {
    days: [
      {
        dayNumber: 1, theme: "French Quarter + Auroville",
        stops: ["French Quarter White Town Walk", "Promenade Beach Pondicherry", "Auroville Matrimandir"],
        whyItWorks: "White Town's yellow-and-white French colonial streets are a visual delight unlike anywhere else in India; Promenade Beach is scenic and car-free along the seafront; Auroville's Matrimandir golden sphere is genuinely mystical — book the inner chamber in advance for older children"
      },
      {
        dayNumber: 2, theme: "Ashram + Nature + Boat",
        stops: ["Sri Aurobindo Ashram", "Botanical Garden Pondicherry", "Chunnambar Boat House"],
        whyItWorks: "Sri Aurobindo Ashram is peaceful and serene — a moment of stillness even young children feel; Botanical Garden is beautifully maintained with a small aquarium; Chunnambar Boat House does river and backwater rides to Paradise Beach — the perfect last-day adventure"
      },
    ]
  },
  rishikesh: {
    days: [
      {
        dayNumber: 1, theme: "Bridges + Aarti + River Life",
        stops: ["Laxman Jhula", "Ram Jhula", "Triveni Ghat Ganga Aarti"],
        whyItWorks: "Laxman and Ram Jhula are iconic suspension bridges — kids love the sway and the monkeys; the market lanes between them are buzzing with colour; Triveni Ghat's evening Ganga Aarti is more intimate than Varanasi — families can sit close, release flower lamps on the river, and genuinely feel the moment"
      },
      {
        dayNumber: 2, theme: "Adventure + History",
        stops: ["Family River Rafting Rishikesh", "Beatles Ashram"],
        whyItWorks: "Rishikesh's Grade I-II family rafting (9km Shivpuri stretch) is safe for ages 7+ and is the most thrilling 2-hour experience on the Ganges — kids talk about it for years; Beatles Ashram (where the Fab Four composed over 40 songs) is a striking graffiti-covered jungle ruin that children find magical"
      },
    ]
  },
  hampi: {
    days: [
      {
        dayNumber: 1, theme: "Living Temple + Stone Chariot",
        stops: ["Virupaksha Temple", "Hampi Bazaar", "Vittala Temple and Stone Chariot"],
        whyItWorks: "Virupaksha is Hampi's living temple — active worship, a temple elephant, and a 9-storey gopuram that dwarfs everything around it; Hampi Bazaar's kilometre-long colonnaded street has an Indiana Jones atmosphere; Vittala Temple's iconic stone chariot is the single most photogenic monument in Hampi — UNESCO listed"
      },
      {
        dayNumber: 2, theme: "Ruins + River Crossing",
        stops: ["Hemakuta Hill Sunrise", "Elephant Stables", "Lotus Mahal", "Tungabhadra River Coracle Ride"],
        whyItWorks: "Hemakuta Hill at sunrise puts the entire ruins landscape in golden light — breathtaking; Elephant Stables has 11 grand domed chambers kids love running through; Lotus Mahal is an architectural gem combining Hindu and Islamic styles; the round woven-basket coracle boats that cross the Tungabhadra are a kids' favourite ride"
      },
    ]
  },
  jaisalmer: {
    days: [
      {
        dayNumber: 1, theme: "Living Fort + Havelis + Lake",
        stops: ["Jaisalmer Fort", "Patwon Ki Haveli", "Gadisar Lake"],
        whyItWorks: "Jaisalmer Fort is unique in the world — a LIVING fort with 3,000 residents, shops, restaurants, and temples inside golden sandstone walls that glow amber at sunset; Patwon Ki Haveli has five mansions with jaw-dropping carved jali windows; Gadisar Lake's sandstone temples and paddle boats make for a magical sunset"
      },
      {
        dayNumber: 2, theme: "Desert Safari + Camp",
        stops: ["Sam Sand Dunes Desert Safari", "Desert Camp Dinner and Stargazing"],
        whyItWorks: "Camel safari at Sam Sand Dunes is the quintessential Rajasthan experience — vast golden dunes with nothing on the horizon; overnight desert camp with folk music, Rajasthani thali dinner under the stars, and the clearest night sky in India — children never forget sleeping in the desert"
      },
    ]
  },
  "leh ladakh": {
    days: [
      {
        dayNumber: 1, theme: "Acclimatise — Gentle Arrival",
        stops: ["Leh Palace", "Shanti Stupa Leh", "Leh Market"],
        whyItWorks: "Altitude acclimatisation at 3,500m is non-negotiable — no strenuous activity on Day 1. Leh Palace and Shanti Stupa are gentle uphill walks with panoramic views of the Indus Valley; Leh market is colourful, compact, and the right pace. Parents must plan 48h rest before any high-altitude passes"
      },
      {
        dayNumber: 2, theme: "Monastery Circuit",
        stops: ["Thiksey Monastery", "Hemis Monastery"],
        whyItWorks: "Thiksey is the most photogenic monastery in Ladakh — 12 storeys on a hilltop resembling the Potala Palace, with a 15m golden Buddha inside; Hemis is Ladakh's wealthiest monastery with a museum of priceless ancient thangkas and a magnificent courtyard"
      },
      {
        dayNumber: 3, theme: "Nubra Valley + Bactrian Camels",
        stops: ["Khardung La Pass", "Diskit Monastery Nubra", "Hunder Sand Dunes and Bactrian Camels"],
        whyItWorks: "Crossing Khardung La — formerly the world's highest motorable road — is an epic milestone kids love boasting about; Diskit Monastery has a giant 32m Maitreya Buddha overlooking the valley; Hunder's cold desert sand dunes with double-humped Bactrian camel rides are utterly unique in the world"
      },
      {
        dayNumber: 4, theme: "Pangong Lake",
        stops: ["Pangong Lake"],
        whyItWorks: "Pangong's colour-shifting turquoise lake — 134km long, extending into Tibet — is one of the most jaw-dropping landscapes on Earth. The 5-hour drive is part of the experience. At 4,350m, the air is thin but the silence and colours are extraordinary. Overnight camping at the lake is the peak family memory"
      },
      {
        dayNumber: 5, theme: "Return to Leh + Departure",
        stops: ["Magnetic Hill Leh", "Gurudwara Pathar Sahib"],
        whyItWorks: "Magnetic Hill (where cars appear to roll uphill against gravity) is a fun last-day curiosity kids love; Gurudwara Pathar Sahib is a Sikh shrine carved into a boulder with a fascinating story — a calm and beautiful final stop before the airport"
      },
    ]
  },
  lonavala: {
    days: [
      {
        dayNumber: 1, theme: "Dams + Viewpoints + Lake",
        stops: ["Bhushi Dam", "Tiger's Leap Viewpoint", "Lonavala Lake"],
        whyItWorks: "Bhushi Dam is famous for water flowing over stepped rocks — kids wade through waist-deep streams in monsoon; Tiger's Leap is a dramatic precipice viewpoint 650m above the valley floor; Lonavala Lake is peaceful and perfect for a picnic break between the busy viewpoints"
      },
      {
        dayNumber: 2, theme: "Caves + Vista + Chikki",
        stops: ["Karla Caves", "Lion's Point", "Lonavala Chikki Market"],
        whyItWorks: "Karla Caves is the finest surviving Buddhist rock-cut chaitya hall in India — kids find the 2,000-year-old carved columns awe-inspiring; Lion's Point has sweeping Sahyadri valley views with wind strong enough to fly a kite; Lonavala's famous chikki (peanut brittle) market is a sweet finale — children eat it for weeks after"
      },
    ]
  },
  madurai: {
    days: [
      {
        dayNumber: 1, theme: "Meenakshi Temple + Palace",
        stops: ["Meenakshi Amman Temple", "Thirumalai Nayakkar Palace"],
        whyItWorks: "Meenakshi Temple is one of India's most spectacular complexes — 12 towering gopurams encrusted with thousands of colourful sculptures, a golden lotus tank, and a Hall of 1,000 Pillars; it's genuinely astonishing even for young children. Thirumalai Palace is a grand Dravidian-Mughal structure with a vast courtyard"
      },
      {
        dayNumber: 2, theme: "Museum + Tank + Market",
        stops: ["Gandhi Museum Madurai", "Vandiyur Mariamman Teppakulam", "Madurai Flower Market"],
        whyItWorks: "Gandhi Museum (where his bloodstained dhoti from the assassination is displayed) is moving for older children with context; Teppakulam tank is a vast square temple pond with a central island shrine — evening boat rides at dusk are magical; Madurai's famous flower market overflows with marigold and jasmine at dawn"
      },
    ]
  },
  mahabalipuram: {
    days: [
      {
        dayNumber: 1, theme: "Shore Temple + Rathas + Rock Relief",
        stops: ["Shore Temple Mahabalipuram", "Five Rathas", "Arjuna's Penance"],
        whyItWorks: "Shore Temple at sunrise against the Bay of Bengal is one of south India's most iconic images — kids love the setting; Five Rathas are five individual chariot-shaped temples each carved from a single rock — children climb in and around them; Arjuna's Penance is the world's largest bas-relief carved on a single rock face — a 7th-century panorama of animals and deities 27m wide that children can walk across"
      },
      {
        dayNumber: 2, theme: "Beach + Tiger Cave + Crocodile Bank",
        stops: ["Mahabalipuram Beach", "Tiger Cave Rock Cut Shrine", "Crocodile Bank"],
        whyItWorks: "The beach right next to the Shore Temple is relaxed, relatively calm, and beautiful for a morning swim; Tiger Cave is an ancient rock-cut open-air stage with fierce tiger faces carved around the entrance arch; Crocodile Bank (15km south) is Asia's finest crocodile conservation centre — 5,000 crocodiles, king cobras, and monitor lizards that children absolutely love"
      },
    ]
  },
  ranthambore: {
    optionalAlternatives: [
      {
        name: "Ranthambore Night Safari",
        context: "Night safaris are not officially permitted inside Ranthambore Tiger Reserve — any operator offering them is operating outside legal boundaries. Do not book night safaris here regardless of what is advertised."
      }
    ],
    days: [
      {
        dayNumber: 1, theme: "Morning Safari + Fort",
        stops: ["Ranthambore Tiger Safari Zone 1-5", "Ranthambore Fort"],
        whyItWorks: "Morning safaris (6-9am) have the highest tiger-sighting probability — Ranthambore averages 60-70% sighting success, the best of any Indian reserve; Zones 1-5 are the prime zones, book well in advance online. Ranthambore Fort (inside the tiger reserve) is a UNESCO World Heritage site — crumbling medieval battlements with lake views, deer grazing inside the walls"
      },
      {
        dayNumber: 2, theme: "Evening Safari + Departure",
        stops: ["Ranthambore Tiger Safari Zone 6-10", "Padam Talao Lake"],
        whyItWorks: "Evening safaris (3-6pm) cover the outer zones — sloth bear, leopard, sambar deer, and massive marsh crocodiles are the common sightings; Padam Talao is Ranthambore's largest lake and the most reliable wildlife congregation point at dusk"
      },
    ]
  },
  varkala: {
    days: [
      {
        dayNumber: 1, theme: "Cliff Walk + Temple + Beach",
        stops: ["Varkala Cliff Walk", "Janardana Swami Temple", "North Cliff Beach Varkala"],
        whyItWorks: "Varkala's red laterite cliff walk is unlike any other Indian beach — cafes and yoga studios perched 30m above the Arabian Sea; Janardana Swami Temple at the cliff's edge is 2,000 years old and deeply atmospheric — kids are fascinated by its cliff-face setting; the beach below is relaxed and safe for families"
      },
      {
        dayNumber: 2, theme: "Quiet Beach + Ayurveda + Sunset",
        stops: ["Papanasam Beach", "Odayam Beach Walk"],
        whyItWorks: "Papanasam Beach is the main Varkala beach — calmer, less touristy, and safe for children to swim; Odayam Beach (30-min walk north along the cliff path) is pristine and nearly empty — a stunning final walk in Kerala before departure"
      },
    ]
  },
  ahmedabad: {
    days: [
      {
        dayNumber: 1, theme: "Gandhi + Stepwell + Riverfront",
        stops: ["Sabarmati Ashram", "Adalaj Stepwell", "Sabarmati Riverfront"],
        whyItWorks: "Sabarmati Ashram (Gandhi's home for 13 years and the starting point of the Salt March) is an essential piece of India's story — wonderfully presented for children; Adalaj Stepwell is a 5-storey geometric masterpiece of carved sandstone that kids find genuinely mind-bending; Sabarmati Riverfront is a wide, beautiful promenade — perfect for cycling, ice cream, and an evening stroll"
      },
      {
        dayNumber: 2, theme: "Kankaria Lake + Science City",
        stops: ["Kankaria Lake", "Science City Ahmedabad"],
        whyItWorks: "Kankaria Lake is a complete family entertainment zone — toy train around the lake, Kankaria Zoo, balloon festival rides, and a giant Ferris wheel; Science City Ahmedabad is Asia's one of the largest science museums with a phenomenal aquarium, IMAX dome, a robotic gallery, and massive interactive exhibits — kids easily spend a full day here"
      },
    ]
  },
  chennai: {
    days: [
      {
        dayNumber: 1, theme: "Marina Beach + Temples + Cathedral",
        stops: ["Marina Beach", "Kapaleeshwarar Temple", "Santhome Cathedral"],
        whyItWorks: "Marina Beach at dawn is the world's second longest urban beach — 13km of golden sand with the lighthouse, ice cream carts, and kite flyers; go early to beat the heat. Kapaleeshwarar Temple is a magnificent Dravidian complex with a soaring painted gopuram and a sacred peacock (the temple's symbol) that delights children. Santhome Cathedral is built over the tomb of St Thomas the Apostle — 16th-century Portuguese architecture with an underground crypt that kids find genuinely mysterious"
      },
      {
        dayNumber: 2, theme: "Zoo + Heritage Village",
        stops: ["Arignar Anna Zoological Park", "DakshinaChitra Heritage Museum"],
        whyItWorks: "Vandalur Zoo (Arignar Anna) is one of South Asia's largest and finest — white tigers, reticulated pythons, giraffes, and rhinos on a sprawling 602-acre reserve with a toy train inside; children can easily spend half a day here. DakshinaChitra is a living heritage museum with 18 authentic traditional homes relocated from Tamil Nadu, Kerala, Karnataka, and Andhra — craftsmen work live in front of visitors, and children can try pottery and weaving"
      },
    ]
  },
  mahabaleshwar: {
    days: [
      {
        dayNumber: 1, theme: "Lake + Strawberries + Viewpoints",
        stops: ["Venna Lake", "Mapro Garden", "Arthur's Seat Viewpoint"],
        whyItWorks: "Venna Lake is the heart of Mahabaleshwar — kids love the horse rides around the lake and the pedal boats; it's calm, beautiful, and surrounded by forest. Mapro Garden is the must-do Mahabaleshwar experience — fresh strawberry picking in season (Feb–May), milkshakes, ice cream, jams, and the factory tour showing how chocolates are made. Arthur's Seat is the 'Queen of all viewpoints' — a sheer 1,000m drop into the valley with three river valleys visible at once; utterly breathtaking"
      },
      {
        dayNumber: 2, theme: "Shivaji's Fort + Waterfall",
        stops: ["Pratapgad Fort", "Lingmala Waterfall"],
        whyItWorks: "Pratapgad Fort at 1,080m altitude is where Shivaji Maharaj defeated Afzal Khan in 1659 — one of Maharashtra's most dramatic historical sites; the trek up the ramparts with valley views on all sides is manageable for kids 6+ and the battle story thrills older children. Lingmala Waterfall requires a 600-step descent into the forest, rewarded by a magnificent two-tier cascade — go after the rains (Jun–Nov) for full flow"
      },
    ]
  },
  matheran: {
    days: [
      {
        dayNumber: 1, theme: "Car-Free Arrival + Echo Point + One Tree Hill",
        stops: ["Matheran Toy Train", "Echo Point", "One Tree Hill"],
        whyItWorks: "Matheran is India's only car-free hill station — an eco-sensitive zone where horses and rickshaws replace cars, which children find utterly novel. The Neral–Matheran narrow-gauge toy train winds through thick Western Ghats jungle for 21km — a magical arrival experience (check current operating status before booking). Echo Point is every child's favourite stop — shout your name and hear it bounce back across the valley in perfect repetition. One Tree Hill has a lone centuries-old tree and a panoramic valley viewpoint just 20 minutes from town"
      },
      {
        dayNumber: 2, theme: "Sunrise Point + Clifftop Views + Market",
        stops: ["Panorama Point", "Louisa Point", "Charlotte Lake", "MG Road Market Walk"],
        whyItWorks: "Panorama Point at sunrise delivers a 270-degree sweep of the Sahyadri ranges — getting there on horseback in the dark is a genuine adventure. Louisa Point is perched on a sheer cliff edge at 800m with vertigo-inducing views down to the Ulhas Valley. Charlotte Lake is a serene jungle lake perfect for a post-walk picnic. MG Road market is Matheran's buzzing bazaar — chikki, leather slippers, local honey, and toys — a lovely final walk before the descent"
      },
    ]
  },
};

/**
 * Detect if a destination matches one of our canonical Indian city templates.
 * Returns the city key (e.g. "ooty") if matched, null otherwise.
 * ONLY used for Indian destinations.
 *
 * Uses word-boundary regex (\b) to prevent false positives — e.g. "Niagara" must
 * never match "agra", and "Nigeria" must never match "goa".
 *
 * Exported so callers (e.g. route handlers) can record the key in the DB.
 */
export function getIndiaCanonicalCityKey(destination: string): string | null {
  const lower = destination.toLowerCase();
  const cityKeys = Object.keys(INDIA_CANONICAL_ITINERARIES);
  for (const key of cityKeys) {
    if (new RegExp(`\\b${key}\\b`).test(lower)) return key;
  }
  // Alias handling — all with word boundaries to prevent substring false positives
  if (/\bmysuru\b/.test(lower)) return "mysore";
  if (/\bbengaluru\b/.test(lower)) return "bangalore";
  if (/\bcochin\b/.test(lower)) return "kochi";
  // "Kerala" as a region maps to the 4-day Kochi+Munnar circuit template
  if (/\bkerala\b/.test(lower) && !/\bmunnar\b/.test(lower)) return "kochi";
  // New city aliases
  if (/\balappuzha\b/.test(lower)) return "alleppey";
  if (/\bpuducherry\b/.test(lower)) return "pondicherry";
  if (/\bcalcutta\b/.test(lower)) return "kolkata";
  // Leh Ladakh: match "Ladakh" alone OR "Leh, India" / "Leh Ladakh"
  if (/\bladakh\b/.test(lower)) return "leh ladakh";
  if (/\bleh\b/.test(lower)) return "leh ladakh";
  // Mamallapuram is the old name for Mahabalipuram
  if (/\bmamallapuram\b/.test(lower)) return "mahabalipuram";
  // Madras is the old name for Chennai
  if (/\bmadras\b/.test(lower)) return "chennai";
  return null;
}

/**
 * Build the canonical template text block for injection into prompts.
 * Returns null if the destination has no canonical template.
 * Uses word-boundary city-name matching — "Niagara" does NOT match \bagra\b.
 *
 * Exported so callers can determine whether a canonical template applies before
 * using getIndiaCanonicalCityKey to retrieve the specific key.
 */
export function getIndiaCanonicalContext(destination: string): string | null {
  // Two-tier matching to balance false negatives (city-only inputs) vs false positives
  // (non-Indian cities sharing a name):
  //
  // Tier 1 — globally unique to India: match without needing "India" in the string.
  //   Ooty, Munnar, Shimla, Darjeeling, Manali, Coorg, Varanasi, Amritsar,
  //   Alleppey, Alappuzha, Pondicherry, Puducherry, Kolkata, Calcutta, Kerala,
  //   Rishikesh, Hampi, Jaisalmer, Ladakh, Lonavala, Madurai, Mahabalipuram,
  //   Mamallapuram, Ranthambore, Varkala, Ahmedabad, Chennai, Madras,
  //   Mahabaleshwar, Matheran.
  //
  // Tier 2 — ambiguous city names that exist elsewhere: require "India".
  //   "Hyderabad, Pakistan", "Delhi, Ontario", "Goa, Philippines" → will NOT trigger.
  //   "Hyderabad, India", "Delhi, India", "Goa, India" → WILL trigger.
  const globallyUniqueIndia = /\b(ooty|munnar|kerala|shimla|darjeeling|manali|coorg|varanasi|amritsar|alleppey|alappuzha|pondicherry|puducherry|kolkata|calcutta|rishikesh|hampi|jaisalmer|ladakh|lonavala|madurai|mahabalipuram|mamallapuram|ranthambore|varkala|ahmedabad|chennai|madras|mahabaleshwar|matheran)\b/i.test(destination);
  const hasIndia = /\bindia\b/i.test(destination);
  const hasAmbiguousCanonicalCity = /\b(goa|mysore|mysuru|jaipur|delhi|agra|udaipur|mumbai|bangalore|bengaluru|kochi|cochin|hyderabad|leh)\b/i.test(destination);

  const isIndia = globallyUniqueIndia || (hasIndia && hasAmbiguousCanonicalCity);
  if (!isIndia) return null;

  const key = getIndiaCanonicalCityKey(destination);
  if (!key) return null;

  const template = INDIA_CANONICAL_ITINERARIES[key];
  if (!template) return null;

  const lines: string[] = [
    `CANONICAL ITINERARY TEMPLATE (source: proven Indian travel packages):`,
    `This is the battle-tested stop sequence used by Indian travel planners for ${destination}.`,
    `Your itinerary MUST be built around these core stops. Do NOT introduce obscure or unknown locations.`,
    ``
  ];

  for (const day of template.days) {
    lines.push(`Day ${day.dayNumber} — ${day.theme}:`);
    day.stops.forEach((stop, i) => lines.push(`  ${i + 1}. ${stop}`));
    lines.push(`  Why this works: ${day.whyItWorks}`);
    lines.push(``);
  }

  lines.push(`ADAPTATION RULES:`);
  lines.push(`- If the trip is shorter than ${template.days.length} days, compress by merging later days or picking the top stops from each day`);
  lines.push(`- If the trip is longer, repeat the optional Day ${template.days.length} pattern or add nearby excursions`);
  lines.push(`- Reorder stops within a day only to improve geographic flow`);
  lines.push(`- Add kid-friendly context, pacing, and breaks — but do NOT swap out the core landmarks`);

  return lines.join("\n");
}

// Zone hints for the top family-travel cities. These narrow the universe of
// neighbourhood labels so the AI assigns consistent zone strings that the
// zone-clustering scorer in selectStopsFromPool can group correctly.
const CITY_ZONE_HINTS: Record<string, string> = {
  "new york city, usa":   "Zones: Midtown, Upper West Side, Upper East Side, Lower Manhattan, Brooklyn, Queens, Harlem, Battery Park City, SoHo/Tribeca, Astoria",
  "washington dc, usa":   "Zones: National Mall, Georgetown, Dupont Circle, Capitol Hill, Southwest Waterfront, Adams Morgan, Penn Quarter",
  "london, uk":           "Zones: Westminster/West End, South Bank, Kensington/Chelsea, East London, North London, Greenwich, Covent Garden",
  "paris, france":        "Zones: Eiffel Tower/7th, Marais/4th, Montmartre/18th, Latin Quarter/5th, Louvre/1st, Champs-Elysées/8th, Vincennes",
  "chicago, usa":         "Zones: The Loop, River North, Navy Pier/Streeterville, Lincoln Park, Museum Campus, Hyde Park, Wrigleyville",
  "san francisco, usa":   "Zones: Fisherman's Wharf/North Beach, Golden Gate/Presidio, Mission, Downtown/Union Square, Golden Gate Park, Chinatown, Haight-Ashbury",
  "los angeles, usa":     "Zones: Hollywood, Santa Monica/Venice, Universal City, Downtown LA, Beverly Hills, Griffith Park, Long Beach",
  "orlando, usa":         "Zones: Walt Disney World, Universal Studios Area, International Drive, SeaWorld Area, Downtown Orlando, Lake Buena Vista",
  "sydney, australia":    "Zones: CBD/Circular Quay, Darling Harbour, Bondi/Eastern Suburbs, Manly/Northern Beaches, Inner West, Parramatta",
  "tokyo, japan":         "Zones: Shinjuku, Shibuya, Asakusa/Ueno, Odaiba, Harajuku/Omotesando, Akihabara, Ikebukuro",
  "singapore, singapore": "Zones: Marina Bay, Orchard Road, Sentosa, Chinatown/Kampong Glam, Little India, Jurong, Changi",
  "dubai, uae":           "Zones: Downtown Dubai, Dubai Marina, Deira, Jumeirah, Al Quoz, Palm Jumeirah, Dubai Creek",
  "boston, usa":          "Zones: Downtown/Beacon Hill, Back Bay, Fenway/Kenmore, Cambridge, Charlestown, South Boston, North End",
  "miami, usa":           "Zones: South Beach/Art Deco, Brickell/Downtown, Wynwood, Coconut Grove, Coral Gables, Key Biscayne, Midtown",
  "seattle, usa":         "Zones: Downtown/Pike Place, Capitol Hill, Queen Anne/Seattle Center, Ballard, South Lake Union, Fremont, West Seattle",
};

function buildPoolBatchPrompt(destination: string, batchLabel: string, excludeNames: string[]): string {
  const exclusionClause = excludeNames.length > 0
    ? `\n\nDo NOT repeat any of these stops already generated: ${excludeNames.map(n => `"${n}"`).join(", ")}. Pick entirely different locations.`
    : "";

  // Normalize the destination string for zone hint lookup:
  // strip country suffix variants, collapse common abbreviations, lowercase.
  const normalizeForZoneKey = (dest: string): string => {
    return dest.toLowerCase()
      .replace(/\bnyc\b/, "new york city")
      .replace(/\bdc\b/, "washington dc")
      .replace(/\bla\b/, "los angeles")
      .replace(/\bsf\b/, "san francisco")
      .replace(/,\s*(the\s+)?usa$/i, ", usa")
      .replace(/,\s*u\.s\.a\.$/i, ", usa")
      .replace(/,\s*united states.*$/i, ", usa")
      .replace(/,\s*u\.k\.$/i, ", uk")
      .replace(/,\s*united kingdom$/i, ", uk")
      .trim();
  };
  const zoneHint = CITY_ZONE_HINTS[normalizeForZoneKey(destination)];
  const zoneInstruction = zoneHint
    ? `\nGEOGRAPHIC ZONES: ${zoneHint}. Assign each stop a neighbourhoodZone from this list — use the exact zone names shown above so nearby stops share the same zone label.\n`
    : "";

  const canonicalContext = getIndiaCanonicalContext(destination);
  if (canonicalContext) {
    const canonicalKey = getIndiaCanonicalCityKey(destination);
    console.log(`[CanonicalEngine] Using template "${canonicalKey}" for destination "${destination}" in pool batch "${batchLabel}"`);
  }

  const indiaInstruction = canonicalContext
    ? `\n\n${canonicalContext}\n\nPACKAGE-FIRST RULE: Your stop pool MUST be built around the canonical stops above in the sequence shown. These are the stops Indian travel planners consistently recommend — families trust them because they are real and well-known. Do not introduce obscure, made-up, or unknown locations. For batch "A — iconic anchors and must-sees", your first 5-7 stops MUST be drawn directly from the canonical list above. For batch "B — hidden gems", you may add complementary nearby stops but must still include any canonical stops not yet in Batch A.\n`
    : `\n${INDIA_POOL_ANCHORS}`;

  return `You are a family travel expert. Generate exactly 10 high-quality family-friendly stops in ${destination} for batch "${batchLabel}".${exclusionClause}
${indiaInstruction}${zoneInstruction}
${SMALL_CITY_EXPANSION}
Cover a mix of:
- Types: landmark, museum, nature, park, beach, market, viewpoint, zoo, aquarium, garden, plaza, restaurant, activity, neighborhood
- Effort: low, moderate, high
- Indoor/outdoor: indoor, outdoor, both
- Ages: toddlers, young kids (5-8), older kids (9-12), mixed
- Family anchor: anchor (must-see), support (complementary), filler (easy/passive), reset (rest/food), meal
- Sensory load: low, moderate, high

Return a JSON object:
{
  "stops": [
    {
      "name": "Stop name",
      "description": "1-2 sentence kid-friendly description",
      "type": "museum|park|landmark|restaurant|beach|viewpoint|market|garden|activity|other",
      "stopType": "museum|park|landmark|restaurant|beach|viewpoint|market|garden|activity|other",
      "durationMinutes": 90,
      "effortLevel": "low|moderate|high",
      "indoorOutdoor": "indoor|outdoor|both",
      "sensoryLoad": "low|moderate|high",
      "familyAnchorType": "anchor|support|filler|meal|reset",
      "minAge": 3,
      "whyNow": "Why families love this stop (1-2 sentences)",
      "travelMinutes": 10,
      "travelMode": "walking|driving|transit",
      "address": "Street address or area",
      "latitude": "latitude as string",
      "longitude": "longitude as string",
      "neighborhoodZone": "Neighbourhood/area name (e.g. 'Upper West Side', 'South Bank'). Use the zone names from GEOGRAPHIC ZONES above when provided; otherwise use the city's standard neighbourhood names.",
      "facts": ["Kid-friendly fact 1", "Kid-friendly fact 2", "Kid-friendly fact 3"],
      "parentTip": "One practical tip for parents (1-2 sentences)",
      "missions": [
        {"type": "knowledge", "question": "Trivia question", "options": ["A", "B", "C", "D"], "correctOption": 0, "xpReward": 5},
        {"type": "observation", "question": "Something kids can observe here", "xpReward": 5},
        {"type": "photo", "question": "A photo challenge at this stop", "xpReward": 10}
      ],
      "artifactName": "Collectible item name themed to this stop",
      "artifactEmoji": "🏛️",
      "parentSupportData": {
        "breakSuggestion": "Where to rest nearby",
        "foodSuggestion": "Nearest food option",
        "keepGoingSuggestion": "What to do next if energy is high",
        "moreFunSuggestion": "A fun add-on at or near this stop",
        "shortenSuggestion": "What to skip if short on time"
      },
      "placeReferenceData": {
        "directionsNote": "How to get there",
        "openingHours": "Hours or 'Check website'",
        "priceRange": "free|$|$$|$$$",
        "bookingRequired": false,
        "bookingUrl": ""
      },
      "placeProfileData": {
        "whyItWorks": "Why this works for families",
        "bathroomNotes": "Bathroom availability",
        "foodOptions": "Food on site or nearby",
        "parkingNotes": "Parking info",
        "bestTimeOfDay": "morning|afternoon|evening|anytime",
        "weatherSensitive": false,
        "strollerFriendly": true,
        "nearbyStops": ["Nearby place 1", "Nearby place 2"],
        "practicalTips": ["Tip 1", "Tip 2"]
      }
    }
  ]
}

Generate exactly 10 stops. Make each genuinely useful to real families visiting ${destination}.${GEOQUEST_SAFETY_PROMPT}`;
}

// ── Pool-building helpers ──────────────────────────────────────────────────

/** Sensible default visit duration by stop type (minutes). */
function durationByStopType(stopType: string): number {
  switch (stopType.toLowerCase()) {
    case "museum": return 120;
    case "zoo": return 150;
    case "aquarium": return 120;
    case "park": case "garden": return 60;
    case "nature": return 75;
    case "landmark": return 45;
    case "adventure": return 90;
    case "food": case "restaurant": case "cafe": return 60;
    case "street": return 45;
    default: return 75;
  }
}

/** Indoor/outdoor classification by stop type. */
function indoorOutdoorByStopType(stopType: string): "indoor" | "outdoor" | "both" {
  const t = stopType.toLowerCase();
  if (["museum", "aquarium", "theater", "food", "restaurant", "cafe", "indoor_attraction"].includes(t)) return "indoor";
  if (["park", "garden", "nature", "beach", "hiking", "outdoor_attraction", "street"].includes(t)) return "outdoor";
  return "both"; // zoo, landmark, adventure — can be either
}

/** Family anchor type by stop type. */
function anchorTypeByStopType(stopType: string): CachedStopCandidate["familyAnchorType"] {
  const t = stopType.toLowerCase();
  if (["museum", "zoo", "aquarium", "landmark", "adventure"].includes(t)) return "anchor";
  if (["park", "garden", "nature"].includes(t)) return "support";
  if (["food", "restaurant", "cafe"].includes(t)) return "meal";
  if (["street"].includes(t)) return "filler";
  return "support";
}

// ── Primary pool builder — reads from stop_library + planner_stop_intelligence ─

/**
 * Builds a city stop pool from curated stop_library rows joined with
 * planner_stop_intelligence scores. Makes zero AI calls.
 * Falls back to AI generation only when stop_library has no entries for
 * the requested city/country.
 */
export async function generateCityStopPool(
  city: string,
  country: string
): Promise<CachedStopCandidate[]> {
  const rows = await db
    .select({
      name: stopLibrary.name,
      description: stopLibrary.description,
      latitude: stopLibrary.latitude,
      longitude: stopLibrary.longitude,
      address: stopLibrary.address,
      stopType: stopLibrary.stopType,
      enrichment: stopLibrary.enrichment,
      // Intelligence joined via stop_library_id (column added by migration, absent from Drizzle schema)
      effortLabel: plannerStopIntelligence.effortLabel,
      rationaleShort: plannerStopIntelligence.rationaleShort,
      whyWorthItLabel: plannerStopIntelligence.whyWorthItLabel,
      morningFitScore: plannerStopIntelligence.morningFitScore,
      afterLunchFitScore: plannerStopIntelligence.afterLunchFitScore,
      lateDayFitScore: plannerStopIntelligence.lateDayFitScore,
      anchorStopFitScore: plannerStopIntelligence.anchorStopFitScore,
      strollerEaseScore: plannerStopIntelligence.strollerEaseScore,
      age2to4Fit: plannerStopIntelligence.age2to4Fit,
      age5to7Fit: plannerStopIntelligence.age5to7Fit,
      age8to12Fit: plannerStopIntelligence.age8to12Fit,
      parentEffortScore: plannerStopIntelligence.parentEffortScore,
    })
    .from(stopLibrary)
    .leftJoin(
      plannerStopIntelligence,
      sql`planner_stop_intelligence.stop_library_id = ${stopLibrary.id}`,
    )
    .where(
      and(
        sql`LOWER(TRIM(${stopLibrary.city})) = LOWER(TRIM(${city}))`,
        sql`LOWER(TRIM(${stopLibrary.country})) = LOWER(TRIM(${country}))`,
      ),
    )
    .orderBy(stopLibrary.name);

  if (rows.length === 0) {
    console.warn(`[CityPool] No stop_library entries for ${city}, ${country} — falling back to AI`);
    return generateCityStopPoolFromAI(city, country);
  }

  // Deduplicate: multiple planner_stop_intelligence rows can share the same stop_library_id,
  // and stop_library itself may have Unicode apostrophe variants of the same name.
  // Keep the first hit per normalized name (sort order already puts intelligence-rich rows first).
  const normalizeKey = (s: string) =>
    s.toLowerCase().trim()
      .replace(/[\u2018\u2019\u201a\u201b\u02bc]/g, "'")  // smart/curly single quotes → straight
      .replace(/[\u201c\u201d\u201e\u201f]/g, '"');        // smart double quotes → straight
  const seen = new Set<string>();
  const uniqueRows = rows.filter(row => {
    const key = normalizeKey(row.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[CityPoolSeeder] Building pool for ${city} from stop_library — ${uniqueRows.length} stops`);

  return uniqueRows.map((row): CachedStopCandidate => {
    const enrichment = row.enrichment as Record<string, string> | null;
    const stopType = row.stopType ?? "landmark";

    // effortLevel: parse intelligence effortLabel text, fall back to parentEffortScore
    let effortLevel: "low" | "moderate" | "high" = "moderate";
    const elText = (row.effortLabel ?? "").toLowerCase();
    if (elText.includes("easy") || elText.includes("low")) effortLevel = "low";
    else if (elText.includes("high") || elText.includes("strenuous")) effortLevel = "high";
    else if (row.parentEffortScore != null) {
      if (row.parentEffortScore <= 35) effortLevel = "low";
      else if (row.parentEffortScore >= 70) effortLevel = "high";
    }

    // sensoryLoad: enrichment field ("medium" → "moderate")
    let sensoryLoad: "low" | "moderate" | "high" = "moderate";
    const slText = (enrichment?.sensoryLoad ?? "").toLowerCase();
    if (slText === "low") sensoryLoad = "low";
    else if (slText === "high") sensoryLoad = "high";

    // minAge: derive from age-band fit scores (threshold ≥60)
    let minAge = 0;
    const a2 = row.age2to4Fit ?? 0;
    const a5 = row.age5to7Fit ?? 0;
    const a8 = row.age8to12Fit ?? 0;
    if (a2 >= 60 || (a2 === 0 && a5 === 0 && a8 === 0)) minAge = 0;
    else if (a5 >= 60) minAge = 5;
    else if (a8 >= 60) minAge = 8;

    // strollerFriendly: intelligence score ≥60, or enrichment flag
    const strollerFriendly =
      row.strollerEaseScore != null
        ? row.strollerEaseScore >= 60
        : enrichment?.strollerAccessibility === "yes";

    const whyNow = row.rationaleShort ?? row.whyWorthItLabel ?? `A great family stop in ${city}`;
    const indoorOutdoor = indoorOutdoorByStopType(stopType);

    return {
      name: row.name,
      description: row.description ?? undefined,
      latitude: row.latitude ?? undefined,
      longitude: row.longitude ?? undefined,
      address: row.address ?? undefined,
      stopType,
      type: stopType,
      durationMinutes: durationByStopType(stopType),
      effortLevel,
      indoorOutdoor,
      sensoryLoad,
      familyAnchorType: anchorTypeByStopType(stopType),
      minAge,
      whyNow,
      morningFitScore: row.morningFitScore ?? undefined,
      afterLunchFitScore: row.afterLunchFitScore ?? undefined,
      lateDayFitScore: row.lateDayFitScore ?? undefined,
      anchorStopFitScore: row.anchorStopFitScore ?? undefined,
      parentSupportData: {
        breakSuggestion: "Find a nearby bench or café for a quick rest.",
        foodSuggestion: "Check the venue's café or look for options nearby.",
        keepGoingSuggestion: "Explore any adjacent exhibits or outdoor areas.",
        moreFunSuggestion: "Ask staff for family activity sheets or guided highlights.",
        shortenSuggestion: "Pick the one highlight and save the rest for next time.",
      },
      placeReferenceData: {
        directionsNote: row.address ?? `Located in ${city}`,
        openingHours: "Check website for current hours",
        priceRange: "$$",
        bookingRequired: false,
        sourceConfidence: 90,
      },
      placeProfileData: {
        whyItWorks: whyNow,
        bathroomNotes: enrichment?.nearestRestroom ?? "Bathrooms available on-site.",
        foodOptions: "Check venue website for dining options.",
        parkingNotes: enrichment?.parkingAvailability ?? "Check local parking options.",
        bestTimeOfDay: enrichment?.bestTimeOfDay ?? "Morning or early afternoon",
        weatherSensitive: indoorOutdoor === "outdoor",
        strollerFriendly,
        nearbyStops: [],
        practicalTips: enrichment?.typicalWaitTime
          ? [`Typical wait time: ${enrichment.typicalWaitTime}`]
          : [],
      },
    };
  });
}

// ── AI fallback — used only when stop_library has no entries for a city ────

async function generateCityStopPoolFromAI(
  city: string,
  country: string
): Promise<CachedStopCandidate[]> {
  const destination = `${city}, ${country}`;

  const callBatch = async (batchLabel: string, excludeNames: string[]): Promise<CachedStopCandidate[]> => {
    const prompt = buildPoolBatchPrompt(destination, batchLabel, excludeNames);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a family travel expert. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error(`No content from AI for city pool batch ${batchLabel}: ${destination}`);
    const parsed = JSON.parse(content);
    return (parsed.stops || []) as CachedStopCandidate[];
  };

  console.log(`[CityPool] Generating batch A (10 stops) for ${destination}...`);
  const batchA = await callBatch("A — iconic anchors and must-sees", []);

  const batchANames = batchA.map(s => s.name);
  console.log(`[CityPool] Batch A: ${batchA.length} stops. Generating batch B (10 more)...`);

  await new Promise(resolve => setTimeout(resolve, 800));
  const batchB = await callBatch("B — hidden gems, local favourites, neighbourhood stops", batchANames);

  const all = [...batchA, ...batchB];
  const deduped = all.filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i);
  console.log(`[CityPool] ✅ Total: ${deduped.length} stops for ${destination} (A:${batchA.length} + B:${batchB.length})`);
  return deduped;
}

/**
 * Convert a cached stop candidate to GeneratedStop format for use with the
 * existing persistStop/enrichAndPersistScores pipeline.
 * dayNumber and displayOrder are assigned by the caller.
 */
function candidateToGeneratedStop(
  c: CachedStopCandidate,
  day: number,
  order: number,
  isCanonical = false
): GeneratedStop {
  const sc = c.placeReferenceData?.sourceConfidence;
  const isLowConfidence = !isCanonical && sc != null && sc < MIN_SOURCE_CONFIDENCE;
  return {
    dayNumber: day,
    displayOrder: order,
    name: c.name,
    type: c.type,
    durationMinutes: c.durationMinutes,
    effortLevel: c.effortLevel,
    indoorOutdoor: c.indoorOutdoor,
    sensoryLoad: c.sensoryLoad,
    familyAnchorType: c.familyAnchorType,
    minAge: c.minAge,
    whyNow: c.whyNow,
    travelMinutes: c.travelMinutes,
    travelMode: c.travelMode,
    latitude: c.latitude,
    longitude: c.longitude,
    address: c.address,
    neighborhoodZone: c.neighborhoodZone,
    parentSupportData: c.parentSupportData,
    placeReferenceData: c.placeReferenceData,
    placeProfileData: c.placeProfileData,
    reviewRequired: isLowConfidence,
    reviewNote: isLowConfidence
      ? "We found this stop but couldn't fully verify it — worth confirming before you visit."
      : undefined,
  };
}

/**
 * Select and sequence stops from the pool for a specific user trip.
 *
 * The pool replaces AI generation only — persistStop and enrichAndPersistScores
 * still run for every selected stop, preserving the full scoring pipeline.
 *
 * This function applies the same personalization dimensions that generateDayStops
 * encodes in its prompt: pace constraints, age rules, energy arc, stroller needs,
 * indoor/outdoor preference, kid energy level, trip style, interest alignment,
 * cognitive balance rules, and meal integration.
 */
export function selectStopsFromPool(
  pool: CachedStopCandidate[],
  input: PlannerInput,
  qualityProfile?: UserStopTypeProfile,
  targetCity?: string,
): GeneratedStop[] {
  const stopsPerDay = getStopsPerDay(input.pace);
  const paceConfig = getPaceConfig(input.pace);
  const childrenAges = input.childrenAges || [];
  const minChildAge = childrenAges.length > 0 ? Math.min(...childrenAges) : 5;
  const maxChildAge = childrenAges.length > 0 ? Math.max(...childrenAges) : 10;
  // For families with children under 3, a 90-min nap window is added per day, reducing activity capacity.
  // Capacity rule: relaxed stays at 2 stops/day; balanced/busy cap at 3 (2 main + 1 short <45 min).
  const napActive = minChildAge < 3;
  const effectiveStopsPerDay = napActive ? Math.min(stopsPerDay, 3) : stopsPerDay;
  const totalStopsNeeded = input.tripDays * effectiveStopsPerDay;

  let candidates = [...pool];

  // ── Hard constraint: stroller accessibility ──────────────────────────────
  if (input.strollerNeeded) {
    const filtered = candidates.filter(c => c.placeProfileData?.strollerFriendly !== false);
    if (filtered.length >= totalStopsNeeded) candidates = filtered;
  }

  // ── Hard constraint: age suitability (AGE RULES from generateDayStops) ───
  const ageFiltered = candidates.filter(c => (c.minAge ?? 0) <= maxChildAge + 2);
  if (ageFiltered.length >= totalStopsNeeded) candidates = ageFiltered;

  // ── Hard constraint: indoor/outdoor preference ────────────────────────────
  if (input.indoorLean === "indoor") {
    const filtered = candidates.filter(c => c.indoorOutdoor === "indoor" || c.indoorOutdoor === "both");
    if (filtered.length >= totalStopsNeeded) candidates = filtered;
  } else if (input.indoorLean === "outdoor") {
    const filtered = candidates.filter(c => c.indoorOutdoor === "outdoor" || c.indoorOutdoor === "both");
    if (filtered.length >= totalStopsNeeded) candidates = filtered;
  }

  // ── Quality-based exclusion: filter stop types this family consistently dislikes ─
  // When a target city is known, prefer city-scoped exclusions so that types
  // disliked in one city aren't suppressed globally for every destination.
  // If no city-specific exclusion data exists for the target city, skip global
  // exclusion (the city context changes the relevance of past aversions). Only
  // apply global exclusions when no city is specified.
  if (qualityProfile) {
    const cityKey = targetCity?.toLowerCase();
    let activeExcluded: Set<string> | null;
    if (cityKey) {
      activeExcluded = qualityProfile.cityExcludedTypes[cityKey] ?? null;
    } else {
      activeExcluded = qualityProfile.excludedTypes.size > 0 ? qualityProfile.excludedTypes : null;
    }

    if (activeExcluded && activeExcluded.size > 0) {
      const filtered = candidates.filter(c => !activeExcluded!.has(c.type?.toLowerCase() ?? ""));
      if (filtered.length >= totalStopsNeeded) {
        candidates = filtered;
        console.log(`[QualityProfile] Excluded types [${[...activeExcluded].join(", ")}] (${cityKey ? `city: ${cityKey}` : "global"}) — ${candidates.length} candidates remain`);
      }
    }
  }

  // ── Soft scoring: family-fit personalization ──────────────────────────────
  function scoreCandidate(stop: CachedStopCandidate): number {
    let score = 0;

    // Trip style weighting (mirrors generateDayStops "highlights/offbeat/easy" logic)
    if (input.tripStyle === "highlights" && stop.familyAnchorType === "anchor") score += 4;
    if (input.tripStyle === "offbeat" && stop.familyAnchorType !== "anchor") score += 2;
    if (input.tripStyle === "easy" && stop.effortLevel === "low") score += 3;
    if (input.tripStyle === "balanced") {
      if (stop.familyAnchorType === "anchor") score += 2;
      if (stop.familyAnchorType === "support") score += 1;
    }

    // Default anchor preference
    if (!input.tripStyle) {
      if (stop.familyAnchorType === "anchor") score += 3;
      if (stop.familyAnchorType === "support") score += 2;
    }

    // Kid energy level (mirrors kidEnergyLevel prompt in generateDayStops)
    if (input.kidEnergyLevel === "full" && stop.effortLevel === "high") score += 2;
    if (input.kidEnergyLevel === "low" && stop.effortLevel === "low") score += 3;
    if (input.kidEnergyLevel === "low" && stop.effortLevel === "high") score -= 2;
    if (input.kidEnergyLevel === "mixed") {
      if (stop.effortLevel === "moderate") score += 1;
    }

    // Age-band fit (mirrors AGE RULES 0-4, 5-7, 8-12 in generateDayStops)
    if (minChildAge <= 4) {
      if (stop.effortLevel === "low" && stop.sensoryLoad === "low") score += 3;
      if (stop.durationMinutes > 90) score -= 2; // max 90 min for toddlers
      if (["park", "zoo", "aquarium", "garden"].includes(stop.type)) score += 2;
      // For young children: outdoor landmarks with low effort are great
      if (stop.type === "landmark" && stop.effortLevel === "low" && stop.indoorOutdoor !== "indoor") score += 2;
    } else if (minChildAge <= 7) {
      if (["museum", "zoo", "landmark"].includes(stop.type) && stop.sensoryLoad !== "high") score += 2;
    } else if (minChildAge >= 8) {
      if (stop.effortLevel !== "low") score += 1;
    }

    // Landmark diversity bonus: boost outdoor iconic landmarks to prevent museum-only trips
    if (stop.type === "landmark" && stop.indoorOutdoor !== "indoor" && stop.familyAnchorType === "anchor") {
      score += 2;
    }

    // Mixed ages: plan stamina to youngest
    if (childrenAges.length > 1 && minChildAge <= 4 && stop.durationMinutes <= 60) score += 1;

    // Interest matching
    if (input.interests && input.interests.length > 0) {
      const stopText = `${stop.name} ${stop.type} ${stop.whyNow ?? ""}`.toLowerCase();
      for (const interest of input.interests) {
        if (stopText.includes(interest.toLowerCase())) score += 2;
      }
    }

    // Budget sensitivity
    if (input.budgetSensitivity === "budget" && stop.placeReferenceData?.priceRange === "free") score += 2;
    if (input.budgetSensitivity === "budget" && stop.placeReferenceData?.bookingRequired) score -= 1;
    if (input.budgetSensitivity === "premium" && stop.familyAnchorType === "anchor") score += 1;

    // ── Quality-based tuning: boost/penalise by this family's historical feedback ──
    if (qualityProfile && stop.type) {
      const typeKey = stop.type.toLowerCase();

      // City-specific score takes priority; fall back to global if no city data
      const cityKey = targetCity?.toLowerCase();
      const cityScores = cityKey ? (qualityProfile.cityTypeScores[cityKey] ?? {}) : {};
      const typeAdj = typeKey in cityScores
        ? cityScores[typeKey]
        : (qualityProfile.typeScores[typeKey] ?? 0);
      score += typeAdj;

      // Age-targeted Big Hit bonus: extra +2 when the family has loved this type AND
      // the stop's minAge fits within the current family's children age range.
      if (qualityProfile.bigHitTypes.has(typeKey) && childrenAges.length > 0) {
        const stopMin = stop.minAge ?? 0;
        if (stopMin <= maxChildAge && stopMin >= Math.max(0, minChildAge - 2)) {
          score += 2;
        }
      }
    }

    return score;
  }

  // Detect canonical trips before selection — zone scoring is skipped for India
  // canonical trips since their template stops are already geographically sensible.
  const isCanonicalTripForSelection = !!(
    getIndiaCanonicalCityKey(input.destination) ||
    (targetCity && getIndiaCanonicalCityKey(`${targetCity}, India`))
  );

  // Pre-compute base scores for all candidates
  const baseScores = new Map(candidates.map(c => [c, scoreCandidate(c)]));

  // ── Greedy selection with dynamic consecutive-type and zone-clustering scoring ─
  // At each selection step, candidates receive adjusted scores:
  //   - Base family-fit score (pre-computed)
  //   - -30 penalty for creating 3+ consecutive same-type stops in the current day
  //   - +10 zone-clustering bonus if candidate's zone matches a zone already in today's stops
  //   - -15 zone-scatter penalty if candidate would introduce a 3rd distinct zone today
  // Hard constraints (museum cap, global type diversity) are enforced as exclusions.
  // Zone scoring is skipped for India canonical trips.
  const selected: CachedStopCandidate[] = [];
  const usedTypes = new Map<string, number>();
  let learningHeavyCount = 0;
  const remaining = new Set(candidates);

  // Track zones for the current day window (reset when dayPosition wraps to 0)
  let zonesInCurrentDay = new Set<string>();
  // Track cumulative effective-duration minutes for the current day
  let dailyDurationMins = 0;

  while (selected.length < totalStopsNeeded && remaining.size > 0) {
    const dayPosition = selected.length % effectiveStopsPerDay;
    const currentDayStart = selected.length - dayPosition;
    const lastTwo = selected.slice(
      Math.max(currentDayStart, selected.length - 2),
      selected.length,
    );

    // Reset per-day trackers at the start of each new day
    if (dayPosition === 0) {
      zonesInCurrentDay = new Set<string>();
      dailyDurationMins = 0;
    }

    const learningLimit = Math.min(
      paceConfig.maxLearningHeavyStops * input.tripDays,
      Math.floor(totalStopsNeeded * 0.4),
    );

    // Find best valid candidate this step (accounting for all soft penalties/bonuses)
    let bestCandidate: CachedStopCandidate | null = null;
    let bestAdjustedScore = -Infinity;

    for (const c of remaining) {
      const typeCount = usedTypes.get(c.type) || 0;
      const isLearningHeavy = ["museum", "history", "culture"].includes(c.type);

      // Hard constraints: skip entirely
      if (isLearningHeavy && learningHeavyCount >= learningLimit) continue;
      if (typeCount >= 2 && remaining.size > 5) continue;
      // Toddler nap rule: meal stops cannot be the first activity of the day (must come after nap at ~1pm)
      const isMealType = ["restaurant", "meal", "food", "cafe"].includes(c.type ?? "");
      if (napActive && dayPosition === 0 && isMealType) continue;
      // Confidence gate: low-confidence stops (sourceConfidence < MIN_SOURCE_CONFIDENCE) cannot
      // be the anchor (first) stop of the day. Bypassed for canonical trips.
      if (!isCanonicalTripForSelection && dayPosition === 0) {
        const sc = c.placeReferenceData?.sourceConfidence;
        if (sc != null && sc < MIN_SOURCE_CONFIDENCE) continue;
      }

      // Duration cap: skip candidates that push today's effective total over pace ceiling.
      // Only enforced after the first stop (we always allow at least one stop per day).
      if (dayPosition > 0) {
        const effDur = effectiveDuration(c.durationMinutes, minChildAge);
        if (dailyDurationMins + effDur > paceConfig.totalStopMinutes.max) continue;
        // Toddler nap rule: last slot of day (for balanced/busy with napActive) must be a short stop (<45 min)
        if (napActive && input.pace !== "relaxed" && dayPosition === effectiveStopsPerDay - 1) {
          if (effDur >= 45) continue;
        }
      }

      let adjustedScore = baseScores.get(c) ?? 0;

      // Soft penalty: -30 for creating 3-in-a-row consecutive same-type stops
      if (dayPosition >= 2 && lastTwo.length === 2 && lastTwo.every(s => s.type === c.type)) {
        adjustedScore -= 30;
      }

      // Zone clustering bonus/penalty (skipped for India canonical trips)
      if (!isCanonicalTripForSelection && c.neighborhoodZone) {
        const zone = c.neighborhoodZone;
        if (zonesInCurrentDay.has(zone)) {
          // +10 for matching a zone already in today's plan (geographic clustering)
          adjustedScore += 10;
        } else if (zonesInCurrentDay.size >= 2) {
          // -15 for introducing a 3rd distinct zone to the day (scattered geography)
          adjustedScore -= 15;
        }
      }

      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestCandidate = c;
      }
    }

    if (!bestCandidate) break;

    selected.push(bestCandidate);
    remaining.delete(bestCandidate);
    usedTypes.set(bestCandidate.type, (usedTypes.get(bestCandidate.type) || 0) + 1);
    if (["museum", "history", "culture"].includes(bestCandidate.type)) learningHeavyCount++;
    if (bestCandidate.neighborhoodZone) {
      zonesInCurrentDay.add(bestCandidate.neighborhoodZone);
    }
    dailyDurationMins += effectiveDuration(bestCandidate.durationMinutes, minChildAge);
  }

  // Fill if we still need more stops (pool exhausted before totalStopsNeeded)
  if (selected.length < totalStopsNeeded) {
    for (const stop of remaining) {
      if (selected.length >= totalStopsNeeded) break;
      selected.push(stop);
    }
  }

  // ── Must-do iconic stop enforcement ──────────────────────────────────────
  // Guarantee at least one city-defining iconic stop is always selected,
  // regardless of pace, age scoring, or museum balance rules.
  if (targetCity) {
    const cityKey = targetCity.toLowerCase().trim().replace(/,\s*\w+$/, "");
    const mustDoEntry = CITY_MUST_DO_STOPS[cityKey];
    if (mustDoEntry) {
      const mustDoNames = mustDoEntry.stops.map(s => s.name.toLowerCase().split(" ")[0]);
      const alreadyHasMustDo = selected.some(s =>
        mustDoNames.some(n => s.name.toLowerCase().includes(n))
      );
      if (!alreadyHasMustDo) {
        // Find the best must-do candidate from the full pool (unscored)
        const mustDoCandidate = pool.find(c =>
          mustDoNames.some(n => c.name.toLowerCase().includes(n))
        );
        if (mustDoCandidate) {
          // Swap it in for the lowest-priority non-anchor stop, or append
          const swapIdx = selected.findIndex(s => s.familyAnchorType === "filler" || s.familyAnchorType === "reset");
          if (swapIdx !== -1) {
            selected[swapIdx] = mustDoCandidate;
          } else if (selected.length >= totalStopsNeeded) {
            selected[selected.length - 1] = mustDoCandidate;
          } else {
            selected.push(mustDoCandidate);
          }
          console.log(`[MustDo] Forced iconic stop into plan: "${mustDoCandidate.name}" (city: ${targetCity})`);
        }
      }
    }
  }

  // ── Assign day numbers following energy arc (mirrors ENERGY ARC rule) ─────
  // Per day: sequence by time-of-day fit scores from Stop Intelligence.
  // Primary key: numeric SI scores (morningFitScore / afterLunchFitScore / lateDayFitScore)
  //   when available in the candidate. Falls back to placeProfileData.bestTimeOfDay text.
  // Tiebreaker: anchorStopFitScore (higher = goes earlier).
  // India canonical trips skip ALL re-sorting — their template order is intentional.

  // Detect canonical trips — their template already encodes the correct order
  const isCanonicalTrip = !!(
    getIndiaCanonicalCityKey(input.destination) ||
    (targetCity && getIndiaCanonicalCityKey(`${targetCity}, India`))
  );

  // ── Slot-aware day sequencing using SI numeric scores ────────────────────
  // For each slot in the day, pick the candidate with the highest fit score
  // for that slot's time of day:
  //   Slot 0:        morningFitScore     (best for first activity)
  //   Slot 1:        afterLunchFitScore  (best for mid-day)
  //   Slot 2+:       lateDayFitScore     (best for late / wind-down)
  //   Tiebreaker:    anchorStopFitScore desc (higher → earlier)
  //
  // SI availability check: all-or-nothing per day slice. If no stop in the
  // slice has all three SI scores, falls back to familyAnchorType ordering.
  // When SI data is partially present (mixed availability, e.g. after task #124
  // populates pool candidates incrementally), stops that lack SI scores receive
  // an effective score of 0 for every slot — keeping them later in the day.
  function sequenceDayBySlot(dayStops: CachedStopCandidate[]): CachedStopCandidate[] {
    const hasSI = dayStops.some(
      s => s.morningFitScore !== undefined &&
           s.afterLunchFitScore !== undefined &&
           s.lateDayFitScore !== undefined,
    );

    if (!hasSI) {
      // Fallback: anchor-type order only (no bestTimeOfDay text parsing)
      const anchorOrder: Record<string, number> = { anchor: 0, support: 1, filler: 2, meal: 3, reset: 3 };
      return [...dayStops].sort(
        (a, b) => (anchorOrder[a.familyAnchorType] ?? 2) - (anchorOrder[b.familyAnchorType] ?? 2),
      );
    }

    // Slot-aware greedy assignment. Stops missing SI scores default to 0,
    // which places them after stops with real scores in the same slot bucket.
    const ordered: CachedStopCandidate[] = [];
    const pool = new Set(dayStops);

    for (let slot = 0; slot < dayStops.length; slot++) {
      // Which SI score governs this slot?
      const scoreKey: keyof CachedStopCandidate =
        slot === 0 ? "morningFitScore" :
        slot === 1 ? "afterLunchFitScore" :
        "lateDayFitScore";

      let best: CachedStopCandidate | null = null;
      let bestPrimary = -Infinity;
      let bestTiebreaker = -Infinity;

      for (const s of pool) {
        const primary = (s[scoreKey] as number | undefined) ?? 0;
        const tiebreaker = s.anchorStopFitScore ?? 0;
        if (primary > bestPrimary || (primary === bestPrimary && tiebreaker > bestTiebreaker)) {
          bestPrimary = primary;
          bestTiebreaker = tiebreaker;
          best = s;
        }
      }

      if (!best) break;
      ordered.push(best);
      pool.delete(best);
    }

    return ordered;
  }

  const result: GeneratedStop[] = [];
  let stopIdx = 0;

  for (let day = 1; day <= input.tripDays; day++) {
    const daySlice = selected.slice(stopIdx, stopIdx + effectiveStopsPerDay);
    stopIdx += effectiveStopsPerDay;
    if (daySlice.length === 0) break;

    let orderedSlice: CachedStopCandidate[];

    if (isCanonicalTrip) {
      // Canonical trips: preserve template sequence exactly — no sort applied
      orderedSlice = daySlice;
    } else {
      // Non-canonical: slot-aware sequencing (SI scores → anchor-type fallback)
      orderedSlice = sequenceDayBySlot(daySlice);

      // Kid energy level modifies first slot:
      // low energy → move high-effort morning anchor later in the day
      if (input.kidEnergyLevel === "low" && orderedSlice.length > 1 && orderedSlice[0].effortLevel === "high") {
        const [first, ...rest] = orderedSlice;
        const lowEffortIdx = rest.findIndex(s => s.effortLevel === "low");
        if (lowEffortIdx !== -1) {
          orderedSlice[0] = rest[lowEffortIdx];
          rest[lowEffortIdx] = first;
          orderedSlice = [orderedSlice[0], ...rest];
        }
      }

      // Confidence gate — post-sequencing anchor enforcement:
      // After all reordering, if the first stop is low-confidence, swap it with
      // the earliest non-low-confidence stop so a reviewRequired stop is never
      // placed as the day anchor regardless of how slot scoring ordered the day.
      if (orderedSlice.length > 1) {
        const firstSc = orderedSlice[0].placeReferenceData?.sourceConfidence;
        if (firstSc != null && firstSc < MIN_SOURCE_CONFIDENCE) {
          const swapIdx = orderedSlice.findIndex((s, i) => {
            if (i === 0) return false;
            const sc = s.placeReferenceData?.sourceConfidence;
            return sc == null || sc >= MIN_SOURCE_CONFIDENCE;
          });
          if (swapIdx !== -1) {
            const tmp = orderedSlice[0];
            orderedSlice[0] = orderedSlice[swapIdx];
            orderedSlice[swapIdx] = tmp;
          }
        }
      }
    }

    orderedSlice.forEach((stop, idx) => {
      result.push(candidateToGeneratedStop(stop, day, idx, isCanonicalTrip));
    });
  }

  return result;
}

/** Compute days-per-city for a multi-city trip.
 *  Priority order:
 *  1. routeStops[].nights (explicit per-city days set in the wizard)
 *  2. stayLocations checkIn/checkOut date spans
 *  3. Equal distribution fallback (last resort only)
 */
function daysPerCity(
  cities: string[],
  totalDays: number,
  stayLocations?: StayLocation[],
  routeStops?: Array<{ name: string; countryName?: string; nights?: number }>
): Record<string, number> {
  const result: Record<string, number> = {};

  // 1. Use explicit nights from routeStops (wizard per-city day selection)
  if (routeStops && routeStops.length > 0) {
    for (const rs of routeStops) {
      if (!rs.name || rs.nights == null) continue;
      const city = rs.name.trim();
      if (cities.includes(city) && rs.nights > 0) {
        result[city] = rs.nights;
      }
    }
  }

  // 2. Fill any city not yet assigned via stayLocations check-in/out dates
  if (stayLocations && stayLocations.length > 0) {
    for (const sl of stayLocations) {
      if (!sl.cityName) continue;
      const city = sl.cityName.trim();
      if (!cities.includes(city) || result[city]) continue;
      if (sl.checkIn && sl.checkOut) {
        const s = new Date(sl.checkIn);
        const e = new Date(sl.checkOut);
        const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
        result[city] = days;
      }
    }
  }

  // 3. Equal-share fallback for any city still not assigned
  const assigned = Object.values(result).reduce((a, b) => a + b, 0);
  const unassigned = cities.filter(c => !result[c]);
  if (unassigned.length > 0) {
    const share = Math.max(1, Math.round((totalDays - assigned) / unassigned.length));
    for (const c of unassigned) result[c] = share;
  }
  return result;
}

export async function generateItinerary(
  planId: string,
  input: PlannerInput
): Promise<{ stops: PlannerTripPlanStop[]; canonicalCitiesUsed: string[] }> {
  const stopsPerDay = getStopsPerDay(input.pace);
  const ageContext = getAgeContext(input.childrenAges);
  const primaryCity = input.destination.split(",")[0]?.trim() || input.destination;
  const countryName = input.destination.split(",").pop()?.trim() || input.destination;

  // ── Nap window: detect toddler families (youngest child under 3) ──────────
  const itinChildAges = input.childrenAges || [];
  const itinMinChildAge = itinChildAges.length > 0 ? Math.min(...itinChildAges) : 5;
  const napActive = itinMinChildAge < 3;

  // ── Quality tuning: load this family's historical stop feedback ───────────
  let qualityProfile: UserStopTypeProfile | undefined;
  if (input.userId) {
    try {
      const userSignals = await storage.getStopQualitySignalsByUser(input.userId);
      if (userSignals.length > 0) {
        qualityProfile = buildUserStopTypeProfile(userSignals);
        const boosted = Object.entries(qualityProfile.typeScores).filter(([, v]) => v > 0).map(([k]) => k);
        const penalised = Object.entries(qualityProfile.typeScores).filter(([, v]) => v < 0).map(([k]) => k);
        console.log(`[QualityProfile] ${userSignals.length} signals loaded — boosted: [${boosted.join(", ")}], penalised: [${penalised.join(", ")}], excluded: [${[...qualityProfile.excludedTypes].join(", ")}]`);
      }
    } catch (err) {
      console.warn("[QualityProfile] Failed to load user quality signals, proceeding without personalization:", err);
    }
  }

  // ── Multi-city detection: prefer explicit routeStops, fall back to stayLocations ──
  const routeCityNames: string[] = input.routeStops && input.routeStops.length >= 2
    ? [...new Set(input.routeStops.map((rs) => rs.name.trim()).filter(Boolean))]
    : [...new Set(
        (input.stayLocations || [])
          .map(sl => sl.cityName?.trim())
          .filter((n): n is string => !!n)
      )];
  const isMultiCity = routeCityNames.length >= 2;

  console.log(`[Planner] Generating ${input.tripDays} days × ${stopsPerDay} stops/day for ${input.destination}${isMultiCity ? ` [multi-city: ${routeCityNames.join(", ")}]` : ""} (sequential, no duplicates)`);

  // ── Multi-city: generate stops per city proportionally from pool ──────────
  if (isMultiCity) {
    const cityDayMap = daysPerCity(routeCityNames, input.tripDays, input.stayLocations, input.routeStops);
    console.log(`[Planner] Multi-city day distribution:`, cityDayMap);
    const allInserted: PlannerTripPlanStop[] = [];
    const canonicalCitiesUsed: string[] = [];
    let currentDay = 1;

    for (const city of routeCityNames) {
      const daysForCity = cityDayMap[city] || 1;
      const stopsNeeded = daysForCity * stopsPerDay;
      const cityInput: PlannerInput = { ...input, tripDays: daysForCity };

      // Resolve per-city country: prefer routeStops lookup, fall back to global countryName
      const cityCountry = input.routeStops?.find((rs) => rs.name.trim() === city)?.countryName || countryName;

      const pool = await storage.getCityStopPool(city, cityCountry);
      const dayOffset = currentDay - 1;
      if (pool && pool.stopPool && pool.stopPool.length > 0) {
        console.log(`[Planner] Multi-city cache hit for ${city}: ${pool.stopPool.length} stops, need ${stopsNeeded}`);
        try {
          let selected = selectStopsFromPool(pool.stopPool, cityInput, qualityProfile, city);
          if (napActive) selected = insertNapStopsIntoStopList(selected);
          for (const stop of selected) {
            stop.dayNumber += dayOffset;
            const { place, inserted } = await persistStop(stop, planId, city, countryName);
            allInserted.push(inserted);
            if (stop.type !== "rest") await enrichAndPersistScores(stop, place.id, input);
          }
          console.log(`[Planner] Multi-city ${city}: ${selected.length} stops persisted (days ${currentDay}–${currentDay + daysForCity - 1})${napActive ? " [nap windows inserted]" : ""}`);
          currentDay += daysForCity;
          continue;
        } catch (err) {
          console.error(`[Planner] Multi-city pool failed for ${city}, falling back to AI:`, err);
        }
      }

      // AI fallback for this city — check canonical template usage before generating
      const cityDestination = `${city}, ${cityCountry}`;
      const cityCanonicalKey = getIndiaCanonicalCityKey(cityDestination);
      if (cityCanonicalKey) {
        canonicalCitiesUsed.push(cityCanonicalKey);
        console.log(`[CanonicalEngine] Multi-city: city "${city}" will use canonical template "${cityCanonicalKey}"`);
      }

      console.log(`[Planner] Multi-city AI generation for ${city} (${daysForCity} days, starting day ${currentDay})`);
      const usedStopNames: string[] = [];
      for (let day = 1; day <= daysForCity; day++) {
        let dayStops = await generateDayStops(
          currentDay + day - 1,       // global day — used for trip-context prompt
          { ...input, destination: cityDestination },
          stopsPerDay,
          ageContext,
          usedStopNames,
          day,                        // city-local day — used for canonical template lookup
          qualityProfile,
          city,
        );
        // Assign day numbers, then normalize + insert nap stop for toddler families
        dayStops.forEach((stop, idx) => { stop.dayNumber = currentDay + day - 1; stop.displayOrder = idx; });
        if (napActive) {
          dayStops = normalizeNapDayStops(dayStops, input.pace, itinMinChildAge);
          dayStops = insertNapStopsIntoStopList(dayStops);
        }
        for (const stop of dayStops) {
          if (stop.type !== "rest") usedStopNames.push(stop.name);
          const { place, inserted } = await persistStop(stop, planId, city, cityCountry);
          allInserted.push(inserted);
          if (stop.type !== "rest") await enrichAndPersistScores(stop, place.id, input);
        }
      }
      currentDay += daysForCity;
    }

    console.log(`[Planner] Multi-city itinerary complete: ${allInserted.length} total stops${canonicalCitiesUsed.length > 0 ? `, canonical cities: [${canonicalCitiesUsed.join(", ")}]` : ""}`);
    return { stops: allInserted, canonicalCitiesUsed };
  }

  // ── Single-city: original logic ───────────────────────────────────────────
  const cityName = primaryCity;

  // ── Cache check ────────────────────────────────────────────────────────────
  const cachedPool = await storage.getCityStopPool(cityName, countryName);
  if (cachedPool && cachedPool.stopPool && cachedPool.stopPool.length > 0) {
    console.log(`[Planner] Cache hit for ${cityName}, ${countryName} — ${cachedPool.stopPool.length} candidate stops in pool`);
    try {
      // selectStopsFromPool applies all personalization constraints, then returns
      // GeneratedStop objects ready for the existing persistStop + enrichAndPersistScores pipeline.
      let selectedStops = selectStopsFromPool(cachedPool.stopPool, input, qualityProfile, cityName);
      if (napActive) selectedStops = insertNapStopsIntoStopList(selectedStops);
      const insertedStops: PlannerTripPlanStop[] = [];
      for (const stop of selectedStops) {
        const { place, inserted } = await persistStop(stop, planId, cityName, countryName);
        insertedStops.push(inserted);
        // Full scoring/enrichment pipeline — skipped for nap placeholder stops
        if (stop.type !== "rest") await enrichAndPersistScores(stop, place.id, input);
      }
      console.log(`[Planner] Cache-served itinerary: ${insertedStops.length} stops persisted and scored${napActive ? " [nap windows inserted]" : ""}`);
      return { stops: insertedStops, canonicalCitiesUsed: [] };
    } catch (err) {
      console.error("[Planner] Cache-pool selection failed, falling back to AI generation:", err);
    }
  }

  // ── AI generation (cache miss or fallback) ─────────────────────────────────
  try {
    const insertedStops: PlannerTripPlanStop[] = [];
    const usedStopNames: string[] = [];

    for (let day = 1; day <= input.tripDays; day++) {
      let dayStops = await generateDayStops(day, input, stopsPerDay, ageContext, usedStopNames, undefined, qualityProfile, cityName);
      dayStops.forEach((stop, idx) => {
        stop.dayNumber = day;
        stop.displayOrder = idx;
      });
      // Normalize + insert nap stop for toddler families (youngest child under 3)
      if (napActive) {
        dayStops = normalizeNapDayStops(dayStops, input.pace, itinMinChildAge);
        dayStops = insertNapStopsIntoStopList(dayStops);
      }
      console.log(`[Planner] Day ${day} generated: ${dayStops.length} stops${napActive ? " [nap window inserted]" : ""}`);

      for (const stop of dayStops) {
        if (stop.type !== "rest") usedStopNames.push(stop.name);
        const { place, inserted } = await persistStop(stop, planId, cityName, countryName);
        insertedStops.push(inserted);
        if (stop.type !== "rest") await enrichAndPersistScores(stop, place.id, input);
      }

      console.log(`[Planner] Day ${day} persisted and enriched`);
    }

    // ── Trigger dedicated city pool generation for future users (fire-and-forget) ─
    // We generate the pool separately (not from this user's personalized trip) so it
    // covers 15-25 diverse candidates regardless of this user's trip length/style.
    generateCityStopPool(cityName, countryName)
      .then(pool => {
        if (pool.length === 0) return;
        return storage.saveCityStopPool({
          city: cityName,
          country: countryName,
          normalizedKey: `${cityName.toLowerCase().trim()}:${countryName.toLowerCase().trim()}`,
          stopPool: pool,
        });
      })
      .then(saved => {
        if (saved) {
          console.log(`[Planner] Background: cached ${saved.stopPool.length} stops for ${cityName}, ${countryName}`);
        }
      })
      .catch(err => {
        console.warn("[Planner] Non-fatal: failed to generate/save city stop pool:", err);
      });

    console.log(`[Planner] Total stops generated and persisted: ${insertedStops.length}`);
    // For single-city AI path, canonical city key is derived from the destination directly
    const singleCityCanonicalKey = getIndiaCanonicalCityKey(input.destination);
    const canonicalCitiesUsed = singleCityCanonicalKey ? [singleCityCanonicalKey] : [];
    return { stops: insertedStops, canonicalCitiesUsed };
  } catch (error) {
    console.error("[Planner] Error generating itinerary:", error);
    throw new Error("Failed to generate itinerary");
  }
}

export async function enrichAndScoreStop(
  stop: GeneratedStop,
  placeId: string,
  input: PlannerInput
): Promise<void> {
  await enrichAndPersistScores(stop, placeId, input);
}

export async function generateReplacementSuggestions(
  stopId: string,
  destination: string,
  currentStop?: PlannerTripPlanStop | null
): Promise<{
  shorter: GeneratedStop[];
  easier: GeneratedStop[];
  indoor: GeneratedStop[];
  moreActive: GeneratedStop[];
  sameVibe: GeneratedStop[];
}> {
  let s: PlannerTripPlanStop;
  if (currentStop) {
    s = currentStop;
  } else {
    const stop = await db.select().from(plannerTripPlanStops).where(eq(plannerTripPlanStops.id, stopId)).limit(1);
    if (!stop.length) throw new Error("Stop not found");
    s = stop[0];
  }

  // Check if this destination has canonical optional alternatives (stops that are
  // culturally significant but not recommended by default for all families).
  // If so, inject them into the AI prompt so they can surface in the Replace sheet
  // with their parental context note — but the AI should treat them as lower-priority
  // options, only suggesting them when the vibe genuinely matches.
  const canonicalKey = getIndiaCanonicalCityKey(destination);
  const optionalAlternativesClause = (() => {
    if (!canonicalKey) return "";
    const template = INDIA_CANONICAL_ITINERARIES[canonicalKey];
    if (!template?.optionalAlternatives?.length) return "";
    const lines = template.optionalAlternatives.map(
      (alt) => `  - ${alt.name}: ${alt.context}`
    );
    return `\n\nLOCAL OPTIONAL STOPS (culturally significant but not recommended by default):
These stops exist and can be suggested — especially in the "sameVibe" group — but you MUST include their parentNote in the whyNow field so parents can make an informed choice. Do not lead with these; only include if they genuinely fit the group.
${lines.join("\n")}`;
  })();

  const prompt = `You are a family travel expert generating replacement suggestions for a trip stop.

Original Stop:
- Name: ${s.name}
- Type: ${s.type}
- Duration: ${s.durationMinutes} minutes
- Effort: ${s.effortLevel}
- Indoor/Outdoor: ${s.indoorOutdoor}
- Destination: ${destination}

Generate 5 groups of replacement suggestions (2 suggestions each):
1. shorter: Shorter alternatives (less time commitment)
2. easier: Easier alternatives (less physically demanding)
3. indoor: Indoor alternatives (weather-proof options)
4. moreActive: More active/energetic alternatives
5. sameVibe: Same vibe but different experience${optionalAlternativesClause}

Return JSON:
{
  "shorter": [{ same stop structure as above }],
  "easier": [...],
  "indoor": [...],
  "moreActive": [...],
  "sameVibe": [...]
}

Each suggestion must include: name, type, durationMinutes, effortLevel, indoorOutdoor, minAge, whyNow, address, latitude, longitude, parentSupportData, placeReferenceData, placeProfileData (same structure as above).
Also add for each suggestion:
- travelMinutes: estimated travel time from original stop (integer)
- durationDelta: difference in minutes from original (positive = longer, negative = shorter)
- effortDelta: "same", "easier", or "harder"`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a family travel expert. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No content from AI");
  const parsed = JSON.parse(content);

  const emptyGroup: GeneratedStop[] = [];
  return {
    shorter: parsed.shorter || emptyGroup,
    easier: parsed.easier || emptyGroup,
    indoor: parsed.indoor || emptyGroup,
    moreActive: parsed.moreActive || emptyGroup,
    sameVibe: parsed.sameVibe || emptyGroup,
  };
}

export async function handleSupportAction(
  stopId: string,
  action: "break" | "food" | "keep_going" | "more_fun" | "shorten",
  confirm?: boolean
): Promise<{ suggestion: string; details: string; shortenedTo?: number }> {
  const stop = await db.select().from(plannerTripPlanStops).where(eq(plannerTripPlanStops.id, stopId)).limit(1);
  if (!stop.length) throw new Error("Stop not found");
  const s = stop[0];

  if (action === "shorten" && confirm) {
    const shortenedDuration = Math.max(15, Math.round((s.durationMinutes || 60) * 0.5));
    await db.update(plannerTripPlanStops)
      .set({ durationMinutes: shortenedDuration, updatedAt: new Date() })
      .where(eq(plannerTripPlanStops.id, stopId));
    return {
      suggestion: `Shortened to ${shortenedDuration} minutes`,
      details: "Focus on the highlights and skip the extras",
      shortenedTo: shortenedDuration,
    };
  }

  interface SupportDataShape {
    breakSuggestion?: string;
    foodSuggestion?: string;
    keepGoingSuggestion?: string;
    moreFunSuggestion?: string;
    shortenSuggestion?: string;
  }
  const supportData = s.parentSupportData as SupportDataShape | null;
  let suggestion = "";
  let details = "";

  const fallback: Record<string, { suggestion: string; details: string }> = {
    break: { suggestion: `Find a quiet spot near ${s.name} to rest`, details: "Take a 15-minute break to recharge" },
    food: { suggestion: `Look for a cafe or restaurant near ${s.name}`, details: "Fuel up before continuing your adventure" },
    keep_going: { suggestion: `Explore more of ${s.name} or head to the next stop`, details: "Great energy — keep the momentum going!" },
    more_fun: { suggestion: `Find a playground or activity near ${s.name}`, details: "Add some extra excitement to your day" },
    shorten: { suggestion: `Head to the highlights of ${s.name} and move on`, details: `Focus on the best bits to save ~${Math.round((s.durationMinutes || 60) * 0.5)} minutes. Tap again to confirm.` },
  };

  if (supportData) {
    switch (action) {
      case "break":
        suggestion = supportData.breakSuggestion || fallback.break.suggestion;
        details = "Take 15-20 minutes to rest and recharge before continuing";
        break;
      case "food":
        suggestion = supportData.foodSuggestion || fallback.food.suggestion;
        details = "Grab a snack or meal to keep energy levels up";
        break;
      case "keep_going":
        suggestion = supportData.keepGoingSuggestion || fallback.keep_going.suggestion;
        details = "Your family has energy — make the most of it!";
        break;
      case "more_fun":
        suggestion = supportData.moreFunSuggestion || fallback.more_fun.suggestion;
        details = "Add some extra fun to this part of your day";
        break;
      case "shorten":
        suggestion = supportData.shortenSuggestion || fallback.shorten.suggestion;
        details = `Skip the extras and save ~${Math.round((s.durationMinutes || 60) * 0.5)} minutes. Tap again to confirm.`;
        break;
    }
  } else {
    const result = fallback[action];
    suggestion = result.suggestion;
    details = result.details;
  }

  return { suggestion, details };
}

export async function startAdventure(
  planId: string,
  userId: string,
  includedStopIds?: string[]
): Promise<{ experienceTripId: string; planId: string; tripName: string; totalStops: number }> {
  const plans = await db.select().from(plannerTripPlans).where(
    and(eq(plannerTripPlans.id, planId), eq(plannerTripPlans.userId, userId))
  ).limit(1);

  if (!plans.length) throw new Error("Plan not found");
  const plan = plans[0];

  if (plan.experienceTripId) {
    const allStops = await db.select().from(plannerTripPlanStops).where(eq(plannerTripPlanStops.planId, planId));
    const totalStops = includedStopIds
      ? allStops.filter((s) => includedStopIds.includes(s.id)).length
      : allStops.length;
    return {
      experienceTripId: plan.experienceTripId,
      planId: plan.id,
      tripName: `${plan.destination} Adventure`,
      totalStops,
    };
  }

  const allStops = await db.select({
    stop: plannerTripPlanStops,
    placeCity: plannerPlaces.city,
  })
    .from(plannerTripPlanStops)
    .leftJoin(plannerPlaces, eq(plannerTripPlanStops.placeId, plannerPlaces.id))
    .where(eq(plannerTripPlanStops.planId, planId));

  const allStopsFlat = allStops.map((r) => ({ ...r.stop, _placeCity: r.placeCity }));

  const stopsToInclude = includedStopIds && includedStopIds.length > 0
    ? allStopsFlat.filter((s) => includedStopIds.includes(s.id))
    : allStopsFlat.filter((s) => !s.isOptional);

  // Build cityDates from stayLocations so multi-city day-to-city mapping works in the app
  const stayLocsForDates = (plan.stayLocations as Array<{ cityName?: string; startDate?: string; endDate?: string }> | null) ?? [];
  let derivedCityDates: Record<string, { startDate: string; endDate: string }> | null = null;
  if (stayLocsForDates.length > 1) {
    const cdMap: Record<string, { startDate: string; endDate: string }> = {};
    for (const sl of stayLocsForDates) {
      if (sl.cityName && sl.startDate && sl.endDate) {
        cdMap[sl.cityName] = { startDate: sl.startDate, endDate: sl.endDate };
      }
    }
    if (Object.keys(cdMap).length > 1) derivedCityDates = cdMap;
  }

  const tripInsert: InsertTravelTrip = {
    userId,
    name: `${plan.destination} Adventure`,
    destination: plan.destination,
    country: plan.destination.split(",").pop()?.trim() || plan.destination,
    city: plan.destination.split(",")[0]?.trim(),
    continent: "Unknown",
    status: "upcoming",
    adventureContext: "travel",
    travelers: [],
    travelMonth: new Date().getMonth() + 1,
    travelYear: new Date().getFullYear(),
    stayLocations: (plan.stayLocations as InsertTravelTrip["stayLocations"]) ?? null,
    cityDates: derivedCityDates,
    tripDays: plan.tripDays || undefined,
    pace: plan.pace === "relaxed" ? "chill" : plan.pace === "busy" ? "packed" : "balanced",
  };
  const [trip] = await db.insert(travelTrips).values(tripInsert).returning();

  const sortedStops = [...stopsToInclude].sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return a.displayOrder - b.displayOrder;
  });

  // Phase 2: collect created stop IDs alongside their planner stop data
  // so the snapshot pass can enrich them after all inserts complete.
  const createdStopsForSnapshot: Array<{
    travelStopId: string;
    plannerStop: typeof sortedStops[0];
  }> = [];

  for (let i = 0; i < sortedStops.length; i++) {
    const s = sortedStops[i];
    const [insertedStop] = await db.insert(travelStops).values({
      tripId: trip.id,
      name: s.name,
      description: s.whyNow || undefined,
      stopType: s.type || "landmark",
      address: s.address || undefined,
      latitude: s.latitude || undefined,
      longitude: s.longitude || undefined,
      displayOrder: i,
      cityGroup: (s as any)._placeCity || plan.destination.split(",")[0]?.trim() || plan.destination,
      reviewRequired: s.reviewRequired ?? false,
      reviewNote: s.reviewNote ?? null,
    }).returning({ id: travelStops.id });

    // Track for snapshot enrichment (no enrichment yet — just record the pairing)
    if (insertedStop?.id) {
      createdStopsForSnapshot.push({ travelStopId: insertedStop.id, plannerStop: s });
    }
  }

  await db.update(plannerTripPlans)
    .set({ status: "started", experienceTripId: trip.id, updatedAt: new Date() })
    .where(eq(plannerTripPlans.id, planId));

  // Phase 2: snapshot enrichment pass.
  // Runs AFTER trip + stops are committed and plan is updated.
  // Each stop is enriched independently — one failure does not affect others.
  // Entire pass is wrapped so a crash here cannot break the start-adventure response.
  try {
    await runSnapshotPassForTrip(createdStopsForSnapshot);
  } catch (err) {
    // Should never reach here (runSnapshotPassForTrip catches internally),
    // but belt-and-suspenders: log and continue.
    console.error("[SnapshotBridge] Snapshot pass threw unexpectedly:", err);
  }

  // Phase 3: City group assignment — assign each stop to its nearest route city.
  // Only runs for multi-city trips (stayLocations with 2+ distinct cityNames).
  // Runs fire-and-forget so it cannot delay the start-adventure response.
  (async () => {
    try {
      const stayLocs = (plan.stayLocations as Array<{ cityName?: string }> | null) ?? [];
      const routeCities = [...new Set(stayLocs.map((sl) => sl.cityName).filter(Boolean))] as string[];
      const defaultCity = plan.destination.split(",")[0]?.trim() || plan.destination;

      if (routeCities.length < 2) return; // Single-city: current assignment is already correct

      const stopsForCalc = createdStopsForSnapshot.map(({ travelStopId, plannerStop }) => ({
        id: travelStopId,
        name: plannerStop.name,
        latitude: plannerStop.latitude,
        longitude: plannerStop.longitude,
      }));

      const countryHint = plan.destination.split(",").pop()?.trim() || "";
      const cityGroupMap = await computeCityGroupsForStops(stopsForCalc, routeCities, countryHint, defaultCity);

      for (const [stopId, cityGroup] of cityGroupMap) {
        await db.update(travelStops).set({ cityGroup }).where(eq(travelStops.id, stopId));
      }

      console.log(`[CityGroups] Assigned ${cityGroupMap.size} stops across ${routeCities.join(", ")}`);
    } catch (err) {
      console.warn("[CityGroups] City group assignment failed (non-critical):", err);
    }
  })();

  return {
    experienceTripId: trip.id,
    planId: plan.id,
    tripName: `${plan.destination} Adventure`,
    totalStops: sortedStops.length,
  };
}
