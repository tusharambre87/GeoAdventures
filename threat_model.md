# Threat Model

## Project Overview

RoamUs is a public family travel journaling platform with an Express API, a React landing site, and an Expo mobile client. The production security posture is dominated by the API server in `artifacts/api-server`, which handles user authentication, trip creation and journaling, planner generation, payments, push subscriptions, and several public utility/share endpoints backed by PostgreSQL.

Production assumptions for future scans:
- Only production-reachable surfaces matter; `artifacts/mockup-sandbox` is dev-only unless proven otherwise.
- `NODE_ENV` is `production` in deployed environments.
- Replit provides TLS at the edge, so transport encryption is assumed.
- This deployment is public (`https://roamus.app`), so unauthenticated endpoints are internet-reachable.

## Assets

- **User accounts and sessions** — Replit Auth sessions for web users and JWT bearer tokens for mobile users. Compromise enables access to family trip data and paid features.
- **Family trip content** — trip metadata, visited stops, photos, kid responses, parent notes, journal/replay content, and planner drafts. This is the highest-sensitivity user content in the app.
- **Payment state** — Stripe customer IDs, subscription state, trip unlocks, promo code redemptions, and webhook-driven entitlement changes.
- **Admin capabilities** — admin dashboards, analytics, content seeding, and operational routes. Abuse would expose broad user and business data.
- **Application secrets and third-party keys** — session secret, Stripe credentials, OpenAI credentials, database connection string, and any admin/export keys.

## Trust Boundaries

- **Client to API** — browser/mobile requests are untrusted and must be validated, authenticated, rate-limited where appropriate, and authorized server-side.
- **Authenticated user to other users' data** — most trip, planner, journal, and progress objects are per-user and must be ownership-checked on every read/write.
- **Public to authenticated/admin surfaces** — the repo mixes public endpoints with user and admin endpoints inside one large route file, so accidental exposure/regression is a recurring risk.
- **API to PostgreSQL** — storage methods can expose broad data if route-level authorization is missing.
- **API to third parties** — Stripe, OpenAI, geolocation/weather/content providers, and email services introduce cost, data exposure, and spoofing risks if invoked from public endpoints without controls.

## Scan Anchors

- **Primary production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/routes.ts`, `artifacts/api-server/src/adminRoutes.ts`.
- **Auth boundary:** `artifacts/api-server/src/replitAuth.ts` provides session auth for web and JWT bearer auth for mobile.
- **Highest-risk data paths:** trip/journal/replay/share routes, planner routes, payment routes, admin routes, physical-game routes, and any route accepting a caller-supplied `userId` or other raw object identifier.
- **Public/share surfaces:** contact, waitlist, pricing, share-data, challenge/share endpoints, guest trip flows, support uploads, AI helper/TTS endpoints, cron-style email triggers, and utility endpoints under `/api/travel/*` that do not require auth.
- **Dev-only area to usually ignore:** `artifacts/mockup-sandbox/`.

## Threat Categories

### Spoofing

The application supports both session-based web auth and bearer-token mobile auth. Protected endpoints must validate the caller on every request and must never trust caller-supplied identity fields like `userId` when the authenticated principal is already known from `req.user`. Public callback/webhook-style routes must verify provider signatures rather than trusting request shape alone.

### Tampering

Family trip data, planner drafts, progress records, and early-access flags must only be modifiable by their owners or admins. Because the codebase contains many routes in one file and several helper/storage methods that accept IDs directly, the main guarantee is that every mutation must derive the acting user from server-side auth context and then enforce object ownership before reading or writing.

### Information Disclosure

Trips, journals, replay data, planner data, and gameplay/eligibility metadata can reveal children’s travel history, family habits, and user engagement. Public endpoints must return only intentionally shareable data; endpoints intended for owners must not have alias routes or optional-auth variants that bypass ownership checks. Error responses and logs must avoid leaking secrets or excessive internal details.

### Denial of Service

Several public routes trigger email sending, file uploads, or external API/model calls. Production endpoints exposed to the public internet must rate-limit abuse and bound payload sizes/costly operations so attackers cannot turn the app into a spam relay, memory-exhaustion vector, or cost-amplification target.

### Elevation of Privilege

Admin functionality exists in both `adminRoutes.ts` and admin endpoints embedded in `routes.ts`. All admin actions must require server-side admin verification, and all user-scoped resources must prevent IDORs and accidental public aliases. Any route that accepts raw identifiers from the client without cross-checking ownership is a priority review target.
