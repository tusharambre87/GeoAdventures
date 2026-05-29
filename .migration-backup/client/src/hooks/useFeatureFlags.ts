import { useQuery } from '@tanstack/react-query';

interface FeatureFlags {
  foundingFamiliesEnabled: boolean;
  adventureFlowV2: boolean;
  paywallEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  foundingFamiliesEnabled: false,
  adventureFlowV2: false,
  paywallEnabled: true,
};

export function useFeatureFlags() {
  const { data: flags, isLoading } = useQuery<FeatureFlags>({
    queryKey: ['/api/config/feature-flags'],
    queryFn: async () => {
      const res = await fetch('/api/config/feature-flags');
      if (!res.ok) {
        return DEFAULT_FLAGS;
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    foundingFamiliesEnabled: flags?.foundingFamiliesEnabled ?? DEFAULT_FLAGS.foundingFamiliesEnabled,
    adventureFlowV2: flags?.adventureFlowV2 ?? DEFAULT_FLAGS.adventureFlowV2,
    paywallEnabled: flags?.paywallEnabled ?? DEFAULT_FLAGS.paywallEnabled,
    isLoading,
  };
}
