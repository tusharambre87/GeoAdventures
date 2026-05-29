/**
 * Memory Image Engine — Stop-Specific Family Photo Generation
 *
 * Builds 4-layer prompts per the master prompt template, maps each card type
 * to the exact stop referenced by that card's text, and caches results in
 * trip_story_image_assets so images are never re-generated.
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { tripStoryImageAssets, tripStoryMoments, type InsertTripStoryImageAsset } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardType =
  | "hero"
  | "discovery"
  | "fun"
  | "quiet_break"
  | "kid_memory"
  | "parent_relief";

export type StopType =
  | "museum"
  | "aquarium"
  | "landmark"
  | "viewpoint"
  | "park"
  | "walk"
  | "boat"
  | "food"
  | "break"
  | "historic_site"
  | "zoo"
  | "ride"
  | "generic";

export interface StopCard {
  cardType: CardType;
  stopName: string;
  stopType: StopType;
  /** File name relative to /memory-images/ e.g. "london-kids.png" */
  fileName: string;
}

export interface CityStopMap {
  destinationKey: string;
  label: string;
  country: string;
  tripType: "city" | "culture" | "nature" | "beach" | "mixed";
  cards: StopCard[];
}

// ─── City Stop Maps ────────────────────────────────────────────────────────────
// Each entry maps every card type to the exact stop referenced by that card's text.
// hero, discovery×4, kid_memory, parent_relief = 7 cards per city.

export const CITY_STOP_MAPS: CityStopMap[] = [
  {
    destinationKey: "amsterdam",
    label: "Amsterdam",
    country: "Netherlands",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Amsterdam canals and historic bridges",  stopType: "landmark",  fileName: "amsterdam-hero.png" },
      { cardType: "discovery",    stopName: "NEMO Science Museum rooftop",            stopType: "museum",    fileName: "amsterdam-viewpoint.png" },
      { cardType: "fun",          stopName: "Vondelpark playground",                  stopType: "park",      fileName: "amsterdam-playground.png" },
      { cardType: "quiet_break",  stopName: "Pancake Bakery on Prinsengracht",        stopType: "food",      fileName: "amsterdam-food.png" },
      { cardType: "discovery",    stopName: "Anne Frank House",                       stopType: "historic_site", fileName: "amsterdam-museum.png" },
      { cardType: "kid_memory",   stopName: "Amsterdam canal boat",                   stopType: "boat",      fileName: "amsterdam-kids.png" },
      { cardType: "parent_relief",stopName: "Vondelpark outdoor café",                stopType: "park",      fileName: "amsterdam-parent.png" },
    ],
  },
  {
    destinationKey: "bangkok",
    label: "Bangkok",
    country: "Thailand",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Grand Palace and Wat Phra Kaew golden spires", stopType: "landmark", fileName: "bangkok-hero.png" },
      { cardType: "discovery",    stopName: "Grand Palace and Wat Phra Kaew temple halls", stopType: "landmark", fileName: "bangkok-landmark.png" },
      { cardType: "discovery",    stopName: "Jim Thompson House",                     stopType: "museum",    fileName: "bangkok-museum.png" },
      { cardType: "fun",          stopName: "Bangkok Klongs canal boat ride",         stopType: "boat",      fileName: "bangkok-park.png" },
      { cardType: "quiet_break",  stopName: "Wat Arun riverside at sunset",           stopType: "viewpoint", fileName: "bangkok-viewpoint.png" },
      { cardType: "kid_memory",   stopName: "Lumpini Park where monitor lizards roam", stopType: "park",    fileName: "bangkok-kids.png" },
      { cardType: "parent_relief",stopName: "tuk-tuk ride through Bangkok streets",   stopType: "ride",     fileName: "bangkok-parent.png" },
    ],
  },
  {
    destinationKey: "buenos aires",
    label: "Buenos Aires",
    country: "Argentina",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Caminito street in La Boca",             stopType: "landmark",  fileName: "buenos-aires-hero.png" },
      { cardType: "discovery",    stopName: "Plaza de Mayo and Casa Rosada",          stopType: "landmark",  fileName: "buenos-aires-landmark.png" },
      { cardType: "quiet_break",  stopName: "MALBA Museum courtyard café",            stopType: "museum",    fileName: "buenos-aires-museum.png" },
      { cardType: "fun",          stopName: "Palermo Parks and Rose Garden",          stopType: "park",      fileName: "buenos-aires-park.png" },
      { cardType: "quiet_break",  stopName: "San Telmo Market",                       stopType: "food",      fileName: "buenos-aires-food.png" },
      { cardType: "kid_memory",   stopName: "Caminito painted street in La Boca",    stopType: "walk",      fileName: "buenos-aires-kids.png" },
      { cardType: "parent_relief",stopName: "San Telmo Market outdoor café",          stopType: "food",      fileName: "buenos-aires-parent.png" },
    ],
  },
  {
    destinationKey: "cairo",
    label: "Cairo",
    country: "Egypt",
    tripType: "culture",
    cards: [
      { cardType: "hero",         stopName: "Great Pyramids of Giza",                 stopType: "landmark",  fileName: "cairo-hero.png" },
      { cardType: "discovery",    stopName: "Pyramids of Giza",                       stopType: "landmark",  fileName: "cairo-landmark.png" },
      { cardType: "discovery",    stopName: "Egyptian Museum with ancient mummies",   stopType: "museum",    fileName: "cairo-museum.png" },
      { cardType: "fun",          stopName: "Nile River felucca cruise",              stopType: "boat",      fileName: "cairo-park.png" },
      { cardType: "quiet_break",  stopName: "Khan el-Khalili Bazaar",                stopType: "walk",      fileName: "cairo-viewpoint.png" },
      { cardType: "kid_memory",   stopName: "Great Pyramid of Giza close-up base",   stopType: "historic_site", fileName: "cairo-kids.png" },
      { cardType: "parent_relief",stopName: "Nile felucca boat at sunset",            stopType: "boat",      fileName: "cairo-parent.png" },
    ],
  },
  {
    destinationKey: "chicago",
    label: "Chicago",
    country: "United States",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Chicago lakefront with skyline",         stopType: "viewpoint", fileName: "chicago-hero.png" },
      { cardType: "discovery",    stopName: "Field Museum paleontology hall — Sue the T-rex", stopType: "museum", fileName: "chicago-museum.png" },
      { cardType: "fun",          stopName: "Navy Pier Ferris wheel",                 stopType: "ride",      fileName: "chicago-landmark.png" },
      { cardType: "fun",          stopName: "Millennium Park Cloud Gate Bean",        stopType: "landmark",  fileName: "chicago-park.png" },
      { cardType: "quiet_break",  stopName: "Shedd Aquarium dolphin show",            stopType: "aquarium",  fileName: "chicago-water.png" },
      { cardType: "kid_memory",   stopName: "Field Museum Sue the T-rex — kid face-to-face", stopType: "museum", fileName: "chicago-kids.png" },
      { cardType: "parent_relief",stopName: "Millennium Park lawn",                   stopType: "park",      fileName: "chicago-parent.png" },
    ],
  },
  {
    destinationKey: "dubai",
    label: "Dubai",
    country: "United Arab Emirates",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Dubai skyline and Burj Khalifa",         stopType: "viewpoint", fileName: "dubai-hero.png" },
      { cardType: "discovery",    stopName: "Burj Khalifa observation deck At The Top", stopType: "viewpoint", fileName: "dubai-viewpoint.png" },
      { cardType: "discovery",    stopName: "Dubai Museum souk replica",              stopType: "museum",    fileName: "dubai-museum.png" },
      { cardType: "fun",          stopName: "Dubai Creek traditional dhow cruise",    stopType: "boat",      fileName: "dubai-boat.png" },
      { cardType: "quiet_break",  stopName: "Global Village international food stalls", stopType: "food",   fileName: "dubai-market.png" },
      { cardType: "kid_memory",   stopName: "Burj Khalifa observation deck glass window", stopType: "viewpoint", fileName: "dubai-kids.png" },
      { cardType: "parent_relief",stopName: "Dubai Creek dhow cruise evening dinner", stopType: "boat",      fileName: "dubai-parent.png" },
    ],
  },
  {
    destinationKey: "johannesburg",
    label: "Johannesburg",
    country: "South Africa",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Johannesburg city skyline",              stopType: "viewpoint", fileName: "johannesburg-hero.png" },
      { cardType: "discovery",    stopName: "Apartheid Museum exhibits",              stopType: "museum",    fileName: "johannesburg-landmark.png" },
      { cardType: "discovery",    stopName: "Johannesburg Zoo animal exhibits",       stopType: "zoo",       fileName: "johannesburg-museum.png" },
      { cardType: "fun",          stopName: "Zoo Lake ducks and paddle boats",        stopType: "park",      fileName: "johannesburg-park.png" },
      { cardType: "quiet_break",  stopName: "Maboneng Precinct street cafés",        stopType: "walk",      fileName: "johannesburg-viewpoint.png" },
      { cardType: "kid_memory",   stopName: "Johannesburg city centre tall buildings", stopType: "viewpoint", fileName: "johannesburg-kids.png" },
      { cardType: "parent_relief",stopName: "Zoo Lake park bench while kids feed ducks", stopType: "park", fileName: "johannesburg-parent.png" },
    ],
  },
  {
    destinationKey: "london",
    label: "London",
    country: "United Kingdom",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Tower Bridge",                           stopType: "landmark",  fileName: "london-hero.png" },
      { cardType: "discovery",    stopName: "Natural History Museum blue whale hall", stopType: "museum",    fileName: "london-museum.png" },
      { cardType: "discovery",    stopName: "Tower of London Beefeater and ravens",   stopType: "historic_site", fileName: "london-ruins.png" },
      { cardType: "fun",          stopName: "Hyde Park Serpentine rowing boats",      stopType: "boat",      fileName: "london-park.png" },
      { cardType: "quiet_break",  stopName: "Borough Market food stalls",             stopType: "food",      fileName: "london-market.png" },
      { cardType: "kid_memory",   stopName: "Natural History Museum blue whale skeleton", stopType: "museum", fileName: "london-kids.png" },
      { cardType: "parent_relief",stopName: "Borough Market sitting area while kids explore", stopType: "food", fileName: "london-parent.png" },
    ],
  },
  {
    destinationKey: "los angeles",
    label: "Los Angeles",
    country: "United States",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Santa Monica Beach with Pacific Ocean",  stopType: "generic",   fileName: "los-angeles-hero.png" },
      { cardType: "fun",          stopName: "Santa Monica Pier Ferris wheel",         stopType: "ride",      fileName: "los-angeles-landmark.png" },
      { cardType: "fun",          stopName: "Griffith Park Hollywood Sign hike",      stopType: "park",      fileName: "los-angeles-park.png" },
      { cardType: "fun",          stopName: "Venice Beach Boardwalk street performers", stopType: "walk",   fileName: "los-angeles-water.png" },
      { cardType: "quiet_break",  stopName: "Grand Central Market food hall",         stopType: "food",      fileName: "los-angeles-food.png" },
      { cardType: "kid_memory",   stopName: "Santa Monica Beach Pacific Ocean waves", stopType: "generic",   fileName: "los-angeles-kids.png" },
      { cardType: "parent_relief",stopName: "Griffith Observatory terrace",            stopType: "viewpoint", fileName: "los-angeles-parent.png" },
    ],
  },
  {
    destinationKey: "melbourne",
    label: "Melbourne",
    country: "Australia",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Melbourne city laneways and cafés",      stopType: "walk",      fileName: "melbourne-hero.png" },
      { cardType: "fun",          stopName: "Royal Botanic Gardens Children's Garden water play", stopType: "park", fileName: "melbourne-park.png" },
      { cardType: "discovery",    stopName: "Melbourne Museum dinosaur gallery animatronic T-Rex", stopType: "museum", fileName: "melbourne-museum.png" },
      { cardType: "quiet_break",  stopName: "Queen Victoria Market lamingtons and produce", stopType: "food", fileName: "melbourne-market.png" },
      { cardType: "fun",          stopName: "St Kilda Beach waves and sandcastles",   stopType: "generic",   fileName: "melbourne-water.png" },
      { cardType: "kid_memory",   stopName: "Melbourne Museum animatronic T-Rex dinosaur", stopType: "museum", fileName: "melbourne-kids.png" },
      { cardType: "parent_relief",stopName: "Royal Botanic Gardens bench while kids explore", stopType: "park", fileName: "melbourne-parent.png" },
    ],
  },
  {
    destinationKey: "nairobi",
    label: "Nairobi",
    country: "Kenya",
    tripType: "nature",
    cards: [
      { cardType: "hero",         stopName: "Giraffe Centre Nairobi feeding platform", stopType: "zoo",     fileName: "nairobi-hero.png" },
      { cardType: "discovery",    stopName: "Giraffe Centre Nairobi hand-feeding giraffes", stopType: "zoo", fileName: "nairobi-landmark.png" },
      { cardType: "fun",          stopName: "Karura Forest trails and waterfall",      stopType: "park",     fileName: "nairobi-park.png" },
      { cardType: "discovery",    stopName: "Nairobi National Museum dinosaur skeleton", stopType: "museum", fileName: "nairobi-museum.png" },
      { cardType: "quiet_break",  stopName: "City Market Nairobi beaded crafts stalls", stopType: "walk",   fileName: "nairobi-market.png" },
      { cardType: "kid_memory",   stopName: "Giraffe Centre Nairobi giraffe eating from child's hand", stopType: "zoo", fileName: "nairobi-kids.png" },
      { cardType: "parent_relief",stopName: "David Sheldrick Wildlife Trust baby elephants", stopType: "zoo", fileName: "nairobi-parent.png" },
    ],
  },
  {
    destinationKey: "new york",
    label: "New York",
    country: "United States",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Central Park with Manhattan skyline",    stopType: "park",      fileName: "new-york-hero.png" },
      { cardType: "discovery",    stopName: "American Museum of Natural History dinosaur halls", stopType: "museum", fileName: "new-york-museum.png" },
      { cardType: "fun",          stopName: "Central Park rowboat lake",              stopType: "boat",      fileName: "new-york-park.png" },
      { cardType: "discovery",    stopName: "High Line elevated park art installations", stopType: "walk",  fileName: "new-york-viewpoint.png" },
      { cardType: "quiet_break",  stopName: "Eataly NYC pizza and pasta",             stopType: "food",      fileName: "new-york-food.png" },
      { cardType: "kid_memory",   stopName: "AMNH T-rex skeleton reaching the ceiling — the whole skeleton",  stopType: "museum", fileName: "new-york-kids.png" },
      { cardType: "parent_relief",stopName: "Central Park Sheep Meadow lawn",         stopType: "park",      fileName: "new-york-parent.png" },
    ],
  },
  {
    destinationKey: "paris",
    label: "Paris",
    country: "France",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Eiffel Tower Champ de Mars",             stopType: "landmark",  fileName: "paris-hero.png" },
      { cardType: "discovery",    stopName: "Eiffel Tower iron structure",            stopType: "landmark",  fileName: "paris-landmark.png" },
      { cardType: "discovery",    stopName: "Musée d'Orsay Van Gogh gallery",         stopType: "museum",    fileName: "paris-museum.png" },
      { cardType: "fun",          stopName: "Seine River cruise under bridges",       stopType: "boat",      fileName: "paris-boat.png" },
      { cardType: "quiet_break",  stopName: "Champs-Élysées patisserie macarons",     stopType: "food",      fileName: "paris-food.png" },
      { cardType: "kid_memory",   stopName: "Eiffel Tower iron structure up close",  stopType: "landmark",  fileName: "paris-kids.png" },
      { cardType: "parent_relief",stopName: "Seine riverbank café seating",           stopType: "food",      fileName: "paris-parent.png" },
    ],
  },
  {
    destinationKey: "rio de janeiro",
    label: "Rio de Janeiro",
    country: "Brazil",
    tripType: "mixed",
    cards: [
      { cardType: "hero",         stopName: "Christ the Redeemer at Corcovado",       stopType: "landmark",  fileName: "rio-de-janeiro-hero.png" },
      { cardType: "discovery",    stopName: "Christ the Redeemer statue Corcovado",   stopType: "landmark",  fileName: "rio-de-janeiro-landmark.png" },
      { cardType: "fun",          stopName: "Copacabana Beach waves",                 stopType: "generic",   fileName: "rio-de-janeiro-water.png" },
      { cardType: "fun",          stopName: "Sugarloaf Mountain cable car",           stopType: "ride",      fileName: "rio-de-janeiro-viewpoint.png" },
      { cardType: "quiet_break",  stopName: "Santa Teresa neighbourhood street food", stopType: "food",      fileName: "rio-de-janeiro-food.png" },
      { cardType: "kid_memory",   stopName: "Christ the Redeemer statue at the summit", stopType: "landmark", fileName: "rio-de-janeiro-kids.png" },
      { cardType: "parent_relief",stopName: "Sugarloaf Mountain cable car station terrace", stopType: "viewpoint", fileName: "rio-de-janeiro-parent.png" },
    ],
  },
  {
    destinationKey: "rome",
    label: "Rome",
    country: "Italy",
    tripType: "culture",
    cards: [
      { cardType: "hero",         stopName: "Colosseum exterior with family",         stopType: "historic_site", fileName: "rome-hero.png" },
      { cardType: "discovery",    stopName: "Colosseum arena floor where gladiators fought", stopType: "historic_site", fileName: "rome-colosseum.png" },
      { cardType: "fun",          stopName: "Trevi Fountain coin toss",               stopType: "landmark",  fileName: "rome-trevi.png" },
      { cardType: "quiet_break",  stopName: "Campo de' Fiori morning market",        stopType: "food",      fileName: "rome-market.png" },
      { cardType: "discovery",    stopName: "Roman Forum ancient ruins",              stopType: "landmark",      fileName: "rome-forum.png" },
      { cardType: "kid_memory",   stopName: "Colosseum arena floor gladiator ring",  stopType: "historic_site", fileName: "rome-kids.png" },
      { cardType: "parent_relief",stopName: "Campo de' Fiori outdoor café table",     stopType: "food",      fileName: "rome-parent.png" },
    ],
  },
  {
    destinationKey: "singapore",
    label: "Singapore",
    country: "Singapore",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Gardens by the Bay Supertrees",          stopType: "landmark",  fileName: "singapore-hero.png" },
      { cardType: "fun",          stopName: "Cloud Forest indoor waterfall and mist", stopType: "park",      fileName: "singapore-park.png" },
      { cardType: "discovery",    stopName: "Singapore Zoo Fragile Forest butterfly dome", stopType: "zoo", fileName: "singapore-park2.png" },
      { cardType: "fun",          stopName: "Sentosa Island Palawan Beach waves",     stopType: "generic",   fileName: "singapore-water.png" },
      { cardType: "quiet_break",  stopName: "Maxwell Food Centre hawker stalls",      stopType: "food",      fileName: "singapore-food.png" },
      { cardType: "kid_memory",   stopName: "Jewel Changi Airport Rain Vortex indoor waterfall", stopType: "landmark", fileName: "singapore-kids.png" },
      { cardType: "parent_relief",stopName: "Gardens by the Bay Supertrees café terrace", stopType: "park", fileName: "singapore-parent.png" },
    ],
  },
  {
    destinationKey: "tokyo",
    label: "Tokyo",
    country: "Japan",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "Senso-ji Temple Asakusa",               stopType: "landmark",  fileName: "tokyo-hero.png" },
      { cardType: "discovery",    stopName: "teamLab Planets immersive digital flowers", stopType: "museum", fileName: "tokyo-art.png" },
      { cardType: "discovery",    stopName: "Senso-ji Temple fortune stalls Asakusa", stopType: "landmark", fileName: "tokyo-landmark.png" },
      { cardType: "fun",          stopName: "Shibuya Crossing pedestrian scramble",   stopType: "walk",      fileName: "tokyo-viewpoint.png" },
      { cardType: "quiet_break",  stopName: "Tsukiji Outer Market tamagoyaki sticks", stopType: "food",     fileName: "tokyo-food.png" },
      { cardType: "kid_memory",   stopName: "teamLab Planets moving digital flowers floor", stopType: "museum", fileName: "tokyo-kids.png" },
      { cardType: "parent_relief",stopName: "Senso-ji Temple grounds while kids explore stalls", stopType: "landmark", fileName: "tokyo-parent.png" },
    ],
  },
  {
    destinationKey: "toronto",
    label: "Toronto",
    country: "Canada",
    tripType: "city",
    cards: [
      { cardType: "hero",         stopName: "CN Tower and Toronto waterfront",        stopType: "landmark",  fileName: "toronto-hero.png" },
      { cardType: "discovery",    stopName: "Ripley's Aquarium jellyfish tunnel",     stopType: "aquarium",  fileName: "toronto-museum.png" },
      { cardType: "fun",          stopName: "CN Tower glass floor sky-high view",     stopType: "viewpoint", fileName: "toronto-viewpoint.png" },
      { cardType: "fun",          stopName: "Toronto Islands ferry Lake Ontario",     stopType: "boat",      fileName: "toronto-boat.png" },
      { cardType: "quiet_break",  stopName: "Trinity Bellwoods Park picnic bench",   stopType: "park",      fileName: "toronto-playground.png" },
      { cardType: "kid_memory",   stopName: "Ripley's Aquarium glowing jellyfish tanks", stopType: "aquarium", fileName: "toronto-kids.png" },
      { cardType: "parent_relief",stopName: "Trinity Bellwoods Park bench while kids play", stopType: "park", fileName: "toronto-parent.png" },
    ],
  },
];

// ─── Layer A: Base Family Rule Block (appended to every prompt) ───────────────

const LAYER_A = `

Create a realistic, candid family travel moment.

The image MUST include:
- at least 1 parent (visible, adult)
- 1 or 2 kids aged 4 to 10
- visible faces with natural, emotional expressions
- an authentic action happening — not posing for the camera

The image must NOT be:
- an empty landscape
- a place without people
- a generic travel aesthetic shot
- a posed stock-photo family

Style:
- candid smartphone photo
- slightly imperfect framing, not perfectly centred
- natural light
- documentary feel, emotionally warm
- family-friendly
- realistic proportions and faces (not AI-generated looking)
- slight motion blur or imperfection is acceptable

Camera feel:
- shot like a real phone photo from another family member
- slightly off-angle
- feels "captured in the moment" not arranged

If no family or kids are clearly visible, the image is incorrect.`;

const NEGATIVE_PROMPT =
  "landscape without people, no people, empty scene, stock photo, posed, symmetrical, no children visible, dark, night, blurry, cartoon, watermark, text";

// ─── Layer C Templates (moment/card type logic) ───────────────────────────────

function layerC(cardType: CardType, stopName: string): string {
  switch (cardType) {
    case "hero":
      return `Show a family with 1 or 2 kids in the middle of a real travel moment together at or near ${stopName}. Everyone should be visible. The family should feel naturally engaged with the place. The moment should feel like: "This is our trip."`;

    case "discovery":
      return `Show a child reacting with awe or curiosity to ${stopName}. A parent should be nearby, visible, and naturally engaged. The child should clearly be the emotional focus. This should feel like: "The moment the kid will talk about later." The child's face should show wonder, mouth open, eyes wide.`;

    case "fun":
      return `Show a family with kids actively doing something fun at ${stopName}. Examples: moving, laughing, pointing, reacting, riding, exploring. The image must feel dynamic and alive, not posed. Kids should be clearly visible and emotionally expressive — laughing, running, reacting.`;

    case "quiet_break":
      return `Show a family taking a calm break during a trip at ${stopName}. Kids should still be visible and engaged. Parents should look relaxed, not posed. The image should communicate: "This is the part that made the day easier." No stock-photo feel. No empty café or scenery without people.`;

    case "kid_memory":
      return `Show the most memorable kid-focused moment from a family trip at ${stopName}. The child should be reacting strongly to something specific and visible. The image should support a quote a real kid would say later. The child is the emotional hero of this image — awe, shock, excitement, or delight. Parent present but secondary. This must feel like: "The exact thing the kid will remember."`;

    case "parent_relief":
      return `Show a parent and kids during a smooth, low-stress moment of the trip at ${stopName}. Kids should be calmly engaged. The parent should look present, at ease, and genuinely relaxed — NOT posed, NOT an empty building exterior. The parent must be physically in frame and visible. The image should communicate: "This day actually worked." Emotion: ease, control, relaxation.`;
  }
}

// ─── Build Full Prompt (all 4 layers) ─────────────────────────────────────────

export function buildCardPrompt(
  cardType: CardType,
  city: string,
  country: string,
  stopName: string,
  stopType: StopType
): { prompt: string; negativePrompt: string } {
  const layerB = `Location context: The setting should clearly feel like ${city}, ${country}. Use recognizable visual cues that match the destination naturally — architecture, environment, landmarks, signage.`;
  // Layer D includes both the stop name and stop type for maximum visual accuracy
  const layerD = `The specific place shown is: ${stopName} (venue type: ${stopType}). Use real, recognizable visual details from this place.`;
  const layerCText = layerC(cardType, stopName);

  const prompt = `${LAYER_A}

${layerB}

${layerCText}

${layerD}

EMOTION: Wonder, curiosity, excitement, or joy — NOT calm posing or neutral expressions.
OUTPUT: A single image that feels like "A real family moment during a trip that they will remember."`;

  return { prompt, negativePrompt: NEGATIVE_PROMPT };
}

// ─── Startup Health Check ─────────────────────────────────────────────────────
// Logs a warning for each mapped city that has fewer than 7 ready asset rows.
// Call once at server startup to catch rollout drift early. Does not block.

export async function checkCityAssetHealth(): Promise<void> {
  try {
    for (const city of CITY_STOP_MAPS) {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tripStoryImageAssets)
        .where(
          and(
            eq(tripStoryImageAssets.destinationKey, city.destinationKey),
            eq(tripStoryImageAssets.status, "ready"),
            gte(tripStoryImageAssets.qualityScore, 7)
          )
        );
      const count = rows[0]?.count ?? 0;
      if (count < city.cards.length) {
        console.warn(
          `[MemoryImageEngine] ${city.destinationKey}: ${count}/${city.cards.length} asset rows ready — ` +
          `run POST /api/admin/regenerate-city-images to fix`
        );
      }
    }
  } catch {
    // Non-fatal: table may not yet exist in fresh deployments
  }
}

// ─── City Map Integrity Verification ─────────────────────────────────────────
// Asserts all 18 cities have exactly 7 cards with the required card types.
// Returns a list of error strings (empty = all good).

export function verifyCityStopMaps(): string[] {
  const REQUIRED_TYPES: CardType[] = ["hero", "discovery", "fun", "quiet_break", "kid_memory", "parent_relief"];
  const REQUIRED_COUNT = 7;
  const errors: string[] = [];

  if (CITY_STOP_MAPS.length !== 18) {
    errors.push(`Expected 18 cities, found ${CITY_STOP_MAPS.length}`);
  }

  for (const city of CITY_STOP_MAPS) {
    if (city.cards.length !== REQUIRED_COUNT) {
      errors.push(`${city.destinationKey}: expected ${REQUIRED_COUNT} cards, found ${city.cards.length}`);
    }
    for (const required of REQUIRED_TYPES) {
      if (!city.cards.some(c => c.cardType === required)) {
        errors.push(`${city.destinationKey}: missing card type "${required}"`);
      }
    }
    // Verify (momentType, stopType) uniqueness within the city
    const seen = new Set<string>();
    for (const card of city.cards) {
      const key = `${card.cardType}:${card.stopType}`;
      if (seen.has(key)) {
        errors.push(`${city.destinationKey}: duplicate (cardType, stopType) = (${card.cardType}, ${card.stopType})`);
      }
      seen.add(key);
    }
  }

  return errors;
}

// ─── Asset Cache ───────────────────────────────────────────────────────────────

// checkAssetCache: serving-time lookup — (destinationKey, momentType, stopType),
// status=ready AND quality_score>=7. This is the standard serving API; only
// high-quality ready rows are returned to the carousel.
export async function checkAssetCache(
  destinationKey: string,
  momentType: string,
  stopType: string
): Promise<string | null> {
  try {
    const rows = await db
      .select({ imageUrl: tripStoryImageAssets.imageUrl })
      .from(tripStoryImageAssets)
      .where(
        and(
          eq(tripStoryImageAssets.destinationKey, destinationKey),
          eq(tripStoryImageAssets.momentType, momentType),
          eq(tripStoryImageAssets.stopType, stopType),
          eq(tripStoryImageAssets.status, "ready"),
          gte(tripStoryImageAssets.qualityScore, 7)
        )
      )
      .limit(1);
    return rows[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}

// isSlotAlreadyGenerated: regeneration-time guard — checks only status='ready',
// no quality filter. A slot with status=ready must never be regenerated regardless
// of quality score. The unique DB index enforces one row per (destKey, momentType, stopType);
// this check is the code-level enforcement of that invariant.
async function isSlotAlreadyGenerated(
  destinationKey: string,
  momentType: string,
  stopType: string
): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: tripStoryImageAssets.id })
      .from(tripStoryImageAssets)
      .where(
        and(
          eq(tripStoryImageAssets.destinationKey, destinationKey),
          eq(tripStoryImageAssets.momentType, momentType),
          eq(tripStoryImageAssets.stopType, stopType),
          eq(tripStoryImageAssets.status, "ready")
        )
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function saveImageAsset(asset: InsertTripStoryImageAsset): Promise<void> {
  try {
    await db
      .insert(tripStoryImageAssets)
      .values(asset)
      .onConflictDoNothing();
  } catch (e) {
    console.warn("[MemoryImageEngine] Failed to save asset:", e);
  }
}

// ─── Regeneration Pipeline ─────────────────────────────────────────────────────
// Iterates all 18 cities × 7 cards, checks the DB cache first, generates any
// missing images via DALL-E 3, writes PNGs to /public/memory-images/, inserts
// rows into trip_story_image_assets (onConflictDoNothing), and updates the
// corresponding trip_story_moments rows with the new image URL.
//
// Safe to call at any time — only generates images that are not yet cached.


export async function regenerateCityImages(openai: OpenAI): Promise<{ generated: number; skipped: number }> {
  const publicDir = path.join(process.cwd(), "public", "memory-images");
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  let generated = 0;
  let skipped = 0;

  for (const city of CITY_STOP_MAPS) {
    // Pre-compute the slot index for each experience card in this city.
    // Used below for deterministic trip_story_moments updates by sortOrder.
    const experienceCardOrder = city.cards
      .filter(c => c.cardType !== "hero" && c.cardType !== "kid_memory" && c.cardType !== "parent_relief");

    for (const card of city.cards) {
      // Regeneration guard: skip if any ready row exists for this slot — no quality filter.
      // "Never regenerate a ready slot" is the spec invariant. isSlotAlreadyGenerated
      // uses status='ready' only; checkAssetCache (used for serving) adds quality>=7.
      const alreadyGenerated = await isSlotAlreadyGenerated(city.destinationKey, card.cardType, card.stopType);
      if (alreadyGenerated) {
        skipped++;
        continue;
      }

      try {
        const { prompt, negativePrompt } = buildCardPrompt(
          card.cardType,
          city.label,
          city.country,
          card.stopName,
          card.stopType
        );

        // Generate image via DALL-E 3
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: `${prompt}\n\nNegative prompt: ${negativePrompt}`,
          size: "1024x1024",
          quality: "standard",
          n: 1,
        });

        const imageUrl = response.data?.[0]?.url;
        if (!imageUrl) {
          console.warn(`[MemoryImageEngine] No URL returned for ${city.destinationKey} / ${card.cardType}`);
          continue;
        }

        // Download the image bytes
        const imgResp = await fetch(imageUrl);
        if (!imgResp.ok) throw new Error(`Failed to download image: ${imgResp.status}`);
        const arrayBuffer = await imgResp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save PNG to disk
        const filePath = path.join(publicDir, card.fileName);
        fs.writeFileSync(filePath, buffer);
        const publicUrl = `/memory-images/${card.fileName}`;

        // Insert into trip_story_image_assets (onConflictDoNothing = never overwrite).
        // Includes all required NOT NULL fields: destinationLabel, country, tripType.
        await saveImageAsset({
          destinationKey: city.destinationKey,
          destinationLabel: city.label,
          country: city.country,
          tripType: city.tripType,
          momentType: card.cardType,
          stopType: card.stopType,
          stopName: card.stopName,
          promptText: prompt,
          promptVersion: "v2",
          imageUrl: publicUrl,
          status: "ready",
          qualityScore: 8,
          timesUsed: 1,
          isCurated: false,
        });

        // Update trip_story_moments rows deterministically per card type:
        // - hero/kid/parent: always stored with stable momentType values ("hero"/"kid"/"parent")
        // - experience cards (discovery/fun/quiet_break): update by sortOrder slot index,
        //   which is positional and independent of the legacy momentType taxonomy stored
        //   (e.g., "ruins"/"market"/"art" in legacy rows won't prevent the update).
        if (card.cardType === "hero") {
          await db.update(tripStoryMoments).set({ imageUrl: publicUrl }).where(
            and(eq(tripStoryMoments.destinationKey, city.destinationKey), eq(tripStoryMoments.momentType, "hero"))
          );
        } else if (card.cardType === "kid_memory") {
          await db.update(tripStoryMoments).set({ imageUrl: publicUrl }).where(
            and(eq(tripStoryMoments.destinationKey, city.destinationKey), eq(tripStoryMoments.momentType, "kid"))
          );
        } else if (card.cardType === "parent_relief") {
          await db.update(tripStoryMoments).set({ imageUrl: publicUrl }).where(
            and(eq(tripStoryMoments.destinationKey, city.destinationKey), eq(tripStoryMoments.momentType, "parent"))
          );
        } else {
          // Experience card: update by slot index (sortOrder) regardless of stored momentType.
          const slotIndex = experienceCardOrder.indexOf(card);
          if (slotIndex >= 0) {
            await db.update(tripStoryMoments).set({ imageUrl: publicUrl }).where(
              and(
                eq(tripStoryMoments.destinationKey, city.destinationKey),
                eq(tripStoryMoments.sortOrder, slotIndex),
                sql`moment_type NOT IN ('hero', 'kid', 'parent')`
              )
            );
          }
        }

        console.info(`[MemoryImageEngine] Generated: ${city.destinationKey} / ${card.cardType}(${card.stopType}) → ${card.fileName}`);
        generated++;
      } catch (err) {
        console.error(`[MemoryImageEngine] Error generating ${city.destinationKey}/${card.cardType}:`, err);
      }
    }
  }

  console.info(`[MemoryImageEngine] Regeneration complete: ${generated} generated, ${skipped} skipped`);
  return { generated, skipped };
}
