import { pool } from "@workspace/db";

let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS public_rate_limits (
           key      TEXT        PRIMARY KEY,
           count    INTEGER     NOT NULL DEFAULT 1,
           reset_at TIMESTAMPTZ NOT NULL
         )`,
      )
      .then(() => undefined)
      .catch(() => {
        tableReady = null;
      });
  }
  return tableReady!;
}

/**
 * Atomically check and increment a per-key rate limit counter using PostgreSQL.
 * Durable and shared across all server instances.
 *
 * Returns { allowed: true } when under limit, { allowed: false } when exceeded.
 * Fails open (allows the request) if the database is unreachable, so a DB outage
 * does not turn into an application outage.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean }> {
  try {
    await ensureTable();
    const windowSec = Math.ceil(windowMs / 1000);
    const result = await pool.query<{ count: number }>(
      `INSERT INTO public_rate_limits (key, count, reset_at)
       VALUES ($1, 1, NOW() + ($2 * INTERVAL '1 second'))
       ON CONFLICT (key) DO UPDATE SET
         count    = CASE WHEN public_rate_limits.reset_at < NOW()
                         THEN 1
                         ELSE public_rate_limits.count + 1
                    END,
         reset_at = CASE WHEN public_rate_limits.reset_at < NOW()
                         THEN NOW() + ($2 * INTERVAL '1 second')
                         ELSE public_rate_limits.reset_at
                    END
       RETURNING count`,
      [key, windowSec],
    );
    const count = result.rows[0]?.count ?? 1;
    return { allowed: count <= maxRequests };
  } catch {
    return { allowed: true };
  }
}
