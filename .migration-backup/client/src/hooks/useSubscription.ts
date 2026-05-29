import { useMemo } from 'react';
import { useUser } from '@/lib/userContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export type SubscriptionTier = 'free' | 'trial' | 'geoquest_explorer' | 'founding';

export interface SubscriptionEntitlements {
  tier: SubscriptionTier;
  isTrialActive: boolean;
  trialDaysRemaining: number | null;
  isPaidTier: boolean;
  isFoundingFamily: boolean;
  foundingFamilyNumber: number | null;
  foundingFreeCityId: string | null;
  hasActiveSubscription: boolean;
}

const DEFAULT_ENTITLEMENTS: SubscriptionEntitlements = {
  tier: 'free',
  isTrialActive: false,
  trialDaysRemaining: null,
  isPaidTier: false,
  isFoundingFamily: false,
  foundingFamilyNumber: null,
  foundingFreeCityId: null,
  hasActiveSubscription: false,
};

function normalizeTier(rawTier: string): SubscriptionTier {
  if (rawTier === 'geogames' || rawTier === 'geoquest_plus' || rawTier === 'pro') return 'geoquest_explorer';
  if (['free', 'trial', 'geoquest_explorer', 'founding'].includes(rawTier)) return rawTier as SubscriptionTier;
  return 'free';
}

function getEntitlementsFromUser(user: any): SubscriptionEntitlements & { isAdmin: boolean } {
  if (!user) return { ...DEFAULT_ENTITLEMENTS, isAdmin: false };

  if (user.isAdmin === true || user.is_admin === true) {
    return {
      tier: 'geoquest_explorer' as SubscriptionTier,
      isTrialActive: false,
      trialDaysRemaining: null,
      isPaidTier: true,
      isFoundingFamily: false,
      foundingFamilyNumber: null,
      foundingFreeCityId: null,
      hasActiveSubscription: true,
      isAdmin: true,
    };
  }

  const rawTier = user.subscriptionTier || 'free';
  const tier = normalizeTier(rawTier);
  const now = new Date();
  
  const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
  const isTrialActive = tier === 'trial' && trialEndDate && trialEndDate > now;
  const trialDaysRemaining = isTrialActive && trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const subscriptionEndDate = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
  const hasActiveSubscription = subscriptionEndDate ? subscriptionEndDate > now : 
    ['geoquest_explorer', 'founding'].includes(tier);

  const isPaidTier = (tier === 'geoquest_explorer' || tier === 'founding') && hasActiveSubscription;
  const hasFullAccess = isPaidTier || !!isTrialActive;

  let entitlements: SubscriptionEntitlements = {
    tier,
    isTrialActive: !!isTrialActive,
    trialDaysRemaining,
    isPaidTier: hasFullAccess,
    isFoundingFamily: !!user.isFoundingFamily,
    foundingFamilyNumber: user.foundingFamilyNumber || null,
    foundingFreeCityId: user.foundingFreeCityId || null,
    hasActiveSubscription: hasActiveSubscription || !!isTrialActive,
  };

  return { ...entitlements, isAdmin: false };
}

export function useSubscription() {
  const { user, isLoading: isUserLoading } = useUser();
  const { paywallEnabled } = useFeatureFlags();

  const entitlements = useMemo(() => {
    const base = getEntitlementsFromUser(user);
    if (!paywallEnabled) {
      return {
        ...base,
        tier: base.tier === 'free' ? 'geoquest_explorer' as SubscriptionTier : base.tier,
        isPaidTier: true,
        hasActiveSubscription: true,
      };
    }
    return base;
  }, [user, paywallEnabled]);

  return {
    ...entitlements,
    isLoading: isUserLoading,
    getUpgradeTier: () => 'geoquest_explorer' as const,
  };
}
