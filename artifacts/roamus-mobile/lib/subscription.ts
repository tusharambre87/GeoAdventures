// ─── Dev bypass ───────────────────────────────────────────────────────────────
// Set to true to treat every user as paid (hides all upgrade prompts/screens).
// Set to false to re-enable normal paywall behaviour.
export const BYPASS_PAYWALL = true;

// ─── Paid tier list ───────────────────────────────────────────────────────────
const PAID_TIERS = ['monthly', 'annual', 'geopass_monthly', 'geopass_annual', 'trip_pass', 'paid', 'geoquest_explorer', 'founding', 'admin'];

export function isFreePlan(subscriptionTier?: string | null): boolean {
  if (BYPASS_PAYWALL) return false; // everyone is treated as paid
  if (!subscriptionTier) return true;
  return !PAID_TIERS.includes(subscriptionTier.toLowerCase());
}
