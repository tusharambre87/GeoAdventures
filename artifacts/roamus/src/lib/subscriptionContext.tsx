import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from './userContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

export type SubscriptionTier = 'free' | 'pro';

interface SubscriptionLimits {
  maxExplorers: number;
  geoBuddyQuestionsPerMonth: number | 'unlimited';
  offlineEnabled: boolean;
  fullAnalytics: boolean;
  adsEnabled: boolean;
  premiumMissions: boolean;
  printableCertificates: boolean;
}

const FREE_LIMITS: SubscriptionLimits = {
  maxExplorers: 3,
  geoBuddyQuestionsPerMonth: 5,
  offlineEnabled: false,
  fullAnalytics: false,
  adsEnabled: true,
  premiumMissions: false,
  printableCertificates: false,
};

const PRO_LIMITS: SubscriptionLimits = {
  maxExplorers: 7,
  geoBuddyQuestionsPerMonth: 'unlimited',
  offlineEnabled: true,
  fullAnalytics: true,
  adsEnabled: false,
  premiumMissions: true,
  printableCertificates: true,
};

interface SubscriptionContextType {
  tier: SubscriptionTier;
  rawTier: string;
  limits: SubscriptionLimits;
  isPro: boolean;
  isAdmin: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  accountAgeDays: number;
  isFirstMonthFree: boolean;
  subscriptionEndDate: Date | null;
  checkFeatureAccess: (feature: keyof SubscriptionLimits) => boolean;
  upgradeToPro: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { paywallEnabled } = useFeatureFlags();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [rawTier, setRawTier] = useState<string>('free');
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [accountCreatedDate, setAccountCreatedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      const userTier = (user as any).subscriptionTier || 'free';
      const PAID_TIERS = ['pro', 'geoquest_explorer', 'geogames', 'geoquest_plus', 'founding', 'trial'];
      setRawTier(userTier);
      setTier(PAID_TIERS.includes(userTier) ? 'pro' : 'free');
      setIsAdmin((user as any).isAdmin === true || (user as any).is_admin === true);
      
      if ((user as any).subscriptionEndDate) {
        setSubscriptionEndDate(new Date((user as any).subscriptionEndDate));
      }
      if ((user as any).trialEndDate) {
        setTrialEndDate(new Date((user as any).trialEndDate));
      }
      if ((user as any).createdAt) {
        setAccountCreatedDate(new Date((user as any).createdAt));
      }
    }
  }, [user]);

  const isPro = !paywallEnabled || tier === 'pro' || isAdmin;
  const limits = isPro ? PRO_LIMITS : FREE_LIMITS;

  const isTrialActive = trialEndDate ? new Date() < trialEndDate : false;
  
  const trialDaysRemaining = trialEndDate 
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const accountAgeDays = accountCreatedDate
    ? Math.floor((Date.now() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isFirstMonthFree = accountAgeDays <= 30;

  const checkFeatureAccess = useCallback((feature: keyof SubscriptionLimits): boolean => {
    if (isAdmin || isPro) return true;
    
    if (feature === 'fullAnalytics' && isFirstMonthFree) {
      return true;
    }
    
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (value === 'unlimited') return true;
    return true;
  }, [isAdmin, isPro, limits, isFirstMonthFree]);

  const upgradeToPro = useCallback(() => {
    window.location.href = '/pricing';
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      tier,
      rawTier,
      limits,
      isPro,
      isAdmin,
      isTrialActive,
      trialDaysRemaining,
      accountAgeDays,
      isFirstMonthFree,
      subscriptionEndDate,
      checkFeatureAccess,
      upgradeToPro,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  return context;
}

export const SUBSCRIPTION_PRICES = {
  monthly: {
    amount: 8.99,
    currency: 'USD',
    interval: 'month',
  },
  yearly: {
    amount: 79,
    currency: 'USD',
    interval: 'year',
    savings: '27%',
  },
};
