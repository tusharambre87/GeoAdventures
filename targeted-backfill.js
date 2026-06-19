const { Pool } = require('pg');
const OpenAI = require('openai');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STOPS = [
  { city: 'Austin', normalized_name: 'mount bonnell', name: 'Mount Bonnell' },
  { city: 'Bar Harbor', normalized_name: 'mount desert island', name: 'Mount Desert Island' },
  { city: 'Denver', normalized_name: 'mount evans scenic byway', name: 'Mount Evans Scenic Byway' },
  { city: 'Los Angeles', normalized_name: 'in-n-out burger sunset', name: 'In-N-Out Burger Sunset' },
  { city: 'Portland', normalized_name: 'mount tabor park', name: 'Mount Tabor Park' },
  { city: 'St. Louis', normalized_name: 'saint louis science center', name: 'Saint Louis Science Center' },
  { city: 'St. Louis', normalized_name: 'saint louis zoo', name: 'Saint Louis Zoo' },
  { city: 'St. Louis', normalized_name: 'saint louis zoo forest park', name: 'Saint Louis Zoo (Forest Park)' },
  { city: 'Washington DC', normalized_name: 'united states botanic garden', name: 'United States Botanic Garden' },
  { city: 'Washington DC', normalized_name: 'united states capitol', name: 'United States Capitol' },
];

const AGE_BANDS = [
  { band: 'young', label: 'young children aged 4-6' },
  { band: 'middle', label: 'children aged 7-9' },
  { band: 'older', label: 'children aged 10-12' },
];

async function generateForStop(stop, ageBand) {
  const cityGroup = stop.city.toLowerCase();
  
  const [mainStory, quickHits, history, missions] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Write a 2-3 sentence engaging story about ${stop.name} in ${stop.city} for ${ageBand.label}. Make it exciting and kid-friendly.` }],
      max_tokens: 200,
    }),
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Give 3 quick interesting facts about ${stop.name} in ${stop.city} for ${ageBand.label}. Format as JSON array of strings: ["fact1","fact2","fact3"]. Return only the JSON array.` }],
      max_tokens: 200,
    }),
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Write 1-2 sentences of historical context about ${stop.name} in ${stop.city} appropriate for ${ageBand.label}.` }],
      max_tokens: 150,
    }),
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `Create a simple activity mission for ${ageBand.label} at ${stop.name} in ${stop.city}. Return JSON: {"type":"detective","title":"Mission title","description":"What to do","question":"A question to answer"}. Return only the JSON.` }],
      max_tokens: 200,
    }),
  ]);

  let quickHitsArr = [];
  try { quickHitsArr = JSON.parse(quickHits.choices[0].message.content.trim()); } catch {}

  let missionObj = {};
  try { missionObj = JSON.parse(missions.choices[0].message.content.trim()); } catch {}

  return {
    city_group: cityGroup,
    normalized_name: stop.normalized_name,
    age_band: ageBand.band,
    main_story: mainStory.choices[0].message.content.trim(),
    quick_hits: quickHitsArr,
    history: history.choices[0].message.content.trim(),
    missions: missionObj,
  };
}

async function main() {
  let generated = 0;
  for (const stop of STOPS) {
    for (const band of AGE_BANDS) {
      try {
        const row = await generateForStop(stop, band);
        await pool.query(`
          INSERT INTO explore_cache (city_group, normalized_name, age_band, main_story, quick_hits, history, missions)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (city_group, normalized_name, age_band) DO UPDATE
          SET main_story = EXCLUDED.main_story, quick_hits = EXCLUDED.quick_hits,
              history = EXCLUDED.history, missions = EXCLUDED.missions
        `, [row.city_group, row.normalized_name, row.age_band,
            row.main_story, JSON.stringify(row.quick_hits),
            row.history, JSON.stringify(row.missions)]);
        generated++;
        console.log(`✓ ${stop.name} / ${band.band} (${generated}/30)`);
      } catch (e) {
        console.error(`✗ ${stop.name} / ${band.band}:`, e.message);
      }
    }
  }
  console.log(`Done. Generated: ${generated}/30`);
  await pool.end();
}

main();
