import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocation } from 'wouter';
import { Crown, Globe, Check, ArrowRight } from 'lucide-react';
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";
import { usePricing, DEFAULT_PRICING } from '@/hooks/usePricing';

interface GeoAdventuresCompleteModalProps {
  open: boolean;
  onClose: () => void;
  cityName: string;
  isFoundingEligible?: boolean;
}

export function GeoAdventuresCompleteModal({ 
  open, 
  onClose, 
  cityName, 
  isFoundingEligible = true 
}: GeoAdventuresCompleteModalProps) {
  const [, setLocation] = useLocation();
  const { data: pricing } = usePricing();
  const p = pricing || DEFAULT_PRICING;

  const handleJoinFoundingFamilies = () => {
    onClose();
    setLocation('/founding-families');
  };

  const handleExploreAnother = () => {
    onClose();
    setInternalNavToAdventures();
    setLocation('/geoadventures');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-green-50 to-white border-green-200">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl text-green-900">
            Great exploring {cityName}! 🎉
          </DialogTitle>
          <p className="text-center text-gray-600 text-sm mt-2">
            You've completed the sample content for this city.
          </p>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div
            onClick={handleJoinFoundingFamilies}
            className="rounded-xl p-4 cursor-pointer transition-all border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 hover:border-amber-400"
            data-testid="option-join-founding"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Join Founding Families</h3>
                <p className="text-sm text-amber-700">
                  Unlimited access to everything for{' '}
                  <span className="font-bold">{isFoundingEligible ? p.foundingMonthly : p.monthly}/mo</span>
                </p>
              </div>
              {isFoundingEligible && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full">
                  Best Deal
                </span>
              )}
            </div>
          </div>
          
          <div
            onClick={handleExploreAnother}
            className="rounded-xl p-4 cursor-pointer transition-all border-2 border-gray-200 bg-white hover:border-gray-300"
            data-testid="option-explore-another"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-700">Explore Another Sample</h3>
                <p className="text-sm text-gray-500">
                  Try a different city's free content
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
