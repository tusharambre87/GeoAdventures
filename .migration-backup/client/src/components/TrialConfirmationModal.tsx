import { useState } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Check, Calendar, Shield, Gift, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useUser } from '@/lib/userContext';
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';

interface TrialConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onStartTrial?: () => void;
}

export function TrialConfirmationModal({
  open,
  onClose,
  onStartTrial,
}: TrialConfirmationModalProps) {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  const [isLoading, setIsLoading] = useState(false);

  const trialBenefits = [
    { icon: <Sparkles className="w-4 h-4" />, text: '14 days of full GeoGames access' },
    { icon: <Gift className="w-4 h-4" />, text: 'Offline play on planes, cars, anywhere' },
    { icon: <Calendar className="w-4 h-4" />, text: 'Daily Quest streaks that continue' },
    { icon: <Crown className="w-4 h-4" />, text: 'Guided GeoAdventure included' },
    { icon: <Shield className="w-4 h-4" />, text: 'Cancel anytime, no questions asked' },
  ];

  const handleStartTrial = async () => {
    if (!user) {
      onClose();
      setLocation('/login?redirect=/founding-families');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/founding-families/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Your 14-day Founding Trial has started!');
        onStartTrial?.();
        onClose();
        setLocation('/');
      } else if (data.requiresPayment) {
        const checkoutResponse = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            priceId: 'price_founding_monthly',
            isFoundingFamily: true,
            trialDays: 14,
          }),
          credentials: 'include',
        });

        const checkoutData = await checkoutResponse.json();
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
        } else {
          toast.error(checkoutData.error || 'Failed to start checkout');
        }
      } else {
        toast.error(data.error || 'Failed to start trial');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-b from-amber-50 to-white" data-testid="trial-confirmation-modal">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Crown className="w-8 h-8 text-white" />
          </motion.div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Start Your 14-Day Founding Trial
            </DialogTitle>
          </DialogHeader>
          <p className="text-amber-100 text-sm mt-2">
            No credit card needed to start exploring
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3">
            {trialBenefits.map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0">
                  {benefit.icon}
                </div>
                <span className="text-slate-700">{benefit.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-700 mb-1">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">After your trial</span>
            </div>
            <p className="text-sm text-amber-600">
              Only <span className="font-bold">{p.foundingMonthly}/month</span> locked for 12 months
            </p>
            <p className="text-xs text-amber-500 mt-1">
              (Regular price {p.monthly}/month)
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleStartTrial}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 text-lg rounded-xl shadow-lg"
              data-testid="start-trial-button"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start My Free Trial
                </>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              By starting your trial, you agree to our Terms of Service.
              <br />Cancel anytime during or after your trial.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
