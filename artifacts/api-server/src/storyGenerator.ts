import { storage } from "./storage";
import type { TravelTrip, TravelStop, TravelMoment, WonderResponse, TripStory } from "@workspace/db";
import { GEOQUEST_SAFETY_PROMPT } from "./contentSafety";

let openaiClient: any = null;

async function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    
    if (!apiKey) {
      console.error('[StoryGenerator] No OpenAI API key found. Checked: AI_INTEGRATIONS_OPENAI_API_KEY, OPENAI_API_KEY');
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('[StoryGenerator] Initializing OpenAI client with baseURL:', baseURL ? 'custom' : 'default');
    
    const { default: OpenAI } = await import("openai");
    openaiClient = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
    });
  }
  return openaiClient;
}

interface StoryContext {
  trip: TravelTrip;
  stops: TravelStop[];
  moments: TravelMoment[];
  wonderResponses: WonderResponse[];
  visitedStops: TravelStop[];
  photoUrls: string[];
  geoFacts: string[];
}

interface GeneratedStory {
  title: string;
  storyHtml: string;
  storySummary: string;
  highlights: string[];
  memoryStrength: string;
}

async function gatherStoryContext(tripId: string): Promise<StoryContext | null> {
  const trip = await storage.getTripById(tripId);
  if (!trip) return null;
  
  const stops = await storage.getStopsByTripId(tripId);
  const moments = await storage.getMomentsByTripId(tripId);
  const wonderResponses = await storage.getWonderResponsesByTripId(tripId);
  
  const visitedStops = stops.filter(s => s.isVisited);
  const photoUrls = moments.filter(m => m.photoUrl).map(m => m.photoUrl!);
  
  const geoFacts: string[] = [];
  moments.forEach(m => {
    if (m.geoFact) geoFacts.push(m.geoFact);
  });
  
  return {
    trip,
    stops,
    moments,
    wonderResponses,
    visitedStops,
    photoUrls,
    geoFacts,
  };
}

function buildStoryPrompt(context: StoryContext): string {
  const { trip, visitedStops, moments, wonderResponses, geoFacts } = context;
  
  const travelerNames = Array.isArray(trip.travelerNames) 
    ? (trip.travelerNames as string[]).join(', ')
    : 'the family';
  
  const kidMoments = moments
    .filter(m => m.kidPromptResponse)
    .map(m => `"${m.kidPromptResponse}"`)
    .slice(0, 5)
    .join('\n');
  
  const parentMoments = moments
    .filter(m => m.parentPromptResponse)
    .map(m => `"${m.parentPromptResponse}"`)
    .slice(0, 3)
    .join('\n');
  
  const wonderThoughts = wonderResponses
    .map(w => `"${w.response}"`)
    .slice(0, 5)
    .join('\n');
  
  const placesVisited = visitedStops
    .map(s => s.name)
    .join(', ');
  
  const factsLearned = geoFacts.slice(0, 5).join('\n');
  
  // Build a rich narrative with the family's names
  const travelerList = Array.isArray(trip.travelerNames) ? (trip.travelerNames as string[]) : [];
  const hasKidNames = travelerList.length > 0;
  
  // Gather ALL moments with their details for weaving into the story
  // Join moments with their stop names from visitedStops
  const stopNameMap = new Map(context.stops.map(s => [s.id, s.name]));
  
  const allMomentDetails = moments.map(m => {
    const parts: string[] = [];
    const stopName = m.stopId ? stopNameMap.get(m.stopId) : null;
    if (stopName) parts.push(`At ${stopName}`);
    if (m.kidPromptResponse) parts.push(`Child said: "${m.kidPromptResponse}"`);
    if (m.geoFact) parts.push(`Learned: ${m.geoFact}`);
    return parts.join(' — ');
  }).filter(m => m.length > 0).join('\n');
  
  // All wonder responses with context
  const allWonderDetails = wonderResponses.map(w => {
    return `Wonder question: "${w.promptUsed || 'a wonder'}" → Response: "${w.response}"`;
  }).join('\n');
  
  return `You are a poet of family memories. Your gift is weaving scattered moments into a tapestry of remembrance that makes families weep with joy.

═══════════════════════════════════════
THE JOURNEY
═══════════════════════════════════════
"${trip.name}" to ${trip.destination}
Travelers: ${travelerNames}
Places touched: ${placesVisited || 'sacred ground'}

═══════════════════════════════════════
EVERY PRECIOUS MOMENT (weave ALL of these into the story)
═══════════════════════════════════════
${allMomentDetails || 'Moments too beautiful for words'}

═══════════════════════════════════════
WONDER & DISCOVERY (include these reflections)
═══════════════════════════════════════
${allWonderDetails || 'Eyes opened to new worlds'}

═══════════════════════════════════════
GEOGRAPHY LEARNED
═══════════════════════════════════════
${factsLearned || 'The earth shared its secrets'}

═══════════════════════════════════════
YOUR CRAFT
═══════════════════════════════════════

Write a POETIC remembrance that weaves together EVERY moment listed above into one flowing narrative. This is not a summary—it's a tapestry where each thread matters.

STYLE:
• Poetic and lyrical, like a love letter to this journey
• Weave in EACH moment from the list above—don't skip any
• Use the children's names (${hasKidNames ? travelerList.join(', ') : 'the little ones'}) tenderly
• Quote their exact words naturally: "...and then ${travelerList[0] || 'she'} whispered, '...'"
• Let each place visited feel like a verse in the poem
• Build rhythm: moment flows into moment, discovery into discovery
• End with a line that echoes in the heart

FORMAT:
• 5-7 flowing paragraphs
• Each paragraph should reference 1-2 specific moments
• The story should read like a bedtime poem
• No bullet points or lists—pure flowing prose

AVOID:
• Generic phrases ("had a great time", "made memories")
• Skipping any of the moments provided
• Parent notes or adult commentary—this is the CHILDREN'S story

Respond with JSON:
{
  "title": "Poetic title with emoji",
  "storyHtml": "<p>First verse weaving in the opening moments...</p><p>Second verse with more discoveries...</p><p>Third verse...</p><p>Fourth verse...</p><p>Fifth verse...</p><p>Final verse—the echo that stays...</p>",
  "storySummary": "A poetic line for the preview (max 100 chars)",
  "highlights": ["First treasured moment", "Second treasured moment", "Third treasured moment"]
}`;
}

export async function generateTripStory(tripId: string): Promise<TripStory | null> {
  try {
    const context = await gatherStoryContext(tripId);
    if (!context) {
      console.error('Could not gather story context for trip:', tripId);
      return null;
    }
    
    const engagement = await storage.calculateTripEngagement(tripId);
    const prompt = buildStoryPrompt(context);
    
    const openai = await getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are a poet who transforms family travel moments into treasured verse. 

Your gift: weaving every single moment a family shares with you into one seamless, lyrical narrative. Nothing is forgotten. Each whispered word, each wide-eyed discovery, each place they touched—all become threads in your tapestry.

You write like:
- A love letter from the journey itself
- A bedtime story that makes children see themselves as heroes
- Poetry that flows naturally when read aloud
- Memory made tangible—the kind families frame

You rule: NEVER skip a moment. If they shared it, it matters. Weave it in.

${GEOQUEST_SAFETY_PROMPT}

Always respond with valid JSON.` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.85,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content in OpenAI response');
      return null;
    }
    
    const generated: GeneratedStory = JSON.parse(content);
    
    const existingStory = await storage.getTripStoryByTripId(tripId);
    
    if (existingStory) {
      const updated = await storage.updateTripStory(existingStory.id, {
        title: generated.title,
        storyHtml: generated.storyHtml,
        storySummary: generated.storySummary,
        memoryStrength: engagement.memoryStrength,
        highlights: generated.highlights,
        photoUrls: context.photoUrls,
        geoFactsUsed: context.geoFacts,
      });
      return updated || null;
    }
    
    const story = await storage.createTripStory({
      tripId,
      title: generated.title,
      storyHtml: generated.storyHtml,
      storySummary: generated.storySummary,
      memoryStrength: engagement.memoryStrength,
      highlights: generated.highlights,
      photoUrls: context.photoUrls,
      geoFactsUsed: context.geoFacts,
      generatorVersion: 'v1',
    });

    // Schedule retention emails on first save (fire-and-forget, all paths)
    if (story && context.trip.userId) {
      storage.getUser(context.trip.userId).then(user => {
        if (user?.email && user.emailSubscribed !== false) {
          storage.scheduleStoryEmails(tripId, user.id, user.email)
            .catch(err => console.error('[StoryGenerator] Failed to schedule retention emails:', err));
        }
      }).catch(() => {});
    }

    return story;
  } catch (error: any) {
    console.error('Error generating trip story:', error?.message || error);
    return null;
  }
}

export async function regenerateTripStory(tripId: string): Promise<TripStory | null> {
  return generateTripStory(tripId);
}
