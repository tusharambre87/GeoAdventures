import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, WifiOff, Flame, Plane, Gift, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';

interface FoundingFamiliesInvitationProps {
  open: boolean;
  onClose: () => void;
  onJoinFoundingFamilies: () => void;
  onMaybeLater: () => void;
  variant?: 'full' | 'compact';
  triggerSource?: 'game_limit' | 'daily_quest_limit' | 'stop_limit' | 'offline' | 'video' | 'story' | 'reinvite' | 'adventure_limit';
}

export function FoundingFamiliesInvitation({
  open,
  onClose,
  onJoinFoundingFamilies,
  onMaybeLater,
  variant = 'full',
  triggerSource = 'game_limit',
}: FoundingFamiliesInvitationProps) {
  const [, setLocation] = useLocation();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  const [availability, setAvailability] = useState<{
    available: boolean;
    spotsRemaining: number;
    totalCap: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetch('/api/founding-families/availability')
        .then(res => res.json())
        .then(data => setAvailability(data))
        .catch(console.error);
    }
  }, [open]);

  const benefits = [
    { icon: <Sparkles className="w-4 h-4" />, text: '14 days of full GeoGames access' },
    { icon: <WifiOff className="w-4 h-4" />, text: 'Offline play (planes, cars, anywhere)' },
    { icon: <Flame className="w-4 h-4" />, text: 'Daily Quest streaks that continue' },
    { icon: <Plane className="w-4 h-4" />, text: 'A guided GeoAdventure experience' },
    { icon: <Gift className="w-4 h-4" />, text: 'Trip planning included' },
    { icon: <Crown className="w-4 h-4" />, text: 'Founding Families badge' },
    { icon: <Star className="w-4 h-4" />, text: 'Special founding pricing (locked for 12 months)' },
  ];

  const handleJoin = () => {
    onJoinFoundingFamilies();
    setLocation('/founding-families');
  };

  const handleMaybeLater = () => {
    onMaybeLater();
    onClose();
  };

  if (variant === 'compact') {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-sm p-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Continue exploring as a Founding Family
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Unlock 14 days of full access.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleJoin}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                data-testid="button-start-free-trial"
              >
                Start Free Trial
              </Button>
              <Button
                variant="ghost"
                onClick={handleMaybeLater}
                className="text-slate-500"
                data-testid="button-not-now"
              >
                Not now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            data-testid="button-close-invitation"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">Founding Families Invitation</p>
              <h2 className="text-xl font-bold">
                You're Early — Join Our Founding Families
              </h2>
            </div>
          </div>
          
          {availability && availability.spotsRemaining <= 50 && (
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 text-sm">
              <span className="font-semibold">{availability.spotsRemaining}</span> spots remaining of {availability.totalCap}
            </div>
          )}
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-4">
            You've just explored the world with GeoQuest. We're opening access to a small group of early families helping shape the game.
          </p>

          <p className="font-semibold text-slate-800 mb-3">
            As a Founding Family, you get:
          </p>

          <ul className="space-y-2 mb-6">
            {benefits.map((benefit, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                  {benefit.icon}
                </div>
                <span className="text-slate-700">{benefit.text}</span>
              </motion.li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleJoin}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6 text-lg font-semibold"
              data-testid="button-join-founding-family"
            >
              <Crown className="w-5 h-5 mr-2" />
              Join as a Founding Family
            </Button>
            <Button
              variant="ghost"
              onClick={handleMaybeLater}
              className="text-slate-500 hover:text-slate-700"
              data-testid="button-maybe-later"
            >
              Maybe later
            </Button>
          </div>

          <p className="text-xs text-center text-slate-400 mt-4">
            Limited to the first 100 families.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TrialConfirmationModal({
  open,
  onClose,
  onStartTrial,
  onNotRightNow,
}: {
  open: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  onNotRightNow: () => void;
}) {
  const trialBenefits = [
    'Unlimited Guess & Go',
    'Daily Quest streaks',
    'Treasure Vault mini-games',
    'Offline GeoGames',
    'A guided GeoAdventure experience',
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Start Your 14-Day Founding Trial
          </h2>
          <p className="text-slate-600">
            See how GeoQuest fits into your child's daily routine — at home or on the go.
          </p>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 mb-6">
          <p className="font-semibold text-purple-900 mb-3">Your trial includes:</p>
          <ul className="space-y-2">
            {trialBenefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-purple-800">
                <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-600 flex items-center justify-center">
                  ✓
                </div>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onStartTrial}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6 text-lg font-semibold"
            data-testid="button-start-14-day-trial"
          >
            Start 14-Day Trial
          </Button>
          <Button
            variant="ghost"
            onClick={onNotRightNow}
            className="text-slate-500"
            data-testid="button-not-right-now"
          >
            Not right now
          </Button>
        </div>

        <p className="text-xs text-center text-slate-400 mt-4">
          No payment required. Trial starts today.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function GeoAdventuresCompleteModal({
  open,
  onClose,
  onBuyCity,
  onJoinFoundingFamilies,
  onExploreAnother,
  cityName = 'this city',
}: {
  open: boolean;
  onClose: () => void;
  onBuyCity: () => void;
  onJoinFoundingFamilies: () => void;
  onExploreAnother: () => void;
  cityName?: string;
}) {
  const [, setLocation] = useLocation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-teal-400 to-emerald-500 p-6 text-white">
          <h2 className="text-xl font-bold mb-1">Continue This Adventure</h2>
          <p className="text-teal-100 text-sm">Want to Explore More Like This?</p>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-6">
            You just experienced how GeoAdventures helps kids notice, remember, and talk about places.
          </p>

          <p className="font-semibold text-slate-800 mb-4">
            Choose how you'd like to continue.
          </p>

          <div className="space-y-4">
            <div className="border-2 border-teal-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800">Buy This Adventure</h3>
                <span className="font-bold text-teal-600">{p.monthly}</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">One City Adventure</p>
              <ul className="text-xs text-slate-500 mb-3 space-y-1">
                <li>• Full adventure for {cityName}</li>
                <li>• Before / During / After stops</li>
                <li>• Offline access for travel</li>
                <li>• Keepsake collected</li>
              </ul>
              <Button
                onClick={onBuyCity}
                variant="outline"
                className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
                data-testid="button-buy-city"
              >
                Buy This Adventure
              </Button>
            </div>

            <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-4 relative">
              <div className="absolute -top-2 left-4 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-2 mb-2 mt-1">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800">Explore as a Founding Family</h3>
              </div>
              <p className="text-xs text-amber-700 mb-3">Early families get more</p>
              <ul className="text-xs text-slate-600 mb-3 space-y-1">
                <li>• 14 days of full GeoGames access</li>
                <li>• Daily Quest streaks</li>
                <li>• Offline GeoGames</li>
                <li>• All GeoAdventures during trial</li>
                <li>• Trip planning included</li>
                <li>• Founding pricing (locked 12 months)</li>
              </ul>
              <Button
                onClick={() => {
                  onJoinFoundingFamilies();
                  setLocation('/founding-families');
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                data-testid="button-join-founding-families"
              >
                Join Founding Families
              </Button>
              <p className="text-xs text-center text-amber-600 mt-2">
                Limited to the first 100 families.
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={onExploreAnother}
              className="w-full text-slate-500"
              data-testid="button-explore-another"
            >
              Keep Exploring From Home
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SmartUpsellModal({
  open,
  onClose,
  onUpgrade,
  onKeepCurrent,
}: {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onKeepCurrent: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-6">
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Want More Adventures Like This?
          </h2>
          <p className="text-slate-600 text-sm">
            Families who love GeoAdventures often use GeoQuest Explorer to unlock unlimited trips, offline play, and daily games.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            onClick={onKeepCurrent}
            className="text-slate-500"
            data-testid="button-keep-adventure-only"
          >
            Keep this adventure only
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MidTrialGeoAdventuresModal({
  open,
  onClose,
  onStartAdventure,
}: {
  open: boolean;
  onClose: () => void;
  onStartAdventure: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Explore a City Together
          </h2>
          <p className="text-slate-600">
            GeoAdventures turn trips — or afternoons at home — into guided missions kids love.
          </p>
        </div>

        <div className="bg-teal-50 rounded-xl p-4 mb-6 text-center">
          <p className="text-teal-800 text-sm">
            Try a short guided adventure now.
          </p>
        </div>

        <Button
          onClick={() => {
            onStartAdventure();
            setInternalNavToAdventures();
            setLocation('/geoadventures');
          }}
          className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white py-6 text-lg font-semibold"
          data-testid="button-start-geoadventure"
        >
          <Plane className="w-5 h-5 mr-2" />
          Start GeoAdventure
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function TrialEndPlanSelectionModal({
  open,
  onClose,
  onSelectPlan,
}: {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'geoquest_explorer' | 'founding') => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" hideCloseButton>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-6 text-white text-center">
          <h2 className="text-2xl font-bold mb-1">Keep Exploring With Your Family</h2>
          <p className="text-purple-100">Choose the plan that fits your family's adventure style.</p>
        </div>

        <div className="p-6">
          <div className="grid gap-4">
            <div className="border-2 border-purple-300 bg-purple-50 rounded-xl p-5 relative">
              <div className="absolute -top-2 right-4 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                MOST POPULAR
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">GeoQuest Explorer</h3>
                  <p className="text-sm text-slate-500">The complete geography learning experience.</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold text-purple-700">{p.monthly}</span>
                <span className="text-slate-500">/month</span>
                <span className="text-sm text-slate-400 ml-2">or {p.annual}/year</span>
              </div>
              <ul className="text-sm text-slate-600 mb-4 space-y-1">
                <li>• All GeoGames modes unlocked</li>
                <li>• Flag Quiz & Map Me mastery</li>
                <li>• Unlimited adventures & ranks</li>
                <li>• Weekly parent reports</li>
              </ul>
            </div>

            <div className="border-2 border-amber-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Founding Families</h3>
                  <p className="text-sm text-slate-500">Special pricing for our earliest supporters.</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold text-slate-800">{p.foundingMonthly}</span>
                <span className="text-slate-500">/month</span>
                <span className="text-sm text-slate-400 ml-2">or {p.foundingAnnual}/year</span>
              </div>
              <ul className="text-sm text-slate-600 mb-4 space-y-1">
                <li>• Everything in GeoQuest Explorer</li>
                <li>• Locked-in pricing for 12 months</li>
                <li>• Founding Family badge forever</li>
                <li>• Limited to first 100 families</li>
              </ul>
              <Button
                onClick={() => {
                  onSelectPlan('founding');
                  setLocation('/founding-families');
                }}
                variant="outline"
                className="w-full"
                data-testid="button-choose-founding"
              >
                Join Founding Families
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
