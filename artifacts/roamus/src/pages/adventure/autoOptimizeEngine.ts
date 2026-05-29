// ──────────────────────────────────────────────────────────────────────────────
// Live Adjustment Engine — V1
// ──────────────────────────────────────────────────────────────────────────────

export type TriggerType =
  | "running_late"
  | "kids_tired"
  | "need_a_break"
  | "need_food"
  | "want_more_fun"
  | "shorten_this_stop"
  | "too_much_planned"
  | "skip_stop"
  | "behind_20min"
  | "meal_window_missed"
  | "venue_closing"
  | "walking_overload";

export type AdjustmentActionType =
  | "shorten_current"
  | "skip_next_low_value"
  | "swap_next"
  | "insert_support"
  | "reorder_remaining"
  | "collapse_day";

export type ChangeKind = "reorder" | "insert_break" | "remove" | "shorten" | "replace" | "insert_delight";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ChangeMade {
  stopId: string;
  stopName: string;
  changeKind: ChangeKind;
  details: string;
}

export interface AdjustmentResult {
  adjustmentType: AdjustmentActionType;
  title: string;
  explanation: string;
  changesMade: ChangeMade[];
  updatedFlow: StopLike[];
  confidenceLevel: ConfidenceLevel;
  requiresConfirmation: boolean;
  alternatives?: { label: string; description: string }[];
  safetyBlocked?: boolean;
  safetyReason?: string;
}

export interface StopLike {
  id: string;
  name: string;
  stopType?: string | null;
  isVisited?: boolean | null;
  displayOrder?: number | null;
  booked?: boolean | null;
  familyAnchorType?: string | null;
  kidFitScore?: number | null;
  flowFitScore?: number | null;
  practicalityScore?: number | null;
  isMealStop?: boolean | null;
  durationMinutes?: number | null;
  shortenTip?: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Legacy ChangeProposal format — kept for backward compat while migrating UI
// ──────────────────────────────────────────────────────────────────────────────
export type ChangeSize = "small" | "medium" | "big";

export interface AffectedStop {
  stopId: string;
  stopName: string;
  changeKind: ChangeKind;
  details: string;
  requiresConfirmation?: boolean;
}

export interface ChangeProposal {
  size: ChangeSize;
  summary: string;
  affected: AffectedStop[];
  safetyBlocked: boolean;
  safetyReason?: string;
  result?: AdjustmentResult;
}

// ──────────────────────────────────────────────────────────────────────────────
// Confirmation rules (spec):
//   AUTO-APPLY (no confirmation needed):
//     - shorten current stop duration
//     - move a planned existing stop (meal) earlier in the list — pure reorder, no new stop
//   ALWAYS CONFIRM:
//     - swapping a stop (swap_next)
//     - dropping/removing a stop (skip_next_low_value, collapse_day)
//     - inserting a NEW stop (insert_support with new __break__/__food__/__delight__)
//     - reordering remaining stops (reorder_remaining)
// ──────────────────────────────────────────────────────────────────────────────

function requiresConfirmationForAction(
  adjustmentType: AdjustmentActionType,
  changesMade: ChangeMade[]
): boolean {
  if (adjustmentType === "collapse_day") return true;
  if (adjustmentType === "swap_next") return true;
  if (adjustmentType === "reorder_remaining") return true;
  if (adjustmentType === "skip_next_low_value") return true;
  if (changesMade.some(c => c.changeKind === "remove")) return true;
  if (changesMade.some(c => c.changeKind === "insert_delight")) return true;

  if (adjustmentType === "insert_support") {
    const hasNewVirtualStop = changesMade.some(c =>
      (c.changeKind === "insert_break") &&
      (c.stopId === "__break__" || c.stopId === "__food__" || c.stopId === "__delight__")
    );
    if (hasNewVirtualStop) return true;
    // Pure reorder of existing meal stop = auto-apply
    return false;
  }

  // shorten_current = auto-apply
  if (adjustmentType === "shorten_current") return false;

  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Stop sacrificeability ranking
// ──────────────────────────────────────────────────────────────────────────────

function isHardProtected(stop: StopLike): boolean {
  if (stop.booked) return true;
  if (stop.familyAnchorType === "anchor") return true;
  if (stop.familyAnchorType === "meal" || stop.isMealStop) return true;
  return false;
}

/**
 * Sacrificeability score (higher = safer to drop/modify).
 * Protected stops return 0 and are excluded from candidate selection.
 */
function sacrificeabilityScore(stop: StopLike): number {
  if (isHardProtected(stop)) return 0;
  if (stop.familyAnchorType === "reset") return 8;

  let score = 50;
  if (stop.familyAnchorType === "filler") score = 85;
  else if (stop.familyAnchorType === "support") score = 60;

  const kf = stop.kidFitScore ?? null;
  if (kf !== null) {
    if (kf >= 80) score -= 30;
    else if (kf >= 65) score -= 15;
    else if (kf < 40) score += 10;
  }

  const ff = stop.flowFitScore ?? null;
  if (ff !== null) {
    if (ff >= 80) score -= 10;
    else if (ff >= 65) score -= 5;
  }

  const pf = stop.practicalityScore ?? null;
  if (pf !== null) {
    if (pf >= 80) score -= 10;
    else if (pf >= 65) score -= 5;
  }

  const type = stop.stopType ?? "";
  if (["museum", "aquarium", "zoo", "theme_park"].includes(type)) score -= 20;
  if (["viewpoint", "market", "bridge"].includes(type)) score += 15;

  return Math.max(0, Math.min(100, score));
}

function rankBySacrificeability(stops: StopLike[], anchorStopId?: string): StopLike[] {
  return stops
    .filter(s => !s.isVisited && !isHardProtected(s) && s.id !== anchorStopId)
    .sort((a, b) => sacrificeabilityScore(b) - sacrificeabilityScore(a));
}

// ──────────────────────────────────────────────────────────────────────────────
// 6-Dimension Adjustment Scoring Model
// ──────────────────────────────────────────────────────────────────────────────

interface AdjustmentScore {
  reliefValue: number;           // 30%
  dayPreservation: number;       // 25%
  parentStressReduction: number; // 20%
  kidFitAfterChange: number;     // 15%
  confidence: number;            // 10%
  travelPenalty: number;         // negative modifier
}

function scoreAdjustment(s: AdjustmentScore): number {
  return (
    s.reliefValue * 0.30 +
    s.dayPreservation * 0.25 +
    s.parentStressReduction * 0.20 +
    s.kidFitAfterChange * 0.15 +
    s.confidence * 0.10 -
    s.travelPenalty * 0.10
  );
}

// Score for dropping a specific stop given the trigger
function scoreDropCandidate(stop: StopLike, trigger: TriggerType): AdjustmentScore {
  const kf = stop.kidFitScore ?? 50;
  const ff = stop.flowFitScore ?? 50;
  const sacrificeable = sacrificeabilityScore(stop);

  const relief = (trigger === "running_late" || trigger === "behind_20min")
    ? Math.min(100, sacrificeable + 20)
    : (trigger === "kids_tired" || trigger === "too_much_planned")
    ? sacrificeable
    : 60;

  const dayPreservation = 100 - (kf * 0.5 + ff * 0.2);
  const parentStress = sacrificeable > 60 ? 80 : 50;
  const kidFitAfter = 100 - kf;
  const confidence = sacrificeable > 70 ? 85 : sacrificeable > 40 ? 65 : 40;
  const travelPenalty = 0;

  return { reliefValue: relief, dayPreservation, parentStressReduction: parentStress, kidFitAfterChange: kidFitAfter, confidence, travelPenalty };
}

// Score for a specific action type (used for action selection per trigger)
function scoreActionCandidate(
  action: AdjustmentActionType,
  trigger: TriggerType,
  unvisited: StopLike[]
): number {
  const currentStop = unvisited[0];
  const hasMeal = unvisited.some(s => s.isMealStop || s.familyAnchorType === "meal");
  const hasLowEffort = unvisited.some((_, i) => i > 0 && ["park", "garden", "viewpoint", "beach", "nature"].includes(unvisited[i]?.stopType ?? ""));
  const hasShortenable = currentStop && (currentStop.durationMinutes ?? 75) > 60;
  const candidates = rankBySacrificeability(unvisited);
  const hasSacrificeable = candidates.length > 0;

  switch (trigger) {
    case "running_late":
    case "behind_20min": {
      const s: AdjustmentScore = {
        reliefValue: action === "shorten_current" && hasShortenable ? 80 : action === "skip_next_low_value" && hasSacrificeable ? 70 : action === "reorder_remaining" ? 50 : 10,
        dayPreservation: action === "shorten_current" ? 90 : action === "reorder_remaining" ? 75 : 40,
        parentStressReduction: action === "shorten_current" ? 75 : 60,
        kidFitAfterChange: action === "shorten_current" ? 70 : action === "reorder_remaining" ? 65 : 40,
        confidence: action === "shorten_current" && hasShortenable ? 90 : 60,
        travelPenalty: 0,
      };
      return scoreAdjustment(s);
    }
    case "kids_tired": {
      const s: AdjustmentScore = {
        reliefValue: action === "insert_support" && hasMeal ? 85 : action === "insert_support" ? 75 : action === "swap_next" && hasLowEffort ? 65 : action === "collapse_day" ? 55 : 30,
        dayPreservation: action === "insert_support" ? 90 : action === "swap_next" ? 80 : action === "collapse_day" ? 30 : 50,
        parentStressReduction: action === "insert_support" ? 85 : action === "swap_next" ? 70 : action === "collapse_day" ? 60 : 50,
        kidFitAfterChange: action === "insert_support" ? 90 : action === "swap_next" ? 70 : 50,
        confidence: action === "insert_support" ? 90 : 65,
        travelPenalty: 0,
      };
      return scoreAdjustment(s);
    }
    case "need_a_break": {
      const s: AdjustmentScore = {
        reliefValue: action === "shorten_current" && hasShortenable ? 70 : action === "insert_support" ? 80 : action === "swap_next" && hasLowEffort ? 65 : 30,
        dayPreservation: action === "shorten_current" ? 90 : action === "insert_support" ? 85 : action === "swap_next" ? 80 : 50,
        parentStressReduction: 80,
        kidFitAfterChange: 75,
        confidence: action === "shorten_current" && hasShortenable ? 90 : 70,
        travelPenalty: 0,
      };
      return scoreAdjustment(s);
    }
    default:
      return 50;
  }
}

function pickBestDropCandidate(candidates: StopLike[], trigger: TriggerType): StopLike | null {
  if (candidates.length === 0) return null;
  return candidates
    .map(stop => ({ stop, score: scoreAdjustment(scoreDropCandidate(stop, trigger)) }))
    .sort((a, b) => b.score - a.score)[0]?.stop ?? null;
}

// Pick best action type for a trigger using the 6-dimension scoring model
function pickBestAction(
  trigger: TriggerType,
  candidates: AdjustmentActionType[],
  unvisited: StopLike[]
): AdjustmentActionType {
  return candidates
    .map(action => ({ action, score: scoreActionCandidate(action, trigger, unvisited) }))
    .sort((a, b) => b.score - a.score)[0]?.action ?? candidates[0];
}

// ──────────────────────────────────────────────────────────────────────────────
// updatedFlow projection helpers
// ──────────────────────────────────────────────────────────────────────────────

function projectFlowAfterRemove(stops: StopLike[], removedIds: Set<string>): StopLike[] {
  return stops.filter(s => !removedIds.has(s.id));
}

function projectFlowAfterReorder(stops: StopLike[], idxA: number, idxB: number): StopLike[] {
  const copy = [...stops];
  const tmp = copy[idxA];
  copy[idxA] = copy[idxB];
  copy[idxB] = tmp;
  return copy;
}

function projectFlowAfterShorten(stops: StopLike[], stopId: string, newDuration: number): StopLike[] {
  return stops.map(s => s.id === stopId ? { ...s, durationMinutes: newDuration } : s);
}

function projectFlowPullMealEarlier(stops: StopLike[], mealStopId: string, targetIndex: number): StopLike[] {
  const copy = stops.filter(s => !s.isVisited);
  const mealIdx = copy.findIndex(s => s.id === mealStopId);
  if (mealIdx < 0 || mealIdx <= targetIndex) return copy;
  const [meal] = copy.splice(mealIdx, 1);
  copy.splice(targetIndex, 0, meal);
  return copy;
}

// ──────────────────────────────────────────────────────────────────────────────
// Trigger handlers
// ──────────────────────────────────────────────────────────────────────────────

// ── running_late / behind_20min ──
// Decision order (spec):
//   1. Shorten current stop (auto-apply if > 60 min)
//   2. Skip next optional/low-score stop (confirm)
//   3. Reorder for big travel savings (confirm)
function handleRunningLate(stops: StopLike[], anchorStopId?: string): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  if (unvisited.length === 0) {
    return {
      adjustmentType: "shorten_current",
      title: "All stops visited",
      explanation: "All stops are already visited — nothing to adjust.",
      changesMade: [],
      updatedFlow: stops,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  const currentStop = unvisited[0];
  const candidates = rankBySacrificeability(stops, anchorStopId);

  // Use scoring model to pick best action
  const hasLongCurrent = (currentStop.durationMinutes ?? 75) > 60;
  const actionCandidates: AdjustmentActionType[] = [];
  if (hasLongCurrent) actionCandidates.push("shorten_current");
  if (candidates.length > 0) actionCandidates.push("skip_next_low_value");
  if (unvisited.length >= 3) actionCandidates.push("reorder_remaining");
  if (actionCandidates.length === 0) actionCandidates.push("shorten_current");

  const bestAction = pickBestAction("running_late", actionCandidates, unvisited);

  // 1. Shorten current
  if (bestAction === "shorten_current" && hasLongCurrent) {
    const orig = currentStop.durationMinutes ?? 90;
    const newDuration = Math.max(25, Math.round(orig * 0.6));
    const saved = orig - newDuration;
    const changesMade: ChangeMade[] = [{
      stopId: currentStop.id,
      stopName: currentStop.name,
      changeKind: "shorten",
      details: `Reduced from ${orig} min to ${newDuration} min — saves ~${saved} min`,
    }];
    return {
      adjustmentType: "shorten_current",
      title: "Shorten your current stop",
      explanation: `Trimming "${currentStop.name}" by ${saved} minutes gets you back on track without dropping anything.`,
      changesMade,
      updatedFlow: projectFlowAfterShorten(unvisited, currentStop.id, newDuration),
      confidenceLevel: "high",
      requiresConfirmation: false,
      alternatives: candidates.length > 0 ? [
        { label: "Skip a later stop instead", description: "Keep full time here and drop a lower-priority stop" },
      ] : undefined,
    };
  }

  // 2. Skip next low-value stop
  if (bestAction === "skip_next_low_value") {
    const bestDrop = pickBestDropCandidate(candidates, "running_late");
    if (bestDrop) {
      const changesMade: ChangeMade[] = [{
        stopId: bestDrop.id,
        stopName: bestDrop.name,
        changeKind: "remove",
        details: "Removed to recover time",
      }];
      const altCandidate = candidates.find(c => c.id !== bestDrop.id);
      return {
        adjustmentType: "skip_next_low_value",
        title: "Skip a lower-priority stop",
        explanation: `Removing "${bestDrop.name}" gives you breathing room to enjoy the rest of the day without rushing.`,
        changesMade,
        updatedFlow: projectFlowAfterRemove(unvisited, new Set([bestDrop.id])),
        confidenceLevel: "medium",
        requiresConfirmation: true,
        alternatives: altCandidate ? [
          { label: `Drop "${altCandidate.name}" instead`, description: "Another lower-priority option" },
        ] : undefined,
      };
    }
  }

  // 3. Reorder for travel savings
  if (unvisited.length >= 3) {
    const [a, b] = unvisited.slice(1, 3);
    const changesMade: ChangeMade[] = [
      { stopId: a.id, stopName: a.name, changeKind: "reorder", details: "Reordered to reduce travel" },
      { stopId: b.id, stopName: b.name, changeKind: "reorder", details: "Reordered to reduce travel" },
    ];
    return {
      adjustmentType: "reorder_remaining",
      title: "Reorder stops to save travel time",
      explanation: "Rearranging your remaining stops to minimize travel will help you catch up.",
      changesMade,
      updatedFlow: projectFlowAfterReorder(unvisited, unvisited.indexOf(a), unvisited.indexOf(b)),
      confidenceLevel: "low",
      requiresConfirmation: true,
    };
  }

  // Fallback: shorten current even if short
  if (currentStop) {
    const orig = currentStop.durationMinutes ?? 60;
    const newDuration = Math.max(20, Math.round(orig * 0.65));
    const changesMade: ChangeMade[] = [{
      stopId: currentStop.id,
      stopName: currentStop.name,
      changeKind: "shorten",
      details: `Tightened to ${newDuration} min — focus on the must-sees`,
    }];
    return {
      adjustmentType: "shorten_current",
      title: "Move faster through your current stop",
      explanation: "All remaining stops are protected. Moving quickly through the highlights gets you back on track.",
      changesMade,
      updatedFlow: projectFlowAfterShorten(unvisited, currentStop.id, newDuration),
      confidenceLevel: "medium",
      requiresConfirmation: false,
    };
  }

  return {
    adjustmentType: "shorten_current",
    title: "Keep going",
    explanation: "Stay focused — you've got this.",
    changesMade: [],
    updatedFlow: unvisited,
    confidenceLevel: "high",
    requiresConfirmation: false,
  };
}

// ── kids_tired ──
// Decision order (spec):
//   1. Insert reset break (first response — immediately gives relief)
//   2. Pull meal earlier (if meal is > 1 stop away — food = big reset)
//   3. Swap high-effort next stop for lower-effort (confirm)
//   4. Collapse rest of day (last resort when all above unavailable or day very compromised)
function handleKidsTired(stops: StopLike[], anchorStopId?: string, sessionTiredCount?: number): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  if (unvisited.length === 0) {
    return {
      adjustmentType: "insert_support",
      title: "Day complete",
      explanation: "All stops visited — wrap up and celebrate the day.",
      changesMade: [],
      updatedFlow: stops,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  const mealStop = unvisited.find(s => s.familyAnchorType === "meal" || s.isMealStop);
  const mealIndex = mealStop ? unvisited.indexOf(mealStop) : -1;
  const nextStop = unvisited[1];
  const isNextHighEffort = nextStop && ["museum", "aquarium", "zoo", "theme_park", "activity"].includes(nextStop.stopType ?? "");
  const lowEffortLater = unvisited.find((s, i) => i > 1 && ["park", "garden", "viewpoint", "beach", "nature"].includes(s.stopType ?? ""));
  const compromised = (sessionTiredCount ?? 0) >= 2;
  const candidates = rankBySacrificeability(stops, anchorStopId);

  // Build scored action candidates
  const actionCandidates: AdjustmentActionType[] = ["insert_support"];
  if (mealStop && mealIndex > 1) actionCandidates.push("insert_support");
  if (isNextHighEffort && lowEffortLater) actionCandidates.push("swap_next");
  if (compromised && candidates.length > 0) actionCandidates.push("collapse_day");

  const uniqueActions = actionCandidates.filter((a, i, arr) => arr.indexOf(a) === i);
  const bestAction = pickBestAction("kids_tired", uniqueActions, unvisited);

  // Option 1: Insert reset break (default — immediate relief)
  // Use this when meal is not available or scoring prefers it
  if (bestAction === "insert_support" && !(mealStop && mealIndex > 1)) {
    const changesMade: ChangeMade[] = [
      { stopId: "__break__", stopName: "Rest Break", changeKind: "insert_break", details: "15–20 min rest break before your next stop" },
    ];
    return {
      adjustmentType: "insert_support",
      title: "Add a rest break",
      explanation: "A 15–20 minute break gives the kids time to recharge before carrying on.",
      changesMade,
      updatedFlow: unvisited,
      confidenceLevel: "high",
      requiresConfirmation: requiresConfirmationForAction("insert_support", changesMade),
      alternatives: mealStop ? [
        { label: "Pull your meal stop earlier", description: "Move your planned meal up for a proper sit-down reset" },
      ] : undefined,
    };
  }

  // Option 2: Pull meal earlier (if meal is > 1 stop away — auto-apply)
  if (mealStop && mealIndex > 1) {
    const changesMade: ChangeMade[] = [{
      stopId: mealStop.id,
      stopName: mealStop.name,
      changeKind: "reorder",
      details: "Pulled earlier — food is the best reset for tired kids",
    }];
    return {
      adjustmentType: "insert_support",
      title: "Pull lunch earlier",
      explanation: "Moving your meal stop up now gives the kids a proper sit-down break and energy boost.",
      changesMade,
      updatedFlow: projectFlowPullMealEarlier(stops, mealStop.id, 1),
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  // Option 3: Swap high-effort next stop for lower-effort (confirm)
  if (bestAction === "swap_next" && isNextHighEffort && lowEffortLater && nextStop) {
    const nextIdx = unvisited.indexOf(nextStop);
    const lowIdx = unvisited.indexOf(lowEffortLater);
    const changesMade: ChangeMade[] = [
      { stopId: nextStop.id, stopName: nextStop.name, changeKind: "reorder", details: "High-effort stop moved later" },
      { stopId: lowEffortLater.id, stopName: lowEffortLater.name, changeKind: "reorder", details: "Gentler stop moved earlier" },
    ];
    return {
      adjustmentType: "swap_next",
      title: "Swap to a gentler stop",
      explanation: `Visit "${lowEffortLater.name}" first for a lower-energy experience instead of "${nextStop.name}".`,
      changesMade,
      updatedFlow: projectFlowAfterReorder(unvisited, nextIdx, lowIdx),
      confidenceLevel: "medium",
      requiresConfirmation: true,
      alternatives: [
        { label: "Just add a rest break", description: "Insert a 15-min rest and keep the order" },
      ],
    };
  }

  // Option 4: Collapse rest of day — last resort (confirm)
  if (compromised && candidates.length > 0) {
    const toDrop = candidates.slice(0, Math.min(2, Math.max(1, candidates.length - 1)));
    const changesMade: ChangeMade[] = toDrop.map(s => ({
      stopId: s.id,
      stopName: s.name,
      changeKind: "remove" as ChangeKind,
      details: "Removed — wrapping up for an easy finish",
    }));
    return {
      adjustmentType: "collapse_day",
      title: "Wrap up early",
      explanation: "The kids have had a full day. Heading straight to the finish keeps everyone happy.",
      changesMade,
      updatedFlow: projectFlowAfterRemove(unvisited, new Set(toDrop.map(s => s.id))),
      confidenceLevel: "medium",
      requiresConfirmation: true,
      alternatives: [
        { label: "Just add a break", description: "Insert a rest break and keep all stops" },
      ],
    };
  }

  // Fallback: insert break
  const changesMade: ChangeMade[] = [
    { stopId: "__break__", stopName: "Rest Break", changeKind: "insert_break", details: "15–20 min rest break added" },
  ];
  return {
    adjustmentType: "insert_support",
    title: "Rest break added",
    explanation: "A short break before your next stop will help everyone recharge.",
    changesMade,
    updatedFlow: unvisited,
    confidenceLevel: "high",
    requiresConfirmation: requiresConfirmationForAction("insert_support", changesMade),
  };
}

// ── need_food ──
// Decision order (spec):
//   1. If planned meal stop is next or 1 stop away — pull it to now (auto-apply)
//   2. If planned meal stop is 2+ stops away — pull it forward (auto-apply)
//   3. No planned meal: delay the next non-meal stop and insert food stop (confirm)
function handleNeedFood(stops: StopLike[]): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);

  const mealStop = unvisited.find(s => s.familyAnchorType === "meal" || s.isMealStop);
  const mealIndex = mealStop ? unvisited.indexOf(mealStop) : -1;

  // Option 1/2: Pull planned meal earlier (auto-apply — just reorder, no new stop)
  if (mealStop && mealIndex >= 1) {
    const changesMade: ChangeMade[] = [{
      stopId: mealStop.id,
      stopName: mealStop.name,
      changeKind: "reorder",
      details: mealIndex === 1
        ? "Already next — head there now"
        : "Pulled forward — eat before your energy runs out",
    }];
    return {
      adjustmentType: "insert_support",
      title: mealIndex === 1 ? "Head to your meal stop now" : "Pull your meal stop forward",
      explanation: mealIndex === 1
        ? `"${mealStop.name}" is already coming up — head there now to eat.`
        : `Moving "${mealStop.name}" up so you can eat before the next stop.`,
      changesMade,
      updatedFlow: projectFlowPullMealEarlier(stops, mealStop.id, 0),
      confidenceLevel: "high",
      requiresConfirmation: requiresConfirmationForAction("insert_support", changesMade),
    };
  }

  // Option 0: Meal stop is already first
  if (mealStop && mealIndex === 0) {
    return {
      adjustmentType: "insert_support",
      title: "Your meal stop is right here",
      explanation: `"${mealStop.name}" is your current stop. Eat now before heading on.`,
      changesMade: [],
      updatedFlow: unvisited,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  // Option 3: No planned meal stop — delay next stop and insert a food stop (confirm)
  const nextStop = unvisited[0];
  const changesMade: ChangeMade[] = [
    { stopId: "__food__", stopName: "Food Stop", changeKind: "insert_break", details: "Find a kid-friendly restaurant or snack stop nearby" },
  ];
  if (nextStop) {
    changesMade.push({
      stopId: nextStop.id,
      stopName: nextStop.name,
      changeKind: "reorder",
      details: "Delayed — eating first before continuing",
    });
  }
  return {
    adjustmentType: "insert_support",
    title: "Food stop added",
    explanation: "Eating now keeps the energy up for the rest of the day. Find a nearby option before heading on.",
    changesMade,
    updatedFlow: unvisited,
    confidenceLevel: "high",
    requiresConfirmation: requiresConfirmationForAction("insert_support", changesMade),
  };
}

// ── need_a_break ──
// Decision order (spec):
//   1. Shorten current stop if it's long (auto-apply — gives immediate relief)
//   2. Swap to lower-sensory stop next (confirm)
//   3. Insert rest break (confirm)
function handleNeedABreak(stops: StopLike[]): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  const currentStop = unvisited[0];

  const isHighSensory = currentStop && ["museum", "market", "activity", "zoo", "aquarium", "theme_park"].includes(currentStop.stopType ?? "");
  const nextStop = unvisited[1];
  const isNextHighSensory = nextStop && ["museum", "market", "activity", "zoo", "aquarium", "theme_park"].includes(nextStop.stopType ?? "");
  const lowSensoryLater = unvisited.find((s, i) => i > 0 && ["park", "garden", "viewpoint", "beach", "nature"].includes(s.stopType ?? ""));
  const hasLongCurrent = currentStop && (currentStop.durationMinutes ?? 75) > 60;

  // Build action candidates for scoring
  const actionCandidates: AdjustmentActionType[] = [];
  if (hasLongCurrent) actionCandidates.push("shorten_current");
  if (isNextHighSensory && lowSensoryLater) actionCandidates.push("swap_next");
  actionCandidates.push("insert_support");

  const bestAction = pickBestAction("need_a_break", actionCandidates, unvisited);

  // Option 1: Shorten current stop (auto-apply)
  if (bestAction === "shorten_current" && hasLongCurrent && currentStop) {
    const orig = currentStop.durationMinutes ?? 90;
    const newDuration = Math.max(20, Math.round(orig * 0.55));
    const saved = orig - newDuration;
    const changesMade: ChangeMade[] = [{
      stopId: currentStop.id,
      stopName: currentStop.name,
      changeKind: "shorten",
      details: `Trimmed by ${saved} min — hit the highlights and take a breather outside`,
    }];
    return {
      adjustmentType: "shorten_current",
      title: "Wrap up here sooner",
      explanation: `Cutting "${currentStop.name}" short by ${saved} minutes lets everyone step out and breathe.`,
      changesMade,
      updatedFlow: projectFlowAfterShorten(unvisited, currentStop.id, newDuration),
      confidenceLevel: "high",
      requiresConfirmation: false,
      alternatives: [
        { label: "Add a proper break instead", description: "Step out for a 15-min break without shortening the stop" },
      ],
    };
  }

  // Option 2: Swap next high-sensory for lower-sensory (confirm)
  if (bestAction === "swap_next" && isNextHighSensory && lowSensoryLater && nextStop) {
    const nextIdx = unvisited.indexOf(nextStop);
    const lowIdx = unvisited.indexOf(lowSensoryLater);
    const changesMade: ChangeMade[] = [
      { stopId: nextStop.id, stopName: nextStop.name, changeKind: "reorder", details: "Moved later — high sensory load" },
      { stopId: lowSensoryLater.id, stopName: lowSensoryLater.name, changeKind: "reorder", details: "Moved earlier — calmer experience" },
    ];
    return {
      adjustmentType: "swap_next",
      title: "Swap to a calmer stop",
      explanation: `Instead of "${nextStop.name}", visit "${lowSensoryLater.name}" first for a gentler experience.`,
      changesMade,
      updatedFlow: projectFlowAfterReorder(unvisited, nextIdx, lowIdx),
      confidenceLevel: "medium",
      requiresConfirmation: true,
      alternatives: [
        { label: "Just add a quick break", description: "Insert a 15-min rest before heading to the next stop" },
      ],
    };
  }

  // Option 3: Insert rest break (confirm — new virtual stop)
  const changesMade: ChangeMade[] = [
    { stopId: "__break__", stopName: "Quick Rest Break", changeKind: "insert_break", details: "15–20 min break — find a bench, park, or café" },
  ];
  return {
    adjustmentType: "insert_support",
    title: "Take a 15-minute break",
    explanation: "A short rest before your next stop makes a big difference. Find a bench or café nearby.",
    changesMade,
    updatedFlow: unvisited,
    confidenceLevel: "high",
    requiresConfirmation: requiresConfirmationForAction("insert_support", changesMade),
  };
}

// ── want_more_fun ──
// Decision order (spec):
//   1. Add short delight stop if schedule slack exists AND next stop is not meal/reset (confirm)
//   2. Extend current stop if high kid engagement (auto-apply)
//   3. Extend next stop with extra time, unless it's meal/reset (auto-apply)
function handleWantMoreFun(stops: StopLike[]): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  const currentStop = unvisited[0];
  const nextStop = unvisited[1];

  // Meal/reset guard: delight stops should not displace upcoming meal or reset timing
  const nextIsMealOrReset = nextStop && (
    nextStop.familyAnchorType === "meal" ||
    nextStop.familyAnchorType === "reset" ||
    nextStop.isMealStop
  );
  const hasSlack = unvisited.length >= 3 && !nextIsMealOrReset;

  // Option 1: Add delight stop (confirm — new stop, guarded by slack + meal check)
  if (hasSlack) {
    const changesMade: ChangeMade[] = [
      { stopId: "__delight__", stopName: "Bonus Fun Stop", changeKind: "insert_delight", details: "Spontaneous delight — ice cream, playground, street performer, etc." },
    ];
    return {
      adjustmentType: "insert_support",
      title: "Add a bonus fun stop",
      explanation: "You have time to spare. Look for something spontaneous and delightful nearby.",
      changesMade,
      updatedFlow: unvisited,
      confidenceLevel: "medium",
      requiresConfirmation: requiresConfirmationForAction("insert_support", changesMade),
      alternatives: currentStop ? [
        { label: `Spend more time at ${currentStop.name}`, description: "Stay longer where you are instead" },
      ] : undefined,
    };
  }

  // Option 2: Extend current stop (auto-apply if high kid engagement)
  if (currentStop && (currentStop.kidFitScore ?? 50) >= 65) {
    const orig = currentStop.durationMinutes ?? 75;
    const extended = orig + 25;
    const changesMade: ChangeMade[] = [{
      stopId: currentStop.id,
      stopName: currentStop.name,
      changeKind: "shorten",
      details: `Extended by 25 min — the kids are loving it here`,
    }];
    return {
      adjustmentType: "shorten_current",
      title: `Linger at ${currentStop.name}`,
      explanation: `The kids are having a great time! Stay an extra 25 minutes and soak it in.`,
      changesMade,
      updatedFlow: projectFlowAfterShorten(unvisited, currentStop.id, extended),
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  // Option 3: Extend next stop (auto-apply — only if next stop is not meal/reset)
  if (nextStop && !nextIsMealOrReset) {
    const orig = nextStop.durationMinutes ?? 60;
    const extended = orig + 20;
    const changesMade: ChangeMade[] = [{
      stopId: nextStop.id,
      stopName: nextStop.name,
      changeKind: "shorten",
      details: "Extended — explore beyond the highlights",
    }];
    return {
      adjustmentType: "shorten_current",
      title: `Make the most of ${nextStop.name}`,
      explanation: `Head to "${nextStop.name}" with extra time to explore beyond the highlights.`,
      changesMade,
      updatedFlow: projectFlowAfterShorten(unvisited, nextStop.id, extended),
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  return {
    adjustmentType: "insert_support",
    title: "Day complete — celebrate!",
    explanation: "You've covered everything. Treat the kids to something spontaneous — ice cream, a walk, whatever they want.",
    changesMade: [],
    updatedFlow: unvisited,
    confidenceLevel: "high",
    requiresConfirmation: false,
  };
}

// ── shorten_this_stop ──
// Decision order (spec):
//   1. Shorten current stop duration (auto-apply)
//   2. Note what to skip / focus on
function handleShortenThisStop(stops: StopLike[]): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  const currentStop = unvisited[0];

  if (!currentStop) {
    return {
      adjustmentType: "shorten_current",
      title: "No current stop to shorten",
      explanation: "You've already visited all your stops for today.",
      changesMade: [],
      updatedFlow: stops,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  const orig = currentStop.durationMinutes ?? 75;
  const newDuration = Math.max(20, Math.round(orig * 0.55));
  const saved = orig - newDuration;
  const tip = currentStop.shortenTip ?? "Focus on the highlights — ask staff for the top 3 must-sees.";

  const changesMade: ChangeMade[] = [{
    stopId: currentStop.id,
    stopName: currentStop.name,
    changeKind: "shorten",
    details: `Reduced from ${orig} min to ${newDuration} min · ${tip}`,
  }];

  return {
    adjustmentType: "shorten_current",
    title: `Quick mode: ${currentStop.name}`,
    explanation: `Saves ~${saved} minutes. ${tip}`,
    changesMade,
    updatedFlow: projectFlowAfterShorten(unvisited, currentStop.id, newDuration),
    confidenceLevel: "high",
    requiresConfirmation: false,
    alternatives: unvisited[1] ? [
      { label: "Skip the rest and head on", description: `Head straight to ${unvisited[1].name} now` },
    ] : undefined,
  };
}

// ── too_much_planned (legacy) ──
function handleLegacyTooMuchPlanned(stops: StopLike[], anchorStopId?: string): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  const candidates = rankBySacrificeability(stops, anchorStopId);
  if (candidates.length === 0) {
    return {
      adjustmentType: "skip_next_low_value",
      title: "All stops protected",
      explanation: "All remaining stops are anchors or booked — nothing can be removed automatically.",
      changesMade: [],
      updatedFlow: unvisited,
      confidenceLevel: "high",
      requiresConfirmation: false,
      safetyBlocked: true,
      safetyReason: "All stops are protected",
    };
  }
  const toDrop: StopLike[] = [];
  const bestDrop = pickBestDropCandidate(candidates, "too_much_planned");
  if (bestDrop) toDrop.push(bestDrop);
  if (unvisited.length > 4 && candidates.length > 1) {
    const second = candidates.find(c => c.id !== toDrop[0]?.id);
    if (second) toDrop.push(second);
  }

  const changesMade: ChangeMade[] = toDrop.map(s => ({
    stopId: s.id,
    stopName: s.name,
    changeKind: "remove" as ChangeKind,
    details: "Lower-priority stop removed to simplify the day",
  }));

  return {
    adjustmentType: "collapse_day",
    title: "Simplified to must-see stops",
    explanation: `Removing ${toDrop.length} lower-priority stop${toDrop.length > 1 ? "s" : ""} to make the day more manageable.`,
    changesMade,
    updatedFlow: projectFlowAfterRemove(unvisited, new Set(toDrop.map(s => s.id))),
    confidenceLevel: toDrop.some(s => s.booked) ? "low" : "medium",
    requiresConfirmation: requiresConfirmationForAction("collapse_day", changesMade),
  };
}

// ── skip_stop (legacy) ──
function handleLegacySkipStop(stops: StopLike[]): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  const toSkip = unvisited[0];
  if (!toSkip) {
    return {
      adjustmentType: "skip_next_low_value",
      title: "No stops left to skip",
      explanation: "All stops have been visited.",
      changesMade: [],
      updatedFlow: stops,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }
  const isBooked = toSkip.booked === true;
  const changesMade: ChangeMade[] = [{
    stopId: toSkip.id,
    stopName: toSkip.name,
    changeKind: "remove",
    details: isBooked ? "Has a booking — needs your confirmation" : "Skipped",
  }];
  return {
    adjustmentType: "skip_next_low_value",
    title: isBooked ? `"${toSkip.name}" has a booking` : `Skip "${toSkip.name}"`,
    explanation: isBooked
      ? "This stop has a booking attached. Confirm you want to skip it."
      : `Moving on from "${toSkip.name}".`,
    changesMade,
    updatedFlow: projectFlowAfterRemove(unvisited, new Set([toSkip.id])),
    confidenceLevel: isBooked ? "medium" : "high",
    requiresConfirmation: requiresConfirmationForAction("skip_next_low_value", changesMade),
  };
}

// ── venue_closing ──
function handleVenueClosing(stops: StopLike[]): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  if (unvisited.length < 2) {
    return {
      adjustmentType: "reorder_remaining",
      title: "Visit now before it closes",
      explanation: "Your next stop closes soon — head there now.",
      changesMade: unvisited[0] ? [{
        stopId: unvisited[0].id,
        stopName: unvisited[0].name,
        changeKind: "reorder",
        details: "Visit now before it closes",
      }] : [],
      updatedFlow: unvisited,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }
  const changesMade: ChangeMade[] = [
    { stopId: unvisited[1].id, stopName: unvisited[1].name, changeKind: "reorder", details: "Moved earlier — closes soon" },
    { stopId: unvisited[0].id, stopName: unvisited[0].name, changeKind: "reorder", details: "Swapped with closing venue" },
  ];
  return {
    adjustmentType: "reorder_remaining",
    title: `"${unvisited[1].name}" moved earlier`,
    explanation: `"${unvisited[1].name}" closes soon. Swapping the order so you visit it first.`,
    changesMade,
    updatedFlow: projectFlowAfterReorder(unvisited, 0, 1),
    confidenceLevel: "high",
    requiresConfirmation: requiresConfirmationForAction("reorder_remaining", changesMade),
  };
}

// ── walking_overload ──
function handleWalkingOverload(stops: StopLike[]): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);
  if (unvisited.length < 2) {
    return {
      adjustmentType: "reorder_remaining",
      title: "Walking is already minimal",
      explanation: "Only one stop remains — no reordering needed.",
      changesMade: [],
      updatedFlow: unvisited,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }
  const toReorder = unvisited.slice(0, Math.min(3, unvisited.length));
  const changesMade: ChangeMade[] = toReorder.map(s => ({
    stopId: s.id,
    stopName: s.name,
    changeKind: "reorder" as ChangeKind,
    details: "Reordered to minimize walking",
  }));
  return {
    adjustmentType: "reorder_remaining",
    title: "Stops reordered to cut walking",
    explanation: "Remaining stops have been reordered to keep closer options first.",
    changesMade,
    updatedFlow: unvisited,
    confidenceLevel: "medium",
    requiresConfirmation: requiresConfirmationForAction("reorder_remaining", changesMade),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main engine entry point
// ──────────────────────────────────────────────────────────────────────────────

export function runLiveAdjustment(
  stops: StopLike[],
  trigger: TriggerType,
  anchorStopId?: string,
  sessionTiredCount?: number
): AdjustmentResult {
  const unvisited = stops.filter(s => !s.isVisited);

  if (unvisited.length === 0) {
    return {
      adjustmentType: "shorten_current",
      title: "All stops visited",
      explanation: "All stops are already visited — nothing to adjust.",
      changesMade: [],
      updatedFlow: stops,
      confidenceLevel: "high",
      requiresConfirmation: false,
    };
  }

  switch (trigger) {
    case "running_late":
    case "behind_20min":
      return handleRunningLate(stops, anchorStopId);
    case "kids_tired":
      return handleKidsTired(stops, anchorStopId, sessionTiredCount);
    case "need_food":
    case "meal_window_missed":
      return handleNeedFood(stops);
    case "need_a_break":
      return handleNeedABreak(stops);
    case "want_more_fun":
      return handleWantMoreFun(stops);
    case "shorten_this_stop":
      return handleShortenThisStop(stops);
    case "too_much_planned":
      return handleLegacyTooMuchPlanned(stops, anchorStopId);
    case "skip_stop":
      return handleLegacySkipStop(stops);
    case "venue_closing":
      return handleVenueClosing(stops);
    case "walking_overload":
      return handleWalkingOverload(stops);
    default:
      return {
        adjustmentType: "shorten_current",
        title: "No changes needed",
        explanation: "Your day looks good — no adjustments required.",
        changesMade: [],
        updatedFlow: unvisited,
        confidenceLevel: "high",
        requiresConfirmation: false,
      };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Bridge: AdjustmentResult → ChangeProposal (backward compat)
// ──────────────────────────────────────────────────────────────────────────────

function resultToProposal(result: AdjustmentResult): ChangeProposal {
  // Size mapping:
  //   small = auto-apply (no confirmation, no sheet shown in auto-on mode)
  //   medium = show confirmation sheet
  //   big = collapse_day (big structural change)
  const size: ChangeSize =
    result.adjustmentType === "collapse_day" ? "big"
    : result.requiresConfirmation ? "medium"
    : "small";

  const affected: AffectedStop[] = result.changesMade.map(c => ({
    stopId: c.stopId,
    stopName: c.stopName,
    changeKind: c.changeKind,
    details: c.details,
    requiresConfirmation: result.requiresConfirmation,
  }));

  return {
    size,
    summary: result.explanation,
    affected,
    safetyBlocked: result.safetyBlocked ?? false,
    safetyReason: result.safetyReason,
    result,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Public-facing wrapper — returns ChangeProposal for UI compatibility
// ──────────────────────────────────────────────────────────────────────────────

export function runAutoOptimize(
  stops: StopLike[],
  trigger: TriggerType,
  walkingPref?: "minimal" | "moderate" | "dont-care" | null,
  anchorStopId?: string,
  sessionTiredCount?: number
): ChangeProposal {
  const result = runLiveAdjustment(stops, trigger, anchorStopId, sessionTiredCount);
  return resultToProposal(result);
}

const MAX_AUTO_CHANGE_RATIO = 0.4;

export function exceedsAutoCap(
  proposal: ChangeProposal,
  stops: StopLike[],
  sessionRemovedCount: number
): boolean {
  const unvisited = stops.filter(s => !s.isVisited);
  const removals = proposal.affected.filter(a => a.changeKind === "remove");
  const sessionCap = Math.floor(unvisited.length * MAX_AUTO_CHANGE_RATIO);
  return (sessionRemovedCount + removals.length) > sessionCap;
}
