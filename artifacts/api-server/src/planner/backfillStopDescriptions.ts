/**
 * One-shot: generate description + bestTimeOfDay for every stop_library row
 * that currently has a null description. Processes one stop at a time.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run backfill:stop-desc
 */

import OpenAI from 'openai';
import { db } from '../db.js';
import { stopLibrary } from '@workspace/db';
import { isNull, eq } from 'drizzle-orm';

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? 'placeholder',
});

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function describeStop(name: string, stopType: string | null, city: string): Promise<{ description: string; bestTimeOfDay: string } | null> {
  const res = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: 'Family travel expert. Write one 2-sentence family-friendly description for the given place, exciting for kids and parents. Also pick the best time to visit. Return JSON only: {"description":"...","bestTimeOfDay":"morning|afternoon|evening|anytime"}',
      },
      {
        role: 'user',
        content: `Place: ${name} (${stopType ?? 'attraction'}) in ${city}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: 200,
  });

  const content = res.choices[0]?.message?.content;
  if (!content) { console.log(`  [WARN] empty response for ${name}`); return null; }

  try {
    const parsed = JSON.parse(content) as { description?: string; bestTimeOfDay?: string };
    if (!parsed.description) { console.log(`  [WARN] no description in response for ${name}: ${content}`); return null; }
    return { description: parsed.description, bestTimeOfDay: parsed.bestTimeOfDay ?? 'anytime' };
  } catch (e) {
    console.log(`  [WARN] JSON parse error for ${name}: ${content}`);
    return null;
  }
}

async function run() {
  const rows = await db
    .select({
      id: stopLibrary.id,
      name: stopLibrary.name,
      stopType: stopLibrary.stopType,
      city: stopLibrary.city,
      enrichment: stopLibrary.enrichment,
    })
    .from(stopLibrary)
    .where(isNull(stopLibrary.description));

  console.log(`[backfillStopDesc] ${rows.length} stops need descriptions`);

  let ok = 0;
  let fail = 0;

  for (const stop of rows) {
    process.stdout.write(`  ${stop.name} (${stop.city})... `);
    try {
      const result = await describeStop(stop.name, stop.stopType, stop.city);
      if (result) {
        const ex = (stop.enrichment as Record<string, unknown> | null) ?? {};
        await db.update(stopLibrary).set({
          description: result.description,
          enrichment: { ...ex, bestTimeOfDay: result.bestTimeOfDay } as any,
        } as any).where(eq(stopLibrary.id, stop.id));
        console.log(`OK — "${result.description.slice(0, 55)}..." [${result.bestTimeOfDay}]`);
        ok++;
      } else {
        console.log('SKIPPED (no result)');
        fail++;
      }
    } catch (err: any) {
      console.log(`ERR — ${err?.message}`);
      fail++;
    }
    await sleep(300);
  }

  console.log(`\n[backfillStopDesc] Done. ${ok} updated, ${fail} failed.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
