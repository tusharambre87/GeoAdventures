import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { differenceInDays, differenceInHours, isBefore, startOfDay } from "date-fns";
import { type TravelTrip, type TravelStop } from "@shared/schema";

interface TripCountdownProps {
  trip: TravelTrip;
}

export function TripCountdown({ trip }: TripCountdownProps) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const tripDate = useMemo(() => {
    if (trip.startDate) return new Date(trip.startDate);
    if (trip.travelMonth && trip.travelYear) {
      return new Date(trip.travelYear, trip.travelMonth - 1, 1);
    }
    return null;
  }, [trip.startDate, trip.travelMonth, trip.travelYear]);
  
  if (!tripDate || !isBefore(now, tripDate)) return null;
  
  const daysUntil = differenceInDays(startOfDay(tripDate), startOfDay(now));
  const hoursUntil = differenceInHours(tripDate, now) % 24;
  
  if (daysUntil < 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mb-4"
    >
      <Card className="bg-gradient-to-r from-amber-100 via-orange-100 to-pink-100 dark:from-amber-900/30 dark:via-orange-900/30 dark:to-pink-900/30 border-2 border-amber-300 dark:border-amber-700 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-4xl"
            >
              ⏰
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Adventure countdown!
              </p>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={daysUntil}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-orange-600 dark:text-orange-400"
                >
                  {daysUntil}
                </motion.span>
                <span className="text-lg text-orange-600 dark:text-orange-400">
                  {daysUntil === 1 ? "day" : "days"}
                </span>
                {daysUntil < 7 && (
                  <>
                    <span className="text-xl font-bold text-orange-500">{hoursUntil}</span>
                    <span className="text-sm text-orange-500">hrs</span>
                  </>
                )}
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-3xl"
            >
              🎒
            </motion.div>
          </div>
          {daysUntil <= 3 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm mt-2 font-medium text-pink-600 dark:text-pink-400"
            >
              {daysUntil === 0 ? "✨ It's almost time! Get ready!" : "🎉 So close! Are you excited?"}
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Actual keepsake/artifact data for each stop - matches BIG_ISLAND_ARTIFACTS
// Exported for use in trip cards and other components
export const STOP_KEEPSAKES: Record<string, { name: string; emoji: string; color: string }[]> = {
  "Volcanoes National Park": [
    { name: "Lava Crystal", emoji: "🔮", color: "from-purple-400 to-purple-600" },
    { name: "Pele's Fire Stone", emoji: "🔥", color: "from-orange-400 to-red-500" },
  ],
  "Mauna Kea Summit": [
    { name: "Stargazer Lens", emoji: "🔭", color: "from-indigo-400 to-blue-500" },
  ],
  "Akaka Falls": [
    { name: "Waterfall Mist Bottle", emoji: "💧", color: "from-cyan-400 to-blue-400" },
  ],
  "Punalu'u Black Sand Beach": [
    { name: "Honu Charm", emoji: "🐢", color: "from-green-400 to-teal-500" },
    { name: "Black Sand Sample", emoji: "⬛", color: "from-slate-500 to-slate-700" },
  ],
  "Kona Town": [
    { name: "Kona Coffee Bean", emoji: "☕", color: "from-amber-600 to-amber-800" },
    { name: "Humuhumunukunukuapua'a Badge", emoji: "🐠", color: "from-blue-400 to-cyan-500" },
  ],
  "Waipio Valley": [
    { name: "Taro Root", emoji: "🥔", color: "from-purple-300 to-purple-500" },
    { name: "Ancient Poi Bowl", emoji: "🥣", color: "from-amber-400 to-amber-600" },
  ],
  "Kealakekua Bay": [
    { name: "Captain Cook's Compass", emoji: "🧭", color: "from-teal-400 to-emerald-500" },
    { name: "Dolphin Whistle", emoji: "🐬", color: "from-sky-400 to-blue-500" },
  ],
  "Hilo Farmers Market": [
    { name: "Tropical Fruit Basket", emoji: "🍍", color: "from-yellow-400 to-amber-500" },
    { name: "Lei Flower", emoji: "🌺", color: "from-pink-400 to-rose-500" },
  ],
  "Rainbow Falls": [
    { name: "Rainbow Prism", emoji: "🌈", color: "from-red-400 via-yellow-400 to-blue-400" },
  ],
  "Hapuna Beach": [
    { name: "Golden Sand Shell", emoji: "🐚", color: "from-amber-300 to-amber-500" },
    { name: "Ocean Wave Vial", emoji: "🌊", color: "from-blue-400 to-cyan-500" },
  ],
  "Naniloa Grand Hilton": [
    { name: "Aloha Welcome Lei", emoji: "🌺", color: "from-pink-400 to-rose-500" },
  ],
  // Additional Hawaii stops
  "Lava Loha Chocolate Farm": [
    { name: "Chocolate Truffle", emoji: "🍫", color: "from-amber-700 to-amber-900" },
  ],
  "Chocolate farm Tour": [
    { name: "Cacao Pod", emoji: "🌰", color: "from-amber-600 to-amber-800" },
  ],
  "Nāhuku Lava Tube": [
    { name: "Lava Tube Stone", emoji: "🪨", color: "from-gray-600 to-gray-800" },
  ],
  "Whale Watching": [
    { name: "Whale Tail Token", emoji: "🐋", color: "from-blue-400 to-blue-600" },
  ],
  "Boiling pots": [
    { name: "Hot Springs Vial", emoji: "♨️", color: "from-orange-400 to-red-500" },
  ],
  "Kaloko-Honokōhau National Historical Park": [
    { name: "Fishpond Token", emoji: "🐠", color: "from-teal-400 to-teal-600" },
  ],
  "Pu'uhonua O Honaunau National Historical Park": [
    { name: "Ki'i Statue Charm", emoji: "🗿", color: "from-amber-500 to-amber-700" },
  ],
  "Ho'okena Beach Park": [
    { name: "Gray Sand Shell", emoji: "🐚", color: "from-gray-300 to-gray-500" },
  ],
  "Greenwell coffee farm": [
    { name: "Kona Coffee Cherry", emoji: "☕", color: "from-red-400 to-red-600" },
  ],
  "Kona Forest Cloud Sanctuary": [
    { name: "Cloud Forest Leaf", emoji: "🌿", color: "from-green-400 to-emerald-600" },
  ],
  "Eiffel Tower": [
    { name: "Iron Tower Charm", emoji: "🗼", color: "from-slate-400 to-slate-600" },
  ],
  "Louvre Museum": [
    { name: "Mona Lisa Postcard", emoji: "🖼️", color: "from-amber-400 to-amber-600" },
  ],
  "Notre-Dame Cathedral": [
    { name: "Cathedral Bell", emoji: "🔔", color: "from-yellow-400 to-amber-500" },
  ],
  // Sydney keepsakes
  "Sydney Opera House": [
    { name: "Opera Shell", emoji: "🐚", color: "from-white via-gray-100 to-gray-200" },
  ],
  "Sydney Harbour Bridge": [
    { name: "Bridge Climb Badge", emoji: "🌉", color: "from-gray-400 to-slate-600" },
  ],
  "Bondi Beach": [
    { name: "Beach Wave Charm", emoji: "🏄", color: "from-cyan-400 to-blue-500" },
  ],
  "Taronga Zoo": [
    { name: "Koala Plush", emoji: "🐨", color: "from-gray-300 to-gray-500" },
  ],
  "The Rocks": [
    { name: "Convict Brick", emoji: "🧱", color: "from-amber-600 to-red-700" },
  ],
  "Darling Harbour": [
    { name: "Harbour Star", emoji: "⭐", color: "from-yellow-400 to-amber-500" },
  ],
  "Royal Botanic Garden": [
    { name: "Rare Flower", emoji: "🌸", color: "from-pink-300 to-pink-500" },
  ],
  "Blue Mountains": [
    { name: "Three Sisters Stone", emoji: "🏔️", color: "from-blue-400 to-indigo-500" },
  ],
  "Manly Beach": [
    { name: "Ferry Token", emoji: "⛴️", color: "from-blue-300 to-blue-500" },
  ],
  "Sydney Tower Eye": [
    { name: "Sky View Lens", emoji: "🔭", color: "from-sky-400 to-blue-600" },
  ],
};

export const DEFAULT_KEEPSAKE = { name: "Travel Memory", emoji: "🏆", color: "from-yellow-400 to-amber-500" };

// Exported for use in trip cards - returns unique keepsake for a stop
export function getKeepsakeForStop(stopName: string, stopType: string, index: number) {
  const stopKeepsakes = STOP_KEEPSAKES[stopName];
  if (stopKeepsakes && stopKeepsakes.length > 0) {
    return stopKeepsakes[0]; // Return the first keepsake for display
  }
  return DEFAULT_KEEPSAKE;
}

interface TravelKeepsakesProps {
  stops: TravelStop[];
}

export function TravelKeepsakes({ stops }: TravelKeepsakesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check visited stops - each visited stop earns a keepsake
  // Also check journeyPackCompleted flag and localStorage for backwards compatibility
  const completedStops = stops.filter(s => {
    // Visited stops count as having earned a keepsake
    if (s.isVisited) return true;
    
    // Check backend journeyPackCompleted flag
    if ((s as any).journeyPackCompleted) return true;
    
    // Fallback to localStorage for recent completions not yet synced
    try {
      const saved = localStorage.getItem(`journeypack-progress-${s.id}`);
      if (!saved) return false;
      const completedSections = JSON.parse(saved);
      return Array.isArray(completedSections) && completedSections.length >= 4;
    } catch {
      return false;
    }
  });
  
  if (stops.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between"
            data-testid="button-toggle-keepsakes"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-3xl"
              >
                🏆
              </motion.div>
              <div className="text-left">
                <p className="font-bold text-purple-800 dark:text-purple-300">Travel Keepsakes</p>
                <p className="text-xs text-muted-foreground">
                  {completedStops.length} of {stops.length} collected
                </p>
              </div>
            </div>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {stops.map((stop, idx) => {
                    const keepsake = getKeepsakeForStop(stop.name, stop.stopType || '', idx);
                    const isEarned = completedStops.some(s => s.id === stop.id);
                    
                    return (
                      <motion.div
                        key={stop.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative"
                      >
                        <div
                          className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl ${
                            isEarned
                              ? `bg-gradient-to-br ${keepsake.color} shadow-lg`
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        >
                          {isEarned ? (
                            <motion.span
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ repeat: Infinity, duration: 2, delay: idx * 0.2 }}
                            >
                              {keepsake.emoji}
                            </motion.span>
                          ) : (
                            <span className="opacity-30">❓</span>
                          )}
                        </div>
                        <p className="text-[10px] text-center mt-1 truncate text-muted-foreground">
                          {isEarned ? keepsake.name.split(' ')[0] : '???'}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Complete Journey Packs to earn keepsakes!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!isExpanded && (
            <div className="flex gap-1 mt-2 justify-center">
              {stops.slice(0, 6).map((stop, idx) => {
                const keepsake = getKeepsakeForStop(stop.name, stop.stopType || '', idx);
                const isEarned = completedStops.some(s => s.id === stop.id);
                return (
                  <div
                    key={stop.id}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isEarned ? `bg-gradient-to-br ${keepsake.color}` : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span className={isEarned ? '' : 'opacity-30'}>
                      {isEarned ? keepsake.emoji : '❓'}
                    </span>
                  </div>
                );
              })}
              {stops.length > 6 && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                  +{stops.length - 6}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

const DESTINATION_FACTS: Record<string, string[]> = {
  "saint louis": [
    "The Gateway Arch in St. Louis is the tallest man-made monument in the United States at 630 feet!",
    "St. Louis was the starting point for the Lewis and Clark expedition in 1804!",
    "The ice cream cone was popularized at the 1904 World's Fair in St. Louis!",
    "Forest Park in St. Louis is bigger than Central Park in New York City!",
    "The St. Louis Zoo is one of the few free zoos in the United States!",
    "St. Louis is named after King Louis IX of France!",
    "The first kindergarten in the United States was opened in St. Louis in 1873!",
    "St. Louis is known as the 'Gateway to the West'!",
  ],
  "st. louis": [
    "The Gateway Arch in St. Louis is the tallest man-made monument in the United States at 630 feet!",
    "St. Louis was the starting point for the Lewis and Clark expedition in 1804!",
    "The ice cream cone was popularized at the 1904 World's Fair in St. Louis!",
    "Forest Park in St. Louis is bigger than Central Park in New York City!",
    "The St. Louis Zoo is one of the few free zoos in the United States!",
    "St. Louis is named after King Louis IX of France!",
    "The first kindergarten in the United States was opened in St. Louis in 1873!",
    "St. Louis is known as the 'Gateway to the West'!",
  ],
  "st louis": [
    "The Gateway Arch in St. Louis is the tallest man-made monument in the United States at 630 feet!",
    "St. Louis was the starting point for the Lewis and Clark expedition in 1804!",
    "The ice cream cone was popularized at the 1904 World's Fair in St. Louis!",
    "Forest Park in St. Louis is bigger than Central Park in New York City!",
    "The St. Louis Zoo is one of the few free zoos in the United States!",
    "St. Louis is named after King Louis IX of France!",
    "The first kindergarten in the United States was opened in St. Louis in 1873!",
    "St. Louis is known as the 'Gateway to the West'!",
  ],
  "big island": [
    "The Big Island is the youngest and largest Hawaiian island!",
    "Kilauea volcano on Big Island has been erupting for over 40 years!",
    "Black sand beaches are made from lava cooled by the ocean!",
    "Mauna Kea on Big Island is taller than Mount Everest from base to peak!",
    "The Big Island grows by about 42 acres each year from lava!",
    "Green sea turtles called 'honu' swim along Big Island beaches!",
    "Coffee beans grow on the slopes of Mauna Loa volcano!",
    "The Big Island has 11 of the world's 13 climate zones!",
    "Manta rays with 15-foot wingspans glide through Big Island waters!",
    "Hawaii Volcanoes National Park is a UNESCO World Heritage Site!",
    "The ancient Hawaiians built temples called 'heiau' on the Big Island!",
    "Pele, the fire goddess, is said to live in Kilauea volcano!",
  ],
  hawaii: [
    "Hawaii is the only US state made entirely of islands!",
    "The Hawaiian alphabet has only 12 letters!",
    "Hawaii has its own time zone and never changes for daylight saving!",
    "Mauna Kea is taller than Mount Everest from base to peak!",
    "Hawaii is home to the world's most active volcano, Kilauea!",
    "The state fish is called the humuhumunukunukuapua'a!",
    "Rainbow-colored eucalyptus trees grow in Hawaii!",
    "Hawaii grows most of America's macadamia nuts and coffee!",
    "Hawaii is the most isolated island chain in the world!",
    "The Hawaiian Islands were formed by underwater volcanoes!",
  ],
  sydney: [
    "The Sydney Opera House took 16 years to build!",
    "Sydney Harbour Bridge is nicknamed 'The Coathanger' because of its shape!",
    "Sydney has over 100 beaches within the city limits!",
    "The Sydney Opera House has over 1 million roof tiles!",
    "Sydney is home to the world's largest natural harbour!",
    "Taronga Zoo in Sydney has over 4,000 animals!",
    "The Blue Mountains near Sydney have eucalyptus trees that make a blue haze!",
    "Sydney was the first city in Australia to have electricity!",
    "Bondi Beach in Sydney is one of the most famous beaches in the world!",
    "Sydney Harbour is home to fairy penguins!",
  ],
  australia: [
    "Australia is the only country that is also a continent!",
    "Kangaroos can only hop forward, never backward!",
    "Australia has more than 10,000 beaches!",
    "The Great Barrier Reef is so big it can be seen from space!",
    "Koalas sleep up to 22 hours a day!",
    "Australia has over 140 species of snakes!",
    "The platypus is one of only two mammals that lay eggs!",
    "Australia's Uluru changes color throughout the day!",
    "Wombat poop is cube-shaped!",
    "Australia is wider than the moon!",
  ],
  japan: [
    "Japan has more than 6,800 islands!",
    "Vending machines in Japan sell everything, even umbrellas!",
    "Japan has square watermelons!",
    "The world's oldest company started in Japan in 578 AD!",
    "There's an island in Japan full of friendly rabbits!",
  ],
  france: [
    "The Eiffel Tower grows about 6 inches in summer from heat!",
    "France has 12 different time zones - more than any country!",
    "French people eat 30,000 tons of snails every year!",
    "The Louvre Museum has over 35,000 artworks!",
  ],
  italy: [
    "Italy has more UNESCO World Heritage Sites than any country!",
    "The first pizza was made in Naples, Italy!",
    "Venice has over 400 bridges!",
    "Italians invented the thermometer, piano, and eyeglasses!",
  ],
  singapore: [
    "Singapore is one of the smallest countries in the world - you can drive across it in 45 minutes!",
    "Marina Bay Sands has an infinity pool 57 stories high!",
    "Singapore has over 3 million trees and is called the 'Garden City'!",
    "The Singapore Zoo has over 2,800 animals from 300 species!",
    "Singapore's Changi Airport has a 40-meter indoor waterfall!",
    "Chewing gum is banned in Singapore except for medical purposes!",
    "Singapore has four official languages: English, Mandarin, Malay, and Tamil!",
    "Gardens by the Bay's Supertrees are up to 50 meters tall!",
    "Singapore is one of the cleanest cities in the world!",
    "The Merlion is Singapore's mascot - half lion, half fish!",
    "Singapore was founded in 1819 by Sir Stamford Raffles!",
    "Sentosa Island was once used for military defense!",
  ],
  london: [
    "Big Ben is actually the name of the bell, not the tower!",
    "London has over 170 museums, and many are free!",
    "The Tower of London has ravens that are protected by law!",
    "The London Underground is the oldest metro system in the world!",
    "Buckingham Palace has 775 rooms!",
    "London Bridge is not the one with towers - that's Tower Bridge!",
  ],
  "new york": [
    "The Statue of Liberty was a gift from France!",
    "Central Park is bigger than some small countries!",
    "New York City has over 800 languages spoken!",
    "The Empire State Building has its own zip code!",
    "There are more than 13,000 yellow taxis in New York City!",
    "Times Square is named after the New York Times newspaper!",
  ],
  paris: [
    "The Eiffel Tower has 1,665 steps to the top!",
    "Paris has more dogs than children!",
    "The Louvre is the world's largest art museum!",
    "Paris was originally a Roman city called Lutetia!",
    "There are over 470 parks and gardens in Paris!",
  ],
  thailand: [
    "Thailand is the only Southeast Asian country never colonized by Europeans!",
    "Bangkok's full ceremonial name has 169 characters!",
    "Thailand is home to the world's smallest mammal - the bumblebee bat!",
    "Thai people celebrate New Year three times a year!",
    "There are over 35,000 temples in Thailand!",
  ],
  china: [
    "The Great Wall of China is over 13,000 miles long!",
    "China invented paper, printing, gunpowder, and the compass!",
    "Pandas are found wild only in China!",
    "The Forbidden City has 9,999 rooms!",
    "Chinese New Year celebrations last for 15 days!",
  ],
  india: [
    "India invented chess and the number zero!",
    "The Taj Mahal took 22 years to build!",
    "India has over 22 official languages!",
    "Holi, the festival of colors, is celebrated across India!",
    "India is home to the world's largest democracy!",
  ],
  default: [
    "Every country has its own unique traditions and customs!",
    "Traveling helps us learn new languages and make friends!",
    "The world has 195 countries to explore!",
    "Over 7,000 languages are spoken around the world!",
    "Every place has special foods you can't find anywhere else!",
  ],
};

function getFactsForDestination(destination: string, city?: string | null, country?: string | null): string[] {
  const searchTerms = [
    city?.toLowerCase().trim(),
    country?.toLowerCase().trim(),
    destination?.toLowerCase().trim()
  ].filter(Boolean) as string[];
  
  for (const term of searchTerms) {
    for (const [key, facts] of Object.entries(DESTINATION_FACTS)) {
      if (key === 'default') continue;
      if (term.includes(key) || key.includes(term)) return facts;
    }
  }
  
  const placeName = city || destination?.split(",")[0]?.trim() || country || "this place";
  return [
    `${placeName} has its own unique traditions and local customs waiting to be discovered!`,
    `The food in ${placeName} tells the story of its history and culture!`,
    `People in ${placeName} have celebrations and festivals that are unlike anywhere else!`,
    `${placeName} has hidden gems and secret spots that only locals know about!`,
    `The history of ${placeName} goes back further than you might think!`,
  ];
}

interface DidYouKnowProps {
  destination: string;
  city?: string | null;
  country?: string | null;
  variant?: "card" | "overlay";
}

export function DidYouKnow({ destination, city, country, variant = "card" }: DidYouKnowProps) {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  
  const facts = useMemo(() => getFactsForDestination(destination, city, country), [destination, city, country]);
  
  const nextFact = () => {
    setCurrentFactIndex((prev) => (prev + 1) % facts.length);
  };
  
  if (!isVisible) return null;

  if (variant === "overlay") {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={nextFact}
        className="text-white/90 text-sm mt-2 leading-relaxed cursor-pointer"
        data-testid="text-did-you-know-overlay"
      >
        {facts[currentFactIndex]}
      </motion.p>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="mb-4"
    >
      <Card className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 overflow-hidden">
        <CardContent className="p-4 relative">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 p-1 hover:bg-yellow-200/50 rounded-full"
            data-testid="button-dismiss-funfact"
          >
            <X className="w-4 h-4 text-yellow-600" />
          </button>
          
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-3xl mt-1"
            >
              💡
            </motion.div>
            <div className="flex-1 pr-6">
              <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-1">
                Did You Know?
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentFactIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm text-yellow-900 dark:text-yellow-200"
                >
                  {facts[currentFactIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1">
              {facts.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentFactIndex ? 'bg-yellow-500' : 'bg-yellow-300 dark:bg-yellow-700'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextFact}
              className="text-yellow-700 hover:text-yellow-800 hover:bg-yellow-200/50 gap-1"
              data-testid="button-next-funfact"
            >
              <Sparkles className="w-4 h-4" />
              Another fact!
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const DEFAULT_PACKING_ITEMS = [
  { id: "passport", label: "Passport / ID", emoji: "🛂" },
  { id: "clothes", label: "Clothes for the adventure", emoji: "👕" },
  { id: "toothbrush", label: "Toothbrush & toothpaste", emoji: "🪥" },
  { id: "sunscreen", label: "Sunscreen", emoji: "🧴" },
  { id: "camera", label: "Camera or phone", emoji: "📷" },
  { id: "snacks", label: "Favorite snacks", emoji: "🍪" },
  { id: "water", label: "Water bottle", emoji: "💧" },
  { id: "toy", label: "Comfort toy or book", emoji: "🧸" },
  { id: "charger", label: "Phone charger", emoji: "🔌" },
  { id: "adventure", label: "Adventure spirit!", emoji: "✨" },
];

interface TripPackingListProps {
  tripId: string;
  initialPackedItems?: string[];
  onPackedItemsChange?: (items: string[]) => void;
}

export function TripPackingList({ tripId, initialPackedItems, onPackedItemsChange }: TripPackingListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>(() => {
    // Prefer database value (including empty array), fallback to localStorage only if undefined
    if (initialPackedItems !== undefined) {
      return initialPackedItems;
    }
    try {
      const saved = localStorage.getItem(`packing-list-${tripId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Update state when initialPackedItems changes (from database) - treat any defined value as authoritative
  useEffect(() => {
    if (initialPackedItems !== undefined) {
      setCheckedItems(initialPackedItems);
    }
  }, [initialPackedItems]);
  
  // Sync to localStorage as offline fallback
  useEffect(() => {
    localStorage.setItem(`packing-list-${tripId}`, JSON.stringify(checkedItems));
  }, [checkedItems, tripId]);
  
  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const newItems = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      // Notify parent to sync to database
      onPackedItemsChange?.(newItems);
      return newItems;
    });
  };
  
  const progress = (checkedItems.length / DEFAULT_PACKING_ITEMS.length) * 100;
  const allPacked = checkedItems.length === DEFAULT_PACKING_ITEMS.length;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className={`border-2 transition-colors ${
        allPacked 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-600'
          : 'bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-sky-300 dark:border-sky-700'
      }`}>
        <CardContent className="p-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between"
            data-testid="button-toggle-packing-list"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={allPacked ? { scale: [1, 1.2, 1] } : { y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-3xl"
              >
                {allPacked ? "✅" : "🎒"}
              </motion.div>
              <div className="text-left">
                <p className={`font-bold ${allPacked ? 'text-green-700 dark:text-green-300' : 'text-sky-800 dark:text-sky-300'}`}>
                  {allPacked ? "All Packed!" : "Packing List"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {checkedItems.length} of {DEFAULT_PACKING_ITEMS.length} items packed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full ${allPacked ? 'bg-green-500' : 'bg-sky-500'}`}
                />
              </div>
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {DEFAULT_PACKING_ITEMS.map((item, idx) => {
                    const isChecked = checkedItems.includes(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <label
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            isChecked 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                            data-testid={`checkbox-packing-${item.id}`}
                          />
                          <span className="text-lg">{item.emoji}</span>
                          <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                            {item.label}
                          </span>
                        </label>
                      </motion.div>
                    );
                  })}
                </div>
                
                {allPacked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-xl"
                  >
                    <p className="text-green-700 dark:text-green-300 font-bold">
                      🎉 You're ready for adventure!
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
