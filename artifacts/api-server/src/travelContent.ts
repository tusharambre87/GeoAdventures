import OpenAI from "openai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { GEOQUEST_SAFETY_PROMPT, isProhibitedContent } from "./contentSafety";
import { getTopSignalsForCity, formatSignalsForPrompt } from "./familySignals";

const MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Google Cloud TTS client - uses GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_TTS_CREDENTIALS
let ttsClient: TextToSpeechClient | null = null;

function getGoogleTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    // Check if we have inline credentials (JSON string) or file-based credentials
    if (process.env.GOOGLE_CLOUD_TTS_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_TTS_CREDENTIALS);
      ttsClient = new TextToSpeechClient({ credentials });
    } else {
      // Falls back to GOOGLE_APPLICATION_CREDENTIALS file path
      ttsClient = new TextToSpeechClient();
    }
  }
  return ttsClient;
}

export interface LocationFacts {
  facts: string[];
  transcript: string;
}

export interface BonusChapter {
  type: "legend" | "howItsMade" | "history" | "culture" | "geology" | "wildlife";
  title: string;
  content: string;
  icon: string;
}

export interface LocationStory {
  title: string;
  story: string;
  chapters: { title: string; content: string }[];
  bonusChapters?: BonusChapter[];
  duration: string;
}

export interface DontMissThis {
  highlights: string[];
  shortOnTime: string;
}

export interface StoryPack {
  title: string;
  mainStory: string;
  quickHits: string[];
  whoMadeThis: string;
  dontMissThis: DontMissThis;
  curiousQuestion: string;
  duration: string;
}

export interface ParentTip {
  tip: string;
  category: string;
}

export async function generateLocationFacts(
  locationName: string,
  locationType: string,
  destination: string
): Promise<LocationFacts> {
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a fun, educational travel guide for families with children ages 4-12. 
Generate exciting and kid-friendly facts about travel destinations.
Keep facts short, engaging, and easy to understand.
Use simple words and exciting language that makes kids curious!

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Generate 4 fun facts about ${locationName} (a ${locationType} in ${destination}) for kids.

Return JSON in this exact format:
{
  "facts": [
    "fact 1",
    "fact 2", 
    "fact 3",
    "fact 4"
  ],
  "transcript": "A kid-friendly paragraph combining all facts into a story (about 100 words, as if you're talking to children)"
}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const rawFacts = (parsed.facts || []) as string[];
      const safeFacts = rawFacts.filter(fact => !isProhibitedContent(fact));
      const safeTranscript = isProhibitedContent(parsed.transcript || "") ? "" : (parsed.transcript || "");

      return {
        facts: safeFacts,
        transcript: safeTranscript
      };
    }
  } catch (error) {
    console.error("Error generating location facts:", error);
  }

  return {
    facts: [
      `${locationName} is a special place to visit!`,
      `Many families love exploring ${locationType}s like this.`,
      `You might see something amazing here!`,
      `This is a great spot for adventure!`
    ],
    transcript: `Welcome to ${locationName}! This is a wonderful ${locationType} in ${destination}. Many families come here to explore and have fun together. Keep your eyes open for something amazing - you never know what you might discover! This is going to be a great adventure!`
  };
}

export async function generateParentTip(
  locationName: string,
  locationType: string,
  destination: string
): Promise<ParentTip> {
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a helpful travel advisor for parents visiting destinations with young children.
Give practical, location-specific tips based on:
- Weather conditions (rain gear, sun protection)
- Terrain (hiking shoes, bug spray for trails)
- Safety considerations specific to the location
- Things to bring based on the type of place
- Best times to visit with kids
Be specific to THIS location, not generic travel advice.

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Give one specific, practical parent tip for visiting ${locationName} (a ${locationType} in ${destination}) with kids.

Consider:
- If it's a beach: sunscreen, shade, water shoes
- If it's a rainforest/jungle: bug spray, rain jacket, closed-toe shoes
- If it's a mountain: layers, altitude considerations, snacks
- If it's a volcano: sturdy shoes, water, sun protection
- If it's a city: comfortable walking shoes, snacks, bathroom locations

Return JSON in this exact format:
{
  "tip": "Your specific tip here (1-2 sentences)",
  "category": "weather|gear|safety|timing|food"
}`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        tip: parsed.tip || "Bring water and snacks for the kids!",
        category: parsed.category || "gear"
      };
    }
  } catch (error) {
    console.error("Error generating parent tip:", error);
  }

  const fallbackTips: Record<string, ParentTip> = {
    beach: { tip: "Don't forget reef-safe sunscreen and water shoes for hot sand!", category: "gear" },
    nature: { tip: "Pack bug spray and wear closed-toe shoes for hiking trails.", category: "gear" },
    volcano: { tip: "Bring sturdy shoes, lots of water, and sun protection - the lava fields can get very hot!", category: "gear" },
    city: { tip: "Locate the nearest restrooms before starting your exploration - kids always need them!", category: "safety" },
    mountain: { tip: "Bring layers! Mountain weather changes quickly and it's cooler at higher elevations.", category: "weather" },
    waterfall: { tip: "The paths near waterfalls can be slippery - hold hands with little ones!", category: "safety" }
  };

  return fallbackTips[locationType] || { tip: "Bring water, snacks, and comfortable shoes for exploring!", category: "gear" };
}

function getBonusChapterTypes(locationType: string): string[] {
  const typeMap: Record<string, string[]> = {
    volcano: ["geology", "legend", "history"],
    waterfall: ["legend", "geology", "culture"],
    beach: ["wildlife", "culture", "history"],
    nature: ["wildlife", "culture", "geology"],
    mountain: ["geology", "legend", "history"],
    farm: ["howItsMade", "culture", "history"],
    food: ["howItsMade", "culture", "history"],
    museum: ["history", "culture"],
    temple: ["culture", "legend", "history"],
    historical: ["history", "legend", "culture"],
    city: ["history", "culture"],
    adventure: ["geology", "wildlife", "history"],
    garden: ["wildlife", "culture", "history"]
  };
  return typeMap[locationType] || ["history", "culture"];
}

export async function generateLocationStory(
  locationName: string,
  locationType: string,
  destination: string,
  explorerAge?: string
): Promise<LocationStory> {
  const ageContext = explorerAge === "4-6" 
    ? "Use very simple words and short sentences. Make it magical and wonder-filled."
    : explorerAge === "7-9"
    ? "Use engaging vocabulary with some new words explained. Include fun facts and adventure elements."
    : "Use richer vocabulary and include more historical/scientific details. Make it intellectually engaging.";

  const bonusTypes = getBonusChapterTypes(locationType);
  const bonusChapterInstructions = `
Also create 3-4 bonus chapters based on these relevant types for this ${locationType}: ${bonusTypes.join(", ")}.
Bonus chapter types and their icons:
- "legend": Local myths, folklore, or stories passed down (icon: "📜")
- "howItsMade": Process explanations like chocolate making, coffee growing (icon: "🔧")
- "history": Historical events, how places got their names, old photographs context (icon: "📚")
- "culture": Cultural traditions, Hawaiian words and meanings, customs (icon: "🌺")
- "geology": How the land formed, volcanic activity, rock formations (icon: "🌋")
- "wildlife": Animals, plants, marine life unique to this place (icon: "🦎")

Each bonus chapter should be 250-400 words, like a mini podcast episode exploring a topic in depth.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a warm, calm storyteller — like a favorite uncle or aunt sharing wonderful tales about the world before bedtime or on a long car ride.
Your audio stories build anticipation and wonder about ${destination}. They are listened to BEFORE arriving — in the car, on the plane, or the night before a visit.

Style Guidelines:
- Write in a gentle, unhurried narrative voice. Let the story breathe with pauses and quiet wonder.
- NEVER use phrases like "when you get there," "once you arrive," "you'll see when you visit" — these feel rushed and break immersion. Instead, draw the listener INTO the story itself:
  "There's a place where the morning light falls just so across old stone walls..."
  "Imagine the sound of footsteps echoing through a hall that's stood for centuries..."
  "Long ago, in this very city, something remarkable happened..."
  "The air here carries a smell you won't find anywhere else in the world..."
  "People who know this place well say that if you listen closely..."
- Tell stories ABOUT the place — its history, legends, secrets, and magic — rather than giving instructions about what to do there
- Weave real history, legends, and local culture into a narrative that unfolds like a storybook
- Use narrator cues in brackets: [pause], [gentle voice], [whisper], [mysterious tone], [warm voice], [slowly]
- Add atmospheric sound cues: [sound: gentle music], [sound: distant bells], [sound: soft wind]
- ${ageContext}
- Make children feel like they're learning a wonderful secret about the world
- Each chapter should end with a gentle hook that makes them eager to hear more

${GEOQUEST_SAFETY_PROMPT}

Create 4-5 story chapters totaling 1400-1800 words (about 8-10 minutes when read aloud).
Each chapter should be 280-360 words with its own narrative arc and ending hook.
${bonusChapterInstructions}`
        },
        {
          role: "user",
          content: `Create a storytelling audio adventure about ${locationName} (a ${locationType} in ${destination}).
This story will be listened to before visiting — building excitement and wonder about the place.

Structure your story as a gentle, unfolding narrative:
1. Chapter 1 - "The Story Begins": Set the scene with atmosphere and history — paint a picture of this place through storytelling, not instructions. What makes it remarkable? What happened here long ago? (280-360 words)
2. Chapter 2 - "Hidden Wonders": Share fascinating secrets and surprising facts woven into a narrative — things most people walk right past without knowing (280-360 words)
3. Chapter 3 - "Legends & Mysteries": Local myths, folklore, or mysterious stories connected to this place — told as a storyteller would share them around a campfire (280-360 words)
4. Chapter 4 - "The Explorer's Eye": Teach the listener what to notice and appreciate — details that make this place special, told through the lens of curiosity rather than as a checklist (280-360 words)
5. Chapter 5 - "A Place Worth Knowing": Reflect on why this place matters, what it teaches us about the world, and leave the listener with a sense of wonder (280-360 words)

Each chapter should:
- Have its own mini story arc with a gentle hook at the end
- Include [narrator cues] for pacing and emotional delivery
- Focus on storytelling about the place rather than directing the listener to do things
- Total target: 1400-1800 words across all chapters (8-10 minutes)

Return JSON in this exact format:
{
  "title": "An engaging episode title with emoji",
  "story": "The complete combined story text from all chapters",
  "chapters": [
    {"title": "The Story Begins", "content": "Chapter 1 content (280-360 words)..."},
    {"title": "Hidden Wonders", "content": "Chapter 2 content (280-360 words)..."},
    {"title": "Legends & Mysteries", "content": "Chapter 3 content (280-360 words)..."},
    {"title": "The Explorer's Eye", "content": "Chapter 4 content (280-360 words)..."},
    {"title": "A Place Worth Knowing", "content": "Chapter 5 content (280-360 words)..."}
  ],
  "bonusChapters": [
    {"type": "legend", "title": "The Legend of...", "content": "Bonus content (250-400 words)...", "icon": "📜"},
    {"type": "history", "title": "Why It's Called...", "content": "Historical explanation (250-400 words)...", "icon": "📚"},
    {"type": "wildlife", "title": "Creatures of...", "content": "Wildlife info (250-400 words)...", "icon": "🦎"}
  ],
  "duration": "~9 minutes"
}`
        }
      ],
      max_tokens: 5000,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      
      // Post-generation safety filter
      const safeTitle = isProhibitedContent(parsed.title || "") ? `Discovering ${locationName}` : (parsed.title || `The Story of ${locationName}`);
      const safeStory = isProhibitedContent(parsed.story || "") ? "" : (parsed.story || "");
      
      const safeChapters = (parsed.chapters || []).filter((ch: any) => {
        return !isProhibitedContent(ch.title || "") && !isProhibitedContent(ch.content || "");
      });
      
      const safeBonusChapters = (parsed.bonusChapters || []).filter((ch: any) => {
        return !isProhibitedContent(ch.title || "") && !isProhibitedContent(ch.content || "");
      });

      return {
        title: safeTitle,
        story: safeStory,
        chapters: safeChapters,
        bonusChapters: safeBonusChapters,
        duration: parsed.duration || "~7 minutes"
      };
    }
  } catch (error) {
    console.error("Error generating location story:", error);
  }

  return {
    title: `🌟 Discovering ${locationName}`,
    story: `[Warm voice] Hey there, young explorer! Are you ready for an amazing adventure? Today, we're going to discover the incredible secrets of ${locationName}. [pause] Get comfortable, maybe look out the window as we travel, and let me take you on a journey you'll never forget...`,
    chapters: [
      { title: "Welcome, Explorer!", content: `[Warm voice] Hey there, young explorer! [pause] Are you ready for an amazing adventure? Today, we're going to discover the incredible secrets of ${locationName}. Get comfortable, maybe look out the window as we travel, and let me take you on a journey you'll never forget. This place has been waiting for YOU to discover it!` },
      { title: "The Discovery", content: `[Excited voice] Now, let me tell you something amazing about ${locationName}! This isn't just any ordinary place - it's a location full of wonder and mystery. Look around you - can you spot something special? Every corner here has a story to tell, and I'm going to share some of the most incredible ones with you.` },
      { title: "Secrets & Legends", content: `[Mysterious tone] Now here's where things get really interesting... [whisper] This place has secrets. Stories that have been passed down for generations. Are you ready to hear them? [pause] Legend has it that ${locationName} has been a special place for hundreds of years...` },
      { title: "Adventure Time", content: `[Excited voice] Alright explorer, it's time for YOUR adventure! As you explore ${locationName}, I want you to keep your eyes peeled for something special. Can you find it? Maybe look for unusual colors, interesting shapes, or something that catches your eye. When you find it, remember it - it's your special discovery!` },
      { title: "Until Next Time", content: `[Warm voice] What an incredible journey we've had together, explorer! [pause] ${locationName} is now part of YOUR story. The things you've seen, the secrets you've learned, the discoveries you've made - they're all treasures you'll carry with you forever. Until our next adventure... keep exploring, keep wondering, and keep being amazing!` }
    ],
    bonusChapters: [],
    duration: "~9 minutes"
  };
}

export async function generateStoryPack(
  locationName: string,
  locationType: string,
  destination: string
): Promise<StoryPack> {
  // Step 1: Small GPT-4o-mini call to gather 3-5 real facts about this specific place
  let realFacts: string[] = [];
  try {
    const factsCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable travel researcher. Provide specific, real, factual information about places — actual exhibits, features, historical facts, or notable elements that a visitor would encounter. Be specific and accurate, not generic.`
        },
        {
          role: "user",
          content: `Give me 3-5 real, specific facts about ${locationName} (a ${locationType} in ${destination}) that a visiting family would actually encounter. Focus on: specific exhibits or features, real historical facts, notable elements, or physical things they will see. Avoid generic or vague descriptions.

Return JSON:
{
  "facts": ["specific fact 1", "specific fact 2", "specific fact 3", "specific fact 4"]
}`
        }
      ],
      max_tokens: 400,
      temperature: 0.4,
      response_format: { type: "json_object" }
    });
    const factsContent = factsCompletion.choices[0]?.message?.content;
    if (factsContent) {
      const parsed = JSON.parse(factsContent);
      realFacts = (parsed.facts || []).filter((f: string) => !isProhibitedContent(f)).slice(0, 5);
    }
  } catch (err) {
    console.error("[generateStoryPack] Step 1 facts gathering failed:", err);
  }

  const factsContext = realFacts.length > 0
    ? `\n\nReal facts about this specific place:\n${realFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
    : "";

  // Step 2: Full GPT-4o call using those facts to produce the structured Story Pack
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are creating a real-world audio experience for kids (age 5–14) visiting a physical place during travel.

This is NOT a generic story. This is a "pre-exploration curiosity experience" that helps kids understand and get excited about what they are about to see in the real world.

Your job is to:
- build curiosity BEFORE arrival
- make the real-world experience more meaningful
- help the child notice things once they are there

GLOBAL RULES:
- DO NOT invent fictional stories or fantasy narratives
- DO NOT use repetitive phrases like "imagine this" excessively
- DO NOT sound like a teacher or textbook
- DO NOT overload with information
- EVERYTHING must connect to the real-world experience
- Keep language simple but NOT childish
- Respect both younger (5–8) and older (9–14) listeners
- The experience should feel like a smart, friendly guide speaking naturally

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create a Story Pack for kids visiting ${locationName} (a ${locationType} in ${destination}).${factsContext}

Create the following 5 sections:

1. MAIN STORY (3–5 minutes): Build curiosity and anticipation. Structure in layers:
   - First 60–90 seconds: simple, visual, engaging (ages 5–8)
   - Middle section: adds explanation and context (ages 8–12)
   - Final section: deeper or surprising idea (ages 10–14)
   Include a curiosity hook every 30–45 seconds. End with ONE curiosity-driving question.
   Must connect to real things they will SEE at the location.

2. QUICK HITS (3–5 facts): Short, surprising, visual facts. Each 1–2 lines max. Must be "wait… what?" moments. Must connect to things they can see.

3. WHO MADE THIS & WHY (1–2 minutes): Focus on people, effort, discovery, or a problem that needed solving. At least one human struggle or interesting discovery. Engaging and human, not academic.

4. DON'T MISS THIS (text only): 2–4 must-see highlights with simple recognizable names. Include a "If you're short on time → do this" shortcut.

5. CURIOUS QUESTION: One simple thought-provoking question the child can think about while exploring.

Return JSON:
{
  "title": "Engaging episode title with emoji",
  "mainStory": "Full main story text with narrator cues [pause], [warm voice] etc (~400-600 words)",
  "quickHits": ["surprising fact 1", "surprising fact 2", "surprising fact 3"],
  "whoMadeThis": "Who Made This & Why text with narrator cues (~200-300 words)",
  "dontMissThis": {
    "highlights": ["Must-see highlight 1", "Must-see highlight 2", "Must-see highlight 3"],
    "shortOnTime": "If you only do 2 things: • [thing 1] • [thing 2] — You're good."
  },
  "curiousQuestion": "One thought-provoking question they can think about while exploring",
  "duration": "~5 minutes"
}`
        }
      ],
      max_tokens: 3500,
      temperature: 0.75,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);

      const safeTitle = isProhibitedContent(parsed.title || "") ? `Story Pack: ${locationName}` : (parsed.title || `Story Pack: ${locationName}`);
      const rawMainStory = parsed.mainStory || parsed.main_story || "";
      const safeMainStory = (!rawMainStory || isProhibitedContent(rawMainStory))
        ? `[Warm voice] Hey explorers! Get ready to discover ${locationName}. [pause] This is a really special place in ${destination} — let's find out what makes it worth seeing...`
        : rawMainStory;
      const rawWhoMadeThis = parsed.whoMadeThis || parsed.who_made_this || "";
      const safeWhoMadeThis = (!rawWhoMadeThis || isProhibitedContent(rawWhoMadeThis))
        ? `[Warm voice] Every great place was made by real people with a vision. ${locationName} exists because someone believed it was worth creating — worth preserving, worth sharing with the world. [pause] Think about what it took to build something like this...`
        : rawWhoMadeThis;
      const safeQuickHits = ((parsed.quickHits || []) as string[]).filter(f => !isProhibitedContent(f));
      const safeCuriousQuestion = isProhibitedContent(parsed.curiousQuestion || "") ? "" : (parsed.curiousQuestion || "");

      const dontMissThis: DontMissThis = {
        highlights: ((parsed.dontMissThis?.highlights || []) as string[]).filter(h => !isProhibitedContent(h)),
        shortOnTime: isProhibitedContent(parsed.dontMissThis?.shortOnTime || "") ? "" : (parsed.dontMissThis?.shortOnTime || "")
      };

      return {
        title: safeTitle,
        mainStory: safeMainStory,
        quickHits: safeQuickHits,
        whoMadeThis: safeWhoMadeThis,
        dontMissThis,
        curiousQuestion: safeCuriousQuestion,
        duration: parsed.duration || "~5 minutes"
      };
    }
  } catch (error) {
    console.error("[generateStoryPack] Step 2 generation failed:", error);
  }

  // Fallback
  return {
    title: `🎧 Story Pack: ${locationName}`,
    mainStory: `[Warm voice] Hey explorers! Get ready to discover ${locationName}. [pause] This is a really special place in ${destination} — let's find out what makes it worth seeing...`,
    quickHits: [`${locationName} is located in ${destination}`, "Keep your eyes open for interesting details!", "Ask a guide or staff member about the history here"],
    whoMadeThis: `[Warm voice] Every great place was made by real people with a vision. ${locationName} exists because someone believed it was worth creating — worth preserving, worth sharing with the world. [pause] Think about what it took to build something like this...`,
    dontMissThis: {
      highlights: ["Explore the main exhibit or feature area", "Find an information board and read one fact", "Take a photo of your favorite thing"],
      shortOnTime: "If you only do 2 things: • See the main highlight • Ask one question — You're good."
    },
    curiousQuestion: `What surprised you most about ${locationName}?`,
    duration: "~5 minutes"
  };
}

function convertToSSML(text: string): string {
  // Voice cue patterns and their prosody settings
  const voiceCues: { pattern: RegExp; prosody: string }[] = [
    { pattern: /\[excited voice\]/gi, prosody: '<prosody rate="105%" pitch="+5%">' },
    { pattern: /\[whisper\]/gi, prosody: '<prosody volume="soft" rate="90%">' },
    { pattern: /\[warm voice\]/gi, prosody: '<prosody pitch="-3%" rate="95%">' },
    { pattern: /\[mysterious tone\]/gi, prosody: '<prosody pitch="-5%" rate="85%">' },
    { pattern: /\[gentle voice\]/gi, prosody: '<prosody volume="soft" pitch="-2%" rate="92%">' },
    { pattern: /\[slowly\]/gi, prosody: '<prosody rate="85%">' },
  ];
  
  let ssml = text.replace(/\bHmm\b/g, '<break time="300ms"/>Hm<break time="400ms"/>');
  ssml = ssml.replace(/\[long pause\]/gi, '<break time="1500ms"/>');
  ssml = ssml.replace(/\[pause\]/gi, '<break time="500ms"/>');
  ssml = ssml.replace(/—/g, '<break time="1100ms"/>');
  ssml = ssml.replace(/…/g, '<break time="300ms"/>');
  ssml = ssml.replace(/\.{3}/g, '<break time="300ms"/>');
  
  // Process text segment by segment to properly pair prosody tags
  // Split by voice cues while keeping the delimiters
  const voiceCuePattern = /(\[(?:excited voice|whisper|warm voice|mysterious tone|gentle voice|slowly)\])/gi;
  const segments = ssml.split(voiceCuePattern);
  
  let result = '';
  let currentProsody: string | null = null;
  
  for (const segment of segments) {
    // Check if this segment is a voice cue
    const matchedCue = voiceCues.find(cue => cue.pattern.test(segment));
    
    if (matchedCue) {
      // Close previous prosody if open
      if (currentProsody) {
        result += '</prosody>';
      }
      // Open new prosody
      result += matchedCue.prosody;
      currentProsody = matchedCue.prosody;
    } else {
      // Regular text segment
      result += segment;
    }
  }
  
  // Close final prosody if still open
  if (currentProsody) {
    result += '</prosody>';
  }
  
  // Remove any remaining bracket tags that weren't matched
  result = result.replace(/\[[^\]]*\]/g, "");
  
  return `<speak>${result}</speak>`;
}

// Voice configuration for Google Cloud TTS
export type NarratorVoice = 'eva' | 'avi';
export const NARRATOR_VOICES: Record<NarratorVoice, string> = {
  eva: 'en-US-Neural2-F', // Female, friendly and expressive
  avi: 'en-US-Neural2-D', // Male, warm and friendly
};

interface VoiceSegment {
  voice: NarratorVoice | 'chorus';
  text: string;
}

interface SfxSegment {
  sfx: string;
}

type AudioSegment = VoiceSegment | SfxSegment;

function isSfxSegment(seg: AudioSegment): seg is SfxSegment {
  return 'sfx' in seg;
}

function parseVoiceSegments(text: string, defaultVoice: NarratorVoice = 'eva'): AudioSegment[] {
  const markerPattern = /\[(GEOBUDDY|ARI|CHORUS|sfx:[a-z0-9_-]+)\]\s*/gi;
  const segments: AudioSegment[] = [];

  const markers: { index: number; type: 'voice' | 'sfx'; voice?: NarratorVoice | 'chorus'; sfxName?: string; end: number }[] = [];
  let match;
  while ((match = markerPattern.exec(text)) !== null) {
    const label = match[1];
    if (label.toLowerCase().startsWith('sfx:')) {
      markers.push({
        index: match.index,
        type: 'sfx',
        sfxName: label.slice(4).toLowerCase(),
        end: match.index + match[0].length,
      });
    } else {
      const upper = label.toUpperCase();
      const voice: NarratorVoice | 'chorus' = upper === 'ARI' ? 'avi' : upper === 'CHORUS' ? 'chorus' : 'eva';
      markers.push({
        index: match.index,
        type: 'voice',
        voice,
        end: match.index + match[0].length,
      });
    }
  }

  if (markers.length === 0) {
    return [{ voice: defaultVoice, text: text.trim() }];
  }

  let currentVoice: NarratorVoice | 'chorus' = defaultVoice;

  if (markers[0].index > 0) {
    const before = text.slice(0, markers[0].index).trim();
    if (before) segments.push({ voice: defaultVoice, text: before });
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];

    if (marker.type === 'sfx') {
      const textBefore = i === 0 ? '' : '';
      segments.push({ sfx: marker.sfxName! });
      const nextStart = marker.end;
      const nextEnd = i + 1 < markers.length ? markers[i + 1].index : text.length;
      const segText = text.slice(nextStart, nextEnd).trim();
      if (segText) {
        segments.push({ voice: currentVoice, text: segText });
      }
    } else {
      currentVoice = marker.voice!;
      const start = marker.end;
      const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
      const segText = text.slice(start, end).trim();
      if (segText) {
        segments.push({ voice: currentVoice, text: segText });
      }
    }
  }

  return segments;
}

const SFX_FILE_MAP: Record<string, string> = {
  'mountain-wind': 'mountain-wind.mp3',
  'broken-compass': 'broken-compass.mp3',
  'compass-spinning': 'compass-spinning.mp3',
  'compass-lock': 'compass-lock-click.mp3',
  'market-ambience': 'market-city-ambience.mp3',
  'desert-wind': 'desert-wind.mp3',
  'jungle': 'jungle-tropical.mp3',
  'ocean': 'ocean-harbor.mp3',
  'temple': 'quiet-temple-garden.mp3',
  'footsteps': 'footsteps-on-path.mp3',
  'intro': 'intro-jingle.mp3',
  'outro': 'outro-jingle.mp3',
  'reveal-sting': 'reveal-sting.mp3',
  'reveal-build': 'reveal-build.mp3',
  'map-sparkle': 'map-sparkle-discovery.mp3',
};

async function loadSfxBuffer(sfxName: string): Promise<Buffer | null> {
  const filename = SFX_FILE_MAP[sfxName];
  if (!filename) {
    console.warn(`🔊 Unknown SFX: ${sfxName}`);
    return null;
  }
  try {
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const sfxPath = join(process.cwd(), 'public', 'audio', filename);
    const buf = await readFile(sfxPath);
    console.log(`🔊 Loaded SFX: ${filename} (${(buf.length / 1024).toFixed(0)}KB)`);
    return buf;
  } catch (e) {
    console.warn(`🔊 Failed to load SFX file: ${filename}`, e);
    return null;
  }
}

async function generateWithOpenAITTS(storyText: string, voice: NarratorVoice = 'eva'): Promise<Buffer | null> {
  try {
    const openaiVoice = voice === 'avi' ? 'onyx' : 'nova';
    const chunks = splitTextIntoChunks(storyText, 4000);
    const audioBuffers: Buffer[] = [];
    console.log(`🎙️ Generating audio with OpenAI TTS (${voice} → ${openaiVoice}), ${chunks.length} chunk(s)`);
    for (const chunk of chunks) {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: openaiVoice,
        input: chunk,
        speed: 0.92,
      });
      const arrayBuffer = await mp3.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }
    if (audioBuffers.length > 0) {
      console.log(`✅ OpenAI TTS audio generated successfully (${audioBuffers.length} chunk(s))`);
      return Buffer.concat(audioBuffers);
    }
    return null;
  } catch (error) {
    console.warn('⚠️ OpenAI TTS fallback failed:', error);
    return null;
  }
}

export async function generateStoryAudio(
  storyText: string,
  voice: NarratorVoice = 'eva'
): Promise<Buffer | null> {
  try {
    const segments = parseVoiceSegments(storyText, voice);
    const hasSfx = segments.some(s => isSfxSegment(s));
    const voiceSegments = segments.filter(s => !isSfxSegment(s)) as VoiceSegment[];
    const hasMultiVoice = voiceSegments.length > 1 || voiceSegments.some(s => s.voice !== voice) || hasSfx;
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    const hasGoogleTTS = !!(process.env.GOOGLE_CLOUD_TTS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (hasMultiVoice) {
      const sfxCount = segments.filter(s => isSfxSegment(s)).length;
      console.log(`🎙️ Multi-voice generation: ${segments.length} segments (${sfxCount} SFX markers stripped, provider: ${hasElevenLabs ? 'ElevenLabs' : hasGoogleTTS ? 'Google Cloud' : 'browser fallback'})`);
      const audioBuffers: Buffer[] = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        if (isSfxSegment(segment)) {
          continue;
        }

        console.log(`🎙️ Segment ${i + 1}/${segments.length}: voice=${segment.voice}, length=${segment.text.length}`);
        if (segment.voice === 'chorus') {
          console.log(`🎙️ Chorus segment: generating with both voices`);
          const generateFn = hasElevenLabs ? generateWithElevenLabs : hasGoogleTTS ? generateWithGoogleTTS : null;
          if (generateFn) {
            const evaBuf = await generateFn(segment.text, 'eva');
            const aviBuf = await generateFn(segment.text, 'avi');
            if (evaBuf) audioBuffers.push(evaBuf);
            if (aviBuf) audioBuffers.push(aviBuf);
          }
        } else {
          let buf: Buffer | null = null;
          if (hasElevenLabs) {
            buf = await generateWithElevenLabs(segment.text, segment.voice as NarratorVoice);
          }
          if (!buf && hasGoogleTTS) {
            console.log(`⚠️ ElevenLabs failed for segment ${i + 1}, trying Google Cloud TTS`);
            buf = await generateWithGoogleTTS(segment.text, segment.voice as NarratorVoice);
          }
          if (!buf) {
            console.log(`⚠️ ElevenLabs/Google failed for segment ${i + 1}, trying OpenAI TTS fallback`);
            buf = await generateWithOpenAITTS(segment.text, segment.voice as NarratorVoice);
          }
          if (buf) audioBuffers.push(buf);
        }
      }
      return audioBuffers.length > 0 ? Buffer.concat(audioBuffers) : null;
    }

    const cleanText = storyText
      .replace(/\[(GEOBUDDY|ARI|CHORUS)\]\s*/gi, '')
      .replace(/\[long pause\]/gi, ' ... ')
      .replace(/\[pause\]/gi, ' ')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (hasElevenLabs) {
      const buf = await generateWithElevenLabs(cleanText, voice);
      if (buf) return buf;
      console.log('⚠️ ElevenLabs failed, trying Google Cloud TTS...');
    }

    if (hasGoogleTTS) {
      const buf = await generateWithGoogleTTS(cleanText, voice);
      if (buf) return buf;
      console.log('⚠️ Google Cloud TTS failed, trying OpenAI TTS fallback...');
    }

    return await generateWithOpenAITTS(cleanText, voice);
  } catch (error) {
    console.error("Error generating story audio:", error);
    return null;
  }
}

function splitTextIntoChunks(text: string, maxBytes: number = 4500): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const combined = current + sentence;
    if (Buffer.byteLength(combined, 'utf8') > maxBytes && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = combined;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function generateWithGoogleTTS(storyText: string, voice: NarratorVoice = 'eva'): Promise<Buffer | null> {
  try {
    const client = getGoogleTTSClient();
    const voiceName = NARRATOR_VOICES[voice] || NARRATOR_VOICES.eva;
    
    console.log(`🎙️ Generating audio with Google Cloud TTS (${voice} - ${voiceName}), text length: ${storyText.length}`);

    const textChunks = splitTextIntoChunks(storyText, 4500);
    const audioBuffers: Buffer[] = [];

    for (const chunk of textChunks) {
      const ssmlText = convertToSSML(chunk);
      
      const [response] = await client.synthesizeSpeech({
        input: { ssml: ssmlText },
        voice: {
          languageCode: "en-US",
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.9,
          pitch: -1,
          effectsProfileId: ["headphone-class-device"],
        },
      });
      
      if (response.audioContent) {
        audioBuffers.push(Buffer.from(response.audioContent as Uint8Array));
      }
    }

    if (audioBuffers.length > 0) {
      console.log(`✅ Google Cloud TTS audio generated successfully (${audioBuffers.length} chunks)`);
      return Buffer.concat(audioBuffers);
    }
    return null;
  } catch (error) {
    console.warn("⚠️ Google Cloud TTS failed:", error);
    return null;
  }
}

async function generateWithElevenLabs(storyText: string, voice: NarratorVoice = 'eva'): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;

  const voiceId = voice === 'avi'
    ? (process.env.ELEVENLABS_ARI_VOICE_ID || '')
    : (process.env.ELEVENLABS_GEOBUDDY_VOICE_ID || '');

  if (!voiceId) {
    console.warn(`⚠️ ElevenLabs voice ID not configured for ${voice}`);
    return null;
  }

  const cleanText = storyText
    .replace(/\[(GEOBUDDY|ARI|CHORUS)\]\s*/gi, '')
    .replace(/\[long pause\]/gi, ' ... ')
    .replace(/\[pause\]/gi, ' ')
    .replace(/\[excited voice\]/gi, '')
    .replace(/\[whisper\]/gi, '')
    .replace(/\[warm voice\]/gi, '')
    .replace(/\[mysterious tone\]/gi, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  console.log(`🎙️ Generating audio with ElevenLabs TTS (${voice} - ${voiceId.slice(0, 8)}...), text length: ${cleanText.length}`);

  try {
    const chunks = splitTextIntoChunks(cleanText, 4500);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: chunk,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error');
        console.warn(`⚠️ ElevenLabs API error (${response.status}): ${errorText.slice(0, 200)}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    if (audioBuffers.length > 0) {
      console.log(`✅ ElevenLabs TTS audio generated successfully (${audioBuffers.length} chunks)`);
      return Buffer.concat(audioBuffers);
    }
    return null;
  } catch (error) {
    console.warn('⚠️ ElevenLabs TTS failed:', error);
    return null;
  }
}

export interface GeneratedStopMission {
  type: "knowledge" | "observation" | "photo";
  question: string;
  options?: string[];
  correctOption?: number;
}

export interface GeneratedStop {
  name: string;
  stopType: string;
  displayOrder: number;
  address?: string;
  description: string;
  latitude?: string;
  longitude?: string;
  missionType?: string;
  missionQuestion?: string;
  missionHint?: string;
  missionAnswer?: string;
  missionDifficulty?: string;
  missionKeepsakeReward?: boolean;
  stopMissions?: GeneratedStopMission[];
  // Session-based planning fields
  durationMinutes?: number;
  sessionFit?: "morning" | "afternoon" | "evening" | "flexible";
  durationClass?: "short" | "medium" | "long" | "extra_long";
  anchorScore?: number;   // 1–5: how central/iconic this stop is; 5 = must-protect anchor
  dropPriority?: number; // 1–5: how quickly to remove when day is tight; 5 = drop first
}

export interface MealPreferencesForStops {
  enabled: boolean;
  breakfast: boolean;
  lunch: boolean;
  snacks: boolean;
  dinner: boolean;
  diningStyle: "quick" | "sitdown" | "";
  cuisines: string[];
}

export interface TailoringPreferences {
  kidsEnergy?: string;
  indoorOutdoor?: string;
  budgetLevel?: string;
  gettingAround?: string;
  kidInterests?: string[] | null;
  strollerFriendly?: boolean;
  smartStopDetails?: boolean;
}

export async function generateCityStops(
  city: string,
  state: string | null,
  country: string,
  count: number = 10,
  adventureStyle: string = 'family_explorer',
  mealPreferences?: MealPreferencesForStops,
  fixedAnchors?: { name: string; day: number; time: string | null; durationMinutes: number | null; anchorType: string; flexibility?: string }[],
  tripDays?: number,
  tailoring?: TailoringPreferences,
  ageGroups?: string[]   // e.g. ["6-8", "9-11"] — used to query family signals
): Promise<GeneratedStop[]> {
  const location = state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
  const stopCount = Math.max(3, Math.min(40, count));
  
  const styleHints: Record<string, string> = {
    family_explorer: "a well-rounded mix of attractions that balance education, fun, and discovery",
    nature_expedition: "outdoor and nature-focused experiences — parks, gardens, wildlife, water features, scenic trails",
    history_culture: "historic sites, cultural landmarks, temples, museums, and places that tell the city's story",
    iconic_highlights: "the most famous, must-see spots — the places this destination is known for worldwide",
    foodie_adventure: "food markets, street food, local culinary landmarks, bakeries, and kid-friendly dining experiences",
    city_explorer: "walkable neighborhoods, vibrant streets, plazas, bridges, and the city's urban character",
  };

  const styleHint = styleHints[adventureStyle] || styleHints.family_explorer;

  // Build tailoring instruction from family preferences
  let tailoringInstruction = "";
  if (tailoring) {
    const hints: string[] = [];
    const energyNorm = tailoring.kidsEnergy === "charged" || tailoring.kidsEnergy === "full" ? "high" : tailoring.kidsEnergy;
    if (energyNorm === "high") hints.push("These kids have HIGH energy — prioritize active, physical experiences: climbing, running, play areas, nature trails, splash zones");
    else if (energyNorm === "low") hints.push("These kids prefer a relaxed pace — focus on calm, sensory-friendly stops with plenty of rest time and shorter walks");
    const indoorNorm = tailoring.indoorOutdoor === "indoors" || tailoring.indoorOutdoor === "indoor" ? "indoor"
      : tailoring.indoorOutdoor === "outdoors" || tailoring.indoorOutdoor === "outdoor" ? "outdoor" : tailoring.indoorOutdoor;
    if (indoorNorm === "indoor") hints.push("STRONGLY PREFER indoor venues: museums, aquariums, indoor playgrounds, galleries — minimize outdoor time");
    else if (indoorNorm === "outdoor") hints.push("STRONGLY PREFER outdoor venues: parks, nature, trails, plazas, gardens — avoid indoor-only venues");
    if (tailoring.budgetLevel === "budget") hints.push("BUDGET-CONSCIOUS family: prioritize free or low-cost attractions, public parks, free museums, and walking neighbourhoods over paid admissions");
    else if (tailoring.budgetLevel === "splurge") hints.push("PREMIUM experience: include top-tier ticketed attractions, iconic paid experiences, premium dining locations");
    if (tailoring.gettingAround === "walking") hints.push("WALKING family — all stops must be walkable from each other, no vehicles. Keep the route geographically compact");
    else if (tailoring.gettingAround === "transit") hints.push("Using PUBLIC TRANSIT — connect stops logically along transit lines, note transit-accessible venues");
    else if (tailoring.gettingAround === "car") hints.push("Travelling by CAR — stops can be spread out geographically, include drive-to attractions and parking-friendly venues");
    if (tailoring.kidInterests && tailoring.kidInterests.length > 0) hints.push(`SPECIFIC KID INTERESTS to prioritise: ${tailoring.kidInterests.join(", ")} — weave these themes into at least 40% of your suggestions`);
    if (tailoring.strollerFriendly) hints.push("STROLLER-FRIENDLY trip — all stops must be stroller-accessible, prioritise flat terrain, ramps, and lift access");
    if (hints.length > 0) {
      tailoringInstruction = `\n\nFAMILY TAILORING (apply these constraints throughout the entire plan):\n${hints.map(h => `- ${h}`).join("\n")}`;
    }
  }

  // Build fixed anchor constraint section for the AI prompt — session-aware
  let anchorInstruction = "";
  if (fixedAnchors && fixedAnchors.length > 0) {
    // Session boundary constants (minutes from midnight)
    const M_START = 9 * 60 + 30;   // 9:30 AM = 570
    const M_END   = 12 * 60 + 30;  // 12:30 PM = 750
    const A_START = 13 * 60 + 30;  // 1:30 PM = 810
    const A_END   = 16 * 60 + 30;  // 4:30 PM = 990
    const E_START = 17 * 60;       // 5:00 PM = 1020
    const E_END   = 19 * 60;       // 7:00 PM = 1140
    const TRAVEL  = 40;            // travel + family buffer in minutes

    function parseTimeMins(t: string): number {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    function fmtMins(totalMinutes: number): string {
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const ap = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${m.toString().padStart(2, "0")} ${ap}`;
    }

    // Group anchors by day
    const byDay = new Map<number, typeof fixedAnchors>();
    for (const a of fixedAnchors) {
      if (!byDay.has(a.day)) byDay.set(a.day, []);
      byDay.get(a.day)!.push(a);
    }

    let anchorListBlock = "";
    let sessionBlock = "";

    for (const [day, dayAnchors] of Array.from(byDay.entries()).sort((a, b) => a[0] - b[0])) {
      for (const a of dayAnchors) {
        const isHard = (a.flexibility || "hard") !== "soft";
        const flexLabel = isHard ? "FIXED — non-negotiable time, keep all other stops away from this slot" : "FLEXIBLE — aim for this time, can shift ±30-60 min if needed";
        const timeStr = a.time ? ` at ${a.time}` : "";
        const durStr  = a.durationMinutes ? ` (~${a.durationMinutes} min)` : "";
        anchorListBlock += `  - Day ${day}: "${a.name}"${timeStr}${durStr} [${a.anchorType}] [${flexLabel}]\n`;

        if (a.time) {
          const tMins  = parseTimeMins(a.time);
          const dur    = a.durationMinutes || 90;
          const endMin = tMins + dur;

          // Calculate available minutes in each session after accounting for this anchor
          let morningFree   = M_END - M_START;   // 180 min default
          let afternoonFree = A_END - A_START;    // 180 min default
          let eveningFree   = E_END - E_START;    // 120 min default

          if (tMins >= M_START && tMins < M_END) {
            // Anchor starts in morning: morning = time before anchor (minus buffer)
            morningFree   = Math.max(0, tMins - TRAVEL - M_START);
            // Anchor may spill into afternoon
            const afStart = Math.max(A_START, endMin + TRAVEL);
            afternoonFree = Math.max(0, A_END - afStart);
          } else if (tMins >= M_END && tMins < A_END) {
            // Anchor starts in afternoon
            afternoonFree = Math.max(0, tMins - TRAVEL - A_START);
            // May spill into evening
            const evStart = Math.max(E_START, endMin + TRAVEL);
            eveningFree   = Math.max(0, E_END - evStart);
          } else if (tMins >= A_END) {
            // Anchor starts in evening or later
            eveningFree = Math.max(0, tMins - TRAVEL - E_START);
          } else if (tMins < M_START) {
            // Anchor before 9:30 AM (e.g. hotel check-in) — barely affects the day
            morningFree = Math.max(0, M_END - Math.max(M_START, endMin + TRAVEL));
          }

          const freeLabel = (mins: number): string => {
            if (mins <= 0) return "FULLY BLOCKED — do not add any stops in this session";
            if (mins <= 60) return `${mins} min free — fit at most 1 SHORT stop (30-45 min)`;
            if (mins <= 120) return `${mins} min free — fit 1 MEDIUM stop (60-90 min) or 2 short stops`;
            return `${mins} min free — ${Math.floor(mins / 90)} full stops can fit`;
          };

          sessionBlock += `\n  Day ${day} session map (after "${a.name}" ${a.time}–${fmtMins(endMin)}):\n`;
          sessionBlock += `    Morning   (9:30–12:30): ${freeLabel(morningFree)}\n`;
          sessionBlock += `    Afternoon (1:30–4:30):  ${freeLabel(afternoonFree)}\n`;
          sessionBlock += `    Evening   (5:00–7:00):  ${freeLabel(eveningFree)}\n`;

          // Pace-specific stop count guidance
          const paceHint = adventureStyle?.toLowerCase().includes("chill") || adventureStyle?.toLowerCase().includes("relax")
            ? "relaxed"
            : adventureStyle?.toLowerCase().includes("pack") || adventureStyle?.toLowerCase().includes("busy")
              ? "packed"
              : "balanced";

          const totalFree = morningFree + afternoonFree + eveningFree;
          let paceGuide = "";
          if (paceHint === "relaxed") {
            paceGuide = totalFree <= 90
              ? "Relaxed pace: day is almost full with the anchor — add at most 1 very short filler stop if any session has 45+ min"
              : `Relaxed pace: use the largest free session for 1 meaningful stop. Leave the other sessions intentionally open — breathing room is the goal.`;
          } else if (paceHint === "packed") {
            paceGuide = `Packed pace: use ALL free sessions, 1 main stop per free session. Only add a 2nd stop in a session if it is geographically adjacent and genuinely short (≤45 min). Total across the day: ${Math.max(1, Math.floor(totalFree / 90))}–${Math.min(4, Math.ceil(totalFree / 70))} stops.`;
          } else {
            paceGuide = `Balanced pace: use 2 of the 3 free sessions. Prefer 1 medium stop per free session. Do not add stops to BLOCKED sessions. Target ${Math.max(1, Math.floor(totalFree / 100))}–${Math.min(3, Math.ceil(totalFree / 80))} stops for the day.`;
          }
          sessionBlock += `    Pace guidance: ${paceGuide}\n`;
        }
      }
    }

    anchorInstruction = `\n\nFAMILY'S EXISTING PLANS — build the day AROUND these:\n${anchorListBlock}\nCRITICAL RULES:\n- NEVER output any of the named plans above as a generated stop — they are already locked in.\n- For FIXED anchors: keep all other stops well clear of that time window. Morning stops must END at least 40 min before a fixed anchor. Afternoon stops must START at least 40 min after a fixed anchor ends.\n- For FLEXIBLE anchors: aim for the stated time but if it improves the day flow you may shift ±30-60 min.\n- Give each stop you generate on an anchor day dropPriority 1 — the family's existing plans take priority and nothing should feel rushed.\n- ONLY add stops in sessions where there is meaningful free time (40+ min). Do not add stops to fully blocked sessions.\n\nSESSION AVAILABILITY FOR ANCHOR DAYS:${sessionBlock}`;
  }

  let mealInstruction = "";
  if (mealPreferences?.enabled) {
    const activeMeals: string[] = [];
    if (mealPreferences.breakfast) activeMeals.push("breakfast");
    if (mealPreferences.lunch) activeMeals.push("lunch");
    if (mealPreferences.snacks) activeMeals.push("snacks");
    if (mealPreferences.dinner) activeMeals.push("dinner");
    if (activeMeals.length > 0) {
      const styleNote = mealPreferences.diningStyle === "quick"
        ? "quick-service / takeaway"
        : mealPreferences.diningStyle === "sitdown"
          ? "sit-down restaurants"
          : "a mix of quick and sit-down";
      const cuisineNote = mealPreferences.cuisines.length > 0
        ? ` — prefer ${mealPreferences.cuisines.map(c => c.replace(/^[^\s]+\s/, "").trim()).join(", ")} options`
        : "";
      mealInstruction = `\nMEAL STOPS: Include dedicated ${styleNote} meal stops for ${activeMeals.join(", ")}${cuisineNote}. Slot them at natural break points in the day. Use stopType "restaurant" or "street_food" for these and make their names real, specific kid-friendly dining spots in ${location}.`;
    }
  }
  
  // Build trip duration context for the AI
  const stopsPerDay = Math.round(stopCount / (tripDays || 1));
  const tripDurationInstruction = tripDays && tripDays > 1
    ? `\n\nTRIP DURATION: This is a ${tripDays}-day family trip, approximately ${stopsPerDay} stops per day. CRITICAL ORDERING RULE: The stops list will be split sequentially into days (stops 1-${stopsPerDay} = Day 1, stops ${stopsPerDay + 1}-${stopsPerDay * 2} = Day 2, etc.). Therefore you MUST interleave heavy and light stops throughout your list — do NOT put all big attractions first. Mix one major/ticketed stop with 2-3 lighter stops per day's block. Ensure each day's block has a natural flow: morning landmark → midday lighter activity → afternoon bigger attraction → evening walk/food.\n\nPROXIMITY CLUSTERING (apply within each day block): Within each day's group of stops, cluster attractions that are geographically close to each other. Stops in the same day should be walkable or a short ride apart — NEVER assign two famous nearby attractions to different days when they could share a day. Order each day's stops geographically so a family walks a logical path (A→B→C→A creates backtracking — avoid this).`
    : "";

  // ── Family signals: query knowledge base for this city ──────────────────────
  let signalsInstruction = "";
  try {
    const topSignals = await Promise.race([
      getTopSignalsForCity(city, country, ageGroups, 12),
      new Promise<[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]) as Awaited<ReturnType<typeof getTopSignalsForCity>>;
    if (topSignals.length > 0) {
      signalsInstruction = formatSignalsForPrompt(topSignals, ageGroups);
      console.log(`📊 [FamilySignals] Injecting ${topSignals.length} verified stops for ${city} into prompt`);
    }
  } catch {
    // Non-fatal: signals are an enhancement, not a requirement
  }

  console.log(`🌍 [AI] Generating ${stopCount} stops for: ${location} (style: ${adventureStyle}${tripDays ? `, ${tripDays} days` : ""})`);
  
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a family travel expert helping plan trips for families with children ages 4-12.
You specialize in finding attractions that are educational, fun, and memorable for kids.
Your recommendations must reflect what makes each destination unique and authentic — never produce a generic tourist list that could apply to any city.

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Generate ${stopCount} must-visit spots in ${location} for a family trip with kids.${anchorInstruction}${tripDurationInstruction}${tailoringInstruction}

ADVENTURE STYLE: The family wants ${styleHint}.${mealInstruction}${signalsInstruction}

MUST-SEE LANDMARK (NON-NEGOTIABLE — this is the single most important rule):
The globally iconic landmark that defines ${location} in the world's imagination MUST appear in your list.
When someone anywhere in the world hears "${location}", what single attraction appears in their mind first? That place cannot be missing.
Known examples (if the city matches, these are mandatory):
- Paris → Eiffel Tower | New York City → Statue of Liberty AND Empire State Building
- London → Tower of London or Big Ben / Westminster | Rome → The Colosseum
- Chicago → Cloud Gate (The Bean) at Millennium Park + Shedd Aquarium | Sydney → Sydney Opera House
- Barcelona → Sagrada Família | Tokyo → Senso-ji Temple or Tokyo Skytree
- Washington DC → National Mall (Lincoln Memorial + Smithsonian) | Dubai → Burj Khalifa
- Amsterdam → Rijksmuseum or Anne Frank House | Prague → Prague Castle or Old Town Square
India — mandatory anchors for these cities:
- Delhi → Red Fort AND India Gate | Agra → Taj Mahal (non-negotiable #1 must-see)
- Jaipur → Amber Fort AND Hawa Mahal | Mumbai → Gateway of India AND Marine Drive
- Goa → Baga Beach / Anjuna Beach area AND Se Cathedral | Varanasi → Dashashwamedh Ghat (Ganga Aarti)
- Bangalore / Bengaluru → Bangalore Palace AND Lalbagh Botanical Garden AND Cubbon Park
- Mysore / Mysuru → Mysore Palace (non-negotiable #1) AND Chamundi Hill AND Brindavan Gardens
- Ooty / Ootacamund → Nilgiri Mountain Railway (UNESCO) AND Doddabetta Peak AND Ooty Botanical Gardens
- Kochi → Fort Kochi Chinese Fishing Nets AND St. Francis Church | Munnar → Tea plantations AND Echo Point
- Manali → Hadimba Temple AND Solang Valley | Shimla → Mall Road AND Christ Church | Darjeeling → Tiger Hill AND Tea estates
- Udaipur → City Palace AND Pichola Lake | Jodhpur → Mehrangarh Fort | Jaisalmer → Jaisalmer Fort
- Rishikesh → Laxman Jhula AND Triveni Ghat | Amritsar → Golden Temple (non-negotiable #1)
- Hampi → Virupaksha Temple AND Vittala Temple | Coorg → Abbey Falls AND Raja's Seat
- Hyderabad → Golconda Fort AND Charminar | Kolkata → Victoria Memorial AND Howrah Bridge
- Chennai → Marina Beach AND Kapaleeshwarar Temple | Mahabalipuram → Shore Temple AND Arjuna's Penance
- Madurai → Meenakshi Amman Temple (non-negotiable) | Pondicherry → Promenade Beach AND Auroville
For any other city: always place the #1 global landmark as one of the first two stops.

PROXIMITY CLUSTERING (reduce family travel stress — apply when distributing stops across days):
Group geographically close attractions on the SAME day — never split walking-distance landmarks across different days.
Well-known proximity clusters that MUST stay together on a single day:
- Chicago: Field Museum + Shedd Aquarium + Adler Planetarium (Museum Campus, all within 10 min walk)
- New York: The Met + Central Park + American Museum of Natural History (Upper West Side cluster)
- Paris: Eiffel Tower + Champ de Mars + Trocadéro (same neighbourhood)
- London: Tower of London + Tower Bridge (5 min walk) | Westminster Abbey + Big Ben + St James's Park
- Rome: Colosseum + Roman Forum + Palatine Hill (one complex)
- Washington DC: All Smithsonian museums on the National Mall (same strip)
India proximity clusters:
- Bangalore: Cubbon Park + Lalbagh Botanical Garden (both central, 10 min drive) | Bangalore Palace + Tipu Sultan's Summer Palace (central cluster)
- Mysore: Mysore Palace + Devaraja Market (5 min walk) | Chamundi Hill (standalone, separate day)
- Ooty: Ooty Botanical Gardens + Ooty Lake + Thread Garden (all in town, walkable/10 min) | Doddabetta Peak + Ketti Valley Viewpoint (hill road, same day) | Pykara Falls + Emerald Lake (same route)
- Delhi: Red Fort + Chandni Chowk (5 min walk) | India Gate + Rashtrapati Bhavan + National Museum (central Delhi)
- Jaipur: Amber Fort + Jaigarh Fort (hilltop, same day) | City Palace + Jantar Mantar + Hawa Mahal (all in old city, 15 min walk)
- Mumbai: Gateway of India + Elephanta Caves (ferry, same day) | Juhu Beach + Bandra (western suburbs, same half-day)
Within each day, ORDER stops geographically — walk a logical A→B→C path, not A→C→B which creates backtracking.

SELECTION CRITERIA (apply all four, in any order):
- ICONIC: Include places this destination is specifically famous for — what makes ${location} different from anywhere else.
- LOCAL FLAVOR: Include spots that capture the authentic character of ${location} — local markets, unique neighborhoods, signature experiences.
- FAMILY FIT: Every stop must be enjoyable and safe for children ages 4-12.
- GEOGRAPHIC CONTEXT: If ${location} has distinctive natural features (coast, mountains, volcanoes, rivers), include relevant nature stops.

DIVERSITY RULES:
- Use at least 5 different stopType values across all stops.
- For trips with many stops (10+), you may use up to 4 stops of the same type to ensure full coverage.
- Mix categories naturally — don't cluster similar types together.

QUALITY RULES:
- Every stop MUST be a real, specific, well-known place with its actual name (e.g. "Gateway Arch", "Forest Park", "City Museum").
- NEVER use generic names like "Exploration Site 1", "City Exploration Site", or any placeholder names.
- If you cannot find ${stopCount} real famous places, return fewer stops rather than inventing generic ones.

SESSION-BASED DAY PLANNING (CRITICAL — do not think in stop counts, think in sessions):

A family day has 3 natural sessions. Plan stops to fill sessions, not to hit a number.

Morning session:   9:30 AM – 12:30 PM  (~180 min of visit time)
Afternoon session: 1:30 PM – 4:30 PM   (~180 min of visit time, after lunch break)
Evening session:   5:00 PM – 7:00 PM   (~120 min of visit time)
Day ceiling:       8:00 PM (absolute hard stop — nothing schedules past this)

PACE and session usage:
- chill/relaxed:  use 1–2 sessions. One major stop, or one major + one light stop. Allow one session to be intentionally empty.
- balanced:       use 2–3 sessions. Two solid stops, or one major + one medium + one light.
- packed:         use all 3 sessions. Each session gets 1 main stop. Only add a short "paired" mini-stop if it is geographically adjacent and genuinely short.
  - "packed" does NOT mean 6 equal stops. It means 3 strong sessions with optional pairings.

SESSION FIT RULES — assign sessionFit to each stop:
- morning: iconic anchor, major museum, fort, palace, temple complex, zoo, aquarium, safari, nature reserve (best early when energy is high)
- afternoon: secondary attractions, cultural sites, parks, gardens, boat trips, activity centres
- evening: markets, food streets, river walks, promenades, light shows, aarti, viewpoints at sunset
- flexible: can fit any session (use for stops that work well any time)

DURATION CLASSES — assign durationClass to each stop:
- short      = 30–60 min   (viewpoint, garden walk, photo stop, small temple, market stroll)
- medium     = 60–120 min  (standard museum, palace, cultural centre, park, coastal walk)
- long       = 120–180 min (major fort, large museum, zoo, aquarium, nature reserve, boat day)
- extra_long = 180–240 min (theme park, major safari, film city, multi-complex attraction)

durationMinutes should reflect the duration class:
- short: 30–60
- medium: 60–120
- long: 120–180 (anchor stops DESERVE this — do not cut them down to 120 arbitrarily)
- extra_long: 180–480

ANCHOR PROTECTION — assign anchorScore and dropPriority to each stop:
anchorScore (1–5): how iconic/essential this stop is
- 5 = city-defining, globally iconic (Taj Mahal, Colosseum, major fort, renowned zoo)
- 4 = strong local identity, high kid-engagement (well-known museum, main cultural site)
- 3 = good family stop (standard park, decent market, interesting viewpoint)
- 2 = filler, nice-to-have (repeat viewpoint, secondary temple, generic garden)
- 1 = low value, easily skipped

dropPriority (1–5): how quickly to remove this stop when a day is overloaded
- 1 = never remove (iconic anchor, best kid-engagement stop, strongest local experience)
- 2 = remove only if session is truly full
- 3 = remove if competing with a better stop
- 4 = remove readily (generic filler)
- 5 = remove first (duplicate type, weak local identity)

TEMPLE RULE: generic secondary temples get dropPriority 4–5 unless they are the city's iconic defining temple (e.g., Golden Temple, Meenakshi Temple, Kashi Vishwanath = dropPriority 1).

DROP ORDER when a day is too full:
Remove FIRST: generic temples, duplicate viewpoints, repeat museums, filler parks, low-identity stops
Protect LAST: iconic anchor stop, strongest kid-engagement stop, strongest local-identity stop, best evening experience

COST ACCURACY:
- entryCost: Use REAL pricing where known. Do NOT say "Free" for ticketed attractions. Examples: "~$109/person", "~€26 adult", "~¥7,900/person", "Free". If unknown, say "Check on site".

Available stop types: landmark, museum, nature, beach, park, temple, market, restaurant, viewpoint, zoo, aquarium, garden, plaza, palace, bridge, waterfall, volcano, neighborhood, street_food, street, mountain, food, culture, adventure, city, other

For each stop, generate 3 Explorer Challenge missions:

MISSION 1 - KNOWLEDGE (type: "knowledge", +5 XP):
- A fun trivia question about this specific place
- Must have exactly 4 answer options (options array)
- Exactly ONE option must be correct (correctOption = 0-3 index)
- Should be answerable by kids ages 4-12 who heard facts about the place

MISSION 2 - OBSERVATION (type: "observation", +5 XP):
- Always ask: "What else stood out to you at [place name]?" or a similar open-ended question about what the child noticed
- No options needed — child types or speaks their answer
- Should encourage the child to observe and reflect

MISSION 3 - PHOTO (type: "photo", +10 XP):
- A simple, specific photo challenge related to this stop
- Examples: "Take a picture of the coolest fountain!", "Snap a photo of your favorite sculpture!", "Capture the view from the top!"
- Keep it fun, achievable, and specific to the place
- No options needed — child uploads or takes a photo

Return JSON:
{
  "stops": [
    {
      "name": "Actual Place Name",
      "stopType": "one of the types above",
      "address": "Full address if known",
      "description": "One sentence about why kids will love this",
      "latitude": "Decimal latitude string",
      "longitude": "Decimal longitude string",
      "durationMinutes": 90,
      "sessionFit": "morning",
      "durationClass": "medium",
      "anchorScore": 4,
      "dropPriority": 2,
      "missionType": "knowledge",
      "missionQuestion": "Legacy single mission (keep for backward compatibility)",
      "missionHint": "A helpful hint",
      "missionAnswer": "The answer",
      "missionDifficulty": "normal",
      "stopMissions": [
        {
          "type": "knowledge",
          "question": "Fun trivia question about this place?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctOption": 0
        },
        {
          "type": "observation",
          "question": "What else stood out to you at [Place Name]?"
        },
        {
          "type": "photo",
          "question": "Take a picture of the coolest thing you see here!"
        }
      ]
    }
  ]
}`
        }
      ],
      max_tokens: stopCount > 12 ? 16000 : 8000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const rawStops = parsed.stops || [];
      
      const validStopTypes = ["landmark", "museum", "nature", "beach", "city", "other", "park", "temple", "market", "restaurant", "viewpoint", "zoo", "aquarium", "garden", "plaza", "palace", "bridge", "waterfall", "volcano", "neighborhood", "street_food", "street", "mountain", "food", "culture", "adventure"];
      const validMissionTypes = ["knowledge", "observation", "curiosity"];
      const validDifficulties = ["easy", "normal", "challenge"];
      const difficultyXpMap: Record<string, number> = { easy: 5, normal: 5, challenge: 10 };
      const existingNames = new Set<string>();
      const typeCounts = new Map<string, number>();
      const MAX_PER_TYPE = stopCount > 10 ? 5 : 3; // Allow more per type for longer trips
      const stops: GeneratedStop[] = [];

      for (const item of rawStops) {
        if (item && item.name && !existingNames.has(item.name.toLowerCase())) {
          if (isProhibitedContent(item.name) || isProhibitedContent(item.description || "")) {
            console.log(`🛡️ [Safety] Filtered out prohibited stop: ${item.name}`);
            continue;
          }

          const resolvedType = validStopTypes.includes(item.stopType) ? item.stopType : "landmark";
          const currentCount = typeCounts.get(resolvedType) || 0;
          if (currentCount >= MAX_PER_TYPE) {
            continue;
          }

          existingNames.add(item.name.toLowerCase());
          typeCounts.set(resolvedType, currentCount + 1);
          const missionType = validMissionTypes.includes(item.missionType) ? item.missionType : "curiosity";
          const missionDifficulty = validDifficulties.includes(item.missionDifficulty) ? item.missionDifficulty : "normal";
          const keepsakeChance = stops.length < Math.ceil(stopCount * 0.7);

          let validatedMissions: GeneratedStopMission[] | undefined;
          if (Array.isArray(item.stopMissions) && item.stopMissions.length > 0) {
            validatedMissions = [];
            const validTypes = ["knowledge", "observation", "photo"];
            for (const m of item.stopMissions) {
              if (!m || typeof m.question !== "string") continue;
              const mType = validTypes.includes(m.type) ? m.type as "knowledge" | "observation" | "photo" : undefined;
              if (!mType) continue;
              if (mType === "knowledge") {
                if (Array.isArray(m.options) && m.options.length === 4 && typeof m.correctOption === "number" && m.correctOption >= 0 && m.correctOption <= 3) {
                  validatedMissions.push({ type: "knowledge", question: m.question, options: m.options.map((o: unknown) => String(o)), correctOption: m.correctOption });
                }
              } else {
                validatedMissions.push({ type: mType, question: m.question });
              }
            }
            if (validatedMissions.length === 0) validatedMissions = undefined;
          }

          const validSessionFits = ["morning", "afternoon", "evening", "flexible"] as const;
          const validDurationClasses = ["short", "medium", "long", "extra_long"] as const;
          const stop: GeneratedStop = {
            name: item.name.trim(),
            stopType: resolvedType,
            displayOrder: stops.length,
            address: typeof item.address === "string" ? item.address : undefined,
            description: typeof item.description === "string" ? item.description : "A wonderful place to explore.",
            latitude: item.latitude ? String(item.latitude) : undefined,
            longitude: item.longitude ? String(item.longitude) : undefined,
            missionType,
            missionQuestion: typeof item.missionQuestion === "string" ? item.missionQuestion : undefined,
            missionHint: typeof item.missionHint === "string" ? item.missionHint : undefined,
            missionAnswer: typeof item.missionAnswer === "string" ? item.missionAnswer : undefined,
            missionDifficulty,
            missionKeepsakeReward: keepsakeChance,
            stopMissions: validatedMissions,
            // Session planning fields
            durationMinutes: typeof item.durationMinutes === "number" && item.durationMinutes > 0
              ? Math.min(480, Math.max(15, item.durationMinutes)) : undefined,
            sessionFit: validSessionFits.includes(item.sessionFit) ? item.sessionFit : undefined,
            durationClass: validDurationClasses.includes(item.durationClass) ? item.durationClass : undefined,
            anchorScore: typeof item.anchorScore === "number" ? Math.min(5, Math.max(1, Math.round(item.anchorScore))) : undefined,
            dropPriority: typeof item.dropPriority === "number" ? Math.min(5, Math.max(1, Math.round(item.dropPriority))) : undefined,
          };
          stops.push(stop);
        }
      }

      if (stops.length > 0) {
        console.log(`✅ [AI] Generated ${stops.length} stops for ${location}`);
        return stops.slice(0, stopCount);
      }
    }
  } catch (error) {
    console.error("Error generating city stops:", error);
  }

  console.log(`⚠️ [AI] No stops generated for ${location}, returning empty`);
  return [];
}

export interface GeneratedArtifact {
  stopName: string;
  name: string;
  description: string;
  imageEmoji: string;
  rarity: string;
  unlockType: string;
  unlockConfig?: { question: string; answer: string } | null;
  displayOrder: number;
}

export async function generateArtifactsForStops(
  stops: { name: string; stopType?: string }[],
  cityName: string
): Promise<GeneratedArtifact[]> {
  if (stops.length === 0) return [];

  console.log(`🏆 [AI] Generating keepsakes for ${stops.length} stops in ${cityName}`);

  try {
    const stopList = stops.map(s => `- ${s.name} (${s.stopType || 'landmark'})`).join('\n');

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a creative game designer for a kids' geography app (ages 4-12). You create magical travel keepsakes — collectible items that kids earn when visiting real-world places. Each keepsake must be:
- Uniquely connected to the specific place (not generic)
- Kid-friendly, imaginative, and fun
- Named like a magical artifact a kid would be excited to collect

Examples of great keepsakes:
- "Lava Crystal" (🔮, rare) for Volcanoes National Park — "A magical crystal formed from cooling lava deep inside the volcano!"
- "Honu Charm" (🐢, rare) for Punalu'u Black Sand Beach — "A charm shaped like a sea turtle who loves the black sand beach!"
- "Westward Pioneer Medal" (🏅, rare) for Gateway Arch — "A shiny medal awarded to brave pioneers who passed through the Gateway to the West!"
- "Penguin Feather" (🐧, common) for St. Louis Zoo — "A tiny feather from the famous penguins at the zoo!"

Rarity distribution: ~50% common, ~35% rare, ~15% legendary.
Unlock types: "listen" (earn by listening to the stop's story), "photo" (take a photo), "find_icon" (find a hidden icon), "quiz" (answer a question).
For quiz type, include a simple question and one-word answer appropriate for the place.
${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Generate exactly 1 unique travel keepsake for each of these stops in ${cityName}:

${stopList}

Return JSON in this exact format:
{
  "artifacts": [
    {
      "stopName": "Exact Stop Name",
      "name": "Keepsake Name",
      "description": "One exciting sentence a kid would love, ending with !",
      "imageEmoji": "single emoji",
      "rarity": "common|rare|legendary",
      "unlockType": "listen|photo|find_icon|quiz",
      "unlockConfig": null or {"question": "Simple question?", "answer": "one word answer"}
    }
  ]
}

Return exactly ${stops.length} artifacts, one per stop. Use the exact stop names provided.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const rawArtifacts = parsed.artifacts || [];
      const validRarities = ["common", "rare", "legendary"];
      const validUnlockTypes = ["listen", "photo", "find_icon", "quiz"];

      const artifacts: GeneratedArtifact[] = rawArtifacts
        .filter((a: any) => a && a.stopName && a.name)
        .map((a: any, i: number) => ({
          stopName: a.stopName.trim(),
          name: a.name.trim(),
          description: typeof a.description === "string" ? a.description : `A special keepsake from ${a.stopName}!`,
          imageEmoji: typeof a.imageEmoji === "string" ? a.imageEmoji : "🎁",
          rarity: validRarities.includes(a.rarity) ? a.rarity : "common",
          unlockType: validUnlockTypes.includes(a.unlockType) ? a.unlockType : "listen",
          unlockConfig: a.unlockType === "quiz" && a.unlockConfig ? a.unlockConfig : null,
          displayOrder: i + 1,
        }));

      if (artifacts.length > 0) {
        console.log(`✅ [AI] Generated ${artifacts.length} keepsakes for ${cityName}`);
        return artifacts;
      }
    }
  } catch (error) {
    console.error(`[AI] Error generating keepsakes for ${cityName}:`, error);
  }

  console.log(`⚠️ [AI] Using fallback keepsakes for ${cityName}`);
  const fallbackEmojis = ["🪨", "🗝️", "🌟", "🎭", "🧩", "📜", "🔔", "🏺", "💎", "🪙"];
  return stops.map((s, i) => ({
    stopName: s.name,
    name: `${s.name} Memory Stone`,
    description: `A magical memory stone from ${s.name} that glows when you remember your visit!`,
    imageEmoji: fallbackEmojis[i % fallbackEmojis.length],
    rarity: i === 0 ? "rare" : "common",
    unlockType: "listen",
    unlockConfig: null,
    displayOrder: 1,
  }));
}

export async function generateMissionsForStop(
  stopName: string,
  city: string,
  stopType: string = "landmark"
): Promise<GeneratedStopMission[]> {
  console.log(`🎯 [AI] Generating missions for stop: ${stopName} (${city})`);
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a family travel expert creating fun Explorer Challenges for children ages 4-12 visiting ${city}.\n${GEOQUEST_SAFETY_PROMPT}`,
        },
        {
          role: "user",
          content: `Generate exactly 3 Explorer Challenge missions for the stop: "${stopName}" (type: ${stopType}) in ${city}.

MISSION 1 - KNOWLEDGE (type: "knowledge", +5 XP):
- A fun trivia question specific to this place
- Exactly 4 answer options (options array)
- Exactly ONE correct option (correctOption = 0-3 index)
- Answerable by kids ages 4-12

MISSION 2 - OBSERVATION (type: "observation", +5 XP):
- Ask: "What stood out to you at ${stopName}?" or a similar open-ended reflection
- No options needed

MISSION 3 - PHOTO (type: "photo", +10 XP):
- A simple, fun, specific photo challenge at this stop
- No options needed

Return ONLY valid JSON, no markdown:
{
  "missions": [
    { "type": "knowledge", "question": "...", "options": ["A", "B", "C", "D"], "correctOption": 0 },
    { "type": "observation", "question": "..." },
    { "type": "photo", "question": "..." }
  ]
}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const raw = JSON.parse(completion.choices[0].message.content || "{}");
    const arr = Array.isArray(raw.missions) ? raw.missions : [];
    const validTypes = ["knowledge", "observation", "photo"] as const;
    const result: GeneratedStopMission[] = [];

    for (const m of arr) {
      const mType = validTypes.find(t => t === m.type);
      if (!mType || !m.question) continue;
      if (mType === "knowledge") {
        if (!Array.isArray(m.options) || m.options.length !== 4 || typeof m.correctOption !== "number") continue;
        result.push({ type: "knowledge", question: m.question, options: m.options.map((o: unknown) => String(o)), correctOption: m.correctOption });
      } else {
        result.push({ type: mType, question: m.question });
      }
    }

    if (result.length >= 2) {
      console.log(`✅ [AI] Generated ${result.length} missions for ${stopName}`);
      return result;
    }
  } catch (err) {
    console.error(`[AI] Failed to generate missions for ${stopName}:`, err);
  }

  return [
    { type: "observation", question: `What stood out to you at ${stopName}?` },
    { type: "photo", question: `Take a picture of your favourite thing at ${stopName}!` },
  ];
}
