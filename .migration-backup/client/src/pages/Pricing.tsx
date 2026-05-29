import { useLocation, useSearch } from 'wouter';
import { useUser } from '@/lib/userContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignUpPrompt } from '@/components/SignUpPrompt';
import { 
  Crown, Check, ArrowLeft, Sparkles, Star,
  Users, Award, Loader2, 
  Settings, X, Heart, Globe, Map, Compass,
  Gamepad2, MapPin
} from 'lucide-react';
import { useState, useMemo, type ReactNode } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type EntrySource = 'geoquest' | 'geoadventures';

interface ValueBlock {
  icon: string;
  title: string;
  bullets: string[];
  tint: 'blue' | 'purple' | 'green' | 'amber' | 'rose';
}

interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string;
  yearlyPriceId: string;
  valueBlocks: ValueBlock[];
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: ReactNode;
  popular?: boolean;
  trialDays: number;
  badge?: string;
}

interface ContentConfig {
  headline: string;
  subtitle: string;
  planName: string;
  planTagline: string;
  accentColor: string;
  accentGradientFrom: string;
  accentGradientTo: string;
  accentBorderColor: string;
  accentRingColor: string;
  toggleActiveClass: string;
  planIcon: ReactNode;
  explorerBlocks: ValueBlock[];
  freeBlocks: ValueBlock[];
}

const FREE_BLOCKS_GEOQUEST: ValueBlock[] = [
  {
    icon: '🌍',
    title: 'Discover Cities',
    bullets: [
      'Daily Quest challenges',
      'Discover cities and collect passport stamps',
      'Start building your explorer journey',
    ],
    tint: 'blue',
  },
  {
    icon: '🎮',
    title: 'Play & Learn',
    bullets: [
      '3 mini-games per day',
      'Includes City Vibe and Spin the Globe',
      'Learn geography through play',
    ],
    tint: 'purple',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Family Friendly',
    bullets: [
      'Up to 3 explorer profiles',
      'Great for trying GeoQuest together',
      'No credit card required',
    ],
    tint: 'green',
  },
];

const FREE_BLOCKS_GEOADVENTURES: ValueBlock[] = [
  {
    icon: '🌍',
    title: 'Discover Cities',
    bullets: [
      'Daily Quest challenges',
      'Discover cities and collect passport stamps',
      '2 GeoAdventures per month',
    ],
    tint: 'blue',
  },
  {
    icon: '🎮',
    title: 'Play & Learn',
    bullets: [
      '3 mini-games per day',
      'Includes City Vibe and Spin the Globe',
      'Learn geography through play',
    ],
    tint: 'purple',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Family Friendly',
    bullets: [
      'Up to 3 explorer profiles',
      'Great for trying GeoQuest together',
      'No credit card required',
    ],
    tint: 'green',
  },
];

const EXPLORER_BLOCKS_GEOQUEST: ValueBlock[] = [
  {
    icon: '🎮',
    title: 'Master Geography',
    bullets: [
      'All GeoGames modes unlocked',
      'Flag Quiz and Map Mastery games',
      'Unlimited mini-games every day',
      'Explorer ranks and XP progression',
    ],
    tint: 'purple',
  },
  {
    icon: '🌍',
    title: 'Explore Cities',
    bullets: [
      'Unlimited GeoAdventures',
      'Experience city modules',
      'GeoBuddy stories',
      'Discover places through interactive adventures',
    ],
    tint: 'blue',
  },
  {
    icon: '📊',
    title: 'Track Real Progress',
    bullets: [
      'Full passport and mastery tracking',
      'Weekly parent progress reports',
      'Up to 7 explorer profiles',
      'See how your child is growing',
    ],
    tint: 'green',
  },
];

const EXPLORER_BLOCKS_GEOADVENTURES: ValueBlock[] = [
  {
    icon: '🌍',
    title: 'Explore Cities',
    bullets: [
      'Unlimited GeoAdventures',
      'Experience city modules',
      'GeoBuddy stories',
      'Discover places through interactive adventures',
    ],
    tint: 'blue',
  },
  {
    icon: '🎮',
    title: 'Master Geography',
    bullets: [
      'All GeoGames modes unlocked',
      'Flag Quiz and Map Mastery games',
      'Unlimited mini-games every day',
      'Explorer ranks and XP progression',
    ],
    tint: 'purple',
  },
  {
    icon: '📊',
    title: 'Track Real Progress',
    bullets: [
      'Full passport and mastery tracking',
      'Weekly parent progress reports',
      'Up to 7 explorer profiles',
      'See how your child is growing',
    ],
    tint: 'green',
  },
];

const FOUNDING_BLOCKS: ValueBlock[] = [
  {
    icon: '💜',
    title: 'Everything Included',
    bullets: [
      'Everything in GeoQuest Explorer',
      'Unlimited adventures and games',
      'Full learning and progress tools',
    ],
    tint: 'purple',
  },
  {
    icon: '⭐',
    title: 'Founding Family Perks',
    bullets: [
      'Locked-in pricing for 12 months',
      'Founding Family badge forever',
      'Early supporter status',
    ],
    tint: 'amber',
  },
  {
    icon: '🚀',
    title: 'Early Access Benefits',
    bullets: [
      '14-day free trial',
      'Limited to the first 100 families',
      'Priority feature feedback',
    ],
    tint: 'rose',
  },
];

const FOUNDING_BLOCKS_GEOADVENTURES: ValueBlock[] = [
  {
    icon: '💜',
    title: 'Everything Included',
    bullets: [
      'Everything in GeoAdventures Explorer',
      'Unlimited adventures and games',
      'Full learning and progress tools',
    ],
    tint: 'purple',
  },
  {
    icon: '⭐',
    title: 'Founding Family Perks',
    bullets: [
      'Locked-in pricing for 12 months',
      'Founding Family badge forever',
      'Early supporter status',
    ],
    tint: 'amber',
  },
  {
    icon: '🚀',
    title: 'Early Access Benefits',
    bullets: [
      '14-day free trial',
      'Limited to the first 100 families',
      'Priority feature feedback',
    ],
    tint: 'rose',
  },
];

const GEOQUEST_CONFIG: ContentConfig = {
  headline: 'Unlock the Full Explorer Journey',
  subtitle: 'Master geography through interactive games and explore cities around the world.',
  planName: 'GeoQuest Explorer',
  planTagline: 'The complete geography learning and adventure experience',
  accentColor: 'purple',
  accentGradientFrom: 'from-purple-500',
  accentGradientTo: 'to-indigo-500',
  accentBorderColor: 'border-purple-400',
  accentRingColor: 'ring-purple-100',
  toggleActiveClass: 'bg-purple-500 text-white',
  planIcon: <Compass className="w-6 h-6" />,
  explorerBlocks: EXPLORER_BLOCKS_GEOQUEST,
  freeBlocks: FREE_BLOCKS_GEOQUEST,
};

const GEOADVENTURES_CONFIG: ContentConfig = {
  headline: 'Unlock Unlimited GeoAdventures',
  subtitle: 'Turn cities into interactive adventures your kids will love. Discover places, play geography games, and explore the world together as a family.',
  planName: 'GeoAdventures Explorer',
  planTagline: 'Unlimited adventures across the world',
  accentColor: 'teal',
  accentGradientFrom: 'from-teal-500',
  accentGradientTo: 'to-blue-500',
  accentBorderColor: 'border-teal-400',
  accentRingColor: 'ring-teal-100',
  toggleActiveClass: 'bg-teal-500 text-white',
  planIcon: <Globe className="w-6 h-6" />,
  explorerBlocks: EXPLORER_BLOCKS_GEOADVENTURES,
  freeBlocks: FREE_BLOCKS_GEOADVENTURES,
};

interface TransformationContent {
  subtitle: string;
  beforeTitle: string;
  afterTitle: string;
  beforePoints: string[];
  afterPoints: string[];
  socialProof: string;
}

const GEOQUEST_TRANSFORMATION: TransformationContent = {
  subtitle: 'GeoQuest turns geography into an exciting game kids love to play.',
  beforeTitle: 'Before GeoQuest',
  afterTitle: 'After GeoQuest',
  beforePoints: [
    'Geography feels like memorizing facts',
    'Countries and capitals are just homework',
    'Kids lose interest in learning quickly',
    'Screens are mostly passive entertainment',
    'No way to track what kids are learning',
  ],
  afterPoints: [
    'Geography becomes an exciting game',
    'Kids master flags, maps, and cities through play',
    'Explorer ranks keep them motivated',
    'Every game session teaches something new',
    'Parents see real learning progress weekly',
  ],
  socialProof: 'Kids don\'t just memorize geography — they master it through play.',
};

const GEOADVENTURES_TRANSFORMATION: TransformationContent = {
  subtitle: 'GeoAdventures turns curiosity about the world into real discovery.',
  beforeTitle: 'Before GeoAdventures',
  afterTitle: 'After GeoAdventures',
  beforePoints: [
    'Geography feels like memorizing facts',
    'Cities are just names on a map',
    'Travel feels boring for kids',
    'Kids lose interest quickly',
    'Screens are mostly passive entertainment',
  ],
  afterPoints: [
    'Kids explore cities through adventures',
    'Geography becomes a discovery game',
    'Trips turn into family quests',
    'Kids remember places through play',
    'Curiosity about the world grows naturally',
  ],
  socialProof: 'Kids don\'t just learn geography — they experience the world.',
};

const TINT_STYLES: Record<ValueBlock['tint'], { bg: string; iconBg: string; titleColor: string; bulletColor: string }> = {
  blue: {
    bg: 'bg-sky-50/70 dark:bg-sky-900/15',
    iconBg: 'bg-sky-100 dark:bg-sky-800/40',
    titleColor: 'text-sky-800 dark:text-sky-300',
    bulletColor: 'text-sky-600 dark:text-sky-400',
  },
  purple: {
    bg: 'bg-purple-50/70 dark:bg-purple-900/15',
    iconBg: 'bg-purple-100 dark:bg-purple-800/40',
    titleColor: 'text-purple-800 dark:text-purple-300',
    bulletColor: 'text-purple-600 dark:text-purple-400',
  },
  green: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-900/15',
    iconBg: 'bg-emerald-100 dark:bg-emerald-800/40',
    titleColor: 'text-emerald-800 dark:text-emerald-300',
    bulletColor: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-900/15',
    iconBg: 'bg-amber-100 dark:bg-amber-800/40',
    titleColor: 'text-amber-800 dark:text-amber-300',
    bulletColor: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-900/15',
    iconBg: 'bg-rose-100 dark:bg-rose-800/40',
    titleColor: 'text-rose-800 dark:text-rose-300',
    bulletColor: 'text-rose-600 dark:text-rose-400',
  },
};

function ValueBlockSection({ block }: { block: ValueBlock }) {
  const style = TINT_STYLES[block.tint];
  return (
    <div className={`rounded-xl p-3.5 ${style.bg}`} data-testid={`value-block-${block.title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center text-base`}>
          {block.icon}
        </span>
        <h4 className={`text-sm font-bold ${style.titleColor}`}>{block.title}</h4>
      </div>
      <ul className="space-y-1.5 pl-[2.625rem]">
        {block.bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-gray-600 dark:text-gray-400">
            <Check className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${style.bulletColor}`} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BeforeAfterSection({ entry }: { entry: EntrySource }) {
  const content = entry === 'geoadventures' ? GEOADVENTURES_TRANSFORMATION : GEOQUEST_TRANSFORMATION;

  return (
    <div className="mb-10" data-testid="before-after-section">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          How Kids Become World Explorers
        </h2>
        <p className="text-sm text-slate-600 dark:text-gray-300">
          {content.subtitle}
        </p>
        <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
          Designed for curious explorers ages 5+
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto relative">
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5" data-testid="before-card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">😐</span>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">{content.beforeTitle}</h3>
          </div>
          <ul className="space-y-2.5">
            {content.beforePoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white dark:bg-gray-700 border-2 border-green-300 items-center justify-center shadow-md" data-testid="divider-arrow">
          <span className="text-green-500 text-lg">→</span>
        </div>
        <div className="flex sm:hidden justify-center -my-1 z-10">
          <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 border-2 border-green-300 flex items-center justify-center shadow-md">
            <span className="text-green-500 text-lg">↓</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5" data-testid="after-card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🌍</span>
            <h3 className="font-semibold text-green-700 dark:text-green-400">{content.afterTitle}</h3>
          </div>
          <ul className="space-y-2.5">
            {content.afterPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-center mt-5 space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-gray-300 italic">
          {content.socialProof}
        </p>
        <p className="text-xs text-slate-500 dark:text-gray-400">
          Perfect for road trips, family vacations, and curious kids at home.
        </p>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user } = useUser();
  const { tier, hasActiveSubscription, isTrialActive, trialDaysRemaining, isFoundingFamily } = useSubscription();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);

  const entrySource: EntrySource = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const entry = params.get('entry');
    return entry === 'geoadventures' ? 'geoadventures' : 'geoquest';
  }, [searchString]);

  const config = entrySource === 'geoadventures' ? GEOADVENTURES_CONFIG : GEOQUEST_CONFIG;
  const foundingBlocks = entrySource === 'geoadventures' ? FOUNDING_BLOCKS_GEOADVENTURES : FOUNDING_BLOCKS;

  const explorerPlan: PricingPlan = {
    id: 'geoquest_explorer',
    name: config.planName,
    tagline: config.planTagline,
    monthlyPrice: 7.99,
    yearlyPrice: 69.99,
    monthlyPriceId: 'price_1SmhJH7bGBRglODi9UtViJjO',
    yearlyPriceId: 'price_1SmhJH7bGBRglODiSZtdIhJp',
    color: config.accentColor,
    gradientFrom: config.accentGradientFrom,
    gradientTo: config.accentGradientTo,
    icon: config.planIcon,
    popular: true,
    trialDays: 7,
    valueBlocks: config.explorerBlocks,
  };

  const foundingPlan: PricingPlan = {
    id: 'founding',
    name: 'Founding Families',
    tagline: 'Early access for our founding explorer families',
    monthlyPrice: 4.99,
    yearlyPrice: 39.99,
    monthlyPriceId: 'price_1SmhJF7bGBRglODi8MRfU9ql',
    yearlyPriceId: 'price_1SmhJF7bGBRglODiSl1Qcoai',
    color: 'amber',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-orange-500',
    icon: <Heart className="w-6 h-6" />,
    trialDays: 14,
    valueBlocks: foundingBlocks,
    badge: 'LIMITED SPOTS',
  };

  const plans = [foundingPlan, explorerPlan];

  const handleSubscribe = async (planId: string, priceId: string) => {
    if (!user) {
      setShowSignUpPrompt(true);
      return;
    }

    if (planId === 'founding') {
      setLocation('/founding-families');
      return;
    }

    setIsLoading(planId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start checkout');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading('manage');
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to open subscription portal');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const getButtonText = (planId: string, trialDays: number) => {
    if (tier === planId && hasActiveSubscription) {
      return 'Current Plan';
    }
    if (planId === 'founding') {
      return 'Join Founding Families';
    }
    if (isTrialActive) {
      return 'Subscribe Now';
    }
    return `Start ${trialDays}-Day Free Trial`;
  };

  const isCurrentPlan = (planId: string) => {
    return tier === planId && hasActiveSubscription;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            const returnUrl = params.get('returnUrl');
            if (returnUrl) {
              setLocation(decodeURIComponent(returnUrl));
            } else {
              window.history.back();
            }
          }}
          className="flex items-center gap-2 text-purple-600 mb-6 hover:text-purple-800"
          data-testid="back-from-pricing"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-3" data-testid="text-pricing-title">
            {config.headline}
          </h1>
          <p className="text-lg text-slate-600 dark:text-gray-300 max-w-xl mx-auto">
            {config.subtitle}
          </p>
          
          {isTrialActive && trialDaysRemaining !== null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Trial active: {trialDaysRemaining} days remaining
            </div>
          )}
        </div>

        <BeforeAfterSection entry={entrySource} />

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? config.toggleActiveClass
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="billing-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? config.toggleActiveClass
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              data-testid="billing-yearly"
            >
              Yearly
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                Save 25%+
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          {entrySource !== 'geoadventures' && (
            <Card className="relative overflow-hidden" data-testid="pricing-card-free">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-white mb-3">
                  <Globe className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl" data-testid="text-free-features-title">Start Exploring for Free</CardTitle>
                <p className="text-sm text-gray-500">Begin your explorer journey at no cost</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-gray-500">/forever</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    No credit card required
                  </p>
                </div>

                <div className="space-y-3">
                  {config.freeBlocks.map((block, index) => (
                    <ValueBlockSection key={index} block={block} />
                  ))}
                </div>

                <Button
                  onClick={() => setLocation('/')}
                  variant="outline"
                  className="w-full"
                  data-testid="start-free"
                >
                  Start Exploring Free
                </Button>
                <p className="text-xs text-center text-slate-400 dark:text-slate-500 italic">
                  Used by families to explore the world through play.
                </p>
              </CardContent>
            </Card>
          )}

          <div className={entrySource === 'geoadventures' ? "space-y-6" : "grid md:grid-cols-2 gap-6"}>
            {(entrySource === 'geoadventures' ? plans.filter(p => p.id === 'geoquest_explorer') : plans).map((plan) => {
              const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              const priceId = billingPeriod === 'yearly' ? plan.yearlyPriceId : plan.monthlyPriceId;
              const monthlyEquivalent = billingPeriod === 'yearly' 
                ? (plan.yearlyPrice / 12).toFixed(2)
                : plan.monthlyPrice.toFixed(2);
              const isCurrent = isCurrentPlan(plan.id);

              return (
                <Card 
                  key={plan.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    plan.popular ? `border-2 ${config.accentBorderColor} ring-2 ${config.accentRingColor}` : ''
                  } ${isCurrent ? 'ring-2 ring-green-400' : ''}`}
                  data-testid={`pricing-card-${plan.id}`}
                >
                  {plan.popular && (
                    <div className={`absolute top-0 right-0 bg-gradient-to-r ${config.accentGradientFrom} ${config.accentGradientTo} text-white text-xs font-bold px-4 py-1 rounded-bl-lg`}>
                      MOST POPULAR
                    </div>
                  )}
                  
                  {isCurrent && (
                    <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-br-lg">
                      CURRENT PLAN
                    </div>
                  )}

                  {plan.badge && !isCurrent && !plan.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                      {plan.badge}
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.gradientFrom} ${plan.gradientTo} flex items-center justify-center text-white mb-3`}>
                      {plan.icon}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <p className="text-sm text-gray-500">{plan.tagline}</p>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-gray-500">/{billingPeriod === 'yearly' ? 'year' : 'month'}</span>
                      </div>
                      {billingPeriod === 'yearly' && (
                        <p className="text-sm text-gray-500 mt-1">
                          That's just ${monthlyEquivalent}/month
                        </p>
                      )}
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {plan.trialDays}-day free trial included
                      </p>
                      {plan.popular && billingPeriod === 'monthly' && (
                        <p className="text-xs text-slate-500 mt-1 italic">
                          Less than the price of a single kids activity.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {plan.valueBlocks.map((block, index) => (
                        <ValueBlockSection key={index} block={block} />
                      ))}
                    </div>

                    {isCurrent ? (
                      <Button
                        onClick={handleManageSubscription}
                        disabled={isLoading === 'manage'}
                        variant="outline"
                        className="w-full"
                        data-testid={`manage-${plan.id}`}
                      >
                        {isLoading === 'manage' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Settings className="w-4 h-4 mr-2" />
                        )}
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan.id, priceId)}
                        disabled={isLoading === plan.id}
                        className={`w-full ${plan.popular ? `bg-gradient-to-r ${plan.gradientFrom} ${plan.gradientTo} hover:opacity-90` : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                        data-testid={`subscribe-${plan.id}`}
                      >
                        {isLoading === plan.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {getButtonText(plan.id, plan.trialDays)}
                      </Button>
                    )}
                    <p className="text-xs text-center text-slate-400 dark:text-slate-500 italic">
                      Used by families to explore the world through play.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>Cancel anytime • Free trial on all plans</p>
          <p>Secure payment powered by Stripe</p>
        </div>
      </div>
      
      <SignUpPrompt 
        isOpen={showSignUpPrompt} 
        onClose={() => setShowSignUpPrompt(false)}
        onLogin={() => setShowSignUpPrompt(false)}
      />
    </div>
  );
}
