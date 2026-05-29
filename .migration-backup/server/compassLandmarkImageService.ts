import OpenAI from "openai";
import { db } from "./db";
import { compassLandmarkImages } from "@shared/schema";
import { eq } from "drizzle-orm";

const ART_STYLE = "warm storybook illustration style, bold shapes, vibrant colors, children's picture book aesthetic, soft watercolor textures, whimsical and inviting, no text, no people";
const NEGATIVE_SUFFIX = "Do NOT include: realistic photos, dark or scary imagery, text, words, letters, watermarks, blurry or low quality images, people, faces, or characters.";

const LANDMARK_PROMPTS: Record<string, string> = {
  "mountains": "Rocky Mountains landscape, dramatic snow-capped peaks, pine forest valleys, golden light",
  "statue-of-liberty": "Statue of Liberty on Liberty Island, New York Harbor, iconic green copper statue holding torch",
  "eiffel-tower": "Eiffel Tower in Paris at sunset, iconic iron lattice tower, city skyline in background",
  "st-basils": "Saint Basil's Cathedral in Moscow, colorful onion domes, Red Square",
  "red-fort": "Red Fort in Delhi, massive red sandstone walls, historic Mughal architecture",
  "table-mountain": "Table Mountain in Cape Town, flat-topped mountain, city below, ocean in background",
  "christ-redeemer": "Christ the Redeemer statue in Rio de Janeiro, arms outstretched wide, overlooking a vibrant coastal city",
  "vancouver-skyline": "Vancouver city skyline, modern skyscrapers, harbor and mountains in background",
  "space-needle": "Space Needle in Seattle, iconic futuristic tower, city skyline below",
  "machu-picchu": "Machu Picchu, ancient Inca citadel, misty mountain peaks, Andean highlands",
  "colosseum": "Roman Colosseum in Rome, ancient amphitheater, historic stone arches",
  "great-wall": "Great Wall of China winding over mountains, ancient stone fortification",
  "taj-mahal": "Taj Mahal in Agra, white marble mausoleum, reflecting pool, gardens",
  "sydney-opera": "Sydney Opera House, iconic white sail-shaped roof, harbour bridge in background",
  "big-ben": "Big Ben clock tower in London, Houses of Parliament, River Thames",
  "pyramids": "Egyptian Pyramids at Giza, Great Sphinx, golden desert sands",
  "acropolis": "Acropolis of Athens, Parthenon temple on hilltop, ancient Greek columns",
  "burj-khalifa": "Burj Khalifa in Dubai, world's tallest skyscraper, desert city skyline",
  "niagara-falls": "Niagara Falls waterfall, thundering water pouring over cliff edge, rainbow in mist, lush green surroundings",
  "chicago-skyline": "Chicago city skyline at dusk, Hancock Tower and skyscrapers reflected in Lake Michigan, soft city lights",
  "white-house": "The White House in Washington D.C., grand white neoclassical mansion with columns, manicured lawn and fountain",
  "honolulu-landscape": "Diamond Head volcanic crater overlooking Honolulu, turquoise ocean, lush tropical palm trees, clear blue sky",
  "kangaroo-outback": "A kangaroo bounding across the Australian outback, red desert earth, bright blue sky, sparse eucalyptus trees",
  "amazon-river": "Amazon River in the rainforest, vast green jungle canopy, winding river",
};

function getOpenAI(): OpenAI {
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });
}

export async function getOrGenerateLandmarkImage(svgKey: string, landmarkName?: string): Promise<string | null> {
  const existing = await db
    .select()
    .from(compassLandmarkImages)
    .where(eq(compassLandmarkImages.svgKey, svgKey))
    .limit(1);

  if (existing.length > 0 && existing[0].imageData) {
    return `data:image/png;base64,${existing[0].imageData}`;
  }

  const landmarkHint = LANDMARK_PROMPTS[svgKey] || `${landmarkName || svgKey} landmark, iconic and recognizable, beautiful scenery`;
  const prompt = `${ART_STYLE}. ${landmarkHint}. Inviting atmosphere for children exploring the world. ${NEGATIVE_SUFFIX}`;

  try {
    const openai = getOpenAI();
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = result.data[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned");

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    if (existing.length > 0) {
      await db
        .update(compassLandmarkImages)
        .set({ imageData: base64, prompt })
        .where(eq(compassLandmarkImages.svgKey, svgKey));
    } else {
      await db.insert(compassLandmarkImages).values({
        svgKey,
        imagePath: `/images/compass-landmarks/${svgKey}.png`,
        imageData: base64,
        prompt,
      });
    }

    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error(`[LandmarkImage] Failed to generate image for ${svgKey}:`, err);
    return null;
  }
}
