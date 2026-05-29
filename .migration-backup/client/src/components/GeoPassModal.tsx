import { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Check, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';
import { useSubscription } from '@/hooks/useSubscription';

interface GeoPassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeoPassModal({ isOpen, onClose }: GeoPassModalProps) {
  const [, setLocation] = useLocation();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  const { isAdmin, hasActiveSubscription } = useSubscription();

  const isBypassed = isAdmin || hasActiveSubscription;

  // Auto-dismiss if the modal somehow opens for a paid/admin user
  useEffect(() => {
    if (isOpen && isBypassed) {
      onClose();
    }
  }, [isOpen, isBypassed, onClose]);

  // Don't render anything for admin or paid users
  if (isBypassed) return null;

  const handleUpgrade = () => {
    onClose();
    setLocation('/pricing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-0" data-testid="geopass-modal">
        <div className="relative bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            data-testid="geopass-modal-close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 pt-8 pb-6 text-center">
            <div className="text-4xl mb-3">🌍</div>
            <h2 className="text-2xl font-black text-white leading-tight mb-2">
              That was fast 😄
            </h2>
            <p className="text-white/85 text-sm font-medium">
              Looks like your explorer wants to keep going.
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <ul className="space-y-2.5">
              {[
                'Unlimited games every day',
                'Flag Quiz & Map Me unlocked',
                'All 12 explorer ranks',
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-base shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
              data-testid="geopass-modal-upgrade"
            >
              Get GeoQuest Explorer — {p.annual}/year
            </button>
            <button
              onClick={handleUpgrade}
              className="w-full py-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              data-testid="geopass-modal-upgrade-monthly"
            >
              or {p.monthly}/month
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-gray-400 dark:text-gray-500 font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              data-testid="geopass-modal-dismiss"
            >
              Come back tomorrow
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
