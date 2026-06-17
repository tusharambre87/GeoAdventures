---
name: Neon pool error handler
description: Why pg Pool must have an error listener or Neon connection drops crash Node.js hard
---

## Rule

Always attach `pool.on('error', (err) => { console.error(...) })` in `db.ts` immediately after creating the Pool.

**Why:** Neon (serverless Postgres) terminates idle client connections. When it does, the `pg` Pool emits an `'error'` event on the released client. Node.js requires at least one `'error'` listener on every EventEmitter; without one it re-throws the error as an uncaught exception, crashing the process immediately — no try/catch, no Promise rejection handler catches it. This manifests as:

```
node:events:486
      throw er; // Unhandled 'error' event
      ^
error: terminating connection due to administrator command
```

This is especially devastating in long-running scripts (backfills) where the pool idles between chunks.

**How to apply:** The handler is already in `artifacts/api-server/src/db.ts`:

```typescript
pool.on('error', (err) => {
  console.error('[db] Idle client error (Neon connection drop — ignored):', err.message);
});
```

If new standalone scripts import a fresh Pool (not the shared `db.ts` pool), they need their own `pool.on('error', ...)` too.
