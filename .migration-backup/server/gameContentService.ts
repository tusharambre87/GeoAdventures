import OpenAI from "openai";
import { db } from "./db";
import { journeyGamePrompts, travelStops } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { GEOQUEST_SAFETY_PROMPT } from "./contentSafety";

const MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface GuessRound { 
  question: string; 
  options: { emoji: string; label: string }[] 
}

export interface ThisOrThatRound { 
  question: string; 
  optionA: { emoji: string; label: string }; 
  optionB: { emoji: string; label: string }; 
  funFact: string 
}

export interface SpotItRound { 
  prompt: string 
}

export interface BuildItRound { 
  prompt: string; 
  options: { emoji: string; label: string }[] 
}

export interface GameContentRounds {
  guess: GuessRound[];
  thisorthat: ThisOrThatRound[];
  spotit: SpotItRound[];
  buildit: BuildItRound[];
  connectionFact?: string;
}

async function generateGamePrompts(
  locationName: string,
  locationType: string,
  gameType: 'guess' | 'thisorthat' | 'spotit' | 'buildit',
  count: number = 5
): Promise<any[]> {
  const prompts: Record<string, string> = {
    guess: `Generate ${count} "Guess Before You See" questions for kids visiting ${locationName} (a ${locationType}).
Each question should be a fun prediction about what they'll find or experience there.
Return JSON array with this format:
[{"question": "...", "options": [{"emoji": "...", "label": "..."},{"emoji": "...", "label": "..."}]}]`,
    
    thisorthat: `Generate ${count} "This or That" comparison questions for kids visiting ${locationName} (a ${locationType}).
Each should compare two things related to the location with a fun fact after they choose.
Return JSON array with this format:
[{"question": "...", "optionA": {"emoji": "...", "label": "..."}, "optionB": {"emoji": "...", "label": "..."}, "funFact": "..."}]`,
    
    spotit: `Generate ${count} "Spot It" observation missions for kids at ${locationName} (a ${locationType}).
Each should be something VERY SPECIFIC to this type of location that kids can actually find:
- For waterfalls: fish in the pool, colorful birds, rainbows in the mist, moss on rocks, butterflies
- For beaches: specific shells, crabs hiding, sea glass, interesting rocks, seaweed types, shore birds
- For volcanoes: black lava rocks, steam vents, plants growing on lava, sulfur yellow deposits
- For national parks: specific animals like nene birds, unique plants, trail markers, wildlife tracks
- For historical sites: carved letters, old artifacts, architectural details, commemorative plaques
- For mountains/observatories: cloud formations, alpine flowers, unusual rock shapes
Make each prompt exciting and achievable - kids should feel like explorers on a treasure hunt!
Return JSON array with this format:
[{"prompt": "When you arrive, try to find/spot a..."}]`,
    
    buildit: `Generate ${count} "Build It" imagination prompts for kids visiting ${locationName} (a ${locationType}).
Each asks them to imagine designing or building something related to the location.
Return JSON array with this format:
[{"prompt": "If you were designing...", "options": [{"emoji": "...", "label": "..."},{"emoji": "...", "label": "..."},{"emoji": "...", "label": "..."},{"emoji": "...", "label": "..."}]}]`
  };

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are creating fun, educational game content for children ages 4-12 visiting travel destinations.
Keep language simple, engaging, and age-appropriate. Use relevant emojis.
Make questions specific to the actual location, not generic.

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: prompts[gameType]
        }
      ],
      max_tokens: 1500,
      temperature: 0.9,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      // Handle various field names OpenAI might use
      const rounds = Array.isArray(parsed) 
        ? parsed 
        : parsed.rounds 
          || parsed.questions 
          || parsed.prompts 
          || parsed.missions 
          || parsed.spotit 
          || parsed.observations 
          || parsed.items
          || [];
      console.log(`[GameContent] Generated ${gameType}: ${rounds.length} items`);
      return rounds.slice(0, count);
    }
  } catch (error) {
    console.error(`Error generating ${gameType} prompts:`, error);
  }
  
  return [];
}

async function getCachedPrompts(
  stopId: string, 
  gameType: string
): Promise<any[]> {
  const cached = await db.select()
    .from(journeyGamePrompts)
    .where(and(
      eq(journeyGamePrompts.stopId, stopId),
      eq(journeyGamePrompts.gameType, gameType)
    ));
  
  return cached.map(c => c.promptData);
}

async function cachePrompts(
  stopId: string,
  gameType: string,
  prompts: any[]
): Promise<void> {
  for (const prompt of prompts) {
    await db.insert(journeyGamePrompts).values({
      stopId,
      gameType,
      promptData: prompt
    });
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getGameContent(
  stopId: string,
  roundsPerGame: number = 3
): Promise<GameContentRounds> {
  const stop = await db.select().from(travelStops).where(eq(travelStops.id, stopId)).limit(1);
  
  if (!stop.length) {
    return getDefaultGameContent();
  }
  
  const { name: locationName, stopType: locationType } = stop[0];
  const gameTypes = ['guess', 'thisorthat', 'spotit', 'buildit'] as const;
  const result: GameContentRounds = {
    guess: [],
    thisorthat: [],
    spotit: [],
    buildit: []
  };
  
  for (const gameType of gameTypes) {
    let prompts = await getCachedPrompts(stopId, gameType);
    
    if (prompts.length < roundsPerGame) {
      const newPrompts = await generateGamePrompts(
        locationName,
        locationType || 'landmark',
        gameType,
        Math.max(5, roundsPerGame * 2)
      );
      
      if (newPrompts.length > 0) {
        await cachePrompts(stopId, gameType, newPrompts);
        prompts = [...prompts, ...newPrompts];
      }
    }
    
    if (prompts.length === 0) {
      const defaults = getDefaultGameContent();
      (result as any)[gameType] = defaults[gameType].slice(0, roundsPerGame);
    } else {
      const shuffled = shuffleArray(prompts);
      (result as any)[gameType] = shuffled.slice(0, roundsPerGame);
    }
  }
  
  result.connectionFact = `${locationName} is a unique place to explore!`;
  
  return result;
}

function getDefaultGameContent(): GameContentRounds {
  return {
    guess: [
      { question: "What do you think you'll see first at this place?", options: [{ emoji: "🌿", label: "Nature" }, { emoji: "🏛️", label: "Buildings" }] },
      { question: "Will you hear birds singing here?", options: [{ emoji: "🐦", label: "Yes!" }, { emoji: "🔇", label: "Probably not" }] },
      { question: "Is this place bigger than your school?", options: [{ emoji: "📏", label: "Much bigger!" }, { emoji: "🏫", label: "About the same" }] }
    ],
    thisorthat: [
      { question: "Would you rather explore...", optionA: { emoji: "🚶", label: "On foot" }, optionB: { emoji: "🚗", label: "By car" }, funFact: "Walking lets you discover hidden treasures cars might miss!" },
      { question: "Would you rather see...", optionA: { emoji: "🌅", label: "Sunrise" }, optionB: { emoji: "🌇", label: "Sunset" }, funFact: "Sunrises and sunsets look different because of how light travels through air!" },
      { question: "Would you rather bring...", optionA: { emoji: "📷", label: "Camera" }, optionB: { emoji: "🎨", label: "Sketchbook" }, funFact: "Both are great ways to remember special moments!" }
    ],
    spotit: [
      { prompt: "Try to find something you've never seen before!" },
      { prompt: "Can you spot an animal or insect?" },
      { prompt: "Look for something in your favorite color!" }
    ],
    buildit: [
      { prompt: "If you were the architect here...", options: [{ emoji: "🌳", label: "More trees" }, { emoji: "🎨", label: "Colorful art" }, { emoji: "🪑", label: "Cozy seats" }, { emoji: "💡", label: "Fun lights" }] },
      { prompt: "Design the perfect rest stop...", options: [{ emoji: "🚽", label: "Clean bathrooms" }, { emoji: "🍦", label: "Ice cream" }, { emoji: "🎮", label: "Games" }, { emoji: "🛝", label: "Playground" }] },
      { prompt: "Build a learning area...", options: [{ emoji: "📚", label: "Book nook" }, { emoji: "🖥️", label: "Touch screens" }, { emoji: "🎭", label: "Dress up" }, { emoji: "🔬", label: "Science station" }] }
    ],
    connectionFact: "Every place has unique geography to explore"
  };
}
