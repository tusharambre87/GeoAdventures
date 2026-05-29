import OpenAI from "openai";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { db } from "./db";
import { generatedFamilyPhotos } from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// ─── Global rules (from version-1.0 spec) ────────────────────────────────────

const STYLE_BLOCK =
  "Natural lighting, slightly imperfect framing, not stock photo, not staged, casual family travel moment, realistic clothing and body language, no cinematic over-polish.";

const IMPERFECTION_OPTIONS = [
  "Slight asymmetry, natural spacing, minor real-world clutter, and believable body posture.",
  "One child mid-step, slight tilt to the frame, uneven spacing between family members.",
  "Minor background clutter, slight crop imperfection, one adult with relaxed but imperfect posture.",
  "Natural crowd clutter in the background, slight off-center framing, family slightly asymmetric.",
];

const NEGATIVE_BLOCK =
  "perfect symmetry, studio lighting, overly cinematic depth of field, stock photo feel, staged expressions, everyone unnaturally posed, empty background, overly clean composition";

const CAMERA_BEHAVIOR: Record<string, string> = {
  memory: "everyone loosely looking at the camera, casual smiles, slightly imperfect posture",
  candid: "no one looking at the camera, natural attention directed to surroundings",
  interaction: "family members looking at each other or reacting to each other",
  movement: "walking, turning, reaching, or moving naturally through the scene",
};

// ─── Pose templates (from version-1.0 spec) ──────────────────────────────────

export const POSE_TEMPLATES: Record<string, { type: string; description: string; bestFor: string[] }> = {
  walk_away_look_back: {
    type: "movement",
    description: "family walking away holding hands, one child looking back toward camera",
    bestFor: ["landmark", "street", "water", "park"],
  },
  group_hug: {
    type: "memory",
    description: "family standing close together with slight lean-in and arms around each other",
    bestFor: ["landmark", "park", "food"],
  },
  parent_child_interaction: {
    type: "interaction",
    description: "parent talking to child, pointing something out, child reacting naturally",
    bestFor: ["museum", "street", "landmark", "food"],
  },
  classic_memory_shot: {
    type: "memory",
    description: "family paused and facing the camera in a natural tourist photo",
    bestFor: ["landmark", "street", "water", "museum"],
  },
  kid_leading: {
    type: "movement",
    description: "child slightly ahead, pulling or guiding parents",
    bestFor: ["park", "street", "landmark"],
  },
  side_by_side_wander: {
    type: "candid",
    description: "family walking side by side, talking, exploring, no one looking at camera",
    bestFor: ["street", "park", "water"],
  },
};

// ─── Category rules ───────────────────────────────────────────────────────────

const CATEGORY_RULES: Record<string, { sceneRules: string[]; extraDetails: string[] }> = {
  landmark: {
    sceneRules: [
      "landmark clearly recognizable in the background",
      "family positioned naturally in the environment",
      "landmark visible but not perfectly centered",
    ],
    extraDetails: [
      "tourist foot traffic in the distance",
      "real outdoor atmosphere",
      "slight asymmetry in spacing",
    ],
  },
  food: {
    sceneRules: [
      "local food visible on the table or in hand",
      "slightly messy table or mid-meal realism",
      "family engaged in eating or reacting to food",
    ],
    extraDetails: [
      "plates, cups, napkins, or utensils visible",
      "natural restaurant or street food environment",
      "not perfectly plated or styled",
    ],
  },
  museum: {
    sceneRules: [
      "visible exhibit, display, artifact, or museum setting",
      "family not blocking the entire exhibit",
      "indoor lighting should feel realistic",
    ],
    extraDetails: [
      "slightly dim or mixed indoor lighting",
      "quiet observational body language",
      "natural curiosity from child",
    ],
  },
  park: {
    sceneRules: [
      "greenery, open space, or play area visible",
      "family relaxed and casual",
      "outdoor leisure atmosphere",
    ],
    extraDetails: [
      "kids moving or playing naturally",
      "slight background activity",
      "not empty or overly staged",
    ],
  },
  water: {
    sceneRules: [
      "beach, lake, river, or shoreline visible",
      "wind or movement in clothes or hair",
      "family interacting naturally with the waterfront",
    ],
    extraDetails: [
      "slightly bright natural light",
      "some splash, sand, or shoreline texture",
      "horizon can be slightly imperfect",
    ],
  },
  street: {
    sceneRules: [
      "street, buildings, shops, or sidewalk visible",
      "family shown exploring, pausing, or walking",
      "real-world urban clutter allowed",
    ],
    extraDetails: [
      "background pedestrians allowed",
      "casual city energy",
      "not overly clean or empty",
    ],
  },
};

// ─── Public input/output types ────────────────────────────────────────────────

export interface FamilyPhotoInput {
  city: string;
  country?: string;
  place?: string;
  category: "landmark" | "food" | "museum" | "park" | "water" | "street";
  poseTemplate: keyof typeof POSE_TEMPLATES;
  family: {
    ethnicity: string;
    groupSize: number;
    adults?: Array<{ role: string; ageRange: string }>;
    children?: Array<{ role: string; age: number }>;
  };
  styleOverrides?: {
    clothing?: string;
    mood?: string;
  };
}

export interface PromptMetadata {
  category: string;
  poseType: string;
  poseTemplate: string;
  familyEthnicity: string;
  familyGroupSize: string;
  city: string;
  place: string | null;
  country: string | null;
  source?: string;
  suffix?: string;
}

export interface AssembledPrompt {
  prompt: string;
  metadata: PromptMetadata;
  warnings: string[];
}

// ─── Prompt assembly ──────────────────────────────────────────────────────────

function pickImperfection(seed: string): string {
  const idx = Math.abs(seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % IMPERFECTION_OPTIONS.length;
  return IMPERFECTION_OPTIONS[idx];
}

function buildFamilyDescription(family: FamilyPhotoInput["family"]): string {
  const parts: string[] = [];
  if (family.groupSize) {
    parts.push(`a ${family.ethnicity} family of ${family.groupSize}`);
  }
  const kidsDesc: string[] = [];
  if (family.children?.length) {
    family.children.forEach(c => {
      kidsDesc.push(`one ${c.role} age ${c.age}`);
    });
    parts.push(`with ${kidsDesc.join(" and ")}`);
  } else {
    parts.push("with young kids");
  }
  return parts.join(" ");
}

function buildFamilyRelationships(family: FamilyPhotoInput["family"]): string {
  const parts: string[] = [];
  if (family.adults?.length) {
    parts.push(family.adults.map(a => `a ${a.role} in their ${a.ageRange}`).join(" and "));
  } else {
    parts.push("parents");
  }
  if (family.children?.length) {
    parts.push(family.children.map(c => `a ${c.role} age ${c.age}`).join(" and "));
  }
  return parts.join(", ");
}

function selectBestPose(
  category: string,
  preferredPose: keyof typeof POSE_TEMPLATES,
): { pose: keyof typeof POSE_TEMPLATES; warning: string | null } {
  const requested = POSE_TEMPLATES[preferredPose];
  if (requested && requested.bestFor.includes(category)) {
    return { pose: preferredPose, warning: null };
  }
  const compatible = Object.entries(POSE_TEMPLATES).find(([, p]) => p.bestFor.includes(category));
  const fallback = (compatible ? compatible[0] : "classic_memory_shot") as keyof typeof POSE_TEMPLATES;
  const warning = `Pose "${preferredPose}" is not recommended for category "${category}" (best for: ${requested?.bestFor.join(", ") ?? "unknown"}). Auto-selected "${fallback}" instead.`;
  return { pose: fallback, warning };
}

export function assembleFamilyPhotoPrompt(input: FamilyPhotoInput): AssembledPrompt {
  const { pose, warning } = selectBestPose(input.category, input.poseTemplate);
  const warnings: string[] = warning ? [warning] : [];

  const poseData = POSE_TEMPLATES[pose];
  const category = CATEGORY_RULES[input.category] || CATEGORY_RULES.landmark;
  const familyDesc = buildFamilyDescription(input.family);
  const familyRelationships = buildFamilyRelationships(input.family);
  const familyGroupSize = `family of ${input.family.groupSize}`;

  const placeStr = input.place || input.city;
  const locationDetails = input.place
    ? `${input.place} in ${input.city}${input.country ? `, ${input.country}` : ""}`
    : `${input.city}${input.country ? `, ${input.country}` : ""}`;

  const cameraIntent = CAMERA_BEHAVIOR[poseData.type] || CAMERA_BEHAVIOR.memory;
  const imperfection = pickImperfection(`${input.city}-${input.category}-${pose}`);

  const blocks = [
    `A real travel photo of ${familyDesc} visiting ${placeStr} in ${input.city}.`,
    `${familyRelationships}. Family members should visibly look related and age-appropriate.`,
    `The setting clearly shows ${locationDetails}.`,
    `${poseData.description}. ${cameraIntent}.`,
    `${category.sceneRules.join(". ")}. ${category.extraDetails.join(". ")}.`,
    STYLE_BLOCK,
    imperfection,
    `Avoid: ${NEGATIVE_BLOCK}.`,
  ];

  const prompt = blocks.join(" ");

  return {
    prompt,
    warnings,
    metadata: {
      category: input.category,
      poseType: poseData.type,
      poseTemplate: pose,
      familyEthnicity: input.family.ethnicity,
      familyGroupSize,
      city: input.city,
      place: input.place || null,
      country: input.country || null,
    },
  };
}

// ─── DALL-E generation ────────────────────────────────────────────────────────

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
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(outputPath);
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

export async function generateFamilyPhoto(
  input: FamilyPhotoInput
): Promise<{ id: string; imageUrl: string | null; prompt: string; metadata: PromptMetadata; warnings: string[] } | null> {
  const assembled = assembleFamilyPhotoPrompt(input);
  const citySlug = slugify(input.city);
  const catSlug = slugify(input.category);
  const poseSlug = slugify(assembled.metadata.poseTemplate);
  const timestamp = Date.now();
  const fileName = `${citySlug}-${catSlug}-${poseSlug}-${timestamp}.png`;
  const imagePath = `/family-photos/${fileName}`;
  const fullPath = path.resolve(process.cwd(), "public", "family-photos", fileName);

  const [record] = await db
    .insert(generatedFamilyPhotos)
    .values({
      city: input.city,
      country: input.country || null,
      place: input.place || null,
      category: input.category,
      poseTemplate: assembled.metadata.poseTemplate,
      poseType: assembled.metadata.poseType,
      familyEthnicity: input.family.ethnicity,
      familyGroupSize: assembled.metadata.familyGroupSize,
      assembledPrompt: assembled.prompt,
      promptMetadata: assembled.metadata as PromptMetadata,
      status: "pending",
      isStatic: false,
      generatedAt: new Date(),
    })
    .returning();

  try {
    const openai = getOpenAI();
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: assembled.prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image URL returned from DALL-E");

    ensureDir(path.dirname(fullPath));
    await downloadImage(imageUrl, fullPath);

    await db
      .update(generatedFamilyPhotos)
      .set({ imageUrl: imagePath, status: "pending" })
      .where(eq(generatedFamilyPhotos.id, record.id));

    console.log(`[FamilyPhotos] Generated: ${imagePath}`);
    return { id: record.id, imageUrl: imagePath, prompt: assembled.prompt, metadata: assembled.metadata, warnings: assembled.warnings };
  } catch (error) {
    console.error(`[FamilyPhotos] Generation failed:`, error);
    await db
      .update(generatedFamilyPhotos)
      .set({ status: "rejected", rejectionReason: "Generation failed" })
      .where(eq(generatedFamilyPhotos.id, record.id));
    return null;
  }
}

// ─── Static photo seeding ─────────────────────────────────────────────────────

const STATIC_MEMORY_IMAGES: Array<{
  city: string;
  country: string;
  imageUrl: string;
  category: string;
  poseTemplate: string;
  poseType: string;
  suffix: string;
}> = [
  { city: "amsterdam", country: "Netherlands", imageUrl: "/memory-images/amsterdam-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "amsterdam", country: "Netherlands", imageUrl: "/memory-images/amsterdam-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "amsterdam", country: "Netherlands", imageUrl: "/memory-images/amsterdam-food.png", category: "food", poseTemplate: "parent_child_interaction", poseType: "interaction", suffix: "food" },
  { city: "amsterdam", country: "Netherlands", imageUrl: "/memory-images/amsterdam-museum.png", category: "museum", poseTemplate: "parent_child_interaction", poseType: "interaction", suffix: "museum" },
  { city: "bangkok", country: "Thailand", imageUrl: "/memory-images/bangkok-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "bangkok", country: "Thailand", imageUrl: "/memory-images/bangkok-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "bangkok", country: "Thailand", imageUrl: "/memory-images/bangkok-landmark.png", category: "landmark", poseTemplate: "group_hug", poseType: "memory", suffix: "landmark" },
  { city: "bangkok", country: "Thailand", imageUrl: "/memory-images/bangkok-museum.png", category: "museum", poseTemplate: "parent_child_interaction", poseType: "interaction", suffix: "museum" },
  { city: "buenos-aires", country: "Argentina", imageUrl: "/memory-images/buenos-aires-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "buenos-aires", country: "Argentina", imageUrl: "/memory-images/buenos-aires-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "buenos-aires", country: "Argentina", imageUrl: "/memory-images/buenos-aires-food.png", category: "food", poseTemplate: "parent_child_interaction", poseType: "interaction", suffix: "food" },
  { city: "cairo", country: "Egypt", imageUrl: "/memory-images/cairo-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "cairo", country: "Egypt", imageUrl: "/memory-images/cairo-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "chicago", country: "USA", imageUrl: "/memory-images/chicago-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "chicago", country: "USA", imageUrl: "/memory-images/chicago-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "dubai", country: "UAE", imageUrl: "/memory-images/dubai-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "dubai", country: "UAE", imageUrl: "/memory-images/dubai-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "johannesburg", country: "South Africa", imageUrl: "/memory-images/johannesburg-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "johannesburg", country: "South Africa", imageUrl: "/memory-images/johannesburg-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "london", country: "UK", imageUrl: "/memory-images/london-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "london", country: "UK", imageUrl: "/memory-images/london-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "los-angeles", country: "USA", imageUrl: "/memory-images/los-angeles-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "los-angeles", country: "USA", imageUrl: "/memory-images/los-angeles-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "melbourne", country: "Australia", imageUrl: "/memory-images/melbourne-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "melbourne", country: "Australia", imageUrl: "/memory-images/melbourne-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "nairobi", country: "Kenya", imageUrl: "/memory-images/nairobi-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "nairobi", country: "Kenya", imageUrl: "/memory-images/nairobi-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "new-york", country: "USA", imageUrl: "/memory-images/new-york-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "new-york", country: "USA", imageUrl: "/memory-images/new-york-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "paris", country: "France", imageUrl: "/memory-images/paris-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "paris", country: "France", imageUrl: "/memory-images/paris-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "rio-de-janeiro", country: "Brazil", imageUrl: "/memory-images/rio-de-janeiro-parent.png", category: "water", poseTemplate: "group_hug", poseType: "memory", suffix: "parent" },
  { city: "rio-de-janeiro", country: "Brazil", imageUrl: "/memory-images/rio-de-janeiro-kids.png", category: "water", poseTemplate: "walk_away_look_back", poseType: "movement", suffix: "kids" },
  { city: "rome", country: "Italy", imageUrl: "/memory-images/rome-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "rome", country: "Italy", imageUrl: "/memory-images/rome-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "singapore", country: "Singapore", imageUrl: "/memory-images/singapore-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "singapore", country: "Singapore", imageUrl: "/memory-images/singapore-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "tokyo", country: "Japan", imageUrl: "/memory-images/tokyo-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "tokyo", country: "Japan", imageUrl: "/memory-images/tokyo-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
  { city: "toronto", country: "Canada", imageUrl: "/memory-images/toronto-parent.png", category: "landmark", poseTemplate: "classic_memory_shot", poseType: "memory", suffix: "parent" },
  { city: "toronto", country: "Canada", imageUrl: "/memory-images/toronto-kids.png", category: "park", poseTemplate: "kid_leading", poseType: "movement", suffix: "kids" },
];

export async function seedStaticFamilyPhotos(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const img of STATIC_MEMORY_IMAGES) {
    try {
      const existing = await db
        .select({ id: generatedFamilyPhotos.id })
        .from(generatedFamilyPhotos)
        .where(and(
          eq(generatedFamilyPhotos.city, img.city),
          eq(generatedFamilyPhotos.imageUrl, img.imageUrl),
        ))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const assembled = `Static photo: ${img.city} ${img.category} (${img.suffix})`;
      const metadata: PromptMetadata = {
        category: img.category,
        poseType: img.poseType,
        poseTemplate: img.poseTemplate,
        familyEthnicity: "diverse families",
        familyGroupSize: "family of 4",
        city: img.city,
        place: null,
        country: img.country,
        source: "static_seed",
        suffix: img.suffix,
      };
      await db.insert(generatedFamilyPhotos).values({
        city: img.city,
        country: img.country,
        place: null,
        category: img.category,
        poseTemplate: img.poseTemplate,
        poseType: img.poseType,
        familyEthnicity: "diverse families",
        familyGroupSize: "family of 4",
        assembledPrompt: assembled,
        promptMetadata: metadata as PromptMetadata,
        imageUrl: img.imageUrl,
        status: "approved",
        isStatic: true,
        qualityScore: 4,
        approvedAt: new Date(),
        generatedAt: new Date(),
      });
      inserted++;
    } catch (err) {
      console.error(`[FamilyPhotos] Seed error for ${img.city}:`, err);
    }
  }

  console.log(`[FamilyPhotos] Seed complete — inserted: ${inserted}, skipped: ${skipped}`);
  return { inserted, skipped };
}

// ─── For-trip query ───────────────────────────────────────────────────────────

type FamilyPhotoRow = { id: string; imageUrl: string | null; category: string; poseType: string; city: string };

export async function getFamilyPhotosForCity(
  city: string,
  categories?: string | string[],
  limit = 4,
): Promise<Array<{ id: string; imageUrl: string; category: string; poseType: string; city: string }>> {
  const citySlug = city.toLowerCase().replace(/\s+/g, "-");
  const categoryMix: string[] = categories
    ? (Array.isArray(categories) ? categories : categories.split(",").map(c => c.trim()).filter(Boolean))
    : [];

  const baseSelect = {
    id: generatedFamilyPhotos.id,
    imageUrl: generatedFamilyPhotos.imageUrl,
    category: generatedFamilyPhotos.category,
    poseType: generatedFamilyPhotos.poseType,
    city: generatedFamilyPhotos.city,
  };

  let cityRows: FamilyPhotoRow[] = await db
    .select(baseSelect)
    .from(generatedFamilyPhotos)
    .where(and(eq(generatedFamilyPhotos.city, citySlug), eq(generatedFamilyPhotos.status, "approved")))
    .limit(50);

  if (cityRows.length > 0) {
    if (categoryMix.length > 0) {
      const ranked: FamilyPhotoRow[] = [];
      const usedIds = new Set<string>();
      for (const cat of categoryMix) {
        const match = cityRows.find(r => r.category === cat && !usedIds.has(r.id));
        if (match) { ranked.push(match); usedIds.add(match.id); }
        if (ranked.length >= limit) break;
      }
      if (ranked.length < limit) {
        for (const r of cityRows) {
          if (!usedIds.has(r.id)) { ranked.push(r); usedIds.add(r.id); }
          if (ranked.length >= limit) break;
        }
      }
      return ranked.slice(0, limit).filter(r => r.imageUrl) as Array<{ id: string; imageUrl: string; category: string; poseType: string; city: string }>;
    }
    return cityRows.slice(0, limit).filter(r => r.imageUrl) as Array<{ id: string; imageUrl: string; category: string; poseType: string; city: string }>;
  }

  const staticRows: FamilyPhotoRow[] = await db
    .select(baseSelect)
    .from(generatedFamilyPhotos)
    .where(and(eq(generatedFamilyPhotos.status, "approved"), eq(generatedFamilyPhotos.isStatic, true)))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  if (staticRows.length > 0) {
    return staticRows.filter(r => r.imageUrl) as Array<{ id: string; imageUrl: string; category: string; poseType: string; city: string }>;
  }

  const randomRows: FamilyPhotoRow[] = await db
    .select(baseSelect)
    .from(generatedFamilyPhotos)
    .where(eq(generatedFamilyPhotos.status, "approved"))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  return randomRows.filter(r => r.imageUrl) as Array<{ id: string; imageUrl: string; category: string; poseType: string; city: string }>;
}
