import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/userContext';

export type PricingBand = 'A' | 'B' | 'C';

export interface PricingInfo {
  band: PricingBand;
  currency: string;
  currencySymbol: string;
  currencyLocked?: boolean;
  country?: string | null;
  annual: string;
  monthly: string;
  foundingAnnual: string;
  foundingMonthly: string;
  foundingCap: number;
  rawPrices: {
    annual: number;
    monthly: number;
    foundingAnnual: number;
    foundingMonthly: number;
  };
  confidence?: 'high' | 'medium' | 'low';
}

async function fetchAuthenticatedPricing(): Promise<PricingInfo> {
  const res = await fetch('/api/config/pricing');
  if (!res.ok) {
    throw new Error('Failed to fetch pricing');
  }
  return res.json();
}

async function detectPricing(): Promise<PricingInfo> {
  const res = await fetch('/api/config/detect-pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locale: navigator.language || 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!res.ok) {
    throw new Error('Failed to detect pricing');
  }
  return res.json();
}

export function usePricing() {
  const { user } = useUser();
  const isAuthenticated = !!user;

  return useQuery({
    queryKey: ['pricing', isAuthenticated ? 'authenticated' : 'detected'],
    queryFn: () => isAuthenticated ? fetchAuthenticatedPricing() : detectPricing(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Default pricing (Band A) for fallback
export const DEFAULT_PRICING: PricingInfo = {
  band: 'A',
  currency: 'USD',
  currencySymbol: '$',
  annual: '$69.99',
  monthly: '$7.99',
  foundingAnnual: '$39.99',
  foundingMonthly: '$4.99',
  foundingCap: 100,
  rawPrices: {
    annual: 69.99,
    monthly: 7.99,
    foundingAnnual: 39.99,
    foundingMonthly: 4.99,
  },
};
