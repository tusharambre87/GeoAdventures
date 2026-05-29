import { users, players, gameEvents, userSessions, dailyQuestCities, cityStickers, userCityStickers, userRewards, userMiniGames, geoArtCreations, proWaitlist, rewardTiers, rewardUnlocks, DEFAULT_REWARD_TIERS, travelTrips, travelStops, journeyPacks, journeyPackProgress, journeyGamePrompts, travelMoments, memoryStars, rememberThisCards, travelWonderResponses, travelTripStories, travelArtifacts, explorerCollectedArtifacts, locationStoryCache, explorerIdentityTraits, ALL_CURATED_ARTIFACTS, geoRelicPuzzles, geoRelicPuzzlePieces, playerPuzzleProgress, travelKeepsakes, explorerCollectedKeepsakes, mapPuzzles, mapPuzzleRegions, playerMapPuzzleProgress, trailTalesRiddles, trailTalesAttempts, trailTalesProgress, itineraryShares, itineraryShareStops, itineraryUpvotes, itineraryBookmarks, itineraryComments, explorerTravelBadges, TRAVEL_BADGE_CATEGORIES, experienceContent, experienceProgress, pwaInstalls, analyticsWeeklySnapshots, playTogetherPlays, playerGameStats, pendingTransfers, pushSubscriptions, parentReviews, userFeedback, cityAdventureTemplates, compassQuests, compassAttempts, compassChallenges, type InsertParentReview, type ParentReview, type InsertUserFeedback, type UserFeedback, type InsertPlayTogetherPlays, type PlayTogetherPlays, type InsertExperienceContent, type ExperienceContent, type InsertExperienceProgress, type ExperienceProgress, type User, type UpsertUser, type InsertPlayer, type Player, type UpdatePlayerStats, type InsertGameEvent, type GameEvent, type InsertUserSession, type UpdateUserSession, type UserSession, type TimeSummary, type InsertDailyQuestCity, type DailyQuestCity, type InsertCitySticker, type CitySticker, type InsertUserCitySticker, type UserCitySticker, type InsertUserReward, type UserReward, type InsertUserMiniGame, type UserMiniGame, type InsertGeoArtCreation, type GeoArtCreation, type InsertRewardTier, type RewardTier, type InsertRewardUnlock, type RewardUnlock, type RewardClaim, type InsertTravelTrip, type TravelTrip, type InsertTravelStop, type TravelStop, type InsertJourneyPack, type JourneyPack, type InsertJourneyPackProgress, type JourneyPackProgress, type InsertTravelMoment, type TravelMoment, type InsertMemoryStars, type MemoryStars, type InsertPushSubscription, type PushSubscription, type PlayerGameStats, type InsertRememberThisCard, type RememberThisCard, type InsertWonderResponse, type WonderResponse, type InsertTripStory, type TripStory, type InsertTravelArtifact, type TravelArtifact, type InsertExplorerCollectedArtifact, type ExplorerCollectedArtifact, type InsertLocationStoryCache, type LocationStoryCache, type InsertExplorerIdentityTraits, type InsertExplorerTravelBadge, type ExplorerTravelBadge, type ExplorerIdentityTraits, type IncrementTrait, type InsertItineraryShare, type ItineraryShare, type InsertItineraryShareStop, type ItineraryShareStop, type InsertItineraryUpvote, type ItineraryUpvote, type InsertItineraryComment, type ItineraryComment, type InsertGeoRelicPuzzle, type GeoRelicPuzzle, type InsertGeoRelicPuzzlePiece, type GeoRelicPuzzlePiece, type InsertPlayerPuzzleProgress, type PlayerPuzzleProgress, type InsertTravelKeepsake, type TravelKeepsake, type InsertExplorerCollectedKeepsake, type ExplorerCollectedKeepsake, type InsertMapPuzzle, type MapPuzzle, type InsertMapPuzzleRegion, type MapPuzzleRegion, type InsertPlayerMapPuzzleProgress, type PlayerMapPuzzleProgress, type InsertTrailTalesRiddle, type TrailTalesRiddle, type InsertTrailTalesAttempt, type TrailTalesAttempt, type InsertTrailTalesProgress, type TrailTalesProgress, type InsertPwaInstall, type PwaInstall, type InsertAnalyticsWeeklySnapshot, type AnalyticsWeeklySnapshot, type InsertPendingTransfer, type PendingTransfer, type InsertCityAdventureTemplate, type CityAdventureTemplate, type InsertCompassQuest, type CompassQuest, type InsertCompassAttempt, type CompassAttempt, type InsertCompassChallenge, type CompassChallenge, tripAnchors, type InsertTripAnchor, type TripAnchor } from "@shared/schema";
import { cityStopPoolCache, type CityStopPoolCache, type InsertCityStopPoolCache } from "@shared/schema";
import { tripUnlocks, type TripUnlock, type InsertTripUnlock } from "@shared/schema";
import { promoCodes, promoRedemptions, type PromoCode, type InsertPromoCode, type PromoRedemption, type InsertPromoRedemption } from "@shared/schema";
import { storyEmailSchedules, type StoryEmailSchedule } from "@shared/schema";
import { stopQualitySignals, type StopQualitySignal, type InsertStopQualitySignal } from "@shared/schema";
import { guideSubscribers, type GuideSubscriber, guideEmailSchedules, type GuideEmailSchedule } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, isNull, isNotNull, ne, inArray, or } from "drizzle-orm";

export interface IMapPuzzleWithRegions extends MapPuzzle {
  regions: MapPuzzleRegion[];
}

export interface EmailPreferences {
  emailSubscribed: boolean;
  weeklyProgressEmails: boolean;
  dailyReminderEmails: boolean;
}

export interface AnalyticsSummary {
  totalGamesPlayed: number;
  gamesByMode: { mode: string; count: number }[];
  completionRate: number;
  averageStars: number;
  averageTimeSeconds: number;
  dailyActivity: { date: string; count: number }[];
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  getPlayersByUserId(userId: string): Promise<Player[]>;
  getAllPlayers(): Promise<Player[]>;
  getPlayerById(id: string): Promise<Player | undefined>;
  awardXp(playerId: string, amount: number): Promise<{ totalXp: number; previousXp: number }>;
  getPlayerXp(playerId: string): Promise<number>;
  updatePlayerStats(playerId: string, stats: UpdatePlayerStats): Promise<Player | undefined>;
  updateEmailPreferences(email: string, preferences: Partial<EmailPreferences>): Promise<User | undefined>;
  getEmailPreferences(email: string): Promise<EmailPreferences | undefined>;
  recordGameEvent(event: InsertGameEvent): Promise<GameEvent>;
  getAnalyticsSummary(days?: number): Promise<AnalyticsSummary>;
  getRecentEvents(limit?: number): Promise<GameEvent[]>;
  setVerificationCode(email: string, code: string): Promise<User | undefined>;
  verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }>;
  isEmailVerified(email: string): Promise<boolean>;
  setPasswordResetCode(email: string, code: string): Promise<User | undefined>;
  verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; message: string }>;
  resetPassword(email: string, code: string, newPasswordHash: string): Promise<{ success: boolean; message: string }>;
  updateUserName(userId: string, name: string): Promise<User | undefined>;
  updateOnboardingStatus(userId: string, key: string, value: boolean): Promise<User | undefined>;
  setEmailChangeCode(userId: string, newEmail: string, code: string): Promise<void>;
  verifyEmailChange(userId: string, newEmail: string, code: string): Promise<{ success: boolean; message: string }>;
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  updateUserSession(sessionId: string, updates: UpdateUserSession): Promise<UserSession | undefined>;
  getActiveSession(visitorId: string): Promise<UserSession | undefined>;
  endSession(sessionId: string, totalTime: number, gameTime: number): Promise<UserSession | undefined>;
  getTimeSummary(days?: number): Promise<TimeSummary>;
  isFirstVisitorSession(visitorId: string): Promise<boolean>;
  
  // Parent Weekly Snapshot emails
  getUsersForWeeklyEmails(): Promise<User[]>;
  getExplorerWeeklyStats(playerId: string, startDate: Date, endDate: Date): Promise<{
    citiesEarned: string[];
    gamesPlayed: number;
    streak: number;
    completedGeoAdventures: { name: string; destination: string }[];
  }>;
  
  // PWA Install tracking
  recordPwaInstall(data: InsertPwaInstall): Promise<PwaInstall>;
  markPwaReturn(visitorId: string): Promise<PwaInstall | undefined>;
  getPwaInstallStats(startDate: Date, endDate: Date): Promise<{ installs: number; returnRate: number }>;
  
  // Unified game session recording (streak + per-game stats)
  // clientLocalDate: YYYY-MM-DD string from client's local timezone for accurate streak calculation
  recordGameSession(playerId: string, gameType: 'guess_and_go' | 'daily_quest' | 'crossworld', won: boolean, timeMs?: number, clientLocalDate?: string): Promise<{
    player: Player;
    gameStats: PlayerGameStats;
    streakResult: {
      newStreak: number;
      dailyQuestStreak: number;
      graceUsed: boolean;
      streakReset: boolean;
      previousStreak: number;
      streakFreezes: number;
    };
  }>;
  getPlayerGameStats(playerId: string): Promise<PlayerGameStats[]>;
  getPlayerGameStatsByType(playerId: string, gameType: string): Promise<PlayerGameStats | undefined>;
  
  // Weekly analytics snapshots
  createWeeklySnapshot(data: InsertAnalyticsWeeklySnapshot): Promise<AnalyticsWeeklySnapshot>;
  getWeeklySnapshots(weeks: number): Promise<AnalyticsWeeklySnapshot[]>;
  getLatestWeeklySnapshot(): Promise<AnalyticsWeeklySnapshot | undefined>;
  getAnalyticsMetrics(startDate: Date, endDate: Date): Promise<{
    totalSessions: number;
    uniqueVisitors: number;
    firstSessionCompletionRate: number;
    avgTimeToFirstPlaySeconds: number;
    avgSessionLengthSeconds: number;
    mobilePercent: number;
    desktopPercent: number;
    gamesPerSession: number;
    game2StartPercent: number;
    game3StartPercent: number;
    shareClicks: number;
  }>;
  
  // Play Together - Daily game tracking
  getPlayTogetherStatus(userId: string, gameType: string, playDate: string): Promise<{ playsCount: number; promptsUsedToday: string[] }>;
  recordPlayTogetherPlay(userId: string, tripId: string | null, gameType: string, playDate: string, promptUsed: string): Promise<PlayTogetherPlays>;
  
  // Daily Quest Cities
  createDailyQuestCity(city: InsertDailyQuestCity): Promise<DailyQuestCity>;
  getAllDailyQuestCities(): Promise<DailyQuestCity[]>;
  getDailyQuestCityForDate(date: string): Promise<DailyQuestCity | undefined>;
  getUnusedDailyQuestCity(): Promise<DailyQuestCity | undefined>;
  markCityAsUsed(cityId: string, date: string): Promise<DailyQuestCity | undefined>;
  seedDailyQuestCities(cities: InsertDailyQuestCity[]): Promise<number>;
  updateDailyQuestCity(cityId: string, data: Partial<InsertDailyQuestCity>): Promise<DailyQuestCity | undefined>;
  
  // City Stickers
  createCitySticker(sticker: InsertCitySticker): Promise<CitySticker>;
  getCityStickerByCityId(cityId: string): Promise<CitySticker | undefined>;
  getCityStickerByCity(city: string, country: string): Promise<CitySticker | undefined>;
  getAllCityStickers(): Promise<CitySticker[]>;
  seedCityStickers(): Promise<number>;
  
  // User City Stickers
  grantSticker(data: InsertUserCitySticker): Promise<UserCitySticker>;
  getUserStickers(visitorId: string, playerId?: string | null): Promise<(UserCitySticker & { sticker: CitySticker })[]>;
  markStickersAsTraded(stickerIds: string[]): Promise<number>;
  getUntradedStickerCount(visitorId: string, playerId?: string | null): Promise<number>;
  
  // User Rewards
  grantReward(data: InsertUserReward): Promise<UserReward>;
  getUserRewards(visitorId: string, playerId?: string | null): Promise<UserReward[]>;
  getColoringSheetCount(visitorId: string, playerId?: string | null): Promise<number>;
  
  // Sticker Stats for ranks
  getStickerStats(visitorId: string, playerId?: string | null): Promise<{
    totalStickers: number;
    untradedStickers: number;
    completedPages: number;
    countryMaps: number;
    continentMaps: number;
    stickersByContinent: Record<string, number>;
  }>;
  
  // Mini-games
  getUserMiniGames(visitorId: string, playerId?: string | null): Promise<UserMiniGame[]>;
  unlockMiniGame(visitorId: string, gameId: string, stickersSpent: number, playerId?: string | null): Promise<UserMiniGame>;
  updateMiniGameProgress(visitorId: string, gameId: string, score: number, playerId?: string | null): Promise<UserMiniGame | undefined>;
  getMiniGameProgress(visitorId: string, gameId: string): Promise<UserMiniGame | undefined>;
  
  // Geo-Art Creations
  saveGeoArtCreation(creation: InsertGeoArtCreation): Promise<GeoArtCreation>;
  getUserGeoArtCreations(visitorId: string): Promise<GeoArtCreation[]>;
  hasCreatedFlagForCountry(visitorId: string, countryCode: string): Promise<boolean>;
  
  // Explorer Management (Multi-Profile)
  getActiveExplorers(userId: string): Promise<Player[]>;
  getArchivedExplorers(userId: string): Promise<Player[]>;
  getGuestExplorer(explorerId: string): Promise<Player | undefined>;
  createGuestExplorer(data: Partial<InsertPlayer>): Promise<Player>;
  convertGuestToUser(explorerId: string, userId: string): Promise<Player | undefined>;
  archiveExplorer(explorerId: string): Promise<Player | undefined>;
  restoreExplorer(explorerId: string): Promise<Player | undefined>;
  deleteExplorer(explorerId: string): Promise<boolean>;
  updateExplorerProfile(explorerId: string, data: Partial<InsertPlayer>): Promise<Player | undefined>;
  getExplorerCount(userId: string): Promise<number>;
  
  // Stripe subscription
  updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; subscriptionTier?: string }): Promise<User | undefined>;
  
  // Trial management
  startUserTrial(userId: string, trialStartDate: Date, trialEndDate: Date): Promise<User | undefined>;
  
  // Free adventure tracking for Founding Families
  claimFreeAdventure(userId: string, tripId: string): Promise<User | undefined>;
  hasUsedFreeAdventure(userId: string): Promise<boolean>;
  
  // Add game rewards to a player (for migrating guest rewards)
  addGameRewardsToPlayer(playerId: string, rewards: { stars: number; cardIds: string[]; gamesPlayed: number }): Promise<Player | undefined>;
  
  // Pro Waitlist
  addToWaitlist(data: { email: string; visitorId?: string | null; playerId?: string | null; userId?: string | null; source?: string }): Promise<any>;
  getWaitlistByEmail(email: string): Promise<any | undefined>;
  
  // Reward Tiers
  getAllRewardTiers(): Promise<RewardTier[]>;
  getRewardTierById(tierId: string): Promise<RewardTier | undefined>;
  seedRewardTiers(): Promise<number>;
  
  // Reward Unlocks
  createRewardUnlock(data: InsertRewardUnlock): Promise<RewardUnlock>;
  getExplorerRewardUnlocks(explorerId: string): Promise<(RewardUnlock & { tier: RewardTier })[]>;
  getRewardUnlockById(unlockId: string): Promise<(RewardUnlock & { tier: RewardTier }) | undefined>;
  hasUnlockedTier(explorerId: string, tierId: string): Promise<boolean>;
  claimReward(unlockId: string, parentEmail: string, shippingAddress?: string): Promise<RewardUnlock | undefined>;
  fulfillReward(unlockId: string): Promise<RewardUnlock | undefined>;
  
  // Reward Evaluation
  evaluateRewardsForExplorer(explorerId: string): Promise<RewardUnlock[]>;
  
  // ============================================================================
  // TRAVEL MODE (Isolated from World Mode)
  // ============================================================================
  
  // Trips
  createTrip(trip: InsertTravelTrip): Promise<TravelTrip>;
  getTripsByUserId(userId: string): Promise<TravelTrip[]>;
  getStopSummariesForTrips(tripIds: string[]): Promise<Map<string, { stops: TravelStop[]; totalStops: number; visitedStops: number }>>;
  getTripCountsByUserId(userId: string): Promise<{ travel: number; home: number; total: number }>;
  getLifetimeTripCounts(userId: string): Promise<{ travel: number; home: number }>;
  incrementLifetimeTripCount(userId: string, context: 'travel' | 'home'): Promise<void>;
  hasDuplicateCityTrip(userId: string, country: string, city: string | null | undefined, adventureContext: 'travel' | 'home'): Promise<boolean>;
  findDuplicateCityTrip(userId: string, country: string, city: string | null | undefined, adventureContext: 'travel' | 'home'): Promise<TravelTrip | null>;
  getTripById(tripId: string): Promise<TravelTrip | undefined>;
  getTripWithDetails(tripId: string): Promise<{ trip: TravelTrip; stops: TravelStop[]; moments: TravelMoment[]; memoryStarsData: MemoryStars[]; journeyPacks: JourneyPack[] } | null>;
  updateTrip(tripId: string, updates: Partial<InsertTravelTrip>): Promise<TravelTrip | undefined>;
  deleteTrip(tripId: string): Promise<boolean>;
  
  // Stops
  createStop(stop: InsertTravelStop): Promise<TravelStop>;
  getStopsByTripId(tripId: string): Promise<TravelStop[]>;
  getStopById(stopId: string): Promise<TravelStop | undefined>;
  updateStop(stopId: string, updates: Partial<InsertTravelStop>): Promise<TravelStop | undefined>;
  deleteStop(stopId: string): Promise<boolean>;
  markStopVisited(stopId: string, mode?: "completed" | "skipped"): Promise<TravelStop | undefined>;
  reorderStops(tripId: string, stopOrders: { stopId: string; displayOrder: number; cityGroup?: string | null; dayIndex?: number | null }[]): Promise<TravelStop[]>;
  
  // Journey Packs
  createJourneyPack(pack: InsertJourneyPack): Promise<JourneyPack>;
  getJourneyPackByStopId(stopId: string): Promise<JourneyPack | undefined>;
  getJourneyPackByStopName(stopName: string): Promise<JourneyPack | undefined>;
  getJourneyPacksByStopIds(stopIds: string[]): Promise<JourneyPack[]>;
  updateJourneyPack(packId: string, updates: Partial<InsertJourneyPack>): Promise<JourneyPack | undefined>;
  unlockJourneyGames(packId: string): Promise<JourneyPack | undefined>;
  
  // Moments
  createMoment(moment: InsertTravelMoment): Promise<TravelMoment>;
  getMomentsByTripId(tripId: string): Promise<TravelMoment[]>;
  getMomentsByTripIds(tripIds: string[]): Promise<TravelMoment[]>;
  getMomentSummariesByTripIds(tripIds: string[]): Promise<{tripId: string; isFavorite: boolean | null; photoUrl: string | null; photoUrls: unknown}[]>;
  getFirstPhotoByTripId(tripId: string): Promise<string | null>;
  getFirstPhotoPerTrip(tripIds: string[]): Promise<Map<string, string | null>>;
  getMomentsByStopId(stopId: string): Promise<TravelMoment[]>;
  getMomentById(momentId: string): Promise<TravelMoment | undefined>;
  updateMoment(momentId: string, updates: Partial<InsertTravelMoment>): Promise<TravelMoment | undefined>;
  deleteMoment(momentId: string): Promise<boolean>;
  
  // Memory Stars
  getMemoryStarsByTripId(tripId: string): Promise<MemoryStars[]>;
  updateMemoryStars(tripId: string, stopId: string | null, stars: number): Promise<MemoryStars>;
  
  // Remember This Cards
  createRememberThisCard(card: InsertRememberThisCard): Promise<RememberThisCard>;
  getPendingRememberThisCards(userId: string): Promise<RememberThisCard[]>;
  answerRememberThisCard(cardId: string, explorerId: string, quality: string): Promise<RememberThisCard | undefined>;
  
  // Wonder Responses
  createWonderResponse(data: InsertWonderResponse): Promise<WonderResponse>;
  getWonderResponsesByTripId(tripId: string): Promise<WonderResponse[]>;
  getWonderResponsesByStopId(stopId: string): Promise<WonderResponse[]>;
  
  // Trail Tales - "Who Am I" riddle game
  createTrailTalesRiddle(riddle: InsertTrailTalesRiddle): Promise<TrailTalesRiddle>;
  getRiddlesByTripId(tripId: string): Promise<TrailTalesRiddle[]>;
  getRiddleById(riddleId: string): Promise<TrailTalesRiddle | undefined>;
  getUnlockedRiddles(tripId: string): Promise<TrailTalesRiddle[]>;
  unlockRiddlesForTrip(tripId: string, visitedStopCount: number): Promise<TrailTalesRiddle[]>;
  unlockAllRiddlesForTrip(tripId: string): Promise<void>;
  createTrailTalesAttempt(attempt: InsertTrailTalesAttempt): Promise<TrailTalesAttempt>;
  getAttemptsByExplorer(tripId: string, explorerId: string): Promise<TrailTalesAttempt[]>;
  getOrCreateTrailTalesProgress(tripId: string, explorerId: string): Promise<TrailTalesProgress>;
  updateTrailTalesProgress(tripId: string, explorerId: string, updates: Partial<InsertTrailTalesProgress>): Promise<TrailTalesProgress | undefined>;
  
  // Journey Pack Progress - Persists completed sections (Listen, Wonder, Parent Tips, Games)
  getJourneyPackProgress(stopId: string, explorerId: string): Promise<JourneyPackProgress | undefined>;
  saveJourneyPackProgress(data: InsertJourneyPackProgress): Promise<JourneyPackProgress>;
  getAllJourneyPackProgressByTrip(tripId: string, explorerId: string): Promise<JourneyPackProgress[]>;
  
  // Trip Stories (Family Lore)
  createTripStory(data: InsertTripStory): Promise<TripStory>;
  getTripStoryByTripId(tripId: string): Promise<TripStory | undefined>;
  updateTripStory(storyId: string, updates: Partial<InsertTripStory>): Promise<TripStory | undefined>;
  getUserTripJournalEntries(userId: string): Promise<Array<{
    storyId: string; tripId: string; title: string; storySummary: string | null;
    photoUrls: string[]; highlights: string[]; generatedAt: Date | null;
    destination: string; name: string; memoryAnchor: string | null;
    travelMonth: number | null; travelYear: number | null;
    travelers: { explorerId?: string; name?: string; avatarKey?: string }[];
  }>>;
  getTripReplayData(tripId: string): Promise<Array<{
    stopId: string; name: string; stopType: string; displayOrder: number;
    isVisited: boolean; storyTitle: string | null; storyContent: string | null;
    momentSummary: string | null; photos: string[];
  }>>;
  
  // Trip Anchors
  getAnchorsByTripId(tripId: string): Promise<TripAnchor[]>;
  createAnchor(data: InsertTripAnchor): Promise<TripAnchor>;
  updateAnchor(anchorId: string, updates: Partial<Pick<InsertTripAnchor, 'day' | 'time' | 'durationMinutes' | 'notes' | 'flexibility'>>): Promise<TripAnchor>;
  deleteAnchor(anchorId: string): Promise<void>;

  // Trip Completion
  completeTrip(tripId: string): Promise<TravelTrip | undefined>;
  calculateTripEngagement(tripId: string): Promise<{ score: number; memoryStrength: string }>;
  autoCompleteOldTrips(): Promise<number>;
  
  // Artifacts
  getArtifactsByStopName(stopName: string): Promise<TravelArtifact[]>;
  getAllArtifacts(): Promise<TravelArtifact[]>;
  seedArtifacts(): Promise<number>;
  createArtifact(data: InsertTravelArtifact): Promise<TravelArtifact>;
  collectArtifact(data: InsertExplorerCollectedArtifact): Promise<ExplorerCollectedArtifact>;
  getCollectedArtifactsByExplorer(explorerId: string): Promise<(ExplorerCollectedArtifact & { artifact: TravelArtifact })[]>;
  getCollectedArtifactsByTrip(tripId: string, explorerId: string): Promise<(ExplorerCollectedArtifact & { artifact: TravelArtifact })[]>;
  hasCollectedArtifact(explorerId: string, artifactId: string): Promise<boolean>;
  
  // Location Story Cache
  getCachedStory(locationName: string, locationType: string, destination: string, ageRange?: string): Promise<LocationStoryCache | undefined>;
  cacheStory(data: InsertLocationStoryCache): Promise<LocationStoryCache>;
  
  // Explorer Identity Traits
  getExplorerIdentityTraits(explorerId: string): Promise<ExplorerIdentityTraits | undefined>;
  createExplorerIdentityTraits(explorerId: string): Promise<ExplorerIdentityTraits>;
  incrementIdentityTrait(explorerId: string, trait: IncrementTrait['trait'], amount?: number): Promise<ExplorerIdentityTraits>;
  updateIdentityStatement(explorerId: string, statement: string, dominantTrait: string): Promise<ExplorerIdentityTraits | undefined>;
  
  // ============================================================================
  // GEORELIC PUZZLE SYSTEM
  // ============================================================================
  
  // Puzzles
  createPuzzle(puzzle: InsertGeoRelicPuzzle): Promise<GeoRelicPuzzle>;
  getPuzzleById(puzzleId: string): Promise<GeoRelicPuzzle | undefined>;
  getPuzzlesByContinent(continent: string): Promise<GeoRelicPuzzle[]>;
  getPuzzleByStopId(stopId: string): Promise<GeoRelicPuzzle | undefined>;
  getWorldModePuzzles(): Promise<GeoRelicPuzzle[]>;
  getTravelModePuzzles(tripId: string): Promise<GeoRelicPuzzle[]>;
  
  // Puzzle Pieces
  createPuzzlePiece(piece: InsertGeoRelicPuzzlePiece): Promise<GeoRelicPuzzlePiece>;
  getPuzzlePieces(puzzleId: string): Promise<GeoRelicPuzzlePiece[]>;
  
  // Player Progress
  getPlayerPuzzleProgress(explorerId: string, puzzleId: string): Promise<PlayerPuzzleProgress | undefined>;
  getExplorerCompletedPuzzles(explorerId: string): Promise<PlayerPuzzleProgress[]>;
  getExplorerContinentProgress(explorerId: string, continent: string): Promise<{ completed: number; total: number }>;
  savePuzzleProgress(data: InsertPlayerPuzzleProgress): Promise<PlayerPuzzleProgress>;
  completePuzzle(explorerId: string, puzzleId: string): Promise<PlayerPuzzleProgress>;
  
  // Travel Keepsakes
  createKeepsake(keepsake: InsertTravelKeepsake): Promise<TravelKeepsake>;
  getKeepsakeByPuzzleId(puzzleId: string): Promise<TravelKeepsake | undefined>;
  getKeepsakesByStopId(stopId: string): Promise<TravelKeepsake[]>;
  collectKeepsake(data: InsertExplorerCollectedKeepsake): Promise<ExplorerCollectedKeepsake>;
  
  // Seeding
  seedPuzzles(): Promise<number>;
  getExplorerKeepsakes(explorerId: string): Promise<(ExplorerCollectedKeepsake & { keepsake: TravelKeepsake })[]>;
  getExplorerKeepsakesByTrip(explorerId: string, tripId: string): Promise<(ExplorerCollectedKeepsake & { keepsake: TravelKeepsake })[]>;
  hasCollectedKeepsake(explorerId: string, keepsakeId: string): Promise<boolean>;
  
  // ============================================================================
  // MAP PUZZLE SYSTEM - Geography-based puzzles
  // ============================================================================
  
  getAllMapPuzzles(): Promise<MapPuzzle[]>;
  getMapPuzzleById(puzzleId: string): Promise<MapPuzzle | undefined>;
  getMapPuzzleWithRegions(puzzleId: string): Promise<IMapPuzzleWithRegions | undefined>;
  getMapPuzzleRegions(puzzleId: string): Promise<MapPuzzleRegion[]>;
  createMapPuzzle(puzzle: InsertMapPuzzle): Promise<MapPuzzle>;
  createMapPuzzleRegion(region: InsertMapPuzzleRegion): Promise<MapPuzzleRegion>;
  getPlayerMapPuzzleProgress(explorerId: string, puzzleId: string): Promise<PlayerMapPuzzleProgress | undefined>;
  savePlayerMapPuzzleProgress(explorerId: string, puzzleId: string, placedRegionIds: string[]): Promise<PlayerMapPuzzleProgress>;
  completeMapPuzzle(explorerId: string, puzzleId: string, starsAwarded: number): Promise<PlayerMapPuzzleProgress>;
  seedMapPuzzles(): Promise<number>;
  
  // ============================================================================
  // ITINERARY SHARING SYSTEM
  // ============================================================================
  
  createItineraryShare(share: InsertItineraryShare, stops: InsertItineraryShareStop[]): Promise<ItineraryShare>;
  updateItineraryShare(shareId: string, updates: Partial<InsertItineraryShare>, newStops?: InsertItineraryShareStop[]): Promise<ItineraryShare>;
  getItineraryShareBySlug(slug: string): Promise<(ItineraryShare & { stops: ItineraryShareStop[] }) | undefined>;
  getItineraryShareById(shareId: string): Promise<ItineraryShare | undefined>;
  getItineraryShareByTripId(tripId: string): Promise<ItineraryShare | undefined>;
  getItinerarySharesByDestination(destination: string): Promise<ItineraryShare[]>;
  getPublicItineraryShares(limit?: number): Promise<ItineraryShare[]>;
  unpublishItineraryShare(shareId: string): Promise<ItineraryShare | undefined>;
  deleteItineraryShare(shareId: string): Promise<boolean>;
  
  // Bookmarks
  getUserBookmarks(userId: string): Promise<{ shareId: string; createdAt: Date | null }[]>;
  addBookmark(userId: string, shareId: string): Promise<{ id: string; shareId: string; userId: string }>;
  removeBookmark(userId: string, shareId: string): Promise<void>;
  incrementShareViews(shareId: string): Promise<void>;
  toggleUpvote(shareId: string, visitorId: string): Promise<{ upvoted: boolean; totalUpvotes: number }>;
  hasUpvoted(shareId: string, visitorId: string): Promise<boolean>;
  copyFromSharedItinerary(shareId: string, userId: string, options?: { travelers?: { name: string; explorerId?: string }[]; travelMonth?: number; travelYear?: number }): Promise<TravelTrip>;
  
  // Comments
  getShareComments(shareId: string): Promise<ItineraryComment[]>;
  addComment(shareId: string, userId: string, authorName: string, content: string): Promise<ItineraryComment>;
  updateComment(commentId: string, userId: string, content: string): Promise<ItineraryComment | undefined>;
  deleteComment(commentId: string, userId: string): Promise<boolean>;
  
  // ============================================================================
  // TRAVEL TROPHY CABINET - Gamification badges
  // ============================================================================
  
  getExplorerTravelBadges(explorerId: string): Promise<ExplorerTravelBadge[]>;
  getExplorerBadgeStats(explorerId: string, userId: string): Promise<{
    totalTrips: number;
    totalStopsVisited: number;
    totalKeepsakes: number;
    beachStopsVisited: number;
    natureStopsVisited: number;
    cityStopsVisited: number;
    wildlifeStopsVisited: number;
    trailTalesCompleted: number;
  }>;
  updateExplorerBadgeProgress(explorerId: string, categoryId: string, progress: number, tier: string | null): Promise<ExplorerTravelBadge>;
  
  // ============================================================================
  // EXPERIENCE [CITY] MODULE - Sensory content for destinations
  // ============================================================================
  
  getExperienceContent(destinationName: string): Promise<ExperienceContent | undefined>;
  createExperienceContent(content: InsertExperienceContent): Promise<ExperienceContent>;
  updateExperienceContent(destinationName: string, content: Partial<InsertExperienceContent>): Promise<ExperienceContent | undefined>;
  getExperienceProgress(explorerId: string, destinationName: string): Promise<ExperienceProgress | undefined>;
  saveExperienceProgress(data: InsertExperienceProgress): Promise<ExperienceProgress>;
  updateExperienceProgress(explorerId: string, destinationName: string, updates: Partial<InsertExperienceProgress>): Promise<ExperienceProgress | undefined>;
  seedExperienceContent(): Promise<number>;
  
  // ============================================================================
  // PENDING TRANSFERS - Guest player progress transfer on registration
  // ============================================================================
  
  createPendingTransfer(data: InsertPendingTransfer): Promise<PendingTransfer>;
  getPendingTransfersByEmail(email: string): Promise<PendingTransfer[]>;
  claimPendingTransfer(transferId: string, claimedByUserId: string): Promise<PendingTransfer | undefined>;
  markTransferInvitationSent(transferId: string): Promise<PendingTransfer | undefined>;
  
  // ============================================================================
  // FOUNDING FAMILIES PROGRAM
  // ============================================================================
  
  getFoundingFamilyCount(): Promise<number>;
  getNextFoundingFamilyNumber(): Promise<number | null>;
  enrollFoundingFamily(userId: string, freeCityId?: string): Promise<User | undefined>;
  getFoundingFamilies(): Promise<User[]>;
  
  // ============================================================================
  // PUSH NOTIFICATIONS
  // ============================================================================
  
  createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  updatePushSubscription(subscriptionId: string, updates: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined>;
  deletePushSubscription(subscriptionId: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;
  getActiveSubscriptionsForDailyReminders(): Promise<PushSubscription[]>;
  getActiveSubscriptionsForStreakProtection(): Promise<(PushSubscription & { player: Player })[]>;
  getAllWeeklyPushSubscriptions(): Promise<PushSubscription[]>;
  getActiveMonthlySubscriptions(): Promise<PushSubscription[]>;
  
  // ============================================================================
  // PHYSICAL CARD GAME EARLY ACCESS
  // ============================================================================
  
  getPhysicalGameEligibility(userId: string): Promise<{
    isEligible: boolean;
    hasJoined: boolean;
    impressionCount: number;
    lastDismissedDate: Date | null;
    totalGamesPlayed: number;
    guessAndGoWins: number;
  }>;
  recordPhysicalGamePopupImpression(userId: string): Promise<void>;
  joinPhysicalGameEarlyAccess(userId: string, name: string, email: string): Promise<{ user: User | undefined; waitlistNumber: number }>;
  dismissPhysicalGamePopup(userId: string): Promise<void>;
  getUsersForPhysicalGameEmail(): Promise<User[]>;
  markPhysicalGameEmailSent(userId: string): Promise<void>;
  getPhysicalGameWaitlistCount(): Promise<number>;

  getCityAdventureTemplate(cityName: string, country: string): Promise<CityAdventureTemplate | undefined>;
  getCityAdventureTemplateBySlug(slug: string): Promise<CityAdventureTemplate | undefined>;
  upsertCityAdventureTemplate(data: InsertCityAdventureTemplate): Promise<CityAdventureTemplate>;
  getAllCityAdventureTemplates(): Promise<CityAdventureTemplate[]>;
  deleteCityAdventureTemplate(slug: string): Promise<boolean>;

  // ============================================================================
  // COMPASS QUEST CHALLENGE SYSTEM
  // ============================================================================

  upsertCompassQuest(data: InsertCompassQuest): Promise<CompassQuest>;
  getCompassQuestByKey(questKey: string): Promise<CompassQuest | undefined>;
  createCompassAttempt(data: InsertCompassAttempt): Promise<CompassAttempt>;
  completeCompassAttempt(attemptId: string, xp: number, timeMs: number, wrongGuesses: number, accuracy: number): Promise<CompassAttempt | undefined>;
  getCompassAttemptById(attemptId: string): Promise<CompassAttempt | undefined>;
  createCompassChallenge(data: InsertCompassChallenge): Promise<CompassChallenge>;
  getCompassChallengeByCode(shareCode: string): Promise<(CompassChallenge & { quest: CompassQuest; creatorAttempt: CompassAttempt }) | undefined>;
  compareCompassAttempts(shareCode: string, challengerAttemptId: string): Promise<{
    creator: CompassAttempt;
    challenger: CompassAttempt;
    quest: CompassQuest;
    winner: 'creator' | 'challenger' | 'draw';
  } | undefined>;

  // ============================================================================
  // CITY STOP POOL CACHE
  // ============================================================================

  getCityStopPool(city: string, country: string): Promise<CityStopPoolCache | undefined>;
  saveCityStopPool(entry: InsertCityStopPoolCache): Promise<CityStopPoolCache>;

  // ============================================================================
  // TRIP UNLOCKS — per-trip one-time payments
  // ============================================================================
  createTripUnlock(unlock: InsertTripUnlock): Promise<TripUnlock>;
  getTripUnlock(userId: string, tripId: string): Promise<TripUnlock | undefined>;
  getTripUnlockBySessionId(sessionId: string): Promise<TripUnlock | undefined>;
  activateTripUnlock(sessionId: string): Promise<void>;
  getUserTripUnlocks(userId: string): Promise<TripUnlock[]>;

  // ============================================================================
  // PROMO CODES
  // ============================================================================
  getPromoCode(code: string): Promise<PromoCode | undefined>;
  getPromoCodeById(id: string): Promise<PromoCode | undefined>;
  listPromoCodes(): Promise<PromoCode[]>;
  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: string, data: Partial<InsertPromoCode>): Promise<PromoCode>;
  incrementPromoCodeUsage(codeId: string): Promise<void>;

  // ============================================================================
  // PROMO REDEMPTIONS
  // ============================================================================
  getPromoRedemption(codeId: string, userId: string): Promise<PromoRedemption | undefined>;
  getPromoRedemptionByUnlockId(tripUnlockId: string): Promise<PromoRedemption | undefined>;
  listRedemptionsForCode(codeId: string): Promise<PromoRedemption[]>;
  createPromoRedemption(data: InsertPromoRedemption): Promise<PromoRedemption>;

  // ============================================================================
  // STORY EMAIL SCHEDULES — retention emails at 1-week and 1-month
  // ============================================================================
  scheduleStoryEmails(tripId: string, userId: string, emailAddress: string): Promise<void>;
  getPendingStoryEmails(): Promise<StoryEmailSchedule[]>;
  markStoryEmailSent(id: string): Promise<void>;

  // ============================================================================
  // STOP QUALITY SIGNALS — passive + active feedback tuning layer
  // ============================================================================
  createStopQualitySignal(data: InsertStopQualitySignal): Promise<StopQualitySignal>;
  getStopQualitySignalsByStop(stopId: string): Promise<StopQualitySignal[]>;
  getStopQualitySignalsByTrip(tripId: string): Promise<StopQualitySignal[]>;
  getStopQualitySignalsByUser(userId: string): Promise<Array<StopQualitySignal & { stopType: string | null; tripCity: string | null }>>;

  // ============================================================================
  // GUIDE SUBSCRIBERS — free guide email capture
  // ============================================================================
  saveGuideSubscriber(email: string, source?: string): Promise<{ isNew: boolean; subscriber: GuideSubscriber }>;
  markGuideSubscriberEmailSent(email: string): Promise<void>;
  scheduleGuideEmails(email: string): Promise<void>;
  getPendingGuideEmails(): Promise<GuideEmailSchedule[]>;
  markGuideEmailSent(id: number): Promise<void>;
  guideSubscriberHasConverted(email: string): Promise<boolean>;
  getAllGuideSubscribers(): Promise<GuideSubscriber[]>;
  cleanupOptedOutGuideEmails(): Promise<{ cleaned: number; subscribers: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by email (to handle OAuth returning different IDs)
    if (userData.email) {
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        // Update existing user by email
        const [updated] = await db
          .update(users)
          .set({
            firstName: userData.firstName || existingUser.firstName,
            lastName: userData.lastName || existingUser.lastName,
            profileImageUrl: userData.profileImageUrl || existingUser.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updated;
      }
    }
    
    // Try insert with conflict handling on ID
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createPlayer(playerData: InsertPlayer): Promise<Player> {
    const [player] = await db
      .insert(players)
      .values(playerData)
      .returning();
    return player;
  }

  async getPlayersByUserId(userId: string): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.userId, userId));
  }

  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async getPlayerById(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async awardXp(playerId: string, amount: number): Promise<{ totalXp: number; previousXp: number }> {
    const player = await this.getPlayerById(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    const previousXp = player.totalXp ?? 0;
    const newTotal = previousXp + amount;
    await db
      .update(players)
      .set({ totalXp: newTotal, updatedAt: new Date() })
      .where(eq(players.id, playerId));
    return { totalXp: newTotal, previousXp };
  }

  async getPlayerXp(playerId: string): Promise<number> {
    const player = await this.getPlayerById(playerId);
    return player?.totalXp ?? 0;
  }

  async updatePlayerStats(playerId: string, stats: UpdatePlayerStats): Promise<Player | undefined> {
    const [player] = await db
      .update(players)
      .set({
        ...stats,
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId))
      .returning();
    return player;
  }

  async addGameRewardsToPlayer(playerId: string, rewards: { stars: number; cardIds: string[]; gamesPlayed: number }): Promise<Player | undefined> {
    // First get the current player stats
    const existingPlayer = await this.getPlayerById(playerId);
    if (!existingPlayer) return undefined;
    
    // Merge the new rewards with existing stats
    const existingCards = (existingPlayer.collectedCardIds as string[]) || [];
    const combinedCards = existingCards.concat(rewards.cardIds);
    const newCardIds = Array.from(new Set(combinedCards)); // Deduplicate card IDs
    
    const [player] = await db
      .update(players)
      .set({
        starsEarnedTotal: (existingPlayer.starsEarnedTotal || 0) + rewards.stars,
        collectedCardIds: newCardIds,
        gamesPlayed: (existingPlayer.gamesPlayed || 0) + rewards.gamesPlayed,
        updatedAt: new Date(),
      })
      .where(eq(players.id, playerId))
      .returning();
    return player;
  }

  async updateEmailPreferences(email: string, preferences: Partial<EmailPreferences>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...preferences,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async getEmailPreferences(email: string): Promise<EmailPreferences | undefined> {
    const [user] = await db.select({
      emailSubscribed: users.emailSubscribed,
      weeklyProgressEmails: users.weeklyProgressEmails,
      dailyReminderEmails: users.dailyReminderEmails,
    }).from(users).where(eq(users.email, email));
    
    if (!user) return undefined;
    
    return {
      emailSubscribed: user.emailSubscribed ?? true,
      weeklyProgressEmails: user.weeklyProgressEmails ?? true,
      dailyReminderEmails: user.dailyReminderEmails ?? true,
    };
  }

  async recordGameEvent(event: InsertGameEvent): Promise<GameEvent> {
    const [gameEvent] = await db
      .insert(gameEvents)
      .values(event)
      .returning();
    return gameEvent;
  }

  async getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allEvents = await db
      .select()
      .from(gameEvents)
      .where(gte(gameEvents.createdAt, startDate));

    const totalGamesPlayed = allEvents.length;

    const modeCount: Record<string, number> = {};
    let totalStars = 0;
    let starsCount = 0;
    let totalTime = 0;
    let timeCount = 0;
    let completedCount = 0;

    for (const event of allEvents) {
      modeCount[event.gameMode] = (modeCount[event.gameMode] || 0) + 1;
      
      if (event.starsEarned !== null) {
        totalStars += event.starsEarned;
        starsCount++;
      }
      
      if (event.timeSpentSeconds !== null) {
        totalTime += event.timeSpentSeconds;
        timeCount++;
      }
      
      if (event.completed) {
        completedCount++;
      }
    }

    const gamesByMode = Object.entries(modeCount)
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count);

    const dailyMap: Record<string, number> = {};
    for (const event of allEvents) {
      if (event.createdAt) {
        const dateStr = event.createdAt.toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
      }
    }

    const dailyActivity = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalGamesPlayed,
      gamesByMode,
      completionRate: totalGamesPlayed > 0 ? (completedCount / totalGamesPlayed) * 100 : 0,
      averageStars: starsCount > 0 ? totalStars / starsCount : 0,
      averageTimeSeconds: timeCount > 0 ? totalTime / timeCount : 0,
      dailyActivity,
    };
  }

  async getRecentEvents(limit: number = 50): Promise<GameEvent[]> {
    return await db
      .select()
      .from(gameEvents)
      .orderBy(desc(gameEvents.createdAt))
      .limit(limit);
  }

  async setVerificationCode(email: string, code: string): Promise<User | undefined> {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    
    const [user] = await db
      .update(users)
      .set({
        verificationCode: code,
        verificationCodeExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    if (user.emailVerified) {
      return { success: true, message: "Email already verified" };
    }
    
    if (!user.verificationCode) {
      return { success: false, message: "No verification code found. Please request a new one." };
    }
    
    if (user.verificationCodeExpiry && new Date() > user.verificationCodeExpiry) {
      return { success: false, message: "Verification code has expired. Please request a new one." };
    }
    
    if (user.verificationCode !== code) {
      return { success: false, message: "Invalid verification code" };
    }
    
    await db
      .update(users)
      .set({
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
    
    return { success: true, message: "Email verified successfully" };
  }

  async isEmailVerified(email: string): Promise<boolean> {
    const [user] = await db.select({ emailVerified: users.emailVerified }).from(users).where(eq(users.email, email));
    return user?.emailVerified ?? false;
  }

  async setPasswordResetCode(email: string, code: string): Promise<User | undefined> {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    
    const [user] = await db
      .update(users)
      .set({
        passwordResetCode: code,
        passwordResetExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      return { success: false, message: "User not found" };
    }
    
    if (!user.passwordResetCode) {
      return { success: false, message: "No password reset code found. Please request a new one." };
    }
    
    if (user.passwordResetExpiry && new Date() > user.passwordResetExpiry) {
      return { success: false, message: "Password reset code has expired. Please request a new one." };
    }
    
    if (user.passwordResetCode !== code) {
      return { success: false, message: "Invalid password reset code" };
    }
    
    return { success: true, message: "Code verified successfully" };
  }

  async resetPassword(email: string, code: string, newPasswordHash: string): Promise<{ success: boolean; message: string }> {
    const verifyResult = await this.verifyPasswordResetCode(email, code);
    if (!verifyResult.success) {
      return verifyResult;
    }
    
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordResetCode: null,
        passwordResetExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
    
    return { success: true, message: "Password reset successfully" };
  }

  private emailChangeCodes: Map<string, { newEmail: string; code: string; expiry: Date }> = new Map();

  async updateUserName(userId: string, name: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        firstName: name,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateOnboardingStatus(userId: string, key: string, value: boolean): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const currentOnboarding = (user.onboardingCompleted as Record<string, boolean>) || {};
    const updatedOnboarding = { ...currentOnboarding, [key]: value };
    
    const [updatedUser] = await db
      .update(users)
      .set({
        onboardingCompleted: updatedOnboarding,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async setEmailChangeCode(userId: string, newEmail: string, code: string): Promise<void> {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    this.emailChangeCodes.set(userId, { newEmail, code, expiry });
  }

  async verifyEmailChange(userId: string, newEmail: string, code: string): Promise<{ success: boolean; message: string }> {
    const stored = this.emailChangeCodes.get(userId);
    
    if (!stored) {
      return { success: false, message: "No email change request found. Please request a new code." };
    }
    
    if (new Date() > stored.expiry) {
      this.emailChangeCodes.delete(userId);
      return { success: false, message: "Verification code has expired. Please request a new one." };
    }
    
    if (stored.newEmail !== newEmail || stored.code !== code) {
      return { success: false, message: "Invalid verification code" };
    }
    
    await db
      .update(users)
      .set({
        email: newEmail,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    this.emailChangeCodes.delete(userId);
    return { success: true, message: "Email changed successfully" };
  }

  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [newSession] = await db
      .insert(userSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateUserSession(sessionId: string, updates: UpdateUserSession): Promise<UserSession | undefined> {
    const [session] = await db
      .update(userSessions)
      .set(updates)
      .where(eq(userSessions.id, sessionId))
      .returning();
    return session;
  }

  async getActiveSession(visitorId: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.visitorId, visitorId),
        eq(userSessions.isActive, true)
      ))
      .orderBy(desc(userSessions.sessionStart))
      .limit(1);
    return session;
  }

  async endSession(sessionId: string, totalTime: number, gameTime: number): Promise<UserSession | undefined> {
    const [session] = await db
      .update(userSessions)
      .set({
        sessionEnd: new Date(),
        totalTimeSeconds: totalTime,
        gameTimeSeconds: gameTime,
        isActive: false,
      })
      .where(eq(userSessions.id, sessionId))
      .returning();
    return session;
  }

  async getTimeSummary(days: number = 30): Promise<TimeSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allSessions = await db
      .select()
      .from(userSessions)
      .where(gte(userSessions.sessionStart, startDate));

    let totalAppTime = 0;
    let totalGameTime = 0;
    let totalGames = 0;

    const dailyMap: Record<string, { appTime: number; gameTime: number }> = {};

    for (const session of allSessions) {
      const appTime = session.totalTimeSeconds ?? 0;
      const gameTime = session.gameTimeSeconds ?? 0;
      
      totalAppTime += appTime;
      totalGameTime += gameTime;
      totalGames += session.gamesPlayed ?? 0;

      if (session.sessionStart) {
        const dateStr = session.sessionStart.toISOString().split('T')[0];
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { appTime: 0, gameTime: 0 };
        }
        dailyMap[dateStr].appTime += appTime;
        dailyMap[dateStr].gameTime += gameTime;
      }
    }

    const totalSessions = allSessions.length;
    const averageSessionMinutes = totalSessions > 0 ? (totalAppTime / totalSessions) / 60 : 0;
    const averageGamesPerSession = totalSessions > 0 ? totalGames / totalSessions : 0;

    const dailyTimeData = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, appTime: data.appTime, gameTime: data.gameTime }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalAppTimeSeconds: totalAppTime,
      totalGameTimeSeconds: totalGameTime,
      averageSessionMinutes,
      totalSessions,
      averageGamesPerSession,
      dailyTimeData,
    };
  }

  async isFirstVisitorSession(visitorId: string): Promise<boolean> {
    const existingSessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.visitorId, visitorId))
      .limit(2);
    return existingSessions.length <= 1;
  }

  // Parent Weekly Snapshot email methods
  async getUsersForWeeklyEmails(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.weeklyProgressEmails, true),
        eq(users.emailSubscribed, true),
        isNotNull(users.email),
        eq(users.emailVerified, true)
      ));
  }

  async getExplorerWeeklyStats(playerId: string, startDate: Date, endDate: Date): Promise<{
    citiesEarned: string[];
    gamesPlayed: number;
    streak: number;
    completedGeoAdventures: { name: string; destination: string }[];
  }> {
    const player = await this.getPlayerById(playerId);
    if (!player) {
      return { citiesEarned: [], gamesPlayed: 0, streak: 0, completedGeoAdventures: [] };
    }

    const stickers = await db
      .select({
        cityName: cityStickers.city,
        country: cityStickers.country,
        earnedAt: userCityStickers.earnedAt,
      })
      .from(userCityStickers)
      .innerJoin(cityStickers, eq(userCityStickers.stickerId, cityStickers.id))
      .where(and(
        eq(userCityStickers.playerId, playerId),
        gte(userCityStickers.earnedAt, startDate),
        sql`${userCityStickers.earnedAt} < ${endDate}`
      ));

    const citiesEarned = stickers.map(s => s.cityName);

    const gamesResult = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(gameEvents)
      .where(and(
        eq(gameEvents.playerId, playerId),
        sql`${gameEvents.eventType} = 'game_complete'`,
        gte(gameEvents.createdAt, startDate),
        sql`${gameEvents.createdAt} < ${endDate}`
      ));

    const gamesPlayed = Number(gamesResult[0]?.count) || 0;

    let completedGeoAdventures: { name: string; destination: string }[] = [];
    
    if (player.userId) {
      const trips = await db
        .select({
          name: travelTrips.name,
          destination: travelTrips.destination,
        })
        .from(travelTrips)
        .where(and(
          eq(travelTrips.userId, player.userId),
          eq(travelTrips.status, 'completed'),
          isNotNull(travelTrips.completedAt),
          gte(travelTrips.completedAt, startDate),
          sql`${travelTrips.completedAt} < ${endDate}`
        ));

      completedGeoAdventures = trips.map(t => ({
        name: t.name,
        destination: t.destination || '',
      }));
    }

    return {
      citiesEarned,
      gamesPlayed,
      streak: player.dailyQuestStreak || 0,
      completedGeoAdventures,
    };
  }

  // PWA Install tracking methods
  async recordPwaInstall(data: InsertPwaInstall): Promise<PwaInstall> {
    const [install] = await db
      .insert(pwaInstalls)
      .values(data)
      .returning();
    return install;
  }

  async markPwaReturn(visitorId: string): Promise<PwaInstall | undefined> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [install] = await db
      .update(pwaInstalls)
      .set({
        returnedWithin7Days: true,
        firstReturnAt: new Date(),
      })
      .where(and(
        eq(pwaInstalls.visitorId, visitorId),
        eq(pwaInstalls.returnedWithin7Days, false),
        gte(pwaInstalls.installedAt, sevenDaysAgo)
      ))
      .returning();
    return install;
  }

  async getPwaInstallStats(startDate: Date, endDate: Date): Promise<{ installs: number; returnRate: number }> {
    const installs = await db
      .select()
      .from(pwaInstalls)
      .where(and(
        gte(pwaInstalls.installedAt, startDate),
        sql`${pwaInstalls.installedAt} < ${endDate}`
      ));
    
    const totalInstalls = installs.length;
    const returnedCount = installs.filter(i => i.returnedWithin7Days).length;
    const returnRate = totalInstalls > 0 ? (returnedCount / totalInstalls) * 100 : 0;
    
    return { installs: totalInstalls, returnRate };
  }

  // Unified game session recording (streak + per-game stats)
  // clientLocalDate: Optional YYYY-MM-DD string from client's local timezone for accurate streak calculation
  async recordGameSession(
    playerId: string, 
    gameType: 'guess_and_go' | 'daily_quest' | 'crossworld', 
    won: boolean, 
    timeMs?: number,
    clientLocalDate?: string
  ): Promise<{
    player: Player;
    gameStats: PlayerGameStats;
    streakResult: {
      newStreak: number;
      dailyQuestStreak: number;
      graceUsed: boolean;
      streakReset: boolean;
      previousStreak: number;
      streakFreezes: number;
    };
  }> {
    const player = await this.getPlayerById(playerId);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }

    // Use client's local date if provided, otherwise fall back to server UTC date
    // This ensures streak calculations are consistent with user's local timezone
    let today: string;
    if (clientLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)) {
      today = clientLocalDate;
      console.log(`[Streak] Using client local date: ${today}`);
    } else {
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      today = todayUTC.toISOString().split('T')[0];
      console.log(`[Streak] Using server UTC date (no client date provided): ${today}`);
    }
    
    // Parse today's date for comparisons
    const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
    const todayUTC = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay));
    
    const previousStreak = player.explorerStreak || 0;
    const lastPlayDate = player.lastExplorerStreakDate;
    let graceAvailable = player.streakGraceAvailable !== false;
    
    // Calculate day difference using UTC dates
    let dayDiff = 0;
    if (lastPlayDate) {
      // Parse last play date - handle both "YYYY-MM-DD" and "Day Mon DD YYYY" formats
      let lastDateUTC: Date;
      if (lastPlayDate.includes('-')) {
        // ISO format: YYYY-MM-DD
        const [year, month, day] = lastPlayDate.split('-').map(Number);
        lastDateUTC = new Date(Date.UTC(year, month - 1, day));
      } else {
        // Date string format: parse and convert to UTC
        const parsed = new Date(lastPlayDate);
        lastDateUTC = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
      }
      
      // Calculate difference in days
      const diffMs = todayUTC.getTime() - lastDateUTC.getTime();
      dayDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    let newStreak = previousStreak;
    let graceUsed = false;
    let streakReset = false;

    if (!lastPlayDate) {
      // First time playing any game
      newStreak = 1;
    } else if (dayDiff === 0) {
      // Same day - keep streak, no change
      newStreak = Math.max(previousStreak, 1);
    } else if (dayDiff === 1) {
      // Consecutive day (yesterday) - increment streak, restore grace
      newStreak = previousStreak + 1;
      graceAvailable = true; // Playing consecutively restores grace
    } else if (dayDiff === 2 && graceAvailable) {
      // Missed 1 day (2 days ago) but grace available - use grace, increment streak
      newStreak = previousStreak + 1;
      graceUsed = true;
      graceAvailable = false;
    } else {
      // Missed 2+ days OR dayDiff === 2 but no grace - reset streak
      newStreak = 1;
      streakReset = previousStreak > 0;
      graceAvailable = true; // Reset grace on new streak
    }

    // Calculate Daily Quest specific streak (same logic as unified streak but stored separately)
    let dailyQuestStreak = player.dailyQuestStreak || 0;
    let dailyQuestMaxStreak = player.dailyQuestMaxStreak || 0;
    let streakFreezes = player.streakFreezes || 0;
    
    if (gameType === 'daily_quest') {
      const lastDQDate = player.lastDailyQuestDate;
      let dqDayDiff = 0;
      
      if (lastDQDate) {
        let lastDQDateUTC: Date;
        if (lastDQDate.includes('-')) {
          const [year, month, day] = lastDQDate.split('-').map(Number);
          lastDQDateUTC = new Date(Date.UTC(year, month - 1, day));
        } else {
          const parsed = new Date(lastDQDate);
          lastDQDateUTC = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
        }
        const diffMs = todayUTC.getTime() - lastDQDateUTC.getTime();
        dqDayDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
      
      const missedDays = Math.max(0, dqDayDiff - 1);
      
      if (!lastDQDate) {
        dailyQuestStreak = 1;
        console.log(`[Streak Server] First time playing daily quest, streak = 1`);
      } else if (dqDayDiff === 0) {
        dailyQuestStreak = Math.max(dailyQuestStreak, 1);
        console.log(`[Streak Server] Same day, keeping streak: ${dailyQuestStreak}`);
      } else if (dqDayDiff === 1) {
        dailyQuestStreak = dailyQuestStreak + 1;
        console.log(`[Streak Server] Played yesterday, incrementing streak to: ${dailyQuestStreak}`);
      } else if (missedDays <= streakFreezes && missedDays > 0) {
        // Use streak freezes to cover missed days
        streakFreezes -= missedDays;
        dailyQuestStreak = dailyQuestStreak + 1;
        console.log(`[Streak Server] Used ${missedDays} freeze(s), streak: ${dailyQuestStreak}, remaining freezes: ${streakFreezes}`);
      } else if (missedDays > 0 && streakFreezes > 0) {
        // Partial coverage - use all available freezes but still reset
        console.log(`[Streak Server] Used all ${streakFreezes} freezes but needed ${missedDays} - resetting streak`);
        streakFreezes = 0;
        dailyQuestStreak = 1;
      } else {
        // Missed days - reset streak
        dailyQuestStreak = 1;
        console.log(`[Streak Server] No freezes, missed ${missedDays} days, reset streak to 1`);
      }
      dailyQuestMaxStreak = Math.max(dailyQuestMaxStreak, dailyQuestStreak);
      
      // Replenish freezes when reaching 3+ day streak
      if (dailyQuestStreak >= 3 && streakFreezes < 2) {
        const previousFreezes = streakFreezes;
        streakFreezes = 2;
        console.log(`[Streak Server] Streak is ${dailyQuestStreak} - replenishing freezes from ${previousFreezes} to 2`);
      }
    }

    // When playing daily quest, the unified explorer streak should never be lower
    // than the daily quest streak (since daily quest IS an explorer activity).
    // The daily quest streak uses streak freezes which can keep it higher.
    if (gameType === 'daily_quest' && dailyQuestStreak > newStreak) {
      newStreak = dailyQuestStreak;
      console.log(`[Streak] Syncing explorer streak up to daily quest streak: ${newStreak}`);
    }

    const finalLongestExplorerStreak = Math.max(player.longestExplorerStreak || 0, newStreak);

    // Build update set based on game type
    const updateSet: any = {
      explorerStreak: newStreak,
      lastExplorerStreakDate: today,
      lastExplorerGameType: gameType,
      streakGraceAvailable: graceAvailable,
      streakGraceLastUsedDate: graceUsed ? today : player.streakGraceLastUsedDate,
      longestExplorerStreak: finalLongestExplorerStreak,
      updatedAt: new Date(),
    };
    
    // Add Daily Quest specific fields when recording daily_quest game
    if (gameType === 'daily_quest') {
      updateSet.dailyQuestStreak = dailyQuestStreak;
      updateSet.lastDailyQuestDate = today;
      updateSet.dailyQuestMaxStreak = dailyQuestMaxStreak;
      updateSet.streakFreezes = streakFreezes;
    }

    // Update player with new streak data
    const [updatedPlayer] = await db
      .update(players)
      .set(updateSet)
      .where(eq(players.id, playerId))
      .returning();

    // Update per-game stats
    const existingStats = await this.getPlayerGameStatsByType(playerId, gameType);
    
    const outcomeEntry = {
      won,
      date: today,
      timeMs: timeMs || undefined,
    };

    let gameStats: PlayerGameStats;

    if (existingStats) {
      // Update existing stats
      const recentOutcomes = (existingStats.recentOutcomes as any[]) || [];
      const updatedOutcomes = [...recentOutcomes, outcomeEntry].slice(-10); // Keep last 10
      
      const newBestTime = won && timeMs 
        ? (existingStats.bestTimeMs ? Math.min(existingStats.bestTimeMs, timeMs) : timeMs)
        : existingStats.bestTimeMs;

      const [updated] = await db
        .update(playerGameStats)
        .set({
          totalGames: (existingStats.totalGames || 0) + 1,
          wins: won ? (existingStats.wins || 0) + 1 : existingStats.wins,
          losses: !won ? (existingStats.losses || 0) + 1 : existingStats.losses,
          bestTimeMs: newBestTime,
          recentOutcomes: updatedOutcomes,
          updatedAt: new Date(),
        })
        .where(eq(playerGameStats.id, existingStats.id))
        .returning();
      gameStats = updated;
    } else {
      // Create new stats record
      const [created] = await db
        .insert(playerGameStats)
        .values({
          playerId,
          gameType,
          totalGames: 1,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1,
          bestTimeMs: won && timeMs ? timeMs : null,
          recentOutcomes: [outcomeEntry],
        })
        .returning();
      gameStats = created;
    }

    return {
      player: updatedPlayer,
      gameStats,
      streakResult: {
        newStreak,
        dailyQuestStreak: gameType === 'daily_quest' ? dailyQuestStreak : 0,
        graceUsed,
        streakReset,
        previousStreak,
        streakFreezes: gameType === 'daily_quest' ? streakFreezes : (player.streakFreezes || 0),
      },
    };
  }

  async getPlayerGameStats(playerId: string): Promise<PlayerGameStats[]> {
    return await db
      .select()
      .from(playerGameStats)
      .where(eq(playerGameStats.playerId, playerId));
  }

  async getPlayerGameStatsByType(playerId: string, gameType: string): Promise<PlayerGameStats | undefined> {
    const [stats] = await db
      .select()
      .from(playerGameStats)
      .where(and(
        eq(playerGameStats.playerId, playerId),
        eq(playerGameStats.gameType, gameType)
      ));
    return stats;
  }

  // Weekly analytics snapshot methods
  async createWeeklySnapshot(data: InsertAnalyticsWeeklySnapshot): Promise<AnalyticsWeeklySnapshot> {
    const [snapshot] = await db
      .insert(analyticsWeeklySnapshots)
      .values(data)
      .returning();
    return snapshot;
  }

  async getWeeklySnapshots(weeks: number): Promise<AnalyticsWeeklySnapshot[]> {
    return await db
      .select()
      .from(analyticsWeeklySnapshots)
      .orderBy(desc(analyticsWeeklySnapshots.weekStartDate))
      .limit(weeks);
  }

  async getLatestWeeklySnapshot(): Promise<AnalyticsWeeklySnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(analyticsWeeklySnapshots)
      .orderBy(desc(analyticsWeeklySnapshots.weekStartDate))
      .limit(1);
    return snapshot;
  }

  async getAnalyticsMetrics(startDate: Date, endDate: Date): Promise<{
    totalSessions: number;
    uniqueVisitors: number;
    firstSessionCompletionRate: number;
    avgTimeToFirstPlaySeconds: number;
    avgSessionLengthSeconds: number;
    mobilePercent: number;
    desktopPercent: number;
    gamesPerSession: number;
    game2StartPercent: number;
    game3StartPercent: number;
    shareClicks: number;
  }> {
    const sessions = await db
      .select()
      .from(userSessions)
      .where(and(
        gte(userSessions.sessionStart, startDate),
        sql`${userSessions.sessionStart} < ${endDate}`
      ));

    const totalSessions = sessions.length;
    const uniqueVisitors = new Set(sessions.map(s => s.visitorId)).size;

    // First session completion rate (sessions where first game was completed)
    const firstSessions = sessions.filter(s => s.isFirstSession);
    const completedFirstSessions = firstSessions.filter(s => s.firstGameCompletedAt);
    const firstSessionCompletionRate = firstSessions.length > 0 
      ? (completedFirstSessions.length / firstSessions.length) * 100 
      : 0;

    // Average time to first play
    const sessionsWithFirstPlay = sessions.filter(s => s.firstGameStartedAt && s.sessionStart);
    const avgTimeToFirstPlaySeconds = sessionsWithFirstPlay.length > 0
      ? sessionsWithFirstPlay.reduce((sum, s) => {
          const diff = (new Date(s.firstGameStartedAt!).getTime() - new Date(s.sessionStart!).getTime()) / 1000;
          return sum + diff;
        }, 0) / sessionsWithFirstPlay.length
      : 0;

    // Average session length
    const sessionsWithDuration = sessions.filter(s => s.totalTimeSeconds && s.totalTimeSeconds > 0);
    const avgSessionLengthSeconds = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.totalTimeSeconds || 0), 0) / sessionsWithDuration.length
      : 0;

    // Device type split - filter out null/undefined device types
    const sessionsWithDeviceType = sessions.filter(s => s.deviceType);
    const totalWithDeviceType = sessionsWithDeviceType.length;
    const mobileSessions = sessionsWithDeviceType.filter(s => s.deviceType === 'mobile' || s.deviceType === 'tablet').length;
    const desktopSessions = sessionsWithDeviceType.filter(s => s.deviceType === 'desktop').length;
    const mobilePercent = totalWithDeviceType > 0 ? (mobileSessions / totalWithDeviceType) * 100 : 0;
    const desktopPercent = totalWithDeviceType > 0 ? (desktopSessions / totalWithDeviceType) * 100 : 0;

    // Games per session
    const totalGames = sessions.reduce((sum, s) => sum + (s.gamesPlayed || 0), 0);
    const gamesPerSession = totalSessions > 0 ? totalGames / totalSessions : 0;

    // Game 2 and 3 start percentages
    const sessionsWithMultipleGames = sessions.filter(s => (s.gamesPlayed || 0) >= 2).length;
    const sessionsWithThreeGames = sessions.filter(s => (s.gamesPlayed || 0) >= 3).length;
    const game2StartPercent = totalSessions > 0 ? (sessionsWithMultipleGames / totalSessions) * 100 : 0;
    const game3StartPercent = totalSessions > 0 ? (sessionsWithThreeGames / totalSessions) * 100 : 0;

    // Share clicks from game events
    const shareEvents = await db
      .select()
      .from(gameEvents)
      .where(and(
        eq(gameEvents.eventType, 'share_click'),
        gte(gameEvents.createdAt, startDate),
        sql`${gameEvents.createdAt} < ${endDate}`
      ));
    const shareClicks = shareEvents.length;

    return {
      totalSessions,
      uniqueVisitors,
      firstSessionCompletionRate,
      avgTimeToFirstPlaySeconds,
      avgSessionLengthSeconds,
      mobilePercent,
      desktopPercent,
      gamesPerSession,
      game2StartPercent,
      game3StartPercent,
      shareClicks,
    };
  }

  // Play Together methods
  async getPlayTogetherStatus(userId: string, gameType: string, playDate: string): Promise<{ playsCount: number; promptsUsedToday: string[] }> {
    const [record] = await db
      .select()
      .from(playTogetherPlays)
      .where(and(
        eq(playTogetherPlays.userId, userId),
        eq(playTogetherPlays.gameType, gameType),
        eq(playTogetherPlays.playDate, playDate)
      ));
    
    if (!record) {
      return { playsCount: 0, promptsUsedToday: [] };
    }
    
    return {
      playsCount: record.playsCount || 0,
      promptsUsedToday: (record.promptsUsedToday as string[]) || [],
    };
  }

  async recordPlayTogetherPlay(userId: string, tripId: string | null, gameType: string, playDate: string, promptUsed: string): Promise<PlayTogetherPlays> {
    const [existing] = await db
      .select()
      .from(playTogetherPlays)
      .where(and(
        eq(playTogetherPlays.userId, userId),
        eq(playTogetherPlays.gameType, gameType),
        eq(playTogetherPlays.playDate, playDate)
      ));
    
    if (existing) {
      const currentPrompts = (existing.promptsUsedToday as string[]) || [];
      const [updated] = await db
        .update(playTogetherPlays)
        .set({
          playsCount: (existing.playsCount || 0) + 1,
          promptsUsedToday: [...currentPrompts, promptUsed],
          updatedAt: new Date(),
        })
        .where(eq(playTogetherPlays.id, existing.id))
        .returning();
      return updated;
    }
    
    const [newRecord] = await db
      .insert(playTogetherPlays)
      .values({
        userId,
        tripId,
        gameType,
        playDate,
        playsCount: 1,
        promptsUsedToday: [promptUsed],
      })
      .returning();
    return newRecord;
  }

  // Daily Quest Cities methods
  async createDailyQuestCity(city: InsertDailyQuestCity): Promise<DailyQuestCity> {
    const [newCity] = await db
      .insert(dailyQuestCities)
      .values(city)
      .returning();
    return newCity;
  }

  async getAllDailyQuestCities(): Promise<DailyQuestCity[]> {
    return await db.select().from(dailyQuestCities).orderBy(dailyQuestCities.region, dailyQuestCities.city);
  }

  async getDailyQuestCityForDate(date: string): Promise<DailyQuestCity | undefined> {
    const [city] = await db
      .select()
      .from(dailyQuestCities)
      .where(eq(dailyQuestCities.usedOnDate, date));
    return city;
  }

  async getUnusedDailyQuestCity(): Promise<DailyQuestCity | undefined> {
    // Find which regions were used in the last 2 days so we can avoid repeating them
    const recentDates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 2; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      recentDates.push(d.toISOString().split('T')[0]);
    }

    const recentCities = await db
      .select({ region: dailyQuestCities.region })
      .from(dailyQuestCities)
      .where(inArray(dailyQuestCities.usedOnDate, recentDates));

    const recentRegions = [...new Set(recentCities.map(c => c.region))];

    // Prefer a city from a different region than the last 2 days
    if (recentRegions.length > 0) {
      const exclusionConditions = recentRegions.map(r => ne(dailyQuestCities.region, r));
      const exclusionFilter = exclusionConditions.length === 1
        ? exclusionConditions[0]
        : and(...exclusionConditions);

      const [city] = await db
        .select()
        .from(dailyQuestCities)
        .where(and(isNull(dailyQuestCities.usedOnDate), exclusionFilter))
        .orderBy(sql`RANDOM()`)
        .limit(1);

      if (city) return city;
    }

    // Fallback: any unused city if all other regions are exhausted
    const [city] = await db
      .select()
      .from(dailyQuestCities)
      .where(isNull(dailyQuestCities.usedOnDate))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return city;
  }

  async markCityAsUsed(cityId: string, date: string): Promise<DailyQuestCity | undefined> {
    const [city] = await db
      .update(dailyQuestCities)
      .set({ usedOnDate: date })
      .where(eq(dailyQuestCities.id, cityId))
      .returning();
    return city;
  }

  async updateDailyQuestCity(cityId: string, data: Partial<InsertDailyQuestCity>): Promise<DailyQuestCity | undefined> {
    const [city] = await db
      .update(dailyQuestCities)
      .set(data)
      .where(eq(dailyQuestCities.id, cityId))
      .returning();
    return city;
  }

  async seedDailyQuestCities(cities: InsertDailyQuestCity[]): Promise<number> {
    if (cities.length === 0) return 0;
    
    const existingCities = await db.select({ city: dailyQuestCities.city, country: dailyQuestCities.country }).from(dailyQuestCities);
    const existingSet = new Set(existingCities.map(c => `${c.city}-${c.country}`));
    
    const newCities = cities.filter(c => !existingSet.has(`${c.city}-${c.country}`));
    
    if (newCities.length === 0) return 0;
    
    await db.insert(dailyQuestCities).values(newCities);
    return newCities.length;
  }

  // City Stickers methods
  async createCitySticker(sticker: InsertCitySticker): Promise<CitySticker> {
    const [newSticker] = await db
      .insert(cityStickers)
      .values(sticker)
      .returning();
    return newSticker;
  }

  async getCityStickerByCityId(cityId: string): Promise<CitySticker | undefined> {
    const [sticker] = await db
      .select()
      .from(cityStickers)
      .where(eq(cityStickers.cityId, cityId));
    return sticker;
  }

  async getCityStickerByCity(city: string, country: string): Promise<CitySticker | undefined> {
    const [sticker] = await db
      .select()
      .from(cityStickers)
      .where(and(eq(cityStickers.city, city), eq(cityStickers.country, country)));
    return sticker;
  }

  async getAllCityStickers(): Promise<CitySticker[]> {
    return await db
      .select()
      .from(cityStickers)
      .orderBy(cityStickers.continent, cityStickers.country, cityStickers.city);
  }

  async seedCityStickers(): Promise<number> {
    const allCities = await this.getAllDailyQuestCities();
    const existingStickers = await db.select({ cityId: cityStickers.cityId }).from(cityStickers);
    const existingCityIds = new Set(existingStickers.map(s => s.cityId));
    
    const regionToContinent: Record<string, string> = {
      'Europe': 'Europe',
      'Asia': 'Asia',
      'North America': 'North America',
      'South America': 'South America',
      'Africa': 'Africa',
      'Oceania': 'Oceania',
    };
    
    const newStickers: InsertCitySticker[] = allCities
      .filter(city => !existingCityIds.has(city.id))
      .map(city => ({
        cityId: city.id,
        city: city.city,
        country: city.country,
        continent: regionToContinent[city.region] || city.region,
        stickerIcon: city.flag || '🏙️',
        funFact: city.funFact,
      }));
    
    if (newStickers.length === 0) return 0;
    
    await db.insert(cityStickers).values(newStickers);
    return newStickers.length;
  }

  // User City Stickers methods
  async grantSticker(data: InsertUserCitySticker): Promise<UserCitySticker> {
    const [newUserSticker] = await db
      .insert(userCityStickers)
      .values(data)
      .returning();
    return newUserSticker;
  }

  async getUserStickers(visitorId: string, playerId?: string | null): Promise<(UserCitySticker & { sticker: CitySticker })[]> {
    let whereCondition;
    
    if (playerId) {
      // When playerId is provided, fetch stickers that:
      // 1. Match the exact playerId (across ALL visitor IDs - handles device/browser changes), OR
      // 2. Match the visitorId with NULL playerId (legacy stickers from before explorer system)
      whereCondition = or(
        eq(userCityStickers.playerId, playerId),
        and(
          eq(userCityStickers.visitorId, visitorId),
          isNull(userCityStickers.playerId)
        )
      );
    } else {
      // No playerId - just use visitorId
      whereCondition = eq(userCityStickers.visitorId, visitorId);
    }
    
    const results = await db
      .select({
        id: userCityStickers.id,
        visitorId: userCityStickers.visitorId,
        playerId: userCityStickers.playerId,
        stickerId: userCityStickers.stickerId,
        earnedAt: userCityStickers.earnedAt,
        isTraded: userCityStickers.isTraded,
        tradedAt: userCityStickers.tradedAt,
        sticker: cityStickers,
      })
      .from(userCityStickers)
      .innerJoin(cityStickers, eq(userCityStickers.stickerId, cityStickers.id))
      .where(whereCondition)
      .orderBy(desc(userCityStickers.earnedAt));
    
    return results.map(r => ({
      id: r.id,
      visitorId: r.visitorId,
      playerId: r.playerId,
      stickerId: r.stickerId,
      earnedAt: r.earnedAt,
      isTraded: r.isTraded,
      tradedAt: r.tradedAt,
      sticker: r.sticker,
    }));
  }

  async markStickersAsTraded(stickerIds: string[]): Promise<number> {
    if (stickerIds.length === 0) return 0;
    
    const result = await db
      .update(userCityStickers)
      .set({ isTraded: true, tradedAt: new Date() })
      .where(inArray(userCityStickers.id, stickerIds));
    
    return stickerIds.length;
  }

  async getUntradedStickerCount(visitorId: string, playerId?: string | null): Promise<number> {
    let whereCondition;
    
    if (playerId) {
      // When playerId is provided, fetch stickers that:
      // 1. Match the exact playerId (across ALL visitor IDs) AND are not traded, OR
      // 2. Match the visitorId with NULL playerId (legacy stickers) AND are not traded
      whereCondition = and(
        eq(userCityStickers.isTraded, false),
        or(
          eq(userCityStickers.playerId, playerId),
          and(
            eq(userCityStickers.visitorId, visitorId),
            isNull(userCityStickers.playerId)
          )
        )
      );
    } else {
      // No playerId - just use visitorId
      whereCondition = and(
        eq(userCityStickers.visitorId, visitorId),
        eq(userCityStickers.isTraded, false)
      );
    }
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCityStickers)
      .where(whereCondition);
    return result[0]?.count || 0;
  }

  // User Rewards methods
  async grantReward(data: InsertUserReward): Promise<UserReward> {
    const [newReward] = await db
      .insert(userRewards)
      .values(data)
      .returning();
    return newReward;
  }

  async getUserRewards(visitorId: string, playerId?: string | null): Promise<UserReward[]> {
    let whereCondition;
    
    if (playerId) {
      // When playerId is provided, fetch rewards that:
      // 1. Match the exact playerId (across ALL visitor IDs), OR
      // 2. Match the visitorId with NULL playerId (legacy rewards)
      whereCondition = or(
        eq(userRewards.playerId, playerId),
        and(
          eq(userRewards.visitorId, visitorId),
          isNull(userRewards.playerId)
        )
      );
    } else {
      whereCondition = eq(userRewards.visitorId, visitorId);
    }
    
    return await db
      .select()
      .from(userRewards)
      .where(whereCondition)
      .orderBy(desc(userRewards.earnedAt));
  }

  async getColoringSheetCount(visitorId: string, playerId?: string | null): Promise<number> {
    let whereCondition;
    
    if (playerId) {
      // When playerId is provided, fetch rewards that:
      // 1. Match the exact playerId (across ALL visitor IDs) AND are coloring sheets, OR
      // 2. Match the visitorId with NULL playerId (legacy) AND are coloring sheets
      whereCondition = and(
        eq(userRewards.rewardType, 'coloring_sheet'),
        or(
          eq(userRewards.playerId, playerId),
          and(
            eq(userRewards.visitorId, visitorId),
            isNull(userRewards.playerId)
          )
        )
      );
    } else {
      whereCondition = and(
        eq(userRewards.visitorId, visitorId),
        eq(userRewards.rewardType, 'coloring_sheet')
      );
    }
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRewards)
      .where(whereCondition);
    return result[0]?.count || 0;
  }

  // Sticker Stats for ranks
  async getStickerStats(visitorId: string, playerId?: string | null): Promise<{
    totalStickers: number;
    untradedStickers: number;
    completedPages: number;
    countryMaps: number;
    continentMaps: number;
    stickersByContinent: Record<string, number>;
  }> {
    const allStickers = await this.getUserStickers(visitorId, playerId);
    const rewards = await this.getUserRewards(visitorId, playerId);
    
    const totalStickers = allStickers.length;
    const untradedStickers = allStickers.filter(s => !s.isTraded).length;
    
    // Group stickers by continent
    const stickersByContinent: Record<string, number> = {};
    for (const s of allStickers) {
      const continent = s.sticker.continent;
      stickersByContinent[continent] = (stickersByContinent[continent] || 0) + 1;
    }
    
    // Completed pages = untraded stickers / 10 (floor)
    const completedPages = Math.floor(untradedStickers / 10);
    
    // Count country and continent maps
    const countryMaps = rewards.filter(r => r.rewardType === 'country_map').length;
    const continentMaps = rewards.filter(r => r.rewardType === 'continent_map').length;
    
    return {
      totalStickers,
      untradedStickers,
      completedPages,
      countryMaps,
      continentMaps,
      stickersByContinent,
    };
  }
  
  // Mini-games
  async getUserMiniGames(visitorId: string, playerId?: string | null): Promise<UserMiniGame[]> {
    const conditions = [eq(userMiniGames.visitorId, visitorId)];
    if (playerId) {
      conditions.push(eq(userMiniGames.playerId, playerId));
    } else {
      conditions.push(isNull(userMiniGames.playerId));
    }
    
    return await db
      .select()
      .from(userMiniGames)
      .where(and(...conditions))
      .orderBy(userMiniGames.gameId);
  }
  
  async unlockMiniGame(visitorId: string, gameId: string, stickersSpent: number, playerId?: string | null): Promise<UserMiniGame> {
    const conditions = [
      eq(userMiniGames.visitorId, visitorId),
      eq(userMiniGames.gameId, gameId)
    ];
    if (playerId) {
      conditions.push(eq(userMiniGames.playerId, playerId));
    } else {
      conditions.push(isNull(userMiniGames.playerId));
    }
    
    const [existing] = await db
      .select()
      .from(userMiniGames)
      .where(and(...conditions));
    
    if (existing) {
      const [updated] = await db
        .update(userMiniGames)
        .set({
          isUnlocked: true,
          unlockedAt: new Date(),
          stickersSpent: (existing.stickersSpent || 0) + stickersSpent,
        })
        .where(eq(userMiniGames.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db
      .insert(userMiniGames)
      .values({
        visitorId,
        gameId,
        playerId: playerId || null,
        isUnlocked: true,
        unlockedAt: new Date(),
        timesPlayed: 0,
        highScore: 0,
        stickersSpent,
      })
      .returning();
    return created;
  }
  
  async updateMiniGameProgress(visitorId: string, gameId: string, score: number, playerId?: string | null): Promise<UserMiniGame | undefined> {
    const conditions = [
      eq(userMiniGames.visitorId, visitorId),
      eq(userMiniGames.gameId, gameId)
    ];
    if (playerId) {
      conditions.push(eq(userMiniGames.playerId, playerId));
    } else {
      conditions.push(isNull(userMiniGames.playerId));
    }
    
    const [existing] = await db
      .select()
      .from(userMiniGames)
      .where(and(...conditions));
    
    if (!existing) return undefined;
    
    const newHighScore = Math.max(existing.highScore || 0, score);
    
    const [updated] = await db
      .update(userMiniGames)
      .set({
        timesPlayed: (existing.timesPlayed || 0) + 1,
        highScore: newHighScore,
        lastPlayedAt: new Date(),
      })
      .where(eq(userMiniGames.id, existing.id))
      .returning();
    return updated;
  }
  
  async getMiniGameProgress(visitorId: string, gameId: string): Promise<UserMiniGame | undefined> {
    const [progress] = await db
      .select()
      .from(userMiniGames)
      .where(and(
        eq(userMiniGames.visitorId, visitorId),
        eq(userMiniGames.gameId, gameId)
      ));
    return progress;
  }
  
  // Geo-Art Creations
  async saveGeoArtCreation(creation: InsertGeoArtCreation): Promise<GeoArtCreation> {
    const [newCreation] = await db
      .insert(geoArtCreations)
      .values(creation)
      .returning();
    return newCreation;
  }
  
  async getUserGeoArtCreations(visitorId: string): Promise<GeoArtCreation[]> {
    return await db
      .select()
      .from(geoArtCreations)
      .where(eq(geoArtCreations.visitorId, visitorId))
      .orderBy(desc(geoArtCreations.createdAt));
  }
  
  async hasCreatedFlagForCountry(visitorId: string, countryCode: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(geoArtCreations)
      .where(and(
        eq(geoArtCreations.visitorId, visitorId),
        eq(geoArtCreations.countryCode, countryCode)
      ))
      .limit(1);
    return !!existing;
  }
  
  // Explorer Management (Multi-Profile)
  async getActiveExplorers(userId: string): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(and(
        eq(players.userId, userId),
        eq(players.isArchived, false)
      ))
      .orderBy(desc(players.createdAt));
  }
  
  async getArchivedExplorers(userId: string): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(and(
        eq(players.userId, userId),
        eq(players.isArchived, true)
      ))
      .orderBy(desc(players.updatedAt));
  }
  
  async getGuestExplorer(explorerId: string): Promise<Player | undefined> {
    const [explorer] = await db
      .select()
      .from(players)
      .where(and(
        eq(players.id, explorerId),
        eq(players.isGuest, true)
      ));
    return explorer;
  }
  
  async createGuestExplorer(data: Partial<InsertPlayer>): Promise<Player> {
    const [explorer] = await db
      .insert(players)
      .values({
        name: data.name || "Explorer",
        age: data.age || "unknown",
        profileType: data.profileType || "kid",
        ageRange: data.ageRange,
        avatarKey: data.avatarKey || "panda",
        difficultyLevel: data.difficultyLevel || "medium",
        isGuest: true,
        isArchived: false,
      })
      .returning();
    return explorer;
  }
  
  async convertGuestToUser(explorerId: string, userId: string): Promise<Player | undefined> {
    const [updated] = await db
      .update(players)
      .set({
        userId,
        isGuest: false,
        updatedAt: new Date(),
      })
      .where(eq(players.id, explorerId))
      .returning();
    return updated;
  }
  
  async archiveExplorer(explorerId: string): Promise<Player | undefined> {
    const [updated] = await db
      .update(players)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(players.id, explorerId))
      .returning();
    return updated;
  }
  
  async restoreExplorer(explorerId: string): Promise<Player | undefined> {
    const [updated] = await db
      .update(players)
      .set({
        isArchived: false,
        updatedAt: new Date(),
      })
      .where(eq(players.id, explorerId))
      .returning();
    return updated;
  }
  
  async deleteExplorer(explorerId: string): Promise<boolean> {
    const result = await db
      .delete(players)
      .where(eq(players.id, explorerId));
    return (result.rowCount ?? 0) > 0;
  }
  
  async updateExplorerProfile(explorerId: string, data: Partial<InsertPlayer>): Promise<Player | undefined> {
    const [updated] = await db
      .update(players)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(players.id, explorerId))
      .returning();
    return updated;
  }
  
  async getExplorerCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(players)
      .where(and(
        eq(players.userId, userId),
        eq(players.isArchived, false)
      ));
    return Number(result[0]?.count || 0);
  }
  
  async updateUserStripeInfo(userId: string, stripeInfo: { stripeCustomerId?: string; subscriptionTier?: string }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        ...stripeInfo,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
  
  async startUserTrial(userId: string, trialStartDate: Date, trialEndDate: Date): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        trialStartDate,
        trialEndDate,
        subscriptionTier: 'trial',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
  
  async claimFreeAdventure(userId: string, tripId: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        usedFreeAdventureId: tripId,
        usedFreeAdventureAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
  
  async hasUsedFreeAdventure(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    return !!user.usedFreeAdventureId;
  }
  
  async addToWaitlist(data: { email: string; visitorId?: string | null; playerId?: string | null; userId?: string | null; source?: string }): Promise<any> {
    const [entry] = await db
      .insert(proWaitlist)
      .values({
        email: data.email,
        visitorId: data.visitorId || null,
        playerId: data.playerId || null,
        userId: data.userId || null,
        source: data.source || 'upgrade_dialog',
      })
      .returning();
    return entry;
  }
  
  async getWaitlistByEmail(email: string): Promise<any | undefined> {
    const [entry] = await db.select().from(proWaitlist).where(eq(proWaitlist.email, email));
    return entry;
  }
  
  // Reward Tiers methods
  async getAllRewardTiers(): Promise<RewardTier[]> {
    return await db
      .select()
      .from(rewardTiers)
      .where(eq(rewardTiers.isActive, true))
      .orderBy(rewardTiers.displayOrder);
  }
  
  async getRewardTierById(tierId: string): Promise<RewardTier | undefined> {
    const [tier] = await db.select().from(rewardTiers).where(eq(rewardTiers.id, tierId));
    return tier;
  }
  
  async seedRewardTiers(): Promise<number> {
    const existing = await db.select({ id: rewardTiers.id }).from(rewardTiers);
    const existingIds = new Set(existing.map(t => t.id));
    
    const toInsert = DEFAULT_REWARD_TIERS.filter(t => !existingIds.has(t.id));
    
    if (toInsert.length === 0) return 0;
    
    await db.insert(rewardTiers).values(toInsert);
    return toInsert.length;
  }
  
  // Reward Unlocks methods
  async createRewardUnlock(data: InsertRewardUnlock): Promise<RewardUnlock> {
    const [unlock] = await db
      .insert(rewardUnlocks)
      .values(data)
      .returning();
    return unlock;
  }
  
  async getExplorerRewardUnlocks(explorerId: string): Promise<(RewardUnlock & { tier: RewardTier })[]> {
    const results = await db
      .select()
      .from(rewardUnlocks)
      .innerJoin(rewardTiers, eq(rewardUnlocks.tierId, rewardTiers.id))
      .where(eq(rewardUnlocks.explorerId, explorerId))
      .orderBy(rewardTiers.displayOrder);
    
    return results.map(r => ({
      ...r.reward_unlocks,
      tier: r.reward_tiers,
    }));
  }
  
  async getRewardUnlockById(unlockId: string): Promise<(RewardUnlock & { tier: RewardTier }) | undefined> {
    const [result] = await db
      .select()
      .from(rewardUnlocks)
      .innerJoin(rewardTiers, eq(rewardUnlocks.tierId, rewardTiers.id))
      .where(eq(rewardUnlocks.id, unlockId));
    
    if (!result) return undefined;
    
    return {
      ...result.reward_unlocks,
      tier: result.reward_tiers,
    };
  }
  
  async hasUnlockedTier(explorerId: string, tierId: string): Promise<boolean> {
    const [unlock] = await db
      .select({ id: rewardUnlocks.id })
      .from(rewardUnlocks)
      .where(and(
        eq(rewardUnlocks.explorerId, explorerId),
        eq(rewardUnlocks.tierId, tierId)
      ));
    return !!unlock;
  }
  
  async claimReward(unlockId: string, parentEmail: string, shippingAddress?: string): Promise<RewardUnlock | undefined> {
    const [updated] = await db
      .update(rewardUnlocks)
      .set({
        status: 'claimed',
        claimedAt: new Date(),
        parentEmail,
        shippingAddress: shippingAddress || null,
      })
      .where(eq(rewardUnlocks.id, unlockId))
      .returning();
    return updated;
  }
  
  async fulfillReward(unlockId: string): Promise<RewardUnlock | undefined> {
    const [updated] = await db
      .update(rewardUnlocks)
      .set({
        status: 'fulfilled',
        fulfilledAt: new Date(),
      })
      .where(eq(rewardUnlocks.id, unlockId))
      .returning();
    return updated;
  }
  
  // Reward Evaluation - checks explorer's mastery and unlocks new rewards
  async evaluateRewardsForExplorer(explorerId: string): Promise<RewardUnlock[]> {
    const newUnlocks: RewardUnlock[] = [];
    
    // Get the explorer's passport mastery data
    const explorer = await this.getPlayerById(explorerId);
    if (!explorer) return newUnlocks;
    
    const passportMastery = (explorer.passportMastery as Array<{
      cityId: string;
      star1: boolean;
      star2: boolean;
      star3: boolean;
      star4: boolean;
      star5: boolean;
      discoveredDate: string;
    }>) || [];
    
    const masteredCities = passportMastery.filter(m => {
      const count = (m.star1 ? 1 : 0) + (m.star2 ? 1 : 0) + (m.star3 ? 1 : 0) + (m.star4 ? 1 : 0) + (m.star5 ? 1 : 0);
      return count >= 3;
    });
    const masteredCityCount = masteredCities.length;
    
    // Get city to continent mapping
    const allCities = await this.getAllDailyQuestCities();
    const cityToContinent: Record<string, string> = {};
    for (const city of allCities) {
      cityToContinent[city.id] = city.region;
    }
    
    // Count mastered cities by continent
    const masteredByContinent: Record<string, number> = {};
    const citiesPerContinent: Record<string, number> = {};
    
    for (const city of allCities) {
      citiesPerContinent[city.region] = (citiesPerContinent[city.region] || 0) + 1;
    }
    
    for (const mastered of masteredCities) {
      const continent = cityToContinent[mastered.cityId];
      if (continent) {
        masteredByContinent[continent] = (masteredByContinent[continent] || 0) + 1;
      }
    }
    
    // Count continents where all cities are mastered
    const fullyMasteredContinents = Object.keys(citiesPerContinent).filter(continent => {
      const total = citiesPerContinent[continent] || 0;
      const mastered = masteredByContinent[continent] || 0;
      return total > 0 && mastered >= total;
    });
    
    // Count continents with at least one mastered city
    const continentsWithMastery = Object.keys(masteredByContinent).filter(c => masteredByContinent[c] > 0);
    
    // Get all active reward tiers
    const tiers = await this.getAllRewardTiers();
    
    // Check each tier
    for (const tier of tiers) {
      // Skip if already unlocked
      const alreadyUnlocked = await this.hasUnlockedTier(explorerId, tier.id);
      if (alreadyUnlocked) continue;
      
      let shouldUnlock = false;
      
      switch (tier.triggerType) {
        case 'cities_mastered':
          shouldUnlock = masteredCityCount >= tier.triggerValue;
          break;
        case 'continent_mastered':
          shouldUnlock = fullyMasteredContinents.length >= tier.triggerValue;
          break;
        case 'continents_mastered':
          shouldUnlock = continentsWithMastery.length >= tier.triggerValue;
          break;
      }
      
      if (shouldUnlock) {
        // Create the unlock with claim data
        const claimData = {
          masteredCities: masteredCities.map(m => m.cityId),
          masteredCityCount,
          masteredContinents: tier.triggerType === 'continent_mastered' 
            ? fullyMasteredContinents 
            : continentsWithMastery,
        };
        
        const unlock = await this.createRewardUnlock({
          explorerId,
          tierId: tier.id,
          status: 'unlocked',
          claimData,
        });
        
        newUnlocks.push(unlock);
      }
    }
    
    return newUnlocks;
  }
  
  // ============================================================================
  // TRAVEL MODE IMPLEMENTATION (Isolated from World Mode)
  // ============================================================================
  
  // Trips
  async createTrip(tripData: InsertTravelTrip): Promise<TravelTrip> {
    const [trip] = await db.insert(travelTrips).values(tripData).returning();
    return trip;
  }
  
  async getTripsByUserId(userId: string): Promise<TravelTrip[]> {
    return await db.select().from(travelTrips).where(eq(travelTrips.userId, userId)).orderBy(desc(travelTrips.createdAt));
  }

  async getStopSummariesForTrips(tripIds: string[]): Promise<Map<string, { stops: TravelStop[]; totalStops: number; visitedStops: number }>> {
    const result = new Map<string, { stops: TravelStop[]; totalStops: number; visitedStops: number }>();
    if (tripIds.length === 0) return result;
    
    const allStops = await db.select().from(travelStops)
      .where(inArray(travelStops.tripId, tripIds))
      .orderBy(travelStops.displayOrder);
    
    for (const tripId of tripIds) {
      const tripStops = allStops.filter(s => s.tripId === tripId);
      result.set(tripId, {
        stops: tripStops,
        totalStops: tripStops.length,
        visitedStops: tripStops.filter(s => s.isVisited).length,
      });
    }
    return result;
  }
  
  async getTripCountsByUserId(userId: string): Promise<{ travel: number; home: number; total: number }> {
    const trips = await db.select({
      adventureContext: travelTrips.adventureContext,
    }).from(travelTrips).where(eq(travelTrips.userId, userId));
    
    const travel = trips.filter(t => t.adventureContext === 'travel' || t.adventureContext === null).length;
    const home = trips.filter(t => t.adventureContext === 'home').length;
    
    return { travel, home, total: trips.length };
  }
  
  async getLifetimeTripCounts(userId: string): Promise<{ travel: number; home: number }> {
    const [user] = await db.select({
      totalTravelTripsCreated: users.totalTravelTripsCreated,
      totalHomeTripsCreated: users.totalHomeTripsCreated,
    }).from(users).where(eq(users.id, userId));
    
    return {
      travel: user?.totalTravelTripsCreated || 0,
      home: user?.totalHomeTripsCreated || 0,
    };
  }
  
  async incrementLifetimeTripCount(userId: string, context: 'travel' | 'home'): Promise<void> {
    if (context === 'travel') {
      await db.update(users).set({
        totalTravelTripsCreated: sql`COALESCE(${users.totalTravelTripsCreated}, 0) + 1`,
      }).where(eq(users.id, userId));
    } else {
      await db.update(users).set({
        totalHomeTripsCreated: sql`COALESCE(${users.totalHomeTripsCreated}, 0) + 1`,
      }).where(eq(users.id, userId));
    }
  }
  
  async hasDuplicateCityTrip(userId: string, country: string, city: string | null | undefined, adventureContext: 'travel' | 'home'): Promise<boolean> {
    const duplicate = await this.findDuplicateCityTrip(userId, country, city, adventureContext);
    return duplicate !== null;
  }
  
  async findDuplicateCityTrip(userId: string, country: string, city: string | null | undefined, adventureContext: 'travel' | 'home'): Promise<TravelTrip | null> {
    // Check if user already has an ACTIVE trip with the same country+city in the same context
    // Completed trips are ignored - users can create new trips to destinations they've visited before
    const normalizedCountry = country.toLowerCase().trim();
    const normalizedCity = city ? city.toLowerCase().trim() : null;
    
    // For 'travel' context, only check active trips (not completed)
    // For 'home' context, check all trips (home adventures can be revisited)
    const conditions = [
      eq(travelTrips.userId, userId),
      eq(travelTrips.adventureContext, adventureContext),
    ];
    
    // Always exclude archived trips — they should not block new trip creation
    conditions.push(eq(travelTrips.isArchived, false));
    
    // Only filter by status for travel adventures
    if (adventureContext === 'travel') {
      conditions.push(ne(travelTrips.status, 'completed'));
    }
    
    const existingTrips = await db.select().from(travelTrips).where(and(...conditions));
    
    // Compare normalized country and city
    const duplicateTrip = existingTrips.find(trip => {
      const tripCountry = trip.country?.toLowerCase().trim();
      const tripCity = trip.city ? trip.city.toLowerCase().trim() : null;
      
      // Match if country is the same and either:
      // - Both cities are null/empty, OR
      // - Both cities match
      if (tripCountry === normalizedCountry) {
        if (!normalizedCity && !tripCity) return true;
        if (normalizedCity && tripCity && normalizedCity === tripCity) return true;
      }
      return false;
    });
    
    return duplicateTrip || null;
  }
  
  async getTripById(tripId: string): Promise<TravelTrip | undefined> {
    const [trip] = await db.select().from(travelTrips).where(eq(travelTrips.id, tripId));
    return trip;
  }
  
  // Optimized method: Fetch trip with all related data in parallel
  async getTripWithDetails(tripId: string): Promise<{
    trip: TravelTrip;
    stops: TravelStop[];
    moments: TravelMoment[];
    memoryStarsData: MemoryStars[];
    journeyPacks: JourneyPack[];
  } | null> {
    console.time(`[Trip] getTripWithDetails ${tripId}`);
    
    // First get the trip to verify it exists
    const [trip] = await db.select().from(travelTrips).where(eq(travelTrips.id, tripId));
    if (!trip) {
      console.timeEnd(`[Trip] getTripWithDetails ${tripId}`);
      return null;
    }
    
    // Fetch all related data in parallel - single round trip to database
    const [stops, moments, memoryStarsData] = await Promise.all([
      db.select().from(travelStops).where(eq(travelStops.tripId, tripId)).orderBy(travelStops.displayOrder),
      db.select().from(travelMoments).where(eq(travelMoments.tripId, tripId)).orderBy(desc(travelMoments.createdAt)),
      db.select().from(memoryStars).where(eq(memoryStars.tripId, tripId)),
    ]);
    
    // Fetch journey packs for all stops (only if there are stops)
    let packs: JourneyPack[] = [];
    if (stops.length > 0) {
      const stopIds = stops.map(s => s.id);
      packs = await db.select().from(journeyPacks).where(inArray(journeyPacks.stopId, stopIds));
    }
    
    console.timeEnd(`[Trip] getTripWithDetails ${tripId}`);
    console.log(`[Trip] Loaded: ${stops.length} stops, ${moments.length} moments, ${packs.length} packs`);
    
    return { trip, stops, moments, memoryStarsData, journeyPacks: packs };
  }
  
  async updateTrip(tripId: string, updates: Partial<InsertTravelTrip>): Promise<TravelTrip | undefined> {
    // Convert date strings to Date objects for timestamp fields
    const processedUpdates = { ...updates };
    if (typeof processedUpdates.completedAt === 'string') {
      processedUpdates.completedAt = new Date(processedUpdates.completedAt);
    }
    if (typeof processedUpdates.startDate === 'string') {
      processedUpdates.startDate = new Date(processedUpdates.startDate);
    }
    if (typeof processedUpdates.endDate === 'string') {
      processedUpdates.endDate = new Date(processedUpdates.endDate);
    }
    if (typeof (processedUpdates as any).adventureStartedAt === 'string') {
      (processedUpdates as any).adventureStartedAt = new Date((processedUpdates as any).adventureStartedAt);
    }
    
    const [trip] = await db.update(travelTrips).set({ ...processedUpdates, updatedAt: new Date() }).where(eq(travelTrips.id, tripId)).returning();
    return trip;
  }
  
  async deleteTrip(tripId: string): Promise<boolean> {
    // Get all stops for this trip to delete their related data
    const stops = await this.getStopsByTripId(tripId);
    
    // Delete journey game prompts and journey packs for all stops (FK constraints)
    for (const stop of stops) {
      await db.delete(journeyGamePrompts).where(eq(journeyGamePrompts.stopId, stop.id));
      await db.delete(journeyPacks).where(eq(journeyPacks.stopId, stop.id));
    }
    
    // Delete journey pack progress for this trip
    await db.delete(journeyPackProgress).where(eq(journeyPackProgress.tripId, tripId));
    
    // Delete all stops
    await db.delete(travelStops).where(eq(travelStops.tripId, tripId));
    
    // Delete all moments for this trip
    await db.delete(travelMoments).where(eq(travelMoments.tripId, tripId));
    
    // Delete memory stars for this trip
    await db.delete(memoryStars).where(eq(memoryStars.tripId, tripId));
    
    // Delete wonder responses for all stops
    for (const stop of stops) {
      await db.delete(travelWonderResponses).where(eq(travelWonderResponses.stopId, stop.id));
    }
    
    // Delete trip stories
    await db.delete(travelTripStories).where(eq(travelTripStories.tripId, tripId));
    
    // Delete trail tales riddles and progress
    await db.delete(trailTalesProgress).where(eq(trailTalesProgress.tripId, tripId));
    await db.delete(trailTalesRiddles).where(eq(trailTalesRiddles.tripId, tripId));
    
    // Delete any itinerary shares for this trip (including related data)
    const shareRecords = await db.select().from(itineraryShares).where(eq(itineraryShares.tripId, tripId));
    for (const share of shareRecords) {
      // Delete share stops
      await db.delete(itineraryShareStops).where(eq(itineraryShareStops.shareId, share.id));
      // Delete comments
      await db.delete(itineraryComments).where(eq(itineraryComments.shareId, share.id));
      // Delete upvotes
      await db.delete(itineraryUpvotes).where(eq(itineraryUpvotes.shareId, share.id));
      // Delete bookmarks
      await db.delete(itineraryBookmarks).where(eq(itineraryBookmarks.shareId, share.id));
    }
    // Delete the share records
    await db.delete(itineraryShares).where(eq(itineraryShares.tripId, tripId));
    
    // Finally delete the trip itself
    await db.delete(travelTrips).where(eq(travelTrips.id, tripId));
    return true;
  }
  
  // Stops
  async createStop(stopData: InsertTravelStop): Promise<TravelStop> {
    const [stop] = await db.insert(travelStops).values(stopData).returning();
    return stop;
  }
  
  async getStopsByTripId(tripId: string): Promise<TravelStop[]> {
    return await db.select().from(travelStops).where(eq(travelStops.tripId, tripId)).orderBy(travelStops.displayOrder);
  }
  
  async getStopById(stopId: string): Promise<TravelStop | undefined> {
    const [stop] = await db.select().from(travelStops).where(eq(travelStops.id, stopId));
    return stop;
  }
  
  async updateStop(stopId: string, updates: Partial<InsertTravelStop>): Promise<TravelStop | undefined> {
    const [stop] = await db.update(travelStops).set(updates).where(eq(travelStops.id, stopId)).returning();
    return stop;
  }
  
  async deleteStop(stopId: string): Promise<boolean> {
    // Use a transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Delete related records first to avoid FK violations
      await tx.delete(journeyGamePrompts).where(eq(journeyGamePrompts.stopId, stopId));
      await tx.delete(journeyPacks).where(eq(journeyPacks.stopId, stopId));
      await tx.delete(travelWonderResponses).where(eq(travelWonderResponses.stopId, stopId));
      await tx.delete(memoryStars).where(eq(memoryStars.stopId, stopId));
      // Update moments to remove stop reference (but keep the moment)
      await tx.update(travelMoments).set({ stopId: null }).where(eq(travelMoments.stopId, stopId));
      // Now delete the stop
      await tx.delete(travelStops).where(eq(travelStops.id, stopId));
    });
    return true;
  }
  
  async markStopVisited(stopId: string, mode?: "completed" | "skipped"): Promise<TravelStop | undefined> {
    const [stop] = await db.update(travelStops).set({ 
      isVisited: true, 
      visitedAt: new Date(),
      visitedMode: mode ?? "completed",
      journeyPackCompleted: true, // Mark journey pack as completed when stop is visited
    }).where(eq(travelStops.id, stopId)).returning();
    return stop;
  }
  
  async reorderStops(tripId: string, stopOrders: { stopId: string; displayOrder: number; cityGroup?: string | null; dayIndex?: number | null }[]): Promise<TravelStop[]> {
    for (const { stopId, displayOrder, cityGroup, dayIndex } of stopOrders) {
      const updates: Record<string, unknown> = { displayOrder };
      if (cityGroup !== undefined) updates.cityGroup = cityGroup;
      if (dayIndex !== undefined) updates.dayIndex = dayIndex;
      await db.update(travelStops)
        .set(updates as any)
        .where(eq(travelStops.id, stopId));
    }
    return this.getStopsByTripId(tripId);
  }
  
  // Journey Packs
  async createJourneyPack(packData: InsertJourneyPack): Promise<JourneyPack> {
    const [pack] = await db.insert(journeyPacks).values(packData).returning();
    return pack;
  }
  
  async getJourneyPackByStopId(stopId: string): Promise<JourneyPack | undefined> {
    const [pack] = await db.select().from(journeyPacks).where(eq(journeyPacks.stopId, stopId));
    return pack;
  }

  async getJourneyPackByStopName(stopName: string): Promise<JourneyPack | undefined> {
    const normalizedName = stopName.trim().toLowerCase();
    const rows = await db
      .select({ pack: journeyPacks })
      .from(journeyPacks)
      .innerJoin(travelStops, eq(journeyPacks.stopId, travelStops.id))
      .where(sql`lower(trim(${travelStops.name})) = ${normalizedName}`)
      .limit(1);
    return rows[0]?.pack;
  }
  
  async getJourneyPacksByStopIds(stopIds: string[]): Promise<JourneyPack[]> {
    if (stopIds.length === 0) return [];
    return db.select().from(journeyPacks).where(inArray(journeyPacks.stopId, stopIds));
  }
  
  async updateJourneyPack(packId: string, updates: Partial<InsertJourneyPack>): Promise<JourneyPack | undefined> {
    const [pack] = await db.update(journeyPacks).set(updates).where(eq(journeyPacks.id, packId)).returning();
    return pack;
  }
  
  async unlockJourneyGames(packId: string): Promise<JourneyPack | undefined> {
    const [pack] = await db.update(journeyPacks).set({ gamesUnlocked: true }).where(eq(journeyPacks.id, packId)).returning();
    return pack;
  }
  
  // Moments
  async createMoment(momentData: InsertTravelMoment): Promise<TravelMoment> {
    const [moment] = await db.insert(travelMoments).values(momentData).returning();
    return moment;
  }
  
  async getMomentsByTripId(tripId: string): Promise<TravelMoment[]> {
    return await db.select().from(travelMoments).where(eq(travelMoments.tripId, tripId)).orderBy(desc(travelMoments.createdAt));
  }
  
  async getMomentsByTripIds(tripIds: string[]): Promise<TravelMoment[]> {
    if (tripIds.length === 0) return [];
    return await db.select().from(travelMoments).where(inArray(travelMoments.tripId, tripIds)).orderBy(desc(travelMoments.createdAt));
  }
  
  async getMomentSummariesByTripIds(tripIds: string[]): Promise<{tripId: string; isFavorite: boolean | null; photoUrl: string | null; photoUrls: unknown}[]> {
    if (tripIds.length === 0) return [];

    console.time('[Trips] getMomentSummariesByTripIds');
    try {
      // Super-optimized query: Only get the most recent photo for each trip
      // Removed nested subqueries that were causing timeouts in production
      const results = await db.execute(sql`
        SELECT DISTINCT ON (trip_id) 
          trip_id as "tripId",
          is_favorite as "isFavorite",
          photo_url as "photoUrl"
        FROM travel_moments
        WHERE trip_id IN (${sql.join(tripIds.map(id => sql`${id}`), sql`, `)})
          AND photo_url IS NOT NULL
        ORDER BY trip_id, is_favorite DESC, created_at DESC
      `);
      
      console.timeEnd('[Trips] getMomentSummariesByTripIds');
      return results.rows as any;
    } catch (error) {
      console.error('Error in getMomentSummariesByTripIds:', error);
      console.timeEnd('[Trips] getMomentSummariesByTripIds');
      return [];
    }
  }
  
  async getFirstPhotoByTripId(tripId: string): Promise<string | null> {
    const [favMoment] = await db.select({
      photoUrl: travelMoments.photoUrl,
      photoUrls: travelMoments.photoUrls,
    }).from(travelMoments)
      .where(and(eq(travelMoments.tripId, tripId), eq(travelMoments.isFavorite, true)))
      .limit(1);
    
    if (favMoment) {
      if (favMoment.photoUrl) return favMoment.photoUrl;
      const urls = favMoment.photoUrls as string[] | null;
      if (urls && urls.length > 0) return urls[0];
    }
    
    const [anyMoment] = await db.select({
      photoUrl: travelMoments.photoUrl,
      photoUrls: travelMoments.photoUrls,
    }).from(travelMoments)
      .where(eq(travelMoments.tripId, tripId))
      .orderBy(desc(travelMoments.createdAt))
      .limit(1);
    
    if (anyMoment) {
      if (anyMoment.photoUrl) return anyMoment.photoUrl;
      const urls = anyMoment.photoUrls as string[] | null;
      if (urls && urls.length > 0) return urls[0];
    }
    
    return null;
  }
  
  async getFirstPhotoPerTrip(tripIds: string[]): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (tripIds.length === 0) return result;
    
    try {
      // Use PostgreSQL DISTINCT ON for maximum efficiency - only fetches 1 row per trip
      const rows = await db.execute(sql`
        SELECT DISTINCT ON (trip_id) 
          trip_id as "tripId",
          photo_url as "photoUrl"
        FROM travel_moments
        WHERE trip_id IN (${sql.join(tripIds.map(id => sql`${id}`), sql`, `)})
          AND photo_url IS NOT NULL
        ORDER BY trip_id, is_favorite DESC NULLS LAST, created_at DESC
      `);
      
      for (const row of rows.rows as any[]) {
        if (row.photoUrl) {
          result.set(row.tripId, row.photoUrl);
        }
      }
    } catch (error) {
      console.error('Error in getFirstPhotoPerTrip:', error);
    }
    
    return result;
  }
  
  async getMomentsByStopId(stopId: string): Promise<TravelMoment[]> {
    return await db.select().from(travelMoments).where(eq(travelMoments.stopId, stopId)).orderBy(desc(travelMoments.createdAt));
  }
  
  async getMomentById(momentId: string): Promise<TravelMoment | undefined> {
    const [moment] = await db.select().from(travelMoments).where(eq(travelMoments.id, momentId));
    return moment;
  }
  
  async updateMoment(momentId: string, updates: Partial<InsertTravelMoment>): Promise<TravelMoment | undefined> {
    const [moment] = await db.update(travelMoments).set(updates).where(eq(travelMoments.id, momentId)).returning();
    return moment;
  }
  
  async deleteMoment(momentId: string): Promise<boolean> {
    await db.delete(travelMoments).where(eq(travelMoments.id, momentId));
    return true;
  }
  
  // Memory Stars
  async getMemoryStarsByTripId(tripId: string): Promise<MemoryStars[]> {
    return await db.select().from(memoryStars).where(eq(memoryStars.tripId, tripId));
  }
  
  async updateMemoryStars(tripId: string, stopId: string | null, stars: number): Promise<MemoryStars> {
    // Try to find existing record
    const existing = await db.select().from(memoryStars).where(
      stopId 
        ? and(eq(memoryStars.tripId, tripId), eq(memoryStars.stopId, stopId))
        : and(eq(memoryStars.tripId, tripId), isNull(memoryStars.stopId))
    );
    
    if (existing.length > 0) {
      const [updated] = await db.update(memoryStars).set({
        starsEarned: stars,
        lastRecallDate: new Date(),
        recallCount: sql`${memoryStars.recallCount} + 1`,
        memoryStrength: stars >= 2 ? 'strong' : 'fresh',
        updatedAt: new Date(),
      }).where(eq(memoryStars.id, existing[0].id)).returning();
      return updated;
    }
    
    // Create new record
    const [created] = await db.insert(memoryStars).values({
      tripId,
      stopId,
      starsEarned: stars,
      memoryStrength: 'fresh',
    }).returning();
    return created;
  }
  
  // Remember This Cards
  async createRememberThisCard(cardData: InsertRememberThisCard): Promise<RememberThisCard> {
    const [card] = await db.insert(rememberThisCards).values(cardData).returning();
    return card;
  }
  
  async getPendingRememberThisCards(userId: string): Promise<RememberThisCard[]> {
    // Get trips for this user, then get pending cards for those trips
    const userTrips = await this.getTripsByUserId(userId);
    if (userTrips.length === 0) return [];
    
    const tripIds = userTrips.map(t => t.id);
    const now = new Date();
    
    return await db.select().from(rememberThisCards).where(
      and(
        inArray(rememberThisCards.tripId, tripIds),
        eq(rememberThisCards.isAnswered, false),
        gte(rememberThisCards.scheduledFor, now)
      )
    ).orderBy(rememberThisCards.scheduledFor);
  }
  
  async answerRememberThisCard(cardId: string, explorerId: string, quality: string): Promise<RememberThisCard | undefined> {
    const [card] = await db.update(rememberThisCards).set({
      isAnswered: true,
      answeredByExplorerId: explorerId,
      answerQuality: quality,
    }).where(eq(rememberThisCards.id, cardId)).returning();
    return card;
  }
  
  // Wonder Responses
  async createWonderResponse(data: InsertWonderResponse): Promise<WonderResponse> {
    const [response] = await db.insert(travelWonderResponses).values(data).returning();
    return response;
  }
  
  async getWonderResponsesByTripId(tripId: string): Promise<WonderResponse[]> {
    return await db.select().from(travelWonderResponses).where(eq(travelWonderResponses.tripId, tripId));
  }
  
  async getWonderResponsesByStopId(stopId: string): Promise<WonderResponse[]> {
    return await db.select().from(travelWonderResponses).where(eq(travelWonderResponses.stopId, stopId));
  }
  
  // Trail Tales - "Who Am I" riddle game
  async createTrailTalesRiddle(riddle: InsertTrailTalesRiddle): Promise<TrailTalesRiddle> {
    const [created] = await db.insert(trailTalesRiddles).values(riddle).returning();
    return created;
  }
  
  async getRiddlesByTripId(tripId: string): Promise<TrailTalesRiddle[]> {
    return await db.select().from(trailTalesRiddles).where(eq(trailTalesRiddles.tripId, tripId));
  }
  
  async getRiddleById(riddleId: string): Promise<TrailTalesRiddle | undefined> {
    const [riddle] = await db.select().from(trailTalesRiddles).where(eq(trailTalesRiddles.id, riddleId));
    return riddle;
  }
  
  async getUnlockedRiddles(tripId: string): Promise<TrailTalesRiddle[]> {
    return await db.select().from(trailTalesRiddles).where(
      and(
        eq(trailTalesRiddles.tripId, tripId),
        eq(trailTalesRiddles.isUnlocked, true)
      )
    );
  }
  
  async unlockRiddlesForTrip(tripId: string, visitedStopCount: number): Promise<TrailTalesRiddle[]> {
    // Unlock riddles where the stop was visited at least stopsDelayBefore stops ago
    const riddles = await db.select().from(trailTalesRiddles).where(
      and(
        eq(trailTalesRiddles.tripId, tripId),
        eq(trailTalesRiddles.isUnlocked, false)
      )
    );
    
    const stops = await this.getStopsByTripId(tripId);
    const visitedStops = stops.filter(s => s.isVisited);
    const visitedStopIds = new Set(visitedStops.map(s => s.id));
    
    // Find position of each riddle's stop in the visited order
    const unlockedRiddles: TrailTalesRiddle[] = [];
    
    for (const riddle of riddles) {
      // Find the index of this riddle's stop in the visited stops
      const riddleStopIndex = visitedStops.findIndex(s => s.id === riddle.stopId);
      
      if (riddleStopIndex >= 0) {
        // Check if enough stops have been visited after this one
        const stopsVisitedAfter = visitedStopCount - riddleStopIndex - 1;
        const delay = riddle.stopsDelayBefore || 3;
        
        if (stopsVisitedAfter >= delay) {
          // Unlock this riddle
          const [unlocked] = await db.update(trailTalesRiddles).set({
            isUnlocked: true,
            unlockedAt: new Date(),
          }).where(eq(trailTalesRiddles.id, riddle.id)).returning();
          
          if (unlocked) unlockedRiddles.push(unlocked);
        }
      }
    }
    
    return unlockedRiddles;
  }
  
  async unlockAllRiddlesForTrip(tripId: string): Promise<void> {
    await db.update(trailTalesRiddles).set({
      isUnlocked: true,
      unlockedAt: new Date(),
    }).where(
      and(
        eq(trailTalesRiddles.tripId, tripId),
        eq(trailTalesRiddles.isUnlocked, false)
      )
    );
  }
  
  async createTrailTalesAttempt(attempt: InsertTrailTalesAttempt): Promise<TrailTalesAttempt> {
    const [created] = await db.insert(trailTalesAttempts).values(attempt).returning();
    return created;
  }
  
  async getAttemptsByExplorer(tripId: string, explorerId: string): Promise<TrailTalesAttempt[]> {
    return await db.select().from(trailTalesAttempts).where(
      and(
        eq(trailTalesAttempts.tripId, tripId),
        eq(trailTalesAttempts.explorerId, explorerId)
      )
    );
  }
  
  async getOrCreateTrailTalesProgress(tripId: string, explorerId: string): Promise<TrailTalesProgress> {
    const [existing] = await db.select().from(trailTalesProgress).where(
      and(
        eq(trailTalesProgress.tripId, tripId),
        eq(trailTalesProgress.explorerId, explorerId)
      )
    );
    
    if (existing) return existing;
    
    const [created] = await db.insert(trailTalesProgress).values({
      tripId,
      explorerId,
      totalRiddles: 0,
      correctAnswers: 0,
      totalMemoryStars: 0,
      isMemoryChampion: false,
    }).returning();
    
    return created;
  }
  
  async updateTrailTalesProgress(tripId: string, explorerId: string, updates: Partial<InsertTrailTalesProgress>): Promise<TrailTalesProgress | undefined> {
    const [updated] = await db.update(trailTalesProgress).set({
      ...updates,
      updatedAt: new Date(),
    }).where(
      and(
        eq(trailTalesProgress.tripId, tripId),
        eq(trailTalesProgress.explorerId, explorerId)
      )
    ).returning();
    return updated;
  }
  
  // Journey Pack Progress - Persists completed sections (Listen, Wonder, Parent Tips, Games)
  async getJourneyPackProgress(stopId: string, explorerId: string): Promise<JourneyPackProgress | undefined> {
    const [progress] = await db.select().from(journeyPackProgress).where(
      and(
        eq(journeyPackProgress.stopId, stopId),
        eq(journeyPackProgress.explorerId, explorerId)
      )
    );
    return progress;
  }
  
  async saveJourneyPackProgress(data: InsertJourneyPackProgress): Promise<JourneyPackProgress> {
    // Upsert: update if exists, insert if not
    const existing = await this.getJourneyPackProgress(data.stopId, data.explorerId);
    if (existing) {
      const [updated] = await db.update(journeyPackProgress).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(journeyPackProgress.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(journeyPackProgress).values(data).returning();
    return created;
  }
  
  async getAllJourneyPackProgressByTrip(tripId: string, explorerId: string): Promise<JourneyPackProgress[]> {
    return await db.select().from(journeyPackProgress).where(
      and(
        eq(journeyPackProgress.tripId, tripId),
        eq(journeyPackProgress.explorerId, explorerId)
      )
    );
  }
  
  // Trip Stories (Family Lore)
  async createTripStory(data: InsertTripStory): Promise<TripStory> {
    const [story] = await db.insert(travelTripStories).values(data).returning();
    return story;
  }
  
  async getTripStoryByTripId(tripId: string): Promise<TripStory | undefined> {
    const [story] = await db.select().from(travelTripStories).where(eq(travelTripStories.tripId, tripId));
    return story;
  }
  
  async updateTripStory(storyId: string, updates: Partial<InsertTripStory>): Promise<TripStory | undefined> {
    const [story] = await db.update(travelTripStories).set({
      ...updates,
      regeneratedAt: new Date(),
    }).where(eq(travelTripStories.id, storyId)).returning();
    return story;
  }

  async getUserTripJournalEntries(userId: string) {
    const rows = await db
      .select({
        storyId: travelTripStories.id,
        tripId: travelTripStories.tripId,
        title: travelTripStories.title,
        storySummary: travelTripStories.storySummary,
        photoUrls: travelTripStories.photoUrls,
        highlights: travelTripStories.highlights,
        generatedAt: travelTripStories.generatedAt,
        destination: travelTrips.destination,
        name: travelTrips.name,
        memoryAnchor: travelTrips.memoryAnchor,
        travelMonth: travelTrips.travelMonth,
        travelYear: travelTrips.travelYear,
        travelers: travelTrips.travelers,
      })
      .from(travelTripStories)
      .innerJoin(travelTrips, eq(travelTripStories.tripId, travelTrips.id))
      .where(eq(travelTrips.userId, userId))
      .orderBy(desc(travelTripStories.generatedAt));
    type Traveler = { explorerId?: string; name?: string; avatarKey?: string };
    return rows.map(r => ({
      ...r,
      photoUrls: Array.isArray(r.photoUrls) ? (r.photoUrls as string[]) : [],
      highlights: Array.isArray(r.highlights) ? (r.highlights as string[]) : [],
      travelers: Array.isArray(r.travelers) ? (r.travelers as Traveler[]) : [],
    }));
  }

  async getTripReplayData(tripId: string) {
    const stops = await this.getStopsByTripId(tripId);
    const visitedStops = stops
      .filter(s => s.isVisited)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    if (visitedStops.length === 0) return [];
    const stopIds = visitedStops.map(s => s.id);
    const packs = await this.getJourneyPacksByStopIds(stopIds);
    const packsByStopId = new Map(packs.map(p => [p.stopId, p]));
    const moments = await this.getMomentsByTripId(tripId);
    const momentsByStopId = new Map<string, typeof moments>();
    for (const m of moments) {
      if (m.stopId) {
        if (!momentsByStopId.has(m.stopId)) momentsByStopId.set(m.stopId, []);
        momentsByStopId.get(m.stopId)!.push(m);
      }
    }
    return visitedStops.map(stop => {
      const pack = packsByStopId.get(stop.id);
      const stopMoments = momentsByStopId.get(stop.id) || [];
      const photos: string[] = [];
      for (const m of stopMoments) {
        const urls = Array.isArray(m.photoUrls) ? (m.photoUrls as string[]) : [];
        photos.push(...urls.filter(Boolean));
        if (m.photoUrl && !photos.includes(m.photoUrl)) photos.push(m.photoUrl);
      }
      const kidResponses = stopMoments.filter(m => m.kidPromptResponse).map(m => m.kidPromptResponse as string);
      const parentResponses = stopMoments.filter(m => m.parentPromptResponse).map(m => m.parentPromptResponse as string);
      const engagementParts = [...kidResponses.slice(0, 2), ...parentResponses.slice(0, 1)].filter(Boolean);
      const momentSummary = engagementParts.length > 0 ? engagementParts.join(' · ') : null;
      return {
        stopId: stop.id,
        name: stop.name,
        stopType: stop.stopType || 'landmark',
        displayOrder: stop.displayOrder || 0,
        isVisited: stop.isVisited || false,
        storyTitle: pack?.storyTitle || null,
        storyContent: pack?.storyContent || null,
        momentSummary,
        photos: [...new Set(photos)].slice(0, 5),
      };
    });
  }

  // Trip Completion
  async completeTrip(tripId: string): Promise<TravelTrip | undefined> {
    const engagement = await this.calculateTripEngagement(tripId);
    
    const [trip] = await db.update(travelTrips).set({
      status: 'completed',
      completedAt: new Date(),
      engagementScore: engagement.score,
      updatedAt: new Date(),
    }).where(eq(travelTrips.id, tripId)).returning();
    
    return trip;
  }
  
  async calculateTripEngagement(tripId: string): Promise<{ score: number; memoryStrength: string }> {
    const moments = await this.getMomentsByTripId(tripId);
    const wonderResponses = await this.getWonderResponsesByTripId(tripId);
    const stops = await this.getStopsByTripId(tripId);
    const visitedStops = stops.filter(s => s.isVisited);
    
    let score = 0;
    score += moments.length * 20;
    score += wonderResponses.length * 15;
    score += visitedStops.length * 10;
    score += moments.filter(m => m.photoUrl).length * 10;
    score += moments.filter(m => m.kidPromptResponse).length * 5;
    score += moments.filter(m => m.parentPromptResponse).length * 5;
    
    let memoryStrength: string;
    if (score >= 100) {
      memoryStrength = 'strong';
    } else if (score >= 50) {
      memoryStrength = 'medium';
    } else {
      memoryStrength = 'light';
    }
    
    return { score, memoryStrength };
  }
  
  async autoCompleteOldTrips(): Promise<number> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const incompleteTrips = await db.select().from(travelTrips).where(
      and(
        ne(travelTrips.status, 'completed'),
        isNotNull(travelTrips.travelMonth),
        isNotNull(travelTrips.travelYear)
      )
    );
    
    let completedCount = 0;
    
    for (const trip of incompleteTrips) {
      if (!trip.travelMonth || !trip.travelYear) continue;
      
      const tripMonth = trip.travelMonth;
      const tripYear = trip.travelYear;
      
      const currentTotalMonths = currentYear * 12 + currentMonth;
      const tripTotalMonths = tripYear * 12 + tripMonth;
      const monthsDifference = currentTotalMonths - tripTotalMonths;
      
      if (monthsDifference > 1) {
        await this.completeTrip(trip.id);
        completedCount++;
        console.log(`🏁 [Auto-Complete] Trip "${trip.name}" (${tripMonth}/${tripYear}) auto-completed`);
      }
    }
    
    return completedCount;
  }
  
  // Artifacts
  async getArtifactsByStopName(stopName: string): Promise<TravelArtifact[]> {
    return await db.select().from(travelArtifacts).where(eq(travelArtifacts.stopName, stopName)).orderBy(travelArtifacts.displayOrder);
  }
  
  async getAllArtifacts(): Promise<TravelArtifact[]> {
    return await db.select().from(travelArtifacts).orderBy(travelArtifacts.stopName, travelArtifacts.displayOrder);
  }
  
  async seedArtifacts(): Promise<number> {
    const existing = await db.select().from(travelArtifacts);
    const existingKeys = new Set(existing.map(a => `${a.stopName}::${a.name}`));
    
    const newArtifacts = ALL_CURATED_ARTIFACTS
      .filter(a => !existingKeys.has(`${a.stopName}::${a.name}`))
      .map(a => ({
        stopName: a.stopName,
        name: a.name,
        description: a.description,
        imageEmoji: a.imageEmoji,
        rarity: a.rarity,
        unlockType: a.unlockType,
        unlockConfig: 'unlockConfig' in a ? a.unlockConfig : null,
        displayOrder: a.displayOrder,
      }));
    
    if (newArtifacts.length === 0) return 0;
    
    await db.insert(travelArtifacts).values(newArtifacts);
    return newArtifacts.length;
  }
  
  async createArtifact(data: InsertTravelArtifact): Promise<TravelArtifact> {
    const [artifact] = await db.insert(travelArtifacts).values(data).returning();
    return artifact;
  }
  
  async collectArtifact(data: InsertExplorerCollectedArtifact): Promise<ExplorerCollectedArtifact> {
    const [collected] = await db.insert(explorerCollectedArtifacts).values(data).returning();
    return collected;
  }
  
  async getCollectedArtifactsByExplorer(explorerId: string): Promise<(ExplorerCollectedArtifact & { artifact: TravelArtifact })[]> {
    const collected = await db.select().from(explorerCollectedArtifacts).where(eq(explorerCollectedArtifacts.explorerId, explorerId)).orderBy(desc(explorerCollectedArtifacts.collectedAt));
    
    const results: (ExplorerCollectedArtifact & { artifact: TravelArtifact })[] = [];
    for (const c of collected) {
      const [artifact] = await db.select().from(travelArtifacts).where(eq(travelArtifacts.id, c.artifactId));
      if (artifact) {
        results.push({ ...c, artifact });
      }
    }
    return results;
  }
  
  async getCollectedArtifactsByTrip(tripId: string, explorerId: string): Promise<(ExplorerCollectedArtifact & { artifact: TravelArtifact })[]> {
    const collected = await db.select().from(explorerCollectedArtifacts).where(
      and(
        eq(explorerCollectedArtifacts.tripId, tripId),
        eq(explorerCollectedArtifacts.explorerId, explorerId)
      )
    ).orderBy(desc(explorerCollectedArtifacts.collectedAt));
    
    const results: (ExplorerCollectedArtifact & { artifact: TravelArtifact })[] = [];
    for (const c of collected) {
      const [artifact] = await db.select().from(travelArtifacts).where(eq(travelArtifacts.id, c.artifactId));
      if (artifact) {
        results.push({ ...c, artifact });
      }
    }
    return results;
  }
  
  async hasCollectedArtifact(explorerId: string, artifactId: string): Promise<boolean> {
    const [collected] = await db.select().from(explorerCollectedArtifacts).where(
      and(
        eq(explorerCollectedArtifacts.explorerId, explorerId),
        eq(explorerCollectedArtifacts.artifactId, artifactId)
      )
    );
    return !!collected;
  }
  
  // ============================================================================
  // LOCATION STORY CACHE
  // ============================================================================
  
  async getCachedStory(locationName: string, locationType: string, destination: string, ageRange?: string): Promise<LocationStoryCache | undefined> {
    const conditions = [
      eq(locationStoryCache.locationName, locationName),
      eq(locationStoryCache.locationType, locationType),
      eq(locationStoryCache.destination, destination),
    ];
    
    if (ageRange) {
      conditions.push(eq(locationStoryCache.ageRange, ageRange));
    }
    
    const [story] = await db.select().from(locationStoryCache).where(and(...conditions));
    return story;
  }
  
  async cacheStory(data: InsertLocationStoryCache): Promise<LocationStoryCache> {
    const [story] = await db.insert(locationStoryCache).values(data).returning();
    return story;
  }
  
  // ============================================================================
  // EXPLORER IDENTITY TRAITS
  // ============================================================================
  
  async getExplorerIdentityTraits(explorerId: string): Promise<ExplorerIdentityTraits | undefined> {
    const [traits] = await db.select().from(explorerIdentityTraits).where(eq(explorerIdentityTraits.explorerId, explorerId));
    return traits;
  }
  
  async createExplorerIdentityTraits(explorerId: string): Promise<ExplorerIdentityTraits> {
    const [traits] = await db.insert(explorerIdentityTraits).values({
      explorerId,
      natureNoticing: 0,
      questionAsking: 0,
      culturalCuriosity: 0,
      familyConnecting: 0,
      worldExploring: 0,
      storyTelling: 0,
    }).returning();
    return traits;
  }
  
  async incrementIdentityTrait(explorerId: string, trait: 'natureNoticing' | 'questionAsking' | 'culturalCuriosity' | 'familyConnecting' | 'worldExploring' | 'storyTelling', amount: number = 1): Promise<ExplorerIdentityTraits> {
    // First ensure the explorer has traits record
    let existing = await this.getExplorerIdentityTraits(explorerId);
    if (!existing) {
      existing = await this.createExplorerIdentityTraits(explorerId);
    }
    
    // Map trait name to column
    const columnMap = {
      natureNoticing: explorerIdentityTraits.natureNoticing,
      questionAsking: explorerIdentityTraits.questionAsking,
      culturalCuriosity: explorerIdentityTraits.culturalCuriosity,
      familyConnecting: explorerIdentityTraits.familyConnecting,
      worldExploring: explorerIdentityTraits.worldExploring,
      storyTelling: explorerIdentityTraits.storyTelling,
    };
    
    const column = columnMap[trait];
    const [updated] = await db.update(explorerIdentityTraits)
      .set({
        [trait]: sql`COALESCE(${column}, 0) + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(explorerIdentityTraits.explorerId, explorerId))
      .returning();
    
    return updated;
  }
  
  async updateIdentityStatement(explorerId: string, statement: string, dominantTrait: string): Promise<ExplorerIdentityTraits | undefined> {
    const [updated] = await db.update(explorerIdentityTraits)
      .set({
        currentIdentityStatement: statement,
        dominantTrait,
        lastStatementGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(explorerIdentityTraits.explorerId, explorerId))
      .returning();
    return updated;
  }
  
  // ============================================================================
  // GEORELIC PUZZLE SYSTEM
  // ============================================================================
  
  async createPuzzle(puzzle: InsertGeoRelicPuzzle): Promise<GeoRelicPuzzle> {
    const [created] = await db.insert(geoRelicPuzzles).values(puzzle).returning();
    return created;
  }
  
  async getPuzzleById(puzzleId: string): Promise<GeoRelicPuzzle | undefined> {
    const [puzzle] = await db.select().from(geoRelicPuzzles).where(eq(geoRelicPuzzles.id, puzzleId));
    return puzzle;
  }
  
  async getPuzzlesByContinent(continent: string): Promise<GeoRelicPuzzle[]> {
    return db.select().from(geoRelicPuzzles).where(
      and(
        eq(geoRelicPuzzles.mode, 'world'),
        eq(geoRelicPuzzles.continent, continent),
        eq(geoRelicPuzzles.isActive, true)
      )
    ).orderBy(geoRelicPuzzles.displayOrder);
  }
  
  async getPuzzleByStopId(stopId: string): Promise<GeoRelicPuzzle | undefined> {
    const [puzzle] = await db.select().from(geoRelicPuzzles).where(
      and(
        eq(geoRelicPuzzles.mode, 'travel'),
        eq(geoRelicPuzzles.stopId, stopId),
        eq(geoRelicPuzzles.isActive, true)
      )
    );
    return puzzle;
  }
  
  async getWorldModePuzzles(): Promise<GeoRelicPuzzle[]> {
    return db.select().from(geoRelicPuzzles).where(
      and(
        eq(geoRelicPuzzles.mode, 'world'),
        eq(geoRelicPuzzles.isActive, true)
      )
    ).orderBy(geoRelicPuzzles.continent, geoRelicPuzzles.displayOrder);
  }
  
  async getTravelModePuzzles(tripId: string): Promise<GeoRelicPuzzle[]> {
    // Get all stops for the trip
    const stops = await db.select().from(travelStops).where(eq(travelStops.tripId, tripId));
    const stopIds = stops.map(s => s.id);
    
    if (stopIds.length === 0) return [];
    
    return db.select().from(geoRelicPuzzles).where(
      and(
        eq(geoRelicPuzzles.mode, 'travel'),
        inArray(geoRelicPuzzles.stopId!, stopIds),
        eq(geoRelicPuzzles.isActive, true)
      )
    ).orderBy(geoRelicPuzzles.displayOrder);
  }
  
  async createPuzzlePiece(piece: InsertGeoRelicPuzzlePiece): Promise<GeoRelicPuzzlePiece> {
    const [created] = await db.insert(geoRelicPuzzlePieces).values(piece).returning();
    return created;
  }
  
  async getPuzzlePieces(puzzleId: string): Promise<GeoRelicPuzzlePiece[]> {
    return db.select().from(geoRelicPuzzlePieces)
      .where(eq(geoRelicPuzzlePieces.puzzleId, puzzleId))
      .orderBy(geoRelicPuzzlePieces.pieceIndex);
  }
  
  async getPlayerPuzzleProgress(explorerId: string, puzzleId: string): Promise<PlayerPuzzleProgress | undefined> {
    const [progress] = await db.select().from(playerPuzzleProgress).where(
      and(
        eq(playerPuzzleProgress.explorerId, explorerId),
        eq(playerPuzzleProgress.puzzleId, puzzleId)
      )
    );
    return progress;
  }
  
  async getExplorerCompletedPuzzles(explorerId: string): Promise<PlayerPuzzleProgress[]> {
    return db.select().from(playerPuzzleProgress).where(
      and(
        eq(playerPuzzleProgress.explorerId, explorerId),
        eq(playerPuzzleProgress.isCompleted, true)
      )
    ).orderBy(desc(playerPuzzleProgress.completedAt));
  }
  
  async getExplorerContinentProgress(explorerId: string, continent: string): Promise<{ completed: number; total: number }> {
    const allPuzzles = await this.getPuzzlesByContinent(continent);
    const completedPuzzles = await db.select().from(playerPuzzleProgress).where(
      and(
        eq(playerPuzzleProgress.explorerId, explorerId),
        eq(playerPuzzleProgress.isCompleted, true),
        inArray(playerPuzzleProgress.puzzleId, allPuzzles.map(p => p.id))
      )
    );
    
    return {
      completed: completedPuzzles.length,
      total: allPuzzles.length
    };
  }
  
  async savePuzzleProgress(data: InsertPlayerPuzzleProgress): Promise<PlayerPuzzleProgress> {
    // Check if progress already exists
    const existing = await this.getPlayerPuzzleProgress(data.explorerId, data.puzzleId);
    
    if (existing) {
      // Update existing progress
      const [updated] = await db.update(playerPuzzleProgress)
        .set({
          piecesPlaced: data.piecesPlaced,
          updatedAt: new Date()
        })
        .where(eq(playerPuzzleProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new progress
    const [created] = await db.insert(playerPuzzleProgress).values(data).returning();
    return created;
  }
  
  async completePuzzle(explorerId: string, puzzleId: string): Promise<PlayerPuzzleProgress> {
    const existing = await this.getPlayerPuzzleProgress(explorerId, puzzleId);
    const puzzle = await this.getPuzzleById(puzzleId);
    
    const starsToAward = puzzle?.mode === 'world' ? 3 : 0;
    const keepsakeToAward = puzzle?.mode === 'travel';
    
    if (existing) {
      const [updated] = await db.update(playerPuzzleProgress)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          starsAwarded: starsToAward,
          keepsakeAwarded: keepsakeToAward,
          updatedAt: new Date()
        })
        .where(eq(playerPuzzleProgress.id, existing.id))
        .returning();
      
      // Award stars to player in World Mode
      if (starsToAward > 0) {
        const player = await this.getPlayerById(explorerId);
        if (player) {
          await this.updatePlayerStats(explorerId, {
            starsEarnedTotal: (player.starsEarnedTotal || 0) + starsToAward
          });
        }
      }
      
      return updated;
    }
    
    // Create and complete in one go
    const [created] = await db.insert(playerPuzzleProgress).values({
      explorerId,
      puzzleId,
      isCompleted: true,
      completedAt: new Date(),
      starsAwarded: starsToAward,
      keepsakeAwarded: keepsakeToAward
    }).returning();
    
    // Award stars to player in World Mode
    if (starsToAward > 0) {
      const player = await this.getPlayerById(explorerId);
      if (player) {
        await this.updatePlayerStats(explorerId, {
          starsEarnedTotal: (player.starsEarnedTotal || 0) + starsToAward
        });
      }
    }
    
    return created;
  }
  
  // Travel Keepsakes
  async createKeepsake(keepsake: InsertTravelKeepsake): Promise<TravelKeepsake> {
    const [created] = await db.insert(travelKeepsakes).values(keepsake).returning();
    return created;
  }
  
  async getKeepsakeByPuzzleId(puzzleId: string): Promise<TravelKeepsake | undefined> {
    const [keepsake] = await db.select().from(travelKeepsakes).where(eq(travelKeepsakes.puzzleId, puzzleId));
    return keepsake;
  }
  
  async getKeepsakesByStopId(stopId: string): Promise<TravelKeepsake[]> {
    return db.select().from(travelKeepsakes).where(eq(travelKeepsakes.stopId, stopId));
  }
  
  async collectKeepsake(data: InsertExplorerCollectedKeepsake): Promise<ExplorerCollectedKeepsake> {
    const [collected] = await db.insert(explorerCollectedKeepsakes).values(data).returning();
    return collected;
  }
  
  async getExplorerKeepsakes(explorerId: string): Promise<(ExplorerCollectedKeepsake & { keepsake: TravelKeepsake })[]> {
    const collected = await db.select().from(explorerCollectedKeepsakes)
      .where(eq(explorerCollectedKeepsakes.explorerId, explorerId))
      .orderBy(desc(explorerCollectedKeepsakes.collectedAt));
    
    const results: (ExplorerCollectedKeepsake & { keepsake: TravelKeepsake })[] = [];
    for (const c of collected) {
      const [keepsake] = await db.select().from(travelKeepsakes).where(eq(travelKeepsakes.id, c.keepsakeId));
      if (keepsake) {
        results.push({ ...c, keepsake });
      }
    }
    return results;
  }
  
  async getExplorerKeepsakesByTrip(explorerId: string, tripId: string): Promise<(ExplorerCollectedKeepsake & { keepsake: TravelKeepsake })[]> {
    const collected = await db.select().from(explorerCollectedKeepsakes).where(
      and(
        eq(explorerCollectedKeepsakes.explorerId, explorerId),
        eq(explorerCollectedKeepsakes.tripId, tripId)
      )
    ).orderBy(desc(explorerCollectedKeepsakes.collectedAt));
    
    const results: (ExplorerCollectedKeepsake & { keepsake: TravelKeepsake })[] = [];
    for (const c of collected) {
      const [keepsake] = await db.select().from(travelKeepsakes).where(eq(travelKeepsakes.id, c.keepsakeId));
      if (keepsake) {
        results.push({ ...c, keepsake });
      }
    }
    return results;
  }
  
  async hasCollectedKeepsake(explorerId: string, keepsakeId: string): Promise<boolean> {
    const [collected] = await db.select().from(explorerCollectedKeepsakes).where(
      and(
        eq(explorerCollectedKeepsakes.explorerId, explorerId),
        eq(explorerCollectedKeepsakes.keepsakeId, keepsakeId)
      )
    );
    return !!collected;
  }
  
  async seedPuzzles(): Promise<number> {
    const existing = await db.select().from(geoRelicPuzzles);
    if (existing.length > 0) return 0;
    
    // World Mode Puzzles - One per continent for MVP
    const worldPuzzles = [
      {
        id: 'puzzle-europe-colosseum',
        mode: 'world' as const,
        continent: 'Europe',
        title: 'The Colosseum',
        description: 'The ancient Roman amphitheater in Italy',
        imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 3,
        funFact: 'The Colosseum could hold up to 80,000 spectators!',
        displayOrder: 1,
        isActive: true
      },
      {
        id: 'puzzle-asia-great-wall',
        mode: 'world' as const,
        continent: 'Asia',
        title: 'The Great Wall',
        description: 'The legendary wall stretching across China',
        imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 3,
        funFact: 'The Great Wall is over 13,000 miles long!',
        displayOrder: 1,
        isActive: true
      },
      {
        id: 'puzzle-africa-pyramids',
        mode: 'world' as const,
        continent: 'Africa',
        title: 'The Pyramids of Giza',
        description: 'Ancient wonders of Egypt',
        imageUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 3,
        funFact: 'The Great Pyramid was the tallest building for over 3,800 years!',
        displayOrder: 1,
        isActive: true
      },
      {
        id: 'puzzle-north-america-statue-liberty',
        mode: 'world' as const,
        continent: 'North America',
        title: 'Statue of Liberty',
        description: 'The iconic symbol of freedom in New York',
        imageUrl: 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 3,
        funFact: 'The Statue of Liberty was a gift from France in 1886!',
        displayOrder: 1,
        isActive: true
      },
      {
        id: 'puzzle-south-america-machu-picchu',
        mode: 'world' as const,
        continent: 'South America',
        title: 'Machu Picchu',
        description: 'The ancient Incan city in the clouds',
        imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 3,
        funFact: 'Machu Picchu was built over 500 years ago and hidden from the world!',
        displayOrder: 1,
        isActive: true
      },
      {
        id: 'puzzle-oceania-sydney-opera',
        mode: 'world' as const,
        continent: 'Oceania',
        title: 'Sydney Opera House',
        description: 'Australia\'s iconic performance venue',
        imageUrl: 'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 3,
        funFact: 'The Sydney Opera House has over 1 million roof tiles!',
        displayOrder: 1,
        isActive: true
      }
    ];
    
    // Travel Mode Puzzles - Hawaii Big Island stops
    const travelPuzzles = [
      {
        id: 'puzzle-hawaii-volcano',
        mode: 'travel' as const,
        continent: null,
        stopId: null, // Will be linked when stop is created
        title: 'Kilauea Volcano',
        description: 'The most active volcano on Earth',
        imageUrl: 'https://images.unsplash.com/photo-1542375378-9fba6a93c68b?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 0,
        funFact: 'Kilauea has been erupting almost continuously since 1983!',
        displayOrder: 1,
        isActive: true
      },
      {
        id: 'puzzle-hawaii-mauna-kea',
        mode: 'travel' as const,
        continent: null,
        stopId: null,
        title: 'Mauna Kea Observatories',
        description: 'Telescopes atop Hawaii\'s tallest mountain',
        imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 0,
        funFact: 'Mauna Kea is one of the best places in the world to see stars!',
        displayOrder: 2,
        isActive: true
      },
      {
        id: 'puzzle-hawaii-sea-turtle',
        mode: 'travel' as const,
        continent: null,
        stopId: null,
        title: 'Hawaiian Sea Turtle',
        description: 'The beloved honu of Hawaii',
        imageUrl: 'https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=800&h=600&fit=crop',
        pieceCount: 6,
        starsReward: 0,
        funFact: 'Sea turtles can live to be over 80 years old!',
        displayOrder: 3,
        isActive: true
      }
    ];
    
    const allPuzzles = [...worldPuzzles, ...travelPuzzles];
    await db.insert(geoRelicPuzzles).values(allPuzzles);
    
    // Create puzzle pieces for each puzzle (6 pieces in a 3x2 grid)
    const pieceConfigs = [
      { pieceIndex: 0, targetX: 0, targetY: 0, width: 33.33, height: 50 },
      { pieceIndex: 1, targetX: 33.33, targetY: 0, width: 33.33, height: 50 },
      { pieceIndex: 2, targetX: 66.66, targetY: 0, width: 33.34, height: 50 },
      { pieceIndex: 3, targetX: 0, targetY: 50, width: 33.33, height: 50 },
      { pieceIndex: 4, targetX: 33.33, targetY: 50, width: 33.33, height: 50 },
      { pieceIndex: 5, targetX: 66.66, targetY: 50, width: 33.34, height: 50 }
    ];
    
    for (const puzzle of allPuzzles) {
      for (const config of pieceConfigs) {
        await db.insert(geoRelicPuzzlePieces).values({
          puzzleId: puzzle.id,
          pieceIndex: config.pieceIndex,
          imageUrl: puzzle.imageUrl, // Same image, CSS will clip to piece
          targetX: config.targetX,
          targetY: config.targetY,
          width: config.width,
          height: config.height,
          initialX: null,
          initialY: null,
          zIndex: config.pieceIndex
        });
      }
    }
    
    // Create keepsakes for travel puzzles
    const keepsakes = [
      {
        puzzleId: 'puzzle-hawaii-volcano',
        stopId: null,
        name: 'Pele\'s Blessing',
        description: 'A piece of volcanic glass from the goddess of fire',
        emoji: '🌋',
        rarity: 'rare'
      },
      {
        puzzleId: 'puzzle-hawaii-mauna-kea',
        stopId: null,
        name: 'Stargazer\'s Compass',
        description: 'Guides you to the best stargazing spots',
        emoji: '🌟',
        rarity: 'uncommon'
      },
      {
        puzzleId: 'puzzle-hawaii-sea-turtle',
        stopId: null,
        name: 'Honu Shell Fragment',
        description: 'A gift from the ancient sea turtle spirits',
        emoji: '🐢',
        rarity: 'rare'
      }
    ];
    
    for (const keepsake of keepsakes) {
      await db.insert(travelKeepsakes).values(keepsake);
    }
    
    return allPuzzles.length;
  }
  
  // ============================================================================
  // MAP PUZZLE SYSTEM IMPLEMENTATION
  // ============================================================================
  
  async getAllMapPuzzles(): Promise<MapPuzzle[]> {
    return db.select().from(mapPuzzles).where(eq(mapPuzzles.isActive, true)).orderBy(mapPuzzles.displayOrder);
  }
  
  async getMapPuzzleById(puzzleId: string): Promise<MapPuzzle | undefined> {
    const [puzzle] = await db.select().from(mapPuzzles).where(eq(mapPuzzles.id, puzzleId));
    return puzzle;
  }
  
  async getMapPuzzleWithRegions(puzzleId: string): Promise<IMapPuzzleWithRegions | undefined> {
    const puzzle = await this.getMapPuzzleById(puzzleId);
    if (!puzzle) return undefined;
    
    const regions = await this.getMapPuzzleRegions(puzzleId);
    return { ...puzzle, regions };
  }
  
  async getMapPuzzleRegions(puzzleId: string): Promise<MapPuzzleRegion[]> {
    return db.select().from(mapPuzzleRegions)
      .where(eq(mapPuzzleRegions.mapPuzzleId, puzzleId))
      .orderBy(mapPuzzleRegions.displayOrder);
  }
  
  async createMapPuzzle(puzzle: InsertMapPuzzle): Promise<MapPuzzle> {
    const [created] = await db.insert(mapPuzzles).values(puzzle).returning();
    return created;
  }
  
  async createMapPuzzleRegion(region: InsertMapPuzzleRegion): Promise<MapPuzzleRegion> {
    const [created] = await db.insert(mapPuzzleRegions).values(region).returning();
    return created;
  }
  
  async getPlayerMapPuzzleProgress(explorerId: string, puzzleId: string): Promise<PlayerMapPuzzleProgress | undefined> {
    const [progress] = await db.select().from(playerMapPuzzleProgress).where(
      and(
        eq(playerMapPuzzleProgress.explorerId, explorerId),
        eq(playerMapPuzzleProgress.mapPuzzleId, puzzleId)
      )
    );
    return progress;
  }
  
  async savePlayerMapPuzzleProgress(explorerId: string, puzzleId: string, placedRegionIds: string[]): Promise<PlayerMapPuzzleProgress> {
    const existing = await this.getPlayerMapPuzzleProgress(explorerId, puzzleId);
    
    if (existing) {
      const [updated] = await db.update(playerMapPuzzleProgress)
        .set({ placedRegionIds, updatedAt: new Date() })
        .where(eq(playerMapPuzzleProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(playerMapPuzzleProgress).values({
      explorerId,
      mapPuzzleId: puzzleId,
      placedRegionIds
    }).returning();
    return created;
  }
  
  async completeMapPuzzle(explorerId: string, puzzleId: string, starsAwarded: number): Promise<PlayerMapPuzzleProgress> {
    const existing = await this.getPlayerMapPuzzleProgress(explorerId, puzzleId);
    
    if (existing) {
      const [updated] = await db.update(playerMapPuzzleProgress)
        .set({
          isCompleted: true,
          completedAt: new Date(),
          starsAwarded,
          updatedAt: new Date()
        })
        .where(eq(playerMapPuzzleProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    const puzzle = await this.getMapPuzzleById(puzzleId);
    const regions = puzzle ? await this.getMapPuzzleRegions(puzzleId) : [];
    
    const [created] = await db.insert(playerMapPuzzleProgress).values({
      explorerId,
      mapPuzzleId: puzzleId,
      placedRegionIds: regions.map(r => r.id),
      isCompleted: true,
      completedAt: new Date(),
      starsAwarded
    }).returning();
    return created;
  }
  
  async seedMapPuzzles(): Promise<number> {
    const existing = await db.select().from(mapPuzzles);
    if (existing.length > 0) {
      console.log('Map puzzles already seeded');
      return existing.length;
    }
    
    // Create a simple USA map puzzle with 10 states (simplified for MVP)
    const usaPuzzleId = 'map-puzzle-usa';
    await db.insert(mapPuzzles).values({
      id: usaPuzzleId,
      name: 'United States',
      region: 'usa',
      description: 'Learn the 50 states of America!',
      viewBox: '0 0 959 593',
      backgroundColor: '#E3F2FD',
      regionCount: 10,
      difficulty: 'easy',
      ageRange: '4+',
      starsReward: 5,
      displayOrder: 1,
      isActive: true
    });
    
    // Sample US states with simplified SVG paths (subset for MVP)
    const usStates = [
      {
        regionName: 'California',
        regionCode: 'CA',
        svgPath: 'M122.7,385.2l-3.2-23.8l-0.5-2.3l33.3-4.5l13.2-3.3l-4.5,14.4l7.7,15l6,16l8.8,11.8l-1,7.8l-8,7.3l-3.2-2.7l-2-7l-8,0.3l-5.8,5l-3.8,0.2l-3.8-5.3l-4.5-5.5l-2.3-6l-5.5-4l-6-7.5l-4.2-3.2l-2.7-2.7z',
        targetX: 110, targetY: 340,
        width: 70, height: 120,
        fillColor: '#FF7043',
        capital: 'Sacramento',
        funFact: 'California has more people than any other state!',
      },
      {
        regionName: 'Texas',
        regionCode: 'TX',
        svgPath: 'M330.7,422.6l-1.5-7l-4-8l-0.3-10l-2.7-5.5l-1.3-5.5l-3-4l-4.3-2l-2.3-5l2.5-7.3l-2.2-5.3l0.3-11l-1.5-4l35.2-1.7l35.3-1.5l4.3,23.2l4.8,22.8l3.5,7.3l3.8,4.5l1.8,5.2l5.3,6.3l3.7,1l3.5,6l2.7,1.7l0.2,4.3l3.3,5.5l2.2,3l-3.5,7.7l-5.8,12.3l-4.3,1.5l-3-0.3l-3.3,3.8l-8-0.3l-3.8,4l-3.3,1.8l-4,1l-3.8-2l-3.7,0.5l-4-2l-3.5-1.5l-3.3-0.2l-2.5-2l-4.5-3l-5.5,2.3l-5,0.5l-4,4.5l-1.3-2.7l-5.3-0.3l-1.5-2.3l-3.8-0.3l-1-4.5l-1.7-7z',
        targetX: 330, targetY: 380,
        width: 120, height: 110,
        fillColor: '#42A5F5',
        capital: 'Austin',
        funFact: 'Texas is so big, you could fit France inside it!'
      },
      {
        regionName: 'Florida',
        regionCode: 'FL',
        svgPath: 'M690.8,407.8l4.7-5.5l5.5-2.3l5.8,1l2.8,3.8l4.7,6.3l4.3,8l3.2,8.8l3,11.3l0.3,8.8l-0.8,7.3l2,5.5l4.3,6.5l4.7,7.5l1.2,7.5l-0.8,4.8l-4.5,0.5l-2.3,3.2l0.2,3.5l-4.5-0.8l-3.2-5.8l-5.2-6.3l-5.8-11.3l-3.5-6.8l-4.2-5l-4-9.5l-2-4.5l0.8-9l-2-9.5l-3-7.7l-3-1.5l-3.5,2.5l-0.3,7.8l1.3,6.3l3.8,6.3l2.7,4.5l1.3,6l0.3,5l1.5,1.5l0.5,3.8l-3.5,2l-3.3-3l-2.3-5.3l-3.5-7.5l-2.3-7l-4.7-8.5l-3.5-5.5z',
        targetX: 670, targetY: 405,
        width: 80, height: 120,
        fillColor: '#66BB6A',
        capital: 'Tallahassee',
        funFact: 'Florida is home to the only wild flamingos in the US!'
      },
      {
        regionName: 'New York',
        regionCode: 'NY',
        svgPath: 'M788.8,173.5l3.2,1.2l4.8-2.7l1.7,0.2l1.5,3.5l-0.3,3l-2.8,2.7l-0.8,2.2l-1,4l2.7,3.8l0.2,3.5l-2.8,4.8l-3.7,5.8l-3.3,3.5l-3.5,2l-5.8-0.2l-5,1.8l-2.2-0.5l-1-2.3l-3.2-0.8l-4.3,1.5l-4.2,0l-4.3-3.3l-3.5-3l-2.3-0.3l-2.3-3.5l-3.2-5.8l-3.8,0.3l-1.8-1.7l-0.8-3.5l0.8-3.3l-2-1l-3.5,0.5l-0.8-2.5l28.5-6.5l24.7-6l0.5,2l4.7,1.5l3.5-0.8z',
        targetX: 750, targetY: 155,
        width: 60, height: 70,
        fillColor: '#AB47BC',
        capital: 'Albany',
        funFact: 'The Statue of Liberty was a gift from France!'
      },
      {
        regionName: 'Alaska',
        regionCode: 'AK',
        svgPath: 'M158.7,453.6l-3-1.2l-2-1.5l-0.2-2.3l1.2-1.8l2.8-0.8l1.8,0.8l1.7,2.3l0.5,1.8l-0.3,1.5zM183.2,420.6l-0.5,26.5l2.8,3l-1.2,3.8l-4.5,2.7l-4.8-0.5l-1.2-1.2l-0.3-4l2.5-1.5l-0.3-1.2l-4-1l-1.5,1l-2.5,0.7l-4.5,0.8l-2.3,2.3l-0.8,2.5l-2.7,1l-4.3-1.7l-2.3-4.2l-3.3-0.7l-0.7-1.5l-4.3-2.8l-2.5,0.8l-3.5-2.7l-0.2-3.2l3-2.5l-1.8-3.2l-4.5-0.5l-4.3,0.7l-5,1.7l-2.7-0.2l-2.5-3.2l-3.7-3.5l4.3-4.3l2.2-0.3l5,0.5l3.5-2.5l2.2-2.3l4,1l4.5,0.2l3.2-0.8l5.5,2.3l1.5,0l4.5-3.2l3.5,1.5l3.7,0.8l3-1.2l3,1l1.2,2.7l3,0l3,1.5l3.7-0.2l0.3-2.8l1.8-1.3l3.2,0.2l1.7,2z',
        targetX: 130, targetY: 450,
        width: 80, height: 60,
        fillColor: '#26A69A',
        capital: 'Juneau',
        funFact: 'Alaska is bigger than Texas, California, and Montana combined!'
      },
      {
        regionName: 'Hawaii',
        regionCode: 'HI',
        svgPath: 'M233.1,519.3l1.1-1.8l2.3-1.3l1.4,0.2l1.2,1.4l-0.7,1.8l-2.5,0.9l-1.5-0.1zM243.2,515.7l2.7,2.2l1.1-0.1l1.8-2.1l0.1-1.7l-1.9-0.9l-2.6,0.6zM248.7,519.2l1.7,2.8l2-0.1l0.4-1l-0.7-2.3l-1.7-0.4zM256.5,516.6l-1.1,1.9l0.9,1.9l3.1,0.4l3.1-1l1-1.6l-2.6-2.1l-2.5,0.2zM266.8,517l1.7-2l3.6-1.2l2-0.6l1.4,0.8l1.5,1.9l-0.8,1.4l-2.1,1.8l-2.9,0.2l-2-0.5l-1.7,0.3z',
        targetX: 235, targetY: 510,
        width: 50, height: 40,
        fillColor: '#EF5350',
        capital: 'Honolulu',
        funFact: 'Hawaii is the only US state made entirely of islands!'
      },
      {
        regionName: 'Washington',
        regionCode: 'WA',
        svgPath: 'M118.4,62l2.2,5.3l43.5,10l42.8,8.5l-3,14.5l-5.3,22.8l-4-3.5l-4.7-0.3l-1.7,1.7l-4.5,0.2l-1-4.3l-3.2-0.5l-1.5,0.5l-0.5,3l-4.3-0.3l0.2-4l-2-2.8l0-4.3l-2-0.2l-4,3.5l-5.8-0.2l-4.2,1l-4.5-2.8l-2.5-4l-3.5-1l-2.8,0.5l-4.2-1.2l-1.5-3l-4-2l-2.2,0.3l-4.7-1.8l-5.3-3.3l-4-5.5l1-3.8l-3.3-0.5l-2.5-4l1-4.2l-1.5-4.5l1.5-7z',
        targetX: 115, targetY: 60,
        width: 100, height: 80,
        fillColor: '#5C6BC0',
        capital: 'Olympia',
        funFact: 'Washington grows the most apples in the US!'
      },
      {
        regionName: 'Colorado',
        regionCode: 'CO',
        svgPath: 'M286.3,252.5l68.5,4l45.8,1l-4,66.7l-71.2-4.5l-44-4.5l5.8-62.7z',
        targetX: 280, targetY: 255,
        width: 110, height: 70,
        fillColor: '#FFB74D',
        capital: 'Denver',
        funFact: 'Colorado has the highest average elevation of any state!'
      },
      {
        regionName: 'Illinois',
        regionCode: 'IL',
        svgPath: 'M580.6,192.4l0.8,5l3,8.3l-0.2,12.5l-2.3,4.3l-0.7,2.7l1.5,4.5l4.8,6l2.3,3.7l0.2,4.3l-3.3,3.5l-1.5,5.5l0.7,5.8l3.2,6.5l4.8,4l4.3,4.8l0,6.5l-2.8,5l-2.3,2.5l-2-1l-3.5-3.8l-2-0.3l-2.8,2.7l-5.8,1.8l-3.3-2l-2.8-3l-4.5-8.5l-0.5-4.5l2.3-4.8l0-5.2l-1.8-3.3l-0.5-9.3l-1.5-11.2l-0.8-4.2l-4-6.5l-1.5-5.3l2-5l-0.3-3.3l0.7-3.7l4.2-2.5l0.8-4l-0.5-5.3l2.5-3.5l2.5-4l10.7,0.8z',
        targetX: 555, targetY: 200,
        width: 45, height: 110,
        fillColor: '#7986CB',
        capital: 'Springfield',
        funFact: 'Chicago is known as the Windy City!'
      },
      {
        regionName: 'Arizona',
        regionCode: 'AZ',
        svgPath: 'M189.5,328.4l9.2,5.5l38.8,21.8l26.2,14.3l-15.2,74.8l-45.5-9l-35.5-49l-2.3-8l3.7-9.5l1.2-5.8l-2.3-3.8l0.3-3.8l3.5-1l1.2-2.2l5,0l1-2.5l6-0.2l1.5-5.7l4.3-3.5l0-6l-0.8-4.3l1.7-2z',
        targetX: 190, targetY: 340,
        width: 80, height: 100,
        fillColor: '#FFA726',
        capital: 'Phoenix',
        funFact: 'The Grand Canyon is in Arizona and is over a mile deep!'
      }
    ];
    
    for (const state of usStates) {
      await db.insert(mapPuzzleRegions).values({
        mapPuzzleId: usaPuzzleId,
        regionName: state.regionName,
        regionCode: state.regionCode,
        svgPath: state.svgPath,
        targetX: state.targetX,
        targetY: state.targetY,
        width: state.width,
        height: state.height,
        fillColor: state.fillColor,
        strokeColor: '#0288D1',
        capital: state.capital,
        funFact: state.funFact,
        displayOrder: usStates.indexOf(state)
      });
    }
    
    console.log(`Seeded ${usStates.length} US states for map puzzle`);
    return 1;
  }
  
  // ============================================================================
  // ITINERARY SHARING SYSTEM
  // ============================================================================
  
  async createItineraryShare(share: InsertItineraryShare, stops: InsertItineraryShareStop[]): Promise<ItineraryShare> {
    const [created] = await db.insert(itineraryShares).values(share).returning();
    
    // Insert stops with the share ID
    if (stops.length > 0) {
      await db.insert(itineraryShareStops).values(
        stops.map(stop => ({ ...stop, shareId: created.id }))
      );
    }
    
    return created;
  }
  
  async updateItineraryShare(shareId: string, updates: Partial<InsertItineraryShare>, newStops?: InsertItineraryShareStop[]): Promise<ItineraryShare> {
    // Update the share metadata (preserve views, upvotes, etc.)
    const [updated] = await db.update(itineraryShares)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(itineraryShares.id, shareId))
      .returning();
    
    // If new stops are provided, replace all stops
    if (newStops && newStops.length > 0) {
      // Delete old stops
      await db.delete(itineraryShareStops).where(eq(itineraryShareStops.shareId, shareId));
      
      // Insert new stops
      await db.insert(itineraryShareStops).values(
        newStops.map(stop => ({ ...stop, shareId }))
      );
    }
    
    return updated;
  }
  
  async getItineraryShareBySlug(slug: string): Promise<(ItineraryShare & { stops: ItineraryShareStop[] }) | undefined> {
    const [share] = await db.select().from(itineraryShares)
      .where(and(
        eq(itineraryShares.slug, slug),
        eq(itineraryShares.status, 'published')
      ));
    
    if (!share) return undefined;
    
    const stops = await db.select().from(itineraryShareStops)
      .where(eq(itineraryShareStops.shareId, share.id))
      .orderBy(itineraryShareStops.displayOrder);
    
    return { ...share, stops };
  }
  
  async getItineraryShareById(shareId: string): Promise<ItineraryShare | undefined> {
    const [share] = await db.select().from(itineraryShares)
      .where(eq(itineraryShares.id, shareId));
    return share;
  }
  
  async getItineraryShareByTripId(tripId: string): Promise<ItineraryShare | undefined> {
    const [share] = await db.select().from(itineraryShares)
      .where(eq(itineraryShares.tripId, tripId));
    return share;
  }
  
  async getItinerarySharesByDestination(destination: string): Promise<ItineraryShare[]> {
    return await db.select().from(itineraryShares)
      .where(and(
        eq(itineraryShares.destination, destination),
        eq(itineraryShares.status, 'published')
      ))
      .orderBy(desc(itineraryShares.totalUpvotes));
  }
  
  async getPublicItineraryShares(limit: number = 20): Promise<ItineraryShare[]> {
    return await db.select().from(itineraryShares)
      .where(eq(itineraryShares.status, 'published'))
      .orderBy(desc(itineraryShares.publishedAt))
      .limit(limit);
  }
  
  async unpublishItineraryShare(shareId: string): Promise<ItineraryShare | undefined> {
    const [updated] = await db.update(itineraryShares)
      .set({ status: 'unpublished', updatedAt: new Date() })
      .where(eq(itineraryShares.id, shareId))
      .returning();
    return updated;
  }
  
  async deleteItineraryShare(shareId: string): Promise<boolean> {
    // Stops will be deleted automatically via CASCADE
    await db.delete(itineraryShares).where(eq(itineraryShares.id, shareId));
    return true;
  }
  
  async incrementShareViews(shareId: string): Promise<void> {
    await db.update(itineraryShares)
      .set({ totalViews: sql`${itineraryShares.totalViews} + 1` })
      .where(eq(itineraryShares.id, shareId));
  }
  
  async toggleUpvote(shareId: string, visitorId: string): Promise<{ upvoted: boolean; totalUpvotes: number }> {
    const [existing] = await db.select().from(itineraryUpvotes)
      .where(and(
        eq(itineraryUpvotes.shareId, shareId),
        eq(itineraryUpvotes.userId, visitorId)
      ));
    
    if (existing) {
      await db.delete(itineraryUpvotes).where(eq(itineraryUpvotes.id, existing.id));
      await db.update(itineraryShares)
        .set({ totalUpvotes: sql`GREATEST(0, ${itineraryShares.totalUpvotes} - 1)` })
        .where(eq(itineraryShares.id, shareId));
      
      const [share] = await db.select({ totalUpvotes: itineraryShares.totalUpvotes }).from(itineraryShares).where(eq(itineraryShares.id, shareId));
      return { upvoted: false, totalUpvotes: share?.totalUpvotes || 0 };
    } else {
      await db.insert(itineraryUpvotes).values({ shareId, userId: visitorId });
      await db.update(itineraryShares)
        .set({ totalUpvotes: sql`${itineraryShares.totalUpvotes} + 1` })
        .where(eq(itineraryShares.id, shareId));
      
      const [share] = await db.select({ totalUpvotes: itineraryShares.totalUpvotes }).from(itineraryShares).where(eq(itineraryShares.id, shareId));
      return { upvoted: true, totalUpvotes: share?.totalUpvotes || 0 };
    }
  }
  
  async hasUpvoted(shareId: string, visitorId: string): Promise<boolean> {
    const [existing] = await db.select().from(itineraryUpvotes)
      .where(and(
        eq(itineraryUpvotes.shareId, shareId),
        eq(itineraryUpvotes.userId, visitorId)
      ));
    return !!existing;
  }
  
  async copyFromSharedItinerary(shareId: string, userId: string, options?: { travelers?: { name: string; explorerId?: string }[]; travelMonth?: number; travelYear?: number }): Promise<TravelTrip> {
    const [share] = await db.select().from(itineraryShares)
      .where(eq(itineraryShares.id, shareId));
    
    if (!share) {
      throw new Error('Shared itinerary not found');
    }
    
    // Get the original trip to copy country and other details
    const [originalTrip] = await db.select().from(travelTrips)
      .where(eq(travelTrips.id, share.tripId));
    
    const shareStops = await db.select().from(itineraryShareStops)
      .where(eq(itineraryShareStops.shareId, shareId))
      .orderBy(itineraryShareStops.displayOrder);
    
    // Extract traveler names from options
    const travelerNames = options?.travelers?.map(t => t.name) || [];
    
    const [newTrip] = await db.insert(travelTrips).values({
      userId,
      name: share.title || 'Inherited Trip',
      destination: share.destination,
      country: originalTrip?.country || 'Unknown',
      continent: originalTrip?.continent || null,
      city: originalTrip?.city || null,
      travelerNames: travelerNames,
      travelMonth: options?.travelMonth || null,
      travelYear: options?.travelYear || null,
      status: 'upcoming',
    }).returning();
    
    for (const shareStop of shareStops) {
      const [newStop] = await db.insert(travelStops).values({
        tripId: newTrip.id,
        name: shareStop.name,
        stopType: shareStop.locationType || 'landmark',
        displayOrder: shareStop.displayOrder,
        isVisited: false,
      }).returning();
      
      if (shareStop.wonderPrompt) {
        await db.insert(journeyPacks).values({
          stopId: newStop.id,
          wonderPrompt: shareStop.wonderPrompt,
        });
      }
    }
    
    return newTrip;
  }
  
  async getUserBookmarks(userId: string): Promise<{ shareId: string; createdAt: Date | null }[]> {
    const bookmarks = await db.select({
      shareId: itineraryBookmarks.shareId,
      createdAt: itineraryBookmarks.createdAt,
    }).from(itineraryBookmarks)
      .where(eq(itineraryBookmarks.userId, userId))
      .orderBy(desc(itineraryBookmarks.createdAt));
    return bookmarks;
  }
  
  async addBookmark(userId: string, shareId: string): Promise<{ id: string; shareId: string; userId: string }> {
    const [existing] = await db.select().from(itineraryBookmarks)
      .where(and(
        eq(itineraryBookmarks.userId, userId),
        eq(itineraryBookmarks.shareId, shareId)
      ));
    
    if (existing) {
      return existing;
    }
    
    const [bookmark] = await db.insert(itineraryBookmarks).values({
      userId,
      shareId,
    }).returning();
    return bookmark;
  }
  
  async removeBookmark(userId: string, shareId: string): Promise<void> {
    await db.delete(itineraryBookmarks)
      .where(and(
        eq(itineraryBookmarks.userId, userId),
        eq(itineraryBookmarks.shareId, shareId)
      ));
  }
  
  // Comment methods
  async getShareComments(shareId: string): Promise<ItineraryComment[]> {
    const comments = await db.select()
      .from(itineraryComments)
      .where(eq(itineraryComments.shareId, shareId))
      .orderBy(desc(itineraryComments.createdAt));
    return comments;
  }
  
  async addComment(shareId: string, userId: string, authorName: string, content: string): Promise<ItineraryComment> {
    const [comment] = await db.insert(itineraryComments).values({
      shareId,
      userId,
      authorName,
      content,
    }).returning();
    return comment;
  }
  
  async updateComment(commentId: string, userId: string, content: string): Promise<ItineraryComment | undefined> {
    const [comment] = await db.select().from(itineraryComments)
      .where(eq(itineraryComments.id, commentId));
    
    if (!comment || comment.userId !== userId) {
      return undefined;
    }
    
    const [updated] = await db.update(itineraryComments)
      .set({ content, isEdited: true, updatedAt: new Date() })
      .where(eq(itineraryComments.id, commentId))
      .returning();
    return updated;
  }
  
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const [comment] = await db.select().from(itineraryComments)
      .where(eq(itineraryComments.id, commentId));
    
    if (!comment || comment.userId !== userId) {
      return false;
    }
    
    await db.delete(itineraryComments)
      .where(eq(itineraryComments.id, commentId));
    return true;
  }
  
  // ============================================================================
  // TRAVEL TROPHY CABINET - Gamification badges
  // ============================================================================
  
  async getExplorerTravelBadges(explorerId: string): Promise<ExplorerTravelBadge[]> {
    return db.select()
      .from(explorerTravelBadges)
      .where(eq(explorerTravelBadges.explorerId, explorerId));
  }
  
  async getExplorerBadgeStats(explorerId: string, userId: string): Promise<{
    totalTrips: number;
    totalStopsVisited: number;
    totalKeepsakes: number;
    beachStopsVisited: number;
    natureStopsVisited: number;
    cityStopsVisited: number;
    wildlifeStopsVisited: number;
    trailTalesCompleted: number;
  }> {
    // Get trips where the explorer participated as a traveler
    const tripsResult = await db.select({ count: sql<number>`COUNT(DISTINCT ${travelTrips.id})` })
      .from(travelTrips)
      .where(eq(travelTrips.userId, userId));
    const totalTrips = Number(tripsResult[0]?.count || 0);
    
    // Get user's trip IDs first
    const userTrips = await db.select({ id: travelTrips.id })
      .from(travelTrips)
      .where(eq(travelTrips.userId, userId));
    const tripIds = userTrips.map(t => t.id);
    
    if (tripIds.length === 0) {
      return {
        totalTrips: 0,
        totalStopsVisited: 0,
        totalKeepsakes: 0,
        beachStopsVisited: 0,
        natureStopsVisited: 0,
        cityStopsVisited: 0,
        wildlifeStopsVisited: 0,
        trailTalesCompleted: 0,
      };
    }
    
    // Get visited stops by type
    const stopsResult = await db.select({
      stopType: travelStops.stopType,
      count: sql<number>`COUNT(*)`,
    })
      .from(travelStops)
      .where(and(
        inArray(travelStops.tripId, tripIds),
        eq(travelStops.isVisited, true)
      ))
      .groupBy(travelStops.stopType);
    
    let totalStopsVisited = 0;
    let beachStopsVisited = 0;
    let natureStopsVisited = 0;
    let cityStopsVisited = 0;
    let wildlifeStopsVisited = 0;
    
    for (const row of stopsResult) {
      const count = Number(row.count);
      totalStopsVisited += count;
      
      const stopType = row.stopType?.toLowerCase() || '';
      if (stopType === 'beach' || stopType.includes('beach')) {
        beachStopsVisited += count;
      } else if (stopType === 'nature' || stopType.includes('nature') || stopType.includes('park') || stopType.includes('mountain') || stopType.includes('waterfall')) {
        natureStopsVisited += count;
      } else if (stopType === 'city' || stopType === 'landmark' || stopType.includes('town') || stopType.includes('market')) {
        cityStopsVisited += count;
      } else if (stopType.includes('wildlife') || stopType.includes('zoo') || stopType.includes('sanctuary') || stopType.includes('aquarium')) {
        wildlifeStopsVisited += count;
      }
    }
    
    // Get keepsakes collected by explorer
    const keepsakeResult = await db.select({ count: sql<number>`COUNT(*)` })
      .from(explorerCollectedKeepsakes)
      .where(eq(explorerCollectedKeepsakes.explorerId, explorerId));
    const totalKeepsakes = Number(keepsakeResult[0]?.count || 0);
    
    // Get Trail Tales completed
    const trailTalesResult = await db.select({ count: sql<number>`SUM(${trailTalesProgress.correctAnswers})` })
      .from(trailTalesProgress)
      .where(eq(trailTalesProgress.explorerId, explorerId));
    const trailTalesCompleted = Number(trailTalesResult[0]?.count || 0);
    
    return {
      totalTrips,
      totalStopsVisited,
      totalKeepsakes,
      beachStopsVisited,
      natureStopsVisited,
      cityStopsVisited,
      wildlifeStopsVisited,
      trailTalesCompleted,
    };
  }
  
  async updateExplorerBadgeProgress(explorerId: string, categoryId: string, progress: number, tier: string | null): Promise<ExplorerTravelBadge> {
    // Check if badge record exists
    const [existing] = await db.select()
      .from(explorerTravelBadges)
      .where(and(
        eq(explorerTravelBadges.explorerId, explorerId),
        eq(explorerTravelBadges.badgeCategoryId, categoryId)
      ));
    
    const now = new Date();
    const tierTimestampField = tier ? `${tier}EarnedAt` as const : null;
    
    if (existing) {
      // Determine what to update
      const updates: Partial<InsertExplorerTravelBadge> = {
        currentProgress: progress,
        lastProgressUpdate: now,
      };
      
      // Only update tier if it's a new tier being earned
      if (tier && !existing.currentTier) {
        updates.currentTier = tier;
      } else if (tier && existing.currentTier) {
        const tierOrder = ['bronze', 'silver', 'gold', 'legend'];
        if (tierOrder.indexOf(tier) > tierOrder.indexOf(existing.currentTier)) {
          updates.currentTier = tier;
        }
      }
      
      // Set timestamp for newly earned tier
      if (tier === 'bronze' && !existing.bronzeEarnedAt) {
        updates.bronzeEarnedAt = now;
      } else if (tier === 'silver' && !existing.silverEarnedAt) {
        updates.silverEarnedAt = now;
      } else if (tier === 'gold' && !existing.goldEarnedAt) {
        updates.goldEarnedAt = now;
      } else if (tier === 'legend' && !existing.legendEarnedAt) {
        updates.legendEarnedAt = now;
      }
      
      const [updated] = await db.update(explorerTravelBadges)
        .set(updates)
        .where(eq(explorerTravelBadges.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new badge record
    const insertData: InsertExplorerTravelBadge = {
      explorerId,
      badgeCategoryId: categoryId,
      currentProgress: progress,
      currentTier: tier,
      lastProgressUpdate: now,
    };
    
    if (tier === 'bronze') insertData.bronzeEarnedAt = now;
    else if (tier === 'silver') insertData.silverEarnedAt = now;
    else if (tier === 'gold') insertData.goldEarnedAt = now;
    else if (tier === 'legend') insertData.legendEarnedAt = now;
    
    const [created] = await db.insert(explorerTravelBadges)
      .values(insertData)
      .returning();
    return created;
  }

  // ============================================================================
  // EXPERIENCE [CITY] MODULE - Sensory content for destinations
  // ============================================================================

  async getExperienceContent(destinationName: string): Promise<ExperienceContent | undefined> {
    const [content] = await db.select()
      .from(experienceContent)
      .where(eq(experienceContent.destinationName, destinationName));
    return content;
  }

  async createExperienceContent(content: InsertExperienceContent): Promise<ExperienceContent> {
    const [created] = await db.insert(experienceContent)
      .values(content)
      .returning();
    return created;
  }

  async updateExperienceContent(destinationName: string, updates: Partial<InsertExperienceContent>): Promise<ExperienceContent | undefined> {
    const [updated] = await db.update(experienceContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(experienceContent.destinationName, destinationName))
      .returning();
    return updated;
  }

  async getExperienceProgress(explorerId: string, destinationName: string): Promise<ExperienceProgress | undefined> {
    const [progress] = await db.select()
      .from(experienceProgress)
      .where(and(
        eq(experienceProgress.explorerId, explorerId),
        eq(experienceProgress.destinationName, destinationName)
      ));
    return progress;
  }

  async saveExperienceProgress(data: InsertExperienceProgress): Promise<ExperienceProgress> {
    const [created] = await db.insert(experienceProgress)
      .values(data)
      .returning();
    return created;
  }

  async updateExperienceProgress(explorerId: string, destinationName: string, updates: Partial<InsertExperienceProgress>): Promise<ExperienceProgress | undefined> {
    const [updated] = await db.update(experienceProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(experienceProgress.explorerId, explorerId),
        eq(experienceProgress.destinationName, destinationName)
      ))
      .returning();
    return updated;
  }

  async seedExperienceContent(): Promise<number> {
    const SAMPLE_EXPERIENCES = [
      {
        destinationName: "Honolulu",
        country: "United States",
        continent: "North America",
        foodStory: "In Hawaii, poi is more than just food—it's a connection to ancestors. Made from pounded taro root, this purple paste has been enjoyed for over 1,000 years. Families often eat it with their fingers, sharing from one bowl as a symbol of unity.",
        foodTags: ["poi", "taro", "poke", "shave ice", "spam musubi", "loco moco"],
        foodMemoryLine: "I tried purple poi made from taro!",
        localWords: JSON.stringify([
          { word: "Aloha", meaning: "Hello, goodbye, and love", language: "Hawaiian" },
          { word: "Mahalo", meaning: "Thank you", language: "Hawaiian" },
          { word: "Ohana", meaning: "Family (includes friends too)", language: "Hawaiian" }
        ]),
        soundscapeDescription: "Listen to the gentle waves of Waikiki Beach, ukulele strumming in the distance, and the rustle of palm trees in the tropical breeze.",
        hearWonderPrompt: "What sounds would you hear walking along the beach at sunset?",
        everydayLifeSnapshot: "Hawaiian kids often learn hula dancing in school! They grow up swimming in the ocean, eating fresh tropical fruits like pineapple and coconut, and respecting nature through the concept of 'mālama ʻāina' (caring for the land).",
        everydayLifeTags: ["hula", "surfing", "lei making", "beach life", "family gatherings"],
        everydayWonderPrompt: "What would be your favorite part of living on a tropical island?",
        reflectionTags: ["beach", "culture", "food", "music", "nature"]
      },
      {
        destinationName: "Paris",
        country: "France",
        continent: "Europe",
        foodStory: "Every morning in Paris, the smell of freshly baked croissants fills the streets. Bakers wake up at 3am to fold butter into layers of dough, creating those flaky, golden pastries. French kids often stop at the boulangerie before school for a 'pain au chocolat'—a chocolate-filled treat!",
        foodTags: ["croissant", "baguette", "crêpes", "macarons", "cheese", "pain au chocolat"],
        foodMemoryLine: "I imagined eating a warm croissant in Paris!",
        localWords: JSON.stringify([
          { word: "Bonjour", meaning: "Hello / Good morning", language: "French" },
          { word: "Merci", meaning: "Thank you", language: "French" },
          { word: "S'il vous plaît", meaning: "Please", language: "French" }
        ]),
        soundscapeDescription: "The sounds of Paris: accordion music near the Seine, the chatter of café conversations, church bells ringing from Notre-Dame, and bicycles whooshing by on cobblestone streets.",
        hearWonderPrompt: "What instrument would you want to hear playing along the Seine River?",
        everydayLifeSnapshot: "French kids enjoy long lunch breaks at school, sometimes up to 2 hours! They learn to appreciate art by visiting world-famous museums like the Louvre. Families often spend Sundays strolling through parks and enjoying outdoor markets.",
        everydayLifeTags: ["art", "fashion", "cafés", "bicycling", "long lunches"],
        everydayWonderPrompt: "If you could visit one famous painting in a museum, which would it be?",
        reflectionTags: ["art", "food", "architecture", "romance", "history"]
      },
      {
        destinationName: "Tokyo",
        country: "Japan",
        continent: "Asia",
        foodStory: "In Japan, ramen isn't just a meal—it's an art form! Each region has its own style, from creamy Hakata tonkotsu to salty Sapporo miso. Slurping noodles is actually polite here—it shows you're enjoying the food! Kids also love bento boxes packed with cute character-shaped rice balls called 'onigiri'.",
        foodTags: ["ramen", "sushi", "onigiri", "mochi", "takoyaki", "bento"],
        foodMemoryLine: "I learned about colorful bento boxes from Tokyo!",
        localWords: JSON.stringify([
          { word: "Konnichiwa", meaning: "Hello (daytime)", language: "Japanese" },
          { word: "Arigatou", meaning: "Thank you", language: "Japanese" },
          { word: "Kawaii", meaning: "Cute!", language: "Japanese" }
        ]),
        soundscapeDescription: "Tokyo sounds: the melodic jingles of train stations, arcade games beeping, the quiet calm of temple bells, and the busy crossing at Shibuya with thousands of footsteps.",
        hearWonderPrompt: "What sound do you think you'd hear at the world's busiest crosswalk?",
        everydayLifeSnapshot: "Japanese kids help clean their own classrooms! They take off their shoes before entering homes and schools, and many practice calligraphy as part of their studies. Vending machines on every corner sell everything from hot coffee to toy capsules!",
        everydayLifeTags: ["technology", "respect", "cleanliness", "anime", "trains"],
        everydayWonderPrompt: "Would you rather explore a busy Tokyo street or a peaceful Japanese garden?",
        reflectionTags: ["technology", "tradition", "food", "anime", "nature"]
      },
      {
        destinationName: "Singapore",
        country: "Singapore",
        continent: "Asia",
        foodStory: "Singapore is a food paradise where people from many cultures share their favorite dishes! In hawker centers (outdoor food courts), you can try Hainanese chicken rice, spicy laksa noodle soup, or crispy roti prata with curry. The famous chili crab is so delicious that people eat it with their hands, getting messy but happy!",
        foodTags: ["chicken rice", "laksa", "chili crab", "roti prata", "kaya toast", "ice kacang"],
        foodMemoryLine: "I discovered Singapore's amazing hawker food!",
        localWords: JSON.stringify([
          { word: "Lah", meaning: "Added to sentences for emphasis (Singlish)", language: "Singlish" },
          { word: "Shiok", meaning: "Awesome, delicious, fantastic!", language: "Singlish" },
          { word: "Makan", meaning: "Let's eat! (from Malay)", language: "Singlish" }
        ]),
        soundscapeDescription: "Singapore sounds: the sizzle of woks at hawker centers, the gentle splash of the Merlion fountain, tropical birds singing in Gardens by the Bay, and the whoosh of the MRT train gliding through the city.",
        hearWonderPrompt: "What sounds would you hear walking through a futuristic garden with giant metal trees?",
        everydayLifeSnapshot: "Singaporean kids often speak multiple languages—English, Mandarin, Malay, or Tamil! They love visiting the massive Gardens by the Bay with its Supertrees that light up at night. Despite being one of the smallest countries, Singapore has amazing rooftop pools and the world's best airport with a waterfall inside!",
        everydayLifeTags: ["gardens", "technology", "multicultural", "food courts", "cleanliness"],
        everydayWonderPrompt: "Would you rather explore Supertrees at night or swim in a rooftop infinity pool?",
        reflectionTags: ["gardens", "food", "technology", "multicultural", "modern"]
      }
    ];

    let count = 0;
    for (const exp of SAMPLE_EXPERIENCES) {
      const existing = await this.getExperienceContent(exp.destinationName);
      if (!existing) {
        await this.createExperienceContent(exp as InsertExperienceContent);
        count++;
      }
    }
    return count;
  }
  
  // ============================================================================
  // PENDING TRANSFERS
  // ============================================================================
  
  async createPendingTransfer(data: InsertPendingTransfer): Promise<PendingTransfer> {
    const [transfer] = await db.insert(pendingTransfers).values(data).returning();
    return transfer;
  }
  
  async getPendingTransfersByEmail(email: string): Promise<PendingTransfer[]> {
    return await db
      .select()
      .from(pendingTransfers)
      .where(
        and(
          eq(pendingTransfers.email, email.toLowerCase()),
          eq(pendingTransfers.claimed, false),
          gte(pendingTransfers.expiresAt, new Date())
        )
      );
  }
  
  async claimPendingTransfer(transferId: string, claimedByUserId: string): Promise<PendingTransfer | undefined> {
    const [transfer] = await db
      .update(pendingTransfers)
      .set({
        claimed: true,
        claimedByUserId,
        claimedAt: new Date(),
      })
      .where(eq(pendingTransfers.id, transferId))
      .returning();
    return transfer;
  }
  
  async markTransferInvitationSent(transferId: string): Promise<PendingTransfer | undefined> {
    const [transfer] = await db
      .update(pendingTransfers)
      .set({
        invitationSent: true,
        invitationSentAt: new Date(),
      })
      .where(eq(pendingTransfers.id, transferId))
      .returning();
    return transfer;
  }
  
  async updatePendingTransferStats(
    email: string,
    playerName: string,
    stats: { stars: number; cardIds: string[]; gamesPlayed: number }
  ): Promise<PendingTransfer | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = playerName.toLowerCase().trim().replace(/\s+/g, ' '); // Collapse multiple spaces
    
    // Find the pending transfer for this player/email combo - filter by both in SQL
    // Use regexp_replace to collapse multiple spaces for consistent matching
    const [existing] = await db
      .select()
      .from(pendingTransfers)
      .where(
        and(
          eq(pendingTransfers.email, normalizedEmail),
          sql`LOWER(TRIM(regexp_replace(${pendingTransfers.playerName}, '\\s+', ' ', 'g'))) = ${normalizedName}`,
          eq(pendingTransfers.claimed, false),
          gte(pendingTransfers.expiresAt, new Date())
        )
      );
    
    if (!existing) {
      return undefined;
    }
    
    // Merge with existing stats
    const existingStats = (existing.sessionStats as { stars?: number; cardIds?: string[]; gamesPlayed?: number } | null) || {};
    const mergedStats = {
      stars: (existingStats.stars || 0) + stats.stars,
      cardIds: [...(existingStats.cardIds || []), ...stats.cardIds],
      gamesPlayed: (existingStats.gamesPlayed || 0) + stats.gamesPlayed,
    };
    
    const [updated] = await db
      .update(pendingTransfers)
      .set({ sessionStats: mergedStats })
      .where(eq(pendingTransfers.id, existing.id))
      .returning();
    
    return updated;
  }
  
  async cleanupExpiredTransfers(): Promise<number> {
    const result = await db
      .delete(pendingTransfers)
      .where(
        and(
          eq(pendingTransfers.claimed, false),
          sql`${pendingTransfers.expiresAt} < NOW()`
        )
      );
    return result.rowCount || 0;
  }
  
  // ============================================================================
  // FOUNDING FAMILIES PROGRAM
  // ============================================================================
  
  async getFoundingFamilyCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isFoundingFamily, true));
    return Number(result[0]?.count) || 0;
  }
  
  async getNextFoundingFamilyNumber(): Promise<number | null> {
    const FOUNDING_FAMILY_CAP = 100;
    const count = await this.getFoundingFamilyCount();
    if (count >= FOUNDING_FAMILY_CAP) {
      return null;
    }
    return count + 1;
  }
  
  async enrollFoundingFamily(userId: string, freeCityId?: string): Promise<User | undefined> {
    const nextNumber = await this.getNextFoundingFamilyNumber();
    if (nextNumber === null) {
      return undefined;
    }
    
    const priceLockExpiry = new Date();
    priceLockExpiry.setFullYear(priceLockExpiry.getFullYear() + 1);
    
    const [updated] = await db
      .update(users)
      .set({
        isFoundingFamily: true,
        foundingFamilyNumber: nextNumber,
        foundingPriceLockExpiry: priceLockExpiry,
        foundingFreeCityId: freeCityId || null,
        subscriptionTier: 'founding',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updated;
  }
  
  async getFoundingFamilies(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.isFoundingFamily, true))
      .orderBy(users.foundingFamilyNumber);
  }
  
  async getFoundingFamiliesNeedingPriceLockEmails(): Promise<{
    need30DayEmail: User[];
    need7DayEmail: User[];
    needExpiredEmail: User[];
  }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const allFoundingFamilies = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isFoundingFamily, true),
          isNotNull(users.foundingPriceLockExpiry)
        )
      );
    
    const need30DayEmail: User[] = [];
    const need7DayEmail: User[] = [];
    const needExpiredEmail: User[] = [];
    
    for (const family of allFoundingFamilies) {
      if (!family.foundingPriceLockExpiry || !family.email) continue;
      
      const expiry = new Date(family.foundingPriceLockExpiry);
      
      if (expiry <= now && !family.priceLockExpiredSentAt) {
        needExpiredEmail.push(family);
      } else if (expiry <= sevenDaysFromNow && expiry > now && !family.priceLock7DaySentAt) {
        need7DayEmail.push(family);
      } else if (expiry <= thirtyDaysFromNow && expiry > sevenDaysFromNow && !family.priceLock30DaySentAt) {
        need30DayEmail.push(family);
      }
    }
    
    return { need30DayEmail, need7DayEmail, needExpiredEmail };
  }
  
  async markPriceLock30DayEmailSent(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ priceLock30DaySentAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async markPriceLock7DayEmailSent(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ priceLock7DaySentAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async markPriceLockExpiredEmailSent(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ priceLockExpiredSentAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  // === Subscription Management Methods ===
  
  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, customerId));
    return user;
  }
  
  async updateUserSubscription(userId: string, data: {
    subscriptionTier?: string;
    stripeSubscriptionId?: string | null;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    isFoundingFamily?: boolean;
    foundingFamilyNumber?: number | null;
    foundingPriceLockExpiry?: Date;
  }): Promise<void> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.subscriptionTier !== undefined) updateData.subscriptionTier = data.subscriptionTier;
    if (data.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = data.stripeSubscriptionId;
    if (data.subscriptionStartDate !== undefined) updateData.subscriptionStartDate = data.subscriptionStartDate;
    if (data.subscriptionEndDate !== undefined) updateData.subscriptionEndDate = data.subscriptionEndDate;
    if (data.isFoundingFamily !== undefined) updateData.isFoundingFamily = data.isFoundingFamily;
    if (data.foundingFamilyNumber !== undefined) updateData.foundingFamilyNumber = data.foundingFamilyNumber;
    if (data.foundingPriceLockExpiry !== undefined) updateData.foundingPriceLockExpiry = data.foundingPriceLockExpiry;
    
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }
  
  async setPaymentGracePeriod(userId: string, graceEndDate: Date): Promise<void> {
    await db
      .update(users)
      .set({ paymentGraceEndDate: graceEndDate, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async clearPaymentGracePeriod(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ paymentGraceEndDate: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async lockBillingCurrency(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ billingCurrencyLocked: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async claimFoundingFamilyNumber(userId: string): Promise<number | null> {
    // Use a transaction with FOR UPDATE to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Get current max founding family number with lock
      const maxResult = await tx
        .select({ maxNum: sql<number>`COALESCE(MAX(founding_family_number), 0)` })
        .from(users)
        .where(eq(users.isFoundingFamily, true));
      
      const currentMax = maxResult[0]?.maxNum || 0;
      
      // Check if we're at the cap (100)
      if (currentMax >= 100) {
        return null;
      }
      
      const newNumber = currentMax + 1;
      
      // Assign the number to the user
      await tx
        .update(users)
        .set({ foundingFamilyNumber: newNumber, updatedAt: new Date() })
        .where(eq(users.id, userId));
      
      return newNumber;
    });
    
    return result;
  }
  
  // ============================================================================
  // PUSH NOTIFICATIONS
  // ============================================================================
  
  async createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    // First check if subscription with same endpoint exists
    const existing = await this.getPushSubscriptionByEndpoint(data.endpoint);
    if (existing) {
      // Update the existing subscription
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          ...data,
          lastUsedAt: new Date(),
          isActive: true,
        })
        .where(eq(pushSubscriptions.endpoint, data.endpoint))
        .returning();
      return updated;
    }
    
    const [subscription] = await db.insert(pushSubscriptions).values(data).returning();
    return subscription;
  }
  
  async getPushSubscriptionsByUserId(userId: string): Promise<PushSubscription[]> {
    return db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));
  }
  
  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return subscription;
  }
  
  async updatePushSubscription(subscriptionId: string, updates: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined> {
    const [updated] = await db
      .update(pushSubscriptions)
      .set(updates)
      .where(eq(pushSubscriptions.id, subscriptionId))
      .returning();
    return updated;
  }
  
  async deletePushSubscription(subscriptionId: string): Promise<boolean> {
    const result = await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.id, subscriptionId));
    return true;
  }
  
  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return true;
  }
  
  async getActiveSubscriptionsForDailyReminders(): Promise<PushSubscription[]> {
    return db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.isActive, true),
        eq(pushSubscriptions.dailyQuestReminders, true)
      ));
  }
  
  async getActiveSubscriptionsForStreakProtection(): Promise<(PushSubscription & { player: Player })[]> {
    const results = await db
      .select()
      .from(pushSubscriptions)
      .innerJoin(players, eq(pushSubscriptions.playerId, players.id))
      .where(and(
        eq(pushSubscriptions.isActive, true),
        eq(pushSubscriptions.streakProtectionAlerts, true),
        isNotNull(pushSubscriptions.playerId)
      ));
    
    return results.map(r => ({
      ...r.push_subscriptions,
      player: r.players
    }));
  }
  
  async getAllWeeklyPushSubscriptions(): Promise<PushSubscription[]> {
    return db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.isActive, true),
        eq(pushSubscriptions.weeklyProgressUpdates, true)
      ));
  }

  async getActiveMonthlySubscriptions(): Promise<PushSubscription[]> {
    return db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.isActive, true),
        eq(pushSubscriptions.monthlyUpdates, true)
      ));
  }

  // ============================================================================
  // PHYSICAL CARD GAME EARLY ACCESS
  // ============================================================================

  async getPhysicalGameEligibility(userId: string): Promise<{
    isEligible: boolean;
    hasJoined: boolean;
    impressionCount: number;
    lastDismissedDate: Date | null;
    totalGamesPlayed: number;
    guessAndGoWins: number;
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return {
        isEligible: false,
        hasJoined: false,
        impressionCount: 0,
        lastDismissedDate: null,
        totalGamesPlayed: 0,
        guessAndGoWins: 0,
      };
    }

    const userPlayers = await this.getPlayersByUserId(userId);
    
    let totalGamesPlayed = 0;
    let guessAndGoWins = 0;
    
    for (const player of userPlayers) {
      const gameStats = await this.getPlayerGameStats(player.id);
      for (const stat of gameStats) {
        totalGamesPlayed += stat.totalGames || 0;
        if (stat.gameType === 'guess_and_go') {
          guessAndGoWins += stat.wins || 0;
        }
      }
      totalGamesPlayed += player.gamesPlayed || 0;
    }

    const hasMinimumGames = totalGamesPlayed >= 10;
    const hasGuessAndGoWins = guessAndGoWins >= 2;
    const hasJoined = user.physicalGameEarlyAccess === true;
    const impressionCount = user.physicalGamePopupImpressions || 0;
    const lastDismissedDate = user.physicalGameDismissedDate || null;
    
    let isWithin14Days = false;
    if (lastDismissedDate) {
      const daysSinceDismiss = Math.floor(
        (Date.now() - lastDismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      isWithin14Days = daysSinceDismiss < 14;
    }

    const isEligible = hasMinimumGames && hasGuessAndGoWins && !hasJoined && impressionCount < 2 && !isWithin14Days;

    return {
      isEligible,
      hasJoined,
      impressionCount,
      lastDismissedDate,
      totalGamesPlayed,
      guessAndGoWins,
    };
  }

  async recordPhysicalGamePopupImpression(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    await db
      .update(users)
      .set({
        physicalGamePopupImpressions: (user.physicalGamePopupImpressions || 0) + 1,
        physicalGameLastPopupDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async joinPhysicalGameEarlyAccess(userId: string, name: string, email: string): Promise<{ user: User | undefined; waitlistNumber: number }> {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 4);

    // Get current waitlist count for waitlist number
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.physicalGameEarlyAccess, true));
    const waitlistNumber = (countResult[0]?.count || 0) + 1;

    const [updated] = await db
      .update(users)
      .set({
        physicalGameEarlyAccess: true,
        physicalGameEarlyAccessDate: new Date(),
        physicalGameEarlyAccessName: name,
        physicalGameEarlyAccessEmail: email,
        physicalGameWaitlistNumber: waitlistNumber,
        physicalGamePopupImpressions: sql`COALESCE(${users.physicalGamePopupImpressions}, 0) + 1`,
        physicalGameEmailScheduledFor: scheduledDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return { user: updated, waitlistNumber };
  }
  
  async getPhysicalGameWaitlistCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.physicalGameEarlyAccess, true));
    return result[0]?.count || 0;
  }

  async dismissPhysicalGamePopup(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    await db
      .update(users)
      .set({
        physicalGamePopupImpressions: (user.physicalGamePopupImpressions || 0) + 1,
        physicalGameDismissedDate: new Date(),
        physicalGameLastPopupDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUsersForPhysicalGameEmail(): Promise<User[]> {
    const now = new Date();
    return db
      .select()
      .from(users)
      .where(and(
        eq(users.physicalGameEarlyAccess, true),
        isNotNull(users.physicalGameEmailScheduledFor),
        sql`${users.physicalGameEmailScheduledFor} <= ${now}`,
        sql`${users.physicalGameEmailSentAt} IS NULL`
      ));
  }

  async markPhysicalGameEmailSent(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        physicalGameEmailSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Parent Reviews
  async createParentReview(review: InsertParentReview, isApproved: boolean = false): Promise<ParentReview> {
    const [created] = await db.insert(parentReviews).values({
      ...review,
      isApproved,
      approvedAt: isApproved ? new Date() : null,
    }).returning();
    return created;
  }

  async getApprovedReviews(modeFilter?: string): Promise<ParentReview[]> {
    if (modeFilter && modeFilter !== 'all') {
      return db
        .select()
        .from(parentReviews)
        .where(and(
          eq(parentReviews.isApproved, true),
          or(
            eq(parentReviews.modeTag, modeFilter),
            eq(parentReviews.modeTag, 'both')
          )
        ))
        .orderBy(desc(parentReviews.createdAt));
    }
    return db
      .select()
      .from(parentReviews)
      .where(eq(parentReviews.isApproved, true))
      .orderBy(desc(parentReviews.createdAt));
  }

  async getAllReviews(): Promise<ParentReview[]> {
    return db
      .select()
      .from(parentReviews)
      .orderBy(desc(parentReviews.createdAt));
  }

  async approveReview(reviewId: string): Promise<ParentReview | undefined> {
    const [updated] = await db
      .update(parentReviews)
      .set({
        isApproved: true,
        approvedAt: new Date(),
      })
      .where(eq(parentReviews.id, reviewId))
      .returning();
    return updated;
  }

  async deleteReview(reviewId: string): Promise<void> {
    await db.delete(parentReviews).where(eq(parentReviews.id, reviewId));
  }

  // User Feedback
  async createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback> {
    const [created] = await db.insert(userFeedback).values(feedback).returning();
    return created;
  }

  async getAllFeedback(): Promise<UserFeedback[]> {
    return db
      .select()
      .from(userFeedback)
      .orderBy(desc(userFeedback.createdAt));
  }

  async markFeedbackRead(feedbackId: string): Promise<UserFeedback | undefined> {
    const [updated] = await db
      .update(userFeedback)
      .set({ isRead: true })
      .where(eq(userFeedback.id, feedbackId))
      .returning();
    return updated;
  }

  async getCityAdventureTemplate(cityName: string, country: string): Promise<CityAdventureTemplate | undefined> {
    const normalizedCity = cityName.toLowerCase().trim();
    const normalizedCountry = country?.toLowerCase().trim();
    if (normalizedCountry) {
      const [exact] = await db
        .select()
        .from(cityAdventureTemplates)
        .where(and(
          sql`lower(${cityAdventureTemplates.cityName}) = ${normalizedCity}`,
          sql`lower(${cityAdventureTemplates.country}) = ${normalizedCountry}`
        ));
      if (exact) return exact;
    }
    const [fallback] = await db
      .select()
      .from(cityAdventureTemplates)
      .where(sql`lower(${cityAdventureTemplates.cityName}) = ${normalizedCity}`);
    return fallback;
  }

  async getCityAdventureTemplateBySlug(slug: string): Promise<CityAdventureTemplate | undefined> {
    const [template] = await db
      .select()
      .from(cityAdventureTemplates)
      .where(eq(cityAdventureTemplates.citySlug, slug));
    return template;
  }

  async upsertCityAdventureTemplate(data: InsertCityAdventureTemplate): Promise<CityAdventureTemplate> {
    const [result] = await db
      .insert(cityAdventureTemplates)
      .values({ ...data, generatedAt: new Date() })
      .onConflictDoUpdate({
        target: cityAdventureTemplates.citySlug,
        set: {
          cityName: data.cityName,
          country: data.country,
          continent: data.continent,
          latitude: data.latitude,
          longitude: data.longitude,
          stopCount: data.stopCount,
          adventureStyle: data.adventureStyle,
          stopsData: data.stopsData,
          keepsakesData: data.keepsakesData,
          generatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getAllCityAdventureTemplates(): Promise<CityAdventureTemplate[]> {
    return db.select().from(cityAdventureTemplates).orderBy(cityAdventureTemplates.cityName);
  }

  async deleteCityAdventureTemplate(slug: string): Promise<boolean> {
    const result = await db
      .delete(cityAdventureTemplates)
      .where(eq(cityAdventureTemplates.citySlug, slug));
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================================================
  // COMPASS QUEST CHALLENGE SYSTEM
  // ============================================================================

  async upsertCompassQuest(data: InsertCompassQuest): Promise<CompassQuest> {
    const existing = await this.getCompassQuestByKey(data.questKey);
    if (existing) {
      const [updated] = await db
        .update(compassQuests)
        .set({ title: data.title, subtitle: data.subtitle, icon: data.icon, description: data.description, startCity: data.startCity, cities: data.cities, stepsJson: data.stepsJson, isCustom: data.isCustom })
        .where(eq(compassQuests.questKey, data.questKey))
        .returning();
      return updated;
    }
    const [created] = await db.insert(compassQuests).values(data).returning();
    return created;
  }

  async getCompassQuestByKey(questKey: string): Promise<CompassQuest | undefined> {
    const [quest] = await db.select().from(compassQuests).where(eq(compassQuests.questKey, questKey));
    return quest;
  }

  async createCompassAttempt(data: InsertCompassAttempt): Promise<CompassAttempt> {
    const [attempt] = await db.insert(compassAttempts).values(data).returning();
    return attempt;
  }

  async completeCompassAttempt(attemptId: string, xp: number, timeMs: number, wrongGuesses: number, accuracy: number): Promise<CompassAttempt | undefined> {
    const [updated] = await db
      .update(compassAttempts)
      .set({ xp, timeMs, wrongGuesses, accuracy, completed: true, completedAt: new Date() })
      .where(eq(compassAttempts.id, attemptId))
      .returning();
    return updated;
  }

  async getCompassAttemptById(attemptId: string): Promise<CompassAttempt | undefined> {
    const [attempt] = await db.select().from(compassAttempts).where(eq(compassAttempts.id, attemptId));
    return attempt;
  }

  async createCompassChallenge(data: InsertCompassChallenge): Promise<CompassChallenge> {
    const [challenge] = await db.insert(compassChallenges).values(data).returning();
    return challenge;
  }

  async getCompassChallengeByCode(shareCode: string): Promise<(CompassChallenge & { quest: CompassQuest; creatorAttempt: CompassAttempt }) | undefined> {
    const [challenge] = await db
      .select()
      .from(compassChallenges)
      .where(eq(compassChallenges.shareCode, shareCode));
    if (!challenge) return undefined;
    const [quest] = await db.select().from(compassQuests).where(eq(compassQuests.id, challenge.questId));
    const [creatorAttempt] = await db.select().from(compassAttempts).where(eq(compassAttempts.id, challenge.creatorAttemptId));
    if (!quest || !creatorAttempt) return undefined;
    return { ...challenge, quest, creatorAttempt };
  }

  async compareCompassAttempts(shareCode: string, challengerAttemptId: string): Promise<{
    creator: CompassAttempt;
    challenger: CompassAttempt;
    quest: CompassQuest;
    winner: 'creator' | 'challenger' | 'draw';
  } | undefined> {
    const challengeData = await this.getCompassChallengeByCode(shareCode);
    if (!challengeData) return undefined;
    const challenger = await this.getCompassAttemptById(challengerAttemptId);
    if (!challenger) return undefined;
    const creator = challengeData.creatorAttempt;
    const quest = challengeData.quest;
    const creatorXp = creator.xp ?? 0;
    const challengerXp = challenger.xp ?? 0;
    let winner: 'creator' | 'challenger' | 'draw';
    if (challengerXp > creatorXp) {
      winner = 'challenger';
    } else if (creatorXp > challengerXp) {
      winner = 'creator';
    } else {
      const creatorTime = creator.timeMs ?? Infinity;
      const challengerTime = challenger.timeMs ?? Infinity;
      if (challengerTime < creatorTime) {
        winner = 'challenger';
      } else if (creatorTime < challengerTime) {
        winner = 'creator';
      } else {
        const creatorAcc = creator.accuracy ?? 0;
        const challengerAcc = challenger.accuracy ?? 0;
        if (challengerAcc > creatorAcc) winner = 'challenger';
        else if (creatorAcc > challengerAcc) winner = 'creator';
        else winner = 'draw';
      }
    }
    return { creator, challenger, quest, winner };
  }

  // ── Trip Anchors ────────────────────────────────────────────────────────────

  async getAnchorsByTripId(tripId: string): Promise<TripAnchor[]> {
    return db.select().from(tripAnchors).where(eq(tripAnchors.tripId, tripId)).orderBy(tripAnchors.day, tripAnchors.time);
  }

  async createAnchor(data: InsertTripAnchor): Promise<TripAnchor> {
    const [anchor] = await db.insert(tripAnchors).values(data).returning();
    return anchor;
  }

  async updateAnchor(anchorId: string, updates: Partial<Pick<InsertTripAnchor, 'day' | 'time' | 'durationMinutes' | 'notes' | 'flexibility'>>): Promise<TripAnchor> {
    const [anchor] = await db.update(tripAnchors).set(updates).where(eq(tripAnchors.id, anchorId)).returning();
    return anchor;
  }

  async deleteAnchor(anchorId: string): Promise<void> {
    await db.delete(tripAnchors).where(eq(tripAnchors.id, anchorId));
  }

  // ── City Stop Pool Cache ─────────────────────────────────────────────────────

  async getCityStopPool(city: string, country: string): Promise<CityStopPoolCache | undefined> {
    const normalizedKey = `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
    const [row] = await db.select().from(cityStopPoolCache).where(eq(cityStopPoolCache.normalizedKey, normalizedKey)).limit(1);
    return row;
  }

  async saveCityStopPool(entry: InsertCityStopPoolCache): Promise<CityStopPoolCache> {
    const [row] = await db
      .insert(cityStopPoolCache)
      .values(entry)
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    const [existing] = await db.select().from(cityStopPoolCache).where(eq(cityStopPoolCache.normalizedKey, entry.normalizedKey)).limit(1);
    return existing;
  }

  // ============================================================================
  // TRIP UNLOCKS — per-trip one-time payments
  // ============================================================================

  async createTripUnlock(unlock: InsertTripUnlock): Promise<TripUnlock> {
    const [row] = await db.insert(tripUnlocks).values(unlock).returning();
    return row;
  }

  async getTripUnlock(userId: string, tripId: string): Promise<TripUnlock | undefined> {
    const [row] = await db
      .select()
      .from(tripUnlocks)
      .where(and(
        eq(tripUnlocks.userId, userId),
        eq(tripUnlocks.tripId, tripId),
        eq(tripUnlocks.status, "active"),
      ))
      .orderBy(desc(tripUnlocks.createdAt))
      .limit(1);
    return row;
  }

  async getTripUnlockBySessionId(sessionId: string): Promise<TripUnlock | undefined> {
    const [row] = await db
      .select()
      .from(tripUnlocks)
      .where(eq(tripUnlocks.stripeSessionId, sessionId))
      .limit(1);
    return row;
  }

  async activateTripUnlock(sessionId: string): Promise<void> {
    await db
      .update(tripUnlocks)
      .set({ status: "active", unlockedAt: new Date() })
      .where(eq(tripUnlocks.stripeSessionId, sessionId));
  }

  async getUserTripUnlocks(userId: string): Promise<TripUnlock[]> {
    return db
      .select()
      .from(tripUnlocks)
      .where(and(eq(tripUnlocks.userId, userId), eq(tripUnlocks.status, "active")))
      .orderBy(desc(tripUnlocks.createdAt));
  }

  // ── PROMO CODES ─────────────────────────────────────────────────────────────

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    const [row] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase().trim()));
    return row;
  }

  async getPromoCodeById(id: string): Promise<PromoCode | undefined> {
    const [row] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return row;
  }

  async listPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const [row] = await db.insert(promoCodes).values({
      ...data,
      code: data.code.toUpperCase().trim(),
    }).returning();
    return row;
  }

  async updatePromoCode(id: string, data: Partial<InsertPromoCode>): Promise<PromoCode> {
    const [row] = await db
      .update(promoCodes)
      .set({ ...data })
      .where(eq(promoCodes.id, id))
      .returning();
    return row;
  }

  async incrementPromoCodeUsage(codeId: string): Promise<void> {
    await db
      .update(promoCodes)
      .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
      .where(eq(promoCodes.id, codeId));
  }

  // ── PROMO REDEMPTIONS ────────────────────────────────────────────────────────

  async getPromoRedemption(codeId: string, userId: string): Promise<PromoRedemption | undefined> {
    // Returns the most recent redemption for (codeId, userId) pair.
    // No unique DB constraint — oneUsePerUser is enforced at application level.
    const [row] = await db
      .select()
      .from(promoRedemptions)
      .where(and(eq(promoRedemptions.codeId, codeId), eq(promoRedemptions.userId, userId)))
      .orderBy(desc(promoRedemptions.redeemedAt))
      .limit(1);
    return row;
  }

  async getPromoRedemptionByUnlockId(tripUnlockId: string): Promise<PromoRedemption | undefined> {
    // Used for webhook idempotency: checks if this specific TripUnlock already has a redemption recorded.
    const [row] = await db
      .select()
      .from(promoRedemptions)
      .where(eq(promoRedemptions.tripUnlockId, tripUnlockId))
      .limit(1);
    return row;
  }

  async listRedemptionsForCode(codeId: string): Promise<PromoRedemption[]> {
    return db
      .select()
      .from(promoRedemptions)
      .where(eq(promoRedemptions.codeId, codeId))
      .orderBy(desc(promoRedemptions.redeemedAt));
  }

  async createPromoRedemption(data: InsertPromoRedemption): Promise<PromoRedemption> {
    const [row] = await db.insert(promoRedemptions).values(data).returning();
    return row;
  }

  // ── STORY EMAIL SCHEDULES ─────────────────────────────────────────────────────

  async scheduleStoryEmails(tripId: string, userId: string, emailAddress: string): Promise<void> {
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (const row of [
      { tripId, userId, triggerType: '1_week' as const, sendAt: oneWeek, emailAddress },
      { tripId, userId, triggerType: '1_month' as const, sendAt: oneMonth, emailAddress },
    ]) {
      await db.insert(storyEmailSchedules)
        .values(row)
        .onConflictDoNothing({ target: [storyEmailSchedules.tripId, storyEmailSchedules.triggerType] });
    }
  }

  async getPendingStoryEmails(): Promise<StoryEmailSchedule[]> {
    return db
      .select()
      .from(storyEmailSchedules)
      .where(and(isNull(storyEmailSchedules.sentAt), lte(storyEmailSchedules.sendAt, new Date())));
  }

  async markStoryEmailSent(id: string): Promise<void> {
    await db
      .update(storyEmailSchedules)
      .set({ sentAt: new Date() })
      .where(eq(storyEmailSchedules.id, id));
  }

  async createStopQualitySignal(data: InsertStopQualitySignal): Promise<StopQualitySignal> {
    const [signal] = await db.insert(stopQualitySignals).values(data).returning();
    return signal;
  }

  async getStopQualitySignalsByStop(stopId: string): Promise<StopQualitySignal[]> {
    return db.select().from(stopQualitySignals)
      .where(eq(stopQualitySignals.stopId, stopId))
      .orderBy(desc(stopQualitySignals.createdAt));
  }

  async getStopQualitySignalsByTrip(tripId: string): Promise<StopQualitySignal[]> {
    return db.select().from(stopQualitySignals)
      .where(eq(stopQualitySignals.tripId, tripId))
      .orderBy(desc(stopQualitySignals.createdAt));
  }

  async getStopQualitySignalsByUser(userId: string): Promise<Array<StopQualitySignal & { stopType: string | null; tripCity: string | null }>> {
    const rows = await db
      .select({
        id: stopQualitySignals.id,
        userId: stopQualitySignals.userId,
        tripId: stopQualitySignals.tripId,
        stopId: stopQualitySignals.stopId,
        signalType: stopQualitySignals.signalType,
        signalValue: stopQualitySignals.signalValue,
        signalReason: stopQualitySignals.signalReason,
        createdAt: stopQualitySignals.createdAt,
        stopType: travelStops.stopType,
        tripCity: travelTrips.city,
      })
      .from(stopQualitySignals)
      .leftJoin(travelStops, eq(stopQualitySignals.stopId, travelStops.id))
      .leftJoin(travelTrips, eq(stopQualitySignals.tripId, travelTrips.id))
      .where(eq(stopQualitySignals.userId, userId))
      .orderBy(desc(stopQualitySignals.createdAt));
    return rows;
  }

  // ── GUIDE EMAIL DRIP SCHEDULE ─────────────────────────────────────────────────
  async scheduleGuideEmails(email: string) {
    const now = new Date();

    // Generate a unique personal promo code for Email 5 (Day 21).
    // Retry up to 5 times to guarantee the code is actually inserted (collision-safe).
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
    let guideCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const candidate = `GUIDE-${suffix}`;
      try {
        const [inserted] = await db.insert(promoCodes).values({
          code: candidate,
          label: `Guide drip: ${email}`,
          accessType: 'full_free',
          maxUses: 2,
          oneUsePerUser: true,
          appliesGlobally: true,
          isActive: true,
          createdBy: 'guide-drip-email5',
          notes: email,
          expiresAt: new Date(now.getTime() + 81 * 24 * 60 * 60 * 1000), // 21d until send + 60d validity
        }).onConflictDoNothing().returning({ code: promoCodes.code });
        if (inserted?.code) {
          guideCode = inserted.code;
          break;
        }
        // Collision — try again with a new suffix
      } catch (err: any) {
        console.error(`[GuideEmail] Promo code insert attempt ${attempt + 1} failed:`, err.message);
      }
    }
    if (!guideCode) {
      console.error('[GuideEmail] Could not generate unique promo code after 5 attempts — Email 5 will send without a code');
    }

    const days = [3, 7, 14, 21];
    const emailNums = [2, 3, 4, 5];
    const rows = days.map((d, i) => {
      const scheduledFor = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      return {
        email,
        emailNum: emailNums[i],
        scheduledFor,
        promoCode: emailNums[i] === 5 && guideCode ? guideCode : null,
      };
    });
    await db.insert(guideEmailSchedules).values(rows).onConflictDoNothing();
  }

  async guideSubscriberHasConverted(email: string): Promise<boolean> {
    // Check if this email address has a paid account with us
    const [user] = await db.select({
      id: users.id,
      subscriptionTier: users.subscriptionTier,
    }).from(users).where(eq(users.email, email)).limit(1);

    if (!user) return false;
    if (user.subscriptionTier && user.subscriptionTier !== 'free') return true;

    // Also check for any paid trip unlock (amountPaid > 0).
    // Accept both 'active' (normal paid state) and 'complete' (legacy/alternate state)
    // so the suppression fires for all genuinely converted users.
    const [paidUnlock] = await db.select({ id: tripUnlocks.id })
      .from(tripUnlocks)
      .where(and(
        eq(tripUnlocks.userId, user.id),
        sql`${tripUnlocks.status} IN ('active', 'complete')`,
        sql`${tripUnlocks.amountPaid} > 0`
      ))
      .limit(1);

    return !!paidUnlock;
  }

  async getPendingGuideEmails(): Promise<GuideEmailSchedule[]> {
    const now = new Date();
    const pending = await db.select().from(guideEmailSchedules)
      .where(and(lte(guideEmailSchedules.scheduledFor, now), isNull(guideEmailSchedules.sentAt)))
      .orderBy(guideEmailSchedules.scheduledFor);

    if (pending.length === 0) return [];

    // Filter out opted-out subscribers
    const emails = [...new Set(pending.map(r => r.email))];
    const optedOut = await db.select({ email: guideSubscribers.email })
      .from(guideSubscribers)
      .where(and(inArray(guideSubscribers.email, emails), eq(guideSubscribers.optedOut, true)));
    const optedOutSet = new Set(optedOut.map(r => r.email));

    return pending.filter(r => !optedOutSet.has(r.email));
  }

  async markGuideEmailSent(id: number) {
    await db.update(guideEmailSchedules).set({ sentAt: new Date() }).where(eq(guideEmailSchedules.id, id));
  }

  // ── GUIDE SUBSCRIBERS ────────────────────────────────────────────────────────
  async saveGuideSubscriber(email: string, source = 'free-guide') {
    const existing = await db.select().from(guideSubscribers).where(eq(guideSubscribers.email, email)).limit(1);
    if (existing.length > 0) {
      const record = existing[0];
      if (record.optedOut) {
        const [updated] = await db.update(guideSubscribers)
          .set({ optedOut: false, emailSent: false })
          .where(eq(guideSubscribers.email, email))
          .returning();
        return { isNew: true, subscriber: updated };
      }
      return { isNew: false, subscriber: record };
    }
    const { randomUUID } = await import('crypto');
    const unsubscribeToken = randomUUID();
    const [subscriber] = await db.insert(guideSubscribers).values({ email, source, unsubscribeToken }).returning();
    return { isNew: true, subscriber };
  }

  async getGuideSubscriber(email: string): Promise<GuideSubscriber | null> {
    const [subscriber] = await db.select().from(guideSubscribers).where(eq(guideSubscribers.email, email)).limit(1);
    return subscriber ?? null;
  }

  async optOutGuideSubscriber(email: string, token: string): Promise<boolean> {
    const subscriber = await this.getGuideSubscriber(email);
    if (!subscriber || subscriber.unsubscribeToken !== token) return false;
    if (subscriber.optedOut) return true; // already opted out
    await db.update(guideSubscribers)
      .set({ optedOut: true })
      .where(eq(guideSubscribers.email, email));
    // Mark all remaining unsent scheduled emails as sent so the DB stays clean
    await db.update(guideEmailSchedules)
      .set({ sentAt: new Date() })
      .where(and(eq(guideEmailSchedules.email, email), isNull(guideEmailSchedules.sentAt)));
    return true;
  }

  async markGuideSubscriberEmailSent(email: string) {
    await db.update(guideSubscribers).set({ emailSent: true }).where(eq(guideSubscribers.email, email));
  }

  async getAllGuideSubscribers(): Promise<GuideSubscriber[]> {
    return db.select().from(guideSubscribers).orderBy(guideSubscribers.subscribedAt);
  }

  async cleanupOptedOutGuideEmails(): Promise<{ cleaned: number; subscribers: number }> {
    const optedOutList = await db.select({ email: guideSubscribers.email })
      .from(guideSubscribers)
      .where(eq(guideSubscribers.optedOut, true));
    if (optedOutList.length === 0) return { cleaned: 0, subscribers: 0 };
    const emails = optedOutList.map(r => r.email);
    const result = await db.update(guideEmailSchedules)
      .set({ sentAt: new Date() })
      .where(and(inArray(guideEmailSchedules.email, emails), isNull(guideEmailSchedules.sentAt)))
      .returning({ id: guideEmailSchedules.id });
    return { cleaned: result.length, subscribers: emails.length };
  }
}

export const storage = new DatabaseStorage();
