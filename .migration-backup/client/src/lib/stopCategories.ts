export type StopCategory = "experience" | "recovery" | "meal";

const MEAL_TYPES = new Set([
  "restaurant", "cafe", "food", "breakfast", "lunch", "dinner", "snack",
  "street_food", "coffee", "bar", "bakery", "food_court", "drinks",
]);

const RECOVERY_TYPES = new Set([
  "park", "playground", "garden", "nature", "beach", "green_space",
  "splash", "sports", "square", "plaza", "open_space", "trail",
]);

export function getStopCategory(stopType?: string | null): StopCategory {
  if (!stopType) return "experience";
  const t = stopType.toLowerCase();
  if (MEAL_TYPES.has(t)) return "meal";
  if (RECOVERY_TYPES.has(t)) return "recovery";
  return "experience";
}

export function getMealLabel(stopType?: string | null): string {
  const t = (stopType ?? "").toLowerCase();
  if (t === "breakfast") return "☀️ Breakfast time";
  if (t === "lunch") return "🌤 Lunch time";
  if (t === "dinner") return "🌙 Dinner time";
  if (t === "snack") return "🍎 Snack time";
  if (t === "coffee" || t === "cafe") return "☕ Coffee break";
  return "🍽️ Meal time";
}

// Returns true for meal or recovery stops — these are "quick stops" that don't get story generation
export function isQuickStop(stopType?: string | null, name?: string | null): boolean {
  const category = getStopCategory(stopType);
  if (category === "meal" || category === "recovery") return true;
  const n = (name ?? "").toLowerCase();
  if (/\b(food\s+break|lunch\s+break|snack|playground|quick\s+break)\b/.test(n)) return true;
  return false;
}

export function getMealDoneLabel(stopType?: string | null): string {
  const t = (stopType ?? "").toLowerCase();
  if (t === "breakfast") return "Done with breakfast ✅";
  if (t === "lunch") return "Done with lunch ✅";
  if (t === "dinner") return "Done with dinner ✅";
  if (t === "snack") return "Done with snack ✅";
  if (t === "coffee" || t === "cafe") return "Coffee done ✅";
  return "Meal done ✅";
}
