import { db } from "./db";
import { travelTrips, travelStops, itineraryShares, itineraryShareStops, users, journeyPacks } from "@shared/schema";
import { eq } from "drizzle-orm";

const SYSTEM_USER_ID = "geoquest-demo-user";
const SYSTEM_USER_EMAIL = "demo@geoquest.app";

interface SampleStop {
  name: string;
  stopType: string;
  displayOrder: number;
}

interface SampleTrip {
  name: string;
  destination: string;
  country: string;
  continent: string;
  city: string;
  slug: string;
  description: string;
  durationDays: number;
  styleTags: string[];
  stops: SampleStop[];
}

const SAMPLE_TRIPS: SampleTrip[] = [
  {
    name: "New York City Adventure",
    destination: "New York City, USA",
    country: "United States",
    continent: "North America",
    city: "New York",
    slug: "new-york-city-adventure",
    description: "Explore the Big Apple with your family! From iconic landmarks to world-class museums, NYC offers endless adventures for curious explorers.",
    durationDays: 5,
    styleTags: ["family", "cultural", "educational"],
    stops: [
      { name: "Statue of Liberty", stopType: "landmark", displayOrder: 0 },
      { name: "Central Park", stopType: "nature", displayOrder: 1 },
      { name: "American Museum of Natural History", stopType: "museum", displayOrder: 2 },
      { name: "Times Square", stopType: "landmark", displayOrder: 3 },
      { name: "Brooklyn Bridge", stopType: "landmark", displayOrder: 4 },
      { name: "Empire State Building", stopType: "landmark", displayOrder: 5 },
      { name: "Metropolitan Museum of Art", stopType: "museum", displayOrder: 6 },
      { name: "Ellis Island", stopType: "landmark", displayOrder: 7 },
      { name: "High Line Park", stopType: "nature", displayOrder: 8 },
      { name: "One World Observatory", stopType: "landmark", displayOrder: 9 },
    ],
  },
  {
    name: "Chicago Family Exploration",
    destination: "Chicago, USA",
    country: "United States",
    continent: "North America",
    city: "Chicago",
    slug: "chicago-family-exploration",
    description: "Discover the Windy City's amazing architecture, delicious food, and family-friendly attractions along Lake Michigan.",
    durationDays: 4,
    styleTags: ["family", "cultural", "foodie"],
    stops: [
      { name: "Millennium Park & Cloud Gate", stopType: "landmark", displayOrder: 0 },
      { name: "Shedd Aquarium", stopType: "museum", displayOrder: 1 },
      { name: "Field Museum", stopType: "museum", displayOrder: 2 },
      { name: "Navy Pier", stopType: "landmark", displayOrder: 3 },
      { name: "Art Institute of Chicago", stopType: "museum", displayOrder: 4 },
      { name: "Willis Tower Skydeck", stopType: "landmark", displayOrder: 5 },
      { name: "Museum of Science and Industry", stopType: "museum", displayOrder: 6 },
      { name: "Lincoln Park Zoo", stopType: "wildlife", displayOrder: 7 },
      { name: "Chicago Riverwalk", stopType: "nature", displayOrder: 8 },
      { name: "Adler Planetarium", stopType: "museum", displayOrder: 9 },
    ],
  },
  {
    name: "San Francisco Discovery",
    destination: "San Francisco, USA",
    country: "United States",
    continent: "North America",
    city: "San Francisco",
    slug: "san-francisco-discovery",
    description: "Experience the magic of the City by the Bay! From the Golden Gate Bridge to cable cars, San Francisco is an unforgettable adventure.",
    durationDays: 4,
    styleTags: ["family", "adventure", "nature"],
    stops: [
      { name: "Golden Gate Bridge", stopType: "landmark", displayOrder: 0 },
      { name: "Alcatraz Island", stopType: "landmark", displayOrder: 1 },
      { name: "Fisherman's Wharf", stopType: "landmark", displayOrder: 2 },
      { name: "California Academy of Sciences", stopType: "museum", displayOrder: 3 },
      { name: "Cable Car Ride", stopType: "adventure", displayOrder: 4 },
      { name: "Exploratorium", stopType: "museum", displayOrder: 5 },
      { name: "Pier 39 & Sea Lions", stopType: "wildlife", displayOrder: 6 },
      { name: "Chinatown", stopType: "cultural", displayOrder: 7 },
      { name: "Golden Gate Park", stopType: "nature", displayOrder: 8 },
      { name: "Ghirardelli Square", stopType: "landmark", displayOrder: 9 },
    ],
  },
  {
    name: "Paris Magic for Families",
    destination: "Paris, France",
    country: "France",
    continent: "Europe",
    city: "Paris",
    slug: "paris-magic-for-families",
    description: "Bonjour! Discover the City of Light with croissants, art, and unforgettable landmarks that will spark wonder in explorers of all ages.",
    durationDays: 6,
    styleTags: ["family", "cultural", "foodie"],
    stops: [
      { name: "Eiffel Tower", stopType: "landmark", displayOrder: 0 },
      { name: "Louvre Museum", stopType: "museum", displayOrder: 1 },
      { name: "Notre-Dame Cathedral", stopType: "landmark", displayOrder: 2 },
      { name: "Palace of Versailles", stopType: "landmark", displayOrder: 3 },
      { name: "Sacré-Cœur Basilica", stopType: "landmark", displayOrder: 4 },
      { name: "Luxembourg Gardens", stopType: "nature", displayOrder: 5 },
      { name: "Musée d'Orsay", stopType: "museum", displayOrder: 6 },
      { name: "Arc de Triomphe", stopType: "landmark", displayOrder: 7 },
      { name: "Seine River Cruise", stopType: "adventure", displayOrder: 8 },
      { name: "Disneyland Paris", stopType: "adventure", displayOrder: 9 },
    ],
  },
  {
    name: "London Family Adventure",
    destination: "London, England",
    country: "United Kingdom",
    continent: "Europe",
    city: "London",
    slug: "london-family-adventure",
    description: "Cheerio! Explore royal palaces, world-famous museums, and iconic landmarks in one of the world's most exciting cities.",
    durationDays: 5,
    styleTags: ["family", "cultural", "educational"],
    stops: [
      { name: "Tower of London", stopType: "landmark", displayOrder: 0 },
      { name: "Buckingham Palace", stopType: "landmark", displayOrder: 1 },
      { name: "British Museum", stopType: "museum", displayOrder: 2 },
      { name: "London Eye", stopType: "landmark", displayOrder: 3 },
      { name: "Natural History Museum", stopType: "museum", displayOrder: 4 },
      { name: "Big Ben & Houses of Parliament", stopType: "landmark", displayOrder: 5 },
      { name: "Tower Bridge", stopType: "landmark", displayOrder: 6 },
      { name: "Hyde Park", stopType: "nature", displayOrder: 7 },
      { name: "Science Museum", stopType: "museum", displayOrder: 8 },
      { name: "Harry Potter Studio Tour", stopType: "adventure", displayOrder: 9 },
    ],
  },
  {
    name: "Sydney Coastal Discovery",
    destination: "Sydney, Australia",
    country: "Australia",
    continent: "Oceania",
    city: "Sydney",
    slug: "sydney-coastal-discovery",
    description: "G'day! From the iconic Opera House to beautiful beaches and amazing wildlife, Sydney is a dream destination for families.",
    durationDays: 6,
    styleTags: ["family", "beach", "wildlife"],
    stops: [
      { name: "Sydney Opera House", stopType: "landmark", displayOrder: 0 },
      { name: "Sydney Harbour Bridge", stopType: "landmark", displayOrder: 1 },
      { name: "Taronga Zoo", stopType: "wildlife", displayOrder: 2 },
      { name: "Bondi Beach", stopType: "beach", displayOrder: 3 },
      { name: "Royal Botanic Garden", stopType: "nature", displayOrder: 4 },
      { name: "Darling Harbour", stopType: "landmark", displayOrder: 5 },
      { name: "SEA LIFE Sydney Aquarium", stopType: "wildlife", displayOrder: 6 },
      { name: "Blue Mountains Day Trip", stopType: "nature", displayOrder: 7 },
      { name: "Manly Beach & Ferry", stopType: "beach", displayOrder: 8 },
      { name: "The Rocks Historic Area", stopType: "cultural", displayOrder: 9 },
    ],
  },
  {
    name: "Italy Grand Tour",
    destination: "Italy",
    country: "Italy",
    continent: "Europe",
    city: "Rome",
    slug: "italy-grand-tour",
    description: "Ciao! Journey through ancient ruins, Renaissance art, and delicious gelato in one of the world's most beautiful countries.",
    durationDays: 10,
    styleTags: ["family", "cultural", "foodie", "educational"],
    stops: [
      { name: "Colosseum (Rome)", stopType: "landmark", displayOrder: 0 },
      { name: "Vatican Museums (Rome)", stopType: "museum", displayOrder: 1 },
      { name: "Trevi Fountain (Rome)", stopType: "landmark", displayOrder: 2 },
      { name: "Florence Cathedral", stopType: "landmark", displayOrder: 3 },
      { name: "Uffizi Gallery (Florence)", stopType: "museum", displayOrder: 4 },
      { name: "Leaning Tower of Pisa", stopType: "landmark", displayOrder: 5 },
      { name: "Venice Canals", stopType: "landmark", displayOrder: 6 },
      { name: "St. Mark's Square (Venice)", stopType: "landmark", displayOrder: 7 },
      { name: "Pompeii Archaeological Site", stopType: "landmark", displayOrder: 8 },
      { name: "Amalfi Coast", stopType: "nature", displayOrder: 9 },
    ],
  },
  {
    name: "Greek Islands & Ancient Wonders",
    destination: "Greece",
    country: "Greece",
    continent: "Europe",
    city: "Athens",
    slug: "greek-islands-ancient-wonders",
    description: "Opa! Discover ancient Greek mythology, beautiful islands, and Mediterranean adventures the whole family will love.",
    durationDays: 8,
    styleTags: ["family", "beach", "cultural", "educational"],
    stops: [
      { name: "Acropolis of Athens", stopType: "landmark", displayOrder: 0 },
      { name: "Parthenon", stopType: "landmark", displayOrder: 1 },
      { name: "Acropolis Museum", stopType: "museum", displayOrder: 2 },
      { name: "Santorini Island", stopType: "nature", displayOrder: 3 },
      { name: "Mykonos Island", stopType: "beach", displayOrder: 4 },
      { name: "Ancient Olympia", stopType: "landmark", displayOrder: 5 },
      { name: "Delphi Archaeological Site", stopType: "landmark", displayOrder: 6 },
      { name: "Plaka District (Athens)", stopType: "cultural", displayOrder: 7 },
      { name: "Temple of Poseidon (Cape Sounion)", stopType: "landmark", displayOrder: 8 },
      { name: "Naxos Island", stopType: "beach", displayOrder: 9 },
    ],
  },
];

async function ensureSystemUser(): Promise<string> {
  const [existingUser] = await db.select().from(users)
    .where(eq(users.id, SYSTEM_USER_ID));
  
  if (existingUser) {
    return existingUser.id;
  }
  
  const [newUser] = await db.insert(users).values({
    id: SYSTEM_USER_ID,
    email: SYSTEM_USER_EMAIL,
    firstName: "GeoQuest",
    lastName: "Demo",
  }).returning();
  
  console.log("✅ Created system demo user");
  return newUser.id;
}

async function tripShareExists(slug: string): Promise<boolean> {
  const [existing] = await db.select({ id: itineraryShares.id })
    .from(itineraryShares)
    .where(eq(itineraryShares.slug, slug));
  return !!existing;
}

export async function seedCommunityTrips(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const systemUserId = await ensureSystemUser();
    let seededCount = 0;
    
    for (const sample of SAMPLE_TRIPS) {
      const exists = await tripShareExists(sample.slug);
      if (exists) {
        continue;
      }
      
      const [trip] = await db.insert(travelTrips).values({
        userId: systemUserId,
        name: sample.name,
        destination: sample.destination,
        country: sample.country,
        continent: sample.continent,
        city: sample.city,
        status: "completed",
        travelerNames: ["Demo Family"],
        isPreloaded: true,
      }).returning();
      
      const stopsToInsert = sample.stops.map(stop => ({
        tripId: trip.id,
        name: stop.name,
        stopType: stop.stopType,
        displayOrder: stop.displayOrder,
        isVisited: true,
      }));
      
      const insertedStops = await db.insert(travelStops).values(stopsToInsert).returning();
      
      // Create empty journey packs for each stop (required for offline download)
      const journeyPacksToInsert = insertedStops.map(stop => ({
        stopId: stop.id,
      }));
      
      await db.insert(journeyPacks).values(journeyPacksToInsert);
      
      const [share] = await db.insert(itineraryShares).values({
        tripId: trip.id,
        ownerUserId: systemUserId,
        slug: sample.slug,
        title: sample.name,
        destination: sample.destination,
        description: sample.description,
        durationDays: sample.durationDays,
        styleTags: sample.styleTags,
        status: "published",
        publishedAt: new Date(),
        totalViews: Math.floor(Math.random() * 50) + 10,
        totalUpvotes: Math.floor(Math.random() * 20) + 5,
      }).returning();
      
      const shareStopsToInsert = sample.stops.map(stop => ({
        shareId: share.id,
        name: stop.name,
        displayOrder: stop.displayOrder,
        locationType: stop.stopType,
        listenSummary: "Audio story available",
        journeyGameTypes: ["guess", "thisorthat", "spotit"],
        exploreHighlights: "Nearby attractions available",
      }));
      
      await db.insert(itineraryShareStops).values(shareStopsToInsert);
      
      seededCount++;
      console.log(`✅ Seeded community trip: ${sample.name}`);
    }
    
    return {
      success: true,
      count: seededCount,
      message: seededCount > 0 
        ? `Seeded ${seededCount} community trips` 
        : "All community trips already exist",
    };
  } catch (error: any) {
    console.error("Failed to seed community trips:", error);
    return {
      success: false,
      count: 0,
      message: error.message || "Unknown error",
    };
  }
}
