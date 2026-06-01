import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/lib/apiClient";
import { useKids } from "@/lib/kidsContext";
import { F } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

type GameType = "think-fast" | "scavenger" | "geoguess" | "geospy" | "bag";

// ─── Think Fast — verbatim from PlayTogether.tsx ──────────────────────────────

interface ThinkFastPrompt {
  category: string;
  prompt: string;
  exampleAnswers: { emoji: string; answer: string }[];
}

const TIMER_DURATION = 30;

const GENERIC_PROMPTS: ThinkFastPrompt[] = [
  {
    category: "school",
    prompt: "Name 10 things you might find in a school",
    exampleAnswers: [
      { emoji: "📚", answer: "books" }, { emoji: "✏️", answer: "pencils" },
      { emoji: "🎒", answer: "backpacks" }, { emoji: "🔔", answer: "a bell" },
      { emoji: "🖼️", answer: "posters" }, { emoji: "🪑", answer: "desks" },
      { emoji: "📝", answer: "notebooks" }, { emoji: "🧑‍🏫", answer: "teachers" },
      { emoji: "🖍️", answer: "crayons" }, { emoji: "🏫", answer: "classrooms" },
    ],
  },
  {
    category: "blue_things",
    prompt: "Name 10 things that are blue",
    exampleAnswers: [
      { emoji: "🌊", answer: "ocean" }, { emoji: "☁️", answer: "sky" },
      { emoji: "🫐", answer: "blueberries" }, { emoji: "🐳", answer: "whales" },
      { emoji: "👖", answer: "jeans" }, { emoji: "🦋", answer: "butterflies" },
      { emoji: "💎", answer: "sapphires" }, { emoji: "🐦", answer: "bluebirds" },
      { emoji: "🧊", answer: "ice" }, { emoji: "🎀", answer: "ribbons" },
    ],
  },
  {
    category: "swimming_animals",
    prompt: "Name 10 animals that can swim",
    exampleAnswers: [
      { emoji: "🐟", answer: "fish" }, { emoji: "🐢", answer: "turtles" },
      { emoji: "🦆", answer: "ducks" }, { emoji: "🦭", answer: "seals" },
      { emoji: "🐊", answer: "crocodiles" }, { emoji: "🐬", answer: "dolphins" },
      { emoji: "🦈", answer: "sharks" }, { emoji: "🐸", answer: "frogs" },
      { emoji: "🦩", answer: "flamingos" }, { emoji: "🐻‍❄️", answer: "polar bears" },
    ],
  },
  {
    category: "kitchen",
    prompt: "Name 10 things in a kitchen",
    exampleAnswers: [
      { emoji: "🍳", answer: "pans" }, { emoji: "🥄", answer: "spoons" },
      { emoji: "🧊", answer: "refrigerator" }, { emoji: "🍽️", answer: "plates" },
      { emoji: "🫖", answer: "kettle" }, { emoji: "🔪", answer: "knives" },
      { emoji: "🧂", answer: "salt" }, { emoji: "🥣", answer: "bowls" },
      { emoji: "🧽", answer: "sponge" }, { emoji: "🍴", answer: "forks" },
    ],
  },
  {
    category: "breakfast",
    prompt: "Name 10 things people eat for breakfast",
    exampleAnswers: [
      { emoji: "🥣", answer: "cereal" }, { emoji: "🍳", answer: "eggs" },
      { emoji: "🥞", answer: "pancakes" }, { emoji: "🍞", answer: "toast" },
      { emoji: "🍌", answer: "bananas" }, { emoji: "🥓", answer: "bacon" },
      { emoji: "🧇", answer: "waffles" }, { emoji: "🍊", answer: "oranges" },
      { emoji: "🥛", answer: "milk" }, { emoji: "🍩", answer: "donuts" },
    ],
  },
  {
    category: "playground",
    prompt: "Name 10 things at a playground",
    exampleAnswers: [
      { emoji: "🛝", answer: "slide" }, { emoji: "🎠", answer: "swings" },
      { emoji: "⚽", answer: "balls" }, { emoji: "🧗", answer: "climbing frame" },
      { emoji: "🪣", answer: "sandbox" }, { emoji: "🌳", answer: "trees" },
      { emoji: "🪢", answer: "ropes" }, { emoji: "🎡", answer: "merry-go-round" },
      { emoji: "🪜", answer: "ladders" }, { emoji: "🏃", answer: "kids running" },
    ],
  },
  {
    category: "flying",
    prompt: "Name 10 things that can fly",
    exampleAnswers: [
      { emoji: "🐦", answer: "birds" }, { emoji: "✈️", answer: "airplanes" },
      { emoji: "🦋", answer: "butterflies" }, { emoji: "🎈", answer: "balloons" },
      { emoji: "🚁", answer: "helicopters" }, { emoji: "🐝", answer: "bees" },
      { emoji: "🪁", answer: "kites" }, { emoji: "🦅", answer: "eagles" },
      { emoji: "🪰", answer: "flies" }, { emoji: "🚀", answer: "rockets" },
    ],
  },
  {
    category: "birthday_party",
    prompt: "Name 10 things at a birthday party",
    exampleAnswers: [
      { emoji: "🎂", answer: "cake" }, { emoji: "🎁", answer: "presents" },
      { emoji: "🎈", answer: "balloons" }, { emoji: "🎉", answer: "party hats" },
      { emoji: "🕯️", answer: "candles" }, { emoji: "🍭", answer: "candy" },
      { emoji: "🎵", answer: "music" }, { emoji: "🎮", answer: "games" },
      { emoji: "🍕", answer: "pizza" }, { emoji: "👯", answer: "friends" },
    ],
  },
  {
    category: "round_things",
    prompt: "Name 10 things that are round",
    exampleAnswers: [
      { emoji: "🏀", answer: "basketball" }, { emoji: "🍊", answer: "orange" },
      { emoji: "🌍", answer: "Earth" }, { emoji: "🍪", answer: "cookies" },
      { emoji: "⏰", answer: "clock" }, { emoji: "🍕", answer: "pizza" },
      { emoji: "🌕", answer: "moon" }, { emoji: "🎯", answer: "target" },
      { emoji: "💿", answer: "CD" }, { emoji: "🍩", answer: "donut" },
    ],
  },
  {
    category: "car_trip",
    prompt: "Name 10 things you might bring on a car trip",
    exampleAnswers: [
      { emoji: "🎧", answer: "headphones" }, { emoji: "🍿", answer: "snacks" },
      { emoji: "📱", answer: "tablet" }, { emoji: "🧸", answer: "stuffed animal" },
      { emoji: "📖", answer: "books" }, { emoji: "🎮", answer: "games" },
      { emoji: "🧃", answer: "juice box" }, { emoji: "🛏️", answer: "pillow" },
      { emoji: "🗺️", answer: "map" }, { emoji: "🎵", answer: "music" },
    ],
  },
];

function getContextualPrompts(place: string): ThinkFastPrompt[] {
  return [
    {
      category: "see_here",
      prompt: `Name 10 things you might see in ${place}`,
      exampleAnswers: [
        { emoji: "🏛️", answer: "buildings" }, { emoji: "🌳", answer: "trees" },
        { emoji: "🚗", answer: "cars" }, { emoji: "👨‍👩‍👧‍👦", answer: "families" },
        { emoji: "🏪", answer: "shops" }, { emoji: "🚶", answer: "people walking" },
        { emoji: "🚌", answer: "buses" }, { emoji: "🌸", answer: "flowers" },
        { emoji: "🏠", answer: "houses" }, { emoji: "☀️", answer: "sunshine" },
      ],
    },
    {
      category: "eat_here",
      prompt: `Name 10 foods people might eat in ${place}`,
      exampleAnswers: [
        { emoji: "🍕", answer: "local dishes" }, { emoji: "🍦", answer: "ice cream" },
        { emoji: "🥗", answer: "fresh food" }, { emoji: "🍰", answer: "desserts" },
        { emoji: "🥤", answer: "drinks" }, { emoji: "🍜", answer: "noodles" },
        { emoji: "🍞", answer: "bread" }, { emoji: "🍎", answer: "fruits" },
        { emoji: "🧀", answer: "cheese" }, { emoji: "☕", answer: "coffee" },
      ],
    },
    {
      category: "sounds_here",
      prompt: `Name 10 sounds you might hear in ${place}`,
      exampleAnswers: [
        { emoji: "🚗", answer: "traffic" }, { emoji: "🐦", answer: "birds" },
        { emoji: "🗣️", answer: "people talking" }, { emoji: "🎵", answer: "music" },
        { emoji: "🌊", answer: "nature sounds" }, { emoji: "🔔", answer: "bells" },
        { emoji: "👏", answer: "clapping" }, { emoji: "🚂", answer: "trains" },
        { emoji: "🐕", answer: "dogs barking" }, { emoji: "💨", answer: "wind" },
      ],
    },
    {
      category: "daily_use",
      prompt: `Name 10 things people in ${place} might use every day`,
      exampleAnswers: [
        { emoji: "📱", answer: "phone" }, { emoji: "🔑", answer: "keys" },
        { emoji: "👜", answer: "bag" }, { emoji: "🚌", answer: "bus" },
        { emoji: "☕", answer: "coffee" }, { emoji: "💳", answer: "card" },
        { emoji: "🌂", answer: "umbrella" }, { emoji: "📰", answer: "newspaper" },
        { emoji: "🚲", answer: "bicycle" }, { emoji: "🥗", answer: "lunch" },
      ],
    },
  ];
}

function pickThinkFastPrompt(stopName: string, usedCategories: string[]): ThinkFastPrompt {
  const contextual = stopName ? getContextualPrompts(stopName) : [];
  const all = [...contextual, ...GENERIC_PROMPTS];
  const unused = all.filter((p) => !usedCategories.includes(p.category));
  const pool = unused.length > 0 ? unused : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Scavenger Hunt — verbatim from PlayTogether.tsx ─────────────────────────

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

// Verbatim from PlayTogether.tsx
function detectContextFromStop(stopName: string): { context: string; key: string } | null {
  const text = stopName.toLowerCase();
  if (text.includes("beach") || text.includes("ocean") || text.includes("coast") || text.includes("sea") || text.includes("bondi")) {
    return { context: "the beach", key: "beach" };
  }
  if (text.includes("zoo") || text.includes("aquarium") || text.includes("wildlife") || text.includes("safari") || text.includes("taronga")) {
    return { context: "the zoo", key: "zoo" };
  }
  if (text.includes("museum") || text.includes("gallery") || text.includes("exhibit")) {
    return { context: "the museum", key: "museum" };
  }
  if (text.includes("opera") || text.includes("theatre") || text.includes("theater") || text.includes("concert") || text.includes("symphony")) {
    return { context: "the opera house", key: "opera_house" };
  }
  if (text.includes("bridge") || text.includes("harbour") || text.includes("harbor") || text.includes("tower") || text.includes("downtown")) {
    return { context: "the city", key: "city" };
  }
  if (text.includes("waterfall") || text.includes("falls") || text.includes("cascade")) {
    return { context: "the waterfall", key: "waterfall" };
  }
  if (text.includes("chocolate") || text.includes("cacao") || text.includes("cocoa")) {
    return { context: "the chocolate farm", key: "chocolate_farm" };
  }
  if (text.includes("farm") || text.includes("ranch") || text.includes("orchard") || text.includes("vineyard")) {
    return { context: "the farm", key: "farm" };
  }
  if (text.includes("park") || text.includes("forest") || text.includes("trail") || text.includes("mountain") || text.includes("hiking") || text.includes("nature") || text.includes("garden") || text.includes("botanical")) {
    return { context: "the nature trail", key: "nature" };
  }
  return null;
}

function makeSeededRng(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

function generateScavengerPrompts(stopName: string, tripId: string, usedTexts: string[]): string[] {
  const today = new Date().toISOString().split("T")[0];
  const rng = makeSeededRng(`${tripId || "default"}-${today}-scavenger`);
  const shuffle = <T,>(arr: T[]): T[] => {
    const r = [...arr];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };

  const targetCount = 3 + Math.floor(rng() * 3); // 3–5

  // Experience-based prompts (all categories combined)
  const experiencePool: string[] = [];
  Object.values(EXPERIENCE_SCAVENGER_PROMPTS).forEach((arr) => experiencePool.push(...arr));

  // Theme-based prompts based on stop name
  const themePool: string[] = [];
  const lowerStop = stopName.toLowerCase();
  if (lowerStop.includes("beach") || lowerStop.includes("coast")) themePool.push(...(THEME_SCAVENGER_PROMPTS.beach ?? []));
  if (lowerStop.includes("museum") || lowerStop.includes("gallery")) themePool.push(...(THEME_SCAVENGER_PROMPTS.museum ?? []));
  if (lowerStop.includes("park") || lowerStop.includes("forest") || lowerStop.includes("nature")) themePool.push(...(THEME_SCAVENGER_PROMPTS.nature ?? []));
  if (lowerStop.includes("farm")) themePool.push(...(THEME_SCAVENGER_PROMPTS.farm ?? []));
  if (themePool.length === 0) themePool.push(...(THEME_SCAVENGER_PROMPTS.city ?? []));

  const contextualPool = shuffle([...experiencePool, ...themePool]).filter((p) => !usedTexts.includes(p));
  const genericPool = shuffle([...GENERIC_SCAVENGER_PROMPTS]).filter((p) => !usedTexts.includes(p));

  const out: string[] = [];
  let promptId = 0;
  while (out.length < targetCount) {
    if (contextualPool.length > 0 && out.length < Math.ceil(targetCount * 0.6)) {
      out.push(contextualPool.shift()!);
    } else if (genericPool.length > 0) {
      out.push(genericPool.shift()!);
    } else if (contextualPool.length > 0) {
      out.push(contextualPool.shift()!);
    } else {
      const all = shuffle([...GENERIC_SCAVENGER_PROMPTS]);
      if (all.length > 0) out.push(all[0]);
      else break;
    }
    promptId++;
  }
  return out;
}

// ─── GeoGuess — verbatim from PlayTogether.tsx ────────────────────────────────

const GEOGUESS_QUESTIONS = [
  // Geography & Location
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
  // Wonder & Famous places
  "Is it a wonder of the world?",
  "Is it a UNESCO World Heritage site?",
  "Is it one of the most famous places on Earth?",
  "Would you see it on a world map poster?",
  // Experience-based
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

const VISIBLE_QUESTIONS = 5;
const MAX_GEOGUESS_GUESSES = 5;

// ─── What's In My Bag — verbatim from PlayTogether.tsx ────────────────────────

const MAX_BAG_ITEMS = 8;

const IN_MY_BAG_ITEMS: Record<string, string[]> = {
  beach: [
    "a towel", "sunscreen", "a beach ball", "sunglasses", "a bucket",
    "a shovel", "flip flops", "a swimsuit", "a water bottle", "a seashell",
    "a picnic blanket", "a sun hat", "snorkeling goggles", "a book", "sandals",
  ],
  museum: [
    "a camera", "a notebook", "a pencil", "a map", "a water bottle",
    "headphones", "a museum ticket", "comfortable shoes", "a jacket", "a magnifying glass",
    "a sketchbook", "a snack bar", "a phone", "a bag", "a guidebook",
  ],
  zoo: [
    "binoculars", "a camera", "sunscreen", "a water bottle", "snacks",
    "a hat", "comfortable shoes", "a map", "a backpack", "sunglasses",
    "a raincoat", "a phone", "a notebook", "a picnic blanket", "a jacket",
  ],
  opera_house: [
    "a ticket", "nice clothes", "a jacket", "a phone", "mints",
    "a wallet", "a small bag", "comfortable shoes", "a shawl", "glasses",
    "a handkerchief", "a camera", "a program", "a watch", "keys",
  ],
  nature: [
    "binoculars", "a water bottle", "trail mix", "a compass", "sunscreen",
    "hiking boots", "a raincoat", "a camera", "bug spray", "a hat",
    "a walking stick", "a map", "a flashlight", "a whistle", "a backpack",
  ],
  farm: [
    "rubber boots", "a basket", "work gloves", "a water bottle", "a hat",
    "seeds", "a snack", "sunscreen", "a camera", "a shovel",
    "an apple", "carrots", "a brush", "a bucket", "a towel",
  ],
  city: [
    "a map", "walking shoes", "a camera", "a wallet", "a phone",
    "sunglasses", "a water bottle", "an umbrella", "a transit card", "snacks",
    "headphones", "a backpack", "a guidebook", "coins", "a jacket",
  ],
  waterfall: [
    "waterproof shoes", "a towel", "a camera", "a rain jacket", "a water bottle",
    "sandals", "sunscreen", "bug spray", "a dry bag", "a hat",
    "swimming clothes", "snacks", "a phone case", "flip flops", "a backpack",
  ],
  chocolate_farm: [
    "a camera", "a notebook", "a water bottle", "comfortable shoes", "sunscreen",
    "a hat", "a bag for samples", "a towel", "bug spray", "snacks",
    "a backpack", "a jacket", "a pen", "sunglasses", "a phone",
  ],
  wedding: [
    "nice clothes", "a gift", "comfortable shoes", "a camera", "tissues",
    "a card", "an umbrella", "mints", "sunglasses", "flowers",
    "a tie", "a dress", "a wallet", "a phone", "a jacket",
  ],
  vacation: [
    "a suitcase", "a passport", "sunglasses", "a camera", "comfortable shoes",
    "a book", "snacks", "headphones", "a travel pillow", "a toothbrush",
    "a phone charger", "swimwear", "a hat", "a jacket", "a backpack",
  ],
  grocery: [
    "shopping bags", "a grocery list", "a wallet", "coupons", "a water bottle",
    "keys", "a phone", "a cart quarter", "hand sanitizer", "reusable bags",
    "a pen", "snacks", "sunglasses", "a jacket", "a backpack",
  ],
};

// Generic contexts for 2:1 mixing (verbatim from PlayTogether.tsx)
const GENERIC_CONTEXTS = [
  { context: "a grocery store", key: "grocery" },
  { context: "a vacation", key: "vacation" },
  { context: "a wedding", key: "wedding" },
];

function selectBagContext(
  stopName: string,
  usedKeys: string[],
  playCount: number,
): { context: string; key: string } {
  // 2:1 pattern: plays 1,2 are contextual; play 3 is generic (then repeat)
  const isGenericTurn = (playCount + 1) % 3 === 0;

  const stopCtx = detectContextFromStop(stopName);
  const availableStop = stopCtx && !usedKeys.includes(stopCtx.key) ? [stopCtx] : [];
  const availableGeneric = GENERIC_CONTEXTS.filter((c) => !usedKeys.includes(c.key));

  if (isGenericTurn && availableGeneric.length > 0) {
    return availableGeneric[Math.floor(Math.random() * availableGeneric.length)];
  }
  if (availableStop.length > 0) {
    return availableStop[0];
  }
  if (availableGeneric.length > 0) {
    return availableGeneric[Math.floor(Math.random() * availableGeneric.length)];
  }
  // All used — reset
  const all = stopCtx ? [stopCtx, ...GENERIC_CONTEXTS] : GENERIC_CONTEXTS;
  return all[Math.floor(Math.random() * all.length)];
}

function getBagItems(key: string): string[] {
  const pool = IN_MY_BAG_ITEMS[key] ?? IN_MY_BAG_ITEMS.vacation;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, MAX_BAG_ITEMS);
}

function buildBagSentence(context: string, items: string[], index: number): string {
  const slice = items.slice(0, index + 1);
  const list =
    slice.length === 1
      ? slice[0]
      : slice.slice(0, -1).join(", ") + ", and " + slice[slice.length - 1];
  return `When going to ${context}, my bag has ${list}.`;
}

// ─── GeoSpy — verbatim from PlayTogether.tsx ─────────────────────────────────

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

const ALL_GEOSPY_PROMPTS = [
  ...GEOSPY_PROMPTS.visual,
  ...GEOSPY_PROMPTS.sensory,
  ...GEOSPY_PROMPTS.contextual,
];

// ─── Shared UI ────────────────────────────────────────────────────────────────

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={sh.backBtn} onPress={onPress}>
      <Text style={sh.backBtnText}>← Back to Games</Text>
    </Pressable>
  );
}

function IntroScreen({
  icon, title, subtitle, description, note, btnLabel, btnColor, onStart, onBack,
}: {
  icon: string; title: string; subtitle: string; description: string;
  note?: string; btnLabel: string; btnColor: string;
  onStart: () => void; onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[sh.centered, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={sh.introIcon}>{icon}</Text>
      <Text style={sh.introTitle}>{title}</Text>
      <Text style={sh.introSub}>{subtitle}</Text>
      <Text style={sh.introDesc}>{description}</Text>
      {note ? (
        <View style={sh.introNote}>
          <Text style={sh.introNoteText}>{note}</Text>
        </View>
      ) : null}
      <Pressable
        style={[sh.btn, { backgroundColor: btnColor, marginTop: 28 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onStart(); }}
      >
        <Text style={sh.btnText}>{btnLabel}</Text>
      </Pressable>
      <Pressable style={{ marginTop: 14 }} onPress={onBack}>
        <Text style={sh.backBtnText}>← Back to Games</Text>
      </Pressable>
    </View>
  );
}

function DoneScreen({
  emoji, title, subtitle, accent, onPlayAgain, onBack, playAgainLabel,
}: {
  emoji: string; title: string; subtitle?: string; accent: string;
  onPlayAgain?: () => void; onBack: () => void; playAgainLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[sh.centered, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={sh.doneEmoji}>{emoji}</Text>
      <Text style={[sh.doneTitle, { color: accent }]}>{title}</Text>
      {subtitle ? <Text style={sh.doneSub}>{subtitle}</Text> : null}
      {onPlayAgain && (
        <Pressable
          style={[sh.btn, { backgroundColor: accent, marginTop: 32 }]}
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onPlayAgain(); }}
        >
          <Text style={sh.btnText}>{playAgainLabel ?? "Play Again"}</Text>
        </Pressable>
      )}
      <Pressable
        style={[sh.btn, { backgroundColor: "#E5E7EB", marginTop: onPlayAgain ? 12 : 32 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onBack(); }}
      >
        <Text style={[sh.btnText, { color: "#374151" }]}>← Back to Games</Text>
      </Pressable>
    </View>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#7C3AED", "#E8692A", "#22C55E", "#F59E0B", "#2563EB", "#EC4899"];

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      x: Math.random() * 340,
      size: 7 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      isCircle: i % 3 !== 0,
      delay: Math.floor(Math.random() * 500),
      duration: 1800 + Math.floor(Math.random() * 800),
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    pieces.forEach(({ anim, delay, duration }) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
    return () => pieces.forEach(({ anim }) => anim.stopAnimation());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 700] });
        const rotate = p.anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: p.isCircle ? p.size / 2 : 2,
              backgroundColor: p.color,
              transform: [{ translateY }, { rotate }],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Think Fast! ─────────────────────────────────────────────────────────────

function ThinkFast({ stopName }: { stopName: string }) {
  const insets = useSafeAreaInsets();
  type Phase = "intro" | "playing" | "reveal" | "complete";
  const [phase, setPhase] = useState<Phase>("intro");
  const [prompt, setPrompt] = useState<ThinkFastPrompt | null>(null);
  const [usedCategories, setUsedCategories] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [tapCount, setTapCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startGame = () => {
    const p = pickThinkFastPrompt(stopName, usedCategories);
    setPrompt(p);
    setUsedCategories((prev) => [...prev, p.category]);
    setTimeLeft(TIMER_DURATION);
    setTapCount(0);
    setPhase("playing");
  };

  useEffect(() => {
    if (phase !== "playing") { clearTimer(); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          // tapCount captured via closure is stale; use functional updater to read it
          setTapCount((c) => { setPhase(c >= 10 ? "complete" : "reveal"); return c; });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase]);

  useEffect(() => () => clearTimer(), []);

  // ── INTRO ──
  if (phase === "intro" || !prompt) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FF6B2B" }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 64, marginBottom: 12 }}>⚡</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 26, color: "#fff", textAlign: "center", marginBottom: 6 }}>Think Fast!</Text>
          <Text style={{ fontFamily: F.semibold, fontSize: 15, color: "rgba(255,255,255,0.8)", textAlign: "center", marginBottom: 12 }}>Name 10 things in 30 seconds</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 15, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 22 }}>Everyone shouts answers as fast as they can. Tap once for each answer!</Text>
          <View style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.9)", textAlign: "center" }}>No wrong answers — just keep going!</Text>
          </View>
          <Pressable
            style={{ backgroundColor: "#fff", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, marginTop: 28 }}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startGame(); }}
          >
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: "#FF6B2B" }}>Start — 30 seconds!</Text>
          </Pressable>
          <Pressable style={{ marginTop: 14 }} onPress={() => router.back()}>
            <Text style={{ fontFamily: F.semibold, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>← Back to Games</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── PLAYING ──
  if (phase === "playing") {
    const timerColor = timeLeft <= 5 ? "#EF4444" : timeLeft <= 10 ? "#F59E0B" : "#fff";
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FF6B2B" }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Timer + counter */}
        <View style={tf.timerRow}>
          <View style={tf.timerCircle}>
            <Text style={[tf.timerNum, { color: timerColor }]}>{timeLeft}</Text>
            <Text style={tf.timerLabel}>sec</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={tf.tapHint}>Tap for each answer!</Text>
            <Text style={tf.tapCount}>{tapCount} / 10</Text>
          </View>
        </View>

        {/* Prompt */}
        <View style={tf.promptCard}>
          <Text style={tf.promptLabel}>⚡ NAME 10 THINGS…</Text>
          <Text style={tf.promptText}>{prompt.prompt.replace("Name 10 things ", "")}</Text>
        </View>

        {/* 10 progress dots */}
        <View style={tf.dots}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={[tf.dot, { backgroundColor: i < tapCount ? "#fff" : "rgba(255,255,255,0.35)" }]}>
              {i < tapCount && <Text style={tf.dotCheck}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Big orange tap button */}
        <Pressable
          style={tf.tapBtn}
          onPress={() => {
            if (tapCount >= 10) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const next = tapCount + 1;
            setTapCount(next);
            if (next >= 10) { clearTimer(); setPhase("complete"); }
          }}
          disabled={tapCount >= 10}
        >
          <Text style={tf.tapBtnText}>👆 Tap!</Text>
        </Pressable>

        {/* Bottom row — Close first, Show Me Answers second */}
        <View style={tf.rowBtns}>
          <Pressable style={tf.smBtn} onPress={() => { clearTimer(); setPhase("intro"); setPrompt(null); }}>
            <Text style={tf.smBtnText}>Close</Text>
          </Pressable>
          <Pressable style={tf.smBtn} onPress={() => { clearTimer(); setPhase("reveal"); }}>
            <Text style={tf.smBtnText}>Show Me Answers</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── REVEAL (timer ran out, didn't get all 10) ──
  if (phase === "reveal" && prompt) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FF6B2B" }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 52, marginBottom: 8 }}>⏰</Text>
        <Text style={[sh.doneTitle, { color: "#fff" }]}>Time's up!</Text>
        <Text style={[sh.doneSub, { color: "rgba(255,255,255,0.8)" }]}>You named {tapCount} / 10</Text>

        <View style={tf.revealBox}>
          <Text style={tf.revealLabel}>Some example answers — great job if you got any! 🌟</Text>
          {/* Answer chips */}
          <View style={tf.chipRow}>
            {prompt.exampleAnswers.map((a, i) => (
              <View key={i} style={tf.chip}>
                <Text style={{ fontSize: 16 }}>{a.emoji}</Text>
                <Text style={tf.chipText}>{a.answer}</Text>
              </View>
            ))}
          </View>
          <Text style={tf.revealNote}>There are many more right answers — these are just a few!</Text>
        </View>

        <Pressable
          style={[sh.btn, { backgroundColor: "#fff", marginTop: 24, alignSelf: "stretch" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startGame(); }}
        >
          <Text style={[sh.btnText, { color: "#FF6B2B" }]}>⚡ Play Again</Text>
        </Pressable>
        <Pressable
          style={[sh.btn, { backgroundColor: "rgba(255,255,255,0.2)", marginTop: 12, alignSelf: "stretch" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Text style={sh.btnText}>← Back to Games</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── COMPLETE (got all 10!) ──
  return (
    <View style={{ flex: 1, backgroundColor: "#FF6B2B" }}>
      <Confetti />
      <View style={[sh.centered, { backgroundColor: "transparent" }]}>
        <Text style={{ fontSize: 72, marginBottom: 12 }}>⚡</Text>
        <Text style={[sh.doneTitle, { color: "#fff" }]}>Amazing!</Text>
        <Text style={[sh.doneSub, { marginBottom: 0, color: "rgba(255,255,255,0.8)" }]}>You named them all!</Text>
        <Pressable
          style={[sh.btn, { backgroundColor: "#fff", marginTop: 32 }]}
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); startGame(); }}
        >
          <Text style={[sh.btnText, { color: "#FF6B2B" }]}>⚡ Play Again</Text>
        </Pressable>
        <Pressable
          style={[sh.btn, { backgroundColor: "rgba(255,255,255,0.2)", marginTop: 12 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Text style={sh.btnText}>← Back to Games</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Scavenger Hunt ───────────────────────────────────────────────────────────

function ScavengerHunt({ stopName, tripId }: { stopName: string; tripId: string }) {
  type Phase = "hunting" | "complete";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("hunting");
  const [items, setItems] = useState<{ text: string; found: boolean }[]>([]);
  const [usedTexts, setUsedTexts] = useState<string[]>([]);

  const seedHunt = useCallback((used: string[]) => {
    const prompts = generateScavengerPrompts(stopName, tripId, used);
    setItems(prompts.map((text) => ({ text, found: false })));
    setPhase("hunting");
  }, [stopName, tripId]);

  // Seed immediately on mount — no intro screen
  useEffect(() => { seedHunt([]); }, []);

  // Auto-complete when every item is found
  useEffect(() => {
    if (items.length === 0) return;
    if (items.every((item) => item.found)) {
      const t = setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUsedTexts((prev) => [...prev, ...items.map((i) => i.text)]);
        setPhase("complete");
      }, 450);
      return () => clearTimeout(t);
    }
  }, [items]);

  const foundCount = items.filter((i) => i.found).length;

  // ── HUNTING ──
  if (phase === "hunting") {
    const progressPct = items.length > 0 ? (foundCount / items.length) * 100 : 0;
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
        {/* Green header */}
        <View style={[sc.hdr, { paddingTop: insets.top + 8 }]}>
          <Pressable style={sc.hdrBack} onPress={() => router.back()}>
            <Text style={sc.hdrBackText}>← Games</Text>
          </Pressable>
          <Text style={sc.hdrTitle}>🔍 Your Hunt</Text>
          <Text style={sc.hdrSub}>
            {foundCount > 0 ? `${foundCount} / ${items.length} found` : "Tap when you find something!"}
          </Text>
          <View style={sc.progBar}>
            <View style={[sc.progFill, { width: `${progressPct}%` as any }]} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: insets.bottom + 88,
            paddingHorizontal: 20,
          }}
        >
          {items.map((item, i) => (
            <Pressable
              key={i}
              style={[sc.card, item.found && sc.cardFound]}
              onPress={() => {
                if (item.found) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setItems((prev) => prev.map((p, j) => j === i ? { ...p, found: true } : p));
              }}
              disabled={item.found}
            >
              {/* Icon box */}
              <View style={[sc.iconBox, item.found && sc.iconBoxFound]}>
                <Text style={[sc.iconGlyph, item.found && sc.iconGlyphFound]}>
                  {item.found ? "✓" : "📍"}
                </Text>
              </View>

              {/* Prompt text */}
              <Text style={[sc.cardText, item.found && sc.cardTextFound]} numberOfLines={3}>
                {item.text}
              </Text>

              {/* CTA — disappears when found */}
              {!item.found && (
                <View style={sc.foundBtn}>
                  <Text style={sc.foundBtnText}>We found it! →</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* End Hunt — outline only */}
        <View style={[sc.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={sc.endBtn} onPress={() => router.back()}>
            <Text style={sc.endBtnText}>End Hunt</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── COMPLETE ──
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
      {/* Green header */}
      <View style={[sc.hdr, { paddingTop: insets.top + 8 }]}>
        <Pressable style={sc.hdrBack} onPress={() => router.back()}>
          <Text style={sc.hdrBackText}>← Games</Text>
        </Pressable>
        <Text style={sc.hdrTitle}>🎉 Hunt Complete!</Text>
        <Text style={sc.hdrSub}>You found everything!</Text>
        <View style={sc.progBar}>
          <View style={[sc.progFill, { width: "100%" }]} />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
          alignItems: "center",
        }}
      >

        {/* All items shown with green ✓ */}
        <View style={{ width: "100%", marginBottom: 32 }}>
          {items.map((item, i) => (
            <View key={i} style={[sc.card, sc.cardFound, { marginBottom: 8 }]}>
              <View style={sc.iconBoxFound}>
                <Text style={sc.iconGlyphFound}>✓</Text>
              </View>
              <Text style={sc.cardTextFound}>{item.text}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[sh.btn, { backgroundColor: "#7C3AED", alignSelf: "stretch" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); seedHunt(usedTexts); }}
        >
          <Text style={sh.btnText}>🔍 New Hunt</Text>
        </Pressable>
        <Pressable
          style={[sh.btn, { backgroundColor: "#F3F4F6", alignSelf: "stretch", marginTop: 12 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Text style={[sh.btnText, { color: "#374151" }]}>← Back to Games</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── GeoGuess ─────────────────────────────────────────────────────────────────

async function fetchGeoGuessAnswer(
  target: string,
  question: string,
  stopId?: string,
): Promise<string> {
  try {
    const token = await AsyncStorage.getItem("authToken");
    const res = await fetch(`${API_BASE}/api/geoguess/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ target, question, stopId, token }),
    });
    const data = await res.json();
    return data.answer || "That depends";
  } catch {
    const fallbacks = ["Yes", "No", "Sometimes", "Kind of", "That depends"];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

interface QCard {
  text: string;
  answer: string | null;
  loading: boolean;
}

function answerColor(a: string): string {
  const l = a.toLowerCase();
  if (l.startsWith("yes") || l === "correct" || l === "right") return "#3DAA6E";
  if (l.startsWith("no") || l === "nope" || l === "never") return "#DC2626";
  return "#F59E0B";
}

function GeoGuess({ stopName, stopId, tripId }: { stopName: string; stopId: string; tripId: string }) {
  type Phase = "intro" | "playing" | "complete";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("intro");
  const [target, setTarget] = useState("");
  const [usedTargets, setUsedTargets] = useState<string[]>([]);
  const [tripStopNames, setTripStopNames] = useState<string[]>([]);
  const [cards, setCards] = useState<QCard[]>([]);
  const [seenQuestions, setSeenQuestions] = useState<string[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [guess, setGuess] = useState("");
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const wrongMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch other stops in this trip so we can use real city places as targets
  useEffect(() => {
    if (!tripId) return;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const res = await fetch(`${API_BASE}/api/travel/trips/${tripId}/stops`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        const names: string[] = (data.stops ?? [])
          .map((s: { name: string }) => s.name)
          .filter((n: string) => n.toLowerCase() !== stopName.toLowerCase());
        if (names.length > 0) setTripStopNames(names);
      } catch {
        // Fall back to GLOBAL_LANDMARKS silently
      }
    })();
  }, [tripId, stopName]);

  const pickTarget = useCallback((): string => {
    // Use other trip stops (same city/trip) first; fall back to world landmarks.
    // NEVER pick the current stop — the player is already there.
    const base = tripStopNames.length > 0 ? tripStopNames : GLOBAL_LANDMARKS;
    const available = base.filter(
      (t) => t.toLowerCase() !== stopName.toLowerCase() && !usedTargets.includes(t)
    );
    const pool = available.length > 0 ? available : base.filter(
      (t) => t.toLowerCase() !== stopName.toLowerCase()
    );
    return pool[Math.floor(Math.random() * pool.length)];
  }, [stopName, usedTargets, tripStopNames]);

  const pickCards = useCallback((seen: string[]): QCard[] => {
    const pool = GEOGUESS_QUESTIONS.filter((q) => !seen.includes(q));
    const source = pool.length >= VISIBLE_QUESTIONS ? pool : GEOGUESS_QUESTIONS;
    return [...source]
      .sort(() => Math.random() - 0.5)
      .slice(0, VISIBLE_QUESTIONS)
      .map((text) => ({ text, answer: null, loading: false }));
  }, []);

  const startGame = useCallback(() => {
    const t = pickTarget();
    const initial = pickCards([]);
    const seen = initial.map((c) => c.text);
    setTarget(t);
    setUsedTargets((prev) => [...prev, t]);
    setCards(initial);
    setSeenQuestions(seen);
    setQuestionsAsked(0);
    setGuess("");
    setWrongMsg(null);
    setIsCorrect(false);
    setPhase("playing");
  }, [pickTarget, pickCards]);

  const refreshCards = () => {
    const fresh = pickCards(seenQuestions);
    const freshSeen = fresh.map((c) => c.text);
    setCards(fresh);
    setSeenQuestions((prev) => [...prev, ...freshSeen]);
  };

  const handleQuestion = async (idx: number) => {
    if (cards[idx].answer !== null || cards[idx].loading) return;
    if (questionsAsked >= 20) return;

    // Mark loading
    setCards((prev) => prev.map((c, i) => i === idx ? { ...c, loading: true } : c));
    setQuestionsAsked((n) => n + 1);

    const answer = await fetchGeoGuessAnswer(target, cards[idx].text, stopId);

    // Set answer on this card, keep it in place
    setCards((prev) => prev.map((c, i) =>
      i === idx ? { ...c, answer, loading: false } : c
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleGuess = async () => {
    const g = guess.trim();
    if (!g || isGuessing) return;
    setIsGuessing(true);
    setGuess("");

    const correct =
      g.toLowerCase() === target.toLowerCase() ||
      target.toLowerCase().includes(g.toLowerCase()) ||
      g.toLowerCase().includes(target.toLowerCase());

    if (correct) {
      setIsCorrect(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { setPhase("complete"); setIsGuessing(false); }, 600);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (wrongMsgTimer.current) clearTimeout(wrongMsgTimer.current);
      setWrongMsg("Not quite! Keep asking questions…");
      wrongMsgTimer.current = setTimeout(() => { setWrongMsg(null); }, 2500);
      setIsGuessing(false);
    }
  };

  useEffect(() => () => { if (wrongMsgTimer.current) clearTimeout(wrongMsgTimer.current); }, []);

  // ── INTRO ──
  if (phase === "intro") {
    return (
      <View style={[sh.centered, { backgroundColor: "#152D4A" }]}>
        <Text style={{ fontSize: 64, marginBottom: 12 }}>🌍</Text>
        <Text style={[gg.introTitle, { color: "#fff" }]}>I'm thinking of a place...</Text>
        <Text style={[gg.introSub, { color: "rgba(255,255,255,0.6)" }]}>Ask yes/no questions to figure it out</Text>
        <View style={[gg.introCountBadge, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
          <Text style={[gg.introCountText, { color: "rgba(255,255,255,0.8)" }]}>Questions asked: 0 / 20</Text>
        </View>
        <Pressable
          style={[sh.btn, { backgroundColor: "#3B82F6", marginTop: 32, paddingHorizontal: 40 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startGame(); }}
        >
          <Text style={sh.btnText}>Start Guessing</Text>
        </Pressable>
        <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ fontFamily: F.semibold, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>← Back to Games</Text>
        </Pressable>
      </View>
    );
  }

  // ── PLAYING ──
  if (phase === "playing") {
    const allAnswered = cards.length > 0 && cards.every((c) => c.answer !== null);
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#152D4A" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={gg.title}>🌍 I'm thinking of a place...</Text>
          <Text style={gg.asked}>Questions asked: {questionsAsked} / 20</Text>

          {/* Question cards */}
          <Text style={gg.sectionLabel}>Tap a question to ask:</Text>
          {cards.map((card, i) => {
            const answered = card.answer !== null;
            const ac = answered ? answerColor(card.answer!) : null;
            return (
              <Pressable
                key={card.text}
                style={[gg.qCard, answered && gg.qCardAnswered]}
                onPress={() => handleQuestion(i)}
                disabled={answered || card.loading}
              >
                <Text style={[gg.qText, answered && gg.qTextAnswered]} numberOfLines={2}>
                  {card.text}
                </Text>
                {card.loading && (
                  <View style={gg.answerBadge}>
                    <Text style={gg.answerBadgeText}>…</Text>
                  </View>
                )}
                {answered && (
                  <View style={[gg.answerBadge, { backgroundColor: ac! }]}>
                    <Text style={gg.answerBadgeText}>{card.answer}</Text>
                  </View>
                )}
                {!answered && !card.loading && (
                  <Text style={gg.qArrow}>→</Text>
                )}
              </Pressable>
            );
          })}

          {/* Refresh questions */}
          <Pressable
            style={gg.refreshBtn}
            onPress={refreshCards}
            disabled={questionsAsked >= 20}
          >
            <Text style={gg.refreshBtnText}>↻ Get new questions</Text>
          </Pressable>

          {/* Guess input */}
          <Text style={[gg.sectionLabel, { marginTop: 24 }]}>Ready to guess?</Text>
          <View style={gg.guessRow}>
            <TextInput
              style={gg.guessInput}
              placeholder="Type or speak your guess"
              placeholderTextColor="#9CA3AF"
              value={guess}
              onChangeText={setGuess}
              onSubmitEditing={handleGuess}
              returnKeyType="done"
              editable={!isGuessing}
            />
            <Pressable
              style={[gg.guessBtn, { opacity: (!guess.trim() || isGuessing) ? 0.4 : 1 }]}
              onPress={handleGuess}
              disabled={!guess.trim() || isGuessing}
            >
              <Text style={gg.guessBtnText}>Guess</Text>
            </Pressable>
          </View>

          {/* Wrong guess toast */}
          {wrongMsg && (
            <View style={gg.wrongMsg}>
              <Text style={gg.wrongMsgText}>{wrongMsg}</Text>
            </View>
          )}

          <BackBtn onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── COMPLETE ──
  return (
    <View style={[sh.centered, { backgroundColor: "#152D4A" }]}>
      <Text style={{ fontSize: 72, marginBottom: 12 }}>🌍</Text>
      <Text style={[sh.doneTitle, { color: "#fff" }]}>You got it!</Text>
      <View style={gg.revealBox}>
        <Text style={gg.revealLabel}>The place was</Text>
        <Text style={gg.revealPlace}>{target}</Text>
      </View>
      <Pressable
        style={[sh.btn, { backgroundColor: "#3B82F6", marginTop: 32 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startGame(); }}
      >
        <Text style={sh.btnText}>🌍 Play Again</Text>
      </Pressable>
      <Pressable
        style={[sh.btn, { backgroundColor: "rgba(255,255,255,0.15)", marginTop: 12 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
      >
        <Text style={sh.btnText}>← Back to Games</Text>
      </Pressable>
    </View>
  );
}

// ─── What's In My Bag ─────────────────────────────────────────────────────────

function WhatsInMyBag({ stopName }: { stopName: string }) {
  type Phase = "intro" | "playing" | "complete";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("intro");
  const [context, setContext] = useState<{ context: string; key: string } | null>(null);
  const [bagItems, setBagItems] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [usedKeys, setUsedKeys] = useState<string[]>([]);
  const [playCount, setPlayCount] = useState(0);

  const startGame = useCallback(() => {
    const ctx = selectBagContext(stopName, usedKeys, playCount);
    const items = getBagItems(ctx.key);
    setContext(ctx);
    setBagItems(items);
    setIndex(0);
    setUsedKeys((prev) => [...prev, ctx.key]);
    setPlayCount((n) => n + 1);
    setPhase("playing");
  }, [stopName, usedKeys, playCount]);

  // ── INTRO ──
  if (phase === "intro") {
    return (
      <View style={[sh.centered, { backgroundColor: "#FFF8F0" }]}>
        <Text style={{ fontSize: 64, marginBottom: 12 }}>👜</Text>
        <Text style={bag.introTitle}>What's In My Bag?</Text>
        <Text style={bag.introSub}>One person reads, everyone repeats!</Text>
        <View style={bag.themeBadge}>
          <Text style={bag.themeText}>
            Going to <Text style={{ color: "#7C3AED", fontFamily: F.bold }}>{stopName}</Text>, my bag has...
          </Text>
        </View>
        <Pressable
          style={[sh.btn, { backgroundColor: "#7C3AED", marginTop: 32, paddingHorizontal: 40 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startGame(); }}
        >
          <Text style={sh.btnText}>Start Game</Text>
        </Pressable>
        <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={sh.backBtnText}>← Back to Games</Text>
        </Pressable>
      </View>
    );
  }

  // ── PLAYING ──
  if (phase === "playing" && context) {
    const sentence = buildBagSentence(context.context, bagItems, index);
    const isLast = index >= MAX_BAG_ITEMS - 1;
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
        {/* Amber-brown header */}
        <View style={[bag.hdr, { paddingTop: insets.top + 8 }]}>
          <Pressable style={bag.hdrBack} onPress={() => router.back()}>
            <Text style={bag.hdrBackText}>← Games</Text>
          </Pressable>
          <Text style={bag.hdrTitle}>👜 What's In My Bag?</Text>
          <Text style={bag.hdrSub}>One person reads, everyone repeats!</Text>
          <Text style={bag.hdrCount}>Item {index + 1} of {MAX_BAG_ITEMS}</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 20,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
        >
          <View style={bag.readerBadge}>
            <Text style={bag.readerText}>🔊 Reader, say this out loud:</Text>
          </View>

          <View style={bag.sentenceBox}>
            <Text style={bag.sentence}>"{sentence}"</Text>
          </View>

          <Text style={bag.repeatHint}>Now everyone repeat together!</Text>

          <View style={bag.btnRow}>
            <Pressable
              style={bag.endBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            >
              <Text style={bag.endBtnText}>End Game</Text>
            </Pressable>
            <Pressable
              style={[sh.btn, { backgroundColor: "#7C3AED", flex: 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (isLast) { setPhase("complete"); } else { setIndex((n) => n + 1); }
              }}
            >
              <Text style={sh.btnText}>{isLast ? "Finish! 🎒" : "Next Item →"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── COMPLETE ──
  const fullSentence = context
    ? buildBagSentence(context.context, bagItems, MAX_BAG_ITEMS - 1)
    : "";
  return (
    <View style={[sh.centered, { backgroundColor: "#FFF8F0", paddingHorizontal: 24 }]}>
      <Text style={{ fontSize: 72, marginBottom: 12 }}>🎒</Text>
      <Text style={[sh.doneTitle, { color: "#7C3AED" }]}>Amazing memory!</Text>
      <View style={bag.sentenceBox}>
        <Text style={bag.sentence}>"{fullSentence}"</Text>
      </View>
      <Pressable
        style={[sh.btn, { backgroundColor: "#7C3AED", marginTop: 24 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startGame(); }}
      >
        <Text style={sh.btnText}>👜 Play Again</Text>
      </Pressable>
      <Pressable
        style={[sh.btn, { backgroundColor: "#F3F4F6", marginTop: 12 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
      >
        <Text style={[sh.btnText, { color: "#374151" }]}>← Back to Games</Text>
      </Pressable>
    </View>
  );
}

// ─── GeoSpy ───────────────────────────────────────────────────────────────────

function GeoSpy() {
  type Phase = "intro" | "playing";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);

  const selectPrompt = useCallback((exclude?: string): string => {
    const available = ALL_GEOSPY_PROMPTS.filter((p) => !usedPrompts.includes(p) && p !== exclude);
    const pool = available.length > 0 ? available : ALL_GEOSPY_PROMPTS.filter((p) => p !== exclude);
    if (pool.length === 0) {
      setUsedPrompts([]);
      return ALL_GEOSPY_PROMPTS[Math.floor(Math.random() * ALL_GEOSPY_PROMPTS.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, [usedPrompts]);

  const startSpy = () => {
    const p = selectPrompt();
    setCurrentPrompt(p);
    setUsedPrompts((prev) => [...prev, p]);
    setPhase("playing");
  };

  const nextPrompt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const p = selectPrompt(currentPrompt ?? undefined);
    setCurrentPrompt(p);
    setUsedPrompts((prev) => [...prev, p]);
  };

  // ── INTRO ──
  if (phase === "intro") {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
        <View style={[spy.hdr, { paddingTop: insets.top + 8 }]}>
          <Pressable style={spy.hdrBack} onPress={() => router.back()}>
            <Text style={spy.hdrBackText}>← Games</Text>
          </Pressable>
          <Text style={spy.hdrTitle}>👁 GeoSpy</Text>
          <Text style={spy.hdrSub}>Look around and call out what you see!</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 28 }}>👁</Text>
          <Pressable
            style={[sh.btn, { backgroundColor: "#5B21B6", paddingHorizontal: 40, alignSelf: "stretch" }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startSpy(); }}
          >
            <Text style={sh.btnText}>Start Spying</Text>
          </Pressable>
          <Pressable style={{ marginTop: 16 }} onPress={() => router.back()}>
            <Text style={sh.backBtnText}>← Back to Games</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── PLAYING (infinite) ──
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8F0" }}>
      <View style={[spy.hdr, { paddingTop: insets.top + 8 }]}>
        <Pressable style={spy.hdrBack} onPress={() => router.back()}>
          <Text style={spy.hdrBackText}>← Games</Text>
        </Pressable>
        <Text style={spy.hdrTitle}>👁 GeoSpy</Text>
        <Text style={spy.hdrSub}>Look around and call out what you see!</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          alignItems: "center",
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <View style={spy.promptCard}>
          <Text style={spy.promptIcon}>🔊</Text>
          <Text style={spy.promptText}>{currentPrompt}</Text>
        </View>

        <Text style={spy.hint}>Call out what you see — no need to tap anything!</Text>

        <Pressable
          style={[sh.btn, { backgroundColor: "#3DAA6E", alignSelf: "stretch", marginTop: 28 }]}
          onPress={nextPrompt}
        >
          <Text style={sh.btnText}>✨ Next one →</Text>
        </Pressable>

        <Pressable
          style={spy.doneBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Text style={spy.doneBtnText}>Done</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function GamePlay() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const kids = useKids();
  const stopName = kids.stopName || "your stop";
  const stopId = kids.stopId || "";
  const tripId = kids.tripId || "";

  const gameType: GameType =
    (["think-fast", "scavenger", "geoguess", "geospy", "bag"] as GameType[]).includes(type as GameType)
      ? (type as GameType)
      : "think-fast";

  if (gameType === "scavenger") return <ScavengerHunt stopName={stopName} tripId={tripId} />;
  if (gameType === "geoguess")  return <GeoGuess stopName={stopName} stopId={stopId} tripId={tripId} />;
  if (gameType === "geospy")    return <GeoSpy />;
  if (gameType === "bag")       return <WhatsInMyBag stopName={stopName} />;
  return <ThinkFast stopName={stopName} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, backgroundColor: "#FFF8F0",
  },
  btn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, alignItems: "center" },
  btnText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  gameTitle: { fontFamily: F.bold, fontSize: 24, marginBottom: 6 },
  backBtn: { alignItems: "center", paddingVertical: 20 },
  backBtnText: { fontFamily: F.semibold, fontSize: 14, color: "#9CA3AF" },
  introIcon: { fontSize: 64, marginBottom: 12 },
  introTitle: { fontFamily: F.bold, fontSize: 26, color: "#1C1917", textAlign: "center", marginBottom: 6 },
  introSub: { fontFamily: F.semibold, fontSize: 15, color: "#78716C", textAlign: "center", marginBottom: 12 },
  introDesc: { fontFamily: F.medium, fontSize: 15, color: "#374151", textAlign: "center", lineHeight: 22 },
  introNote: { marginTop: 16, backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  introNoteText: { fontFamily: F.medium, fontSize: 13, color: "#6B7280", textAlign: "center" },
  doneEmoji: { fontSize: 72, marginBottom: 12 },
  doneTitle: { fontFamily: F.bold, fontSize: 26, textAlign: "center", marginBottom: 8 },
  doneSub: { fontFamily: F.medium, fontSize: 15, color: "#78716C", textAlign: "center", paddingHorizontal: 16 },
});

const tf = StyleSheet.create({
  timerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  timerCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.2)", borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  timerNum: { fontFamily: F.bold, fontSize: 52, lineHeight: 58 },
  timerLabel: { fontFamily: F.bold, fontSize: 11, color: "rgba(255,255,255,0.7)" },
  tapHint: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  tapCount: { fontFamily: F.bold, fontSize: 24, color: "#fff" },
  promptCard: {
    backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, padding: 20,
    marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  promptLabel: { fontFamily: F.bold, fontSize: 12, color: "rgba(255,255,255,0.8)", letterSpacing: 0.8, marginBottom: 6 },
  promptText: { fontFamily: F.bold, fontSize: 28, color: "#fff", lineHeight: 36 },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  dot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "rgba(255,255,255,0.7)",
  },
  dotCheck: { fontFamily: F.bold, fontSize: 14, color: "#FF6B2B" },
  tapBtn: {
    backgroundColor: "#fff", borderRadius: 18, paddingVertical: 22,
    alignItems: "center", marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  tapBtnText: { fontFamily: F.bold, fontSize: 22, color: "#FF6B2B" },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 0 },
  smBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  smBtnText: { fontFamily: F.semibold, fontSize: 13, color: "#fff" },
  revealBox: {
    backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)", padding: 20, width: "100%", marginTop: 20,
  },
  revealLabel: { fontFamily: F.semibold, fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 12, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
  },
  chipText: { fontFamily: F.semibold, fontSize: 13, color: "#fff" },
  revealNote: { fontFamily: F.medium, fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 12, fontStyle: "italic" },
});

const sc = StyleSheet.create({
  // Green header
  hdr: { backgroundColor: "#065F46", paddingHorizontal: 20, paddingBottom: 20, overflow: "hidden" },
  hdrBack: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start", marginBottom: 16,
  },
  hdrBackText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  hdrTitle: { fontFamily: F.bold, fontSize: 30, color: "#fff", marginBottom: 4 },
  hdrSub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 14 },
  progBar: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" },
  progFill: { height: 4, backgroundColor: "#fff", borderRadius: 2 },
  // Item cards
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5,
    borderColor: "rgba(28,25,23,0.08)", padding: 14, marginBottom: 10,
  },
  cardFound: { backgroundColor: "#ECFDF5", borderColor: "#6EE7B7" },
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#F0FDF4",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  iconBoxFound: { backgroundColor: "#D1FAE5" },
  iconGlyph: { fontSize: 20 },
  iconGlyphFound: { fontSize: 16, color: "#16A34A", fontFamily: F.bold },
  cardText: { fontFamily: F.bold, fontSize: 14, color: "#1C1917", flex: 1, lineHeight: 20 },
  cardTextFound: { fontFamily: F.medium, fontSize: 14, color: "#6B7280", flex: 1, lineHeight: 20, textDecorationLine: "line-through" },
  // "We found it!" pill
  foundBtn: {
    backgroundColor: "#065F46", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9, flexShrink: 0,
  },
  foundBtnText: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
  // Bottom bar
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: "#FFF8F0", borderTopWidth: 1, borderTopColor: "rgba(28,25,23,0.06)",
  },
  endBtn: {
    borderRadius: 16, paddingVertical: 15, alignItems: "center",
    borderWidth: 2, borderColor: "#065F46",
  },
  endBtnText: { fontFamily: F.bold, fontSize: 15, color: "#065F46" },
});

const gg = StyleSheet.create({
  // Intro (base styles — overridden inline for navy bg)
  introTitle: { fontFamily: F.bold, fontSize: 22, color: "#7C3AED", textAlign: "center", marginBottom: 8 },
  introSub: { fontFamily: F.medium, fontSize: 15, color: "#78716C", textAlign: "center", marginBottom: 20 },
  introCountBadge: { backgroundColor: "#F3F0FF", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  introCountText: { fontFamily: F.semibold, fontSize: 14, color: "#7C3AED" },
  // Playing header
  title: { fontFamily: F.bold, fontSize: 20, color: "#fff", marginBottom: 4 },
  asked: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20 },
  sectionLabel: { fontFamily: F.semibold, fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, marginBottom: 10 },
  // Question cards — dark translucent for navy bg
  qCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)", padding: 15, marginBottom: 8,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  qCardAnswered: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" },
  qText: { fontFamily: F.bold, fontSize: 15, color: "#fff", flex: 1 },
  qTextAnswered: { color: "rgba(255,255,255,0.45)" },
  qArrow: { fontFamily: F.bold, fontSize: 18, color: "rgba(255,255,255,0.6)" },
  answerBadge: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0,
  },
  answerBadgeText: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
  // Refresh
  refreshBtn: {
    alignSelf: "center", marginTop: 4, marginBottom: 8,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  refreshBtnText: { fontFamily: F.semibold, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  // Guess input
  guessRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  guessInput: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: F.medium, fontSize: 15, color: "#fff",
  },
  guessBtn: { backgroundColor: "#3B82F6", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13 },
  guessBtnText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
  // Wrong guess toast
  wrongMsg: {
    marginTop: 10, backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
  },
  wrongMsgText: { fontFamily: F.semibold, fontSize: 13, color: "#F87171", textAlign: "center" },
  // Complete
  revealBox: {
    marginTop: 20, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)", paddingHorizontal: 32, paddingVertical: 20, alignItems: "center",
  },
  revealLabel: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 },
  revealPlace: { fontFamily: F.bold, fontSize: 24, color: "#fff", textAlign: "center" },
});

const bag = StyleSheet.create({
  // Amber-brown header
  hdr: { backgroundColor: "#92400E", paddingHorizontal: 20, paddingBottom: 20 },
  hdrBack: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start", marginBottom: 16,
  },
  hdrBackText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  hdrTitle: { fontFamily: F.bold, fontSize: 30, color: "#fff", marginBottom: 4 },
  hdrSub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 4 },
  hdrCount: { fontFamily: F.medium, fontSize: 12, color: "rgba(255,255,255,0.5)" },
  // Intro
  introTitle: { fontFamily: F.bold, fontSize: 22, color: "#7C3AED", textAlign: "center", marginBottom: 8 },
  introSub: { fontFamily: F.medium, fontSize: 15, color: "#78716C", textAlign: "center", marginBottom: 20 },
  themeBadge: {
    backgroundColor: "#F3F0FF", borderRadius: 16, borderWidth: 1.5,
    borderColor: "#C4B5FD", paddingHorizontal: 20, paddingVertical: 14,
    alignItems: "center", maxWidth: 300,
  },
  themeText: { fontFamily: F.medium, fontSize: 15, color: "#4B5563", textAlign: "center" },
  // Playing
  readerBadge: {
    backgroundColor: "#FEF3C7", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start", marginBottom: 16,
  },
  readerText: { fontFamily: F.semibold, fontSize: 13, color: "#92400E" },
  sentenceBox: {
    backgroundColor: "#fff", borderRadius: 20, borderWidth: 2,
    borderColor: "#F59E0B", borderLeftWidth: 4, borderLeftColor: "#F59E0B",
    padding: 24, marginBottom: 20,
  },
  sentence: { fontFamily: F.semibold, fontSize: 18, color: "#1C1917", textAlign: "center", lineHeight: 28 },
  repeatHint: { fontFamily: F.medium, fontSize: 14, color: "#78716C", textAlign: "center", marginBottom: 8, fontStyle: "italic" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  endBtn: {
    flex: 1, borderRadius: 16, borderWidth: 2, borderColor: "#92400E",
    alignItems: "center", justifyContent: "center", paddingVertical: 14,
  },
  endBtnText: { fontFamily: F.bold, fontSize: 15, color: "#92400E" },
});

const spy = StyleSheet.create({
  // Purple header
  hdr: { backgroundColor: "#5B21B6", paddingHorizontal: 20, paddingBottom: 20 },
  hdrBack: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start", marginBottom: 16,
  },
  hdrBackText: { fontFamily: F.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  hdrTitle: { fontFamily: F.bold, fontSize: 30, color: "#fff", marginBottom: 4 },
  hdrSub: { fontFamily: F.medium, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  // Intro / Playing (kept for stray refs)
  introTitle: { fontFamily: F.bold, fontSize: 26, color: "#7C3AED", textAlign: "center", marginBottom: 8 },
  introSub: { fontFamily: F.medium, fontSize: 15, color: "#78716C", textAlign: "center", maxWidth: 260 },
  title: { fontFamily: F.bold, fontSize: 20, color: "#7C3AED", marginBottom: 28 },
  // Prompt card — white with purple-tinted shadow
  promptCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 36,
    alignItems: "center", width: "100%", marginBottom: 20,
    borderWidth: 2, borderColor: "rgba(91,33,182,0.08)",
    shadowColor: "#5B21B6", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  promptIcon: { fontSize: 36, marginBottom: 16 },
  promptText: { fontFamily: F.bold, fontSize: 24, color: "#1C1917", textAlign: "center", lineHeight: 34 },
  hint: { fontFamily: F.medium, fontSize: 13, color: "#9CA3AF", textAlign: "center", marginBottom: 4 },
  nextBtn: { backgroundColor: "#5B21B6", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12 },
  nextBtnText: { fontFamily: F.bold, fontSize: 15, color: "#fff", textAlign: "center" },
  doneBtn: {
    alignSelf: "stretch", marginTop: 12, borderRadius: 16, borderWidth: 2,
    borderColor: "#5B21B6", alignItems: "center", justifyContent: "center", paddingVertical: 14,
  },
  doneBtnText: { fontFamily: F.bold, fontSize: 15, color: "#5B21B6" },
});
