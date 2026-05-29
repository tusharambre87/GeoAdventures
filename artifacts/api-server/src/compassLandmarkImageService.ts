import OpenAI from "openai";
import { db } from "./db";
import { compassLandmarkImages } from "@workspace/db";
import { eq } from "drizzle-orm";

const ART_STYLE = "warm storybook illustration style, bold shapes, vibrant colors, children's picture book aesthetic, soft watercolor textures, whimsical and inviting, no text, no people";
const NEGATIVE_SUFFIX = "Do NOT include: realistic photos, dark or scary imagery, text, words, letters, watermarks, blurry or low quality images, people, faces, or characters.";

const LANDMARK_PROMPTS: Record<string, string> = {
  // ── USA & North America ───────────────────────────────────────────────────
  "mountains": "Rocky Mountains landscape, dramatic snow-capped peaks, pine forest valleys, golden light",
  "statue-of-liberty": "Statue of Liberty on Liberty Island, New York Harbor, iconic green copper statue holding torch",
  "space-needle": "Space Needle in Seattle, iconic futuristic tower, city skyline below",
  "chicago-skyline": "Chicago city skyline at dusk, Hancock Tower and skyscrapers reflected in Lake Michigan, soft city lights",
  "white-house": "The White House in Washington D.C., grand white neoclassical mansion with columns, manicured lawn and fountain",
  "honolulu-landscape": "Diamond Head volcanic crater overlooking Honolulu, turquoise ocean, lush tropical palm trees, clear blue sky",
  "niagara-falls": "Niagara Falls waterfall, thundering water pouring over cliff edge, rainbow in mist, lush green surroundings",
  "vancouver-skyline": "Vancouver city skyline, modern skyscrapers, harbor and mountains in background",
  "toronto-cn-tower": "CN Tower in Toronto soaring above the city skyline, Lake Ontario glittering in the background, warm evening light",
  "banff-lake-louise": "Lake Louise in Banff, impossibly turquoise glacial lake surrounded by snow-capped Rocky Mountains and lush pine forests",
  "quebec-city-chateau": "Château Frontenac castle hotel towering over Quebec City's old stone walls, St. Lawrence River in the background",
  "mexico-city-zocalo": "Mexico City Zócalo plaza with the grand Metropolitan Cathedral, colorful colonial buildings, vibrant street scene",
  "cancun-turquoise-coast": "Cancún coastline with crystal-clear turquoise Caribbean water, white sandy beach, lush palm trees, Mayan ruins on a cliff",
  "amazon-river": "Amazon River in the rainforest, vast green jungle canopy, winding river",

  // ── Europe ────────────────────────────────────────────────────────────────
  "eiffel-tower": "Eiffel Tower in Paris at sunset, iconic iron lattice tower, city skyline in background",
  "big-ben": "Big Ben clock tower in London, Houses of Parliament, River Thames",
  "colosseum": "Roman Colosseum in Rome, ancient amphitheater, historic stone arches",
  "acropolis": "Acropolis of Athens, Parthenon temple on hilltop, ancient Greek columns",
  "sagrada-familia": "Sagrada Família basilica in Barcelona, soaring organic spires covered in intricate stone carvings, Gaudí's masterpiece",
  "amsterdam-canals": "Amsterdam canal with narrow colourful gabled townhouses reflected in the still water, historic stone bridges, bicycles",
  "vienna-st-stephens": "St. Stephen's Cathedral in Vienna, ornate Gothic spire rising above the historic Ringstrasse, ornamental mosaic roof",
  "prague-castle": "Prague Castle perched above the city, gothic spires over a sea of terracotta rooftops and the Vltava River",
  "budapest-parliament": "Hungarian Parliament Building in Budapest, Gothic Revival palace lit in warm gold on the banks of the Danube",
  "lisbon-belem-tower": "Belém Tower in Lisbon, ornate Manueline stone fortress rising from the Tagus River, golden afternoon light",
  "edinburgh-castle": "Edinburgh Castle dramatically perched on volcanic rock above the Royal Mile, Scottish highland scenery",
  "florence-duomo": "Florence Cathedral dome by Brunelleschi, terracotta red dome above the terracotta rooftops, Tuscan golden sky",
  "venice-canals": "Venice Grand Canal at sunrise, gondolas gliding past pastel-coloured palazzo buildings reflected in still water",
  "santorini-caldera": "Santorini island caldera view, white-domed blue churches cascading down volcanic cliffs above a deep-blue Aegean sea",
  "dubrovnik-old-town": "Dubrovnik Old City walls, orange-roofed medieval fortress town on a rocky promontory above the brilliant Adriatic Sea",
  "reykjavik-hallgrimskirkja": "Hallgrímskirkja church in Reykjavík, towering concrete spire overlooking colourful buildings with Northern Lights in the sky",

  // ── Asia ──────────────────────────────────────────────────────────────────
  "mount-fuji": "Mount Fuji, Japan's iconic snow-capped volcano rising above cherry blossom trees and a tranquil lake reflection",
  "kyoto-golden-pavilion": "Kinkaku-ji Golden Pavilion in Kyoto, gilded temple perfectly reflected in a still pond surrounded by manicured Japanese gardens",
  "gyeongbokgung-palace": "Gyeongbokgung Palace in Seoul, grand royal palace complex with colourful painted eaves and mountain backdrop",
  "bangkok-grand-palace": "Grand Palace complex in Bangkok, ornate golden temple spires and glistening mosaic-covered chedis against a blue sky",
  "singapore-marina-bay": "Marina Bay Sands in Singapore, iconic three-tower hotel with rooftop infinity pool above the futuristic city skyline and bay",
  "bali-rice-terraces": "Bali Tegallalang rice terraces, lush emerald green stepped paddies cascading down a valley with swaying palm trees",
  "angkor-wat": "Angkor Wat temple in Siem Reap, ancient Khmer stone towers reflected in a long lotus-dotted moat at sunrise",
  "great-wall": "Great Wall of China winding over mountains, ancient stone fortification",
  "istanbul-blue-mosque": "Blue Mosque in Istanbul, six elegant minarets surrounding the grand domed Ottoman mosque, Bosphorus Strait in the distance",
  "cappadocia-balloons": "Hot air balloons floating over Cappadocia, Turkey, above a fairy-tale landscape of stone chimneys and cave dwellings at dawn",
  "taj-mahal": "Taj Mahal in Agra, white marble mausoleum, reflecting pool, gardens",
  "red-fort": "Red Fort in Delhi, massive red sandstone walls, historic Mughal architecture",

  // ── Middle East ───────────────────────────────────────────────────────────
  "burj-khalifa": "Burj Khalifa in Dubai, world's tallest skyscraper, desert city skyline",

  // ── Australia & New Zealand ───────────────────────────────────────────────
  "sydney-opera": "Sydney Opera House, iconic white sail-shaped roof, harbour bridge in background",
  "kangaroo-outback": "A kangaroo bounding across the Australian outback, red desert earth, bright blue sky, sparse eucalyptus trees",
  "auckland-sky-tower": "Sky Tower in Auckland, slender futuristic needle soaring above the harbour city, Waitemata Harbour glittering below",
  "queenstown-remarkables": "Queenstown, New Zealand, nestled on the shores of Lake Wakatipu with The Remarkables snow-capped mountain range behind",

  // ── South America ─────────────────────────────────────────────────────────
  "christ-redeemer": "Christ the Redeemer statue in Rio de Janeiro, arms outstretched wide, overlooking a vibrant coastal city",
  "machu-picchu": "Machu Picchu, ancient Inca citadel, misty mountain peaks, Andean highlands",
  "cusco-cathedral": "Cusco Cathedral on the Plaza de Armas, grand Spanish baroque stonework blended with Incan stonework, Andean mountains behind",
  "buenos-aires-obelisk": "Obelisco de Buenos Aires on the wide Avenida 9 de Julio, stately white needle against a vivid blue sky, bustling city boulevard",
  "cartagena-walls": "Cartagena de Indias old city walls in Colombia, colourful colonial buildings draped in bougainvillea inside the fortification",

  // ── Africa ────────────────────────────────────────────────────────────────
  "table-mountain": "Table Mountain in Cape Town, flat-topped mountain, city below, ocean in background",
  "pyramids": "Egyptian Pyramids at Giza, Great Sphinx, golden desert sands",
  "marrakech-djemaa": "Djemaa el-Fna square in Marrakech at dusk, minarets and smoke rising from food stalls, warm amber market lantern glow",
  "st-basils": "Saint Basil's Cathedral in Moscow, colorful onion domes, Red Square",
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
