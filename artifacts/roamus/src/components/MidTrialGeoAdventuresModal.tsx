import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Compass, MapPin, Camera, Sparkles, ArrowRight, X } from 'lucide-react';
import { setInternalNavToAdventures } from "@/components/GatedTravelMode";

interface MidTrialGeoAdventuresModalProps {
  open: boolean;
  onClose: () => void;
  daysRemaining: number;
}

export function MidTrialGeoAdventuresModal({ open, onClose, daysRemaining }: MidTrialGeoAdventuresModalProps) {
  const [, setLocation] = useLocation();

  const handleExploreCity = () => {
    onClose();
    setInternalNavToAdventures();
    setLocation('/geoadventures');
  };

  const handleMaybeLater = () => {
    localStorage.setItem('geoquest_mid_trial_dismissed', new Date().toISOString());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-b from-teal-50 to-white border-teal-200">
        <button
          onClick={handleMaybeLater}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          data-testid="close-mid-trial-modal"
        >
          <X className="w-5 h-5" />
        </button>
        
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <Compass className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl text-teal-900">
            Explore a City Together! 🌍
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-center text-gray-600">
            Your trial includes <span className="font-semibold text-teal-700">GeoAdventures</span> – 
            our family travel companion with curated city experiences!
          </p>
          
          <div className="bg-teal-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-sm text-gray-700">Discover local food, sounds & stories</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <Camera className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-sm text-gray-700">Create trip journals with photos</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-sm text-gray-700">Play family games anywhere</span>
            </div>
          </div>
          
          <div className="text-center bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-amber-800 font-medium text-sm">
              ⏳ {daysRemaining} days left to try all features!
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={handleExploreCity}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            size="lg"
            data-testid="button-explore-city"
          >
            Explore a City Together
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <Button
            onClick={handleMaybeLater}
            variant="ghost"
            className="w-full text-gray-500"
            data-testid="button-mid-trial-later"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
