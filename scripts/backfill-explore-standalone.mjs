/**
 * Standalone explore_cache backfill — for Google Cloud Shell or any machine
 * with Node.js 18+ and direct database + OpenAI access.
 *
 * Setup (one time):
 *   npm install pg openai
 *
 * Required env vars:
 *   DATABASE_URL   — Postgres connection string (e.g. postgresql://user:pass@host/db)
 *   OPENAI_API_KEY — Direct OpenAI key (sk-...)
 *
 * Run:
 *   DATABASE_URL="..." OPENAI_API_KEY="sk-..." node backfill-explore-standalone.mjs
 *
 * Expected runtime: ~1,300 stops × 3 bands × ~6 s / 3 concurrency ≈ 90 min
 * Safe to restart: already-completed rows are detected via skip-set and skipped.
 */

import pg from 'pg';
import OpenAI from 'openai';

const { Pool } = pg;

// ─── Config ───────────────────────────────────────────────────────────────────

const PAUSE_MS    = 2500;
const CONCURRENCY = 3;
const FORCE_REGEN = true; // set false after a clean complete run

const MODEL       = 'gpt-4o-mini'; // replaces gpt-5-mini (Replit-proxy-only)
const STORY_MODEL = 'gpt-4o';

const AGE_BANDS = [
  { band: 'young',  representativeAge: 5  },
  { band: 'middle', representativeAge: 8  },
  { band: 'older',  representativeAge: 12 },
];

// ─── Clients ──────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Safety ───────────────────────────────────────────────────────────────────

const PROHIBITED_CONTENT_TERMS = [
  'pornography', 'porn', 'xxx', 'nude', 'naked', 'explicit',
  'strip club', 'brothel', 'escort', 'prostitut',
  'red light district', 'red-light district',
  'sex show', 'sex tourism', 'erotic',
  'gambling den', 'betting shop',
  'cannabis', 'marijuana', 'weed', 'cocaine', 'heroin', 'meth',
  'drug tourism', 'profanity', 'obscen',
  'violence', 'gore', 'graphic', 'sexual', 'sexually',
  'rape', 'molest', 'abuse', 'suicide', 'self-harm',
  'terrorist', 'terrorism',
];

const PROHIBITED_STORY_TERMS = [
  'pornography', 'porn', 'xxx', 'erotic', 'erotica',
  'sex act', 'sexual intercourse', 'genitals',
  'masturbat', 'orgasm', 'prostitut', 'sex worker',
  'strip club', 'brothel', 'escort service', 'sex show', 'sex tourism',
  'fuck', 'shit', 'cunt', 'cock', 'pussy', 'bitch', 'asshole',
  'nigger', 'nigga', 'faggot', 'retard',
  'child abuse', 'child porn', 'paedophil', 'pedophil', 'molest', 'sexual assault',
];

function normalizeForCheck(text) {
  return text.toLowerCase()
    .replace(/[\s\-_\.\/\\,;:'"!?\(\)\[\]\{\}<>]+/g, ' ')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/8/g, 'b').replace(/9/g, 'g').replace(/@/g, 'a').replace(/\$/g, 's')
    .trim();
}

function isProhibitedContent(text) {
  const n = normalizeForCheck(text);
  return PROHIBITED_CONTENT_TERMS.some(t => n.includes(t));
}

function isProhibitedStoryContent(text) {
  const padded = ` ${normalizeForCheck(text)} `;
  return PROHIBITED_STORY_TERMS.some(t => padded.includes(` ${t} `));
}

const GEOQUEST_SAFETY_PROMPT = `
CRITICAL SAFETY RULES — YOU MUST FOLLOW THESE:

GeoQuest is a family-first travel platform for parents and children (ages 6-12). All generated content must be safe for children, interesting for families, and free of adult or offensive material.

PROHIBITED CONTENT — Never generate locations, references, or text related to:
- Adult content: pornography, strip clubs, sex shows, red-light districts, escort services, brothels, sex tourism, erotic museums, explicit nightlife venues
- Gambling: casinos, betting venues, gambling halls
- Drugs: cannabis cafés, drug tourism spots, locations associated with illegal substances
- Offensive venues: adult-themed shops, explicit entertainment, areas known for adult tourism
- Inappropriate language: sexual references, explicit descriptions, profanity, graphic or disturbing content

CONTENT TONE — All generated text must:
- Be suitable for children age 6+
- Avoid violence, sexual references, or disturbing topics
- Focus on curiosity, history, culture, or fun discoveries
- Sound like a friendly guide helping kids explore the world
- Feel curious, educational, welcoming, family-friendly, and inspiring

KID INTEREST TEST — Before including any location, ask: "Would a curious 8-year-old find something interesting here?" If no, skip it.

FAMILY CONTEXT — Always assume the traveler is a family with children aged 6-12.`;

// ─── Text helpers ─────────────────────────────────────────────────────────────

function stripForTTS(text) {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[•·▪▸►▶–—]\s*/gm, '')
    .replace(/\[[a-zA-Z][^\]]{0,40}\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function estimateDuration(text) {
  return Math.round((text.trim().split(/\s+/).length / 130) * 60);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Name normaliser (must match storage.ts) ──────────────────────────────────

function normalizeStopName(name) {
  return name
    .toLowerCase()
    .replace(/\bunited\s+states\b/g, 'us')
    .replace(/\bmount\b/g, 'mt')
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── AI: practical content ────────────────────────────────────────────────────

async function generatePracticalContent(stopName, stopType, destination, gpFacts) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + ' ' + (destination || ''))}`;

  const fmt = v => (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v);
  const gpLines = [];
  if (gpFacts) {
    if (gpFacts.gpHours               != null) gpLines.push(`- Hours: ${fmt(gpFacts.gpHours)}`);
    if (gpFacts.gpRating              != null) gpLines.push(`- Rating: ${fmt(gpFacts.gpRating)}/5`);
    if (gpFacts.gpPriceLevel          != null) gpLines.push(`- Price level: ${fmt(gpFacts.gpPriceLevel)} (0=free, 1=$, 2=$$, 3=$$$, 4=$$$$)`);
    if (gpFacts.gpAddressVerified     != null) gpLines.push(`- Address: ${fmt(gpFacts.gpAddressVerified)}`);
    if (gpFacts.gpWheelchairAccessible != null) gpLines.push(`- Wheelchair accessible: ${fmt(gpFacts.gpWheelchairAccessible)}`);
    if (gpFacts.gpPhone               != null) gpLines.push(`- Phone: ${fmt(gpFacts.gpPhone)}`);
    if (gpFacts.gpWebsite             != null) gpLines.push(`- Website: ${fmt(gpFacts.gpWebsite)}`);
  }
  const gpBlock = gpLines.length > 0
    ? `Verified facts from Google Places (use these as ground truth):\n${gpLines.join('\n')}\n\n`
    : '';

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a family travel expert with deep knowledge of real tourist attractions worldwide.
CRITICAL: Provide ONLY factual, accurate information based on your actual knowledge of the place named.
Do NOT invent details — only include information you are confident is accurate.
If unsure of exact hours/prices, say "varies" or "check website".
Return valid JSON only.`,
      },
      {
        role: 'user',
        content: `${gpBlock}Provide factual, real information about "${stopName}" (${stopType}) in ${destination || 'this area'} for families with kids aged 5-12.

Return JSON with this exact structure:
{
  "aboutArea": "2-3 sentence factual description of what this specific attraction actually is, what visitors see/do, and why families love it. Be specific to this actual place.",
  "openingHours": "Real opening hours if known, e.g. 'Mon-Sun 9 AM - 5 PM' or 'Check website for seasonal hours'",
  "entryCost": "Real admission price if known, e.g. 'Adults $25, Kids $15' or 'Free admission'",
  "parkingInfo": "Real parking situation for this location",
  "nearbyAttractions": [
    { "name": "Real name of nearby attraction", "type": "beach|nature|landmark|museum|park|viewpoint|activity", "distance": "e.g. 5 min walk", "description": "What it actually is" }
  ],
  "restaurants": [
    { "name": "Real restaurant near this attraction", "cuisine": "Type of food", "distance": "e.g. 3 min walk", "priceRange": "$|$$|$$$" }
  ],
  "kidFriendlyPlaces": [
    { "name": "Real kid-friendly spot nearby", "type": "playground|ice_cream|toy_store|arcade|splash_pad|zoo|aquarium|mini_gif", "distance": "e.g. 8 min walk", "description": "Brief description", "ageRange": "e.g. Ages 3-10 or All ages" }
  ],
  "gettingAround": "Real transportation/parking tip for this specific location",
  "tips": ["Real insider tip 1 specific to this place", "Real tip 2", "Real tip 3"],
  "reviews": [
    { "authorName": "First name + last initial only", "rating": 5, "text": "Realistic review text (2-3 sentences) referencing specific real features of this attraction", "relativeTime": "e.g. 2 weeks ago" }
  ],
  "rescueSuggestions": {
    "kidsHungry": "Nearest food option within 5 min walk from this stop",
    "kidsTired": "Shorter alternative or bench/rest spot right nearby",
    "moreFun": "One age-appropriate activity upgrade within easy reach",
    "weatherBad": "Best indoor alternative if outdoor, or nearest shelter if already indoor"
  }
}

Provide 4-6 real nearby attractions, 4-5 real restaurants, 3-4 kid-friendly spots, and 4 realistic family reviews.
The reviews must mention specific real details about ${stopName} — exhibits, features, or experiences that actually exist there.`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No content in response');
  const data = JSON.parse(content);

  return {
    aboutArea:         data.aboutArea || `${stopName} is a wonderful place to explore with your family.`,
    openingHours:      data.openingHours || undefined,
    entryCost:         data.entryCost || undefined,
    parkingInfo:       data.parkingInfo || undefined,
    nearbyAttractions: Array.isArray(data.nearbyAttractions) ? data.nearbyAttractions.slice(0, 6) : [],
    restaurants:       Array.isArray(data.restaurants)       ? data.restaurants.slice(0, 5)        : [],
    kidFriendlyPlaces: Array.isArray(data.kidFriendlyPlaces) ? data.kidFriendlyPlaces.slice(0, 4)  : undefined,
    gettingAround:     data.gettingAround || undefined,
    tips:              Array.isArray(data.tips)    ? data.tips.slice(0, 4)    : undefined,
    reviews:           Array.isArray(data.reviews) ? data.reviews.slice(0, 4) : undefined,
    googleMapsUrl,
    rescueSuggestions: data.rescueSuggestions || undefined,
  };
}

// ─── AI: missions ─────────────────────────────────────────────────────────────

async function generateMissions(stopName, stopType, destination, ageBand, storyHook) {
  const ageBandLabel = ageBand === 'young'  ? 'young (ages 4-6)'
    : ageBand === 'middle' ? 'middle (ages 7-9)'
    : 'older (ages 10-12)';

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are designing missions for children visiting ${stopName} in ${destination} on a family trip.
The child's age band is: ${ageBandLabel}.
The story they just heard introduced these specific elements: ${storyHook || `vivid details about ${stopName}`}

MISSION DESIGN RULES:
- Every mission must reference something specific to THIS stop.
- A child who listened to the story should have an advantage over one who didn't.
- Bad: "Learn about geysers." Good: "Find out why Old Faithful is predictable when other geysers aren't."
- enRouteBrief is exactly 1 sentence, written as a spy briefing: "Agent: [specific thing] is waiting for you."

MISSION TYPES BY AGE BAND:
young (4-6): use photographer and collector only.
middle (7-9): use detective and scientist primarily.
older (10-12): use scientist and reporter at full depth.

Return ONLY valid JSON:
{
  "missions": {
    "individual": [
      { "type": "detective|scientist|photographer|reporter|collector|decider", "enRouteBrief": "...", "instruction": "...", "proof": "photo|tap|number|text", "xp": 15 }
    ],
    "family": { "type": "family", "enRouteBrief": "Family mission incoming — you will need everyone for this one.", "instruction": "...", "proof": "tap", "xp": 20 }
  }
}
Generate exactly 3 individual missions.`,
        },
        {
          role: 'user',
          content: `Generate age-appropriate missions for a ${ageBandLabel} child visiting ${stopName} (${stopType}) in ${destination}.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ms = parsed?.missions;
    if (!ms?.individual || !Array.isArray(ms.individual) || ms.individual.length < 1 || !ms.family) {
      console.warn(`[generateMissions] Unexpected shape for "${stopName}" — skipping missions`);
      return null;
    }
    return { individual: ms.individual.slice(0, 3), family: ms.family };
  } catch (err) {
    console.error(`[generateMissions] Failed for "${stopName}":`, err.message);
    return null;
  }
}

// ─── AI: stories ──────────────────────────────────────────────────────────────

const STORY_SYSTEM_PROMPT = `You are a brilliant storyteller creating audio narration for families visiting a real place on a trip.

Your voice is warm, curious, and slightly conspiratorial — like a favourite relative who knows amazing things and loves sharing them. Not a teacher. Not a tour guide reading a pamphlet.

ABSOLUTE RULES:
- NO emojis. Not one.
- NO markdown. No asterisks, hashes, bullet symbols, or dashes introducing items.
- NO narrator stage directions or bracket cues of any kind.
- NO phrases like "imagine you are" or "close your eyes".
- NO generic content that could describe ANY place. Every sentence must be specific.
- NO "Welcome to..." or "Today we are visiting..." openings.
- Plain, natural spoken prose only.
${GEOQUEST_SAFETY_PROMPT}`;

async function generateTrackText(prompt, minWords, trackName) {
  const callOnce = async () => {
    const completion = await openai.chat.completions.create({
      model: STORY_MODEL,
      messages: [
        { role: 'system', content: STORY_SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
      max_completion_tokens: 2500,
      temperature: 0.72,
    });
    return (completion.choices[0]?.message?.content ?? '').trim();
  };

  let text = await callOnce();
  const wordCount = text.trim().split(/\s+/).length;
  console.log(`  [Story] ${trackName} first pass: ${wordCount} words`);

  if (wordCount < minWords) {
    console.warn(`  [Story] ${trackName} too short (${wordCount} < ${minWords}), retrying…`);
    text = await callOnce();
    console.log(`  [Story] ${trackName} retry: ${text.trim().split(/\s+/).length} words`);
  }

  return text;
}

async function generateStories(stopName, stopType, destination, youngestChildAge) {
  // Step 1: gather real facts
  let realFacts = [];
  try {
    const factsCompletion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a knowledgeable travel researcher and historian.
Recall SPECIFIC, REAL, ACCURATE information about a named place — not generic descriptions.
Think: founding story, key dates, notable people, construction challenges, surprising historical events, specific features visitors will see.`,
        },
        {
          role: 'user',
          content: `Give me 8 to 10 real, specific, accurate facts about ${stopName} (a ${stopType} in ${destination}).
Return JSON: { "facts": ["specific fact 1", "specific fact 2", "..."] }`,
        },
      ],
      max_completion_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const factsContent = factsCompletion.choices[0]?.message?.content;
    if (factsContent) {
      const parsed = JSON.parse(factsContent);
      realFacts = (parsed.facts || []).filter(f => !isProhibitedContent(f)).slice(0, 10);
    }
  } catch (err) {
    console.error('[generateStories] Step 1 facts gathering failed:', err.message);
  }

  const factsContext = realFacts.length > 0
    ? `\n\nReal, verified facts about ${stopName} — YOU MUST use these as the foundation:\n${realFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nEvery sentence must be specific to ${stopName}.`
    : `\nDraw on your knowledge of ${stopName} to write content specific to this place only.`;

  const age = youngestChildAge ?? 8;
  const ageInstruction = age <= 6
    ? `AUDIENCE: youngest child is ${age}. Short sentences, simple vocabulary, lead with wonder.`
    : age <= 8
    ? `AUDIENCE: youngest child is ${age}. Mix wonder with mild complexity.`
    : `AUDIENCE: youngest child is ${age}. Nuanced vocabulary welcome. Treat as smart, curious people.`;

  const mainPrompt = `Write a narrated audio story for kids visiting ${stopName} (a ${stopType} in ${destination}).
${factsContext}
${ageInstruction}
STRICT LENGTH: EXACTLY 950 to 1100 words. Return ONLY the story text.

Structure:
- Opening (~150 words): Drop listener straight into a vivid, specific scene.
- Middle (~750 words): Full human narrative. Weave in real facts. Include genuine surprises.
- Close (~150 words): End with a concrete physical challenge the child can do RIGHT NOW at ${stopName}.`;

  const quickHitsPrompt = `Write 6 to 8 surprising facts about ${stopName} (a ${stopType} in ${destination}) for kids, as flowing spoken paragraphs.
${factsContext}
${ageInstruction}
STRICT LENGTH: EXACTLY 280 to 350 words. Return ONLY the text.`;

  const historyPrompt = `Write the human story of ${stopName} (a ${stopType} in ${destination}) for kids — focus on a specific person making a specific decision.
${factsContext}
${ageInstruction}
STRICT LENGTH: EXACTLY 280 to 350 words. End by connecting that person's decision to what the child is standing next to today. Return ONLY the text.`;

  const storyHook = realFacts.slice(0, 3).join('; ');
  const ageBand = age <= 6 ? 'young' : age <= 9 ? 'middle' : 'older';

  const [mainRaw, quickHitsRaw, historyRaw, missionsResult] = await Promise.all([
    generateTrackText(mainPrompt, 700, 'main'),
    generateTrackText(quickHitsPrompt, 220, 'quickHits'),
    generateTrackText(historyPrompt, 220, 'history'),
    generateMissions(stopName, stopType, destination, ageBand, storyHook),
  ]);

  for (const [key, val] of [['main', mainRaw], ['quickHits', quickHitsRaw], ['history', historyRaw]]) {
    if (!val) throw new Error(`Empty response for story track: ${key}`);
    if (isProhibitedStoryContent(val)) throw new Error(`Prohibited content in story track: ${key}`);
  }

  const mainText      = stripForTTS(mainRaw);
  const quickHitsText = stripForTTS(quickHitsRaw);
  const historyText   = stripForTTS(historyRaw);

  console.log(`  [Story] Final word counts — main: ${mainText.trim().split(/\s+/).length}, quickHits: ${quickHitsText.trim().split(/\s+/).length}, history: ${historyText.trim().split(/\s+/).length}`);

  return {
    main:      { text: mainText,      durationSeconds: estimateDuration(mainText) },
    quickHits: { text: quickHitsText, durationSeconds: estimateDuration(quickHitsText) },
    history:   { text: historyText,   durationSeconds: estimateDuration(historyText) },
    missions:  missionsResult,
  };
}

// ─── AI: combined explore content ─────────────────────────────────────────────

async function getExploreContent(stopName, stopType, city, representativeAge, gpFacts) {
  const [practical, stories] = await Promise.all([
    generatePracticalContent(stopName, stopType, city, gpFacts),
    generateStories(stopName, stopType, city, representativeAge),
  ]);
  return {
    ...practical,
    stories: { main: stories.main, quickHits: stories.quickHits, history: stories.history },
    ...(stories.missions ? { missions: stories.missions } : {}),
  };
}

// ─── DB: upsert ───────────────────────────────────────────────────────────────

async function upsertExploreCache(stopName, cityGroup, stopType, data, ageBand) {
  const normalized       = normalizeStopName(stopName);
  const city             = cityGroup.toLowerCase().trim();
  const rescueSuggestions = data?.rescueSuggestions ?? null;

  await pool.query(
    `INSERT INTO explore_cache
       (normalized_name, city_group, stop_type, age_band, explore_data, rescue_suggestions, generated_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (normalized_name, city_group, age_band)
     DO UPDATE SET
       explore_data       = EXCLUDED.explore_data,
       rescue_suggestions = EXCLUDED.rescue_suggestions,
       updated_at         = NOW()`,
    [normalized, city, stopType, ageBand, JSON.stringify(data), JSON.stringify(rescueSuggestions)],
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function backfillExploreContent() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');

  console.log('Starting explore_cache backfill — 3 age bands per stop…');
  console.log(`FORCE_REGEN=${FORCE_REGEN}  CONCURRENCY=${CONCURRENCY}  MODEL=${MODEL}  STORY_MODEL=${STORY_MODEL}`);

  const stopsRes = await pool.query(
    `SELECT id, name, normalized_name, stop_type, city,
            gp_hours, gp_rating, gp_price_level, gp_address_verified,
            gp_wheelchair_accessible, gp_phone, gp_website
     FROM stop_library
     WHERE country IN ('USA', 'United States', 'united states', 'us')`,
  );
  const stops = stopsRes.rows;

  const total = stops.length * AGE_BANDS.length;
  console.log(`Total stops: ${stops.length} → ${total} total rows to generate`);

  const existingRes = await pool.query(
    `SELECT normalized_name, city_group, age_band FROM explore_cache`,
  );
  const skipSet = new Set(
    existingRes.rows.map(r => `${r.normalized_name}|${r.city_group}|${r.age_band}`),
  );
  console.log(`Skip-set loaded: ${skipSet.size} existing rows will be skipped`);

  let generated = 0, failed = 0, skipped = 0, stopsDone = 0;
  const failedItems = [];

  async function processStop(stop) {
    const stopNum = ++stopsDone;
    try {
      for (let bi = 0; bi < AGE_BANDS.length; bi++) {
        const { band, representativeAge } = AGE_BANDS[bi];

        const lookupName = stop.normalized_name || stop.name;
        const skipKey    = `${lookupName}|${(stop.city ?? '').toLowerCase().trim()}|${band}`;

        if (!FORCE_REGEN && skipSet.has(skipKey)) {
          skipped++;
          console.log(`SKIP: ${skipKey}`);
          continue;
        }

        console.log(`[${stopNum}/${stops.length}] ${band} — ${stop.name} (${stop.city ?? ''})`);

        try {
          const gpFacts = {
            gpHours:                stop.gp_hours,
            gpRating:               stop.gp_rating,
            gpPriceLevel:           stop.gp_price_level,
            gpAddressVerified:      stop.gp_address_verified,
            gpWheelchairAccessible: stop.gp_wheelchair_accessible,
            gpPhone:                stop.gp_phone,
            gpWebsite:              stop.gp_website,
          };

          const content = await getExploreContent(
            stop.name,
            stop.stop_type ?? 'attraction',
            stop.city ?? '',
            representativeAge,
            gpFacts,
          );

          await upsertExploreCache(
            lookupName,
            stop.city ?? '',
            stop.stop_type ?? '',
            content,
            band,
          );

          generated++;
        } catch (err) {
          failed++;
          failedItems.push(`${band}:${stop.name} (${stop.city ?? ''})`);
          console.error(`  Failed [${band}] ${stop.name} — ${err.message}`);
        }

        if (bi < AGE_BANDS.length - 1) await sleep(PAUSE_MS);
      }
    } catch (err) {
      failed++;
      console.error(`SKIP_ERROR: ${stop.name} (${stop.city ?? ''}) — ${err.message}`);
    }
  }

  for (let i = 0; i < stops.length; i += CONCURRENCY) {
    const chunk = stops.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(stop => processStop(stop)));

    if ((i / CONCURRENCY) % 10 === 9) {
      console.log(`--- Progress: ${stopsDone}/${stops.length} stops | generated=${generated} skipped=${skipped} failed=${failed} ---`);
    }
  }

  console.log('\nBackfill complete');
  console.log(`Skipped   : ${skipped}`);
  console.log(`Generated : ${generated}`);
  console.log(`Failed    : ${failed}`);
  if (failedItems.length > 0) {
    console.log('Failed items:', failedItems.slice(0, 20).join(', '));
  }

  await pool.end();
}

backfillExploreContent()
  .then(() => process.exit(0))
  .catch(err => { console.error('Fatal error:', err); process.exit(1); });
