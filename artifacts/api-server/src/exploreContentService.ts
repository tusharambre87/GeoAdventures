import OpenAI from "openai";

const MODEL = "gpt-4o-mini";
const STORY_MODEL = "gpt-4o";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface NearbyAttraction {
  name: string;
  type: string;
  distance: string;
  description?: string;
}

export interface Restaurant {
  name: string;
  cuisine: string;
  distance: string;
  priceRange?: string;
}

export interface KidFriendlyPlace {
  name: string;
  type: string;
  distance: string;
  description?: string;
  ageRange?: string;
}

export interface Review {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface StoryTrack {
  text: string;
  durationSeconds: number;
}

export interface ExploreData {
  aboutArea: string;
  nearbyAttractions: NearbyAttraction[];
  restaurants: Restaurant[];
  kidFriendlyPlaces?: KidFriendlyPlace[];
  gettingAround?: string;
  tips?: string[];
  reviews?: Review[];
  googleMapsUrl?: string;
  openingHours?: string;
  entryCost?: string;
  parkingInfo?: string;
  stories?: {
    main: StoryTrack;
    quickHits: StoryTrack;
    history: StoryTrack;
  };
  wonderPrompt?: string;
  wonderTopics?: string[];
  missions?: any[];
  stopId?: string;
  stopName?: string;
  stopIndex?: number;
  totalStops?: number;
}

// Strip emojis and markdown from text before TTS narration
export function stripForTTS(text: string): string {
  return text
    // Remove emoji (covers all Unicode emoji ranges)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    // Remove markdown bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bullet-point symbols that aren't narrator cues
    .replace(/^[•·▪▸►▶–—]\s*/gm, "")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Estimate read-aloud duration: ~130 words/minute for narrated audio
function estimateDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.round((wordCount / 130) * 60);
}

export async function getExploreContent(
  stopName: string,
  stopType: string,
  destination: string
): Promise<ExploreData> {
  try {
    // Run practical info and stories generation in parallel
    const [practical, stories] = await Promise.all([
      generatePracticalContent(stopName, stopType, destination),
      generateStories(stopName, stopType, destination),
    ]);
    return { ...practical, stories };
  } catch (error) {
    console.error("Error generating explore content:", error);
    return getFallbackData(stopName, stopType, destination);
  }
}

async function generatePracticalContent(
  stopName: string,
  stopType: string,
  destination: string
): Promise<ExploreData> {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + " " + (destination || ""))}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a family travel expert with deep knowledge of real tourist attractions worldwide.
CRITICAL: Provide ONLY factual, accurate information based on your actual knowledge of the place named.
Do NOT invent details — only include information you are confident is accurate.
If unsure of exact hours/prices, say "varies" or "check website".
Return valid JSON only.`,
      },
      {
        role: "user",
        content: `Provide factual, real information about "${stopName}" (${stopType}) in ${destination || "this area"} for families with kids aged 5-12.

Return JSON with this exact structure:
{
  "aboutArea": "2-3 sentence factual description of what this specific attraction actually is, what visitors see/do, and why families love it. Be specific to this actual place.",
  "openingHours": "Real opening hours if known, e.g. 'Mon-Sun 9 AM - 5 PM' or 'Check website for seasonal hours'",
  "entryCost": "Real admission price if known, e.g. 'Adults $25, Kids $15' or 'Free admission'",
  "parkingInfo": "Real parking situation for this location",
  "nearbyAttractions": [
    {
      "name": "Real name of nearby attraction",
      "type": "beach|nature|landmark|museum|park|viewpoint|activity",
      "distance": "e.g. 5 min walk",
      "description": "What it actually is"
    }
  ],
  "restaurants": [
    {
      "name": "Real restaurant near this attraction",
      "cuisine": "Type of food",
      "distance": "e.g. 3 min walk",
      "priceRange": "$|$$|$$$"
    }
  ],
  "kidFriendlyPlaces": [
    {
      "name": "Real kid-friendly spot nearby",
      "type": "playground|ice_cream|toy_store|arcade|splash_pad|zoo|aquarium|mini_golf",
      "distance": "e.g. 8 min walk",
      "description": "Brief description",
      "ageRange": "e.g. Ages 3-10 or All ages"
    }
  ],
  "gettingAround": "Real transportation/parking tip for this specific location",
  "tips": ["Real insider tip 1 specific to this place", "Real tip 2", "Real tip 3"],
  "reviews": [
    {
      "authorName": "First name + last initial only",
      "rating": 5,
      "text": "Realistic review text (2-3 sentences) referencing specific real features of this attraction",
      "relativeTime": "e.g. 2 weeks ago"
    }
  ]
}

Provide 4-6 real nearby attractions, 4-5 real restaurants, 3-4 kid-friendly spots, and 4 realistic family reviews.
The reviews must mention specific real details about ${stopName} — exhibits, features, or experiences that actually exist there.`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No content in response");

  const data = JSON.parse(content);
  const googleMapsUrlFinal = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + " " + (destination || ""))}`;

  return {
    aboutArea: data.aboutArea || `${stopName} is a wonderful place to explore with your family.`,
    openingHours: data.openingHours || undefined,
    entryCost: data.entryCost || undefined,
    parkingInfo: data.parkingInfo || undefined,
    nearbyAttractions: Array.isArray(data.nearbyAttractions) ? data.nearbyAttractions.slice(0, 6) : [],
    restaurants: Array.isArray(data.restaurants) ? data.restaurants.slice(0, 5) : [],
    kidFriendlyPlaces: Array.isArray(data.kidFriendlyPlaces) ? data.kidFriendlyPlaces.slice(0, 4) : undefined,
    gettingAround: data.gettingAround || undefined,
    tips: Array.isArray(data.tips) ? data.tips.slice(0, 4) : undefined,
    reviews: Array.isArray(data.reviews) ? data.reviews.slice(0, 4) : undefined,
    googleMapsUrl: googleMapsUrlFinal,
  };
}

async function generateStories(
  stopName: string,
  stopType: string,
  destination: string
): Promise<{ main: StoryTrack; quickHits: StoryTrack; history: StoryTrack }> {
  const completion = await openai.chat.completions.create({
    model: STORY_MODEL,
    messages: [
      {
        role: "system",
        content: `You are writing narrated audio content for kids aged 5 to 14 visiting real places on a family trip.

CRITICAL RULES — THESE ARE NON-NEGOTIABLE:
- NO emojis anywhere. Zero. The text is read aloud by a TTS voice and emojis break it.
- NO markdown formatting. No asterisks, no hashes, no bullet symbols.
- NO lists introduced with dashes or numbers.
- Plain, natural spoken prose only.
- Narrator cues in square brackets are allowed and encouraged: [pause], [warm voice], [mysterious tone], [excited voice], [gently].
- Write as if a brilliant, warm storyteller is speaking directly to a child in the back seat of a car.
- Every sentence should feel effortless to say aloud.`,
      },
      {
        role: "user",
        content: `Write three narrated audio tracks for kids about to visit ${stopName} (a ${stopType} in ${destination}).

TRACK 1 — MAIN STORY (target: 600 to 800 words)
Build genuine curiosity and anticipation before arrival. Structure it in layers:
Opening (100 words): paint a vivid sensory picture — what the child will see, smell, hear when they arrive. Make it feel like the beginning of an adventure.
Middle (350 words): share the most fascinating true facts, legends, and secrets woven naturally into a flowing narrative. Include at least one surprising or counterintuitive detail that most visitors never notice. Speak to both younger and older kids.
Close (150 words): end with ONE thought-provoking question they can think about while they explore. Leave them wanting to look for something specific when they arrive.

TRACK 2 — QUICK HITS (target: 250 to 350 words)
Four to five surprising, specific facts about this place. Each fact gets two to four sentences. Write them as spoken paragraphs, not a list. Each should be a genuine "wait, really?" moment. Connect each fact to something the child can actually see or experience at the stop.

TRACK 3 — HISTORY (target: 450 to 600 words)
The human story behind this place. Focus on real people, their struggles, decisions, and discoveries. At least one story of someone overcoming a problem or having a breakthrough. Make history feel alive and personal, not like a textbook. End with why this history still matters today when they stand there.

Return JSON — every field is required:
{
  "main": "Full main story text. Plain prose. Narrator cues allowed. No emojis. No markdown.",
  "quickHits": "Quick hits text as spoken paragraphs. Plain prose. No emojis. No markdown.",
  "history": "History text as spoken paragraphs. Plain prose. No emojis. No markdown."
}`,
      },
    ],
    max_tokens: 3000,
    temperature: 0.72,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No stories content");

  const data = JSON.parse(content);

  const mainText = stripForTTS(data.main || "");
  const quickHitsText = stripForTTS(data.quickHits || "");
  const historyText = stripForTTS(data.history || "");

  return {
    main: { text: mainText, durationSeconds: estimateDuration(mainText) },
    quickHits: { text: quickHitsText, durationSeconds: estimateDuration(quickHitsText) },
    history: { text: historyText, durationSeconds: estimateDuration(historyText) },
  };
}

const WIKI_SKIP_STOPS = [
  'minneapolis institute of art',
  "children's theatre company",
  'stone arch bridge',
  'como park zoo',
];

export async function generateStopHeroImage(
  stopName: string,
  _stopType: string,
  _destination: string
): Promise<string | undefined> {
  const stopNameNorm = stopName.toLowerCase();
  if (WIKI_SKIP_STOPS.some(s => stopNameNorm.includes(s))) {
    return undefined;
  }

  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(stopName)}&prop=pageimages&format=json&pithumbsize=800&redirects=1`;
    const res = await fetch(url, { headers: { "User-Agent": "RoamUs/1.0 (family travel app)" } });
    if (res.ok) {
      const data = await res.json() as any;
      const pages = data?.query?.pages ?? {};
      const page = Object.values(pages)[0] as any;
      const thumb = page?.thumbnail?.source as string | undefined;
      if (thumb) return thumb;
    }
  } catch (err) {
    console.error("Stop hero image (Wikipedia) failed:", err);
  }
  return undefined;
}

function getFallbackData(stopName: string, stopType: string, destination: string): ExploreData {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + " " + (destination || ""))}`;

  const mainText = `[Warm voice] You are about to visit ${stopName}. [pause] Take a breath and look around when you arrive. This is a place that has drawn people from all over the world, and today you get to be one of them. [pause] Every great place has layers to it. There are the things you see right away, and then there are the things that take a little patience to notice. [pause] Your job today is to find something that surprises you. Something that you would not have expected. [pause] What is the one thing you want to discover?`;

  const quickHitsText = `This place is part of a destination that welcomes millions of visitors every year, yet most of them only scratch the surface of what is really here. [pause] The details that most people rush past are often the most interesting. Take your time. [pause] Ask someone who works here about their favorite thing. Local guides and staff almost always know something remarkable that is not in any guidebook. [pause] Look up, look down, and look behind you. Interesting things are rarely only at eye level.`;

  const historyText = `[Warm voice] Places like ${stopName} exist because someone, at some point, decided they were worth creating and preserving. [pause] That decision was not always easy. Building something lasting takes vision, resources, and the willingness to believe that future generations will care. [pause] Think about what this place looked like before it became what it is today. Every structure, every path, every feature was once just an idea in someone's mind. [pause] The people who built it could not have known you would be standing here. But in some way, they built it for you.`;

  return {
    aboutArea: `${stopName} is a popular destination in ${destination || "the area"}. This ${stopType} offers wonderful experiences for the whole family.`,
    googleMapsUrl,
    nearbyAttractions: [
      { name: "Local Visitor Center", type: "landmark", distance: "5 min walk" },
    ],
    restaurants: [
      { name: "Family Cafe", cuisine: "American", distance: "5 min walk", priceRange: "$$" },
    ],
    kidFriendlyPlaces: [
      { name: "Local Playground", type: "playground", distance: "10 min walk", description: "Great for kids!", ageRange: "All ages" },
    ],
    gettingAround: "Check local parking availability before you arrive.",
    tips: ["Bring water and snacks for the kids", "Arrive early for the best experience"],
    stories: {
      main: { text: mainText, durationSeconds: estimateDuration(mainText) },
      quickHits: { text: quickHitsText, durationSeconds: estimateDuration(quickHitsText) },
      history: { text: historyText, durationSeconds: estimateDuration(historyText) },
    },
  };
}
