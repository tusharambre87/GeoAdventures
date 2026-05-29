import OpenAI from "openai";
import { db } from "./db";
import { tripStoryMoments, type TripStoryMoment, type InsertTripStoryMoment } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { isIndiaDestination, resolveUnsplashUrl } from "./memoryUnsplash";
import { CITY_STOP_MAPS, checkAssetCache } from "./memoryImageEngine";

function getOpenAI(): OpenAI {
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });
}

export interface MemoryPayload {
  destinationKey: string;
  heroLine: string;
  heroSubline: string;
  heroImageUrl: string;
  moments: {
    placeName: string;
    momentType: string;
    imageUrl: string;
    caption: string;
    sortOrder: number;
  }[];
  kidQuotes: string[];
  kidImageUrl: string;
  parentReliefLine: string;
  parentImageUrl: string;
}

// Pre-generated content for top 10 destinations — seeded into DB at startup
const TOP_10_PAYLOADS: MemoryPayload[] = [
  {
    destinationKey: "chicago",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "/memory-images/chicago-hero.png",
    moments: [
      { placeName: "Field Museum", momentType: "museum", imageUrl: "/memory-images/chicago-museum.png", caption: "He wouldn't stop talking about Sue at the Field Museum", sortOrder: 0 },
      { placeName: "Navy Pier", momentType: "landmark", imageUrl: "/memory-images/chicago-landmark.png", caption: "She spotted the Ferris wheel before anyone else could", sortOrder: 1 },
      { placeName: "Millennium Park", momentType: "park", imageUrl: "/memory-images/chicago-park.png", caption: "They ran to the Bean screaming 'I can see myself!'", sortOrder: 2 },
      { placeName: "Shedd Aquarium", momentType: "water", imageUrl: "/memory-images/chicago-water.png", caption: "The dolphin show had them glued to the front row", sortOrder: 3 },
    ],
    kidQuotes: [
      "Sue is the biggest dinosaur I've EVER seen. Like actually HUGE.",
      "Mom, the Bean has a million of us inside it!",
      "Can we come back tomorrow? Please? For the dolphins?",
    ],
    kidImageUrl: "/memory-images/chicago-kids.png",
    parentReliefLine: "No meltdowns. No 'are we there yet?' Just them, wide-eyed, asking to go back.",
    parentImageUrl: "/memory-images/chicago-parent.png",
  },
  {
    destinationKey: "paris",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "/memory-images/paris-hero.png",
    moments: [
      { placeName: "Eiffel Tower", momentType: "landmark", imageUrl: "/memory-images/paris-landmark.png", caption: "She counted every floor of the Eiffel Tower out loud", sortOrder: 0 },
      { placeName: "Musée d'Orsay", momentType: "museum", imageUrl: "/memory-images/paris-museum.png", caption: "He stood in front of a Van Gogh for 10 uninterrupted minutes", sortOrder: 1 },
      { placeName: "Seine River Cruise", momentType: "boat", imageUrl: "/memory-images/paris-boat.png", caption: "They spotted Notre-Dame from the boat and erupted in cheers", sortOrder: 2 },
      { placeName: "Champs-Élysées patisserie", momentType: "food", imageUrl: "/memory-images/paris-food.png", caption: "Three macarons disappeared before we left the shop", sortOrder: 3 },
    ],
    kidQuotes: [
      "The Eiffel Tower is ACTUALLY made of metal. I thought it was stone!",
      "Can we eat a croissant every single morning here?",
      "That painting looked like it was moving. Like, actually.",
    ],
    kidImageUrl: "/memory-images/paris-kids.png",
    parentReliefLine: "Every stop landed. No complaining, no dragging feet — just curiosity.",
    parentImageUrl: "/memory-images/paris-parent.png",
  },
  {
    destinationKey: "london",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "/memory-images/london-hero.png",
    moments: [
      { placeName: "Natural History Museum", momentType: "museum", imageUrl: "/memory-images/london-museum.png", caption: "She stood under the blue whale and forgot to breathe", sortOrder: 0 },
      { placeName: "Tower of London", momentType: "ruins", imageUrl: "/memory-images/london-ruins.png", caption: "He whispered every Beefeater story back at dinner that night", sortOrder: 1 },
      { placeName: "Hyde Park", momentType: "park", imageUrl: "/memory-images/london-park.png", caption: "Two hours of boats on the Serpentine — zero complaints", sortOrder: 2 },
      { placeName: "Borough Market", momentType: "market", imageUrl: "/memory-images/london-market.png", caption: "They tried something new at every stall without being asked", sortOrder: 3 },
    ],
    kidQuotes: [
      "The whale is as long as our WHOLE STREET.",
      "Were the ravens ACTUALLY guarding the Tower? Like for real?",
      "Mum, why does everyone queue so nicely here?",
    ],
    kidImageUrl: "/memory-images/london-kids.png",
    parentReliefLine: "They were curious before you had a chance to explain anything.",
    parentImageUrl: "/memory-images/london-parent.png",
  },
  {
    destinationKey: "new york",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "/memory-images/new-york-hero.png",
    moments: [
      { placeName: "American Museum of Natural History", momentType: "museum", imageUrl: "/memory-images/new-york-museum.png", caption: "She named every dinosaur skeleton and corrected the sign on one", sortOrder: 0 },
      { placeName: "Central Park", momentType: "park", imageUrl: "/memory-images/new-york-park.png", caption: "Three hours of rowing and still didn't want to leave", sortOrder: 1 },
      { placeName: "High Line", momentType: "viewpoint", imageUrl: "/memory-images/new-york-viewpoint.png", caption: "He photographed every single art installation from 3 angles", sortOrder: 2 },
      { placeName: "Eataly", momentType: "food", imageUrl: "/memory-images/new-york-food.png", caption: "She declared it 'the best pizza in the universe, scientifically'", sortOrder: 3 },
    ],
    kidQuotes: [
      "The T-rex is bigger than our apartment building. It just IS.",
      "NYC smells like pizza everywhere. I love it here.",
      "Can we live in Central Park? Could we?",
    ],
    kidImageUrl: "/memory-images/new-york-kids.png",
    parentReliefLine: "The city did the entertaining. You just had to show up.",
    parentImageUrl: "/memory-images/new-york-parent.png",
  },
  {
    destinationKey: "tokyo",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "/memory-images/tokyo-hero.png",
    moments: [
      { placeName: "teamLab Planets", momentType: "art", imageUrl: "/memory-images/tokyo-art.png", caption: "She stepped into the infinity room and didn't speak for two whole minutes", sortOrder: 0 },
      { placeName: "Senso-ji Temple", momentType: "landmark", imageUrl: "/memory-images/tokyo-landmark.png", caption: "He pulled a fortune slip and made it his wallet treasure", sortOrder: 1 },
      { placeName: "Shibuya Crossing", momentType: "viewpoint", imageUrl: "/memory-images/tokyo-viewpoint.png", caption: "They counted 12 simultaneous crossings from the window seat", sortOrder: 2 },
      { placeName: "Tsukiji Outer Market", momentType: "food", imageUrl: "/memory-images/tokyo-food.png", caption: "Tamagoyaki on a stick and zero negotiations needed", sortOrder: 3 },
    ],
    kidQuotes: [
      "The floor was full of FLOWERS that moved. Real ones! Fake ones? Both?",
      "Japan is SO clean. Even the street is clean.",
      "I want to come back for every school holiday. Every single one.",
    ],
    kidImageUrl: "/memory-images/tokyo-kids.png",
    parentReliefLine: "Everything ran on time, every stop delighted them, nothing went sideways.",
    parentImageUrl: "/memory-images/tokyo-parent.png",
  },
  {
    destinationKey: "rome",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "/memory-images/rome-hero.png",
    moments: [
      { placeName: "Colosseum", momentType: "ruins", imageUrl: "/memory-images/rome-colosseum.png", caption: "He stood exactly where gladiators stood and refused to move", sortOrder: 0 },
      { placeName: "Trevi Fountain", momentType: "landmark", imageUrl: "/memory-images/rome-trevi.png", caption: "Three coins, three wishes, one argument about who got first throw", sortOrder: 1 },
      { placeName: "Campo de' Fiori Market", momentType: "park", imageUrl: "/memory-images/rome-market.png", caption: "She sampled every stall twice and declared the tomatoes 'different here'", sortOrder: 2 },
      { placeName: "Roman Forum", momentType: "food", imageUrl: "/memory-images/rome-forum.png", caption: "Older than anything they'd ever touched. They went quiet without being asked", sortOrder: 3 },
    ],
    kidQuotes: [
      "They actually FOUGHT here. With SWORDS. In this actual ring.",
      "Rome is basically Minecraft but real and really old.",
      "The pasta here tastes different than home pasta. Nicer different.",
    ],
    kidImageUrl: "/memory-images/rome-kids.png",
    parentReliefLine: "History came alive without a single audioguide complaint.",
    parentImageUrl: "/memory-images/rome-parent.png",
  },
  {
    destinationKey: "hawaii",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "https://source.unsplash.com/featured/?hawaii,family,beach,travel",
    moments: [
      { placeName: "Waimea Valley", momentType: "water", imageUrl: "https://source.unsplash.com/featured/?waimea+valley+hawaii+family+waterfall", caption: "She swam under the waterfall and announced she'd never shower again", sortOrder: 0 },
      { placeName: "Volcanoes National Park", momentType: "viewpoint", imageUrl: "https://source.unsplash.com/featured/?volcano+national+park+hawaii+family", caption: "He stared at the lava field for 20 minutes without saying a word", sortOrder: 1 },
      { placeName: "Kailua Beach", momentType: "water", imageUrl: "https://source.unsplash.com/featured/?kailua+beach+hawaii+family+children", caption: "First snorkel mask on — sea turtles spotted within 2 minutes", sortOrder: 2 },
      { placeName: "North Shore shrimp truck", momentType: "food", imageUrl: "https://source.unsplash.com/featured/?hawaii+shrimp+food+family", caption: "Garlic shrimp at a pink food truck — ranked best meal of the trip", sortOrder: 3 },
    ],
    kidQuotes: [
      "The turtle just looked at me. Like, directly at me. We were friends.",
      "That's not rock, that's dried lava. DRIED. LAVA.",
      "I want to live in the ocean. Can we move to the ocean?",
    ],
    kidImageUrl: "https://source.unsplash.com/featured/?hawaii,children,beach,happy",
    parentReliefLine: "Nature did the heavy lifting. They came home sunburned and happy.",
    parentImageUrl: "https://source.unsplash.com/featured/?hawaii,parent,beach,relax",
  },
  {
    destinationKey: "sydney",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "https://source.unsplash.com/featured/?sydney,family,travel,opera+house",
    moments: [
      { placeName: "Taronga Zoo", momentType: "park", imageUrl: "https://source.unsplash.com/featured/?taronga+zoo+sydney+family+children", caption: "She fed a giraffe and didn't wash her hand for the rest of the day", sortOrder: 0 },
      { placeName: "Sydney Opera House", momentType: "landmark", imageUrl: "https://source.unsplash.com/featured/?sydney+opera+house+family+kids", caption: "He decided then and there he wanted to be an architect", sortOrder: 1 },
      { placeName: "Bondi Beach", momentType: "water", imageUrl: "https://source.unsplash.com/featured/?bondi+beach+sydney+family+children", caption: "The surf school instructor said she was 'a natural'", sortOrder: 2 },
      { placeName: "The Rocks markets", momentType: "market", imageUrl: "https://source.unsplash.com/featured/?rocks+sydney+market+family", caption: "He spent all his pocket money on a hand-carved wooden koala", sortOrder: 3 },
    ],
    kidQuotes: [
      "The giraffe had the softest tongue of ANYTHING.",
      "If I was a building I'd be the Opera House. Obviously.",
      "Australian waves are DIFFERENT. They push you from behind!",
    ],
    kidImageUrl: "https://source.unsplash.com/featured/?sydney,children,happy,travel",
    parentReliefLine: "Smooth, sunny, and the kids asked for a 'round 2' before we left the hotel.",
    parentImageUrl: "https://source.unsplash.com/featured/?sydney,parent,relax,family",
  },
  {
    destinationKey: "barcelona",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "https://source.unsplash.com/featured/?barcelona,family,travel,sagrada",
    moments: [
      { placeName: "Sagrada Família", momentType: "landmark", imageUrl: "https://source.unsplash.com/featured/?sagrada+familia+barcelona+family+kids", caption: "She spent 15 minutes just looking at the ceiling, mouth open", sortOrder: 0 },
      { placeName: "Park Güell", momentType: "viewpoint", imageUrl: "https://source.unsplash.com/featured/?park+guell+barcelona+family+children", caption: "They chased every lizard mosaic across the terrace", sortOrder: 1 },
      { placeName: "La Barceloneta Beach", momentType: "water", imageUrl: "https://source.unsplash.com/featured/?barceloneta+beach+family+children", caption: "First swim in the Mediterranean — declared 'the best sea ever'", sortOrder: 2 },
      { placeName: "La Boqueria market", momentType: "market", imageUrl: "https://source.unsplash.com/featured/?boqueria+barcelona+food+family", caption: "He tried jamón for the first time and demanded more immediately", sortOrder: 3 },
    ],
    kidQuotes: [
      "That church took 100 YEARS to build and it's not even finished yet!",
      "Gaudí made lizards everywhere and nobody told him to stop. Cool.",
      "The sea here is warmer. And cleaner. And better.",
    ],
    kidImageUrl: "https://source.unsplash.com/featured/?barcelona,children,happy,travel",
    parentReliefLine: "Art, beach, food — they wanted all three and we delivered all three.",
    parentImageUrl: "https://source.unsplash.com/featured/?barcelona,parent,relax,family",
  },
  {
    destinationKey: "dubai",
    heroLine: "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: "/memory-images/dubai-hero.png",
    moments: [
      { placeName: "Burj Khalifa observation deck", momentType: "viewpoint", imageUrl: "/memory-images/dubai-viewpoint.png", caption: "She spotted the Palm from 555 metres up and screamed with joy", sortOrder: 0 },
      { placeName: "Dubai Museum", momentType: "museum", imageUrl: "/memory-images/dubai-museum.png", caption: "He walked through the souk replica three times, no prompting needed", sortOrder: 1 },
      { placeName: "Dubai Creek dhow cruise", momentType: "boat", imageUrl: "/memory-images/dubai-boat.png", caption: "Dinner on the water, the city glowing around them", sortOrder: 2 },
      { placeName: "Global Village", momentType: "market", imageUrl: "/memory-images/dubai-market.png", caption: "They ate their way through 6 countries without leaving one square", sortOrder: 3 },
    ],
    kidQuotes: [
      "Everything here is the TALLEST or the BIGGEST. Everything.",
      "The desert is just sand but like, a lot of sand. More than I thought.",
      "That dhow was a boat you eat dinner on. That's genius.",
    ],
    kidImageUrl: "/memory-images/dubai-kids.png",
    parentReliefLine: "Big, dazzling, and genuinely exhausting — the good kind of exhausting.",
    parentImageUrl: "/memory-images/dubai-parent.png",
  },
];

function normalizeDestinationKey(destination: string): string {
  // Strip country suffix (e.g., "Paris, France" → "paris") so callers
  // with full destination strings still hit top-10 seeded cache entries.
  // Hyphens are converted to spaces so "new-york" and "new york" resolve identically.
  const cityPart = destination.split(",")[0];
  return cityPart.toLowerCase().trim().replace(/-/g, " ").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function buildRowsFromPayload(payload: MemoryPayload): InsertTripStoryMoment[] {
  const destKey = payload.destinationKey;
  return [
    {
      destinationKey: destKey,
      placeName: destKey,
      momentType: "hero",
      imageUrl: payload.heroImageUrl,
      caption: payload.heroLine,
      kidQuote: null,
      tags: ["hero"],
      sortOrder: -1,
    },
    ...payload.moments.map((m, i) => ({
      destinationKey: destKey,
      placeName: m.placeName,
      momentType: m.momentType,
      imageUrl: m.imageUrl,
      caption: m.caption,
      kidQuote: payload.kidQuotes[i] || null,
      tags: [m.momentType],
      sortOrder: m.sortOrder,
    })),
    {
      destinationKey: destKey,
      placeName: destKey,
      momentType: "kid",
      imageUrl: payload.kidImageUrl,
      caption: payload.kidQuotes[0] || "",
      kidQuote: payload.kidQuotes.join("|||"),
      tags: ["kid"],
      sortOrder: 90,
    },
    {
      destinationKey: destKey,
      placeName: destKey,
      momentType: "parent",
      imageUrl: payload.parentImageUrl,
      caption: payload.parentReliefLine,
      kidQuote: null,
      tags: ["parent"],
      sortOrder: 99,
    },
  ];
}

// Seed top-10 destinations into the DB at server startup (always upsert to refresh image URLs)
export async function seedTop10MemoryContent(): Promise<void> {
  let seeded = 0;
  for (const payload of TOP_10_PAYLOADS) {
    try {
      const rows = buildRowsFromPayload(payload);
      // onConflictDoNothing preserves any existing rows (so manually updated /memory-images/ paths
      // are never overwritten by the seed on server restart)
      await db.insert(tripStoryMoments)
        .values(rows)
        .onConflictDoNothing();
      seeded++;
    } catch (e) {
      console.warn(`[MemoryEngine] Failed to seed ${payload.destinationKey}:`, e);
    }
  }
  console.log(`[MemoryEngine] Seeded ${seeded} top-10 destinations into trip_story_moments`);
}

// Use stored image URL if it's our pre-generated asset; otherwise fall back to
// the curated Unsplash bank for that city (CITY_BANKS in memoryUnsplash.ts).
// Family photos are ONLY used by the Card2 collage in the carousel — never here.
function pickImageUrl(storedUrl: string | null | undefined, momentType: string, destKey: string, familyType: string): string {
  if (storedUrl && storedUrl.startsWith("/memory-images/")) return storedUrl;
  return resolveUnsplashUrl(momentType, destKey, familyType);
}

function buildPayloadFromRows(destKey: string, rows: TripStoryMoment[]): MemoryPayload {
  const heroRow = rows.find(r => r.momentType === "hero") || rows[0];
  const momentRows = rows
    .filter(r => !["hero", "kid", "parent"].includes(r.momentType))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 4);
  const kidRow = rows.find(r => r.momentType === "kid");
  const parentRow = rows.find(r => r.momentType === "parent");

  const rawKidQuotes = kidRow?.kidQuote ? kidRow.kidQuote.split("|||") : [];
  const fallbackKidQuotes = rows.filter(r => r.kidQuote && r.momentType !== "kid").map(r => r.kidQuote!).slice(0, 3);
  const kidQuotes = rawKidQuotes.length > 0 ? rawKidQuotes.slice(0, 3) : fallbackKidQuotes;

  const familyType = isIndiaDestination(destKey) ? "indian" : "western";

  return {
    destinationKey: destKey,
    heroLine: heroRow?.caption || "This is what they'll remember",
    heroSubline: "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl: pickImageUrl(heroRow?.imageUrl, "hero", destKey, familyType),
    moments: momentRows.map(r => ({
      placeName: r.placeName,
      momentType: r.momentType,
      imageUrl: pickImageUrl(r.imageUrl, r.momentType, destKey, familyType),
      caption: r.caption,
      sortOrder: r.sortOrder,
    })),
    kidQuotes,
    kidImageUrl: pickImageUrl(kidRow?.imageUrl, "kid", destKey, familyType),
    parentReliefLine: parentRow?.caption || "Less guessing. More moments.",
    parentImageUrl: pickImageUrl(parentRow?.imageUrl, "parent", destKey, familyType),
  };
}

interface AIMoment {
  placeName?: string;
  momentType?: string;
  caption?: string;
  sortOrder?: number;
}

interface AIResponse {
  heroLine?: string;
  heroSubline?: string;
  moments?: AIMoment[];
  kidQuotes?: string[];
  parentReliefLine?: string;
}

const BANNED_MARKETING_WORDS = ["amazing", "incredible", "unforgettable", "magical", "wonderful", "breathtaking", "phenomenal", "spectacular"];

function validateAIResponse(raw: AIResponse, destination: string): boolean {
  if (!raw.heroLine || raw.heroLine.split(" ").length > 10) return false;
  // Require exactly 4 moments to match the 4-caption grid in Card 2
  if (!raw.moments || raw.moments.length < 4) return false;
  // Require 3 kid quotes for the Kid Memory card rotation
  if (!raw.kidQuotes || raw.kidQuotes.length < 3) return false;

  const destLower = destination.toLowerCase().split(",")[0].trim();

  // Reject if any moment is missing a real place name (length guard)
  const momentsMissingPlace = raw.moments.filter(m =>
    !m.placeName || m.placeName.trim().length < 3
  );
  if (momentsMissingPlace.length > 0) return false;

  const allText = [
    raw.heroLine,
    raw.heroSubline,
    ...raw.moments.map(m => `${m.placeName} ${m.caption}`),
    ...raw.kidQuotes,
    raw.parentReliefLine,
  ].join(" ").toLowerCase();

  if (BANNED_MARKETING_WORDS.some(w => allText.includes(w))) return false;

  // At least one moment must reference the destination city
  const hasDestRef = raw.moments.some(m =>
    (`${m.placeName} ${m.caption}`).toLowerCase().includes(destLower)
  );
  if (!hasDestRef) return false;

  return true;
}

async function generateMemoryContentFromAI(destination: string, context?: MemoryContext): Promise<MemoryPayload> {
  const openai = getOpenAI();
  const country = context?.country || destination;
  const familyType = isIndiaDestination(country) ? "indian" : "western";
  const familyDesc = familyType === "indian"
    ? "Indian family with 1-2 children aged 5-12"
    : "American or European family with 2-3 children aged 5-12";

  const stopsContext = context?.stops?.length
    ? `\nKnown stops/attractions in the trip: ${context.stops.join(", ")}.`
    : "";
  const tripTypeContext = context?.tripType ? `\nTrip type: ${context.tripType}.` : "";

  const prompt = `You are a travel memory writer for families. Generate emotionally real, specific content for a family trip to ${destination}${context?.country ? ", " + context.country : ""}.

Family: ${familyDesc}${stopsContext}${tripTypeContext}

Return ONLY valid JSON with this exact structure:
{
  "heroLine": "string — max 8 words, emotionally resonant, no marketing language",
  "heroSubline": "string — 1 sentence about what really matters on trips",
  "moments": [
    {
      "placeName": "real specific place name in ${destination}",
      "momentType": "one of: museum|viewpoint|boat|playground|food|landmark|water|ruins|park|art|market",
      "caption": "1 sentence, names the real place, describes a specific child moment, sounds true — no marketing",
      "sortOrder": 0
    },
    { "placeName": "...", "momentType": "...", "caption": "...", "sortOrder": 1 },
    { "placeName": "...", "momentType": "...", "caption": "...", "sortOrder": 2 },
    { "placeName": "...", "momentType": "...", "caption": "...", "sortOrder": 3 }
  ],
  "kidQuotes": [
    "quote 1 — sounds like a real child aged 5-10 said it, specific to ${destination}, all caps for emphasis words",
    "quote 2",
    "quote 3"
  ],
  "parentReliefLine": "1 sentence about less stress and smoother days, no marketing language, conversational"
}

Rules:
- Every caption must name a REAL place or object in ${destination}
- Kid quotes must sound like actual children (short, exclamatory, specific)
- No marketing words: amazing, incredible, unforgettable, magical, wonderful
- heroLine must be under 8 words`;

  async function callAI(temp: number): Promise<AIResponse> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: temp,
    });
    return JSON.parse(response.choices[0].message.content || "{}") as AIResponse;
  }

  let raw = await callAI(0.7);
  if (!validateAIResponse(raw, destination)) {
    console.info(`[MemoryEngine] Quality check failed for ${destination}, retrying with lower temperature`);
    raw = await callAI(0.4);
  }
  const destKey = normalizeDestinationKey(destination);

  // Build fallback moments: use stop names from context when AI validation fails twice.
  // Fallback always produces exactly 4 moments with destination-grounded captions.
  const fallbackMomentTypes = ["landmark", "museum", "park", "viewpoint"] as const;
  const fallbackStopNames = context?.stops?.slice(0, 4) || [];
  // Helper: resolves image URL for AI-generated (unknown) destinations.
  // CITY_STOP_MAPS destinations are always served via getOrGenerateMemoryContent with
  // checkAssetCache, so this path is only reached for destinations not in the stop maps.
  // No trip_story_image_assets lookup here — unknown cities have no cached assets.
  function resolveImageUrl(momentType: string): Promise<string> {
    return Promise.resolve(resolveUnsplashUrl(momentType, destination, familyType));
  }

  const useAIMoments = validateAIResponse(raw, destination) && raw.moments && raw.moments.length >= 4;
  const moments = await Promise.all(
    useAIMoments
      ? raw.moments!.slice(0, 4).map(async (m: AIMoment, i: number) => ({
          placeName: m.placeName || destination,
          momentType: m.momentType || "landmark",
          imageUrl: await resolveImageUrl(m.momentType || "landmark"),
          caption: m.caption || `A moment at ${destination}`,
          sortOrder: i,
        }))
      : fallbackMomentTypes.map(async (type, i) => {
          const stopName = fallbackStopNames[i];
          const typeLabel: Record<string, string> = {
            landmark: "city landmark", museum: "natural history museum",
            park: "central park", viewpoint: "observation deck",
          };
          const placeName = stopName || `${destination} ${typeLabel[type] ?? type}`;
          return {
            placeName,
            momentType: type,
            imageUrl: await resolveImageUrl(type),
            caption: stopName
              ? `The kids found their stride at ${stopName} in ${destination}.`
              : `The kids went quiet the moment they walked into the ${destination} ${typeLabel[type] ?? type}.`,
            sortOrder: i,
          };
        })
  );

  // Require exactly 3 kid quotes; fallback produces 3 destination-specific quotes
  const kidQuotes = raw.kidQuotes && raw.kidQuotes.length >= 3
    ? raw.kidQuotes.slice(0, 3)
    : [
        `"${destination} was the BEST part of the whole trip!"`,
        `"Can we PLEASE come back tomorrow?"`,
        `"I didn't want to leave ${destination}."`,
      ];

  const [heroImageUrl, kidImageUrl, parentImageUrl] = await Promise.all([
    resolveImageUrl("hero"),
    resolveImageUrl("kid_memory"),
    resolveImageUrl("parent_relief"),
  ]);

  return {
    destinationKey: destKey,
    heroLine: raw.heroLine || "This is what they'll remember",
    heroSubline: raw.heroSubline || "Not the route. Not the schedule. The moment they couldn't stop talking about.",
    heroImageUrl,
    moments,
    kidQuotes,
    kidImageUrl,
    parentReliefLine: raw.parentReliefLine || "Less guessing. More moments.",
    parentImageUrl,
  };
}

export interface MemoryContext {
  country?: string;
  tripType?: string;
  stops?: string[];
}

// Always checks DB first (all destinations including top-10), generates on miss.
// Falls back to in-memory top-10 payload if DB hasn't been seeded yet (cold-start window).
export async function getOrGenerateMemoryContent(destination: string, context?: MemoryContext): Promise<MemoryPayload> {
  const destKey = normalizeDestinationKey(destination);

  // Step 1 — DB-first: read trip_story_moments + enrich with trip_story_image_assets.
  // trip_story_image_assets is authoritative for image URLs when rows exist with
  // status=ready and quality_score>=7. This ensures stop-specific images are served
  // even when trip_story_moments rows contain stale Unsplash or AI-generated URLs.
  const cityMapForDb = CITY_STOP_MAPS.find(c => c.destinationKey === destKey);
  try {
    const existing = await db
      .select()
      .from(tripStoryMoments)
      .where(eq(tripStoryMoments.destinationKey, destKey))
      .limit(20);

    if (existing.length >= 4) {
      const basePayload = buildPayloadFromRows(destKey, existing);
      if (cityMapForDb) {
        const heroCard    = cityMapForDb.cards.find(c => c.cardType === "hero");
        const kidCard     = cityMapForDb.cards.find(c => c.cardType === "kid_memory");
        const parentCard  = cityMapForDb.cards.find(c => c.cardType === "parent_relief");
        const expCards    = cityMapForDb.cards.filter(
          c => c.cardType !== "hero" && c.cardType !== "kid_memory" && c.cardType !== "parent_relief"
        );
        const [aHero, aKid, aParent, ...aMoments] = await Promise.all([
          heroCard   ? checkAssetCache(destKey, "hero",          heroCard.stopType)   : Promise.resolve(null),
          kidCard    ? checkAssetCache(destKey, "kid_memory",    kidCard.stopType)    : Promise.resolve(null),
          parentCard ? checkAssetCache(destKey, "parent_relief", parentCard.stopType) : Promise.resolve(null),
          ...expCards.map(card => checkAssetCache(destKey, card.cardType, card.stopType)),
        ]);
        if (aHero) basePayload.heroImageUrl = aHero;
        if (aKid) basePayload.kidImageUrl = aKid;
        if (aParent) basePayload.parentImageUrl = aParent;
        basePayload.moments = basePayload.moments.map((m, i) => ({
          ...m,
          imageUrl: aMoments[i] ?? m.imageUrl,
        }));
      }
      return basePayload;
    }
  } catch (e) {
    console.warn("[MemoryEngine] DB read failed, falling back to in-memory/AI:", (e as Error).message?.slice(0, 120));
  }

  // Step 2 — Pre-fallback asset cache check: resolve cached image URLs from
  // trip_story_image_assets by (destination_key, moment_type, stop_type).
  // This runs BEFORE both the in-memory TOP_10 and AI generation paths so that
  // stop-specific family images are always preferred when available in the DB.
  const cityMap = CITY_STOP_MAPS.find(c => c.destinationKey === destKey);
  let preCachedImages: {
    hero: string | null;
    kid: string | null;
    parent: string | null;
    moments: (string | null)[];
  } | null = null;
  if (cityMap) {
    const heroCard    = cityMap.cards.find(c => c.cardType === "hero");
    const kidCard     = cityMap.cards.find(c => c.cardType === "kid_memory");
    const parentCard  = cityMap.cards.find(c => c.cardType === "parent_relief");
    const experienceCards = cityMap.cards.filter(
      c => c.cardType !== "hero" && c.cardType !== "kid_memory" && c.cardType !== "parent_relief"
    );
    const [hero, kid, parent, ...momentUrls] = await Promise.all([
      heroCard   ? checkAssetCache(destKey, "hero",          heroCard.stopType)   : Promise.resolve(null),
      kidCard    ? checkAssetCache(destKey, "kid_memory",    kidCard.stopType)    : Promise.resolve(null),
      parentCard ? checkAssetCache(destKey, "parent_relief", parentCard.stopType) : Promise.resolve(null),
      ...experienceCards.map(card => checkAssetCache(destKey, card.cardType, card.stopType)),
    ]);
    preCachedImages = { hero, kid, parent, moments: momentUrls };
  }

  // Step 3 — In-memory TOP_10 fallback: inject pre-cached images when available.
  // Text content (heroLine, kidQuotes, captions) comes from the payload; image URLs
  // come from the pre-cached asset lookup above, falling back to Unsplash on miss.
  const inMemory = TOP_10_PAYLOADS.find(p => normalizeDestinationKey(p.destinationKey) === destKey);
  if (inMemory) {
    console.info(`[MemoryEngine] Cold-start fallback: serving ${destKey} from in-memory top-10`);
    const fType = isIndiaDestination(destKey) ? "indian" : "western";
    return {
      ...inMemory,
      heroImageUrl: preCachedImages?.hero ?? pickImageUrl(inMemory.heroImageUrl, "hero", destKey, fType),
      moments: inMemory.moments.map((m, i) => ({
        ...m,
        imageUrl: preCachedImages?.moments[i] ?? pickImageUrl(m.imageUrl, m.momentType, destKey, fType),
      })),
      kidImageUrl: preCachedImages?.kid ?? pickImageUrl(inMemory.kidImageUrl, "kid", destKey, fType),
      parentImageUrl: preCachedImages?.parent ?? pickImageUrl(inMemory.parentImageUrl, "parent", destKey, fType),
    };
  }

  // Step 4 — AI generation for destinations not in TOP_10_PAYLOADS.
  // preCachedImages (from Step 2) is injected into the AI-generated payload after
  // generation, so stop-specific family images are used while AI provides the rich
  // narrative text (heroLine, captions, kidQuotes). This applies to CITY_STOP_MAPS
  // non-top-10 cities and unknown destinations alike — images come from cache when
  // available, and AI always provides the narrative.
  const payload = await generateMemoryContentFromAI(destination, context);
  if (preCachedImages) {
    if (preCachedImages.hero)   payload.heroImageUrl   = preCachedImages.hero;
    if (preCachedImages.kid)    payload.kidImageUrl    = preCachedImages.kid;
    if (preCachedImages.parent) payload.parentImageUrl = preCachedImages.parent;
    payload.moments = payload.moments.map((m, i) => ({
      ...m,
      imageUrl: preCachedImages!.moments[i] ?? m.imageUrl,
    }));
  }
  const rows = buildRowsFromPayload(payload);
  try {
    await db.insert(tripStoryMoments).values(rows).onConflictDoNothing();
  } catch (e) {
    console.warn("[MemoryEngine] Cache write failed (non-fatal):", e);
  }
  return payload;
}
