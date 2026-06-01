import OpenAI from "openai";
import { GEOQUEST_SAFETY_PROMPT, isProhibitedContent } from "./contentSafety";

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

// Strip emojis and markdown — text must be clean for TTS
export function stripForTTS(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[•·▪▸►▶–—]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Estimate read-aloud duration at ~130 words/minute
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
    googleMapsUrl,
  };
}

// ─── Two-step story generation — same proven approach as GeoAdventures ────────

async function generateStories(
  stopName: string,
  stopType: string,
  destination: string
): Promise<{ main: StoryTrack; quickHits: StoryTrack; history: StoryTrack }> {

  // ── Step 1: Gather real, specific facts about this exact place ──────────────
  let realFacts: string[] = [];
  try {
    const factsCompletion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable travel researcher and historian. 
Your job is to recall SPECIFIC, REAL, ACCURATE information about a named place — not generic descriptions.
Think: founding story, key dates, notable people, what was built first and why, construction challenges, surprising historical events, specific features visitors will see, physical dimensions or records, things that make this place unique in the world.
Be precise. Be specific. Avoid vague generalities.`,
        },
        {
          role: "user",
          content: `Give me 8 to 10 real, specific, accurate facts about ${stopName} (a ${stopType} in ${destination}).

Include a mix of:
- Origin story: who decided to create it, when, and why
- Key people involved in its creation or history
- Specific historical events that happened here or shaped it
- Surprising or counterintuitive facts most visitors don't know
- Physical details visitors will actually see (materials, size, design choices)
- How it has changed over time

Return JSON:
{
  "facts": [
    "specific fact 1",
    "specific fact 2",
    "..."
  ]
}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const factsContent = factsCompletion.choices[0]?.message?.content;
    if (factsContent) {
      const parsed = JSON.parse(factsContent);
      realFacts = ((parsed.facts || []) as string[])
        .filter((f: string) => !isProhibitedContent(f))
        .slice(0, 10);
    }
  } catch (err) {
    console.error("[generateStories] Step 1 facts gathering failed:", err);
  }

  const factsContext = realFacts.length > 0
    ? `\n\nReal, verified facts about ${stopName} — YOU MUST use these as the foundation of your stories:\n${realFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nDo NOT write generic content that could apply to any place. Every sentence should be specific to ${stopName}.`
    : `\nNote: Draw on your knowledge of ${stopName} to write stories that are specific to this place only.`;

  // ── Step 2: Write all three tracks using those facts ──────────────────────
  try {
    const completion = await openai.chat.completions.create({
      model: STORY_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a brilliant storyteller creating narrated audio tracks for kids aged 5 to 14 who are about to visit a real place on a family trip.

Your voice is warm, curious, and slightly conspiratorial — like a favourite relative who knows amazing things and loves sharing them. Not a teacher. Not a tour guide reading a pamphlet. A real storyteller.

WHAT MAKES GREAT TRAVEL AUDIO FOR KIDS:
- It is completely specific to THIS place. A listener should immediately know which place is being described.
- It builds genuine curiosity about real things they will see.
- It treats the listener as intelligent, whatever their age.
- It tells human stories — real people, real decisions, real struggles.
- It has rhythm and pace. Some sentences are short. Some breathe longer.
- It earns every sentence. Nothing is filler.

NARRATOR CUES — use these throughout for natural TTS pacing:
[pause] — a beat of silence, used after a striking idea
[warm voice] — gentle and reassuring opening tone
[mysterious tone] — drop the energy, get conspiratorial
[excited voice] — genuine enthusiasm, not forced
[slowly] — slow down for emphasis

ABSOLUTE RULES — violating these ruins the audio:
- NO emojis. Not one. They are spoken aloud by the TTS engine and sound absurd.
- NO markdown. No asterisks, hashes, or bullet symbols of any kind.
- NO lists introduced with numbers or dashes.
- NO phrases like "imagine you are" or "close your eyes" — they are overused clichés.
- NO generic content that could describe ANY place. Every sentence must be specific.
- Plain, natural spoken prose only.

${GEOQUEST_SAFETY_PROMPT}`,
        },
        {
          role: "user",
          content: `Write three narrated audio tracks for kids visiting ${stopName} (a ${stopType} in ${destination}).
${factsContext}

──────────────────────────────────────────────────────
TRACK 1: MAIN STORY — target 650 to 900 words (about 5 to 7 minutes spoken)
──────────────────────────────────────────────────────
This is the primary experience. Write it as one flowing narrative, not chapters.

Opening (about 120 words): Start with something specific and vivid about THIS place — a sensory detail, a striking fact, or a moment in history. Do not open with "Welcome to" or "Today we are visiting". Drop the listener straight into the story.

Middle (about 600 words): Weave the real facts into a narrative that builds. Include at least one moment of genuine surprise — something that makes a child say "wait, really?". Include the human story: who made this, why, what was hard about it. Connect what happened in the past to what the child will see with their own eyes.

Close (about 150 words): End with one specific, compelling question they can think about while exploring. Make it connected to something real they will actually see.

──────────────────────────────────────────────────────
TRACK 2: QUICK HITS — target 260 to 390 words (about 2 to 3 minutes spoken)
──────────────────────────────────────────────────────
Six to eight surprising facts about ${stopName}, written as spoken paragraphs.
Each fact gets two to four natural sentences. Write them as flowing speech, NOT as a list.
Each one should be a genuine "wait, I did not know that" moment.
Each should connect to something the child can actually see or look for at the stop.
Transition naturally between facts — use phrases like "And here is something even more surprising..." or "But that is not all...".

──────────────────────────────────────────────────────
TRACK 3: HISTORY — target 260 to 390 words (about 2 to 3 minutes spoken)
──────────────────────────────────────────────────────
The human story behind ${stopName}. Focus on real people and the decisions they made.
Include: who had the original idea and why, at least one specific challenge or setback they faced, and one moment where a person's choice changed what this place became.
Write it as a story, not a summary. Use the facts gathered to make it specific.
End by connecting that history to the child standing there today — why does it still matter?

──────────────────────────────────────────────────────

Return JSON with exactly these three fields. Every field is a single string of plain prose:
{
  "main": "The main story text. Plain prose. Narrator cues allowed. No emojis. No markdown. 650 to 900 words.",
  "quickHits": "The quick hits text. Spoken paragraphs. No emojis. No markdown. 260 to 390 words.",
  "history": "The history text. Spoken paragraphs. No emojis. No markdown. 260 to 390 words."
}`,
        },
      ],
      max_tokens: 7000,
      temperature: 0.72,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No stories content");

    const data = JSON.parse(content);

    // The LLM output is already constrained by GEOQUEST_SAFETY_PROMPT — do NOT
    // run isProhibitedContent on story text. Historical prose legitimately
    // contains words like "violence", "terrorism", "suicide" in context, and the
    // simple string match would blank a 900-word story on a single word hit.
    const mainRaw = (data.main || "").trim();
    const quickHitsRaw = (data.quickHits || "").trim();
    const historyRaw = (data.history || "").trim();

    if (!mainRaw || !quickHitsRaw || !historyRaw) {
      throw new Error("Missing story tracks in response");
    }

    const mainText = stripForTTS(mainRaw);
    const quickHitsText = stripForTTS(quickHitsRaw);
    const historyText = stripForTTS(historyRaw);

    return {
      main: { text: mainText, durationSeconds: estimateDuration(mainText) },
      quickHits: { text: quickHitsText, durationSeconds: estimateDuration(quickHitsText) },
      history: { text: historyText, durationSeconds: estimateDuration(historyText) },
    };

  } catch (error) {
    console.error("[generateStories] Step 2 generation failed:", error);
    throw error;
  }
}

// ─── Hero image ───────────────────────────────────────────────────────────────

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

// ─── Fallback ─────────────────────────────────────────────────────────────────

function getFallbackData(stopName: string, stopType: string, destination: string): ExploreData {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + " " + (destination || ""))}`;

  const mainText = `[Warm voice] There is a reason people travel from all over the world to stand where you are about to stand. [pause] ${stopName} is one of those places that looks one way in photographs and feels completely different in person. The scale of it, the details up close, the sounds and the light — none of that comes through in a picture.

Before you get there, here is something worth knowing. Places like this one were not built overnight, and they were not built easily. Someone had a vision, fought to make it happen, and convinced others it was worth the effort. That human story is written into every part of the place, even if most visitors never stop to think about it.

As you explore, resist the urge to rush through. The things that most people miss are usually right in front of them — in the materials, the proportions, the small decisions that add up to something remarkable. [pause] Look at how things are put together. Look at what is worn smooth from a century of hands touching it. Look up when everyone else is looking straight ahead.

[Mysterious tone] And if you get the chance, find someone who works there and ask them what their favourite detail is. The people who spend their days in a place like this always know something that is not in any guidebook.

[Warm voice] Here is your question to carry with you: what is the one thing about ${stopName} that you would want to tell someone who had never heard of it?`;

  const quickHitsText = `${stopName} draws visitors from dozens of countries every year, but most of them only see a fraction of what is actually there. The parts that take a little extra attention are often the most interesting.

The materials used to build and maintain a place like this tell their own story. Stone, metal, glass, and wood all age differently, and if you look closely at different surfaces, you can often see exactly where and when different parts were added or repaired.

Sound behaves in surprising ways in large structures. Some areas were designed specifically to carry a voice or music across a wide space. Others create pockets of unexpected quiet. Pay attention to how the acoustic character of the space changes as you move through it.

Every place like this has been photographed millions of times, but photographs almost always miss the sense of scale. Until you are standing next to the real thing, it is nearly impossible to understand how large, or sometimes how small, it actually is.

The people who maintain a place like this work mostly invisibly. The cleaning, the repairs, the climate control, the security — it is a continuous effort that most visitors never think about. What you are seeing today exists because of work that happened last night.`;

  const historyText = `[Warm voice] The story of ${stopName} begins with a decision — someone looked at a piece of land, or a problem that needed solving, and said: this is where it should go, and this is what it should be.

That decision was almost certainly harder to make than it looks in hindsight. Resources had to be gathered. People had to be convinced. Plans that seemed sound on paper ran into realities that nobody had anticipated. There were probably moments when the whole thing might have been abandoned.

The version of ${stopName} that exists today is not the first version that was imagined. It is the version that survived compromise, setback, and the long test of time. Every generation since has had to decide whether to maintain it, restore it, or let it decline. The fact that you are visiting it means enough people kept saying yes.

[Pause] When you stand inside or in front of it, you are standing in a place that outlasted the people who built it, the arguments that surrounded its creation, and several different eras of what people thought was worth caring about. [Warm voice] That is not nothing. That is actually remarkable.`;

  return {
    aboutArea: `${stopName} is a popular destination in ${destination || "the area"}. This ${stopType} offers wonderful experiences for the whole family.`,
    googleMapsUrl,
    nearbyAttractions: [{ name: "Local Visitor Center", type: "landmark", distance: "5 min walk" }],
    restaurants: [{ name: "Family Cafe", cuisine: "American", distance: "5 min walk", priceRange: "$$" }],
    kidFriendlyPlaces: [{ name: "Local Playground", type: "playground", distance: "10 min walk", description: "Great for kids!", ageRange: "All ages" }],
    gettingAround: "Check local parking availability before you arrive.",
    tips: ["Bring water and snacks for the kids", "Arrive early for the best experience"],
    stories: {
      main: { text: mainText, durationSeconds: estimateDuration(mainText) },
      quickHits: { text: quickHitsText, durationSeconds: estimateDuration(quickHitsText) },
      history: { text: historyText, durationSeconds: estimateDuration(historyText) },
    },
  };
}
