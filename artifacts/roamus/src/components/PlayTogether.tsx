import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Zap, Lock, Play, Clock, Sparkles, ChevronRight, X, PartyPopper, Check, Search, MapPin, Briefcase, Volume2, Mic, MicOff } from "lucide-react";
import confetti from "canvas-confetti";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";

type GameId = 'think-fast' | 'scavenger-hunt' | 'whats-in-my-bag' | 'geoguess' | 'geospy';

interface PlayTogetherProps {
  tripId?: string;
  destination?: string;
  city?: string;
  country?: string;
  isActiveTrip: boolean;
  userId?: string;
  stopNames?: string[];
  initialGame?: GameId;
  onInitialGameDismissed?: () => void;
}

interface ThinkFastPrompt {
  category: string;
  prompt: string;
  isGeneric: boolean;
  exampleAnswers: { emoji: string; answer: string }[];
}

const MIN_PLAYS_PER_DAY = 3;
const MAX_PLAYS_PER_DAY = 5;
const TIMER_DURATION = 30;

// Scavenger Hunt Types and Prompts
interface ScavengerPrompt {
  id: string;
  text: string;
  category: 'experience' | 'theme' | 'generic';
  isFound: boolean;
}

const GENERIC_SCAVENGER_PROMPTS = [
  "Find something that makes a sound",
  "Find something that reminds you of food",
  "Find something that feels old",
  "Find something people here use every day",
  "Find something that moves",
  "Find something that smells interesting",
  "Find something that surprises you",
  "Find something that makes you smile",
  "Find something with an interesting texture",
  "Find something with a beautiful color",
  "Find something that tells a story",
  "Find something you'd want to show a friend",
];

const EXPERIENCE_SCAVENGER_PROMPTS: Record<string, string[]> = {
  food_culture: [
    "Find something that reminds you of a local meal",
    "Find a place where people might share food",
    "Find something sweet or savory looking",
  ],
  sounds: [
    "Find something that makes an interesting sound",
    "Find a place that sounds different from home",
    "Find something that might ring, chime, or click",
  ],
  everyday_life: [
    "Find something people here use every day",
    "Find a sign of daily life",
    "Find something that shows how people get around",
  ],
};

const THEME_SCAVENGER_PROMPTS: Record<string, string[]> = {
  beach: [
    "Find something smooth from the water",
    "Find something that lives in the sea",
    "Find something that protects from the sun",
  ],
  city: [
    "Find something very tall",
    "Find something that shows city life",
    "Find a place where people rest",
  ],
  nature: [
    "Find something green and growing",
    "Find a sign of an animal",
    "Find something the wind moves",
  ],
  museum: [
    "Find something older than you",
    "Find something you want to learn more about",
    "Find something with a story",
  ],
  farm: [
    "Find something that grows from the ground",
    "Find a sign of an animal",
    "Find a tool used for growing things",
  ],
};

// What's In My Bag - Context-appropriate item pools (physical objects only)
const IN_MY_BAG_ITEMS: Record<string, string[]> = {
  beach: [
    "a towel", "sunscreen", "a beach ball", "sunglasses", "a bucket", 
    "a shovel", "flip flops", "a swimsuit", "a water bottle", "a seashell",
    "a picnic blanket", "a sun hat", "snorkeling goggles", "a book", "sandals"
  ],
  museum: [
    "a camera", "a notebook", "a pencil", "a map", "a water bottle",
    "headphones", "a museum ticket", "comfortable shoes", "a jacket", "a magnifying glass",
    "a sketchbook", "a snack bar", "a phone", "a bag", "a guidebook"
  ],
  zoo: [
    "binoculars", "a camera", "sunscreen", "a water bottle", "snacks",
    "a hat", "comfortable shoes", "a map", "a backpack", "sunglasses",
    "a raincoat", "a phone", "a notebook", "a picnic blanket", "a jacket"
  ],
  opera_house: [
    "a ticket", "nice clothes", "a jacket", "a phone", "mints",
    "a wallet", "a small bag", "comfortable shoes", "a shawl", "glasses",
    "a handkerchief", "a camera", "a program", "a watch", "keys"
  ],
  nature: [
    "binoculars", "a water bottle", "trail mix", "a compass", "sunscreen",
    "hiking boots", "a raincoat", "a camera", "bug spray", "a hat",
    "a walking stick", "a map", "a flashlight", "a whistle", "a backpack"
  ],
  farm: [
    "rubber boots", "a basket", "work gloves", "a water bottle", "a hat",
    "seeds", "a snack", "sunscreen", "a camera", "a shovel",
    "an apple", "carrots", "a brush", "a bucket", "a towel"
  ],
  city: [
    "a map", "walking shoes", "a camera", "a wallet", "a phone",
    "sunglasses", "a water bottle", "an umbrella", "a transit card", "snacks",
    "headphones", "a backpack", "a guidebook", "coins", "a jacket"
  ],
  waterfall: [
    "waterproof shoes", "a towel", "a camera", "a rain jacket", "a water bottle",
    "sandals", "sunscreen", "bug spray", "a dry bag", "a hat",
    "swimming clothes", "snacks", "a phone case", "flip flops", "a backpack"
  ],
  chocolate_farm: [
    "a camera", "a notebook", "a water bottle", "comfortable shoes", "sunscreen",
    "a hat", "a bag for samples", "a towel", "bug spray", "snacks",
    "a backpack", "a jacket", "a pen", "sunglasses", "a phone"
  ],
  wedding: [
    "nice clothes", "a gift", "comfortable shoes", "a camera", "tissues",
    "a card", "an umbrella", "mints", "sunglasses", "flowers",
    "a tie", "a dress", "a wallet", "a phone", "a jacket"
  ],
  vacation: [
    "a suitcase", "a passport", "sunglasses", "a camera", "comfortable shoes",
    "a book", "snacks", "headphones", "a travel pillow", "a toothbrush",
    "a phone charger", "swimwear", "a hat", "a jacket", "a backpack"
  ],
  grocery: [
    "shopping bags", "a grocery list", "a wallet", "coupons", "a water bottle",
    "keys", "a phone", "a cart quarter", "hand sanitizer", "reusable bags",
    "a pen", "snacks", "sunglasses", "a jacket", "a backpack"
  ],
};

// Generic contexts for fallback (1 out of 3 rounds)
const GENERIC_CONTEXTS = [
  { context: "a grocery store", key: "grocery" },
  { context: "a vacation", key: "vacation" },
  { context: "a wedding", key: "wedding" },
];

// GeoGuess: Think the Place - Enhanced Question pool with geography questions
// Note: All questions must be answerable with yes/no - avoid "or" questions
const GEOGUESS_QUESTIONS = [
  // Geography & Location questions (prioritized in selection)
  "Is it in North America?",
  "Is it in Europe?",
  "Is it in Asia?",
  "Is it in the Southern Hemisphere?",
  "Is it near an ocean?",
  "Is it near a big lake?",
  "Is it on an island?",
  "Is it in a hot climate?",
  "Is it in a cold place?",
  "Is it in a snowy place?",
  "Is it near mountains?",
  "Is it in a desert?",
  // Wonder & Famous places questions
  "Is it a wonder of the world?",
  "Is it a UNESCO World Heritage site?",
  "Is it one of the most famous places on Earth?",
  "Would you see it on a world map poster?",
  // Original experience-based questions
  "Is it outdoors?",
  "Is it near water?",
  "Do many people visit this place?",
  "Can you walk around it?",
  "Is it more natural than man-made?",
  "Is it famous for photos?",
  "Is it noisy most of the time?",
  "Is it used every day?",
  "Can you go inside?",
  "Is it very old?",
  "Would you find it in a city?",
  "Is it taller than a house?",
  "Can you see it from far away?",
  "Do people eat there?",
  "Is it colorful?",
  "Is it made of stone?",
  "Do people come here to learn?",
  "Is it related to animals?",
  "Would you bring a camera here?",
  "Is it free to visit?",
  "Is it surrounded by nature?",
  "Can you hear music there?",
  "Do people live nearby?",
  "Is it a building?",
  "Would families visit here?",
  "Is it a famous landmark?",
  "Can you see the sky from there?",
  "Do people come here for fun?",
  "Is it peaceful and quiet?",
];

// Global landmarks for 40% selection rule
const GLOBAL_LANDMARKS = [
  "Eiffel Tower",
  "Colosseum",
  "Sydney Opera House",
  "Great Wall of China",
  "Machu Picchu",
  "Taj Mahal",
  "Statue of Liberty",
  "Big Ben",
  "Golden Gate Bridge",
  "Christ the Redeemer",
  "Pyramids of Giza",
  "Tower of Pisa",
  "Mount Fuji",
  "Niagara Falls",
  "Grand Canyon",
  "Stonehenge",
  "Acropolis",
  "Chichen Itza",
  "Petra",
  "Angkor Wat",
  "Santorini",
  "Venice Canals",
  "Northern Lights",
  "Great Barrier Reef",
  "Yellowstone National Park",
  "Disneyland",
  "Central Park",
  "Times Square",
  "Hollywood Sign",
  "Tower Bridge",
];

// GeoSpy: I Spy - Open-ended observation prompts
const GEOSPY_PROMPTS = {
  visual: [
    "I spy something that is moving",
    "I spy something very tall",
    "I spy something colorful",
    "I spy something round",
    "I spy something shiny",
    "I spy something tiny",
    "I spy something that has wheels",
    "I spy something with a pattern",
    "I spy something that is green",
    "I spy something that is red",
    "I spy something blue",
    "I spy something that looks soft",
    "I spy something that looks heavy",
    "I spy something far away",
    "I spy something with numbers on it",
  ],
  sensory: [
    "I spy something that makes a sound",
    "I spy something that feels rough",
    "I spy something that smells interesting",
    "I spy something that feels smooth",
    "I spy something that might be warm",
    "I spy something that might be cold",
    "I spy something you can hear",
    "I spy something that feels bumpy",
  ],
  contextual: [
    "I spy something people use every day",
    "I spy something that reminds me of food",
    "I spy something that looks old",
    "I spy something brand new",
    "I spy something that makes people happy",
    "I spy something an animal might like",
    "I spy something that helps people",
    "I spy something from nature",
    "I spy something made by people",
    "I spy something that tells a story",
    "I spy something surprising",
    "I spy something beautiful",
  ],
};

// Detect theme from a single stop name
function detectContextFromStop(stopName: string): { context: string; key: string } | null {
  const text = stopName.toLowerCase();
  
  if (text.includes('beach') || text.includes('ocean') || text.includes('coast') || text.includes('sea') || text.includes('bondi')) {
    return { context: "the beach", key: "beach" };
  }
  if (text.includes('zoo') || text.includes('aquarium') || text.includes('wildlife') || text.includes('safari') || text.includes('taronga')) {
    return { context: "the zoo", key: "zoo" };
  }
  if (text.includes('museum') || text.includes('gallery') || text.includes('exhibit')) {
    return { context: "the museum", key: "museum" };
  }
  if (text.includes('opera') || text.includes('theatre') || text.includes('theater') || text.includes('concert') || text.includes('symphony')) {
    return { context: "the opera house", key: "opera_house" };
  }
  if (text.includes('bridge') || text.includes('harbour') || text.includes('harbor') || text.includes('tower') || text.includes('downtown')) {
    return { context: "the city", key: "city" };
  }
  if (text.includes('waterfall') || text.includes('falls') || text.includes('cascade')) {
    return { context: "the waterfall", key: "waterfall" };
  }
  if (text.includes('chocolate') || text.includes('cacao') || text.includes('cocoa')) {
    return { context: "the chocolate farm", key: "chocolate_farm" };
  }
  if (text.includes('farm') || text.includes('ranch') || text.includes('orchard') || text.includes('vineyard')) {
    return { context: "the farm", key: "farm" };
  }
  if (text.includes('park') || text.includes('forest') || text.includes('trail') || text.includes('mountain') || text.includes('hiking') || text.includes('nature') || text.includes('garden') || text.includes('botanical')) {
    return { context: "the nature trail", key: "nature" };
  }
  
  return null;
}

// Get all unique contexts from stop names
function getContextsFromStops(stopNames: string[]): { context: string; key: string }[] {
  const contexts: { context: string; key: string }[] = [];
  const seenKeys = new Set<string>();
  
  for (const stopName of stopNames) {
    const ctx = detectContextFromStop(stopName);
    if (ctx && !seenKeys.has(ctx.key)) {
      seenKeys.add(ctx.key);
      contexts.push(ctx);
    }
  }
  
  return contexts;
}

const GENERIC_PROMPTS: ThinkFastPrompt[] = [
  {
    category: "school",
    prompt: "Name 10 things you might find in a school",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "📚", answer: "books" },
      { emoji: "✏️", answer: "pencils" },
      { emoji: "🎒", answer: "backpacks" },
      { emoji: "🔔", answer: "a bell" },
      { emoji: "🖼️", answer: "posters" },
      { emoji: "🪑", answer: "desks" },
      { emoji: "📝", answer: "notebooks" },
      { emoji: "🧑‍🏫", answer: "teachers" },
      { emoji: "🖍️", answer: "crayons" },
      { emoji: "🏫", answer: "classrooms" },
    ],
  },
  {
    category: "blue_things",
    prompt: "Name 10 things that are blue",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🌊", answer: "ocean" },
      { emoji: "☁️", answer: "sky" },
      { emoji: "🫐", answer: "blueberries" },
      { emoji: "🐳", answer: "whales" },
      { emoji: "👖", answer: "jeans" },
      { emoji: "🦋", answer: "butterflies" },
      { emoji: "💎", answer: "sapphires" },
      { emoji: "🐦", answer: "bluebirds" },
      { emoji: "🧊", answer: "ice" },
      { emoji: "🎀", answer: "ribbons" },
    ],
  },
  {
    category: "swimming_animals",
    prompt: "Name 10 animals that can swim",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🐟", answer: "fish" },
      { emoji: "🐢", answer: "turtles" },
      { emoji: "🦆", answer: "ducks" },
      { emoji: "🦭", answer: "seals" },
      { emoji: "🐊", answer: "crocodiles" },
      { emoji: "🐬", answer: "dolphins" },
      { emoji: "🦈", answer: "sharks" },
      { emoji: "🐸", answer: "frogs" },
      { emoji: "🦩", answer: "flamingos" },
      { emoji: "🐻‍❄️", answer: "polar bears" },
    ],
  },
  {
    category: "kitchen",
    prompt: "Name 10 things in a kitchen",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🍳", answer: "pans" },
      { emoji: "🥄", answer: "spoons" },
      { emoji: "🧊", answer: "refrigerator" },
      { emoji: "🍽️", answer: "plates" },
      { emoji: "🫖", answer: "kettle" },
      { emoji: "🔪", answer: "knives" },
      { emoji: "🧂", answer: "salt" },
      { emoji: "🥣", answer: "bowls" },
      { emoji: "🧽", answer: "sponge" },
      { emoji: "🍴", answer: "forks" },
    ],
  },
  {
    category: "breakfast",
    prompt: "Name 10 things people eat for breakfast",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🥣", answer: "cereal" },
      { emoji: "🍳", answer: "eggs" },
      { emoji: "🥞", answer: "pancakes" },
      { emoji: "🍞", answer: "toast" },
      { emoji: "🍌", answer: "bananas" },
      { emoji: "🥓", answer: "bacon" },
      { emoji: "🧇", answer: "waffles" },
      { emoji: "🍊", answer: "oranges" },
      { emoji: "🥛", answer: "milk" },
      { emoji: "🍩", answer: "donuts" },
    ],
  },
  {
    category: "playground",
    prompt: "Name 10 things at a playground",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🛝", answer: "slide" },
      { emoji: "🎠", answer: "swings" },
      { emoji: "⚽", answer: "balls" },
      { emoji: "🧗", answer: "climbing frame" },
      { emoji: "🪣", answer: "sandbox" },
      { emoji: "🌳", answer: "trees" },
      { emoji: "🪢", answer: "ropes" },
      { emoji: "🎡", answer: "merry-go-round" },
      { emoji: "🪜", answer: "ladders" },
      { emoji: "🏃", answer: "kids running" },
    ],
  },
  {
    category: "flying",
    prompt: "Name 10 things that can fly",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🐦", answer: "birds" },
      { emoji: "✈️", answer: "airplanes" },
      { emoji: "🦋", answer: "butterflies" },
      { emoji: "🎈", answer: "balloons" },
      { emoji: "🚁", answer: "helicopters" },
      { emoji: "🐝", answer: "bees" },
      { emoji: "🪁", answer: "kites" },
      { emoji: "🦅", answer: "eagles" },
      { emoji: "🪰", answer: "flies" },
      { emoji: "🚀", answer: "rockets" },
    ],
  },
  {
    category: "birthday_party",
    prompt: "Name 10 things at a birthday party",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🎂", answer: "cake" },
      { emoji: "🎁", answer: "presents" },
      { emoji: "🎈", answer: "balloons" },
      { emoji: "🎉", answer: "party hats" },
      { emoji: "🕯️", answer: "candles" },
      { emoji: "🍭", answer: "candy" },
      { emoji: "🎵", answer: "music" },
      { emoji: "🎮", answer: "games" },
      { emoji: "🍕", answer: "pizza" },
      { emoji: "👯", answer: "friends" },
    ],
  },
  {
    category: "round_things",
    prompt: "Name 10 things that are round",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🏀", answer: "basketball" },
      { emoji: "🍊", answer: "orange" },
      { emoji: "🌍", answer: "Earth" },
      { emoji: "🍪", answer: "cookies" },
      { emoji: "⏰", answer: "clock" },
      { emoji: "🍕", answer: "pizza" },
      { emoji: "🌕", answer: "moon" },
      { emoji: "🎯", answer: "target" },
      { emoji: "💿", answer: "CD" },
      { emoji: "🍩", answer: "donut" },
    ],
  },
  {
    category: "car_trip",
    prompt: "Name 10 things you might bring on a car trip",
    isGeneric: true,
    exampleAnswers: [
      { emoji: "🎧", answer: "headphones" },
      { emoji: "🍿", answer: "snacks" },
      { emoji: "📱", answer: "tablet" },
      { emoji: "🧸", answer: "stuffed animal" },
      { emoji: "📖", answer: "books" },
      { emoji: "🎮", answer: "games" },
      { emoji: "🧃", answer: "juice box" },
      { emoji: "🛏️", answer: "pillow" },
      { emoji: "🗺️", answer: "map" },
      { emoji: "🎵", answer: "music" },
    ],
  },
];

function getContextualPrompts(destination: string, city?: string): ThinkFastPrompt[] {
  // Use city if available, otherwise try to clean up destination
  // Avoid duplicated text like "Sydney Australia, Australia"
  let place = city || destination;
  
  // If destination looks duplicated (contains the same word twice), clean it up
  if (!city && destination) {
    const parts = destination.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // Use just the first part (city/region name) to avoid "Sydney Australia, Australia"
      place = parts[0];
    }
  }
  return [
    {
      category: "see_here",
      prompt: `Name 10 things you might see in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🏛️", answer: "buildings" },
        { emoji: "🌳", answer: "trees" },
        { emoji: "🚗", answer: "cars" },
        { emoji: "👨‍👩‍👧‍👦", answer: "families" },
        { emoji: "🏪", answer: "shops" },
        { emoji: "🚶", answer: "people walking" },
        { emoji: "🚌", answer: "buses" },
        { emoji: "🌸", answer: "flowers" },
        { emoji: "🏠", answer: "houses" },
        { emoji: "☀️", answer: "sunshine" },
      ],
    },
    {
      category: "eat_here",
      prompt: `Name 10 foods people might eat in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🍕", answer: "local dishes" },
        { emoji: "🍦", answer: "ice cream" },
        { emoji: "🥗", answer: "fresh food" },
        { emoji: "🍰", answer: "desserts" },
        { emoji: "🥤", answer: "drinks" },
        { emoji: "🍜", answer: "noodles" },
        { emoji: "🍞", answer: "bread" },
        { emoji: "🍎", answer: "fruits" },
        { emoji: "🧀", answer: "cheese" },
        { emoji: "☕", answer: "coffee" },
      ],
    },
    {
      category: "sounds_here",
      prompt: `Name 10 sounds you might hear in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🚗", answer: "traffic" },
        { emoji: "🐦", answer: "birds" },
        { emoji: "🗣️", answer: "people talking" },
        { emoji: "🎵", answer: "music" },
        { emoji: "🌊", answer: "nature sounds" },
        { emoji: "🔔", answer: "bells" },
        { emoji: "👏", answer: "clapping" },
        { emoji: "🚂", answer: "trains" },
        { emoji: "🐕", answer: "dogs barking" },
        { emoji: "💨", answer: "wind" },
      ],
    },
    {
      category: "daily_use",
      prompt: `Name 10 things people in ${place} might use every day`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "📱", answer: "phones" },
        { emoji: "🚌", answer: "buses" },
        { emoji: "☂️", answer: "umbrellas" },
        { emoji: "🛒", answer: "shopping bags" },
        { emoji: "🔑", answer: "keys" },
        { emoji: "👟", answer: "shoes" },
        { emoji: "💳", answer: "cards" },
        { emoji: "🧴", answer: "sunscreen" },
        { emoji: "🎒", answer: "bags" },
        { emoji: "⌚", answer: "watches" },
      ],
    },
    {
      category: "fun_here",
      prompt: `Name 10 things people do for fun in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🎡", answer: "visit attractions" },
        { emoji: "🍽️", answer: "eat out" },
        { emoji: "🚶", answer: "walk around" },
        { emoji: "📸", answer: "take photos" },
        { emoji: "🛍️", answer: "shop" },
        { emoji: "🏊", answer: "swim" },
        { emoji: "🎭", answer: "see shows" },
        { emoji: "🚴", answer: "bike" },
        { emoji: "🌅", answer: "watch sunsets" },
        { emoji: "🎮", answer: "play games" },
      ],
    },
    {
      category: "visit_nearby",
      prompt: `Name 10 places you might visit near ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🏛️", answer: "museums" },
        { emoji: "🌳", answer: "parks" },
        { emoji: "🏰", answer: "landmarks" },
        { emoji: "🍽️", answer: "restaurants" },
        { emoji: "🏖️", answer: "beaches" },
        { emoji: "🎢", answer: "theme parks" },
        { emoji: "🛍️", answer: "markets" },
        { emoji: "⛪", answer: "temples" },
        { emoji: "🏞️", answer: "nature spots" },
        { emoji: "🎪", answer: "festivals" },
      ],
    },
    {
      category: "transportation",
      prompt: `Name 10 ways to get around in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🚌", answer: "buses" },
        { emoji: "🚕", answer: "taxis" },
        { emoji: "🚶", answer: "walking" },
        { emoji: "🚲", answer: "bicycles" },
        { emoji: "🚇", answer: "subway" },
        { emoji: "🚗", answer: "cars" },
        { emoji: "🛵", answer: "scooters" },
        { emoji: "🚊", answer: "trams" },
        { emoji: "⛴️", answer: "ferries" },
        { emoji: "🚠", answer: "cable cars" },
      ],
    },
    {
      category: "animals_here",
      prompt: `Name 10 animals you might see in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🐦", answer: "birds" },
        { emoji: "🐕", answer: "dogs" },
        { emoji: "🐈", answer: "cats" },
        { emoji: "🐿️", answer: "squirrels" },
        { emoji: "🦎", answer: "lizards" },
        { emoji: "🐠", answer: "fish" },
        { emoji: "🦋", answer: "butterflies" },
        { emoji: "🐢", answer: "turtles" },
        { emoji: "🦜", answer: "parrots" },
        { emoji: "🐒", answer: "monkeys" },
      ],
    },
    {
      category: "souvenirs",
      prompt: `Name 10 souvenirs you might buy in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "🧲", answer: "magnets" },
        { emoji: "👕", answer: "t-shirts" },
        { emoji: "🗝️", answer: "keychains" },
        { emoji: "📸", answer: "postcards" },
        { emoji: "🧸", answer: "stuffed toys" },
        { emoji: "🎨", answer: "art" },
        { emoji: "🍫", answer: "chocolates" },
        { emoji: "📖", answer: "books" },
        { emoji: "🎭", answer: "masks" },
        { emoji: "🏺", answer: "pottery" },
      ],
    },
    {
      category: "weather_items",
      prompt: `Name 10 things you might need for the weather in ${place}`,
      isGeneric: false,
      exampleAnswers: [
        { emoji: "☂️", answer: "umbrella" },
        { emoji: "🧴", answer: "sunscreen" },
        { emoji: "🕶️", answer: "sunglasses" },
        { emoji: "🧢", answer: "hat" },
        { emoji: "🧥", answer: "jacket" },
        { emoji: "👟", answer: "walking shoes" },
        { emoji: "🧣", answer: "scarf" },
        { emoji: "💧", answer: "water bottle" },
        { emoji: "🧤", answer: "gloves" },
        { emoji: "🩴", answer: "sandals" },
      ],
    },
  ];
}

export function PlayTogether({ tripId, destination, city, country, isActiveTrip, userId, stopNames = [], initialGame, onInitialGameDismissed }: PlayTogetherProps) {
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showSetupScreen, setShowSetupScreen] = useState(false);
  const [gamePhase, setGamePhase] = useState<'idle' | 'playing' | 'reveal' | 'complete'>('idle');
  const [currentPrompt, setCurrentPrompt] = useState<ThinkFastPrompt | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [playsToday, setPlaysToday] = useState(0);
  const [maxPlaysToday, setMaxPlaysToday] = useState(MAX_PLAYS_PER_DAY);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [hitTenTaps, setHitTenTaps] = useState(false);
  const [interruptedPrompt, setInterruptedPrompt] = useState<ThinkFastPrompt | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Scavenger Hunt state
  const [showScavengerIntro, setShowScavengerIntro] = useState(false);
  const [scavengerPhase, setScavengerPhase] = useState<'idle' | 'hunting' | 'complete'>('idle');
  const [scavengerPrompts, setScavengerPrompts] = useState<ScavengerPrompt[]>([]);
  const [usedScavengerPrompts, setUsedScavengerPrompts] = useState<string[]>([]);

  // What's In My Bag state
  const [showInMyBagIntro, setShowInMyBagIntro] = useState(false);
  const [inMyBagPhase, setInMyBagPhase] = useState<'idle' | 'playing' | 'complete'>('idle');
  const [inMyBagContext, setInMyBagContext] = useState<{ context: string; key: string } | null>(null);
  const [inMyBagItems, setInMyBagItems] = useState<string[]>([]);
  const [inMyBagCurrentIndex, setInMyBagCurrentIndex] = useState(0);
  const [usedInMyBagContexts, setUsedInMyBagContexts] = useState<string[]>([]);
  const [inMyBagPlayCount, setInMyBagPlayCount] = useState(0);
  const MAX_IN_MY_BAG_ITEMS = 8;

  // GeoGuess: Think the Place state
  const [showGeoGuessIntro, setShowGeoGuessIntro] = useState(false);
  const [geoGuessPhase, setGeoGuessPhase] = useState<'idle' | 'playing' | 'complete'>('idle');
  const [geoGuessTarget, setGeoGuessTarget] = useState<string | null>(null);
  const [geoGuessQuestions, setGeoGuessQuestions] = useState<string[]>([]); // 5 visible questions
  const [geoGuessUsedQuestions, setGeoGuessUsedQuestions] = useState<string[]>([]);
  const [geoGuessQuestionsAsked, setGeoGuessQuestionsAsked] = useState(0);
  const [geoGuessGuessesUsed, setGeoGuessGuessesUsed] = useState(0);
  const [geoGuessInput, setGeoGuessInput] = useState('');
  const [geoGuessResponse, setGeoGuessResponse] = useState<{ text: string; isAnswering: boolean } | null>(null);
  const [geoGuessShowFirstGuessHint, setGeoGuessShowFirstGuessHint] = useState(false);
  const [geoGuessIsCorrect, setGeoGuessIsCorrect] = useState(false);
  const [geoGuessUsedTargets, setGeoGuessUsedTargets] = useState<string[]>([]);
  const [geoGuessRoundCount, setGeoGuessRoundCount] = useState(0);
  const [geoGuessIsProcessing, setGeoGuessIsProcessing] = useState(false);
  const [geoGuessIsListening, setGeoGuessIsListening] = useState(false);
  const [geoGuessLastAskedQuestion, setGeoGuessLastAskedQuestion] = useState<string | null>(null);
  const MAX_GEOGUESS_GUESSES = 5;
  const VISIBLE_QUESTIONS = 5;
  
  // GeoSpy: I Spy state
  const [showGeoSpyIntro, setShowGeoSpyIntro] = useState(false);
  const [geoSpyPhase, setGeoSpyPhase] = useState<'idle' | 'playing'>('idle');
  const [geoSpyCurrentPrompt, setGeoSpyCurrentPrompt] = useState<string | null>(null);
  const [geoSpyUsedPrompts, setGeoSpyUsedPrompts] = useState<string[]>([]);
  
  // Speech recognition for voice input (using any type for cross-browser compatibility)
  const speechRecognitionRef = useRef<any>(null);
  const isSpeechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  
  const startListening = useCallback(() => {
    if (!isSpeechSupported) return;
    
    try {
      // Stop any existing recognition first
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // Ignore errors when stopping
        }
      }
      
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();
      speechRecognitionRef.current = recognition;
      
      recognition.continuous = false;
      recognition.interimResults = true; // Show partial results
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setGeoGuessIsListening(true);
      };
      
      recognition.onend = () => {
        setGeoGuessIsListening(false);
        speechRecognitionRef.current = null;
      };
      
      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        setGeoGuessIsListening(false);
        speechRecognitionRef.current = null;
        
        // Retry on no-speech or network errors after a short delay
        if (event.error === 'no-speech' || event.error === 'network') {
          // User can tap again to retry
        }
      };
      
      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        setGeoGuessInput(transcript);
      };
      
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setGeoGuessIsListening(false);
    }
  }, [isSpeechSupported]);
  
  const stopListening = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setGeoGuessIsListening(false);
    }
  }, []);
  
  // Cleanup speech recognition on unmount or game close
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (userId && isActiveTrip) {
      fetchTodayPlays();
    }
  }, [userId, isActiveTrip, tripId]);

  const initialGameTriggered = useRef(false);
  useEffect(() => {
    if (initialGame && !initialGameTriggered.current) {
      initialGameTriggered.current = true;
      const timer = setTimeout(() => {
        switch (initialGame) {
          case 'think-fast': setShowSetupScreen(true); break;
          case 'scavenger-hunt': setShowScavengerIntro(true); break;
          case 'whats-in-my-bag': setShowInMyBagIntro(true); break;
          case 'geoguess': setShowGeoGuessIntro(true); break;
          case 'geospy': setShowGeoSpyIntro(true); break;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialGame]);

  const fetchTodayPlays = async () => {
    if (!userId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/play-together/status?userId=${userId}&gameType=think_fast&date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setPlaysToday(data.playsCount || 0);
        setUsedPrompts(data.promptsUsedToday || []);
        setMaxPlaysToday(Math.floor(Math.random() * (MAX_PLAYS_PER_DAY - MIN_PLAYS_PER_DAY + 1)) + MIN_PLAYS_PER_DAY);
      }
    } catch (error) {
      console.error("Failed to fetch play status:", error);
    }
  };

  const seededShuffle = useCallback(<T,>(array: T[], seed: string): T[] => {
    const result = [...array];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    const random = () => {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      return hash / 0x7fffffff;
    };
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, []);

  const buildPromptQueue = useCallback((): ThinkFastPrompt[] => {
    const today = new Date().toISOString().split('T')[0];
    const seed = `${tripId || 'default'}-${today}`;
    
    const contextualPrompts = destination ? getContextualPrompts(destination, city) : [];
    const shuffledContextual = seededShuffle(
      contextualPrompts.filter(p => !usedPrompts.includes(p.prompt)),
      seed + '-contextual'
    );
    const shuffledGeneric = seededShuffle(
      GENERIC_PROMPTS.filter(p => !usedPrompts.includes(p.prompt)),
      seed + '-generic'
    );
    
    const queue: ThinkFastPrompt[] = [];
    let cIdx = 0, gIdx = 0;
    
    while (cIdx < shuffledContextual.length || gIdx < shuffledGeneric.length) {
      if (cIdx < shuffledContextual.length) queue.push(shuffledContextual[cIdx++]);
      if (cIdx < shuffledContextual.length) queue.push(shuffledContextual[cIdx++]);
      if (gIdx < shuffledGeneric.length) queue.push(shuffledGeneric[gIdx++]);
    }
    
    return queue;
  }, [destination, city, usedPrompts, tripId, seededShuffle]);

  const selectNextPrompt = useCallback(() => {
    const queue = buildPromptQueue();
    if (queue.length === 0) {
      setUsedPrompts([]);
      const today = new Date().toISOString().split('T')[0];
      const seed = `${tripId || 'default'}-${today}-reset`;
      const allPrompts = [...(destination ? getContextualPrompts(destination, city) : []), ...GENERIC_PROMPTS];
      const shuffled = seededShuffle(allPrompts, seed);
      return shuffled[0];
    }
    return queue[0];
  }, [buildPromptQueue, tripId, destination, city, seededShuffle]);

  const startGame = async () => {
    if (playsToday >= maxPlaysToday) return;
    
    trackEvent('think_fast_started', 'play_together', destination || 'unknown');
    
    setShowSetupScreen(false);
    const prompt = interruptedPrompt || selectNextPrompt();
    setCurrentPrompt(prompt);
    setInterruptedPrompt(null);
    setTimeLeft(TIMER_DURATION);
    setTapCount(0);
    setHitTenTaps(false);
    setGamePhase('playing');
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGamePhase('reveal');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const recordPlay = async () => {
    if (!userId || !currentPrompt) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      await apiRequest('POST', '/api/play-together/record', {
        userId,
        tripId,
        gameType: 'think_fast',
        playDate: today,
        promptUsed: currentPrompt.prompt,
      });
      setPlaysToday(prev => prev + 1);
      setUsedPrompts(prev => [...prev, currentPrompt.prompt]);
    } catch (error) {
      console.error("Failed to record play:", error);
    }
  };

  const handleRevealComplete = async () => {
    await recordPlay();
    trackEvent('think_fast_completed', 'play_together', destination || 'unknown');
    setGamePhase('complete');
  };

  const handlePlayAgain = () => {
    if (playsToday + 1 >= maxPlaysToday) {
      setGamePhase('idle');
      return;
    }
    trackEvent('think_fast_replayed', 'play_together', destination || 'unknown');
    setShowSetupScreen(true);
    setGamePhase('idle');
  };

  const handleDone = () => {
    trackEvent('think_fast_exited', 'play_together', destination || 'unknown');
    if (timerRef.current) clearInterval(timerRef.current);
    if (gamePhase === 'playing' && currentPrompt) {
      setInterruptedPrompt(currentPrompt);
    }
    setGamePhase('idle');
    setCurrentPrompt(null);
    if (initialGame) onInitialGameDismissed?.();
  };

  const handleTap = () => {
    if (gamePhase !== 'playing' || tapCount >= 10) return;
    
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (newCount === 10 && !hitTenTaps) {
      setHitTenTaps(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#f97316', '#ec4899', '#8b5cf6'],
      });
    }
  };

  const handleSectionClick = () => {
    if (!isActiveTrip) {
      setShowLockedModal(true);
      return;
    }
    if (playsToday >= maxPlaysToday) {
      return;
    }
    trackEvent('play_together_section_viewed', 'play_together', destination || 'unknown');
    setShowSetupScreen(true);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Scavenger Hunt Functions
  const generateScavengerPrompts = useCallback((): ScavengerPrompt[] => {
    const today = new Date().toISOString().split('T')[0];
    const seed = `${tripId || 'default'}-${today}-scavenger`;
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    const random = () => {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      return hash / 0x7fffffff;
    };
    
    const shuffle = <T,>(arr: T[]): T[] => {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    const prompts: ScavengerPrompt[] = [];
    const targetCount = 3 + Math.floor(random() * 3); // 3-5 prompts
    
    // Get experience-based prompts first
    const experiencePromptPool: string[] = [];
    Object.values(EXPERIENCE_SCAVENGER_PROMPTS).forEach(arr => {
      experiencePromptPool.push(...arr);
    });
    
    // Get theme-based prompts based on destination
    const themePromptPool: string[] = [];
    if (destination) {
      const lowerDest = destination.toLowerCase();
      if (lowerDest.includes('beach') || lowerDest.includes('coast')) {
        themePromptPool.push(...(THEME_SCAVENGER_PROMPTS.beach || []));
      }
      if (lowerDest.includes('museum') || lowerDest.includes('gallery')) {
        themePromptPool.push(...(THEME_SCAVENGER_PROMPTS.museum || []));
      }
      if (lowerDest.includes('park') || lowerDest.includes('forest') || lowerDest.includes('nature')) {
        themePromptPool.push(...(THEME_SCAVENGER_PROMPTS.nature || []));
      }
      if (lowerDest.includes('farm')) {
        themePromptPool.push(...(THEME_SCAVENGER_PROMPTS.farm || []));
      }
      // Default to city for urban destinations
      if (themePromptPool.length === 0) {
        themePromptPool.push(...(THEME_SCAVENGER_PROMPTS.city || []));
      }
    }

    // Combine and shuffle all contextual prompts
    const contextualPool = shuffle([...experiencePromptPool, ...themePromptPool])
      .filter(p => !usedScavengerPrompts.includes(p));
    
    // Get unused generic prompts
    const genericPool = shuffle([...GENERIC_SCAVENGER_PROMPTS])
      .filter(p => !usedScavengerPrompts.includes(p));

    // Pick prompts: prioritize contextual, then generic
    let promptId = 0;
    while (prompts.length < targetCount) {
      if (contextualPool.length > 0 && prompts.length < Math.ceil(targetCount * 0.6)) {
        const text = contextualPool.shift()!;
        prompts.push({ id: `scav-${promptId++}`, text, category: 'experience', isFound: false });
      } else if (genericPool.length > 0) {
        const text = genericPool.shift()!;
        prompts.push({ id: `scav-${promptId++}`, text, category: 'generic', isFound: false });
      } else if (contextualPool.length > 0) {
        const text = contextualPool.shift()!;
        prompts.push({ id: `scav-${promptId++}`, text, category: 'experience', isFound: false });
      } else {
        // Reset if we've used all prompts
        const allPrompts = shuffle([...GENERIC_SCAVENGER_PROMPTS]);
        if (allPrompts.length > 0) {
          const text = allPrompts[0];
          prompts.push({ id: `scav-${promptId++}`, text, category: 'generic', isFound: false });
        } else {
          break;
        }
      }
    }

    return prompts;
  }, [tripId, destination, usedScavengerPrompts]);

  const startScavengerHunt = () => {
    trackEvent('scavenger_hunt_started', 'play_together', destination || 'unknown');
    const prompts = generateScavengerPrompts();
    setScavengerPrompts(prompts);
    setShowScavengerIntro(false);
    setScavengerPhase('hunting');
  };

  const handleScavengerFound = (promptId: string) => {
    trackEvent('scavenger_prompt_marked_found', 'play_together', destination || 'unknown');
    setScavengerPrompts(prev => 
      prev.map(p => p.id === promptId ? { ...p, isFound: true } : p)
    );
  };

  const handleScavengerComplete = () => {
    trackEvent('scavenger_hunt_completed', 'play_together', destination || 'unknown');
    // Track used prompts to avoid repetition same day
    const usedTexts = scavengerPrompts.map(p => p.text);
    setUsedScavengerPrompts(prev => [...prev, ...usedTexts]);
    setScavengerPhase('complete');
  };

  const handleScavengerNewHunt = () => {
    const prompts = generateScavengerPrompts();
    setScavengerPrompts(prompts);
    setScavengerPhase('hunting');
  };

  const handleScavengerExit = () => {
    trackEvent('scavenger_hunt_exited', 'play_together', destination || 'unknown');
    setScavengerPhase('idle');
    setScavengerPrompts([]);
    if (initialGame) onInitialGameDismissed?.();
  };

  const handleScavengerClick = () => {
    if (!isActiveTrip) {
      setShowLockedModal(true);
      return;
    }
    trackEvent('scavenger_hunt_section_viewed', 'play_together', destination || 'unknown');
    setShowScavengerIntro(true);
  };

  // What's In My Bag Functions
  const generateInMyBagItems = useCallback((contextKey: string): string[] => {
    const pool = IN_MY_BAG_ITEMS[contextKey] || IN_MY_BAG_ITEMS.vacation;
    // Shuffle and pick 8 items
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, MAX_IN_MY_BAG_ITEMS);
  }, []);

  // Select context using 2:1 mixing pattern (2 contextual from stops, 1 generic)
  const selectInMyBagContext = useCallback((): { context: string; key: string } => {
    const newPlayCount = inMyBagPlayCount + 1;
    
    // Get contextual options from stop names (excluding already used ones)
    const stopContexts = getContextsFromStops(stopNames);
    const availableStopContexts = stopContexts.filter(ctx => !usedInMyBagContexts.includes(ctx.key));
    
    // Get generic options (excluding already used ones)
    const availableGenericContexts = GENERIC_CONTEXTS.filter(ctx => !usedInMyBagContexts.includes(ctx.key));
    
    // 2:1 pattern: plays 1, 2, 4, 5, 7, 8 are contextual; plays 3, 6, 9 are generic
    const isGenericTurn = newPlayCount % 3 === 0;
    
    let selectedContext: { context: string; key: string };
    
    if (isGenericTurn && availableGenericContexts.length > 0) {
      // Pick a generic context
      const idx = Math.floor(Math.random() * availableGenericContexts.length);
      selectedContext = availableGenericContexts[idx];
    } else if (availableStopContexts.length > 0) {
      // Pick a contextual from stops
      const idx = Math.floor(Math.random() * availableStopContexts.length);
      selectedContext = availableStopContexts[idx];
    } else if (availableGenericContexts.length > 0) {
      // Fallback to generic if no stop contexts available
      const idx = Math.floor(Math.random() * availableGenericContexts.length);
      selectedContext = availableGenericContexts[idx];
    } else {
      // All contexts used today - reset and pick any
      setUsedInMyBagContexts([]);
      const allContexts = [...stopContexts, ...GENERIC_CONTEXTS];
      const idx = Math.floor(Math.random() * allContexts.length);
      selectedContext = allContexts.length > 0 ? allContexts[idx] : { context: "a vacation", key: "vacation" };
    }
    
    return selectedContext;
  }, [stopNames, usedInMyBagContexts, inMyBagPlayCount]);

  const handleInMyBagClick = () => {
    if (!isActiveTrip) {
      setShowLockedModal(true);
      return;
    }
    trackEvent('in_my_bag_section_viewed', 'play_together', destination || 'unknown');
    setShowInMyBagIntro(true);
  };

  const startInMyBag = () => {
    trackEvent('in_my_bag_started', 'play_together', destination || 'unknown');
    const context = selectInMyBagContext();
    const items = generateInMyBagItems(context.key);
    setInMyBagContext(context);
    setInMyBagItems(items);
    setInMyBagCurrentIndex(0);
    setShowInMyBagIntro(false);
    setInMyBagPhase('playing');
    // Track this context as used today and increment play count
    setUsedInMyBagContexts(prev => [...prev, context.key]);
    setInMyBagPlayCount(prev => prev + 1);
  };

  const handleInMyBagNext = () => {
    if (inMyBagCurrentIndex < MAX_IN_MY_BAG_ITEMS - 1) {
      setInMyBagCurrentIndex(prev => prev + 1);
    } else {
      // Game complete after 8 items
      handleInMyBagComplete();
    }
  };

  const handleInMyBagComplete = () => {
    trackEvent('in_my_bag_completed', 'play_together', destination || 'unknown');
    setInMyBagPhase('complete');
  };

  const handleInMyBagExit = () => {
    trackEvent('in_my_bag_exited', 'play_together', destination || 'unknown');
    setInMyBagPhase('idle');
    setInMyBagItems([]);
    setInMyBagCurrentIndex(0);
    setInMyBagContext(null);
    if (initialGame) onInitialGameDismissed?.();
  };

  const handleInMyBagPlayAgain = () => {
    // Start a new game with different context (2:1 mixing)
    startInMyBag();
  };

  // Build the sentence for In My Bag
  const buildInMyBagSentence = (): string => {
    if (!inMyBagContext || inMyBagItems.length === 0) return '';
    
    const itemsToShow = inMyBagItems.slice(0, inMyBagCurrentIndex + 1);
    const itemList = itemsToShow.length === 1 
      ? itemsToShow[0]
      : itemsToShow.slice(0, -1).join(', ') + ', and ' + itemsToShow[itemsToShow.length - 1];
    
    return `When going to ${inMyBagContext.context}, my bag has ${itemList}.`;
  };

  // GeoGuess: Think the Place Functions
  const MAX_GEOGUESS_QUESTIONS = 20;
  
  const selectGeoGuessTarget = useCallback((): string => {
    // Priority: Use exploration stops first, landmarks only as fallback
    // This makes the game more relevant to the family's actual trip
    
    // Also exclude current target to prevent immediate repeats
    const excludeList = geoGuessTarget 
      ? [...geoGuessUsedTargets, geoGuessTarget]
      : geoGuessUsedTargets;
    
    // Get available stops (not used recently)
    const availableStops = stopNames.filter(s => !excludeList.includes(s) && s.trim().length > 0);
    
    // Get available landmarks (not used recently)
    const availableLandmarks = GLOBAL_LANDMARKS.filter(l => !excludeList.includes(l));
    
    let target: string;
    
    if (availableStops.length > 0) {
      // Primary: Pick from exploration stops (places you're visiting or visited)
      const idx = Math.floor(Math.random() * availableStops.length);
      target = availableStops[idx];
    } else if (availableLandmarks.length > 0) {
      // Fallback: Only use landmarks when all stops are exhausted
      const idx = Math.floor(Math.random() * availableLandmarks.length);
      target = availableLandmarks[idx];
    } else {
      // Reset if all used (both stops and landmarks exhausted)
      setGeoGuessUsedTargets([]);
      const allTargets = [...stopNames, ...GLOBAL_LANDMARKS];
      const idx = Math.floor(Math.random() * allTargets.length);
      target = allTargets[idx] || "Eiffel Tower";
    }
    
    return target;
  }, [stopNames, geoGuessUsedTargets, geoGuessTarget]);

  const initializeGeoGuessQuestions = useCallback(() => {
    // Shuffle questions and pick first 5
    const shuffled = [...GEOGUESS_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, VISIBLE_QUESTIONS);
  }, []);

  const handleGeoGuessClick = () => {
    if (!isActiveTrip) {
      setShowLockedModal(true);
      return;
    }
    trackEvent('geoguess_section_viewed', 'play_together', destination || 'unknown');
    setShowGeoGuessIntro(true);
  };

  const startGeoGuess = () => {
    trackEvent('geoguess_started', 'play_together', destination || 'unknown');
    const target = selectGeoGuessTarget();
    const questions = initializeGeoGuessQuestions();
    
    setGeoGuessTarget(target);
    setGeoGuessQuestions(questions);
    setGeoGuessUsedQuestions([...questions]);
    setGeoGuessQuestionsAsked(0);
    setGeoGuessGuessesUsed(0);
    setGeoGuessInput('');
    setGeoGuessResponse(null);
    setGeoGuessLastAskedQuestion(null);
    setGeoGuessShowFirstGuessHint(false);
    setGeoGuessIsCorrect(false);
    setShowGeoGuessIntro(false);
    setGeoGuessPhase('playing');
    setGeoGuessUsedTargets(prev => [...prev, target]);
    setGeoGuessRoundCount(prev => prev + 1);
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  const handleGeoGuessQuestionClick = async (question: string) => {
    if (geoGuessIsProcessing || !geoGuessTarget) return;
    // Enforce 20 question max
    if (geoGuessQuestionsAsked >= MAX_GEOGUESS_QUESTIONS) return;
    
    setGeoGuessIsProcessing(true);
    setGeoGuessLastAskedQuestion(question); // Track which question was asked
    const newQuestionsAsked = geoGuessQuestionsAsked + 1;
    setGeoGuessQuestionsAsked(newQuestionsAsked);
    
    // Remove used question and add a new one
    const remainingQuestions = GEOGUESS_QUESTIONS.filter(q => !geoGuessUsedQuestions.includes(q));
    const newQuestion = remainingQuestions.length > 0 
      ? remainingQuestions[Math.floor(Math.random() * remainingQuestions.length)]
      : null;
    
    setGeoGuessQuestions(prev => {
      const filtered = prev.filter(q => q !== question);
      if (newQuestion) {
        return [...filtered, newQuestion];
      }
      return filtered;
    });
    
    if (newQuestion) {
      setGeoGuessUsedQuestions(prev => [...prev, newQuestion]);
    }
    
    // Get AI response for the question
    try {
      const res = await apiRequest('POST', '/api/geoguess/answer', {
        target: geoGuessTarget,
        question: question,
      });
      const data = await res.json();
      const answer = data.answer || 'That depends';
      
      setGeoGuessResponse({ text: answer, isAnswering: true });
      speakResponse(answer);
      
      // Clear response after 2.5 seconds (longer to read the question)
      setTimeout(() => {
        setGeoGuessResponse(null);
        setGeoGuessLastAskedQuestion(null);
        setGeoGuessIsProcessing(false);
      }, 2500);
    } catch (error) {
      console.error('Failed to get answer:', error);
      // Fallback to random response
      const fallbackResponses = ['Yes', 'No', 'Sometimes', 'Kind of', 'That depends'];
      const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      setGeoGuessResponse({ text: fallback, isAnswering: true });
      speakResponse(fallback);
      setTimeout(() => {
        setGeoGuessResponse(null);
        setGeoGuessLastAskedQuestion(null);
        setGeoGuessIsProcessing(false);
      }, 2500);
    }
  };

  const handleGeoGuessSubmit = async () => {
    if (!geoGuessInput.trim() || !geoGuessTarget || geoGuessIsProcessing) return;
    // Enforce max 5 guesses before processing
    if (geoGuessGuessesUsed >= MAX_GEOGUESS_GUESSES) return;
    
    // Show first guess hint on first guess
    if (geoGuessGuessesUsed === 0 && !geoGuessShowFirstGuessHint) {
      setGeoGuessShowFirstGuessHint(true);
    }
    
    setGeoGuessIsProcessing(true);
    const guess = geoGuessInput.trim();
    setGeoGuessInput('');
    const newGuessCount = geoGuessGuessesUsed + 1;
    setGeoGuessGuessesUsed(newGuessCount);
    
    // Check if guess is correct (case-insensitive, partial match allowed)
    const isCorrect = 
      guess.toLowerCase() === geoGuessTarget.toLowerCase() ||
      geoGuessTarget.toLowerCase().includes(guess.toLowerCase()) ||
      guess.toLowerCase().includes(geoGuessTarget.toLowerCase());
    
    if (isCorrect) {
      setGeoGuessIsCorrect(true);
      // Track both correct and completed on success
      trackEvent('geoguess_correct', 'play_together', geoGuessTarget);
      trackEvent('geoguess_completed', 'play_together', geoGuessTarget);
      setGeoGuessResponse({ text: `Yes! I was thinking of ${geoGuessTarget}.`, isAnswering: true });
      speakResponse(`Yes! I was thinking of ${geoGuessTarget}.`);
      
      // Light confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#4ade80', '#22c55e', '#16a34a'],
      });
      
      setTimeout(() => {
        setGeoGuessPhase('complete');
        setGeoGuessIsProcessing(false);
      }, 2000);
    } else if (newGuessCount >= MAX_GEOGUESS_GUESSES) {
      // All guesses used - use newGuessCount not stale state
      trackEvent('geoguess_completed', 'play_together', geoGuessTarget);
      setGeoGuessResponse({ text: `Nice thinking — I was thinking of ${geoGuessTarget}.`, isAnswering: true });
      speakResponse(`Nice thinking — I was thinking of ${geoGuessTarget}.`);
      
      setTimeout(() => {
        setGeoGuessPhase('complete');
        setGeoGuessIsProcessing(false);
      }, 2500);
    } else {
      // Wrong guess, continue
      setGeoGuessResponse({ text: "Not quite — keep asking questions.", isAnswering: true });
      speakResponse("Not quite — keep asking questions.");
      
      setTimeout(() => {
        setGeoGuessResponse(null);
        setGeoGuessIsProcessing(false);
      }, 2000);
    }
  };

  const handleGeoGuessPlayAgain = () => {
    startGeoGuess();
  };

  const handleGeoGuessExit = () => {
    trackEvent('geoguess_exited', 'play_together', geoGuessTarget || 'unknown');
    setGeoGuessPhase('idle');
    setGeoGuessTarget(null);
    setGeoGuessQuestions([]);
    setGeoGuessUsedQuestions([]);
    if (initialGame) onInitialGameDismissed?.();
    setGeoGuessQuestionsAsked(0);
    setGeoGuessGuessesUsed(0);
    setGeoGuessInput('');
    setGeoGuessResponse(null);
    setGeoGuessLastAskedQuestion(null);
    setGeoGuessIsCorrect(false);
  };

  // GeoSpy: I Spy Functions
  const getAllGeoSpyPrompts = useCallback((): string[] => {
    return [
      ...GEOSPY_PROMPTS.visual,
      ...GEOSPY_PROMPTS.sensory,
      ...GEOSPY_PROMPTS.contextual,
    ];
  }, []);

  const selectGeoSpyPrompt = useCallback((): string => {
    const allPrompts = getAllGeoSpyPrompts();
    // Filter out recently used prompts (but allow repeats if pool exhausted)
    const availablePrompts = allPrompts.filter(p => !geoSpyUsedPrompts.includes(p));
    
    // Also exclude current prompt to prevent back-to-back repeats
    const pool = availablePrompts.length > 0 
      ? availablePrompts.filter(p => p !== geoSpyCurrentPrompt)
      : allPrompts.filter(p => p !== geoSpyCurrentPrompt);
    
    // If somehow no prompts available, reset and use any
    if (pool.length === 0) {
      setGeoSpyUsedPrompts([]);
      const idx = Math.floor(Math.random() * allPrompts.length);
      return allPrompts[idx];
    }
    
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }, [getAllGeoSpyPrompts, geoSpyUsedPrompts, geoSpyCurrentPrompt]);

  const speakGeoSpyPrompt = useCallback((prompt: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(prompt);
      utterance.rate = 0.85; // Calm, slower pacing
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const handleGeoSpyClick = () => {
    if (!isActiveTrip) {
      setShowLockedModal(true);
      return;
    }
    trackEvent('geospy_section_viewed', 'play_together', destination || 'unknown');
    setShowGeoSpyIntro(true);
  };

  const startGeoSpy = () => {
    trackEvent('geospy_started', 'play_together', destination || 'unknown');
    const prompt = selectGeoSpyPrompt();
    setGeoSpyCurrentPrompt(prompt);
    setGeoSpyUsedPrompts(prev => [...prev, prompt]);
    setShowGeoSpyIntro(false);
    setGeoSpyPhase('playing');
    
    // Speak the prompt aloud
    speakGeoSpyPrompt(prompt);
    trackEvent('geospy_prompt_shown', 'play_together', prompt);
  };

  const handleGeoSpyNext = () => {
    const prompt = selectGeoSpyPrompt();
    setGeoSpyCurrentPrompt(prompt);
    setGeoSpyUsedPrompts(prev => [...prev, prompt]);
    
    // Speak the new prompt aloud
    speakGeoSpyPrompt(prompt);
    trackEvent('geospy_prompt_shown', 'play_together', prompt);
  };

  const closeGeoSpy = () => {
    trackEvent('geospy_exited', 'play_together', destination || 'unknown');
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setGeoSpyPhase('idle');
    setGeoSpyCurrentPrompt(null);
    if (initialGame) onInitialGameDismissed?.();
  };

  const isLocked = !isActiveTrip;
  const isExhausted = playsToday >= maxPlaysToday;

  return (
    <>
      {/* Hub list hidden when initialGame is set — only the game dialogs below will show */}
      {!initialGame && <Card 
        className={`transition-all ${isLocked ? 'opacity-50 grayscale' : ''} ${isExhausted ? 'opacity-70' : ''} bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border-pink-200 dark:border-pink-800`}
        data-testid="card-play-together"
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Journey Games: Play Together
                  {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isLocked 
                    ? "Family games unlock when you start an adventure"
                    : "Quick games to enjoy as a family — in the car, at home, or between stops"
                  }
                </p>
              </div>
            </div>
          </div>

          {!isLocked && (
            <motion.button
              whileHover={{ scale: isExhausted ? 1 : 1.02 }}
              whileTap={{ scale: isExhausted ? 1 : 0.98 }}
              onClick={handleSectionClick}
              disabled={isExhausted}
              className={`w-full p-4 rounded-xl flex items-center gap-3 border transition-all ${
                isExhausted 
                  ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 hover:shadow-md'
              }`}
              data-testid="button-think-fast"
            >
              <span className="text-3xl">⚡</span>
              <div className="flex-1 text-left">
                <p className="font-bold">Think Fast!</p>
                <p className="text-xs text-muted-foreground">
                  {isExhausted 
                    ? "Play again tomorrow!" 
                    : `Name 10 things in 30 seconds • ${maxPlaysToday - playsToday} plays left today`
                  }
                </p>
              </div>
              {!isExhausted && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              {isExhausted && <Clock className="w-5 h-5 text-muted-foreground" />}
            </motion.button>
          )}

          {isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLockedModal(true)}
              className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-3 border border-gray-200 dark:border-gray-700"
              data-testid="button-think-fast-locked"
            >
              <span className="text-3xl opacity-50">⚡</span>
              <div className="flex-1 text-left">
                <p className="font-bold text-muted-foreground">Think Fast!</p>
                <p className="text-xs text-muted-foreground">Locked • Start an adventure to unlock</p>
              </div>
              <Lock className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {/* Scavenger Hunt Tile */}
          {!isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleScavengerClick}
              className="w-full p-4 mt-3 rounded-xl flex items-center gap-3 border transition-all bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800 hover:shadow-md"
              data-testid="button-scavenger-hunt"
            >
              <span className="text-3xl">🔍</span>
              <div className="flex-1 text-left">
                <p className="font-bold">Scavenger Hunt</p>
                <p className="text-xs text-muted-foreground">
                  Explore together and see what you notice
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLockedModal(true)}
              className="w-full p-4 mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-3 border border-gray-200 dark:border-gray-700"
              data-testid="button-scavenger-hunt-locked"
            >
              <span className="text-3xl opacity-50">🔍</span>
              <div className="flex-1 text-left">
                <p className="font-bold text-muted-foreground">Scavenger Hunt</p>
                <p className="text-xs text-muted-foreground">Locked • Start an adventure to unlock</p>
              </div>
              <Lock className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {/* In My Bag Tile */}
          {!isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInMyBagClick}
              className="w-full p-4 mt-3 rounded-xl flex items-center gap-3 border transition-all bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-indigo-200 dark:border-indigo-800 hover:shadow-md"
              data-testid="button-in-my-bag"
            >
              <span className="text-3xl">👜</span>
              <div className="flex-1 text-left">
                <p className="font-bold">What's In My Bag</p>
                <p className="text-xs text-muted-foreground">
                  Family memory game — listen and repeat together
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLockedModal(true)}
              className="w-full p-4 mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-3 border border-gray-200 dark:border-gray-700"
              data-testid="button-in-my-bag-locked"
            >
              <span className="text-3xl opacity-50">👜</span>
              <div className="flex-1 text-left">
                <p className="font-bold text-muted-foreground">What's In My Bag</p>
                <p className="text-xs text-muted-foreground">Locked • Start an adventure to unlock</p>
              </div>
              <Lock className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {/* GeoGuess: Think the Place Tile */}
          {!isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGeoGuessClick}
              className="w-full p-4 mt-3 rounded-xl flex items-center gap-3 border transition-all bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 border-cyan-200 dark:border-cyan-800 hover:shadow-md"
              data-testid="button-geoguess"
            >
              <span className="text-3xl">🌍</span>
              <div className="flex-1 text-left">
                <p className="font-bold">GeoGuess: Think the Place</p>
                <p className="text-xs text-muted-foreground">
                  Ask questions to figure out the mystery place
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLockedModal(true)}
              className="w-full p-4 mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-3 border border-gray-200 dark:border-gray-700"
              data-testid="button-geoguess-locked"
            >
              <span className="text-3xl opacity-50">🌍</span>
              <div className="flex-1 text-left">
                <p className="font-bold text-muted-foreground">GeoGuess: Think the Place</p>
                <p className="text-xs text-muted-foreground">Locked • Start an adventure to unlock</p>
              </div>
              <Lock className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {/* GeoSpy: I Spy tile */}
          {!isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGeoSpyClick}
              className="w-full p-4 mt-3 rounded-xl flex items-center gap-3 border transition-all bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800 hover:shadow-md"
              data-testid="button-geospy"
            >
              <span className="text-3xl">👁️</span>
              <div className="flex-1 text-left">
                <p className="font-bold">GeoSpy</p>
                <p className="text-xs text-muted-foreground">
                  Look around and notice the world together
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}

          {isLocked && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLockedModal(true)}
              className="w-full p-4 mt-3 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center gap-3 border border-gray-200 dark:border-gray-700"
              data-testid="button-geospy-locked"
            >
              <span className="text-3xl opacity-50">👁️</span>
              <div className="flex-1 text-left">
                <p className="font-bold text-muted-foreground">GeoSpy</p>
                <p className="text-xs text-muted-foreground">Locked • Start an adventure to unlock</p>
              </div>
              <Lock className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}
        </CardContent>
      </Card>}

      <Dialog open={showLockedModal} onOpenChange={setShowLockedModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Play Together
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              These games are designed for families to play together during an adventure.
              Start an adventure to unlock them.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={() => setShowLockedModal(false)} variant="outline">
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSetupScreen} onOpenChange={(open) => { setShowSetupScreen(open); if (!open && initialGame) onInitialGameDismissed?.(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              👨‍👩‍👧‍👦 Family Round
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg mb-2">Gather together — this one's better when everyone plays.</p>
            <p className="text-sm text-muted-foreground">
              There are no right or wrong answers. Just think fast and have fun.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={startGame}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              data-testid="button-start-think-fast"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            <Button variant="outline" onClick={() => { setShowSetupScreen(false); if (initialGame) onInitialGameDismissed?.(); }}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gamePhase === 'playing' || gamePhase === 'reveal' || gamePhase === 'complete'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <AnimatePresence mode="wait">
            {gamePhase === 'playing' && currentPrompt && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                    timeLeft <= 10 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {timeLeft}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Tap for each answer!</p>
                    <p className="text-2xl font-bold">{tapCount}/10</p>
                  </div>
                </div>

                <h2 className="text-xl font-bold mb-1">⚡ Name 10 things…</h2>
                <p className="text-base text-muted-foreground mb-4">{currentPrompt.prompt.replace('Name 10 things ', '')}</p>
                
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <motion.div
                      key={idx}
                      initial={false}
                      animate={idx < tapCount ? { scale: [1, 1.2, 1], backgroundColor: '#22c55e' } : {}}
                      className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center border-2 transition-all ${
                        idx < tapCount 
                          ? 'bg-green-500 border-green-600' 
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {idx < tapCount && <Check className="w-5 h-5 text-white" />}
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleTap}
                  disabled={tapCount >= 10}
                  className={`w-full py-6 rounded-2xl text-xl font-bold transition-all ${
                    tapCount >= 10
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700'
                  }`}
                  data-testid="button-tap-answer"
                >
                  {tapCount >= 10 ? '🎉 Amazing!' : '👆 Tap!'}
                </motion.button>
                
                {hitTenTaps && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-600 font-bold mt-3"
                  >
                    You got 10! Keep going if you want!
                  </motion.p>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleDone}
                    className="flex-1"
                    data-testid="button-close-game"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (timerRef.current) clearInterval(timerRef.current);
                      setGamePhase('reveal');
                    }}
                    className="flex-1"
                    data-testid="button-show-answers"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Show Me Answers
                  </Button>
                </div>
              </motion.div>
            )}

            {gamePhase === 'reveal' && currentPrompt && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-6"
              >
                <div className="mb-4">
                  <span className="text-4xl">{hitTenTaps ? '🎉' : '⏰'}</span>
                  <h2 className="text-xl font-bold mt-2">
                    {hitTenTaps ? 'Amazing teamwork!' : 'Nice thinking!'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    You counted {tapCount} together!
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3">
                    If you guessed some of these — great job! 🌟
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {currentPrompt.exampleAnswers.map((answer, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <span className="text-lg">{answer.emoji}</span>
                        <span className="text-xs">{answer.answer}</span>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    There are many more right answers — these are just a few!
                  </p>
                </div>

                <Button 
                  onClick={handleRevealComplete}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500"
                  data-testid="button-continue-think-fast"
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {gamePhase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-6"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <PartyPopper className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">🎉 That was fun!</h2>
                <p className="text-muted-foreground mb-6">
                  {playsToday >= maxPlaysToday 
                    ? "You've played all your rounds today. Play again tomorrow!"
                    : "Want to try another one?"
                  }
                </p>

                <div className="flex flex-col gap-2">
                  {playsToday < maxPlaysToday && (
                    <Button 
                      onClick={handlePlayAgain}
                      className="bg-gradient-to-r from-amber-500 to-orange-500"
                      data-testid="button-play-again"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={handleDone}
                    data-testid="button-done-think-fast"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Scavenger Hunt Intro Dialog */}
      <Dialog open={showScavengerIntro} onOpenChange={(open) => { setShowScavengerIntro(open); if (!open && initialGame) onInitialGameDismissed?.(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
              <Search className="w-6 h-6" />
              Family Scavenger Hunt
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg mb-2">Explore together and see what you notice.</p>
            <p className="text-sm text-muted-foreground">
              There's no rush and no right or wrong answers — take your time and have fun.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={startScavengerHunt}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
              data-testid="button-start-scavenger-hunt"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Hunt
            </Button>
            <Button variant="outline" onClick={() => { setShowScavengerIntro(false); if (initialGame) onInitialGameDismissed?.(); }}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scavenger Hunt Game Dialog */}
      <Dialog open={scavengerPhase === 'hunting' || scavengerPhase === 'complete'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <AnimatePresence mode="wait">
            {scavengerPhase === 'hunting' && (
              <motion.div
                key="hunting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-4 relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleScavengerExit}
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                  data-testid="button-close-hunt"
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                    <Search className="w-5 h-5" />
                    Your Hunt
                  </h2>
                  <p className="text-sm text-muted-foreground">Tap when you find something!</p>
                </div>

                <div className="space-y-3 mb-6">
                  {scavengerPrompts.map((prompt, idx) => (
                    <motion.div
                      key={prompt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        prompt.isFound 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700' 
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          prompt.isFound 
                            ? 'bg-emerald-500' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {prompt.isFound ? (
                            <Check className="w-5 h-5 text-white" />
                          ) : (
                            <MapPin className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${prompt.isFound ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                            {prompt.text}
                          </p>
                        </div>
                        {!prompt.isFound && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScavengerFound(prompt.id)}
                            className="flex-shrink-0 text-xs"
                            data-testid={`button-found-${prompt.id}`}
                          >
                            We found something!
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleScavengerExit}
                    className="flex-1"
                    data-testid="button-end-hunt"
                  >
                    End Hunt
                  </Button>
                  {scavengerPrompts.some(p => p.isFound) && (
                    <Button 
                      onClick={handleScavengerComplete}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500"
                      data-testid="button-finish-hunt"
                    >
                      Done Exploring
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {scavengerPhase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-6"
              >
                <div className="text-5xl mb-4">🌿</div>
                <h2 className="text-xl font-bold mb-2">Nice exploring together!</h2>
                <p className="text-muted-foreground mb-6">
                  Want to try another hunt or keep exploring?
                </p>

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleScavengerNewHunt}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500"
                    data-testid="button-new-hunt"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    New Hunt
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleScavengerExit}
                    data-testid="button-done-scavenger"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* In My Bag - Setup Dialog */}
      <Dialog open={showInMyBagIntro} onOpenChange={(open) => { setShowInMyBagIntro(open); if (!open && initialGame) onInitialGameDismissed?.(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
              <Briefcase className="w-5 h-5" />
              Family Memory Game
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-5xl mb-4">👜</div>
            <p className="text-base mb-2">
              One person reads the sentence out loud while everyone else listens.
            </p>
            <p className="text-sm text-muted-foreground">
              After each sentence, everyone repeats it together from memory!
            </p>
            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <p className="text-xs text-muted-foreground">
                There are no wrong answers — help each other and have fun.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={startInMyBag}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
              data-testid="button-start-in-my-bag"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            <Button variant="outline" onClick={() => { setShowInMyBagIntro(false); if (initialGame) onInitialGameDismissed?.(); }}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* In My Bag - Game Dialog */}
      <Dialog open={inMyBagPhase === 'playing' || inMyBagPhase === 'complete'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <AnimatePresence mode="wait">
            {inMyBagPhase === 'playing' && inMyBagContext && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-4 relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleInMyBagExit}
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                  data-testid="button-close-in-my-bag"
                >
                  <X className="w-4 h-4" />
                </Button>

                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Volume2 className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      Reader, say this out loud:
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Item {inMyBagCurrentIndex + 1} of {MAX_IN_MY_BAG_ITEMS}
                  </p>
                </div>

                <motion.div
                  key={inMyBagCurrentIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 p-6 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 mb-6"
                >
                  <p className="text-lg font-medium text-center leading-relaxed">
                    "{buildInMyBagSentence()}"
                  </p>
                </motion.div>

                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Now everyone repeat together!
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleInMyBagExit}
                    className="flex-1"
                    data-testid="button-end-in-my-bag"
                  >
                    End Game
                  </Button>
                  <Button 
                    onClick={handleInMyBagNext}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500"
                    data-testid="button-next-item"
                  >
                    {inMyBagCurrentIndex < MAX_IN_MY_BAG_ITEMS - 1 ? 'Next Item' : 'Finish'}
                  </Button>
                </div>
              </motion.div>
            )}

            {inMyBagPhase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-6"
              >
                <div className="text-5xl mb-4">🎒</div>
                <h2 className="text-xl font-bold mb-2">Nice remembering together!</h2>
                <p className="text-muted-foreground mb-6">
                  Want to play again or try another game?
                </p>

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleInMyBagPlayAgain}
                    className="bg-gradient-to-r from-indigo-500 to-violet-500"
                    data-testid="button-play-again-in-my-bag"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleInMyBagExit}
                    data-testid="button-done-in-my-bag"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* GeoGuess: Think the Place - Setup Dialog */}
      <Dialog open={showGeoGuessIntro} onOpenChange={(open) => { setShowGeoGuessIntro(open); if (!open && initialGame) onInitialGameDismissed?.(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              🌍 GeoGuess
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg mb-2 font-medium">I'm thinking of a place.</p>
            <p className="text-sm text-muted-foreground">
              Ask questions, narrow it down, and guess when you're ready.
            </p>
            <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Work together as a family to figure it out!
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={startGeoGuess}
              className="bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-600 hover:to-sky-600"
              data-testid="button-start-geoguess"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            <Button variant="outline" onClick={() => { setShowGeoGuessIntro(false); if (initialGame) onInitialGameDismissed?.(); }}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GeoGuess: Think the Place - Game Dialog */}
      <Dialog open={geoGuessPhase === 'playing' || geoGuessPhase === 'complete'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <AnimatePresence mode="wait">
            {geoGuessPhase === 'playing' && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-2 relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGeoGuessExit}
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
                  data-testid="button-close-geoguess"
                >
                  <X className="w-4 h-4" />
                </Button>

                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🌍</span>
                    <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                      I'm thinking of a place...
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Questions asked: {geoGuessQuestionsAsked} / 20
                  </p>
                </div>

                {/* Response Display - Shows both question and answer */}
                <AnimatePresence>
                  {geoGuessResponse && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="mb-4 p-4 bg-gradient-to-br from-cyan-100 to-sky-100 dark:from-cyan-900/40 dark:to-sky-900/40 rounded-xl border-2 border-cyan-300 dark:border-cyan-700"
                    >
                      {geoGuessLastAskedQuestion && (
                        <p className="text-sm text-cyan-600 dark:text-cyan-400 mb-2 text-center italic">
                          "{geoGuessLastAskedQuestion}"
                        </p>
                      )}
                      <div className="flex items-center justify-center gap-2">
                        <Volume2 className="w-5 h-5 text-cyan-600" />
                        <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300">
                          {geoGuessResponse.text}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Questions Grid */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-muted-foreground text-center">
                    {geoGuessQuestionsAsked >= MAX_GEOGUESS_QUESTIONS 
                      ? "You've asked all your questions — time to guess!"
                      : "Tap a question to ask:"
                    }
                  </p>
                  {geoGuessQuestions.map((question, idx) => {
                    const isQuestionsExhausted = geoGuessQuestionsAsked >= MAX_GEOGUESS_QUESTIONS;
                    const isDisabled = geoGuessIsProcessing || isQuestionsExhausted;
                    return (
                      <motion.button
                        key={question}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleGeoGuessQuestionClick(question)}
                        disabled={isDisabled}
                        className={`w-full p-3 text-left rounded-lg border transition-all ${
                          isDisabled
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-900 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-400'
                        }`}
                        data-testid={`button-question-${idx}`}
                      >
                        <span className="text-sm">{question}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Guess Input */}
                <div className="border-t pt-4 mt-4">
                  {geoGuessShowFirstGuessHint && geoGuessGuessesUsed === 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-center text-amber-600 dark:text-amber-400 mb-2"
                    >
                      You have 5 chances to guess. Keep asking questions to narrow it down.
                    </motion.p>
                  )}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={geoGuessInput}
                        onChange={(e) => setGeoGuessInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGeoGuessSubmit()}
                        placeholder={geoGuessIsListening ? "Listening..." : "Type or speak your guess"}
                        disabled={geoGuessIsProcessing}
                        spellCheck={true}
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="words"
                        className="w-full px-3 py-2 pr-10 text-sm border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                        data-testid="input-geoguess"
                      />
                      {isSpeechSupported && (
                        <button
                          type="button"
                          onClick={geoGuessIsListening ? stopListening : startListening}
                          disabled={geoGuessIsProcessing}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition-all ${
                            geoGuessIsListening 
                              ? 'text-red-500 bg-red-100 dark:bg-red-900/30 animate-pulse' 
                              : 'text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30'
                          }`}
                          aria-label={geoGuessIsListening ? "Stop listening" : "Speak your guess"}
                          aria-pressed={geoGuessIsListening}
                          data-testid="button-voice-input"
                        >
                          {geoGuessIsListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={handleGeoGuessSubmit}
                      disabled={!geoGuessInput.trim() || geoGuessIsProcessing}
                      className="bg-gradient-to-r from-cyan-500 to-sky-500"
                      data-testid="button-guess"
                    >
                      Guess
                    </Button>
                  </div>
                  {geoGuessGuessesUsed > 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {MAX_GEOGUESS_GUESSES - geoGuessGuessesUsed} guesses remaining
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {geoGuessPhase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-6"
              >
                <div className="text-5xl mb-4">{geoGuessIsCorrect ? '🎉' : '🌍'}</div>
                <h2 className="text-xl font-bold mb-2">Nice thinking together!</h2>
                <p className="text-muted-foreground mb-6">
                  Want to try another place or keep exploring?
                </p>

                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleGeoGuessPlayAgain}
                    className="bg-gradient-to-r from-cyan-500 to-sky-500"
                    data-testid="button-play-again-geoguess"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleGeoGuessExit}
                    data-testid="button-done-geoguess"
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* GeoSpy: I Spy - Setup Dialog */}
      <Dialog open={showGeoSpyIntro} onOpenChange={(open) => { setShowGeoSpyIntro(open); if (!open && initialGame) onInitialGameDismissed?.(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              👁️ GeoSpy
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-lg mb-2 font-medium">Look around and see what you notice.</p>
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3 mt-3">
              <p className="text-sm text-muted-foreground">
                There are no right answers — just point things out and have fun.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={startGeoSpy}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              data-testid="button-start-geospy"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            <Button variant="outline" onClick={() => { setShowGeoSpyIntro(false); if (initialGame) onInitialGameDismissed?.(); }}>
              Not now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GeoSpy: I Spy - Game Dialog */}
      <Dialog open={geoSpyPhase === 'playing'} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <div className="py-4 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={closeGeoSpy}
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
              data-testid="button-close-geospy"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">👁️</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  GeoSpy
                </span>
              </div>
            </div>

            {/* Current Prompt - Large and centered */}
            <AnimatePresence mode="wait">
              {geoSpyCurrentPrompt && (
                <motion.div
                  key={geoSpyCurrentPrompt}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-8"
                >
                  <div className="p-6 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700">
                    <div className="flex items-start gap-3 mb-3">
                      <Volume2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" />
                      <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200 leading-relaxed">
                        {geoSpyCurrentPrompt}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleGeoSpyNext}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                data-testid="button-next-geospy"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Next one
              </Button>
              <Button 
                variant="outline" 
                onClick={closeGeoSpy}
                data-testid="button-done-geospy"
              >
                Done
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Call out what you see — no need to tap anything!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
