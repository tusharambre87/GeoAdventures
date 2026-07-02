import { generateCityStopPool } from '../planner/plannerService.js';
import { db } from '../db.js';
import { cityStopPoolCache } from '@workspace/db';
import { eq } from 'drizzle-orm';

async function main() {
  const pool = await generateCityStopPool('Duluth', 'USA');
  const nk = 'duluth:usa';
  await db.delete(cityStopPoolCache).where(eq(cityStopPoolCache.normalizedKey, nk));
  await db.insert(cityStopPoolCache).values({ city: 'Duluth', country: 'USA', normalizedKey: nk, stopPool: pool as any });
  console.log('Pool rebuilt:', pool.length, 'stops');
  pool.forEach(s => console.log(s.name, '|', s.familyAnchorType));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
