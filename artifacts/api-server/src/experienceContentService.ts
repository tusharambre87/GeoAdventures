import OpenAI from "openai";
import { storage } from "./storage";
import type { InsertExperienceContent, ExperienceContent } from "@workspace/db";
import { GEOQUEST_SAFETY_PROMPT } from "./contentSafety";

const MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface GeneratedExperienceContent {
  foodStory: string;
  foodTags: string[];
  foodMemoryLine: string;
  foodFunFact: string;
  localWords: { word: string; meaning: string; language: string; pronunciation?: string }[];
  soundscapeDescription: string;
  hearWonderPrompt: string;
  hearFunFact: string;
  everydayLifeSnapshot: string;
  everydayLifeTags: string[];
  everydayWonderPrompt: string;
  everydayFunFact: string;
  reflectionTags: string[];
}

export async function generateExperienceContent(
  destinationName: string,
  country?: string
): Promise<GeneratedExperienceContent | null> {
  try {
    const locationContext = country ? `${destinationName}, ${country}` : destinationName;
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a warm, curious travel educator helping children (ages 4-12) fall in love with the world through sensory exploration. Create content that sparks wonder and celebrates cultures without stereotyping. Use simple, vivid language that paints pictures in kids' minds.

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create sensory exploration content for ${locationContext} for children.

Generate JSON with these sections:

1. FOOD & CULTURE - A short story (80-100 words) about a special local dish and why it matters to people there. Include cultural context but keep it fun and accessible. Include a surprising fun fact.

2. LOCAL WORDS - 3 simple, useful words/phrases kids can learn, with their meaning, language, and a simple phonetic pronunciation guide.

3. SOUNDSCAPE - Describe what you'd hear walking through this place (50-60 words) - be specific about unique local sounds. Include a surprising fun fact about sounds or music there.

4. EVERYDAY LIFE - A snapshot (80-100 words) of what life is like for kids there - school, play, family traditions. Include a surprising fun fact.

5. WONDER PROMPTS - Open-ended questions that spark curiosity (not quiz questions).

Return JSON in this exact format:
{
  "foodStory": "story about local food...",
  "foodTags": ["dish1", "dish2", "dish3", "dish4", "dish5"],
  "foodMemoryLine": "I discovered [memorable food experience]!",
  "foodFunFact": "Did you know? [amazing food fact about this place]",
  "localWords": [
    {"word": "greeting", "meaning": "Hello/Hi", "language": "local language", "pronunciation": "phonetic guide"},
    {"word": "thanks", "meaning": "Thank you", "language": "local language", "pronunciation": "phonetic guide"},
    {"word": "fun phrase", "meaning": "meaning", "language": "local language", "pronunciation": "phonetic guide"}
  ],
  "soundscapeDescription": "Vivid audio description of the place...",
  "hearWonderPrompt": "What would you want to hear...?",
  "hearFunFact": "Did you know? [amazing sound/music fact about this place]",
  "everydayLifeSnapshot": "Description of daily life for kids...",
  "everydayLifeTags": ["activity1", "activity2", "activity3", "activity4"],
  "everydayWonderPrompt": "Would you rather... or...?",
  "everydayFunFact": "Did you know? [amazing daily life fact about this place]",
  "reflectionTags": ["theme1", "theme2", "theme3", "theme4", "theme5"]
}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        foodStory: parsed.foodStory || "",
        foodTags: parsed.foodTags || [],
        foodMemoryLine: parsed.foodMemoryLine || "",
        foodFunFact: parsed.foodFunFact || "",
        localWords: parsed.localWords || [],
        soundscapeDescription: parsed.soundscapeDescription || "",
        hearWonderPrompt: parsed.hearWonderPrompt || "",
        hearFunFact: parsed.hearFunFact || "",
        everydayLifeSnapshot: parsed.everydayLifeSnapshot || "",
        everydayLifeTags: parsed.everydayLifeTags || [],
        everydayWonderPrompt: parsed.everydayWonderPrompt || "",
        everydayFunFact: parsed.everydayFunFact || "",
        reflectionTags: parsed.reflectionTags || []
      };
    }
  } catch (error) {
    console.error("Error generating experience content:", error);
  }
  
  return null;
}

function normalizeDestinationName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function getOrGenerateExperienceContent(
  destinationName: string,
  country?: string
): Promise<ExperienceContent | null> {
  const normalizedName = normalizeDestinationName(destinationName);
  const displayName = destinationName.trim();
  
  const existing = await storage.getExperienceContent(normalizedName);
  if (existing) {
    return existing;
  }

  console.log(`[Experience] Generating content for ${destinationName}...`);
  const generated = await generateExperienceContent(destinationName, country);
  
  if (!generated) {
    return null;
  }

  try {
    const contentData: InsertExperienceContent = {
      destinationName: normalizedName,
      country: country || null,
      foodStory: generated.foodStory,
      foodTags: generated.foodTags,
      foodMemoryLine: generated.foodMemoryLine,
      foodFunFact: generated.foodFunFact,
      localWords: JSON.stringify(generated.localWords),
      localWordsPronunciation: JSON.stringify(generated.localWords),
      soundscapeDescription: generated.soundscapeDescription,
      hearWonderPrompt: generated.hearWonderPrompt,
      hearFunFact: generated.hearFunFact,
      everydayLifeSnapshot: generated.everydayLifeSnapshot,
      everydayLifeTags: generated.everydayLifeTags,
      everydayWonderPrompt: generated.everydayWonderPrompt,
      everydayFunFact: generated.everydayFunFact,
      reflectionTags: generated.reflectionTags
    };

    const saved = await storage.createExperienceContent(contentData);
    console.log(`[Experience] Generated and saved content for ${destinationName}`);
    return saved;
  } catch (error) {
    console.error(`Error saving generated content for ${destinationName}:`, error);
    return null;
  }
}
