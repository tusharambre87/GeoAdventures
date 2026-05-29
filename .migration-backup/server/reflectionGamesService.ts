import OpenAI from "openai";
import { db } from "./db";
import { reflectionGameCache, reflectionGameSessions, reflectionGameResponses, travelStops, journeyPacks, travelMoments, type ReflectionGameType, type ReflectionSessionType } from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { GEOQUEST_SAFETY_PROMPT } from "./contentSafety";

const MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface WhoAmIGame {
  gameType: 'who_am_i';
  stopId: string;
  stopName: string;
  clues: string[];
  options: { label: string; emoji: string }[];
  correctAnswer: string;
}

export interface GuessWhereGame {
  gameType: 'guess_where';
  stopId: string;
  photoUrl: string;
  options: { label: string; emoji: string }[];
  correctAnswer: string;
}

export interface DoesntBelongGame {
  gameType: 'doesnt_belong';
  items: { label: string; emoji: string; tags: string[] }[];
  explanations: { itemLabel: string; reason: string }[];
}

export interface ThisBelongsGame {
  gameType: 'this_belongs';
  item: { label: string; emoji: string; description: string };
  stops: { stopId: string; stopName: string; emoji: string }[];
  bestFitStopId: string;
  affirmation: string;
}

export interface PickTitleGame {
  gameType: 'pick_title';
  tripId: string;
  titleOptions: string[];
  stopHighlights: string[];
}

export interface StorySparkGame {
  gameType: 'story_spark';
  stopId: string;
  stopName: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export type ReflectionGame = WhoAmIGame | GuessWhereGame | DoesntBelongGame | ThisBelongsGame | PickTitleGame | StorySparkGame;

async function getCachedGame(tripId: string, gameType: ReflectionGameType, stopId?: string): Promise<ReflectionGame | null> {
  const conditions = [eq(reflectionGameCache.tripId, tripId), eq(reflectionGameCache.gameType, gameType)];
  if (stopId) {
    conditions.push(eq(reflectionGameCache.stopId, stopId));
  }
  
  const cached = await db.select().from(reflectionGameCache).where(and(...conditions)).limit(1);
  if (cached.length > 0) {
    return cached[0].gameData as ReflectionGame;
  }
  return null;
}

async function cacheGame(tripId: string, gameType: ReflectionGameType, gameData: ReflectionGame, stopId?: string) {
  await db.insert(reflectionGameCache).values({
    tripId,
    gameType,
    stopId: stopId || null,
    gameData,
  });
}

export async function generateWhoAmI(tripId: string, stop: typeof travelStops.$inferSelect): Promise<WhoAmIGame | null> {
  const cached = await getCachedGame(tripId, 'who_am_i', stop.id);
  if (cached) return cached as WhoAmIGame;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You create fun "Who Am I?" riddle games for children ages 6-12 about travel destinations.
Generate 3 progressive clues (easy to hard) and 4 multiple choice options.
The clues should be poetic and kid-friendly - describing what the place is like from its perspective.
Return JSON: {"clues": ["...", "...", "..."], "options": [{"label": "...", "emoji": "..."}], "correctAnswer": "..."}

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create a "Who Am I?" riddle for: ${stop.name} (${stop.stopType || 'landmark'}).
Brief description: ${stop.description || 'A notable travel destination'}
Location: ${stop.address || 'Unknown'}
Make it fun and mysterious for kids!`
        }
      ],
      max_tokens: 500,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const game: WhoAmIGame = {
        gameType: 'who_am_i',
        stopId: stop.id,
        stopName: stop.name,
        clues: parsed.clues || [],
        options: parsed.options || [],
        correctAnswer: parsed.correctAnswer || stop.name
      };
      await cacheGame(tripId, 'who_am_i', game, stop.id);
      return game;
    }
  } catch (error) {
    console.error('[ReflectionGames] Error generating Who Am I:', error);
  }
  return null;
}

export async function generateGuessWhere(tripId: string, stop: typeof travelStops.$inferSelect, moments: typeof travelMoments.$inferSelect[]): Promise<GuessWhereGame | null> {
  const stopMoments = moments.filter(m => m.stopId === stop.id && m.photoUrl);
  let photoUrl = stopMoments.length > 0 ? stopMoments[0].photoUrl : null;
  
  if (!photoUrl) {
    const stockImages: Record<string, string> = {
      beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
      volcano: 'https://images.unsplash.com/photo-1554254464-7e1ad28eb78a?w=800',
      waterfall: 'https://images.unsplash.com/photo-1470138831303-3e77dd49163e?w=800',
      park: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800',
      museum: 'https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=800',
      landmark: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
      nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
      city: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800',
    };
    const stopLower = (stop.name + ' ' + (stop.stopType || '')).toLowerCase();
    const matched = Object.keys(stockImages).find(key => stopLower.includes(key));
    photoUrl = matched ? stockImages[matched] : stockImages['landmark'];
  }

  const cached = await getCachedGame(tripId, 'guess_where', stop.id);
  if (cached) return cached as GuessWhereGame;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You create "Guess Where" game options for children ages 6-12.
Given a destination, create 4 multiple choice options (including the correct answer).
Make the wrong options plausible but clearly different.
Return JSON: {"options": [{"label": "...", "emoji": "..."}], "correctAnswer": "..."}

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create "Guess Where" options for: ${stop.name}
Location type: ${stop.stopType || 'landmark'}
Region: ${stop.address || 'Unknown'}`
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const game: GuessWhereGame = {
        gameType: 'guess_where',
        stopId: stop.id,
        photoUrl: photoUrl!,
        options: parsed.options || [],
        correctAnswer: parsed.correctAnswer || stop.name
      };
      await cacheGame(tripId, 'guess_where', game, stop.id);
      return game;
    }
  } catch (error) {
    console.error('[ReflectionGames] Error generating Guess Where:', error);
  }
  return null;
}

export async function generateDoesntBelong(tripId: string, stops: typeof travelStops.$inferSelect[]): Promise<DoesntBelongGame | null> {
  const cached = await getCachedGame(tripId, 'doesnt_belong');
  if (cached) return cached as DoesntBelongGame;

  const shuffled = [...stops].sort(() => Math.random() - 0.5);
  const stopNames = shuffled.slice(0, 4).map(s => s.name);
  if (stopNames.length < 3) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You create "Which One Doesn't Belong?" puzzles for children ages 6-12.
Given a list of places, create a puzzle where ANY answer is valid (there's no single correct answer).
The key is generating thoughtful explanations for why EACH item could be the odd one out.
Return JSON: {"items": [{"label": "...", "emoji": "...", "tags": ["..."]}], "explanations": [{"itemLabel": "...", "reason": "..."}]}

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create a "Which One Doesn't Belong?" puzzle using these places: ${stopNames.join(', ')}`
        }
      ],
      max_tokens: 600,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const game: DoesntBelongGame = {
        gameType: 'doesnt_belong',
        items: parsed.items || [],
        explanations: parsed.explanations || []
      };
      await cacheGame(tripId, 'doesnt_belong', game);
      return game;
    }
  } catch (error) {
    console.error('[ReflectionGames] Error generating Doesnt Belong:', error);
  }
  return null;
}

export async function generateThisBelongs(tripId: string, stops: typeof travelStops.$inferSelect[]): Promise<ThisBelongsGame | null> {
  const cached = await getCachedGame(tripId, 'this_belongs');
  if (cached) return cached as ThisBelongsGame;

  if (stops.length < 2) return null;

  try {
    const stopInfo = stops.slice(0, 4).map(s => `${s.name} (${s.stopType || 'landmark'})`).join(', ');
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You create "This Belongs Here" matching games for children ages 6-12.
Given a list of travel stops, create a puzzle where a kid matches an object/trait to a place.
Choose one item that best fits ONE of the stops (but any reasonable match should be affirmed).
Return JSON: {
  "item": {"label": "...", "emoji": "...", "description": "..."},
  "stops": [{"stopId": "...", "stopName": "...", "emoji": "..."}],
  "bestFitStopId": "...",
  "affirmation": "Great thinking! ..."
}

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create a "This Belongs Here" puzzle for these stops: ${stopInfo}
Stop IDs: ${stops.slice(0, 4).map(s => s.id).join(', ')}`
        }
      ],
      max_tokens: 500,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const game: ThisBelongsGame = {
        gameType: 'this_belongs',
        item: parsed.item || { label: '', emoji: '', description: '' },
        stops: stops.slice(0, 4).map(s => ({
          stopId: s.id,
          stopName: s.name,
          emoji: '📍'
        })),
        bestFitStopId: parsed.bestFitStopId || stops[0].id,
        affirmation: parsed.affirmation || 'Great thinking!'
      };
      await cacheGame(tripId, 'this_belongs', game);
      return game;
    }
  } catch (error) {
    console.error('[ReflectionGames] Error generating This Belongs:', error);
  }
  return null;
}

export async function generatePickTitle(tripId: string, trip: any, stops: typeof travelStops.$inferSelect[]): Promise<PickTitleGame | null> {
  const cached = await getCachedGame(tripId, 'pick_title');
  if (cached) return cached as PickTitleGame;

  const visitedStops = stops.filter(s => s.isVisited);
  if (visitedStops.length < 2) return null;

  try {
    const highlights = visitedStops.slice(0, 5).map(s => s.name);
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You create fun trip title options for children ages 6-12 to name their family adventure.
Generate 3 creative, kid-friendly title options based on the trip's highlights.
Titles should be memorable, fun, and capture the adventure spirit.
Return JSON: {"titleOptions": ["...", "...", "..."]}

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create 3 title options for a family trip to ${trip.destination || 'an adventure'}.
Places visited: ${highlights.join(', ')}`
        }
      ],
      max_tokens: 200,
      temperature: 0.9,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const game: PickTitleGame = {
        gameType: 'pick_title',
        tripId,
        titleOptions: parsed.titleOptions || [],
        stopHighlights: highlights
      };
      await cacheGame(tripId, 'pick_title', game);
      return game;
    }
  } catch (error) {
    console.error('[ReflectionGames] Error generating Pick Title:', error);
  }
  return null;
}

export async function generateStorySpark(tripId: string, stop: typeof travelStops.$inferSelect, pack: typeof journeyPacks.$inferSelect | null): Promise<StorySparkGame | null> {
  const cached = await getCachedGame(tripId, 'story_spark', stop.id);
  if (cached) return cached as StorySparkGame;

  const storyContent = pack?.storyContent || pack?.audioFactText || stop.description || '';
  if (!storyContent || storyContent.length < 50) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You create memory recall questions for children ages 6-12 based on stories they heard.
Generate a simple question about something memorable from the story, with 4 options plus "Not sure" as fifth option.
Keep language simple and fun. Questions should be about key facts or fun details.
Return JSON: {"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "explanation": "..."}

${GEOQUEST_SAFETY_PROMPT}`
        },
        {
          role: "user",
          content: `Create a recall question for this story about ${stop.name}:
"${storyContent.slice(0, 800)}"`
        }
      ],
      max_tokens: 400,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const game: StorySparkGame = {
        gameType: 'story_spark',
        stopId: stop.id,
        stopName: stop.name,
        question: parsed.question || '',
        options: [...(parsed.options || []), "Not sure 🤔"],
        correctAnswer: parsed.correctAnswer || '',
        explanation: parsed.explanation || ''
      };
      await cacheGame(tripId, 'story_spark', game, stop.id);
      return game;
    }
  } catch (error) {
    console.error('[ReflectionGames] Error generating Story Spark:', error);
  }
  return null;
}

export async function selectGamesForRecap(
  tripId: string,
  sessionType: ReflectionSessionType,
  stops: typeof travelStops.$inferSelect[],
  moments: typeof travelMoments.$inferSelect[],
  packs: typeof journeyPacks.$inferSelect[]
): Promise<ReflectionGame[]> {
  const visitedStops = stops.filter(s => s.isVisited);
  const eligibleStops = visitedStops.length > 0 ? visitedStops : stops;
  const games: ReflectionGame[] = [];
  
  const gameOrder: ReflectionGameType[] = sessionType === 'end_of_trip'
    ? ['who_am_i', 'guess_where', 'doesnt_belong', 'this_belongs', 'story_spark', 'pick_title']
    : ['who_am_i', 'guess_where', 'doesnt_belong', 'this_belongs', 'story_spark'];

  const maxGames = sessionType === 'adventure_recap' ? 2 : sessionType === 'end_of_day' ? 3 : 5;
  
  for (const gameType of gameOrder) {
    if (games.length >= maxGames) break;
    
    try {
      let game: ReflectionGame | null = null;
      const randomStop = eligibleStops[Math.floor(Math.random() * eligibleStops.length)];
      const pack = packs.find(p => p.stopId === randomStop?.id) || null;
      
      switch (gameType) {
        case 'who_am_i':
          if (randomStop) game = await generateWhoAmI(tripId, randomStop);
          break;
        case 'guess_where':
          if (randomStop) game = await generateGuessWhere(tripId, randomStop, moments);
          break;
        case 'doesnt_belong':
          game = await generateDoesntBelong(tripId, eligibleStops);
          break;
        case 'this_belongs':
          game = await generateThisBelongs(tripId, eligibleStops);
          break;
        case 'pick_title':
          const trip = await db.query.travelTrips.findFirst({ where: (t, { eq }) => eq(t.id, tripId) });
          if (trip) game = await generatePickTitle(tripId, trip, eligibleStops);
          break;
        case 'story_spark':
          if (randomStop) game = await generateStorySpark(tripId, randomStop, pack);
          break;
      }
      
      if (game) games.push(game);
    } catch (error) {
      console.error(`[ReflectionGames] Error generating ${gameType}:`, error);
    }
  }
  
  return games;
}

export async function createRecapSession(
  tripId: string,
  explorerId: string,
  sessionType: ReflectionSessionType,
  stopIds: string[]
): Promise<typeof reflectionGameSessions.$inferSelect | null> {
  const [session] = await db.insert(reflectionGameSessions).values({
    tripId,
    explorerId,
    sessionType,
    stopsIncluded: stopIds,
    gamesPlayed: [],
    totalStarsEarned: 0,
    isCompleted: false,
  }).returning();
  
  return session;
}

export async function recordGameResponse(
  sessionId: string,
  tripId: string,
  explorerId: string,
  gameType: ReflectionGameType,
  selectedAnswer: string,
  isCorrect: boolean | null,
  starsEarned: number,
  stopId?: string,
  responseData?: any
) {
  await db.insert(reflectionGameResponses).values({
    sessionId,
    tripId,
    explorerId,
    gameType,
    stopId: stopId || null,
    selectedAnswer,
    isCorrect,
    starsEarned,
    responseData: responseData || {},
  });
  
  await db.update(reflectionGameSessions)
    .set({ 
      totalStarsEarned: sql`${reflectionGameSessions.totalStarsEarned} + ${starsEarned}`,
      gamesPlayed: sql`array_append(${reflectionGameSessions.gamesPlayed}, ${gameType})`
    })
    .where(eq(reflectionGameSessions.id, sessionId));
}

export async function completeRecapSession(sessionId: string) {
  await db.update(reflectionGameSessions)
    .set({ isCompleted: true, completedAt: new Date() })
    .where(eq(reflectionGameSessions.id, sessionId));
}
