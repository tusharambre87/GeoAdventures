import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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

// ─── Think Fast — Prompt Data ─────────────────────────────────────────────────

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
  ];
}

function pickThinkFastPrompt(stopName: string, usedCategories: string[]): ThinkFastPrompt {
  const contextual = stopName ? getContextualPrompts(stopName) : [];
  const all = [...contextual, ...GENERIC_PROMPTS];
  const unused = all.filter((p) => !usedCategories.includes(p.category));
  const pool = unused.length > 0 ? unused : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Scavenger Hunt — Data ────────────────────────────────────────────────────

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

function detectTheme(stopName: string): string | null {
  const t = stopName.toLowerCase();
  if (t.includes("beach") || t.includes("ocean") || t.includes("coast") || t.includes("sea")) return "beach";
  if (t.includes("museum") || t.includes("gallery") || t.includes("exhibit")) return "museum";
  if (t.includes("park") || t.includes("forest") || t.includes("trail") || t.includes("garden") || t.includes("nature")) return "nature";
  if (t.includes("farm") || t.includes("ranch") || t.includes("orchard")) return "farm";
  if (t.includes("bridge") || t.includes("tower") || t.includes("downtown") || t.includes("city")) return "city";
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

function generateScavengerPrompts(stopName: string, tripId: string): string[] {
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

  const theme = detectTheme(stopName);
  const themePool: string[] = theme ? (THEME_SCAVENGER_PROMPTS[theme] ?? []) : [];
  const target = 3 + Math.floor(rng() * 3); // 3–5 items

  const contextual = shuffle(themePool);
  const generic = shuffle([...GENERIC_SCAVENGER_PROMPTS]);

  const out: string[] = [];
  while (out.length < target) {
    if (contextual.length > 0 && out.length < Math.ceil(target * 0.6)) {
      out.push(contextual.shift()!);
    } else if (generic.length > 0) {
      out.push(generic.shift()!);
    } else if (contextual.length > 0) {
      out.push(contextual.shift()!);
    } else {
      break;
    }
  }
  return out;
}

// ─── GeoGuess — Data ──────────────────────────────────────────────────────────

const GEOGUESS_QUESTIONS = [
  "Is it in North America?", "Is it in Europe?", "Is it in Asia?",
  "Is it in the Southern Hemisphere?", "Is it near an ocean?",
  "Is it on an island?", "Is it in a hot climate?", "Is it in a cold place?",
  "Is it near mountains?", "Is it in a desert?",
  "Is it a wonder of the world?", "Is it a UNESCO World Heritage site?",
  "Is it one of the most famous places on Earth?",
  "Is it outdoors?", "Is it near water?", "Do many people visit this place?",
  "Can you walk around it?", "Is it more natural than man-made?",
  "Is it famous for photos?", "Is it noisy most of the time?",
  "Can you go inside?", "Is it very old?", "Would you find it in a city?",
  "Is it taller than a house?", "Can you see it from far away?",
  "Do people eat there?", "Is it colorful?", "Is it made of stone?",
  "Do people come here to learn?", "Is it related to animals?",
  "Would you bring a camera here?", "Is it free to visit?",
  "Is it surrounded by nature?", "Is it a building?",
  "Would families visit here?", "Is it a famous landmark?",
  "Do people come here for fun?", "Is it peaceful and quiet?",
];

const GLOBAL_LANDMARKS = [
  "Eiffel Tower", "Colosseum", "Sydney Opera House", "Great Wall of China",
  "Machu Picchu", "Taj Mahal", "Statue of Liberty", "Big Ben",
  "Golden Gate Bridge", "Christ the Redeemer", "Pyramids of Giza",
  "Tower of Pisa", "Mount Fuji", "Niagara Falls", "Grand Canyon",
  "Stonehenge", "Acropolis", "Chichen Itza", "Petra", "Angkor Wat",
  "Santorini", "Venice Canals", "Great Barrier Reef",
  "Yellowstone National Park", "Disneyland",
];

const VISIBLE_QUESTIONS = 5;
const MAX_GEOGUESS_GUESSES = 5;

// ─── What's In My Bag — Data ──────────────────────────────────────────────────

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
  vacation: [
    "a suitcase", "a passport", "sunglasses", "a camera", "comfortable shoes",
    "a book", "snacks", "headphones", "a travel pillow", "a toothbrush",
    "a phone charger", "swimwear", "a hat", "a jacket", "a backpack",
  ],
};

function detectBagContext(stopName: string): { context: string; key: string } {
  const t = stopName.toLowerCase();
  if (t.includes("beach") || t.includes("ocean") || t.includes("coast") || t.includes("sea"))
    return { context: "the beach", key: "beach" };
  if (t.includes("museum") || t.includes("gallery"))
    return { context: "the museum", key: "museum" };
  if (t.includes("zoo") || t.includes("aquarium") || t.includes("wildlife"))
    return { context: "the zoo", key: "zoo" };
  if (t.includes("farm") || t.includes("ranch") || t.includes("orchard"))
    return { context: "the farm", key: "farm" };
  if (t.includes("park") || t.includes("forest") || t.includes("trail") || t.includes("nature"))
    return { context: "the nature trail", key: "nature" };
  if (t.includes("bridge") || t.includes("tower") || t.includes("downtown"))
    return { context: "the city", key: "city" };
  return { context: stopName || "a vacation", key: "vacation" };
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

// ─── GeoSpy — Data ────────────────────────────────────────────────────────────

const GEOSPY_PROMPTS = [
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
  "I spy something that makes a sound",
  "I spy something that feels rough",
  "I spy something that smells interesting",
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
];

// ─── Shared UI ────────────────────────────────────────────────────────────────

function BackBtn({ label = "← Back to Games", onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable style={sh.backBtn} onPress={onPress}>
      <Text style={sh.backBtnText}>{label}</Text>
    </Pressable>
  );
}

function IntroScreen({
  icon, title, subtitle, description, note, btnLabel, btnColor,
  onStart, onBack,
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

// ─── Think Fast! ─────────────────────────────────────────────────────────────

function ThinkFastGame({ stopName }: { stopName: string }) {
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
        if (t <= 1) { clearTimer(); setPhase("reveal"); return 0; }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase]);

  useEffect(() => () => clearTimer(), []);

  if (phase === "intro" || !prompt) {
    return (
      <IntroScreen
        icon="⚡"
        title="Think Fast!"
        subtitle="Name 10 things in 30 seconds"
        description="Everyone shouts answers as fast as they can. Tap the button once for each answer you name!"
        note="No wrong answers — just keep going!"
        btnLabel="Start!"
        btnColor="#F59E0B"
        onStart={startGame}
        onBack={() => router.back()}
      />
    );
  }

  if (phase === "playing") {
    const timerColor = timeLeft <= 10 ? "#DC2626" : "#F59E0B";
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFBEB" }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={tf.timerRow}>
          <View style={[tf.timerCircle, { borderColor: timerColor }]}>
            <Text style={[tf.timerNum, { color: timerColor }]}>{timeLeft}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={tf.tapHint}>Tap for each answer!</Text>
            <Text style={tf.tapCount}>{tapCount} / 10</Text>
          </View>
        </View>

        <Text style={tf.promptLabel}>⚡ Name 10 things…</Text>
        <Text style={tf.promptText}>{prompt.prompt.replace("Name 10 things ", "")}</Text>

        {/* 10 dots */}
        <View style={tf.dots}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={[tf.dot, { backgroundColor: i < tapCount ? "#22C55E" : "#E5E7EB" }]}>
              {i < tapCount && <Text style={tf.dotCheck}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Tap button */}
        <Pressable
          style={[tf.tapBtn, tapCount >= 10 && { backgroundColor: "#22C55E" }]}
          onPress={() => {
            if (tapCount >= 10) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTapCount((n) => n + 1);
          }}
          disabled={tapCount >= 10}
        >
          <Text style={tf.tapBtnText}>{tapCount >= 10 ? "🎉 Amazing!" : "👆 Tap!"}</Text>
        </Pressable>

        <View style={tf.rowBtns}>
          <Pressable
            style={tf.smBtn}
            onPress={() => { clearTimer(); setPhase("reveal"); }}
          >
            <Text style={tf.smBtnText}>Show Answers</Text>
          </Pressable>
          <Pressable
            style={tf.smBtn}
            onPress={() => { clearTimer(); setPhase("intro"); setPrompt(null); }}
          >
            <Text style={tf.smBtnText}>Close</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (phase === "reveal") {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFBEB" }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 52, marginBottom: 8 }}>{tapCount >= 10 ? "🎉" : "⏰"}</Text>
        <Text style={sh.doneTitle}>{tapCount >= 10 ? "Amazing teamwork!" : "Nice thinking!"}</Text>
        <Text style={sh.doneSub}>You counted {tapCount} together!</Text>

        <View style={tf.revealBox}>
          <Text style={tf.revealLabel}>If you guessed some of these — great job! 🌟</Text>
          <View style={tf.revealGrid}>
            {prompt.exampleAnswers.map((a, i) => (
              <View key={i} style={tf.revealItem}>
                <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                <Text style={tf.revealItemText}>{a.answer}</Text>
              </View>
            ))}
          </View>
          <Text style={tf.revealNote}>There are many more right answers — these are just a few!</Text>
        </View>

        <Pressable
          style={[sh.btn, { backgroundColor: "#22C55E", marginTop: 24, alignSelf: "stretch" }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPhase("complete"); }}
        >
          <Text style={sh.btnText}>Continue</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // complete
  return (
    <DoneScreen
      emoji="🎉"
      title="That was fun!"
      subtitle="Want to try another one?"
      accent="#F59E0B"
      onPlayAgain={startGame}
      onBack={() => router.back()}
      playAgainLabel="⚡ Play Again"
    />
  );
}

// ─── Scavenger Hunt ───────────────────────────────────────────────────────────

function ScavengerGame({ stopName, tripId }: { stopName: string; tripId: string }) {
  type Phase = "intro" | "hunting" | "complete";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("intro");
  const [items, setItems] = useState<{ text: string; found: boolean }[]>([]);

  const startHunt = useCallback(() => {
    const prompts = generateScavengerPrompts(stopName, tripId);
    setItems(prompts.map((text) => ({ text, found: false })));
    setPhase("hunting");
  }, [stopName, tripId]);

  if (phase === "intro") {
    return (
      <IntroScreen
        icon="🔍"
        title="Scavenger Hunt"
        subtitle="Explore together and see what you notice"
        description="Work as a family to find each item. Tap when you spot something!"
        note="No rush — take your time and have fun."
        btnLabel="Start Hunt"
        btnColor="#16A34A"
        onStart={startHunt}
        onBack={() => router.back()}
      />
    );
  }

  if (phase === "hunting") {
    const foundCount = items.filter((i) => i.found).length;
    return (
      <View style={{ flex: 1, backgroundColor: "#F0FDF4" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 80, paddingHorizontal: 20 }}
        >
          <Text style={[sh.gameTitle, { color: "#16A34A" }]}>🔍 Your Hunt</Text>
          <Text style={sc.hint}>Tap when you find something!</Text>
          <Text style={[sc.count, { color: "#16A34A" }]}>{foundCount} / {items.length} found</Text>

          {items.map((item, i) => (
            <Pressable
              key={i}
              style={[sc.item, item.found && sc.itemFound]}
              onPress={() => {
                if (item.found) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setItems((prev) => prev.map((p, j) => j === i ? { ...p, found: true } : p));
              }}
            >
              <View style={[sc.circle, item.found && { backgroundColor: "#16A34A", borderColor: "#16A34A" }]}>
                <Text style={{ color: item.found ? "#fff" : "#9CA3AF", fontFamily: F.bold, fontSize: 13 }}>
                  {item.found ? "✓" : (i + 1).toString()}
                </Text>
              </View>
              <Text style={[sc.itemText, item.found && sc.itemTextDone]}>{item.text}</Text>
              {!item.found && (
                <View style={sc.foundBtn}>
                  <Text style={sc.foundBtnText}>Found!</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View style={[sc.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[sh.btn, { backgroundColor: "#E5E7EB", flex: 1 }]}
            onPress={() => setPhase("intro")}
          >
            <Text style={[sh.btnText, { color: "#374151" }]}>End Hunt</Text>
          </Pressable>
          {foundCount > 0 && (
            <Pressable
              style={[sh.btn, { backgroundColor: "#16A34A", flex: 1 }]}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setPhase("complete"); }}
            >
              <Text style={sh.btnText}>Done Exploring ✓</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // complete
  return (
    <DoneScreen
      emoji="🌿"
      title="Nice exploring together!"
      subtitle="Want to try another hunt or keep exploring?"
      accent="#16A34A"
      onPlayAgain={startHunt}
      onBack={() => router.back()}
      playAgainLabel="🔍 New Hunt"
    />
  );
}

// ─── GeoGuess ─────────────────────────────────────────────────────────────────

async function fetchGeoGuessAnswer(target: string, question: string): Promise<string> {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/geoguess/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ target, question }),
    });
    const data = await res.json();
    return data.answer || "That depends";
  } catch {
    const fallbacks = ["Yes", "No", "Sometimes", "Kind of", "That depends"];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

function GeoGuessGame({ stopName }: { stopName: string }) {
  type Phase = "intro" | "playing" | "complete";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("intro");
  const [target, setTarget] = useState<string>("");
  const [usedTargets, setUsedTargets] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [guess, setGuess] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const pickTarget = useCallback((): string => {
    // Prefer the current stop, then global landmarks
    const candidates = stopName
      ? [stopName, ...GLOBAL_LANDMARKS.filter((l) => l !== stopName)]
      : GLOBAL_LANDMARKS;
    const available = candidates.filter((t) => !usedTargets.includes(t));
    const pool = available.length > 0 ? available : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [stopName, usedTargets]);

  const pickQuestions = (): string[] => {
    return [...GEOGUESS_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, VISIBLE_QUESTIONS);
  };

  const startGame = () => {
    const t = pickTarget();
    const q = pickQuestions();
    setTarget(t);
    setUsedTargets((prev) => [...prev, t]);
    setQuestions(q);
    setUsedQuestions([...q]);
    setQuestionsAsked(0);
    setGuessesUsed(0);
    setGuess("");
    setResponse(null);
    setLastQuestion(null);
    setIsCorrect(false);
    setPhase("playing");
  };

  const handleQuestion = async (q: string) => {
    if (isProcessing || questionsAsked >= 20) return;
    setIsProcessing(true);
    setLastQuestion(q);
    setQuestionsAsked((n) => n + 1);

    // Rotate question out, bring a fresh one in
    const remaining = GEOGUESS_QUESTIONS.filter((x) => !usedQuestions.includes(x));
    const next = remaining.length > 0
      ? remaining[Math.floor(Math.random() * remaining.length)]
      : null;
    setQuestions((prev) => {
      const filtered = prev.filter((x) => x !== q);
      return next ? [...filtered, next] : filtered;
    });
    if (next) setUsedQuestions((prev) => [...prev, next]);

    const answer = await fetchGeoGuessAnswer(target, q);
    setResponse(answer);
    setTimeout(() => { setResponse(null); setLastQuestion(null); setIsProcessing(false); }, 2500);
  };

  const handleGuess = async () => {
    const g = guess.trim();
    if (!g || isProcessing || guessesUsed >= MAX_GEOGUESS_GUESSES) return;
    setIsProcessing(true);
    setGuess("");
    const newCount = guessesUsed + 1;
    setGuessesUsed(newCount);

    const correct =
      g.toLowerCase() === target.toLowerCase() ||
      target.toLowerCase().includes(g.toLowerCase()) ||
      g.toLowerCase().includes(target.toLowerCase());

    if (correct) {
      setIsCorrect(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResponse(`Yes! I was thinking of ${target}.`);
      setTimeout(() => { setPhase("complete"); setIsProcessing(false); }, 2000);
    } else if (newCount >= MAX_GEOGUESS_GUESSES) {
      setResponse(`Nice thinking — I was thinking of ${target}.`);
      setTimeout(() => { setPhase("complete"); setIsProcessing(false); }, 2500);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setResponse("Not quite — keep asking questions.");
      setTimeout(() => { setResponse(null); setIsProcessing(false); }, 2000);
    }
  };

  if (phase === "intro") {
    return (
      <IntroScreen
        icon="🌍"
        title="GeoGuess"
        subtitle="I'm thinking of a place"
        description="Ask yes/no questions to narrow it down, then guess the place when you're ready!"
        note="Work together as a family to figure it out!"
        btnLabel="Start"
        btnColor="#2563EB"
        onStart={startGame}
        onBack={() => router.back()}
      />
    );
  }

  if (phase === "playing") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#EFF6FF" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[sh.gameTitle, { color: "#2563EB" }]}>🌍 GeoGuess</Text>
          <Text style={gg.meta}>
            {questionsAsked} question{questionsAsked !== 1 ? "s" : ""} asked · {MAX_GEOGUESS_GUESSES - guessesUsed} guess{MAX_GEOGUESS_GUESSES - guessesUsed !== 1 ? "es" : ""} left
          </Text>

          {/* Response bubble */}
          {response ? (
            <View style={gg.bubble}>
              {lastQuestion && <Text style={gg.bubbleQ}>{lastQuestion}</Text>}
              <Text style={gg.bubbleA}>{response}</Text>
            </View>
          ) : (
            <View style={gg.placeholder}>
              <Text style={gg.placeholderText}>Tap a question to ask it →</Text>
            </View>
          )}

          {/* Question cards */}
          <Text style={gg.sectionLabel}>ASK A QUESTION</Text>
          {questions.map((q) => (
            <Pressable
              key={q}
              style={({ pressed }) => [gg.qCard, pressed && { backgroundColor: "#DBEAFE" }, isProcessing && { opacity: 0.5 }]}
              onPress={() => handleQuestion(q)}
              disabled={isProcessing}
            >
              <Text style={gg.qText}>{q}</Text>
              <Text style={gg.qArrow}>→</Text>
            </Pressable>
          ))}

          {/* Guess input */}
          <Text style={[gg.sectionLabel, { marginTop: 20 }]}>MAKE A GUESS</Text>
          <View style={gg.guessRow}>
            <TextInput
              style={gg.guessInput}
              placeholder="Type a place name…"
              placeholderTextColor="#9CA3AF"
              value={guess}
              onChangeText={setGuess}
              onSubmitEditing={handleGuess}
              returnKeyType="done"
              editable={!isProcessing && guessesUsed < MAX_GEOGUESS_GUESSES}
            />
            <Pressable
              style={[gg.guessBtn, { opacity: (!guess.trim() || isProcessing) ? 0.4 : 1 }]}
              onPress={handleGuess}
              disabled={!guess.trim() || isProcessing}
            >
              <Text style={gg.guessBtnText}>Guess</Text>
            </Pressable>
          </View>

          <BackBtn onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // complete
  return (
    <DoneScreen
      emoji={isCorrect ? "🎉" : "🌍"}
      title={isCorrect ? "You got it!" : "Nice thinking!"}
      subtitle={isCorrect ? `It was ${target}!` : `I was thinking of ${target}.`}
      accent="#2563EB"
      onPlayAgain={startGame}
      onBack={() => router.back()}
      playAgainLabel="🌍 New Round"
    />
  );
}

// ─── What's In My Bag ─────────────────────────────────────────────────────────

function InMyBagGame({ stopName }: { stopName: string }) {
  type Phase = "intro" | "playing" | "complete";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("intro");
  const [context, setContext] = useState<{ context: string; key: string } | null>(null);
  const [bagItems, setBagItems] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const startGame = () => {
    const ctx = detectBagContext(stopName);
    const items = getBagItems(ctx.key);
    setContext(ctx);
    setBagItems(items);
    setIndex(0);
    setPhase("playing");
  };

  if (phase === "intro") {
    return (
      <IntroScreen
        icon="👜"
        title="What's In My Bag?"
        subtitle="Family memory chain game"
        description="One person reads the sentence aloud while everyone else listens. Then everyone repeats it together from memory!"
        note="There are no wrong answers — help each other and have fun."
        btnLabel="Start"
        btnColor="#7C3AED"
        onStart={startGame}
        onBack={() => router.back()}
      />
    );
  }

  if (phase === "playing" && context) {
    const sentence = buildBagSentence(context.context, bagItems, index);
    const itemNum = index + 1;
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F3FF" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
        >
          <Text style={[sh.gameTitle, { color: "#7C3AED" }]}>👜 What's In My Bag?</Text>

          <View style={bag.readerBadge}>
            <Text style={bag.readerText}>📢 Reader — say this out loud:</Text>
          </View>
          <Text style={bag.itemNum}>Item {itemNum} of {MAX_BAG_ITEMS}</Text>

          <View style={bag.sentenceBox}>
            <Text style={bag.sentence}>"{sentence}"</Text>
          </View>

          <Text style={bag.repeatHint}>Now everyone repeat together!</Text>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <Pressable
              style={[sh.btn, { backgroundColor: "#E5E7EB", flex: 1 }]}
              onPress={() => setPhase("intro")}
            >
              <Text style={[sh.btnText, { color: "#374151" }]}>End Game</Text>
            </Pressable>
            <Pressable
              style={[sh.btn, { backgroundColor: "#7C3AED", flex: 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (index < MAX_BAG_ITEMS - 1) {
                  setIndex((n) => n + 1);
                } else {
                  setPhase("complete");
                }
              }}
            >
              <Text style={sh.btnText}>{index < MAX_BAG_ITEMS - 1 ? "Next Item →" : "Finish!"}</Text>
            </Pressable>
          </View>

          <BackBtn onPress={() => router.back()} />
        </ScrollView>
      </View>
    );
  }

  // complete
  return (
    <DoneScreen
      emoji="🎒"
      title="Nice remembering together!"
      subtitle="Want to play again with a new bag?"
      accent="#7C3AED"
      onPlayAgain={startGame}
      onBack={() => router.back()}
      playAgainLabel="👜 Play Again"
    />
  );
}

// ─── GeoSpy ───────────────────────────────────────────────────────────────────

function GeoSpyGame() {
  type Phase = "intro" | "playing";
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);

  const pickPrompt = useCallback((exclude?: string): string => {
    const available = GEOSPY_PROMPTS.filter((p) => !usedPrompts.includes(p) && p !== exclude);
    const pool = available.length > 0 ? available : GEOSPY_PROMPTS.filter((p) => p !== exclude);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick ?? GEOSPY_PROMPTS[0];
  }, [usedPrompts]);

  const startSpy = () => {
    const p = pickPrompt();
    setCurrentPrompt(p);
    setUsedPrompts((prev) => [...prev, p]);
    setPhase("playing");
  };

  const nextPrompt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const p = pickPrompt(currentPrompt ?? undefined);
    setCurrentPrompt(p);
    setUsedPrompts((prev) => [...prev, p]);
  };

  if (phase === "intro") {
    return (
      <IntroScreen
        icon="👁"
        title="GeoSpy"
        subtitle="The travel I Spy game"
        description="Everyone looks around. Tap 'Next' for a new prompt whenever you're ready for a new challenge!"
        note="Look carefully — things are everywhere!"
        btnLabel="Start"
        btnColor="#E8692A"
        onStart={startSpy}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FDF0E9" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24, alignItems: "center", flexGrow: 1, justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 52, marginBottom: 16 }}>👁</Text>
        <Text style={[sh.gameTitle, { color: "#E8692A" }]}>GeoSpy</Text>
        <Text style={spy.look}>Everyone look around…</Text>

        <View style={spy.promptCard}>
          <Text style={spy.promptText}>{currentPrompt}</Text>
        </View>

        <Text style={spy.hint}>Look for it, then tap Next for a new prompt!</Text>

        <Pressable
          style={[sh.btn, { backgroundColor: "#E8692A", alignSelf: "stretch", marginTop: 28 }]}
          onPress={nextPrompt}
        >
          <Text style={sh.btnText}>Next Prompt →</Text>
        </Pressable>

        <Pressable
          style={[sh.btn, { backgroundColor: "#E5E7EB", alignSelf: "stretch", marginTop: 12 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPhase("intro"); }}
        >
          <Text style={[sh.btnText, { color: "#374151" }]}>End GeoSpy</Text>
        </Pressable>

        <BackBtn onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function GamePlay() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const kids = useKids();
  const stopName = kids.stopName || "your stop";
  const tripId = kids.tripId || "";

  const gameType: GameType =
    (["think-fast", "scavenger", "geoguess", "geospy", "bag"] as GameType[]).includes(type as GameType)
      ? (type as GameType)
      : "think-fast";

  if (gameType === "scavenger") return <ScavengerGame stopName={stopName} tripId={tripId} />;
  if (gameType === "geoguess") return <GeoGuessGame stopName={stopName} />;
  if (gameType === "geospy") return <GeoSpyGame />;
  if (gameType === "bag") return <InMyBagGame stopName={stopName} />;
  return <ThinkFastGame stopName={stopName} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, backgroundColor: "#FFF8F0",
  },
  btn: {
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24,
    alignItems: "center",
  },
  btnText: { fontFamily: F.bold, fontSize: 15, color: "#fff" },
  gameTitle: { fontFamily: F.bold, fontSize: 24, marginBottom: 6 },
  backBtn: { alignItems: "center", paddingVertical: 20 },
  backBtnText: { fontFamily: F.semibold, fontSize: 14, color: "#9CA3AF" },
  introIcon: { fontSize: 64, marginBottom: 12 },
  introTitle: { fontFamily: F.bold, fontSize: 26, color: "#1C1917", textAlign: "center", marginBottom: 6 },
  introSub: { fontFamily: F.semibold, fontSize: 15, color: "#78716C", textAlign: "center", marginBottom: 12 },
  introDesc: { fontFamily: F.medium, fontSize: 15, color: "#374151", textAlign: "center", lineHeight: 22 },
  introNote: {
    marginTop: 16, backgroundColor: "#F3F4F6", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  introNoteText: { fontFamily: F.medium, fontSize: 13, color: "#6B7280", textAlign: "center" },
  doneEmoji: { fontSize: 72, marginBottom: 12 },
  doneTitle: { fontFamily: F.bold, fontSize: 26, textAlign: "center", marginBottom: 8 },
  doneSub: { fontFamily: F.medium, fontSize: 15, color: "#78716C", textAlign: "center", paddingHorizontal: 16 },
});

const tf = StyleSheet.create({
  timerRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 24,
  },
  timerCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, alignItems: "center", justifyContent: "center",
  },
  timerNum: { fontFamily: F.bold, fontSize: 28 },
  tapHint: { fontFamily: F.medium, fontSize: 12, color: "#78716C", marginBottom: 2 },
  tapCount: { fontFamily: F.bold, fontSize: 24, color: "#1C1917" },
  promptLabel: { fontFamily: F.bold, fontSize: 17, color: "#1C1917", marginBottom: 4 },
  promptText: { fontFamily: F.medium, fontSize: 16, color: "#4B5563", marginBottom: 20 },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  dot: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  dotCheck: { fontFamily: F.bold, fontSize: 16, color: "#fff" },
  tapBtn: {
    backgroundColor: "#F59E0B", borderRadius: 20,
    paddingVertical: 24, alignItems: "center", marginBottom: 16,
  },
  tapBtnText: { fontFamily: F.bold, fontSize: 20, color: "#fff" },
  rowBtns: { flexDirection: "row", gap: 12 },
  smBtn: {
    flex: 1, backgroundColor: "#F3F4F6", borderRadius: 14,
    paddingVertical: 13, alignItems: "center",
  },
  smBtnText: { fontFamily: F.semibold, fontSize: 14, color: "#374151" },
  revealBox: {
    backgroundColor: "#FFFBEB", borderRadius: 20, borderWidth: 1.5,
    borderColor: "#FCD34D", padding: 20, width: "100%", marginTop: 20,
  },
  revealLabel: { fontFamily: F.semibold, fontSize: 13, color: "#92400E", marginBottom: 12, textAlign: "center" },
  revealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  revealItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 10, width: "47%",
  },
  revealItemText: { fontFamily: F.medium, fontSize: 12, color: "#374151", flexShrink: 1 },
  revealNote: { fontFamily: F.medium, fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 12, fontStyle: "italic" },
});

const sc = StyleSheet.create({
  hint: { fontFamily: F.medium, fontSize: 13, color: "#78716C", marginBottom: 4 },
  count: { fontFamily: F.bold, fontSize: 14, marginBottom: 16 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)", padding: 14, marginBottom: 10,
  },
  itemFound: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" },
  circle: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    borderColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  itemText: { fontFamily: F.medium, fontSize: 14, color: "#1C1917", flex: 1, lineHeight: 20 },
  itemTextDone: { textDecorationLine: "line-through", opacity: 0.5 },
  foundBtn: {
    backgroundColor: "#D1FAE5", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  foundBtnText: { fontFamily: F.bold, fontSize: 11, color: "#065F46" },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: "#F0FDF4", borderTopWidth: 1, borderTopColor: "#D1FAE5",
  },
});

const gg = StyleSheet.create({
  meta: { fontFamily: F.medium, fontSize: 13, color: "#78716C", marginBottom: 16 },
  bubble: {
    backgroundColor: "#DBEAFE", borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: "#93C5FD",
  },
  bubbleQ: { fontFamily: F.medium, fontSize: 12, color: "#1D4ED8", marginBottom: 4 },
  bubbleA: { fontFamily: F.bold, fontSize: 20, color: "#1E3A8A", textAlign: "center" },
  placeholder: {
    backgroundColor: "#EFF6FF", borderRadius: 18, padding: 20,
    marginBottom: 16, alignItems: "center",
  },
  placeholderText: { fontFamily: F.medium, fontSize: 14, color: "#93C5FD" },
  sectionLabel: {
    fontFamily: F.bold, fontSize: 10, color: "#9CA3AF",
    letterSpacing: 0.8, marginBottom: 8,
  },
  qCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)", padding: 14, marginBottom: 8,
  },
  qText: { fontFamily: F.medium, fontSize: 14, color: "#1C1917", flex: 1 },
  qArrow: { fontFamily: F.bold, fontSize: 16, color: "#93C5FD" },
  guessRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  guessInput: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)", paddingHorizontal: 16, paddingVertical: 13,
    fontFamily: F.medium, fontSize: 15, color: "#1C1917",
  },
  guessBtn: {
    backgroundColor: "#2563EB", borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 13,
  },
  guessBtnText: { fontFamily: F.bold, fontSize: 14, color: "#fff" },
});

const bag = StyleSheet.create({
  readerBadge: {
    backgroundColor: "#EDE9FE", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start", marginBottom: 6,
  },
  readerText: { fontFamily: F.semibold, fontSize: 13, color: "#5B21B6" },
  itemNum: { fontFamily: F.medium, fontSize: 12, color: "#9CA3AF", marginBottom: 16 },
  sentenceBox: {
    backgroundColor: "#fff", borderRadius: 20, borderWidth: 2,
    borderColor: "#C4B5FD", padding: 24, marginBottom: 20,
  },
  sentence: {
    fontFamily: F.semibold, fontSize: 18, color: "#1C1917",
    textAlign: "center", lineHeight: 28,
  },
  repeatHint: { fontFamily: F.medium, fontSize: 14, color: "#78716C", textAlign: "center" },
});

const spy = StyleSheet.create({
  look: { fontFamily: F.medium, fontSize: 15, color: "#78716C", marginBottom: 24 },
  promptCard: {
    backgroundColor: "#fff", borderRadius: 24, borderWidth: 2,
    borderColor: "#FBD0B8", padding: 32, alignItems: "center",
    width: "100%", marginBottom: 16,
  },
  promptText: {
    fontFamily: F.bold, fontSize: 22, color: "#1C1917",
    textAlign: "center", lineHeight: 32,
  },
  hint: {
    fontFamily: F.medium, fontSize: 13, color: "#9CA3AF",
    textAlign: "center",
  },
});
