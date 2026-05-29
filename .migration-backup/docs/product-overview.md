# GeoAdventures Product Overview

## 1) Features built so far

### GeoAdventures travel mode
GeoAdventures is the family travel layer inside GeoQuest Games. It gives parents a dedicated place to plan, run, and reflect on a family trip, while keeping the kid-facing experience separate and playful. It is built for parents who want a structured trip companion and for kids who should only see the adventure content, not the parent-only decision tools.

### Trip planning and adventure builder
The app supports building a trip with destinations, dates, stops, and day-by-day structure. Parents use it to create an itinerary that the rest of the travel experience hangs off of. It is for families planning an upcoming trip and for the app’s AI/planning system that needs a structured trip model to work from.

### Stop-level travel experience
Each trip contains individual stops with stop type, visit state, and travel-specific metadata. Stops can be marked visited, skipped, or otherwise interacted with, and those actions feed the rest of the travel flow. This is for parents managing the trip and for the system that learns which kinds of stops work best for a family.

### Parent-only quality signal engine
A fourth tuning layer captures parent-only feedback such as visited, skipped with reasons, favorites, moments, end-of-day tags, and “worth it?” pulses. It computes per-stop quality scores and stores those signals for later analysis and trip planning. This is for parents giving lightweight feedback and for the recommendation engine that uses that data to improve future trip suggestions.

### Worth-it pulse after a stop
After a stop is completed, parents can rate whether it was a big hit, good, or worth skipping next time, then optionally choose follow-up tags like hidden gem, would return, great value, too long, not kid friendly, or expensive. This is for parents who want to give quick, low-friction feedback while the experience is still fresh.

### Skip reason picker
When a stop is being skipped, the app offers a parent-only reason picker with structured reasons such as running late, too tired, not worth it, kids not interested, weather changed, and already seen enough nearby. This is for parents who want to explain the skip without typing a long note, and for the engine that learns why stops were bypassed.

### End-of-day standout and tag flow
At the end of a travel day, parents can choose the best stop and add one summary tag such as kids loved this, highlight, or glad we did it. This is for reflection and memory-building, and it also gives the engine a strong signal about what made the day work.

### Moment capture
Parents can capture photos and notes tied to a stop. The feature also records passive signals like opening capture, adding photos, adding notes, and dismissing capture. This is for preserving trip memories and for measuring engagement with each stop.

### Family travel memory system
Travel moments, notes, and photos are stored as part of the trip record so families can revisit the journey later. It is for parents who want a memory trail, not just a checklist of places visited.

### Kid mode separation
Kid mode is a separate experience that hides the parent prompts and signal collection UI. It keeps the playful travel flow kid-friendly while preserving the parent’s control layer behind the scenes.

### Quality feedback feeding future trip generation
The app uses collected quality signals to build a family travel style profile. That profile boosts stop types the family likes and deprioritizes or excludes stop types they repeatedly rate poorly, so future trip generation gets more aligned over time. This is for parents who want the app to learn from their family’s preferences.

### GeoBuddy and family-safe AI support
GeoBuddy is the app’s helper and story layer for family-safe guidance and context. It supports the broader GeoQuest experience and is for kids and parents who want guided, age-appropriate content.

### Explorer progression, XP, and ranks
The app includes explorer profiles, XP, rank tiers, and progression systems across the broader GeoQuest product. These are for motivating kids and families with visible progress, rewards, and collection loops.

### Passport, map, and collection systems
The app includes a digital passport, world map progress, city discovery, and related collection mechanics. These are for kids learning geography and for families who want a game layer beyond trip planning.

### City hub and city learning content
City pages and city-focused learning content tie together quests, mastery, travel, and stories. These are for kids learning about places and for parents who want richer destination context.

### GeoAtlas country mastery
GeoAtlas is the country learning system for capitals, flags, and map locations. It is for children learning geography through repetition and structured challenges.

### Compass Quest and other mini-games
The product includes game modes such as Compass Quest and other learning mini-games. These are for kid engagement and geography learning.

### GeoBuddy Stories
GeoBuddy Stories are audio adventures that teach about cities using narration and sound. They are for kids and families who want story-driven learning rather than static facts.

### GeoShorts
GeoShorts are short animated educational videos. They are for quick geography learning and shareable visual content.

### Community travel moments
Families can opt into sharing travel photos as community moments. These can appear in carousels and trip inspiration areas. This is for users who want social proof and inspiration from other families’ trips.

### Family photo engine
The app can generate or surface family-travel-themed photos for destinations, with approval and quality scoring support. This is for travel inspiration, carousel cards, and trip storytelling.

### Parent dashboard and admin dashboard
There are separate parent and admin tools for oversight, management, and analytics. These are for adults running the experience and for operators maintaining the platform.

### Subscriptions and monetization
The platform supports free and paid plans, with billing handled through Stripe. This is for users who need premium access and for the business side of the product.

### Push notifications and email messaging
The app sends reminders, summaries, and other lifecycle messages through push and email. This is for keeping users engaged between sessions.

## 2) User flows

### A. Open the app
1. User opens GeoQuest/GeoAdventures.
2. The app loads the main home experience.
3. If not logged in, the user is prompted to authenticate.
4. After login, the user lands in the main navigation shell.

### B. Create or continue a trip
1. Parent opens the travel area.
2. Parent starts a new trip or opens an active one.
3. Parent reviews destination, dates, and the suggested stop list.
4. Parent continues into the trip’s day view or detail view.

### C. Visit a stop
1. Parent opens a stop from the trip.
2. The app marks the stop visited.
3. If the stop qualifies, the parent sees a quality prompt.
4. Parent can optionally leave a “worth it?” rating and follow-up tags.
5. The signal is stored and attached to the stop and trip.

### D. Skip a stop
1. Parent chooses to skip a stop.
2. The skip reason picker appears.
3. Parent selects a skip reason.
4. Parent confirms the skip.
5. The skip signal is stored for learning and future ranking.

### E. Capture a moment
1. Parent opens the moment capture flow from a stop.
2. Parent adds photos and/or a note.
3. The app stores the moment and fires passive quality signals.
4. The capture closes and the trip record is updated.

### F. End the day
1. Parent opens the end-of-day screen.
2. Parent chooses the standout stop.
3. Parent adds one summary tag about the day.
4. The system stores the standout signal and tag signal.
5. The day summary is updated for later reflection.

### G. Kid mode experience
1. Child opens the app in kid mode.
2. Child sees the game-like travel content only.
3. Parent-only prompts remain hidden.
4. Child can interact with the adventure content without seeing feedback tools.

### H. Generate better future trips
1. Parent activity creates stop quality signals over time.
2. The system groups those signals into a family travel style profile.
3. Future trip generation reads that profile.
4. Preferred stop types are boosted.
5. Repeatedly poor stop types are deprioritized or excluded.

### I. Subscription and account flow
1. User logs in.
2. The app recognizes plan state and profile state.
3. Stripe-backed billing state is read from synced records.
4. Premium features unlock according to subscription and feature flags.

## 3) Screens/pages

### Home
Main dashboard with Today’s Quest, continue exploring, explorer rank, map, passport preview, and navigation.

### Learn
Learning-focused area for geography content and educational exploration.

### Play
Mini-games hub and other game-first experiences.

### Explore
Explorer identity area, world map, GeoAdventures entry points, and stories.

### GeoAdventures trip screens
Trip-specific views for planning, active travel, stops, day views, and trip reflection.

### Today screen
Active trip day view with stop completion, worth-it pulse, and parent travel actions.

### Stop view screen
Detailed stop page with visit handling, parent-quality prompt, and celebration flow.

### End-of-day screen
Daily reflection screen with standout stop selection and day-end tags.

### Rescue panel
Skip/rescue flow with structured skip reasons and confirmation.

### Moment capture modal/screen
Photo and note capture for a specific stop, with parent-only signal capture.

### Parent dashboard
Adult-only management and analytics area for trips and explorers.

### Admin dashboard
Operational/admin area for managing content and generated assets.

### Explorer journal
Personal progress hub for profile, kit, passport, and travel collections.

### Explorer map
Zoomable world map showing exploration progress.

### City hub pages
City-specific detail pages with quests, learning content, and travel content.

### GeoAtlas pages
Country mastery pages for capitals, flags, and map-location learning.

### GeoBuddy Stories pages
Audio story and adventure pages tied to destinations.

### Subscription/billing screens
Plan and billing surfaces backed by Stripe.

## 4) Current data model

### Users
Stores authenticated account data such as name, email, auth provider identity, preferences, and subscription-linked state.

### Explorer profiles
Stores child/explorer profiles including name, age, avatar, rank, XP, and progress-related fields.

### Trips
Stores destination, city, dates, status, user ownership, planning state, and trip-level metadata.

### Stops
Stores stop name, type, trip association, visit state, skip state, location data when available, and related trip ordering/metadata.

### Stop quality signals
Stores parent-only signals per stop and trip, including signal type, optional signal value, optional reason, and timestamps.

### Travel moments
Stores captured trip moments such as photos, notes, stop association, and community-sharing flags.

### Generated family photos
Stores AI-generated or curated travel images used for trip inspiration and carousel content.

### Community photo sharing flags
Stores whether a travel moment is shared publicly in the community flow.

### Subscriptions and billing records
Stores Stripe-synced customer, subscription, invoice, and payment-related records.

### Push and notification schedules
Stores scheduled reminders and summary messages.

### Rewards, XP, and progression data
Stores progression totals, ranks, achievements, and collection state across the broader product.

### Location-related data
The app stores destination and stop location information needed for planning and presentation, but it does not do live GPS tracking or continuous location monitoring.

## 5) Third-party APIs and integrations

### Replit Auth
Used for user authentication.

### Stripe
Used for subscriptions, billing, and plan state.

### OpenAI
Used for AI-assisted content and trip generation support.

### SendGrid
Used for email delivery.

### Web Push API
Used for push notification delivery.

### PostgreSQL / Neon
Used as the persistent database.

### Drizzle ORM
Used as the database access layer.

### Google Fonts
Used for typography.

### Flagcdn
Used for flag imagery.

### Sentry
Used for error tracking.

### Google Analytics 4
Used for analytics tracking.

## 6) Planned but not yet built

### More automated testing coverage
Additional regression tests for quality-profile behavior and stop selection are planned.

### Stronger CI coverage
Automated checks for the quality-profile logic and trip generation behavior are still a next step.

### Broader stop-selection intelligence
Further balancing between quality preferences, cognitive load, and type diversity is planned.

### More user-facing summaries of travel style
A clearer parent-facing summary of what the family likes and avoids would be a natural next layer.

### Expanded travel-mode polish
There is still room for more refinement in the GeoAdventures travel experience, especially around reflection, summaries, and long-trip guidance.
