import { sql } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  doublePrecision,
  serial,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  registrationSource: varchar("registration_source"),
  emailVerified: boolean("email_verified").default(false),
  verificationCode: varchar("verification_code"),
  verificationCodeExpiry: timestamp("verification_code_expiry"),
  passwordResetCode: varchar("password_reset_code"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  emailSubscribed: boolean("email_subscribed").default(true),
  weeklyProgressEmails: boolean("weekly_progress_emails").default(true),
  dailyReminderEmails: boolean("daily_reminder_emails").default(true),
  subscriptionTier: varchar("subscription_tier").default("free"), // 'free', 'trial', 'geoquest_explorer', 'founding' (legacy: 'geogames', 'geoquest_plus' — kept for backward compat)
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndDate: timestamp("trial_end_date"),
  trialStartDate: timestamp("trial_start_date"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  // Founding Families program
  isFoundingFamily: boolean("is_founding_family").default(false),
  foundingFamilyNumber: integer("founding_family_number"), // 1-100
  foundingPriceLockExpiry: timestamp("founding_price_lock_expiry"), // 12 months from signup
  foundingFreeCityId: varchar("founding_free_city_id"), // One free city with offline
  priceLock30DaySentAt: timestamp("price_lock_30_day_sent_at"), // Tracking for 30-day warning email
  priceLock7DaySentAt: timestamp("price_lock_7_day_sent_at"), // Tracking for 7-day warning email
  priceLockExpiredSentAt: timestamp("price_lock_expired_sent_at"), // Tracking for expiration confirmation email
  // Admin flag - bypasses all payment/trial restrictions
  isAdmin: boolean("is_admin").default(false),
  // Payment grace period (2 days after failed payment)
  paymentGraceEndDate: timestamp("payment_grace_end_date"),
  // Entitlements tracking
  offlineGeoGamesEnabled: boolean("offline_geogames_enabled").default(false),
  offlineTravelEnabled: boolean("offline_travel_enabled").default(false),
  maxStopsPerAdventure: integer("max_stops_per_adventure").default(7), // Free: 7, Paid: unlimited
  videoMakerEnabled: boolean("video_maker_enabled").default(false),
  // À la carte city purchases
  purchasedCityIds: jsonb("purchased_city_ids").default([]), // Array of city IDs purchased individually
  onboardingCompleted: jsonb("onboarding_completed").default({}),
  // Free adventure tracking for Founding Families (1 free adventure allowed)
  usedFreeAdventureId: varchar("used_free_adventure_id"), // Trip ID of the one free adventure used
  usedFreeAdventureAt: timestamp("used_free_adventure_at"), // When the free adventure was claimed
  // Lifetime trip counters - prevents gaming the system by deleting and recreating trips
  totalTravelTripsCreated: integer("total_travel_trips_created").default(0), // Total travel trips ever created
  totalHomeTripsCreated: integer("total_home_trips_created").default(0), // Total home trips ever created
  // Physical Card Game Early Access
  physicalGameEarlyAccess: boolean("physical_game_early_access").default(false),
  physicalGameEarlyAccessDate: timestamp("physical_game_early_access_date"),
  physicalGameEarlyAccessName: varchar("physical_game_early_access_name"), // Name provided at signup
  physicalGameEarlyAccessEmail: varchar("physical_game_early_access_email"), // Email provided at signup
  physicalGameWaitlistNumber: integer("physical_game_waitlist_number"), // Sequential number for waitlist position
  physicalGamePopupImpressions: integer("physical_game_popup_impressions").default(0), // Max 2
  physicalGameLastPopupDate: timestamp("physical_game_last_popup_date"),
  physicalGameDismissedDate: timestamp("physical_game_dismissed_date"), // For 14-day suppression
  physicalGameEmailSentAt: timestamp("physical_game_email_sent_at"),
  physicalGameEmailScheduledFor: timestamp("physical_game_email_scheduled_for"), // 3-5 days after signup
  // Geo-Logical Pricing
  pricingBand: varchar("pricing_band").default("A"), // 'A' = High-Income, 'B' = Upper-Middle, 'C' = Emerging
  billingCurrency: varchar("billing_currency").default("USD"), // USD, EUR, INR, etc.
  billingCurrencyLocked: boolean("billing_currency_locked").default(false), // True after first payment
  detectedCountry: varchar("detected_country"), // ISO 3166-1 alpha-2 country code
  signupIp: varchar("signup_ip"), // For retro-assignment and fraud prevention
  signupLocale: varchar("signup_locale"), // Browser locale at signup
  signupTimezone: varchar("signup_timezone"), // Timezone at signup
  // Narrator voice preference for Google Cloud TTS
  narratorVoice: varchar("narrator_voice").default("eva"), // 'eva' (female Neural2-F) or 'avi' (male Neural2-D)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Explorers table (players/profiles associated with a parent user or guests)
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // nullable for guests
  name: varchar("name").notNull(),
  age: varchar("age").notNull(),
  profileType: varchar("profile_type").default("kid"), // 'kid', 'adult', 'parent'
  ageRange: varchar("age_range"), // '3-5', '6-9', '9+', 'adult'
  avatarKey: varchar("avatar_key").default("panda"), // avatar selection key
  difficultyLevel: varchar("difficulty_level").default("medium"), // 'easy', 'medium', 'hard'
  isGuest: boolean("is_guest").default(false), // true for guest explorers
  isArchived: boolean("is_archived").default(false), // hidden from "Who's Playing"
  gamesPlayed: integer("games_played").default(0),
  starsEarnedTotal: integer("stars_earned_total").default(0),
  missionsCompletedTotal: integer("missions_completed_total").default(0),
  dailyQuestStreak: integer("daily_quest_streak").default(0),
  dailyQuestWinStreak: integer("daily_quest_win_streak").default(0),
  lastDailyQuestDate: varchar("last_daily_quest_date"),
  crossworldStreak: integer("crossworld_streak").default(0),
  crossworldBestTime: integer("crossworld_best_time"),
  crossworldLastPlayed: varchar("crossworld_last_played"),
  crossworldTotalGames: integer("crossworld_total_games").default(0),
  crossworldTotalWins: integer("crossworld_total_wins").default(0),
  gameHistory: jsonb("game_history").default([]),
  collectedCardIds: jsonb("collected_card_ids").default([]),
  collectedCardTimestamps: jsonb("collected_card_timestamps").default({}),
  unlockedAchievementIds: jsonb("unlocked_achievement_ids").default([]),
  findMyHomeUnlockedIds: jsonb("find_my_home_unlocked_ids").default([]),
  mapMeCompletedCityIds: jsonb("map_me_completed_city_ids").default([]),
  unlockedStreakBadgeIds: jsonb("unlocked_streak_badge_ids").default([]),
  bonusHintsFromStreak: integer("bonus_hints_from_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  geoBuddyQuestionsThisWeek: integer("geo_buddy_questions_this_week").default(0),
  geoBuddyWeekStart: varchar("geo_buddy_week_start"),
  geoBuddyQuestionsThisMonth: integer("geo_buddy_questions_this_month").default(0),
  geoBuddyMonthStart: varchar("geo_buddy_month_start"),
  passportMastery: jsonb("passport_mastery").default([]),
  encounteredAnimalIds: jsonb("encountered_animal_ids").default([]),
  customStamps: jsonb("custom_stamps").default([]),
  // Unified Explorer Streak (any game: Guess & Go, Daily Quest, CrossWorld)
  explorerStreak: integer("explorer_streak").default(0),
  lastExplorerStreakDate: varchar("last_explorer_streak_date"),
  lastExplorerGameType: varchar("last_explorer_game_type"), // 'guess_and_go', 'daily_quest', 'crossworld'
  streakGraceAvailable: boolean("streak_grace_available").default(true),
  streakGraceLastUsedDate: varchar("streak_grace_last_used_date"),
  longestExplorerStreak: integer("longest_explorer_streak").default(0),
  dailyQuestMaxStreak: integer("daily_quest_max_streak").default(0),
  streakFreezes: integer("streak_freezes").default(0),
  hasSeenDailyQuestOnboarding: boolean("has_seen_daily_quest_onboarding").default(false),
  totalXp: integer("total_xp").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Per-game statistics table for individual game tracking
export const playerGameStats = pgTable("player_game_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").references(() => players.id).notNull(),
  gameType: varchar("game_type").notNull(), // 'guess_and_go', 'daily_quest', 'crossworld'
  totalGames: integer("total_games").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  bestTimeMs: integer("best_time_ms"),
  recentOutcomes: jsonb("recent_outcomes").default([]), // last 10 game results [{won: bool, date: string, timeMs?: number}]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_player_game_stats_player_game").on(table.playerId, table.gameType),
]);

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Explorer creation schema (for frontend use)
export const createExplorerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.string().min(1, "Age is required"),
  profileType: z.enum(["kid", "adult", "parent"]).default("kid"),
  ageRange: z.enum(["3-5", "6-9", "9+", "adult"]).optional(),
  avatarKey: z.string().default("panda"),
  difficultyLevel: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export type CreateExplorer = z.infer<typeof createExplorerSchema>;

export const updatePlayerStatsSchema = z.object({
  gamesPlayed: z.number().optional(),
  starsEarnedTotal: z.number().optional(),
  missionsCompletedTotal: z.number().optional(),
  dailyQuestStreak: z.number().optional(),
  dailyQuestWinStreak: z.number().optional(),
  lastDailyQuestDate: z.string().nullable().optional(),
  crossworldStreak: z.number().optional(),
  crossworldBestTime: z.number().nullable().optional(),
  crossworldLastPlayed: z.string().nullable().optional(),
  crossworldTotalGames: z.number().optional(),
  crossworldTotalWins: z.number().optional(),
  explorerStreak: z.number().optional(),
  lastExplorerStreakDate: z.string().nullable().optional(),
  lastExplorerGameType: z.string().nullable().optional(),
  streakGraceAvailable: z.boolean().optional(),
  streakGraceLastUsedDate: z.string().nullable().optional(),
  longestExplorerStreak: z.number().optional(),
  dailyQuestMaxStreak: z.number().optional(),
  streakFreezes: z.number().optional(),
  hasSeenDailyQuestOnboarding: z.boolean().optional(),
  totalXp: z.number().optional(),
  gameHistory: z.array(z.object({
    date: z.string(),
    stars: z.number(),
    won: z.boolean(),
  })).optional(),
  collectedCardIds: z.array(z.string()).optional(),
  collectedCardTimestamps: z.record(z.string(), z.string()).optional(),
  unlockedAchievementIds: z.array(z.string()).optional(),
  findMyHomeUnlockedIds: z.array(z.string()).optional(),
  mapMeCompletedCityIds: z.array(z.string()).optional(),
  unlockedStreakBadgeIds: z.array(z.string()).optional(),
  bonusHintsFromStreak: z.number().optional(),
  longestStreak: z.number().optional(),
  geoBuddyQuestionsThisWeek: z.number().optional(),
  geoBuddyWeekStart: z.string().nullable().optional(),
  geoBuddyQuestionsThisMonth: z.number().optional(),
  geoBuddyMonthStart: z.string().nullable().optional(),
  passportMastery: z.array(z.object({
    cityId: z.string(),
    star1: z.boolean().default(false),
    star2: z.boolean().default(false),
    star3: z.boolean().default(false),
    star4: z.boolean().default(false),
    star5: z.boolean().default(false),
    discoveredDate: z.string(),
    star3LastAttempt: z.string().optional(),
  })).optional(),
  encounteredAnimalIds: z.array(z.string()).optional(),
  customStamps: z.array(z.object({
    stampId: z.string(),
    stampName: z.string(),
    displayName: z.string(),
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    isUS: z.boolean(),
    tripId: z.string(),
    tripName: z.string(),
    visitedAt: z.string(),
    travelMonth: z.number().optional(),
    travelYear: z.number().optional(),
  })).optional(),
});

export type UpdatePlayerStats = z.infer<typeof updatePlayerStatsSchema>;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// Player game stats types
export const insertPlayerGameStatsSchema = createInsertSchema(playerGameStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlayerGameStats = z.infer<typeof insertPlayerGameStatsSchema>;
export type PlayerGameStats = typeof playerGameStats.$inferSelect;

// Game session recording schema (for API)
export const recordGameSessionSchema = z.object({
  gameType: z.enum(['guess_and_go', 'daily_quest', 'crossworld']),
  won: z.boolean(),
  timeMs: z.number().optional(),
});
export type RecordGameSession = z.infer<typeof recordGameSessionSchema>;

// Guest rewards schema for migrating guest game progress to new accounts
export const guestRewardSchema = z.object({
  name: z.string(),
  stars: z.number().optional(),
  cardIds: z.array(z.string()).optional(),
  gamesPlayed: z.number().optional(),
});

// Registration request schema for email signups
export const emailRegistrationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  players: z.array(z.object({
    name: z.string().min(1),
    age: z.string().min(1),
  })).min(1),
  guestRewards: z.array(guestRewardSchema).optional(),
});

export type EmailRegistration = z.infer<typeof emailRegistrationSchema>;

// Login request schema
export const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type EmailLogin = z.infer<typeof emailLoginSchema>;

// Analytics events table for tracking game engagement
export const gameEvents = pgTable("game_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type").notNull(),
  gameMode: varchar("game_mode").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  score: integer("score"),
  starsEarned: integer("stars_earned"),
  timeSpentSeconds: integer("time_spent_seconds"),
  completed: boolean("completed"),
  won: boolean("won"),
  difficulty: varchar("difficulty"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_game_events_type").on(table.eventType),
  index("IDX_game_events_mode").on(table.gameMode),
  index("IDX_game_events_created").on(table.createdAt),
]);

export const insertGameEventSchema = createInsertSchema(gameEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertGameEvent = z.infer<typeof insertGameEventSchema>;
export type GameEvent = typeof gameEvents.$inferSelect;

// User sessions table for tracking time spent on the app
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  sessionStart: timestamp("session_start").defaultNow(),
  sessionEnd: timestamp("session_end"),
  totalTimeSeconds: integer("total_time_seconds").default(0),
  gameTimeSeconds: integer("game_time_seconds").default(0),
  pagesVisited: integer("pages_visited").default(1),
  gamesPlayed: integer("games_played").default(0),
  isActive: boolean("is_active").default(true),
  deviceType: varchar("device_type").default("desktop"),
  isFirstSession: boolean("is_first_session").default(false),
  firstGameStartedAt: timestamp("first_game_started_at"),
  firstGameCompletedAt: timestamp("first_game_completed_at"),
  landingPage: varchar("landing_page"),
  osPlatform: varchar("os_platform"),
  browserName: varchar("browser_name"),
  hostname: varchar("hostname"),
}, (table) => [
  index("IDX_user_sessions_visitor").on(table.visitorId),
  index("IDX_user_sessions_player").on(table.playerId),
  index("IDX_user_sessions_start").on(table.sessionStart),
]);

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  sessionStart: true,
});

export const updateUserSessionSchema = z.object({
  sessionEnd: z.date().optional(),
  totalTimeSeconds: z.number().optional(),
  gameTimeSeconds: z.number().optional(),
  pagesVisited: z.number().optional(),
  gamesPlayed: z.number().optional(),
  isActive: z.boolean().optional(),
  deviceType: z.string().optional(),
  isFirstSession: z.boolean().optional(),
  firstGameStartedAt: z.date().optional(),
  firstGameCompletedAt: z.date().optional(),
  landingPage: z.string().optional(),
});

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UpdateUserSession = z.infer<typeof updateUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Time summary for analytics
export type TimeSummary = {
  totalAppTimeSeconds: number;
  totalGameTimeSeconds: number;
  averageSessionMinutes: number;
  totalSessions: number;
  averageGamesPerSession: number;
  dailyTimeData: { date: string; appTime: number; gameTime: number }[];
};

// Daily Quest Cities table
export const dailyQuestCities = pgTable("daily_quest_cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  region: varchar("region").notNull(),
  city: varchar("city").notNull(),
  country: varchar("country").notNull(),
  isCapital: boolean("is_capital").default(false),
  population: varchar("population"),
  currency: varchar("currency"),
  languages: varchar("languages"),
  flag: varchar("flag"),
  funFact: text("fun_fact"),
  bandColor: varchar("band_color"),
  imageUrl: varchar("image_url"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  usedOnDate: varchar("used_on_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_daily_quest_cities_region").on(table.region),
  index("IDX_daily_quest_cities_used").on(table.usedOnDate),
]);

export const insertDailyQuestCitySchema = createInsertSchema(dailyQuestCities).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyQuestCity = z.infer<typeof insertDailyQuestCitySchema>;
export type DailyQuestCity = typeof dailyQuestCities.$inferSelect;

// City Stickers - one per city in the Daily Quest system
export const cityStickers = pgTable("city_stickers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cityId: varchar("city_id").notNull().references(() => dailyQuestCities.id),
  city: varchar("city").notNull(),
  country: varchar("country").notNull(),
  continent: varchar("continent").notNull(),
  stickerIcon: varchar("sticker_icon"),
  funFact: text("fun_fact"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_city_stickers_city").on(table.cityId),
  index("IDX_city_stickers_continent").on(table.continent),
]);

export const insertCityStickerSchema = createInsertSchema(cityStickers).omit({
  id: true,
  createdAt: true,
});

export type InsertCitySticker = z.infer<typeof insertCityStickerSchema>;
export type CitySticker = typeof cityStickers.$inferSelect;

// User City Stickers - tracks which stickers each player has earned
export const userCityStickers = pgTable("user_city_stickers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  stickerId: varchar("sticker_id").notNull().references(() => cityStickers.id),
  earnedAt: timestamp("earned_at").defaultNow(),
  isTraded: boolean("is_traded").default(false),
  tradedAt: timestamp("traded_at"),
}, (table) => [
  index("IDX_user_stickers_visitor").on(table.visitorId),
  index("IDX_user_stickers_player").on(table.playerId),
  index("IDX_user_stickers_sticker").on(table.stickerId),
]);

export const insertUserCityStickerSchema = createInsertSchema(userCityStickers).omit({
  id: true,
  earnedAt: true,
  tradedAt: true,
});

export type InsertUserCitySticker = z.infer<typeof insertUserCityStickerSchema>;
export type UserCitySticker = typeof userCityStickers.$inferSelect;

// User Rewards - coloring sheets, country maps, continent maps
export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  rewardType: varchar("reward_type").notNull(), // 'coloring_sheet', 'country_map', 'continent_map'
  rewardName: varchar("reward_name").notNull(), // e.g. "Japan Map", "Europe Map", "Coloring Sheet #1"
  rewardUrl: varchar("reward_url"), // URL to the reward image (e.g. coloring sheet)
  rewardData: jsonb("reward_data"), // Additional data like country code, continent, etc.
  earnedAt: timestamp("earned_at").defaultNow(),
}, (table) => [
  index("IDX_user_rewards_visitor").on(table.visitorId),
  index("IDX_user_rewards_player").on(table.playerId),
  index("IDX_user_rewards_type").on(table.rewardType),
]);

export const insertUserRewardSchema = createInsertSchema(userRewards).omit({
  id: true,
  earnedAt: true,
});

export type InsertUserReward = z.infer<typeof insertUserRewardSchema>;
export type UserReward = typeof userRewards.$inferSelect;

// Legacy rank definitions (sticker-based, kept for backward compatibility)
export const EXPLORER_RANKS = [
  { id: 'rookie_explorer', name: 'Rookie Explorer', minStickers: 3, icon: '🌱' },
  { id: 'trailblazer', name: 'Trailblazer', requirement: '1_page_completed', icon: '🥾' },
  { id: 'map_master', name: 'Map Master', requirement: '1_country_map', icon: '🗺️' },
  { id: 'world_ranger', name: 'World Ranger', minStickers: 25, icon: '🌍' },
  { id: 'legendary_voyager', name: 'Legendary Voyager', requirement: '5_pages_completed', icon: '🏆' },
] as const;

export type ExplorerRank = typeof EXPLORER_RANKS[number];

export const XP_REWARDS = {
  GAME_WIN: 10,
  GAME_PLAY: 5,
  DAILY_QUEST_BONUS: 30,
  GEOATLAS_COUNTRY_LEARNED: 15,
  GEOATLAS_COUNTRY_MASTERED: 40,
  STORY_COMPLETED: 25,
  CITY_DISCOVERED: 25,
  CITY_MASTERED: 50,
  ADVENTURE_COMPLETED: 50,
  STREAK_BONUS_PER_DAY: 5,
  STREAK_BONUS_CAP: 50,
  ADVENTURE_STOP_COMPLETED: 20,
  MISSION_EASY: 5,
  MISSION_NORMAL: 10,
  MISSION_CHALLENGE: 20,
  MAP_PUZZLE_COMPLETED: 15,
  CROSSWORLD_WIN: 25,
  FLAG_QUEST_CORRECT: 10,
  CAPITAL_QUEST_CORRECT: 10,
  EXPERIENCE_COMPLETE: 15,
} as const;

export const EXPLORER_XP_RANKS = [
  { level: 1, id: 'explorer', name: 'Explorer', minXp: 0, icon: '🧭' },
  { level: 2, id: 'trail_seeker', name: 'Trail Seeker', minXp: 50, icon: '🥾' },
  { level: 3, id: 'pathfinder', name: 'Pathfinder', minXp: 150, icon: '🗺️' },
  { level: 4, id: 'city_spotter', name: 'City Spotter', minXp: 350, icon: '🔭' },
  { level: 5, id: 'cartographer', name: 'Cartographer', minXp: 650, icon: '🎭' },
  { level: 6, id: 'world_ranger', name: 'World Ranger', minXp: 1100, icon: '🌍' },
  { level: 7, id: 'navigator', name: 'Navigator', minXp: 1800, icon: '🧭' },
  { level: 8, id: 'voyager', name: 'Voyager', minXp: 2800, icon: '✈️' },
  { level: 9, id: 'world_scholar', name: 'World Scholar', minXp: 4200, icon: '📚' },
  { level: 10, id: 'master_explorer', name: 'Master Explorer', minXp: 6200, icon: '⭐' },
  { level: 11, id: 'geography_legend', name: 'Geography Legend', minXp: 9000, icon: '🏆' },
  { level: 12, id: 'geoquest_champion', name: 'GeoQuest Champion', minXp: 13000, icon: '👑' },
] as const;

export type ExplorerXpRank = typeof EXPLORER_XP_RANKS[number];

export const ELITE_XP_THRESHOLD = 13000;

export const ELITE_XP_RANKS = [
  { level: 13, id: 'world_architect', name: 'World Architect', minXp: 20000, icon: '🏛️', tagline: 'You reshape the map' },
  { level: 14, id: 'grand_pathfinder', name: 'Grand Pathfinder', minXp: 35000, icon: '🧭', tagline: 'No trail goes unmapped' },
  { level: 15, id: 'culture_keeper', name: 'Culture Keeper', minXp: 55000, icon: '🎭', tagline: 'Guardian of the world\'s stories' },
  { level: 16, id: 'legacy_explorer', name: 'Legacy Explorer', minXp: 80000, icon: '🗿', tagline: 'Your legend spans continents' },
  { level: 17, id: 'geomaster', name: 'GeoMaster', minXp: 120000, icon: '🌐', tagline: 'Master of all realms' },
  { level: 18, id: 'mythic_voyager', name: 'Mythic Voyager', minXp: 200000, icon: '⚡', tagline: 'Beyond the edge of the known world' },
] as const;

export type EliteXpRank = typeof ELITE_XP_RANKS[number];

export const KIT_TIER_RANK_GATES: Record<number, number> = {
  1: 0,
  2: 4,
  3: 7,
  4: 10,
};

export const KIT_TIER_NAMES = ['Locked', 'Bronze', 'Silver', 'Gold', 'Mythic'] as const;

export function getExplorerRank(totalXp: number) {
  const isElite = totalXp >= ELITE_XP_THRESHOLD;

  if (isElite) {
    const champion = EXPLORER_XP_RANKS[EXPLORER_XP_RANKS.length - 1];
    const firstEliteRank = ELITE_XP_RANKS[0];

    let currentEliteRank: typeof ELITE_XP_RANKS[number] | null = null;
    for (const rank of ELITE_XP_RANKS) {
      if (totalXp >= rank.minXp) {
        currentEliteRank = rank;
      } else {
        break;
      }
    }

    if (!currentEliteRank) {
      const xpInto = totalXp - champion.minXp;
      const xpNeeded = firstEliteRank.minXp - champion.minXp;
      const progress = Math.min(100, Math.round((xpInto / xpNeeded) * 100));
      return {
        rank: { level: champion.level, id: champion.id, name: champion.name, minXp: champion.minXp, icon: champion.icon },
        level: champion.level,
        totalXp,
        nextRank: { level: firstEliteRank.level, id: firstEliteRank.id, name: firstEliteRank.name, minXp: firstEliteRank.minXp, icon: firstEliteRank.icon },
        xpToNextRank: firstEliteRank.minXp - totalXp,
        progressPercent: progress,
        isElite: true,
        eliteRank: null,
        nextEliteRank: firstEliteRank,
      };
    }

    const eliteIndex = ELITE_XP_RANKS.findIndex(r => r.id === currentEliteRank!.id);
    const nextEliteRank = eliteIndex < ELITE_XP_RANKS.length - 1
      ? ELITE_XP_RANKS[eliteIndex + 1]
      : null;

    const xpIntoCurrentLevel = totalXp - currentEliteRank.minXp;
    const xpNeededForNext = nextEliteRank ? nextEliteRank.minXp - currentEliteRank.minXp : 0;
    const progressPercent = nextEliteRank
      ? Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNext) * 100))
      : 100;

    return {
      rank: { level: currentEliteRank.level, id: currentEliteRank.id, name: currentEliteRank.name, minXp: currentEliteRank.minXp, icon: currentEliteRank.icon },
      level: currentEliteRank.level,
      totalXp,
      nextRank: nextEliteRank ? { level: nextEliteRank.level, id: nextEliteRank.id, name: nextEliteRank.name, minXp: nextEliteRank.minXp, icon: nextEliteRank.icon } : null,
      xpToNextRank: nextEliteRank ? nextEliteRank.minXp - totalXp : 0,
      progressPercent,
      isElite: true,
      eliteRank: currentEliteRank,
      nextEliteRank,
    };
  }

  let currentRank = EXPLORER_XP_RANKS[0];
  for (const rank of EXPLORER_XP_RANKS) {
    if (totalXp >= rank.minXp) {
      currentRank = rank;
    } else {
      break;
    }
  }

  const currentIndex = EXPLORER_XP_RANKS.findIndex(r => r.id === currentRank.id);
  const nextRank = currentIndex < EXPLORER_XP_RANKS.length - 1
    ? EXPLORER_XP_RANKS[currentIndex + 1]
    : null;

  const xpIntoCurrentLevel = totalXp - currentRank.minXp;
  const xpNeededForNext = nextRank ? nextRank.minXp - currentRank.minXp : 0;
  const progressPercent = nextRank
    ? Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNext) * 100))
    : 100;

  return {
    rank: currentRank as { level: number; id: string; name: string; minXp: number; icon: string },
    level: currentRank.level,
    totalXp,
    nextRank: nextRank as { level: number; id: string; name: string; minXp: number; icon: string } | null,
    xpToNextRank: nextRank ? nextRank.minXp - totalXp : 0,
    progressPercent,
    isElite: false,
    eliteRank: null,
    nextEliteRank: null,
  };
}

// Trade request schema
export const tradeStickersSchema = z.object({
  visitorId: z.string(),
  playerId: z.string().optional(),
  stickerIds: z.array(z.string()).length(5),
});

export type TradeStickersRequest = z.infer<typeof tradeStickersSchema>;

// Mini-game definitions
export const MINI_GAMES = [
  { id: 'memory_match', name: 'Memory Match', description: 'Match city and flag pairs!', icon: '🧠', cost: 0, difficulty: 'easy' },
  { id: 'flag_quiz', name: 'Flag Quiz', description: 'Guess the country from its flag!', icon: '🏁', cost: 0, difficulty: 'easy' },
  { id: 'globe_spinner', name: 'Spin the Globe', description: 'Spin and learn about random places!', icon: '🌍', cost: 0, difficulty: 'easy' },
  { id: 'map_me', name: 'Map Me', description: 'Find which continent a city is in!', icon: '🗺️', cost: 0, difficulty: 'easy' },
  { id: 'city_vibe', name: 'City Vibe', description: 'Match cities with their personality!', icon: '✨', cost: 0, difficulty: 'easy' },
  { id: 'geo_maze', name: 'GeoMaze', description: 'Navigate mazes to find flags!', icon: '🧭', cost: 0, difficulty: 'easy' },
  { id: 'capital_dash', name: 'Capital Dash', description: 'Match capitals to countries!', icon: '🏃', cost: 5, difficulty: 'medium' },
] as const;

export type MiniGameId = typeof MINI_GAMES[number]['id'];

// User Mini-game Progress - tracks unlocked games and high scores
export const userMiniGames = pgTable("user_mini_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  gameId: varchar("game_id").notNull(),
  isUnlocked: boolean("is_unlocked").default(false),
  unlockedAt: timestamp("unlocked_at"),
  timesPlayed: integer("times_played").default(0),
  highScore: integer("high_score").default(0),
  lastPlayedAt: timestamp("last_played_at"),
  stickersSpent: integer("stickers_spent").default(0),
}, (table) => [
  index("IDX_user_mini_games_visitor").on(table.visitorId),
  index("IDX_user_mini_games_game").on(table.gameId),
]);

export const insertUserMiniGameSchema = createInsertSchema(userMiniGames).omit({
  id: true,
  unlockedAt: true,
  lastPlayedAt: true,
});

export type InsertUserMiniGame = z.infer<typeof insertUserMiniGameSchema>;
export type UserMiniGame = typeof userMiniGames.$inferSelect;

// Geo-Art Creations - stores user-created flags
export const geoArtCreations = pgTable("geo_art_creations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  countryCode: varchar("country_code").notNull(),
  countryName: varchar("country_name").notNull(),
  imageData: text("image_data").notNull(),
  stamps: jsonb("stamps").default([]),
  stickerAwarded: boolean("sticker_awarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_geo_art_visitor").on(table.visitorId),
  index("IDX_geo_art_country").on(table.countryCode),
]);

export const insertGeoArtCreationSchema = createInsertSchema(geoArtCreations).omit({
  id: true,
  createdAt: true,
});

export type InsertGeoArtCreation = z.infer<typeof insertGeoArtCreationSchema>;
export type GeoArtCreation = typeof geoArtCreations.$inferSelect;

export const proWaitlist = pgTable("pro_waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  visitorId: varchar("visitor_id"),
  playerId: varchar("player_id").references(() => players.id),
  userId: varchar("user_id").references(() => users.id),
  source: varchar("source").default("upgrade_dialog"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_pro_waitlist_email").on(table.email),
]);

export const insertProWaitlistSchema = createInsertSchema(proWaitlist).omit({
  id: true,
  createdAt: true,
});

export type InsertProWaitlist = z.infer<typeof insertProWaitlistSchema>;
export type ProWaitlist = typeof proWaitlist.$inferSelect;

// Reward Tiers - defines milestone rewards for mastery achievements
export const rewardTiers = pgTable("reward_tiers", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  triggerType: varchar("trigger_type").notNull(), // 'cities_mastered', 'continent_mastered', 'continents_mastered'
  triggerValue: integer("trigger_value").notNull(), // Number of cities/continents required
  triggerContinent: varchar("trigger_continent"), // Optional: specific continent for continent_mastered
  rewardType: varchar("reward_type").notNull(), // 'certificate', 'sticker_pack', 'world_map_puzzle', 'magazine_subscription'
  rewardDescription: text("reward_description").notNull(),
  displayOrder: integer("display_order").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRewardTierSchema = createInsertSchema(rewardTiers).omit({
  createdAt: true,
});

export type InsertRewardTier = z.infer<typeof insertRewardTierSchema>;
export type RewardTier = typeof rewardTiers.$inferSelect;

// Reward Unlocks - tracks which rewards each explorer has unlocked/claimed
export const rewardUnlocks = pgTable("reward_unlocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull().references(() => players.id),
  tierId: varchar("tier_id").notNull().references(() => rewardTiers.id),
  status: varchar("status").notNull().default("unlocked"), // 'unlocked', 'claimed', 'fulfilled'
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  claimedAt: timestamp("claimed_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  parentEmail: varchar("parent_email"),
  shippingAddress: text("shipping_address"),
  claimData: jsonb("claim_data"), // Additional claim details (city names for certificate, etc.)
}, (table) => [
  index("IDX_reward_unlocks_explorer").on(table.explorerId),
  index("IDX_reward_unlocks_tier").on(table.tierId),
  index("IDX_reward_unlocks_status").on(table.status),
]);

export const insertRewardUnlockSchema = createInsertSchema(rewardUnlocks).omit({
  id: true,
  unlockedAt: true,
  claimedAt: true,
  fulfilledAt: true,
});

export type InsertRewardUnlock = z.infer<typeof insertRewardUnlockSchema>;
export type RewardUnlock = typeof rewardUnlocks.$inferSelect;

// Reward claim schema for parent submissions
export const rewardClaimSchema = z.object({
  unlockId: z.string(),
  parentEmail: z.string().email(),
  shippingAddress: z.string().optional(),
});

export type RewardClaim = z.infer<typeof rewardClaimSchema>;

// Default reward tiers configuration
export const DEFAULT_REWARD_TIERS: InsertRewardTier[] = [
  {
    id: 'tier_early_win',
    name: 'Early Win',
    description: 'Master your first 3 cities',
    triggerType: 'cities_mastered',
    triggerValue: 3,
    rewardType: 'certificate',
    rewardDescription: 'Printable Geography Explorer Certificate',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'tier_explorer_pack',
    name: 'Explorer Pack',
    description: 'Master all cities in one continent',
    triggerType: 'continent_mastered',
    triggerValue: 1,
    rewardType: 'sticker_pack',
    rewardDescription: 'Geography Sticker Pack',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'tier_world_builder',
    name: 'World Builder',
    description: 'Master 20 cities around the world',
    triggerType: 'cities_mastered',
    triggerValue: 20,
    rewardType: 'world_map_puzzle',
    rewardDescription: 'World Map Puzzle or Mini Globe',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'tier_global_explorer',
    name: 'Global Explorer',
    description: 'Master cities in 4 or more continents',
    triggerType: 'continents_mastered',
    triggerValue: 4,
    rewardType: 'magazine_subscription',
    rewardDescription: 'National Geographic Kids Magazine Subscription',
    displayOrder: 4,
    isActive: true,
  },
];

// ============================================================================
// TRAVEL MODE TABLES (Isolated from World Mode)
// These tables support the Travel Mode feature and do not affect existing game data
// ============================================================================

// Travel Trips - Family-level trips (not explorer-specific)
export const travelTrips = pgTable("travel_trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  guestToken: varchar("guest_token", { length: 64 }),
  name: varchar("name").notNull(), // e.g., "Hawaii Trip"
  continent: varchar("continent"), // e.g., "North America"
  country: varchar("country").notNull(), // e.g., "USA"
  city: varchar("city"), // e.g., "Big Island" - text field for island/city
  destination: varchar("destination").notNull(), // Computed display name e.g., "Big Island, Hawaii"
  startDate: timestamp("start_date"), // Keep for backward compat, optional
  endDate: timestamp("end_date"), // Keep for backward compat, optional
  travelMonth: integer("travel_month"), // 1-12, optional for memory purposes
  travelYear: integer("travel_year"), // e.g., 2024, optional for memory purposes
  // Stores explorer info for travelers: { explorerId, name, avatarKey }[]
  travelers: jsonb("travelers").default([]),
  travelerNames: jsonb("traveler_names").default([]), // Legacy field, keeping for compatibility
  status: varchar("status").default("upcoming"), // 'upcoming', 'active', 'completed'
  adventureStartedAt: timestamp("adventure_started_at"), // When user explicitly started the adventure
  completedAt: timestamp("completed_at"), // When trip was marked complete
  isLocked: boolean("is_locked").default(false), // When Finish Adventure clicked, locks editing
  recapCompleted: boolean("recap_completed").default(false), // Adventure Recap completed
  recapResponses: jsonb("recap_responses").default([]), // Reflection question answers (legacy)
  memoryAnchor: text("memory_anchor"), // Single emotional bookmark: "What was your favorite moment?"
  memoryPrompt: varchar("memory_prompt"), // The prompt shown to the user for their memory anchor
  recapTitle: varchar("recap_title"), // User-selected title from Pick Title game (stored separately from name)
  storySaved: boolean("story_saved").default(false), // Story has been saved by user
  videoSaved: boolean("video_saved").default(false), // Video has been saved by user
  savedVideoUrl: varchar("saved_video_url"), // URL of the saved video
  totalMemoryStars: integer("total_memory_stars").default(0),
  engagementScore: integer("engagement_score").default(0), // Calculated from moments, responses, etc
  journeyPacksUnlocked: integer("journey_packs_unlocked").default(2), // First 2 free
  offlineReady: boolean("offline_ready").default(false), // Has content been downloaded?
  packedItems: jsonb("packed_items").default([]), // Array of packed item IDs for packing list
  latitude: varchar("latitude"), // For mapping
  longitude: varchar("longitude"), // For mapping
  adventureContext: varchar("adventure_context").default("travel"), // 'travel' | 'home' - whether this is a real trip or home exploration
  // Capability flags - At-Home gets all false, Travel gets all true
  allowCompletion: boolean("allow_completion").default(true), // Can this trip be marked as completed/locked?
  allowKeepsakes: boolean("allow_keepsakes").default(true), // Can user earn/collect keepsakes?
  allowMediaCapture: boolean("allow_media_capture").default(true), // Can user capture photos/moments?
  allowOffline: boolean("allow_offline").default(true), // Can content be downloaded for offline use?
  allowMapDisplay: boolean("allow_map_display").default(true), // Should this trip appear on travel map?
  contentDepth: varchar("content_depth").default("full"), // 'preview' | 'full' - intro-level vs deep content
  adventureStyle: varchar("adventure_style").default("family_explorer"), // 'family_explorer' | 'nature_expedition' | 'history_culture' | 'iconic_highlights' | 'foodie_adventure' | 'city_explorer'
  pace: varchar("pace").default("balanced"), // 'chill' | 'balanced' | 'packed' — controls stops-per-day in day grouping
  tripDays: integer("trip_days"), // Intended trip length in days (persisted so day grouping is always correct)
  cityDates: jsonb("city_dates").default(null), // Per-city date ranges: Record<string, { startDate: string; endDate: string }>
  stayLocations: jsonb("stay_locations").default(null), // { cityName?: string; name: string; address: string; checkIn: string; checkOut: string }[]
  dayOverrides: jsonb("day_overrides").default(null), // { [dayIdx: string]: { startLocation?: { name: string; address: string }; endLocation?: { name: string; address: string } } }
  mealPreferences: jsonb("meal_preferences").default(null), // { enabled, breakfast, lunch, snacks, dinner, diningStyle, cuisines: string[] }
  tailoring: jsonb("tailoring").default(null), // { kidsEnergy, kidInterests, indoorOutdoor, budgetLevel, strollerFriendly }
  totalMissions: integer("total_missions").default(0),
  missionsCompleted: integer("missions_completed").default(0),
  missionXpTotal: integer("mission_xp_total").default(0),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_travel_trips_user").on(table.userId),
]);

// Travel Stops - Individual locations within a trip
export const travelStops = pgTable("travel_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  name: varchar("name").notNull(), // e.g., "Volcanoes National Park"
  description: text("description"), // Description of the stop
  latitude: varchar("latitude"), // Specific stop coordinates
  longitude: varchar("longitude"), // Specific stop coordinates
  stopType: varchar("stop_type").default("landmark"), // 'landmark', 'museum', 'nature', 'beach', 'park', 'temple', 'market', 'restaurant', 'viewpoint', 'zoo', 'aquarium', 'garden', 'plaza', 'palace', 'bridge', 'waterfall', 'volcano', 'neighborhood', 'street_food', 'street', 'mountain', 'food', 'culture', 'adventure', 'city', 'other'
  address: varchar("address"), // Optional address for the location
  displayOrder: integer("display_order").default(0),
  isVisited: boolean("is_visited").default(false),
  isSkipped: boolean("is_skipped").default(false), // True when stop was intentionally bypassed due to missed day (keeps isVisited=false)
  visitedAt: timestamp("visited_at"),
  visitedMode: varchar("visited_mode").$type<"completed" | "skipped">(),
  journeyPackCompleted: boolean("journey_pack_completed").default(false), // All 4 sections completed
  reflectionPrompt: varchar("reflection_prompt"), // GeoMoment Reflection question shown after stop
  reflectionResponse: text("reflection_response"), // Child's journaled response
  missionType: varchar("mission_type"), // 'knowledge' | 'observation' | 'curiosity'
  missionQuestion: text("mission_question"), // The mission prompt/question
  missionHint: varchar("mission_hint"), // Optional hint for the mission
  missionAnswer: varchar("mission_answer"), // Expected answer (for knowledge type)
  missionDifficulty: varchar("mission_difficulty").default("normal"), // 'easy' | 'normal' | 'challenge'
  missionCompleted: boolean("mission_completed").default(false),
  missionCompletedAt: timestamp("mission_completed_at"),
  missionXpAwarded: integer("mission_xp_awarded").default(0),
  missionKeepsakeReward: boolean("mission_keepsake_reward").default(false), // Whether completing this mission awards a keepsake
  stopMissions: jsonb("stop_missions"), // JSON array of ExplorerChallengeMission objects
  cityGroup: varchar("city_group"), // Which city this stop belongs to (for multi-city trips)
  dayIndex: integer("day_index"), // Which day this stop belongs to (0-based, sticky — never recalculated)
  isFavorite: boolean("is_favorite").default(false), // Marked as a trip highlight
  favoriteSource: varchar("favorite_source", { length: 20 }), // 'manual' | 'auto'
  favoriteScore: integer("favorite_score").default(0), // Scoring for auto-selection
  /** True when the planner flagged this stop as low-confidence (sourceConfidence < 55). */
  reviewRequired: boolean("review_required").default(false),
  /** Explanation shown to the parent when they tap the reviewRequired badge. */
  reviewNote: text("review_note"),
  // Phase 1: reserved for Phase 2 execution snapshot bridge fields.
  // Will store: whyPlacedHere, familyFitLabel, practicalHighlights, bestTimeTip,
  // doThisFirst, parkingSignal, ticketSignal, routeMeta, confidenceSummary.
  // Populated at start-adventure time from planner intelligence tables.
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_travel_stops_trip").on(table.tripId),
]);

export interface ExplorerChallengeMission {
  type: "knowledge" | "observation" | "photo";
  question: string;
  options?: string[];
  correctOption?: number;
  xpReward: number;
  completed: boolean;
  skipped: boolean;
  attempts?: number;
  textResponse?: string;
  photoUrl?: string;
}

/**
 * StopExecutionSnapshot — Phase 2
 *
 * Stored in travel_stops.metadata (JSONB). Populated at Start Adventure time
 * by copying intelligence from the planner tables so execution screens don't
 * need to query planner data live.
 *
 * All fields are optional — stops created before Phase 2 have metadata: null.
 * Execution screens must always fall back gracefully when metadata is null.
 *
 * DO NOT add speculative fields. Only populate what is mapped in Phase 1.5.
 */
export interface StopExecutionSnapshot {
  // ── Planner origin ─────────────────────────────────────────────────────────
  /** ID of the planner_trip_plan_stops row this stop was created from */
  plannerStopId?: string;
  /** ID of the planner_places master record */
  plannerPlaceId?: string;

  // ── Scheduling context ─────────────────────────────────────────────────────
  /** Day number within the trip (1-indexed) */
  dayNumber?: number;
  /** Position in day (0-indexed display order) */
  sequenceInDay?: number;
  /**
   * Functional role of this stop in the day.
   * Sourced from planner_trip_plan_stops.familyAnchorType.
   * Note: familyAnchorType may be generic — treat this as a best-effort label.
   * Values: 'anchor' | 'support' | 'treat' | 'meal' | 'reset' or raw planner value
   */
  stopRole?: string;

  // ── Family-facing intelligence ─────────────────────────────────────────────
  /** Why this stop was placed here for this family (planner_trip_plan_stops.whyNow) */
  whyPlacedHere?: string;
  /** Best-for-ages label (planner_stop_intelligence.bestForAgesLabel) */
  familyFitLabel?: string;
  /** 2-3 bullet practical highlights (first items from planner_place_profiles.practicalTips) */
  practicalHighlights?: string[];
  /**
   * Best arrival window (planner_stop_intelligence.bestArrivalWindow).
   * e.g. "Go before 10am to beat crowds"
   */
  bestTimeTip?: string;
  /**
   * Most important action at this stop (practicalTips[0]).
   * Note: placeholder-quality mapping — do not treat as perfect editorial.
   */
  doThisFirst?: string;

  // ── Practical signals ──────────────────────────────────────────────────────
  /**
   * Parking availability signal.
   * true = easy/free, false = difficult/paid, null = unknown.
   * Sourced from parkingAvailabilityScore > 60 (planner_stop_intelligence).
   */
  parkingSignal?: boolean | null;
  /**
   * Ticket/booking required signal (planner_place_reference.bookingRequired).
   * true = booking required, false = walk-in OK, null = unknown.
   */
  ticketSignal?: boolean | null;
  /** Restroom confidence score 0-100 (planner_stop_intelligence.restroomConfidence) */
  restroomConfidence?: number;
  /** true if foodConfidence > 50 (planner_stop_intelligence.foodConfidence) */
  foodNearby?: boolean | null;
  /** Stroller-friendly flag (planner_place_profiles.strollerFriendly) */
  strollerFriendly?: boolean | null;

  // ── Travel context ─────────────────────────────────────────────────────────
  /** Estimated travel minutes from the previous stop */
  travelMinutes?: number;
  /** Travel mode: 'walking' | 'driving' | 'transit' */
  travelMode?: string;

  // ── Rescue layer suggestions ───────────────────────────────────────────────
  /** Break suggestion (planner_parent_support.breakSuggestion) */
  breakSuggestion?: string;
  /** Food suggestion (planner_parent_support.foodSuggestion) */
  foodSuggestion?: string;
  /** Keep-going suggestion (planner_parent_support.keepGoingSuggestion) */
  keepGoingSuggestion?: string;
  /** Shorten suggestion (planner_parent_support.shortenSuggestion) */
  shortenSuggestion?: string;

  // ── Confidence meta ─────────────────────────────────────────────────────────
  /** Human-readable confidence summary (planner_stop_intelligence.rationaleShort) */
  confidenceSummary?: string;
  /** ISO timestamp when this snapshot was generated */
  snapshotGeneratedAt?: string;
}

// Journey Packs - Pre-trip content for each stop
export const journeyPacks = pgTable("journey_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").references(() => travelStops.id).notNull(),
  audioFactUrl: varchar("audio_fact_url"), // URL to audio file
  audioFactText: text("audio_fact_text"), // Text transcript of audio (legacy short facts)
  // Podcast-style story content (5-10 minute stories)
  storyTitle: varchar("story_title"), // Episode title
  storyContent: text("story_content"), // Full story text with narrator cues
  storyChapters: jsonb("story_chapters").default([]), // Array of {title, content} chapter objects
  bonusChapters: jsonb("bonus_chapters").default([]), // Optional deep-dive chapters: legacy, kept for backward compat
  storyDuration: varchar("story_duration"), // Estimated duration e.g. "~7 minutes"
  preStopRiddle: text("pre_stop_riddle"), // Optional riddle/clue about the place for Listen Stories
  wonderPrompt: text("wonder_prompt"), // Open-ended question for kids
  parentTip: text("parent_tip"), // Tip visible only to parents
  journeyGame1Type: varchar("journey_game1_type"), // 'guess_before', 'this_or_that', 'spot_it'
  journeyGame1Data: jsonb("journey_game1_data"), // Game configuration
  journeyGame2Type: varchar("journey_game2_type"),
  journeyGame2Data: jsonb("journey_game2_data"),
  gamesUnlocked: boolean("games_unlocked").default(false),
  isCompleted: boolean("is_completed").default(false),
  // Explore the Area data
  exploreData: jsonb("explore_data").default(null), // { aboutArea, nearbyAttractions, restaurants, gettingAround }
  // Story Pack new sections (added in Story Pack overhaul)
  quickHits: jsonb("quick_hits").default([]), // string[] — 3-5 surprising facts (one string per fact)
  whoMadeThis: text("who_made_this"), // "Who Made This & Why" audio section text
  dontMissThis: jsonb("dont_miss_this").default(null), // { highlights: string[], shortOnTime: string }
  curiousQuestion: text("curious_question"), // One curiosity-driving question for the child
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_journey_packs_stop").on(table.stopId),
]);

export const ttsAudioCache = pgTable("tts_audio_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: varchar("cache_key").notNull().unique(),
  audioData: text("audio_data").notNull(),
  voice: varchar("voice").notNull(),
  textLength: integer("text_length").notNull(),
  audioSize: integer("audio_size").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_tts_cache_key").on(table.cacheKey),
]);

export const explorerKitItems = pgTable("explorer_kit_items", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(),
  tiers: jsonb("tiers").notNull().default([]),
  iconPrefix: varchar("icon_prefix").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isSurprise: boolean("is_surprise").default(false),
  surpriseChance: integer("surprise_chance").default(0),
  surpriseEligibleEvents: jsonb("surprise_eligible_events").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playerExplorerKit = pgTable("player_explorer_kit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").references(() => players.id).notNull(),
  itemId: varchar("item_id").references(() => explorerKitItems.id).notNull(),
  currentTier: integer("current_tier").notNull().default(1),
  progressValue: integer("progress_value").notNull().default(0),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  lastUpgradedAt: timestamp("last_upgraded_at").defaultNow(),
}, (table) => [
  index("IDX_player_kit_player").on(table.playerId),
  index("IDX_player_kit_item").on(table.itemId),
]);

export const playerSurpriseItems = pgTable("player_surprise_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").references(() => players.id).notNull(),
  itemId: varchar("item_id").references(() => explorerKitItems.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
}, (table) => [
  index("IDX_surprise_items_player").on(table.playerId),
]);

// Moments - Family journaling entries (photos + reflections)
export const travelMoments = pgTable("travel_moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  stopId: varchar("stop_id").references(() => travelStops.id), // Optional link to specific stop
  photoUrl: text("photo_url"), // Legacy: single photo (kept for backwards compatibility)
  photoUrls: jsonb("photo_urls").default([]), // Array of photo URLs for multiple photos
  kidPromptResponse: text("kid_prompt_response"), // "Best thing I saw was ___"
  parentPromptResponse: text("parent_prompt_response"), // "My favorite kid moment was ___"
  geoFact: text("geo_fact"), // Auto-added geography fact
  createdByExplorerId: varchar("created_by_explorer_id"), // Who created this moment
  isFavorite: boolean("is_favorite").default(false), // Mark moment as a favorite
  isSharedCommunity: boolean("is_shared_community").default(false), // Opt-in: share with other families exploring this city
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_travel_moments_trip").on(table.tripId),
]);

// Memory Stars - Family-level recall tracking
export const memoryStars = pgTable("memory_stars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  stopId: varchar("stop_id").references(() => travelStops.id),
  starsEarned: integer("stars_earned").default(0), // 0-3 stars
  memoryStrength: varchar("memory_strength").default("fresh"), // 'fresh', 'fading', 'strong'
  lastRecallDate: timestamp("last_recall_date"),
  recallCount: integer("recall_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_memory_stars_trip").on(table.tripId),
]);

// Remember This Cards - Recall prompts shown in World Mode
export const rememberThisCards = pgTable("remember_this_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  momentId: varchar("moment_id").references(() => travelMoments.id),
  question: text("question").notNull(),
  expectedAnswer: text("expected_answer"),
  photoUrl: text("photo_url"), // Base64 data URL or uploaded photo URL
  scheduledFor: timestamp("scheduled_for"), // When to show this card
  stage: varchar("stage").default("stage1"), // 'stage1' (3 days), 'stage2' (2-3 weeks), 'stage3' (3 months)
  isAnswered: boolean("is_answered").default(false),
  answeredByExplorerId: varchar("answered_by_explorer_id"),
  answerQuality: varchar("answer_quality"), // 'strong', 'weak', 'skipped'
  createdAt: timestamp("created_at").defaultNow(),
});

// Wonder Responses - Kid responses to wonder prompts during Journey Packs
export const travelWonderResponses = pgTable("travel_wonder_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  stopId: varchar("stop_id").references(() => travelStops.id).notNull(),
  explorerId: varchar("explorer_id"), // Which kid/explorer responded
  response: text("response").notNull(),
  promptUsed: text("prompt_used"), // The wonder question that was asked
  capturedAt: timestamp("captured_at").defaultNow(),
});

// Journey Game Prompts - Cached dynamic game questions per stop
export const journeyGamePrompts = pgTable("journey_game_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").references(() => travelStops.id).notNull(),
  gameType: varchar("game_type").notNull(), // 'guess', 'thisorthat', 'spotit', 'buildit'
  promptData: jsonb("prompt_data").notNull(), // The game question data
  generatedAt: timestamp("generated_at").defaultNow(),
});

// Trip Stories - Auto-generated "Family Lore" narratives
export const travelTripStories = pgTable("travel_trip_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  title: varchar("title").notNull(), // e.g., "Our Hawaii Adventure"
  storyHtml: text("story_html").notNull(), // Rich narrative content
  storySummary: text("story_summary"), // Short 1-2 sentence summary for cards
  memoryStrength: varchar("memory_strength").default("strong"), // 'strong', 'medium', 'light'
  highlights: jsonb("highlights").default([]), // Array of key moment excerpts
  photoUrls: jsonb("photo_urls").default([]), // Array of photos used in story
  geoFactsUsed: jsonb("geo_facts_used").default([]), // Facts woven into story
  generatorVersion: varchar("generator_version").default("v1"),
  generatedAt: timestamp("generated_at").defaultNow(),
  regeneratedAt: timestamp("regenerated_at"),
});

// Trail Tales - "Who Am I" riddle game for travel memories
export const trailTalesRiddles = pgTable("trail_tales_riddles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  stopId: varchar("stop_id").references(() => travelStops.id).notNull(), // The stop this riddle is about
  riddleText: text("riddle_text").notNull(), // "Tall and flowing, I have a small rainbow where I fall"
  riddleType: varchar("riddle_type").default("location"), // 'location', 'animal', 'culture', 'photo_memory'
  answer: varchar("answer").notNull(), // e.g., "Akaka Falls"
  answerOptions: jsonb("answer_options").default([]), // Multiple choice options: ["Akaka Falls", "Rainbow Falls", "Wailua Falls"]
  photoHint: text("photo_hint"), // Optional photo URL from moments to show as hint
  difficulty: varchar("difficulty").default("easy"), // 'easy', 'medium', 'hard'
  stopsDelayBefore: integer("stops_delay_before").default(3), // Show 3 stops after visiting
  isUnlocked: boolean("is_unlocked").default(false), // Has the player visited enough stops?
  unlockedAt: timestamp("unlocked_at"), // When riddle became available
  createdAt: timestamp("created_at").defaultNow(),
});

// Trail Tales Attempts - Track explorer attempts at riddles
export const trailTalesAttempts = pgTable("trail_tales_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  riddleId: varchar("riddle_id").references(() => trailTalesRiddles.id).notNull(),
  explorerId: varchar("explorer_id").notNull(), // Which explorer attempted
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  selectedAnswer: varchar("selected_answer"), // What they guessed
  isCorrect: boolean("is_correct").default(false),
  memoryStarsEarned: integer("memory_stars_earned").default(0), // 0-3 stars based on performance
  attemptNumber: integer("attempt_number").default(1), // Which attempt (allows retries)
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

// Trail Tales Progress - Overall progress per explorer per trip
export const trailTalesProgress = pgTable("trail_tales_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  explorerId: varchar("explorer_id").notNull(),
  totalRiddles: integer("total_riddles").default(0),
  correctAnswers: integer("correct_answers").default(0),
  totalMemoryStars: integer("total_memory_stars").default(0),
  isMemoryChampion: boolean("is_memory_champion").default(false), // Earned Memory Champion badge
  championEarnedAt: timestamp("champion_earned_at"),
  lastPlayedAt: timestamp("last_played_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Journey Pack Progress - Track completed sections per stop per explorer
export const journeyPackProgress = pgTable("journey_pack_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopId: varchar("stop_id").references(() => travelStops.id).notNull(),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  explorerId: varchar("explorer_id").notNull(),
  completedSections: text("completed_sections").array().default([]), // ['listen', 'wonder', 'parent', 'games']
  listenProgress: integer("listen_progress").default(0), // Chapter progress (0-based)
  wonderResponse: text("wonder_response"), // Kid's response to wonder prompt
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// REFLECTION GAMES TABLES (Layer 3 - Backward-looking, meaning-making)
// These games appear ONLY in recaps: Adventure Recap, End-of-Day, End-of-Trip
// Never in Journey Packs, never per stop
// ============================================================================

// Reflection Game Sessions - Tracks recap sessions and their games
export const reflectionGameSessions = pgTable("reflection_game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  explorerId: varchar("explorer_id").notNull(),
  sessionType: varchar("session_type").notNull(), // 'adventure_recap', 'end_of_day', 'end_of_trip'
  gamesPlayed: jsonb("games_played").default([]), // Array of game types played in this session
  totalStarsEarned: integer("total_stars_earned").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  stopsIncluded: jsonb("stops_included").default([]), // Array of stop IDs included in this recap
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_reflection_sessions_trip").on(table.tripId),
  index("IDX_reflection_sessions_explorer").on(table.explorerId),
]);

// Reflection Game Cache - Stores AI-generated game content per trip
export const reflectionGameCache = pgTable("reflection_game_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  gameType: varchar("game_type").notNull(), // 'who_am_i', 'guess_where', 'doesnt_belong', 'this_belongs', 'pick_title', 'story_spark'
  stopId: varchar("stop_id").references(() => travelStops.id), // Optional, for stop-specific games
  gameData: jsonb("game_data").notNull(), // AI-generated game content (clues, options, explanations)
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration for cache invalidation
});

// Reflection Game Responses - Individual game responses per explorer
export const reflectionGameResponses = pgTable("reflection_game_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => reflectionGameSessions.id).notNull(),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  explorerId: varchar("explorer_id").notNull(),
  gameType: varchar("game_type").notNull(),
  stopId: varchar("stop_id").references(() => travelStops.id), // Optional, for stop-specific games
  selectedAnswer: varchar("selected_answer"), // User's selection
  isCorrect: boolean("is_correct"), // null for open-ended games
  starsEarned: integer("stars_earned").default(0), // 0 or 1
  responseData: jsonb("response_data").default({}), // Additional response details (clues revealed, etc)
  respondedAt: timestamp("responded_at").defaultNow(),
}, (table) => [
  index("IDX_reflection_responses_session").on(table.sessionId),
]);

// Reflection Game Types for TypeScript
export type ReflectionGameType = 'who_am_i' | 'guess_where' | 'doesnt_belong' | 'this_belongs' | 'pick_title' | 'story_spark';
export type ReflectionSessionType = 'adventure_recap' | 'end_of_day' | 'end_of_trip';

// Insert schemas for Reflection Games
export const insertReflectionGameSessionSchema = createInsertSchema(reflectionGameSessions).omit({
  id: true,
  createdAt: true,
});

export const insertReflectionGameCacheSchema = createInsertSchema(reflectionGameCache).omit({
  id: true,
  generatedAt: true,
});

export const insertReflectionGameResponseSchema = createInsertSchema(reflectionGameResponses).omit({
  id: true,
  respondedAt: true,
});

// Types for Reflection Games
export type ReflectionGameSession = typeof reflectionGameSessions.$inferSelect;
export type InsertReflectionGameSession = z.infer<typeof insertReflectionGameSessionSchema>;
export type ReflectionGameCache = typeof reflectionGameCache.$inferSelect;
export type InsertReflectionGameCache = z.infer<typeof insertReflectionGameCacheSchema>;
export type ReflectionGameResponse = typeof reflectionGameResponses.$inferSelect;
export type InsertReflectionGameResponse = z.infer<typeof insertReflectionGameResponseSchema>;

// Travel Mode Insert Schemas
export const insertTravelTripSchema = createInsertSchema(travelTrips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTravelStopSchema = createInsertSchema(travelStops).omit({
  id: true,
  createdAt: true,
});

export const insertJourneyPackSchema = createInsertSchema(journeyPacks).omit({
  id: true,
  createdAt: true,
});

export const insertTravelMomentSchema = createInsertSchema(travelMoments).omit({
  id: true,
  createdAt: true,
});

export const insertMemoryStarsSchema = createInsertSchema(memoryStars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRememberThisCardSchema = createInsertSchema(rememberThisCards).omit({
  id: true,
  createdAt: true,
});

export const insertWonderResponseSchema = createInsertSchema(travelWonderResponses).omit({
  id: true,
  capturedAt: true,
});

export const insertJourneyGamePromptSchema = createInsertSchema(journeyGamePrompts).omit({
  id: true,
  generatedAt: true,
});

export const insertTripStorySchema = createInsertSchema(travelTripStories).omit({
  id: true,
  generatedAt: true,
});

export const insertTrailTalesRiddleSchema = createInsertSchema(trailTalesRiddles).omit({
  id: true,
  createdAt: true,
});

export const insertTrailTalesAttemptSchema = createInsertSchema(trailTalesAttempts).omit({
  id: true,
  attemptedAt: true,
});

export const insertTrailTalesProgressSchema = createInsertSchema(trailTalesProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJourneyPackProgressSchema = createInsertSchema(journeyPackProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Travel Artifacts - Collectible items tied to stops
export const travelArtifacts = pgTable("travel_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stopName: varchar("stop_name").notNull(), // Matches stop name for preset artifacts
  name: varchar("name").notNull(), // e.g., "Lava Crystal"
  description: text("description"), // Kid-friendly description
  imageEmoji: varchar("image_emoji").default("🏺"), // Emoji representation
  rarity: varchar("rarity").default("common"), // 'common', 'rare', 'legendary'
  unlockType: varchar("unlock_type").notNull(), // 'listen', 'photo', 'find_icon', 'quiz'
  unlockConfig: jsonb("unlock_config"), // Config for unlock challenge (e.g., quiz question)
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Explorer Collected Artifacts - Which artifacts each explorer has collected
export const explorerCollectedArtifacts = pgTable("explorer_collected_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull(), // Which explorer collected this
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  stopId: varchar("stop_id").references(() => travelStops.id).notNull(),
  artifactId: varchar("artifact_id").references(() => travelArtifacts.id).notNull(),
  collectedAt: timestamp("collected_at").defaultNow(),
  completionData: jsonb("completion_data"), // How they completed it (e.g., photo URL, quiz answer)
});

export const insertTravelArtifactSchema = createInsertSchema(travelArtifacts).omit({
  id: true,
  createdAt: true,
});

export const insertExplorerCollectedArtifactSchema = createInsertSchema(explorerCollectedArtifacts).omit({
  id: true,
  collectedAt: true,
});

export const locationStoryCache = pgTable("location_story_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationName: varchar("location_name").notNull(),
  locationType: varchar("location_type").notNull(),
  destination: varchar("destination").notNull(),
  ageRange: varchar("age_range"), 
  storyTitle: text("story_title").notNull(),
  storyContent: text("story_content").notNull(),
  chapters: jsonb("chapters").default([]),
  duration: varchar("duration"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLocationStoryCacheSchema = createInsertSchema(locationStoryCache).omit({
  id: true,
  createdAt: true,
});

export type InsertLocationStoryCache = z.infer<typeof insertLocationStoryCacheSchema>;
export type LocationStoryCache = typeof locationStoryCache.$inferSelect;

// Travel Mode Types
export type InsertTravelArtifact = z.infer<typeof insertTravelArtifactSchema>;
export type TravelArtifact = typeof travelArtifacts.$inferSelect;
export type InsertExplorerCollectedArtifact = z.infer<typeof insertExplorerCollectedArtifactSchema>;
export type ExplorerCollectedArtifact = typeof explorerCollectedArtifacts.$inferSelect;

export type InsertTravelTrip = z.infer<typeof insertTravelTripSchema>;
export type TravelTrip = typeof travelTrips.$inferSelect;
export type InsertTravelStop = z.infer<typeof insertTravelStopSchema>;
export type TravelStop = typeof travelStops.$inferSelect;
export type InsertJourneyPack = z.infer<typeof insertJourneyPackSchema>;
export type JourneyPack = typeof journeyPacks.$inferSelect;
export type InsertTravelMoment = z.infer<typeof insertTravelMomentSchema>;
export type TravelMoment = typeof travelMoments.$inferSelect;
export type InsertMemoryStars = z.infer<typeof insertMemoryStarsSchema>;
export type MemoryStars = typeof memoryStars.$inferSelect;
export type InsertRememberThisCard = z.infer<typeof insertRememberThisCardSchema>;
export type RememberThisCard = typeof rememberThisCards.$inferSelect;
export type InsertWonderResponse = z.infer<typeof insertWonderResponseSchema>;
export type WonderResponse = typeof travelWonderResponses.$inferSelect;
export type InsertTrailTalesRiddle = z.infer<typeof insertTrailTalesRiddleSchema>;
export type TrailTalesRiddle = typeof trailTalesRiddles.$inferSelect;
export type InsertTrailTalesAttempt = z.infer<typeof insertTrailTalesAttemptSchema>;
export type TrailTalesAttempt = typeof trailTalesAttempts.$inferSelect;
export type InsertTrailTalesProgress = z.infer<typeof insertTrailTalesProgressSchema>;
export type TrailTalesProgress = typeof trailTalesProgress.$inferSelect;
export type InsertJourneyPackProgress = z.infer<typeof insertJourneyPackProgressSchema>;
export type JourneyPackProgress = typeof journeyPackProgress.$inferSelect;
export type InsertJourneyGamePrompt = z.infer<typeof insertJourneyGamePromptSchema>;
export type JourneyGamePrompt = typeof journeyGamePrompts.$inferSelect;
export type InsertTripStory = z.infer<typeof insertTripStorySchema>;
export type TripStory = typeof travelTripStories.$inferSelect;

// ============================================================================
// ITINERARY SHARING SYSTEM - Public sharing of trips (privacy-filtered)
// ============================================================================

// Available style tags for shared itineraries
export const ITINERARY_STYLE_TAGS = [
  'Beach & Ocean',
  'Mountains & Hiking',
  'Cultural & Historical',
  'Wildlife & Nature',
  'Adventure',
  'Relaxation',
  'Educational',
  'Kid-Friendly',
  'Food & Local Cuisine',
  'Photography Spots',
] as const;

export type ItineraryStyleTag = typeof ITINERARY_STYLE_TAGS[number];

// Shared Itineraries - Public version of trips (privacy-filtered snapshots)
export const itineraryShares = pgTable("itinerary_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  ownerUserId: varchar("owner_user_id").notNull(), // Who shared this
  slug: varchar("slug").notNull().unique(), // URL-friendly unique identifier
  
  // Display info (snapshot from trip, can be edited)
  title: varchar("title").notNull(), // e.g., "Big Island Family Adventure"
  destination: varchar("destination").notNull(), // e.g., "Hawaii Big Island"
  description: text("description"), // Optional intro text
  heroImageUrl: text("hero_image_url"), // Cover image (from destination, not personal photos)
  
  // Required sharing metadata
  durationDays: integer("duration_days").notNull(), // How many days was this trip
  
  // Optional metadata
  partySize: jsonb("party_size"), // { adults: 2, kids: 2, kidAges: [4, 7] }
  styleTags: text("style_tags").array().default([]), // ['Beach', 'Adventure', 'Kid-Friendly']
  bestTimeToVisit: varchar("best_time_to_visit"), // "March - perfect weather!"
  
  // Social stats
  totalUpvotes: integer("total_upvotes").default(0),
  totalRemixes: integer("total_remixes").default(0),
  totalViews: integer("total_views").default(0),
  
  // Status
  status: varchar("status").default("published"), // 'published', 'draft', 'unpublished'
  publishedAt: timestamp("published_at"),
  
  // Attribution - if this was copied from another share
  inspiredByShareId: varchar("inspired_by_share_id"),
  inspiredByTitle: varchar("inspired_by_title"), // Snapshot of original title
  
  // Creator info (for display, privacy-safe)
  creatorDisplayName: varchar("creator_display_name"), // Optional: "The Smith Family"
  
  // Verification
  isVerifiedVisit: boolean("is_verified_visit").default(false), // Creator actually visited
  verifiedAt: timestamp("verified_at"), // When verification was approved
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_share_slug").on(table.slug),
  index("IDX_share_destination").on(table.destination),
  index("IDX_share_owner").on(table.ownerUserId),
  index("IDX_share_status").on(table.status),
]);

// Shared Itinerary Stops - Privacy-filtered snapshot of stops
export const itineraryShareStops = pgTable("itinerary_share_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareId: varchar("share_id").references(() => itineraryShares.id, { onDelete: 'cascade' }).notNull(),
  originalStopId: varchar("original_stop_id"), // Reference to original stop (for updates)
  
  // Stop info (snapshot, no personal data)
  displayOrder: integer("display_order").default(0),
  name: varchar("name").notNull(),
  locationType: varchar("location_type"), // 'beach', 'volcano', 'cultural_site', etc.
  
  // Journey Pack content summaries (public-safe)
  listenSummary: text("listen_summary"), // Brief description of audio content
  wonderPrompt: text("wonder_prompt"), // The observation question
  journeyGameTypes: text("journey_game_types").array(), // ['guess', 'thisorthat', 'spotit']
  exploreHighlights: text("explore_highlights"), // Key nearby attractions
  
  // Optional location data
  latitude: text("latitude"),
  longitude: text("longitude"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Itinerary Upvotes - Track who liked which itineraries
export const itineraryUpvotes = pgTable("itinerary_upvotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareId: varchar("share_id").references(() => itineraryShares.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_upvote_share").on(table.shareId),
  index("IDX_upvote_user").on(table.userId),
]);

// Itinerary Bookmarks - Save itineraries for later
export const itineraryBookmarks = pgTable("itinerary_bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareId: varchar("share_id").references(() => itineraryShares.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_bookmark_share").on(table.shareId),
  index("IDX_bookmark_user").on(table.userId),
]);

// Itinerary Comments - Community discussion on shared itineraries
export const itineraryComments = pgTable("itinerary_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareId: varchar("share_id").references(() => itineraryShares.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").notNull(),
  authorName: varchar("author_name").notNull(), // Display name
  content: text("content").notNull(),
  isEdited: boolean("is_edited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_comment_share").on(table.shareId),
  index("IDX_comment_user").on(table.userId),
]);

// Insert schemas
export const insertItineraryShareSchema = createInsertSchema(itineraryShares).omit({
  id: true,
  totalUpvotes: true,
  totalRemixes: true,
  totalViews: true,
  createdAt: true,
  updatedAt: true,
});

export const insertItineraryShareStopSchema = createInsertSchema(itineraryShareStops).omit({
  id: true,
  createdAt: true,
});

export const insertItineraryUpvoteSchema = createInsertSchema(itineraryUpvotes).omit({
  id: true,
  createdAt: true,
});

export const insertItineraryBookmarkSchema = createInsertSchema(itineraryBookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertItineraryCommentSchema = createInsertSchema(itineraryComments).omit({
  id: true,
  isEdited: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertItineraryShare = z.infer<typeof insertItineraryShareSchema>;
export type ItineraryShare = typeof itineraryShares.$inferSelect;
export type InsertItineraryShareStop = z.infer<typeof insertItineraryShareStopSchema>;
export type ItineraryShareStop = typeof itineraryShareStops.$inferSelect;
export type InsertItineraryUpvote = z.infer<typeof insertItineraryUpvoteSchema>;
export type ItineraryUpvote = typeof itineraryUpvotes.$inferSelect;
export type InsertItineraryBookmark = z.infer<typeof insertItineraryBookmarkSchema>;
export type ItineraryBookmark = typeof itineraryBookmarks.$inferSelect;
export type InsertItineraryComment = z.infer<typeof insertItineraryCommentSchema>;
export type ItineraryComment = typeof itineraryComments.$inferSelect;

// Schema for party size
export const partySizeSchema = z.object({
  adults: z.number().min(1).max(10),
  kids: z.number().min(0).max(10).optional(),
  kidAges: z.array(z.number().min(0).max(17)).optional(),
});

export type PartySize = z.infer<typeof partySizeSchema>;

// Explorer Identity Traits - Tracks behavior patterns for identity formation
// "You're becoming someone who..." statements are generated from these traits
export const explorerIdentityTraits = pgTable("explorer_identity_traits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull(), // Which explorer these traits belong to
  // Core identity dimensions (cumulative counts)
  natureNoticing: integer("nature_noticing").default(0), // Completed nature-related wonder prompts, visited nature stops
  questionAsking: integer("question_asking").default(0), // Asked GeoBuddy questions, engaged with wonder prompts
  culturalCuriosity: integer("cultural_curiosity").default(0), // Visited cultural sites, completed cultural journey packs
  familyConnecting: integer("family_connecting").default(0), // Captured family moments, played with siblings
  worldExploring: integer("world_exploring").default(0), // Visited diverse locations, completed trips
  storyTelling: integer("story_telling").default(0), // Shared moments, created captions, responded to prompts
  // Current identity statement (AI-generated, updated periodically)
  currentIdentityStatement: text("current_identity_statement"), // e.g., "You're becoming someone who notices nature."
  dominantTrait: varchar("dominant_trait"), // Which trait is strongest
  lastStatementGeneratedAt: timestamp("last_statement_generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_identity_explorer").on(table.explorerId),
]);

export const insertExplorerIdentityTraitsSchema = createInsertSchema(explorerIdentityTraits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExplorerIdentityTraits = z.infer<typeof insertExplorerIdentityTraitsSchema>;
export type ExplorerIdentityTraits = typeof explorerIdentityTraits.$inferSelect;

// Schema for incrementing a specific trait
export const incrementTraitSchema = z.object({
  explorerId: z.string(),
  trait: z.enum(['natureNoticing', 'questionAsking', 'culturalCuriosity', 'familyConnecting', 'worldExploring', 'storyTelling']),
  amount: z.number().default(1),
});

export type IncrementTrait = z.infer<typeof incrementTraitSchema>;

// ============================================================================
// GEORELIC PUZZLE SYSTEM (Shared between World Mode and Travel Mode)
// ============================================================================

// GeoRelic Puzzles - Main puzzle definitions
export const geoRelicPuzzles = pgTable("georelic_puzzles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Mode and context
  mode: varchar("mode").notNull(), // 'world' or 'travel'
  continent: varchar("continent"), // For World Mode: 'Africa', 'Asia', etc.
  stopId: varchar("stop_id").references(() => travelStops.id), // For Travel Mode
  // Puzzle content
  title: varchar("title").notNull(), // e.g., "Eiffel Tower", "Akaka Falls"
  description: text("description"), // Short description shown after completion
  imageUrl: text("image_url").notNull(), // URL to puzzle image (illustrated style)
  thumbnailUrl: text("thumbnail_url"), // Smaller preview image
  pieceCount: integer("piece_count").default(6), // 6-10 pieces
  difficulty: varchar("difficulty").default("easy"), // 'easy', 'medium', 'hard'
  // Content type for World Mode variety
  puzzleType: varchar("puzzle_type"), // 'landmark', 'flag', 'map', 'city', 'animal'
  // Learning content
  funFact: text("fun_fact"), // One-line fact shown after completion
  // Ordering
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_georelic_mode").on(table.mode),
  index("IDX_georelic_continent").on(table.continent),
  index("IDX_georelic_stop").on(table.stopId),
]);

// GeoRelic Puzzle Pieces - Individual pieces for each puzzle
export const geoRelicPuzzlePieces = pgTable("georelic_puzzle_pieces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  puzzleId: varchar("puzzle_id").references(() => geoRelicPuzzles.id).notNull(),
  pieceIndex: integer("piece_index").notNull(), // 0-based index
  // Piece visual data
  imageUrl: text("image_url").notNull(), // URL to this piece's image (cropped from main)
  // Position data (percentages for responsive layout)
  targetX: integer("target_x").notNull(), // Target X position (0-100%)
  targetY: integer("target_y").notNull(), // Target Y position (0-100%)
  width: integer("width").notNull(), // Piece width (0-100%)
  height: integer("height").notNull(), // Piece height (0-100%)
  // Initial scattered position
  initialX: integer("initial_x"), // Starting X position when scattered
  initialY: integer("initial_y"), // Starting Y position when scattered
  // Shape data for silhouette (SVG path or clip-path)
  shapePath: text("shape_path"), // Optional SVG path for irregular shapes
  zIndex: integer("z_index").default(0), // Layering order
});

// Player Puzzle Progress - Tracks completion for each explorer
export const playerPuzzleProgress = pgTable("player_puzzle_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull(), // Which explorer completed this
  puzzleId: varchar("puzzle_id").references(() => geoRelicPuzzles.id).notNull(),
  // Progress tracking
  piecesPlaced: jsonb("pieces_placed").default([]), // Array of piece indices that are placed
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  // Reward tracking
  starsAwarded: integer("stars_awarded").default(0), // Stars given (World Mode)
  keepsakeAwarded: boolean("keepsake_awarded").default(false), // Keepsake given (Travel Mode)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_puzzle_progress_explorer").on(table.explorerId),
  index("IDX_puzzle_progress_puzzle").on(table.puzzleId),
]);

// Travel Keepsakes - Collectible rewards from Travel Mode puzzles
export const travelKeepsakes = pgTable("travel_keepsakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Link to puzzle that awards this keepsake
  puzzleId: varchar("puzzle_id").references(() => geoRelicPuzzles.id),
  stopId: varchar("stop_id").references(() => travelStops.id), // Which stop this keepsake represents
  // Keepsake details
  name: varchar("name").notNull(), // e.g., "Volcano Stone Keepsake"
  description: text("description"), // e.g., "A memory from the volcanic lands..."
  emoji: varchar("emoji").default("🗺️"), // Display emoji
  imageUrl: text("image_url"), // Optional illustrated image
  // Category for grouping
  category: varchar("category"), // 'nature', 'culture', 'landmark', 'beach', 'city'
  createdAt: timestamp("created_at").defaultNow(),
});

// Explorer Collected Keepsakes - Which keepsakes each explorer has earned
export const explorerCollectedKeepsakes = pgTable("explorer_collected_keepsakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull(),
  keepsakeId: varchar("keepsake_id").references(() => travelKeepsakes.id).notNull(),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  puzzleId: varchar("puzzle_id").references(() => geoRelicPuzzles.id), // Which puzzle unlocked it
  collectedAt: timestamp("collected_at").defaultNow(),
}, (table) => [
  index("IDX_collected_keepsakes_explorer").on(table.explorerId),
  index("IDX_collected_keepsakes_trip").on(table.tripId),
]);

// GeoRelic Puzzle Insert Schemas
export const insertGeoRelicPuzzleSchema = createInsertSchema(geoRelicPuzzles).omit({
  id: true,
  createdAt: true,
});

export const insertGeoRelicPuzzlePieceSchema = createInsertSchema(geoRelicPuzzlePieces).omit({
  id: true,
});

export const insertPlayerPuzzleProgressSchema = createInsertSchema(playerPuzzleProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTravelKeepsakeSchema = createInsertSchema(travelKeepsakes).omit({
  id: true,
  createdAt: true,
});

export const insertExplorerCollectedKeepsakeSchema = createInsertSchema(explorerCollectedKeepsakes).omit({
  id: true,
  collectedAt: true,
});

// GeoRelic Types
export type InsertGeoRelicPuzzle = z.infer<typeof insertGeoRelicPuzzleSchema>;
export type GeoRelicPuzzle = typeof geoRelicPuzzles.$inferSelect;
export type InsertGeoRelicPuzzlePiece = z.infer<typeof insertGeoRelicPuzzlePieceSchema>;
export type GeoRelicPuzzlePiece = typeof geoRelicPuzzlePieces.$inferSelect;
export type InsertPlayerPuzzleProgress = z.infer<typeof insertPlayerPuzzleProgressSchema>;
export type PlayerPuzzleProgress = typeof playerPuzzleProgress.$inferSelect;
export type InsertTravelKeepsake = z.infer<typeof insertTravelKeepsakeSchema>;
export type TravelKeepsake = typeof travelKeepsakes.$inferSelect;
export type InsertExplorerCollectedKeepsake = z.infer<typeof insertExplorerCollectedKeepsakeSchema>;
export type ExplorerCollectedKeepsake = typeof explorerCollectedKeepsakes.$inferSelect;

// Puzzle completion request schema
export const completePuzzleSchema = z.object({
  explorerId: z.string(),
  puzzleId: z.string(),
});

export type CompletePuzzleRequest = z.infer<typeof completePuzzleSchema>;

// ============================================================================
// MAP PUZZLE SYSTEM - Geographic shape puzzles (states, countries, continents)
// ============================================================================

// Map Puzzles - Main map definitions (e.g., "USA Map", "India Map")
export const mapPuzzles = pgTable("map_puzzles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Map identity
  name: varchar("name").notNull(), // e.g., "United States", "India"
  region: varchar("region").notNull(), // 'usa', 'india', 'europe', 'world'
  description: text("description"),
  // Map display
  baseMapSvg: text("base_map_svg"), // Full SVG of the map with all region outlines
  viewBox: varchar("view_box").default("0 0 1000 800"), // SVG viewBox for proper scaling
  backgroundColor: varchar("background_color").default("#E3F2FD"), // Light blue background
  // Difficulty
  regionCount: integer("region_count").default(10), // How many regions to place
  difficulty: varchar("difficulty").default("easy"), // 'easy', 'medium', 'hard'
  ageRange: varchar("age_range").default("4+"), // Recommended age
  // Rewards
  starsReward: integer("stars_reward").default(5),
  // Display
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_map_puzzle_region").on(table.region),
]);

// Map Puzzle Regions - Individual regions (states/countries) for each map
export const mapPuzzleRegions = pgTable("map_puzzle_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mapPuzzleId: varchar("map_puzzle_id").references(() => mapPuzzles.id).notNull(),
  // Region identity
  regionName: varchar("region_name").notNull(), // e.g., "California", "Texas", "Maharashtra"
  regionCode: varchar("region_code"), // e.g., "CA", "TX", "MH"
  // SVG shape data (the actual geographic outline)
  svgPath: text("svg_path").notNull(), // SVG path data for this region's shape
  // Position on the base map (where this piece belongs)
  targetX: integer("target_x").notNull(), // Target center X position
  targetY: integer("target_y").notNull(), // Target center Y position
  // Bounding box for hit detection
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  // Visual styling
  fillColor: varchar("fill_color").default("#4FC3F7"), // Color when placed
  strokeColor: varchar("stroke_color").default("#0288D1"),
  // Extra info shown after placement
  capital: varchar("capital"), // e.g., "Sacramento", "Mumbai"
  funFact: text("fun_fact"), // Fun fact about this region
  // Ordering
  displayOrder: integer("display_order").default(0),
});

// Player Map Puzzle Progress - Tracks which regions are placed
export const playerMapPuzzleProgress = pgTable("player_map_puzzle_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull(),
  mapPuzzleId: varchar("map_puzzle_id").references(() => mapPuzzles.id).notNull(),
  // Progress
  placedRegionIds: jsonb("placed_region_ids").default([]), // Array of region IDs that are placed
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  // Rewards
  starsAwarded: integer("stars_awarded").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_map_progress_explorer").on(table.explorerId),
  index("IDX_map_progress_puzzle").on(table.mapPuzzleId),
]);

// Insert schemas
export const insertMapPuzzleSchema = createInsertSchema(mapPuzzles).omit({
  id: true,
  createdAt: true,
});

export const insertMapPuzzleRegionSchema = createInsertSchema(mapPuzzleRegions).omit({
  id: true,
});

export const insertPlayerMapPuzzleProgressSchema = createInsertSchema(playerMapPuzzleProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertMapPuzzle = z.infer<typeof insertMapPuzzleSchema>;
export type MapPuzzle = typeof mapPuzzles.$inferSelect;
export type InsertMapPuzzleRegion = z.infer<typeof insertMapPuzzleRegionSchema>;
export type MapPuzzleRegion = typeof mapPuzzleRegions.$inferSelect;
export type InsertPlayerMapPuzzleProgress = z.infer<typeof insertPlayerMapPuzzleProgressSchema>;
export type PlayerMapPuzzleProgress = typeof playerMapPuzzleProgress.$inferSelect;

// Continent definitions for World Mode puzzles
export const PUZZLE_CONTINENTS = [
  { id: 'africa', name: 'Africa', emoji: '🌍', color: 'orange' },
  { id: 'asia', name: 'Asia', emoji: '🌏', color: 'yellow' },
  { id: 'europe', name: 'Europe', emoji: '🏰', color: 'purple' },
  { id: 'north_america', name: 'North America', emoji: '🗽', color: 'red' },
  { id: 'south_america', name: 'South America', emoji: '🌎', color: 'green' },
  { id: 'oceania', name: 'Oceania', emoji: '🏝️', color: 'teal' },
] as const;

// Travel Keepsake templates for Big Island Hawaii
export const BIG_ISLAND_KEEPSAKES = [
  { stopName: "Volcanoes National Park", name: "Volcano Stone Keepsake", description: "A memory from the fiery heart of Hawaii's volcanoes.", emoji: "🌋", category: "nature" },
  { stopName: "Akaka Falls", name: "Waterfall Keepsake", description: "The sound of falling water, forever in your heart.", emoji: "💧", category: "nature" },
  { stopName: "Punalu'u Black Sand Beach", name: "Black Sand Keepsake", description: "Volcanic sand from ancient lava flows.", emoji: "🏖️", category: "beach" },
  { stopName: "Kona Town", name: "Town Map Keepsake", description: "Memories of exploring a charming Hawaiian town.", emoji: "🗺️", category: "city" },
  { stopName: "Waipio Valley", name: "Nature Leaf Keepsake", description: "The lush green beauty of the Valley of Kings.", emoji: "🌿", category: "nature" },
  { stopName: "Mauna Kea Summit", name: "Stargazer Keepsake", description: "A night under the clearest skies on Earth.", emoji: "⭐", category: "nature" },
  { stopName: "Rainbow Falls", name: "Rainbow Keepsake", description: "Where rainbows dance in the waterfall mist.", emoji: "🌈", category: "nature" },
  { stopName: "Hapuna Beach", name: "Golden Shore Keepsake", description: "Sun-warmed sand between your toes.", emoji: "🐚", category: "beach" },
  { stopName: "Kealakekua Bay", name: "Ocean Explorer Keepsake", description: "Where dolphins spin and history was made.", emoji: "🐬", category: "nature" },
  { stopName: "Hilo Farmers Market", name: "Market Treasure Keepsake", description: "Colors, flavors, and the spirit of aloha.", emoji: "🍍", category: "city" },
] as const;

// Big Island Hawaii - Preset destination data for MVP
export const BIG_ISLAND_STOPS = [
  { name: "Volcanoes National Park", stopType: "nature", displayOrder: 1 },
  { name: "Mauna Kea Summit", stopType: "nature", displayOrder: 2 },
  { name: "Akaka Falls", stopType: "nature", displayOrder: 3 },
  { name: "Punalu'u Black Sand Beach", stopType: "beach", displayOrder: 4 },
  { name: "Kona Town", stopType: "city", displayOrder: 5 },
  { name: "Waipio Valley", stopType: "nature", displayOrder: 6 },
  { name: "Kealakekua Bay", stopType: "beach", displayOrder: 7 },
  { name: "Hilo Farmers Market", stopType: "landmark", displayOrder: 8 },
  { name: "Rainbow Falls", stopType: "nature", displayOrder: 9 },
  { name: "Hapuna Beach", stopType: "beach", displayOrder: 10 },
] as const;

// ============================================================================
// TRAVEL TROPHY CABINET - Gamification badges for explorers
// ============================================================================

// Badge category definitions with thresholds for each tier
export const TRAVEL_BADGE_CATEGORIES = [
  {
    id: 'world_traveler',
    name: 'World Traveler',
    emoji: '🌍',
    description: 'Explore new destinations around the world',
    metric: 'total_trips',
    tiers: [
      { tier: 'bronze', threshold: 1, reward: 'passport_frame_bronze', label: 'First Journey' },
      { tier: 'silver', threshold: 3, reward: 'passport_frame_silver', label: 'Seasoned Explorer' },
      { tier: 'gold', threshold: 5, reward: 'passport_frame_gold', label: 'Globetrotter' },
      { tier: 'legend', threshold: 10, reward: 'passport_frame_legend', label: 'World Wanderer' },
    ],
  },
  {
    id: 'stop_hopper',
    name: 'Stop Hopper',
    emoji: '📍',
    description: 'Visit stops and discover new places',
    metric: 'total_stops_visited',
    tiers: [
      { tier: 'bronze', threshold: 5, reward: 'pin_badge_bronze', label: 'Curious Wanderer' },
      { tier: 'silver', threshold: 15, reward: 'pin_badge_silver', label: 'Trail Blazer' },
      { tier: 'gold', threshold: 30, reward: 'pin_badge_gold', label: 'Adventure Seeker' },
      { tier: 'legend', threshold: 50, reward: 'pin_badge_legend', label: 'Master Navigator' },
    ],
  },
  {
    id: 'memory_maker',
    name: 'Memory Maker',
    emoji: '📸',
    description: 'Capture moments and collect keepsakes',
    metric: 'total_keepsakes',
    tiers: [
      { tier: 'bronze', threshold: 3, reward: 'camera_frame_bronze', label: 'Memory Collector' },
      { tier: 'silver', threshold: 10, reward: 'camera_frame_silver', label: 'Photo Explorer' },
      { tier: 'gold', threshold: 25, reward: 'camera_frame_gold', label: 'Memory Master' },
      { tier: 'legend', threshold: 50, reward: 'camera_frame_legend', label: 'Legendary Archivist' },
    ],
  },
  {
    id: 'beach_explorer',
    name: 'Beach Explorer',
    emoji: '🏖️',
    description: 'Discover beautiful beaches and coastal spots',
    metric: 'beach_stops_visited',
    tiers: [
      { tier: 'bronze', threshold: 2, reward: 'shell_charm_bronze', label: 'Sand Walker' },
      { tier: 'silver', threshold: 5, reward: 'shell_charm_silver', label: 'Wave Rider' },
      { tier: 'gold', threshold: 10, reward: 'shell_charm_gold', label: 'Ocean Lover' },
      { tier: 'legend', threshold: 20, reward: 'shell_charm_legend', label: 'Beach Legend' },
    ],
  },
  {
    id: 'mountain_adventurer',
    name: 'Mountain Adventurer',
    emoji: '⛰️',
    description: 'Climb mountains and explore nature trails',
    metric: 'nature_stops_visited',
    tiers: [
      { tier: 'bronze', threshold: 3, reward: 'mountain_badge_bronze', label: 'Trail Walker' },
      { tier: 'silver', threshold: 8, reward: 'mountain_badge_silver', label: 'Peak Seeker' },
      { tier: 'gold', threshold: 15, reward: 'mountain_badge_gold', label: 'Summit Master' },
      { tier: 'legend', threshold: 30, reward: 'mountain_badge_legend', label: 'Mountain Legend' },
    ],
  },
  {
    id: 'city_sleuth',
    name: 'City Sleuth',
    emoji: '🏙️',
    description: 'Explore cities, towns, and landmarks',
    metric: 'city_stops_visited',
    tiers: [
      { tier: 'bronze', threshold: 2, reward: 'building_badge_bronze', label: 'City Stroller' },
      { tier: 'silver', threshold: 5, reward: 'building_badge_silver', label: 'Urban Explorer' },
      { tier: 'gold', threshold: 10, reward: 'building_badge_gold', label: 'City Expert' },
      { tier: 'legend', threshold: 20, reward: 'building_badge_legend', label: 'Metro Master' },
    ],
  },
  {
    id: 'wildlife_whisperer',
    name: 'Wildlife Whisperer',
    emoji: '🦁',
    description: 'Encounter wildlife and explore animal habitats',
    metric: 'wildlife_stops_visited',
    tiers: [
      { tier: 'bronze', threshold: 2, reward: 'paw_badge_bronze', label: 'Animal Friend' },
      { tier: 'silver', threshold: 5, reward: 'paw_badge_silver', label: 'Wildlife Tracker' },
      { tier: 'gold', threshold: 10, reward: 'paw_badge_gold', label: 'Nature Guardian' },
      { tier: 'legend', threshold: 20, reward: 'paw_badge_legend', label: 'Wildlife Legend' },
    ],
  },
  {
    id: 'story_spinner',
    name: 'Story Spinner',
    emoji: '📖',
    description: 'Complete Trail Tales riddles and earn stars',
    metric: 'trail_tales_completed',
    tiers: [
      { tier: 'bronze', threshold: 5, reward: 'book_badge_bronze', label: 'Story Starter' },
      { tier: 'silver', threshold: 15, reward: 'book_badge_silver', label: 'Tale Teller' },
      { tier: 'gold', threshold: 30, reward: 'book_badge_gold', label: 'Story Master' },
      { tier: 'legend', threshold: 50, reward: 'book_badge_legend', label: 'Legendary Bard' },
    ],
  },
] as const;

export type TravelBadgeCategory = typeof TRAVEL_BADGE_CATEGORIES[number];
export type TravelBadgeTier = 'bronze' | 'silver' | 'gold' | 'legend';

// Explorer Travel Badge Progress - Track earned badges per explorer
export const explorerTravelBadges = pgTable("explorer_travel_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull(),
  badgeCategoryId: varchar("badge_category_id").notNull(), // e.g., 'world_traveler', 'beach_explorer'
  currentTier: varchar("current_tier"), // 'bronze', 'silver', 'gold', 'legend' or null if not earned
  currentProgress: integer("current_progress").default(0), // Current count toward next tier
  bronzeEarnedAt: timestamp("bronze_earned_at"),
  silverEarnedAt: timestamp("silver_earned_at"),
  goldEarnedAt: timestamp("gold_earned_at"),
  legendEarnedAt: timestamp("legend_earned_at"),
  lastProgressUpdate: timestamp("last_progress_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_travel_badges_explorer").on(table.explorerId),
  index("IDX_travel_badges_category").on(table.badgeCategoryId),
]);

export const insertExplorerTravelBadgeSchema = createInsertSchema(explorerTravelBadges).omit({
  id: true,
  createdAt: true,
});

export type InsertExplorerTravelBadge = z.infer<typeof insertExplorerTravelBadgeSchema>;
export type ExplorerTravelBadge = typeof explorerTravelBadges.$inferSelect;

// Big Island Hawaii - Preset artifacts for each stop
export const BIG_ISLAND_ARTIFACTS = [
  { stopName: "Volcanoes National Park", name: "Lava Crystal", description: "A magical crystal formed from cooling lava deep inside the volcano!", imageEmoji: "🔮", rarity: "rare", unlockType: "listen", displayOrder: 1 },
  { stopName: "Volcanoes National Park", name: "Pele's Fire Stone", description: "A legendary stone blessed by Pele, the Hawaiian goddess of fire.", imageEmoji: "🔥", rarity: "legendary", unlockType: "photo", displayOrder: 2 },
  { stopName: "Mauna Kea Summit", name: "Stargazer Lens", description: "A special lens used by ancient Hawaiian navigators to read the stars.", imageEmoji: "🔭", rarity: "rare", unlockType: "quiz", unlockConfig: { question: "What can you see at Mauna Kea?", answer: "stars" }, displayOrder: 1 },
  { stopName: "Akaka Falls", name: "Waterfall Mist Bottle", description: "A tiny bottle filled with refreshing mist from the mighty Akaka Falls!", imageEmoji: "💧", rarity: "common", unlockType: "photo", displayOrder: 1 },
  { stopName: "Punalu'u Black Sand Beach", name: "Honu Charm", description: "A charm shaped like a sea turtle (honu) who loves the black sand beach.", imageEmoji: "🐢", rarity: "rare", unlockType: "find_icon", displayOrder: 1 },
  { stopName: "Punalu'u Black Sand Beach", name: "Black Sand Sample", description: "Real volcanic black sand from one of Hawaii's famous beaches!", imageEmoji: "⬛", rarity: "common", unlockType: "photo", displayOrder: 2 },
  { stopName: "Kona Town", name: "Kona Coffee Bean", description: "A golden coffee bean from the famous Kona coffee plantations.", imageEmoji: "☕", rarity: "common", unlockType: "listen", displayOrder: 1 },
  { stopName: "Kona Town", name: "Humuhumunukunukuapua'a Badge", description: "A badge honoring Hawaii's state fish with the longest name!", imageEmoji: "🐠", rarity: "rare", unlockType: "quiz", unlockConfig: { question: "What is Hawaii's state fish?", answer: "humuhumunukunukuapua'a" }, displayOrder: 2 },
  { stopName: "Waipio Valley", name: "Taro Root", description: "A sacred taro root from the Valley of the Kings.", imageEmoji: "🥔", rarity: "common", unlockType: "listen", displayOrder: 1 },
  { stopName: "Waipio Valley", name: "Ancient Poi Bowl", description: "A traditional bowl used to make poi from taro.", imageEmoji: "🥣", rarity: "rare", unlockType: "photo", displayOrder: 2 },
  { stopName: "Kealakekua Bay", name: "Captain Cook's Compass", description: "A compass like the one Captain Cook used to explore Hawaii.", imageEmoji: "🧭", rarity: "legendary", unlockType: "quiz", unlockConfig: { question: "Who was the famous explorer at Kealakekua Bay?", answer: "captain cook" }, displayOrder: 1 },
  { stopName: "Kealakekua Bay", name: "Dolphin Whistle", description: "A magical whistle that spinner dolphins can hear!", imageEmoji: "🐬", rarity: "common", unlockType: "find_icon", displayOrder: 2 },
  { stopName: "Hilo Farmers Market", name: "Tropical Fruit Basket", description: "A colorful basket of exotic Hawaiian fruits!", imageEmoji: "🍍", rarity: "common", unlockType: "photo", displayOrder: 1 },
  { stopName: "Hilo Farmers Market", name: "Lei Flower", description: "A beautiful flower used in traditional Hawaiian leis.", imageEmoji: "🌺", rarity: "common", unlockType: "listen", displayOrder: 2 },
  { stopName: "Rainbow Falls", name: "Rainbow Prism", description: "A magical prism that creates rainbows just like the waterfall!", imageEmoji: "🌈", rarity: "rare", unlockType: "photo", displayOrder: 1 },
  { stopName: "Hapuna Beach", name: "Golden Sand Shell", description: "A beautiful seashell from Hawaii's best white sand beach.", imageEmoji: "🐚", rarity: "common", unlockType: "find_icon", displayOrder: 1 },
  { stopName: "Hapuna Beach", name: "Ocean Wave Vial", description: "A tiny vial containing the essence of Pacific waves.", imageEmoji: "🌊", rarity: "rare", unlockType: "photo", displayOrder: 2 },
] as const;

export const ST_LOUIS_ARTIFACTS = [
  { stopName: "Gateway Arch", name: "Westward Pioneer Medal", description: "A shiny medal awarded to brave pioneers who passed through the Gateway to the West!", imageEmoji: "🏅", rarity: "rare", unlockType: "listen", displayOrder: 1 },
  { stopName: "City Museum", name: "Enchanted Shoe", description: "A magical shoe from the City Museum's incredible shoe vault collection!", imageEmoji: "👟", rarity: "common", unlockType: "find_icon", displayOrder: 1 },
  { stopName: "The Magic House, St. Louis Children's Museum", name: "Spark of Curiosity", description: "A glowing spark that ignites whenever a kid asks a great question!", imageEmoji: "✨", rarity: "rare", unlockType: "quiz", unlockConfig: { question: "What can you discover at the Magic House?", answer: "science" }, displayOrder: 1 },
  { stopName: "St. Louis Zoo", name: "Penguin Feather", description: "A tiny feather from the famous penguins at the St. Louis Zoo!", imageEmoji: "🐧", rarity: "common", unlockType: "photo", displayOrder: 1 },
  { stopName: "Forest Park", name: "Acorn of Adventure", description: "A golden acorn from one of America's largest urban parks!", imageEmoji: "🌰", rarity: "common", unlockType: "listen", displayOrder: 1 },
  { stopName: "Missouri Botanical Garden", name: "Rare Orchid Petal", description: "A delicate petal from a rare orchid in the world-famous Botanical Garden!", imageEmoji: "🌸", rarity: "rare", unlockType: "photo", displayOrder: 1 },
  { stopName: "Pappy's Smokehouse", name: "Golden Rib Bone", description: "A legendary golden rib bone from the BBQ capital of Missouri!", imageEmoji: "🍖", rarity: "legendary", unlockType: "quiz", unlockConfig: { question: "What is St. Louis most famous for eating?", answer: "bbq" }, displayOrder: 1 },
] as const;

export const ALL_CURATED_ARTIFACTS = [...BIG_ISLAND_ARTIFACTS, ...ST_LOUIS_ARTIFACTS];

// ========================================
// EXPERIENCE [CITY] MODULE
// ========================================
// Sensory-first content for destinations: Food & Culture, Hear the Place, Everyday Life

export const experienceContent = pgTable("experience_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationName: varchar("destination_name").notNull().unique(),
  country: varchar("country"),
  continent: varchar("continent"),
  
  foodStory: text("food_story"),
  foodStoryAudioUrl: varchar("food_story_audio_url"),
  foodTags: text("food_tags").array(),
  foodMemoryLine: text("food_memory_line"),
  foodFunFact: text("food_fun_fact"),
  
  localWords: jsonb("local_words").default([]),
  localWordsPronunciation: jsonb("local_words_pronunciation").default([]),
  pronunciationAudioUrl: varchar("pronunciation_audio_url"),
  soundscapeDescription: text("soundscape_description"),
  soundscapeAudioUrl: varchar("soundscape_audio_url"),
  hearWonderPrompt: text("hear_wonder_prompt"),
  hearFunFact: text("hear_fun_fact"),
  
  everydayLifeSnapshot: text("everyday_life_snapshot"),
  everydayLifeTags: text("everyday_life_tags").array(),
  everydayWonderPrompt: text("everyday_wonder_prompt"),
  everydayFunFact: text("everyday_fun_fact"),
  
  reflectionTags: text("reflection_tags").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_experience_destination").on(table.destinationName),
]);

export const experienceProgress = pgTable("experience_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  explorerId: varchar("explorer_id").notNull(),
  destinationName: varchar("destination_name").notNull(),
  
  foodCultureState: varchar("food_culture_state").default("not_started"),
  foodCultureViewedAt: timestamp("food_culture_viewed_at"),
  foodCultureCompletedAt: timestamp("food_culture_completed_at"),
  
  hearPlaceState: varchar("hear_place_state").default("not_started"),
  hearPlaceViewedAt: timestamp("hear_place_viewed_at"),
  hearPlaceCompletedAt: timestamp("hear_place_completed_at"),
  voiceRecordingUrl: varchar("voice_recording_url"),
  
  everydayLifeState: varchar("everyday_life_state").default("not_started"),
  everydayLifeViewedAt: timestamp("everyday_life_viewed_at"),
  everydayLifeCompletedAt: timestamp("everyday_life_completed_at"),
  savedThoughtText: text("saved_thought_text"),
  savedThoughtAudioUrl: varchar("saved_thought_audio_url"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_experience_progress_explorer").on(table.explorerId),
  index("IDX_experience_progress_destination").on(table.destinationName),
]);

export const insertExperienceContentSchema = createInsertSchema(experienceContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExperienceProgressSchema = createInsertSchema(experienceProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExperienceContent = z.infer<typeof insertExperienceContentSchema>;
export type ExperienceContent = typeof experienceContent.$inferSelect;
export type InsertExperienceProgress = z.infer<typeof insertExperienceProgressSchema>;
export type ExperienceProgress = typeof experienceProgress.$inferSelect;

export type ExperienceCardState = 'not_started' | 'tried' | 'completed';

export interface LocalWord {
  word: string;
  meaning: string;
  language: string;
  pronunciation?: string;
}

// PWA Install tracking for return rate analysis
export const pwaInstalls = pgTable("pwa_installs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  installedAt: timestamp("installed_at").defaultNow(),
  deviceType: varchar("device_type").default("mobile"),
  returnedWithin7Days: boolean("returned_within_7_days").default(false),
  firstReturnAt: timestamp("first_return_at"),
}, (table) => [
  index("IDX_pwa_installs_visitor").on(table.visitorId),
  index("IDX_pwa_installs_installed").on(table.installedAt),
]);

export const insertPwaInstallSchema = createInsertSchema(pwaInstalls).omit({
  id: true,
  installedAt: true,
});

export type InsertPwaInstall = z.infer<typeof insertPwaInstallSchema>;
export type PwaInstall = typeof pwaInstalls.$inferSelect;

// Weekly analytics snapshots for reports
export const analyticsWeeklySnapshots = pgTable("analytics_weekly_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  
  // Core metrics (existing)
  totalSessions: integer("total_sessions").default(0),
  uniqueVisitors: integer("unique_visitors").default(0),
  gamesPerSession: doublePrecision("games_per_session").default(0),
  game2StartPercent: doublePrecision("game_2_start_percent").default(0),
  game3StartPercent: doublePrecision("game_3_start_percent").default(0),
  shareClicks: integer("share_clicks").default(0),
  
  // New metrics
  firstSessionCompletionRate: doublePrecision("first_session_completion_rate").default(0),
  avgTimeToFirstPlaySeconds: doublePrecision("avg_time_to_first_play_seconds").default(0),
  avgSessionLengthSeconds: doublePrecision("avg_session_length_seconds").default(0),
  mobilePercent: doublePrecision("mobile_percent").default(0),
  desktopPercent: doublePrecision("desktop_percent").default(0),
  pwaInstalls: integer("pwa_installs").default(0),
  pwaReturnRate: doublePrecision("pwa_return_rate").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_analytics_weekly_week").on(table.weekStartDate),
]);

export const insertAnalyticsWeeklySnapshotSchema = createInsertSchema(analyticsWeeklySnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalyticsWeeklySnapshot = z.infer<typeof insertAnalyticsWeeklySnapshotSchema>;
export type AnalyticsWeeklySnapshot = typeof analyticsWeeklySnapshots.$inferSelect;

// Play Together - Daily game tracking per account
export const playTogetherPlays = pgTable("play_together_plays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tripId: varchar("trip_id").references(() => travelTrips.id),
  gameType: varchar("game_type").notNull(), // 'think_fast', etc.
  playDate: varchar("play_date").notNull(), // YYYY-MM-DD format for daily tracking
  playsCount: integer("plays_count").default(0),
  promptsUsedToday: jsonb("prompts_used_today").default([]), // Array of prompt strings used today
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_play_together_user_date").on(table.userId, table.playDate, table.gameType),
]);

export const insertPlayTogetherPlaysSchema = createInsertSchema(playTogetherPlays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayTogetherPlays = z.infer<typeof insertPlayTogetherPlaysSchema>;
export type PlayTogetherPlays = typeof playTogetherPlays.$inferSelect;

// Scavenger Hunt - Active hunt tracking per trip
export const scavengerHunts = pgTable("scavenger_hunts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  prompts: jsonb("prompts").notNull().default([]), // Array of prompt objects {id, text, isFound}
  status: varchar("status").default('active'), // 'active', 'completed', 'abandoned'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_scavenger_hunts_trip").on(table.tripId, table.userId),
]);

export const insertScavengerHuntSchema = createInsertSchema(scavengerHunts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScavengerHunt = z.infer<typeof insertScavengerHuntSchema>;
export type ScavengerHunt = typeof scavengerHunts.$inferSelect;

// In My Bag - Memory game session tracking (analytics only)
export const inMyBagGames = pgTable("in_my_bag_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  context: varchar("context").notNull(), // e.g., "the beach", "the museum"
  itemsCount: integer("items_count").default(0), // How many items were in the chain when game ended
  status: varchar("status").default('started'), // 'started', 'completed', 'exited'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_in_my_bag_trip").on(table.tripId, table.userId),
]);

export const insertInMyBagGameSchema = createInsertSchema(inMyBagGames).omit({
  id: true,
  createdAt: true,
});

export type InsertInMyBagGame = z.infer<typeof insertInMyBagGameSchema>;
export type InMyBagGame = typeof inMyBagGames.$inferSelect;

// GeoGuess: Think the Place - Deduction game tracking
export const geoguessGames = pgTable("geoguess_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  targetPlace: varchar("target_place").notNull(), // The place they're guessing
  questionsAsked: integer("questions_asked").default(0),
  guessesUsed: integer("guesses_used").default(0),
  isCorrect: boolean("is_correct").default(false),
  status: varchar("status").default('started'), // 'started', 'completed', 'exited'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_geoguess_trip").on(table.tripId, table.userId),
]);

export const insertGeoguessGameSchema = createInsertSchema(geoguessGames).omit({
  id: true,
  createdAt: true,
});

export type InsertGeoguessGame = z.infer<typeof insertGeoguessGameSchema>;
export type GeoguessGame = typeof geoguessGames.$inferSelect;

// Pending Transfers - Store guest player progress for transfer when they register
export const pendingTransfers = pgTable("pending_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  playerName: varchar("player_name").notNull(),
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id).notNull(),
  invitedByUserEmail: varchar("invited_by_user_email"),
  invitedByFamilyName: varchar("invited_by_family_name"),
  sessionStats: jsonb("session_stats").default({}), // { starsEarned, citiesDiscovered, passportStamps }
  invitationSent: boolean("invitation_sent").default(false),
  invitationSentAt: timestamp("invitation_sent_at"),
  claimed: boolean("claimed").default(false),
  claimedByUserId: varchar("claimed_by_user_id").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
  expiresAt: timestamp("expires_at").notNull(), // 30 days from creation
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_pending_transfers_email").on(table.email),
  index("IDX_pending_transfers_expires").on(table.expiresAt),
]);

export const insertPendingTransferSchema = createInsertSchema(pendingTransfers).omit({
  id: true,
  createdAt: true,
});

export type InsertPendingTransfer = z.infer<typeof insertPendingTransferSchema>;
export type PendingTransfer = typeof pendingTransfers.$inferSelect;

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  playerId: varchar("player_id").references(() => players.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceType: varchar("device_type"), // 'ios', 'android', 'desktop', 'unknown'
  browserName: varchar("browser_name"),
  isActive: boolean("is_active").default(true),
  dailyQuestReminders: boolean("daily_quest_reminders").default(false),
  streakProtectionAlerts: boolean("streak_protection_alerts").default(true),
  weeklyProgressUpdates: boolean("weekly_progress_updates").default(false),
  monthlyUpdates: boolean("monthly_updates").default(true),
  geoAdventuresNotifications: boolean("geo_adventures_notifications").default(true),
  lastGeoAdventuresPushAt: timestamp("last_geo_adventures_push_at"),
  lastDailyQuestReminderAt: timestamp("last_daily_quest_reminder_at"),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_push_subscriptions_user").on(table.userId),
  index("IDX_push_subscriptions_endpoint").on(table.endpoint),
]);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Security Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // 'login_success', 'login_failed', 'admin_action', 'data_access', etc.
  resource: varchar("resource"), // 'users', 'players', 'analytics', etc.
  details: jsonb("details").default({}), // Additional context
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_audit_logs_user").on(table.userId),
  index("IDX_audit_logs_action").on(table.action),
  index("IDX_audit_logs_created").on(table.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Parent Reviews (Public testimonials)
export const parentReviews = pgTable("parent_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Optional - for logged in users
  parentName: varchar("parent_name").notNull(), // First name only for display
  childAges: varchar("child_ages"), // e.g., "7", "5 & 9"
  rating: integer("rating").notNull().default(5), // 1-5 stars
  reviewText: text("review_text").notNull(),
  modeTag: varchar("mode_tag").notNull(), // 'geogames', 'geoadventures', 'both'
  isApproved: boolean("is_approved").default(false), // Admin approval required
  isFeatured: boolean("is_featured").default(false), // Show prominently
  isSampleReview: boolean("is_sample_review").default(false), // Pre-populated sample
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
}, (table) => [
  index("IDX_parent_reviews_approved").on(table.isApproved),
  index("IDX_parent_reviews_mode").on(table.modeTag),
]);

export const insertParentReviewSchema = createInsertSchema(parentReviews).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  isApproved: true,
  isFeatured: true,
});

export type InsertParentReview = z.infer<typeof insertParentReviewSchema>;
export type ParentReview = typeof parentReviews.$inferSelect;

// User Feedback (Internal, actionable feedback)
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Optional
  userEmail: varchar("user_email"), // Email for follow-up
  feedbackArea: varchar("feedback_area").notNull(), // 'geogames', 'geoadventures', 'app_overall', 'idea'
  feedbackSubarea: varchar("feedback_subarea"), // e.g., 'guess_and_go', 'journey_packs', etc.
  feedbackText: text("feedback_text"),
  screenshotUrl: text("screenshot_url"), // Optional attachment
  isRead: boolean("is_read").default(false),
  isActioned: boolean("is_actioned").default(false),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_user_feedback_area").on(table.feedbackArea),
  index("IDX_user_feedback_read").on(table.isRead),
]);

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  createdAt: true,
  isRead: true,
  isActioned: true,
  adminNotes: true,
});

export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;

export const geoBuddyStories = pgTable("geo_buddy_stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cityId: varchar("city_id").references(() => dailyQuestCities.id),
  title: varchar("title").notNull(),
  subtitle: varchar("subtitle"),
  seasonNumber: integer("season_number").default(1),
  episodeNumber: integer("episode_number").default(1),
  durationSeconds: integer("duration_seconds").default(120),
  summary: text("summary"),
  storyScript: jsonb("story_script").default([]),
  releaseDate: timestamp("release_date"),
  isReleased: boolean("is_released").default(false),
  coverImageUrl: varchar("cover_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_geo_buddy_stories_city").on(table.cityId),
  index("IDX_geo_buddy_stories_released").on(table.isReleased),
]);

export const insertGeoBuddyStorySchema = createInsertSchema(geoBuddyStories).omit({
  id: true,
  createdAt: true,
});

export type InsertGeoBuddyStory = z.infer<typeof insertGeoBuddyStorySchema>;
export type GeoBuddyStory = typeof geoBuddyStories.$inferSelect;

export const accountStoryProgress = pgTable("account_story_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  storyId: varchar("story_id").references(() => geoBuddyStories.id).notNull(),
  cityId: varchar("city_id").notNull(),
  listenedAt: timestamp("listened_at").defaultNow(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_account_story_progress_user").on(table.userId),
  index("IDX_account_story_progress_story").on(table.storyId),
]);

export const insertAccountStoryProgressSchema = createInsertSchema(accountStoryProgress).omit({
  id: true,
  listenedAt: true,
});

export type InsertAccountStoryProgress = z.infer<typeof insertAccountStoryProgressSchema>;
export type AccountStoryProgress = typeof accountStoryProgress.$inferSelect;

export const geoatlasCountries = pgTable("geoatlas_countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryName: varchar("country_name").notNull(),
  continent: varchar("continent").notNull(),
  capital: varchar("capital").notNull(),
  flagEmoji: varchar("flag_emoji").notNull(),
  isoCode: varchar("iso_code").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  capitalLat: doublePrecision("capital_lat").notNull(),
  capitalLng: doublePrecision("capital_lng").notNull(),
  memoryHook: text("memory_hook"),
  landmarkAnchor: varchar("landmark_anchor"),
  relatedExplorerCityId: varchar("related_explorer_city_id"),
}, (table) => [
  index("IDX_geoatlas_countries_continent").on(table.continent),
  index("IDX_geoatlas_countries_iso").on(table.isoCode),
]);

export const insertGeoatlasCountrySchema = createInsertSchema(geoatlasCountries).omit({
  id: true,
});
export type InsertGeoatlasCountry = z.infer<typeof insertGeoatlasCountrySchema>;
export type GeoatlasCountry = typeof geoatlasCountries.$inferSelect;

export const geoatlasUserProgress = pgTable("geoatlas_user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull(),
  countryId: varchar("country_id").references(() => geoatlasCountries.id).notNull(),
  status: varchar("status").default("new").notNull(),
  timesSeen: integer("times_seen").default(0).notNull(),
  timesCorrect: integer("times_correct").default(0).notNull(),
  timesIncorrect: integer("times_incorrect").default(0).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewAt: timestamp("next_review_at"),
  capitalLearned: boolean("capital_learned").default(false).notNull(),
  flagLearned: boolean("flag_learned").default(false).notNull(),
  mapLearned: boolean("map_learned").default(false).notNull(),
  streakCount: integer("streak_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_geoatlas_progress_player").on(table.playerId),
  index("IDX_geoatlas_progress_country").on(table.countryId),
  index("IDX_geoatlas_progress_review").on(table.nextReviewAt),
]);

export const insertGeoatlasUserProgressSchema = createInsertSchema(geoatlasUserProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGeoatlasUserProgress = z.infer<typeof insertGeoatlasUserProgressSchema>;
export type GeoatlasUserProgress = typeof geoatlasUserProgress.$inferSelect;

export const geoatlasLearningPacks = pgTable("geoatlas_learning_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  continent: varchar("continent").notNull(),
  title: varchar("title").notNull(),
  packOrder: integer("pack_order").notNull(),
  countryIds: jsonb("country_ids").notNull(),
}, (table) => [
  index("IDX_geoatlas_packs_continent").on(table.continent),
]);

export const insertGeoatlasLearningPackSchema = createInsertSchema(geoatlasLearningPacks).omit({
  id: true,
});
export type InsertGeoatlasLearningPack = z.infer<typeof insertGeoatlasLearningPackSchema>;
export type GeoatlasLearningPack = typeof geoatlasLearningPacks.$inferSelect;

export const generatedAdventureImages = pgTable("generated_adventure_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageType: varchar("image_type").notNull(),
  citySlug: varchar("city_slug").notNull(),
  stopSlug: varchar("stop_slug"),
  cityName: varchar("city_name").notNull(),
  stopName: varchar("stop_name"),
  imagePath: varchar("image_path").notNull(),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_gen_adv_img_city").on(table.citySlug),
  index("IDX_gen_adv_img_type_city_stop").on(table.imageType, table.citySlug, table.stopSlug),
]);

export type GeneratedAdventureImage = typeof generatedAdventureImages.$inferSelect;

export const cityAdventureTemplates = pgTable("city_adventure_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  citySlug: varchar("city_slug").notNull().unique(),
  cityName: varchar("city_name").notNull(),
  country: varchar("country").notNull(),
  continent: varchar("continent"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  stopCount: integer("stop_count").notNull().default(5),
  adventureStyle: varchar("adventure_style").notNull().default("family_explorer"),
  stopsData: jsonb("stops_data").notNull().default([]),
  keepsakesData: jsonb("keepsakes_data").notNull().default([]),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_city_template_slug").on(table.citySlug),
  index("IDX_city_template_city_country").on(table.cityName, table.country),
]);

export const insertCityAdventureTemplateSchema = createInsertSchema(cityAdventureTemplates).omit({
  id: true,
  generatedAt: true,
});
export type InsertCityAdventureTemplate = z.infer<typeof insertCityAdventureTemplateSchema>;

export const compassLandmarkImages = pgTable("compass_landmark_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  svgKey: varchar("svg_key", { length: 100 }).notNull().unique(),
  imagePath: varchar("image_path", { length: 500 }).notNull(),
  imageData: text("image_data"),
  prompt: text("prompt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_compass_landmark_svg_key").on(table.svgKey),
]);

export type CompassLandmarkImage = typeof compassLandmarkImages.$inferSelect;
export type CityAdventureTemplate = typeof cityAdventureTemplates.$inferSelect;

export interface TemplateStop {
  name: string;
  stopType: string;
  displayOrder: number;
  address?: string | null;
  description?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  missionType?: string | null;
  missionQuestion?: string | null;
  missionHint?: string | null;
  missionAnswer?: string | null;
  missionDifficulty?: string | null;
  missionKeepsakeReward?: boolean;
  stopMissions?: ExplorerChallengeMission[] | null;
}

export interface TemplateKeepsake {
  stopName: string;
  name: string;
  description: string;
  imageEmoji: string;
  rarity: string;
  unlockType: string;
  unlockConfig?: unknown;
  displayOrder: number;
}

// ============================================================================
// COMPASS QUEST CHALLENGE SYSTEM
// ============================================================================

export const compassQuests = pgTable("compass_quests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questKey: varchar("quest_key").notNull(), // built-in id or custom-<timestamp>
  title: varchar("title").notNull(),
  subtitle: varchar("subtitle"),
  icon: varchar("icon").default("🧭"),
  description: text("description"),
  startCity: varchar("start_city").notNull(),
  cities: text("cities").array().notNull().default(sql`'{}'::text[]`),
  stepsJson: jsonb("steps_json").notNull(),
  isCustom: boolean("is_custom").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_compass_quests_quest_key").on(table.questKey),
]);

export const insertCompassQuestSchema = createInsertSchema(compassQuests).omit({
  id: true,
  createdAt: true,
});
export type InsertCompassQuest = z.infer<typeof insertCompassQuestSchema>;
export type CompassQuest = typeof compassQuests.$inferSelect;

export const compassAttempts = pgTable("compass_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questId: varchar("quest_id").references(() => compassQuests.id).notNull(),
  playerName: varchar("player_name").notNull(),
  xp: integer("xp"),
  timeMs: integer("time_ms"),
  wrongGuesses: integer("wrong_guesses").default(0),
  accuracy: doublePrecision("accuracy"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_compass_attempts_quest").on(table.questId),
]);

export const insertCompassAttemptSchema = createInsertSchema(compassAttempts).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});
export type InsertCompassAttempt = z.infer<typeof insertCompassAttemptSchema>;
export type CompassAttempt = typeof compassAttempts.$inferSelect;

export const compassChallenges = pgTable("compass_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shareCode: varchar("share_code").notNull().unique(),
  questId: varchar("quest_id").references(() => compassQuests.id).notNull(),
  creatorAttemptId: varchar("creator_attempt_id").references(() => compassAttempts.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_compass_challenges_share_code").on(table.shareCode),
]);

export const insertCompassChallengeSchema = createInsertSchema(compassChallenges).omit({
  id: true,
  createdAt: true,
});
export type InsertCompassChallenge = z.infer<typeof insertCompassChallengeSchema>;
export type CompassChallenge = typeof compassChallenges.$inferSelect;

// ============================================================================
// COMPASS RANDOM QUEST TEMPLATES
// ============================================================================

export const compassRandomQuestTemplates = pgTable("compass_random_quest_templates", {
  id: serial("id").primaryKey(),
  templateName: varchar("template_name").notNull(),
  cities: text("cities").array().notNull().default(sql`'{}'::text[]`),
  startCity: varchar("start_city").notNull().default("Washington DC"),
  questData: jsonb("quest_data"),
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CompassRandomQuestTemplate = typeof compassRandomQuestTemplates.$inferSelect;

// ============================================================================
// TRIP WALLET - Documents, confirmations, and receipts stored per trip
// ============================================================================

export const tripWalletItems = pgTable("trip_wallet_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  stopId: varchar("stop_id").references(() => travelStops.id),
  walletSection: varchar("wallet_section").default("pass"), // 'pass' | 'document'
  type: varchar("type").notNull(), // passes: 'ticket','receipt','confirmation','note','photo','other' | documents: 'flight','hotel','car','parking','other'
  label: varchar("label").notNull(),
  confirmationNumber: varchar("confirmation_number"),
  fileUrl: text("file_url"),
  fileUrls: text("file_urls").array(),
  notes: text("notes"),
  entryTime: timestamp("entry_time"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_trip_wallet_trip").on(table.tripId),
]);

export const insertTripWalletItemSchema = createInsertSchema(tripWalletItems).omit({
  id: true,
  createdAt: true,
});
export type InsertTripWalletItem = z.infer<typeof insertTripWalletItemSchema>;
export type TripWalletItem = typeof tripWalletItems.$inferSelect;

// Trip Anchors — fixed plans the AI builds around (tickets, reservations, events)
export const tripAnchors = pgTable("trip_anchors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  name: varchar("name").notNull(),
  anchorType: varchar("anchor_type").notNull().default("ticket"), // 'ticket' | 'food' | 'event' | 'hotel' | 'other'
  day: integer("day").notNull().default(1), // 1-based day number
  time: varchar("time"), // HH:MM e.g. "14:00"
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  flexibility: varchar("flexibility").default("hard"), // 'hard' = non-negotiable fixed time | 'soft' = preferred but moveable ±30-60 min
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_trip_anchors_trip").on(table.tripId),
]);

export const insertTripAnchorSchema = createInsertSchema(tripAnchors).omit({
  id: true,
  createdAt: true,
});
export type InsertTripAnchor = z.infer<typeof insertTripAnchorSchema>;
export type TripAnchor = typeof tripAnchors.$inferSelect;

// ============================================================================
// GEOADVENTURES PLANNER ENGINE
// ============================================================================

export const plannerPlaces = pgTable("planner_places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  city: varchar("city").notNull(),
  country: varchar("country").notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'museum', 'park', 'landmark', 'restaurant', etc.
  durationMinutes: integer("duration_minutes").default(60),
  effortLevel: varchar("effort_level").default("moderate"), // 'low', 'moderate', 'high'
  indoorOutdoor: varchar("indoor_outdoor").default("outdoor"), // 'indoor', 'outdoor', 'both'
  sensoryLoad: varchar("sensory_load").default("moderate"), // 'low', 'moderate', 'high'
  familyAnchorType: varchar("family_anchor_type").default("support"), // 'anchor', 'support', 'filler', 'meal', 'reset'
  minAge: integer("min_age").default(0),
  maxAge: integer("max_age").default(18),
  whyNow: text("why_now"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  address: varchar("address"),
  neighborhoodZone: varchar("neighborhood_zone"), // e.g. "Upper West Side", "South Bank", "North Goa"
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertPlannerPlaceSchema = createInsertSchema(plannerPlaces).omit({ id: true, createdAt: true });
export type InsertPlannerPlace = z.infer<typeof insertPlannerPlaceSchema>;
export type PlannerPlace = typeof plannerPlaces.$inferSelect;

export const plannerPlaceProfiles = pgTable("planner_place_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").references(() => plannerPlaces.id).notNull(),
  whyItWorks: text("why_it_works"),
  bathroomNotes: text("bathroom_notes"),
  foodOptions: text("food_options"),
  parkingNotes: text("parking_notes"),
  bestTimeOfDay: varchar("best_time_of_day").default("anytime"), // 'morning', 'afternoon', 'evening', 'anytime'
  weatherSensitive: boolean("weather_sensitive").default(false),
  strollerFriendly: boolean("stroller_friendly").default(true),
  nearbyStops: jsonb("nearby_stops").default([]),
  practicalTips: jsonb("practical_tips").default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_planner_place_profiles_place").on(table.placeId)]);
export const insertPlannerPlaceProfileSchema = createInsertSchema(plannerPlaceProfiles).omit({ id: true, createdAt: true });
export type InsertPlannerPlaceProfile = z.infer<typeof insertPlannerPlaceProfileSchema>;
export type PlannerPlaceProfile = typeof plannerPlaceProfiles.$inferSelect;

export const plannerParentSupport = pgTable("planner_parent_support", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").references(() => plannerPlaces.id).notNull(),
  breakSuggestion: text("break_suggestion"),
  foodSuggestion: text("food_suggestion"),
  keepGoingSuggestion: text("keep_going_suggestion"),
  moreFunSuggestion: text("more_fun_suggestion"),
  shortenSuggestion: text("shorten_suggestion"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_planner_parent_support_place").on(table.placeId)]);
export const insertPlannerParentSupportSchema = createInsertSchema(plannerParentSupport).omit({ id: true, createdAt: true });
export type InsertPlannerParentSupport = z.infer<typeof insertPlannerParentSupportSchema>;
export type PlannerParentSupport = typeof plannerParentSupport.$inferSelect;

export const plannerPlaceReference = pgTable("planner_place_reference", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").references(() => plannerPlaces.id).notNull(),
  directionsNote: text("directions_note"),
  openingHours: varchar("opening_hours"),
  priceRange: varchar("price_range"), // 'free', '$', '$$', '$$$'
  bookingRequired: boolean("booking_required").default(false),
  bookingUrl: varchar("booking_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_planner_place_reference_place").on(table.placeId)]);
export const insertPlannerPlaceReferenceSchema = createInsertSchema(plannerPlaceReference).omit({ id: true, createdAt: true });
export type InsertPlannerPlaceReference = z.infer<typeof insertPlannerPlaceReferenceSchema>;
export type PlannerPlaceReference = typeof plannerPlaceReference.$inferSelect;

export const plannerPlaceRelationships = pgTable("planner_place_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").references(() => plannerPlaces.id).notNull(),
  relatedPlaceId: varchar("related_place_id").references(() => plannerPlaces.id).notNull(),
  relationshipType: varchar("relationship_type").notNull(), // 'nearby', 'same_vibe', 'easier_alternative', 'harder_alternative', 'indoor_alternative'
  travelMinutes: integer("travel_minutes").default(10),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_planner_place_relationships_place").on(table.placeId)]);
export const insertPlannerPlaceRelationshipSchema = createInsertSchema(plannerPlaceRelationships).omit({ id: true, createdAt: true });
export type InsertPlannerPlaceRelationship = z.infer<typeof insertPlannerPlaceRelationshipSchema>;
export type PlannerPlaceRelationship = typeof plannerPlaceRelationships.$inferSelect;

export const plannerTripPlans = pgTable("planner_trip_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  destination: varchar("destination").notNull(),
  tripDays: integer("trip_days").notNull(),
  childrenAges: jsonb("children_ages").default([]), // number[]
  pace: varchar("pace").default("moderate"), // 'relaxed', 'moderate', 'busy'
  transportMode: varchar("transport_mode").default("walking"), // 'walking', 'driving', 'transit'
  budgetSensitivity: varchar("budget_sensitivity").default("moderate"), // 'budget', 'moderate', 'premium'
  status: varchar("status").default("draft"), // 'draft', 'ready', 'started'
  experienceTripId: varchar("experience_trip_id").references(() => travelTrips.id),
  stayLocations: jsonb("stay_locations").default(null), // { cityName?: string; name: string; address: string; checkIn: string; checkOut: string }[]
  stopIntelligenceEnabled: boolean("stop_intelligence_enabled").default(false),
  canonicalTemplateUsed: varchar("canonical_template_used"), // city key if canonical template was used (e.g. "ooty"), null = pure AI
  canonicalCitiesUsed: text("canonical_cities_used").array(), // for multi-city trips: city keys where canonical templates were applied (e.g. ["jaipur", "agra"])
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_planner_trip_plans_user").on(table.userId),
  index("IDX_planner_trip_plans_canonical").on(table.canonicalTemplateUsed),
]);
export const insertPlannerTripPlanSchema = createInsertSchema(plannerTripPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlannerTripPlan = z.infer<typeof insertPlannerTripPlanSchema>;
export type PlannerTripPlan = typeof plannerTripPlans.$inferSelect;

export const plannerTripPlanStops = pgTable("planner_trip_plan_stops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => plannerTripPlans.id).notNull(),
  placeId: varchar("place_id").references(() => plannerPlaces.id),
  dayNumber: integer("day_number").notNull().default(1),
  displayOrder: integer("display_order").notNull().default(0),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  durationMinutes: integer("duration_minutes").default(60),
  effortLevel: varchar("effort_level").default("moderate"),
  indoorOutdoor: varchar("indoor_outdoor").default("outdoor"),
  sensoryLoad: varchar("sensory_load").default("moderate"), // 'low', 'moderate', 'high'
  familyAnchorType: varchar("family_anchor_type").default("support"), // 'anchor', 'support', 'filler', 'meal', 'reset', 'weather_backup'
  minAge: integer("min_age").default(0),
  whyNow: text("why_now"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  address: varchar("address"),
  isLocked: boolean("is_locked").default(false),
  isOptional: boolean("is_optional").default(false),
  status: varchar("status").default("active"), // 'active', 'replaced', 'removed'
  wasAutoGenerated: boolean("was_auto_generated").default(true),
  reviewRequired: boolean("review_required").default(false),
  reviewNote: text("review_note"),
  nextPlaceId: varchar("next_place_id"),
  travelMinutes: integer("travel_minutes").default(0),
  travelMode: varchar("travel_mode"), // 'walk', 'car', 'transit', null
  parentSupportData: jsonb("parent_support_data"),
  placeReferenceData: jsonb("place_reference_data"),
  placeProfileData: jsonb("place_profile_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_planner_trip_plan_stops_plan").on(table.planId),
]);
export const insertPlannerTripPlanStopSchema = createInsertSchema(plannerTripPlanStops).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlannerTripPlanStop = z.infer<typeof insertPlannerTripPlanStopSchema>;
export type PlannerTripPlanStop = typeof plannerTripPlanStops.$inferSelect;

export interface PlaceProfileJsonb {
  whyItWorks?: string;
  bathroomNotes?: string;
  foodOptions?: string;
  parkingNotes?: string;
  nearbyStops?: string[];
  practicalTips?: string[];
  bestTimeOfDay?: string;
  weatherSensitive?: boolean;
  strollerFriendly?: boolean;
}

export interface PlaceReferenceJsonb {
  openingHours?: string;
  priceRange?: string;
  bookingRequired?: boolean;
  bookingUrl?: string;
  directionsNote?: string;
  /** AI-reported confidence that this place exists and is accurately described (0–100). */
  sourceConfidence?: number;
}

export interface ParentSupportJsonb {
  breakSuggestion?: string;
  foodSuggestion?: string;
  keepGoingSuggestion?: string;
  moreFunSuggestion?: string;
  shortenSuggestion?: string;
}

export type SupportAction = "break" | "food" | "keep_going" | "more_fun" | "shorten";
export type PassStatus = "upcoming" | "ready" | "used";

export const plannerPasses = pgTable("planner_passes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => plannerTripPlans.id).notNull(),
  stopId: varchar("stop_id").references(() => plannerTripPlanStops.id),
  label: varchar("label").notNull(),
  type: varchar("type").notNull().default("ticket"), // 'ticket', 'reservation', 'confirmation', 'note'
  confirmationNumber: varchar("confirmation_number"),
  qrData: text("qr_data"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  neededOnDay: integer("needed_on_day"),
  status: varchar("status").default("upcoming"), // 'upcoming', 'ready', 'used'
  usedAt: timestamp("used_at"),
  entryTime: timestamp("entry_time"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_planner_passes_plan").on(table.planId),
]);
export const insertPlannerPassSchema = createInsertSchema(plannerPasses).omit({ id: true, createdAt: true });
export type InsertPlannerPass = z.infer<typeof insertPlannerPassSchema>;
export type PlannerPass = typeof plannerPasses.$inferSelect;

export const plannerStopIntelligence = pgTable("planner_stop_intelligence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").references(() => plannerPlaces.id).notNull().unique(),
  restroomConfidence: integer("restroom_confidence"),
  foodConfidence: integer("food_confidence"),
  entryFrictionScore: integer("entry_friction_score"),
  exitEaseScore: integer("exit_ease_score"),
  escapeEaseScore: integer("escape_ease_score"),
  parkingAvailabilityScore: integer("parking_availability_score"),
  shadeOrClimateRelief: integer("shade_or_climate_relief"),
  seatingAvailability: integer("seating_availability"),
  shortenabilityScore: integer("shortenability_score"),
  skipCostScore: integer("skip_cost_score"),
  queueRiskMorning: integer("queue_risk_morning"),
  queueRiskMidday: integer("queue_risk_midday"),
  queueRiskAfternoon: integer("queue_risk_afternoon"),
  lateDayRisk: integer("late_day_risk"),
  sourceConfidence: integer("source_confidence"),
  kidFitScore: integer("kid_fit_score"),
  flowFitScore: integer("flow_fit_score"),
  practicalityScore: integer("practicality_score"),
  flexibilityScore: integer("flexibility_score"),
  socialProofScore: integer("social_proof_score"),
  discoveryScore: integer("discovery_score"),
  finalScore: integer("final_score"),
  roleAssigned: varchar("role_assigned"),
  bestArrivalWindow: varchar("best_arrival_window"),
  worstArrivalWindow: varchar("worst_arrival_window"),
  rationaleShort: text("rationale_short"),
  socialLabel: varchar("social_label"),
  discoveryLabel: varchar("discovery_label"),
  enrichedAt: timestamp("enriched_at").defaultNow(),
  // Phase 2 — Age-band fit
  age2to4Fit: integer("age2to4_fit"),
  age5to7Fit: integer("age5to7_fit"),
  age8to12Fit: integer("age8to12_fit"),
  teenFit: integer("teen_fit"),
  mixedSiblingFit: integer("mixed_sibling_fit"),
  // Phase 2 — Parent reality
  strollerEaseScore: integer("stroller_ease_score"),
  waitingToleranceRequiredScore: integer("waiting_tolerance_required_score"),
  meltdownRecoveryEaseScore: integer("meltdown_recovery_ease_score"),
  hungerRecoveryEaseScore: integer("hunger_recovery_ease_score"),
  bathroomUrgencyResilienceScore: integer("bathroom_urgency_resilience_score"),
  weatherFallbackStrengthScore: integer("weather_fallback_strength_score"),
  ticketValueConfidenceScore: integer("ticket_value_confidence_score"),
  hassleToJoyRatioScore: integer("hassle_to_joy_ratio_score"),
  parentEffortScore: integer("parent_effort_score"),
  // Phase 2 — Kid delight
  wowFactorScore: integer("wow_factor_score"),
  handsOnLevelScore: integer("hands_on_level_score"),
  freePlayLevelScore: integer("free_play_level_score"),
  movementReleaseScore: integer("movement_release_score"),
  sensoryRewardScore: integer("sensory_reward_score"),
  curiosityHookScore: integer("curiosity_hook_score"),
  // Phase 2 — Day-fit
  morningFitScore: integer("morning_fit_score"),
  afterLunchFitScore: integer("after_lunch_fit_score"),
  lateDayFitScore: integer("late_day_fit_score"),
  rainyDayFitScore: integer("rainy_day_fit_score"),
  hotDayFitScore: integer("hot_day_fit_score"),
  coldDayFitScore: integer("cold_day_fit_score"),
  quickWinFitScore: integer("quick_win_fit_score"),
  treatStopFitScore: integer("treat_stop_fit_score"),
  anchorStopFitScore: integer("anchor_stop_fit_score"),
  // Phase 2 — Family evidence
  familyEvidenceScore: integer("family_evidence_score"),
  ageMatchConfidenceScore: integer("age_match_confidence_score"),
  worthTheHassleConfidenceScore: integer("worth_the_hassle_confidence_score"),
  hiddenGemFamilyScore: integer("hidden_gem_family_score"),
  supportingEvidenceCount: integer("supporting_evidence_count"),
  commonParentPros: text("common_parent_pros").array(),
  commonParentCautions: text("common_parent_cautions").array(),
  // Phase 2 — Parent-facing labels
  bestForAgesLabel: varchar("best_for_ages_label"),
  timeNeededLabel: varchar("time_needed_label"),
  effortLabel: varchar("effort_label"),
  weatherLabel: varchar("weather_label"),
  cautionLabel: varchar("caution_label"),
  whyWorthItLabel: varchar("why_worth_it_label"),
  goodMomentLabel: varchar("good_moment_label"),
  // Cache freshness — used by serve-then-refresh TTL system
  cachedAt: timestamp("cached_at").defaultNow(),
  invalidatedAt: timestamp("invalidated_at"),
}, (table) => [index("IDX_planner_stop_intelligence_place").on(table.placeId)]);

export const insertPlannerStopIntelligenceSchema = createInsertSchema(plannerStopIntelligence).omit({ id: true, enrichedAt: true, cachedAt: true });
export type InsertPlannerStopIntelligence = z.infer<typeof insertPlannerStopIntelligenceSchema>;
export type PlannerStopIntelligence = typeof plannerStopIntelligence.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// Place Family Signals — learning knowledge base
// Stores real engagement signals from our users (per age group) + AI cold-start
// knowledge so stop generation can recommend with higher confidence over time.
// ─────────────────────────────────────────────────────────────────────────────

export interface AgeGroupSignalData {
  visitCount: number;        // number of times this age group visited the stop
  completedCount: number;    // marked "completed" (not skipped)
  skippedCount: number;      // marked "skipped"
  avgMissionRate: number;    // 0-1: avg fraction of missions completed
  lastUpdated: string;       // ISO date string
}

export interface ExternalReviewSignal {
  familyFriendlyScore: number;           // 0-100, AI-extracted from reviews
  positiveKidMentions: number;           // count of positive child mentions
  totalReviewsAnalyzed: number;
  summary: string;                        // short AI summary for parents
  fetchedAt: string;
}

export interface AIColdStartSignal {
  globalIconicScore: number;   // 0-100: how iconic/famous is this place globally
  kidFriendlyScore: number;    // 0-100: AI assessment of kid friendliness
  ageGroupFit: Record<string, number>; // {"3-5": 70, "6-8": 90, "9-11": 85, "12+": 75}
  rationale: string;           // Short explanation
  generatedAt: string;
}

export const placeFamilySignals = pgTable("place_family_signals", {
  id: serial("id").primaryKey(),
  placeKey: varchar("place_key", { length: 600 }).notNull().unique(), // "city:country:normalized_stop_name"
  city: varchar("city", { length: 200 }).notNull(),
  country: varchar("country", { length: 200 }).notNull(),
  stopName: varchar("stop_name", { length: 500 }).notNull(),
  stopType: varchar("stop_type", { length: 100 }),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  // Internal engagement (from our own users — most trusted signal)
  totalVisits: integer("total_visits").default(0).notNull(),
  totalCompleted: integer("total_completed").default(0).notNull(),
  totalSkipped: integer("total_skipped").default(0).notNull(),
  avgMissionCompletionRate: real("avg_mission_completion_rate"),  // 0-1
  // Per-age-group breakdown: {"3-5": AgeGroupSignalData, "6-8": ..., "9-11": ..., "12+": ...}
  ageGroupSignals: jsonb("age_group_signals").$type<Record<string, AgeGroupSignalData>>().default({}),
  // AI cold-start signal (used when internal data is sparse)
  aiColdStart: jsonb("ai_cold_start").$type<AIColdStartSignal>(),
  // External review signal (optional future enhancement — Google Places etc)
  externalReviewSignal: jsonb("external_review_signal").$type<ExternalReviewSignal>(),
  // Meta
  lastAggregatedAt: timestamp("last_aggregated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_place_family_signals_place_key").on(table.placeKey),
  index("IDX_place_family_signals_city_country").on(table.city, table.country),
]);

export type PlaceFamilySignal = typeof placeFamilySignals.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// City Stop Pool Cache — pre-seeded candidate stop pools per city
// Stores 15-25 fully enriched candidate stops for fast itinerary assembly.
// Personalization (scoring, selection, sequencing) runs per-user on top of pool.
// ─────────────────────────────────────────────────────────────────────────────

export interface CachedStopMission {
  type: "knowledge" | "observation" | "photo";
  question: string;
  options?: string[];
  correctOption?: number;
  xpReward: number;
}

export interface CachedStopCandidate {
  name: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  stopType: string;
  type: string;
  durationMinutes: number;
  effortLevel: "low" | "moderate" | "high";
  indoorOutdoor: "indoor" | "outdoor" | "both";
  sensoryLoad: "low" | "moderate" | "high";
  familyAnchorType: "anchor" | "support" | "filler" | "meal" | "reset";
  minAge: number;
  whyNow: string;
  travelMinutes?: number;
  travelMode?: string;
  // Geographic zone tag (e.g. "Upper West Side", "South Bank", "North Goa").
  // Enables same-zone clustering bonus and 3rd-zone penalty in selectStopsFromPool.
  neighborhoodZone?: string;
  // Stop Intelligence time-of-day fit scores (0-100). Populated by pool seeder when
  // SI data is available; used for within-day sequencing in selectStopsFromPool.
  // Falls back to placeProfileData.bestTimeOfDay text when absent.
  morningFitScore?: number;
  afterLunchFitScore?: number;
  lateDayFitScore?: number;
  anchorStopFitScore?: number;
  // Journey content — pre-generated so stop content is available without extra AI calls
  facts?: string[];
  parentTip?: string;
  missions?: CachedStopMission[];
  artifactName?: string;
  artifactEmoji?: string;
  parentSupportData: {
    breakSuggestion: string;
    foodSuggestion: string;
    keepGoingSuggestion: string;
    moreFunSuggestion: string;
    shortenSuggestion: string;
  };
  placeReferenceData: {
    directionsNote: string;
    openingHours: string;
    priceRange: string;
    bookingRequired: boolean;
    bookingUrl?: string;
    /** AI-reported confidence that this place exists and is accurately described (0–100). */
    sourceConfidence?: number;
  };
  placeProfileData: {
    whyItWorks: string;
    bathroomNotes: string;
    foodOptions: string;
    parkingNotes: string;
    bestTimeOfDay: string;
    weatherSensitive: boolean;
    strollerFriendly: boolean;
    nearbyStops: string[];
    practicalTips: string[];
  };
}

// ============================================================================
// TRIP STORY MOMENTS — Memory Generation Engine cache
// ============================================================================

export const tripStoryMoments = pgTable("trip_story_moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationKey: text("destination_key").notNull(),
  placeName: text("place_name").notNull(),
  momentType: text("moment_type").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull(),
  kidQuote: text("kid_quote"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_trip_story_moments_dest").on(table.destinationKey),
  uniqueIndex("UNQ_trip_story_moments_dest_type_order").on(table.destinationKey, table.momentType, table.sortOrder),
]);

export const insertTripStoryMomentSchema = createInsertSchema(tripStoryMoments).omit({
  id: true,
  createdAt: true,
});

export type InsertTripStoryMoment = z.infer<typeof insertTripStoryMomentSchema>;
export type TripStoryMoment = typeof tripStoryMoments.$inferSelect;

// ============================================================================
// TRIP STORY IMAGE ASSETS — Persistent image cache for carousel cards
// ============================================================================

export const tripStoryImageAssets = pgTable("trip_story_image_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationKey: text("destination_key").notNull(),
  destinationLabel: text("destination_label").notNull(),
  country: text("country").notNull().default(""),
  tripType: text("trip_type").notNull().default("city"), // city|culture|nature|beach|mixed
  stopType: text("stop_type").notNull().default("generic"), // museum|aquarium|landmark|viewpoint|park|walk|boat|food|break|historic_site|zoo|ride|generic
  momentType: text("moment_type").notNull(), // hero|discovery|fun|quiet_break|unexpected_joy|kid_memory|parent_relief
  stopName: text("stop_name").notNull().default(""),
  promptVersion: text("prompt_version").notNull().default("v1"),
  promptText: text("prompt_text").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("pending"), // pending|generating|ready|failed
  qualityScore: integer("quality_score").default(0),
  timesUsed: integer("times_used").notNull().default(0),
  isCurated: boolean("is_curated").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("UNQ_trip_story_image_assets_cache").on(table.destinationKey, table.momentType, table.stopType),
  index("IDX_trip_story_image_assets_dest").on(table.destinationKey),
  index("IDX_trip_story_image_assets_moment").on(table.momentType),
  index("IDX_trip_story_image_assets_stop").on(table.stopType),
]);

export const insertTripStoryImageAssetSchema = createInsertSchema(tripStoryImageAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTripStoryImageAsset = z.infer<typeof insertTripStoryImageAssetSchema>;
export type TripStoryImageAsset = typeof tripStoryImageAssets.$inferSelect;

// ============================================================================

export const cityStopPoolCache = pgTable("city_stop_pool_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  city: varchar("city", { length: 200 }).notNull(),
  country: varchar("country", { length: 200 }).notNull(),
  normalizedKey: varchar("normalized_key", { length: 450 }).notNull().unique(), // lowercase city+country
  stopPool: jsonb("stop_pool").$type<CachedStopCandidate[]>().notNull().default([]),
  cachedAt: timestamp("cached_at").defaultNow(),
}, (table) => [
  index("IDX_city_stop_pool_cache_key").on(table.normalizedKey),
]);

export const insertCityStopPoolCacheSchema = createInsertSchema(cityStopPoolCache).omit({
  id: true,
  cachedAt: true,
});

export type InsertCityStopPoolCache = z.infer<typeof insertCityStopPoolCacheSchema>;
export type CityStopPoolCache = typeof cityStopPoolCache.$inferSelect;

// ============================================================================
// Trip Unlocks — per-trip one-time payment records
// ============================================================================

export const tripUnlocks = pgTable("trip_unlocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tripId: varchar("trip_id", { length: 200 }),
  destination: varchar("destination", { length: 300 }).notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 300 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  pricingBand: varchar("pricing_band", { length: 5 }),
  amountPaid: integer("amount_paid"),
  currency: varchar("currency", { length: 10 }),
  unlockedAt: timestamp("unlocked_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_trip_unlocks_user_id").on(table.userId),
  index("IDX_trip_unlocks_trip_id").on(table.tripId),
  index("IDX_trip_unlocks_session_id").on(table.stripeSessionId),
]);

export const insertTripUnlockSchema = createInsertSchema(tripUnlocks).omit({
  id: true,
  createdAt: true,
});

export type InsertTripUnlock = z.infer<typeof insertTripUnlockSchema>;
export type TripUnlock = typeof tripUnlocks.$inferSelect;

// ============================================================================
// Promo Codes — invite / discount code system
// ============================================================================

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 200 }),
  accessType: varchar("access_type", { length: 50 }).notNull().default("full_free"),
  // 'full_free' | 'discounted' | (future: 'gift_trip' | 'city_pack')
  discountType: varchar("discount_type", { length: 30 }),
  // 'percent' | 'fixed_amount' | 'founding_price' — null if full_free
  discountValue: integer("discount_value"),
  // percent: 0-100, fixed_amount: cents in the user's band currency, null if full_free
  maxUses: integer("max_uses").notNull().default(100),
  usedCount: integer("times_used").notNull().default(0),  // DB column is times_used
  oneUsePerUser: boolean("one_use_per_user").notNull().default(true),
  appliesToTripId: varchar("applies_to_trip_id", { length: 200 }),
  // null = applies to any trip
  appliesGlobally: boolean("applies_globally").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_promo_codes_code").on(table.code),
  index("IDX_promo_codes_active").on(table.isActive),
]);

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true, createdAt: true, updatedAt: true, usedCount: true,
});
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// ============================================================================
// Promo Redemptions — one record per (user × code) redemption
// ============================================================================

export const promoRedemptions = pgTable("promo_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codeId: varchar("code_id").notNull().references(() => promoCodes.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tripId: varchar("trip_id", { length: 200 }),
  tripUnlockId: varchar("trip_unlock_id", { length: 200 }),
  // the resulting TripUnlock id when code was full_free
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  status: varchar("status", { length: 30 }).notNull().default("applied"),
  // 'applied' | 'revoked'
}, (table) => [
  index("IDX_promo_redemptions_code_id").on(table.codeId),
  index("IDX_promo_redemptions_user_id").on(table.userId),
  // No unique constraint — oneUsePerUser enforced at the application level so that
  // codes with oneUsePerUser=false can be redeemed multiple times by the same user.
]);

export const insertPromoRedemptionSchema = createInsertSchema(promoRedemptions).omit({
  id: true, redeemedAt: true,
});
export type InsertPromoRedemption = z.infer<typeof insertPromoRedemptionSchema>;
export type PromoRedemption = typeof promoRedemptions.$inferSelect;

// ============================================================================
// Trip Day Memories — emotional capture lines generated per day of a trip
// ============================================================================

export const tripDayMemories = pgTable("trip_day_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").references(() => travelTrips.id).notNull(),
  dayIndex: integer("day_index").notNull(),
  lines: text("lines").array().notNull().default(sql`'{}'::text[]`),
  parentNote: text("parent_note"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("UQ_trip_day_memories_trip_day").on(table.tripId, table.dayIndex),
]);

export const insertTripDayMemorySchema = createInsertSchema(tripDayMemories).omit({
  id: true,
  createdAt: true,
});
export type InsertTripDayMemory = z.infer<typeof insertTripDayMemorySchema>;
export type TripDayMemory = typeof tripDayMemories.$inferSelect;

// ============================================================================
// Story Email Schedules — 1-week and 1-month retention emails after story save
// ============================================================================

export const storyEmailSchedules = pgTable("story_email_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => travelTrips.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  triggerType: varchar("trigger_type", { length: 20 }).notNull(), // '1_week' | '1_month'
  sendAt: timestamp("send_at").notNull(),
  sentAt: timestamp("sent_at"),
  emailAddress: varchar("email_address").notNull(),
}, (table) => [
  index("IDX_story_email_schedules_trip_id").on(table.tripId),
  index("IDX_story_email_schedules_send_at").on(table.sendAt),
  uniqueIndex("UQ_story_email_schedules_trip_trigger").on(table.tripId, table.triggerType),
]);

export const insertStoryEmailScheduleSchema = createInsertSchema(storyEmailSchedules).omit({
  id: true, sentAt: true,
});
export type InsertStoryEmailSchedule = z.infer<typeof insertStoryEmailScheduleSchema>;
export type StoryEmailSchedule = typeof storyEmailSchedules.$inferSelect;

// ============================================================================
// Generated Family Photos — admin-curated AI images for carousel Cards 2 & 3
// ============================================================================

export const generatedFamilyPhotos = pgTable("generated_family_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  city: varchar("city").notNull(),
  country: varchar("country"),
  place: varchar("place"),
  category: varchar("category").notNull(), // landmark|food|museum|park|water|street
  poseTemplate: varchar("pose_template").notNull(),
  poseType: varchar("pose_type").notNull(), // memory|candid|interaction|movement
  familyEthnicity: varchar("family_ethnicity"),
  familyGroupSize: varchar("family_group_size"),
  assembledPrompt: text("assembled_prompt"),
  promptMetadata: jsonb("prompt_metadata"),
  imageUrl: varchar("image_url"),
  status: varchar("status").notNull().default("pending"), // pending|approved|rejected|static
  isStatic: boolean("is_static").default(false),
  qualityScore: integer("quality_score"), // 1-5
  rejectionReason: text("rejection_reason"),
  generatedAt: timestamp("generated_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_gen_family_photos_city").on(table.city),
  index("IDX_gen_family_photos_status").on(table.status),
  index("IDX_gen_family_photos_category").on(table.category),
]);

export const insertGeneratedFamilyPhotoSchema = createInsertSchema(generatedFamilyPhotos).omit({
  id: true,
  createdAt: true,
});
export type InsertGeneratedFamilyPhoto = z.infer<typeof insertGeneratedFamilyPhotoSchema>;
export type GeneratedFamilyPhoto = typeof generatedFamilyPhotos.$inferSelect;

// ============================================================================
// STOP QUALITY SIGNALS — passive + active feedback layer (parent-only)
// Does NOT replace canonical templates or stop intelligence.
// Acts as the 4th tuning layer: canonical → stop intelligence → family-fit → user quality
// ============================================================================

export type StopSignalType =
  | "visited"
  | "moment_capture_opened"
  | "photo_added"
  | "note_added"
  | "photo_and_note"
  | "capture_dismissed"
  | "favorite"
  | "skipped"
  | "worth_it"
  | "worth_it_followup"
  | "standout_stop"
  | "day_end_tag"
  | "kid_mode_completed"
  | "removed_from_trip"
  | "long_dwell"
  | "short_dwell";

export const stopQualitySignals = pgTable("stop_quality_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tripId: varchar("trip_id").notNull().references(() => travelTrips.id),
  stopId: varchar("stop_id").notNull().references(() => travelStops.id),
  signalType: varchar("signal_type", { length: 40 }).notNull().$type<StopSignalType>(),
  signalValue: varchar("signal_value", { length: 80 }),
  signalReason: varchar("signal_reason", { length: 80 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_stop_quality_signals_stop").on(table.stopId),
  index("IDX_stop_quality_signals_trip").on(table.tripId),
  index("IDX_stop_quality_signals_user").on(table.userId),
]);

export const insertStopQualitySignalSchema = createInsertSchema(stopQualitySignals).omit({
  id: true,
  createdAt: true,
});
export type InsertStopQualitySignal = z.infer<typeof insertStopQualitySignalSchema>;
export type StopQualitySignal = typeof stopQualitySignals.$inferSelect;

// ── GUIDE EMAIL DRIP SCHEDULE ─────────────────────────────────────────────────
export const guideEmailSchedules = pgTable("guide_email_schedules", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  emailNum: integer("email_num").notNull(), // 2–5
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  promoCode: varchar("promo_code", { length: 50 }), // Generated GUIDE-XXXXXXXX for Email 5 only
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type GuideEmailSchedule = typeof guideEmailSchedules.$inferSelect;

// ── FREE GUIDE SUBSCRIBERS ────────────────────────────────────────────────────
export const guideSubscribers = pgTable("guide_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  source: text("source").default("free-guide"),
  emailSent: boolean("email_sent").default(false),
  optedOut: boolean("opted_out").default(false).notNull(),
  unsubscribeToken: text("unsubscribe_token"),
});
export const insertGuideSubscriberSchema = createInsertSchema(guideSubscribers).omit({ id: true, subscribedAt: true });
export type InsertGuideSubscriber = z.infer<typeof insertGuideSubscriberSchema>;
export type GuideSubscriber = typeof guideSubscribers.$inferSelect;
