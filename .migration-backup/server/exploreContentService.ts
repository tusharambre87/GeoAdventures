import OpenAI from "openai";

const MODEL = "gpt-4o-mini";

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
}

export async function getExploreContent(
  stopName: string,
  stopType: string,
  destination: string
): Promise<ExploreData> {
  try {
    return await generateTextContent(stopName, stopType, destination);
  } catch (error) {
    console.error("Error generating explore content:", error);
    return getFallbackData(stopName, stopType, destination);
  }
}

async function generateTextContent(
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
  "openingHours": "Real opening hours if known, e.g. 'Mon–Sun 9 AM – 5 PM' or 'Check website for seasonal hours'",
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
      "priceRange": "$" or "$$" or "$$$"
    }
  ],
  "kidFriendlyPlaces": [
    {
      "name": "Real kid-friendly spot nearby",
      "type": "playground|ice_cream|toy_store|arcade|splash_pad|zoo|aquarium|mini_golf",
      "distance": "e.g. 8 min walk",
      "description": "Brief description",
      "ageRange": "e.g. Ages 3–10 or All ages"
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

export async function generateStopHeroImage(
  stopName: string,
  stopType: string,
  destination: string
): Promise<string | undefined> {
  try {
    const typeHint =
      stopType === "museum" ? "exterior of the museum building with visitors" :
      stopType === "park" ? "beautiful outdoor scenery with families enjoying nature" :
      stopType === "attraction" ? "iconic view of the attraction with tourists" :
      stopType === "restaurant" || stopType === "food" ? "welcoming exterior with warm lighting" :
      "daytime exterior view with families";

    const prompt = `A vibrant, photorealistic travel photograph of ${stopName} in ${destination}. ${typeHint}. Bright daylight, wide shot, no text overlays, high quality travel photography.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return response.data?.[0]?.url || undefined;
  } catch (err) {
    console.error("Hero image generation failed:", err);
    return undefined;
  }
}

function getFallbackData(stopName: string, stopType: string, destination: string): ExploreData {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + " " + (destination || ""))}`;
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
  };
}
