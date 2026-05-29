import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Crown, Compass, Globe, Check, Star, Sparkles, ArrowRight, Heart } from 'lucide-react';
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';

interface TrialEndPlanSelectionModalProps {
  open: boolean;
  onClose: () => void;
  isFoundingEligible?: boolean;
}

export function TrialEndPlanSelectionModal({ open, onClose, isFoundingEligible = true }: TrialEndPlanSelectionModalProps) {
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<'geoquest_explorer' | 'founding'>('geoquest_explorer');
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;

  const handleContinue = () => {
    if (selectedPlan === 'founding') {
      setLocation('/founding-families');
    } else {
      setLocation('/');
    }
    onClose();
  };

  const plans = [
    {
      id: 'geoquest_explorer' as const,
      name: 'GeoQuest Explorer',
      price: p.monthly,
      period: '/month',
      icon: <Compass className="w-6 h-6" />,
      badge: 'Most Popular',
      features: [
        'All GeoGames modes unlocked',
        'Flag Quiz & Map Me mastery',
        'Unlimited mini-games & adventures',
        'All explorer ranks',
      ],
      highlight: true,
    },
    {
      id: 'founding' as const,
      name: 'Founding Families',
      price: isFoundingEligible ? p.foundingMonthly : p.monthly,
      originalPrice: isFoundingEligible ? p.monthly : undefined,
      period: '/month',
      icon: <Heart className="w-6 h-6" />,
      badge: isFoundingEligible ? 'Special Pricing!' : undefined,
      features: [
        'Everything in GeoQuest Explorer',
        'Locked-in pricing for 12 months',
        'Founding Family badge forever',
        `Limited to first ${p.foundingCap} families`,
      ],
      highlight: false,
    },
  ];

  const handleDismiss = () => {
    localStorage.setItem('geoquest_trial_end_dismissed', new Date().toISOString());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="max-w-lg bg-gradient-to-b from-purple-50 to-white border-purple-200">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl text-purple-900">
            Your Trial Has Ended
          </DialogTitle>
          <p className="text-center text-gray-600 text-sm mt-2">
            Choose a plan to continue your family's geography adventure!
          </p>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-xl p-4 cursor-pointer transition-all border-2 ${
                selectedPlan === plan.id
                  ? plan.highlight
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              data-testid={`plan-option-${plan.id}`}
            >
              {plan.badge && (
                <span className={`absolute -top-2 right-4 px-2 py-0.5 text-xs font-medium rounded-full ${
                  plan.highlight 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-amber-500 text-white'
                }`}>
                  {plan.badge}
                </span>
              )}
              
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  plan.highlight ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {plan.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <div className="text-right">
                      {plan.originalPrice && (
                        <span className="text-sm text-gray-400 line-through mr-1">{plan.originalPrice}</span>
                      )}
                      <span className="font-bold text-lg">{plan.price}</span>
                      <span className="text-sm text-gray-500">{plan.period}</span>
                    </div>
                  </div>
                  
                  <ul className="mt-2 space-y-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="space-y-2 pb-2">
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 h-12"
            data-testid="button-continue-plan"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            Continue with {selectedPlan === 'founding' ? 'Founding Families' : 'GeoQuest Explorer'}
          </Button>
          <button
            onClick={handleDismiss}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
            data-testid="button-dismiss-trial-end"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
