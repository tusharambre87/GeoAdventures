import type { StopQualitySignal } from "@shared/schema";

export interface UserStopTypeProfile {
  typeScores: Record<string, number>;
  cityTypeScores: Record<string, Record<string, number>>;
  bigHitTypes: Set<string>;
  excludedTypes: Set<string>;
  cityExcludedTypes: Record<string, Set<string>>;
}

export interface StopQualityScore {
  rawScore: number;
  positiveScore: number;
  negativeScore: number;
  signalCount: number;
  isAnchorProtected: boolean;
}

export const ANCHOR_STOP_TYPES = new Set([
  "museum", "fort", "temple", "landmark", "palace", "monument",
  "heritage", "attraction", "national_park", "world_heritage",
]);

const CONTEXT_SKIP_REASONS = new Set([
  "running_late", "weather_changed", "too_tired", "already_seen_enough_nearby",
]);

const STOP_QUALITY_REASONS_NEGATIVE = new Set([
  "not_worth_it", "kids_not_interested", "too_much_effort",
]);

export function computeStopQualityScore(
  signals: StopQualitySignal[],
  stopType?: string | null,
  isAnchorStop?: boolean,
): StopQualityScore {
  const anchor = isAnchorStop || (stopType ? ANCHOR_STOP_TYPES.has(stopType) : false);
  let positive = 0;
  let negative = 0;
  let hasPhoto = false;
  let hasNote = false;
  let hasPhotoAndNote = false;

  for (const sig of signals) {
    const val = sig.signalValue ?? "";
    const reason = sig.signalReason ?? "";

    switch (sig.signalType) {
      case "visited":
        positive += 1;
        break;
      case "favorite":
        if (val !== "unfavorited") positive += 3;
        else negative += 1;
        break;
      case "photo_added":
        hasPhoto = true;
        positive += 4;
        break;
      case "note_added":
        hasNote = true;
        positive += 3;
        break;
      case "photo_and_note":
        // Bonus for capturing both photo and note together.
        // Client fires this alongside photo_added + note_added, but we guard below
        // with hasPhotoAndNote so the bonus is never double-counted.
        hasPhotoAndNote = true;
        break;
      case "moment_capture_opened":
        // Passive engagement tracking only — no score contribution
        break;
      case "capture_dismissed":
        // Passive tracking only — no score contribution
        break;
      case "long_dwell":
        positive += 2;
        break;
      case "short_dwell":
        negative += 2;
        break;
      case "worth_it":
        if (val === "big_hit") positive += 5;
        else if (val === "good") positive += 2;
        else if (val === "skip_next_time") negative += 4;
        break;
      case "worth_it_followup":
        // Positive follow-up values (big_hit branch)
        if (["kids_loved_it", "hidden_gem", "would_return", "great_value",
             "beautiful_memorable", "easy_for_us", "great_use_of_time"].includes(val)) {
          positive += 1;
        // Negative follow-up values (skip_next_time branch)
        } else if (["too_crowded", "too_long", "not_kid_friendly", "expensive",
                    "too_much_effort", "kids_got_bored", "not_worth_time"].includes(val)) {
          negative += 1;
        }
        break;
      case "standout_stop":
        positive += 4;
        break;
      case "day_end_tag":
        if (["best_stop", "kids_loved_this", "glad_we_did_it"].includes(val)) positive += 2;
        else if (val === "too_much_effort") negative += 2;
        else if (val === "good_break_stop") positive += 1;
        break;
      case "kid_mode_completed":
        positive += 2;
        break;
      case "skipped": {
        const isContextSkip = CONTEXT_SKIP_REASONS.has(reason);
        const isNegativeSkip = STOP_QUALITY_REASONS_NEGATIVE.has(reason);
        if (isContextSkip) {
          // context-driven skips don't penalise the stop quality
        } else if (isNegativeSkip) {
          if (reason === "not_worth_it") negative += 5;
          else if (reason === "kids_not_interested") negative += 4;
          else if (reason === "too_much_effort") negative += 3;
          else negative += 2;
        } else {
          negative += 1;
        }
        break;
      }
      case "removed_from_trip":
        negative += 2;
        break;
    }
  }

  // Photo + note bonus: apply once whether via legacy photo_and_note signal or
  // separate photo_added + note_added signals (never both — hasPhotoAndNote guards this)
  if ((hasPhoto && hasNote) || hasPhotoAndNote) {
    positive += 2;
  }

  const anchorNegativeCap = anchor ? Math.min(negative, 5) : negative;
  const rawScore = Math.round(positive - anchorNegativeCap);

  return {
    rawScore,
    positiveScore: Math.round(positive),
    negativeScore: Math.round(negative),
    signalCount: signals.length,
    isAnchorProtected: anchor,
  };
}

/**
 * Derives a numeric score adjustment for a set of signals grouped by a stop type.
 * Positive values indicate family affinity; negative values indicate avoidance.
 */
function computeTypeAdjustment(signals: StopQualitySignal[], type: string): number {
  const score = computeStopQualityScore(signals, type);

  const bigHitCount = signals.filter(
    s => s.signalType === "worth_it" && s.signalValue === "big_hit",
  ).length;
  const notWorthItCount = signals.filter(
    s =>
      (s.signalType === "skipped" && s.signalReason === "not_worth_it") ||
      (s.signalType === "worth_it" && s.signalValue === "skip_next_time"),
  ).length;
  const favoriteCount = signals.filter(
    s => s.signalType === "favorite" && s.signalValue !== "unfavorited",
  ).length;

  let adjustment = 0;
  if (bigHitCount > 0) adjustment += Math.min(bigHitCount * 2, 4);
  if (favoriteCount > 0) adjustment += Math.min(favoriteCount, 2);
  if (notWorthItCount > 0) adjustment -= Math.min(notWorthItCount * 3, 6);
  adjustment += Math.sign(score.rawScore) * Math.min(Math.abs(score.rawScore), 3);

  return Math.max(-8, Math.min(6, adjustment));
}

/**
 * Builds a per-stop-type quality profile from a user's historical signals
 * across all their past trips. Used to personalize future trip generation by
 * boosting types the family loved and deprioritizing (or excluding) types
 * they consistently disliked.
 *
 * Signals are aggregated in two layers:
 *   - typeScores: global aggregate across all cities (fallback)
 *   - cityTypeScores: per-city aggregate keyed by city name (preferred when available)
 *
 * @param signalsWithTypes - Signals joined with stop's stopType and trip's city
 * @returns profile with typeScores, cityTypeScores, bigHitTypes, and excludedTypes
 */
export function buildUserStopTypeProfile(
  signalsWithTypes: Array<StopQualitySignal & { stopType: string | null; tripCity?: string | null }>,
): UserStopTypeProfile {
  const globalByType = new Map<string, StopQualitySignal[]>();
  const cityByTypeMap = new Map<string, Map<string, StopQualitySignal[]>>();

  for (const row of signalsWithTypes) {
    if (!row.stopType) continue;
    const type = row.stopType.toLowerCase();
    const { stopType: _st, tripCity: _tc, ...signal } = row as StopQualitySignal & { stopType: string | null; tripCity?: string | null };

    if (!globalByType.has(type)) globalByType.set(type, []);
    globalByType.get(type)!.push(signal);

    if (row.tripCity) {
      const city = row.tripCity.toLowerCase();
      if (!cityByTypeMap.has(city)) cityByTypeMap.set(city, new Map());
      const cityMap = cityByTypeMap.get(city)!;
      if (!cityMap.has(type)) cityMap.set(type, []);
      cityMap.get(type)!.push(signal);
    }
  }

  const typeScores: Record<string, number> = {};
  const bigHitTypes = new Set<string>();
  const excludedTypes = new Set<string>();

  for (const [type, signals] of globalByType) {
    typeScores[type] = computeTypeAdjustment(signals, type);

    const hasBigHit = signals.some(
      s => s.signalType === "worth_it" && s.signalValue === "big_hit",
    );
    if (hasBigHit) bigHitTypes.add(type);

    const notWorthItCount = signals.filter(
      s =>
        (s.signalType === "skipped" && s.signalReason === "not_worth_it") ||
        (s.signalType === "worth_it" && s.signalValue === "skip_next_time"),
    ).length;
    const score = computeStopQualityScore(signals, type);
    if (notWorthItCount >= 2 || score.rawScore <= -6) {
      excludedTypes.add(type);
    }
  }

  const cityTypeScores: Record<string, Record<string, number>> = {};
  const cityExcludedTypes: Record<string, Set<string>> = {};

  for (const [city, byType] of cityByTypeMap) {
    cityTypeScores[city] = {};
    for (const [type, signals] of byType) {
      cityTypeScores[city][type] = computeTypeAdjustment(signals, type);

      const cityNotWorthItCount = signals.filter(
        s =>
          (s.signalType === "skipped" && s.signalReason === "not_worth_it") ||
          (s.signalType === "worth_it" && s.signalValue === "skip_next_time"),
      ).length;
      const cityScore = computeStopQualityScore(signals, type);
      if (cityNotWorthItCount >= 2 || cityScore.rawScore <= -6) {
        if (!cityExcludedTypes[city]) cityExcludedTypes[city] = new Set();
        cityExcludedTypes[city].add(type);
      }
    }
  }

  return { typeScores, cityTypeScores, bigHitTypes, excludedTypes, cityExcludedTypes };
}
