# GeoQuest Games

## Overview
GeoQuest Games is an educational game platform designed for children aged 4+, focusing on geography. It uses interactive, card-based gameplay to teach about world cities, countries, and cultures through various games and daily challenges. The platform aims to be entertaining and educational, fostering a love for global exploration, with future plans for monetization. A key feature, "GeoAdventures," provides an isolated journaling mode for family travel.

## User Preferences
Preferred communication style: Simple, everyday language.

## Free Guide Landing Page (`/free-guide`)
- **URL**: `geoquestgame.live/free-guide` and `geoquestgame.com/free-guide` (both hit the same route)
- **Page**: `client/src/pages/FreeGuide.tsx` — self-contained React page, Nunito+Lora fonts, sandy brand colors, animated floating book mockup, two email capture forms (hero + bottom CTA)
- **API**: `POST /api/free-guide/subscribe` — validates email, saves to `guide_subscribers` table (deduped), fires SendGrid confirmation email; returns `{ success, isNew }`
- **DB**: `guide_subscribers` (id, email UNIQUE, subscribed_at, source, email_sent)
- **Email body**: confirmation HTML is inline in `server/routes.ts` at the `/api/free-guide/subscribe` handler — update there when copy is finalised
- **Bottom nav**: `/free-guide` added to `HIDDEN_ON_ROUTES` in `BottomNav.tsx`

## Launch Promo: TESTLAUNCH26
- Code: `TESTLAUNCH26` — `full_free`, max 100 uses, one per user, seeded at server startup
- **Signup popup** (`LaunchPromoDialog.tsx`): shown before GeoAdventures signup if not yet seen (localStorage `geo_launch_promo_seen`). "Create My Account" → signup flow. "Maybe Later" → dismiss.
- **Checkout popup** (`TripUnlockSheet.tsx`): full-screen overlay on the confirm screen (sessionStorage `geo_launch_checkout_banner_dismissed`). "Unlock My Free Trip" auto-applies code. "Continue Without Code" dismisses.
- Count tracked via `promo_codes.times_used`. `/api/promo/launch-info` returns remaining spots.

## Pending: Stripe Live Keys for Production Payments
The deployed app currently falls back to Stripe sandbox/test credentials because no production Stripe connection has been configured. Payments show correctly but real cards won't be charged.
To fix: get live Publishable Key (`pk_live_...`) and Secret Key (`sk_live_...`) from dashboard.stripe.com → Developers → API keys (Live mode), then store them as secrets `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`, and update `server/stripeClient.ts` to read from those env vars when the Replit integration is unavailable.

## System Architecture

### UI/UX Decisions
The application is built with React 18, TypeScript, Vite, Wouter for routing, and styled using Tailwind CSS and shadcn/ui. It features a mascot, "GeoBuddy Compass Companion," an AI chatbot on the Home page. Navigation is handled by a persistent bottom bar with Home, Learn, Play, and Explore tabs. The Home dashboard includes sections like Today's Quest, Continue Exploring, Explorer Rank, Explorer Map, and Passport preview. The Play tab serves as a Mini Games Hub, while the Explore tab offers an Explorer Identity header, Explorer Map, GeoAdventures, and GeoBuddy Stories. A unified color system is applied across sections: Quest (Red), Learn (Blue), Play (Green), Explore (Orange), and Rewards (Gold). A UserHeader dropdown provides access to profiles, parent dashboard, and journal.

### Technical Implementations
**Frontend:**
-   **State Management:** React Context API with local storage.
-   **Multi-Profile System:** Supports up to 7 age-based "Explorer" profiles.
-   **PWA & Accessibility:** Full PWA capabilities, offline support, Text-to-Speech, and Web Audio API.
-   **Core Features:** Card collection, achievements, statistics, daily quests, dark mode, and a unified explorer streak system.
-   **Onboarding:** An interactive `FirstTimeQuest` component guides new users.
-   **Economy System:** An "Explorer Spins System" tracks spins per explorer in local storage for game access. GeoQuest Champion+ users receive 5 daily spins (vs 3) and earn 3 XP per spin game (vs 2).
-   **Progression System:** A unified XP and Rank system with 12 standard tiers + 6 hidden Elite ranks (World Architect, Grand Pathfinder, Culture Keeper, Legacy Explorer, GeoMaster, Mythic Voyager). Elite tier unlocks at 13k XP (GeoQuest Champion) with a dramatic one-time transition popup. Explorer Rank Journey screen features a redesigned warm-neutral gradient hero, compressed rank ladder, percentile display for elite users, and an Elite Journey card showing the hidden elite progression.
-   **Explorer Journal:** A personal hub for progress, kit, passport, world exploration, and discovery collections.
-   **Explorer Kit:** A collectible gear progression system with rank-gated upgrades.
-   **Passport System:** A digital scrapbook for city stamps with a 5-star mastery system.
-   **Explorer Map:** A zoomable world map displaying progress.

**Backend:**
-   **Framework:** Express.js with TypeScript and ESM modules.
-   **Authentication:** Replit Auth and Email/Password with session-based authentication.
-   **API:** RESTful design.

**Data Storage:**
-   **Database:** PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Persistence:** Hybrid local storage and cloud backup with automatic syncing and offline queueing.
-   **TTS Audio Cache:** Caches generated TTS audio to optimize costs.

**Feature Specifications:**
-   **City Hub:** Dynamic full-page view for city details, integrating quest data, mastery, games, GeoBuddy stories, and GeoAdventures.
-   **GeoAdventures (Family Travel Mode):** An isolated, offline-first journaling feature for family travel, including trips, stops, "Journey Packs," photo journaling, and a "Family Travel Map." It includes an "Experience [City] Module" with AI-generated sensory content and XP rewards. An "Adventure Builder Wizard" facilitates trip planning. A "Parent Plan View" offers a dedicated dashboard per trip, including a "Trip Wallet" for storing travel-related items. Explorer Challenge System for travel-mode specific missions.
-   **GeoBuddy Stories (Audio Adventures):** Interactive audio stories introducing cities, using Google Cloud TTS and sound effects.
-   **GeoAtlas (Country Mastery System):** A spaced-repetition learning system for country capitals, flags, and map locations.
-   **Compass Quest:** A map-based treasure hunt game with city clues and compass directions.
-   **GeoShorts:** Short animated educational videos with 3D globe visualizations and Text-to-Speech narration.
-   **Family Photo Engine (Task #86):** 8-block structured AI prompt assembly system (`server/familyPhotoPromptEngine.ts`) for generating photorealistic family travel images via DALL-E 3. New DB table `generatedFamilyPhotos` stores generated and static approved photos. Admin panel at `/admin-dashboard` (Family Photos tab) for generation, approval/rejection, and quality scoring. Public endpoint `/api/family-photos/for-trip` serves approved city-specific photos to carousel Cards 2 & 3, with random fallback from other cities if none exist. 37 static photos seeded from existing `memory-images/` assets.
-   **Community Moments (Task #92):** Opt-in community photo sharing system. `travelMoments.isSharedCommunity` boolean field (added via direct SQL migration). `MomentCapture.tsx` review step shows an opt-in checkbox when photos are present. `PATCH /api/travel/moments` persists the flag. New endpoint `GET /api/community-photos/for-trip?city=X` joins `travelMoments` → `travelTrips` to return shared photos by city. `TripsLikeYoursCarousel.tsx` fetches community photos first (highest priority), falls back to AI-generated family photos, then static Chicago collage.
-   **Stop Quality Signal Engine (Task #109):** Parent-only 4th tuning layer for per-stop quality scoring. New DB table `stop_quality_signals` (id, userId, tripId, stopId, signalType, signalValue, signalReason, createdAt). Scoring utility at `server/stopQualityScoring.ts` with weighted signal logic (visited +1, favorite +3, photo +4, note +3, Big Hit +5, Good +2, standout +4; skipped/negative signals capped on anchor stops). API: `POST /api/travel/stops/:stopId/quality-signal`, `GET /api/travel/trips/:tripId/quality-signals`. Favorite toggle hooks quality signal fire-and-forget. Skip-day route logs context skips. Frontend: skip reason picker in `RescuePanel.tsx` (8 reasons, 2-step flow), "Worth it?" 3-button pulse in `StopViewScreen.tsx` VisitedCelebration (Big hit / Good / Skip next time), standout stop tagging in `EndDayScreen.tsx` with animated chip toggle. Never modifies canonical templates or stop intelligence.

### System Design Choices
-   **GeoBuddy:** AI chatbot for age-appropriate geography answers.
-   **Email System:** SendGrid for notifications and analytics.
-   **Push Notifications:** Web Push API for reminders.
-   **Analytics:** Dual tracking with Google Analytics 4 and custom PostgreSQL-based analytics.
-   **Monetization:** A 2-plan subscription model (Free Explorer, GeoQuest Explorer) with feature flags. Geo-Logical Pricing implemented with 3-band region-based pricing.
-   **Subscription Management:** Handles the full subscription lifecycle.
-   **Feature Flags:** Controls specific features.
-   **Parent Dashboard:** A math-gated hub for parent-only analytics and explorer management.
-   **Admin Dashboard:** A separate application for administrative tasks.
-   **Content Safety:** Centralized module for family-safe AI generation and user input.
-   **Travel Mode Rebuild:** Multi-phase project to enhance the GeoAdventures feature, including state resolution, entry routing, and execution snapshot bridging.
-   **Place Family Signals:** A self-improving recommendation system using real user engagement data and AI knowledge for cold-starts, influencing stop generation.

## External Dependencies
-   **Authentication:** Replit Auth
-   **Database:** Neon Database (PostgreSQL)
-   **Image CDN:** Flagcdn.com
-   **Fonts:** Google Fonts
-   **Error Tracking:** Sentry
-   **Email Service:** SendGrid
-   **UI Components:** Radix UI primitives, shadcn/ui
-   **Forms:** react-hook-form, Zod
-   **Data Fetching:** @tanstack/react-query
-   **ORM:** drizzle-orm
-   **AI:** OpenAI
-   **Build Tools:** Vite, esbuild, tsx, tailwindcss