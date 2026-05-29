/**
 * Stop Intelligence Scoring Engine — Phase 2
 *
 * Extends Phase 1 with family-specific enrichment fields across 5 new groups:
 *   - Age-band fit (age2to4Fit … mixedSiblingFit)
 *   - Parent reality (strollerEaseScore … parentEffortScore)
 *   - Kid delight (wowFactorScore … curiosityHookScore)
 *   - Day-fit (morningFitScore … anchorStopFitScore)
 *   - Family evidence (familyEvidenceScore … commonParentCautions)
 *   - Parent-facing labels (bestForAgesLabel … goodMomentLabel)
 *
 * Scoring dimensions and weights (Phase 2):
 *   Age & Kid Fit         28%
 *   Parent Practicality   22%
 *   Flow & Day Fit        20%
 *   Flexibility & Recovery 12%
 *   Delight / Wow         10%
 *   Family Evidence        8%
 *
 * Sub-factor weight redistribution: when a sub-factor's input value is undefined
 * (not available), its weight is distributed proportionally across remaining
 * defined sub-factors. Missing values are NEVER treated as zero.
 *
 * All Phase 1 helpers (weightedAverage, sf, invert, clamp) are unchanged.
 * Existing cached scores degrade gracefully — undefined new fields are excluded.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface PlacePlanningProfile {
  // ── Phase 1 — Core logistics ─────────────────────────────────────────────
  restroomConfidence?: number;
  foodConfidence?: number;
  entryFrictionScore?: number;
  exitEaseScore?: number;
  escapeEaseScore?: number;
  parkingAvailabilityScore?: number;
  shadeOrClimateRelief?: number;
  seatingAvailability?: number;
  shortenabilityScore?: number;
  skipCostScore?: number;
  queueRiskMorning?: number;
  queueRiskMidday?: number;
  queueRiskAfternoon?: number;
  lateDayRisk?: number;
  sourceConfidence?: number;
  bestArrivalWindow?: string;
  worstArrivalWindow?: string;
  rationaleShort?: string;
  socialLabel?: string;
  discoveryLabel?: string;

  // ── Phase 2 — Age-band fit ───────────────────────────────────────────────
  age2to4Fit?: number;
  age5to7Fit?: number;
  age8to12Fit?: number;
  teenFit?: number;
  mixedSiblingFit?: number;

  // ── Phase 2 — Parent reality ─────────────────────────────────────────────
  strollerEaseScore?: number;
  waitingToleranceRequiredScore?: number;
  meltdownRecoveryEaseScore?: number;
  hungerRecoveryEaseScore?: number;
  bathroomUrgencyResilienceScore?: number;
  weatherFallbackStrengthScore?: number;
  ticketValueConfidenceScore?: number;
  hassleToJoyRatioScore?: number;
  parentEffortScore?: number;

  // ── Phase 2 — Kid delight ────────────────────────────────────────────────
  wowFactorScore?: number;
  handsOnLevelScore?: number;
  freePlayLevelScore?: number;
  movementReleaseScore?: number;
  sensoryRewardScore?: number;
  curiosityHookScore?: number;

  // ── Phase 2 — Day-fit ────────────────────────────────────────────────────
  morningFitScore?: number;
  afterLunchFitScore?: number;
  lateDayFitScore?: number;
  rainyDayFitScore?: number;
  hotDayFitScore?: number;
  coldDayFitScore?: number;
  quickWinFitScore?: number;
  treatStopFitScore?: number;
  anchorStopFitScore?: number;

  // ── Phase 2 — Family evidence ────────────────────────────────────────────
  familyEvidenceScore?: number;
  ageMatchConfidenceScore?: number;
  worthTheHassleConfidenceScore?: number;
  hiddenGemFamilyScore?: number;
  supportingEvidenceCount?: number;
  commonParentPros?: string[];
  commonParentCautions?: string[];

  // ── Phase 2 — Parent-facing labels ──────────────────────────────────────
  bestForAgesLabel?: string;
  timeNeededLabel?: string;
  effortLabel?: string;
  weatherLabel?: string;
  cautionLabel?: string;
  whyWorthItLabel?: string;
  goodMomentLabel?: string;
}

export interface FamilyProfile {
  childrenAges: number[];
  pace: "relaxed" | "moderate" | "busy";
  transportMode: "walking" | "driving" | "transit";
  stopType?: string;
  effortLevel?: string;
  indoorOutdoor?: string;
  sensoryLoad?: string;
  familyAnchorType?: string;
  minAge?: number;
  durationMinutes?: number;
}

export interface ComponentScores {
  ageAndKidFitScore: number;
  parentPracticalityScore: number;
  flowAndDayFitScore: number;
  flexibilityAndRecoveryScore: number;
  delightScore: number;
  familyEvidenceConfidenceScore: number;
  finalScore: number;
  roleAssigned: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Low-level helpers (unchanged from Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

interface SubFactor {
  value: number;
  weight: number;
}

function weightedAverage(factors: Array<SubFactor | undefined>): number {
  const defined = factors.filter((f): f is SubFactor => f !== undefined && f.weight > 0);
  if (defined.length === 0) return 50;
  const totalWeight = defined.reduce((s, f) => s + f.weight, 0);
  if (totalWeight <= 0) return 50;
  const weightedSum = defined.reduce((s, f) => s + f.value * f.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function clamp(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

function sf(value: number | undefined, weight: number): SubFactor | undefined {
  if (value === undefined) return undefined;
  return { value: clamp(value), weight };
}

function invert(value: number | undefined): number | undefined {
  return value !== undefined ? 100 - value : undefined;
}

function childrenAgeRange(family: FamilyProfile): { min: number; max: number } {
  const arr = family.childrenAges;
  if (!arr || arr.length === 0) return { min: 6, max: 10 };
  return { min: Math.min(...arr), max: Math.max(...arr) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Age-band selection helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select the most relevant age-band fit score(s) from the profile given the
 * family's children ages, then blend if siblings span multiple bands.
 */
function selectAgeBandFit(profile: PlacePlanningProfile, family: FamilyProfile): number | undefined {
  const ages = family.childrenAges;
  if (!ages || ages.length === 0) return undefined;

  const getBand = (age: number): number | undefined => {
    if (age <= 4) return profile.age2to4Fit;
    if (age <= 7) return profile.age5to7Fit;
    if (age <= 12) return profile.age8to12Fit;
    return profile.teenFit;
  };

  const bandValues = ages.map(getBand).filter((v): v is number => v !== undefined);
  if (bandValues.length === 0) return undefined;
  return Math.round(bandValues.reduce((a, b) => a + b, 0) / bandValues.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring functions (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AGE & KID FIT SCORE (28%)
 *
 * Measures whether this stop is a good experiential match for the specific
 * children in the family, using age-band specificity rather than generic
 * kid-friendly signals.
 *
 * Sub-factors:
 *   selectedAgeBandFit   45wt — blended fit for the family's actual child ages
 *   mixedSiblingFit      20wt — how well the stop serves kids of mixed ages
 *   movementReleaseScore 15wt — burns energy; critical for restless kids
 *   handsOnLevelScore    10wt — touching/doing/experimenting
 *   shadeOrClimateRelief 10wt — weather protection for kids' comfort
 */
function computeAgeAndKidFitScore(profile: PlacePlanningProfile, family: FamilyProfile): number {
  const selectedAgeBandFit = selectAgeBandFit(profile, family);

  return clamp(weightedAverage([
    sf(selectedAgeBandFit, 45),
    sf(profile.mixedSiblingFit, 20),
    sf(profile.movementReleaseScore, 15),
    sf(profile.handsOnLevelScore, 10),
    sf(profile.shadeOrClimateRelief, 10),
  ]));
}

/**
 * PARENT PRACTICALITY SCORE (22%)
 *
 * Parents don't just want cool places — they want manageable places.
 * Combines amenity confidence with effort and practical recovery signals.
 *
 * Sub-factors:
 *   restroomConfidence               18wt — non-negotiable for young children
 *   foodConfidence                   14wt — on-site or nearby family food
 *   seatingAvailability              14wt — rest spots reduce fatigue
 *   strollerEaseScore                14wt — manageable with young/small kids
 *   bathroomUrgencyResilienceScore   12wt — safety if a bathroom need hits fast
 *   hungerRecoveryEaseScore          12wt — how quickly food is accessible
 *   parentEffortScore                16wt — overall manageability for parents
 */
function computeParentPracticalityScore(profile: PlacePlanningProfile, family: FamilyProfile): number {
  const isDriving = family.transportMode === "driving";
  const parkingWeight = isDriving ? 10 : 0;

  return clamp(weightedAverage([
    sf(profile.restroomConfidence, 18),
    sf(profile.foodConfidence, 14),
    sf(profile.seatingAvailability, 14),
    sf(profile.strollerEaseScore, 14),
    sf(profile.bathroomUrgencyResilienceScore, 12),
    sf(profile.hungerRecoveryEaseScore, 12),
    sf(profile.parentEffortScore, 16),
    sf(profile.parkingAvailabilityScore, parkingWeight),
  ]));
}

/**
 * FLOW & DAY FIT SCORE (20%)
 *
 * Measures how smoothly this stop integrates into the day — entry, timing,
 * queue pressure, weather fit, and role alignment.
 *
 * Sub-factors:
 *   entryFrictionScore (inverted)   18wt — ease of getting in
 *   exitEaseScore                   14wt — leaving when ready
 *   queueFitForTimeOfDay (inverted)  16wt — queue pressure at current window
 *   currentMomentFit                16wt — morning / after-lunch / late-day fit
 *   weatherFallbackStrengthScore    12wt — resilience in bad/hot/cold weather
 *   lateDayRisk (inverted)          12wt — safe for tired/late families
 *   paceCompatibility               12wt — matches family's day rhythm
 */
function computeFlowAndDayFitScore(profile: PlacePlanningProfile, family: FamilyProfile): number {
  const queueValues = [profile.queueRiskMorning, profile.queueRiskMidday, profile.queueRiskAfternoon]
    .filter((v): v is number => v !== undefined);
  const avgQueueRisk = queueValues.length > 0
    ? queueValues.reduce((a, b) => a + b, 0) / queueValues.length
    : undefined;

  const pace = family.pace;
  const anchor = family.familyAnchorType;
  const paceRaw = (anchor === "meal" || anchor === "reset") ? 90
    : (pace === "relaxed" && anchor === "anchor") ? 55
    : (pace === "moderate" && anchor === "anchor") ? 70
    : (pace === "busy" && anchor === "anchor") ? 82
    : (pace === "relaxed") ? 75
    : (pace === "busy") ? 65
    : 70;

  const currentMomentFit = profile.morningFitScore ?? profile.afterLunchFitScore ?? profile.lateDayFitScore;

  return clamp(weightedAverage([
    sf(invert(profile.entryFrictionScore), 18),
    sf(profile.exitEaseScore, 14),
    sf(invert(avgQueueRisk), 16),
    sf(currentMomentFit, 16),
    sf(profile.weatherFallbackStrengthScore, 12),
    sf(invert(profile.lateDayRisk), 12),
    sf(paceRaw, 12),
  ]));
}

/**
 * FLEXIBILITY & RECOVERY SCORE (12%)
 *
 * How adaptable the stop is when plans or children change mid-day.
 * Extends Phase 1 flexibility with meltdown and weather recovery signals.
 *
 * Sub-factors:
 *   shortenabilityScore          28wt — can do a quick version
 *   escapeEaseScore              22wt — exit early without hassle
 *   meltdownRecoveryEaseScore    20wt — how easily things can recover
 *   weatherFallbackStrengthScore 15wt — still works in bad weather
 *   skipCostScore (inverted)     15wt — low regret = high flexibility
 */
function computeFlexibilityAndRecoveryScore(profile: PlacePlanningProfile, _family: FamilyProfile): number {
  return clamp(weightedAverage([
    sf(profile.shortenabilityScore, 28),
    sf(profile.escapeEaseScore, 22),
    sf(profile.meltdownRecoveryEaseScore, 20),
    sf(profile.weatherFallbackStrengthScore, 15),
    sf(invert(profile.skipCostScore), 15),
  ]));
}

/**
 * DELIGHT / WOW SCORE (10%)
 *
 * A practical stop with no delight still feels flat. This dimension measures
 * the child-facing experiential payoff of the stop.
 *
 * Sub-factors:
 *   wowFactorScore      25wt — big visual or emotional punch
 *   sensoryRewardScore  20wt — vivid things kids can see/hear/feel
 *   curiosityHookScore  20wt — sparks "look at that!"
 *   handsOnLevelScore   20wt — touching, doing, climbing, experimenting
 *   freePlayLevelScore  15wt — room to roam/play without direction
 */
function computeDelightScore(profile: PlacePlanningProfile, _family: FamilyProfile): number {
  return clamp(weightedAverage([
    sf(profile.wowFactorScore, 25),
    sf(profile.sensoryRewardScore, 20),
    sf(profile.curiosityHookScore, 20),
    sf(profile.handsOnLevelScore, 20),
    sf(profile.freePlayLevelScore, 15),
  ]));
}

/**
 * FAMILY EVIDENCE CONFIDENCE SCORE (8%)
 *
 * Replaces generic social proof with family-specific evidence signals.
 * "Lots of people like it" → "Families with kids this age found it worth doing."
 *
 * Sub-factors:
 *   familyEvidenceScore          35wt — overall family evidence quality
 *   ageMatchConfidenceScore      25wt — evidence matches the family's ages
 *   worthTheHassleConfidenceScore 25wt — worth the effort for this family
 *   hiddenGemFamilyScore         15wt — unexpectedly great for families
 */
function computeFamilyEvidenceConfidenceScore(profile: PlacePlanningProfile, _family: FamilyProfile): number {
  return clamp(weightedAverage([
    sf(profile.familyEvidenceScore, 35),
    sf(profile.ageMatchConfidenceScore, 25),
    sf(profile.worthTheHassleConfidenceScore, 25),
    sf(profile.hiddenGemFamilyScore, 15),
  ]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Role assignment (Phase 2 — uses new profile fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ROLE ASSIGNMENT TABLE
 *
 * Roles evaluated in priority order. First matching condition wins.
 *
 * Role        | Primary condition (Phase 2)
 * ------------|------------------------------------------------------------
 * Meal        | familyAnchorType === "meal"
 * Reset       | familyAnchorType === "reset"
 * Anchor      | anchorStopFitScore ≥ 70 AND wowFactorScore ≥ 65
 *             | OR (ageAndKidFit ≥ 78 AND flowAndDayFit ≥ 72)
 * Support     | parentPracticality ≥ 75 AND flowAndDayFit ≥ 65
 * Treat       | treatStopFitScore ≥ 70 AND sensoryRewardScore ≥ 60
 *             | OR (delight ≥ 72 AND familyEvidence ≥ 60)
 * Wind-down   | lateDayFitScore ≥ 65 AND meltdownRecoveryEaseScore ≥ 60
 *             | OR (flowAndDayFit ≥ 65 AND flexibility ≥ 65 AND ageAndKidFit < 70)
 * Quick win   | quickWinFitScore ≥ 70 OR shortenabilityScore ≥ 80 OR durationMinutes ≤ 30
 * Backup      | flexibility ≥ 60 AND parentPracticality < 60
 * [fallback]  | derived from familyAnchorType
 */
function deriveRole(
  scores: Omit<ComponentScores, "finalScore" | "roleAssigned">,
  profile: PlacePlanningProfile,
  family: FamilyProfile
): string {
  const {
    ageAndKidFitScore,
    parentPracticalityScore,
    flowAndDayFitScore,
    flexibilityAndRecoveryScore,
    delightScore,
    familyEvidenceConfidenceScore,
  } = scores;
  const anchor = family.familyAnchorType;
  const duration = family.durationMinutes ?? 60;

  if (anchor === "meal") return "Meal";
  if (anchor === "reset") return "Reset";

  const anchorByNewFields =
    profile.anchorStopFitScore !== undefined && profile.anchorStopFitScore >= 70 &&
    (
      (profile.wowFactorScore !== undefined && profile.wowFactorScore >= 65) ||
      (profile.ticketValueConfidenceScore !== undefined && profile.ticketValueConfidenceScore >= 70)
    );
  const anchorByScore = ageAndKidFitScore >= 78 && flowAndDayFitScore >= 72;
  if (anchorByNewFields || anchorByScore) return "Anchor";

  if (parentPracticalityScore >= 75 && flowAndDayFitScore >= 65) return "Support";

  const treatByNewFields =
    (profile.treatStopFitScore !== undefined && profile.treatStopFitScore >= 70 &&
      profile.sensoryRewardScore !== undefined && profile.sensoryRewardScore >= 60);
  const treatByScore = delightScore >= 72 && familyEvidenceConfidenceScore >= 60;
  if (treatByNewFields || treatByScore) return "Treat";

  const windownByNewFields =
    (profile.lateDayFitScore !== undefined && profile.lateDayFitScore >= 65 &&
      profile.meltdownRecoveryEaseScore !== undefined && profile.meltdownRecoveryEaseScore >= 60);
  const windownByScore =
    flowAndDayFitScore >= 65 && flexibilityAndRecoveryScore >= 65 && ageAndKidFitScore < 70;
  if (windownByNewFields || windownByScore) return "Wind-down";

  const quickWinByNewFields =
    (profile.quickWinFitScore !== undefined && profile.quickWinFitScore >= 70) ||
    (profile.shortenabilityScore !== undefined && profile.shortenabilityScore >= 80);
  if (quickWinByNewFields || duration <= 30) return "Quick win";

  if (flexibilityAndRecoveryScore >= 60 && parentPracticalityScore < 60) return "Backup";

  const anchorFallback: Record<string, string> = {
    anchor: "Anchor",
    support: "Support",
    filler: "Backup",
    meal: "Meal",
    reset: "Reset",
  };
  return anchorFallback[anchor ?? "support"] ?? "Support";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function computeScores(profile: PlacePlanningProfile, family: FamilyProfile): ComponentScores {
  const ageAndKidFitScore = computeAgeAndKidFitScore(profile, family);
  const parentPracticalityScore = computeParentPracticalityScore(profile, family);
  const flowAndDayFitScore = computeFlowAndDayFitScore(profile, family);
  const flexibilityAndRecoveryScore = computeFlexibilityAndRecoveryScore(profile, family);
  const delightScore = computeDelightScore(profile, family);
  const familyEvidenceConfidenceScore = computeFamilyEvidenceConfidenceScore(profile, family);

  const finalScore = clamp(
    ageAndKidFitScore * 0.28 +
    parentPracticalityScore * 0.22 +
    flowAndDayFitScore * 0.20 +
    flexibilityAndRecoveryScore * 0.12 +
    delightScore * 0.10 +
    familyEvidenceConfidenceScore * 0.08
  );

  const roleAssigned = deriveRole(
    {
      ageAndKidFitScore,
      parentPracticalityScore,
      flowAndDayFitScore,
      flexibilityAndRecoveryScore,
      delightScore,
      familyEvidenceConfidenceScore,
    },
    profile,
    family
  );

  return {
    ageAndKidFitScore,
    parentPracticalityScore,
    flowAndDayFitScore,
    flexibilityAndRecoveryScore,
    delightScore,
    familyEvidenceConfidenceScore,
    finalScore,
    roleAssigned,
  };
}
