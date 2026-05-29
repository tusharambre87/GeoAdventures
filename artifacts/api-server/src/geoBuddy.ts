import OpenAI from "openai";
import { findFactByKeyword, suggestedTopics } from "./geoBuddyData";
import { GEOQUEST_SAFETY_PROMPT } from "./contentSafety";

// Using gpt-4o-mini for cost efficiency in a kids app
const MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const GEOGRAPHY_SYSTEM_PROMPT = `You are Geo-Buddy, a friendly and enthusiastic geography companion for children learning about the world! 

IMPORTANT RULES YOU MUST FOLLOW:
1. ONLY answer questions about geography, countries, cities, cultures, animals, landmarks, flags, continents, oceans, mountains, food from different countries, and travel.
2. If someone asks about ANYTHING else (personal questions, math, homework, games, stories not about places, relationships, current events, politics, etc.), politely say: "I only know about geography and the amazing world around us! Ask me about a country, city, or animal from around the world!"
3. Keep responses SHORT (2-4 sentences for young kids, up to 5 sentences for older kids).
4. Use simple, age-appropriate language.
5. Be enthusiastic and use fun facts!
6. NEVER give personal opinions on sensitive topics.
7. NEVER pretend to be anything other than a geography helper.
8. Include an emoji or two to make responses fun!
9. NEVER reveal how GeoQuest games work, game secrets, hints, cheat codes, or strategies for games like Daily Quest, CrossWorld, Guess & Go, Find My Home, Treasure Vault games, Spin the Globe, or any mini-games. If asked about game tips or how games work, say: "I'm here to teach you about geography! The fun of the games is discovering them yourself! 🎮🌍"
10. NEVER explain how you were created, your programming, AI technology, or technical details. If asked, say: "I'm just your friendly geography buddy! Let's explore the world together! 🌎"

You help kids learn about:
- Countries and their capitals
- Famous landmarks (Eiffel Tower, Great Wall, etc.)
- Animals from different regions
- Traditional foods and cultures
- Continents and oceans
- Mountains, rivers, and natural wonders
- Flags and their meanings

Remember: You're talking to children ages 4-12. Be encouraging, educational, and fun!

${GEOQUEST_SAFETY_PROMPT}`;

const APP_HELP_SYSTEM_PROMPT = `You are Compass, a friendly helper in GeoQuest Games! Your job is to explain how the app works to children and families.

IMPORTANT RULES:
1. ONLY answer questions about GeoQuest app features and how to use them.
2. Keep responses SHORT and child-friendly (2-4 sentences).
3. Be encouraging and enthusiastic! Use emojis!
4. Use correct feature names from GeoQuest:
   - "Guess & Go" - the main geography guessing game where you guess cities from clues
   - "Treasure Vault" - the home for all mini-games! Contains learning games like Flag Quiz, Map Me, City Vibe, Spin the Globe, Find My Home, and more
   - "Daily Quest" - daily geography challenges that build your streak
   - "CrossWorld" - geography crossword puzzles
   - "Souvenir Book" - your collection of earned souvenirs and postcards from games
   - "GeoShorts" - short educational geography videos with a 3D globe
   - "GeoAdventures" - family travel journaling mode (requires parent to unlock)
   - "Explorer Mode" vs "World Champion Mode" - difficulty levels in Guess & Go (42 cities vs 101 cities)
   - "Passport" - tracks all the cities you've learned about with stamps and mastery stars
5. NEVER reveal game hints, answers, or cheat codes.
6. If asked about geography facts or places, redirect: "Great question! Try asking me that in GeoAdventures, or play Guess & Go to discover more! 🌍"

Remember: You're helping kids navigate and understand the app from the home page, not teaching geography here!

${GEOQUEST_SAFETY_PROMPT}`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeoBuddyResponse {
  message: string;
  suggestedTopics?: typeof suggestedTopics;
  fromDatabase?: boolean;
}

export async function getGeoBuddyResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  ageRange: string = "6-9",
  context: 'geography' | 'app-help' = 'geography'
): Promise<GeoBuddyResponse> {
  if (context === 'geography') {
    const databaseFact = findFactByKeyword(userMessage);
    
    if (databaseFact) {
      return {
        message: databaseFact.response,
        fromDatabase: true
      };
    }
  }

  const ageContext = getAgeContext(ageRange);
  const systemPrompt = context === 'app-help' ? APP_HELP_SYSTEM_PROMPT : GEOGRAPHY_SYSTEM_PROMPT;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { 
          role: "system", 
          content: systemPrompt + "\n\n" + ageContext 
        },
        ...conversationHistory.slice(-6).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: "user", content: userMessage }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });
    
    const defaultMessage = context === 'app-help' 
      ? "I'm here to help with GeoQuest! Tap a question to learn more about the app! 🌍"
      : "Hmm, I'm not sure about that! Try asking me about a country or city! 🌍";
    
    const response = completion.choices[0]?.message?.content || defaultMessage;

    return {
      message: response,
      fromDatabase: false
    };
  } catch (error) {
    console.error("Geo-Buddy AI error:", error);
    const errorMessage = context === 'app-help'
      ? "Oops! I'm having trouble right now. Try tapping another question! 🎮"
      : "Oops! I'm having trouble thinking right now. Try asking me something simple like 'Tell me about Japan!' 🌏";
    return {
      message: errorMessage,
      fromDatabase: false
    };
  }
}

function getAgeContext(ageRange: string): string {
  switch (ageRange) {
    case "3-5":
      return "The child is 3-5 years old. Use VERY simple words, short sentences, and lots of enthusiasm! Compare things to what they know (like toys, animals, cartoons).";
    case "6-9":
      return "The child is 6-9 years old. Use simple but informative language. Include fun facts they can share with friends!";
    case "9+":
    case "adult":
      return "The learner is 9+ or an adult. You can use more detailed information and interesting facts. Still keep it engaging and accessible.";
    default:
      return "Use language appropriate for a young child, keeping responses simple and fun.";
  }
}

export function getSuggestedTopics() {
  return suggestedTopics;
}

export function getWelcomeMessage(explorerName: string, ageRange: string = "6-9", context: 'geography' | 'app-help' = 'geography'): string {
  if (context === 'geography') {
    return `I'm Geo-Buddy, your AI learning companion. Want to learn something amazing about our planet today? 🌎`;
  }
  
  return `Hi ${explorerName}! 👋 I'm here to help you learn about GeoQuest! Tap any question below to get started.`;
}
