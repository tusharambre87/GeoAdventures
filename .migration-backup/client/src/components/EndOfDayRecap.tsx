import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Globe, Play, MapPin, X } from "lucide-react";
import { getCityImage } from "@/lib/cityImages";

interface CityExplored {
  city: string;
  country: string;
  continent: string;
  timestamp: number;
}

const STORAGE_KEY = "geoquest_today_cities";
const LAST_ACTIVITY_KEY = "geoquest_last_activity_time";
const LAST_RECAP_KEY = "geoquest_last_recap_time";
const MIN_BREAK_HOURS = 2;

export function recordCityExplored(city: string, country: string, continent: string) {
  if (typeof window === 'undefined') return;
  
  const today = new Date().toDateString();
  const stored = localStorage.getItem(STORAGE_KEY);
  let data: { date: string; cities: CityExplored[] } = stored ? JSON.parse(stored) : { date: today, cities: [] };
  
  if (data.date !== today) {
    data = { date: today, cities: [] };
  }
  
  if (!data.cities.find(c => c.city === city)) {
    data.cities.push({ city, country, continent, timestamp: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  
  // Update last activity timestamp whenever a city is explored
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getTodaysCities(): CityExplored[] {
  if (typeof window === 'undefined') return [];
  
  const today = new Date().toDateString();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  const data = JSON.parse(stored);
  if (data.date !== today) return [];
  
  return data.cities || [];
}

export function shouldShowRecap(): boolean {
  if (typeof window === 'undefined') return false;
  
  const cities = getTodaysCities();
  if (cities.length === 0) return false;
  
  // Check if user has been away for MIN_BREAK_HOURS
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false; // No recorded activity, don't show
  
  const hoursSinceActivity = (Date.now() - parseInt(lastActivity, 10)) / (1000 * 60 * 60);
  if (hoursSinceActivity < MIN_BREAK_HOURS) return false; // User hasn't been away long enough
  
  // Check if we already showed a recap after this break
  const lastRecap = localStorage.getItem(LAST_RECAP_KEY);
  if (!lastRecap) return true; // Never shown a recap, show it
  
  // Only show if the recap was shown before the last activity (user played, left, returned)
  const lastRecapTime = parseInt(lastRecap, 10);
  const lastActivityTime = parseInt(lastActivity, 10);
  
  return lastRecapTime < lastActivityTime; // Show if we haven't recapped since last play session
}

export function markRecapShown() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_RECAP_KEY, String(Date.now()));
}

interface EndOfDayRecapProps {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  onGeoAdventures: () => void;
}

export function EndOfDayRecap({ open, onClose, onPlayAgain, onGeoAdventures }: EndOfDayRecapProps) {
  const [cities, setCities] = useState<CityExplored[]>([]);
  
  useEffect(() => {
    if (open) {
      setCities(getTodaysCities());
      markRecapShown();
    }
  }, [open]);
  
  if (cities.length === 0) return null;
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-gradient-to-br from-indigo-50 to-purple-50 border-4 border-indigo-300 rounded-[2rem] max-w-md p-0 overflow-hidden shadow-2xl [&>button]:hidden">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-white/20 p-3 rounded-full">
              <span className="text-4xl">🌍</span>
            </div>
          </div>
          <h2 className="text-2xl font-heading text-white mb-1">Today's Adventure Recap</h2>
          <p className="text-indigo-100">
            You explored {cities.length} {cities.length === 1 ? 'city' : 'cities'}
          </p>
        </div>
        
        <div className="p-5">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {cities.slice(0, 5).map((city, idx) => (
              <motion.div
                key={city.city}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex-shrink-0"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md border-2 border-white relative">
                  <img 
                    src={getCityImage(city.city, city.continent)} 
                    alt={city.city}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                    <span className="text-white text-[10px] font-bold truncate px-1">{city.city}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mb-4">
            <p className="text-gray-700 font-medium mb-1">
              Visiting any of these places someday?
            </p>
            <p className="text-gray-500 text-sm">
              GeoAdventures helps kids remember real trips.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={onGeoAdventures}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-full px-6 py-3 shadow-lg w-full"
              data-testid="button-recap-geoadventures"
            >
              <Globe className="mr-2 w-5 h-5" /> See GeoAdventures
            </Button>
            <Button 
              variant="ghost"
              onClick={onPlayAgain}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium rounded-full"
              data-testid="button-recap-play"
            >
              <Play className="mr-2 w-4 h-4" /> Continue exploring
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useEndOfDayRecap() {
  const [showRecap, setShowRecap] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowRecap()) {
        setShowRecap(true);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return {
    showRecap,
    closeRecap: () => setShowRecap(false),
  };
}
