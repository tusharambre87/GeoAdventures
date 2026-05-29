import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Map, Volume2, VolumeX, Lightbulb, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserHeader } from "@/components/UserHeader";
import { LOCATION_CARDS } from "@/lib/gameData";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";
import { CITY_FACTS } from "@/lib/cityFacts";
import { getCityImage } from "@/lib/cityImages";
import { getCityMapUrl } from "@/lib/cityMaps";
import { soundManager } from "@/lib/sound";
import bgImage from "@assets/generated_images/playful_hand-drawn_world_adventure_map_pattern.png";

export default function Explore() {
  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [exploreMapVisible, setExploreMapVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentCity = ALL_PASSPORT_CITIES[selectedCityIndex];

  const nextCity = () => {
    setSelectedCityIndex((prev) => (prev + 1) % ALL_PASSPORT_CITIES.length);
    setExploreMapVisible(false);
  };

  const prevCity = () => {
    setSelectedCityIndex((prev) => (prev - 1 + ALL_PASSPORT_CITIES.length) % ALL_PASSPORT_CITIES.length);
    setExploreMapVisible(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: `url(${bgImage})`, backgroundSize: '400px', backgroundRepeat: 'repeat' }}
      />
      
      <UserHeader />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center pt-20 p-4">
        <Link href="/knowledge-hub">
          <Button
            variant="ghost"
            className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full"
            data-testid="button-back-to-knowledge-hub"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
        </Link>
        
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-heading text-white drop-shadow-lg mb-8"
        >
          World Gallery
        </motion.h2>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 md:gap-8 w-full max-w-6xl justify-center"
        >
          <Button 
            size="icon" 
            className="rounded-full h-12 w-12 md:h-16 md:w-16 bg-white/20 hover:bg-white/40 backdrop-blur border-2 border-white" 
            onClick={prevCity}
            data-testid="button-prev-city"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </Button>

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentCity.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 max-w-md bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-2xl transition-transform duration-500"
            >
              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4 overflow-hidden relative group">
                <img 
                  src={getCityImage(currentCity.city, currentCity.continent)} 
                  alt={currentCity.city} 
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                  <span className="text-white font-bold text-lg">{currentCity.continent}</span>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-2xl md:text-3xl font-heading text-gray-800 dark:text-gray-100">{currentCity.city}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">{currentCity.country}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <Button 
            size="icon" 
            className="rounded-full h-12 w-12 md:h-16 md:w-16 bg-white/20 hover:bg-white/40 backdrop-blur border-2 border-white" 
            onClick={nextCity}
            data-testid="button-next-city"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </Button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 md:p-6 rounded-2xl max-w-2xl w-full text-center overflow-y-auto max-h-[50vh] md:max-h-none"
        >
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Did you know?</h3>
          <p className="text-lg md:text-xl font-hand text-gray-700 dark:text-gray-200 mb-4">
            "{CITY_FACTS[currentCity.city]?.geography || currentCity.clues[0]}"
          </p>
          
          {CITY_FACTS[currentCity.city]?.tryIt && (
            <div 
              className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 inline-flex items-center gap-3 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
              onClick={() => {
                if (isSpeaking) {
                  soundManager.stopSpeaking();
                  setIsSpeaking(false);
                } else {
                  soundManager.speak(CITY_FACTS[currentCity.city].tryIt);
                  setIsSpeaking(true);
                }
              }}
              data-testid="button-try-it"
            >
              <div className="bg-blue-500 text-white rounded-full p-2">
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-blue-400">Try it!</p>
                <p className="text-blue-800 dark:text-blue-300 font-bold leading-tight">{CITY_FACTS[currentCity.city].tryIt}</p>
              </div>
            </div>
          )}

          {CITY_FACTS[currentCity.city]?.funFact && (
            <div className="mt-4 bg-purple-50 dark:bg-purple-900/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-800 text-center">
              <h4 className="font-bold text-purple-800 dark:text-purple-300 uppercase text-sm mb-1 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 mr-2 fill-purple-500" /> Weird Fact!
              </h4>
              <p className="text-purple-900 dark:text-purple-200 font-medium italic">
                "{CITY_FACTS[currentCity.city].funFact}"
              </p>
            </div>
          )}

          <div className="mt-4 bg-green-50 dark:bg-green-900/30 p-4 rounded-2xl border border-green-200 dark:border-green-800 text-center">
            <h4 className="font-bold text-green-800 dark:text-green-300 uppercase text-sm mb-2 flex items-center justify-center">
              <Map className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" /> Map It!
            </h4>
            
            {!exploreMapVisible ? (
              <Button 
                onClick={() => setExploreMapVisible(true)}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-md w-full font-bold"
                data-testid="button-reveal-map"
              >
                Reveal Map 🗺️
              </Button>
            ) : (
              <div className="w-full bg-white dark:bg-gray-700 rounded-xl overflow-hidden border-2 border-green-100 dark:border-green-800 p-2 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                <img 
                  src={getCityMapUrl(currentCity.city, currentCity.country)} 
                  alt={`Map of ${currentCity.country}`}
                  className="w-full h-auto max-h-[200px] md:max-h-[300px] object-contain" 
                />
              </div>
            )}
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <p className="text-white/70 text-sm">
            City {selectedCityIndex + 1} of {ALL_PASSPORT_CITIES.length}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
