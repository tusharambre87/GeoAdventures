const PAID_TIERS = ['monthly', 'annual', 'geopass_monthly', 'geopass_annual', 'trip_pass', 'paid', 'geoquest_explorer', 'founding', 'admin'];

export function isFreePlan(subscriptionTier?: string | null): boolean {
  if (!subscriptionTier) return true;
  return !PAID_TIERS.includes(subscriptionTier.toLowerCase());
}
