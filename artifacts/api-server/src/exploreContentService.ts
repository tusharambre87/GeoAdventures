import OpenAI from "openai";
import { GEOQUEST_SAFETY_PROMPT, isProhibitedContent, isProhibitedStoryContent } from "./contentSafety";

const MODEL = "gpt-5-mini";
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
    .replace(/\[[a-zA-Z][^\]]{0,40}\]/g, "")
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
  destination: string,
  youngestChildAge?: number
): Promise<ExploreData> {
  try {
    const [practical, stories] = await Promise.all([
      generatePracticalContent(stopName, stopType, destination),
      generateStories(stopName, stopType, destination, youngestChildAge),
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

// ─── Story generation — one call per track, run in parallel ──────────────────

const STORY_SYSTEM_PROMPT = `You are a brilliant storyteller creating audio narration for families visiting a real place on a trip.

Your voice is warm, curious, and slightly conspiratorial — like a favourite relative who knows amazing things and loves sharing them. Not a teacher. Not a tour guide reading a pamphlet. A real storyteller who earns every sentence.

WHAT MAKES GREAT TRAVEL AUDIO:
- Every sentence is specific to THIS place. A listener immediately knows which place is being described.
- It builds genuine curiosity about real things they will see with their own eyes.
- It treats every listener as intelligent.
- It tells human stories — real people, real decisions, real struggles, real stakes.
- It has rhythm and pace. Some sentences are short. Some breathe longer.
- Nothing is filler.

ABSOLUTE RULES — violating these ruins the experience:
- NO emojis. Not one.
- NO markdown. No asterisks, hashes, bullet symbols, or dashes introducing items.
- NO narrator stage directions or bracket cues of any kind.
- NO phrases like "imagine you are" or "close your eyes".
- NO generic content that could describe ANY place. Every sentence must be specific.
- NO "Welcome to..." or "Today we are visiting..." openings. Drop the listener straight into the story.
- Plain, natural spoken prose only.

${GEOQUEST_SAFETY_PROMPT}`;

async function generateTrackText(prompt: string, minWords: number, trackName: string): Promise<string> {
  const callOnce = async (): Promise<string> => {
    const completion = await openai.chat.completions.create({
      model: STORY_MODEL,
      messages: [
        { role: "system", content: STORY_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 2500,
      temperature: 0.72,
    });
    return (completion.choices[0]?.message?.content ?? "").trim();
  };

  let text = await callOnce();
  const wordCount = text.trim().split(/\s+/).length;
  console.log(`[Story] ${trackName} first pass: ${wordCount} words`);

  if (wordCount < minWords) {
    console.warn(`[Story] ${trackName} too short (${wordCount} < ${minWords}), retrying...`);
    text = await callOnce();
    const retryCount = text.trim().split(/\s+/).length;
    console.log(`[Story] ${trackName} retry: ${retryCount} words`);
  }

  return text;
}

async function generateStories(
  stopName: string,
  stopType: string,
  destination: string,
  youngestChildAge?: number
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
      max_completion_tokens: 600,
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
    ? `\n\nReal, verified facts about ${stopName} — YOU MUST use these as the foundation of your story:\n${realFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}\n\nDo NOT write generic content that could apply to any place. Every sentence should be specific to ${stopName}.`
    : `\nDraw on your knowledge of ${stopName} to write content that is specific to this place only.`;

  // ── Step 2: Three separate calls in parallel — one track each ─────────────

  // Age-calibrated audience instruction
  const age = youngestChildAge ?? 8;
  const ageInstruction = age <= 6
    ? `AUDIENCE: The youngest child in this family is ${age} years old. Use short sentences, simple everyday vocabulary, and lead with wonder. Explain every unfamiliar concept immediately as if the child has never heard of it. Never assume prior knowledge.`
    : age <= 8
    ? `AUDIENCE: The youngest child in this family is ${age} years old. Mix wonder with mild complexity. One interesting word per paragraph is fine — explain it in the very next sentence. Keep sentences varied but not long.`
    : `AUDIENCE: The youngest child in this family is ${age} years old. Nuanced vocabulary is welcome. Treat them as smart, curious people who can handle real complexity and layered ideas.`;

  const mainPrompt = `Write a narrated audio story for kids visiting ${stopName} (a ${stopType} in ${destination}).
${factsContext}

${ageInstruction}

SPECIFICITY RULE: Every paragraph must contain at least one detail that is specific to ${stopName} only — a real name, date, measurement, person, or event. Zero paragraphs may contain generic tourism language that could describe any similar place.

STRICT LENGTH REQUIREMENT: Write EXACTLY 950 to 1100 words. Count your words before finishing. Do not stop before 950 words. This will be read aloud at 130 words per minute — it must fill 7 to 8 minutes of audio.

Structure:
- Opening (about 150 words): Drop the listener straight into a vivid, specific scene. A striking fact, a real person, or a moment in history — specific to ${stopName} only.
- Middle (about 750 words): Full human narrative. Weave in the real facts. Include at least two genuine surprises. Include who made this, why, what they struggled with, who the key people were. Connect the past to what the child will see with their own eyes today. Let it breathe.
- Close (about 150 words): End with a specific physical challenge the child can do RIGHT NOW — something to touch, find, count, or observe at ${stopName}. This must be a concrete action, not a reflection prompt. ("See if you can find…", "Try counting…", "Put your hand on…")

Return ONLY the story text. No JSON. No labels. No track heading. Just the story.`;

  const quickHitsPrompt = `Write 6 to 8 surprising facts about ${stopName} (a ${stopType} in ${destination}) for kids, as flowing spoken paragraphs.
${factsContext}

${ageInstruction}

SPECIFICITY RULE: Every fact must be specific to ${stopName}. No fact may be the kind of thing that shows up as the first result when you search the place's name online. Aim for "no way!" moments — things that genuinely surprise even adults who know the place.

STRICT LENGTH REQUIREMENT: Write EXACTLY 280 to 350 words. This must fill 2 to 3 minutes of audio at 130 words per minute.

Each fact gets 2 to 4 natural sentences. Write as flowing speech — NOT a list. Each one should connect to something the child can actually see or look for at the stop. Transition naturally between facts.

Return ONLY the text. No JSON. No labels. No track heading. Just the facts.`;

  const historyPrompt = `Write the human story of ${stopName} (a ${stopType} in ${destination}) for kids — focus on a specific person making a specific decision, not a timeline of events.
${factsContext}

${ageInstruction}

PERSON-AND-DECISION RULE: Tell the story through the eyes of a real individual who shaped this place. Name them. Show one moment where their choice changed what ${stopName} became. The child should feel like they're watching it happen — not reading a Wikipedia article. Do not summarise a list of events.

STRICT LENGTH REQUIREMENT: Write EXACTLY 280 to 350 words. This must fill 2 to 3 minutes of audio at 130 words per minute.

End by connecting that person's decision to what the child is standing next to today.

Return ONLY the text. No JSON. No labels. No track heading. Just the story.`;

  try {
    const [mainRaw, quickHitsRaw, historyRaw] = await Promise.all([
      generateTrackText(mainPrompt, 700, "main"),
      generateTrackText(quickHitsPrompt, 220, "quickHits"),
      generateTrackText(historyPrompt, 220, "history"),
    ]);

    for (const [key, val] of [["main", mainRaw], ["quickHits", quickHitsRaw], ["history", historyRaw]] as [string, string][]) {
      if (!val) throw new Error(`Empty response for story track: ${key}`);
      if (isProhibitedStoryContent(val)) {
        console.error(`[generateStories] Prohibited content in "${key}" — discarding`);
        throw new Error(`Prohibited content in story track: ${key}`);
      }
    }

    const mainText      = stripForTTS(mainRaw);
    const quickHitsText = stripForTTS(quickHitsRaw);
    const historyText   = stripForTTS(historyRaw);

    const mainWords = mainText.trim().split(/\s+/).length;
    console.log(`[Story] Final word counts — main: ${mainWords}, quickHits: ${quickHitsText.trim().split(/\s+/).length}, history: ${historyText.trim().split(/\s+/).length}`);

    return {
      main:      { text: mainText,      durationSeconds: estimateDuration(mainText) },
      quickHits: { text: quickHitsText, durationSeconds: estimateDuration(quickHitsText) },
      history:   { text: historyText,   durationSeconds: estimateDuration(historyText) },
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
    const wikipediaTitle = stopName;
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikipediaTitle)}&prop=pageimages&format=json&pithumbsize=800&redirects=1`;
    const res = await fetch(url, { headers: { "User-Agent": "RoamUs/1.0 (family travel app)" } });
    if (res.ok) {
      const data = await res.json() as any;
      const pages = data?.query?.pages ?? {};
      const page = Object.values(pages)[0] as any;
      const imageUrl = page?.thumbnail?.source as string | undefined;
      console.log('WIKI_IMAGE_DEBUG', {
        stopName,
        requestedTitle: wikipediaTitle,
        returnedUrl: imageUrl ?? 'NO_IMAGE_RETURNED'
      });
      if (imageUrl) return imageUrl;
    }
  } catch (err) {
    console.error("Stop hero image (Wikipedia) failed:", err);
  }
  return undefined;
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function getFallbackData(stopName: string, stopType: string, destination: string): ExploreData {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + " " + (destination || ""))}`;

  const mainText = `There is a reason people travel from all over the world to stand where you are about to stand. ${stopName} is one of those places that looks one way in photographs and feels completely different in person. The scale of it, the details up close, the sounds and the light — none of that comes through in a picture.

Before you get there, here is something worth knowing. Places like this one were not built overnight, and they were not built easily. Someone had a vision, fought to make it happen, and convinced others it was worth the effort. That human story is written into every part of the place, even if most visitors never stop to think about it.

As you explore, resist the urge to rush through. The things that most people miss are usually right in front of them — in the materials, the proportions, the small decisions that add up to something remarkable. Look at how things are put together. Look at what is worn smooth from a century of hands touching it. Look up when everyone else is looking straight ahead.

And if you get the chance, find someone who works there and ask them what their favourite detail is. The people who spend their days in a place like this always know something that is not in any guidebook.

Here is your question to carry with you: what is the one thing about ${stopName} that you would want to tell someone who had never heard of it?`;

  const quickHitsText = `${stopName} draws visitors from dozens of countries every year, but most of them only see a fraction of what is actually there. The parts that take a little extra attention are often the most interesting.

The materials used to build and maintain a place like this tell their own story. Stone, metal, glass, and wood all age differently, and if you look closely at different surfaces, you can often see exactly where and when different parts were added or repaired.

Sound behaves in surprising ways in large structures. Some areas were designed specifically to carry a voice or music across a wide space. Others create pockets of unexpected quiet. Pay attention to how the acoustic character of the space changes as you move through it.

Every place like this has been photographed millions of times, but photographs almost always miss the sense of scale. Until you are standing next to the real thing, it is nearly impossible to understand how large, or sometimes how small, it actually is.

The people who maintain a place like this work mostly invisibly. The cleaning, the repairs, the climate control, the security — it is a continuous effort that most visitors never think about. What you are seeing today exists because of work that happened last night.`;

  const historyText = `The story of ${stopName} begins with a decision — someone looked at a piece of land, or a problem that needed solving, and said: this is where it should go, and this is what it should be.

That decision was almost certainly harder to make than it looks in hindsight. Resources had to be gathered. People had to be convinced. Plans that seemed sound on paper ran into realities that nobody had anticipated. There were probably moments when the whole thing might have been abandoned.

The version of ${stopName} that exists today is not the first version that was imagined. It is the version that survived compromise, setback, and the long test of time. Every generation since has had to decide whether to maintain it, restore it, or let it decline. The fact that you are visiting it means enough people kept saying yes.

When you stand inside or in front of it, you are standing in a place that outlasted the people who built it, the arguments that surrounded its creation, and several different eras of what people thought was worth caring about. That is not nothing. That is actually remarkable.`;

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
