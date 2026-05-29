# RoamUs

Family travel journaling app that turns trips into lasting stories — with AI-generated itineraries, stop-by-stop quest logs, photo journals, and keepsakes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080 → proxied at `/api`)
- `pnpm --filter @workspace/roamus run dev` — run the web landing page
- `pnpm --filter @workspace/roamus-mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `EXPO_PUBLIC_DOMAIN` — the Replit domain (auto-set)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Mobile: Expo SDK 54, Expo Router v3 (file-based), React Native
- Web: React + Vite (`artifacts/roamus`)
- Build: esbuild (CJS bundle for API)

## Where things live

- `artifacts/roamus-mobile/app/onboarding/` — 10-screen onboarding flow (splash → where → who → when → how → building → preview → account → upgrade)
- `artifacts/roamus-mobile/lib/tokens.ts` — design tokens (colors, font names, city mappings)
- `artifacts/roamus-mobile/lib/onboardingContext.tsx` — onboarding state (cities, travelers, dates, vibe, tripId)
- `artifacts/roamus-mobile/lib/authContext.tsx` — auth (login, register, JWT storage)
- `artifacts/roamus-mobile/lib/onboardingAtoms.tsx` — shared onboarding UI atoms (BackBtn, BigBtn, OCard, AChip, etc.)
- `artifacts/api-server/src/routes/routes.ts` — all API routes (14k lines); trip creation at ~line 5601

## Architecture decisions

- **Onboarding auth flow**: Trip creation (`POST /api/travel/trips`) requires JWT. To avoid chicken-and-egg, the Building screen only shows a 6s animation; the actual API call fires in the Account screen after registration. Preview shows simulated per-city stops so users see value before registering.
- **OnboardingProvider** wraps the root layout so all onboarding screens share state (cities, travelers, dates, vibe). This state is read by Account to build the trip creation payload.
- **AuthGate** redirects unauthenticated users to `/onboarding/splash`. It does NOT auto-redirect token→onboarding, so users can finish the Account→Upgrade flow after registering.
- **Font loading**: Plus Jakarta Sans 400/500/600/700 loaded via `@expo-google-fonts/plus-jakarta-sans` in `_layout.tsx`.
- **Progressive disclosure in How screen**: `LayoutAnimation.configureNext` + Animated opacity reveals each vibe section after the previous is answered; each collapses to an AChip.

## Product

- **Mobile (Expo)**: Family travel journaling app with 10-screen onboarding, AI itinerary generation, stop-by-stop quest log, photo journal, offline access.
- **Web (roamus)**: Marketing landing page.
- **API**: REST API powering both. Auth via JWT, trips via PostgreSQL.

## User preferences

- Design style: minimalist orange/cream (`#E8692A` / `#F5F2EE`), Plus Jakarta Sans typography, no emojis in production copy unless intentional.
- Onboarding replaces GeoAdventures-style form flow — progressive disclosure, animated, family-centric.

## Gotchas

- `POST /api/travel/trips` requires `destination` (returns 400 if missing). `name` is auto-generated as `"{destination} Family Trip"` if not supplied.
- Metro bundler on Expo: changes to `_layout.tsx` often require a full app reload (r in Metro console).
- The old `app/login.tsx` is still reachable at `/login` for backward compat but the new onboarding login is at `/onboarding/login`.
- The Expo web preview is at port 5000 (via `PORT` env). Mobile preview requires Expo Go + QR scan.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
