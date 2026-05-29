import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { generatedAdventureImages } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const ART_STYLE = "warm storybook illustration style, bold shapes, vibrant colors, children's picture book aesthetic, soft watercolor textures, whimsical and inviting, no text, no people";
const NEGATIVE_SUFFIX = "Do NOT include: realistic photos, dark or scary imagery, text, words, letters, watermarks, blurry or low quality images, people, faces, or characters.";

// For parent-facing planner stop images: photorealistic travel photography style
const STOP_PHOTO_STYLE = "professional travel photography, photorealistic, sharp focus, natural lighting, high quality, authentic venue photo";
const STOP_PHOTO_NEGATIVE = "Do NOT include: illustration, cartoon, watercolor, painting, sketch, art style, people's faces, text, watermarks, blurry, low quality, dark or scary imagery.";

// Landmark-specific prompt overrides so DALL-E renders the actual iconic feature
// rather than a generic scene. Keys are lowercase stop-name substrings.
const LANDMARK_PROMPT_OVERRIDES: Record<string, string> = {
  // Chicago
  "millennium park":    "the Cloud Gate (Bean) sculpture, a giant mirror-polished silver bean-shaped artwork reflecting the Chicago skyline, Millennium Park, Chicago",
  "cloud gate":         "the Cloud Gate (Bean), a giant polished silver bean-shaped sculpture reflecting the Chicago skyline, Millennium Park",
  "navy pier":          "Navy Pier in Chicago — a festive lakefront entertainment pier with a giant colorful Ferris wheel, twinkling lights, crowds of visitors, and Lake Michigan stretching to the horizon",
  "willis tower":       "the Willis Tower (formerly Sears Tower) in Chicago, an enormous black-glass skyscraper towering above the rest of the city skyline, seen from below looking up, dramatic perspective",
  "sears tower":        "the Willis Tower (formerly Sears Tower) in Chicago, an enormous black-glass skyscraper towering above the rest of the city skyline, seen from below looking up, dramatic perspective",
  "art institute of chicago": "the Art Institute of Chicago, neoclassical stone facade with iconic bronze lion statues flanking the entrance steps",
  "field museum":       "the Field Museum of Natural History in Chicago, a stunning white neoclassical stone building with Doric columns and wide granite steps, lush green lawn, set against a bright blue sky",
  "chicago children's museum": "Chicago Children's Museum, a vibrant and colorful indoor play space full of bright primary colors, interactive climbing structures, bubbles, and imaginative exhibits for young children",
  "shedd aquarium":     "the Shedd Aquarium in Chicago, a grand white beaux-arts building on the lakefront, with the glittering blue Lake Michigan visible behind it",
  "adler planetarium":  "the Adler Planetarium in Chicago, a distinctive Art Deco circular building on a lakefront peninsula with a sweeping panoramic view of the Chicago skyline across the water",
  "lincoln park zoo":   "Lincoln Park Zoo in Chicago, a free urban zoo with lush green landscaping, tall giraffes browsing acacia trees, colorful bird aviaries, and families walking tree-lined paths",
  "wrigley field":      "Wrigley Field baseball stadium in Chicago with its famous ivy-covered brick outfield wall and classic red marquee sign outside, a beloved historic ballpark",

  // St. Louis
  "gateway arch":       "the Gateway Arch in St. Louis, a towering 630-foot stainless steel arch monument curving over the Mississippi River, the most iconic US arch",
  "gateway arch national park": "the Gateway Arch in St. Louis Missouri, a massive gleaming stainless steel arch 630 feet tall rising above the riverfront park",
  "saint louis science center": "the Saint Louis Science Center, a grand science museum with a large dinosaur skeleton exhibit hall and domed ceiling",
  "st. louis science center": "the Saint Louis Science Center museum with exhibits of dinosaur fossils, a giant planetarium dome, and science displays",
  "forest park":        "Forest Park in St. Louis, a vast green park with a large lake, walking paths, and the iconic art museum visible on the hill",
  "saint louis art museum": "the Saint Louis Art Museum, a grand neoclassical building atop Art Hill in Forest Park with a panoramic view of the park",
  "saint louis zoo":    "the Saint Louis Zoo inside Forest Park, with colorful animal enclosures, tropical bird houses, and lush trees",

  // Washington DC
  "lincoln memorial":   "the Lincoln Memorial, a grand Greek temple with tall white marble columns and steps reflected in the reflecting pool, Washington DC",
  "washington monument":"the Washington Monument, a tall white marble obelisk towering over the National Mall in Washington DC",
  "white house":        "the White House, the iconic white-columned mansion behind iron gates with its manicured lawn and fountain",
  "us capitol":         "the US Capitol building with its grand neoclassical dome and wide stone steps on Capitol Hill",
  "capitol building":   "the US Capitol building with its iconic dome rising over Capitol Hill, Washington DC",

  // New York City
  "statue of liberty":  "the Statue of Liberty, the iconic tall green copper statue holding a torch above New York Harbor",
  "central park":       "Central Park in New York City, the famous Bow Bridge over a lake surrounded by trees with skyscrapers visible beyond",
  "times square":       "Times Square in New York City, with massive bright LED billboard screens, yellow taxis, and bright neon lights",
  "empire state building": "the Empire State Building, the famous tall art deco skyscraper dominating the New York City skyline",
  "brooklyn bridge":    "the Brooklyn Bridge, the iconic suspension bridge with stone Gothic towers over the East River, New York",

  // San Francisco
  "golden gate bridge": "the Golden Gate Bridge, the famous red-orange suspension bridge spanning San Francisco Bay with fog rolling in",
  "alcatraz":           "Alcatraz Island with its historic lighthouse and prison fortress surrounded by San Francisco Bay waters",

  // National Parks
  "grand canyon":       "the Grand Canyon, vast layered red and orange rock formations carved by the Colorado River, a breathtaking panoramic vista",
  "old faithful":       "Old Faithful geyser in Yellowstone erupting a massive column of steam and boiling water into the sky",
  "niagara falls":      "Niagara Falls, a massive powerful curved waterfall with a cloud of mist rising and a tour boat below",
  "mount rushmore":     "Mount Rushmore, the famous carved granite mountain with four giant presidential faces in the Black Hills of South Dakota",

  // Seattle
  "space needle":       "the Space Needle in Seattle, a tall futuristic tower with a flying saucer-shaped observation deck at the top",

  // Mahabaleshwar, Maharashtra, India
  "arthur's seat":      "Arthur's Seat viewpoint in Mahabaleshwar, India, a dramatic rocky clifftop overlook with a sweeping panoramic view of the lush green Sahyadri mountain valleys below, Western Ghats landscape, mist in the valleys",
  "elephant's head point": "Elephant's Head Point in Mahabaleshwar, India, a rock formation jutting out over the green Sahyadri hills resembling an elephant's head, panoramic Western Ghats scenery with misty valleys",
  "wilson point":       "Wilson Point in Mahabaleshwar, India, the highest point offering a breathtaking 360-degree sunrise view over the green valley hills and mountains of the Western Ghats",
  "mapro garden":       "Mapro Garden in Mahabaleshwar, India, a vibrant strawberry-themed garden with red strawberry plants, colorful flowers, and a charming outdoor cafe setting surrounded by greenery",
  "venna lake":         "Venna Lake in Mahabaleshwar, India, a serene artificial lake surrounded by green hills with rowing boats and paddle boats, a popular family picnic spot",
  "pratapgad fort":     "Pratapgad Fort in Mahabaleshwar, Maharashtra, India, a historic hill fort with stone walls and battlements set on a mountain ridge surrounded by misty Western Ghats forests",
  "lingmala waterfall": "Lingmala Waterfall in Mahabaleshwar, India, a beautiful tiered waterfall cascading down mossy green rocks in a lush jungle setting, cool mist in the air",
  "bhilar waterfall":   "Bhilar Waterfall in Mahabaleshwar, India, a scenic forest waterfall rushing down rocky terrain surrounded by dense green trees of the Western Ghats",
  "panchgani table land": "Panchgani Table Land in Maharashtra India, a vast flat volcanic plateau with panoramic views of the Sahyadri mountains and valleys, red laterite soil stretching to the horizon",
  "strawberry farm":    "a fresh strawberry farm in Mahabaleshwar India, rows of lush green plants with bright red strawberries, farm stalls with baskets of fresh strawberries, misty hill backdrop",

  // International
  "eiffel tower":       "the Eiffel Tower, the iconic iron lattice tower in Paris with the Seine River visible below at golden hour",
  "colosseum":          "the Colosseum in Rome, the ancient oval Roman amphitheatre with its distinctive arched stone facade",
  "taj mahal":          "the Taj Mahal in Agra India, a gleaming white marble mausoleum with its central onion dome and four minarets, reflecting pool in front",
  "great wall":         "the Great Wall of China, the ancient stone wall snaking over rolling green mountain ridges as far as the eye can see",
  "sydney opera house": "the Sydney Opera House with its famous white sail-shaped shell roofs gleaming in the Sydney Harbour sunlight",
  "sagrada familia":    "the Sagrada Família basilica in Barcelona, with its extraordinary tall stone spires covered in ornate Gothic sculpture",
  "mount fuji":         "Mount Fuji, Japan's iconic snow-capped conical volcano reflected in a calm lake with cherry blossom trees in the foreground",
  "senso-ji":           "Senso-ji Temple in Asakusa Tokyo with its giant red lantern hanging in the Kaminarimon Thunder Gate entrance",
  "burj khalifa":       "the Burj Khalifa in Dubai, the world's tallest tower, a sleek silver skyscraper piercing the clouds above the desert city",
  "machu picchu":       "the ancient Inca citadel of Machu Picchu, stone ruins perched dramatically on a mountain ridge above the Andes clouds",
  "table mountain":     "Table Mountain in Cape Town, the flat-topped dramatic mountain with the city and ocean visible far below",
};

function getOpenAI(): OpenAI {
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

export async function generateCityHeroImage(cityName: string, country?: string): Promise<string | null> {
  const citySlug = slugify(cityName);
  const imagePath = `/images/adventure/cities/${citySlug}.png`;
  const fullPath = path.resolve(process.cwd(), "public", "images", "adventure", "cities", `${citySlug}.png`);

  if (fs.existsSync(fullPath)) {
    return imagePath;
  }

  const existing = await db
    .select()
    .from(generatedAdventureImages)
    .where(and(eq(generatedAdventureImages.imageType, "city"), eq(generatedAdventureImages.citySlug, citySlug)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].status === "completed" && fs.existsSync(fullPath)) {
      return existing[0].imagePath;
    }
    if (existing[0].status === "pending") {
      return null;
    }
    if (existing[0].status === "failed") {
      await db.delete(generatedAdventureImages).where(eq(generatedAdventureImages.id, existing[0].id));
    }
  }

  const [record] = await db
    .insert(generatedAdventureImages)
    .values({
      imageType: "city",
      citySlug,
      cityName,
      imagePath,
      status: "pending",
    })
    .returning();

  try {
    const countryHint = country ? ` in ${country}` : "";
    const prompt = `${ART_STYLE}. A panoramic skyline view of ${cityName}${countryHint}, showing the most iconic and recognizable landmarks and architecture of the city, warm golden hour lighting, inviting atmosphere for children. ${NEGATIVE_SUFFIX}`;

    const openai = getOpenAI();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned from DALL-E");

    ensureDir(path.dirname(fullPath));
    await downloadImage(imageUrl, fullPath);

    await db
      .update(generatedAdventureImages)
      .set({ status: "completed" })
      .where(eq(generatedAdventureImages.id, record.id));

    console.log(`[AdventureImages] Generated city hero for ${cityName}: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error(`[AdventureImages] Failed to generate city hero for ${cityName}:`, error);
    await db
      .update(generatedAdventureImages)
      .set({ status: "failed" })
      .where(eq(generatedAdventureImages.id, record.id));
    return null;
  }
}

export async function generateStopImage(
  stopName: string,
  cityName: string,
  stopType?: string,
  country?: string
): Promise<string | null> {
  const citySlug = slugify(cityName);
  const stopSlug = slugify(stopName);
  const imagePath = `/images/adventure/stops/${citySlug}-${stopSlug}.png`;
  const fullPath = path.resolve(process.cwd(), "public", "images", "adventure", "stops", `${citySlug}-${stopSlug}.png`);

  if (fs.existsSync(fullPath)) {
    return imagePath;
  }

  const existing = await db
    .select()
    .from(generatedAdventureImages)
    .where(
      and(
        eq(generatedAdventureImages.imageType, "stop"),
        eq(generatedAdventureImages.citySlug, citySlug),
        eq(generatedAdventureImages.stopSlug, stopSlug)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].status === "completed" && fs.existsSync(fullPath)) {
      return existing[0].imagePath;
    }
    if (existing[0].status === "pending") {
      return null;
    }
    if (existing[0].status === "failed") {
      await db.delete(generatedAdventureImages).where(eq(generatedAdventureImages.id, existing[0].id));
    }
  }

  const [record] = await db
    .insert(generatedAdventureImages)
    .values({
      imageType: "stop",
      citySlug,
      stopSlug,
      cityName,
      stopName,
      imagePath,
      status: "pending",
    })
    .returning();

  try {
    const typeHint = stopType ? ` (${stopType})` : "";
    const countryHint = country ? `, ${country}` : "";

    // Use landmark-specific subject if available, otherwise fall back to generic
    const stopLower = stopName.toLowerCase();
    const overrideKeys = Object.keys(LANDMARK_PROMPT_OVERRIDES).sort((a, b) => b.length - a.length);
    const landmarkSubject = overrideKeys.find(k => stopLower.includes(k));
    const subject = landmarkSubject
      ? LANDMARK_PROMPT_OVERRIDES[landmarkSubject]
      : `${stopName}${typeHint} in ${cityName}${countryHint}, exterior view showing distinctive architecture, signage and setting of this specific venue, daytime, bright and welcoming`;

    const prompt = `${STOP_PHOTO_STYLE}. ${subject}. ${STOP_PHOTO_NEGATIVE}`;

    const openai = getOpenAI();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned from DALL-E");

    ensureDir(path.dirname(fullPath));
    await downloadImage(imageUrl, fullPath);

    await db
      .update(generatedAdventureImages)
      .set({ status: "completed" })
      .where(eq(generatedAdventureImages.id, record.id));

    console.log(`[AdventureImages] Generated stop image for ${stopName} in ${cityName}: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error(`[AdventureImages] Failed to generate stop image for ${stopName} in ${cityName}:`, error);
    await db
      .update(generatedAdventureImages)
      .set({ status: "failed" })
      .where(eq(generatedAdventureImages.id, record.id));
    return null;
  }
}

export async function getOrGenerateCityImage(cityName: string, country?: string): Promise<{ imagePath: string | null; status: "ready" | "generating" | "failed" }> {
  const citySlug = slugify(cityName);
  const staticPath = path.resolve(process.cwd(), "public", "images", "adventure", "cities", `${citySlug}.png`);

  if (fs.existsSync(staticPath)) {
    return { imagePath: `/images/adventure/cities/${citySlug}.png`, status: "ready" };
  }

  const existing = await db
    .select()
    .from(generatedAdventureImages)
    .where(and(eq(generatedAdventureImages.imageType, "city"), eq(generatedAdventureImages.citySlug, citySlug)))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].status === "pending") {
      return { imagePath: null, status: "generating" };
    }
    if (existing[0].status === "failed") {
      return { imagePath: null, status: "failed" };
    }
  }

  generateCityHeroImage(cityName, country).catch(() => {});
  return { imagePath: null, status: "generating" };
}

export async function getOrGenerateStopImage(
  stopName: string,
  cityName: string,
  stopType?: string,
  country?: string
): Promise<{ imagePath: string | null; status: "ready" | "generating" | "failed" }> {
  const citySlug = slugify(cityName);
  const stopSlug = slugify(stopName);
  const staticPath = path.resolve(process.cwd(), "public", "images", "adventure", "stops", `${citySlug}-${stopSlug}.png`);

  if (fs.existsSync(staticPath)) {
    return { imagePath: `/images/adventure/stops/${citySlug}-${stopSlug}.png`, status: "ready" };
  }

  const existing = await db
    .select()
    .from(generatedAdventureImages)
    .where(
      and(
        eq(generatedAdventureImages.imageType, "stop"),
        eq(generatedAdventureImages.citySlug, citySlug),
        eq(generatedAdventureImages.stopSlug, stopSlug)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].status === "pending") {
      return { imagePath: null, status: "generating" };
    }
    if (existing[0].status === "failed") {
      return { imagePath: null, status: "failed" };
    }
  }

  generateStopImage(stopName, cityName, stopType, country).catch(() => {});
  return { imagePath: null, status: "generating" };
}

export async function getGeneratedImagesForCity(cityName: string): Promise<GeneratedAdventureImage[]> {
  const citySlug = slugify(cityName);
  return db
    .select()
    .from(generatedAdventureImages)
    .where(and(eq(generatedAdventureImages.citySlug, citySlug), eq(generatedAdventureImages.status, "completed")));
}

type GeneratedAdventureImage = typeof generatedAdventureImages.$inferSelect;
