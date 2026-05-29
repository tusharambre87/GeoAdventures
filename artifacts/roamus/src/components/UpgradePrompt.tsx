import { useState, useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Lock, Crown, Download, Video, MapPin, Check, Star, Clock, X, Shield, Heart, Plane } from 'lucide-react';
import { useLocation } from 'wouter';
import { useSubscription } from '@/hooks/useSubscription';
import { useFreeLimits } from '@/hooks/useFreeLimits';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';

type FeatureGate = 'video_maker' | 'offline_travel' | 'unlimited_stops' | 'offline_geogames' | 'flag_quiz' | 'map_me' | 'mini_games_daily' | 'adventure_monthly' | 'build_adventure' | 'rank_cap' | 'extra_explorers';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: FeatureGate;
  context?: string;
}

const FEATURE_CONTENT: Record<FeatureGate, {
  title: string;
  description: string;
  icon: ReactNode;
  benefits: string[];
  cta: string;
}> = {
  video_maker: {
    title: 'Create Trip Videos',
    description: 'Turn your adventure memories into beautiful shareable videos!',
    icon: <Video className="w-8 h-8 text-purple-500" />,
    benefits: [
      'Auto-generated highlight videos',
      'Add photos and moments',
      'Share with family & friends',
      'Keep forever in your gallery',
    ],
    cta: 'Unlock Video Maker',
  },
  offline_travel: {
    title: 'Take Adventures Offline',
    description: 'Download adventures to explore anywhere, even without internet!',
    icon: <Download className="w-8 h-8 text-blue-500" />,
    benefits: [
      'Full offline adventure access',
      'Journey Packs work anywhere',
      'Perfect for flights & road trips',
      'All content pre-downloaded',
    ],
    cta: 'Get Offline Access',
  },
  unlimited_stops: {
    title: 'Add More Stops',
    description: 'Create longer, richer adventures with unlimited stops!',
    icon: <MapPin className="w-8 h-8 text-green-500" />,
    benefits: [
      'No limit on adventure stops',
      'Build epic multi-day trips',
      'More moments to capture',
      'Deeper destination exploration',
    ],
    cta: 'Unlock Unlimited Stops',
  },
  offline_geogames: {
    title: 'Play GeoGames Offline',
    description: 'Take your geography games anywhere, no internet needed!',
    icon: <Download className="w-8 h-8 text-amber-500" />,
    benefits: [
      'All game modes offline',
      'Daily Quest works anywhere',
      'Perfect for car rides',
      'Keep streaks alive on vacation',
    ],
    cta: 'Get Offline GeoGames',
  },
  flag_quiz: {
    title: 'Unlock the full explorer journey.',
    description: 'Flag Quiz is a GeoQuest Explorer game. Upgrade to test your world flag knowledge!',
    icon: <Star className="w-8 h-8 text-green-500" />,
    benefits: [
      'Flag Quiz & Map Me unlocked',
      'Unlimited mini-games every day',
      'Earn passport mastery stars',
      'All 12 explorer ranks',
    ],
    cta: 'Start Exploring',
  },
  map_me: {
    title: 'Unlock the full explorer journey.',
    description: 'Map Me is a GeoQuest Explorer game. Upgrade to find cities on the world map!',
    icon: <MapPin className="w-8 h-8 text-blue-500" />,
    benefits: [
      'Map Me & Flag Quiz unlocked',
      'Unlimited mini-games every day',
      'Earn passport mastery stars',
      'All 12 explorer ranks',
    ],
    cta: 'Start Exploring',
  },
  mini_games_daily: {
    title: 'Unlock the full explorer journey.',
    description: "You've used your 3 free games for today. Explorers get unlimited daily play!",
    icon: <Clock className="w-8 h-8 text-amber-500" />,
    benefits: [
      'Unlimited mini-games every day',
      'Flag Quiz & Map Me unlocked',
      'Earn more passport stars',
      'Climb all 12 explorer ranks',
    ],
    cta: 'Start Exploring',
  },
  adventure_monthly: {
    title: 'Unlock the full explorer journey.',
    description: 'Upgrade to GeoQuest Explorer to explore every city in depth and access all adventures.',
    icon: <MapPin className="w-8 h-8 text-green-500" />,
    benefits: [
      'Explore every city in depth',
      'Unlimited GeoAdventures',
      'Family travel journals & keepsakes',
      'Full offline adventure access',
    ],
    cta: 'Start Exploring',
  },
  build_adventure: {
    title: 'Plan Real-World Family Trips',
    description: 'Build an Adventure lets you plan real-world family trips with stops, keepsakes, and journaling. Upgrade to unlock.',
    icon: <Plane className="w-8 h-8 text-orange-500" />,
    benefits: [
      'Plan real-world family adventures',
      'Add stops, moments & keepsakes',
      'Premium games & content',
      'Full offline adventure access',
    ],
    cta: 'Unlock Adventures',
  },
  rank_cap: {
    title: 'Unlock the full explorer journey.',
    description: 'Free explorers can reach Explorer rank. Upgrade to climb all 12 ranks!',
    icon: <Crown className="w-8 h-8 text-amber-500" />,
    benefits: [
      'All 12 explorer ranks unlocked',
      'Earn XP from every activity',
      'Reach GeoQuest Champion status',
      'Unlimited games & adventures',
    ],
    cta: 'Start Exploring',
  },
  extra_explorers: {
    title: 'Unlock the full explorer journey.',
    description: 'Free accounts include 3 explorers. Upgrade for up to 7 explorer profiles!',
    icon: <Heart className="w-8 h-8 text-pink-500" />,
    benefits: [
      'Up to 7 explorer profiles',
      'Each explorer tracks their own progress',
      'Unlimited games & adventures',
      'All 12 explorer ranks',
    ],
    cta: 'Start Exploring',
  },
};

function useTierContent() {
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  return {
    geoquest_explorer: {
      name: 'GeoQuest Explorer',
      price: `${p.monthly}/month`,
      yearlyPrice: `${p.annual}/year`,
      foundingPrice: `${p.foundingAnnual}/year`,
      color: 'purple',
    },
  };
}

const ADVENTURE_GATES: FeatureGate[] = ['adventure_monthly', 'build_adventure', 'offline_travel', 'unlimited_stops', 'video_maker'];

export function UpgradePrompt({ isOpen, onClose, feature, context }: UpgradePromptProps) {
  const [, setLocation] = useLocation();
  const content = FEATURE_CONTENT[feature];
  const tierContent = useTierContent();
  const tier = tierContent.geoquest_explorer;
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;

  const handleUpgrade = () => {
    onClose();
    const entry = ADVENTURE_GATES.includes(feature) ? 'geoadventures' : 'geoquest';
    setLocation(`/pricing?entry=${entry}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="upgrade-prompt-dialog">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-purple-100 to-amber-50 rounded-2xl">
              {content.icon}
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {content.description}
            {context && <span className="block mt-1 text-sm font-medium">{context}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-purple-900">{tier.name}</span>
              </div>

              <ul className="space-y-2 mb-4">
                {content.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 pt-3 border-t border-purple-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Monthly</span>
                  <span className="font-bold text-purple-900">{tier.price}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Annual <span className="text-green-600 font-semibold">(save 30%+)</span></span>
                  <span className="font-bold text-purple-900">{tier.yearlyPrice}</span>
                </div>
                <div className="flex items-center justify-between text-sm bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-200">
                  <span className="text-amber-800 font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> Founding Families</span>
                  <span className="font-bold text-amber-800">{tier.foundingPrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            data-testid="upgrade-button"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {content.cta}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Cancel anytime. Limited Founding Family spots available.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface StopLimitReachedProps {
  isOpen: boolean;
  onClose: () => void;
  currentStops: number;
  maxStops: number;
}

export function StopLimitReached({ isOpen, onClose, currentStops, maxStops }: StopLimitReachedProps) {
  const [, setLocation] = useLocation();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  const handleUpgrade = () => {
    onClose();
    setLocation('/pricing?entry=geoadventures');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="stop-limit-dialog">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-50 rounded-2xl">
                <MapPin className="w-8 h-8 text-amber-600" />
              </div>
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {currentStops}/{maxStops}
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            You've reached {maxStops} stops!
          </DialogTitle>
          <DialogDescription className="text-center">
            Your Free Adventure includes up to {maxStops} wonderful stops. Want to add more?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-purple-900">Upgrade to GeoQuest Explorer</span>
              </div>

              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span><strong>Unlimited stops</strong> per adventure</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Video Maker for trip memories</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Offline mode for travel days</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>All GeoGames included</span>
                </li>
              </ul>

              <div className="space-y-2 pt-3 border-t border-purple-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Monthly</span>
                  <span className="font-bold text-purple-900">{p.monthly}/mo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Annual <span className="text-green-600 font-semibold">(save 30%+)</span></span>
                  <span className="font-bold text-purple-900">{p.annual}/yr</span>
                </div>
                <div className="flex items-center justify-between text-sm bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-200">
                  <span className="text-amber-800 font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> Founding Families</span>
                  <span className="font-bold text-amber-800">{p.foundingAnnual}/yr</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Button
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  data-testid="upgrade-to-geoquest-plus"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Unlock Unlimited Stops
                </Button>

                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full text-gray-500"
                  data-testid="maybe-later-button"
                >
                  Maybe later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VideoMakerGateProps {
  isOpen: boolean;
  onClose: () => void;
  tripName?: string;
}

export function VideoMakerGate({ isOpen, onClose, tripName }: VideoMakerGateProps) {
  return (
    <UpgradePrompt
      isOpen={isOpen}
      onClose={onClose}
      feature="video_maker"
      context={tripName ? `for "${tripName}"` : undefined}
    />
  );
}

interface OfflineTravelGateProps {
  isOpen: boolean;
  onClose: () => void;
  cityName?: string;
}

export function OfflineTravelGate({ isOpen, onClose, cityName }: OfflineTravelGateProps) {
  return (
    <UpgradePrompt
      isOpen={isOpen}
      onClose={onClose}
      feature="offline_travel"
      context={cityName ? `Download ${cityName} for offline use` : undefined}
    />
  );
}

interface UpgradeBadgeProps {
  feature: FeatureGate;
  size?: 'sm' | 'md';
  className?: string;
}

export function UpgradeBadge({ feature, size = 'sm', className = '' }: UpgradeBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full font-medium ${sizeClasses} ${className}`}>
      <Lock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>GeoQuest Explorer</span>
    </span>
  );
}

interface PremiumFeatureLockProps {
  feature: FeatureGate;
  children: ReactNode;
  onUpgradeClick?: () => void;
}

export function PremiumFeatureLock({ feature, children, onUpgradeClick }: PremiumFeatureLockProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <>
      <div className="relative" onClick={handleClick}>
        <div className="opacity-60 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg cursor-pointer">
          <UpgradeBadge feature={feature} size="md" />
        </div>
      </div>

      <UpgradePrompt
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={feature}
      />
    </>
  );
}

interface TrialBannerProps {
  variant?: 'compact' | 'full';
  onDismiss?: () => void;
}

export function TrialBanner({ variant = 'full', onDismiss }: TrialBannerProps) {
  const [, setLocation] = useLocation();
  const { isTrialActive, trialDaysRemaining, tier } = useSubscription();
  const { foundingFamiliesEnabled } = useFeatureFlags();
  const [dismissed, setDismissed] = useState(false);

  if (!foundingFamiliesEnabled || !isTrialActive || tier !== 'trial' || dismissed) {
    return null;
  }

  const daysText = trialDaysRemaining === 1 ? '1 day' : `${trialDaysRemaining} days`;
  const isUrgent = trialDaysRemaining !== null && trialDaysRemaining <= 3;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    setLocation('/pricing');
  };

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center justify-between px-4 py-2 text-sm ${
          isUrgent
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
        }`}
        data-testid="trial-banner-compact"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span><strong>{daysText}</strong> left in your trial</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpgrade}
            className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-none"
            data-testid="trial-upgrade-button"
          >
            Subscribe Now
          </Button>
          {onDismiss && (
            <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded" data-testid="trial-dismiss-button">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mx-4 my-2 rounded-xl p-4 ${
        isUrgent
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200'
          : 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200'
      }`}
      data-testid="trial-banner"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isUrgent ? 'bg-amber-100' : 'bg-purple-100'}`}>
            <Clock className={`w-5 h-5 ${isUrgent ? 'text-amber-600' : 'text-purple-600'}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${isUrgent ? 'text-amber-900' : 'text-purple-900'}`}>
              {isUrgent ? 'Your trial is ending soon!' : 'Enjoying your free trial?'}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {isUrgent ? `Only ${daysText} left to explore all features` : `${daysText} remaining — keep exploring!`}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" /> Offline GeoGames
              </span>
              <span className="mx-2">•</span>
              <span className="inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" /> Free Adventure: Paris
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleUpgrade}
            className={`${
              isUrgent
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
            }`}
            data-testid="trial-subscribe-button"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Subscribe
          </Button>
          {onDismiss && (
            <button onClick={handleDismiss} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" data-testid="trial-dismiss-full-button">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface FoundingFamilyBadgeProps {
  familyNumber: number;
  variant?: 'compact' | 'full';
  className?: string;
}

export function FoundingFamilyBadge({ familyNumber, variant = 'compact', className = '' }: FoundingFamilyBadgeProps) {
  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full text-xs font-bold shadow-sm ${className}`}
        data-testid="founding-family-badge"
      >
        <Shield className="w-3 h-3" />
        <span>Founding Family #{familyNumber}</span>
      </span>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 ${className}`}
      data-testid="founding-family-card"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-amber-900">Founding Family #{familyNumber}</h3>
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
          </div>
          <p className="text-sm text-amber-700">One of our earliest supporters</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-amber-700">
          <Check className="w-3 h-3 text-green-500" />
          <span>12-month price lock</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-700">
          <Check className="w-3 h-3 text-green-500" />
          <span>Offline city included</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-700">
          <Check className="w-3 h-3 text-green-500" />
          <span>Priority support</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-700">
          <Check className="w-3 h-3 text-green-500" />
          <span>Founding badge forever</span>
        </div>
      </div>
    </div>
  );
}

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  description?: string;
}

export function ComingSoonModal({ isOpen, onClose, featureName, description }: ComingSoonModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" data-testid="coming-soon-modal">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-50 rounded-2xl">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">Coming Soon!</DialogTitle>
          <DialogDescription className="text-center">
            {description || `${featureName} is coming soon! We're working hard to bring you this exciting feature.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-amber-900">Stay Tuned!</p>
                <p className="text-sm text-amber-700">{featureName} will be available soon</p>
              </div>
            </div>
          </div>
          <Button onClick={onClose} className="w-full bg-amber-500 hover:bg-amber-600 text-white" data-testid="button-coming-soon-close">
            Got It!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FoundingFamilyStatusProps {
  priceLockExpiry: Date | null;
  freeCityName?: string;
}

export function FoundingFamilyStatus({ priceLockExpiry, freeCityName }: FoundingFamilyStatusProps) {
  const now = new Date();
  const isLocked = priceLockExpiry && priceLockExpiry > now;
  const daysUntilExpiry = priceLockExpiry
    ? Math.ceil((priceLockExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isExpiringSoon = isLocked && daysUntilExpiry <= 30;

  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-lg ${
        isExpiringSoon ? 'bg-amber-50 border border-amber-200' : isLocked ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{isLocked ? 'Price Lock Active' : 'Price Lock Expired'}</span>
          {isLocked && (
            <span className={`text-xs font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-green-600'}`}>
              {daysUntilExpiry} days left
            </span>
          )}
        </div>
        {isExpiringSoon && (
          <p className="text-xs text-amber-600 mt-1">Your founding price will expire soon. Renew to keep your special rate!</p>
        )}
      </div>
      {freeCityName && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-900">Free Offline City: {freeCityName}</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">This city is downloaded for offline access</p>
        </div>
      )}
    </div>
  );
}

type AdventureLimitType = 'explore_home' | 'travel' | 'community' | 'spots';

interface AdventureLimitGateProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue?: () => void;
  limitType: AdventureLimitType;
  cityName?: string;
}

const ADVENTURE_LIMIT_CONTENT: Record<AdventureLimitType, {
  comingSoonFeature: string;
  comingSoonDescription: string;
  pricingTitle: string;
  pricingDescription: string;
}> = {
  explore_home: {
    comingSoonFeature: 'Explore from Home Adventures',
    comingSoonDescription: 'Explore from Home adventures let you discover cities virtually from anywhere.',
    pricingTitle: 'Unlock Home Adventures',
    pricingDescription: 'Upgrade to GeoQuest Explorer to access premium content and explore every city in depth.',
  },
  travel: {
    comingSoonFeature: 'Travel Adventures',
    comingSoonDescription: 'Travel adventures let you document and explore your real-world family trips.',
    pricingTitle: 'Unlock Family Travel',
    pricingDescription: 'Upgrade to GeoQuest Explorer to access travel features and family trip planning.',
  },
  community: {
    comingSoonFeature: 'Community Adventures',
    comingSoonDescription: 'Start a fresh adventure to try another shared itinerary. More flexibility coming soon!',
    pricingTitle: 'Try More Adventures',
    pricingDescription: 'You already have an adventure. Upgrade to try more community itineraries!',
  },
  spots: {
    comingSoonFeature: 'Extra Exploration Spots',
    comingSoonDescription: 'All spots are available to explore in your adventure!',
    pricingTitle: 'Unlock More Spots',
    pricingDescription: 'All spots are available to explore in your adventure!',
  },
};

export function AdventureLimitGate({ isOpen, onClose, onContinue, limitType, cityName }: AdventureLimitGateProps) {
  const [, setLocation] = useLocation();
  const { tier, hasActiveSubscription, isAdmin } = useSubscription();
  const { foundingFamiliesEnabled } = useFeatureFlags();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;

  const content = ADVENTURE_LIMIT_CONTENT[limitType];

  useEffect(() => {
    if (isOpen && (isAdmin || hasActiveSubscription) && onContinue) {
      onContinue();
    }
  }, [isOpen, isAdmin, hasActiveSubscription, onContinue]);

  if (isAdmin || hasActiveSubscription) return null;

  if (!foundingFamiliesEnabled) {
    return (
      <ComingSoonModal
        isOpen={isOpen}
        onClose={onClose}
        featureName={content.comingSoonFeature}
        description={content.comingSoonDescription}
      />
    );
  }

  const handleUpgrade = () => {
    onClose();
    setLocation('/pricing?entry=geoadventures');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="adventure-limit-dialog">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-purple-100 to-blue-50 rounded-2xl">
                <MapPin className="w-8 h-8 text-purple-600" />
              </div>
              <div className="absolute -top-1 -right-1 bg-purple-500 text-white p-1 rounded-full">
                <Lock className="w-3 h-3" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{content.pricingTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {content.pricingDescription}
            {cityName && <span className="block mt-1 font-medium">{cityName}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-purple-900">GeoQuest Explorer</span>
              </div>

              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /><span><strong>Unlimited adventures</strong></span></li>
                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /><span>Unlimited stops per adventure</span></li>
                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /><span>Offline mode for travel</span></li>
                <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500" /><span>Video Maker for memories</span></li>
              </ul>

              <div className="space-y-1.5 pt-3 border-t border-purple-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Monthly</span>
                  <span className="font-bold text-purple-900">{p.monthly}/mo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Annual <span className="text-green-600 font-semibold">(save 30%+)</span></span>
                  <span className="font-bold text-purple-900">{p.annual}/yr</span>
                </div>
                <div className="flex items-center justify-between text-sm bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-200">
                  <span className="text-amber-800 font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> Founding Families</span>
                  <span className="font-bold text-amber-800">{p.foundingAnnual}/yr</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  data-testid="button-upgrade-adventures"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  See Plans & Get Started
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full text-gray-500" data-testid="button-maybe-later">
                  Maybe later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
