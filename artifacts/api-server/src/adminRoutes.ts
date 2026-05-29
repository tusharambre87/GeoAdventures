import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, players, userSessions, travelTrips, travelStops, travelMoments, journeyPacks, journeyPackProgress, experienceProgress, playerGameStats, generatedFamilyPhotos, plannerStopIntelligence } from "@workspace/db";
import { eq, sql, desc, count, and, gte, lte, isNotNull, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { generateFamilyPhoto, seedStaticFamilyPhotos, assembleFamilyPhotoPrompt, POSE_TEMPLATES } from "./familyPhotoPromptEngine";

const adminSessions = new Map<string, { expiresAt: number }>();
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) return true;
  if (now - attempt.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return true;
  }
  return attempt.count < 5;
}

function recordLoginAttempt(ip: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt || now - attempt.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    attempt.count++;
    attempt.lastAttempt = now;
  }
}

function isAdminAuthenticated(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string;
  if (!token) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  const session = adminSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    adminSessions.delete(token);
    return res.status(401).json({ message: "Admin session expired" });
  }
  next();
}

export function registerAdminRoutes(app: Express) {
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!checkLoginRateLimit(clientIp)) {
        return res.status(429).json({ message: "Too many login attempts. Please try again later." });
      }

      const { email, password } = req.body;
      const adminEmail = process.env.ADMIN_DASHBOARD_EMAIL;
      const adminPassword = process.env.ADMIN_DASHBOARD_PASSWORD;

      if (!adminEmail || !adminPassword) {
        return res.status(500).json({ message: "Admin credentials not configured" });
      }

      if (email !== adminEmail || password !== adminPassword) {
        recordLoginAttempt(clientIp);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = crypto.randomBytes(32).toString('hex');
      adminSessions.set(token, { expiresAt: Date.now() + 24 * 60 * 60 * 1000 });

      res.json({ token });
    } catch (error) {
      console.error('[Admin] Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const token = req.headers['x-admin-token'] as string;
    if (token) adminSessions.delete(token);
    res.json({ success: true });
  });

  app.get('/api/admin/verify', isAdminAuthenticated, (_req: Request, res: Response) => {
    res.json({ valid: true });
  });

  app.get('/api/admin/overview', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const [userStats] = await db.select({
        totalUsers: count(),
        withEmail: sql<number>`count(case when ${users.email} is not null then 1 end)`,
        withCountry: sql<number>`count(case when ${users.detectedCountry} is not null then 1 end)`,
        adminCount: sql<number>`count(case when ${users.isAdmin} = true then 1 end)`,
        trialUsers: sql<number>`count(case when ${users.trialStartDate} is not null then 1 end)`,
        paidUsers: sql<number>`count(case when ${users.stripeSubscriptionId} is not null then 1 end)`,
        foundingFamilies: sql<number>`count(case when ${users.isFoundingFamily} = true then 1 end)`,
      }).from(users);

      const [explorerStats] = await db.select({
        totalExplorers: count(),
        withUser: sql<number>`count(case when ${players.userId} is not null then 1 end)`,
        guestExplorers: sql<number>`count(case when ${players.userId} is null then 1 end)`,
      }).from(players);

      const [sessionStats] = await db.select({
        totalSessions: count(),
        uniqueVisitors: sql<number>`count(distinct ${userSessions.visitorId})`,
        avgTimeSeconds: sql<number>`coalesce(avg(${userSessions.totalTimeSeconds}), 0)`,
        avgPagesVisited: sql<number>`coalesce(avg(${userSessions.pagesVisited}), 0)`,
        totalGamesPlayed: sql<number>`coalesce(sum(${userSessions.gamesPlayed}), 0)`,
        mobileCount: sql<number>`count(case when ${userSessions.deviceType} = 'mobile' then 1 end)`,
        desktopCount: sql<number>`count(case when ${userSessions.deviceType} = 'desktop' then 1 end)`,
        tabletCount: sql<number>`count(case when ${userSessions.deviceType} = 'tablet' then 1 end)`,
      }).from(userSessions);

      const countryBreakdown = await db.select({
        country: users.detectedCountry,
        count: count(),
      }).from(users)
        .where(isNotNull(users.detectedCountry))
        .groupBy(users.detectedCountry)
        .orderBy(desc(count()));

      const signupsByDay = await db.select({
        date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
        count: count(),
      }).from(users)
        .where(isNotNull(users.createdAt))
        .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(desc(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`))
        .limit(30);

      const pricingBandBreakdown = await db.select({
        band: users.pricingBand,
        count: count(),
      }).from(users)
        .groupBy(users.pricingBand)
        .orderBy(desc(count()));

      res.json({
        users: userStats,
        explorers: explorerStats,
        sessions: sessionStats,
        countryBreakdown,
        signupsByDay: signupsByDay.reverse(),
        pricingBandBreakdown,
      });
    } catch (error) {
      console.error('[Admin] Overview error:', error);
      res.status(500).json({ message: "Failed to fetch overview" });
    }
  });

  app.get('/api/admin/geogames', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const gameStats = await db.select({
        gameType: playerGameStats.gameType,
        totalPlayers: sql<number>`count(distinct ${playerGameStats.playerId})`,
        totalGames: sql<number>`coalesce(sum(${playerGameStats.totalGames}), 0)`,
        totalWins: sql<number>`coalesce(sum(${playerGameStats.wins}), 0)`,
        totalLosses: sql<number>`coalesce(sum(${playerGameStats.losses}), 0)`,
      }).from(playerGameStats)
        .groupBy(playerGameStats.gameType)
        .orderBy(desc(sql`coalesce(sum(${playerGameStats.totalGames}), 0)`));

      const topPlayers = await db.select({
        playerId: playerGameStats.playerId,
        playerName: players.name,
        gameType: playerGameStats.gameType,
        totalGames: playerGameStats.totalGames,
        wins: playerGameStats.wins,
      }).from(playerGameStats)
        .leftJoin(players, eq(playerGameStats.playerId, players.id))
        .orderBy(desc(playerGameStats.totalGames))
        .limit(20);

      res.json({ gameStats, topPlayers });
    } catch (error) {
      console.error('[Admin] GeoGames error:', error);
      res.status(500).json({ message: "Failed to fetch game stats" });
    }
  });

  app.get('/api/admin/geoadventures', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const [tripStats] = await db.select({
        totalTrips: count(),
        travelTrips: sql<number>`count(case when ${travelTrips.adventureContext} = 'travel' then 1 end)`,
        homeTrips: sql<number>`count(case when ${travelTrips.adventureContext} = 'home' then 1 end)`,
        startedAdventures: sql<number>`count(case when ${travelTrips.adventureStartedAt} is not null then 1 end)`,
        completedAdventures: sql<number>`count(case when ${travelTrips.completedAt} is not null then 1 end)`,
        withRecap: sql<number>`count(case when ${travelTrips.recapCompleted} = true then 1 end)`,
      }).from(travelTrips);

      const [stopStats] = await db.select({
        totalStops: count(),
        visitedStops: sql<number>`count(case when ${travelStops.isVisited} = true then 1 end)`,
        withJourneyPack: sql<number>`count(case when ${travelStops.journeyPackCompleted} = true then 1 end)`,
      }).from(travelStops);

      const [momentStats] = await db.select({
        totalMoments: count(),
        withPhotos: sql<number>`count(case when ${travelMoments.photoUrl} is not null or ${travelMoments.photoUrls} is not null then 1 end)`,
      }).from(travelMoments);

      const [journeyPackStats] = await db.select({
        totalProgress: count(),
        withListen: sql<number>`count(case when ${journeyPackProgress.listenProgress} is not null then 1 end)`,
        withWonder: sql<number>`count(case when ${journeyPackProgress.wonderResponse} is not null then 1 end)`,
      }).from(journeyPackProgress);

      const [experienceStats] = await db.select({
        totalProgress: count(),
        foodCultureViewed: sql<number>`count(case when ${experienceProgress.foodCultureViewedAt} is not null then 1 end)`,
        hearPlaceViewed: sql<number>`count(case when ${experienceProgress.hearPlaceViewedAt} is not null then 1 end)`,
        everydayLifeViewed: sql<number>`count(case when ${experienceProgress.everydayLifeViewedAt} is not null then 1 end)`,
        foodCultureCompleted: sql<number>`count(case when ${experienceProgress.foodCultureCompletedAt} is not null then 1 end)`,
        hearPlaceCompleted: sql<number>`count(case when ${experienceProgress.hearPlaceCompletedAt} is not null then 1 end)`,
        everydayLifeCompleted: sql<number>`count(case when ${experienceProgress.everydayLifeCompletedAt} is not null then 1 end)`,
      }).from(experienceProgress);

      const tripsByCountry = await db.select({
        country: travelTrips.country,
        count: count(),
      }).from(travelTrips)
        .where(isNotNull(travelTrips.country))
        .groupBy(travelTrips.country)
        .orderBy(desc(count()));

      const tripsByCity = await db.select({
        city: travelTrips.city,
        country: travelTrips.country,
        count: count(),
      }).from(travelTrips)
        .where(isNotNull(travelTrips.city))
        .groupBy(travelTrips.city, travelTrips.country)
        .orderBy(desc(count()))
        .limit(20);

      const tripsByUser = await db.select({
        userId: travelTrips.userId,
        email: users.email,
        tripCount: count(),
        startedCount: sql<number>`count(case when ${travelTrips.adventureStartedAt} is not null then 1 end)`,
        travelCount: sql<number>`count(case when ${travelTrips.adventureContext} = 'travel' then 1 end)`,
        homeCount: sql<number>`count(case when ${travelTrips.adventureContext} = 'home' then 1 end)`,
      }).from(travelTrips)
        .leftJoin(users, eq(travelTrips.userId, users.id))
        .groupBy(travelTrips.userId, users.email)
        .orderBy(desc(count()));

      const stopTypes = await db.select({
        stopType: travelStops.stopType,
        count: count(),
      }).from(travelStops)
        .groupBy(travelStops.stopType)
        .orderBy(desc(count()));

      const journeyGameStats = await db.execute(sql`
        SELECT 
          jp.journey_game1_type as game_type,
          count(*) as count
        FROM journey_packs jp
        WHERE jp.journey_game1_type IS NOT NULL
        GROUP BY jp.journey_game1_type
        UNION ALL
        SELECT 
          jp.journey_game2_type as game_type,
          count(*) as count
        FROM journey_packs jp
        WHERE jp.journey_game2_type IS NOT NULL
        GROUP BY jp.journey_game2_type
        ORDER BY count DESC
      `);

      res.json({
        trips: tripStats,
        stops: stopStats,
        moments: momentStats,
        journeyPacks: journeyPackStats,
        experience: experienceStats,
        tripsByCountry,
        tripsByCity,
        tripsByUser,
        stopTypes,
        journeyGameStats: journeyGameStats.rows || [],
      });
    } catch (error) {
      console.error('[Admin] GeoAdventures error:', error);
      res.status(500).json({ message: "Failed to fetch adventure stats" });
    }
  });

  app.get('/api/admin/sessions', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const sessionsByDay = await db.select({
        date: sql<string>`to_char(${userSessions.sessionStart}, 'YYYY-MM-DD')`,
        count: count(),
        uniqueVisitors: sql<number>`count(distinct ${userSessions.visitorId})`,
        avgTime: sql<number>`coalesce(avg(${userSessions.totalTimeSeconds}), 0)`,
      }).from(userSessions)
        .where(isNotNull(userSessions.sessionStart))
        .groupBy(sql`to_char(${userSessions.sessionStart}, 'YYYY-MM-DD')`)
        .orderBy(desc(sql`to_char(${userSessions.sessionStart}, 'YYYY-MM-DD')`))
        .limit(30);

      const deviceBreakdown = await db.select({
        device: userSessions.deviceType,
        count: count(),
      }).from(userSessions)
        .groupBy(userSessions.deviceType)
        .orderBy(desc(count()));

      const landingPages = await db.select({
        page: userSessions.landingPage,
        count: count(),
      }).from(userSessions)
        .where(isNotNull(userSessions.landingPage))
        .groupBy(userSessions.landingPage)
        .orderBy(desc(count()))
        .limit(20);

      const hostnames = await db.select({
        hostname: sql<string>`
          CASE 
            WHEN ${userSessions.landingPage} LIKE '%game.geoquestgame.com%' THEN 'game.geoquestgame.com'
            WHEN ${userSessions.landingPage} LIKE '%geoquestgame.live%' THEN 'geoquestgame.live'
            WHEN ${userSessions.landingPage} LIKE '%replit%' THEN 'replit.dev'
            ELSE 'other'
          END
        `,
        count: count(),
      }).from(userSessions)
        .where(isNotNull(userSessions.landingPage))
        .groupBy(sql`
          CASE 
            WHEN ${userSessions.landingPage} LIKE '%game.geoquestgame.com%' THEN 'game.geoquestgame.com'
            WHEN ${userSessions.landingPage} LIKE '%geoquestgame.live%' THEN 'geoquestgame.live'
            WHEN ${userSessions.landingPage} LIKE '%replit%' THEN 'replit.dev'
            ELSE 'other'
          END
        `)
        .orderBy(desc(count()));

      const osBreakdown = await db.select({
        os: userSessions.osPlatform,
        count: count(),
      }).from(userSessions)
        .where(isNotNull(userSessions.osPlatform))
        .groupBy(userSessions.osPlatform)
        .orderBy(desc(count()));

      const browserBreakdown = await db.select({
        browser: userSessions.browserName,
        count: count(),
      }).from(userSessions)
        .where(isNotNull(userSessions.browserName))
        .groupBy(userSessions.browserName)
        .orderBy(desc(count()));

      const hostnameBreakdown = await db.select({
        hostname: userSessions.hostname,
        count: count(),
      }).from(userSessions)
        .where(isNotNull(userSessions.hostname))
        .groupBy(userSessions.hostname)
        .orderBy(desc(count()));

      res.json({
        sessionsByDay: sessionsByDay.reverse(),
        deviceBreakdown,
        landingPages,
        hostnames,
        osBreakdown,
        browserBreakdown,
        hostnameBreakdown,
      });
    } catch (error) {
      console.error('[Admin] Sessions error:', error);
      res.status(500).json({ message: "Failed to fetch session stats" });
    }
  });

  app.get('/api/admin/users', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        detectedCountry: users.detectedCountry,
        pricingBand: users.pricingBand,
        signupLocale: users.signupLocale,
        signupTimezone: users.signupTimezone,
        isAdmin: users.isAdmin,
        isFoundingFamily: users.isFoundingFamily,
        foundingFamilyNumber: users.foundingFamilyNumber,
        trialStartDate: users.trialStartDate,
        stripeSubscriptionId: users.stripeSubscriptionId,
        createdAt: users.createdAt,
      }).from(users)
        .orderBy(desc(users.createdAt));

      const userIds = allUsers.map(u => u.id);
      
      let explorerCounts: Record<string, number> = {};
      if (userIds.length > 0) {
        const explorerData = await db.select({
          userId: players.userId,
          count: count(),
        }).from(players)
          .where(isNotNull(players.userId))
          .groupBy(players.userId);
        explorerData.forEach(e => {
          if (e.userId) explorerCounts[e.userId] = Number(e.count);
        });
      }

      let sessionCounts: Record<string, number> = {};
      const sessionData = await db.select({
        visitorId: userSessions.visitorId,
        count: count(),
      }).from(userSessions)
        .groupBy(userSessions.visitorId);
      sessionData.forEach(s => {
        sessionCounts[s.visitorId] = Number(s.count);
      });

      let tripCounts: Record<string, number> = {};
      if (userIds.length > 0) {
        const tripData = await db.select({
          userId: travelTrips.userId,
          count: count(),
        }).from(travelTrips)
          .groupBy(travelTrips.userId);
        tripData.forEach(t => {
          if (t.userId) tripCounts[t.userId] = Number(t.count);
        });
      }

      const enrichedUsers = allUsers.map(u => ({
        ...u,
        explorerCount: explorerCounts[u.id] || 0,
        sessionCount: sessionCounts[u.id] || 0,
        tripCount: tripCounts[u.id] || 0,
        accountStatus: u.stripeSubscriptionId ? 'Paid' : u.trialStartDate ? 'Trial' : u.isAdmin ? 'Admin' : 'Free',
      }));

      res.json({ users: enrichedUsers });
    } catch (error) {
      console.error('[Admin] Users error:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/users/:userId', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });

      const userExplorers = await db.select().from(players).where(eq(players.userId, userId));

      const explorerIds = userExplorers.map(e => e.id);
      
      let gameStatsData: any[] = [];
      if (explorerIds.length > 0) {
        gameStatsData = await db.select().from(playerGameStats)
          .where(inArray(playerGameStats.playerId, explorerIds));
      }

      const userTrips = await db.select().from(travelTrips).where(eq(travelTrips.userId, userId)).orderBy(desc(travelTrips.createdAt));

      const userSessionData = await db.select({
        id: userSessions.id,
        sessionStart: userSessions.sessionStart,
        sessionEnd: userSessions.sessionEnd,
        totalTimeSeconds: userSessions.totalTimeSeconds,
        pagesVisited: userSessions.pagesVisited,
        gamesPlayed: userSessions.gamesPlayed,
        deviceType: userSessions.deviceType,
        landingPage: userSessions.landingPage,
        osPlatform: userSessions.osPlatform,
        browserName: userSessions.browserName,
        hostname: userSessions.hostname,
      }).from(userSessions)
        .where(eq(userSessions.visitorId, userId))
        .orderBy(desc(userSessions.sessionStart))
        .limit(50);

      let experienceData: any[] = [];
      if (explorerIds.length > 0) {
        experienceData = await db.select().from(experienceProgress)
          .where(inArray(experienceProgress.explorerId, explorerIds));
      }

      res.json({
        user: {
          ...user,
          password: undefined,
        },
        explorers: userExplorers,
        gameStats: gameStatsData,
        trips: userTrips,
        sessions: userSessionData,
        experienceProgress: experienceData,
      });
    } catch (error) {
      console.error('[Admin] User detail error:', error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  // ── PROMO CODE ADMIN ROUTES ──────────────────────────────────────────────────

  // List all promo codes
  app.get('/api/admin/promo/codes', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const codes = await storage.listPromoCodes();
      res.json({ codes });
    } catch (error) {
      console.error('[Admin] List promo codes error:', error);
      res.status(500).json({ message: "Failed to fetch promo codes" });
    }
  });

  // Create a new promo code
  app.post('/api/admin/promo/codes', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const {
        code, label, accessType, discountType, discountValue,
        maxUses, oneUsePerUser, appliesToTripId, appliesGlobally,
        isActive, expiresAt, createdBy, notes,
      } = req.body;

      if (!code || !accessType) {
        return res.status(400).json({ message: "code and accessType are required" });
      }

      const created = await storage.createPromoCode({
        code,
        label: label || null,
        accessType,
        discountType: discountType || null,
        discountValue: discountValue || null,
        maxUses: maxUses || 100,
        oneUsePerUser: oneUsePerUser !== false,
        appliesToTripId: appliesToTripId || null,
        appliesGlobally: appliesGlobally !== false,
        isActive: isActive !== false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: createdBy || 'admin',
        notes: notes || null,
      });

      res.json({ code: created });
    } catch (error: any) {
      if ((error?.message || '').includes('unique')) {
        return res.status(409).json({ message: "A code with that name already exists" });
      }
      console.error('[Admin] Create promo code error:', error);
      res.status(500).json({ message: "Failed to create promo code" });
    }
  });

  // Update a promo code (toggle active, change limits, etc.)
  app.patch('/api/admin/promo/codes/:id', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive, maxUses, expiresAt, label, notes, discountValue, discountType } = req.body;

      const updates: Record<string, any> = {};
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (typeof maxUses === 'number') updates.maxUses = maxUses;
      if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (label !== undefined) updates.label = label;
      if (notes !== undefined) updates.notes = notes;
      if (discountValue !== undefined) updates.discountValue = discountValue;
      if (discountType !== undefined) updates.discountType = discountType;

      const updated = await storage.updatePromoCode(id, updates);
      res.json({ code: updated });
    } catch (error) {
      console.error('[Admin] Update promo code error:', error);
      res.status(500).json({ message: "Failed to update promo code" });
    }
  });

  // Get redemptions for a specific code
  app.get('/api/admin/promo/codes/:id/redemptions', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const redemptions = await storage.listRedemptionsForCode(id);

      // Enrich with user emails
      const enriched = await Promise.all(redemptions.map(async (r) => {
        const user = await storage.getUser(r.userId);
        return {
          ...r,
          userEmail: user?.email || r.userId,
          userName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null,
        };
      }));

      res.json({ redemptions: enriched });
    } catch (error) {
      console.error('[Admin] List redemptions error:', error);
      res.status(500).json({ message: "Failed to fetch redemptions" });
    }
  });

  // ── FAMILY PHOTO ADMIN ROUTES ─────────────────────────────────────────────

  // List all family photos (with optional filters)
  app.get('/api/admin/family-photos', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { status, city, category } = req.query as Record<string, string>;
      const conditions = [];
      if (status) conditions.push(eq(generatedFamilyPhotos.status, status));
      if (city) conditions.push(eq(generatedFamilyPhotos.city, city));
      if (category) conditions.push(eq(generatedFamilyPhotos.category, category));

      const photos = await db
        .select()
        .from(generatedFamilyPhotos)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(generatedFamilyPhotos.createdAt))
        .limit(200);

      const globalStats = await db
        .select({
          status: generatedFamilyPhotos.status,
          count: count(),
        })
        .from(generatedFamilyPhotos)
        .groupBy(generatedFamilyPhotos.status);

      const cityStats = await db
        .select({
          city: generatedFamilyPhotos.city,
          status: generatedFamilyPhotos.status,
          count: count(),
        })
        .from(generatedFamilyPhotos)
        .groupBy(generatedFamilyPhotos.city, generatedFamilyPhotos.status)
        .orderBy(generatedFamilyPhotos.city);

      res.json({ photos, stats: globalStats, cityStats });
    } catch (error) {
      console.error('[Admin] Family photos list error:', error);
      res.status(500).json({ message: "Failed to fetch family photos" });
    }
  });

  // Generate a new family photo via DALL-E (spec-required path)
  app.post('/api/admin/generate-family-photo', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { city, country, place, category, poseTemplate, family } = req.body;
      if (!city || !category || !poseTemplate || !family) {
        return res.status(400).json({ message: "city, category, poseTemplate, and family are required" });
      }
      if (!POSE_TEMPLATES[poseTemplate]) {
        return res.status(400).json({ message: `Invalid poseTemplate. Valid values: ${Object.keys(POSE_TEMPLATES).join(', ')}` });
      }

      const result = await generateFamilyPhoto({ city, country, place, category, poseTemplate, family });
      if (!result) return res.status(500).json({ message: "Image generation failed" });

      res.json({ success: true, id: result.id, imageUrl: result.imageUrl, prompt: result.prompt, metadata: result.metadata, warnings: result.warnings });
    } catch (error) {
      console.error('[Admin] Family photo generate error:', error);
      res.status(500).json({ message: "Failed to generate family photo" });
    }
  });

  // Generate a new family photo via DALL-E
  app.post('/api/admin/family-photos/generate', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { city, country, place, category, poseTemplate, family } = req.body;
      if (!city || !category || !poseTemplate || !family) {
        return res.status(400).json({ message: "city, category, poseTemplate, and family are required" });
      }
      if (!POSE_TEMPLATES[poseTemplate]) {
        return res.status(400).json({ message: `Invalid poseTemplate. Valid values: ${Object.keys(POSE_TEMPLATES).join(', ')}` });
      }

      const result = await generateFamilyPhoto({ city, country, place, category, poseTemplate, family });
      if (!result) return res.status(500).json({ message: "Image generation failed" });

      res.json({ success: true, id: result.id, imageUrl: result.imageUrl, prompt: result.prompt, metadata: result.metadata });
    } catch (error) {
      console.error('[Admin] Family photo generate error:', error);
      res.status(500).json({ message: "Failed to generate family photo" });
    }
  });

  // Preview assembled prompt without generating
  app.post('/api/admin/family-photos/preview-prompt', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { city, country, place, category, poseTemplate, family } = req.body;
      if (!city || !category || !poseTemplate || !family) {
        return res.status(400).json({ message: "city, category, poseTemplate, and family are required" });
      }
      const assembled = assembleFamilyPhotoPrompt({ city, country, place, category, poseTemplate, family });
      res.json(assembled);
    } catch (error) {
      console.error('[Admin] Preview prompt error:', error);
      res.status(500).json({ message: "Failed to assemble prompt" });
    }
  });

  // Explicit approve endpoint (spec-required path)
  app.patch('/api/admin/family-photos/:id/approve', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { qualityScore } = req.body as { qualityScore?: number };
      const [updated] = await db
        .update(generatedFamilyPhotos)
        .set({
          status: "approved",
          approvedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
          ...(qualityScore !== undefined ? { qualityScore } : {}),
        })
        .where(eq(generatedFamilyPhotos.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Photo not found" });
      res.json({ photo: updated });
    } catch (error) {
      console.error('[Admin] Family photo approve error:', error);
      res.status(500).json({ message: "Failed to approve photo" });
    }
  });

  // Explicit reject endpoint (spec-required path)
  app.patch('/api/admin/family-photos/:id/reject', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body as { rejectionReason?: string };
      const [updated] = await db
        .update(generatedFamilyPhotos)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          approvedAt: null,
          rejectionReason: rejectionReason || null,
        })
        .where(eq(generatedFamilyPhotos.id, id))
        .returning();
      if (!updated) return res.status(404).json({ message: "Photo not found" });
      res.json({ photo: updated });
    } catch (error) {
      console.error('[Admin] Family photo reject error:', error);
      res.status(500).json({ message: "Failed to reject photo" });
    }
  });

  // Approve/reject/score a family photo (generic action route)
  app.patch('/api/admin/family-photos/:id', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, qualityScore, rejectionReason } = req.body as {
        action?: string;
        qualityScore?: number;
        rejectionReason?: string;
      };

      type PhotoUpdate = {
        status?: string;
        approvedAt?: Date | null;
        rejectedAt?: Date | null;
        rejectionReason?: string | null;
        qualityScore?: number;
      };
      const updates: PhotoUpdate = {};

      if (action === 'approve') {
        updates.status = 'approved';
        updates.approvedAt = new Date();
        updates.rejectedAt = null;
        updates.rejectionReason = null;
      } else if (action === 'reject') {
        updates.status = 'rejected';
        updates.rejectedAt = new Date();
        updates.approvedAt = null;
        updates.rejectionReason = rejectionReason || null;
      } else if (action === 'reset') {
        updates.status = 'pending';
        updates.approvedAt = null;
        updates.rejectedAt = null;
        updates.rejectionReason = null;
      }
      if (qualityScore !== undefined) updates.qualityScore = qualityScore;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid action provided" });
      }

      const [updated] = await db
        .update(generatedFamilyPhotos)
        .set(updates)
        .where(eq(generatedFamilyPhotos.id, id))
        .returning();

      if (!updated) return res.status(404).json({ message: "Photo not found" });
      res.json({ photo: updated });
    } catch (error) {
      console.error('[Admin] Family photo update error:', error);
      res.status(500).json({ message: "Failed to update photo" });
    }
  });

  // Delete a family photo record
  app.delete('/api/admin/family-photos/:id', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(generatedFamilyPhotos).where(eq(generatedFamilyPhotos.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('[Admin] Family photo delete error:', error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Seed static memory-images as approved photos
  app.post('/api/admin/family-photos/seed-static', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const result = await seedStaticFamilyPhotos();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('[Admin] Seed static photos error:', error);
      res.status(500).json({ message: "Failed to seed static photos" });
    }
  });

  // Get pose templates (for the admin UI form)
  app.get('/api/admin/family-photos/pose-templates', isAdminAuthenticated, (_req: Request, res: Response) => {
    res.json({ poseTemplates: POSE_TEMPLATES });
  });

  // Stop Intelligence cache invalidation
  // Sets invalidatedAt = now() on the matching row so it is treated as stale on
  // the next call to enrichStop() and gets refreshed in the background.
  app.post('/api/admin/intelligence/invalidate', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const { placeId } = req.body;
      if (!placeId || typeof placeId !== 'string') {
        return res.status(400).json({ message: 'placeId is required' });
      }

      const result = await db.update(plannerStopIntelligence)
        .set({ invalidatedAt: new Date() })
        .where(eq(plannerStopIntelligence.placeId, placeId))
        .returning({ placeId: plannerStopIntelligence.placeId });

      if (!result.length) {
        return res.status(404).json({ message: 'No intelligence record found for this placeId' });
      }

      console.log(`[Admin] Intelligence invalidated for placeId: ${placeId}`);
      res.json({ success: true, placeId });
    } catch (error) {
      console.error('[Admin] Intelligence invalidation error:', error);
      res.status(500).json({ message: 'Failed to invalidate intelligence cache' });
    }
  });

  // ── Guide Subscribers ───────────────────────────────────────────────────────
  app.get('/api/admin/guide-subscribers', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const subscribers = await storage.getAllGuideSubscribers();
      const total = subscribers.length;
      const optedOut = subscribers.filter(s => s.optedOut).length;
      const active = total - optedOut;
      res.json({ subscribers, total, optedOut, active });
    } catch (err) {
      console.error('[Admin] guide-subscribers error:', err);
      res.status(500).json({ message: 'Failed to load guide subscribers' });
    }
  });

  app.post('/api/admin/guide-subscribers/cleanup', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const result = await storage.cleanupOptedOutGuideEmails();
      res.json({
        success: true,
        message: `Cleaned up ${result.cleaned} pending email(s) for ${result.subscribers} opted-out subscriber(s)`,
        ...result,
      });
    } catch (err) {
      console.error('[Admin] guide-subscribers cleanup error:', err);
      res.status(500).json({ message: 'Failed to run cleanup' });
    }
  });

  // ── Stop Library admin endpoints ──────────────────────────────────────────────

  app.get('/api/admin/stop-library/status', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const status = await storage.getStopLibraryStatus();
      res.json({
        ...status,
        enrichmentRate: status.totalStops > 0
          ? `${Math.round((status.enrichedStops / status.totalStops) * 100)}%`
          : '0%',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Admin] stop-library status error:', err);
      res.status(500).json({ message: 'Failed to fetch stop library status' });
    }
  });

  app.post('/api/admin/stop-library/enrich-pending', isAdminAuthenticated, async (req: Request, res: Response) => {
    try {
      const country = typeof req.query.country === 'string' ? req.query.country : undefined;
      const { startEnrichmentQueue } = await import('./planner/stopLibraryEnricher.js');
      startEnrichmentQueue(country);
      const pending = await storage.getUnenrichedStopLibraryIds(1000, country);
      res.json({
        success: true,
        message: `Enrichment queue started — ${pending.length} stops queued${country ? ` (country: ${country})` : ''}`,
        pendingCount: pending.length,
        country: country ?? null,
      });
    } catch (err) {
      console.error('[Admin] stop-library enrich error:', err);
      res.status(500).json({ message: 'Failed to start enrichment queue' });
    }
  });

  app.post('/api/admin/stop-library/reseed', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { seedStopLibrary } = await import('./planner/stopLibrarySeeder.js');
      res.json({ success: true, message: 'Stop library reseed started in background' });
      seedStopLibrary().catch((err: any) => {
        console.error('[Admin] stop-library reseed error:', err);
      });
    } catch (err) {
      console.error('[Admin] stop-library reseed error:', err);
      res.status(500).json({ message: 'Failed to start reseed' });
    }
  });

  app.post('/api/admin/stop-library/seed-usa', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { seedUSACityLibrary } = await import('./planner/usaLibrarySeeder.js');
      res.json({ success: true, message: 'USA stop library seeding started in background — check server logs for per-city progress' });
      seedUSACityLibrary().catch((err: any) => {
        console.error('[Admin] stop-library seed-usa error:', err);
      });
    } catch (err) {
      console.error('[Admin] stop-library seed-usa error:', err);
      res.status(500).json({ message: 'Failed to start USA seed' });
    }
  });

  app.post('/api/admin/stop-library/seed-international', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { seedInternationalCityLibrary } = await import('./planner/internationalLibrarySeeder.js');
      res.json({ success: true, message: 'International stop library seeding started in background — check server logs for per-city progress' });
      seedInternationalCityLibrary().catch((err: any) => {
        console.error('[Admin] stop-library seed-international error:', err);
      });
    } catch (err) {
      console.error('[Admin] stop-library seed-international error:', err);
      res.status(500).json({ message: 'Failed to start international seed' });
    }
  });

  // ── International Landmark Photo Seeder ───────────────────────────────────
  // Pre-seeds compass_landmark_images with DALL-E artwork for ~44 top international
  // cities so families never hit a cold-start delay on their first load.
  app.post('/api/admin/landmark-photos/seed-international', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { seedInternationalLandmarkPhotos } = await import('./planner/internationalLandmarkPhotoSeeder.js');
      // Kick off in background so the HTTP response returns immediately.
      res.json({
        success: true,
        message: 'International landmark photo seeding started in background — check server logs for per-city progress',
      });
      seedInternationalLandmarkPhotos().catch((err: any) => {
        console.error('[Admin] landmark-photos seed-international error:', err);
      });
    } catch (err) {
      console.error('[Admin] landmark-photos seed-international error:', err);
      res.status(500).json({ message: 'Failed to start international landmark photo seed' });
    }
  });

  // Synchronous status check — returns which svgKeys are already cached.
  app.get('/api/admin/landmark-photos/status', isAdminAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { db } = await import('./db.js');
      const { compassLandmarkImages } = await import('@workspace/db');
      const rows = await db
        .select({ svgKey: compassLandmarkImages.svgKey })
        .from(compassLandmarkImages);
      res.json({
        cachedCount: rows.length,
        cachedKeys: rows.map((r) => r.svgKey).sort(),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Admin] landmark-photos status error:', err);
      res.status(500).json({ message: 'Failed to fetch landmark photo status' });
    }
  });
}
