import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Globe, Star, ArrowRight, X, Shield } from 'lucide-react';
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';
import { useLocation } from 'wouter';

interface SmartUpsellModalProps {
  open: boolean;
  onClose: () => void;
  purchasedCity?: string;
}

export function SmartUpsellModal({ open, onClose, purchasedCity }: SmartUpsellModalProps) {
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;
  const [, setLocation] = useLocation();

  const handleUpgrade = () => {
    onClose();
    setLocation('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-purple-50 to-white border-purple-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          data-testid="close-upsell-modal"
        >
          <X className="w-5 h-5" />
        </button>

        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl text-purple-900">
            {purchasedCity ? `Loved exploring ${purchasedCity}?` : 'Unlock the Full Adventure!'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-gray-600">
            With <span className="font-semibold text-purple-700">GeoQuest Explorer</span>, unlock unlimited cities, games, and family adventures.
          </p>

          <div className="bg-purple-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-gray-700">100+ cities with full content</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-gray-700">Unlimited GeoAdventures & Journey Packs</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-gray-700">Offline mode · All GeoGames · 7 explorer profiles</span>
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-center">
              <span className="text-white text-xs font-bold uppercase tracking-widest">Choose your plan</span>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">GeoQuest Explorer</p>
                  <p className="text-xs text-gray-500">Billed monthly</p>
                </div>
                <span className="text-lg font-black text-purple-700">{p.monthly}<span className="text-xs font-medium text-gray-400">/mo</span></span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-purple-50">
                <div>
                  <p className="text-sm font-bold text-purple-900">GeoQuest Explorer</p>
                  <p className="text-xs text-green-600 font-semibold">Save 30%+ · Best value</p>
                </div>
                <span className="text-lg font-black text-purple-700">{p.annual}<span className="text-xs font-medium text-gray-400">/yr</span></span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-500" /> Founding Families
                  </p>
                  <p className="text-xs text-amber-600 font-semibold">Early supporter · Limited spots</p>
                </div>
                <span className="text-lg font-black text-amber-700">{p.foundingAnnual}<span className="text-xs font-medium text-gray-400">/yr</span></span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
            size="lg"
            data-testid="button-upgrade-geoquest-plus"
          >
            See Plans & Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-500"
            data-testid="button-continue-browsing"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
