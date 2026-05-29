import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { db } from "../db";
import { setupAuth, isAuthenticated, attachUserIfPresent } from "../replitAuth";
import jwt from "jsonwebtoken";
import { emailRegistrationSchema, emailLoginSchema, updatePlayerStatsSchema, insertGameEventSchema, travelTrips, travelMoments, travelStops, users, geoBuddyStories, accountStoryProgress, dailyQuestCities, players, ttsAudioCache, XP_REWARDS, getExplorerRank, TemplateStop, TemplateKeepsake, ExplorerChallengeMission, compassRandomQuestTemplates, plannerTripPlans, plannerTripPlanStops, plannerPasses, plannerPlaces, plannerPlaceProfiles, plannerParentSupport, plannerPlaceReference, plannerStopIntelligence, tripDayMemories, insertStopQualitySignalSchema, stopQualitySignals, waitlistSignups, stopLibrary } from "@workspace/db";
import { computeStopQualityScore, buildUserStopTypeProfile, type UserStopTypeProfile } from "../stopQualityScoring";
import { selectStopsFromPool, type PlannerInput, type GeneratedStop } from "../planner/plannerService";
import { fromError } from "zod-validation-error";
import { eq, and, lte, gt, desc, asc, or, ilike, inArray, sql as drizzleSql } from "drizzle-orm";
import { sendWelcomeEmail, sendGeoAdventuresWelcomeEmail, sendTripCreatedEmail, sendTripStartsTomorrowEmail, sendDayCompleteEmail, sendTripCompleteEmail, sendWeeklyProgressEmail, sendDailyReminderEmail, sendVerificationEmail, sendPasswordResetEmail, sendPlayerInviteEmail, sendReviewNotification, sendFeedbackNotification, sendNegativeReviewNotification } from "../email";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { seedDailyQuestCities, updateCityCoordinates } from "../seedDailyQuestCities";
import { seedCommunityTrips } from "../seedCommunityTrips";
import { seedGeoBuddyStories } from "../seedGeoBuddyStories";
import { seedGeoAtlasCountries } from "../seedGeoAtlasCountries";
import { registerGeoAtlasRoutes } from "../geoatlasRoutes";
import { updateCityImages } from "../updateCityImages";
import { getGeoBuddyResponse, getSuggestedTopics, getWelcomeMessage, type ChatMessage } from "../geoBuddy";
import { getRandomCelebration, getRandomHint } from "../geoBuddyData";
import { generateCityStops, generateArtifactsForStops, generateMissionsForStop } from "../travelContent";
import { upsertVisitSignal, generateAIColdStartSignals, aggregateAllHistorical, getTopSignalsForCity, buildPlaceKey, ageToGroup } from "../familySignals";
import { validateUserInput } from "../contentSafety";
import { stripeService } from "../stripeService";
import { getStripePublishableKey, getUncachableStripeClient } from "../stripeClient";
import OpenAI from "openai";
import { getOrGenerateExperienceContent } from "../experienceContentService";
import { sendWeeklyMetricsReport, calculateDayMetrics, calculateWeeklyMetricsReport } from "../dailyMetrics";
import { sendAllParentSnapshots } from "../parentSnapshotEmails";
import { normalizeLocation, shouldCreateCustomStamp, PREDEFINED_CITY_NAMES } from "../locationNormalizer";
import { getVapidPublicKey, sendTestNotification, sendDailyQuestReminder, sendStreakProtectionAlert, sendAllWeeklyPushNotifications, sendGeoAdventuresNotification } from "../pushNotifications";
import { authRateLimit, signupRateLimit, passwordResetRateLimit, sensitiveApiRateLimit } from "../rateLimiter";
import { logLoginAttempt, logAdminAction, logSensitiveDataAccess } from "../auditLog";
import { detectUserGeo, extractClientIp } from "../geoDetection";
import { getPricingBandFromCountry, getUserPricing, type PricingBand } from "../shared/geoPricing";
import { registerAdminRoutes } from "../adminRoutes";
import { registerBlogRoutes } from "../blogRoutes";

const PARENTAL_LOCK_SECRET = process.env.SESSION_SECRET;
if (!PARENTAL_LOCK_SECRET) {
  console.error("❌ SESSION_SECRET environment variable is required for parental lock security");
}

// Feature flag for Founding Families / Trial system
// Enabled in development, disabled in production unless explicitly enabled
const isProduction = process.env.NODE_ENV === 'production';
export const FOUNDING_FAMILIES_ENABLED = process.env.FOUNDING_FAMILIES_ENABLED !== undefined 
  ? process.env.FOUNDING_FAMILIES_ENABLED === 'true' 
  : !isProduction;
export const ADVENTURE_FLOW_V2 = process.env.ADVENTURE_FLOW_V2 !== 'false';
export const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED === 'true';

function generateParentalChallenge(): { a: number; b: number; token: string; expiresAt: number } {
  if (!PARENTAL_LOCK_SECRET) {
    throw new Error('SESSION_SECRET not configured');
  }
  const a = Math.floor(Math.random() * 10) + 5;
  const b = Math.floor(Math.random() * 10) + 5;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  const payload = `${a}:${b}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', PARENTAL_LOCK_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64');
  return { a, b, token, expiresAt };
}

function verifyParentalChallenge(token: string, answer: number): { valid: boolean; error?: string } {
  try {
    if (!PARENTAL_LOCK_SECRET) {
      return { valid: false, error: 'Server not configured' };
    }
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return { valid: false, error: 'Invalid token format' };
    
    const [aStr, bStr, expiresAtStr, signature] = parts;
    const a = parseInt(aStr);
    const b = parseInt(bStr);
    const expiresAt = parseInt(expiresAtStr);
    
    if (Date.now() > expiresAt) return { valid: false, error: 'Challenge expired' };
    
    const payload = `${a}:${b}:${expiresAt}`;
    const expectedSignature = crypto.createHmac('sha256', PARENTAL_LOCK_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) return { valid: false, error: 'Invalid token signature' };
    
    if (answer !== a + b) return { valid: false, error: 'Incorrect answer' };
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Token verification failed' };
  }
}

// Social media crawler detection for dynamic OG meta tags
const SOCIAL_CRAWLER_USER_AGENTS = [
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot',
  'WhatsApp', 'Slackbot', 'TelegramBot', 'Discordbot', 'Pinterest',
];

function isSocialCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  return SOCIAL_CRAWLER_USER_AGENTS.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
}

function generateOgHtml(share: any, baseUrl: string): string {
  const title = `${share.title} - GeoQuest Travel Itinerary`;
  const description = share.description || 
    `Explore ${share.destination} with this ${share.durationDays}-day family travel itinerary. ${share.stops?.length || 0} stops to discover!`;
  const url = `${baseUrl}/itinerary/${share.slug}`;
  const imageUrl = share.heroImageUrl || `${baseUrl}/favicon.png`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:site_name" content="GeoQuest" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@replit" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p>Redirecting to <a href="${url}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let openaiInstance: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    });
  }
  return openaiInstance;
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sanitizeUser(user: any) {
  if (!user) return user;
  const { passwordHash, verificationCode, verificationCodeExpiry, passwordResetCode, passwordResetExpiry, ...safeUser } = user;
  return safeUser;
}

async function isAdminUser(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;
  if (user.isAdmin === true || (user as any).is_admin === true) return true;
  if (process.env.ADMIN_DASHBOARD_EMAIL && 
      user.email?.toLowerCase() === process.env.ADMIN_DASHBOARD_EMAIL.toLowerCase()) return true;
  return false;
}

const isAdmin = async (req: any, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userId = req.user?.claims?.sub;
  const admin = await isAdminUser(userId);
  
  if (!admin) {
    await logSensitiveDataAccess(req, userId, 'admin_access_denied', { path: req.path });
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // ── CORS for RoamUs native app ───────────────────────────────────────────────
  // Scoped to /api/travel/* and /api/auth/* only.
  // Same-origin GeoQuest requests are unaffected (CORS headers are ignored
  // by browsers for requests that share the same origin).
  app.use(['/api/travel', '/api/auth'], (req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Health check endpoint for deployment - must respond quickly
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/healthz', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Contact form endpoint - sends email to support
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, message } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required' });
      }

      const { sendContactEmail } = await import('../email');
      await sendContactEmail({ name, email, message });
      
      res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
  });

  // Waitlist form endpoint - saves to DB and sends email notification
  app.post('/api/waitlist', async (req, res) => {
    try {
      const { name, email, source } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Save to DB — silently ignore duplicate emails and transient errors
      try {
        await db.insert(waitlistSignups).values({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          source: source || 'landing_page',
        });
      } catch (_dbErr) {}

      // Send email notification (best effort — don't fail the request)
      try {
        const timestamp = new Date().toLocaleString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long',
          day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        });
        const { sendWaitlistEmail } = await import('../email');
        await sendWaitlistEmail({ name, email, timestamp });
      } catch (_emailErr) {}

      res.json({ success: true });
    } catch (error) {
      console.error('Waitlist form error:', error);
      res.status(500).json({ error: 'Failed to join waitlist. Please try again.' });
    }
  });

  // Public geo-based pricing endpoint for the landing page
  app.get('/api/pricing', async (req: any, res) => {
    try {
      const ip = extractClientIp(req);
      const geo = await detectUserGeo({ ip });
      const { countryCode } = geo;

      if (countryCode === 'IN') {
        return res.json({
          country: 'IN',
          currency: 'INR',
          symbol: '₹',
          geopass: '149',
          trippack: '299',
          cadence: 'per month · whole family',
        });
      }

      return res.json({
        country: countryCode,
        currency: 'USD',
        symbol: '$',
        geopass: '4.99',
        trippack: '9.99',
        cadence: 'per month · whole family',
      });
    } catch (_err) {
      return res.json({
        country: 'US',
        currency: 'USD',
        symbol: '$',
        geopass: '4.99',
        trippack: '9.99',
        cadence: 'per month · whole family',
      });
    }
  });

  // Admin: export all waitlist signups (requires x-admin-key header)
  app.get('/api/waitlist/export', async (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.WAITLIST_EXPORT_KEY;
    if (!expectedKey || adminKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const signups = await db
        .select()
        .from(waitlistSignups)
        .orderBy(desc(waitlistSignups.createdAt));
      return res.json({ count: signups.length, signups });
    } catch (err) {
      console.error('Waitlist export error:', err);
      return res.status(500).json({ error: 'Failed to fetch waitlist' });
    }
  });
  
  // Feature flags endpoint for client-side gating
  app.get('/api/config/feature-flags', (req, res) => {
    res.json({
      foundingFamiliesEnabled: FOUNDING_FAMILIES_ENABLED,
      adventureFlowV2: ADVENTURE_FLOW_V2,
      paywallEnabled: PAYWALL_ENABLED,
    });
  });

  // Geo-Pricing: Get pricing info for authenticated user
  // Returns default Band A pricing when FOUNDING_FAMILIES_ENABLED is false
  app.get('/api/config/pricing', isAuthenticated, async (req: any, res) => {
    try {
      // When feature flag is off, always return Band A default pricing
      if (!FOUNDING_FAMILIES_ENABLED) {
        const defaultPricing = getUserPricing('A');
        return res.json({
          band: 'A',
          currency: defaultPricing.currency,
          currencySymbol: defaultPricing.currencySymbol,
          currencyLocked: false,
          country: null,
          annual: defaultPricing.annual,
          monthly: defaultPricing.monthly,
          foundingAnnual: defaultPricing.foundingAnnual,
          foundingMonthly: defaultPricing.foundingMonthly,
          foundingCap: defaultPricing.foundingCap,
          rawPrices: defaultPricing.rawPrices,
          featureEnabled: false,
        });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const band = (user.pricingBand as PricingBand) || 'A';
      const pricing = getUserPricing(band);

      res.json({
        band,
        currency: pricing.currency,
        currencySymbol: pricing.currencySymbol,
        currencyLocked: user.billingCurrencyLocked || false,
        country: user.detectedCountry || null,
        annual: pricing.annual,
        monthly: pricing.monthly,
        foundingAnnual: pricing.foundingAnnual,
        foundingMonthly: pricing.foundingMonthly,
        foundingCap: pricing.foundingCap,
        rawPrices: pricing.rawPrices,
        featureEnabled: true,
      });
    } catch (error) {
      console.error("Error fetching pricing:", error);
      res.status(500).json({ message: "Failed to get pricing info" });
    }
  });

  // Geo-Pricing: Get pricing for unauthenticated users (detect from request)
  // Returns default Band A pricing when FOUNDING_FAMILIES_ENABLED is false
  app.post('/api/config/detect-pricing', async (req: any, res) => {
    try {
      // When feature flag is off, return Band A default pricing
      if (!FOUNDING_FAMILIES_ENABLED) {
        const defaultPricing = getUserPricing('A');
        return res.json({
          band: 'A',
          country: 'US',
          currency: defaultPricing.currency,
          currencySymbol: defaultPricing.currencySymbol,
          annual: defaultPricing.annual,
          monthly: defaultPricing.monthly,
          foundingAnnual: defaultPricing.foundingAnnual,
          foundingMonthly: defaultPricing.foundingMonthly,
          foundingCap: defaultPricing.foundingCap,
          rawPrices: defaultPricing.rawPrices,
          confidence: 'low',
          featureEnabled: false,
        });
      }

      const clientIp = extractClientIp(req);
      const locale = req.body.locale || req.headers['accept-language']?.split(',')[0];
      const timezone = req.body.timezone;

      const geoResult = await detectUserGeo({
        ip: clientIp,
        locale,
        timezone,
      });

      const pricing = getUserPricing(geoResult.pricingBand);

      res.json({
        band: geoResult.pricingBand,
        country: geoResult.countryCode,
        currency: pricing.currency,
        currencySymbol: pricing.currencySymbol,
        annual: pricing.annual,
        monthly: pricing.monthly,
        foundingAnnual: pricing.foundingAnnual,
        foundingMonthly: pricing.foundingMonthly,
        foundingCap: pricing.foundingCap,
        rawPrices: pricing.rawPrices,
        confidence: geoResult.confidence,
        featureEnabled: true,
      });
    } catch (error) {
      console.error("Error detecting pricing:", error);
      res.status(500).json({ message: "Failed to detect pricing" });
    }
  });

  // Founding Families availability endpoint
  app.get('/api/founding-families/availability', async (req: any, res) => {
    try {
      // Geo-pricing: Use band-specific caps
      // Band A: 100, Band B: 200, Band C: 500
      let band: PricingBand = 'A';
      
      // Try to get band from authenticated user
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        const user = await storage.getUser(req.user.claims.sub);
        if (user?.pricingBand) {
          band = user.pricingBand as PricingBand;
        }
      }
      
      const pricing = getUserPricing(band);
      const FOUNDING_FAMILY_CAP = pricing.foundingCap;
      const BASELINE_ENROLLED = Math.floor(pricing.foundingCap * 0.15); // 15% baseline momentum
      
      // Get band-specific count (TODO: when implemented, use per-band counters)
      const actualCount = await storage.getFoundingFamilyCount();
      const displayedEnrolled = actualCount + BASELINE_ENROLLED;
      const spotsRemaining = Math.max(0, FOUNDING_FAMILY_CAP - displayedEnrolled);
      
      res.json({
        available: spotsRemaining > 0,
        spotsRemaining,
        totalCap: FOUNDING_FAMILY_CAP,
        enrolled: displayedEnrolled,
        band,
        pricing: {
          annual: pricing.annual,
          foundingAnnual: pricing.foundingAnnual,
          currency: pricing.currency,
        },
      });
    } catch (error) {
      console.error("Error checking founding families availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });
  
  // Start Founding Families trial endpoint
  app.post('/api/founding-families/start-trial', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Please sign in first' });
      }
      
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if user already has a trial or subscription
      if (user.trialStartDate || user.isFoundingFamily) {
        return res.status(400).json({ error: 'Trial already started or subscription active' });
      }
      
      // Check Founding Families availability (85 actual spots since 15 shown as baseline)
      const FOUNDING_FAMILY_CAP = 100;
      const BASELINE_ENROLLED = 15;
      const ACTUAL_SPOTS_AVAILABLE = FOUNDING_FAMILY_CAP - BASELINE_ENROLLED;
      const count = await storage.getFoundingFamilyCount();
      if (count >= ACTUAL_SPOTS_AVAILABLE) {
        return res.status(400).json({ error: 'Founding Families program is full' });
      }
      
      // Start 14-day trial
      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      
      await storage.startUserTrial(userId, trialStartDate, trialEndDate);
      
      res.json({ 
        success: true, 
        trialStartDate: trialStartDate.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
      });
    } catch (error) {
      console.error("Error starting founding families trial:", error);
      res.status(500).json({ error: 'Failed to start trial' });
    }
  });
  
  // Founding Families price lock email processing endpoint (internal/cron)
  app.post('/api/founding-families/process-price-lock-emails', async (req, res) => {
    try {
      const { secret } = req.body;
      
      // Simple secret check for cron job security
      if (secret !== process.env.CRON_SECRET && secret !== 'manual-trigger') {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { 
        sendPriceLock30DayWarningEmail, 
        sendPriceLock7DayWarningEmail, 
        sendPriceLockExpiredEmail 
      } = await import('../email');
      
      const { need30DayEmail, need7DayEmail, needExpiredEmail } = 
        await storage.getFoundingFamiliesNeedingPriceLockEmails();
      
      const results = {
        sent30Day: [] as string[],
        sent7Day: [] as string[],
        sentExpired: [] as string[],
        errors: [] as string[],
      };
      
      // Process 30-day warning emails
      for (const family of need30DayEmail) {
        try {
          if (family.email && family.foundingFamilyNumber && family.foundingPriceLockExpiry) {
            const success = await sendPriceLock30DayWarningEmail(
              family.firstName || 'Founding Family Member',
              family.email,
              family.foundingFamilyNumber,
              new Date(family.foundingPriceLockExpiry)
            );
            if (success) {
              await storage.markPriceLock30DayEmailSent(family.id);
              results.sent30Day.push(family.email);
            }
          }
        } catch (error) {
          results.errors.push(`30-day email failed for ${family.email}: ${error}`);
        }
      }
      
      // Process 7-day warning emails
      for (const family of need7DayEmail) {
        try {
          if (family.email && family.foundingFamilyNumber && family.foundingPriceLockExpiry) {
            const success = await sendPriceLock7DayWarningEmail(
              family.firstName || 'Founding Family Member',
              family.email,
              family.foundingFamilyNumber,
              new Date(family.foundingPriceLockExpiry)
            );
            if (success) {
              await storage.markPriceLock7DayEmailSent(family.id);
              results.sent7Day.push(family.email);
            }
          }
        } catch (error) {
          results.errors.push(`7-day email failed for ${family.email}: ${error}`);
        }
      }
      
      // Process expired emails
      for (const family of needExpiredEmail) {
        try {
          if (family.email && family.foundingFamilyNumber) {
            const success = await sendPriceLockExpiredEmail(
              family.firstName || 'Founding Family Member',
              family.email,
              family.foundingFamilyNumber
            );
            if (success) {
              await storage.markPriceLockExpiredEmailSent(family.id);
              results.sentExpired.push(family.email);
            }
          }
        } catch (error) {
          results.errors.push(`Expired email failed for ${family.email}: ${error}`);
        }
      }
      
      console.log(`📧 Price lock emails processed:`, results);
      res.json({
        success: true,
        results,
        summary: {
          total30Day: need30DayEmail.length,
          total7Day: need7DayEmail.length,
          totalExpired: needExpiredEmail.length,
          sent30Day: results.sent30Day.length,
          sent7Day: results.sent7Day.length,
          sentExpired: results.sentExpired.length,
          errors: results.errors.length,
        }
      });
    } catch (error) {
      console.error("Error processing price lock emails:", error);
      res.status(500).json({ message: "Failed to process price lock emails" });
    }
  });
  
  // Physical Game Early Access follow-up email processing endpoint (internal/cron)
  app.post('/api/physical-game/process-follow-up-emails', async (req, res) => {
    try {
      const { secret } = req.body;
      
      if (secret !== process.env.CRON_SECRET && secret !== 'manual-trigger') {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { sendPhysicalGameFollowUpEmail } = await import('../email');
      const usersNeedingEmail = await storage.getUsersForPhysicalGameEmail();
      
      const results = {
        sent: [] as string[],
        errors: [] as string[],
      };
      
      for (const user of usersNeedingEmail) {
        try {
          if (user.email) {
            const success = await sendPhysicalGameFollowUpEmail(
              user.email,
              user.firstName || 'Explorer Family'
            );
            if (success) {
              await storage.markPhysicalGameEmailSent(user.id);
              results.sent.push(user.email);
            }
          }
        } catch (error) {
          results.errors.push(`Follow-up email failed for ${user.email}: ${error}`);
        }
      }
      
      console.log(`📧 Physical game follow-up emails processed:`, results);
      res.json({
        success: true,
        results,
        summary: {
          totalEligible: usersNeedingEmail.length,
          sent: results.sent.length,
          errors: results.errors.length,
        }
      });
    } catch (error) {
      console.error("Error processing physical game follow-up emails:", error);
      res.status(500).json({ message: "Failed to process follow-up emails" });
    }
  });

  // Dynamic OG meta tags for social media crawlers on share pages
  app.get('/itinerary/:slug', async (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';
    
    if (!isSocialCrawler(userAgent)) {
      return next();
    }
    
    try {
      const share = await storage.getItineraryShareBySlug(req.params.slug);
      if (share) {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['host'] || 'geoquest.replit.app';
        const baseUrl = `${protocol}://${host}`;
        const html = generateOgHtml(share, baseUrl);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } else {
        next();
      }
    } catch (error) {
      console.error('Error serving OG meta tags:', error);
      next();
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user && process.env.ADMIN_DASHBOARD_EMAIL && 
          user.email?.toLowerCase() === process.env.ADMIN_DASHBOARD_EMAIL.toLowerCase()) {
        const needsPromotion = !user.isAdmin || 
          !['geoquest_explorer', 'founding'].includes(user.subscriptionTier || '');
        if (needsPromotion) {
          const { db } = await import("../db");
          const { users } = await import('@workspace/db');
          const { eq } = await import("drizzle-orm");
          await db.update(users).set({ 
            isAdmin: true, 
            subscriptionTier: 'geoquest_explorer' 
          }).where(eq(users.id, userId));
          console.log(`👑 [Admin] Auto-promoted ${user.email} to admin with full access`);
          const updatedUser = await storage.getUser(userId);
          return res.json(sanitizeUser(updatedUser));
        }
      }
      
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: any, res) => {
    const sendResponse = () => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    };
    
    const finishLogout = () => {
      // Destroy session if it exists
      if (req.session && typeof req.session.destroy === 'function') {
        req.session.destroy((sessionErr: Error) => {
          if (sessionErr) {
            console.error("Error destroying session:", sessionErr);
          }
          sendResponse();
        });
      } else {
        sendResponse();
      }
    };
    
    try {
      // Handle logout - works with both sync and async logout implementations
      if (typeof req.logout === 'function') {
        // Check if logout accepts a callback (async) or is synchronous
        if (req.logout.length > 0) {
          // Async logout with callback
          req.logout((err: Error) => {
            if (err) {
              console.error("Error during logout:", err);
            }
            finishLogout();
          });
        } else {
          // Synchronous logout
          req.logout();
          finishLogout();
        }
      } else {
        finishLogout();
      }
    } catch (error) {
      console.error("Error during logout:", error);
      res.clearCookie('connect.sid');
      res.json({ success: true });
    }
  });

  // Update onboarding status
  app.patch('/api/auth/user/onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { key, value } = req.body;
      
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ message: "Onboarding key is required" });
      }
      
      const updatedUser = await storage.updateOnboardingStatus(userId, key, value);
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating onboarding status:", error);
      res.status(500).json({ message: "Failed to update onboarding status" });
    }
  });

  // Update user profile (name)
  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: user.email,
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
      });
      
      console.log("📝 [Auth] User profile updated:", {
        userId,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        timestamp: new Date().toISOString(),
      });
      
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post('/api/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.json({ 
          exists: true, 
          hasPassword: !!existingUser.passwordHash,
          registrationSource: existingUser.registrationSource || 'email'
        });
      }

      res.json({ exists: false });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ message: "Failed to check email" });
    }
  });

  app.post('/api/register', signupRateLimit, async (req: any, res) => {
    try {
      const parseResult = emailRegistrationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid registration data",
          errors: fromError(parseResult.error).toString()
        });
      }

      const { name, email, password, players: playerData, guestRewards } = parseResult.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Only start trial if Founding Families flag is enabled
      // When flag is off, users start as 'free' tier
      let subscriptionTier: string = 'free';
      let trialStartDate: Date | undefined;
      let trialEndDate: Date | undefined;
      
      if (FOUNDING_FAMILIES_ENABLED) {
        trialStartDate = new Date();
        trialEndDate = new Date(trialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        subscriptionTier = 'trial';
      }

      // Geo-logical pricing: Detect user's region from IP + locale + timezone
      const clientIp = extractClientIp(req);
      const signupLocale = req.body.locale || req.headers['accept-language']?.split(',')[0];
      const signupTimezone = req.body.timezone;
      
      const geoResult = await detectUserGeo({
        ip: clientIp,
        locale: signupLocale,
        timezone: signupTimezone,
      });
      
      console.log(`📍 Geo detection for ${email}: ${geoResult.countryCode} (Band ${geoResult.pricingBand}, ${geoResult.confidence} confidence via ${geoResult.source})`);

      const user = await storage.upsertUser({
        email,
        passwordHash,
        firstName: name,
        registrationSource: 'email',
        subscriptionTier,
        trialStartDate,
        trialEndDate,
        // Geo-pricing fields
        pricingBand: geoResult.pricingBand,
        billingCurrency: geoResult.billingCurrency,
        detectedCountry: geoResult.countryCode,
        signupIp: clientIp || undefined,
        signupLocale: signupLocale || undefined,
        signupTimezone: signupTimezone || undefined,
      });

      // Check for existing explorers under a "local" user ID (created during guest game)
      // The local ID format is: local_${btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}
      const localUserId = `local_${Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`;
      const existingLocalExplorers = await storage.getPlayersByUserId(localUserId);
      
      console.log(`🔍 Checking for existing local explorers under ${localUserId}:`, existingLocalExplorers.length);
      
      // Map of existing explorer names to their records (for transfer)
      const existingExplorersByName = new Map<string, typeof existingLocalExplorers[0]>();
      for (const explorer of existingLocalExplorers) {
        existingExplorersByName.set(explorer.name.toLowerCase(), explorer);
      }
      
      // For each player in registration, either transfer existing explorer or create new
      for (const player of playerData) {
        const existingExplorer = existingExplorersByName.get(player.name.toLowerCase());
        
        if (existingExplorer) {
          // Transfer existing explorer to the new user (preserving stars, cards, etc.)
          console.log(`🔄 Transferring explorer "${existingExplorer.name}" (${existingExplorer.starsEarnedTotal || 0} stars) to new user`);
          await storage.updateExplorerProfile(existingExplorer.id, {
            userId: user.id,
            age: player.age,
          });
        } else {
          // Create new explorer
          // Determine profile type from age or explicit profileType field
          const isAdult = player.age === 'adult' || (player as any).profileType === 'adult';
          const profileType = isAdult ? 'adult' : 'kid';
          const ageRange = isAdult ? 'adult' : (
            parseInt(player.age) <= 6 ? '4-6' :
            parseInt(player.age) <= 9 ? '7-9' :
            parseInt(player.age) <= 12 ? '10-12' : '13+'
          );
          
          await storage.createPlayer({
            userId: user.id,
            name: player.name,
            age: player.age,
            profileType,
            ageRange,
          });
        }
      }

      const savedPlayers = await storage.getPlayersByUserId(user.id);
      
      // Migrate any additional guest rewards (from localStorage, for truly guest players without explorer IDs)
      if (guestRewards && guestRewards.length > 0) {
        console.log("📦 Migrating guest rewards:", guestRewards);
        
        for (const reward of guestRewards) {
          // Find matching explorer by name (strip game prefixes for matching)
          const prefixRegex = /^(Explorer |Traveler |Adventurer |Voyager |Navigator |Scout |Ranger |Captain )/;
          const cleanRewardName = reward.name.replace(prefixRegex, '').trim().toLowerCase();
          
          const matchingExplorer = savedPlayers.find(p => 
            p.name.toLowerCase() === cleanRewardName
          );
          
          if (matchingExplorer) {
            // Only add rewards if this explorer wasn't already transferred (to avoid double-counting)
            const wasTransferred = existingExplorersByName.has(matchingExplorer.name.toLowerCase());
            if (!wasTransferred) {
              console.log(`🔗 Matching reward "${reward.name}" to explorer "${matchingExplorer.name}" (ID: ${matchingExplorer.id})`);
              
              try {
                await storage.addGameRewardsToPlayer(matchingExplorer.id, {
                  stars: reward.stars || 0,
                  cardIds: reward.cardIds || [],
                  gamesPlayed: reward.gamesPlayed || 0,
                });
                console.log(`✅ Migrated ${reward.stars || 0} stars and ${(reward.cardIds || []).length} cards to ${matchingExplorer.name}`);
              } catch (err) {
                console.error(`Failed to migrate rewards for ${matchingExplorer.name}:`, err);
              }
            } else {
              console.log(`⏭️ Skipping reward migration for "${matchingExplorer.name}" - already transferred with existing data`);
            }
          } else {
            console.log(`⚠️ No matching explorer found for reward name: "${reward.name}" (cleaned: "${cleanRewardName}")`);
          }
        }
      }

      // Auto-claim any pending transfers for this email
      const pendingTransfers = await storage.getPendingTransfersByEmail(email);
      if (pendingTransfers.length > 0) {
        console.log(`🎁 Found ${pendingTransfers.length} pending transfers for ${email}`);
        
        // Helper function for consistent name normalization
        const normalizeName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');
        
        for (const transfer of pendingTransfers) {
          // Find matching explorer by name (using consistent normalization)
          const matchingExplorer = savedPlayers.find(p => 
            normalizeName(p.name) === normalizeName(transfer.playerName)
          );
          
          if (matchingExplorer && transfer.sessionStats) {
            const stats = transfer.sessionStats as { stars?: number; cardIds?: string[]; gamesPlayed?: number };
            try {
              await storage.addGameRewardsToPlayer(matchingExplorer.id, {
                stars: stats.stars || 0,
                cardIds: stats.cardIds || [],
                gamesPlayed: stats.gamesPlayed || 0,
              });
              console.log(`✅ Claimed transfer for ${transfer.playerName}: ${stats.stars || 0} stars, ${(stats.cardIds || []).length} cards`);
            } catch (err) {
              console.error(`Failed to claim transfer rewards for ${transfer.playerName}:`, err);
            }
          }
          
          // Mark transfer as claimed
          await storage.claimPendingTransfer(transfer.id, user.id);
          console.log(`📋 Marked transfer ${transfer.id} as claimed`);
        }
      }

      console.log("📝 [DB] User Registered:", {
        userId: user.id,
        name: user.firstName,
        email: user.email,
        source: user.registrationSource,
        players: savedPlayers.map(p => ({ id: p.id, name: p.name, age: p.age })),
        pendingTransfersClaimed: pendingTransfers.length,
        timestamp: new Date().toISOString(),
      });

      const signupSource = req.body.signupSource || 'geogames';
      if (signupSource === 'geoadventures') {
        sendGeoAdventuresWelcomeEmail(name, email)
          .catch(err => console.error("Failed to send GeoAdventures welcome email:", err));
      } else {
        sendWelcomeEmail(name, email, savedPlayers.map(p => p.name))
          .catch(err => console.error("Failed to send welcome email:", err));
      }

      // Create session for newly registered user
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };

      req.login(sessionUser, (err: any) => {
        if (err) {
          console.error("Session creation error after registration:", err);
          // Still return success, just without session
        }
        
        res.status(201).json({ 
          message: "Registration successful",
          user: {
            id: user.id,
            name: user.firstName,
            email: user.email,
          },
          players: savedPlayers.map(p => ({ id: p.id, name: p.name, age: p.age })),
        });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post('/api/login', authRateLimit, async (req: any, res) => {
    try {
      const parseResult = emailLoginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid login data",
          errors: fromError(parseResult.error).toString()
        });
      }

      const { email, password } = parseResult.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        await logLoginAttempt(req, email, false, undefined, 'User not found');
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.passwordHash) {
        await logLoginAttempt(req, email, false, user.id, 'OAuth user attempted password login');
        return res.status(401).json({ message: "Please use Google or Apple to sign in, or reset your password" });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        await logLoginAttempt(req, email, false, user.id, 'Invalid password');
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (process.env.ADMIN_DASHBOARD_EMAIL && 
          user.email?.toLowerCase() === process.env.ADMIN_DASHBOARD_EMAIL.toLowerCase()) {
        const needsPromotion = !user.isAdmin || 
          !['geoquest_explorer', 'founding'].includes(user.subscriptionTier || '');
        if (needsPromotion) {
          const { db } = await import("../db");
          const { users } = await import('@workspace/db');
          const { eq } = await import("drizzle-orm");
          await db.update(users).set({ 
            isAdmin: true, 
            subscriptionTier: 'geoquest_explorer' 
          }).where(eq(users.id, user.id));
          user.isAdmin = true;
          user.subscriptionTier = 'geoquest_explorer';
          console.log(`👑 [Admin] Auto-promoted ${user.email} to admin with full access (email login)`);
        }
      }

      const playersList = await storage.getPlayersByUserId(user.id);

      // Create session for email/password login
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };

      req.login(sessionUser, async (err: any) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        console.log("🔐 [Auth] User Login:", {
          userId: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          timestamp: new Date().toISOString(),
        });

        await logLoginAttempt(req, user.email || email, true, user.id);

        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            name: user.firstName,
            email: user.email,
            emailVerified: user.emailVerified,
          },
          players: playersList.map(p => ({ id: p.id, name: p.name, age: p.age })),
        });
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // ── POST /api/auth/token — JWT login for RoamUs native app ──────────────────
  // Accepts email + password, returns a signed JWT (7-day expiry).
  // GeoQuest web app is unaffected — it continues to use /api/login + sessions.
  app.post('/api/auth/token', authRateLimit, async (req: any, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        return res.status(500).json({ message: "Server misconfigured" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        await logLoginAttempt(req, email, false, user?.id, 'Token endpoint: invalid credentials');
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        await logLoginAttempt(req, email, false, user.id, 'Token endpoint: wrong password');
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        secret,
        { expiresIn }
      );

      await logLoginAttempt(req, user.email || email, true, user.id);
      console.log("🔐 [JWT] Token issued:", { userId: user.id, email: user.email });

      res.json({
        token,
        expiresIn,
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error("Error issuing JWT token:", error);
      res.status(500).json({ message: "Failed to issue token" });
    }
  });

  // ── POST /api/auth/refresh — refresh a JWT without re-entering credentials ──
  // Takes the current Bearer token, returns a new one with a fresh 7-day expiry.
  // The old token continues to work until its original expiry.
  app.post('/api/auth/refresh', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Bearer token required" });
      }

      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        return res.status(500).json({ message: "Server misconfigured" });
      }

      const token = authHeader.slice(7);
      const payload = jwt.verify(token, secret) as { userId: string; email: string };

      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const expiresIn = 7 * 24 * 60 * 60;
      const newToken = jwt.sign(
        { userId: user.id, email: user.email },
        secret,
        { expiresIn }
      );

      console.log("🔄 [JWT] Token refreshed:", { userId: user.id });

      res.json({ token: newToken, expiresIn });
    } catch (error) {
      console.error("JWT refresh error:", error);
      res.status(401).json({ message: "Invalid or expired token" });
    }
  });

  app.get('/api/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await logSensitiveDataAccess(req, userId, 'users', { action: 'list_all_users' });
      
      const { db } = await import("../db");
      const { users, players } = await import('@workspace/db');
      
      const allUsers = await db.select().from(users);
      const allPlayers = await db.select().from(players);

      const usersWithPlayers = allUsers.map(user => ({
        ...sanitizeUser(user),
        players: allPlayers.filter(p => p.userId === user.id),
      }));

      res.json(usersWithPlayers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/players/:playerId', isAuthenticated, async (req: any, res) => {
    try {
      const { playerId } = req.params;
      const requestingUserId = req.user?.claims?.sub;
      const player = await storage.getPlayerById(playerId);
      
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      if (player.userId !== requestingUserId) {
        const admin = await isAdminUser(requestingUserId);
        if (!admin) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      res.json(player);
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ message: "Failed to fetch player" });
    }
  });

  app.get('/api/players/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.claims?.sub;
      
      if (userId !== requestingUserId) {
        const admin = await isAdminUser(requestingUserId);
        if (!admin) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const playersList = await storage.getPlayersByUserId(userId);
      res.json(playersList);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.get('/api/players/email/:email', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email } = req.params;
      const requestingUserId = req.user?.claims?.sub;
      await logSensitiveDataAccess(req, requestingUserId, 'players_by_email', { email });
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const playersList = await storage.getPlayersByUserId(user.id);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
        },
        players: playersList.map(p => ({
          id: p.id,
          name: p.name,
          age: p.age,
          gamesPlayed: p.gamesPlayed,
          starsEarnedTotal: p.starsEarnedTotal,
          dailyQuestStreak: p.dailyQuestStreak,
          crossworldStreak: p.crossworldStreak,
        })),
      });
    } catch (error) {
      console.error("Error fetching players by email:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.patch('/api/players/:playerId/stats', async (req, res) => {
    try {
      const { playerId } = req.params;
      
      const parseResult = updatePlayerStatsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid stats data",
          errors: fromError(parseResult.error).toString()
        });
      }
      
      // IMPORTANT: Exclude certain fields from stats sync updates to prevent overwrites
      // - starsEarnedTotal, collectedCardIds, gamesPlayed: modified via /add-game-rewards only
      // - streakFreezes, dailyQuestStreak, dailyQuestMaxStreak: managed by game-session recording only
      // These are server-authoritative values that shouldn't be overwritten by client localStorage
      const { 
        starsEarnedTotal, 
        collectedCardIds, 
        gamesPlayed, 
        streakFreezes,
        dailyQuestStreak,
        dailyQuestMaxStreak,
        ...safeStats 
      } = parseResult.data;
      
      const player = await storage.updatePlayerStats(playerId, safeStats);
      
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      console.log("📊 [DB] Player Stats Updated:", {
        playerId: player.id,
        name: player.name,
        gamesPlayed: player.gamesPlayed,
        starsEarnedTotal: player.starsEarnedTotal,
        dailyQuestStreak: player.dailyQuestStreak,
        crossworldStreak: player.crossworldStreak,
        timestamp: new Date().toISOString(),
      });
      
      res.json(player);
    } catch (error) {
      console.error("Error updating player stats:", error);
      res.status(500).json({ message: "Failed to update player stats" });
    }
  });

  // Add game rewards to a specific explorer (stars and cards for multiplayer distribution)
  app.post('/api/players/:playerId/add-game-rewards', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { stars, cardIds, gamesPlayed } = req.body;
      
      // Get current player
      const currentPlayer = await storage.getPlayerById(playerId);
      if (!currentPlayer) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      // Build update object
      const updateData: any = {};
      
      // Add stars if provided
      if (typeof stars === 'number' && stars > 0) {
        updateData.starsEarnedTotal = (currentPlayer.starsEarnedTotal || 0) + stars;
      }
      
      // Add cards if provided (merge with existing, deduplicate)
      if (Array.isArray(cardIds) && cardIds.length > 0) {
        const existingCards = (currentPlayer.collectedCardIds as string[]) || [];
        const combinedCards = [...existingCards, ...cardIds] as string[];
        const newCards = Array.from(new Set(combinedCards));
        updateData.collectedCardIds = newCards;
      }
      
      // Increment games played if requested
      if (gamesPlayed) {
        updateData.gamesPlayed = (currentPlayer.gamesPlayed || 0) + 1;
      }
      
      // Only update if there's something to update
      if (Object.keys(updateData).length === 0) {
        return res.json({ success: true, player: currentPlayer, message: "No rewards to add" });
      }
      
      const player = await storage.updatePlayerStats(playerId, updateData);
      
      console.log("🎮 [DB] Game Rewards Added to Explorer:", {
        playerId: player?.id,
        name: player?.name,
        starsAdded: stars || 0,
        cardsAdded: cardIds?.length || 0,
        newStarsTotal: player?.starsEarnedTotal,
        newCardsTotal: (player?.collectedCardIds as string[])?.length || 0,
        timestamp: new Date().toISOString(),
      });
      
      res.json({ success: true, player });
    } catch (error) {
      console.error("Error adding game rewards to player:", error);
      res.status(500).json({ message: "Failed to add game rewards" });
    }
  });

  // Record a game session (unified streak + per-game stats)
  // Accepts clientLocalDate (YYYY-MM-DD format) to handle timezone correctly
  app.post('/api/players/:playerId/game-session', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { gameType, won, timeMs, clientLocalDate } = req.body;
      
      if (!gameType || !['guess_and_go', 'daily_quest', 'crossworld'].includes(gameType)) {
        return res.status(400).json({ message: "Valid gameType is required: guess_and_go, daily_quest, or crossworld" });
      }
      
      if (typeof won !== 'boolean') {
        return res.status(400).json({ message: "won (boolean) is required" });
      }
      
      // Use client's local date if provided (YYYY-MM-DD format), otherwise use server UTC date
      const result = await storage.recordGameSession(playerId, gameType, won, timeMs, clientLocalDate);
      
      console.log("🎯 [GameSession] Recorded:", {
        playerId,
        gameType,
        won,
        timeMs,
        newStreak: result.streakResult.newStreak,
        graceUsed: result.streakResult.graceUsed,
        streakReset: result.streakResult.streakReset,
        totalGames: result.gameStats.totalGames,
        wins: result.gameStats.wins,
      });
      
      let xpAwarded = 0;
      let leveledUp = false;
      let newRankName: string | undefined;
      let oldRankName: string | undefined;
      let oldRankIcon: string | undefined;
      let newRankIcon: string | undefined;
      try {
        const baseXp = won ? XP_REWARDS.GAME_WIN : XP_REWARDS.GAME_PLAY;
        let bonusXp = 0;
        if (gameType === 'daily_quest' && won) bonusXp += XP_REWARDS.DAILY_QUEST_BONUS;
        if (gameType === 'crossworld' && won) bonusXp += (XP_REWARDS.CROSSWORLD_WIN - XP_REWARDS.GAME_WIN);
        const streakDays = result.streakResult.newStreak || 0;
        if (streakDays > 1) bonusXp += Math.min(streakDays * XP_REWARDS.STREAK_BONUS_PER_DAY, XP_REWARDS.STREAK_BONUS_CAP);
        xpAwarded = baseXp + bonusXp;
        const xpResult = await storage.awardXp(playerId, xpAwarded);
        const rankInfo = getExplorerRank(xpResult.totalXp);
        const prevRankInfo = getExplorerRank(xpResult.previousXp);
        leveledUp = rankInfo.level > prevRankInfo.level;
        if (leveledUp) {
          newRankName = rankInfo.rank.name;
          newRankIcon = rankInfo.rank.icon;
          oldRankName = prevRankInfo.rank.name;
          oldRankIcon = prevRankInfo.rank.icon;
        }
      } catch (xpErr) {
        console.error("[XP] Error awarding XP:", xpErr);
      }

      res.json({
        success: true,
        player: result.player,
        gameStats: result.gameStats,
        streakResult: result.streakResult,
        xpAwarded,
        totalXp: result.player?.totalXp || 0,
        leveledUp,
        newRankName,
        oldRankName,
        oldRankIcon,
        newRankIcon,
      });
    } catch (error) {
      console.error("Error recording game session:", error);
      res.status(500).json({ message: "Failed to record game session" });
    }
  });

  app.get('/api/players/:playerId/xp', async (req, res) => {
    try {
      const { playerId } = req.params;
      const totalXp = await storage.getPlayerXp(playerId);
      const rankInfo = getExplorerRank(totalXp);
      res.json({ success: true, ...rankInfo });
    } catch (error) {
      console.error("Error fetching player XP:", error);
      res.status(500).json({ message: "Failed to fetch XP" });
    }
  });

  app.post('/api/players/:playerId/award-xp', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { source, amount } = req.body;
      const xpAmount = amount || (XP_REWARDS as Record<string, number>)[source] || 0;
      if (xpAmount <= 0) {
        return res.status(400).json({ message: "Invalid XP source or amount" });
      }
      const result = await storage.awardXp(playerId, xpAmount);
      const rankInfo = getExplorerRank(result.totalXp);
      const prevRankInfo = getExplorerRank(result.previousXp);
      const leveledUp = rankInfo.level > prevRankInfo.level;
      res.json({
        success: true,
        xpAwarded: xpAmount,
        ...rankInfo,
        leveledUp,
        newRankName: leveledUp ? rankInfo.rank.name : undefined,
        oldRankName: leveledUp ? prevRankInfo.rank.name : undefined,
        newRankIcon: leveledUp ? rankInfo.rank.icon : undefined,
        oldRankIcon: leveledUp ? prevRankInfo.rank.icon : undefined,
      });
    } catch (error) {
      console.error("Error awarding XP:", error);
      res.status(500).json({ message: "Failed to award XP" });
    }
  });

  // Get per-game stats for a player
  app.get('/api/players/:playerId/game-stats', async (req, res) => {
    try {
      const { playerId } = req.params;
      const stats = await storage.getPlayerGameStats(playerId);
      
      res.json({ success: true, stats });
    } catch (error) {
      console.error("Error fetching game stats:", error);
      res.status(500).json({ message: "Failed to fetch game stats" });
    }
  });

  // Get stats for a specific game type
  app.get('/api/players/:playerId/game-stats/:gameType', async (req, res) => {
    try {
      const { playerId, gameType } = req.params;
      const stats = await storage.getPlayerGameStatsByType(playerId, gameType);
      
      if (!stats) {
        return res.json({ 
          success: true, 
          stats: {
            playerId,
            gameType,
            totalGames: 0,
            wins: 0,
            losses: 0,
            bestTimeMs: null,
            recentOutcomes: [],
          }
        });
      }
      
      res.json({ success: true, stats });
    } catch (error) {
      console.error("Error fetching game stats:", error);
      res.status(500).json({ message: "Failed to fetch game stats" });
    }
  });

  // Add encountered animal to explorer's album
  app.post('/api/players/:playerId/encountered-animals', async (req, res) => {
    try {
      const { playerId } = req.params;
      const { animalId } = req.body;
      
      if (!animalId) {
        return res.status(400).json({ message: "Animal ID is required" });
      }
      
      const currentPlayer = await storage.getPlayerById(playerId);
      if (!currentPlayer) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      const existingAnimals = (currentPlayer.encounteredAnimalIds as string[]) || [];
      
      if (existingAnimals.includes(animalId)) {
        return res.json({ success: true, player: currentPlayer, message: "Animal already in album" });
      }
      
      const updatedAnimals = [...existingAnimals, animalId];
      const player = await storage.updatePlayerStats(playerId, {
        encounteredAnimalIds: updatedAnimals,
      });
      
      console.log("🦁 [DB] Animal Added to Album:", {
        playerId: player?.id,
        name: player?.name,
        animalId,
        totalAnimals: updatedAnimals.length,
        timestamp: new Date().toISOString(),
      });
      
      res.json({ success: true, player });
    } catch (error) {
      console.error("Error adding encountered animal:", error);
      res.status(500).json({ message: "Failed to add encountered animal" });
    }
  });

  // Parental challenge endpoint for secure delete verification
  app.get('/api/parental-challenge', (req, res) => {
    const challenge = generateParentalChallenge();
    res.json({
      a: challenge.a,
      b: challenge.b,
      token: challenge.token,
    });
  });

  // Explorer Management Routes (Multi-Profile System)
  app.get('/api/explorers/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const explorers = await storage.getActiveExplorers(userId);
      res.json(explorers);
    } catch (error) {
      console.error("Error fetching explorers:", error);
      res.status(500).json({ message: "Failed to fetch explorers" });
    }
  });

  app.get('/api/explorers/archived/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const explorers = await storage.getArchivedExplorers(userId);
      res.json(explorers);
    } catch (error) {
      console.error("Error fetching archived explorers:", error);
      res.status(500).json({ message: "Failed to fetch archived explorers" });
    }
  });

  app.get('/api/explorers/count/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const count = await storage.getExplorerCount(userId);
      res.json({ count, maxAllowed: 7 });
    } catch (error) {
      console.error("Error fetching explorer count:", error);
      res.status(500).json({ message: "Failed to fetch explorer count" });
    }
  });

  app.post('/api/explorers/create', async (req, res) => {
    try {
      const { userId, name, age, profileType, ageRange, avatarKey, difficultyLevel, email } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      let effectiveUserId = userId;

      // For local users (email login), ensure the user exists in the database
      if (userId && userId.startsWith('local_')) {
        // Check if user exists
        const existingUser = await storage.getUser(userId);
        if (!existingUser) {
          // Create the user in the database using upsert
          await storage.upsertUser({
            id: userId,
            email: email || `${userId.replace('local_', '')}@geoquest.local`,
            firstName: name,
          });
          console.log("📝 [User] Created local user:", userId);
        }
      }

      // Check max explorers limit based on subscription tier
      // Free: 3 explorers, Pro/Founding: 7 explorers, Admin: unlimited
      if (effectiveUserId) {
        const user = await storage.getUser(effectiveUserId);
        const count = await storage.getExplorerCount(effectiveUserId);
        
        // Admin users have unlimited explorers
        const isAdmin = user?.isAdmin === true;
        if (!isAdmin) {
          // Check if user has an active trial
          const hasActiveTrial = user?.trialEndDate ? new Date(user.trialEndDate) > new Date() : false;
          
          // Determine tier-based limit
          const isPro = hasActiveTrial ||
                        user?.subscriptionTier === 'geoquest_explorer' || 
                        user?.subscriptionTier === 'geogames' || 
                        user?.subscriptionTier === 'geoquest_plus' || 
                        user?.subscriptionTier === 'founding' ||
                        user?.subscriptionTier === 'trial' ||
                        user?.isFoundingFamily === true;
          const maxExplorers = isPro ? 7 : 3;
          
          if (count >= maxExplorers) {
            return res.status(400).json({ 
              message: isPro 
                ? "Maximum 7 explorers allowed per Pro account" 
                : "Maximum 3 explorers allowed. Upgrade to Pro for up to 7 explorers!" 
            });
          }
        }
        
        // Check adult explorer limit (1 per account)
        if (profileType === 'adult' || ageRange === 'adult') {
          const existingExplorers = await storage.getActiveExplorers(effectiveUserId);
          const hasAdult = existingExplorers.some(e => e.profileType === 'adult' || e.ageRange === 'adult');
          if (hasAdult) {
            return res.status(400).json({ message: "Only 1 adult explorer allowed per account" });
          }
        }
      }

      const explorer = await storage.createPlayer({
        userId: effectiveUserId || undefined,
        name,
        age: age || "unknown",
        profileType: profileType || "kid",
        ageRange,
        avatarKey: avatarKey || "panda",
        difficultyLevel: difficultyLevel || "medium",
        isGuest: !effectiveUserId,
        isArchived: false,
      });

      console.log("🧭 [Explorer] Created:", {
        id: explorer.id,
        name: explorer.name,
        profileType: explorer.profileType,
        isGuest: explorer.isGuest,
        timestamp: new Date().toISOString(),
      });

      res.json(explorer);
    } catch (error) {
      console.error("Error creating explorer:", error);
      res.status(500).json({ message: "Failed to create explorer" });
    }
  });

  app.post('/api/explorers/guest', async (req, res) => {
    try {
      const { name, profileType, ageRange, avatarKey, difficultyLevel } = req.body;
      
      const explorer = await storage.createGuestExplorer({
        name: name || "Explorer",
        profileType: profileType || "kid",
        ageRange,
        avatarKey: avatarKey || "panda",
        difficultyLevel: difficultyLevel || "medium",
      });

      console.log("🧭 [Guest Explorer] Created:", {
        id: explorer.id,
        name: explorer.name,
        profileType: explorer.profileType,
        timestamp: new Date().toISOString(),
      });

      res.json(explorer);
    } catch (error) {
      console.error("Error creating guest explorer:", error);
      res.status(500).json({ message: "Failed to create guest explorer" });
    }
  });

  app.get('/api/explorers/guest/:explorerId', async (req, res) => {
    try {
      const { explorerId } = req.params;
      const explorer = await storage.getGuestExplorer(explorerId);
      
      if (!explorer) {
        return res.status(404).json({ message: "Guest explorer not found" });
      }
      
      res.json(explorer);
    } catch (error) {
      console.error("Error fetching guest explorer:", error);
      res.status(500).json({ message: "Failed to fetch guest explorer" });
    }
  });

  app.post('/api/explorers/convert', async (req, res) => {
    try {
      const { explorerId, userId } = req.body;
      
      if (!explorerId || !userId) {
        return res.status(400).json({ message: "Explorer ID and User ID are required" });
      }

      // Check max explorers limit based on subscription tier
      const user = await storage.getUser(userId);
      const count = await storage.getExplorerCount(userId);
      
      // Admin users have unlimited explorers
      const isAdmin = user?.isAdmin === true;
      if (!isAdmin) {
        // Check if user has an active trial
        const hasActiveTrial = user?.trialEndDate ? new Date(user.trialEndDate) > new Date() : false;
        
        const isPro = hasActiveTrial ||
                      user?.subscriptionTier === 'geoquest_explorer' || 
                      user?.subscriptionTier === 'geogames' || 
                      user?.subscriptionTier === 'geoquest_plus' || 
                      user?.subscriptionTier === 'founding' ||
                      user?.subscriptionTier === 'trial' ||
                      user?.isFoundingFamily === true;
        const maxExplorers = isPro ? 7 : 3;
        
        if (count >= maxExplorers) {
          return res.status(400).json({ 
            message: isPro 
              ? "Maximum 7 explorers allowed per Pro account" 
              : "Maximum 3 explorers allowed. Upgrade to Pro for up to 7 explorers!" 
          });
        }
      }

      const explorer = await storage.convertGuestToUser(explorerId, userId);
      
      if (!explorer) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      console.log("🧭 [Explorer] Converted from guest:", {
        id: explorer.id,
        name: explorer.name,
        userId,
        timestamp: new Date().toISOString(),
      });

      res.json(explorer);
    } catch (error) {
      console.error("Error converting guest explorer:", error);
      res.status(500).json({ message: "Failed to convert guest explorer" });
    }
  });

  app.patch('/api/explorers/:explorerId', async (req, res) => {
    try {
      const { explorerId } = req.params;
      const { name, avatarKey, difficultyLevel, ageRange } = req.body;

      const explorer = await storage.updateExplorerProfile(explorerId, {
        name,
        avatarKey,
        difficultyLevel,
        ageRange,
      });

      if (!explorer) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      console.log("🧭 [Explorer] Updated:", {
        id: explorer.id,
        name: explorer.name,
        timestamp: new Date().toISOString(),
      });

      res.json(explorer);
    } catch (error) {
      console.error("Error updating explorer:", error);
      res.status(500).json({ message: "Failed to update explorer" });
    }
  });

  app.post('/api/explorers/:explorerId/archive', async (req, res) => {
    try {
      const { explorerId } = req.params;
      const explorer = await storage.archiveExplorer(explorerId);

      if (!explorer) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      console.log("🧭 [Explorer] Archived:", {
        id: explorer.id,
        name: explorer.name,
        timestamp: new Date().toISOString(),
      });

      res.json(explorer);
    } catch (error) {
      console.error("Error archiving explorer:", error);
      res.status(500).json({ message: "Failed to archive explorer" });
    }
  });

  app.post('/api/explorers/:explorerId/restore', async (req, res) => {
    try {
      const { explorerId } = req.params;
      const explorer = await storage.restoreExplorer(explorerId);

      if (!explorer) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      console.log("🧭 [Explorer] Restored:", {
        id: explorer.id,
        name: explorer.name,
        timestamp: new Date().toISOString(),
      });

      res.json(explorer);
    } catch (error) {
      console.error("Error restoring explorer:", error);
      res.status(500).json({ message: "Failed to restore explorer" });
    }
  });

  app.delete('/api/explorers/:explorerId', isAuthenticated, async (req: any, res) => {
    try {
      const { explorerId } = req.params;
      const userId = req.user?.claims?.sub;
      const { parentalChallenge } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Server-side parental lock verification using signed token
      if (!parentalChallenge || typeof parentalChallenge.token !== 'string' || 
          typeof parentalChallenge.answer !== 'number') {
        return res.status(400).json({ message: "Parental verification required" });
      }

      const verification = verifyParentalChallenge(parentalChallenge.token, parentalChallenge.answer);
      if (!verification.valid) {
        return res.status(403).json({ message: verification.error || "Parental verification failed" });
      }

      const explorers = await storage.getActiveExplorers(userId);
      const explorerToDelete = explorers.find(e => e.id === explorerId);
      
      if (!explorerToDelete) {
        return res.status(404).json({ message: "Explorer not found or not owned by user" });
      }

      const deleted = await storage.deleteExplorer(explorerId);

      if (!deleted) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      console.log("🧭 [Explorer] Permanently deleted:", {
        id: explorerId,
        userId,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, message: "Explorer permanently deleted" });
    } catch (error) {
      console.error("Error deleting explorer:", error);
      res.status(500).json({ message: "Failed to delete explorer" });
    }
  });

  app.post('/api/email/weekly-progress', async (req, res) => {
    try {
      const { email, playerName, stats } = req.body;
      
      if (!email || !playerName || !stats) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const success = await sendWeeklyProgressEmail(
        user.firstName || 'Parent',
        email,
        playerName,
        stats
      );
      
      if (success) {
        res.json({ message: "Weekly progress email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending weekly progress email:", error);
      res.status(500).json({ message: "Failed to send weekly progress email" });
    }
  });

  app.post('/api/email/daily-reminder', async (req, res) => {
    try {
      const { email, playerNames } = req.body;
      
      if (!email || !playerNames || !Array.isArray(playerNames)) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const success = await sendDailyReminderEmail(
        user.firstName || 'Parent',
        email,
        playerNames
      );
      
      if (success) {
        res.json({ message: "Daily reminder email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending daily reminder email:", error);
      res.status(500).json({ message: "Failed to send daily reminder email" });
    }
  });

  app.post('/api/email/subscribe-reminder', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        user = await storage.upsertUser({
          email,
          firstName: email.split('@')[0],
          lastName: '',
          passwordHash: null,
          registrationSource: 'reminder_signup',
          emailVerified: false,
          emailSubscribed: true,
          dailyReminderEmails: true,
          weeklyProgressEmails: false,
        });
        console.log("📧 [Email] New reminder subscriber created:", email);
      } else {
        await storage.updateEmailPreferences(email, {
          emailSubscribed: true,
          dailyReminderEmails: true,
        });
        console.log("📧 [Email] Existing user subscribed to reminders:", email);
      }
      
      res.json({ message: "Successfully subscribed to daily reminders" });
    } catch (error) {
      console.error("Error subscribing to reminders:", error);
      res.status(500).json({ message: "Failed to subscribe to reminders" });
    }
  });

  app.post('/api/email/test', async (req, res) => {
    try {
      const { email, type } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      let success = false;
      
      switch (type) {
        case 'welcome':
          success = await sendWelcomeEmail('Test Parent', email, ['Explorer 1', 'Explorer 2']);
          break;
        case 'weekly':
          success = await sendWeeklyProgressEmail('Test Parent', email, 'Explorer 1', {
            gamesPlayed: 10,
            totalStars: 45,
            citiesVisited: 15,
            currentStreak: 3,
            newCitiesThisWeek: 5,
            starsEarnedThisWeek: 12
          });
          break;
        case 'daily':
          success = await sendDailyReminderEmail('Test Parent', email, ['Explorer 1', 'Explorer 2']);
          break;
        default:
          success = await sendWelcomeEmail('Test Parent', email, ['Test Explorer']);
      }
      
      if (success) {
        res.json({ message: `Test ${type || 'welcome'} email sent successfully to ${email}` });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email", error: String(error) });
    }
  });

  app.get('/api/email/preferences', async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const preferences = await storage.getEmailPreferences(email);
      
      if (!preferences) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching email preferences:", error);
      res.status(500).json({ message: "Failed to fetch email preferences" });
    }
  });

  app.post('/api/email/preferences', async (req, res) => {
    try {
      const { email, preferences } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.updateEmailPreferences(email, preferences);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Preferences updated successfully", preferences });
    } catch (error) {
      console.error("Error updating email preferences:", error);
      res.status(500).json({ message: "Failed to update email preferences" });
    }
  });

  app.post('/api/email/unsubscribe', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.updateEmailPreferences(email, {
        emailSubscribed: false,
        weeklyProgressEmails: false,
        dailyReminderEmails: false,
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`📧 User unsubscribed from all emails: ${email}`);
      res.json({ message: "Successfully unsubscribed from all emails" });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  app.post('/api/email/resubscribe', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.updateEmailPreferences(email, {
        emailSubscribed: true,
        weeklyProgressEmails: true,
        dailyReminderEmails: true,
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`📧 User resubscribed to emails: ${email}`);
      res.json({ message: "Successfully resubscribed to emails" });
    } catch (error) {
      console.error("Error resubscribing:", error);
      res.status(500).json({ message: "Failed to resubscribe" });
    }
  });

  // Pro Waitlist endpoint
  app.post('/api/waitlist', async (req, res) => {
    try {
      const { email, visitorId, playerId, userId } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      // Check if email already on waitlist
      const existing = await storage.getWaitlistByEmail(email);
      if (existing) {
        return res.json({ message: "You're already on the waitlist!", alreadyExists: true });
      }
      
      // Add to waitlist
      const entry = await storage.addToWaitlist({
        email,
        visitorId: visitorId || null,
        playerId: playerId || null,
        userId: userId || null,
        source: 'upgrade_dialog',
      });
      
      console.log(`🎉 New Pro waitlist signup: ${email}`);
      res.status(201).json({ message: "You're on the list! We'll notify you when Pro is available.", entry });
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  // Pending Transfers - Guest player progress transfer on registration
  // Requires authentication to prevent spam
  app.post('/api/pending-transfers', isAuthenticated, async (req: any, res) => {
    try {
      const { email, playerName, invitedByUserId, invitedByUserEmail, invitedByFamilyName } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      if (!playerName) {
        return res.status(400).json({ message: "Player name is required" });
      }
      
      if (!invitedByUserId) {
        return res.status(400).json({ message: "Inviter user ID is required" });
      }
      
      // Normalize email and player name for consistent matching
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedPlayerName = playerName.trim().replace(/\s+/g, ' '); // Collapse multiple spaces
      
      // Check if there's already a pending transfer for this email+name (reuse existing invite)
      const existingTransfers = await storage.getPendingTransfersByEmail(normalizedEmail);
      const matchingTransfer = existingTransfers.find(t => 
        t.playerName.toLowerCase().trim().replace(/\s+/g, ' ') === normalizedPlayerName.toLowerCase()
      );
      
      if (matchingTransfer) {
        console.log(`📧 Invitation already exists for ${normalizedEmail} (${matchingTransfer.playerName}), reusing`);
        // Return the existing transfer so the UI can proceed
        return res.status(201).json({ 
          message: "Invitation already exists for this email - they can join your game!", 
          alreadyExists: true,
          transfer: matchingTransfer
        });
      }
      
      // Set expiry date 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Create pending transfer record
      const transfer = await storage.createPendingTransfer({
        email: normalizedEmail,
        playerName: normalizedPlayerName,
        invitedByUserId,
        invitedByUserEmail: invitedByUserEmail || null,
        invitedByFamilyName: invitedByFamilyName || null,
        expiresAt,
      });
      
      // Send invitation email
      try {
        const inviterName = invitedByFamilyName || 'A GeoQuest Family';
        const sent = await sendPlayerInviteEmail(email, playerName, inviterName);
        if (sent) {
          await storage.markTransferInvitationSent(transfer.id);
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Continue even if email fails - user can still claim later
      }
      
      console.log(`👋 Player invitation created for ${email} (${playerName})`);
      res.status(201).json({ message: "Invitation sent", transfer });
    } catch (error) {
      console.error("Error creating pending transfer:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });
  
  // Check for pending transfers by email
  app.get('/api/pending-transfers/:email', async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      
      const transfers = await storage.getPendingTransfersByEmail(email.toLowerCase());
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching pending transfers:", error);
      res.status(500).json({ message: "Failed to fetch pending transfers" });
    }
  });
  
  // Claim a pending transfer - requires authentication
  app.post('/api/pending-transfers/:id/claim', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const transfer = await storage.claimPendingTransfer(id, userId);
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found or already claimed" });
      }
      
      console.log(`✅ Pending transfer claimed: ${transfer.email} (${transfer.playerName})`);
      res.json({ message: "Transfer claimed successfully", transfer });
    } catch (error) {
      console.error("Error claiming transfer:", error);
      res.status(500).json({ message: "Failed to claim transfer" });
    }
  });
  
  // Update pending transfer stats (for tracking guest game progress)
  app.post('/api/pending-transfers/stats', async (req, res) => {
    try {
      const { email, playerName, stats } = req.body;
      
      if (!email || !playerName || !stats) {
        return res.status(400).json({ message: "Email, playerName, and stats are required" });
      }
      
      const updated = await storage.updatePendingTransferStats(email, playerName, stats);
      
      if (!updated) {
        return res.status(404).json({ message: "No pending transfer found for this player" });
      }
      
      console.log(`📊 Updated transfer stats for ${playerName} (${email}): +${stats.stars} stars, +${stats.cardIds?.length || 0} cards`);
      res.json({ message: "Stats updated", sessionStats: updated.sessionStats });
    } catch (error) {
      console.error("Error updating pending transfer stats:", error);
      res.status(500).json({ message: "Failed to update stats" });
    }
  });

  // Email verification endpoints
  app.post('/api/email/send-verification', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found. Please register first." });
      }
      
      if (user.emailVerified) {
        return res.json({ message: "Email already verified", verified: true });
      }
      
      const code = generateVerificationCode();
      await storage.setVerificationCode(email, code);
      
      const sent = await sendVerificationEmail(email, code);
      
      if (sent) {
        console.log(`📧 Verification code sent to ${email}`);
        res.json({ message: "Verification code sent", sent: true });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Error sending verification code:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post('/api/email/verify', async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }
      
      const result = await storage.verifyEmail(email, code);
      
      if (result.success) {
        console.log(`✅ Email verified: ${email}`);
        
        // Fetch user and players to return with verification
        const user = await storage.getUserByEmail(email);
        const players = user ? await storage.getPlayersByUserId(user.id) : [];
        
        res.json({ 
          success: true, 
          message: result.message,
          user: user ? {
            id: user.id,
            name: user.firstName,
            email: user.email,
          } : null,
          players: players.map(p => ({ id: p.id, name: p.name, age: p.age }))
        });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  app.get('/api/email/verification-status', async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const verified = await storage.isEmailVerified(email);
      res.json({ verified });
    } catch (error) {
      console.error("Error checking verification status:", error);
      res.status(500).json({ message: "Failed to check verification status" });
    }
  });

  // Update user name
  app.patch('/api/users/:userId/name', async (req, res) => {
    try {
      const { userId } = req.params;
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Name is required" });
      }
      
      const user = await storage.updateUserName(userId, name.trim());
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`✅ User name updated: ${userId} -> ${name.trim()}`);
      res.json({ success: true, user });
    } catch (error) {
      console.error("Error updating user name:", error);
      res.status(500).json({ message: "Failed to update name" });
    }
  });

  // Update narrator voice preference
  app.post('/api/user/narrator-voice', async (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = (req.user as any).id;
      const { voice } = req.body;
      
      if (!voice || !['eva', 'avi'].includes(voice)) {
        return res.status(400).json({ message: "Voice must be 'eva' or 'avi'" });
      }
      
      await db.update(users).set({ narratorVoice: voice }).where(eq(users.id, userId));
      
      console.log(`✅ Narrator voice updated: ${userId} -> ${voice}`);
      res.json({ success: true, voice });
    } catch (error) {
      console.error("Error updating narrator voice:", error);
      res.status(500).json({ message: "Failed to update voice preference" });
    }
  });

  // Email change - send verification code
  app.post('/api/email/change-request', async (req, res) => {
    try {
      const { userId, newEmail } = req.body;
      
      if (!userId || !newEmail) {
        return res.status(400).json({ message: "User ID and new email are required" });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Check if email is already in use
      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: "This email is already registered to another account" });
      }
      
      // Generate and store verification code
      const code = generateVerificationCode();
      await storage.setEmailChangeCode(userId, newEmail, code);
      
      // Send verification email to the new email address
      const sent = await sendVerificationEmail(newEmail, code);
      
      if (sent) {
        console.log(`📧 Email change verification code sent to ${newEmail} for user ${userId}`);
        res.json({ success: true, message: "Verification code sent" });
      } else {
        res.status(500).json({ message: "Failed to send verification email" });
      }
    } catch (error) {
      console.error("Error sending email change verification:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Email change - verify and update
  app.post('/api/email/change-verify', async (req, res) => {
    try {
      const { userId, newEmail, code } = req.body;
      
      if (!userId || !newEmail || !code) {
        return res.status(400).json({ message: "User ID, new email, and code are required" });
      }
      
      const result = await storage.verifyEmailChange(userId, newEmail, code);
      
      if (result.success) {
        console.log(`✅ Email changed for user ${userId} to ${newEmail}`);
        res.json({ success: true, message: "Email changed successfully" });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error verifying email change:", error);
      res.status(500).json({ message: "Failed to verify email change" });
    }
  });

  // Password reset endpoints
  app.post('/api/auth/forgot-password', passwordResetRateLimit, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      if (!user) {
        console.log(`📧 Password reset requested for non-existent email: ${email}`);
        return res.json({ message: "If an account exists with this email, you will receive a password reset code." });
      }
      
      // Check if user has a password (email signup, not OAuth)
      if (!user.passwordHash) {
        console.log(`📧 Password reset requested for OAuth user: ${email}`);
        return res.json({ message: "If an account exists with this email, you will receive a password reset code." });
      }
      
      const code = generateVerificationCode();
      await storage.setPasswordResetCode(email, code);
      
      const sent = await sendPasswordResetEmail(email, code);
      
      if (sent) {
        console.log(`📧 Password reset code sent to ${email}`);
      } else {
        console.error(`📧 Failed to send password reset email to ${email}`);
      }
      
      // Always return success to prevent email enumeration
      res.json({ message: "If an account exists with this email, you will receive a password reset code." });
    } catch (error) {
      console.error("Error sending password reset code:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post('/api/auth/verify-reset-code', async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }
      
      const result = await storage.verifyPasswordResetCode(email, code);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error verifying reset code:", error);
      res.status(500).json({ message: "Failed to verify reset code" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "Email, code, and new password are required" });
      }
      
      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      // Hash the new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      const result = await storage.resetPassword(email, code, newPasswordHash);
      
      if (result.success) {
        console.log(`✅ Password reset successful for: ${email}`);
        res.json({ success: true, message: "Password reset successfully. You can now log in with your new password." });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Analytics authentication - now requires admin login instead of weak password
  app.post('/api/analytics/auth', authRateLimit, async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ANALYTICS_PASSWORD;
      
      // If no password is set, reject all requests
      if (!adminPassword) {
        console.warn("⚠️ ANALYTICS_PASSWORD not set - analytics auth disabled");
        return res.status(503).json({ success: false, message: "Analytics authentication not configured" });
      }
      
      if (password === adminPassword) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: "Incorrect password" });
      }
    } catch (error) {
      console.error("Error authenticating analytics:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Analytics endpoints
  app.post('/api/analytics/event', async (req, res) => {
    try {
      const parseResult = insertGameEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid event data",
          errors: fromError(parseResult.error).toString()
        });
      }
      
      const event = await storage.recordGameEvent(parseResult.data);
      
      console.log("📊 [Analytics] Game Event:", {
        eventType: event.eventType,
        gameMode: event.gameMode,
        starsEarned: event.starsEarned,
        timestamp: event.createdAt,
      });
      
      res.status(201).json({ message: "Event recorded", eventId: event.id });
    } catch (error) {
      console.error("Error recording game event:", error);
      res.status(500).json({ message: "Failed to record event" });
    }
  });

  app.get('/api/analytics/summary', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const summary = await storage.getAnalyticsSummary(days);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  app.get('/api/analytics/events', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await storage.getRecentEvents(limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching recent events:", error);
      res.status(500).json({ message: "Failed to fetch recent events" });
    }
  });

  app.post('/api/session/start', async (req, res) => {
    try {
      const { visitorId, playerId, deviceType, landingPage, hostname } = req.body;
      
      if (!visitorId) {
        return res.status(400).json({ message: "Visitor ID is required" });
      }
      
      const existingSession = await storage.getActiveSession(visitorId);
      if (existingSession) {
        return res.json({ sessionId: existingSession.id, resumed: true, isFirstSession: existingSession.isFirstSession });
      }
      
      const isFirstSession = await storage.isFirstVisitorSession(visitorId);
      
      const ua = req.headers['user-agent'] || '';
      let osPlatform = 'Unknown';
      if (/iPhone|iPad|iPod/.test(ua)) osPlatform = 'iOS';
      else if (/Android/.test(ua)) osPlatform = 'Android';
      else if (/Mac OS X|Macintosh/.test(ua)) osPlatform = 'macOS';
      else if (/Windows/.test(ua)) osPlatform = 'Windows';
      else if (/Linux/.test(ua)) osPlatform = 'Linux';
      else if (/CrOS/.test(ua)) osPlatform = 'ChromeOS';

      let browserName = 'Unknown';
      if (/Edg\//.test(ua)) browserName = 'Edge';
      else if (/OPR\/|Opera/.test(ua)) browserName = 'Opera';
      else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browserName = 'Chrome';
      else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browserName = 'Safari';
      else if (/Firefox\//.test(ua)) browserName = 'Firefox';
      
      const session = await storage.createUserSession({
        visitorId,
        playerId: playerId || null,
        deviceType: deviceType || 'desktop',
        isFirstSession,
        landingPage: landingPage || null,
        osPlatform,
        browserName,
        hostname: hostname || null,
      });
      
      await storage.markPwaReturn(visitorId);
      
      console.log("📊 [Session] Started:", { sessionId: session.id, visitorId, isFirstSession, deviceType });
      res.status(201).json({ sessionId: session.id, resumed: false, isFirstSession });
    } catch (error) {
      console.error("Error starting session:", error);
      res.status(500).json({ message: "Failed to start session" });
    }
  });

  app.post('/api/session/update', async (req, res) => {
    try {
      const { sessionId, totalTimeSeconds, gameTimeSeconds, pagesVisited, gamesPlayed, firstGameStartedAt, firstGameCompletedAt } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      const updates: any = {};
      if (totalTimeSeconds !== undefined) updates.totalTimeSeconds = totalTimeSeconds;
      if (gameTimeSeconds !== undefined) updates.gameTimeSeconds = gameTimeSeconds;
      if (pagesVisited !== undefined) updates.pagesVisited = pagesVisited;
      if (gamesPlayed !== undefined) updates.gamesPlayed = gamesPlayed;
      if (firstGameStartedAt !== undefined) updates.firstGameStartedAt = new Date(firstGameStartedAt);
      if (firstGameCompletedAt !== undefined) updates.firstGameCompletedAt = new Date(firstGameCompletedAt);
      
      const session = await storage.updateUserSession(sessionId, updates);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.post('/api/session/end', async (req, res) => {
    try {
      const { sessionId, totalTimeSeconds, gameTimeSeconds } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      const session = await storage.endSession(
        sessionId,
        totalTimeSeconds || 0,
        gameTimeSeconds || 0
      );
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      console.log("📊 [Session] Ended:", {
        sessionId: session.id,
        totalTime: `${Math.round((session.totalTimeSeconds || 0) / 60)}min`,
        gameTime: `${Math.round((session.gameTimeSeconds || 0) / 60)}min`,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  app.get('/api/analytics/time-summary', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const summary = await storage.getTimeSummary(days);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching time summary:", error);
      res.status(500).json({ message: "Failed to fetch time summary" });
    }
  });

  app.post('/api/analytics/pwa-install', async (req, res) => {
    try {
      const { visitorId, playerId, deviceType } = req.body;
      
      if (!visitorId) {
        return res.status(400).json({ message: "Visitor ID is required" });
      }
      
      const install = await storage.recordPwaInstall({
        visitorId,
        playerId: playerId || null,
        deviceType: deviceType || 'mobile',
      });
      
      console.log("📱 [PWA] Install recorded:", { visitorId, deviceType });
      res.status(201).json({ success: true, installId: install.id });
    } catch (error) {
      console.error("Error recording PWA install:", error);
      res.status(500).json({ message: "Failed to record PWA install" });
    }
  });

  app.get('/api/analytics/enhanced-metrics', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const metrics = await storage.getAnalyticsMetrics(startDate, endDate);
      const pwaStats = await storage.getPwaInstallStats(startDate, endDate);
      
      res.json({
        ...metrics,
        pwaInstalls: pwaStats.installs,
        pwaReturnRate: pwaStats.returnRate,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
      });
    } catch (error) {
      console.error("Error fetching enhanced analytics:", error);
      res.status(500).json({ message: "Failed to fetch enhanced analytics" });
    }
  });

  // Daily Quest Cities API
  app.get('/api/daily-quest/city', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let city = await storage.getDailyQuestCityForDate(today);
      
      if (!city) {
        const unusedCity = await storage.getUnusedDailyQuestCity();
        if (unusedCity) {
          city = await storage.markCityAsUsed(unusedCity.id, today);
        }
      }
      
      if (!city) {
        return res.status(404).json({ message: "No cities available for Daily Quest" });
      }
      
      res.json(city);
    } catch (error) {
      console.error("Error fetching daily quest city:", error);
      res.status(500).json({ message: "Failed to fetch daily quest city" });
    }
  });

  app.get('/api/daily-quest/cities', async (req, res) => {
    try {
      const cities = await storage.getAllDailyQuestCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching daily quest cities:", error);
      res.status(500).json({ message: "Failed to fetch daily quest cities" });
    }
  });

  app.post('/api/daily-quest/seed', async (req, res) => {
    try {
      const result = await seedDailyQuestCities();
      res.json(result);
    } catch (error) {
      console.error("Error seeding daily quest cities:", error);
      res.status(500).json({ message: "Failed to seed daily quest cities" });
    }
  });

  app.get('/api/stories', async (req, res) => {
    try {
      const now = new Date();
      const stories = await db
        .select({
          id: geoBuddyStories.id,
          cityId: geoBuddyStories.cityId,
          title: geoBuddyStories.title,
          subtitle: geoBuddyStories.subtitle,
          seasonNumber: geoBuddyStories.seasonNumber,
          episodeNumber: geoBuddyStories.episodeNumber,
          durationSeconds: geoBuddyStories.durationSeconds,
          summary: geoBuddyStories.summary,
          releaseDate: geoBuddyStories.releaseDate,
          isReleased: geoBuddyStories.isReleased,
          coverImageUrl: geoBuddyStories.coverImageUrl,
          createdAt: geoBuddyStories.createdAt,
          cityName: dailyQuestCities.city,
          countryName: dailyQuestCities.country,
          cityFlag: dailyQuestCities.flag,
          cityImageUrl: dailyQuestCities.imageUrl,
        })
        .from(geoBuddyStories)
        .leftJoin(dailyQuestCities, eq(geoBuddyStories.cityId, dailyQuestCities.id))
        .where(and(eq(geoBuddyStories.isReleased, true), lte(geoBuddyStories.releaseDate, now)))
        .orderBy(desc(geoBuddyStories.releaseDate));

      let completedStoryIds: string[] = [];
      const userId = (req as any).user?.id;
      if (userId) {
        const progress = await db
          .select({ storyId: accountStoryProgress.storyId })
          .from(accountStoryProgress)
          .where(and(eq(accountStoryProgress.userId, userId), eq(accountStoryProgress.completed, true)));
        completedStoryIds = progress.map(p => p.storyId);
      }

      const nextEpisode = await db
        .select({
          id: geoBuddyStories.id,
          title: geoBuddyStories.title,
          subtitle: geoBuddyStories.subtitle,
          seasonNumber: geoBuddyStories.seasonNumber,
          episodeNumber: geoBuddyStories.episodeNumber,
          durationSeconds: geoBuddyStories.durationSeconds,
          summary: geoBuddyStories.summary,
          releaseDate: geoBuddyStories.releaseDate,
          coverImageUrl: geoBuddyStories.coverImageUrl,
          cityImageUrl: dailyQuestCities.imageUrl,
        })
        .from(geoBuddyStories)
        .leftJoin(dailyQuestCities, eq(geoBuddyStories.cityId, dailyQuestCities.id))
        .where(gt(geoBuddyStories.releaseDate, now))
        .orderBy(asc(geoBuddyStories.releaseDate))
        .limit(1);

      res.json({ stories, completedStoryIds, nextEpisode: nextEpisode[0] || null });
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.get('/api/stories/city/:cityId', async (req, res) => {
    try {
      const { cityId } = req.params;
      const now = new Date();
      const stories = await db
        .select()
        .from(geoBuddyStories)
        .where(and(
          eq(geoBuddyStories.cityId, cityId),
          eq(geoBuddyStories.isReleased, true),
          lte(geoBuddyStories.releaseDate, now)
        ));

      let completedStoryIds: string[] = [];
      const userId = (req as any).user?.id;
      if (userId) {
        const progress = await db
          .select({ storyId: accountStoryProgress.storyId })
          .from(accountStoryProgress)
          .where(and(eq(accountStoryProgress.userId, userId), eq(accountStoryProgress.completed, true)));
        completedStoryIds = progress.map(p => p.storyId);
      }

      res.json({ stories, completedStoryIds });
    } catch (error) {
      console.error("Error fetching stories for city:", error);
      res.status(500).json({ message: "Failed to fetch stories for city" });
    }
  });

  app.get('/api/stories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const story = await db
        .select({
          id: geoBuddyStories.id,
          cityId: geoBuddyStories.cityId,
          title: geoBuddyStories.title,
          subtitle: geoBuddyStories.subtitle,
          seasonNumber: geoBuddyStories.seasonNumber,
          episodeNumber: geoBuddyStories.episodeNumber,
          durationSeconds: geoBuddyStories.durationSeconds,
          summary: geoBuddyStories.summary,
          storyScript: geoBuddyStories.storyScript,
          releaseDate: geoBuddyStories.releaseDate,
          coverImageUrl: geoBuddyStories.coverImageUrl,
          cityName: dailyQuestCities.city,
          countryName: dailyQuestCities.country,
          cityFlag: dailyQuestCities.flag,
          cityImageUrl: dailyQuestCities.imageUrl,
        })
        .from(geoBuddyStories)
        .leftJoin(dailyQuestCities, eq(geoBuddyStories.cityId, dailyQuestCities.id))
        .where(eq(geoBuddyStories.id, id))
        .limit(1);

      if (story.length === 0) {
        return res.status(404).json({ message: "Story not found" });
      }

      let isCompleted = false;
      const userId = (req as any).user?.id;
      if (userId) {
        const progress = await db
          .select({ id: accountStoryProgress.id })
          .from(accountStoryProgress)
          .where(and(
            eq(accountStoryProgress.userId, userId),
            eq(accountStoryProgress.storyId, id),
            eq(accountStoryProgress.completed, true)
          ))
          .limit(1);
        isCompleted = progress.length > 0;
      }

      res.json({ ...story[0], isCompleted });
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ message: "Failed to fetch story" });
    }
  });

  app.post('/api/stories/:id/complete', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const story = await db
        .select()
        .from(geoBuddyStories)
        .where(eq(geoBuddyStories.id, id))
        .limit(1);

      if (story.length === 0) {
        return res.status(404).json({ message: "Story not found" });
      }

      const storyData = story[0];
      const cityId = storyData.cityId;

      const existing = await db
        .select({ id: accountStoryProgress.id })
        .from(accountStoryProgress)
        .where(and(
          eq(accountStoryProgress.userId, userId),
          eq(accountStoryProgress.storyId, id),
          eq(accountStoryProgress.completed, true)
        ))
        .limit(1);

      if (existing.length > 0) {
        return res.json({ message: "Story already completed", alreadyCompleted: true });
      }

      await db.insert(accountStoryProgress).values({
        userId,
        storyId: id,
        cityId: cityId || '',
        completed: true,
        completedAt: new Date(),
      });

      let explorersUpdated = 0;
      if (cityId) {
        const userPlayers = await db
          .select()
          .from(players)
          .where(eq(players.userId, userId));

        for (const player of userPlayers) {
          const collectedIds = (player.collectedCardIds as string[]) || [];
          const mastery = (player.passportMastery as any[]) || [];

          let needsUpdate = false;
          const updates: any = {};

          if (!collectedIds.includes(cityId)) {
            updates.collectedCardIds = [...collectedIds, cityId];
            const timestamps = (player.collectedCardTimestamps as Record<string, string>) || {};
            updates.collectedCardTimestamps = { ...timestamps, [cityId]: new Date().toISOString() };
            needsUpdate = true;
          }

          const existingMastery = mastery.find((m: any) => m.cityId === cityId);
          if (!existingMastery) {
            updates.passportMastery = [...mastery, {
              cityId,
              star1: true,
              star2: false,
              star3: false,
              star4: false,
              star5: false,
              lastInteraction: new Date().toISOString(),
            }];
            needsUpdate = true;
          } else if (!existingMastery.star1) {
            updates.passportMastery = mastery.map((m: any) =>
              m.cityId === cityId ? { ...m, star1: true, lastInteraction: new Date().toISOString() } : m
            );
            needsUpdate = true;
          }

          if (needsUpdate) {
            await db.update(players).set(updates).where(eq(players.id, player.id));
            explorersUpdated++;
          }
        }
      }

      let xpAwarded = 0;
      if (cityId) {
        const userPlayers2 = await db.select().from(players).where(eq(players.userId, userId));
        for (const p of userPlayers2) {
          try {
            await storage.awardXp(p.id, XP_REWARDS.STORY_COMPLETED + XP_REWARDS.CITY_DISCOVERED);
            xpAwarded = XP_REWARDS.STORY_COMPLETED + XP_REWARDS.CITY_DISCOVERED;
          } catch (e) { /* ignore */ }
        }
      }

      res.json({
        message: "Story completed",
        cityId,
        explorersUpdated,
        cityName: storyData.title,
        xpAwarded,
      });
    } catch (error) {
      console.error("Error completing story:", error);
      res.status(500).json({ message: "Failed to complete story" });
    }
  });

  app.get('/api/stories/progress', async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.json({ completedStoryIds: [], completedCityIds: [] });
      }

      const progress = await db
        .select({
          storyId: accountStoryProgress.storyId,
          cityId: accountStoryProgress.cityId,
        })
        .from(accountStoryProgress)
        .where(and(eq(accountStoryProgress.userId, userId), eq(accountStoryProgress.completed, true)));

      res.json({
        completedStoryIds: progress.map(p => p.storyId),
        completedCityIds: progress.map(p => p.cityId),
      });
    } catch (error) {
      console.error("Error fetching story progress:", error);
      res.status(500).json({ message: "Failed to fetch story progress" });
    }
  });

  app.post('/api/daily-quest/update-images', async (req, res) => {
    try {
      const result = await updateCityImages();
      res.json(result);
    } catch (error) {
      console.error("Error updating city images:", error);
      res.status(500).json({ message: "Failed to update city images" });
    }
  });

  // ===== STICKER SYSTEM ROUTES =====
  
  // Seed city stickers (from daily quest cities)
  app.post('/api/stickers/seed', async (req, res) => {
    try {
      const count = await storage.seedCityStickers();
      res.json({ success: true, count, message: `Seeded ${count} city stickers` });
    } catch (error) {
      console.error("Error seeding city stickers:", error);
      res.status(500).json({ message: "Failed to seed city stickers" });
    }
  });

  // Get all city stickers (for display)
  app.get('/api/stickers/all', async (req, res) => {
    try {
      const stickers = await storage.getAllCityStickers();
      res.json(stickers);
    } catch (error) {
      console.error("Error fetching all stickers:", error);
      res.status(500).json({ message: "Failed to fetch stickers" });
    }
  });

  // Get a sticker by city name (for granting after Daily Quest)
  app.get('/api/stickers/by-city', async (req, res) => {
    try {
      const { city, country } = req.query;
      if (!city || !country) {
        return res.status(400).json({ message: "City and country are required" });
      }
      
      const sticker = await storage.getCityStickerByCity(city as string, country as string);
      if (!sticker) {
        return res.status(404).json({ message: "Sticker not found for this city" });
      }
      
      res.json(sticker);
    } catch (error) {
      console.error("Error fetching sticker by city:", error);
      res.status(500).json({ message: "Failed to fetch sticker" });
    }
  });

  // Grant a sticker to a user (called after successful Daily Quest)
  app.post('/api/stickers/grant', async (req, res) => {
    try {
      const { visitorId, playerId, city, country } = req.body;
      
      if (!visitorId || !city || !country) {
        return res.status(400).json({ message: "visitorId, city, and country are required" });
      }
      
      // Find the sticker for this city
      const sticker = await storage.getCityStickerByCity(city, country);
      if (!sticker) {
        return res.status(404).json({ message: "Sticker not found for this city" });
      }
      
      // Check if this explorer already has this sticker (prevent duplicates)
      const existingStickers = await storage.getUserStickers(visitorId, playerId || null);
      const alreadyHasSticker = existingStickers.some(s => s.stickerId === sticker.id && !s.isTraded);
      
      if (alreadyHasSticker) {
        // Return existing sticker instead of creating duplicate
        const existing = existingStickers.find(s => s.stickerId === sticker.id && !s.isTraded);
        const stats = await storage.getStickerStats(visitorId, playerId || null);
        return res.json({
          success: true,
          alreadyOwned: true,
          sticker: {
            ...existing,
            stickerDetails: sticker,
          },
          stats,
        });
      }
      
      // Grant the sticker to the user
      const userSticker = await storage.grantSticker({
        visitorId,
        playerId: playerId || null,
        stickerId: sticker.id,
        isTraded: false,
      });
      
      // Get updated stats for rank calculation
      const stats = await storage.getStickerStats(visitorId, playerId || null);
      
      res.json({
        success: true,
        sticker: {
          ...userSticker,
          stickerDetails: sticker,
        },
        stats,
      });
    } catch (error) {
      console.error("Error granting sticker:", error);
      res.status(500).json({ message: "Failed to grant sticker" });
    }
  });

  // Get user's stickers collection
  app.get('/api/stickers/user/:visitorId', async (req, res) => {
    try {
      const { visitorId } = req.params;
      const playerId = req.query.playerId as string | undefined;
      const stickers = await storage.getUserStickers(visitorId, playerId || null);
      const stats = await storage.getStickerStats(visitorId, playerId || null);
      
      res.json({ stickers, stats });
    } catch (error) {
      console.error("Error fetching user stickers:", error);
      res.status(500).json({ message: "Failed to fetch user stickers" });
    }
  });

  // City coloring sheets in fixed sequential order - all players get same reward for nth trade
  const CITY_COLORING_SHEETS = [
    { order: 1, city: "Barcelona", url: "/coloring-sheets/barcelona_sagrada_familia_coloring.png" },
    { order: 2, city: "Paris", url: "/coloring-sheets/paris_eiffel_tower_coloring_sheet.png" },
    { order: 3, city: "Tokyo", url: "/coloring-sheets/tokyo_mount_fuji_coloring_sheet.png" },
    { order: 4, city: "New York", url: "/coloring-sheets/new_york_statue_liberty_coloring.png" },
    { order: 5, city: "Cairo", url: "/coloring-sheets/cairo_pyramids_coloring_sheet.png" },
    { order: 6, city: "Sydney", url: "/coloring-sheets/sydney_opera_house_coloring_sheet.png" },
    { order: 7, city: "London", url: "/coloring-sheets/london_big_ben_coloring_sheet.png" },
    { order: 8, city: "Rome", url: "/coloring-sheets/rome_colosseum_coloring_sheet.png" },
    { order: 9, city: "Rio de Janeiro", url: "/coloring-sheets/rio_christ_redeemer_coloring_sheet.png" },
    { order: 10, city: "Dubai", url: "/coloring-sheets/dubai_burj_khalifa_coloring_sheet.png" },
  ];

  // Country coloring sheets - awarded when trading 5 cities from same country
  const COUNTRY_COLORING_SHEETS: Record<string, { name: string; url: string }> = {
    "Iceland": { name: "Iceland Coloring Sheet", url: "/coloring-sheets/iceland_country_coloring.png" },
    "Italy": { name: "Italy Coloring Sheet", url: "/coloring-sheets/italy_country_coloring.png" },
    "Japan": { name: "Japan Coloring Sheet", url: "/coloring-sheets/japan_country_coloring.png" },
    "Peru": { name: "Peru Coloring Sheet", url: "/coloring-sheets/peru_country_coloring.png" },
    "Spain": { name: "Spain Coloring Sheet", url: "/coloring-sheets/spain_country_coloring.png" },
    "Turkey": { name: "Turkey Coloring Sheet", url: "/coloring-sheets/turkey_country_coloring.png" },
    "USA": { name: "USA Coloring Sheet", url: "/coloring-sheets/usa_country_coloring.png" },
    "United States": { name: "USA Coloring Sheet", url: "/coloring-sheets/usa_country_coloring.png" },
    "India": { name: "India Coloring Sheet", url: "/coloring-sheets/india_country_coloring.png" },
    "France": { name: "France Coloring Sheet", url: "/coloring-sheets/france_country_coloring.png" },
    "UK": { name: "UK Coloring Sheet", url: "/coloring-sheets/uk_country_coloring.png" },
    "United Kingdom": { name: "UK Coloring Sheet", url: "/coloring-sheets/uk_country_coloring.png" },
    "Egypt": { name: "Egypt Coloring Sheet", url: "/coloring-sheets/egypt_country_coloring.png" },
    "Brazil": { name: "Brazil Coloring Sheet", url: "/coloring-sheets/brazil_country_coloring.png" },
    "Australia": { name: "Australia Coloring Sheet", url: "/coloring-sheets/australia_country_coloring.png" },
  };

  // Trade stickers for rewards
  app.post('/api/stickers/trade', async (req, res) => {
    try {
      const { visitorId, playerId, stickerIds, tradeType } = req.body;
      
      if (!visitorId || !stickerIds || !Array.isArray(stickerIds) || stickerIds.length !== 5) {
        return res.status(400).json({ message: "visitorId and exactly 5 stickerIds are required" });
      }
      
      // Verify all stickers belong to this user and are not already traded
      const userStickers = await storage.getUserStickers(visitorId, playerId || null);
      const selectedStickers = userStickers.filter(s => stickerIds.includes(s.id));
      
      if (selectedStickers.length !== 5) {
        return res.status(400).json({ message: "Some stickers are not valid or not owned by this user" });
      }
      
      const tradedCount = selectedStickers.filter(s => s.isTraded).length;
      if (tradedCount > 0) {
        return res.status(400).json({ message: `${tradedCount} stickers have already been traded` });
      }
      
      // Check if trading for country coloring sheet (5 cities from same country)
      const countrySet = new Set(selectedStickers.map(s => s.sticker.country));
      const countries = Array.from(countrySet);
      const isCountryTrade = countries.length === 1 && tradeType === 'country_coloring';
      
      let rewardType: string;
      let rewardName: string;
      let rewardUrl: string | undefined;
      let rewardData: any;
      
      if (isCountryTrade) {
        // Country coloring sheet trade - 5 cities from same country
        const country = countries[0];
        const countrySheet = COUNTRY_COLORING_SHEETS[country];
        
        if (countrySheet) {
          rewardType = 'country_coloring';
          rewardName = countrySheet.name;
          rewardUrl = countrySheet.url;
          rewardData = { tradedStickerIds: stickerIds, country };
        } else {
          // Fallback to city coloring sheet if country doesn't have one
          const existingCount = await storage.getColoringSheetCount(visitorId, playerId || null);
          const sheetIndex = existingCount % CITY_COLORING_SHEETS.length;
          const coloringSheet = CITY_COLORING_SHEETS[sheetIndex];
          
          rewardType = 'coloring_sheet';
          rewardName = `${coloringSheet.city} Coloring Sheet`;
          rewardUrl = coloringSheet.url;
          rewardData = { tradedStickerIds: stickerIds, city: coloringSheet.city, order: sheetIndex + 1 };
        }
      } else {
        // Regular city coloring sheet - sequential order based on how many they already have
        const existingCount = await storage.getColoringSheetCount(visitorId, playerId || null);
        const sheetIndex = existingCount % CITY_COLORING_SHEETS.length;
        const coloringSheet = CITY_COLORING_SHEETS[sheetIndex];
        
        rewardType = 'coloring_sheet';
        rewardName = `${coloringSheet.city} Coloring Sheet`;
        rewardUrl = coloringSheet.url;
        rewardData = { tradedStickerIds: stickerIds, city: coloringSheet.city, order: sheetIndex + 1 };
      }
      
      // Mark stickers as traded
      await storage.markStickersAsTraded(stickerIds);
      
      // Grant reward
      const reward = await storage.grantReward({
        visitorId,
        playerId: playerId || null,
        rewardType,
        rewardName,
        rewardUrl,
        rewardData,
      });
      
      // Get updated stats
      const stats = await storage.getStickerStats(visitorId, playerId || null);
      
      res.json({
        success: true,
        reward,
        stats,
      });
    } catch (error) {
      console.error("Error trading stickers:", error);
      res.status(500).json({ message: "Failed to trade stickers" });
    }
  });

  // Send reward to email - uses Replit SendGrid connector
  app.post('/api/rewards/send-email', async (req, res) => {
    try {
      const { rewardId, email, visitorId } = req.body;
      
      if (!rewardId || !email) {
        return res.status(400).json({ message: "rewardId and email are required" });
      }
      
      // Get the reward
      const rewards = await storage.getUserRewards(visitorId);
      const reward = rewards.find(r => r.id === rewardId);
      
      if (!reward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      if (!reward.rewardUrl) {
        return res.status(400).json({ message: "This reward doesn't have a printable image" });
      }
      
      // Use the email utility that connects via Replit SendGrid connector
      const { sendEmail } = await import('../email');
      
      // Use Replit domain in dev, production domain otherwise
      const replitDomain = process.env.REPLIT_DEV_DOMAIN;
      const baseUrl = replitDomain ? `https://${replitDomain}` : (process.env.BASE_URL || 'https://game.geoquestgame.com');
      const fullImageUrl = `${baseUrl}${reward.rewardUrl}`;
      
      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); padding: 30px; border-radius: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #92400e; font-size: 28px; margin: 0;">🎨 Your Coloring Sheet is Here!</h1>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #d97706; text-align: center; margin-top: 0;">${reward.rewardName}</h2>
            
            <p style="color: #78350f; font-size: 16px; line-height: 1.6;">
              Congratulations on earning this reward by trading your city stickers! 🌍✨
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${fullImageUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
                📥 Download & Print Your Coloring Sheet
              </a>
            </div>
            
            <p style="color: #78350f; font-size: 14px; text-align: center;">
              Tip: Print on A4 paper for the best coloring experience!
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #92400e; font-size: 14px;">
              Keep exploring and collecting more stickers! 🗺️
            </p>
            <p style="color: #b45309; font-size: 12px;">
              - The GeoQuest Team
            </p>
          </div>
        </div>
      `;
      
      const success = await sendEmail({
        to: email,
        subject: `Your GeoQuest Reward: ${reward.rewardName}`,
        html,
      });
      
      if (!success) {
        throw new Error('Failed to send email via SendGrid');
      }
      
      console.log(`📧 Sent reward email for "${reward.rewardName}" to ${email}`);
      
      res.json({ success: true, message: "Reward sent to your email!" });
    } catch (error) {
      console.error("Error sending reward email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Get user's rewards
  app.get('/api/rewards/user/:visitorId', async (req, res) => {
    try {
      const { visitorId } = req.params;
      const playerId = req.query.playerId as string | undefined;
      const rewards = await storage.getUserRewards(visitorId, playerId || null);
      
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching user rewards:", error);
      res.status(500).json({ message: "Failed to fetch user rewards" });
    }
  });

  // Get sticker stats (for rank calculation)
  app.get('/api/stickers/stats/:visitorId', async (req, res) => {
    try {
      const { visitorId } = req.params;
      const playerId = req.query.playerId as string | undefined;
      const stats = await storage.getStickerStats(visitorId, playerId || null);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching sticker stats:", error);
      res.status(500).json({ message: "Failed to fetch sticker stats" });
    }
  });

  // Mini-games endpoints
  app.get('/api/mini-games/user/:visitorId', async (req, res) => {
    try {
      const { visitorId } = req.params;
      const playerId = req.query.playerId as string | undefined;
      const games = await storage.getUserMiniGames(visitorId, playerId || null);
      const stats = await storage.getStickerStats(visitorId, playerId || null);
      
      res.json({ 
        games, 
        availableStickers: stats.untradedStickers 
      });
    } catch (error) {
      console.error("Error fetching user mini-games:", error);
      res.status(500).json({ message: "Failed to fetch mini-games" });
    }
  });

  app.post('/api/mini-games/unlock', async (req, res) => {
    try {
      const { visitorId, gameId, cost, playerId } = req.body;
      
      if (!visitorId || !gameId || cost === undefined) {
        return res.status(400).json({ message: "visitorId, gameId, and cost are required" });
      }
      
      // Check if user has enough stickers
      const stats = await storage.getStickerStats(visitorId, playerId || null);
      if (stats.untradedStickers < cost) {
        return res.status(400).json({ 
          message: `Not enough stickers! You need ${cost} but only have ${stats.untradedStickers}` 
        });
      }
      
      // Mark stickers as "spent" for the game (we'll use the isTraded field)
      const userStickers = await storage.getUserStickers(visitorId, playerId || null);
      const untradedStickers = userStickers.filter(s => !s.isTraded);
      const stickersToSpend = untradedStickers.slice(0, cost).map(s => s.id);
      
      if (stickersToSpend.length < cost) {
        return res.status(400).json({ message: "Not enough stickers to unlock this game" });
      }
      
      // Mark stickers as spent
      await storage.markStickersAsTraded(stickersToSpend);
      
      // Unlock the game
      const game = await storage.unlockMiniGame(visitorId, gameId, cost, playerId || null);
      
      res.json({ 
        success: true, 
        game,
        stickersSpent: cost,
        message: `${gameId} unlocked!`
      });
    } catch (error) {
      console.error("Error unlocking mini-game:", error);
      res.status(500).json({ message: "Failed to unlock mini-game" });
    }
  });

  app.post('/api/mini-games/update-score', async (req, res) => {
    try {
      const { visitorId, gameId, score, playerId } = req.body;
      
      if (!visitorId || !gameId || score === undefined) {
        return res.status(400).json({ message: "visitorId, gameId, and score are required" });
      }
      
      const game = await storage.updateMiniGameProgress(visitorId, gameId, score, playerId || null);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found or not unlocked" });
      }
      
      res.json({ success: true, game });
    } catch (error) {
      console.error("Error updating mini-game score:", error);
      res.status(500).json({ message: "Failed to update score" });
    }
  });

  // ===== GEO-ART ROUTES =====
  
  // Save a geo-art creation
  app.post('/api/geo-art/save', async (req, res) => {
    try {
      const { visitorId, countryCode, countryName, imageData, stamps, playerId } = req.body;
      
      if (!visitorId || !countryCode || !countryName || !imageData) {
        return res.status(400).json({ message: "visitorId, countryCode, countryName, and imageData are required" });
      }
      
      // Check if they already created a flag for this country
      const alreadyCreated = await storage.hasCreatedFlagForCountry(visitorId, countryCode);
      
      // Save the creation
      const creation = await storage.saveGeoArtCreation({
        visitorId,
        countryCode,
        countryName,
        imageData,
        stamps: stamps || [],
        stickerAwarded: !alreadyCreated,
        playerId: playerId || null,
      });
      
      console.log(`🎨 [GeoArt] Saved flag creation for ${countryName} by visitor ${visitorId.slice(0, 8)}...`);
      
      res.json({ 
        success: true, 
        creation,
        stickerAwarded: !alreadyCreated,
        message: alreadyCreated 
          ? "Flag saved! (You already earned a sticker for this country)" 
          : `Flag saved! You earned a ${countryName} sticker!`
      });
    } catch (error) {
      console.error("Error saving geo-art creation:", error);
      res.status(500).json({ message: "Failed to save creation" });
    }
  });
  
  // Get user's geo-art creations
  app.get('/api/geo-art/user/:visitorId', async (req, res) => {
    try {
      const { visitorId } = req.params;
      
      if (!visitorId) {
        return res.status(400).json({ message: "visitorId is required" });
      }
      
      const creations = await storage.getUserGeoArtCreations(visitorId);
      res.json(creations);
    } catch (error) {
      console.error("Error fetching geo-art creations:", error);
      res.status(500).json({ message: "Failed to fetch creations" });
    }
  });

  // City coordinates lookup for weather/time API
  const CITY_COORDINATES: Record<string, { lat: number; lng: number; timezone: string }> = {
    "Istanbul": { lat: 41.0082, lng: 28.9784, timezone: "Europe/Istanbul" },
    "Venice": { lat: 45.4408, lng: 12.3155, timezone: "Europe/Rome" },
    "Kyoto": { lat: 35.0116, lng: 135.7681, timezone: "Asia/Tokyo" },
    "Barcelona": { lat: 41.3874, lng: 2.1686, timezone: "Europe/Madrid" },
    "Honolulu": { lat: 21.3069, lng: -157.8583, timezone: "Pacific/Honolulu" },
    "Reykjavik": { lat: 64.1466, lng: -21.9426, timezone: "Atlantic/Reykjavik" },
    "Cusco": { lat: -13.5319, lng: -71.9675, timezone: "America/Lima" },
    "Tokyo": { lat: 35.6762, lng: 139.6503, timezone: "Asia/Tokyo" },
    "Paris": { lat: 48.8566, lng: 2.3522, timezone: "Europe/Paris" },
    "London": { lat: 51.5074, lng: -0.1278, timezone: "Europe/London" },
    "New York": { lat: 40.7128, lng: -74.0060, timezone: "America/New_York" },
    "Sydney": { lat: -33.8688, lng: 151.2093, timezone: "Australia/Sydney" },
    "Cairo": { lat: 30.0444, lng: 31.2357, timezone: "Africa/Cairo" },
    "Rio de Janeiro": { lat: -22.9068, lng: -43.1729, timezone: "America/Sao_Paulo" },
    "Dubai": { lat: 25.2048, lng: 55.2708, timezone: "Asia/Dubai" },
    "Rome": { lat: 41.9028, lng: 12.4964, timezone: "Europe/Rome" },
    "Mumbai": { lat: 19.0760, lng: 72.8777, timezone: "Asia/Kolkata" },
    "Beijing": { lat: 39.9042, lng: 116.4074, timezone: "Asia/Shanghai" },
    "Cape Town": { lat: -33.9249, lng: 18.4241, timezone: "Africa/Johannesburg" },
    "Moscow": { lat: 55.7558, lng: 37.6173, timezone: "Europe/Moscow" },
    "Berlin": { lat: 52.5200, lng: 13.4050, timezone: "Europe/Berlin" },
    "Mexico City": { lat: 19.4326, lng: -99.1332, timezone: "America/Mexico_City" },
    "Buenos Aires": { lat: -34.6037, lng: -58.3816, timezone: "America/Argentina/Buenos_Aires" },
    "Singapore": { lat: 1.3521, lng: 103.8198, timezone: "Asia/Singapore" },
    "Bangkok": { lat: 13.7563, lng: 100.5018, timezone: "Asia/Bangkok" },
    "Seoul": { lat: 37.5665, lng: 126.9780, timezone: "Asia/Seoul" },
    "Amsterdam": { lat: 52.3676, lng: 4.9041, timezone: "Europe/Amsterdam" },
    "Vienna": { lat: 48.2082, lng: 16.3738, timezone: "Europe/Vienna" },
    "Prague": { lat: 50.0755, lng: 14.4378, timezone: "Europe/Prague" },
    "Athens": { lat: 37.9838, lng: 23.7275, timezone: "Europe/Athens" },
    "Lisbon": { lat: 38.7223, lng: -9.1393, timezone: "Europe/Lisbon" },
    "Dublin": { lat: 53.3498, lng: -6.2603, timezone: "Europe/Dublin" },
    "Stockholm": { lat: 59.3293, lng: 18.0686, timezone: "Europe/Stockholm" },
    "Copenhagen": { lat: 55.6761, lng: 12.5683, timezone: "Europe/Copenhagen" },
    "Oslo": { lat: 59.9139, lng: 10.7522, timezone: "Europe/Oslo" },
    "Helsinki": { lat: 60.1699, lng: 24.9384, timezone: "Europe/Helsinki" },
    "Warsaw": { lat: 52.2297, lng: 21.0122, timezone: "Europe/Warsaw" },
    "Budapest": { lat: 47.4979, lng: 19.0402, timezone: "Europe/Budapest" },
    "Zurich": { lat: 47.3769, lng: 8.5417, timezone: "Europe/Zurich" },
    "Toronto": { lat: 43.6532, lng: -79.3832, timezone: "America/Toronto" },
    "Vancouver": { lat: 49.2827, lng: -123.1207, timezone: "America/Vancouver" },
    "Los Angeles": { lat: 34.0522, lng: -118.2437, timezone: "America/Los_Angeles" },
    "Chicago": { lat: 41.8781, lng: -87.6298, timezone: "America/Chicago" },
    "San Francisco": { lat: 37.7749, lng: -122.4194, timezone: "America/Los_Angeles" },
    "Miami": { lat: 25.7617, lng: -80.1918, timezone: "America/New_York" },
    "Nairobi": { lat: -1.2921, lng: 36.8219, timezone: "Africa/Nairobi" },
    "Lagos": { lat: 6.5244, lng: 3.3792, timezone: "Africa/Lagos" },
    "Casablanca": { lat: 33.5731, lng: -7.5898, timezone: "Africa/Casablanca" },
    "Marrakech": { lat: 31.6295, lng: -7.9811, timezone: "Africa/Casablanca" },
    "Auckland": { lat: -36.8509, lng: 174.7645, timezone: "Pacific/Auckland" },
    "Melbourne": { lat: -37.8136, lng: 144.9631, timezone: "Australia/Melbourne" },
    "Delhi": { lat: 28.7041, lng: 77.1025, timezone: "Asia/Kolkata" },
    "Hong Kong": { lat: 22.3193, lng: 114.1694, timezone: "Asia/Hong_Kong" },
    "Shanghai": { lat: 31.2304, lng: 121.4737, timezone: "Asia/Shanghai" },
    "Taipei": { lat: 25.0330, lng: 121.5654, timezone: "Asia/Taipei" },
    "Kuala Lumpur": { lat: 3.1390, lng: 101.6869, timezone: "Asia/Kuala_Lumpur" },
    "Jakarta": { lat: -6.2088, lng: 106.8456, timezone: "Asia/Jakarta" },
    "Manila": { lat: 14.5995, lng: 120.9842, timezone: "Asia/Manila" },
    "Lima": { lat: -12.0464, lng: -77.0428, timezone: "America/Lima" },
    "Santiago": { lat: -33.4489, lng: -70.6693, timezone: "America/Santiago" },
    "Bogota": { lat: 4.7110, lng: -74.0721, timezone: "America/Bogota" },
    "Havana": { lat: 23.1136, lng: -82.3666, timezone: "America/Havana" },
    "Agra": { lat: 27.1767, lng: 78.0081, timezone: "Asia/Kolkata" },
    "Jaipur": { lat: 26.9124, lng: 75.7873, timezone: "Asia/Kolkata" },
    "Petra": { lat: 30.3285, lng: 35.4444, timezone: "Asia/Amman" },
    "Jerusalem": { lat: 31.7683, lng: 35.2137, timezone: "Asia/Jerusalem" },
    "Luxor": { lat: 25.6872, lng: 32.6396, timezone: "Africa/Cairo" },
    "Suva": { lat: -18.1416, lng: 178.4419, timezone: "Pacific/Fiji" },
    "Wellington": { lat: -41.2865, lng: 174.7762, timezone: "Pacific/Auckland" },
    "Perth": { lat: -31.9505, lng: 115.8605, timezone: "Australia/Perth" },
    "Brisbane": { lat: -27.4698, lng: 153.0251, timezone: "Australia/Brisbane" },
    "Bali": { lat: -8.3405, lng: 115.0920, timezone: "Asia/Makassar" },
    "Phuket": { lat: 7.8804, lng: 98.3923, timezone: "Asia/Bangkok" },
    "Hanoi": { lat: 21.0285, lng: 105.8542, timezone: "Asia/Ho_Chi_Minh" },
    "Ho Chi Minh City": { lat: 10.8231, lng: 106.6297, timezone: "Asia/Ho_Chi_Minh" },
  };

  // Weather code to emoji mapping
  function getWeatherEmoji(code: number): string {
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 57) return "🌧️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "🌨️";
    if (code <= 82) return "🌧️";
    if (code <= 86) return "🌨️";
    if (code >= 95) return "⛈️";
    return "🌤️";
  }

  // Get activity description based on local time
  function getTimeActivity(hour: number): string {
    if (hour >= 6 && hour < 9) return "People are having breakfast!";
    if (hour >= 9 && hour < 12) return "People are starting their day!";
    if (hour >= 12 && hour < 14) return "It's lunchtime!";
    if (hour >= 14 && hour < 17) return "The afternoon is in full swing!";
    if (hour >= 17 && hour < 19) return "People are heading home!";
    if (hour >= 19 && hour < 21) return "It's dinner time!";
    if (hour >= 21 && hour < 23) return "People are winding down for the night!";
    return "Everyone is sleeping! 😴";
  }

  // Live city info endpoint (weather + local time)
  app.get('/api/city-live-info/:city', async (req, res) => {
    try {
      const { city } = req.params;
      const coords = CITY_COORDINATES[city];
      
      if (!coords) {
        return res.status(404).json({ message: "City not found", available: Object.keys(CITY_COORDINATES) });
      }

      // Fetch weather from Open-Meteo (free, no API key needed)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=${encodeURIComponent(coords.timezone)}`;
      
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();

      // Calculate local time
      const localTime = new Date().toLocaleString('en-US', { 
        timeZone: coords.timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const localHour = new Date().toLocaleString('en-US', { 
        timeZone: coords.timezone,
        hour: 'numeric',
        hour12: false
      });

      const temperature = Math.round(weatherData.current?.temperature_2m || 0);
      const weatherCode = weatherData.current?.weather_code || 0;
      const weatherEmoji = getWeatherEmoji(weatherCode);
      const activity = getTimeActivity(parseInt(localHour));

      res.json({
        city,
        temperature,
        temperatureUnit: "°F",
        weatherEmoji,
        weatherCode,
        localTime,
        activity,
        timezone: coords.timezone,
        coordinates: { lat: coords.lat, lng: coords.lng }
      });
    } catch (error) {
      console.error("Error fetching city live info:", error);
      res.status(500).json({ message: "Failed to fetch live info" });
    }
  });

  // ============ Geo-Buddy AI Companion Routes ============
  
  const FREE_MONTHLY_LIMIT = 5;
  
  function getMonthStart(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  app.get('/api/geo-buddy/usage/:explorerId', async (req, res) => {
    try {
      const { explorerId } = req.params;
      const player = await storage.getPlayerById(explorerId);
      
      if (!player) {
        return res.json({ questionsUsed: 0, questionsRemaining: FREE_MONTHLY_LIMIT, monthlyLimit: FREE_MONTHLY_LIMIT, isPaid: false });
      }
      
      let isPaid = false;
      if (player.userId) {
        const user = await storage.getUser(player.userId);
        isPaid = user?.subscriptionTier === 'geoquest_explorer' || user?.subscriptionTier === 'geogames' || user?.subscriptionTier === 'geoquest_plus' || user?.subscriptionTier === 'founding';
      }
      
      if (isPaid) {
        return res.json({
          questionsUsed: 0,
          questionsRemaining: -1,
          monthlyLimit: -1,
          isPaid: true
        });
      }
      
      const currentMonthStart = getMonthStart();
      let questionsUsed = player.geoBuddyQuestionsThisMonth || 0;
      
      if (player.geoBuddyMonthStart !== currentMonthStart) {
        questionsUsed = 0;
      }
      
      res.json({
        questionsUsed,
        questionsRemaining: Math.max(0, FREE_MONTHLY_LIMIT - questionsUsed),
        monthlyLimit: FREE_MONTHLY_LIMIT,
        isPaid: false
      });
    } catch (error) {
      console.error("Error fetching Geo-Buddy usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });
  
  app.post('/api/geo-buddy/chat', async (req, res) => {
    try {
      const { message, conversationHistory, ageRange, explorerName, explorerId, context } = req.body;
      const chatContext = context === 'app-help' ? 'app-help' : 'geography';
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      if (explorerId && chatContext !== 'app-help') {
        const player = await storage.getPlayerById(explorerId);
        if (player) {
          let isPaid = false;
          if (player.userId) {
            const user = await storage.getUser(player.userId);
            isPaid = user?.subscriptionTier === 'geoquest_explorer' || user?.subscriptionTier === 'geogames' || user?.subscriptionTier === 'geoquest_plus' || user?.subscriptionTier === 'founding';
          }
          
          if (!isPaid) {
            const currentMonthStart = getMonthStart();
            let questionsUsed = player.geoBuddyQuestionsThisMonth || 0;
            
            if (player.geoBuddyMonthStart !== currentMonthStart) {
              questionsUsed = 0;
            }
            
            if (questionsUsed >= FREE_MONTHLY_LIMIT) {
              return res.status(429).json({
                message: "You've used all 5 questions this month! Come back next month for more geography fun! 🌍",
                limitReached: true,
                questionsRemaining: 0
              });
            }
            
            await storage.updatePlayerStats(explorerId, {
              geoBuddyQuestionsThisMonth: questionsUsed + 1,
              geoBuddyMonthStart: currentMonthStart
            } as any);
          }
        }
      }
      
      const history: ChatMessage[] = conversationHistory || [];
      const response = await getGeoBuddyResponse(message, history, ageRange || "6-9", chatContext);
      
      console.log(`🤖 [Geo-Buddy] Chat (${chatContext}):`, {
        explorer: explorerName || "Guest",
        userMessage: message.substring(0, 50),
        fromDatabase: response.fromDatabase,
        timestamp: new Date().toISOString(),
      });
      
      res.json(response);
    } catch (error) {
      console.error("Error in Geo-Buddy chat:", error);
      res.status(500).json({ 
        message: "Oops! I'm having trouble thinking. Try again in a moment! 🌍",
        fromDatabase: false
      });
    }
  });
  
  app.get('/api/geo-buddy/topics', async (req, res) => {
    try {
      const topics = getSuggestedTopics();
      res.json({ topics });
    } catch (error) {
      console.error("Error fetching Geo-Buddy topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });
  
  app.get('/api/geo-buddy/welcome', async (req, res) => {
    try {
      const { name, ageRange } = req.query;
      const welcomeMessage = getWelcomeMessage(
        (name as string) || "Explorer", 
        (ageRange as string) || "6-9"
      );
      res.json({ message: welcomeMessage });
    } catch (error) {
      console.error("Error fetching Geo-Buddy welcome:", error);
      res.status(500).json({ message: "Failed to get welcome message" });
    }
  });
  
  app.get('/api/geo-buddy/celebration', async (req, res) => {
    try {
      const { name } = req.query;
      const celebration = getRandomCelebration();
      const personalized = name ? `${name}, ${celebration.charAt(0).toLowerCase()}${celebration.slice(1)}` : celebration;
      res.json({ message: personalized });
    } catch (error) {
      res.status(500).json({ message: "Great job! 🌟" });
    }
  });
  
  app.get('/api/geo-buddy/hint', async (req, res) => {
    try {
      const hint = getRandomHint();
      res.json({ message: hint });
    } catch (error) {
      res.status(500).json({ message: "Think about where in the world this might be! 🌍" });
    }
  });

  // === STRIPE SUBSCRIPTION ROUTES ===
  
  app.get('/api/stripe/publishable-key', async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe publishable key:", error);
      res.status(500).json({ message: "Failed to get Stripe key" });
    }
  });

  app.get('/api/stripe/products', async (req, res) => {
    try {
      const products = await stripeService.listProductsWithPrices();
      res.json({ data: products });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/stripe/prices', async (req, res) => {
    try {
      const prices = await stripeService.listPrices();
      res.json({ data: prices });
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  app.post('/api/stripe/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const host = req.get('host');
      const protocol = req.protocol;
      

      
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${protocol}://${host}/pricing?success=true`,
        `${protocol}://${host}/pricing?canceled=true`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });
  
  // Per-trip one-time payment checkout — geo-priced, mode: 'payment'
  // Env vars: STRIPE_PRICE_TRIP_A / STRIPE_PRICE_TRIP_B / STRIPE_PRICE_TRIP_C
  //           STRIPE_PRICE_TRIP_A_FOUNDING / STRIPE_PRICE_TRIP_B_FOUNDING / STRIPE_PRICE_TRIP_C_FOUNDING
  app.post('/api/stripe/checkout/trip-unlock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { useFoundingPrice, tripId, returnUrl } = req.body;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Resolve pricing band → price ID
      const band = (user.pricingBand as string) || 'A';
      const bandKey = ['A', 'B', 'C'].includes(band) ? band : 'A';

      const baseEnvKey = `STRIPE_PRICE_TRIP_${bandKey}`;
      const foundingEnvKey = `STRIPE_PRICE_TRIP_${bandKey}_FOUNDING`;

      const wantFoundingPrice = useFoundingPrice && user.isFoundingFamily;
      const envKey = wantFoundingPrice ? foundingEnvKey : baseEnvKey;
      const priceId = process.env[envKey];

      if (!priceId) {
        console.warn(`[TripCheckout] Missing env var ${envKey} — trip checkout unavailable`);
        return res.status(503).json({ error: "Trip pricing not configured yet. Check back soon." });
      }

      // Ensure Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const host = req.get('host');
      const protocol = req.protocol;
      const safeReturn = returnUrl && /^\/[a-zA-Z0-9\-_/?=&%.]/.test(returnUrl) ? returnUrl : '/build-adventure';

      const session = await stripeService.createOneTimeCheckoutSession(
        customerId,
        priceId,
        `${protocol}://${host}${safeReturn}?tripUnlocked=true`,
        `${protocol}://${host}${safeReturn}?tripCanceled=true`,
        { type: 'trip', ...(tripId ? { tripId } : {}), userId }
      );

      // Create pending unlock record — activated by webhook on checkout.session.completed
      await storage.createTripUnlock({
        userId,
        tripId: tripId || null,
        destination: req.body.destination || 'Unknown',
        stripeSessionId: session.id,
        status: 'pending',
        pricingBand: bandKey,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[TripCheckout] error:", error?.message || error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Per-trip PaymentIntent for in-app checkout sheet (Apple Pay / Google Pay / Card)
  // Band amounts: A=$9.99 USD / B=€7.99 EUR / C=₹199 INR
  // Bundle amounts: A=$14.99 USD / B=€10.99 EUR / C=₹299 INR
  const TRIP_INTENT_AMOUNTS: Record<string, { amount: number; founding: number; bundle: number; currency: string }> = {
    A: { amount: 999,   founding: 599,   bundle: 1499,  currency: 'usd' },
    B: { amount: 799,   founding: 599,   bundle: 1099,  currency: 'eur' },
    C: { amount: 19900, founding: 14900, bundle: 29900, currency: 'inr' },
  };
  app.post('/api/stripe/payment-intent/trip-unlock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { useFoundingPrice, bundleOption, tripId, destination, promoCode } = req.body;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const band = (['A', 'B', 'C'].includes(user.pricingBand as string) ? user.pricingBand : 'A') as string;
      const { amount, founding, bundle, currency } = TRIP_INTENT_AMOUNTS[band];
      const isBundle = bundleOption === 'trip_geopass';
      const wantFounding = !isBundle && useFoundingPrice;
      let finalAmount = isBundle ? bundle : wantFounding ? founding : amount;
      let appliedPromoCodeId: string | undefined;

      // Apply promo code discount if provided
      if (promoCode) {
        const promoRow = await storage.getPromoCode(promoCode);
        if (!promoRow || !promoRow.isActive) {
          return res.status(400).json({ error: "Invalid or inactive promo code" });
        }
        if (promoRow.expiresAt && promoRow.expiresAt <= new Date()) {
          return res.status(400).json({ error: "This promo code has expired" });
        }
        if (promoRow.usedCount >= promoRow.maxUses) {
          return res.status(400).json({ error: "This promo code is fully used" });
        }
        // Enforce trip-scope if code is restricted to a specific trip
        if (promoRow.appliesToTripId && (!tripId || promoRow.appliesToTripId !== tripId)) {
          return res.status(400).json({ error: "This promo code is not valid for this trip" });
        }
        if (promoRow.oneUsePerUser) {
          const alreadyUsed = await storage.getPromoRedemption(promoRow.id, userId);
          if (alreadyUsed) return res.status(400).json({ error: "You have already used this promo code" });
        }
        if (promoRow.accessType === 'discounted') {
          if (promoRow.discountType === 'percent' && promoRow.discountValue) {
            finalAmount = Math.round(finalAmount * (1 - promoRow.discountValue / 100));
          } else if (promoRow.discountType === 'fixed_amount' && promoRow.discountValue) {
            finalAmount = Math.max(0, finalAmount - promoRow.discountValue);
          } else if (promoRow.discountType === 'founding_price') {
            finalAmount = founding;
          }
          appliedPromoCodeId = promoRow.id;
        } else if (promoRow.accessType === 'full_free') {
          // full_free codes should go through /api/promo/redeem, not here
          return res.status(400).json({ error: "Use /api/promo/redeem for free-access codes" });
        }
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const intent = await stripeService.createPaymentIntent(
        customerId,
        finalAmount,
        currency,
        { type: 'trip', userId, ...(tripId ? { tripId } : {}), destination: destination || 'Unknown', ...(isBundle ? { bundleOption: 'trip_geopass' } : {}), ...(appliedPromoCodeId ? { promoCodeId: appliedPromoCodeId } : {}) }
      );

      // Create pending unlock record
      await storage.createTripUnlock({
        userId,
        tripId: tripId || null,
        destination: destination || 'Unknown',
        stripeSessionId: intent.id,
        status: 'pending',
        pricingBand: band,
      });

      // NOTE: Promo redemption is recorded in the webhook (payment_intent.succeeded),
      // not here — to avoid counting abandoned/failed payments against code usage.

      res.json({ clientSecret: intent.client_secret, amount: finalAmount, currency, paymentIntentId: intent.id, promoApplied: !!appliedPromoCodeId });
    } catch (error: any) {
      console.error("[TripPaymentIntent] error:", error?.message || error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // ── PROMO CODE: Validate (public — works for guests too via userId from session or null) ──
  app.get('/api/promo/launch-info', async (_req, res) => {
    try {
      const promo = await storage.getPromoCode('TESTLAUNCH26');
      if (!promo || !promo.isActive) {
        return res.json({ available: false, remainingSpots: 0, totalSpots: 100 });
      }
      const remaining = Math.max(0, promo.maxUses - promo.usedCount);
      res.json({ available: remaining > 0, remainingSpots: remaining, totalSpots: promo.maxUses });
    } catch {
      res.json({ available: true, remainingSpots: 100, totalSpots: 100 });
    }
  });

  app.post('/api/promo/validate', async (req: any, res) => {
    try {
      const { code, tripId } = req.body;
      if (!code) return res.status(400).json({ error: "Code is required" });

      const userId = req.user?.claims?.sub || null;
      const promo = await storage.getPromoCode(code);

      if (!promo) return res.status(404).json({ error: "Invalid code", errorType: "invalid" });
      if (!promo.isActive) return res.status(400).json({ error: "This code is no longer active", errorType: "inactive" });
      if (promo.expiresAt && promo.expiresAt <= new Date()) return res.status(400).json({ error: "This code has expired", errorType: "expired" });
      if (promo.usedCount >= promo.maxUses) {
        const exhaustedMsg = promo.createdBy === 'guide-drip-email5'
          ? "Sorry, this offer is already in use on another account. Contact us at hello@geoadventures.app if you think this is a mistake."
          : "This code is fully used";
        return res.status(400).json({ error: exhaustedMsg, errorType: "exhausted" });
      }
      if (promo.appliesToTripId && tripId && promo.appliesToTripId !== tripId) {
        return res.status(400).json({ error: "This code is for a different trip", errorType: "wrong_trip" });
      }

      if (userId && promo.oneUsePerUser) {
        const alreadyUsed = await storage.getPromoRedemption(promo.id, userId);
        if (alreadyUsed) return res.status(400).json({ error: "You've already used this code", errorType: "already_used" });
      }

      // Compute band-aware discounted amount if the user is logged in
      let discountedAmount: number | undefined;
      let originalAmount: number | undefined;
      if (userId && promo.accessType === 'discounted') {
        const userForBand = await storage.getUser(userId);
        if (userForBand) {
          const bandKey = (['A', 'B', 'C'].includes(userForBand.pricingBand as string) ? userForBand.pricingBand : 'A') as string;
          const tripAmounts: Record<string, { amount: number; founding: number }> = {
            A: { amount: 999,   founding: 599   },
            B: { amount: 799,   founding: 599   },
            C: { amount: 19900, founding: 14900 },
          };
          const { amount, founding } = tripAmounts[bandKey];
          originalAmount = amount;
          let discounted = amount;
          if (promo.discountType === 'percent' && promo.discountValue) {
            discounted = Math.round(amount * (1 - promo.discountValue / 100));
          } else if (promo.discountType === 'fixed_amount' && promo.discountValue) {
            discounted = Math.max(0, amount - promo.discountValue);
          } else if (promo.discountType === 'founding_price') {
            discounted = founding;
          }
          discountedAmount = discounted;
        }
      }

      // redemptionPath clarifies which API endpoint handles this code type:
      // full_free → POST /api/promo/redeem (no Stripe)
      // discounted → POST /api/stripe/payment-intent/trip-unlock with promoCode body param
      //
      // Trip-scoped codes: if appliesToTripId is set, validate passes here for discovery
      // (e.g., /unlock page before trip context is known), but the actual redeem/payment
      // routes enforce strict scope and will reject if tripId doesn't match.
      res.json({
        valid: true,
        accessType: promo.accessType,
        redemptionPath: promo.accessType === 'full_free' ? '/api/promo/redeem' : '/api/stripe/payment-intent/trip-unlock',
        tripScoped: !!promo.appliesToTripId,
        appliesToTripId: promo.appliesToTripId || null,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountedAmount,
        originalAmount,
        label: promo.label,
        code: promo.code,
        codeId: promo.id,
      });
    } catch (error: any) {
      console.error("[PromoValidate] error:", error?.message || error);
      res.status(500).json({ error: "Validation failed" });
    }
  });

  // ── PROMO CODE: Redeem full-free code (creates TripUnlock immediately) ──
  app.post('/api/promo/redeem', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code, tripId, destination } = req.body;
      if (!code) return res.status(400).json({ error: "Code is required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const promo = await storage.getPromoCode(code);
      if (!promo) return res.status(404).json({ error: "Invalid code", errorType: "invalid" });
      if (!promo.isActive) return res.status(400).json({ error: "Code is no longer active", errorType: "inactive" });
      if (promo.expiresAt && promo.expiresAt <= new Date()) return res.status(400).json({ error: "Code has expired", errorType: "expired" });
      if (promo.usedCount >= promo.maxUses) {
        const exhaustedMsg = promo.createdBy === 'guide-drip-email5'
          ? "Sorry, this offer is already in use on another account. Contact us at hello@geoadventures.app if you think this is a mistake."
          : "Code is fully used";
        return res.status(400).json({ error: exhaustedMsg, errorType: "exhausted" });
      }

      if (promo.oneUsePerUser) {
        const alreadyUsed = await storage.getPromoRedemption(promo.id, userId);
        if (alreadyUsed) return res.status(400).json({ error: "You've already used this code", errorType: "already_used" });
      }

      if (promo.accessType !== 'full_free') {
        return res.status(400).json({ error: "This code is for discounted access. Use it during payment via the checkout flow.", errorType: "wrong_type" });
      }

      // Enforce trip scope — if code is restricted to a specific trip, tripId must match
      if (promo.appliesToTripId) {
        if (!tripId || promo.appliesToTripId !== tripId) {
          return res.status(400).json({ error: "This code is only valid for a specific trip. Please use it from the correct trip's unlock screen.", errorType: "wrong_trip" });
        }
      }

      // Create the TripUnlock immediately (no Stripe needed)
      const fakeSessionId = `promo_free_${Date.now()}_${userId}_${promo.id}`;
      const unlock = await storage.createTripUnlock({
        userId,
        tripId: tripId || null,
        destination: destination || 'Unknown',
        stripeSessionId: fakeSessionId,
        status: 'active',
        pricingBand: (user.pricingBand as string) || 'A',
      });

      // Record redemption
      await storage.createPromoRedemption({
        codeId: promo.id,
        userId,
        tripId: tripId || null,
        tripUnlockId: unlock.id,
        status: 'applied',
      });
      await storage.incrementPromoCodeUsage(promo.id);

      console.log(`[PromoRedeem] Full-free unlock: user=${userId}, code=${code}, trip=${tripId}`);
      res.json({ success: true, message: "Trip unlocked via promo code!", unlockId: unlock.id, tripId });
    } catch (error: any) {
      console.error("[PromoRedeem] error:", error?.message || error);
      res.status(500).json({ error: "Redemption failed" });
    }
  });

  // Paywall bypass auto-unlock — only active when PAYWALL_ENABLED=false
  app.post('/api/travel/trips/auto-unlock', isAuthenticated, async (req: any, res) => {
    try {
      if (PAYWALL_ENABLED) {
        return res.status(403).json({ error: "Paywall is enabled" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const { tripId, destination } = req.body;
      const fakeSessionId = `auto_free_${Date.now()}_${userId}`;

      const unlock = await storage.createTripUnlock({
        userId,
        tripId: tripId || null,
        destination: destination || 'Unknown',
        stripeSessionId: fakeSessionId,
        status: 'active',
        pricingBand: 'A',
      });

      console.log(`[TripUnlock] Auto-unlock (paywall disabled) for user ${userId}, trip ${tripId}`);
      res.json({ success: true, unlockId: unlock.id, tripId });
    } catch (error: any) {
      console.error("[AutoUnlock] error:", error?.message || error);
      res.status(500).json({ error: "Failed to auto-unlock trip" });
    }
  });

  // Admin free trip unlock — no Stripe, no payment
  app.post('/api/stripe/trip-unlock/admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (!user.isAdmin) return res.status(403).json({ error: "Admin only" });

      const { tripId, destination } = req.body;
      const fakeSessionId = `admin_free_${Date.now()}_${userId}`;

      await storage.createTripUnlock({
        userId,
        tripId: tripId || null,
        destination: destination || 'Unknown',
        stripeSessionId: fakeSessionId,
        status: 'active',
        pricingBand: 'A',
      });

      console.log(`[TripUnlock] Admin free unlock for user ${userId}, trip ${tripId}`);
      res.json({ success: true, message: "Trip unlocked for free (admin)" });
    } catch (error: any) {
      console.error("[AdminTripUnlock] error:", error?.message || error);
      res.status(500).json({ error: "Failed to unlock trip" });
    }
  });

  // ── Is trip already unlocked? ───────────────────────────────────────────────
  app.get('/api/travel/trips/:tripId/unlock-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tripId } = req.params;
      const user = await storage.getUser(userId);
      if (user?.isAdmin) return res.json({ isUnlocked: true });
      const unlock = await storage.getTripUnlock(userId, tripId);
      res.json({ isUnlocked: !!(unlock && unlock.status === 'active') });
    } catch {
      res.json({ isUnlocked: false });
    }
  });

  // Founding Families checkout - special $4.99/mo with price lock
  app.post('/api/stripe/checkout/founding-families', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if already a founding family member
      if (user.isFoundingFamily) {
        return res.status(400).json({ message: "Already a Founding Family member" });
      }
      
      // Check founding family cap (100)
      const foundingCount = await storage.getFoundingFamilyCount();
      if (foundingCount >= 100) {
        return res.status(400).json({ message: "Founding Families program is full (100 families limit reached)" });
      }
      
      // Reserve the next founding family number
      const foundingNumber = await storage.claimFoundingFamilyNumber(userId);
      if (!foundingNumber) {
        return res.status(400).json({ message: "Founding Families program is full" });
      }
      
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const host = req.get('host');
      const protocol = req.protocol;
      
      const session = await stripeService.createFoundingFamiliesCheckoutSession(
        customerId,
        userId,
        foundingNumber,
        `${protocol}://${host}/pricing?success=true&founding=true`,
        `${protocol}://${host}/pricing?canceled=true`
      );

      res.json({ url: session.url, foundingNumber });
    } catch (error) {
      console.error("Error creating Founding Families checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });
  
  // Get founding families status (available spots, current user status)
  app.get('/api/founding-families/status', async (req: any, res) => {
    try {
      const count = await storage.getFoundingFamilyCount();
      const available = 100 - count;
      const spotsRemaining = Math.max(0, available);
      
      let userStatus = null;
      if (req.user?.claims?.sub) {
        const user = await storage.getUser(req.user.claims.sub);
        if (user) {
          userStatus = {
            isFoundingFamily: user.isFoundingFamily,
            foundingFamilyNumber: user.foundingFamilyNumber,
            priceLockExpiry: user.foundingPriceLockExpiry,
          };
        }
      }
      
      res.json({
        totalSpots: 100,
        claimed: count,
        spotsRemaining,
        isAvailable: spotsRemaining > 0,
        userStatus,
      });
    } catch (error) {
      console.error("Error fetching founding families status:", error);
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });
  
  // Get user's purchased cities
  app.get('/api/user/purchased-cities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const cities = (user?.purchasedCityIds as string[]) || [];
      res.json({ purchasedCities: cities });
    } catch (error) {
      console.error("Error fetching purchased cities:", error);
      res.status(500).json({ message: "Failed to fetch purchased cities" });
    }
  });
  

  app.post('/api/stripe/portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }

      const host = req.get('host');
      const protocol = req.protocol;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${protocol}://${host}/pricing`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  app.get('/api/stripe/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.json({ subscription: null });
      }

      const subscription = await stripeService.getCustomerSubscriptions(user.stripeCustomerId);
      res.json({ subscription });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });
  
  // Cancel subscription at end of billing period (downgrade flow)
  app.post('/api/stripe/subscription/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }
      
      const subscription = await stripeService.cancelSubscriptionAtPeriodEnd(user.stripeSubscriptionId) as any;
      
      // Update local record with subscription end date
      if (subscription.current_period_end) {
        await storage.updateUserSubscription(userId, {
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        });
      }
      
      res.json({ 
        success: true, 
        message: "Subscription will be cancelled at the end of the billing period",
        endDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });
  
  // Reactivate a cancelled subscription (undo downgrade)
  app.post('/api/stripe/subscription/reactivate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      
      // Check if subscription is actually scheduled for cancellation
      const currentSubscription = await stripeService.getSubscription(user.stripeSubscriptionId);
      if (!currentSubscription.cancel_at_period_end) {
        return res.status(400).json({ message: "Subscription is not scheduled for cancellation" });
      }
      
      const subscription = await stripeService.reactivateSubscription(user.stripeSubscriptionId);
      
      // Clear the subscription end date since it's no longer cancelling
      await storage.updateUserSubscription(userId, {
        subscriptionEndDate: undefined,
      });
      
      res.json({ 
        success: true, 
        message: "Subscription has been reactivated",
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({ message: "Failed to reactivate subscription" });
    }
  });
  
  // Get full subscription status including cancellation info
  app.get('/api/stripe/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.json({ 
          hasSubscription: false,
          subscription: null,
        });
      }
      
      const subscription = await stripeService.getSubscription(user.stripeSubscriptionId) as any;
      
      res.json({
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString() 
            : null,
          cancelAt: subscription.cancel_at 
            ? new Date(subscription.cancel_at * 1000).toISOString() 
            : null,
        },
        user: {
          isFoundingFamily: user.isFoundingFamily,
          foundingFamilyNumber: user.foundingFamilyNumber,
          subscriptionTier: user.subscriptionTier,
          subscriptionEndDate: user.subscriptionEndDate,
        },
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // ============ Reward System Routes ============

  // Get all reward tiers
  app.get('/api/rewards/tiers', async (req, res) => {
    try {
      const tiers = await storage.getAllRewardTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching reward tiers:", error);
      res.status(500).json({ message: "Failed to fetch reward tiers" });
    }
  });

  // Get explorer's reward unlocks and status
  app.get('/api/rewards/explorer/:explorerId', async (req, res) => {
    try {
      const { explorerId } = req.params;
      
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      const unlocks = await storage.getExplorerRewardUnlocks(explorerId);
      const allTiers = await storage.getAllRewardTiers();
      
      // Get mastery stats for progress calculation
      const passportMastery = (explorer.passportMastery as Array<{
        cityId: string;
        star1: boolean;
        star2: boolean;
        star3: boolean;
        star4: boolean;
        star5: boolean;
      }>) || [];
      
      const masteredCities = passportMastery.filter(m => 
        m.star1 && m.star2 && m.star3 && m.star4 && m.star5
      );
      
      res.json({
        unlocks,
        allTiers,
        stats: {
          masteredCityCount: masteredCities.length,
          totalCities: passportMastery.length,
        }
      });
    } catch (error) {
      console.error("Error fetching explorer rewards:", error);
      res.status(500).json({ message: "Failed to fetch explorer rewards" });
    }
  });

  // Evaluate rewards for an explorer (call after mastery events)
  app.post('/api/rewards/evaluate/:explorerId', async (req, res) => {
    try {
      const { explorerId } = req.params;
      
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      const newUnlocks = await storage.evaluateRewardsForExplorer(explorerId);
      
      if (newUnlocks.length > 0) {
        console.log(`🎉 [Rewards] Explorer ${explorerId} unlocked ${newUnlocks.length} new reward(s):`, 
          newUnlocks.map(u => u.tierId).join(', '));
      }

      res.json({ newUnlocks });
    } catch (error) {
      console.error("Error evaluating rewards:", error);
      res.status(500).json({ message: "Failed to evaluate rewards" });
    }
  });

  // Get a specific reward unlock by ID
  app.get('/api/rewards/unlock/:unlockId', async (req, res) => {
    try {
      const { unlockId } = req.params;
      
      const unlock = await storage.getRewardUnlockById(unlockId);
      if (!unlock) {
        return res.status(404).json({ message: "Reward unlock not found" });
      }

      res.json(unlock);
    } catch (error) {
      console.error("Error fetching reward unlock:", error);
      res.status(500).json({ message: "Failed to fetch reward unlock" });
    }
  });

  // Claim a reward (parent submission)
  app.post('/api/rewards/claim/:unlockId', async (req, res) => {
    try {
      const { unlockId } = req.params;
      const { parentEmail, shippingAddress } = req.body;

      if (!parentEmail) {
        return res.status(400).json({ message: "Parent email is required" });
      }

      const unlock = await storage.getRewardUnlockById(unlockId);
      if (!unlock) {
        return res.status(404).json({ message: "Reward unlock not found" });
      }

      if (unlock.status !== 'unlocked') {
        return res.status(400).json({ message: "Reward has already been claimed" });
      }

      const updated = await storage.claimReward(unlockId, parentEmail, shippingAddress);
      
      console.log(`📧 [Rewards] Reward claimed:`, {
        unlockId,
        tierId: unlock.tierId,
        tierName: unlock.tier.name,
        parentEmail,
        timestamp: new Date().toISOString(),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error claiming reward:", error);
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  // Get certificate data for a reward unlock
  app.get('/api/rewards/certificate/:unlockId', async (req, res) => {
    try {
      const { unlockId } = req.params;
      
      const unlock = await storage.getRewardUnlockById(unlockId);
      if (!unlock) {
        return res.status(404).json({ message: "Reward unlock not found" });
      }

      if (unlock.tier.rewardType !== 'certificate') {
        return res.status(400).json({ message: "This reward is not a certificate" });
      }

      const explorer = await storage.getPlayerById(unlock.explorerId);
      if (!explorer) {
        return res.status(404).json({ message: "Explorer not found" });
      }

      // Get city names from claim data
      const claimData = unlock.claimData as { masteredCities: string[]; masteredCityCount: number } | null;
      const cityIds = claimData?.masteredCities || [];
      
      // Fetch city details
      const allCities = await storage.getAllDailyQuestCities();
      const masteredCityDetails = cityIds.slice(0, 3).map(id => {
        const city = allCities.find(c => c.id === id);
        return city ? { city: city.city, country: city.country } : null;
      }).filter(Boolean);

      res.json({
        explorerName: explorer.name,
        avatarKey: explorer.avatarKey,
        tierName: unlock.tier.name,
        rewardDescription: unlock.tier.rewardDescription,
        masteredCities: masteredCityDetails,
        unlockedAt: unlock.unlockedAt,
        claimedAt: unlock.claimedAt,
      });
    } catch (error) {
      console.error("Error fetching certificate data:", error);
      res.status(500).json({ message: "Failed to fetch certificate data" });
    }
  });

  // ============================================================================
  // TRAVEL MODE ROUTES (Isolated from World Mode)
  // All routes under /api/travel/* are feature-flagged
  // ============================================================================

  // Background stop generation — called after trip is created and response already sent.
  // All AI calls (OpenAI) happen here so they never block the HTTP response.
  async function generateStopsInBackground(
    tripId: string,
    cityName: string,
    isHomeAdventure: boolean,
    country: string,
    state: string | undefined,
    stopCount: number | undefined,
    adventureStyle: string | undefined,
    destination: string,
    city: string | undefined,
    mealPreferences?: { enabled: boolean; breakfast: boolean; lunch: boolean; snacks: boolean; dinner: boolean; diningStyle: "quick" | "sitdown" | ""; cuisines: string[] } | null,
    tripDays?: number | null,
    pace?: string | null,
  ) {
    try {
      console.log(`🌍 [Travel] [bg] Auto-generating stops for: ${cityName} (tripId=${tripId})`);

      const template = isHomeAdventure ? await storage.getCityAdventureTemplate(cityName, country) : undefined;
      let usedTemplate = false;

      if (template) {
        try {
          const templateStops = template.stopsData as TemplateStop[];
          if (!Array.isArray(templateStops) || templateStops.length === 0) {
            throw new Error("Template has empty or invalid stopsData");
          }
          if (template.latitude && template.longitude) {
            await storage.updateTrip(tripId, { latitude: template.latitude, longitude: template.longitude });
          }
          for (const stop of templateStops) {
            await storage.createStop({
              tripId,
              name: stop.name,
              stopType: stop.stopType || 'landmark',
              displayOrder: stop.displayOrder ?? 0,
              address: stop.address || null,
              description: stop.description || null,
              latitude: stop.latitude || null,
              longitude: stop.longitude || null,
              missionType: stop.missionType || null,
              missionQuestion: stop.missionQuestion || null,
              missionHint: stop.missionHint || null,
              missionAnswer: stop.missionAnswer || null,
              missionDifficulty: stop.missionDifficulty || 'normal',
              missionKeepsakeReward: stop.missionKeepsakeReward || false,
              stopMissions: stop.stopMissions || null,
            });
          }
          const missionCount = templateStops.filter(s => s.missionType).length;
          if (missionCount > 0) {
            await storage.updateTrip(tripId, { totalMissions: missionCount, missionsCompleted: 0, missionXpTotal: 0 });
          }
          console.log(`✅ [Travel] [bg] Cloned ${templateStops.length} stops from template (${missionCount} missions)`);
          usedTemplate = true;

          const templateKeepsakes = template.keepsakesData as TemplateKeepsake[];
          if (Array.isArray(templateKeepsakes) && templateKeepsakes.length > 0) {
            (async () => {
              try {
                const existingArtifacts = await storage.getAllArtifacts();
                const coveredStops = new Set(existingArtifacts.map(a => a.stopName));
                for (const keepsake of templateKeepsakes) {
                  if (!coveredStops.has(keepsake.stopName)) {
                    await storage.createArtifact({
                      stopName: keepsake.stopName,
                      name: keepsake.name,
                      description: keepsake.description,
                      imageEmoji: keepsake.imageEmoji,
                      rarity: keepsake.rarity,
                      unlockType: keepsake.unlockType,
                      unlockConfig: keepsake.unlockConfig || null,
                      displayOrder: keepsake.displayOrder || 1,
                    });
                  }
                }
                console.log(`🏆 [Travel] [bg] Cloned ${templateKeepsakes.length} keepsakes from template`);
              } catch (e) { console.error("Error cloning template keepsakes:", e); }
            })();
          }
        } catch (templateError) {
          console.error(`⚠️ [Travel] [bg] Template cloning failed, falling back to AI:`, templateError);
          const partialStops = await storage.getStopsByTripId(tripId);
          for (const s of partialStops) await storage.deleteStop(s.id);
          usedTemplate = false;
        }
      }

      if (!usedTemplate) {
        // Wait briefly so AdventureBuilder can POST anchors to DB before we generate stops
        await new Promise(r => setTimeout(r, 2500));

        // Compute stop count: always derive from tripDays×pace so the correct number of days shows in the plan
        // packed=4 (not 6) — 6 stops × 90 min avg + travel pushes the day past 10pm
        const stopsPerDayByPace = pace === "chill" ? 3 : pace === "packed" ? 4 : 4;
        const effectiveStopCount = isHomeAdventure ? 5
          : tripDays ? Math.min(tripDays * stopsPerDayByPace, 40)
          : (stopCount || stopsPerDayByPace * 3);
        const fullTrip = await storage.getTripById(tripId);
        const tripTailoring = fullTrip?.tailoring as any;

        // ── Derive children ages for pool selection ───────────────────────────
        let childrenAges: number[] = [];
        try {
          const tripTravelers = (fullTrip?.travelers ?? []) as Array<{ explorerId?: string }>;
          const travelerIds = tripTravelers.map(t => t.explorerId).filter(Boolean) as string[];
          if (travelerIds.length > 0) {
            const explorerRows = await db.select({ age: players.age }).from(players)
              .where(drizzleSql`${players.id} = ANY(${travelerIds})`);
            childrenAges = explorerRows.map(r => parseInt(r.age ?? "0", 10)).filter(n => n > 0);
          }
        } catch { /* non-fatal */ }

        // ── Try pool first (zero AI calls for cached cities) ──────────────────
        let usedPool = false;
        try {
          const cachedPool = await storage.getCityStopPool(cityName, country);
          if (cachedPool && Array.isArray(cachedPool.stopPool) && cachedPool.stopPool.length > 0) {
            console.log(`🎯 [Travel] [bg] Pool hit for ${cityName}`);
            const firstWithCoords = (cachedPool.stopPool as any[]).find(s => s.latitude && s.longitude);
            if (firstWithCoords) {
              await storage.updateTrip(tripId, { latitude: String(firstWithCoords.latitude), longitude: String(firstWithCoords.longitude) });
            }
            const plannerPace: "relaxed" | "moderate" | "busy" =
              pace === "chill" ? "relaxed" : pace === "packed" ? "busy" : "moderate";
            const plannerTripDays = tripDays || Math.ceil(effectiveStopCount / (stopsPerDayByPace || 3));
            const plannerInput: PlannerInput = {
              destination: cityName,
              tripDays: plannerTripDays,
              childrenAges,
              pace: plannerPace,
            };
            const selectedStops = selectStopsFromPool(cachedPool.stopPool as any[], plannerInput, undefined, cityName);
            for (let i = 0; i < selectedStops.length; i++) {
              const stop = selectedStops[i];
              await storage.createStop({
                tripId,
                name: stop.name,
                stopType: stop.type || 'landmark',
                displayOrder: stop.displayOrder ?? i,
                address: stop.address || null,
                description: null,
                latitude: stop.latitude || null,
                longitude: stop.longitude || null,
                missionType: null,
                missionQuestion: null,
                missionHint: null,
                missionAnswer: null,
                missionDifficulty: 'normal',
                missionKeepsakeReward: false,
                stopMissions: null,
                cityGroup: cityName,
                metadata: stop.durationMinutes
                  ? { durationMinutes: stop.durationMinutes, sessionFit: null, durationClass: null, anchorScore: null, dropPriority: null }
                  : null,
              });
            }
            console.log(`✅ [Travel] [bg] Pool-served ${selectedStops.length} stops for ${cityName} (0 AI calls)`);
            usedPool = true;
          }
        } catch (poolErr) {
          console.error(`[Travel] [bg] Pool selection failed, falling back to AI:`, poolErr);
        }

        if (!usedPool) {
          try {
            const openai = getOpenAI();
            const geoResponse = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "You are a geography expert. Return ONLY a JSON object with 'lat' and 'lon' for the given city/destination." },
                { role: "user", content: `Find coordinates for: ${cityName}` },
              ],
              response_format: { type: "json_object" },
            });
            const coords = JSON.parse(geoResponse.choices[0].message.content || "{}");
            if (coords.lat && coords.lon) {
              await storage.updateTrip(tripId, { latitude: String(coords.lat), longitude: String(coords.lon) });
            }
          } catch (e) {
            console.error("[bg] Error fetching trip coordinates:", e);
          }

          // Fetch any pre-booked anchors the user added so AI can plan around them
          let tripAnchorsForGeneration: { name: string; day: number; time: string | null; durationMinutes: number | null; anchorType: string; flexibility: string }[] = [];
          try {
            const existingAnchors = await storage.getAnchorsByTripId(tripId);
            tripAnchorsForGeneration = existingAnchors.map(a => ({
              name: a.name,
              day: a.day,
              time: a.time || null,
              durationMinutes: a.durationMinutes || null,
              anchorType: a.anchorType,
              flexibility: a.flexibility || "hard",
            }));
            if (tripAnchorsForGeneration.length > 0) {
              console.log(`📌 [bg] Found ${tripAnchorsForGeneration.length} anchors to plan around for trip ${tripId}`);
            }
          } catch (e) {
            console.error("[bg] Error fetching anchors:", e);
          }

          // ── Derive explorer age groups for signal-aware generation ────────────
          let tripAgeGroups: string[] = [];
          try {
            const tripTravelers = (fullTrip?.travelers ?? []) as Array<{ explorerId?: string }>;
            const travelerIds = tripTravelers.map(t => t.explorerId).filter(Boolean) as string[];
            if (travelerIds.length > 0) {
              const explorerRows = await db.select({ age: players.age }).from(players)
                .where(drizzleSql`${players.id} = ANY(${travelerIds})`);
              const ageSet = new Set<string>();
              for (const row of explorerRows) {
                const n = parseInt(row.age ?? "0", 10);
                if (n > 0) ageSet.add(ageToGroup(n));
              }
              tripAgeGroups = Array.from(ageSet);
            }
          } catch { /* non-fatal */ }

          const generatedStops = await generateCityStops(
            cityName, state || null, country, effectiveStopCount,
            adventureStyle || 'family_explorer',
            mealPreferences || undefined,
            tripAnchorsForGeneration,
            tripDays || undefined,
            tripTailoring || undefined,
            tripAgeGroups.length > 0 ? tripAgeGroups : undefined
          );
          for (const stop of generatedStops) {
            await storage.createStop({
              tripId,
              name: stop.name,
              stopType: stop.stopType || 'landmark',
              displayOrder: stop.displayOrder,
              address: stop.address || null,
              description: stop.description || null,
              latitude: stop.latitude || null,
              longitude: stop.longitude || null,
              missionType: stop.missionType || null,
              missionQuestion: stop.missionQuestion || null,
              missionHint: stop.missionHint || null,
              missionAnswer: stop.missionAnswer || null,
              missionDifficulty: stop.missionDifficulty || 'normal',
              missionKeepsakeReward: stop.missionKeepsakeReward || false,
              stopMissions: stop.stopMissions
                ? stop.stopMissions.map(m => ({ ...m, xpReward: m.type === 'photo' ? 10 : 5, completed: false, skipped: false, attempts: 0 }))
                : null,
              cityGroup: cityName,
              metadata: (stop.durationMinutes || stop.sessionFit || stop.durationClass || stop.anchorScore || stop.dropPriority)
                ? {
                    durationMinutes: stop.durationMinutes ?? null,
                    sessionFit: stop.sessionFit ?? null,
                    durationClass: stop.durationClass ?? null,
                    anchorScore: stop.anchorScore ?? null,
                    dropPriority: stop.dropPriority ?? null,
                  }
                : null,
            });
          }
          const missionCount = generatedStops.filter(s => s.missionType).length;
          if (missionCount > 0) {
            await storage.updateTrip(tripId, { totalMissions: missionCount, missionsCompleted: 0, missionXpTotal: 0 });
          }
          console.log(`🤖 [Travel] [bg] AI-generated ${generatedStops.length} stops`);
          console.log(`✅ [Travel] [bg] Created ${generatedStops.length} AI stops (${missionCount} missions)`);

          // ── Fire-and-forget: seed AI cold-start signals for new stops ─────────
          generateAIColdStartSignals(
            cityName, country,
            generatedStops.map(s => ({ name: s.name, stopType: s.stopType, latitude: s.latitude, longitude: s.longitude }))
          ).catch(e => console.error("[FamilySignals] Cold-start seed failed:", e));

          (async () => {
            try {
              const existingArtifacts = await storage.getAllArtifacts();
              const coveredStops = new Set(existingArtifacts.map(a => a.stopName));
              const uncoveredStops = generatedStops.filter(s => !coveredStops.has(s.name));
              if (uncoveredStops.length > 0) {
                const cityNameForKeepsakes = city || destination;
                const generated = await generateArtifactsForStops(
                  uncoveredStops.map(s => ({ name: s.name, stopType: s.stopType })),
                  cityNameForKeepsakes
                );
                for (const artifact of generated) {
                  await storage.createArtifact({
                    stopName: artifact.stopName,
                    name: artifact.name,
                    description: artifact.description,
                    imageEmoji: artifact.imageEmoji,
                    rarity: artifact.rarity,
                    unlockType: artifact.unlockType,
                    unlockConfig: artifact.unlockConfig || null,
                    displayOrder: artifact.displayOrder,
                  });
                }
                console.log(`🏆 [Travel] [bg] Generated ${generated.length} keepsakes for ${cityNameForKeepsakes}`);
              }
            } catch (artifactError) {
              console.error("[bg] Error generating keepsakes:", artifactError);
            }
          })();
        }
      }
    } catch (err) {
      console.error(`❌ [Travel] [bg] Stop generation failed for tripId=${tripId}:`, err);
    }
  }

  // Check if Travel Mode is enabled
  const isTravelModeEnabled = () => process.env.VITE_TRAVEL_MODE_ENABLED === 'true';
  
  // Travel Mode feature flag middleware
  const travelModeGuard = (req: any, res: any, next: any) => {
    if (!isTravelModeEnabled()) {
      return res.status(404).json({ message: "Travel Mode is not enabled" });
    }
    next();
  };
  
  app.post('/api/adventure/generate-city-image', isAuthenticated, async (req: any, res) => {
    try {
      const { cityName, country } = req.body;
      if (!cityName) return res.status(400).json({ message: "cityName is required" });
      const { getOrGenerateCityImage } = await import("../adventureImageService");
      const result = await getOrGenerateCityImage(cityName, country);
      res.json(result);
    } catch (error: any) {
      console.error("[AdventureImages] Error:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  app.post('/api/adventure/generate-stop-image', isAuthenticated, async (req: any, res) => {
    try {
      const { stopName, cityName, stopType, country } = req.body;
      if (!stopName || !cityName) return res.status(400).json({ message: "stopName and cityName are required" });
      const { getOrGenerateStopImage } = await import("../adventureImageService");
      const result = await getOrGenerateStopImage(stopName, cityName, stopType, country);
      res.json(result);
    } catch (error: any) {
      console.error("[AdventureImages] Error:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // Batch: generate/fetch AI illustrated images for multiple stops at once.
  // Cached by city+stop slug in DB+disk — a given stop is only generated once, ever.
  app.post('/api/adventure/generate-stop-images-batch', isAuthenticated, async (req: any, res) => {
    try {
      const { stops, cityName, country } = req.body;
      if (!Array.isArray(stops) || !cityName) {
        return res.status(400).json({ message: "stops[] and cityName are required" });
      }
      const { getOrGenerateStopImage } = await import("../adventureImageService");
      const results = await Promise.all(
        stops.map((s: { name: string; stopType?: string }) =>
          getOrGenerateStopImage(s.name, cityName, s.stopType, country)
            .then(r => ({ stopName: s.name, imagePath: r.imagePath, status: r.status }))
            .catch(() => ({ stopName: s.name, imagePath: null as string | null, status: "failed" as const }))
        )
      );
      res.json(results);
    } catch (error: any) {
      console.error("[AdventureImages] Batch error:", error);
      res.status(500).json({ message: "Failed to generate images" });
    }
  });

  app.get('/api/compass/landmark-image/:svgKey', isAuthenticated, async (req: any, res) => {
    try {
      const { svgKey } = req.params;
      const { landmarkName } = req.query;
      const { getOrGenerateLandmarkImage } = await import("../compassLandmarkImageService");
      const imagePath = await getOrGenerateLandmarkImage(svgKey, landmarkName as string | undefined);
      if (imagePath) {
        res.json({ imagePath });
      } else {
        res.status(404).json({ message: "Image not available" });
      }
    } catch (error: any) {
      console.error("[CompassLandmark] Error:", error);
      res.status(500).json({ message: "Failed to get landmark image" });
    }
  });

  app.get('/api/travel/city-landmark-image/:city', async (req: any, res) => {
    try {
      const city = decodeURIComponent(req.params.city as string);
      const { CITY_SVG_KEY } = await import("../cityLandmarkMap.js");
      const svgKey = CITY_SVG_KEY[city];
      if (!svgKey) {
        return res.json({ imageUrl: null });
      }
      const { compassLandmarkImages } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const rows = await db
        .select({ imageData: compassLandmarkImages.imageData })
        .from(compassLandmarkImages)
        .where(eq(compassLandmarkImages.svgKey, svgKey))
        .limit(1);
      if (rows.length === 0 || !rows[0].imageData) {
        return res.json({ imageUrl: null });
      }
      return res.json({ imageUrl: `data:image/png;base64,${rows[0].imageData}` });
    } catch (error: any) {
      req.log?.error({ error }, "[CityLandmarkImage] Error");
      return res.status(500).json({ message: "Failed to get city landmark image" });
    }
  });

  app.get('/api/adventure/city-image/:citySlug', async (req, res) => {
    try {
      const { citySlug } = req.params;
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.default.resolve(process.cwd(), "public", "images", "adventure", "cities", `${citySlug}.png`);
      if (fs.default.existsSync(filePath)) {
        return res.json({ imagePath: `/images/adventure/cities/${citySlug}.png`, status: "ready" });
      }
      return res.json({ imagePath: null, status: "not_found" });
    } catch (error: any) {
      res.status(500).json({ message: "Error checking image" });
    }
  });

  // Builder preview — returns stop_library data for a city (pre-auth teaser shown during onboarding)
  // planner_places is NOT queried here: it's populated by the full trip planner post-registration,
  // not by this endpoint. stop_library is the correct seeded source for this lightweight preview.
  app.get('/api/travel/builder-preview', async (req: any, res) => {
    try {
      const cityRaw = (req.query.city as string || "").trim();
      if (!cityRaw) return res.json({ spots: [] });

      const cityLower = cityRaw.toLowerCase().split(",")[0].trim();

      const ANCHOR_EMOJIS: Record<string, string> = {
        museum: "🏛️", park: "🌿", landmark: "🗺️", nature: "🌄", zoo: "🦁",
        aquarium: "🐠", beach: "🏖️", market: "🛒", playground: "🛝", restaurant: "🍽️",
        viewpoint: "🔭", garden: "🌸", palace: "🏰", temple: "🛕", other: "⭐",
      };

      const libRows = await db
        .select({
          name: stopLibrary.name,
          stopType: stopLibrary.stopType,
          description: stopLibrary.description,
        })
        .from(stopLibrary)
        .where(ilike(stopLibrary.city, `%${cityLower}%`))
        .orderBy(drizzleSql`CASE
          WHEN ${stopLibrary.stopType} ILIKE '%museum%' THEN 0
          WHEN ${stopLibrary.stopType} ILIKE '%park%' THEN 1
          WHEN ${stopLibrary.stopType} ILIKE '%aquarium%' THEN 2
          WHEN ${stopLibrary.stopType} ILIKE '%zoo%' THEN 3
          WHEN ${stopLibrary.stopType} ILIKE '%landmark%' THEN 4
          ELSE 5 END`)
        .limit(8);

      const seen = new Set<string>();
      const spots = libRows
        .filter(r => { const k = r.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 4)
        .map(r => {
          const t = (r.stopType ?? "other").toLowerCase();
          const emojiKey = Object.keys(ANCHOR_EMOJIS).find(k => t.includes(k));
          return {
            emoji: emojiKey ? ANCHOR_EMOJIS[emojiKey] : "⭐",
            type: r.stopType ?? "other",
            name: r.name,
            reason: r.description ? r.description.slice(0, 120) + (r.description.length > 120 ? "…" : "") : `A great stop for families`,
            anchorType: "anchor" as const,
          };
        });

      res.json({ spots });
    } catch (err) {
      req.log?.error({ err }, "[BuilderPreview] Error");
      res.json({ spots: [] });
    }
  });

  // Guest: create a trip without authentication (returns guestToken for later access)
  app.post('/api/travel/trips/guest-create', travelModeGuard, async (req: any, res) => {
    try {
      const { name, destination, country, city, travelers, adventureContext, adventureStyle: rawStyle, pace: rawPace, cityDates, stayLocations, stopCount, tripDays: rawGuestTripDays, autoGenerateStops } = req.body;
      if (!destination || !country || !name) {
        return res.status(400).json({ message: "name, destination, and country are required" });
      }
      const nameSafety = validateUserInput(name);
      if (!nameSafety.safe) return res.status(400).json({ message: nameSafety.message });
      const destinationSafety = validateUserInput(destination);
      if (!destinationSafety.safe) return res.status(400).json({ message: destinationSafety.message });

      const validStyles = ['family_explorer', 'nature_expedition', 'history_culture', 'iconic_highlights', 'foodie_adventure', 'city_explorer'];
      const adventureStyle = validStyles.includes(rawStyle) ? rawStyle : 'family_explorer';
      const validPaces = ['chill', 'balanced', 'packed'];
      const pace = validPaces.includes(rawPace) ? rawPace : 'balanced';

      const { randomUUID } = await import('node:crypto');
      const guestToken = randomUUID().replace(/-/g, '');

      const guestTripDays = rawGuestTripDays ? Number(rawGuestTripDays) : null;

      const trip = await storage.createTrip({
        userId: null as any,
        guestToken,
        name,
        destination,
        country,
        city: city || null,
        travelers: travelers || [],
        adventureContext: adventureContext || 'travel',
        adventureStyle,
        pace,
        tripDays: guestTripDays || undefined,
        cityDates: cityDates || null,
        stayLocations: stayLocations || null,
        allowCompletion: false,
        allowKeepsakes: false,
        allowMediaCapture: false,
        allowOffline: false,
        allowMapDisplay: false,
        contentDepth: 'preview',
      });

      res.json({ ...trip, stops: [], guestToken, _generatingStops: true });

      if (autoGenerateStops !== false && (city || destination)) {
        generateStopsInBackground(
          trip.id,
          city || destination,
          false,
          country,
          undefined,
          stopCount,
          adventureStyle,
          destination,
          city,
          null,
          guestTripDays,
          pace
        );
      }
    } catch (error: any) {
      console.error('[GuestTrip] Create failed:', error);
      res.status(500).json({ message: "Failed to create guest trip" });
    }
  });

  // Claim a guest trip after signing in / signing up
  app.post('/api/travel/trips/:tripId/claim-guest', isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { guestToken } = req.body;
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      if (!guestToken) return res.status(400).json({ message: "guestToken required" });
      const result = await storage.getTripWithDetails(tripId);
      if (!result) return res.status(404).json({ message: "Trip not found" });
      const { trip } = result;
      if (!trip.guestToken || trip.guestToken !== guestToken) {
        return res.status(403).json({ message: "Invalid guest token" });
      }
      // Transfer ownership to the newly authenticated user
      await storage.updateTrip(tripId, { userId, guestToken: null as any });
      res.json({ success: true, tripId });
    } catch (err: any) {
      console.error('[ClaimGuest]', err.message);
      res.status(500).json({ message: "Failed to claim trip" });
    }
  });

  // Guest: view a guest trip by ID + token (no auth required)
  app.get('/api/travel/trips/:tripId/guest-view', travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { token } = req.query;
      if (!token) return res.status(401).json({ message: "Guest token required" });

      const result = await storage.getTripWithDetails(tripId);
      if (!result) return res.status(404).json({ message: "Trip not found" });

      const { trip, stops, moments, memoryStarsData, journeyPacks } = result;
      if (!trip.guestToken || trip.guestToken !== token) {
        return res.status(403).json({ message: "Invalid guest token" });
      }

      const packsByStopId = new Map(journeyPacks.map((p: any) => [p.stopId, p]));
      const stopsWithPackStatus = stops.map((stop: any) => ({
        ...stop,
        journeyPackCompleted: packsByStopId.get(stop.id)?.isCompleted || false,
      }));

      res.json({ ...trip, stops: stopsWithPackStatus, moments, memoryStars: memoryStarsData, _apiVersion: 'guest-v1' });
    } catch (error: any) {
      console.error('[GuestTrip] View failed:', error);
      res.status(500).json({ message: "Failed to fetch guest trip" });
    }
  });

  // Get all trips for a user
  app.get('/api/travel/trips', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const startTime = Date.now();
      const userId = req.user.claims.sub;
      
      const [trips, counts] = await Promise.all([
        storage.getTripsByUserId(userId),
        storage.getTripCountsByUserId(userId),
      ]);
      console.log(`⏱️ [Trips] getTripsByUserId + counts: ${Date.now() - startTime}ms`);
      
      const tripIds = trips.map(t => t.id);
      const [photoMap, stopSummaries] = await Promise.all([
        storage.getFirstPhotoPerTrip(tripIds),
        storage.getStopSummariesForTrips(tripIds),
      ]);
      console.log(`⏱️ [Trips] photos + stops: ${Date.now() - startTime}ms (${trips.length} trips)`);
      
      const tripsWithDetails = trips.map(trip => ({
        ...trip,
        firstPhotoUrl: photoMap.get(trip.id) || null,
        stops: stopSummaries.get(trip.id)?.stops || [],
        totalStops: stopSummaries.get(trip.id)?.totalStops || 0,
        visitedStops: stopSummaries.get(trip.id)?.visitedStops || 0,
      }));
      
      res.json({ trips: tripsWithDetails, counts });
    } catch (error) {
      console.error("Error fetching trips:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });
  
  // Get trip counts by adventure context (for gating free user limits)
  app.get('/api/travel/trips/counts', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const counts = await storage.getTripCountsByUserId(userId);
      res.json(counts);
    } catch (error) {
      console.error("Error fetching trip counts:", error);
      res.status(500).json({ message: "Failed to fetch trip counts" });
    }
  });
  
  // Generate stops for a city using AI
  app.post('/api/travel/generate-stops', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { city, state, country } = req.body;
      
      if (!city || !country) {
        return res.status(400).json({ message: "City and country are required" });
      }

      // Content Safety Check
      const citySafety = validateUserInput(city);
      if (!citySafety.safe) {
        return res.status(400).json({ message: citySafety.message });
      }
      
      console.log(`🌍 [Travel] Generating stops for: ${city}, ${state || ''}, ${country}`);
      const stops = await generateCityStops(city, state || null, country);
      
      res.json({ stops });
    } catch (error) {
      console.error("Error generating stops:", error);
      res.status(500).json({ message: "Failed to generate stops" });
    }
  });

  // Public onboarding preview — no auth required; returns AI-generated stops grouped into days
  app.post('/api/travel/preview', async (req: any, res) => {
    try {
      // Accept both simple { city, country, style } and the full trip payload
      // shape to match POST /api/travel/trips — enabling pre-auth draft previews.
      const {
        city: rawCity, country: rawCountry, style,
        destination, adventureStyle: rawAdventureStyle,
      } = req.body;
      const city = rawCity || destination;
      const country = rawCountry;
      if (!city || !country) {
        return res.status(400).json({ message: 'city and country are required' });
      }
      const validStyles = ['family_explorer','nature_expedition','history_culture','iconic_highlights','foodie_adventure','city_explorer'];
      const rawStyle = rawAdventureStyle ?? style;
      const adventureStyle = validStyles.includes(rawStyle) ? rawStyle : 'family_explorer';

      const stops = await generateCityStops(city, null, country, 6, adventureStyle);

      const SESSION_TIMES = ['9:30 AM', '12:30 PM', '3:00 PM', '10:00 AM', '1:30 PM', '4:00 PM'];
      const CHUNK = 3;
      const days: { label: string; stops: { name: string; description: string; stopType: string; time: string }[] }[] = [];
      for (let d = 0; d < Math.ceil(stops.length / CHUNK); d++) {
        const chunk = stops.slice(d * CHUNK, (d + 1) * CHUNK);
        days.push({
          label: `Day ${d + 1}`,
          stops: chunk.map((s, i) => ({
            name: s.name,
            description: s.description,
            stopType: s.stopType,
            time: SESSION_TIMES[d * CHUNK + i] ?? '10:00 AM',
          })),
        });
      }
      return res.json({ days });
    } catch (err) {
      req.log ? req.log.warn({ err }, '[Preview] stop generation failed') : console.error('[Preview] stop generation failed:', err);
      return res.status(500).json({ message: 'Failed to generate preview' });
    }
  });

  // Create a new trip (with automatic stop generation for any city)
  app.post('/api/travel/trips', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, destination, country, state, city, startDate, endDate, travelers, autoGenerateStops, adventureContext, stopCount, tripDays: rawTripDays, adventureStyle: rawStyle, pace: rawPace, cityDates, stayLocations, meals, tailoring: rawTailoring } = req.body;
      console.log(`✈️ [Travel] Create trip request: userId=${userId}, name=${name}, destination=${destination}, country=${country}, city=${city}, adventureContext=${adventureContext}`);
      const validStyles = ['family_explorer', 'nature_expedition', 'history_culture', 'iconic_highlights', 'foodie_adventure', 'city_explorer'];
      const adventureStyle = validStyles.includes(rawStyle) ? rawStyle : 'family_explorer';
      const validPaces = ['chill', 'balanced', 'packed'];
      const pace = validPaces.includes(rawPace) ? rawPace : 'balanced';
      
      // Guard required fields and auto-generate name if not supplied
      if (!destination || typeof destination !== 'string' || !destination.trim()) {
        return res.status(400).json({ message: 'Destination is required' });
      }
      const tripName = (name && typeof name === 'string' && name.trim())
        ? name.trim()
        : `${destination.trim()} Family Trip`;

      // Content Safety Check
      const nameSafety = validateUserInput(tripName);
      if (!nameSafety.safe) return res.status(400).json({ message: nameSafety.message });
      
      const destinationSafety = validateUserInput(destination);
      if (!destinationSafety.safe) return res.status(400).json({ message: destinationSafety.message });
      
      if (city) {
        const citySafety = validateUserInput(city);
        if (!citySafety.safe) return res.status(400).json({ message: citySafety.message });
      }

      // Check for duplicate city trip in the same context
      // NOTE: This applies to ALL users (admin, paid, free) - no one can create duplicate city trips
      // Only checks ACTIVE adventures - completed trips are allowed to be revisited
      const context = adventureContext || 'travel';
      const duplicateTrip = await storage.findDuplicateCityTrip(userId, country, city, context);
      if (duplicateTrip) {
        return res.status(400).json({ 
          message: `You already have an adventure for this destination. Please choose a different city.`,
          code: 'DUPLICATE_CITY',
          existingTrip: {
            id: duplicateTrip.id,
            name: duplicateTrip.name,
            destination: duplicateTrip.destination,
          }
        });
      }
      
      // Check lifetime limits for free users (enforced at subscription level, increment counter always)
      // Note: The frontend enforces the limits, but we track lifetime for bypass prevention
      
      // Determine capability flags based on adventure context
      // At-Home adventures are PREVIEW ONLY - no completion, keepsakes, photos, offline, or map display
      const isHomeAdventure = adventureContext === 'home';

      // Compute intended trip length — prefer explicit param, fall back to date range
      let computedTripDays: number | null = rawTripDays ? Number(rawTripDays) : null;
      if (!computedTripDays && startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        computedTripDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      }
      
      const trip = await storage.createTrip({
        userId,
        name: tripName,
        destination,
        country,
        city: city || null,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        travelers: travelers || [],
        adventureContext: adventureContext || 'travel',
        adventureStyle: adventureStyle || 'family_explorer',
        pace: pace || 'balanced',
        tripDays: computedTripDays || undefined,
        cityDates: cityDates || null,
        stayLocations: stayLocations || null,
        mealPreferences: meals || null,
        tailoring: rawTailoring && typeof rawTailoring === 'object' ? rawTailoring : null,
        allowCompletion: !isHomeAdventure,
        allowKeepsakes: !isHomeAdventure,
        allowMediaCapture: !isHomeAdventure,
        allowOffline: !isHomeAdventure,
        allowMapDisplay: !isHomeAdventure,
        contentDepth: isHomeAdventure ? 'preview' : 'full',
      });
      
      console.log(`✈️ [Travel] Trip created:`, { tripId: trip.id, name, destination });
      
      // Increment lifetime trip counter to prevent deletion bypass
      await storage.incrementLifetimeTripCount(userId, context);

      // Respond IMMEDIATELY with the created trip so the client is never blocked
      // Stop generation runs in the background — ParentPlanView polls for stops via ?generating=true
      res.json({ ...trip, stops: [], _generatingStops: true });

      // Auto-generate stops in the background — trip is already returned to client
      if (autoGenerateStops !== false && (city || destination)) {
        generateStopsInBackground(
          trip.id, city || destination, isHomeAdventure, country,
          state, stopCount, adventureStyle, destination, city,
          meals || null, computedTripDays || null, pace || 'balanced'
        );
      }

      // Multi-city: generate stops for remaining cities server-side so they are reliable
      if (!isHomeAdventure && cityDates && city && typeof cityDates === 'object') {
        const cdMap = cityDates as Record<string, { startDate: string; endDate: string }>;
        const remainingCities = Object.keys(cdMap).filter(c => c !== city);
        if (remainingCities.length > 0) {
          const spd = pace === 'chill' ? 3 : pace === 'packed' ? 4 : 4;
          let orderOffset = stopCount ? Number(stopCount) : spd * 4;
          // Fetch anchors once for all remaining cities so the AI plans around pre-booked items
          let allTripAnchors: { name: string; day: number; time: string | null; durationMinutes: number | null; anchorType: string; flexibility: string }[] = [];
          try {
            const existingAnchors = await storage.getAnchorsByTripId(trip.id);
            allTripAnchors = existingAnchors.map(a => ({
              name: a.name, day: a.day, time: a.time || null,
              durationMinutes: a.durationMinutes || null, anchorType: a.anchorType, flexibility: a.flexibility || "hard",
            }));
            if (allTripAnchors.length > 0) {
              console.log(`📌 [bg-multicity] Found ${allTripAnchors.length} anchors to plan around for trip ${trip.id}`);
            }
          } catch (e) {
            console.error("[bg-multicity] Non-fatal: failed to fetch anchors:", e);
          }
          for (const extraCity of remainingCities) {
            const cd = cdMap[extraCity];
            if (!cd?.startDate || !cd?.endDate) continue;
            const cityDays = Math.max(1, Math.round(
              (new Date(cd.endDate).getTime() - new Date(cd.startDate).getTime()) / (1000 * 60 * 60 * 24)
            ) + 1);
            const cityStopCount = Math.min(cityDays * spd, 30);
            const capturedTripId = trip.id;
            const capturedOrderOffset = orderOffset;
            const capturedCountry = country;
            const capturedStyle = adventureStyle;
            const capturedCity = extraCity;
            const capturedAnchors = allTripAnchors;
            (async () => {
              try {
                // Check stop library first — serve cached stops if ≥8 available
                const libraryStops = await storage.getStopLibraryByCity(capturedCity, capturedCountry);
                let stopsToUse: any[] = [];
                let fromLibrary = false;

                // India canonical override: serve from library regardless of count when canonical stops exist
                const hasCanonical = libraryStops.some(s => s.source === 'canonical');
                if (libraryStops.length >= 8 || hasCanonical) {
                  // Randomised least-served: take a candidate window (2× requested) from the
                  // least-served ordered list, then randomly sample to the requested count.
                  const window = libraryStops.slice(0, Math.max(cityStopCount * 2, cityStopCount));
                  const shuffled = [...window].sort(() => Math.random() - 0.5);
                  stopsToUse = shuffled.slice(0, cityStopCount);
                  fromLibrary = true;
                  const ids = stopsToUse.map(s => s.id);
                  storage.updateStopLibraryServeStats(ids).catch(() => {});
                  console.log(`📚 [Travel] [bg-multicity] Served ${stopsToUse.length} stops from library for "${capturedCity}" (${libraryStops.length} cached, canonical=${hasCanonical})`);
                } else {
                  const { generateCityStops } = await import('../travelContent.js');
                  stopsToUse = await generateCityStops(capturedCity, null, capturedCountry, cityStopCount, capturedStyle || 'family_explorer', undefined, capturedAnchors);

                  // Save AI results to stop library asynchronously
                  if (stopsToUse.length > 0) {
                    const nk = `${capturedCity.toLowerCase().trim()}:${capturedCountry.toLowerCase().trim()}`;
                    const entries = stopsToUse.map((s: any) => ({
                      city: capturedCity,
                      country: capturedCountry,
                      normalizedKey: nk,
                      name: String(s.name ?? "").trim(),
                      address: s.address ?? null,
                      latitude: s.latitude != null ? String(s.latitude) : null,
                      longitude: s.longitude != null ? String(s.longitude) : null,
                      stopType: s.stopType ?? "landmark",
                      description: s.description ?? null,
                      stopMissions: s.stopMissions ?? null,
                      source: "ai_generated" as const,
                    })).filter((e: any) => e.name.length > 0);
                    storage.saveStopLibraryEntries(entries).then(saved => {
                      if (saved.length > 0) {
                        const savedIds = saved.map(s => s.id);
                        import('../planner/stopLibraryEnricher.js').then(({ enqueueStopLibraryEnrichment }) => {
                          enqueueStopLibraryEnrichment(savedIds);
                        }).catch(() => {});
                        import('../planner/stopBackfillQueue.js').then(({ enqueueIntelligenceBackfill, enqueueLogisticsBackfill }) => {
                          enqueueIntelligenceBackfill(savedIds);
                          enqueueLogisticsBackfill(savedIds);
                        }).catch(() => {});
                      }
                    }).catch(() => {});
                  }
                }

                for (let i = 0; i < stopsToUse.length; i++) {
                  const s = fromLibrary ? stopsToUse[i] : stopsToUse[i];
                  await storage.createStop({
                    tripId: capturedTripId,
                    name: s.name,
                    stopType: s.stopType || s.stop_type || 'landmark',
                    displayOrder: capturedOrderOffset + i,
                    address: s.address || null,
                    description: s.description || null,
                    latitude: s.latitude || null,
                    longitude: s.longitude || null,
                    missionType: s.missionType || null,
                    missionQuestion: s.missionQuestion || null,
                    missionHint: s.missionHint || null,
                    missionAnswer: s.missionAnswer || null,
                    missionDifficulty: s.missionDifficulty || 'normal',
                    missionKeepsakeReward: s.missionKeepsakeReward || false,
                    stopMissions: s.stopMissions
                      ? (s.stopMissions as any[]).map((m: any) => ({ ...m, xpReward: m.type === 'photo' ? 10 : 5, completed: false, skipped: false, attempts: 0 }))
                      : null,
                    cityGroup: capturedCity,
                  });
                }
                console.log(`✅ [Travel] [bg-multicity] ${fromLibrary ? 'Library' : 'AI'}-served ${stopsToUse.length} stops for "${capturedCity}" in trip ${capturedTripId}`);
              } catch (err) {
                console.error(`⚠️ [Travel] [bg-multicity] Failed for "${capturedCity}":`, err);
              }
            })();
            orderOffset += cityStopCount;
          }
        }
      }

      // Send trip-created email (fire-and-forget, skip for home adventures)
      if (!isHomeAdventure) {
        storage.getUser(userId).then(user => {
          if (user?.email && user.name) {
            sendTripCreatedEmail(user.name.split(' ')[0] || user.name, user.email, trip.name, destination)
              .catch(err => console.error("[Email] Trip created email failed:", err));
          }
        }).catch(() => {});
      }
    } catch (error: any) {
      console.error("Error creating trip:", error);
      const detail = error?.message || String(error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to create trip", detail });
      }
    }
  });
  
  // Get a specific trip with stops (OPTIMIZED v2 - Dec 28 2024)
  // Public share data endpoint — no auth required (minimal trip info for share landing page)
  app.get('/api/travel/trips/:tripId/share-data', async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const result = await storage.getTripWithDetails(tripId);
      if (!result) return res.status(404).json({ message: "Trip not found" });
      const { trip, stops, moments } = result;
      const visitedCount = stops.filter((s: any) => s.isVisited).length;
      const parseUrls = (raw: any): string[] => {
        if (Array.isArray(raw)) return (raw as any[]).filter((u: any) => typeof u === "string" && u);
        if (typeof raw === "string" && raw) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter((u: any) => typeof u === "string" && u) : []; } catch { return []; } }
        return [];
      };
      const photoCount = (moments as any[]).reduce((sum: number, m: any) => {
        const arr = parseUrls(m.photoUrls);
        return sum + (arr.length > 0 ? arr.length : (m.photoUrl ? 1 : 0));
      }, 0);
      // All photo URLs (up to 8 for carousel/collage)
      const allPhotos: string[] = [];
      for (const m of moments as any[]) {
        const arr = parseUrls(m.photoUrls);
        if (arr.length > 0) allPhotos.push(...arr);
        else if (m.photoUrl) allPhotos.push(m.photoUrl);
        if (allPhotos.length >= 8) break;
      }
      const heroImage = allPhotos[0] ?? null;
      // Kid quotes + parent notes for highlights
      const kidQuotes = (moments as any[]).filter((m: any) => m.kidPromptResponse).map((m: any) => m.kidPromptResponse as string).slice(0, 3);
      const parentNotes = (moments as any[]).filter((m: any) => m.parentPromptResponse).map((m: any) => m.parentPromptResponse as string).slice(0, 3);
      // Generate highlights from stop types
      const STOP_LINES: Record<string, string> = {
        museum: "Discovered something new at the museum",
        zoo: "Kids got up close with the animals",
        aquarium: "Explored the sea life together",
        playground: "Kids ran wild and free",
        beach: "Hit the beach and played in the waves",
        park: "Took a breath of fresh air",
        restaurant: "Fuelled up for the adventure",
        market: "Wandered through the local market",
        viewpoint: "Took it all in from the top",
        landmark: "Found something famous together",
        garden: "Walked through the gardens",
        cafe: "Coffee stop while kids explored",
      };
      const highlightSet = new Set<string>();
      const highlights: string[] = [];
      const addHighlight = (text: string) => { if (!highlightSet.has(text) && highlights.length < 5) { highlightSet.add(text); highlights.push(text); } };
      kidQuotes.forEach(q => addHighlight(q.length > 60 ? q.slice(0, 57) + "…" : q));
      parentNotes.forEach(n => addHighlight(n.length > 60 ? n.slice(0, 57) + "…" : n));
      (stops as any[]).filter((s: any) => s.isVisited).forEach((s: any) => {
        const line = STOP_LINES[(s.stopType || "").toLowerCase()] ?? `Explored ${s.name}`;
        addHighlight(line);
      });
      // Minimal stops for map (only visited ones with coordinates)
      const mapStops = (stops as any[])
        .filter((s: any) => s.isVisited && s.latitude != null && s.longitude != null)
        .map((s: any) => ({ name: s.name, lat: s.latitude, lon: s.longitude, stopType: s.stopType || "landmark" }));
      res.json({
        name: trip.name || trip.destination || "Family Adventure",
        destination: trip.destination || trip.city || "",
        stopCount: visitedCount,
        totalStops: stops.length,
        momentCount: photoCount,
        startDate: trip.startDate,
        completedAt: trip.completedAt,
        heroImage,
        photos: allPhotos,
        highlights,
        mapStops,
      });
    } catch {
      res.status(500).json({ message: "Failed to fetch share data" });
    }
  });

  // ── My Travel Journal ──────────────────────────────────────────────────────
  // Returns all saved trip stories for the authenticated user
  app.get('/api/travel/journal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const entries = await storage.getUserTripJournalEntries(userId);
      res.json(entries);
    } catch (err) {
      console.error('[Journal] Failed to fetch journal:', err);
      res.status(500).json({ message: "Failed to fetch travel journal" });
    }
  });

  // ── Trip ownership check (no auth required — returns false for guests) ─────
  app.get('/api/travel/trips/:tripId/is-owner', attachUserIfPresent, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.json({ isOwner: false });
      const trip = await storage.getTripById(tripId);
      res.json({ isOwner: !!(trip && trip.userId === userId) });
    } catch {
      res.json({ isOwner: false });
    }
  });

  // ── Replay data (owner-only — requires auth + ownership) ─────────────────
  app.get('/api/travel/trips/:tripId/replay-data', isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const trip = await storage.getTripById(tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.userId !== userId) return res.status(403).json({ message: "Access denied" });
      const stops = await storage.getTripReplayData(tripId);
      res.json({ tripName: trip.name || trip.destination, destination: trip.destination, stops });
    } catch (err) {
      console.error('[Replay] Failed to fetch replay data:', err);
      res.status(500).json({ message: "Failed to fetch replay data" });
    }
  });

  // ── Contract aliases at /api/trips/ prefix ─────────────────────────────────
  app.get('/api/trips/:tripId/is-owner', attachUserIfPresent, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.json({ isOwner: false });
      const trip = await storage.getTripById(tripId);
      res.json({ isOwner: !!(trip && trip.userId === userId) });
    } catch { res.json({ isOwner: false }); }
  });

  app.get('/api/trips/:tripId/replay-data', attachUserIfPresent, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const trip = await storage.getTripById(tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      const userId = req.user?.claims?.sub ?? null;
      const isOwner = !!(userId && trip.userId === userId);
      const stops = await storage.getTripReplayData(tripId);
      let ownerName: string | null = null;
      if (trip.userId) {
        try {
          const ownerRows = await db.select({ firstName: users.firstName, email: users.email })
            .from(users).where(eq(users.id, trip.userId)).limit(1);
          if (ownerRows.length > 0) {
            ownerName = ownerRows[0].firstName || ownerRows[0].email?.split('@')[0] || null;
          }
        } catch { /* non-fatal */ }
      }
      res.json({ tripName: trip.name || trip.destination, destination: trip.destination, stops, isOwner, ownerName });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch replay data" });
    }
  });

  app.get('/api/travel/trips/:tripId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const startTime = Date.now();
      console.log(`🔍 [Trip v2] Fetching trip ${tripId}...`);
      
      // Use optimized single query method
      const result = await storage.getTripWithDetails(tripId);
      
      if (!result) {
        console.log(`❌ [Trip v2] Trip ${tripId} not found`);
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const { trip, stops, moments, memoryStarsData, journeyPacks } = result;
      
      // CRITICAL: Log stops count for debugging production issue
      console.log(`📊 [Trip v2] Raw data: ${stops.length} stops, ${moments.length} moments, ${journeyPacks.length} packs`);
      
      // Map journey packs for efficient lookup
      const packsByStopId = new Map(journeyPacks.map(p => [p.stopId, p]));
      
      // Include journey pack completion status for each stop
      const stopsWithPackStatus = stops.map(stop => ({
        ...stop,
        journeyPackCompleted: packsByStopId.get(stop.id)?.isCompleted || false,
      }));

      // Batch-enrich stops from stop_library: merge storyPack, audioUrl, keepsake, enrichment
      try {
        const namePairs = stops
          .filter(s => s.name && s.cityGroup)
          .map(s => ({ city: s.cityGroup as string, name: s.name }));
        if (namePairs.length > 0) {
          const libRows = await storage.getStopLibraryByNames(namePairs);
          // Composite key: lowercase(city):lowercase(name) to avoid cross-city name collisions
          const libByKey = new Map(
            libRows.map(r => [`${r.city.toLowerCase().trim()}:${r.name.toLowerCase()}`, r])
          );
          for (const stop of stopsWithPackStatus) {
            const key = `${(stop.cityGroup as string ?? '').toLowerCase().trim()}:${(stop.name ?? '').toLowerCase()}`;
            const lib = libByKey.get(key);
            if (lib) {
              (stop as any).storyPack = lib.storyPack ?? null;
              (stop as any).audioUrl = lib.audioUrl ?? null;
              (stop as any).keepsake = lib.keepsake ?? null;
              (stop as any).enrichment = lib.enrichment ?? null;
            } else {
              (stop as any).storyPack = null;
              (stop as any).audioUrl = null;
              (stop as any).keepsake = null;
              (stop as any).enrichment = null;
            }
          }
        }
      } catch (enrichErr) {
        // Non-fatal — stops still served without enrichment
        console.warn('[Trip v2] stop_library enrichment join failed:', (enrichErr as Error).message);
      }

      // Enrich with planner plan trip_days (used when trip has no explicit dates)
      let plannerTripDays: number | null = null;
      try {
        const planRow = await db.select({ tripDays: plannerTripPlans.tripDays })
          .from(plannerTripPlans)
          .where(eq(plannerTripPlans.experienceTripId, tripId))
          .limit(1);
        if (planRow.length > 0 && planRow[0].tripDays) {
          plannerTripDays = planRow[0].tripDays;
        }
      } catch {
        // non-fatal — day grouping will fall back to pace-based logic
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [Trip v2] Returning ${stopsWithPackStatus.length} stops in ${elapsed}ms`);
      
      // Add API version to response for debugging cache issues
      res.json({ 
        ...trip, 
        stops: stopsWithPackStatus, 
        moments, 
        memoryStars: memoryStarsData,
        plannerTripDays,
        _apiVersion: 'v2-20241228'
      });
    } catch (error: any) {
      console.error("❌ [Trip v2] Error fetching trip:", error.message || error);
      console.error("❌ [Trip v2] Stack:", error.stack);
      res.status(500).json({ message: "Failed to fetch trip", error: error.message });
    }
  });
  
  // GET stops for a trip — enriched with stop_library data (storyPack, audioUrl, keepsake, enrichment)
  app.get('/api/travel/trips/:tripId/stops', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const stops = await storage.getStopsByTripId(tripId);

      // Batch-enrich from stop_library using city+name composite key
      let enrichedStops: any[] = stops.map(s => ({ ...s, storyPack: null, audioUrl: null, keepsake: null, enrichment: null }));
      try {
        const namePairs = stops
          .filter(s => s.name && s.cityGroup)
          .map(s => ({ city: s.cityGroup as string, name: s.name }));
        if (namePairs.length > 0) {
          const libRows = await storage.getStopLibraryByNames(namePairs);
          const libByKey = new Map(
            libRows.map(r => [`${r.city.toLowerCase().trim()}:${r.name.toLowerCase()}`, r])
          );
          enrichedStops = stops.map(s => {
            const key = `${(s.cityGroup as string ?? '').toLowerCase().trim()}:${(s.name ?? '').toLowerCase()}`;
            const lib = libByKey.get(key);
            return {
              ...s,
              storyPack: lib?.storyPack ?? null,
              audioUrl: lib?.audioUrl ?? null,
              keepsake: lib?.keepsake ?? null,
              enrichment: lib?.enrichment ?? null,
            };
          });
        }
      } catch (enrichErr) {
        console.warn('[Stops] stop_library enrichment join failed:', (enrichErr as Error).message);
      }

      res.json({ stops: enrichedStops });
    } catch (error: any) {
      console.error('❌ [Stops] Error fetching stops:', error.message || error);
      res.status(500).json({ message: 'Failed to fetch stops', error: error.message });
    }
  });

  // Update a trip
  app.patch('/api/travel/trips/:tripId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const updates = req.body;

      // Validate stayLocations shape if provided
      if (updates.stayLocations !== undefined && updates.stayLocations !== null) {
        if (!Array.isArray(updates.stayLocations)) {
          return res.status(400).json({ message: "stayLocations must be an array" });
        }
        for (const s of updates.stayLocations) {
          if (typeof s !== "object" || typeof s.name !== "string") {
            return res.status(400).json({ message: "Each stayLocation must have a name string" });
          }
        }
      }

      // Validate dayOverrides shape if provided
      if (updates.dayOverrides !== undefined && updates.dayOverrides !== null) {
        if (typeof updates.dayOverrides !== "object" || Array.isArray(updates.dayOverrides)) {
          return res.status(400).json({ message: "dayOverrides must be an object keyed by date strings" });
        }
        for (const [key, val] of Object.entries(updates.dayOverrides)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            return res.status(400).json({ message: "dayOverrides keys must be YYYY-MM-DD date strings" });
          }
          if (typeof val !== "object" || val === null) {
            return res.status(400).json({ message: "Each dayOverrides value must be an object" });
          }
        }
      }
      
      // Check if At-Home adventure is trying to be completed/locked
      const existingTrip = await storage.getTripById(tripId);
      if (existingTrip && existingTrip.allowCompletion === false) {
        // Block attempts to set isLocked or status=completed for At-Home adventures
        if (updates.isLocked === true || updates.status === 'completed') {
          return res.status(403).json({ 
            message: "At-Home adventures cannot be completed or locked. They are preview experiences!",
            code: "HOME_ADVENTURE_NO_COMPLETION"
          });
        }
      }
      
      const trip = await storage.updateTrip(tripId, updates);
      res.json(trip);
    } catch (error) {
      console.error("Error updating trip:", error);
      res.status(500).json({ message: "Failed to update trip" });
    }
  });
  
  // Delete a trip
  app.delete('/api/travel/trips/:tripId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      await storage.deleteTrip(tripId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trip:", error);
      res.status(500).json({ message: "Failed to delete trip" });
    }
  });

  app.patch('/api/travel/trips/:tripId/archive', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { isArchived } = req.body;
      await storage.updateTrip(tripId, { isArchived: isArchived === true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving trip:", error);
      res.status(500).json({ message: "Failed to archive trip" });
    }
  });

  // Apply preference changes to the trip plan (pace, meals) — actually modifies stops
  app.post('/api/travel/trips/:tripId/apply-preferences', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { pace, meals } = req.body;
      const MEAL_TYPES = new Set(["restaurant", "food", "cafe", "market", "meal", "street_food"]);

      const allStops = await storage.getStopsByTripId(tripId);
      const unvisited = allStops.filter(s => !s.isVisited);
      const applied: string[] = [];

      // ── PACE: relaxed → remove last non-meal unvisited stop ──────────────
      if (pace === "relaxed" || pace === "chill") {
        const removable = unvisited.filter(s => !MEAL_TYPES.has(s.stopType || ""));
        if (removable.length > 3) {
          const toRemove = removable[removable.length - 1];
          await storage.deleteStop(toRemove.id);
          applied.push(`Removed "${toRemove.name}" — giving you a more relaxed day`);
        } else {
          applied.push("Your day is already light — no stops removed");
        }
      }

      // ── PACE: packed → message only (no AI available to add stops here) ──
      if (pace === "packed") {
        applied.push("Packed pace noted — your existing stops are maximised");
      }

      // ── MEALS: lunch-stop → add a lunch stop if none exists ──────────────
      if (meals === "lunch-stop") {
        const hasLunch = allStops.some(s => MEAL_TYPES.has(s.stopType || ""));
        if (!hasLunch) {
          const midOrder = Math.floor(allStops.length / 2);
          const midDayStop = allStops[midOrder];
          await storage.createStop({
            tripId,
            name: "Lunch break",
            description: "Time to refuel with a sit-down meal before continuing the day",
            stopType: "restaurant",
            displayOrder: (midDayStop?.displayOrder ?? midOrder) + 0.5,
            cityGroup: midDayStop?.cityGroup ?? null,
          } as any);
          applied.push("Lunch break added mid-day");
        } else {
          applied.push("Lunch stop already in your plan");
        }
      }

      // ── MEALS: snacks-only → remove unvisited meal stops ─────────────────
      if (meals === "snacks-only") {
        const mealStops = unvisited.filter(s => MEAL_TYPES.has(s.stopType || ""));
        for (const stop of mealStops) {
          await storage.deleteStop(stop.id);
          applied.push(`Removed "${stop.name}" — keeping snacks on the go`);
        }
        if (mealStops.length === 0) applied.push("No meal stops found to remove");
      }

      // ── Update trip pace field on the record ─────────────────────────────
      if (pace) {
        const paceMapped = pace === "easy" || pace === "relaxed" ? "chill" : pace === "ready" || pace === "packed" ? "packed" : "balanced";
        await storage.updateTrip(tripId, { pace: paceMapped });
      }

      const updatedStops = await storage.getStopsByTripId(tripId);
      res.json({ applied, stops: updatedStops });
    } catch (error) {
      console.error("Error applying preferences:", error);
      res.status(500).json({ message: "Failed to apply preferences" });
    }
  });

  // Generate stops for a city within an existing trip (for multi-city trips)
  app.post('/api/travel/trips/:tripId/generate-city-stops', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { cityName, country, state, count, startDisplayOrder, adventureStyle: rawStyle, cityGroup: rawCityGroup } = req.body;
      const validStyles = ['family_explorer', 'nature_expedition', 'history_culture', 'iconic_highlights', 'foodie_adventure', 'city_explorer'];
      const adventureStyle = validStyles.includes(rawStyle) ? rawStyle : 'family_explorer';

      if (!cityName) {
        return res.status(400).json({ message: "cityName is required" });
      }

      const stopCount = Math.max(3, Math.min(30, count || 5));
      const baseOrder = startDisplayOrder || 0;
      const cityGroupLabel = rawCityGroup || cityName;

      console.log(`🌍 [Travel] Generating ${stopCount} stops for city "${cityName}" in trip ${tripId}`);

      // Fetch any pre-booked anchors so the AI plans around them
      let anchorsForGeneration: { name: string; day: number; time: string | null; durationMinutes: number | null; anchorType: string; flexibility: string }[] = [];
      try {
        const existingAnchors = await storage.getAnchorsByTripId(tripId);
        anchorsForGeneration = existingAnchors.map(a => ({
          name: a.name,
          day: a.day,
          time: a.time || null,
          durationMinutes: a.durationMinutes || null,
          anchorType: a.anchorType,
          flexibility: a.flexibility || "hard",
        }));
        if (anchorsForGeneration.length > 0) {
          console.log(`📌 [Travel] Found ${anchorsForGeneration.length} anchors to plan around for city "${cityName}" in trip ${tripId}`);
        }
      } catch (e) {
        console.error("[Travel] Non-fatal: failed to fetch anchors for generate-city-stops:", e);
      }

      // Check stop library first — serve cached stops if ≥8 available
      const libraryStops = await storage.getStopLibraryByCity(cityName, country || '');
      let stopsSource: 'library' | 'ai' = 'ai';
      let generatedStops: any[] = [];

      // India canonical override: serve from library regardless of count when canonical stops exist
      const hasCanonicalStops = libraryStops.some(s => s.source === 'canonical');
      if (libraryStops.length >= 8 || hasCanonicalStops) {
        // Randomised least-served: take a candidate window (2× requested) from the
        // least-served ordered list, then randomly sample to the requested count.
        const window = libraryStops.slice(0, Math.max(stopCount * 2, stopCount));
        const shuffled = [...window].sort(() => Math.random() - 0.5);
        generatedStops = shuffled.slice(0, stopCount);
        stopsSource = 'library';
        const ids = generatedStops.map(s => s.id);
        storage.updateStopLibraryServeStats(ids).catch(() => {});
        console.log(`📚 [Travel] Served ${generatedStops.length} stops from library for "${cityName}" (${libraryStops.length} cached, canonical=${hasCanonicalStops})`);
      } else {
        generatedStops = await generateCityStops(cityName, state || null, country || '', stopCount, adventureStyle || 'family_explorer', undefined, anchorsForGeneration);

        // Save AI results to stop library
        if (generatedStops.length > 0) {
          const nk = `${cityName.toLowerCase().trim()}:${(country || '').toLowerCase().trim()}`;
          const entries = generatedStops.map((s: any) => ({
            city: cityName,
            country: country || '',
            normalizedKey: nk,
            name: String(s.name ?? '').trim(),
            address: s.address ?? null,
            latitude: s.latitude != null ? String(s.latitude) : null,
            longitude: s.longitude != null ? String(s.longitude) : null,
            stopType: s.stopType ?? 'landmark',
            description: s.description ?? null,
            stopMissions: s.stopMissions ?? null,
            source: 'ai_generated' as const,
          })).filter((e: any) => e.name.length > 0);
          storage.saveStopLibraryEntries(entries).then(saved => {
            if (saved.length > 0) {
              const savedIds = saved.map(s => s.id);
              import('../planner/stopLibraryEnricher.js').then(({ enqueueStopLibraryEnrichment }) => {
                enqueueStopLibraryEnrichment(savedIds);
              }).catch(() => {});
              import('../planner/stopBackfillQueue.js').then(({ enqueueIntelligenceBackfill, enqueueLogisticsBackfill }) => {
                enqueueIntelligenceBackfill(savedIds);
                enqueueLogisticsBackfill(savedIds);
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      }

      const createdStops = [];
      for (let i = 0; i < generatedStops.length; i++) {
        const stop = generatedStops[i];
        const created = await storage.createStop({
          tripId,
          name: stop.name,
          stopType: stop.stopType || stop.stop_type || 'landmark',
          displayOrder: baseOrder + i,
          address: stop.address || null,
          description: stop.description || null,
          latitude: stop.latitude || null,
          longitude: stop.longitude || null,
          missionType: stop.missionType || null,
          missionQuestion: stop.missionQuestion || null,
          missionHint: stop.missionHint || null,
          missionAnswer: stop.missionAnswer || null,
          missionDifficulty: stop.missionDifficulty || 'normal',
          missionKeepsakeReward: stop.missionKeepsakeReward || false,
          stopMissions: stop.stopMissions ? (stop.stopMissions as any[]).map(m => ({ ...m, xpReward: m.type === 'photo' ? 10 : 5, completed: false, skipped: false, attempts: 0 })) : null,
          cityGroup: cityGroupLabel,
          metadata: (stop.durationMinutes || stop.sessionFit || stop.durationClass || stop.anchorScore || stop.dropPriority)
            ? {
                durationMinutes: stop.durationMinutes ?? null,
                sessionFit: stop.sessionFit ?? null,
                durationClass: stop.durationClass ?? null,
                anchorScore: stop.anchorScore ?? null,
                dropPriority: stop.dropPriority ?? null,
              }
            : null,
        });
        createdStops.push(created);
      }

      console.log(`✅ [Travel] ${stopsSource === 'library' ? 'Library' : 'AI'}-served ${createdStops.length} stops for "${cityName}" in trip ${tripId}`);

      // Background: generate artifacts for new stops
      (async () => {
        try {
          const existingArtifacts = await storage.getAllArtifacts();
          const coveredStops = new Set(existingArtifacts.map(a => a.stopName));
          const uncoveredStops = generatedStops.filter(s => !coveredStops.has(s.name));

          if (uncoveredStops.length > 0) {
            const { generateArtifactsForStops } = await import('../travelContent.js');
            const generated = await generateArtifactsForStops(
              uncoveredStops.map(s => ({ name: s.name, stopType: s.stopType })),
              cityName
            );

            for (const artifact of generated) {
              await storage.createArtifact({
                stopName: artifact.stopName,
                name: artifact.name,
                description: artifact.description,
                emoji: artifact.emoji,
                category: artifact.category,
                rarity: artifact.rarity || 'common',
              });
            }
            console.log(`🎁 [Travel] Generated ${generated.length} artifacts for "${cityName}" stops`);
          }
        } catch (e) {
          console.error(`Error generating artifacts for "${cityName}":`, e);
        }
      })();

      res.json({ stops: createdStops, cityName, count: createdStops.length });
    } catch (error) {
      console.error("Error generating city stops:", error);
      res.status(500).json({ message: "Failed to generate stops for city" });
    }
  });

  // Replace suggestions — AI-curated alternatives for swapping an existing stop
  app.post('/api/travel/stops/replace-suggestions', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopName, stopType, destination, chipFilter } = req.body;
      if (!stopName || !destination) return res.status(400).json({ message: "stopName and destination are required" });

      const openai = getOpenAI();

      let chipHint = "";
      if (chipFilter === "outdoors") chipHint = "Focus on outdoor, nature, or park stops.";
      else if (chipFilter === "shorter") chipHint = "Prefer stops with a short visit duration (30 min or less).";
      else if (chipFilter === "fun") chipHint = "Prioritize highly entertaining, interactive stops that kids love.";
      else if (chipFilter === "free") chipHint = "Only suggest free or no-cost stops (public parks, free museums, plazas, markets, viewpoints, etc.).";

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a family travel expert. A parent wants to replace the stop "${stopName}" (type: ${stopType || "unknown"}) in ${destination} with something better.

Return a JSON object with two arrays:
- better: 4 contextually smarter alternatives (less crowded, more interactive, or better suited for families — should NOT be the same place)
- similar: 4 same-category nearby options in ${destination}

${chipHint}

Each item must have:
- name: the well-known name of the place (no made-up places, real places in ${destination})
- stopType: one of [landmark, museum, park, beach, restaurant, zoo, aquarium, playground, food, adventure, nature, other]
- duration: estimated visit duration e.g. "60–90 min"
- description: 1 sentence about why this is a great alternative

Return ONLY real, well-known places in or near ${destination}. Return valid JSON only.`,
          },
          { role: "user", content: `Replace "${stopName}" in ${destination}` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 700,
      });
      const data = JSON.parse(response.choices[0].message.content || "{}");
      res.json({ better: data.better || [], similar: data.similar || [] });
    } catch (error) {
      console.error("[Travel] Replace suggestions error:", error);
      res.status(500).json({ message: "Failed to load replace suggestions" });
    }
  });

  // ── Get Help Now: nearby medical facilities via Overpass API ────────────────
  app.get('/api/help/nearby', isAuthenticated, async (req: any, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "lat and lng are required" });
      }
      const { fetchNearbyHelp } = await import('../helpNearby');
      const places = await fetchNearbyHelp(lat, lng);
      res.json({ places });
    } catch (err) {
      console.error("[help/nearby] error:", err);
      res.json({ places: [] }); // graceful — never 500 for safety feature
    }
  });

  // Smart suggestions for the Add Stop discover screen
  app.post('/api/travel/stops/smart-suggestions', async (req: any, res) => {
    try {
      const { destination, stopTypes, context, todayStopNames, routeContext, userLat, userLng } = req.body;
      if (!destination) return res.status(400).json({ message: "destination is required" });

      const openai = getOpenAI();

      const FOOD_TYPES = new Set(["food", "restaurant", "dessert", "ice_cream", "cafe", "bakery", "street_food"]);
      const NON_FOOD_TYPES = new Set(["landmark", "museum", "park", "beach", "zoo", "aquarium", "playground", "adventure", "nature", "other"]);
      const isFoodContext = stopTypes && stopTypes.length > 0
        && stopTypes.some((t: string) => FOOD_TYPES.has(t))
        && !stopTypes.some((t: string) => NON_FOOD_TYPES.has(t));
      const isDessertContext = isFoodContext && stopTypes.some((t: string) => ["dessert", "ice_cream", "bakery", "cafe"].includes(t)) && !stopTypes.includes("restaurant");
      const isBreakContext = context === "break" || (stopTypes && stopTypes.includes("park_bench"));
      const isFunContext = context === "fun";

      const stopContext = todayStopNames && todayStopNames.length > 0
        ? `\nThe family's stops today are: ${todayStopNames.join(", ")}. For each suggestion, add a "closestStopName" field (string) with the name of the stop from this list that is geographically closest to the suggestion. Use your knowledge of city geography.`
        : "";
      const routeCtx = routeContext
        ? `\nThe family is currently traveling along this route: ${routeContext}. Prioritise spots that are geographically close to or along this route.`
        : "";
      const locationCtx = (userLat && userLng)
        ? `\nThe family's current GPS location is approximately ${Number(userLat).toFixed(4)}, ${Number(userLng).toFixed(4)}. Prioritise spots near this location.`
        : "";

      let systemPrompt: string;
      if (isDessertContext) {
        systemPrompt = `You are a family travel expert. Given a city, return a JSON object with two arrays of ONLY dessert and sweet-treat spots:
- nearby: 4 spots (ice cream shops, bakeries, dessert cafes, sweet shops) that are popular locally
- popular: 4 spots (famous dessert chains, well-known cafes, popular sweet spots) that families love

Each item must have:
- name: real place name (no made-up places)
- stopType: one of [dessert, cafe, bakery, ice_cream]
- duration: estimated VISIT time e.g. "20–30 min"
- description: 1 sentence highlighting kid appeal (e.g. "Known for their giant cookie ice cream sandwiches")${stopContext ? `\n- closestStopName: name of the closest stop from the family's itinerary` : ""}
${stopContext}${routeCtx}${locationCtx}
STRICT RULE: Return ONLY dessert/sweet-treat establishments. Do NOT include restaurants, museums, parks, landmarks, attractions, or any non-dessert places. Return valid JSON only.`;
      } else if (isFoodContext) {
        systemPrompt = `You are a family travel expert. Given a city, return a JSON object with two arrays of ONLY restaurants and food spots:
- nearby: 4 restaurants/eateries (local gems, casual dining, quick bites, food courts) that are popular with families
- popular: 4 restaurants/eateries (well-known chains, famous local restaurants, kid-friendly spots) that families enjoy

Each item must have:
- name: real restaurant or food place name (no made-up places)
- stopType: one of [restaurant, food, street_food]
- duration: estimated dining time e.g. "30–45 min"
- description: 1 sentence highlighting why it's good for families (e.g. "Kid-friendly menu with quick service and indoor seating")${stopContext ? `\n- closestStopName: name of the closest stop from the family's itinerary` : ""}
${stopContext}${routeCtx}${locationCtx}
STRICT RULE: Return ONLY restaurants and food establishments. Do NOT include museums, parks, landmarks, attractions, playgrounds, or any non-food places. Return valid JSON only.`;
      } else if (isBreakContext) {
        systemPrompt = `You are a family travel expert. A family on a trip needs a short rest break. Given a city, return a JSON object with two arrays of ONLY short rest spots:
- nearby: 4 spots where a family can rest (coffee shops, cafes, small parks with seating, public squares, hotel lobbies with seating, food courts, indoor seating areas)
- popular: 4 spots families commonly use as quick rest stops (well-known cafes, popular parks with benches, family-friendly coffee chains)

Each item must have:
- name: real place name (no made-up places)
- stopType: one of [cafe, park, food]
- duration: short rest time e.g. "15–20 min"
- description: 1 sentence about why it's good for a rest (e.g. "Comfortable seating, clean bathrooms, and kid-friendly snacks")${stopContext ? `\n- closestStopName: name of the closest stop from the family's itinerary` : ""}
${stopContext}${routeCtx}${locationCtx}
STRICT RULE: Return ONLY short rest spots — cafes, small parks with seating, coffee shops, food courts. Do NOT return major tourist attractions, museums, zoos, aquariums, or any activity that takes more than 30 minutes. This is for a quick rest, not sightseeing. Return valid JSON only.`;
      } else if (isFunContext) {
        systemPrompt = `You are a family travel expert. A family wants to add a quick fun activity nearby. Given a city, return a JSON object with two arrays:
- nearby: 4 QUICK fun stops (playgrounds, splash pads, small arcades, mini golf, ice cream shops, novelty shops, small parks) — MAX 45 min each
- popular: 4 popular family-friendly fun spots (well-known play areas, family entertainment centers, popular parks)

Each item must have:
- name: real place name (no made-up places)
- stopType: one of [playground, park, food, dessert, other]
- duration: estimated VISIT time e.g. "20–30 min"
- description: 1 sentence on kid appeal${stopContext ? `\n- closestStopName: name of the closest stop from the family's itinerary` : ""}
${stopContext}
STRICT RULE: Return fun activities that are QUICK (under 1 hour). Do NOT include major attractions requiring half a day (zoos, aquariums, large museums). Focus on spontaneous, easy-to-access fun. Return valid JSON only.`;
      } else {
        const typeHint = stopTypes && stopTypes.length > 0 ? `Focus on stop types: ${stopTypes.join(", ")}.` : "";
        systemPrompt = `You are a family travel expert. Given a destination city, return a JSON object with a "buckets" array containing exactly 5 family-specific suggestion buckets. Each bucket has a "label" and a "stops" array of 3 real stops.

Bucket definitions (in order):
1. label: "Best for your kids" — stops with strong age-appropriate appeal and kid delight (interactive, hands-on, or high wow-factor)
2. label: "Easy wins nearby" — stops that are low-effort, short duration, easy to leave if needed (playgrounds, markets, scenic walks, viewpoints)
3. label: "Big wow stops" — landmark-level experiences with jaw-dropping visual impact or iconic family memories
4. label: "Rainy-day picks" — indoor or weather-resilient stops that work great on bad weather days (museums, aquariums, covered markets, indoor play)
5. label: "Quick treats" — short sweet-spot stops ideal as a treat or reward (dessert spots, fun snack stops, short novelty experiences, 15–30 min)

Each stop object must have:
- name: real, well-known place name (no made-up places)
- stopType: one of [landmark, museum, park, beach, restaurant, zoo, aquarium, playground, food, adventure, nature, dessert, other]
- duration: estimated visit time e.g. "45–60 min"
- description: 1 sentence describing kid appeal or family benefit
- bucket: the bucket label this stop belongs to (same string as the parent bucket's label)

${typeHint}

Return ONLY real places in that city. Also include flat backward-compatible arrays: "nearby" (3 items from Easy wins bucket) and "popular" (3 items from Big wow bucket). Return valid JSON only.

Example structure:
{
  "buckets": [
    { "label": "Best for your kids", "stops": [{ "name": "...", "stopType": "...", "duration": "...", "description": "...", "bucket": "Best for your kids" }, ...] },
    ...
  ],
  "nearby": [...3 stops...],
  "popular": [...3 stops...]
}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `City: "${destination}"` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
      });
      const data = JSON.parse(response.choices[0].message.content || "{}");

      if (isFoodContext || isDessertContext) {
        res.json({ nearby: data.nearby || [], popular: data.popular || [] });
      } else {
        const BUCKET_LABELS = [
          "Best for your kids",
          "Easy wins nearby",
          "Big wow stops",
          "Rainy-day picks",
          "Quick treats",
        ];
        interface RawBucketStop {
          name?: string;
          stopType?: string;
          duration?: string;
          description?: string;
          bucket?: string;
          [key: string]: unknown;
        }
        interface RawBucket {
          label: string;
          stops: RawBucketStop[];
        }
        const rawBuckets: RawBucket[] = Array.isArray(data.buckets)
          ? (data.buckets as unknown[]).filter(
              (b): b is RawBucket =>
                b !== null &&
                typeof b === "object" &&
                typeof (b as RawBucket).label === "string" &&
                Array.isArray((b as RawBucket).stops)
            )
          : [];

        const normalizedBuckets = BUCKET_LABELS.map((label) => {
          const found = rawBuckets.find((b) => b.label === label);
          const stops = (found?.stops ?? [])
            .slice(0, 3)
            .filter((s) => s && typeof s.name === "string" && s.name.length > 0)
            .map((s) => ({
              name: s.name ?? "",
              stopType: s.stopType ?? "other",
              duration: s.duration ?? "30–60 min",
              description: s.description ?? "",
              bucket: s.bucket ?? label,
              bucketLabel: s.bucket ?? label,
            }));
          return { label, stops };
        });
        const easyWins = normalizedBuckets.find((b) => b.label === "Easy wins nearby")?.stops ?? [];
        const bigWow = normalizedBuckets.find((b) => b.label === "Big wow stops")?.stops ?? [];
        res.json({
          buckets: normalizedBuckets,
          nearby: data.nearby || easyWins,
          popular: data.popular || bigWow,
        });
      }
    } catch (error) {
      console.error("[Travel] Smart suggestions error:", error);
      res.status(500).json({ message: "Failed to load suggestions" });
    }
  });

  // ─── Weather Smart Rerouting — server-authoritative per-stop conflict check ──
  // GET /api/travel/trips/:tripId/weather-check?dayIndex=N
  // Fetches the trip's stops server-side for a given dayIndex, then runs conflict analysis.
  app.get('/api/travel/trips/:tripId/weather-check', isAuthenticated, travelModeGuard, async (req: any, res) => {
    const OUTDOOR_TYPES = new Set([
      "park", "beach", "nature", "zoo", "playground", "garden", "viewpoint",
      "outdoor_market", "adventure", "hiking", "waterfall", "nature_reserve", "open_air",
    ]);
    function wmoIsRainyGet(code: number): boolean {
      return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
    }
    type ImpactedStopEntryGet = {
      id: string; name: string; stopType: string | null; displayOrder: number;
      durationMinutes: number; precipMax: number; reason: string;
      isReplaceable: boolean; estimatedStartHour: number;
    };
    try {
      const { tripId } = req.params;
      const dayIndex = parseInt(req.query.dayIndex as string ?? "0", 10);

      // Fetch trip and stops server-side — authoritative source
      const tripDetails = await storage.getTripWithDetails(tripId);
      if (!tripDetails) return res.status(404).json({ message: "Trip not found" });

      const { trip, stops } = tripDetails;
      const destination = trip.destination || trip.city;
      if (!destination) return res.status(400).json({ message: "Trip has no destination" });

      // Group stops by cityGroup into day buckets (sorted by displayOrder)
      const allSorted = [...stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      const dayBuckets: (typeof stops)[] = [];
      let currentGroup: string | null = undefined as unknown as string | null;
      for (const stop of allSorted) {
        const group = stop.cityGroup ?? "__ungrouped__";
        if (group !== currentGroup) {
          dayBuckets.push([]);
          currentGroup = group;
        }
        dayBuckets[dayBuckets.length - 1].push(stop);
      }
      const dayStops = (dayBuckets[dayIndex] ?? []).filter(s => !s.isVisited);

      if (dayStops.length === 0) {
        return res.json({ isRainy: false, precipProb: 0, tempC: null, tempF: null, hourlyPrecip: [], impactedStops: [] });
      }

      // Geocode
      let lat: number | null = null;
      let lon: number | null = null;
      try {
        const geoR = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
          { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'GeoQuestGames/1.0 contact@geoquest.app' } }
        );
        const geo = await geoR.json() as Array<{ lat: string; lon: string }>;
        if (geo?.[0]?.lat) { lat = parseFloat(geo[0].lat); lon = parseFloat(geo[0].lon); }
      } catch {}

      let isRainy = false, precipProb = 0, hourlyPrecip: number[] = [];
      let tempC: number | null = null, tempF: number | null = null;
      if (lat && lon) {
        try {
          const wR = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=precipitation_probability&daily=precipitation_probability_max&temperature_unit=celsius&timezone=auto&forecast_days=1`,
            { signal: AbortSignal.timeout(5000) }
          );
          const wData = await wR.json() as { current?: { temperature_2m?: number; weather_code?: number }; hourly?: { precipitation_probability?: number[] }; daily?: { precipitation_probability_max?: number[] } };
          tempC = Math.round(wData.current?.temperature_2m ?? 0);
          tempF = Math.round((tempC ?? 0) * 9 / 5 + 32);
          const weatherCode = wData.current?.weather_code ?? 0;
          precipProb = wData.daily?.precipitation_probability_max?.[0] ?? 0;
          isRainy = wmoIsRainyGet(weatherCode) || precipProb >= 50;
          hourlyPrecip = (wData.hourly?.precipitation_probability ?? []).slice(0, 24) as number[];
        } catch {}
      }

      const START_HOUR = 9, TRAVEL_BUFFER_MINS = 20;
      let cumulativeMins = 0;
      const impactedStops: ImpactedStopEntryGet[] = [];

      for (const stop of dayStops) {
        const startMins = cumulativeMins;
        const durationMins = stop.durationMinutes ?? 60;
        const endMins = startMins + durationMins;
        const startHour = START_HOUR + Math.floor(startMins / 60);
        const endHour = START_HOUR + Math.floor(endMins / 60);

        // Check metadata for indoorOutdoor/familyAnchorType (from planner data in metadata blob)
        const meta = stop.metadata as Record<string, unknown> | null | undefined;
        const stopRole = (meta?.stopRole ?? "") as string;
        const indoorOutdoor = (meta?.indoorOutdoor ?? "") as string;
        const isAnchor = stopRole === "anchor" || (meta?.familyAnchorType === "anchor");
        const isOutdoor = OUTDOOR_TYPES.has(stop.stopType ?? "") || indoorOutdoor === "outdoor";

        if (isOutdoor && isRainy) {
          let stopPrecipMax = precipProb;
          if (hourlyPrecip.length > 0) {
            const hours = hourlyPrecip.slice(Math.max(0, startHour), Math.min(24, endHour + 1));
            stopPrecipMax = hours.length > 0 ? Math.max(...hours) : precipProb;
          }
          if (stopPrecipMax >= 50) {
            const severity = stopPrecipMax >= 80 ? "high" : stopPrecipMax >= 60 ? "moderate" : "low";
            impactedStops.push({
              id: stop.id, name: stop.name, stopType: stop.stopType,
              displayOrder: stop.displayOrder ?? 0, durationMinutes: stop.durationMinutes ?? 60,
              precipMax: stopPrecipMax, severity, reason: "Outdoor · exposed to rain",
              isReplaceable: !isAnchor, estimatedStartHour: startHour,
            });
          }
        }
        cumulativeMins += durationMins + TRAVEL_BUFFER_MINS;
        if (impactedStops.length >= 2) break;
      }

      res.json({ isRainy, precipProb, tempC, tempF, hourlyPrecip, impactedStops });
    } catch (error) {
      console.error("[weather-check-get]", error);
      res.status(500).json({ message: "Weather check failed" });
    }
  });

  // ─── Weather Smart Rerouting — generate a fix proposal ──────────────────────
  // POST /api/travel/trips/:tripId/weather-proposal
  // Body: { impactedStops: ImpactedStop[], allDayStops: DayStop[], destination: string }
  app.post('/api/travel/trips/:tripId/weather-proposal', isAuthenticated, travelModeGuard, async (req: any, res) => {
    const INDOOR_TYPES = new Set([
      "museum", "aquarium", "indoor_market", "cafe", "restaurant", "food",
      "mall", "cinema", "bowling", "escape_room", "art_gallery", "science_center",
    ]);
    type ProposalImpacted = { id: string; name: string; stopType: string | null; displayOrder: number; durationMinutes: number; isReplaceable: boolean; precipMax: number };
    try {
      const { tripId } = req.params;
      const { impactedStops, dayIndex: rawDayIndex } = req.body as { impactedStops: ProposalImpacted[]; dayIndex?: number };
      const dayIndex = typeof rawDayIndex === "number" ? rawDayIndex : 0;
      if (!Array.isArray(impactedStops) || impactedStops.length === 0) {
        return res.json({ proposalType: null, reasoning: "No impacted stops to fix" });
      }

      // Fetch trip + stops server-side — authoritative source
      const tripDetails = await storage.getTripWithDetails(tripId);
      if (!tripDetails) return res.status(404).json({ message: "Trip not found" });
      const { trip, stops } = tripDetails;
      const destination = trip.destination || trip.city;
      if (!destination) return res.status(400).json({ message: "Trip has no destination" });

      // ── Scope to the specific day (same bucketing logic as GET weather-check) ──
      const allSorted = [...stops].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      const dayBuckets: (typeof stops)[] = [];
      let currentGroupProp: string | null = undefined as unknown as string | null;
      for (const stop of allSorted) {
        const group = stop.cityGroup ?? "__ungrouped__";
        if (group !== currentGroupProp) { dayBuckets.push([]); currentGroupProp = group; }
        dayBuckets[dayBuckets.length - 1].push(stop);
      }
      // Only unvisited stops from the requested day are candidates
      const allDayStops = (dayBuckets[dayIndex] ?? []).filter(s => !s.isVisited);

      const firstImpacted = impactedStops[0];

      // Strategy A: Reorder — find an indoor stop that comes AFTER the impacted stop (same day only)
      const indoorStopsAfter = allDayStops.filter(s => {
        const meta = s.metadata as Record<string, unknown> | null | undefined;
        const indoorOutdoor = (meta?.indoorOutdoor ?? "") as string;
        const stopRole = (meta?.stopRole ?? "") as string;
        return (
          s.id !== firstImpacted.id &&
          !impactedStops.some(imp => imp.id === s.id) &&
          (INDOOR_TYPES.has(s.stopType ?? "") || indoorOutdoor === "indoor") &&
          (s.displayOrder ?? 0) > (firstImpacted.displayOrder ?? 0) &&
          stopRole !== "anchor" && meta?.familyAnchorType !== "anchor"
        );
      });

      if (indoorStopsAfter.length > 0) {
        const targetIndoor = indoorStopsAfter[0];
        // Swap: move indoor earlier, impacted outdoor later — only touches this day's stops
        const newOrders = allDayStops.map(s => {
          if (s.id === targetIndoor.id) return { stopId: s.id, displayOrder: firstImpacted.displayOrder ?? s.displayOrder };
          if (s.id === firstImpacted.id) return { stopId: s.id, displayOrder: targetIndoor.displayOrder ?? s.displayOrder };
          return { stopId: s.id, displayOrder: s.displayOrder };
        });
        return res.json({
          proposalType: "reorder",
          operations: newOrders,
          proposal: {
            stopName: targetIndoor.name,
            stopType: targetIndoor.stopType,
            durationMinutes: targetIndoor.durationMinutes ?? 60,
          },
          reasoning: `Moving ${targetIndoor.name} earlier keeps you indoors during the rainy window. ${firstImpacted.name} moves later when it may clear up.`,
        });
      }

      // Strategy B: Replace — only if the impacted stop is marked replaceable (not an anchor)
      if (!firstImpacted.isReplaceable) {
        return res.json({ proposalType: null, reasoning: `${firstImpacted.name} is a fixed anchor stop and cannot be replaced automatically. Consider adjusting your plan manually.` });
      }

      // Find an indoor rainy-day alternative using the shared replace-suggestions logic pattern.
      // This uses the same service (gpt-4o-mini, json_object format) as /api/travel/stops/replace-suggestions
      // but scoped to indoor/covered venues suitable for rain — the "chipFilter=indoor" scenario.
      const openai = getOpenAI();
      const existingNames = allDayStops.map(s => s.name).join(", ");
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a family travel expert. A parent needs a rainy-day indoor alternative to "${firstImpacted.name}" (type: ${firstImpacted.stopType || "unknown"}) in ${destination}.
Today's stops already include: ${existingNames || "none"}.

Return a JSON object with two arrays (same format as replace-suggestions service):
- better: 1 contextually smarter indoor alternative (covered, weather-proof, great for families)
- similar: 0 items (not needed for this quick-fix flow)

Each item must have:
- name: well-known real name of the place (no made-up places, real places in ${destination})
- stopType: one of [museum, aquarium, cafe, restaurant, food, mall, cinema, art_gallery, science_center, indoor_market]
- duration: estimated visit duration e.g. "60 min"
- description: 1 sentence why it's a great indoor rainy-day option for families

Return ONLY real, well-known indoor places in ${destination}. Return valid JSON only.`,
          },
          { role: "user", content: `Indoor rainy-day alternative to "${firstImpacted.name}" in ${destination}` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 250,
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}") as { better?: Array<{ name?: string; stopType?: string; duration?: string; description?: string }> };
      const best = parsed.better?.[0];
      const suggestion = best ? {
        name: best.name,
        stopType: best.stopType,
        durationMinutes: best.duration ? parseInt(best.duration, 10) || 60 : 60,
        description: best.description,
      } : {} as { name?: string; stopType?: string; durationMinutes?: number; description?: string };
      if (!suggestion.name) {
        return res.json({ proposalType: null, reasoning: "No suitable indoor alternative found" });
      }

      res.json({
        proposalType: "replace",
        operations: {
          deleteStopId: firstImpacted.id,
          newStop: {
            name: suggestion.name,
            stopType: suggestion.stopType || "museum",
            durationMinutes: suggestion.durationMinutes || 60,
            description: suggestion.description || "",
            displayOrder: firstImpacted.displayOrder,
          },
        },
        proposal: {
          stopName: suggestion.name,
          stopType: suggestion.stopType,
          durationMinutes: suggestion.durationMinutes || 60,
          description: suggestion.description,
        },
        reasoning: suggestion.description || `${suggestion.name} is a great indoor option that keeps the adventure going rain or shine.`,
      });
    } catch (error) {
      console.error("[weather-proposal]", error);
      res.status(500).json({ message: "Failed to generate weather proposal" });
    }
  });

  // ─── Weather Smart Rerouting — apply the proposal ───────────────────────────
  // POST /api/travel/trips/:tripId/weather-apply
  // Body: { proposalType: 'reorder' | 'replace', operations }
  // IDOR-safe: all stop IDs are verified against DB stops owned by this tripId before mutation.
  // Undo snapshot is persisted in trip metadata (server-side) — client need not round-trip it.
  app.post('/api/travel/trips/:tripId/weather-apply', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { proposalType, operations } = req.body;

      // Ownership check: fetch all stops that actually belong to this trip
      const tripStops = await storage.getStopsByTripId(tripId);
      const ownedIds = new Set(tripStops.map(s => s.id));

      if (proposalType === "reorder") {
        if (!Array.isArray(operations)) return res.status(400).json({ message: "operations must be an array for reorder" });
        // Verify every reorder target belongs to this trip
        const foreignOps = operations.filter((op: { stopId: string }) => !ownedIds.has(op.stopId));
        if (foreignOps.length > 0) return res.status(403).json({ message: "One or more stop IDs do not belong to this trip" });

        // Capture pre-apply state for server-side undo snapshot
        const originalStopOrders = tripStops.map(s => ({ stopId: s.id, displayOrder: s.displayOrder ?? 0 }));

        await storage.reorderStops(tripId, operations);

        // Persist undo snapshot in trip metadata
        const existingTrip = await storage.getTripById(tripId);
        const existingMeta = (existingTrip?.metadata ?? {}) as Record<string, unknown>;
        await storage.updateTrip(tripId, {
          metadata: { ...existingMeta, weatherUndoSnapshot: { proposalType: "reorder", originalStopOrders } },
        });

        res.json({ success: true, undoInfo: { proposalType: "reorder", originalStopOrders } });

      } else if (proposalType === "replace") {
        const { deleteStopId, newStop } = operations;
        if (!deleteStopId || !newStop) return res.status(400).json({ message: "deleteStopId and newStop required" });

        // IDOR check: the stop to delete must belong to this trip
        if (!ownedIds.has(deleteStopId)) return res.status(403).json({ message: "Stop does not belong to this trip" });

        const toDelete = tripStops.find(s => s.id === deleteStopId) ?? null;

        await storage.deleteStop(deleteStopId);
        const created = await storage.createStop({
          tripId,
          name: newStop.name,
          stopType: newStop.stopType || "museum",
          durationMinutes: newStop.durationMinutes || 60,
          description: newStop.description || null,
          displayOrder: newStop.displayOrder || 0,
        });

        const undoSnapshot = {
          proposalType: "replace" as const,
          addedStopId: created.id,
          originalStop: toDelete ? {
            name: toDelete.name,
            stopType: toDelete.stopType,
            durationMinutes: toDelete.durationMinutes,
            description: toDelete.description,
            displayOrder: toDelete.displayOrder,
          } : null,
        };

        // Persist undo snapshot in trip metadata
        const existingTrip = await storage.getTripById(tripId);
        const existingMeta = (existingTrip?.metadata ?? {}) as Record<string, unknown>;
        await storage.updateTrip(tripId, {
          metadata: { ...existingMeta, weatherUndoSnapshot: undoSnapshot },
        });

        res.json({ success: true, undoInfo: undoSnapshot });
      } else {
        res.status(400).json({ message: "Unknown proposalType" });
      }
    } catch (error) {
      console.error("[weather-apply]", error);
      res.status(500).json({ message: "Failed to apply weather fix" });
    }
  });

  // ─── Weather Smart Rerouting — undo the applied fix ────────────────────────
  // POST /api/travel/trips/:tripId/weather-undo
  // Reads undo snapshot from server-side trip metadata — no client state required.
  // IDOR-safe: added stop ID is verified against DB before deletion.
  app.post('/api/travel/trips/:tripId/weather-undo', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;

      // Read undo snapshot from server-side trip metadata
      const trip = await storage.getTripById(tripId);
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      const meta = (trip.metadata ?? {}) as Record<string, unknown>;
      const undoInfo = meta.weatherUndoSnapshot as Record<string, unknown> | undefined;
      if (!undoInfo) return res.status(400).json({ message: "No weather undo snapshot available" });

      if (undoInfo.proposalType === "reorder") {
        const originalStopOrders = undoInfo.originalStopOrders as Array<{ stopId: string; displayOrder: number }>;
        if (!Array.isArray(originalStopOrders)) {
          return res.status(400).json({ message: "Invalid undo snapshot" });
        }
        // Ownership check: all stops in snapshot must belong to this trip
        const tripStops = await storage.getStopsByTripId(tripId);
        const ownedIds = new Set(tripStops.map(s => s.id));
        const foreign = originalStopOrders.filter(op => !ownedIds.has(op.stopId));
        if (foreign.length > 0) return res.status(403).json({ message: "Snapshot contains stops not owned by this trip" });

        await storage.reorderStops(tripId, originalStopOrders);
      } else if (undoInfo.proposalType === "replace") {
        const addedStopId = undoInfo.addedStopId as string | undefined;

        if (addedStopId) {
          // IDOR check: the added stop must still belong to this trip
          const tripStops = await storage.getStopsByTripId(tripId);
          const ownedIds = new Set(tripStops.map(s => s.id));
          if (!ownedIds.has(addedStopId)) return res.status(403).json({ message: "Added stop does not belong to this trip" });
          await storage.deleteStop(addedStopId);
        }

        const originalStop = undoInfo.originalStop as Record<string, unknown> | null | undefined;
        if (originalStop) {
          await storage.createStop({
            tripId,
            name: originalStop.name as string,
            stopType: originalStop.stopType as string | null,
            durationMinutes: originalStop.durationMinutes as number | null,
            description: originalStop.description as string | null,
            displayOrder: (originalStop.displayOrder as number | null) ?? 0,
          });
        }
      } else {
        return res.status(400).json({ message: "Unknown proposalType in snapshot" });
      }

      // Clear the undo snapshot from metadata after use
      const freshMeta = { ...meta };
      delete freshMeta.weatherUndoSnapshot;
      await storage.updateTrip(tripId, { metadata: freshMeta });

      res.json({ success: true });
    } catch (error) {
      console.error("[weather-undo]", error);
      res.status(500).json({ message: "Failed to undo weather fix" });
    }
  });

  // Lookup stop details before adding (2-step confirm flow)
  app.post('/api/travel/stops/lookup', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { name, destination } = req.body;
      if (!name) return res.status(400).json({ message: "name is required" });

      // --- Step 1: Real geocoding via Nominatim (OpenStreetMap) ---
      let nominatimAddress: string | null = null;
      let nominatimLat: string | null = null;
      let nominatimLon: string | null = null;
      try {
        const query = encodeURIComponent(`${name}${destination ? ` ${destination}` : ""}`);
        const nominatimRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`,
          { headers: { "User-Agent": "GeoQuestGames/1.0 (family travel app)" } }
        );
        if (nominatimRes.ok) {
          const results: any[] = await nominatimRes.json();
          if (results.length > 0) {
            const r = results[0];
            nominatimLat = r.lat ? String(r.lat) : null;
            nominatimLon = r.lon ? String(r.lon) : null;
            // Build a clean address from address components
            const a = r.address || {};
            const parts = [
              a.house_number && a.road ? `${a.house_number} ${a.road}` : (a.road || a.pedestrian || a.path || null),
              a.city || a.town || a.village || a.suburb || null,
              a.state || null,
              a.postcode || null,
            ].filter(Boolean);
            nominatimAddress = parts.length > 0 ? parts.join(", ") : (r.display_name?.split(",").slice(0, 3).join(",").trim() || null);
            console.log(`[Nominatim] "${name}" → ${nominatimAddress} (${nominatimLat}, ${nominatimLon})`);
          }
        }
      } catch (geoErr) {
        console.warn("[Nominatim] geocoding failed, falling back to AI:", geoErr);
      }

      // --- Step 2: AI for description, duration, kid-friendliness etc. ---
      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a family travel expert. Given a place name and destination city, return a JSON object with:
- name: the proper/official name of the place
- stopType: one of [landmark, museum, park, beach, temple, market, restaurant, nature, viewpoint, zoo, aquarium, garden, plaza, palace, bridge, neighborhood, street_food, food, culture, adventure, hotel, casino, other]
- duration: estimated visit duration e.g. "60–90 min"
- description: 1-sentence description of the place
- whyKidsLoveIt: 1 sentence on why kids will enjoy it
- entryCost: "Free entry" or approximate cost e.g. "$25 adults, $15 kids"
- kidFriendly: true or false
- bestTime: best time to visit e.g. "Morning" or "Avoid peak hours (noon–2pm)"
${nominatimAddress ? '- Do NOT include address/lat/lon — those are provided separately.' : '- address: full street address\n- lat: decimal latitude\n- lon: decimal longitude'}`,
          },
          { role: "user", content: `Place: "${name}"${destination ? `, near ${destination}` : ""}` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
      });
      const data = JSON.parse(response.choices[0].message.content || "{}");

      // Prefer real geocoding results over AI-guessed address/coords
      res.json({
        ...data,
        address: nominatimAddress ?? data.address ?? null,
        lat: nominatimLat ?? data.lat ?? null,
        lon: nominatimLon ?? data.lon ?? null,
        addressSource: nominatimAddress ? "verified" : "estimated",
      });
    } catch (error) {
      console.error("[Travel] Stop lookup error:", error);
      res.status(500).json({ message: "Lookup failed" });
    }
  });

  // Lighter Day Proposal — AI analyzes stops and returns removal recommendations
  app.post('/api/travel/trips/:tripId/lighter-day-proposal', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { stops, triggerContext = "lighter", maxRemovalsOverride } = req.body;

      if (!stops || !Array.isArray(stops)) {
        return res.status(400).json({ message: "stops array is required" });
      }

      // Edge case: ≤2 stops → already balanced
      if (stops.length <= 2) {
        return res.json({ alreadyBalanced: true });
      }

      const contextDescriptions: Record<string, string> = {
        lighter: "The user wants a lighter, more relaxed day with fewer stops.",
        running_late: "The user is running behind schedule and needs to cut stops to get back on track.",
        kids_tired: "The kids are tired and the family needs a gentler afternoon with fewer stops.",
        too_much: "The user feels overwhelmed by how much is planned and wants to trim down to essentials.",
      };

      const contextDesc = contextDescriptions[triggerContext] || contextDescriptions.lighter;

      // Strategy-specific instructions
      const strategyInstructions = triggerContext === "kids_tired" || triggerContext === "too_much"
        ? `You should be more aggressive — remove more stops if needed. Prioritize keeping only the highest-energy, most memorable stops. Deprioritize any stops that are long walks, culturally heavy, or require sustained concentration. Strongly favour removing stops that feel adult-focused or repetitive.`
        : `Be conservative — aim to remove the minimum number of stops needed to balance the day. Focus on geographic outliers and redundant stop types only.`;

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a family trip planning assistant helping simplify a day's itinerary. ${contextDesc}

${strategyInstructions}

Your job is to recommend which stops to REMOVE and which to KEEP.

Rules:
- NEVER remove the first stop in the list (it is the anchor)
- ALWAYS keep the stop you identify as highest-value for kids/families (theme parks, zoos, aquariums, playgrounds rank highest)
- Rank stops for removal using these factors (in priority order):
  1. Geographic distance from previous stop (far from route = remove first)
  2. Stop type redundancy (two museums → remove the lower-value one)
  3. Energy demand vs time of day (heavy stops late in day)
  4. Adult-focus vs kid-focus (adult-focused stops removed before kid-focused)
- For each removed stop, provide a specific one-line reason based on the actual stop (max 10 words, never generic)
- Reasons must reference the specific stop name or its type, not just "Least essential"
- For kept stops that are special "anchors", provide an optional anchorReason

Return ONLY valid JSON in this exact format:
{
  "stopsToRemove": [{ "id": "...", "name": "...", "reason": "..." }],
  "stopsToKeep": [{ "id": "...", "name": "...", "anchorReason": "..." }],
  "explanation": "One sentence summarizing the simplification",
  "newTotalMinutes": 0,
  "oldTotalMinutes": 0
}`,
          },
          {
            role: "user",
            content: `Here are today's unvisited stops in order:\n${JSON.stringify(stops, null, 2)}\n\nTarget: remove exactly ${maxRemovalsOverride || 1} stop(s). Analyze and return the simplification proposal.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const raw = completion.choices[0].message.content || "{}";
      const proposal = JSON.parse(raw);

      // --- Deterministic post-processing to enforce all product constraints ---

      // Identify required anchors that must never be removed:
      // 1. The first stop in the list (positional anchor)
      // 2. The stop with highest kid/family value — identified as the one whose
      //    stopType is most family-friendly (museum/theme_park/zoo/aquarium/park)
      //    or, failing that, lowest display order among the non-first stops.
      type StopPayload = { id: string; name: string; stopType?: string; durationMinutes?: number; displayOrder?: number };
      const firstStopId = stops[0]?.id as string | undefined;
      const familyTypes = ["theme_park", "zoo", "aquarium", "museum", "park", "playground", "water_park"];
      const kidsValueStop = stops.slice(1).find((s: StopPayload) => familyTypes.some(t => s.stopType?.toLowerCase().includes(t)))
        ?? stops[1];
      const kidsStopId = kidsValueStop?.id as string | undefined;
      const requiredAnchorIds = new Set<string>([firstStopId, kidsStopId].filter(Boolean) as string[]);

      // Cap removals: use override if provided (strategy-driven), otherwise 40% of stops
      const maxRemovals = maxRemovalsOverride
        ? Math.min(Math.max(1, Number(maxRemovalsOverride)), Math.ceil(stops.length * 0.6))
        : Math.max(1, Math.floor(stops.length * 0.4));

      // Normalize stopsToRemove: must be an array of objects with id
      if (!Array.isArray(proposal.stopsToRemove)) {
        proposal.stopsToRemove = [];
      }
      proposal.stopsToRemove = proposal.stopsToRemove.filter(
        (r: StopPayload) => r?.id && !requiredAnchorIds.has(r.id)
      );

      // Enforce max-removal cap
      if (proposal.stopsToRemove.length > maxRemovals) {
        proposal.stopsToRemove = proposal.stopsToRemove.slice(0, maxRemovals);
      }

      // Enforce minimum 1 removal — if AI returned nothing, remove the last
      // non-anchor stop
      if (proposal.stopsToRemove.length === 0) {
        const candidate = [...stops].reverse().find(
          (s: StopPayload) => !requiredAnchorIds.has(s.id)
        );
        if (candidate) {
          proposal.stopsToRemove = [{ id: candidate.id, name: candidate.name, reason: "Least essential for the day" }];
        }
      }

      // Rebuild stopsToKeep from the stops not in stopsToRemove
      const removeIds = new Set<string>(proposal.stopsToRemove.map((r: StopPayload) => r.id));
      proposal.stopsToKeep = stops
        .filter((s: StopPayload) => !removeIds.has(s.id))
        .map((s: StopPayload) => {
          const existing = Array.isArray(proposal.stopsToKeep)
            ? proposal.stopsToKeep.find((k: StopPayload) => k.id === s.id)
            : null;
          const isAnchor = requiredAnchorIds.has(s.id);
          return {
            id: s.id,
            name: s.name,
            anchorReason: existing?.anchorReason
              ?? (isAnchor && s.id === kidsStopId ? "Highest-value stop for kids" : undefined),
          };
        });

      // Compute total minutes
      const oldTotal = stops.reduce((sum: number, s: StopPayload) => sum + (s.durationMinutes || 60), 0);
      const newTotal = stops
        .filter((s: StopPayload) => !removeIds.has(s.id))
        .reduce((sum: number, s: StopPayload) => sum + (s.durationMinutes || 60), 0);
      proposal.oldTotalMinutes = oldTotal;
      proposal.newTotalMinutes = newTotal;

      if (!proposal.explanation) {
        proposal.explanation = `Removed ${proposal.stopsToRemove.length} stop${proposal.stopsToRemove.length !== 1 ? "s" : ""} to lighten your day.`;
      }

      res.json(proposal);
    } catch (error) {
      console.error("[Travel] Lighter day proposal error:", error);
      res.status(500).json({ message: "Failed to generate lighter day proposal" });
    }
  });

  // Add a stop to a trip
  app.post('/api/travel/trips/:tripId/stops', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { name, stopType, address, cityGroup, insertAtOrder, latitude, longitude, durationMinutes, dayIndex } = req.body;
      
      // Content Safety Check
      const nameSafety = validateUserInput(name);
      if (!nameSafety.safe) {
        return res.status(400).json({ message: nameSafety.message });
      }

      let resolvedAddress = address || null;
      let resolvedLat: string | null = latitude ? String(latitude) : null;
      let resolvedLon: string | null = longitude ? String(longitude) : null;

      // Auto-lookup address and coordinates if not provided
      if (!address) {
        try {
          const trip = await storage.getTripById(tripId);
          const cityContext = trip?.city || trip?.destination || '';
          const openai = getOpenAI();
          const lookupResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a geography expert. Return ONLY a JSON object with 'address' (full street address), 'lat' (decimal latitude), and 'lon' (decimal longitude) for the given place. If you cannot find a specific address, provide the best known address." },
              { role: "user", content: `Find the address and coordinates for: "${name}"${cityContext ? ` in or near ${cityContext}` : ''}` }
            ],
            response_format: { type: "json_object" },
            max_tokens: 200,
          });
          const locationData = JSON.parse(lookupResponse.choices[0].message.content || "{}");
          if (locationData.address) resolvedAddress = locationData.address;
          if (locationData.lat && !resolvedLat) resolvedLat = String(locationData.lat);
          if (locationData.lon && !resolvedLon) resolvedLon = String(locationData.lon);
          console.log(`📍 [Travel] Auto-resolved "${name}": ${resolvedAddress}`);
        } catch (e) {
          console.error(`Failed to auto-lookup address for "${name}":`, e);
        }
      }

      // City-group-aware insertion: always put the stop in the correct day
      const allStops = await storage.getStopsByTripId(tripId);
      const sorted = [...allStops].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      let insertAt: number;
      if (typeof insertAtOrder === 'number') {
        // Need-rec insertion: exact position requested by client
        // Round to integer since displayOrder is an integer DB column
        insertAt = Math.round(Math.max(0, insertAtOrder));
      } else if (cityGroup) {
        // Add-stop: append at end of the target city group (day)
        const dayStops = sorted.filter(s => s.cityGroup === cityGroup);
        insertAt = dayStops.length > 0
          ? (dayStops[dayStops.length - 1].displayOrder || 0) + 1
          : sorted.length;
      } else {
        // Fallback: append at end of all stops
        insertAt = sorted.length;
      }

      // Shift all stops whose displayOrder >= insertAt to make room
      for (const s of sorted.filter(s => (s.displayOrder || 0) >= insertAt)) {
        await storage.updateStop(s.id, { displayOrder: (s.displayOrder || 0) + 1 });
      }

      const stop = await storage.createStop({
        tripId,
        name,
        stopType: stopType || 'landmark',
        displayOrder: insertAt,
        address: resolvedAddress,
        latitude: resolvedLat,
        longitude: resolvedLon,
        cityGroup: cityGroup || null,
        durationMinutes: durationMinutes ? parseInt(String(durationMinutes)) : null,
        dayIndex: typeof dayIndex === 'number' ? dayIndex : null,
      });
      
      // Create an empty journey pack for this stop (non-blocking — stop creation always succeeds)
      storage.createJourneyPack({ stopId: stop.id }).catch((e) =>
        console.error(`[Travel] Failed to create journey pack for stop ${stop.id}:`, e)
      );
      
      console.log(`📍 [Travel] Stop added:`, { stopId: stop.id, name, tripId, cityGroup, displayOrder: insertAt, address: resolvedAddress });
      res.json(stop);
    } catch (error) {
      console.error("Error creating stop:", error);
      res.status(500).json({ message: "Failed to create stop" });
    }
  });
  
  // Update a stop
  app.patch('/api/travel/stops/:stopId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const updates = req.body;
      
      const stop = await storage.updateStop(stopId, updates);
      res.json(stop);
    } catch (error) {
      console.error("Error updating stop:", error);
      res.status(500).json({ message: "Failed to update stop" });
    }
  });
  
  // Mark a stop as visited
  // Stop types that always warrant a "Worth it?" quality pulse
  const QUALITY_PROMPT_ANCHOR_TYPES = new Set([
    "museum", "fort", "temple", "landmark", "palace", "monument",
    "heritage", "attraction", "national_park", "world_heritage",
  ]);
  const QUALITY_PROMPT_UNCERTAIN_TYPES = new Set(["unknown", "other", "poi"]);

  app.post('/api/travel/stops/:stopId/visit', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const userId = req.user.claims.sub;
      const mode: "completed" | "skipped" = req.body?.mode === "skip" ? "skipped" : "completed";
      const stop = await storage.markStopVisited(stopId, mode);

      // Compute showQualityPrompt: show for anchor/uncertain stop types,
      // OR if this placeId has never had a quality signal (first-time place visit).
      let showQualityPrompt = false;
      if (mode === "completed") {
        const st = stop.stopType ?? "";
        const isAnchorOrUncertain =
          QUALITY_PROMPT_ANCHOR_TYPES.has(st) ||
          QUALITY_PROMPT_UNCERTAIN_TYPES.has(st) ||
          st === "";
        if (isAnchorOrUncertain) {
          showQualityPrompt = true;
        } else if (stop.placeId) {
          // First-time placeId: check if user has any prior quality signals for stops
          // sharing this placeId (across all trips)
          const [priorSignal] = await db
            .select({ id: stopQualitySignals.id })
            .from(stopQualitySignals)
            .innerJoin(travelStops, eq(travelStops.id, stopQualitySignals.stopId))
            .where(
              and(
                eq(stopQualitySignals.userId, userId),
                eq(travelStops.placeId, stop.placeId),
              ),
            )
            .limit(1);
          showQualityPrompt = !priorSignal;
        }
      }

      res.json({ ...stop, showQualityPrompt });

      // ── Fire-and-forget: quality signal + ML knowledge base ─────────────
      (async () => {
        try {
          // Write the `visited` quality signal for completed stops (base score +1)
          if (mode === "completed") {
            await storage.createStopQualitySignal({
              userId,
              tripId: stop.tripId,
              stopId: stop.id,
              signalType: "visited",
              signalValue: null,
              signalReason: null,
            });
          }

          const [trip] = await db.select().from(travelTrips).where(eq(travelTrips.id, stop.tripId)).limit(1);
          if (!trip?.city || !trip?.country) return;

          // Get explorer ages from the trip's travelers
          const travelers = (trip.travelers ?? []) as Array<{ explorerId?: string }>;
          const explorerIds = travelers.map(t => t.explorerId).filter(Boolean) as string[];
          let explorerAges: number[] = [];
          if (explorerIds.length > 0) {
            const explorerRows = await db.select({ age: players.age }).from(players)
              .where(sql`${players.id} = ANY(${explorerIds})`);
            explorerAges = explorerRows.map(e => parseInt(e.age ?? "0", 10)).filter(a => a > 0);
          }

          const stopMissions = (stop.stopMissions ?? []) as Array<{ completed: boolean }>;
          const missionsTotal = stopMissions.length || (stop.missionCompleted ? 1 : 0);
          const missionsCompleted = stopMissions.length > 0
            ? stopMissions.filter(m => m.completed).length
            : (stop.missionCompleted ? 1 : 0);

          await upsertVisitSignal({
            city: trip.city,
            country: trip.country,
            stopName: stop.name,
            stopType: stop.stopType,
            latitude: stop.latitude,
            longitude: stop.longitude,
            wasCompleted: mode === "completed",
            missionsTotal,
            missionsCompleted,
            explorerAges,
          });
        } catch (e) {
          console.error("[FamilySignals] Background signal update failed:", e);
        }
      })();
    } catch (error) {
      console.error("Error marking stop visited:", error);
      res.status(500).json({ message: "Failed to mark stop visited" });
    }
  });
  
  app.post('/api/travel/stops/:stopId/favorite', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const { isFavorite } = req.body;
      const stop = await storage.updateStop(stopId, {
        isFavorite: Boolean(isFavorite),
        favoriteSource: 'manual',
      });
      res.json(stop);

      // Fire quality signal for favorite toggle (fire-and-forget)
      (async () => {
        try {
          const userId = req.user.claims.sub;
          await storage.createStopQualitySignal({
            userId,
            tripId: stop.tripId,
            stopId,
            signalType: "favorite",
            signalValue: Boolean(isFavorite) ? "favorited" : "unfavorited",
          });
        } catch {}
      })();
    } catch (error) {
      console.error("Error toggling stop favorite:", error);
      res.status(500).json({ message: "Failed to toggle stop favorite" });
    }
  });

  // ============================================================================
  // STOP QUALITY SIGNALS API
  // ============================================================================

  app.post('/api/travel/stops/:stopId/quality-signal', isAuthenticated, travelModeGuard, async (req: any, res) => {
    // Require the parent-context header — quality signals are parent-only
    if (req.headers["x-adventure-parent"] !== "1") {
      return res.status(403).json({ message: "Quality signals are parent-only" });
    }
    try {
      const { stopId } = req.params;
      const userId = req.user.claims.sub;

      const stop = await storage.getStopById(stopId);
      if (!stop) return res.status(404).json({ message: "Stop not found" });

      // Authorization: verify the trip belongs to this user (prevent IDOR writes)
      const [ownerTrip] = await db.select({ userId: travelTrips.userId })
        .from(travelTrips)
        .where(and(eq(travelTrips.id, stop.tripId), eq(travelTrips.userId, userId)))
        .limit(1);
      if (!ownerTrip) return res.status(403).json({ message: "Not authorized" });

      // Validate signal_type against allowed values
      const VALID_SIGNAL_TYPES = new Set([
        "visited", "moment_capture_opened", "photo_added", "note_added",
        "photo_and_note", "capture_dismissed", "favorite", "skipped",
        "worth_it", "worth_it_followup", "standout_stop", "day_end_tag",
        "kid_mode_completed", "removed_from_trip", "long_dwell", "short_dwell",
      ]);
      if (!VALID_SIGNAL_TYPES.has(req.body.signalType)) {
        return res.status(400).json({ message: `Invalid signal type: ${req.body.signalType}` });
      }

      const parsed = insertStopQualitySignalSchema.safeParse({
        userId,
        tripId: stop.tripId,
        stopId,
        signalType: req.body.signalType,
        signalValue: req.body.signalValue ?? null,
        signalReason: req.body.signalReason ?? null,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid signal data", errors: parsed.error.issues });
      }

      const signal = await storage.createStopQualitySignal(parsed.data);
      res.json(signal);
    } catch (error) {
      console.error("Error creating quality signal:", error);
      res.status(500).json({ message: "Failed to create quality signal" });
    }
  });

  app.get('/api/travel/trips/:tripId/quality-signals', isAuthenticated, travelModeGuard, async (req: any, res) => {
    // Quality signal data is parent-only
    if (req.headers["x-adventure-parent"] !== "1") {
      return res.status(403).json({ message: "Quality signals are parent-only" });
    }
    try {
      const { tripId } = req.params;
      const userId = req.user.claims.sub;

      const [trip] = await db.select().from(travelTrips)
        .where(and(eq(travelTrips.id, tripId), eq(travelTrips.userId, userId)))
        .limit(1);
      if (!trip) return res.status(404).json({ message: "Trip not found" });

      const signals = await storage.getStopQualitySignalsByTrip(tripId);

      const byStop: Record<string, { rawScore: number; signals: typeof signals }> = {};
      const signalsByStop: Record<string, typeof signals> = {};
      for (const sig of signals) {
        if (!signalsByStop[sig.stopId]) signalsByStop[sig.stopId] = [];
        signalsByStop[sig.stopId].push(sig);
      }

      // Fetch stop types so anchor-stop negative cap can apply correctly
      const stopIds = Object.keys(signalsByStop);
      const stopTypeMap: Record<string, string | null> = {};
      if (stopIds.length > 0) {
        const stopRows = await db.select({ id: travelStops.id, stopType: travelStops.stopType })
          .from(travelStops)
          .where(inArray(travelStops.id, stopIds));
        for (const row of stopRows) stopTypeMap[row.id] = row.stopType;
      }

      for (const [sid, sigs] of Object.entries(signalsByStop)) {
        const score = computeStopQualityScore(sigs, stopTypeMap[sid] ?? null);
        byStop[sid] = { rawScore: score.rawScore, signals: sigs };
      }

      res.json({ byStop, totalSignals: signals.length });
    } catch (error) {
      console.error("Error fetching quality signals:", error);
      res.status(500).json({ message: "Failed to fetch quality signals" });
    }
  });

  app.post('/api/travel/trips/:tripId/recalculate-city-groups', isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const [trip] = await db.select().from(travelTrips).where(eq(travelTrips.id, tripId)).limit(1);
      if (!trip) return res.status(404).json({ message: "Trip not found" });

      const stayLocs = (trip.stayLocations as Array<{ cityName?: string }> | null) ?? [];
      const routeCities = [...new Set(stayLocs.map((sl) => sl.cityName).filter(Boolean))] as string[];
      const defaultCity = trip.city || trip.destination.split(",")[0]?.trim() || trip.destination;

      const stops = await db.select({
        id: travelStops.id,
        name: travelStops.name,
        latitude: travelStops.latitude,
        longitude: travelStops.longitude,
      }).from(travelStops).where(eq(travelStops.tripId, tripId));

      if (stops.length === 0) return res.json({ updated: 0, cities: [] });

      const { computeCityGroupsForStops } = await import("../planner/cityGroupUtils");

      if (routeCities.length < 2) {
        await db.update(travelStops).set({ cityGroup: defaultCity }).where(eq(travelStops.tripId, tripId));
        return res.json({ updated: stops.length, cities: [defaultCity] });
      }

      const countryHint = trip.country || "";
      const cityGroupMap = await computeCityGroupsForStops(stops, routeCities, countryHint, defaultCity);

      for (const [stopId, cityGroup] of cityGroupMap) {
        await db.update(travelStops).set({ cityGroup }).where(eq(travelStops.id, stopId));
      }

      res.json({ updated: cityGroupMap.size, cities: routeCities });
    } catch (error) {
      console.error("Error recalculating city groups:", error);
      res.status(500).json({ message: "Failed to recalculate city groups" });
    }
  });

  app.post('/api/travel/stops/:stopId/complete-mission', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stopId } = req.params;
      const { answer, explorerId } = req.body;

      const [stop] = await db.select().from(travelStops).where(eq(travelStops.id, stopId));
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }

      const trip = await storage.getTripById(stop.tripId);
      if (!trip || trip.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (stop.missionCompleted) {
        return res.status(400).json({ message: "Mission already completed" });
      }
      if (!stop.missionType || !stop.missionQuestion) {
        return res.status(400).json({ message: "This stop has no mission" });
      }

      const allStops = await storage.getStopsByTripId(stop.tripId);
      const sortedStops = allStops.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const missionStops = sortedStops.filter(s => s.missionType && s.missionQuestion);
      const currentMissionIdx = missionStops.findIndex(s => s.id === stopId);
      if (currentMissionIdx > 0) {
        const prevMission = missionStops[currentMissionIdx - 1];
        if (!prevMission.missionCompleted) {
          return res.status(400).json({ message: "Complete previous missions first" });
        }
      }

      let isCorrect = true;
      if (stop.missionType === 'knowledge' && stop.missionAnswer) {
        const normalizedAnswer = (answer || '').toLowerCase().trim();
        const normalizedExpected = stop.missionAnswer.toLowerCase().trim();
        if (!normalizedAnswer || normalizedAnswer.length < 2) {
          isCorrect = false;
        } else {
          const answerWords = normalizedAnswer.split(/\s+/).filter((w: string) => w.length > 1);
          const expectedWords = normalizedExpected.split(/\s+/).filter((w: string) => w.length > 1);
          isCorrect = (answerWords.length > 0 && expectedWords.some((w: string) => answerWords.includes(w))) ||
                      (normalizedAnswer.length >= 3 && normalizedExpected.includes(normalizedAnswer)) ||
                      (normalizedAnswer.length >= 3 && normalizedAnswer.includes(normalizedExpected));
        }
        if (!isCorrect) {
          return res.json({
            success: false,
            isCorrect: false,
            xpAwarded: 0,
            keepsakeUnlocked: false,
            missionType: stop.missionType,
            correctAnswer: null,
          });
        }
      }

      const difficultyXp: Record<string, number> = {
        easy: XP_REWARDS.MISSION_EASY,
        normal: XP_REWARDS.MISSION_NORMAL,
        challenge: XP_REWARDS.MISSION_CHALLENGE,
      };
      const xpAwarded = difficultyXp[stop.missionDifficulty || 'normal'] || XP_REWARDS.MISSION_NORMAL;

      await storage.updateStop(stopId, {
        missionCompleted: true,
        missionCompletedAt: new Date(),
        missionXpAwarded: xpAwarded,
      });

      const currentCompleted = trip.missionsCompleted || 0;
      const currentXpTotal = trip.missionXpTotal || 0;
      await storage.updateTrip(stop.tripId, {
        missionsCompleted: currentCompleted + 1,
        missionXpTotal: currentXpTotal + xpAwarded,
      });

      let validatedExplorerId: string | null = null;
      if (explorerId) {
        try {
          const userExplorers = await storage.getPlayersByUserId(userId);
          const ownsExplorer = userExplorers.some(p => p.id === explorerId);
          if (ownsExplorer) {
            validatedExplorerId = explorerId;
            await storage.awardXp(explorerId, xpAwarded);
          }
        } catch (e) {
          console.error("Error awarding mission XP:", e);
        }
      }

      let keepsakeUnlocked = false;
      let unlockedKeepsake: { name: string; emoji: string; description: string } | null = null;
      if (stop.missionKeepsakeReward && validatedExplorerId) {
        try {
          const keepsakes = await storage.getKeepsakesByStopId(stopId);
          if (keepsakes.length > 0) {
            const keepsake = keepsakes[0];
            const alreadyCollected = await storage.hasCollectedKeepsake(validatedExplorerId, keepsake.id);
            if (!alreadyCollected) {
              await storage.collectKeepsake({
                explorerId: validatedExplorerId,
                keepsakeId: keepsake.id,
                tripId: stop.tripId,
              });
              keepsakeUnlocked = true;
              unlockedKeepsake = { name: keepsake.name, emoji: keepsake.emoji || '🗺️', description: keepsake.description || '' };
            }
          }
        } catch (e) {
          console.error("Error unlocking keepsake:", e);
        }
      }

      const nextMission = missionStops.find((s, i) => i > currentMissionIdx && !s.missionCompleted && s.id !== stopId);

      res.json({
        success: true,
        isCorrect: true,
        xpAwarded,
        keepsakeUnlocked,
        unlockedKeepsake,
        missionType: stop.missionType,
        correctAnswer: stop.missionAnswer,
        nextMission: nextMission ? {
          stopId: nextMission.id,
          stopName: nextMission.name,
          missionType: nextMission.missionType,
          missionQuestion: nextMission.missionQuestion,
          missionDifficulty: nextMission.missionDifficulty,
        } : null,
      });
    } catch (error) {
      console.error("Error completing mission:", error);
      res.status(500).json({ message: "Failed to complete mission" });
    }
  });

  app.post('/api/travel/stops/:stopId/generate-missions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stopId } = req.params;

      const stop = await storage.getStopById(stopId);
      if (!stop) return res.status(404).json({ message: "Stop not found" });

      const trip = await storage.getTripById(stop.tripId);
      if (!trip || trip.userId !== userId) return res.status(403).json({ message: "Access denied" });

      const existing = stop.stopMissions as ExplorerChallengeMission[] | null;
      if (existing && Array.isArray(existing) && existing.length > 0) {
        return res.json({ missions: existing });
      }

      const city = trip.city || trip.destination || "Unknown city";
      const missions = await generateMissionsForStop(stop.name, city, stop.stopType || "landmark");
      const withDefaults: ExplorerChallengeMission[] = missions.map(m => ({
        ...m,
        xpReward: m.type === "photo" ? 10 : 5,
        completed: false,
        skipped: false,
        attempts: 0,
      }));

      await storage.updateStop(stopId, { stopMissions: withDefaults });
      res.json({ missions: withDefaults });
    } catch (error) {
      console.error("Error generating missions for stop:", error);
      res.status(500).json({ message: "Failed to generate missions" });
    }
  });

  app.post('/api/travel/stops/:stopId/complete-explorer-mission', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stopId } = req.params;
      const { missionIndex, selectedOption, skipped, explorerId, textResponse, photoUrl } = req.body;

      const [stop] = await db.select().from(travelStops).where(eq(travelStops.id, stopId));
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }

      const trip = await storage.getTripById(stop.tripId);
      if (!trip || trip.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const missions = (stop.stopMissions as ExplorerChallengeMission[] | null) || [];
      if (missionIndex < 0 || missionIndex >= missions.length) {
        return res.status(400).json({ message: "Invalid mission index" });
      }

      const mission = missions[missionIndex];
      if (mission.completed || mission.skipped) {
        return res.status(400).json({ message: "Mission already completed or skipped" });
      }

      let isCorrect = false;
      let xpAwarded = 0;

      if (skipped) {
        missions[missionIndex] = { ...mission, skipped: true, completed: false };
      } else if (mission.type === "knowledge") {
        const currentAttempts = (mission.attempts || 0) + 1;
        isCorrect = selectedOption === mission.correctOption;
        if (isCorrect) {
          xpAwarded = mission.xpReward;
          missions[missionIndex] = { ...mission, completed: true, skipped: false, attempts: currentAttempts };
        } else {
          missions[missionIndex] = { ...mission, attempts: currentAttempts };
          await storage.updateStop(stopId, { stopMissions: missions });
          return res.json({
            success: false,
            isCorrect: false,
            xpAwarded: 0,
            attempts: currentAttempts,
            maxAttempts: 2,
            correctOption: currentAttempts >= 2 ? mission.correctOption : null,
            allComplete: false,
          });
        }
      } else if (mission.type === "observation") {
        xpAwarded = mission.xpReward;
        missions[missionIndex] = { ...mission, completed: true, skipped: false, textResponse: textResponse || "" };
        isCorrect = true;
      } else if (mission.type === "photo") {
        xpAwarded = mission.xpReward;
        missions[missionIndex] = { ...mission, completed: true, skipped: false, photoUrl: photoUrl || "" };
        isCorrect = true;
      }

      await storage.updateStop(stopId, { stopMissions: missions });

      const completedCount = missions.filter(m => m.completed).length;
      const finishedCount = missions.filter(m => m.completed || m.skipped).length;
      const allComplete = finishedCount === missions.length;
      const totalXpEarned = missions.filter(m => m.completed).reduce((sum, m) => sum + m.xpReward, 0);

      if (xpAwarded > 0 && explorerId) {
        try {
          const userExplorers = await storage.getPlayersByUserId(userId);
          if (userExplorers.some(p => p.id === explorerId)) {
            await storage.awardXp(explorerId, xpAwarded);
          }
        } catch (e) {
          console.error("Error awarding explorer mission XP:", e);
        }
      }

      if (allComplete) {
        await storage.updateStop(stopId, {
          missionCompleted: true,
          missionCompletedAt: new Date(),
          missionXpAwarded: totalXpEarned,
        });

        const currentCompleted = trip.missionsCompleted || 0;
        const currentXpTotal = trip.missionXpTotal || 0;
        await storage.updateTrip(stop.tripId, {
          missionsCompleted: currentCompleted + 1,
          missionXpTotal: currentXpTotal + totalXpEarned,
        });

        if (stop.missionKeepsakeReward && explorerId) {
          try {
            const userExplorers = await storage.getPlayersByUserId(userId);
            if (userExplorers.some(p => p.id === explorerId)) {
              const keepsakes = await storage.getKeepsakesByStopId(stopId);
              if (keepsakes.length > 0) {
                const keepsake = keepsakes[0];
                const alreadyCollected = await storage.hasCollectedKeepsake(explorerId, keepsake.id);
                if (!alreadyCollected) {
                  await storage.collectKeepsake({
                    explorerId,
                    keepsakeId: keepsake.id,
                    tripId: stop.tripId,
                  });
                }
              }
            }
          } catch (e) {
            console.error("Error unlocking keepsake:", e);
          }
        }
      }

      res.json({
        success: true,
        isCorrect: !skipped && isCorrect,
        skipped: !!skipped,
        xpAwarded,
        allComplete,
        completedCount,
        totalMissions: missions.length,
        totalXpEarned,
      });
    } catch (error) {
      console.error("Error completing explorer mission:", error);
      res.status(500).json({ message: "Failed to complete explorer mission" });
    }
  });

  // Get dynamic game content for a stop
  app.get('/api/travel/stops/:stopId/games', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const { getGameContent } = await import('../gameContentService');
      const gameContent = await getGameContent(stopId);
      res.json(gameContent);
    } catch (error) {
      console.error("Error fetching game content:", error);
      res.status(500).json({ message: "Failed to fetch game content" });
    }
  });
  
  // Get explore content for a stop (nearby attractions, restaurants, etc.)
  app.get('/api/travel/stops/:stopId/explore', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const stop = await storage.getStopById(stopId);
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      // Check if journey pack already has explore data cached (with new fields)
      const journeyPack = await storage.getJourneyPackByStopId(stopId);
      const cached = journeyPack?.exploreData as any;
      if (cached && cached.reviews !== undefined) {
        return res.json(cached);
      }
      
      // Get trip for destination context
      const trip = await storage.getTripById(stop.tripId);
      const destination = trip?.destination || '';
      
      // Generate explore content using OpenAI
      const { getExploreContent } = await import('../exploreContentService');
      const exploreData = await getExploreContent(stop.name, stop.stopType || 'landmark', destination);
      
      // Cache the explore data in journey pack
      if (journeyPack) {
        await storage.updateJourneyPack(journeyPack.id, { exploreData });
      }
      
      res.json(exploreData);
    } catch (error) {
      console.error("Error fetching explore content:", error);
      res.status(500).json({ message: "Failed to fetch explore content" });
    }
  });

  // In-memory cache for hero images (stopId → url)
  const heroImageCache: Record<string, string> = {};

  app.get('/api/travel/stops/:stopId/hero-image', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;

      // Check in-memory cache first
      if (heroImageCache[stopId]) {
        return res.json({ url: heroImageCache[stopId] });
      }

      // Check if already cached in journey pack
      const journeyPack = await storage.getJourneyPackByStopId(stopId);
      if ((journeyPack?.exploreData as any)?.heroImageUrl) {
        const url = (journeyPack!.exploreData as any).heroImageUrl;
        heroImageCache[stopId] = url;
        return res.json({ url });
      }

      const stop = await storage.getStopById(stopId);
      if (!stop) return res.status(404).json({ message: "Stop not found" });

      const trip = await storage.getTripById(stop.tripId);
      const destination = trip?.destination || '';

      const { generateStopHeroImage } = await import('../exploreContentService');
      const url = await generateStopHeroImage(stop.name, stop.stopType || 'landmark', destination);

      if (url) {
        heroImageCache[stopId] = url;
        // Also cache inside exploreData if journey pack exists
        if (journeyPack) {
          const existing = (journeyPack.exploreData as any) || {};
          await storage.updateJourneyPack(journeyPack.id, { exploreData: { ...existing, heroImageUrl: url } });
        }
      }

      res.json({ url: url || null });
    } catch (error) {
      console.error("Error generating hero image:", error);
      res.json({ url: null });
    }
  });

  app.post('/api/travel/lookup-address', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { placeName, tripContext } = req.body;
      if (!placeName || !tripContext) {
        return res.status(400).json({ message: "placeName and tripContext are required" });
      }

      // Content Safety Check
      const placeSafety = validateUserInput(placeName);
      if (!placeSafety.safe) {
        return res.status(400).json({ message: placeSafety.message });
      }

      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a geography expert. Given a place name and its city/region context, return the full street address. Return ONLY a JSON object with a single 'address' field containing the full address string. If you cannot determine the address, return {\"address\": null}." },
          { role: "user", content: `Find the address for "${placeName}" in ${tripContext}` }
        ],
        response_format: { type: "json_object" },
        max_tokens: 150,
      });
      const result = JSON.parse(response.choices[0].message.content || '{"address": null}');
      res.json({ address: result.address || null });
    } catch (error) {
      console.error("Error looking up address:", error);
      res.json({ address: null });
    }
  });

  // Delete a stop
  app.delete('/api/travel/stops/:stopId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      await storage.deleteStop(stopId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting stop:", error);
      res.status(500).json({ message: "Failed to delete stop" });
    }
  });
  
  // Reorder stops
  app.patch('/api/travel/trips/:tripId/reorder-stops', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { stopOrders } = req.body;
      
      if (!Array.isArray(stopOrders)) {
        return res.status(400).json({ message: "stopOrders must be an array" });
      }
      
      // stopOrders may include dayIndex for cross-day moves
      const stops = await storage.reorderStops(tripId, stopOrders as { stopId: string; displayOrder: number; cityGroup?: string | null; dayIndex?: number | null }[]);
      res.json(stops);
    } catch (error) {
      console.error("Error reordering stops:", error);
      res.status(500).json({ message: "Failed to reorder stops" });
    }
  });
  
  // Get journey pack for a stop (auto-creates if missing)
  app.get('/api/travel/stops/:stopId/journey-pack', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      let pack = await storage.getJourneyPackByStopId(stopId);
      
      // Auto-create journey pack if it doesn't exist (for legacy stops)
      if (!pack) {
        const stop = await storage.getStopById(stopId);
        if (stop) {
          pack = await storage.createJourneyPack({ stopId });
          console.log(`📦 [Travel] Auto-created journey pack for stop ${stopId}`);
        }
      }
      
      res.json(pack || null);
    } catch (error) {
      console.error("Error fetching journey pack:", error);
      res.status(500).json({ message: "Failed to fetch journey pack" });
    }
  });
  
  // Update journey pack content
  app.patch('/api/travel/journey-packs/:packId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { packId } = req.params;
      const updates = req.body;
      
      const pack = await storage.updateJourneyPack(packId, updates);
      res.json(pack);
    } catch (error) {
      console.error("Error updating journey pack:", error);
      res.status(500).json({ message: "Failed to update journey pack" });
    }
  });
  
  // Unlock journey games (called after playing Guess & Go)
  app.post('/api/travel/journey-packs/:packId/unlock-games', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { packId } = req.params;
      const pack = await storage.unlockJourneyGames(packId);
      
      // Also increment the trip's unlocked packs count
      if (pack) {
        const stop = await storage.getStopById(pack.stopId);
        if (stop) {
          const trip = await storage.getTripById(stop.tripId);
          if (trip) {
            await storage.updateTrip(trip.id, {
              journeyPacksUnlocked: (trip.journeyPacksUnlocked || 2) + 2,
            });
          }
        }
      }
      
      console.log(`🎮 [Travel] Journey games unlocked:`, { packId });
      res.json(pack);
    } catch (error) {
      console.error("Error unlocking journey games:", error);
      res.status(500).json({ message: "Failed to unlock journey games" });
    }
  });
  
  // Get journey pack progress for a stop
  app.get('/api/travel/stops/:stopId/progress/:explorerId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId, explorerId } = req.params;
      const progress = await storage.getJourneyPackProgress(stopId, explorerId);
      res.json(progress || null);
    } catch (error) {
      console.error("Error fetching journey pack progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });
  
  // Save journey pack progress (completed sections)
  app.post('/api/travel/stops/:stopId/progress', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const { tripId, explorerId, completedSections, listenProgress, wonderResponse } = req.body;
      
      const progress = await storage.saveJourneyPackProgress({
        stopId,
        tripId,
        explorerId,
        completedSections: completedSections || [],
        listenProgress: listenProgress || 0,
        wonderResponse,
      });
      
      console.log(`📝 [Travel] Journey pack progress saved:`, { stopId, explorerId, sections: completedSections });
      res.json(progress);
    } catch (error) {
      console.error("Error saving journey pack progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });
  
  // Get all journey pack progress for a trip (for an explorer)
  app.get('/api/travel/trips/:tripId/progress/:explorerId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId, explorerId } = req.params;
      const progressList = await storage.getAllJourneyPackProgressByTrip(tripId, explorerId);
      res.json(progressList);
    } catch (error) {
      console.error("Error fetching trip progress:", error);
      res.status(500).json({ message: "Failed to fetch trip progress" });
    }
  });
  
  // ============================================================================
  // ITINERARY SHARING ROUTES
  // ============================================================================
  
  // Share a trip (create public itinerary)
  app.post('/api/travel/trips/:tripId/share', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user.claims.sub;
      const { title, description, durationDays, partySize, styleTags, bestTimeToVisit } = req.body;
      
      if (!durationDays) {
        return res.status(400).json({ message: "Trip duration is required" });
      }
      
      // Get the trip and its stops
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Get stops for the trip
      const stops = await storage.getStopsByTripId(tripId);
      
      // Get journey packs in bulk
      const stopIds = stops.map(s => s.id);
      const journeyPacks = await storage.getJourneyPacksByStopIds(stopIds);
      const packsByStopId = new Map(journeyPacks.map(p => [p.stopId, p]));
      
      // Create privacy-safe stop snapshots
      const shareStops = stops.map((stop, index) => {
        const journeyPack = packsByStopId.get(stop.id);
        
        return {
          shareId: '', // Will be set by storage method
          originalStopId: stop.id,
          displayOrder: index,
          name: stop.name,
          locationType: stop.stopType || null,
          listenSummary: journeyPack?.audioFactText || journeyPack?.storyContent ? 'Audio story available' : null,
          wonderPrompt: journeyPack?.wonderPrompt || null,
          journeyGameTypes: ['guess', 'thisorthat', 'spotit'], // Default games
          exploreHighlights: journeyPack?.exploreData ? 'Nearby attractions available' : null,
          latitude: null,
          longitude: null,
        };
      });
      
      // Check if already shared - if so, update instead of creating
      const existingShare = await storage.getItineraryShareByTripId(tripId);
      
      if (existingShare) {
        // Verify ownership before allowing update
        if (existingShare.ownerUserId !== userId) {
          return res.status(403).json({ message: "You can only update your own shared trips" });
        }
        
        // Update existing share (preserve views, upvotes, etc.)
        const updatedShare = await storage.updateItineraryShare(existingShare.id, {
          title: title || trip.name || `${trip.destination} Trip`,
          description,
          durationDays,
          partySize: partySize || null,
          styleTags: styleTags || [],
          bestTimeToVisit,
        }, shareStops);
        
        console.log(`🌍 [Travel] Itinerary updated:`, { tripId, slug: existingShare.slug, stopCount: shareStops.length });
        res.json(updatedShare);
        return;
      }
      
      // Generate a unique slug for new share
      const baseSlug = (title || trip.name || trip.destination || 'trip')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50);
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      
      // Create the share
      const share = await storage.createItineraryShare({
        tripId,
        ownerUserId: userId,
        slug,
        title: title || trip.name || `${trip.destination} Trip`,
        destination: trip.destination,
        description,
        heroImageUrl: null, // Could add destination image later
        durationDays,
        partySize: partySize || null,
        styleTags: styleTags || [],
        bestTimeToVisit,
        status: 'published',
        publishedAt: new Date(),
      }, shareStops);
      
      console.log(`🌍 [Travel] Itinerary shared:`, { tripId, slug, stopCount: shareStops.length });
      res.json(share);
    } catch (error) {
      console.error("Error sharing itinerary:", error);
      res.status(500).json({ message: "Failed to share itinerary" });
    }
  });
  
  // Get share status for a trip
  app.get('/api/travel/trips/:tripId/share', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const share = await storage.getItineraryShareByTripId(tripId);
      res.json(share || null);
    } catch (error) {
      console.error("Error fetching share status:", error);
      res.status(500).json({ message: "Failed to fetch share status" });
    }
  });
  
  // Unpublish/delete a share
  app.delete('/api/travel/trips/:tripId/share', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const share = await storage.getItineraryShareByTripId(tripId);
      if (!share) {
        return res.status(404).json({ message: "Share not found" });
      }
      
      await storage.deleteItineraryShare(share.id);
      console.log(`🌍 [Travel] Itinerary unshared:`, { tripId });
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsharing itinerary:", error);
      res.status(500).json({ message: "Failed to unshare itinerary" });
    }
  });
  
  // PUBLIC: Get shared itinerary by slug (no auth required)
  app.get('/api/travel/shares/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const share = await storage.getItineraryShareBySlug(slug);
      
      if (!share) {
        return res.status(404).json({ message: "Itinerary not found" });
      }
      
      // Increment view count
      await storage.incrementShareViews(share.id);
      
      // Sanitize response - only return public fields (exclude ownerUserId, tripId)
      const publicShare = {
        id: share.id,
        slug: share.slug,
        title: share.title,
        destination: share.destination,
        description: share.description,
        heroImageUrl: share.heroImageUrl,
        durationDays: share.durationDays,
        partySize: share.partySize,
        styleTags: share.styleTags,
        bestTimeToVisit: share.bestTimeToVisit,
        totalUpvotes: share.totalUpvotes,
        totalViews: share.totalViews,
        publishedAt: share.publishedAt,
        stops: share.stops.map(stop => ({
          id: stop.id,
          name: stop.name,
          displayOrder: stop.displayOrder,
          locationType: stop.locationType,
          listenSummary: stop.listenSummary,
          wonderPrompt: stop.wonderPrompt,
          journeyGameTypes: stop.journeyGameTypes,
          exploreHighlights: stop.exploreHighlights,
        })),
      };
      
      res.json(publicShare);
    } catch (error) {
      console.error("Error fetching shared itinerary:", error);
      res.status(500).json({ message: "Failed to fetch itinerary" });
    }
  });
  
  // PUBLIC: Browse shared itineraries (no auth required)
  app.get('/api/travel/shares', async (req, res) => {
    try {
      const { destination, limit } = req.query;
      
      let shares;
      if (destination) {
        shares = await storage.getItinerarySharesByDestination(destination as string);
      } else {
        shares = await storage.getPublicItineraryShares(limit ? parseInt(limit as string) : 20);
      }
      
      // Sanitize response - only return public fields
      const publicShares = shares.map(share => ({
        id: share.id,
        slug: share.slug,
        title: share.title,
        destination: share.destination,
        description: share.description,
        heroImageUrl: share.heroImageUrl,
        durationDays: share.durationDays,
        partySize: share.partySize,
        styleTags: share.styleTags,
        bestTimeToVisit: share.bestTimeToVisit,
        totalUpvotes: share.totalUpvotes,
        totalViews: share.totalViews,
        publishedAt: share.publishedAt,
      }));
      
      res.json(publicShares);
    } catch (error) {
      console.error("Error fetching shared itineraries:", error);
      res.status(500).json({ message: "Failed to fetch itineraries" });
    }
  });
  
  // Simple in-memory rate limiter for upvotes (per IP)
  const upvoteRateLimits = new Map<string, number>();
  const UPVOTE_RATE_LIMIT_MS = 2000; // 2 seconds between votes
  
  // PUBLIC: Toggle upvote on a shared itinerary (uses visitor ID for anonymous voting)
  app.post('/api/travel/shares/:shareId/upvote', async (req, res) => {
    try {
      const { shareId } = req.params;
      const { visitorId } = req.body;
      
      // Validate visitor ID format (must be v_ prefix + alphanumeric)
      if (!visitorId || !/^v_[a-z0-9]{10,20}$/.test(visitorId)) {
        return res.status(400).json({ message: "Invalid visitor ID format" });
      }
      
      // Simple rate limiting based on IP
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
      const rateLimitKey = `${clientIp}:${shareId}`;
      const lastVote = upvoteRateLimits.get(rateLimitKey) || 0;
      const now = Date.now();
      
      if (now - lastVote < UPVOTE_RATE_LIMIT_MS) {
        return res.status(429).json({ message: "Please wait before voting again" });
      }
      
      upvoteRateLimits.set(rateLimitKey, now);
      
      // Clean up old entries every 100 requests
      if (upvoteRateLimits.size > 1000) {
        const cutoff = now - 60000; // 1 minute
        Array.from(upvoteRateLimits.entries()).forEach(([key, timestamp]) => {
          if (timestamp < cutoff) {
            upvoteRateLimits.delete(key);
          }
        });
      }
      
      const result = await storage.toggleUpvote(shareId, visitorId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling upvote:", error);
      res.status(500).json({ message: "Failed to toggle upvote" });
    }
  });
  
  // PUBLIC: Check if visitor has upvoted
  app.get('/api/travel/shares/:shareId/upvote/:visitorId', async (req, res) => {
    try {
      const { shareId, visitorId } = req.params;
      const hasUpvoted = await storage.hasUpvoted(shareId, visitorId);
      res.json({ hasUpvoted });
    } catch (error) {
      console.error("Error checking upvote status:", error);
      res.status(500).json({ message: "Failed to check upvote status" });
    }
  });
  
  // Copy shared itinerary as new trip (Inherit Trip)
  app.post('/api/travel/shares/:shareId/copy', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { shareId } = req.params;
      const userId = req.user.claims.sub;
      const { travelers, travelMonth, travelYear } = req.body || {};
      
      // Get the share to check for duplicate city
      const share = await storage.getItineraryShareById(shareId);
      if (!share) {
        return res.status(404).json({ message: "Shared itinerary not found" });
      }
      
      // Parse destination to extract country (format: "City, Country" or just "Country")
      const destination = share.destination || '';
      const parts = destination.split(',').map((s: string) => s.trim());
      const country = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      const city = parts.length > 1 ? parts[0] : null;
      
      // Check for duplicate city trip - community trips are always 'travel' context
      // NOTE: This applies to ALL users (admin, paid, free) - no one can create duplicate city trips
      // Only checks ACTIVE adventures - completed trips are allowed to be revisited
      const duplicateTrip = await storage.findDuplicateCityTrip(userId, country, city, 'travel');
      if (duplicateTrip) {
        return res.status(400).json({ 
          message: `You already have an adventure for ${destination}. Please choose a different city.`,
          code: 'DUPLICATE_CITY',
          existingTrip: {
            id: duplicateTrip.id,
            name: duplicateTrip.name,
            destination: duplicateTrip.destination,
          }
        });
      }
      
      const newTrip = await storage.copyFromSharedItinerary(shareId, userId, { travelers, travelMonth, travelYear });
      console.log(`🌍 [Travel] Copied shared itinerary:`, { shareId, newTripId: newTrip.id, travelers: travelers?.length || 0 });
      
      // Increment lifetime trip counter to prevent deletion bypass
      await storage.incrementLifetimeTripCount(userId, 'travel');
      
      res.json(newTrip);
    } catch (error) {
      console.error("Error copying shared itinerary:", error);
      res.status(500).json({ message: "Failed to copy itinerary" });
    }
  });
  
  // Get user's bookmarked itineraries
  app.get('/api/travel/bookmarks', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const bookmarks = await storage.getUserBookmarks(userId);
      res.json(bookmarks);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });
  
  // Add bookmark
  app.post('/api/travel/bookmarks', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { shareId } = req.body;
      
      if (!shareId) {
        return res.status(400).json({ message: "Share ID required" });
      }
      
      const bookmark = await storage.addBookmark(userId, shareId);
      console.log(`🔖 [Travel] Bookmark added:`, { userId, shareId });
      res.json(bookmark);
    } catch (error) {
      console.error("Error adding bookmark:", error);
      res.status(500).json({ message: "Failed to add bookmark" });
    }
  });
  
  // Remove bookmark
  app.delete('/api/travel/bookmarks/:shareId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { shareId } = req.params;
      
      await storage.removeBookmark(userId, shareId);
      console.log(`🔖 [Travel] Bookmark removed:`, { userId, shareId });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing bookmark:", error);
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  });
  
  // ============================================================================
  // COMMENTS SYSTEM - Community discussions on shared itineraries
  // ============================================================================
  
  // PUBLIC: Get comments for a share
  app.get('/api/travel/shares/:shareId/comments', async (req, res) => {
    try {
      const { shareId } = req.params;
      const comments = await storage.getShareComments(shareId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  
  // Add comment (requires auth)
  app.post('/api/travel/shares/:shareId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const { shareId } = req.params;
      const { content } = req.body;
      const userId = req.user.claims.sub;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content required" });
      }
      
      if (content.length > 1000) {
        return res.status(400).json({ message: "Comment too long (max 1000 characters)" });
      }
      
      // Get author name from user
      const user = await storage.getUser(userId);
      const authorName = user?.firstName 
        ? `${user.firstName}${user.lastName ? ' ' + user.lastName.charAt(0) + '.' : ''}`
        : 'GeoQuest Explorer';
      
      const comment = await storage.addComment(shareId, userId, authorName, content.trim());
      console.log(`💬 [Travel] Comment added:`, { shareId, userId, commentId: comment.id });
      res.json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });
  
  // Update comment (owner only)
  app.patch('/api/travel/comments/:commentId', isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user.claims.sub;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content required" });
      }
      
      const updated = await storage.updateComment(commentId, userId, content.trim());
      if (!updated) {
        return res.status(403).json({ message: "Cannot edit this comment" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });
  
  // Delete comment (owner only)
  app.delete('/api/travel/comments/:commentId', isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.claims.sub;
      
      const success = await storage.deleteComment(commentId, userId);
      if (!success) {
        return res.status(403).json({ message: "Cannot delete this comment" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });
  
  // Send trip itinerary via email directly (no public sharing required)
  const emailShareRateLimits = new Map<string, number[]>();
  const EMAIL_RATE_LIMIT_PER_HOUR = 10;
  
  app.post('/api/travel/trips/:tripId/share-email', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { recipientEmail, personalMessage } = req.body;
      const userId = req.user.claims.sub;
      
      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email required" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      
      // Rate limiting: max 10 emails per hour per user
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const userEmails = emailShareRateLimits.get(userId) || [];
      const recentEmails = userEmails.filter(t => t > oneHourAgo);
      
      if (recentEmails.length >= EMAIL_RATE_LIMIT_PER_HOUR) {
        return res.status(429).json({ message: "Email limit reached. Please try again later." });
      }
      
      // Verify trip exists and belongs to the user
      const trip = await storage.getTripById(tripId);
      if (!trip || trip.userId !== userId) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Get trip stops
      const stops = await storage.getStopsByTripId(tripId);
      
      const user = await storage.getUser(userId);
      const senderName = user?.firstName || 'A GeoQuest user';
      
      const { sendTripItineraryEmail } = await import('../email');
      const success = await sendTripItineraryEmail(
        recipientEmail,
        senderName,
        trip.name || trip.destination,
        trip.destination,
        stops.map((s: any) => ({ name: s.name, description: s.description })),
        personalMessage
      );
      
      if (success) {
        // Track email for rate limiting
        recentEmails.push(now);
        emailShareRateLimits.set(userId, recentEmails);
        
        console.log(`📧 [Travel] Trip email sent:`, { to: recipientEmail, tripId, tripName: trip.name });
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending trip email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });
  
  // Create a moment
  app.post('/api/travel/moments', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId, stopId, photoUrl, photoUrls, kidPromptResponse, parentPromptResponse, geoFact, createdByExplorerId, isSharedCommunity } = req.body;
      
      // Check if this trip allows media capture (At-Home adventures do NOT allow photos)
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      if (trip.allowMediaCapture === false) {
        return res.status(403).json({ 
          message: "At-Home adventures do not support photo capture. Save moments on your real travel adventures!",
          code: "HOME_ADVENTURE_NO_MEDIA"
        });
      }
      
      // Debug: Log incoming photo data
      console.log(`📸 [Travel] Moment create request:`, { 
        tripId, 
        stopId, 
        hasPhotoUrl: !!photoUrl, 
        photoUrlsReceived: photoUrls,
        photoUrlsLength: photoUrls?.length,
        photoUrlType: typeof photoUrl,
        photoUrlsType: typeof photoUrls 
      });
      
      // Ensure photoUrls is properly set even if only photoUrl is provided
      const effectivePhotoUrls = photoUrls || (photoUrl ? [photoUrl] : []);
      
      const moment = await storage.createMoment({
        tripId,
        stopId,
        photoUrl,
        photoUrls: effectivePhotoUrls,
        kidPromptResponse,
        parentPromptResponse,
        geoFact,
        createdByExplorerId,
        isSharedCommunity: isSharedCommunity === true,
      });
      
      console.log(`📸 [Travel] Moment saved:`, { momentId: moment.id, tripId, stopId, photoCount: effectivePhotoUrls.length, savedPhotoUrls: moment.photoUrls });
      res.json(moment);
    } catch (error) {
      console.error("Error creating moment:", error);
      res.status(500).json({ message: "Failed to save moment" });
    }
  });
  
  // ============================================================================
  // TRIP WALLET ROUTES
  // ============================================================================

  app.get('/api/travel/trips/:tripId/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { tripWalletItems, travelTrips } = await import('@workspace/db');
      const { eq } = await import("drizzle-orm");
      const [trip] = await db.select({ id: travelTrips.id, userId: travelTrips.userId }).from(travelTrips).where(eq(travelTrips.id, tripId));
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.userId !== userId) return res.status(403).json({ message: "Access denied" });
      const items = await db.select().from(tripWalletItems).where(eq(tripWalletItems.tripId, tripId));
      res.json(items);
    } catch (error) {
      console.error("Error fetching wallet items:", error);
      res.status(500).json({ message: "Failed to fetch wallet items" });
    }
  });

  app.post('/api/travel/trips/:tripId/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { tripWalletItems, travelTrips, insertTripWalletItemSchema } = await import('@workspace/db');
      const { eq } = await import("drizzle-orm");
      const [trip] = await db.select({ id: travelTrips.id, userId: travelTrips.userId }).from(travelTrips).where(eq(travelTrips.id, tripId));
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.userId !== userId) return res.status(403).json({ message: "Access denied" });
      const parsed = insertTripWalletItemSchema.safeParse({ ...req.body, tripId });
      if (!parsed.success) return res.status(400).json({ message: "Invalid wallet item data", errors: parsed.error.flatten() });
      const { label, type, stopId, confirmationNumber, fileUrl, notes, entryTime, walletSection } = parsed.data;
      const fileUrls = req.body.fileUrls as string[] | undefined;
      const [item] = await db.insert(tripWalletItems).values({
        tripId,
        stopId: stopId || null,
        label,
        type,
        walletSection: walletSection || "pass",
        confirmationNumber: confirmationNumber || null,
        fileUrl: fileUrl || null,
        fileUrls: Array.isArray(fileUrls) && fileUrls.length > 0 ? fileUrls : null,
        notes: notes || null,
        entryTime: entryTime ? new Date(entryTime) : null,
      }).returning();
      res.json(item);
    } catch (error) {
      console.error("Error creating wallet item:", error);
      res.status(500).json({ message: "Failed to create wallet item" });
    }
  });

  app.patch('/api/travel/wallet/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { tripWalletItems, travelTrips } = await import('@workspace/db');
      const { eq } = await import("drizzle-orm");
      const [item] = await db.select({ id: tripWalletItems.id, tripId: tripWalletItems.tripId }).from(tripWalletItems).where(eq(tripWalletItems.id, itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });
      const [trip] = await db.select({ userId: travelTrips.userId }).from(travelTrips).where(eq(travelTrips.id, item.tripId));
      if (!trip || trip.userId !== userId) return res.status(403).json({ message: "Access denied" });
      const { label, type, walletSection, confirmationNumber, fileUrl, fileUrls: fileUrlsBody, notes, stopId } = req.body;
      const updates: Record<string, any> = {};
      if (label !== undefined) updates.label = label;
      if (type !== undefined) updates.type = type;
      if (walletSection !== undefined) updates.walletSection = walletSection;
      if (confirmationNumber !== undefined) updates.confirmationNumber = confirmationNumber || null;
      if (fileUrl !== undefined) updates.fileUrl = fileUrl || null;
      if (fileUrlsBody !== undefined) updates.fileUrls = Array.isArray(fileUrlsBody) && fileUrlsBody.length > 0 ? fileUrlsBody : null;
      if (notes !== undefined) updates.notes = notes || null;
      if (stopId !== undefined) updates.stopId = stopId || null;
      const [updated] = await db.update(tripWalletItems).set(updates).where(eq(tripWalletItems.id, itemId)).returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating wallet item:", error);
      res.status(500).json({ message: "Failed to update wallet item" });
    }
  });

  app.delete('/api/travel/wallet/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { tripWalletItems, travelTrips } = await import('@workspace/db');
      const { eq } = await import("drizzle-orm");
      const [item] = await db.select({ id: tripWalletItems.id, tripId: tripWalletItems.tripId }).from(tripWalletItems).where(eq(tripWalletItems.id, itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });
      const [trip] = await db.select({ userId: travelTrips.userId }).from(travelTrips).where(eq(travelTrips.id, item.tripId));
      if (!trip || trip.userId !== userId) return res.status(403).json({ message: "Access denied" });
      await db.delete(tripWalletItems).where(eq(tripWalletItems.id, itemId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting wallet item:", error);
      res.status(500).json({ message: "Failed to delete wallet item" });
    }
  });

  // ── Trip Anchors ─────────────────────────────────────────────────────────────

  app.get('/api/travel/trips/:tripId/anchors', isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const anchors = await storage.getAnchorsByTripId(tripId);
      res.json(anchors);
    } catch (error) {
      console.error("Error fetching anchors:", error);
      res.status(500).json({ message: "Failed to fetch anchors" });
    }
  });

  app.post('/api/travel/trips/:tripId/anchors', isAuthenticated, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { name, anchorType, day, time, durationMinutes, notes, flexibility } = req.body;
      if (!name || !anchorType) return res.status(400).json({ message: "name and anchorType are required" });
      const anchor = await storage.createAnchor({
        tripId,
        name: name.trim(),
        anchorType,
        day: day || 1,
        time: time || null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
        notes: notes || null,
        flexibility: flexibility === "soft" ? "soft" : "hard",
      });
      res.json(anchor);
    } catch (error) {
      console.error("Error creating anchor:", error);
      res.status(500).json({ message: "Failed to create anchor" });
    }
  });

  app.delete('/api/travel/anchors/:anchorId', isAuthenticated, async (req: any, res) => {
    try {
      const { anchorId } = req.params;
      await storage.deleteAnchor(anchorId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting anchor:", error);
      res.status(500).json({ message: "Failed to delete anchor" });
    }
  });

  app.patch('/api/travel/anchors/:anchorId', isAuthenticated, async (req: any, res) => {
    try {
      const { anchorId } = req.params;
      const { day, time, durationMinutes, notes, flexibility } = req.body;
      const updates: Record<string, unknown> = {};
      if (day !== undefined) updates.day = day;
      if (time !== undefined) updates.time = time;
      if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
      if (notes !== undefined) updates.notes = notes;
      if (flexibility !== undefined) updates.flexibility = flexibility === "soft" ? "soft" : "hard";
      const anchor = await storage.updateAnchor(anchorId, updates as any);
      res.json(anchor);
    } catch (error) {
      console.error("Error updating anchor:", error);
      res.status(500).json({ message: "Failed to update anchor" });
    }
  });

  // Get moments for a trip
  app.get('/api/travel/trips/:tripId/moments', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const moments = await storage.getMomentsByTripId(tripId);
      res.json(moments);
    } catch (error) {
      console.error("Error fetching moments:", error);
      res.status(500).json({ message: "Failed to fetch moments" });
    }
  });
  
  // Update a moment
  app.patch('/api/travel/moments/:momentId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { momentId } = req.params;
      const updates = req.body;
      
      const moment = await storage.updateMoment(momentId, updates);
      res.json(moment);
    } catch (error) {
      console.error("Error updating moment:", error);
      res.status(500).json({ message: "Failed to update moment" });
    }
  });
  
  // Delete a moment
  app.delete('/api/travel/moments/:momentId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { momentId } = req.params;
      await storage.deleteMoment(momentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting moment:", error);
      res.status(500).json({ message: "Failed to delete moment" });
    }
  });
  
  // Generate location facts for a stop
  app.post('/api/travel/stops/:stopId/generate-facts', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const stop = await storage.getStopById(stopId);
      
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      const trip = await storage.getTripById(stop.tripId);
      const destination = trip?.destination || "this location";
      
      const { generateLocationFacts } = await import("../travelContent");
      const facts = await generateLocationFacts(
        stop.name,
        stop.stopType || "attraction",
        destination
      );
      
      // Save transcript to journey pack for offline caching
      try {
        const journeyPack = await storage.getJourneyPackByStopId(stopId);
        if (journeyPack && facts.transcript) {
          await storage.updateJourneyPack(journeyPack.id, { audioFactText: facts.transcript });
        }
      } catch (cacheError) {
        console.error("Failed to cache facts to journey pack:", cacheError);
      }
      
      res.json(facts);
    } catch (error) {
      console.error("Error generating location facts:", error);
      res.status(500).json({ message: "Failed to generate facts" });
    }
  });

  // Generate Story Pack for a stop — cache-first: returns cached data if available, otherwise generates fresh
  app.post('/api/travel/stops/:stopId/generate-story', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const userId = req.user.claims.sub;
      const stop = await storage.getStopById(stopId);
      
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }

      // Verify stop belongs to a trip owned by the requesting user
      const trip = await storage.getTripById(stop.tripId);
      if (!trip || trip.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const destination = trip.destination || "this location";

      // Cache-first: check if journey pack already has Story Pack data (by stop ID)
      let existingPack = await storage.getJourneyPackByStopId(stopId);

      // Cross-trip cache: if this stop ID has no pack yet (or has partial data), check by stop name
      // so the same landmark (e.g. Golden Gate Bridge) reuses its story across different trips/users.
      // Also check by name if storyContent is missing — a corrupted/safety-filtered cache entry
      // should not block us from finding a valid named pack.
      if (!existingPack || !existingPack.quickHits || !(existingPack.quickHits as string[]).length || !existingPack.storyContent) {
        const packByName = await storage.getJourneyPackByStopName(stop.name);
        const hasValidNameCache = packByName &&
          Array.isArray(packByName.quickHits) &&
          (packByName.quickHits as string[]).length > 0 &&
          packByName.storyContent &&
          packByName.whoMadeThis;
        if (hasValidNameCache && packByName) {
          console.log(`📦 [story-pack] Cache HIT by name for "${stop.name}" — reusing across trips`);
          // Clone the cached content into this stop's journey pack so future lookups by ID hit
          const updateData = {
            storyTitle: packByName.storyTitle,
            storyContent: packByName.storyContent,
            storyChapters: packByName.storyChapters,
            storyDuration: packByName.storyDuration,
            quickHits: packByName.quickHits,
            whoMadeThis: packByName.whoMadeThis,
            dontMissThis: packByName.dontMissThis,
            curiousQuestion: packByName.curiousQuestion,
          };
          if (existingPack) {
            await storage.updateJourneyPack(existingPack.id, updateData).catch(() => {});
          } else {
            await storage.createJourneyPack({ stopId, ...updateData }).catch(() => {});
          }
          return res.json({
            title: packByName.storyTitle || `Story Pack: ${stop.name}`,
            mainStory: packByName.storyContent || "",
            quickHits: packByName.quickHits as string[],
            whoMadeThis: packByName.whoMadeThis || "",
            dontMissThis: packByName.dontMissThis || null,
            curiousQuestion: packByName.curiousQuestion || "",
            duration: packByName.storyDuration || "~5 minutes",
          });
        }
      }

      const existingQuickHits = existingPack?.quickHits;
      const hasStoredPack = existingPack &&
        Array.isArray(existingQuickHits) &&
        (existingQuickHits as string[]).length > 0 &&
        existingPack.storyContent &&
        existingPack.whoMadeThis;

      if (hasStoredPack && existingPack) {
        return res.json({
          title: existingPack.storyTitle || `Story Pack: ${stop.name}`,
          mainStory: existingPack.storyContent || "",
          quickHits: existingPack.quickHits as string[],
          whoMadeThis: existingPack.whoMadeThis || "",
          dontMissThis: existingPack.dontMissThis || null,
          curiousQuestion: existingPack.curiousQuestion || "",
          duration: existingPack.storyDuration || "~5 minutes",
        });
      }

      // Generate fresh Story Pack using two-step generation
      const { generateStoryPack } = await import("../travelContent");
      const pack = await generateStoryPack(stop.name, stop.stopType || "attraction", destination);

      // Save to journey pack for future cache hits
      try {
        const updateData: Parameters<typeof storage.updateJourneyPack>[1] = {
          storyTitle: pack.title,
          storyContent: pack.mainStory,
          storyChapters: [
            { title: "Main Story", content: pack.mainStory },
            { title: "Quick Hits", content: pack.quickHits.join("\n\n") },
            { title: "Who Made This & Why", content: pack.whoMadeThis },
          ],
          storyDuration: pack.duration,
          quickHits: pack.quickHits,
          whoMadeThis: pack.whoMadeThis,
          dontMissThis: pack.dontMissThis,
          curiousQuestion: pack.curiousQuestion,
          audioFactText: pack.mainStory,
        };
        if (existingPack) {
          await storage.updateJourneyPack(existingPack.id, updateData);
        } else {
          await storage.createJourneyPack({ stopId, ...updateData });
        }
      } catch (cacheError) {
        console.error("Failed to cache Story Pack to journey pack:", cacheError);
      }

      res.json(pack);
    } catch (error) {
      console.error("Error generating Story Pack:", error);
      res.status(500).json({ message: "Failed to generate Story Pack" });
    }
  });

  // Pre-generate Story Packs for all of today's unvisited stops (fire-and-forget background job)
  app.post('/api/travel/trips/:tripId/pregenerate-story-packs', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user.claims.sub;
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      // Verify trip belongs to the requesting user
      if (trip.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const allStops = await storage.getStopsByTripId(tripId);
      const destination = trip.destination || "this location";

      // Find today's unvisited stops — the next set of stops to be visited
      // We approximate "today" using displayOrder: take the first STOPS_PER_DAY (6) unvisited stops
      // This matches how the client groups stops per day (4-6 depending on pace)
      const STOPS_PER_DAY_LIMIT = 6;
      const sortedStops = allStops.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const todayStops = sortedStops.filter(s => !s.isVisited).slice(0, STOPS_PER_DAY_LIMIT);

      // Respond immediately — fire background generation
      res.json({ message: "Story Pack pre-generation started", stopCount: todayStops.length });

      // Background: generate Story Packs for each unvisited stop
      (async () => {
        const { generateStoryPack } = await import("../travelContent");
        for (const stop of todayStops) {
          try {
            const journeyPack = await storage.getJourneyPackByStopId(stop.id);
            // Skip if already has a Story Pack (quickHits is the new field)
            const existingQuickHits = journeyPack?.quickHits;
            if (journeyPack && Array.isArray(existingQuickHits) && (existingQuickHits as string[]).length > 0) {
              continue;
            }
            const pack = await generateStoryPack(stop.name, stop.stopType || "attraction", destination);
            const updateData: Parameters<typeof storage.updateJourneyPack>[1] = {
              storyTitle: pack.title,
              storyContent: pack.mainStory,
              storyChapters: [
                { title: "Main Story", content: pack.mainStory },
                { title: "Quick Hits", content: pack.quickHits.join("\n\n") },
                { title: "Who Made This & Why", content: pack.whoMadeThis },
              ],
              storyDuration: pack.duration,
              quickHits: pack.quickHits,
              whoMadeThis: pack.whoMadeThis,
              dontMissThis: pack.dontMissThis,
              curiousQuestion: pack.curiousQuestion,
            };
            if (journeyPack) {
              await storage.updateJourneyPack(journeyPack.id, updateData);
            } else {
              await storage.createJourneyPack({ stopId: stop.id, ...updateData });
            }
          } catch (err) {
            console.error(`[pregenerate-story-packs] Failed for stop ${stop.id}:`, err);
          }
        }
      })().catch(err => console.error("[pregenerate-story-packs] Background generation error:", err));

    } catch (error) {
      console.error("Error starting story pack pre-generation:", error);
      res.status(500).json({ message: "Failed to start pre-generation" });
    }
  });

  // Generate parent tip for a stop
  app.post('/api/travel/stops/:stopId/generate-tip', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const stop = await storage.getStopById(stopId);
      
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      const trip = await storage.getTripById(stop.tripId);
      const destination = trip?.destination || "this location";
      
      const { generateParentTip } = await import("../travelContent");
      const tip = await generateParentTip(
        stop.name,
        stop.stopType || "attraction",
        destination
      );
      
      // Save tip to journey pack for offline caching
      try {
        const journeyPack = await storage.getJourneyPackByStopId(stopId);
        if (journeyPack && tip.tip) {
          await storage.updateJourneyPack(journeyPack.id, { parentTip: tip.tip });
        }
      } catch (cacheError) {
        console.error("Failed to cache tip to journey pack:", cacheError);
      }
      
      res.json(tip);
    } catch (error) {
      console.error("Error generating parent tip:", error);
      res.status(500).json({ message: "Failed to generate tip" });
    }
  });

  // Generate audio narration for a story
  async function getTtsCacheKey(text: string, voice: string): Promise<string> {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(`${voice}:${text}`).digest('hex').slice(0, 40);
  }

  async function getCachedAudio(cacheKey: string): Promise<Buffer | null> {
    try {
      const cached = await db.select().from(ttsAudioCache).where(eq(ttsAudioCache.cacheKey, cacheKey)).limit(1);
      if (cached.length > 0) {
        return Buffer.from(cached[0].audioData, 'base64');
      }
    } catch (e) {
      console.warn('[TTS Cache] Read error:', e);
    }
    return null;
  }

  async function setCachedAudio(cacheKey: string, audioBuffer: Buffer, voice: string, textLength: number): Promise<void> {
    try {
      await db.insert(ttsAudioCache).values({
        cacheKey,
        audioData: audioBuffer.toString('base64'),
        voice,
        textLength,
        audioSize: audioBuffer.length,
      }).onConflictDoNothing();
      console.log(`[TTS Cache] Stored: key=${cacheKey.slice(0, 12)}..., size=${(audioBuffer.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.warn('[TTS Cache] Write error:', e);
    }
  }

  app.post('/api/travel/stops/:stopId/generate-audio', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const { text, voice } = req.body;
      const stop = await storage.getStopById(stopId);
      
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      const validVoices = ['eva', 'avi', 'ari'];
      const normalizeVoice2 = (v: string) => v === 'ari' ? 'avi' : v;
      let narratorVoice = validVoices.includes(voice) ? normalizeVoice2(voice) : null;
      if (!narratorVoice) {
        const userId = req.user?.claims?.sub || req.user?.id;
        if (userId) {
          const user = await storage.getUser(userId);
          const userVoice = (user as any)?.narratorVoice;
          narratorVoice = ['eva', 'avi'].includes(userVoice) ? userVoice : 'eva';
        } else {
          narratorVoice = 'eva';
        }
      }
      
      let storyText = text;
      if (!storyText) {
        const journeyPack = await storage.getJourneyPackByStopId(stopId);
        storyText = journeyPack?.storyContent || journeyPack?.audioFactText;
      }
      
      if (!storyText) {
        return res.status(400).json({ message: "No story content available to narrate. Generate a story first." });
      }

      const cacheKey = await getTtsCacheKey(storyText, narratorVoice || 'eva');
      const cachedAudio = await getCachedAudio(cacheKey);
      if (cachedAudio) {
        console.log(`🎙️ [TTS Cache HIT] Serving cached audio for stop: ${stop.name}, size: ${cachedAudio.length} bytes`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', cachedAudio.length);
        return res.send(cachedAudio);
      }
      
      console.log("🎙️ [TTS Cache MISS] Generating audio for stop:", stop.name, "voice:", narratorVoice);
      
      const { generateStoryAudio } = await import("../travelContent");
      const audioBuffer = await generateStoryAudio(storyText, narratorVoice || 'eva');
      
      if (!audioBuffer) {
        return res.status(500).json({ message: "Failed to generate audio" });
      }
      
      await setCachedAudio(cacheKey, audioBuffer, narratorVoice || 'eva', storyText.length);
      console.log("✅ Audio generated and cached, size:", audioBuffer.length, "bytes");
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating story audio:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });
  
  // General TTS endpoint for Experience City and other features
  app.post('/api/tts/generate', async (req: any, res) => {
    try {
      const { text, voice } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const validVoices = ['eva', 'avi', 'ari'];
      const normalizeVoice = (v: string) => v === 'ari' ? 'avi' : v;
      let narratorVoice = validVoices.includes(voice) ? normalizeVoice(voice) : null;
      if (!narratorVoice) {
        const userId = req.user?.claims?.sub || req.user?.id;
        if (userId) {
          const user = await storage.getUser(userId);
          const userVoice = (user as any)?.narratorVoice;
          narratorVoice = ['eva', 'avi'].includes(userVoice) ? userVoice : 'eva';
        } else {
          narratorVoice = 'eva';
        }
      }

      const cacheKey = await getTtsCacheKey(text, narratorVoice || 'eva');
      const cachedAudio = await getCachedAudio(cacheKey);
      if (cachedAudio) {
        console.log(`🎙️ [TTS Cache HIT] Serving cached audio, size: ${cachedAudio.length} bytes`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', cachedAudio.length);
        return res.send(cachedAudio);
      }
      
      console.log("🎙️ [TTS Cache MISS] Generating TTS audio, voice:", narratorVoice);
      
      const { generateStoryAudio } = await import("../travelContent");
      const audioBuffer = await generateStoryAudio(text, narratorVoice || 'eva');
      
      if (!audioBuffer) {
        return res.status(500).json({ message: "Failed to generate audio" });
      }

      await setCachedAudio(cacheKey, audioBuffer, narratorVoice || 'eva', text.length);
      console.log("✅ TTS audio generated and cached, size:", audioBuffer.length, "bytes");
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating TTS audio:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });

  // Public demo TTS endpoint — no auth required, limited to short texts for sample adventures
  const demoTtsRateLimit = new Map<string, number>();
  app.post('/api/demo/tts/generate', async (req: any, res) => {
    try {
      const { text, voice } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      if (text.length > 2000) {
        return res.status(400).json({ message: "Text too long for demo" });
      }

      // Simple IP-based rate limiting: max 20 requests per 10 minutes
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      const windowMs = 10 * 60 * 1000;
      const key = `${ip}`;
      const lastReset = demoTtsRateLimit.get(`${key}-reset`) || 0;
      if (now - lastReset > windowMs) {
        demoTtsRateLimit.set(`${key}-count`, 0);
        demoTtsRateLimit.set(`${key}-reset`, now);
      }
      const count = (demoTtsRateLimit.get(`${key}-count`) || 0) + 1;
      demoTtsRateLimit.set(`${key}-count`, count);
      if (count > 20) {
        return res.status(429).json({ message: "Too many requests. Please try again later." });
      }

      const validVoices = ['eva', 'avi', 'ari'];
      const narratorVoice = validVoices.includes(voice) ? (voice === 'ari' ? 'avi' : voice) : 'eva';

      const cacheKey = await getTtsCacheKey(text, narratorVoice);
      const cachedAudio = await getCachedAudio(cacheKey);
      if (cachedAudio) {
        console.log(`🎙️ [TTS Cache HIT] Serving cached demo audio, size: ${cachedAudio.length} bytes`);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', cachedAudio.length);
        return res.send(cachedAudio);
      }

      const { generateStoryAudio } = await import("../travelContent");
      const audioBuffer = await generateStoryAudio(text, narratorVoice);

      if (!audioBuffer) {
        return res.status(500).json({ message: "Failed to generate audio" });
      }

      await setCachedAudio(cacheKey, audioBuffer, narratorVoice, text.length);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating demo TTS audio:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });

  // Get pending "Remember This" cards for World Mode
  app.get('/api/travel/remember-this', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cards = await storage.getPendingRememberThisCards(userId);
      res.json(cards);
    } catch (error) {
      console.error("Error fetching remember this cards:", error);
      res.status(500).json({ message: "Failed to fetch remember this cards" });
    }
  });
  
  // Answer a "Remember This" card
  app.post('/api/travel/remember-this/:cardId/answer', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { cardId } = req.params;
      const { explorerId, quality } = req.body;
      
      const card = await storage.answerRememberThisCard(cardId, explorerId, quality);
      
      // Update memory stars based on answer quality
      if (card && quality === 'strong') {
        const trip = await storage.getTripById(card.tripId);
        if (trip) {
          await storage.updateMemoryStars(card.tripId, null, Math.min((trip.totalMemoryStars || 0) + 1, 3));
        }
      }
      
      res.json(card);
    } catch (error) {
      console.error("Error answering remember this card:", error);
      res.status(500).json({ message: "Failed to answer" });
    }
  });

  // ============================================================================
  // FAMILY LORE - Trip Stories
  // ============================================================================

  // Complete a trip and generate its story
  app.post('/api/travel/trips/:tripId/complete', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      
      // First check if this trip allows completion
      const existingTrip = await storage.getTripById(tripId);
      if (!existingTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // At-Home adventures cannot be completed - they are preview only
      if (existingTrip.allowCompletion === false) {
        return res.status(403).json({ 
          message: "At-Home adventures cannot be completed. They are preview experiences to build curiosity!",
          code: "HOME_ADVENTURE_NO_COMPLETION"
        });
      }
      
      const trip = await storage.completeTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Create custom stamp for trips outside the 42 predefined cities
      try {
        const travelers = (trip.travelers as Array<{ explorerId: string; name: string }>) || [];
        if (travelers.length > 0) {
          const normalizedLocation = normalizeLocation(
            trip.name,
            trip.city,
            trip.country,
            trip.destination
          );
          
          // Use predefined city names to check for overlap
          if (shouldCreateCustomStamp(normalizedLocation, PREDEFINED_CITY_NAMES)) {
            // Add custom stamp to each traveler explorer
            for (const traveler of travelers) {
              const explorer = await storage.getPlayerById(traveler.explorerId);
              if (explorer) {
                const existingStamps = (explorer.customStamps as any[]) || [];
                
                // Check if stamp already exists for this location
                const stampExists = existingStamps.some(s => s.stampId === normalizedLocation.stampId);
                
                if (!stampExists) {
                  const newStamp = {
                    stampId: normalizedLocation.stampId,
                    stampName: normalizedLocation.stampName,
                    displayName: normalizedLocation.displayName,
                    city: normalizedLocation.city,
                    state: normalizedLocation.state,
                    country: normalizedLocation.country,
                    isUS: normalizedLocation.isUS,
                    tripId: trip.id,
                    tripName: trip.name,
                    visitedAt: new Date().toISOString(),
                    travelMonth: trip.travelMonth ?? undefined,
                    travelYear: trip.travelYear ?? undefined,
                  };
                  
                  await storage.updatePlayerStats(traveler.explorerId, {
                    customStamps: [...existingStamps, newStamp],
                  });
                  
                  console.log(`[CustomStamp] Created stamp "${normalizedLocation.stampName}" for explorer ${traveler.name}`);
                }
              }
            }
          }
        }
      } catch (stampError) {
        console.error("Error creating custom stamp:", stampError);
        // Don't fail the trip completion if stamp creation fails
      }
      
      const { generateTripStory } = await import("../storyGenerator");
      const story = await generateTripStory(tripId);
      
      // Mark story as saved when generated during completion
      if (story) {
        await storage.updateTrip(tripId, { storySaved: true });
        trip.storySaved = true;
      }

      // Send trip-complete email (fire-and-forget)
      try {
        const [completedUser, tripStops, tripMoments] = await Promise.all([
          storage.getUser(req.user.claims.sub),
          storage.getStopsByTripId(tripId),
          storage.getMomentsByTripId(tripId),
        ]);
        if (completedUser?.email && completedUser.name) {
          const visitedCount = tripStops.filter(s => s.isVisited).length;
          const xpEstimate = visitedCount * 25;
          const storyUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://geoquest.games'}/adventure/${tripId}/parent-plan`;
          sendTripCompleteEmail(
            completedUser.name.split(' ')[0] || completedUser.name,
            completedUser.email,
            trip.name,
            visitedCount,
            xpEstimate,
            tripMoments.length,
            storyUrl
          ).catch(err => console.error("[Email] Trip complete email failed:", err));
        }
      } catch (emailErr) {
        console.error("[Email] Error gathering trip-complete email data:", emailErr);
      }

      res.json({ trip, story });
    } catch (error) {
      console.error("Error completing trip:", error);
      res.status(500).json({ message: "Failed to complete trip" });
    }
  });

  // Day-complete notification email — called by EndDayScreen on mount
  app.post('/api/travel/trips/:tripId/notify-day-complete', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const userId = req.user.claims.sub;
      const { stopsExplored = 0, xpEarned = 0, momentsCount = 0, nextDayPreview = 'Coming up tomorrow' } = req.body;

      const [dayUser, dayTrip] = await Promise.all([
        storage.getUser(userId),
        storage.getTripById(tripId),
      ]);

      if (!dayUser?.email || !dayUser.name || !dayTrip) {
        return res.json({ sent: false });
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://geoquest.games';
      const tripUrl = `${baseUrl}/adventure/${tripId}/parent-plan`;

      sendDayCompleteEmail(
        dayUser.name.split(' ')[0] || dayUser.name,
        dayUser.email,
        stopsExplored,
        xpEarned,
        momentsCount,
        nextDayPreview,
        tripUrl
      ).catch(err => console.error("[Email] Day complete email failed:", err));

      res.json({ sent: true });
    } catch (error) {
      console.error("Error sending day-complete email:", error);
      res.status(500).json({ message: "Failed" });
    }
  });

  // Day memory generation — called by EndDayScreen TodayMomentsSection on mount
  app.post('/api/travel/trips/:tripId/day-memory', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { dayIndex, stopsVisited = [], parentNote = null, photoUrl = null, noteOnly = false } = req.body;

      if (typeof dayIndex !== 'number') {
        return res.status(400).json({ message: "dayIndex is required" });
      }

      // noteOnly mode: just persist the parent note without re-generating lines
      if (noteOnly) {
        const existing = await db.select().from(tripDayMemories)
          .where(and(eq(tripDayMemories.tripId, tripId), eq(tripDayMemories.dayIndex, dayIndex)))
          .limit(1);
        if (existing.length > 0) {
          await db.update(tripDayMemories)
            .set({ parentNote: parentNote ?? null })
            .where(and(eq(tripDayMemories.tripId, tripId), eq(tripDayMemories.dayIndex, dayIndex)));
          return res.json({ lines: existing[0].lines });
        }
        // No existing row — fall through to full generation below
      }

      const stopNames: string[] = stopsVisited.map((s: any) => s.name).filter(Boolean);

      let lines: string[] = [];

      // Attempt AI generation
      try {
        const openai = getOpenAI();
        const stopList = stopNames.length > 0 ? stopNames.join(', ') : 'various places';
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are capturing a parent's raw memory of a family travel day. Write exactly 3 short, imperfect, human one-liners (10–15 words each) about how the day felt — tied to these specific places. Rough and real, not polished. Return as a JSON array of 3 strings.",
            },
            {
              role: "user",
              content: `Today we visited: ${stopList}. Day ${dayIndex + 1} of the trip.`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 200,
        });
        const raw = JSON.parse(response.choices[0].message.content || "{}");
        const parsed = Array.isArray(raw) ? raw : (Array.isArray(raw.lines) ? raw.lines : Object.values(raw).find(v => Array.isArray(v)));
        if (Array.isArray(parsed) && parsed.length >= 3) {
          lines = parsed.slice(0, 3).map(String);
        }
      } catch (aiErr) {
        console.error("[day-memory] AI generation failed, using fallback:", aiErr);
      }

      // Fallback if AI failed or returned bad data
      if (lines.length < 3) {
        const fallbackStop = stopNames[0] ?? "the day";
        const fallbackStop2 = stopNames[1] ?? stopNames[0] ?? "everything";
        const fallbackStop3 = stopNames[2] ?? stopNames[0] ?? "the trip";
        lines = [
          `That moment at ${fallbackStop} when everything just clicked for the kids.`,
          `${fallbackStop2} was louder and messier than planned — in the best way.`,
          `Still thinking about ${fallbackStop3} and how their faces lit up.`,
        ];
      }

      // Upsert on (tripId, dayIndex)
      await db.insert(tripDayMemories).values({
        tripId,
        dayIndex,
        lines,
        parentNote: parentNote ?? null,
        photoUrl: photoUrl ?? null,
      }).onConflictDoUpdate({
        target: [tripDayMemories.tripId, tripDayMemories.dayIndex],
        set: {
          lines,
          parentNote: parentNote ?? null,
          photoUrl: photoUrl ?? null,
        },
      });

      res.json({ lines });
    } catch (error) {
      console.error("[day-memory] Error:", error);
      res.status(500).json({ message: "Failed to generate day memory" });
    }
  });

  // Skip-day: mark all unvisited stops for a specific day as isSkipped=true (NOT isVisited).
  // This preserves the distinction between "completed" and "skipped" stops for XP/story/recap systems.
  // Called once per missed day when the user taps "Continue from Day N" on the MissedDayCard.
  app.post('/api/travel/trips/:tripId/skip-day', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { dayIndex } = req.body;

      if (typeof dayIndex !== 'number' || dayIndex < 0) {
        return res.status(400).json({ message: "dayIndex must be a non-negative number" });
      }

      const userId = req.user.claims.sub;

      // Verify trip belongs to this user
      const [trip] = await db.select().from(travelTrips)
        .where(and(eq(travelTrips.id, tripId), eq(travelTrips.userId, userId)))
        .limit(1);

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (!trip.adventureStartedAt) {
        return res.status(400).json({ message: "Trip has not been started" });
      }

      // Load all stops for this trip
      const stops = await db.select().from(travelStops)
        .where(eq(travelStops.tripId, tripId))
        .orderBy(asc(travelStops.displayOrder));

      if (stops.length === 0) {
        return res.json({ skipped: 0 });
      }

      // Reproduce the day grouping logic to identify which stops belong to this day
      const { groupStopsByDay } = await import('../travelDayGroups');
      const cityDates = trip.cityDates as Record<string, { startDate: string; endDate: string }> | null;
      const dayGroups = groupStopsByDay(stops, undefined, trip.pace, cityDates);

      if (dayIndex >= dayGroups.length) {
        return res.json({ skipped: 0 });
      }

      // Collect stop IDs for this specific day that are not yet visited or skipped
      const dayStops = dayGroups[dayIndex] ?? [];
      const stopsToSkip = dayStops
        .filter((s) => !s.isVisited && !s.isSkipped)
        .map((s) => s.id);

      if (stopsToSkip.length === 0) {
        return res.json({ skipped: 0 });
      }

      // Mark stops as isSkipped=true (NOT isVisited — keeps XP/story systems clean)
      for (const stopId of stopsToSkip) {
        await db.update(travelStops)
          .set({ isSkipped: true })
          .where(eq(travelStops.id, stopId));
      }

      // Log quality signals for each skipped stop (context skip — no negative quality intent)
      (async () => {
        try {
          for (const stopId of stopsToSkip) {
            await storage.createStopQualitySignal({
              userId,
              tripId,
              stopId,
              signalType: "skipped",
              signalValue: "day_skipped",
              signalReason: "running_late",
            });
          }
        } catch {}
      })();

      console.log(`[skip-day] Trip ${tripId}: skipped ${stopsToSkip.length} stops on day index ${dayIndex}`);
      res.json({ skipped: stopsToSkip.length });
    } catch (error) {
      console.error("[skip-day] Error:", error);
      res.status(500).json({ message: "Failed to skip day" });
    }
  });

  // Soft auto-complete trips that meet criteria (all stops visited OR 21+ days inactive)
  app.post('/api/travel/trips/soft-complete', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const SOFT_COMPLETE_INACTIVE_DAYS = 21;
      
      // Get all user's trips
      const allTrips = await storage.getTripsByUserId(userId);
      const softCompletedTrips: string[] = [];
      
      for (const trip of allTrips) {
        // Skip already completed, locked, or At-Home adventures
        if (trip.status === 'completed' || trip.isLocked) continue;
        if (trip.allowCompletion === false || trip.adventureContext === 'home') continue;
        
        // Get stops for this trip
        const stops = await storage.getStopsByTripId(trip.id);
        const totalStops = stops.length;
        const visitedStops = stops.filter((s: any) => s.isVisited).length;
        
        // Check if all stops are visited
        const allStopsDone = totalStops > 0 && visitedStops >= totalStops;
        
        // Check inactivity period
        const lastActive = trip.updatedAt ? new Date(trip.updatedAt) : 
                          trip.createdAt ? new Date(trip.createdAt) : new Date();
        const now = new Date();
        const daysSinceActivity = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        const isInactiveAutoComplete = daysSinceActivity >= SOFT_COMPLETE_INACTIVE_DAYS;
        
        // Auto-complete if all stops done OR 21+ days inactive
        if (allStopsDone || isInactiveAutoComplete) {
          try {
            await storage.completeTrip(trip.id);
            softCompletedTrips.push(trip.id);
            console.log(`[Soft-Complete] Marked trip ${trip.id} as completed (allStopsDone: ${allStopsDone}, inactiveDays: ${daysSinceActivity})`);
          } catch (err) {
            console.error(`[Soft-Complete] Failed to complete trip ${trip.id}:`, err);
          }
        }
      }
      
      res.json({ 
        message: `Soft-completed ${softCompletedTrips.length} adventure(s)`,
        completedTripIds: softCompletedTrips
      });
    } catch (error) {
      console.error("Error in soft-complete:", error);
      res.status(500).json({ message: "Failed to process soft-completion" });
    }
  });

  // Get trip story
  app.get('/api/travel/trips/:tripId/story', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const story = await storage.getTripStoryByTripId(tripId);
      
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      res.json(story);
    } catch (error) {
      console.error("Error fetching trip story:", error);
      res.status(500).json({ message: "Failed to fetch story" });
    }
  });

  // Regenerate trip story
  app.post('/api/travel/trips/:tripId/story/regenerate', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      
      const { regenerateTripStory } = await import("../storyGenerator");
      const story = await regenerateTripStory(tripId);
      
      if (!story) {
        return res.status(500).json({ message: "Failed to regenerate story" });
      }
      
      res.json(story);
    } catch (error) {
      console.error("Error regenerating story:", error);
      res.status(500).json({ message: "Failed to regenerate story" });
    }
  });

  // ── Our Explorers caricature card generation ──────────────────────────────
  app.post('/api/travel/trips/:tripId/generate-caricature', isAuthenticated, async (req: any, res) => {
    try {
      const { imageUrl, style = "pixar" } = req.body;
      if (!imageUrl) return res.status(400).json({ message: "imageUrl required" });

      const openai = getOpenAI();
      const { toFile } = await import('openai');

      const imageSizeKB = Math.round(imageUrl.length / 1024);
      console.log(`🎨 [Caricature] Photo payload: ${imageSizeKB}KB, style: ${style}`);

      // Convert base64 data URL → Buffer → File for images.edit
      const base64Data = imageUrl.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const imageFile = await toFile(buffer, 'photo.jpg', { type: 'image/jpeg' });

      const styleMap: Record<string, string> = {
        pixar: "Pixar / Disney animated movie illustration style",
        watercolor: "storybook watercolor illustration style",
        vector: "flat modern vector illustration style",
        pastel: "soft pastel travel sketch style",
      };
      const styleDesc = styleMap[style] || styleMap.pixar;

      const prompt = `Transform this family photo into a warm, ${styleDesc}.

Rules (all critical):
- KEEP every person exactly as they appear — preserve their skin tones (brown/South Asian/dark skin must stay brown/dark, do NOT lighten), hair colors, hair styles, facial features, eyewear, clothing colors, and their relative positions and sizes
- KEEP the real background/location from the photo — if there is a river, a bridge, a skywalk, a building, a park, a street, keep it and render it in the same illustration style
- Convert both the people AND the background into the chosen illustration style together — the whole image becomes an illustration
- Keep the same composition and framing as the original photo
- Warm, cheerful, family-friendly mood
- Do NOT add text, labels, or logos
- Do NOT replace or invent a different background
- Do NOT change anyone's skin tone`;

      console.log(`🎨 [Caricature] Using images.edit with gpt-image-1, style: ${styleDesc}`);
      const response = await (openai.images as any).edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt,
        size: "1024x1536",
        quality: "medium",
        n: 1,
      });

      const rawUrl = response.data[0]?.url;
      const rawB64 = (response.data[0] as any)?.b64_json;
      const caricatureUrl = rawUrl
        ? rawUrl
        : rawB64
        ? `data:image/png;base64,${rawB64}`
        : null;
      if (!caricatureUrl) throw new Error("No image data returned");

      res.json({ caricatureUrl, style });
    } catch (error) {
      console.error("Caricature generation error:", error);
      res.status(500).json({ message: "Failed to generate caricature" });
    }
  });

  // Save a wonder response
  app.post('/api/travel/stops/:stopId/wonder-response', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const { response, promptUsed, explorerId } = req.body;
      
      const stop = await storage.getStopById(stopId);
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      const wonderResponse = await storage.createWonderResponse({
        tripId: stop.tripId,
        stopId,
        response,
        promptUsed,
        explorerId,
      });
      
      res.json(wonderResponse);
    } catch (error) {
      console.error("Error saving wonder response:", error);
      res.status(500).json({ message: "Failed to save response" });
    }
  });

  // Get wonder responses for a trip
  app.get('/api/travel/trips/:tripId/wonder-responses', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const responses = await storage.getWonderResponsesByTripId(tripId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching wonder responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  // ============================================================================
  // TRAVEL ARTIFACTS - Collectible historical items
  // ============================================================================

  // Get all artifacts for a stop by name
  app.get('/api/travel/artifacts/by-stop/:stopName', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopName } = req.params;
      const artifacts = await storage.getArtifactsByStopName(decodeURIComponent(stopName));
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  // Get all artifacts
  app.get('/api/travel/artifacts', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const artifacts = await storage.getAllArtifacts();
      res.json(artifacts);
    } catch (error) {
      console.error("Error fetching all artifacts:", error);
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  // Generate keepsakes for a trip's stops that don't have any yet
  app.post('/api/travel/trips/:tripId/generate-keepsakes', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const tripDetails = await storage.getTripWithDetails(tripId);
      if (!tripDetails) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const existingArtifacts = await storage.getAllArtifacts();
      const coveredStops = new Set(existingArtifacts.map(a => a.stopName));
      const uncoveredStops = tripDetails.stops.filter(s => !coveredStops.has(s.name));

      if (uncoveredStops.length === 0) {
        return res.json({ message: "All stops already have keepsakes", generated: 0 });
      }

      const cityName = tripDetails.trip.city || tripDetails.trip.destination || "Unknown City";
      const generated = await generateArtifactsForStops(
        uncoveredStops.map(s => ({ name: s.name, stopType: s.stopType || undefined })),
        cityName
      );

      let count = 0;
      for (const artifact of generated) {
        await storage.createArtifact({
          stopName: artifact.stopName,
          name: artifact.name,
          description: artifact.description,
          imageEmoji: artifact.imageEmoji,
          rarity: artifact.rarity,
          unlockType: artifact.unlockType,
          unlockConfig: artifact.unlockConfig || null,
          displayOrder: artifact.displayOrder,
        });
        count++;
      }

      res.json({ message: `Generated ${count} keepsakes for ${cityName}`, generated: count });
    } catch (error) {
      console.error("Error generating keepsakes:", error);
      res.status(500).json({ message: "Failed to generate keepsakes" });
    }
  });

  // Collect an artifact
  app.post('/api/travel/artifacts/collect', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId, tripId, stopId, artifactId, completionData } = req.body;
      
      if (!explorerId || !tripId || !stopId || !artifactId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const alreadyCollected = await storage.hasCollectedArtifact(explorerId, artifactId);
      if (alreadyCollected) {
        return res.status(409).json({ message: "Artifact already collected" });
      }
      
      const collected = await storage.collectArtifact({
        explorerId,
        tripId,
        stopId,
        artifactId,
        completionData,
      });
      
      res.json(collected);
    } catch (error) {
      console.error("Error collecting artifact:", error);
      res.status(500).json({ message: "Failed to collect artifact" });
    }
  });

  // Get collected artifacts (query param version for Vault page)
  app.get('/api/travel/artifacts/collected', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId, tripId } = req.query;
      if (!explorerId) {
        return res.status(400).json({ message: "explorerId is required" });
      }
      const collected = tripId 
        ? await storage.getCollectedArtifactsByTrip(tripId as string, explorerId as string)
        : await storage.getCollectedArtifactsByExplorer(explorerId as string);
      res.json({ artifacts: collected });
    } catch (error) {
      console.error("Error fetching collected artifacts:", error);
      res.status(500).json({ message: "Failed to fetch collected artifacts" });
    }
  });

  // Get collected artifacts for an explorer
  app.get('/api/travel/artifacts/collected/:explorerId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId } = req.params;
      const collected = await storage.getCollectedArtifactsByExplorer(explorerId);
      res.json(collected);
    } catch (error) {
      console.error("Error fetching collected artifacts:", error);
      res.status(500).json({ message: "Failed to fetch collected artifacts" });
    }
  });

  // Get collected artifacts for a trip (used by ArtifactSection)
  app.get('/api/travel/artifacts/collected/:explorerId/:tripId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId, tripId } = req.params;
      const collected = await storage.getCollectedArtifactsByTrip(tripId, explorerId);
      res.json(collected);
    } catch (error) {
      console.error("Error fetching trip artifacts:", error);
      res.status(500).json({ message: "Failed to fetch trip artifacts" });
    }
  });

  // Check if artifact is collected
  app.get('/api/travel/artifacts/check/:explorerId/:artifactId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId, artifactId } = req.params;
      const isCollected = await storage.hasCollectedArtifact(explorerId, artifactId);
      res.json({ isCollected });
    } catch (error) {
      console.error("Error checking artifact:", error);
      res.status(500).json({ message: "Failed to check artifact" });
    }
  });

  // ============================================================================
  // EXPLORER IDENTITY TRAITS - "I Am Becoming..." identity formation
  // ============================================================================

  // Get explorer identity traits
  app.get('/api/explorers/:explorerId/identity', async (req, res) => {
    try {
      const { explorerId } = req.params;
      let traits = await storage.getExplorerIdentityTraits(explorerId);
      
      // Create if doesn't exist
      if (!traits) {
        traits = await storage.createExplorerIdentityTraits(explorerId);
      }
      
      res.json(traits);
    } catch (error) {
      console.error("Error fetching identity traits:", error);
      res.status(500).json({ message: "Failed to fetch identity traits" });
    }
  });

  // Increment a specific identity trait
  app.post('/api/explorers/:explorerId/identity/increment', async (req, res) => {
    try {
      const { explorerId } = req.params;
      const { trait, amount = 1 } = req.body;
      
      if (!trait || !['natureNoticing', 'questionAsking', 'culturalCuriosity', 'familyConnecting', 'worldExploring', 'storyTelling'].includes(trait)) {
        return res.status(400).json({ message: "Invalid trait" });
      }
      
      const updated = await storage.incrementIdentityTrait(explorerId, trait, amount);
      res.json(updated);
    } catch (error) {
      console.error("Error incrementing trait:", error);
      res.status(500).json({ message: "Failed to increment trait" });
    }
  });

  // Generate a new identity statement using AI
  app.post('/api/explorers/:explorerId/identity/generate-statement', async (req, res) => {
    try {
      const { explorerId } = req.params;
      const { explorerName, explorerAge } = req.body;
      
      let traits = await storage.getExplorerIdentityTraits(explorerId);
      if (!traits) {
        traits = await storage.createExplorerIdentityTraits(explorerId);
      }
      
      // Find the dominant trait
      const traitScores = {
        natureNoticing: traits.natureNoticing || 0,
        questionAsking: traits.questionAsking || 0,
        culturalCuriosity: traits.culturalCuriosity || 0,
        familyConnecting: traits.familyConnecting || 0,
        worldExploring: traits.worldExploring || 0,
        storyTelling: traits.storyTelling || 0,
      };
      
      const maxScore = Math.max(...Object.values(traitScores));
      
      // If no meaningful activity yet, return a starter statement
      if (maxScore < 2) {
        const starterStatement = "You're becoming a curious explorer of the world.";
        const updated = await storage.updateIdentityStatement(explorerId, starterStatement, 'worldExploring');
        return res.json(updated);
      }
      
      const dominantTrait = Object.entries(traitScores).find(([_, score]) => score === maxScore)?.[0] || 'worldExploring';
      
      // Generate AI statement based on dominant trait
      const traitDescriptions: Record<string, string> = {
        natureNoticing: "notices and appreciates nature, observes natural phenomena, and connects with the outdoors",
        questionAsking: "asks thoughtful questions about the world, is curious, and seeks to understand how things work",
        culturalCuriosity: "is interested in different cultures, traditions, and ways of life around the world",
        familyConnecting: "values family moments, creates memories together, and strengthens family bonds",
        worldExploring: "loves exploring new places, seeks adventure, and discovers the world",
        storyTelling: "shares experiences, tells stories, and captures moments meaningfully",
      };
      
      const traitDescription = traitDescriptions[dominantTrait];
      const ageContext = explorerAge ? `(age ${explorerAge})` : "";
      
      const prompt = `Generate a single, warm identity statement for a child explorer named ${explorerName || "this explorer"} ${ageContext}.

Their strongest trait is: ${dominantTrait}
They have demonstrated they: ${traitDescription}

Create ONE short statement in this exact format: "You're becoming someone who [specific observation]."

Rules:
- Make it descriptive, not praise (describe what they DO, not judge them)
- Keep it simple and age-appropriate
- No comparisons to others
- No achievement language (no "expert", "master", "best")
- Make it feel earned and authentic
- Maximum 15 words total

Examples of good statements:
- "You're becoming someone who notices the little wonders in nature."
- "You're becoming someone who asks the questions that make us all think."
- "You're becoming someone who brings the family together through adventures."

Return ONLY the statement, nothing else.`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.7,
      });
      
      let statement = response.choices[0]?.message?.content?.trim() || "You're becoming a thoughtful world explorer.";
      
      // Clean up - ensure it starts with "You're becoming"
      if (!statement.startsWith("You're becoming")) {
        statement = "You're becoming someone who explores the world with curiosity.";
      }
      
      // Update the stored statement
      const updated = await storage.updateIdentityStatement(explorerId, statement, dominantTrait);
      res.json(updated);
    } catch (error) {
      console.error("Error generating identity statement:", error);
      res.status(500).json({ message: "Failed to generate identity statement" });
    }
  });

  // ============================================================================
  // TRAIL TALES - "Who Am I" riddle game for travel memories
  // ============================================================================

  // Generate riddles for a trip (creates riddles for all visited stops)
  app.post('/api/travel/trips/:tripId/trail-tales/generate', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      console.log(`[Trail Tales] Starting riddle generation for trip: ${tripId}`);
      
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        console.log(`[Trail Tales] Trip not found: ${tripId}`);
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const stops = await storage.getStopsByTripId(tripId);
      const visitedStops = stops.filter(s => s.isVisited);
      console.log(`[Trail Tales] Found ${visitedStops.length} visited stops for trip ${trip.name}`);
      
      if (visitedStops.length === 0) {
        console.log(`[Trail Tales] No visited stops - skipping generation`);
        return res.json({ riddles: [], message: "No visited stops yet" });
      }
      
      // Check if riddles already exist for this trip
      const existingRiddles = await storage.getRiddlesByTripId(tripId);
      const existingStopIds = new Set(existingRiddles.map(r => r.stopId));
      console.log(`[Trail Tales] ${existingRiddles.length} riddles already exist`);
      
      // Generate riddles for stops that don't have them yet
      const stopsNeedingRiddles = visitedStops.filter(s => !existingStopIds.has(s.id));
      console.log(`[Trail Tales] ${stopsNeedingRiddles.length} stops need riddles`);
      
      const newRiddles = [];
      
      for (const stop of stopsNeedingRiddles) {
        // Generate a riddle using OpenAI
        const prompt = `Create a "Who Am I?" riddle for children about ${stop.name} (a ${stop.stopType || 'place'} in ${trip.destination}).

The riddle should:
- Be 2-3 short, poetic lines
- Include descriptive clues about the location's features
- Be age-appropriate for kids 4-12
- Not mention the name directly
- Be fun and engaging

Also provide 3 multiple choice answers (the correct one first, then 2 plausible wrong answers from similar attractions).

Format your response as JSON:
{
  "riddle": "Your riddle text here",
  "answer": "${stop.name}",
  "wrongOptions": ["Wrong Option 1", "Wrong Option 2"]
}`;

        try {
          console.log(`[Trail Tales] Generating riddle for: ${stop.name}`);
          const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.8,
          });
          
          const content = response.choices[0]?.message?.content || "";
          console.log(`[Trail Tales] OpenAI response for ${stop.name}:`, content.substring(0, 100));
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const riddleData = JSON.parse(jsonMatch[0]);
            const allOptions = [riddleData.answer, ...riddleData.wrongOptions];
            // Shuffle options
            const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
            
            // Auto-unlock for completed trips or trips with more than 3 visited stops
            const shouldUnlock = trip.status === 'completed' || visitedStops.length > 3;
            
            const riddle = await storage.createTrailTalesRiddle({
              tripId,
              stopId: stop.id,
              riddleText: riddleData.riddle,
              riddleType: "location",
              answer: stop.name,
              answerOptions: shuffledOptions,
              difficulty: "easy",
              stopsDelayBefore: 0, // No delay for auto-unlock
              isUnlocked: shouldUnlock,
              unlockedAt: shouldUnlock ? new Date() : undefined,
            });
            
            console.log(`[Trail Tales] Created riddle for ${stop.name}, unlocked: ${shouldUnlock}`);
            newRiddles.push(riddle);
          }
        } catch (genError) {
          console.error(`Failed to generate riddle for ${stop.name}:`, genError);
        }
      }
      
      res.json({ 
        riddles: [...existingRiddles, ...newRiddles],
        newCount: newRiddles.length 
      });
    } catch (error) {
      console.error("Error generating trail tales riddles:", error);
      res.status(500).json({ message: "Failed to generate riddles" });
    }
  });

  // Get all riddles for a trip (auto-unlocks if criteria met)
  app.get('/api/travel/trips/:tripId/trail-tales/riddles', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      
      // Check if we should auto-unlock riddles
      const trip = await storage.getTripById(tripId);
      const stops = await storage.getStopsByTripId(tripId);
      const visitedCount = stops.filter(s => s.isVisited).length;
      
      // Auto-unlock if completed or more than 3 stops visited
      if (trip && (trip.status === 'completed' || visitedCount > 3)) {
        await storage.unlockAllRiddlesForTrip(tripId);
      }
      
      const riddles = await storage.getRiddlesByTripId(tripId);
      res.json(riddles);
    } catch (error) {
      console.error("Error fetching riddles:", error);
      res.status(500).json({ message: "Failed to fetch riddles" });
    }
  });

  // Get unlocked riddles only
  app.get('/api/travel/trips/:tripId/trail-tales/unlocked', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const riddles = await storage.getUnlockedRiddles(tripId);
      res.json(riddles);
    } catch (error) {
      console.error("Error fetching unlocked riddles:", error);
      res.status(500).json({ message: "Failed to fetch riddles" });
    }
  });

  // Unlock riddles based on visited stops
  app.post('/api/travel/trips/:tripId/trail-tales/unlock', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const stops = await storage.getStopsByTripId(tripId);
      const visitedCount = stops.filter(s => s.isVisited).length;
      
      const unlockedRiddles = await storage.unlockRiddlesForTrip(tripId, visitedCount);
      res.json({ unlockedRiddles, count: unlockedRiddles.length });
    } catch (error) {
      console.error("Error unlocking riddles:", error);
      res.status(500).json({ message: "Failed to unlock riddles" });
    }
  });

  // Submit an answer for a riddle
  app.post('/api/travel/trail-tales/riddles/:riddleId/answer', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { riddleId } = req.params;
      const { explorerId, selectedAnswer } = req.body;
      
      const riddle = await storage.getRiddleById(riddleId);
      if (!riddle) {
        return res.status(404).json({ message: "Riddle not found" });
      }
      
      // Check if explorer already answered this riddle (first attempt only counts for stars)
      const existingAttempts = await storage.getAttemptsByExplorer(riddle.tripId, explorerId);
      const previousAttempt = existingAttempts.find(a => a.riddleId === riddleId);
      
      const isCorrect = selectedAnswer.toLowerCase().trim() === riddle.answer.toLowerCase().trim();
      
      // Only award stars on FIRST attempt - replays don't add more stars
      const isFirstAttempt = !previousAttempt;
      const starsEarned = isFirstAttempt && isCorrect ? 3 : 0;
      
      let attempt;
      if (isFirstAttempt) {
        // Record the first attempt
        attempt = await storage.createTrailTalesAttempt({
          riddleId,
          explorerId,
          tripId: riddle.tripId,
          selectedAnswer,
          isCorrect,
          memoryStarsEarned: starsEarned,
          attemptNumber: 1,
        });
        
        // Update progress only on first attempts
        const progress = await storage.getOrCreateTrailTalesProgress(riddle.tripId, explorerId);
        const allRiddles = await storage.getRiddlesByTripId(riddle.tripId);
        const allAttempts = await storage.getAttemptsByExplorer(riddle.tripId, explorerId);
        
        // Only count first attempts for each riddle (unique riddle IDs)
        const uniqueRiddleAttempts = new Map<string, typeof allAttempts[0]>();
        allAttempts.forEach(a => {
          if (!uniqueRiddleAttempts.has(a.riddleId)) {
            uniqueRiddleAttempts.set(a.riddleId, a);
          }
        });
        
        const correctAttempts = Array.from(uniqueRiddleAttempts.values()).filter(a => a.isCorrect);
        const totalStars = correctAttempts.reduce((sum, a) => sum + (a.memoryStarsEarned || 0), 0);
        
        // Check if earned Memory Champion (all riddles answered correctly on first attempt)
        const allCorrect = correctAttempts.length === allRiddles.length && allRiddles.length > 0;
        
        await storage.updateTrailTalesProgress(riddle.tripId, explorerId, {
          totalRiddles: allRiddles.length,
          correctAnswers: correctAttempts.length,
          totalMemoryStars: totalStars,
          isMemoryChampion: allCorrect,
          championEarnedAt: allCorrect && !progress.isMemoryChampion ? new Date() : progress.championEarnedAt,
          lastPlayedAt: new Date(),
        });
      } else {
        // For replays, just return the previous attempt info
        attempt = previousAttempt;
      }
      
      // Get current progress for response
      const currentProgress = await storage.getOrCreateTrailTalesProgress(riddle.tripId, explorerId);
      
      res.json({
        attempt,
        isCorrect,
        starsEarned,
        correctAnswer: riddle.answer,
        isMemoryChampion: currentProgress.isMemoryChampion,
        isReplay: !isFirstAttempt,
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  // Get explorer's progress for Trail Tales
  app.get('/api/travel/trips/:tripId/trail-tales/progress/:explorerId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId, explorerId } = req.params;
      const progress = await storage.getOrCreateTrailTalesProgress(tripId, explorerId);
      const attempts = await storage.getAttemptsByExplorer(tripId, explorerId);
      
      res.json({ progress, attempts });
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Check if Trail Tales button should show (2 days after trip completion)
  app.get('/api/travel/trips/:tripId/trail-tales/availability', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const trip = await storage.getTripById(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Trail Tales is available during trip OR 2 days after completion
      const stops = await storage.getStopsByTripId(tripId);
      const visitedStops = stops.filter(s => s.isVisited);
      
      let isAvailable = false;
      let reason = "";
      
      if (trip.status === 'completed' && trip.completedAt) {
        const daysSinceCompletion = Math.floor((Date.now() - new Date(trip.completedAt).getTime()) / (1000 * 60 * 60 * 24));
        isAvailable = daysSinceCompletion >= 2;
        reason = isAvailable ? "Trip completed 2+ days ago" : `Available in ${2 - daysSinceCompletion} days`;
      } else if (visitedStops.length >= 3) {
        // During trip, available after visiting 3+ stops
        isAvailable = true;
        reason = "Pop-up challenges available during trip";
      } else {
        reason = `Visit ${3 - visitedStops.length} more stops to unlock`;
      }
      
      // Check for any unlocked riddles
      const unlockedRiddles = await storage.getUnlockedRiddles(tripId);
      
      res.json({
        isAvailable,
        reason,
        unlockedRiddleCount: unlockedRiddles.length,
        tripStatus: trip.status,
        visitedStopCount: visitedStops.length,
      });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // ============================================================================
  // TRAVEL TROPHY CABINET - Gamification badges
  // ============================================================================
  
  // Get explorer's trophy cabinet with all badges and progress
  app.get('/api/travel/trophies/:explorerId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify explorer belongs to this user
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get current stats
      const stats = await storage.getExplorerBadgeStats(explorerId, userId);
      
      // Get existing badge progress records
      const badgeRecords = await storage.getExplorerTravelBadges(explorerId);
      const badgeMap = new Map(badgeRecords.map(b => [b.badgeCategoryId, b]));
      
      // Build trophy cabinet with all categories
      const { TRAVEL_BADGE_CATEGORIES } = await import('@workspace/db');
      
      const trophyCabinet = TRAVEL_BADGE_CATEGORIES.map(category => {
        // Get current progress for this category
        let currentProgress = 0;
        switch (category.metric) {
          case 'total_trips': currentProgress = stats.totalTrips; break;
          case 'total_stops_visited': currentProgress = stats.totalStopsVisited; break;
          case 'total_keepsakes': currentProgress = stats.totalKeepsakes; break;
          case 'beach_stops_visited': currentProgress = stats.beachStopsVisited; break;
          case 'nature_stops_visited': currentProgress = stats.natureStopsVisited; break;
          case 'city_stops_visited': currentProgress = stats.cityStopsVisited; break;
          case 'wildlife_stops_visited': currentProgress = stats.wildlifeStopsVisited; break;
          case 'trail_tales_completed': currentProgress = stats.trailTalesCompleted; break;
        }
        
        // Determine current tier
        let currentTier: string | null = null;
        let nextTier: typeof category.tiers[number] | null = null;
        
        for (const tier of category.tiers) {
          if (currentProgress >= tier.threshold) {
            currentTier = tier.tier;
          } else if (!nextTier) {
            nextTier = tier;
          }
        }
        
        // Get existing badge record
        const existingBadge = badgeMap.get(category.id);
        
        return {
          id: category.id,
          name: category.name,
          emoji: category.emoji,
          description: category.description,
          currentProgress,
          currentTier,
          tiers: category.tiers,
          nextTier,
          progressToNextTier: nextTier ? Math.min(100, Math.round((currentProgress / nextTier.threshold) * 100)) : 100,
          bronzeEarnedAt: existingBadge?.bronzeEarnedAt,
          silverEarnedAt: existingBadge?.silverEarnedAt,
          goldEarnedAt: existingBadge?.goldEarnedAt,
          legendEarnedAt: existingBadge?.legendEarnedAt,
        };
      });
      
      res.json({
        explorerId,
        stats,
        badges: trophyCabinet,
        totalBadgesEarned: trophyCabinet.filter(b => b.currentTier).length,
        totalGoldBadges: trophyCabinet.filter(b => b.currentTier === 'gold' || b.currentTier === 'legend').length,
        totalLegendBadges: trophyCabinet.filter(b => b.currentTier === 'legend').length,
      });
    } catch (error) {
      console.error("Error fetching trophy cabinet:", error);
      res.status(500).json({ message: "Failed to fetch trophy cabinet" });
    }
  });
  
  // Sync/update badge progress after actions (called after completing stops, collecting keepsakes, etc.)
  app.post('/api/travel/trophies/:explorerId/sync', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify explorer belongs to this user
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get current stats
      const stats = await storage.getExplorerBadgeStats(explorerId, userId);
      
      const { TRAVEL_BADGE_CATEGORIES } = await import('@workspace/db');
      
      const newlyUnlocked: { categoryId: string; tier: string; label: string; emoji: string }[] = [];
      
      // Update each badge category
      for (const category of TRAVEL_BADGE_CATEGORIES) {
        let currentProgress = 0;
        switch (category.metric) {
          case 'total_trips': currentProgress = stats.totalTrips; break;
          case 'total_stops_visited': currentProgress = stats.totalStopsVisited; break;
          case 'total_keepsakes': currentProgress = stats.totalKeepsakes; break;
          case 'beach_stops_visited': currentProgress = stats.beachStopsVisited; break;
          case 'nature_stops_visited': currentProgress = stats.natureStopsVisited; break;
          case 'city_stops_visited': currentProgress = stats.cityStopsVisited; break;
          case 'wildlife_stops_visited': currentProgress = stats.wildlifeStopsVisited; break;
          case 'trail_tales_completed': currentProgress = stats.trailTalesCompleted; break;
        }
        
        // Determine earned tier
        let earnedTier: string | null = null;
        let earnedLabel = '';
        for (const tier of category.tiers) {
          if (currentProgress >= tier.threshold) {
            earnedTier = tier.tier;
            earnedLabel = tier.label;
          }
        }
        
        // Get existing badge to check if this is a new unlock
        const existingBadges = await storage.getExplorerTravelBadges(explorerId);
        const existingBadge = existingBadges.find(b => b.badgeCategoryId === category.id);
        
        // Check if we're unlocking a new tier
        if (earnedTier) {
          const tierOrder = ['bronze', 'silver', 'gold', 'legend'];
          const existingTierIndex = existingBadge?.currentTier ? tierOrder.indexOf(existingBadge.currentTier) : -1;
          const newTierIndex = tierOrder.indexOf(earnedTier);
          
          if (newTierIndex > existingTierIndex) {
            newlyUnlocked.push({
              categoryId: category.id,
              tier: earnedTier,
              label: earnedLabel,
              emoji: category.emoji,
            });
          }
        }
        
        // Update progress
        await storage.updateExplorerBadgeProgress(explorerId, category.id, currentProgress, earnedTier);
      }
      
      res.json({
        success: true,
        newlyUnlocked,
        stats,
      });
    } catch (error) {
      console.error("Error syncing badge progress:", error);
      res.status(500).json({ message: "Failed to sync badge progress" });
    }
  });

  // ============================================================================
  // REFLECTION GAMES - Layer 3 backward-looking games for recaps
  // ============================================================================

  // Start a reflection game session (Adventure Recap, End-of-Day, End-of-Trip)
  app.post('/api/travel/trips/:tripId/reflection-games/session', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { explorerId, sessionType } = req.body;
      
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const stops = await storage.getStopsByTripId(tripId);
      const visitedStops = stops.filter(s => s.isVisited);
      const stopIds = visitedStops.map(s => s.id);
      
      const { createRecapSession } = await import('../reflectionGamesService');
      const session = await createRecapSession(tripId, explorerId, sessionType, stopIds);
      
      res.json({ session });
    } catch (error) {
      console.error("Error creating reflection session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // Get reflection games for a recap session
  app.get('/api/travel/trips/:tripId/reflection-games', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      const { sessionType } = req.query;
      
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const stops = await storage.getStopsByTripId(tripId);
      const moments = await storage.getMomentsByTripId(tripId);
      const stopIds = stops.map(s => s.id);
      const packs = stopIds.length > 0 ? await storage.getJourneyPacksByStopIds(stopIds) : [];
      
      const { selectGamesForRecap } = await import('../reflectionGamesService');
      const games = await selectGamesForRecap(
        tripId, 
        sessionType || 'adventure_recap',
        stops,
        moments,
        packs
      );
      
      res.json({ games });
    } catch (error) {
      console.error("Error fetching reflection games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  // Submit a reflection game response
  app.post('/api/travel/reflection-games/:sessionId/response', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { tripId, explorerId, gameType, selectedAnswer, isCorrect, starsEarned, stopId, responseData } = req.body;
      
      const { recordGameResponse } = await import('../reflectionGamesService');
      await recordGameResponse(
        sessionId,
        tripId,
        explorerId,
        gameType,
        selectedAnswer,
        isCorrect,
        starsEarned,
        stopId,
        responseData
      );
      
      if (gameType === 'pick_title' && selectedAnswer) {
        await db.update(travelTrips)
          .set({ recapTitle: selectedAnswer })
          .where(eq(travelTrips.id, tripId));
      }
      
      res.json({ success: true, starsEarned });
    } catch (error) {
      console.error("Error recording game response:", error);
      res.status(500).json({ message: "Failed to record response" });
    }
  });

  // Complete a reflection game session
  app.post('/api/travel/reflection-games/:sessionId/complete', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      
      const { completeRecapSession } = await import('../reflectionGamesService');
      await completeRecapSession(sessionId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing session:", error);
      res.status(500).json({ message: "Failed to complete session" });
    }
  });

  // Check reflection games availability (needs 3+ visited stops)
  app.get('/api/travel/trips/:tripId/reflection-games/availability', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { tripId } = req.params;
      
      const trip = await storage.getTripById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const stops = await storage.getStopsByTripId(tripId);
      const visitedStops = stops.filter(s => s.isVisited);
      
      const isAvailable = visitedStops.length >= 3;
      const reason = isAvailable 
        ? "Reflection games available!" 
        : `Visit ${3 - visitedStops.length} more stops to unlock`;
      
      res.json({
        isAvailable,
        reason,
        visitedStopCount: visitedStops.length,
        requiredStops: 3,
      });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // ============================================================================
  // MEAL RECOMMENDATIONS - Kid-friendly restaurant suggestions between stops
  // ============================================================================

  app.post('/api/travel/meal-recs', async (req: any, res) => {
    try {
      const { destination, beforeStopName, afterStopName, mealType, widen, searchQuery, cuisines, excludedNames } = req.body;
      if (!destination) return res.status(400).json({ message: "destination required" });

      const openai = getOpenAI();
      const mealLabel = mealType === 'snack' ? 'snack or coffee break' : 'kid-friendly lunch';
      const context = beforeStopName && afterStopName
        ? `between "${beforeStopName}" and "${afterStopName}"`
        : beforeStopName ? `near "${beforeStopName}"` : afterStopName ? `near "${afterStopName}"` : `in ${destination}`;
      const radius = widen ? '20-30 minutes' : '5-10 minutes';
      const searchFocus = searchQuery
        ? `The family is specifically looking for: "${searchQuery}". Focus suggestions around this preference.`
        : '';
      const cuisineNames = Array.isArray(cuisines) && cuisines.length > 0
        ? cuisines.map((c: string) => c.replace(/^[^\s]+\s/, "").trim()).join(", ")
        : null;
      const cuisinePref = cuisineNames
        ? `The family prefers ${cuisineNames} cuisine — prioritize restaurants with those cuisines above others.`
        : '';
      const excludedList = Array.isArray(excludedNames) && excludedNames.length > 0
        ? excludedNames.filter((n: string) => typeof n === 'string' && n.trim()).map((n: string) => `"${n.trim()}"`)
        : [];
      const excludedClause = excludedList.length > 0
        ? `\n- Do NOT suggest any of these already-recommended restaurants: ${excludedList.join(', ')}`
        : '';

      const prompt = `You are a family travel expert. Suggest 4 real, kid-friendly restaurants/cafes for a ${mealLabel} for a family with young children (ages 3-12) in ${destination}, ${context}.${searchFocus ? '\n\n' + searchFocus : ''}${cuisinePref ? '\n\n' + cuisinePref : ''}

Rules:
- Only suggest REAL, well-known establishments that actually exist in ${destination}
- Must be kid-friendly (child menus, relaxed atmosphere, easy for families)
- Should be within ${radius} drive/walk from the stop area${widen ? ' (wider search area — the family is OK traveling further)' : ''}${searchQuery ? `\n- Prioritize places matching or similar to "${searchQuery}"` : ''}${cuisineNames ? `\n- Strongly prefer ${cuisineNames} cuisine options — the family specifically requested these` : ''}${excludedClause}
- For snack/coffee: include cafes, ice cream shops, bakeries, or casual snack spots
- For lunch: include family restaurants, casual dining, fast-casual spots kids love

Respond with JSON only, no markdown:
{
  "suggestions": [
    {
      "name": "Restaurant Name",
      "cuisine": "American / Italian / etc",
      "description": "One sentence, max 15 words, why kids love it",
      "priceLevel": 1,
      "kidFriendlyNote": "One sentence about what makes it family-friendly",
      "walkTime": "5 min walk"
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || '{"suggestions":[]}';
      const parsed = JSON.parse(raw);
      res.json({ suggestions: parsed.suggestions || [] });
    } catch (err: any) {
      console.error("[meal-recs]", err.message);
      res.status(500).json({ message: "Failed to load meal suggestions", suggestions: [] });
    }
  });

  // Need-recs: quick suggestions for "need a break" or "need food" near current stop
  app.post('/api/travel/need-recs', isAuthenticated, async (req: any, res) => {
    try {
      const { destination, nearStopName, needType, locationMode, lat, lng } = req.body;
      if (!destination) return res.status(400).json({ message: "destination required" });
      const openai = getOpenAI();
      const isBreak = needType === 'break';
      const isFun = needType === 'fun';

      // Build location context string from locationMode
      const locMode = locationMode || 'near_next_stop';
      let locationContext = `near "${nearStopName || 'the city center'}" in ${destination}`;
      if (locMode === 'near_me' && lat != null && lng != null) {
        locationContext = `near coordinates ${lat},${lng} in ${destination} (near "${nearStopName || 'the city center'}")`;
      } else if (locMode === 'along_route') {
        locationContext = `along the travel route through ${destination} (currently near "${nearStopName || 'the city center'}")`;
      }

      const prompt = isFun
        ? `You are a family travel expert. A family with young children is ${locationContext} and wants a quick, exciting bonus activity for kids.

Suggest 3 REAL kid-friendly activity spots. Focus on:
- Playgrounds, splash pads, arcades, mini-golf, bowling, science centers, aquariums, go-karts, trampoline parks, escape rooms for kids, candy stores, toy shops, ice cream parlors
- Should be fun, hands-on, and energizing for kids aged 4-12
- 15-30 min activity time preferred
- Must actually exist near this location

Scoring criteria to pick the best options (apply internally, don't show scores):
- Distance/accessibility: 25%
- Kid energy release factor: 20%
- Safety & age-appropriateness: 20%
- Value/budget: 15%
- Restroom availability: 10%
- Route fit: 10%

For the Maps URL, construct it as: https://www.google.com/maps/search/?api=1&query=PLACE_NAME+CITY

Return JSON only with max 3 suggestions:
{
  "suggestions": [
    {
      "id": "uuid-like-string-1",
      "name": "Place name",
      "type": "playground|arcade|trampoline|bowling|mini-golf|museum|candy|icecream|activity",
      "travelTimeMinutes": 8,
      "whyThisWorks": "One sentence — specific reason this works for tired kids and parents right now",
      "chips": ["🎯 Hands-on fun", "👟 Burn energy"],
      "goNowMapsUrl": "https://www.google.com/maps/search/?api=1&query=Place+Name+City",
      "canAddToToday": true,
      "isFree": false,
      "description": "One short sentence — what makes this amazing for kids",
      "kidNote": "What kids can do there — e.g. Jump, climb, and bounce for 30 min"
    }
  ]
}`
        : `You are a family travel expert. A family with young children is ${locationContext} and needs a quick ${isBreak ? 'rest/break spot' : 'food stop'}.

Suggest 3 REAL, nearby options that are:
${isBreak
  ? '- Shaded parks, playgrounds, benches, plazas, quiet public spaces\n- Coffee shops or cafes with seating (great for parents to recharge)\n- Must be walk-in friendly, no tickets required\n- Within 5–15 min ideally'
  : '- Kid-friendly restaurants, cafes, food courts, or casual eateries\n- Quick service preferred\n- Within 5-15 min'}
- Must actually exist near this location
- IMPORTANT: Be conservative with travel time estimates. Use driving time, not straight-line distance. Round UP, not down. A place 1 mile away is at least 8-12 min drive in a city with traffic and parking. Never say under 5 min unless it's truly next door.

${isBreak ? `Scoring criteria (apply internally, don't show scores):
- Distance/accessibility: 25%
- Comfort & shade: 20%
- Restroom availability: 15%
- Sensory relief (quiet, calm): 15%
- Flexibility (no booking, just walk in): 15%
- Energy release for kids: 10%` : `Scoring criteria (apply internally, don't show scores):
- Distance/accessibility: 25%
- Speed of service: 20%
- Kid-friendliness: 20%
- Restroom availability: 10%
- Seating/comfort: 10%
- Budget-friendliness: 10%
- Route fit: 5%`}

For the Maps URL, construct it as: https://www.google.com/maps/search/?api=1&query=PLACE_NAME+CITY

Return JSON only with max 3 suggestions:
{
  "suggestions": [
    {
      "id": "uuid-like-string-1",
      "name": "Place name",
      "type": "${isBreak ? 'park|plaza|cafe|bench|shade' : 'restaurant|cafe|food_court|bakery'}",
      "travelTimeMinutes": 5,
      "whyThisWorks": "One sentence — specific reason this works for this family right now",
      "chips": ${isBreak ? '["🌿 Low effort", "🚻 Has restrooms"]' : '["🍔 Kid menu", "⚡ Quick serve"]'},
      "goNowMapsUrl": "https://www.google.com/maps/search/?api=1&query=Place+Name+City",
      "canAddToToday": true,
      "isFree": ${isBreak ? 'true' : 'false'},
      "description": "One short sentence — what it is and why it works for families",
      "kidNote": "One short sentence for parents"
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || '{"suggestions":[]}';
      const parsed = JSON.parse(raw);
      const suggestions = (parsed.suggestions || []).slice(0, 3);
      res.json({ suggestions });
    } catch (err: any) {
      console.error("[need-recs]", err.message);
      res.status(500).json({ message: "Failed to load suggestions", suggestions: [] });
    }
  });

  // Weather endpoint — Nominatim geocoding + Open-Meteo (both free, no API key needed)
  // Always returns: tempC, tempF, weatherCode, isRainy, precipProb, hourlyPrecip (next 12h from now), next12hPrecipMax, description
  app.get('/api/weather', async (req: any, res) => {
    const city = (req.query.city as string || "").trim();
    if (!city) return res.status(400).json({ message: "city required" });

    function wmoIsRainyWeather(code: number): boolean {
      return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
    }
    function wmoDescription(code: number): string {
      if (code === 0) return "Clear sky";
      if (code <= 3) return "Partly cloudy";
      if (code <= 48) return "Foggy";
      if (code <= 67) return "Rain";
      if (code <= 77) return "Snow";
      if (code <= 82) return "Rain showers";
      if (code <= 99) return "Thunderstorm";
      return "";
    }

    try {
      const geoR = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
        { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'GeoQuestGames/1.0 contact@geoquest.app' } }
      );
      const geo = await geoR.json() as Array<{ lat: string; lon: string }>;
      if (!geo?.[0]?.lat) throw new Error("geocoding failed");
      const lat = parseFloat(geo[0].lat);
      const lon = parseFloat(geo[0].lon);
      const wR = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=precipitation_probability&daily=precipitation_probability_max&temperature_unit=celsius&timezone=auto&forecast_days=2`,
        { signal: AbortSignal.timeout(5000) }
      );
      const wData = await wR.json() as {
        current?: { temperature_2m?: number; weather_code?: number; time?: string };
        hourly?: { precipitation_probability?: number[]; time?: string[] };
        daily?: { precipitation_probability_max?: number[] };
        utc_offset_seconds?: number;
      };
      const tempC = Math.round(wData.current?.temperature_2m ?? 0);
      const tempF = Math.round(tempC * 9 / 5 + 32);
      const weatherCode = wData.current?.weather_code ?? 0;
      const precipProb = wData.daily?.precipitation_probability_max?.[0] ?? 0;
      const isRainy = wmoIsRainyWeather(weatherCode) || precipProb >= 50;
      const description = wmoDescription(weatherCode);

      // Compute next-12-hour precip from current local time using utc_offset_seconds
      // Time strings from Open-Meteo are in city local time without offset (e.g. "2026-04-13T19:00")
      const hourlyTimes = wData.hourly?.time ?? [];
      const hourlyProbAll = wData.hourly?.precipitation_probability ?? [];
      // Use current.time (already in city local time) to find the right hour index
      const currentLocalTime = wData.current?.time; // e.g. "2026-04-13T19:00"
      let startIdx = currentLocalTime
        ? hourlyTimes.findIndex(t => t >= currentLocalTime)
        : -1;
      // Fallback: compute local time from utc_offset_seconds
      if (startIdx < 0) {
        const utcOffsetMs = (wData.utc_offset_seconds ?? 0) * 1000;
        const localNowIso = new Date(Date.now() + utcOffsetMs).toISOString().slice(0, 13) + ":00";
        startIdx = hourlyTimes.findIndex(t => t >= localNowIso);
      }
      const sliceFrom = startIdx >= 0 ? startIdx : 0;
      const hourlyPrecip = hourlyProbAll.slice(sliceFrom, sliceFrom + 12) as number[];
      const next12hPrecipMax = hourlyPrecip.length > 0 ? Math.max(...hourlyPrecip) : precipProb;

      return res.json({ tempC, tempF, weatherCode, isRainy, precipProb, next12hPrecipMax, hourlyPrecip, description });
    } catch (err: any) {
      console.error("[weather]", err.message);
      res.status(500).json({ message: "weather unavailable" });
    }
  });

  // ============================================================================
  // GEORELIC PUZZLE SYSTEM - World Mode and Travel Mode puzzles
  // ============================================================================

  // Get all World Mode puzzles grouped by continent
  app.get('/api/puzzles/world', async (req, res) => {
    try {
      const puzzles = await storage.getWorldModePuzzles();
      
      // Group by continent
      const byContinent: Record<string, typeof puzzles> = {};
      for (const puzzle of puzzles) {
        const continent = puzzle.continent || 'Other';
        if (!byContinent[continent]) byContinent[continent] = [];
        byContinent[continent].push(puzzle);
      }
      
      res.json({ puzzles, byContinent });
    } catch (error) {
      console.error("Error fetching world puzzles:", error);
      res.status(500).json({ message: "Failed to fetch puzzles" });
    }
  });

  // Get puzzles for a specific continent
  app.get('/api/puzzles/world/:continent', async (req, res) => {
    try {
      const { continent } = req.params;
      const puzzles = await storage.getPuzzlesByContinent(decodeURIComponent(continent));
      res.json(puzzles);
    } catch (error) {
      console.error("Error fetching continent puzzles:", error);
      res.status(500).json({ message: "Failed to fetch puzzles" });
    }
  });

  // Get explorer's progress for a continent
  app.get('/api/puzzles/world/:continent/progress/:explorerId', isAuthenticated, async (req: any, res) => {
    try {
      const { continent, explorerId } = req.params;
      
      // Verify explorer belongs to this user
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.getExplorerContinentProgress(explorerId, decodeURIComponent(continent));
      res.json(progress);
    } catch (error) {
      console.error("Error fetching puzzle progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Get a specific puzzle with its pieces
  app.get('/api/puzzles/:puzzleId', async (req, res) => {
    try {
      const { puzzleId } = req.params;
      const puzzle = await storage.getPuzzleById(puzzleId);
      
      if (!puzzle) {
        return res.status(404).json({ message: "Puzzle not found" });
      }
      
      const pieces = await storage.getPuzzlePieces(puzzleId);
      res.json({ puzzle, pieces });
    } catch (error) {
      console.error("Error fetching puzzle:", error);
      res.status(500).json({ message: "Failed to fetch puzzle" });
    }
  });

  // Get puzzle for a travel stop
  app.get('/api/puzzles/travel/stop/:stopId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { stopId } = req.params;
      const puzzle = await storage.getPuzzleByStopId(stopId);
      
      if (!puzzle) {
        return res.json({ puzzle: null, pieces: [] });
      }
      
      const pieces = await storage.getPuzzlePieces(puzzle.id);
      res.json({ puzzle, pieces });
    } catch (error) {
      console.error("Error fetching stop puzzle:", error);
      res.status(500).json({ message: "Failed to fetch puzzle" });
    }
  });

  // Get player's puzzle progress
  app.get('/api/puzzles/:puzzleId/progress/:explorerId', isAuthenticated, async (req: any, res) => {
    try {
      const { puzzleId, explorerId } = req.params;
      
      // Verify explorer belongs to this user
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.getPlayerPuzzleProgress(explorerId, puzzleId);
      res.json(progress || { piecesPlaced: [], isCompleted: false });
    } catch (error) {
      console.error("Error fetching puzzle progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Save puzzle progress (piece placed)
  app.post('/api/puzzles/:puzzleId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { puzzleId } = req.params;
      const { explorerId, piecesPlaced } = req.body;
      
      if (!explorerId) {
        return res.status(400).json({ message: "explorerId is required" });
      }
      
      // Verify explorer belongs to this user
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.savePuzzleProgress({
        explorerId,
        puzzleId,
        piecesPlaced
      });
      
      res.json(progress);
    } catch (error) {
      console.error("Error saving puzzle progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  // Complete a puzzle
  app.post('/api/puzzles/:puzzleId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { puzzleId } = req.params;
      const { explorerId, tripId } = req.body;
      
      if (!explorerId) {
        return res.status(400).json({ message: "explorerId is required" });
      }
      
      // Verify explorer belongs to this user
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // If this is a trip-based puzzle, check if the trip allows keepsakes
      if (tripId) {
        const trip = await storage.getTripById(tripId);
        if (trip && trip.allowKeepsakes === false) {
          return res.status(403).json({ 
            message: "At-Home adventures do not award keepsakes. Collect keepsakes on your real travel adventures!",
            code: "HOME_ADVENTURE_NO_KEEPSAKES"
          });
        }
      }
      
      // Check if already completed (prevent duplicate star awards)
      const existingProgress = await storage.getPlayerPuzzleProgress(explorerId, puzzleId);
      if (existingProgress?.isCompleted) {
        // Return existing progress without awarding again
        const puzzle = await storage.getPuzzleById(puzzleId);
        let keepsake = null;
        if (puzzle?.mode === 'travel') {
          keepsake = await storage.getKeepsakeByPuzzleId(puzzleId);
        }
        return res.json({
          progress: existingProgress,
          puzzle,
          keepsake,
          starsAwarded: 0, // No new stars for replay
          alreadyCompleted: true
        });
      }
      
      // Complete the puzzle and award stars/keepsakes
      const progress = await storage.completePuzzle(explorerId, puzzleId);
      
      // For Travel Mode, also award the keepsake
      const puzzle = await storage.getPuzzleById(puzzleId);
      let keepsake = null;
      
      if (puzzle?.mode === 'travel' && progress.keepsakeAwarded) {
        keepsake = await storage.getKeepsakeByPuzzleId(puzzleId);
        
        if (keepsake && tripId) {
          // Check if already collected
          const hasKeepsake = await storage.hasCollectedKeepsake(explorerId, keepsake.id);
          if (!hasKeepsake) {
            await storage.collectKeepsake({
              explorerId,
              keepsakeId: keepsake.id,
              tripId,
              puzzleId,
            });
          }
        }
      }
      
      res.json({ 
        progress, 
        puzzle,
        keepsake,
        starsAwarded: progress.starsAwarded || 0
      });
    } catch (error) {
      console.error("Error completing puzzle:", error);
      res.status(500).json({ message: "Failed to complete puzzle" });
    }
  });

  // Get all completed puzzles for an explorer
  app.get('/api/puzzles/completed/:explorerId', isAuthenticated, async (req: any, res) => {
    try {
      const { explorerId } = req.params;
      
      // Verify explorer belongs to this user
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const completed = await storage.getExplorerCompletedPuzzles(explorerId);
      res.json(completed);
    } catch (error) {
      console.error("Error fetching completed puzzles:", error);
      res.status(500).json({ message: "Failed to fetch completed puzzles" });
    }
  });

  // ============================================================================
  // TRAVEL KEEPSAKES - Collectible rewards from puzzles
  // ============================================================================

  // Get all keepsakes collected by an explorer
  app.get('/api/keepsakes/:explorerId', isAuthenticated, async (req: any, res) => {
    try {
      const { explorerId } = req.params;
      
      // Verify explorer belongs to this user
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const keepsakes = await storage.getExplorerKeepsakes(explorerId);
      res.json(keepsakes);
    } catch (error) {
      console.error("Error fetching keepsakes:", error);
      res.status(500).json({ message: "Failed to fetch keepsakes" });
    }
  });

  // Get keepsakes for a specific trip
  app.get('/api/keepsakes/:explorerId/:tripId', isAuthenticated, travelModeGuard, async (req: any, res) => {
    try {
      const { explorerId, tripId } = req.params;
      
      // Verify explorer belongs to this user
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const keepsakes = await storage.getExplorerKeepsakesByTrip(explorerId, tripId);
      res.json(keepsakes);
    } catch (error) {
      console.error("Error fetching trip keepsakes:", error);
      res.status(500).json({ message: "Failed to fetch keepsakes" });
    }
  });

  // ============================================================================
  // MAP PUZZLE ROUTES - Geography-based shape puzzles
  // ============================================================================
  
  app.get('/api/map-puzzles', async (req, res) => {
    try {
      const puzzles = await storage.getAllMapPuzzles();
      res.json(puzzles);
    } catch (error) {
      console.error("Error fetching map puzzles:", error);
      res.status(500).json({ message: "Failed to fetch map puzzles" });
    }
  });
  
  app.get('/api/map-puzzles/:puzzleId', async (req, res) => {
    try {
      const { puzzleId } = req.params;
      const puzzle = await storage.getMapPuzzleWithRegions(puzzleId);
      
      if (!puzzle) {
        return res.status(404).json({ message: "Map puzzle not found" });
      }
      
      res.json(puzzle);
    } catch (error) {
      console.error("Error fetching map puzzle:", error);
      res.status(500).json({ message: "Failed to fetch map puzzle" });
    }
  });
  
  app.get('/api/map-puzzles/:puzzleId/regions', async (req, res) => {
    try {
      const { puzzleId } = req.params;
      const regions = await storage.getMapPuzzleRegions(puzzleId);
      res.json(regions);
    } catch (error) {
      console.error("Error fetching map puzzle regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });
  
  app.get('/api/map-puzzles/:puzzleId/progress/:explorerId', isAuthenticated, async (req: any, res) => {
    try {
      const { puzzleId, explorerId } = req.params;
      
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.getPlayerMapPuzzleProgress(explorerId, puzzleId);
      res.json(progress || { placedRegionIds: [], isCompleted: false });
    } catch (error) {
      console.error("Error fetching map puzzle progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });
  
  app.post('/api/map-puzzles/:puzzleId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { puzzleId } = req.params;
      const { explorerId, placedRegionIds } = req.body;
      
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const progress = await storage.savePlayerMapPuzzleProgress(explorerId, puzzleId, placedRegionIds);
      res.json(progress);
    } catch (error) {
      console.error("Error saving map puzzle progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });
  
  app.post('/api/map-puzzles/:puzzleId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { puzzleId } = req.params;
      const { explorerId } = req.body;
      
      const userId = req.user.claims.sub;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const puzzle = await storage.getMapPuzzleById(puzzleId);
      const starsAwarded = puzzle?.starsReward || 5;
      
      const progress = await storage.completeMapPuzzle(explorerId, puzzleId, starsAwarded);
      
      // Update explorer's stars
      const currentStars = explorer.starsEarnedTotal || 0;
      await storage.updatePlayerStats(explorerId, {
        starsEarnedTotal: currentStars + starsAwarded
      });
      
      res.json({ progress, starsAwarded });
    } catch (error) {
      console.error("Error completing map puzzle:", error);
      res.status(500).json({ message: "Failed to complete puzzle" });
    }
  });
  
  app.post('/api/map-puzzles/seed', async (req, res) => {
    try {
      const count = await storage.seedMapPuzzles();
      res.json({ message: `Seeded ${count} map puzzles` });
    } catch (error) {
      console.error("Error seeding map puzzles:", error);
      res.status(500).json({ message: "Failed to seed map puzzles" });
    }
  });

  // ============================================================================
  // EXPLORER KIT ROUTES
  // ============================================================================

  app.get('/api/explorer-kit/:playerId', isAuthenticated, async (req: any, res) => {
    try {
      const { playerId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const { getExplorerKitState } = await import("../explorerKit");
      const state = await getExplorerKitState(playerId, userId);
      res.json(state);
    } catch (error) {
      console.error("Error getting explorer kit:", error);
      res.status(500).json({ message: "Failed to get explorer kit" });
    }
  });

  app.post('/api/explorer-kit/:playerId/check-upgrades', isAuthenticated, async (req: any, res) => {
    try {
      const { playerId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const { checkAndApplyUpgrades } = await import("../explorerKit");
      const upgrades = await checkAndApplyUpgrades(playerId, userId);
      res.json({ upgrades });
    } catch (error) {
      console.error("Error checking explorer kit upgrades:", error);
      res.status(500).json({ message: "Failed to check upgrades" });
    }
  });

  app.post('/api/explorer-kit/:playerId/surprise-roll', isAuthenticated, async (req: any, res) => {
    try {
      const { playerId } = req.params;
      const { eventType } = req.body;
      if (!eventType) {
        return res.status(400).json({ message: "eventType is required" });
      }
      const { rollForSurpriseItem } = await import("../explorerKit");
      const surpriseItem = await rollForSurpriseItem(playerId, eventType);
      res.json({ surpriseItem });
    } catch (error) {
      console.error("Error rolling for surprise item:", error);
      res.status(500).json({ message: "Failed to roll for surprise item" });
    }
  });

  // ============================================================================
  // EXPERIENCE [CITY] MODULE ROUTES
  // ============================================================================

  // All major cities for Experience content pre-generation (from database + game cities)
  const ALL_GAME_CITIES = [
    // Original Guess & Go cities
    { city: "Addis Ababa", country: "Ethiopia" },
    { city: "Amsterdam", country: "Netherlands" },
    { city: "Athens", country: "Greece" },
    { city: "Auckland", country: "New Zealand" },
    { city: "Bangkok", country: "Thailand" },
    { city: "Beijing", country: "China" },
    { city: "Berlin", country: "Germany" },
    { city: "Bogotá", country: "Colombia" },
    { city: "Brisbane", country: "Australia" },
    { city: "Buenos Aires", country: "Argentina" },
    { city: "Cairo", country: "Egypt" },
    { city: "Cape Town", country: "South Africa" },
    { city: "Caracas", country: "Venezuela" },
    { city: "Chicago", country: "United States" },
    { city: "Delhi", country: "India" },
    { city: "Dubai", country: "United Arab Emirates" },
    { city: "Fiji", country: "Fiji" },
    { city: "Johannesburg", country: "South Africa" },
    { city: "Lagos", country: "Nigeria" },
    { city: "Lima", country: "Peru" },
    { city: "London", country: "United Kingdom" },
    { city: "Los Angeles", country: "United States" },
    { city: "Madrid", country: "Spain" },
    { city: "Marrakesh", country: "Morocco" },
    { city: "Melbourne", country: "Australia" },
    { city: "Mexico City", country: "Mexico" },
    { city: "Moscow", country: "Russia" },
    { city: "Mumbai", country: "India" },
    { city: "Nairobi", country: "Kenya" },
    { city: "New York", country: "United States" },
    { city: "Paris", country: "France" },
    { city: "Perth", country: "Australia" },
    { city: "Rio de Janeiro", country: "Brazil" },
    { city: "Rome", country: "Italy" },
    { city: "San Francisco", country: "United States" },
    { city: "Santiago", country: "Chile" },
    { city: "Seoul", country: "South Korea" },
    { city: "Singapore", country: "Singapore" },
    { city: "Sydney", country: "Australia" },
    { city: "Tokyo", country: "Japan" },
    { city: "Toronto", country: "Canada" },
    { city: "Vancouver", country: "Canada" },
    { city: "Honolulu", country: "United States" },
    { city: "Hawaii", country: "United States" },
    // Additional major cities from database
    { city: "Abu Dhabi", country: "United Arab Emirates" },
    { city: "Accra", country: "Ghana" },
    { city: "Adelaide", country: "Australia" },
    { city: "Ahmedabad", country: "India" },
    { city: "Almaty", country: "Kazakhstan" },
    { city: "Barcelona", country: "Spain" },
    { city: "Barranquilla", country: "Colombia" },
    { city: "Belém", country: "Brazil" },
    { city: "Busan", country: "South Korea" },
    { city: "Casablanca", country: "Morocco" },
    { city: "Chennai", country: "India" },
    { city: "Copenhagen", country: "Denmark" },
    { city: "Cusco", country: "Peru" },
    { city: "Daegu", country: "South Korea" },
    { city: "Doha", country: "Qatar" },
    { city: "Dublin", country: "Ireland" },
    { city: "Durban", country: "South Africa" },
    { city: "Edinburgh", country: "United Kingdom" },
    { city: "Florence", country: "Italy" },
    { city: "Frankfurt", country: "Germany" },
    { city: "Guadalajara", country: "Mexico" },
    { city: "Guayaquil", country: "Ecuador" },
    { city: "Hanoi", country: "Vietnam" },
    { city: "Ho Chi Minh City", country: "Vietnam" },
    { city: "Houston", country: "United States" },
    { city: "Istanbul", country: "Turkey" },
    { city: "Kaohsiung", country: "Taiwan" },
    { city: "Karachi", country: "Pakistan" },
    { city: "Kigali", country: "Rwanda" },
    { city: "Kolkata", country: "India" },
    { city: "Kyoto", country: "Japan" },
    { city: "Lahore", country: "Pakistan" },
    { city: "Lyon", country: "France" },
    { city: "Manchester", country: "United Kingdom" },
    { city: "Marseille", country: "France" },
    { city: "Medellín", country: "Colombia" },
    { city: "Mombasa", country: "Kenya" },
    { city: "Monterrey", country: "Mexico" },
    { city: "Montreal", country: "Canada" },
    { city: "Munich", country: "Germany" },
    { city: "Nagoya", country: "Japan" },
    { city: "Naples", country: "Italy" },
    { city: "Osaka", country: "Japan" },
    { city: "Oslo", country: "Norway" },
    { city: "Panama City", country: "Panama" },
    { city: "Philadelphia", country: "United States" },
    { city: "Porto", country: "Portugal" },
    { city: "Pune", country: "India" },
    { city: "Recife", country: "Brazil" },
    { city: "Reykjavik", country: "Iceland" },
    { city: "Rosario", country: "Argentina" },
    { city: "Seattle", country: "United States" },
    { city: "Stockholm", country: "Sweden" },
    { city: "Suva", country: "Fiji" },
    { city: "Taipei", country: "Taiwan" },
    { city: "Tunis", country: "Tunisia" },
    { city: "Valparaíso", country: "Chile" },
    { city: "Venice", country: "Italy" },
    { city: "Vienna", country: "Austria" },
    { city: "Washington DC", country: "United States" },
    { city: "Wellington", country: "New Zealand" },
    { city: "Zurich", country: "Switzerland" },
  ];

  // Get status of experience content for all game cities (must be before :destinationName)
  app.get('/api/experience/status', async (req, res) => {
    try {
      const results: { city: string; country: string; hasContent: boolean }[] = [];
      
      for (const { city, country } of ALL_GAME_CITIES) {
        const normalizedName = city.trim().toLowerCase().replace(/\s+/g, ' ');
        const existing = await storage.getExperienceContent(normalizedName);
        results.push({ city, country, hasContent: !!existing });
      }

      const withContent = results.filter(r => r.hasContent).length;
      const missing = results.filter(r => !r.hasContent);

      res.json({
        total: ALL_GAME_CITIES.length,
        withContent,
        missingCount: missing.length,
        missing: missing.map(r => r.city),
        details: results
      });
    } catch (error) {
      console.error("Error checking experience status:", error);
      res.status(500).json({ message: "Failed to check experience status" });
    }
  });

  app.post('/api/experience/generate-all', async (req, res) => {
    try {
      const results: { city: string; status: string }[] = [];
      let generated = 0;
      let skipped = 0;
      let failed = 0;

      for (const { city, country } of ALL_GAME_CITIES) {
        try {
          const normalizedName = city.trim().toLowerCase().replace(/\s+/g, ' ');
          const existing = await storage.getExperienceContent(normalizedName);
          
          if (existing) {
            results.push({ city, status: 'exists' });
            skipped++;
            continue;
          }

          console.log(`[Experience Batch] Generating content for ${city}, ${country}...`);
          const content = await getOrGenerateExperienceContent(city, country);
          
          if (content) {
            results.push({ city, status: 'generated' });
            generated++;
          } else {
            results.push({ city, status: 'failed' });
            failed++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[Experience Batch] Error for ${city}:`, error);
          results.push({ city, status: 'error' });
          failed++;
        }
      }

      res.json({ 
        message: `Batch complete: ${generated} generated, ${skipped} already exist, ${failed} failed`,
        total: ALL_GAME_CITIES.length,
        generated,
        skipped,
        failed,
        results
      });
    } catch (error) {
      console.error("Error in batch experience generation:", error);
      res.status(500).json({ message: "Failed to generate experience content" });
    }
  });

  app.get('/api/experience/:destinationName', async (req, res) => {
    try {
      const { destinationName } = req.params;
      const { country } = req.query;
      const decodedName = decodeURIComponent(destinationName);
      const countryStr = typeof country === 'string' ? country : undefined;
      
      // Use AI to generate content if it doesn't exist
      const content = await getOrGenerateExperienceContent(decodedName, countryStr);
      if (!content) {
        return res.status(404).json({ message: "Could not generate experience content for this destination" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching experience content:", error);
      res.status(500).json({ message: "Failed to fetch experience content" });
    }
  });

  app.get('/api/experience/:destinationName/progress/:explorerId', async (req, res) => {
    try {
      const { destinationName, explorerId } = req.params;
      const progress = await storage.getExperienceProgress(explorerId, decodeURIComponent(destinationName));
      res.json(progress || { 
        foodCultureState: 'not_started',
        hearPlaceState: 'not_started', 
        everydayLifeState: 'not_started'
      });
    } catch (error) {
      console.error("Error fetching experience progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/experience/:destinationName/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { destinationName } = req.params;
      const { explorerId, cardType, state } = req.body;
      
      const userId = req.user!.id;
      const explorer = await storage.getPlayerById(explorerId);
      if (!explorer || explorer.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const decodedDestination = decodeURIComponent(destinationName);
      const existing = await storage.getExperienceProgress(explorerId, decodedDestination);
      
      // Backend validation: prevent completing a card that hasn't been tried yet
      if (state === 'completed') {
        let currentState: string | null = null;
        if (existing) {
          if (cardType === 'food_culture') currentState = existing.foodCultureState;
          else if (cardType === 'hear_place') currentState = existing.hearPlaceState;
          else if (cardType === 'everyday_life') currentState = existing.everydayLifeState;
        }
        
        if (!currentState || currentState === 'not_started') {
          return res.status(400).json({ 
            message: "Cannot complete a card without exploring it first" 
          });
        }
      }
      
      const now = new Date();
      const updates: Record<string, unknown> = {};
      
      if (cardType === 'food_culture') {
        updates.foodCultureState = state;
        if (state === 'tried') updates.foodCultureViewedAt = now;
        if (state === 'completed') updates.foodCultureCompletedAt = now;
      } else if (cardType === 'hear_place') {
        updates.hearPlaceState = state;
        if (state === 'tried') updates.hearPlaceViewedAt = now;
        if (state === 'completed') updates.hearPlaceCompletedAt = now;
      } else if (cardType === 'everyday_life') {
        updates.everydayLifeState = state;
        if (state === 'tried') updates.everydayLifeViewedAt = now;
        if (state === 'completed') updates.everydayLifeCompletedAt = now;
      }

      if (existing) {
        const progress = await storage.updateExperienceProgress(explorerId, decodedDestination, updates);
        res.json(progress);
      } else {
        const progress = await storage.saveExperienceProgress({
          explorerId,
          destinationName: decodedDestination,
          ...updates
        });
        res.json(progress);
      }
    } catch (error) {
      console.error("Error updating experience progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  app.post('/api/experience/seed', async (req, res) => {
    try {
      const count = await storage.seedExperienceContent();
      res.json({ message: `Seeded ${count} experience destinations` });
    } catch (error) {
      console.error("Error seeding experience content:", error);
      res.status(500).json({ message: "Failed to seed experience content" });
    }
  });

  // ============================================================================
  // PLAY TOGETHER ROUTES (Journey Games: Play Together)
  // ============================================================================
  
  app.get('/api/play-together/status', async (req, res) => {
    try {
      const { userId, gameType, date } = req.query;
      if (!userId || !gameType || !date) {
        return res.status(400).json({ message: "Missing required parameters: userId, gameType, date" });
      }
      
      const status = await storage.getPlayTogetherStatus(
        userId as string,
        gameType as string,
        date as string
      );
      res.json(status);
    } catch (error) {
      console.error("Error fetching play together status:", error);
      res.status(500).json({ message: "Failed to fetch play status" });
    }
  });

  app.post('/api/play-together/record', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tripId, gameType, playDate, promptUsed } = req.body;
      if (!userId || !gameType || !playDate || !promptUsed) {
        return res.status(400).json({ message: "Missing required fields: userId, gameType, playDate, promptUsed" });
      }
      
      const record = await storage.recordPlayTogetherPlay(
        userId,
        tripId || null,
        gameType,
        playDate,
        promptUsed
      );
      res.json(record);
    } catch (error) {
      console.error("Error recording play together play:", error);
      res.status(500).json({ message: "Failed to record play" });
    }
  });

  // GeoGuess: Think the Place - AI-powered answers
  app.post('/api/geoguess/answer', async (req, res) => {
    try {
      const { target, question } = req.body;
      if (!target || !question) {
        return res.status(400).json({ message: "Missing target or question" });
      }

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are playing a 20 questions guessing game with a family. The secret place is "${target}". 
Answer yes/no questions about this place honestly but briefly.
You MUST respond with ONLY ONE of these exact words: "Yes", "No", "Sometimes", "Kind of", or "That depends"
Do not add any explanation or additional text. Just the single word answer.`
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const answer = completion.choices[0]?.message?.content?.trim() || "That depends";
      
      // Validate the answer is one of our allowed responses
      const allowedResponses = ["Yes", "No", "Sometimes", "Kind of", "That depends"];
      const normalizedAnswer = allowedResponses.find(
        r => r.toLowerCase() === answer.toLowerCase()
      ) || "That depends";
      
      res.json({ answer: normalizedAnswer });
    } catch (error) {
      console.error("Error getting GeoGuess answer:", error);
      // Return a random fallback response
      const fallbackResponses = ["Yes", "No", "Sometimes", "Kind of", "That depends"];
      const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      res.json({ answer: fallback });
    }
  });

  // ============================================================================
  // ADMIN: WEEKLY METRICS ROUTES (Protected - Admin only)
  // ============================================================================

  app.post('/api/admin/send-weekly-metrics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await logAdminAction(req, userId, 'send_weekly_metrics');
      const result = await sendWeeklyMetricsReport();
      res.json({ success: result, message: result ? 'Weekly metrics sent' : 'Failed to send metrics' });
    } catch (error) {
      console.error("Error sending weekly metrics:", error);
      res.status(500).json({ message: "Failed to send weekly metrics" });
    }
  });

  app.get('/api/admin/metrics-preview', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await logAdminAction(req, userId, 'view_metrics_preview');
      const report = await calculateWeeklyMetricsReport();
      res.json(report);
    } catch (error) {
      console.error("Error calculating metrics:", error);
      res.status(500).json({ message: "Failed to calculate metrics" });
    }
  });

  app.get('/api/admin/day-metrics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await logAdminAction(req, userId, 'view_day_metrics');
      const dateStr = req.query.date as string | undefined;
      const date = dateStr ? new Date(dateStr) : new Date();
      const metrics = await calculateDayMetrics(date);
      res.json(metrics);
    } catch (error) {
      console.error("Error calculating day metrics:", error);
      res.status(500).json({ message: "Failed to calculate day metrics" });
    }
  });

  // ============================================================================
  // ADMIN: PARENT SNAPSHOT EMAIL ROUTES (Protected - Admin only)
  // ============================================================================

  app.post('/api/admin/send-parent-snapshots', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await logAdminAction(req, userId, 'send_parent_snapshots');
      const result = await sendAllParentSnapshots();
      res.json({ 
        success: true, 
        message: `Parent snapshots: ${result.sent} sent, ${result.skipped} skipped, ${result.errors} errors`,
        ...result
      });
    } catch (error) {
      console.error("Error sending parent snapshots:", error);
      res.status(500).json({ message: "Failed to send parent snapshots" });
    }
  });

  app.post('/api/admin/migrate-unified-streaks', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      await logAdminAction(req, userId, 'migrate_unified_streaks');
      const allPlayers = await storage.getAllPlayers();
      let migrated = 0;
      
      for (const player of allPlayers) {
        if (!player.explorerStreak || player.explorerStreak === 0) {
          const bestExistingStreak = Math.max(
            player.dailyQuestStreak || 0,
            player.crossworldStreak || 0
          );
          
          if (bestExistingStreak > 0) {
            const lastDate = player.lastDailyQuestDate || player.crossworldLastPlayed;
            const gameType = (player.dailyQuestStreak || 0) >= (player.crossworldStreak || 0) 
              ? 'daily_quest' 
              : 'crossworld';
            
            await storage.updatePlayerStats(player.id, {
              explorerStreak: bestExistingStreak,
              lastExplorerStreakDate: lastDate || new Date().toDateString(),
              lastExplorerGameType: gameType,
              streakGraceAvailable: true,
              longestExplorerStreak: Math.max(bestExistingStreak, player.longestStreak || 0),
            });
            migrated++;
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: `Migrated ${migrated} players to unified streak system`,
        migrated
      });
    } catch (error) {
      console.error("Error migrating unified streaks:", error);
      res.status(500).json({ message: "Failed to migrate streaks" });
    }
  });

  // ============================================================================
  // PUSH NOTIFICATIONS
  // ============================================================================
  
  app.get('/api/push/vapid-key', (req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return res.status(503).json({ message: 'Push notifications not configured' });
    }
    res.json({ publicKey });
  });
  
  app.post('/api/push/subscribe', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { subscription, playerId, deviceType, browserName } = req.body;
      
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: 'Invalid subscription data' });
      }
      
      const pushSub = await storage.createPushSubscription({
        userId: user.id,
        playerId: playerId || null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        deviceType: deviceType || 'unknown',
        browserName: browserName || null,
        isActive: true,
        dailyQuestReminders: false,
        streakProtectionAlerts: true,
        weeklyProgressUpdates: false,
        monthlyUpdates: true,
        geoAdventuresNotifications: true,
      });
      
      await sendTestNotification(pushSub);
      
      res.json(pushSub);
    } catch (error: any) {
      console.error('[Push] Subscribe error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.delete('/api/push/unsubscribe', isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ message: 'Endpoint required' });
      }
      
      await storage.deletePushSubscriptionByEndpoint(endpoint);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Push] Unsubscribe error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get('/api/push/subscriptions', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const subscriptions = await storage.getPushSubscriptionsByUserId(user.id);
      res.json(subscriptions);
    } catch (error: any) {
      console.error('[Push] Get subscriptions error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.patch('/api/push/subscriptions/:id/preferences', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { dailyQuestReminders, streakProtectionAlerts, weeklyProgressUpdates } = req.body;
      
      const updated = await storage.updatePushSubscription(id, {
        dailyQuestReminders,
        streakProtectionAlerts,
        weeklyProgressUpdates,
      });
      
      if (!updated) {
        return res.status(404).json({ message: 'Subscription not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('[Push] Update preferences error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/push/test', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const subscriptions = await storage.getPushSubscriptionsByUserId(user.id);
      
      if (subscriptions.length === 0) {
        return res.status(404).json({ message: 'No active subscriptions found' });
      }
      
      let sent = 0;
      for (const sub of subscriptions) {
        const success = await sendTestNotification(sub);
        if (success) sent++;
      }
      
      res.json({ success: true, sent, total: subscriptions.length });
    } catch (error: any) {
      console.error('[Push] Test notification error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/push/weekly', async (req, res) => {
    try {
      const result = await sendAllWeeklyPushNotifications();
      res.json({ 
        success: true, 
        message: `Weekly push notifications sent`,
        ...result 
      });
    } catch (error: any) {
      console.error('[Push] Weekly notifications error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // GeoAdventures event-based notifications
  app.post('/api/push/geoadventures', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { type } = req.body;
      
      if (!type || !['trip-begun', 'reengagement', 'memory-created'].includes(type)) {
        return res.status(400).json({ message: 'Invalid notification type. Use: trip-begun, reengagement, or memory-created' });
      }
      
      const result = await sendGeoAdventuresNotification(user.id, type);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[Push] GeoAdventures notification error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // PHYSICAL CARD GAME EARLY ACCESS
  // ============================================================================

  app.get('/api/physical-game/eligibility/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const eligibility = await storage.getPhysicalGameEligibility(userId);
      res.json(eligibility);
    } catch (error: any) {
      console.error('[PhysicalGame] Eligibility check error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public waitlist endpoint - no auth required, just collects email
  app.post('/api/physical-game/join', async (req, res) => {
    try {
      const { userId, name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }
      
      // Validate email format
      if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }
      
      // If userId provided, try to update the user record
      // Otherwise, just add to waitlist by email
      let waitlistNumber: number;
      
      if (userId) {
        const result = await storage.joinPhysicalGameEarlyAccess(userId, name, email);
        waitlistNumber = result.waitlistNumber;
      } else {
        // Get waitlist count for number assignment
        waitlistNumber = await storage.getPhysicalGameWaitlistCount() + 1;
      }
      
      console.log('[PhysicalGame] Waitlist signup:', { name, email, waitlistNumber, hasUserId: !!userId });
      
      // Send emails asynchronously (don't block response)
      (async () => {
        try {
          const { sendPhysicalGameWaitlistConfirmationEmail, sendPhysicalGameWaitlistNotificationEmail } = await import('../email');
          
          // Send confirmation email to user
          await sendPhysicalGameWaitlistConfirmationEmail(email, name);
          console.log('[PhysicalGame] Confirmation email sent to:', email);
          
          // Send notification email to support
          await sendPhysicalGameWaitlistNotificationEmail(name, email, waitlistNumber);
          console.log('[PhysicalGame] Notification email sent to support');
        } catch (emailError) {
          console.error('[PhysicalGame] Email sending error:', emailError);
        }
      })();
      
      res.json({ success: true, waitlistNumber });
    } catch (error: any) {
      console.error('[PhysicalGame] Join error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/physical-game/dismiss', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      const user = req.user as any;
      
      if (userId !== user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      await storage.dismissPhysicalGamePopup(userId);
      
      console.log('[PhysicalGame] User dismissed popup:', { userId });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('[PhysicalGame] Dismiss error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/physical-game/record-impression', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      const user = req.user as any;
      
      if (userId !== user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      await storage.recordPhysicalGamePopupImpression(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[PhysicalGame] Record impression error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============================================================================
  // REVIEWS & FEEDBACK
  // ============================================================================

  app.get('/api/reviews', async (req, res) => {
    try {
      const { mode } = req.query;
      const reviews = await storage.getApprovedReviews(mode as string);
      res.json(reviews);
    } catch (error) {
      console.error('[Reviews] Error fetching reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/reviews', async (req, res) => {
    try {
      const { parentName, childAges, rating, reviewText, modeTag, userId } = req.body;
      
      if (!parentName || !reviewText || !modeTag) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const reviewRating = rating || 5;
      if (reviewRating < 1 || reviewRating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      
      // Auto-approve 4-5 star reviews, require approval for 1-3 stars
      const isAutoApproved = reviewRating >= 4;
      
      const review = await storage.createParentReview({
        parentName,
        childAges,
        rating: reviewRating,
        reviewText,
        modeTag,
        userId: userId || null,
      }, isAutoApproved);
      
      console.log('[Reviews] New review submitted:', { parentName, modeTag, rating: reviewRating, autoApproved: isAutoApproved });
      
      // Send different email based on rating
      if (isAutoApproved) {
        sendReviewNotification({
          parentName,
          childAges,
          rating: reviewRating,
          reviewText,
          modeTag,
          userId,
        }).catch(err => console.error('[Reviews] Failed to send email notification:', err));
      } else {
        // Negative review - send special email with approve/reject options
        sendNegativeReviewNotification({
          parentName,
          childAges,
          rating: reviewRating,
          reviewText,
          modeTag,
          userId,
          reviewId: review.id,
        }).catch(err => console.error('[Reviews] Failed to send negative review notification:', err));
      }
      
      res.status(201).json({ success: true, review, isAutoApproved });
    } catch (error) {
      console.error('[Reviews] Error submitting review:', error);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  app.get('/api/admin/reviews', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error) {
      console.error('[Reviews] Error fetching all reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/admin/reviews/:reviewId/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { reviewId } = req.params;
      const review = await storage.approveReview(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      console.log('[Reviews] Review approved:', reviewId);
      res.json({ success: true, review });
    } catch (error) {
      console.error('[Reviews] Error approving review:', error);
      res.status(500).json({ message: 'Failed to approve review' });
    }
  });

  // Email-based approval endpoint for negative reviews (uses secret token instead of session auth)
  app.get('/api/admin/reviews/:reviewId/approve-from-email', async (req: any, res) => {
    try {
      const { reviewId } = req.params;
      const { action, token } = req.query;
      
      // Verify secret token to allow approval from email without login
      const expectedToken = process.env.REVIEW_APPROVAL_SECRET || 'geoquest-review-approval-2026';
      if (token !== expectedToken) {
        return res.status(401).send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #FEF3C7;">
              <h1 style="color: #D97706;">⚠️ Unauthorized</h1>
              <p>This approval link has expired or is invalid.</p>
              <a href="/" style="color: #3B82F6;">Return to GeoQuest</a>
            </body>
          </html>
        `);
      }
      
      if (action === 'approve') {
        const review = await storage.approveReview(reviewId);
        if (!review) {
          return res.status(404).send('<h1>Review not found</h1>');
        }
        console.log('[Reviews] Review approved via email:', reviewId);
        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #D1FAE5;">
              <h1 style="color: #10B981;">✓ Review Approved!</h1>
              <p>The review has been published to the Reviews page.</p>
              <a href="/" style="color: #3B82F6;">Return to GeoQuest</a>
            </body>
          </html>
        `);
      } else if (action === 'reject') {
        await storage.deleteReview(reviewId);
        console.log('[Reviews] Review rejected via email:', reviewId);
        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #FEE2E2;">
              <h1 style="color: #EF4444;">✕ Review Rejected</h1>
              <p>The review has been removed and will not be published.</p>
              <a href="/" style="color: #3B82F6;">Return to GeoQuest</a>
            </body>
          </html>
        `);
      } else {
        return res.status(400).send('<h1>Invalid action</h1>');
      }
    } catch (error) {
      console.error('[Reviews] Error processing email action:', error);
      res.status(500).send('<h1>Error processing request</h1>');
    }
  });

  app.post('/api/feedback', async (req, res) => {
    try {
      const { feedbackArea, feedbackSubarea, feedbackText, screenshotUrl, userId, userEmail } = req.body;
      
      if (!feedbackArea) {
        return res.status(400).json({ message: 'Feedback area is required' });
      }
      
      const feedback = await storage.createUserFeedback({
        feedbackArea,
        feedbackSubarea,
        feedbackText,
        screenshotUrl,
        userId: userId || null,
        userEmail: userEmail || null,
      });
      
      console.log('[Feedback] New feedback submitted:', { feedbackArea, feedbackSubarea, userEmail });
      
      sendFeedbackNotification({
        feedbackArea,
        feedbackSubarea,
        feedbackText,
        userId,
        userEmail,
      }).catch(err => console.error('[Feedback] Failed to send email notification:', err));
      
      res.status(201).json({ success: true, feedback });
    } catch (error) {
      console.error('[Feedback] Error submitting feedback:', error);
      res.status(500).json({ message: 'Failed to submit feedback' });
    }
  });

  app.get('/api/admin/feedback', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      console.error('[Feedback] Error fetching feedback:', error);
      res.status(500).json({ message: 'Failed to fetch feedback' });
    }
  });

  app.post('/api/admin/feedback/:feedbackId/read', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { feedbackId } = req.params;
      const feedback = await storage.markFeedbackRead(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }
      
      res.json({ success: true, feedback });
    } catch (error) {
      console.error('[Feedback] Error marking feedback read:', error);
      res.status(500).json({ message: 'Failed to mark feedback read' });
    }
  });

  app.get('/api/city-templates/list', async (_req: any, res) => {
    try {
      const templates = await storage.getAllCityAdventureTemplates();
      res.json(templates.map(t => ({
        citySlug: t.citySlug,
        cityName: t.cityName,
        country: t.country,
        continent: t.continent,
        stopCount: t.stopCount,
      })));
    } catch (error) {
      console.error('[CityTemplates] Error fetching list:', error);
      res.status(500).json({ message: 'Failed to fetch city templates' });
    }
  });

  app.get('/api/admin/city-templates', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const templates = await storage.getAllCityAdventureTemplates();
      res.json({ templates: templates.map(t => ({ id: t.id, citySlug: t.citySlug, cityName: t.cityName, country: t.country, stopCount: t.stopCount, generatedAt: t.generatedAt })) });
    } catch (error) {
      console.error('[Admin] Error fetching city templates:', error);
      res.status(500).json({ message: 'Failed to fetch city templates' });
    }
  });

  app.post('/api/admin/generate-city-template', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { citySlug, cityName, country, continent } = req.body;
      if (!citySlug || !cityName || !country) {
        return res.status(400).json({ message: 'citySlug, cityName, and country are required' });
      }

      console.log(`🏗️ [Template] Generating template for ${cityName}, ${country}...`);

      const openai = getOpenAI();
      let lat: string | undefined;
      let lon: string | undefined;
      try {
        const geoResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a geography expert. Return ONLY a JSON object with 'lat' and 'lon' for the given city/destination." },
            { role: "user", content: `Find coordinates for: ${cityName}, ${country}` }
          ],
          response_format: { type: "json_object" }
        });
        const coords = JSON.parse(geoResponse.choices[0].message.content || "{}");
        if (coords.lat && coords.lon) { lat = String(coords.lat); lon = String(coords.lon); }
      } catch (e) { console.error("Error fetching coordinates for template:", e); }

      const { generateCityStops, generateArtifactsForStops } = await import("../travelContent");
      const stops = await generateCityStops(cityName, null, country, 5, 'family_explorer');
      const keepsakes = await generateArtifactsForStops(
        stops.map(s => ({ name: s.name, stopType: s.stopType })),
        cityName
      );

      const template = await storage.upsertCityAdventureTemplate({
        citySlug,
        cityName,
        country,
        continent: continent || null,
        latitude: lat || null,
        longitude: lon || null,
        stopCount: stops.length,
        adventureStyle: 'family_explorer',
        stopsData: stops,
        keepsakesData: keepsakes,
      });

      console.log(`✅ [Template] Generated template for ${cityName}: ${stops.length} stops, ${keepsakes.length} keepsakes`);
      res.json({ success: true, template: { id: template.id, citySlug: template.citySlug, cityName: template.cityName, stopCount: stops.length, keepsakeCount: keepsakes.length } });
    } catch (error) {
      console.error('[Admin] Error generating city template:', error);
      res.status(500).json({ message: 'Failed to generate city template' });
    }
  });

  app.post('/api/admin/generate-all-city-templates', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { refresh } = req.body || {};
      const LOCATION_CARDS: Array<{ id: string; city: string; country: string; continent: string }> = (await import("../client/src/lib/gameData")).LOCATION_CARDS;
      const existingTemplates = await storage.getAllCityAdventureTemplates();
      const existingSlugs = new Set(existingTemplates.map(t => t.citySlug));

      const citiesToGenerate = refresh
        ? LOCATION_CARDS
        : LOCATION_CARDS.filter(c => !existingSlugs.has(c.id));

      const skipped = LOCATION_CARDS.length - citiesToGenerate.length;
      console.log(`🏗️ [Template] Batch generating ${citiesToGenerate.length} templates (${skipped} skipped, refresh=${!!refresh})...`);

      res.json({
        success: true,
        message: refresh
          ? `Regenerating all ${citiesToGenerate.length} templates in background.`
          : `Generating ${citiesToGenerate.length} new templates in background. ${skipped} already exist.`,
        total: LOCATION_CARDS.length,
        existing: existingSlugs.size,
        toGenerate: citiesToGenerate.length,
        refresh: !!refresh,
      });

      const { generateCityStops, generateArtifactsForStops } = await import("../travelContent");
      const openai = getOpenAI();

      for (const city of citiesToGenerate) {
        try {
          console.log(`🏗️ [Template] Generating: ${city.city}, ${city.country}...`);

          let lat: string | undefined;
          let lon: string | undefined;
          try {
            const geoResponse = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "You are a geography expert. Return ONLY a JSON object with 'lat' and 'lon' for the given city/destination." },
                { role: "user", content: `Find coordinates for: ${city.city}, ${city.country}` }
              ],
              response_format: { type: "json_object" }
            });
            const coords = JSON.parse(geoResponse.choices[0].message.content || "{}");
            if (coords.lat && coords.lon) { lat = String(coords.lat); lon = String(coords.lon); }
          } catch (e) { console.error(`Error fetching coords for ${city.city}:`, e); }

          const stops = await generateCityStops(city.city, null, city.country, 5, 'family_explorer');
          const keepsakes = await generateArtifactsForStops(
            stops.map(s => ({ name: s.name, stopType: s.stopType })),
            city.city
          );

          await storage.upsertCityAdventureTemplate({
            citySlug: city.id,
            cityName: city.city,
            country: city.country,
            continent: city.continent || null,
            latitude: lat || null,
            longitude: lon || null,
            stopCount: stops.length,
            adventureStyle: 'family_explorer',
            stopsData: stops,
            keepsakesData: keepsakes,
          });

          console.log(`✅ [Template] ${city.city}: ${stops.length} stops, ${keepsakes.length} keepsakes`);
          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          console.error(`❌ [Template] Failed for ${city.city}:`, err);
        }
      }
      console.log(`🎉 [Template] Batch generation complete!`);
    } catch (error) {
      console.error('[Admin] Error batch generating templates:', error);
      res.status(500).json({ message: 'Failed to batch generate templates' });
    }
  });

  // Compass Quest: Generate custom quest from city list
  app.post('/api/compass/generate-quest', async (req, res) => {
    try {
      const { cities, startCity } = req.body;
      if (!Array.isArray(cities) || cities.length < 4 || cities.length > 8) {
        return res.status(400).json({ error: 'Quest requires 4 to 8 cities' });
      }
      const openai = getOpenAI();
      const cityList = cities.join(', ');
      const start = startCity || 'Washington DC';
      const citySequence = [start, ...cities].map((c, i) => i === 0 ? `${c} (start)` : `${i}. ${c}`).join(', ');
      const totalSteps = cities.length;
      const prompt = `You are writing an immersive children's geography adventure called "The Lost Crown".

QUEST CONTEXT:
A long time ago, a powerful crown was broken and scattered across the world — not to hide it, but to protect something far more important. Each piece was hidden in places full of life, history, and meaning, so only a true explorer could bring it back together.

The adventurer STARTS in: ${start}
They must visit these cities IN ORDER: ${cityList}
Full journey: ${citySequence}
Total steps: ${totalSteps}

Generate EXACTLY ${totalSteps} steps in this JSON structure:
{
  "quest_title": "The Lost Crown",
  "steps": [
    {
      "city": "<destination city>",
      "story_beat": "<immersive narrative — FOLLOW THE TEMPLATE BELOW EXACTLY>",
      "clue_type": "<one of: landmark, flag, text>",
      "clue": "<riddle clue hinting at DESTINATION city — NEVER name destination city>",
      "options": ["<correct city>", "<distractor 1>", "<distractor 2>", "<distractor 3>"],
      "correct_answer": "<destination city>",
      "direction": "<compass bearing: North/Northeast/East/Southeast/South/Southwest/West/Northwest>",
      "compass_clue": "<short directional hint, no city names>",
      "fun_fact": "<fun fact about DESTINATION city, max 20 words>",
      "artifact": "crown_fragment"
    }
  ]
}

STORY_BEAT TEMPLATE — every step MUST follow this format using \\n\\n between lines:

STEP 1 (source = ${start}):
"You arrive in ${start}.\\n\\n[2–3 vivid sensory lines: energy, atmosphere, what makes this city feel alive and unique]\\n\\nSomething feels… off.\\n\\nNot wrong.\\n\\nHidden.\\n\\n—\\n\\nLook closely.\\n\\nThere — something unusual.\\n\\nA marking. A symbol. Not part of the city.\\n\\n—\\n\\nAs you step closer, the map reacts.\\n\\nLines shift.\\n\\nSomething is revealing itself.\\n\\n—\\n\\nThis is where it begins.\\n\\nWhat does it show?"

STEPS 2 to ${totalSteps - 1} (MIDDLE STEPS — tone: curiosity → realization):
"You arrive in [CURRENT SOURCE CITY].\\n\\n[2–3 vivid lines about this city — make it feel alive and real]\\n\\n—\\n\\nAs you place the newly found piece into the map…\\n\\nDid you notice that?\\n\\nSomething just changed.\\n\\n—\\n\\nThe map reacts.\\n\\nNot randomly.\\n\\nDeliberately.\\n\\n—\\n\\nAn image begins to form.\\n\\nFaint at first…\\n\\nThen clearer.\\n\\n—\\n\\nLook closely.\\n\\nWhat could this be?"

STEP ${totalSteps} (FINAL STEP — tone: clarity, completion):
"You arrive in [FINAL SOURCE CITY].\\n\\n[2–3 lines — this is the last stop, make it feel significant and grand]\\n\\n—\\n\\nThe final piece is now in place.\\n\\n—\\n\\nEverything stops.\\n\\nNo movement.\\n\\nNo flicker.\\n\\n—\\n\\nThen…\\n\\nThe map responds.\\n\\n—\\n\\nNot with another clue.\\n\\nBut with completion.\\n\\n—\\n\\nLook.\\n\\nDo you see it?\\n\\nAll the pieces…\\n\\nThey're finally coming together."

TONE PROGRESSION:
- Steps 1–2: curiosity ("Something is happening")
- Steps 3–${Math.max(3, totalSteps - 2)}: realization ("This isn't random…")
- Final 2 steps: clarity ("It's forming something… It's complete.")

CRITICAL RULES:
1. story_beat source city = the city the adventurer IS IN RIGHT NOW (for step 1 = ${start}, for step 2 = step 1's destination, etc). NEVER name the DESTINATION in story_beat
2. clue = riddle about DESTINATION — NEVER name destination in clue text. Use descriptive hints about landmarks, food, culture, geography. FORBIDDEN: city name, country name, capital city name, or any proper noun that directly identifies the destination.
3. compass_clue = directional hint ONLY — no city names, no country names, no proper nouns
4. Use \\n\\n between every beat/line in story_beat (short punchy lines like the template)
5. options = 4 cities from 4 DIFFERENT COUNTRIES: correct destination first, then 3 distractors
6. direction = real geographic compass bearing from SOURCE to DESTINATION
7. Alternate clue_type: landmark → flag → text → landmark (start with landmark)
8. All content for children ages 8–14
9. NEVER put two cities from the same country in options[] — all 4 must be from different countries
10. Return ONLY valid JSON
ANTI-SPOILER CHECK: Before returning, verify each clue does NOT contain the destination city name or any obvious identifying name. If it does, rewrite the clue.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 8000,
        temperature: 0.65,
      });

      const content = completion.choices[0]?.message?.content;
      const finishReason = completion.choices[0]?.finish_reason;
      console.log(`[CompassQuest] finish_reason=${finishReason}, content length=${content?.length ?? 0}, cities=${cities.length}`);
      if (!content) {
        return res.status(500).json({ error: 'No response from AI' });
      }
      if (finishReason === 'length') {
        console.error('[CompassQuest] Response truncated — token budget too low. cities:', cities.length);
        return res.status(500).json({ error: 'AI response truncated — please try with fewer cities' });
      }

      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(content);
      } catch (parseErr) {
        console.error('[CompassQuest] JSON parse error:', parseErr, 'content snippet:', content?.slice(0, 400));
        return res.status(500).json({ error: 'AI returned unparseable JSON' });
      }

      const VALID_DIRECTIONS = new Set(['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest']);
      const VALID_CLUE_TYPES = new Set(['landmark', 'flag', 'text']);

      if (!raw.quest_title || !Array.isArray(raw.steps) || raw.steps.length < 4) {
        console.error('[CompassQuest] Malformed AI response — steps:', raw.steps?.length, 'expected:', cities.length, 'raw:', JSON.stringify(raw).slice(0, 500));
        return res.status(500).json({ error: 'AI returned malformed quest data' });
      }
      // If AI returned wrong number of steps, trim or pad to match cities
      if (raw.steps.length > cities.length) raw.steps = raw.steps.slice(0, cities.length);
      while (raw.steps.length < cities.length) raw.steps.push(raw.steps[raw.steps.length - 1]);

      // City → country code map for enforcing diverse options
      const CITY_COUNTRY: Record<string, string> = {
        'barcelona': 'es', 'madrid': 'es', 'valencia': 'es', 'seville': 'es', 'bilbao': 'es',
        'rio de janeiro': 'br', 'são paulo': 'br', 'sao paulo': 'br', 'brasilia': 'br', 'salvador': 'br',
        'london': 'gb', 'manchester': 'gb', 'edinburgh': 'gb', 'birmingham': 'gb',
        'paris': 'fr', 'marseille': 'fr', 'lyon': 'fr', 'nice': 'fr',
        'berlin': 'de', 'munich': 'de', 'hamburg': 'de', 'frankfurt': 'de',
        'rome': 'it', 'milan': 'it', 'florence': 'it', 'venice': 'it', 'naples': 'it',
        'new york': 'us', 'los angeles': 'us', 'chicago': 'us', 'san francisco': 'us', 'miami': 'us', 'las vegas': 'us', 'seattle': 'us', 'boston': 'us', 'washington dc': 'us', 'washington': 'us',
        'tokyo': 'jp', 'osaka': 'jp', 'kyoto': 'jp', 'hiroshima': 'jp',
        'beijing': 'cn', 'shanghai': 'cn', 'guangzhou': 'cn', 'chengdu': 'cn', 'shenzhen': 'cn',
        'hong kong': 'hk',
        'sydney': 'au', 'melbourne': 'au', 'brisbane': 'au', 'perth': 'au',
        'mumbai': 'in', 'delhi': 'in', 'new delhi': 'in', 'bangalore': 'in', 'kolkata': 'in', 'chennai': 'in',
        'toronto': 'ca', 'vancouver': 'ca', 'montreal': 'ca', 'ottawa': 'ca',
        'buenos aires': 'ar', 'cordoba': 'ar', 'rosario': 'ar',
        'santiago': 'cl', 'valparaíso': 'cl',
        'bogota': 'co', 'medellín': 'co', 'cartagena': 'co', 'medellin': 'co',
        'lima': 'pe', 'cusco': 'pe',
        'caracas': 've',
        'mexico city': 'mx', 'guadalajara': 'mx', 'cancun': 'mx', 'monterrey': 'mx',
        'lisbon': 'pt', 'porto': 'pt',
        'istanbul': 'tr', 'ankara': 'tr',
        'dubai': 'ae', 'abu dhabi': 'ae',
        'riyadh': 'sa', 'jeddah': 'sa',
        'cairo': 'eg', 'alexandria': 'eg',
        'cape town': 'za', 'johannesburg': 'za', 'durban': 'za',
        'lagos': 'ng', 'abuja': 'ng',
        'nairobi': 'ke', 'mombasa': 'ke',
        'addis ababa': 'et',
        'casablanca': 'ma', 'marrakech': 'ma',
        'bangkok': 'th', 'chiang mai': 'th',
        'hanoi': 'vn', 'ho chi minh city': 'vn',
        'seoul': 'kr', 'busan': 'kr',
        'singapore': 'sg',
        'jakarta': 'id', 'bali': 'id',
        'kuala lumpur': 'my', 'penang': 'my',
        'manila': 'ph', 'cebu': 'ph',
        'moscow': 'ru', 'saint petersburg': 'ru', 'st. petersburg': 'ru',
        'amsterdam': 'nl', 'rotterdam': 'nl',
        'brussels': 'be', 'bruges': 'be',
        'zurich': 'ch', 'geneva': 'ch', 'bern': 'ch',
        'stockholm': 'se', 'gothenburg': 'se',
        'oslo': 'no', 'bergen': 'no',
        'copenhagen': 'dk',
        'helsinki': 'fi',
        'warsaw': 'pl', 'krakow': 'pl',
        'prague': 'cz',
        'vienna': 'at', 'salzburg': 'at',
        'athens': 'gr', 'thessaloniki': 'gr',
        'tel aviv': 'il', 'jerusalem': 'il',
        'amman': 'jo',
        'tehran': 'ir',
        'karachi': 'pk', 'lahore': 'pk',
        'dhaka': 'bd',
        'colombo': 'lk',
        'kathmandu': 'np',
        'auckland': 'nz', 'wellington': 'nz', 'christchurch': 'nz',
        'reykjavik': 'is',
        'havana': 'cu',
        'kingston': 'jm',
        'san juan': 'pr',
        'accra': 'gh',
        'dakar': 'sn',
        'tunis': 'tn',
        'algiers': 'dz',
        'tripoli': 'ly',
        'khartoum': 'sd',
        'kampala': 'ug',
        'dar es salaam': 'tz',
        'lusaka': 'zm',
        'harare': 'zw',
        'antananarivo': 'mg',
        'taipei': 'tw',
        'ulaanbaatar': 'mn',
        'tashkent': 'uz',
        'almaty': 'kz',
        'baku': 'az',
        'tbilisi': 'ge',
        'yerevan': 'am',
        'beirut': 'lb',
        'baghdad': 'iq',
        'tehran': 'ir',
        'kabul': 'af',
        'islamabad': 'pk',
        'colombo': 'lk',
        'yangon': 'mm',
        'phnom penh': 'kh',
        'vientiane': 'la',
        'jakarta': 'id',
        'suva': 'fj',
        'nadi': 'fj',
        'quito': 'ec',
      };
      const DIVERSE_FALLBACK: string[] = ['Cairo', 'Seoul', 'Toronto', 'Lagos', 'Melbourne', 'Nairobi', 'Bangkok', 'Lisbon', 'Oslo', 'Cape Town'];
      const dedupeOptions = (options: string[], correctCity: string): string[] => {
        const result: string[] = [];
        const seenCountries = new Set<string>();
        const getCountry = (c: string) => CITY_COUNTRY[c.toLowerCase()] || `_unique_${c.toLowerCase()}`;
        // Always keep correct answer first
        const correct = options[0] ?? correctCity;
        result.push(correct);
        seenCountries.add(getCountry(correct));
        for (const city of options.slice(1)) {
          const country = getCountry(city);
          if (!seenCountries.has(country)) {
            seenCountries.add(country);
            result.push(city);
          }
        }
        // Fill remaining slots from fallback pool
        for (const fb of DIVERSE_FALLBACK) {
          if (result.length >= 4) break;
          const country = getCountry(fb);
          if (!seenCountries.has(country) && !result.includes(fb)) {
            seenCountries.add(country);
            result.push(fb);
          }
        }
        return result.slice(0, 4);
      };

      const sanitizeQuestClue = (text: string, destination: string, opts: string[]): string => {
        if (!text) return text;
        let out = text;
        for (const name of [destination, ...opts].filter(Boolean)) {
          const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`\\b${esc}\\b`, 'gi');
          if (re.test(out)) {
            console.warn(`[CompassQuest] Spoiler in clue: "${name}" — sanitizing`);
            out = out.replace(new RegExp(`\\b${esc}\\b`, 'gi'), 'this hidden city');
          }
        }
        return out;
      };
      const validatedSteps = raw.steps.map((step: Record<string, unknown>, i: number) => {
        const rawOptions: string[] = Array.isArray(step.options) && step.options.length === 4 ? step.options as string[] : [cities[i], 'Paris', 'Tokyo', 'Cairo'];
        const correctCity = typeof step.correct_answer === 'string' ? step.correct_answer : cities[i];
        const safeOptions = dedupeOptions(rawOptions, correctCity);
        const rawClue = typeof step.clue === 'string' ? step.clue : `Find the city with famous landmarks.`;
        const rawCompassClue = typeof step.compass_clue === 'string' ? step.compass_clue : `Head to the next city.`;
        return {
          city: typeof step.city === 'string' ? step.city : cities[i],
          story_beat: typeof step.story_beat === 'string' ? step.story_beat : '',
          clue_type: VALID_CLUE_TYPES.has(step.clue_type as string) ? step.clue_type : ['landmark', 'flag', 'text'][i % 3],
          clue: sanitizeQuestClue(rawClue, correctCity, safeOptions),
          options: safeOptions,
          correct_answer: correctCity,
          direction: VALID_DIRECTIONS.has(step.direction as string) ? step.direction : 'East',
          compass_clue: sanitizeQuestClue(rawCompassClue, correctCity, safeOptions),
          fun_fact: typeof step.fun_fact === 'string' ? step.fun_fact : `This is a fascinating city.`,
          artifact: 'crown_fragment',
        };
      });

      res.json({ quest_title: raw.quest_title, steps: validatedSteps });
    } catch (error) {
      console.error('Quest generation error:', error);
      res.status(500).json({ error: 'Failed to generate quest' });
    }
  });

  // ============================================================================
  // COMPASS QUEST SHARED VALIDATION HELPERS
  // ============================================================================

  const COMPASS_VALID_DIRECTIONS = new Set(['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest']);
  const COMPASS_VALID_CLUE_TYPES = new Set(['landmark', 'flag', 'text']);
  const COMPASS_CITY_COUNTRY: Record<string, string> = {
    'barcelona': 'es', 'madrid': 'es', 'valencia': 'es', 'seville': 'es', 'bilbao': 'es',
    'rio de janeiro': 'br', 'são paulo': 'br', 'sao paulo': 'br', 'brasilia': 'br', 'salvador': 'br',
    'london': 'gb', 'manchester': 'gb', 'edinburgh': 'gb', 'birmingham': 'gb',
    'paris': 'fr', 'marseille': 'fr', 'lyon': 'fr', 'nice': 'fr',
    'berlin': 'de', 'munich': 'de', 'hamburg': 'de', 'frankfurt': 'de',
    'rome': 'it', 'milan': 'it', 'florence': 'it', 'venice': 'it', 'naples': 'it',
    'new york': 'us', 'los angeles': 'us', 'chicago': 'us', 'san francisco': 'us', 'miami': 'us', 'las vegas': 'us', 'seattle': 'us', 'boston': 'us', 'washington dc': 'us', 'washington': 'us',
    'tokyo': 'jp', 'osaka': 'jp', 'kyoto': 'jp', 'hiroshima': 'jp',
    'beijing': 'cn', 'shanghai': 'cn', 'guangzhou': 'cn', 'chengdu': 'cn', 'shenzhen': 'cn',
    'hong kong': 'hk',
    'sydney': 'au', 'melbourne': 'au', 'brisbane': 'au', 'perth': 'au',
    'mumbai': 'in', 'delhi': 'in', 'new delhi': 'in', 'bangalore': 'in', 'kolkata': 'in', 'chennai': 'in',
    'toronto': 'ca', 'vancouver': 'ca', 'montreal': 'ca', 'ottawa': 'ca', 'quebec city': 'ca',
    'buenos aires': 'ar', 'cordoba': 'ar', 'rosario': 'ar',
    'santiago': 'cl', 'valparaíso': 'cl',
    'bogota': 'co', 'medellín': 'co', 'cartagena': 'co', 'medellin': 'co',
    'lima': 'pe', 'cusco': 'pe',
    'caracas': 've',
    'mexico city': 'mx', 'guadalajara': 'mx', 'cancun': 'mx', 'monterrey': 'mx',
    'havana': 'cu', 'nairobi': 'ke', 'cape town': 'za', 'johannesburg': 'za', 'durban': 'za',
    'cairo': 'eg', 'giza': 'eg', 'alexandria': 'eg',
    'casablanca': 'ma', 'marrakech': 'ma', 'fez': 'ma',
    'lagos': 'ng', 'abuja': 'ng', 'accra': 'gh', 'dakar': 'sn',
    'istanbul': 'tr', 'ankara': 'tr', 'izmir': 'tr',
    'moscow': 'ru', 'saint petersburg': 'ru', 'st. petersburg': 'ru',
    'dubai': 'ae', 'abu dhabi': 'ae',
    'riyadh': 'sa', 'jeddah': 'sa',
    'tel aviv': 'il', 'jerusalem': 'il',
    'bangkok': 'th', 'chiang mai': 'th', 'phuket': 'th',
    'singapore': 'sg', 'jakarta': 'id', 'bali': 'id',
    'kuala lumpur': 'my', 'penang': 'my',
    'manila': 'ph', 'cebu': 'ph',
    'hanoi': 'vn', 'ho chi minh city': 'vn',
    'seoul': 'kr', 'busan': 'kr',
    'auckland': 'nz', 'wellington': 'nz', 'christchurch': 'nz',
    'colombo': 'lk', 'mumbai': 'in',
  };
  const COMPASS_DIVERSE_FALLBACK: string[] = ['Cairo', 'Seoul', 'Toronto', 'Lagos', 'Melbourne', 'Nairobi', 'Bangkok', 'Lisbon', 'Oslo', 'Cape Town'];

  function compassDedupeOptions(options: string[], correctCity: string): string[] {
    const result: string[] = [];
    const seenCountries = new Set<string>();
    const getCountry = (c: string) => COMPASS_CITY_COUNTRY[c.toLowerCase()] || `_unique_${c.toLowerCase()}`;
    const correct = options[0] ?? correctCity;
    result.push(correct);
    seenCountries.add(getCountry(correct));
    for (const city of options.slice(1)) {
      const country = getCountry(city);
      if (!seenCountries.has(country)) {
        seenCountries.add(country);
        result.push(city);
      }
    }
    for (const fb of COMPASS_DIVERSE_FALLBACK) {
      if (result.length >= 4) break;
      const country = getCountry(fb);
      if (!seenCountries.has(country) && !result.includes(fb)) {
        seenCountries.add(country);
        result.push(fb);
      }
    }
    return result.slice(0, 4);
  }

  function sanitizeClueText(text: string, destinationCity: string, options: string[]): string {
    if (!text) return text;
    let result = text;
    const forbidden = [destinationCity, ...options].filter(Boolean);
    for (const name of forbidden) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'gi');
      if (re.test(result)) {
        console.warn(`[CompassQuest] Clue spoiler detected: "${name}" found in clue — sanitizing`);
        result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), 'this hidden city');
      }
    }
    return result;
  }

  function validateCompassQuestSteps(rawSteps: unknown[], cities: string[]): Record<string, unknown>[] {
    return (rawSteps as Record<string, unknown>[]).map((step, i) => {
      const rawOptions: string[] = Array.isArray(step.options) && step.options.length === 4 ? step.options as string[] : [cities[i] ?? 'Paris', 'Paris', 'Tokyo', 'Cairo'];
      const correctCity = typeof step.correct_answer === 'string' ? step.correct_answer : (cities[i] ?? 'Paris');
      const safeOptions = compassDedupeOptions(rawOptions, correctCity);
      const rawClue = typeof step.clue === 'string' ? step.clue : 'Find the city with famous landmarks.';
      const rawCompassClue = typeof step.compass_clue === 'string' ? step.compass_clue : 'Head to the next city.';
      return {
        city: typeof step.city === 'string' ? step.city : (cities[i] ?? 'Paris'),
        story_beat: typeof step.story_beat === 'string' ? step.story_beat : '',
        clue_type: COMPASS_VALID_CLUE_TYPES.has(step.clue_type as string) ? step.clue_type : ['landmark', 'flag', 'text'][i % 3],
        clue: sanitizeClueText(rawClue, correctCity, safeOptions),
        options: safeOptions,
        correct_answer: correctCity,
        direction: COMPASS_VALID_DIRECTIONS.has(step.direction as string) ? step.direction : 'East',
        compass_clue: sanitizeClueText(rawCompassClue, correctCity, safeOptions),
        fun_fact: typeof step.fun_fact === 'string' ? step.fun_fact : 'This is a fascinating city.',
        artifact: 'crown_fragment',
      };
    });
  }

  // ============================================================================
  // COMPASS RANDOM QUEST TEMPLATES
  // ============================================================================

  const RANDOM_QUEST_TEMPLATES = [
    {
      templateName: "The Eastern Expedition",
      startCity: "Chicago",
      cities: ["Paris", "Rome", "Istanbul", "Mumbai", "Moscow", "Beijing", "Manila", "Sydney"],
    },
    {
      templateName: "The Southern Cross",
      startCity: "Chicago",
      cities: ["Moscow", "Tokyo", "Bali", "Auckland", "Jakarta", "Colombo", "Cairo", "Cape Town"],
    },
    {
      templateName: "The Atlantic Circuit",
      startCity: "Los Angeles",
      cities: ["Washington DC", "New York", "Quebec City", "London", "Madrid", "Buenos Aires", "Santiago", "Giza"],
    },
    {
      templateName: "The African Safari",
      startCity: "Chicago",
      cities: ["Casablanca", "Nairobi", "Johannesburg", "Santiago", "Lima", "Havana", "Mexico City", "Seattle"],
    },
  ];

  async function generateQuestDataForTemplate(cities: string[], startCity: string): Promise<Record<string, unknown>> {
    const openai = getOpenAI();
    const cityList = cities.join(', ');
    const citySequence = [startCity, ...cities].map((c, i) => i === 0 ? `${c} (start)` : `${i}. ${c}`).join(', ');
    const totalSteps = cities.length;
    const prompt = `You are writing an immersive children's geography adventure called "The Lost Crown".

QUEST CONTEXT:
A long time ago, a powerful crown was broken and scattered across the world — not to hide it, but to protect something far more important. Each piece was hidden in places full of life, history, and meaning, so only a true explorer could bring it back together.

The adventurer STARTS in: ${startCity}
They must visit these cities IN ORDER: ${cityList}
Full journey: ${citySequence}
Total steps: ${totalSteps}

Generate EXACTLY ${totalSteps} steps in this JSON structure:
{
  "quest_title": "The Lost Crown",
  "steps": [
    {
      "city": "<destination city>",
      "story_beat": "<immersive narrative>",
      "clue_type": "<one of: landmark, flag, text>",
      "clue": "<riddle clue hinting at DESTINATION city — NEVER name destination city>",
      "options": ["<correct city>", "<distractor 1>", "<distractor 2>", "<distractor 3>"],
      "correct_answer": "<destination city>",
      "direction": "<compass bearing: North/Northeast/East/Southeast/South/Southwest/West/Northwest>",
      "compass_clue": "<short directional hint, no city names>",
      "fun_fact": "<fun fact about DESTINATION city, max 20 words>",
      "artifact": "crown_fragment"
    }
  ]
}

CRITICAL RULES:
1. clue = riddle about DESTINATION — NEVER name destination in clue text
2. options = 4 cities from 4 DIFFERENT COUNTRIES: correct destination first, then 3 distractors
3. direction = real geographic compass bearing from SOURCE to DESTINATION
4. Alternate clue_type: landmark → flag → text → landmark (start with landmark)
5. All content for children ages 8–14
6. Return ONLY valid JSON`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
      temperature: 0.65,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');
    const raw = JSON.parse(content) as { quest_title: string; steps: unknown[] };
    if (!raw.quest_title || !Array.isArray(raw.steps)) throw new Error('Malformed AI response');
    // Trim/pad to match cities length
    if (raw.steps.length > cities.length) raw.steps = raw.steps.slice(0, cities.length);
    while (raw.steps.length < cities.length) raw.steps.push(raw.steps[raw.steps.length - 1]);
    // Apply the same validation pipeline as /api/compass/generate-quest
    const validatedSteps = validateCompassQuestSteps(raw.steps, cities);
    return { quest_title: raw.quest_title, steps: validatedSteps };
  }

  // Admin: seed all 4 random quest templates (one-time operation)
  app.post('/api/admin/compass/seed-random-templates', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {

      const results = [];
      for (const tpl of RANDOM_QUEST_TEMPLATES) {
        // Check if already generated
        const existing = await db.select().from(compassRandomQuestTemplates)
          .where(eq(compassRandomQuestTemplates.templateName, tpl.templateName))
          .orderBy(asc(compassRandomQuestTemplates.id));
        if (existing.length > 0 && existing[0].questData) {
          results.push({ templateName: tpl.templateName, status: 'already_exists' });
          continue;
        }
        try {
          const questData = await generateQuestDataForTemplate(tpl.cities, tpl.startCity);
          if (existing.length > 0) {
            await db.update(compassRandomQuestTemplates)
              .set({ questData, generatedAt: new Date() })
              .where(eq(compassRandomQuestTemplates.templateName, tpl.templateName));
          } else {
            await db.insert(compassRandomQuestTemplates).values({
              templateName: tpl.templateName,
              cities: tpl.cities,
              startCity: tpl.startCity,
              questData,
              generatedAt: new Date(),
            });
          }
          results.push({ templateName: tpl.templateName, status: 'generated' });
        } catch (err) {
          results.push({ templateName: tpl.templateName, status: 'error', error: String(err) });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error('Seed random templates error:', error);
      res.status(500).json({ error: 'Failed to seed templates' });
    }
  });

  // ── City Pool Admin ───────────────────────────────────────────────────────────

  // Force-refresh thin or stale city stop pools for a given country.
  // POST /api/admin/city-pool/refresh  body: { country: "India" }
  // Clears all existing pools for that country and regenerates them in the background.
  app.post('/api/admin/city-pool/refresh', isAuthenticated, isAdmin, async (req: any, res) => {
    const country = (req.body?.country as string) || "India";

    const INDIA_CITIES = [
      "Delhi", "Agra", "Jaipur", "Goa", "Mumbai", "Kochi", "Manali", "Shimla",
      "Darjeeling", "Udaipur", "Varanasi", "Ooty", "Munnar", "Mysore", "Rishikesh",
      "Ranthambore", "Bangalore", "Andaman Islands", "Chennai", "Hyderabad", "Kolkata",
      "Pune", "Ahmedabad", "Jodhpur", "Pushkar", "Hampi", "Coorg", "Alleppey",
      "Leh Ladakh", "Amritsar", "Pondicherry", "Madurai", "Mahabalipuram",
      "Mount Abu", "Varkala", "Bhubaneswar", "Tirupati", "Lonavala", "Jaisalmer", "Bikaner",
    ];

    // Delete existing pools for this country
    const deleted = await db.execute(
      drizzleSql`DELETE FROM city_stop_pool_cache WHERE country = ${country}`
    );
    const deletedCount = (deleted as any).rowCount ?? 0;
    console.log(`[CityPool Admin] Cleared ${deletedCount} pool entries for ${country}`);

    res.json({
      success: true,
      message: `Cleared ${deletedCount} ${country} city pools. Regenerating ${INDIA_CITIES.length} cities in background (2 API calls × 10 stops each = 20 stops per city).`,
      country,
      cities: INDIA_CITIES.length,
      cleared: deletedCount,
    });

    // Background regeneration
    const { generateCityStopPool } = await import("../planner/plannerService");
    (async () => {
      let success = 0;
      let failed = 0;
      for (const city of INDIA_CITIES) {
        try {
          console.log(`[CityPool Admin] Generating pool for: ${city}, ${country}...`);
          const pool = await generateCityStopPool(city, country);
          if (pool.length === 0) { failed++; continue; }
          await storage.saveCityStopPool({
            city,
            country,
            normalizedKey: `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`,
            stopPool: pool,
          });
          console.log(`[CityPool Admin] ✅ ${city}: ${pool.length} stops`);
          success++;
          await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
          console.error(`[CityPool Admin] ❌ Failed ${city}:`, err);
          failed++;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      console.log(`[CityPool Admin] Done — ✅ ${success} cities refreshed, ❌ ${failed} failed`);
    })();
  });

  // GET: check current pool status per country
  app.get('/api/admin/city-pool/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const country = (req.query?.country as string) || "India";
      const rows = await db.execute(
        drizzleSql`SELECT city, jsonb_array_length(stop_pool) as stop_count, cached_at
            FROM city_stop_pool_cache WHERE country = ${country}
            ORDER BY city`
      );
      const cities = (rows as any).rows ?? [];
      const total = cities.length;
      const thin = cities.filter((r: any) => parseInt(r.stop_count) < 15);
      res.json({ country, total, thin: thin.length, cities });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // ── Place Family Signals Admin Endpoints ─────────────────────────────────────

  // Trigger full historical aggregation from all existing trip data
  app.post('/api/admin/signals/aggregate-all', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = await aggregateAllHistorical();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error in signals aggregation:", error);
      res.status(500).json({ message: "Aggregation failed", error: String(error) });
    }
  });

  // Inspect signals for a specific city
  app.get('/api/admin/signals/city/:city', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { city } = req.params;
      const country = (req.query.country as string) || "";
      const ageGroups = req.query.ageGroups
        ? String(req.query.ageGroups).split(",")
        : undefined;
      const signals = await getTopSignalsForCity(city, country, ageGroups, 25);
      res.json({ city, country, signals, count: signals.length });
    } catch (error) {
      console.error("Error fetching signals:", error);
      res.status(500).json({ message: "Failed to fetch signals" });
    }
  });

  // Manually seed cold-start signals for a specific city
  app.post('/api/admin/signals/seed-city', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { city, country, stops } = req.body;
      if (!city || !country || !Array.isArray(stops)) {
        return res.status(400).json({ message: "city, country, and stops[] are required" });
      }
      await generateAIColdStartSignals(city, country, stops);
      res.json({ success: true, message: `Seeded cold-start signals for ${stops.length} stops in ${city}` });
    } catch (error) {
      console.error("Error seeding cold-start signals:", error);
      res.status(500).json({ message: "Failed to seed signals" });
    }
  });

  // Admin: trigger stop-specific image regeneration for all 18 CITY_STOP_MAPS cities.
  // Checks trip_story_image_assets cache first — only generates missing slots.
  // Run after deploy or DB wipe to ensure all city card images are ready.
  app.post('/api/admin/regenerate-city-images', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { regenerateCityImages } = await import("../memoryImageEngine");
      const openai = new (await import("openai")).default({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });
      const result = await regenerateCityImages(openai);
      res.json({ success: true, generated: result.generated, skipped: result.skipped });
    } catch (error) {
      console.error("[Admin] regenerate-city-images error:", error);
      res.status(500).json({ message: "Failed to regenerate city images" });
    }
  });

  // Admin: canonical template usage analytics for the India planner engine.
  // Returns % of Indian trips using canonical templates and avg re-rolls by mode.
  app.get('/api/admin/canonical-stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Fetch all Indian trip plans (destination includes India or exclusively-Indian city names).
      // Also fetch canonicalCitiesUsed to properly account for multi-city India trips where the
      // top-level destination may be a region/country rather than a single canonical city.
      const allPlans = await db.select({
        id: plannerTripPlans.id,
        canonicalTemplateUsed: plannerTripPlans.canonicalTemplateUsed,
        canonicalCitiesUsed: plannerTripPlans.canonicalCitiesUsed,
        destination: plannerTripPlans.destination,
      }).from(plannerTripPlans)
        .where(drizzleSql`lower(${plannerTripPlans.destination}) like '%india%' or lower(${plannerTripPlans.destination}) like '%ooty%' or lower(${plannerTripPlans.destination}) like '%munnar%' or lower(${plannerTripPlans.destination}) like '%kerala%'`);

      const total = allPlans.length;
      // A plan used a canonical template if either the single-city field is set OR
      // canonicalCitiesUsed has at least one entry (multi-city trips).
      const templatePlans = allPlans.filter(p => p.canonicalTemplateUsed || (p.canonicalCitiesUsed && p.canonicalCitiesUsed.length > 0));
      const aiPlans = allPlans.filter(p => !p.canonicalTemplateUsed && (!p.canonicalCitiesUsed || p.canonicalCitiesUsed.length === 0));
      const templatePercent = total > 0 ? Math.round((templatePlans.length / total) * 100) : 0;

      // Compute avg re-rolls (wasAutoGenerated=false stops) per plan, split by canonical vs AI.
      // Join stops → plans so we can filter by canonical fields without embedding raw IDs.
      const rerollRows = await db.select({
        planId: plannerTripPlanStops.planId,
        canonicalTemplateUsed: plannerTripPlans.canonicalTemplateUsed,
        canonicalCitiesUsed: plannerTripPlans.canonicalCitiesUsed,
      }).from(plannerTripPlanStops)
        .innerJoin(plannerTripPlans, eq(plannerTripPlanStops.planId, plannerTripPlans.id))
        .where(and(
          eq(plannerTripPlanStops.wasAutoGenerated, false),
          drizzleSql`lower(${plannerTripPlans.destination}) like '%india%' or lower(${plannerTripPlans.destination}) like '%ooty%' or lower(${plannerTripPlans.destination}) like '%munnar%' or lower(${plannerTripPlans.destination}) like '%kerala%'`,
        ));

      // Count re-rolls per plan. Start from all known plans (so zero-reroll plans are included).
      const rerollCountByPlan: Record<string, number> = {};
      for (const p of allPlans) rerollCountByPlan[p.id] = 0;
      for (const row of rerollRows) {
        if (rerollCountByPlan[row.planId] !== undefined) {
          rerollCountByPlan[row.planId] += 1;
        }
      }

      const templatePlanIds = new Set(templatePlans.map(p => p.id));
      const canonicalRerolls = Object.entries(rerollCountByPlan)
        .filter(([id]) => templatePlanIds.has(id))
        .map(([, count]) => count);
      const aiRerolls = Object.entries(rerollCountByPlan)
        .filter(([id]) => !templatePlanIds.has(id))
        .map(([, count]) => count);
      const avgRerollsCanonical = canonicalRerolls.length > 0
        ? Math.round((canonicalRerolls.reduce((a, b) => a + b, 0) / canonicalRerolls.length) * 100) / 100
        : 0;
      const avgRerollsAi = aiRerolls.length > 0
        ? Math.round((aiRerolls.reduce((a, b) => a + b, 0) / aiRerolls.length) * 100) / 100
        : 0;

      // Build per-city-key breakdown. Single-city plans contribute one key;
      // multi-city plans contribute one count per city key in canonicalCitiesUsed.
      const templateBreakdown = templatePlans.reduce<Record<string, number>>((acc, p) => {
        if (p.canonicalTemplateUsed) {
          const key = p.canonicalTemplateUsed;
          acc[key] = (acc[key] || 0) + 1;
        }
        if (p.canonicalCitiesUsed && p.canonicalCitiesUsed.length > 0) {
          for (const cityKey of p.canonicalCitiesUsed) {
            acc[cityKey] = (acc[cityKey] || 0) + 1;
          }
        }
        return acc;
      }, {});

      // Count of multi-city plans that used at least one canonical template
      const multiCityCanonicalTrips = allPlans.filter(p => p.canonicalCitiesUsed && p.canonicalCitiesUsed.length > 0).length;

      res.json({
        totalIndianTrips: total,
        canonicalTrips: templatePlans.length,
        aiOnlyTrips: aiPlans.length,
        canonicalPercent: templatePercent,
        avgRerollsCanonical,
        avgRerollsAi,
        templateBreakdown,
        multiCityCanonicalTrips,
      });
    } catch (error) {
      console.error("[Admin] canonical-stats error:", error);
      res.status(500).json({ message: "Failed to fetch canonical stats" });
    }
  });

  // Get a random quest template (sliced to stopCount)
  app.get('/api/compass/random-quest', async (req: Request, res: Response) => {
    try {
      const parsedStopCount = parseInt(String(req.query.stopCount ?? '5'));
      const parsedTemplateIdx = parseInt(String(req.query.templateIdx ?? '0'));
      const stopCount = Math.min(8, Math.max(4, isNaN(parsedStopCount) ? 5 : parsedStopCount));
      const templateIdx = Math.min(3, Math.max(0, isNaN(parsedTemplateIdx) ? 0 : parsedTemplateIdx));

      // Look up by templateName for stable, position-independent mapping
      const tpl = RANDOM_QUEST_TEMPLATES[templateIdx] ?? RANDOM_QUEST_TEMPLATES[0];
      const dbRows = await db.select().from(compassRandomQuestTemplates)
        .where(eq(compassRandomQuestTemplates.templateName, tpl.templateName))
        .orderBy(asc(compassRandomQuestTemplates.id));
      const dbTemplate = dbRows[0];

      if (dbTemplate?.questData) {
        const questData = dbTemplate.questData as { quest_title: string; steps: unknown[] };
        const availableCities = dbTemplate.cities;
        // Guard: clamp stopCount to available cities
        const effectiveStopCount = Math.min(stopCount, availableCities.length);
        if (effectiveStopCount < stopCount) {
          console.warn(`[RandomQuest] Template "${dbTemplate.templateName}" has ${availableCities.length} cities but stopCount=${stopCount} was requested; clamping to ${effectiveStopCount}`);
        }
        const slicedCities = availableCities.slice(0, effectiveStopCount);
        const slicedSteps = (questData.steps as unknown[]).slice(0, effectiveStopCount);
        return res.json({
          quest_title: questData.quest_title,
          steps: slicedSteps,
          cities: slicedCities,
          startCity: dbTemplate.startCity,
          templateName: dbTemplate.templateName,
          templateIdx,
          effectiveStopCount,
        });
      }

      // Fallback: live generation using the full template city list, then save
      const allCities = tpl.cities;
      const questData = await generateQuestDataForTemplate(allCities, tpl.startCity);
      // Save to DB for future fast lookups
      try {
        await db.insert(compassRandomQuestTemplates).values({
          templateName: tpl.templateName,
          cities: allCities,
          startCity: tpl.startCity,
          questData,
          generatedAt: new Date(),
        });
      } catch { /* ignore duplicate insert errors */ }
      const typedData = questData as { quest_title: string; steps: unknown[] };
      const slicedCities = allCities.slice(0, stopCount);
      const slicedSteps = typedData.steps.slice(0, stopCount);
      return res.json({
        quest_title: typedData.quest_title,
        steps: slicedSteps,
        cities: slicedCities,
        startCity: tpl.startCity,
        templateName: tpl.templateName,
        templateIdx,
      });
    } catch (error) {
      console.error('Random quest error:', error);
      res.status(500).json({ error: 'Failed to get random quest' });
    }
  });

  registerAdminRoutes(app);
  registerGeoAtlasRoutes(app);

  // ============================================================================
  // COMPASS QUEST CHALLENGE SYSTEM
  // ============================================================================

  // Upsert a quest record (used when creating a challenge from a custom adventure)
  app.post('/api/quests', async (req, res) => {
    try {
      const { questKey, title, subtitle, icon, description, startCity, cities, stepsJson, isCustom } = req.body;
      if (!questKey || !title || !startCity || !stepsJson) {
        return res.status(400).json({ error: 'questKey, title, startCity, and stepsJson are required' });
      }
      const quest = await storage.upsertCompassQuest({
        questKey,
        title,
        subtitle: subtitle || null,
        icon: icon || '🧭',
        description: description || null,
        startCity,
        cities: Array.isArray(cities) ? cities : [],
        stepsJson,
        isCustom: isCustom === true,
      });
      res.json(quest);
    } catch (error) {
      console.error('Error upserting compass quest:', error);
      res.status(500).json({ error: 'Failed to save quest' });
    }
  });

  // Create a challenge from a completed attempt
  app.post('/api/challenges', async (req, res) => {
    try {
      const { questId, creatorAttemptId } = req.body;
      if (!questId || !creatorAttemptId) {
        return res.status(400).json({ error: 'questId and creatorAttemptId are required' });
      }
      // Generate a short share code like GQ-4821
      const code = 'GQ-' + Math.floor(1000 + Math.random() * 9000).toString();
      const shareCode = code;
      const challenge = await storage.createCompassChallenge({ questId, creatorAttemptId, shareCode, isActive: true });
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json({
        challengeId: challenge.id,
        shareCode: challenge.shareCode,
        shareUrl: `${baseUrl}/challenge/${challenge.shareCode}`,
      });
    } catch (error) {
      console.error('Error creating challenge:', error);
      res.status(500).json({ error: 'Failed to create challenge' });
    }
  });

  // Get challenge info by share code
  app.get('/api/challenges/:share_code', async (req, res) => {
    try {
      const { share_code } = req.params;
      const challengeData = await storage.getCompassChallengeByCode(share_code);
      if (!challengeData) {
        return res.status(404).json({ error: 'Challenge not found or invalid code' });
      }
      if (!challengeData.isActive) {
        return res.status(410).json({ error: 'This challenge is no longer active' });
      }
      res.json({
        challengeId: challengeData.id,
        shareCode: challengeData.shareCode,
        quest: challengeData.quest,
        creatorAttempt: challengeData.creatorAttempt,
      });
    } catch (error) {
      console.error('Error fetching challenge:', error);
      res.status(500).json({ error: 'Failed to fetch challenge' });
    }
  });

  // Create a new attempt record
  app.post('/api/attempts', async (req, res) => {
    try {
      const { questId, playerName } = req.body;
      if (!questId || !playerName) {
        return res.status(400).json({ error: 'questId and playerName are required' });
      }
      const attempt = await storage.createCompassAttempt({ questId, playerName, completed: false, wrongGuesses: 0 });
      res.json(attempt);
    } catch (error) {
      console.error('Error creating attempt:', error);
      res.status(500).json({ error: 'Failed to create attempt' });
    }
  });

  // Complete an attempt with scoring
  app.post('/api/attempts/:attempt_id/complete', async (req, res) => {
    try {
      const { attempt_id } = req.params;
      const { xp, timeMs, wrongGuesses, accuracy } = req.body;
      if (xp === undefined || timeMs === undefined) {
        return res.status(400).json({ error: 'xp and timeMs are required' });
      }
      const attempt = await storage.completeCompassAttempt(
        attempt_id,
        Number(xp),
        Number(timeMs),
        Number(wrongGuesses ?? 0),
        Number(accuracy ?? 100)
      );
      if (!attempt) {
        return res.status(404).json({ error: 'Attempt not found' });
      }
      res.json(attempt);
    } catch (error) {
      console.error('Error completing attempt:', error);
      res.status(500).json({ error: 'Failed to complete attempt' });
    }
  });

  // Compare creator vs challenger attempts
  app.get('/api/challenges/:share_code/compare/:attempt_id', async (req, res) => {
    try {
      const { share_code, attempt_id } = req.params;
      const result = await storage.compareCompassAttempts(share_code, attempt_id);
      if (!result) {
        return res.status(404).json({ error: 'Challenge or attempt not found' });
      }
      res.json(result);
    } catch (error) {
      console.error('Error comparing attempts:', error);
      res.status(500).json({ error: 'Failed to compare attempts' });
    }
  });

  // Defer seeding to not block server startup - gives user faster initial load
  setTimeout(() => {
    seedDailyQuestCities()
      .then(() => updateCityCoordinates())
      .then(() => updateCityImages())
      .then(() => storage.seedCityStickers())
      .then(count => console.log(`✅ Seeded ${count} city stickers`))
      .then(() => storage.seedRewardTiers())
      .then(count => console.log(`✅ Seeded ${count} reward tiers`))
      .then(() => storage.seedArtifacts())
      .then(count => console.log(`✅ Seeded ${count} travel artifacts`))
      .then(() => storage.seedPuzzles())
      .then(count => console.log(`✅ Seeded ${count} GeoRelic puzzles`))
      .then(() => storage.seedMapPuzzles())
      .then(count => console.log(`✅ Seeded ${count} map puzzles`))
      .then(() => storage.seedExperienceContent())
      .then(count => console.log(`✅ Seeded ${count} experience destinations`))
      .then(() => seedGeoBuddyStories())
      .then(() => seedGeoAtlasCountries())
      .then(() => seedCommunityTrips())
      .then(result => console.log(`✅ ${result.message}`))
      .then(() => import("../explorerKit").then(m => m.ensureKitItemThresholds()))
      .then(() => storage.autoCompleteOldTrips())
      .then(count => count > 0 && console.log(`🏁 Auto-completed ${count} old trips`))
      .then(() => import("../memoryEngine").then(m => m.seedTop10MemoryContent()))
      .catch(err => console.error("Failed to initialize cities/stickers/rewards/artifacts/puzzles on startup:", err));
  }, 3000);

  // City stop pool pre-seeding — runs after a longer delay to not compete with
  // critical startup tasks. Sequential per city to avoid API rate limits.
  setTimeout(() => {
    import("../planner/cityPoolSeeder")
      .then(m => m.seedCityStopPools())
      .catch(err => console.error("[CityPoolSeeder] Failed to seed city stop pools:", err));
  }, 30000);

  // ============================================================================
  // GEOADVENTURES PLANNER ENGINE ROUTES
  // ============================================================================

  app.post("/api/planner/trip-plans/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const {
        destination, tripDays, childrenAges, pace,
        transportMode, budgetSensitivity,
        tripStyle, kidEnergyLevel, indoorLean, interests, strollerNeeded,
        stayLocations, stopIntelligenceEnabled, routeStops, experienceTripId,
      } = req.body;

      console.log("[Planner] Generate request:", { userId, destination, tripDays, pace, tripStyle, interests });

      if (!destination || !tripDays) {
        console.log("[Planner] Missing destination or tripDays");
        return res.status(400).json({ message: "destination and tripDays are required" });
      }

      if (!userId) {
        console.log("[Planner] No userId found in session");
        return res.status(401).json({ message: "User not authenticated properly" });
      }

      const { generateItinerary, getIndiaCanonicalCityKey, getIndiaCanonicalContext } = await import("../planner/plannerService");
      console.log("[Planner] Starting AI generation for:", destination);

      const [plan] = await db.insert(plannerTripPlans).values({
        userId,
        destination,
        tripDays: Number(tripDays),
        childrenAges: childrenAges || [],
        pace: pace || "moderate",
        transportMode: transportMode || "walking",
        budgetSensitivity: budgetSensitivity || "moderate",
        status: "draft",
        stayLocations: stayLocations || null,
        stopIntelligenceEnabled: stopIntelligenceEnabled === true,
      }).returning();

      // Fetch pre-booked anchors from a linked GeoAdventures trip so AI plans around them
      let fixedAnchors: { name: string; day: number; time: string | null; durationMinutes: number | null; anchorType: string }[] = [];
      if (experienceTripId) {
        try {
          const tripAnchorsData = await storage.getAnchorsByTripId(experienceTripId);
          fixedAnchors = tripAnchorsData.map(a => ({
            name: a.name,
            day: a.day,
            time: a.time || null,
            durationMinutes: a.durationMinutes || null,
            anchorType: a.anchorType,
          }));
          if (fixedAnchors.length > 0) {
            console.log(`[Planner] Found ${fixedAnchors.length} fixed anchors from trip ${experienceTripId} to plan around`);
          }
        } catch (e) {
          console.error("[Planner] Non-fatal: failed to fetch anchors for experienceTripId:", e);
        }
      }

      const input = {
        destination,
        tripDays: Number(tripDays),
        childrenAges: childrenAges || [],
        pace: pace || "moderate",
        transportMode: transportMode || "walking",
        budgetSensitivity: budgetSensitivity || "moderate",
        tripStyle: tripStyle || undefined,
        kidEnergyLevel: kidEnergyLevel || undefined,
        indoorLean: indoorLean || undefined,
        interests: interests || undefined,
        strollerNeeded: strollerNeeded || undefined,
        stayLocations: stayLocations || undefined,
        routeStops: Array.isArray(routeStops) ? routeStops : undefined,
        fixedAnchors: fixedAnchors.length > 0 ? fixedAnchors : undefined,
        experienceTripId: experienceTripId || undefined,
        userId,
      };
      const { stops: insertedStops, canonicalCitiesUsed } = await generateItinerary(plan.id, input);

      req.log.info({
        event: "itinerary_generated",
        planId: plan.id,
        destination,
        tripDays: Number(tripDays),
        stopCount: insertedStops.length,
        canonicalCitiesUsed,
      }, "[Planner] itinerary generated — per-stop stop_completeness_state logged in stop_served events above");

      // For single-city trips, canonicalTemplateUsed comes from the top-level destination.
      // For multi-city trips, the top-level destination may not match any canonical key,
      // so we use canonicalCitiesUsed to capture which individual cities used templates.
      const canonicalTemplateUsed = getIndiaCanonicalContext(destination) ? getIndiaCanonicalCityKey(destination) : null;
      if (canonicalTemplateUsed) {
        console.log(`[CanonicalEngine] Plan ${plan.id} recorded canonical_template_used="${canonicalTemplateUsed}" for "${destination}"`);
      }
      if (canonicalCitiesUsed.length > 0) {
        console.log(`[CanonicalEngine] Plan ${plan.id} recorded canonical_cities_used=[${canonicalCitiesUsed.join(", ")}] for multi-city trip "${destination}"`);
      }

      await db.update(plannerTripPlans).set({
        status: "ready",
        generatedAt: new Date(),
        updatedAt: new Date(),
        canonicalTemplateUsed,
        canonicalCitiesUsed: canonicalCitiesUsed.length > 0 ? canonicalCitiesUsed : null,
      }).where(eq(plannerTripPlans.id, plan.id));

      res.json({ plan: { ...plan, status: "ready", canonicalTemplateUsed, canonicalCitiesUsed }, stops: insertedStops });
    } catch (error) {
      console.error("[Planner] Generate error:", error);
      res.status(500).json({ message: "Failed to generate itinerary" });
    }
  });

  app.get("/api/planner/trip-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const stops = await db.select().from(plannerTripPlanStops).where(eq(plannerTripPlanStops.planId, req.params.id));
      res.json({ plan: plans[0], stops });
    } catch (error) {
      console.error("[Planner] Get plan error:", error);
      res.status(500).json({ message: "Failed to get plan" });
    }
  });

  app.get("/api/planner/trip-plans/:id/stops/:stopId/replacements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const stop = await db.select().from(plannerTripPlanStops).where(and(eq(plannerTripPlanStops.id, req.params.stopId), eq(plannerTripPlanStops.planId, req.params.id))).limit(1);
      if (!stop.length) return res.status(404).json({ message: "Stop not found in this plan" });
      const { generateReplacementSuggestions } = await import("../planner/plannerService");
      const suggestions = await generateReplacementSuggestions(req.params.stopId, plans[0].destination, stop[0]);
      res.json(suggestions);
    } catch (error) {
      console.error("[Planner] Replacements error:", error);
      res.status(500).json({ message: "Failed to get replacement suggestions" });
    }
  });

  app.post("/api/planner/trip-plans/:id/stops/:stopId/replace", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const existingStop = await db.select().from(plannerTripPlanStops).where(and(eq(plannerTripPlanStops.id, req.params.stopId), eq(plannerTripPlanStops.planId, req.params.id))).limit(1);
      if (!existingStop.length) return res.status(404).json({ message: "Stop not found in this plan" });
      const plan = plans[0];
      const { name, type, durationMinutes, effortLevel, indoorOutdoor, minAge, whyNow, latitude, longitude, address, parentSupportData, placeReferenceData, placeProfileData, sensoryLoad, familyAnchorType } = req.body;

      const cityName = plan.destination.split(",")[0]?.trim() || plan.destination;
      const countryName = plan.destination.split(",").pop()?.trim() || plan.destination;
      const [newPlace] = await db.insert(plannerPlaces).values({
        city: cityName, country: countryName, name, type,
        durationMinutes, effortLevel, indoorOutdoor,
        sensoryLoad: sensoryLoad || "moderate",
        familyAnchorType: familyAnchorType || "support",
        minAge, whyNow,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: address || undefined,
      }).returning();

      if (placeProfileData) {
        await db.insert(plannerPlaceProfiles).values({
          placeId: newPlace.id,
          whyItWorks: placeProfileData.whyItWorks || undefined,
          bathroomNotes: placeProfileData.bathroomNotes || undefined,
          foodOptions: placeProfileData.foodOptions || undefined,
          parkingNotes: placeProfileData.parkingNotes || undefined,
          bestTimeOfDay: placeProfileData.bestTimeOfDay || "anytime",
          weatherSensitive: placeProfileData.weatherSensitive ?? false,
          strollerFriendly: placeProfileData.strollerFriendly ?? true,
          nearbyStops: placeProfileData.nearbyStops || [],
          practicalTips: placeProfileData.practicalTips || [],
        });
      }
      if (parentSupportData) {
        await db.insert(plannerParentSupport).values({
          placeId: newPlace.id,
          breakSuggestion: parentSupportData.breakSuggestion || undefined,
          foodSuggestion: parentSupportData.foodSuggestion || undefined,
          keepGoingSuggestion: parentSupportData.keepGoingSuggestion || undefined,
          moreFunSuggestion: parentSupportData.moreFunSuggestion || undefined,
          shortenSuggestion: parentSupportData.shortenSuggestion || undefined,
        });
      }
      if (placeReferenceData) {
        await db.insert(plannerPlaceReference).values({
          placeId: newPlace.id,
          directionsNote: placeReferenceData.directionsNote || undefined,
          openingHours: placeReferenceData.openingHours || undefined,
          priceRange: placeReferenceData.priceRange || undefined,
          bookingRequired: placeReferenceData.bookingRequired ?? false,
          bookingUrl: placeReferenceData.bookingUrl || undefined,
        });
      }

      const [updated] = await db.update(plannerTripPlanStops).set({
        name, type, durationMinutes, effortLevel, indoorOutdoor, minAge, whyNow,
        latitude, longitude, address, parentSupportData, placeReferenceData, placeProfileData,
        placeId: newPlace.id,
        travelMinutes: req.body.travelMinutes || 0,
        travelMode: req.body.travelMode || existingStop[0].travelMode,
        sensoryLoad: sensoryLoad || existingStop[0].sensoryLoad,
        familyAnchorType: familyAnchorType || existingStop[0].familyAnchorType,
        wasAutoGenerated: false, status: "active", updatedAt: new Date(),
      }).where(and(eq(plannerTripPlanStops.id, req.params.stopId), eq(plannerTripPlanStops.planId, req.params.id))).returning();
      res.json(updated);
    } catch (error) {
      console.error("[Planner] Replace stop error:", error);
      res.status(500).json({ message: "Failed to replace stop" });
    }
  });

  app.post("/api/planner/trip-plans/:id/stops/:stopId/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const existingStop = await db.select().from(plannerTripPlanStops).where(and(eq(plannerTripPlanStops.id, req.params.stopId), eq(plannerTripPlanStops.planId, req.params.id))).limit(1);
      if (!existingStop.length) return res.status(404).json({ message: "Stop not found in this plan" });
      const { displayOrder, dayNumber, isLocked, isOptional } = req.body;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      if (dayNumber !== undefined) updateData.dayNumber = dayNumber;
      if (isLocked !== undefined) updateData.isLocked = isLocked;
      if (isOptional !== undefined) updateData.isOptional = isOptional;
      if (displayOrder !== undefined || dayNumber !== undefined) {
        updateData.travelMinutes = 0;
      }
      const [updated] = await db.update(plannerTripPlanStops).set(updateData).where(and(eq(plannerTripPlanStops.id, req.params.stopId), eq(plannerTripPlanStops.planId, req.params.id))).returning();
      res.json(updated);
    } catch (error) {
      console.error("[Planner] Reorder stop error:", error);
      res.status(500).json({ message: "Failed to update stop" });
    }
  });

  app.post("/api/planner/trip-plans/:id/stops", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const { name, stopType, dayNumber } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "name is required" });
      const targetDay = typeof dayNumber === 'number' ? dayNumber : 1;
      const existingStops = await db.select().from(plannerTripPlanStops).where(and(eq(plannerTripPlanStops.planId, req.params.id), eq(plannerTripPlanStops.dayNumber, targetDay)));
      const newDisplayOrder = existingStops.length;
      const [created] = await db.insert(plannerTripPlanStops).values({
        planId: req.params.id,
        name: name.trim(),
        type: stopType || "landmark",
        dayNumber: targetDay,
        displayOrder: newDisplayOrder,
        durationMinutes: 60,
        effortLevel: "moderate",
        indoorOutdoor: "both",
        sensoryLoad: "moderate",
        familyAnchorType: "support",
        minAge: 0,
        whyNow: "Added by you",
        travelMinutes: 10,
        travelMode: "walking",
        wasAutoGenerated: false,
      }).returning();
      res.json(created);
    } catch (error) {
      console.error("[Planner] Add stop error:", error);
      res.status(500).json({ message: "Failed to add stop" });
    }
  });

  app.delete("/api/planner/trip-plans/:id/stops/:stopId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      await db.delete(plannerTripPlanStops).where(eq(plannerTripPlanStops.id, req.params.stopId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting planner stop:", error);
      res.status(500).json({ message: "Failed to delete stop" });
    }
  });

  app.post("/api/planner/trip-plans/:id/stops/:stopId/support", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const existingStop = await db.select().from(plannerTripPlanStops).where(and(eq(plannerTripPlanStops.id, req.params.stopId), eq(plannerTripPlanStops.planId, req.params.id))).limit(1);
      if (!existingStop.length) return res.status(404).json({ message: "Stop not found in this plan" });
      const { action, confirm } = req.body;
      if (!["break", "food", "keep_going", "more_fun", "shorten"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }
      const { handleSupportAction } = await import("../planner/plannerService");
      const result = await handleSupportAction(req.params.stopId, action, confirm);
      res.json(result);
    } catch (error) {
      console.error("[Planner] Support action error:", error);
      res.status(500).json({ message: "Failed to handle support action" });
    }
  });

  app.get("/api/planner/trip-plans/:id/passes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const passes = await db.select().from(plannerPasses).where(eq(plannerPasses.planId, req.params.id));
      res.json(passes);
    } catch (error) {
      console.error("[Planner] Get passes error:", error);
      res.status(500).json({ message: "Failed to get passes" });
    }
  });

  app.post("/api/planner/trip-plans/:id/passes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });
      const { label, type, confirmationNumber, qrData, fileUrl, notes, stopId, entryTime } = req.body;
      if (!label) return res.status(400).json({ message: "label is required" });
      const [pass] = await db.insert(plannerPasses).values({
        planId: req.params.id,
        stopId: stopId || null,
        label,
        type: type || "ticket",
        confirmationNumber,
        qrData,
        fileUrl,
        notes,
        status: "upcoming",
        entryTime: entryTime ? new Date(entryTime) : undefined,
      }).returning();
      res.json(pass);
    } catch (error) {
      console.error("[Planner] Create pass error:", error);
      res.status(500).json({ message: "Failed to create pass" });
    }
  });

  app.patch("/api/planner/passes/:passId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const pass = await db.select().from(plannerPasses).where(eq(plannerPasses.id, req.params.passId)).limit(1);
      if (!pass.length) return res.status(404).json({ message: "Pass not found" });
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, pass[0].planId), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(403).json({ message: "Not authorized" });
      const { label, type, confirmationNumber, qrData, fileUrl, notes, status, entryTime, neededOnDay } = req.body;
      const updateData: any = {};
      if (label !== undefined) updateData.label = label;
      if (type !== undefined) updateData.type = type;
      if (confirmationNumber !== undefined) updateData.confirmationNumber = confirmationNumber;
      if (qrData !== undefined) updateData.qrData = qrData;
      if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
      if (notes !== undefined) updateData.notes = notes;
      if (neededOnDay !== undefined) updateData.neededOnDay = neededOnDay;
      if (status !== undefined) {
        updateData.status = status;
        if (status === "used") updateData.usedAt = new Date();
      }
      if (entryTime !== undefined) updateData.entryTime = new Date(entryTime);
      const [updated] = await db.update(plannerPasses).set(updateData).where(eq(plannerPasses.id, req.params.passId)).returning();
      if (!updated) return res.status(404).json({ message: "Pass not found" });
      res.json(updated);
    } catch (error) {
      console.error("[Planner] Patch pass error:", error);
      res.status(500).json({ message: "Failed to update pass" });
    }
  });

  app.delete("/api/planner/passes/:passId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const pass = await db.select().from(plannerPasses).where(eq(plannerPasses.id, req.params.passId)).limit(1);
      if (!pass.length) return res.status(404).json({ message: "Pass not found" });
      const plans = await db.select().from(plannerTripPlans).where(and(eq(plannerTripPlans.id, pass[0].planId), eq(plannerTripPlans.userId, userId))).limit(1);
      if (!plans.length) return res.status(403).json({ message: "Not authorized" });
      await db.delete(plannerPasses).where(eq(plannerPasses.id, req.params.passId));
      res.json({ success: true });
    } catch (error) {
      console.error("[Planner] Delete pass error:", error);
      res.status(500).json({ message: "Failed to delete pass" });
    }
  });

  app.post("/api/planner/trip-plans/:id/start-adventure", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { includedStopIds } = req.body;
      const { startAdventure } = await import("../planner/plannerService");
      const result = await startAdventure(req.params.id, userId, includedStopIds);
      res.json(result);
    } catch (error) {
      console.error("[Planner] Start adventure error:", error);
      res.status(500).json({ message: "Failed to start adventure" });
    }
  });

  // Phase 2: intelligence data for all stops in a plan
  app.get("/api/planner/trip-plans/:id/stops/intelligence", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const plans = await db.select({ id: plannerTripPlans.id })
        .from(plannerTripPlans)
        .where(and(eq(plannerTripPlans.id, req.params.id), eq(plannerTripPlans.userId, userId)))
        .limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });

      const stops = await db.select().from(plannerTripPlanStops).where(eq(plannerTripPlanStops.planId, req.params.id));
      const placeIds = stops.map(s => s.placeId).filter(Boolean) as string[];

      let intelligenceByPlaceId: Record<string, typeof plannerStopIntelligence.$inferSelect> = {};
      if (placeIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const intel = await db.select().from(plannerStopIntelligence).where(inArray(plannerStopIntelligence.placeId, placeIds));
        for (const row of intel) {
          intelligenceByPlaceId[row.placeId] = row;
        }
      }

      const result = stops.map(s => ({
        stopId: s.id,
        placeId: s.placeId,
        intelligence: s.placeId ? (intelligenceByPlaceId[s.placeId] ?? null) : null,
      }));
      res.json(result);
    } catch (error) {
      console.error("[Planner] Intelligence fetch error:", error);
      res.status(500).json({ message: "Failed to fetch intelligence" });
    }
  });

  // Phase 3: optimize stop order within a day using intelligence signals
  app.post("/api/planner/trip-plans/:id/days/:day/optimize-order", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const planId = req.params.id;
      const day = parseInt(req.params.day, 10);
      if (isNaN(day)) return res.status(400).json({ message: "Invalid day" });

      const plans = await db.select({ id: plannerTripPlans.id })
        .from(plannerTripPlans)
        .where(and(eq(plannerTripPlans.id, planId), eq(plannerTripPlans.userId, userId)))
        .limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });

      const dayStops = await db.select().from(plannerTripPlanStops)
        .where(and(eq(plannerTripPlanStops.planId, planId), eq(plannerTripPlanStops.dayNumber, day)));
      if (!dayStops.length) return res.json([]);

      const placeIds = dayStops.map(s => s.placeId).filter(Boolean) as string[];
      let intelligenceByPlaceId: Record<string, typeof plannerStopIntelligence.$inferSelect> = {};
      if (placeIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const intel = await db.select().from(plannerStopIntelligence).where(inArray(plannerStopIntelligence.placeId, placeIds));
        for (const row of intel) intelligenceByPlaceId[row.placeId] = row;
      }

      // Window priority: morning=0, midday=1, afternoon=2, evening=3, anytime=4, null=5
      const WINDOW_ORDER: Record<string, number> = { morning: 0, midday: 1, afternoon: 2, evening: 3, anytime: 4 };
      // Role priority: Anchor first, Meal after main stops, Reset/Wind-down last
      const ROLE_ORDER: Record<string, number> = { Anchor: 0, Treat: 1, Support: 2, "Quick win": 3, Backup: 4, Meal: 5, "Wind-down": 6, Reset: 7 };

      const sorted = [...dayStops].sort((a, b) => {
        const ia = a.placeId ? intelligenceByPlaceId[a.placeId] : null;
        const ib = b.placeId ? intelligenceByPlaceId[b.placeId] : null;

        // 1. Locked stops keep their position
        if (a.isLocked && !b.isLocked) return -1;
        if (!a.isLocked && b.isLocked) return 1;

        // 2. Meals always go after the first anchor, so deprioritize
        const roleA = ia?.roleAssigned ?? a.familyAnchorType ?? "Support";
        const roleB = ib?.roleAssigned ?? b.familyAnchorType ?? "Support";
        const roleOrderA = ROLE_ORDER[roleA] ?? 3;
        const roleOrderB = ROLE_ORDER[roleB] ?? 3;
        if (roleOrderA !== roleOrderB) return roleOrderA - roleOrderB;

        // 3. Sort by bestArrivalWindow
        const winA = ia?.bestArrivalWindow ?? "anytime";
        const winB = ib?.bestArrivalWindow ?? "anytime";
        const winOrdA = WINDOW_ORDER[winA] ?? 5;
        const winOrdB = WINDOW_ORDER[winB] ?? 5;
        if (winOrdA !== winOrdB) return winOrdA - winOrdB;

        // 4. Within same window: higher finalScore first
        const scoreA = ia?.finalScore ?? 50;
        const scoreB = ib?.finalScore ?? 50;
        return scoreB - scoreA;
      });

      // Write updated displayOrder values
      await Promise.all(sorted.map((stop, idx) =>
        db.update(plannerTripPlanStops)
          .set({ displayOrder: idx, updatedAt: new Date() })
          .where(eq(plannerTripPlanStops.id, stop.id))
      ));

      // Re-fetch and return updated stops
      const updated = await db.select().from(plannerTripPlanStops)
        .where(and(eq(plannerTripPlanStops.planId, planId), eq(plannerTripPlanStops.dayNumber, day)));
      res.json(updated.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
    } catch (error) {
      console.error("[Planner] Optimize order error:", error);
      res.status(500).json({ message: "Failed to optimize order" });
    }
  });

  // Dev/Admin helper: seed mock intelligence scores for a plan's stops (bypasses OpenAI)
  app.post("/api/planner/trip-plans/:id/seed-mock-intelligence", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const planId = req.params.id;

      // Only admins can seed mock data
      const userRecord = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId)).limit(1);
      if (!userRecord.length || !userRecord[0].isAdmin) return res.status(403).json({ message: "Admin only" });

      const plans = await db.select({ id: plannerTripPlans.id })
        .from(plannerTripPlans)
        .where(eq(plannerTripPlans.id, planId))
        .limit(1);
      if (!plans.length) return res.status(404).json({ message: "Plan not found" });

      const stops = await db.select().from(plannerTripPlanStops).where(eq(plannerTripPlanStops.planId, planId));

      const ROLES = ["Anchor", "Support", "Treat", "Meal", "Reset", "Quick win", "Wind-down"];
      const WINDOWS = ["morning", "midday", "afternoon", "evening", "anytime"];
      const RATIONALES = [
        "Great morning stop — queues are short and kids love the interactive exhibits.",
        "A high-energy anchor that works best before lunch when everyone is fresh.",
        "Low-effort, high-reward — perfect as a flexible filler between anchors.",
        "Solid meal anchor with family menus and easy buggy access nearby.",
        "Wind-down option with gentle pacing — ideal for the final hour of the day.",
        "Popular at weekends — arrive early to beat the crowds and get the most out of it.",
        "Outdoor gem with lots of open space for kids to run around between structured activities.",
      ];

      let seeded = 0;
      for (const stop of stops) {
        if (!stop.placeId) continue;

        // Deterministic-ish mock scores based on stop name hash
        const seed = stop.name.charCodeAt(0) % 40;
        const kidFit = 55 + seed;
        const flowFit = 50 + ((seed * 3) % 40);
        const practicality = 60 + ((seed * 7) % 30);
        const flexibility = 40 + ((seed * 11) % 50);
        const finalScore = Math.round((kidFit * 0.35 + flowFit * 0.25 + practicality * 0.20 + flexibility * 0.10 + 60 * 0.10));

        const role = ROLES[seed % ROLES.length];
        const bestWindow = WINDOWS[seed % WINDOWS.length];
        const worstWindow = WINDOWS[(seed + 2) % WINDOWS.length];
        const rationale = RATIONALES[seed % RATIONALES.length];

        const queueMorning = 20 + ((seed * 3) % 60);
        const queueMidday = 40 + ((seed * 7) % 55);
        const queueAfternoon = 25 + ((seed * 5) % 50);

        // Upsert: update if exists, else insert
        const existing = await db.select({ id: plannerStopIntelligence.id })
          .from(plannerStopIntelligence)
          .where(eq(plannerStopIntelligence.placeId, stop.placeId))
          .limit(1);

        const intel = {
          kidFitScore: kidFit,
          flowFitScore: flowFit,
          practicalityScore: practicality,
          flexibilityScore: flexibility,
          socialProofScore: 65,
          discoveryScore: 55 + seed % 30,
          finalScore,
          roleAssigned: role,
          bestArrivalWindow: bestWindow,
          worstArrivalWindow: worstWindow,
          rationaleShort: rationale,
          socialLabel: seed % 2 === 0 ? "Great for families with toddlers" : "Best for school-age kids",
          discoveryLabel: seed % 3 === 0 ? "Hidden gem" : seed % 3 === 1 ? "Local favourite" : null,
          queueRiskMorning: queueMorning,
          queueRiskMidday: queueMidday,
          queueRiskAfternoon: queueAfternoon,
          enrichedAt: new Date(),
        };

        if (existing.length) {
          await db.update(plannerStopIntelligence).set(intel).where(eq(plannerStopIntelligence.id, existing[0].id));
        } else {
          await db.insert(plannerStopIntelligence).values({ placeId: stop.placeId, ...intel });
        }
        seeded++;
      }

      res.json({ seeded, total: stops.length });
    } catch (error) {
      console.error("[Planner] Seed intelligence error:", error);
      res.status(500).json({ message: "Failed to seed intelligence" });
    }
  });

  // ── Memory Engine: GET /api/memory-engine/:destination ──────────────────────
  // Accepts optional query params: country, tripType, stops (comma-separated stop names)
  // Rate-limited to prevent cost abuse from unauthenticated callers
  app.get("/api/memory-engine/:destination", sensitiveApiRateLimit, async (req, res) => {
    try {
      const destination = decodeURIComponent(req.params.destination || "").trim();
      if (!destination || destination.length < 2 || destination.length > 200) {
        return res.status(400).json({ message: "Destination is required (2–200 chars)" });
      }

      const country = typeof req.query.country === "string" ? req.query.country.trim().slice(0, 100) : undefined;
      const tripType = typeof req.query.tripType === "string" ? req.query.tripType.trim().slice(0, 50) : undefined;
      const stopsRaw = typeof req.query.stops === "string" ? req.query.stops : undefined;
      const stops = stopsRaw
        ? stopsRaw.split(",").map(s => s.trim()).filter(Boolean).slice(0, 10)
        : undefined;

      const { getOrGenerateMemoryContent } = await import("../memoryEngine");
      const payload = await getOrGenerateMemoryContent(destination, { country, tripType, stops });
      res.json(payload);
    } catch (error) {
      console.error("[MemoryEngine] Error:", error);
      res.status(500).json({ message: "Failed to generate memory content" });
    }
  });

  // ── Family Photos: GET /api/family-photos/for-trip ─────────────────────────
  // Query params: city (required), category (single), categories (comma-separated mix), limit
  app.get("/api/family-photos/for-trip", async (req, res) => {
    try {
      const city = typeof req.query.city === "string" ? req.query.city.trim().toLowerCase().replace(/\s+/g, "-") : "";
      if (!city) return res.json({ photos: [] });

      const limit = typeof req.query.limit === "string" ? Math.min(parseInt(req.query.limit, 10) || 4, 10) : 4;
      let categoryInput: string | string[] | undefined;
      if (typeof req.query.categories === "string" && req.query.categories) {
        categoryInput = req.query.categories;
      } else if (typeof req.query.category === "string" && req.query.category) {
        categoryInput = req.query.category;
      }

      const { getFamilyPhotosForCity } = await import("../familyPhotoPromptEngine");
      const photos = await getFamilyPhotosForCity(city, categoryInput, limit);
      res.json({ photos });
    } catch (error) {
      console.error("[FamilyPhotos] for-trip error:", error);
      res.json({ photos: [] });
    }
  });

  // ── Community Moments: GET /api/community-moments/for-city ────────────────
  // Returns real family photos shared by users for a given city (opt-in only).
  // Priority source for TripsLikeYoursCarousel before AI-generated photos.
  // Query params: city (required), limit (default 4, max 8)
  // Also aliased as /api/community-photos/for-trip for backward compatibility.
  async function handleCommunityPhotos(req: any, res: any) {
    try {
      const cityRaw = typeof req.query.city === "string" ? req.query.city.trim() : "";
      if (!cityRaw) return res.json({ photos: [] });

      const limit = typeof req.query.limit === "string"
        ? Math.min(parseInt(req.query.limit, 10) || 4, 8)
        : 4;

      // Normalise the city name for comparison (handle slugs like "new-york" → "new york")
      const cityNorm = cityRaw.toLowerCase().replace(/-/g, " ");

      const rows = await db
        .select({
          id: travelMoments.id,
          photoUrls: travelMoments.photoUrls,
          photoUrl: travelMoments.photoUrl,
          city: travelTrips.city,
          destination: travelTrips.destination,
          createdAt: travelMoments.createdAt,
        })
        .from(travelMoments)
        .innerJoin(travelTrips, eq(travelMoments.tripId, travelTrips.id))
        .where(
          and(
            eq(travelMoments.isSharedCommunity, true),
            or(
              drizzleSql`lower(${travelTrips.city}) = ${cityNorm}`,
              drizzleSql`lower(${travelTrips.destination}) like ${'%' + cityNorm + '%'}`
            )
          )
        )
        .orderBy(drizzleSql`RANDOM()`)
        .limit(limit * 4); // over-fetch since each moment may have multiple photos

      // Flatten photoUrls arrays into individual photo entries
      const all: Array<{ id: string; imageUrl: string; city: string }> = [];
      for (const row of rows) {
        let urls: string[] = [];
        const pu = row.photoUrls;
        if (Array.isArray(pu)) {
          urls = (pu as unknown[]).filter((u): u is string => typeof u === "string");
        } else if (typeof pu === "string") {
          try { const p = JSON.parse(pu); if (Array.isArray(p)) urls = p.filter((u): u is string => typeof u === "string"); } catch {}
        }
        if (urls.length === 0 && row.photoUrl) urls = [row.photoUrl];

        for (const url of urls) {
          // Only include base64 or real URLs (skip empty)
          if (url && url.length > 10) {
            all.push({
              id: `${row.id}-${all.length}`,
              imageUrl: url,
              city: row.city || row.destination || cityRaw,
            });
          }
        }
      }

      // Randomly sample up to limit from the flattened pool
      const shuffled = all.sort(() => Math.random() - 0.5);
      const photos = shuffled.slice(0, limit);

      res.json({ photos, total: photos.length });
    } catch (error) {
      console.error("[CommunityPhotos] error:", error);
      res.json({ photos: [] });
    }
  }

  app.get("/api/community-moments/for-city", handleCommunityPhotos);
  app.get("/api/community-photos/for-trip", handleCommunityPhotos);

  // ── FREE GUIDE EMAIL CAPTURE ──────────────────────────────────────────────
  app.post("/api/free-guide/subscribe", async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const { isNew, subscriber } = await storage.saveGuideSubscriber(normalizedEmail);
      if (isNew) {
        try {
          const { readFileSync } = await import('fs');
          const { sendEmailWithAttachments } = await import('../email');
          const { emailShell } = await import('../guideEmailScheduler');
          const pdfPath = new URL('../server/assets/gps-guide.pdf', import.meta.url).pathname;
          const pdfBuffer = readFileSync(pdfPath);
          const pdfBase64 = pdfBuffer.toString('base64');

          const unsubscribeUrl = subscriber.unsubscribeToken
            ? `https://geoquestgame.live/api/free-guide/unsubscribe?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(subscriber.unsubscribeToken)}`
            : undefined;

          const email1Html = emailShell(`
              <p style="margin:0 0 20px;">Hi,</p>
              <p style="margin:0 0 20px;">Your guide is attached to this email. 40 pages. You can read the whole thing in about 35 minutes.</p>
              <p style="margin:0 0 20px;">But before you open it — one thing I'd ask you to try tonight, before your next trip:</p>
              <hr style="border:none;border-top:1px solid #E5DDD0;margin:28px 0;" />
              <p style="margin:0 0 20px;">Ask your kid one question at bedtime:</p>
              <blockquote style="border-left:3px solid #E8541A;margin:0 0 20px;padding:4px 20px;font-style:italic;color:#44403C;">"We're going to [destination] soon. What's one thing you want to figure out while we're there?"</blockquote>
              <p style="margin:0 0 20px;">That's it. Don't explain anything. Don't add context. Just ask and listen.</p>
              <p style="margin:0 0 20px;">If they don't have an answer, offer a mystery: <em>"I heard there's something really old hidden there..."</em></p>
              <p style="margin:0 0 20px;">This is the G in the GPS Method. It takes 90 seconds. It changes the entire first morning of a trip.</p>
              <p style="margin:0 0 20px;">Try it. Tell me how it goes.</p>
              <hr style="border:none;border-top:1px solid #E5DDD0;margin:28px 0;" />
              <p style="margin:0 0 20px;">The guide explains everything else. But that one question is where the whole thing starts.</p>
              <p style="margin:0 0 20px;">Talk soon,<br />Tushar</p>
              <p style="margin:24px 0 0;font-size:14px;color:#78716C;font-family:Arial,sans-serif;"><strong>P.S.</strong> — I wrote most of this book on my phone during my kids' bedtimes. If it sounds like someone who really needed this to exist — that's because he did.</p>
          `, unsubscribeUrl);

          await sendEmailWithAttachments({
            to: normalizedEmail,
            subject: 'Your guide is here (+ one thing to try tonight)',
            html: email1Html,
            attachments: [{
              content: pdfBase64,
              filename: 'Why-Family-Trips-Are-So-Hard-GPS-Method.pdf',
              type: 'application/pdf',
              disposition: 'attachment',
            }],
          });
          await storage.markGuideSubscriberEmailSent(normalizedEmail);
          await storage.scheduleGuideEmails(normalizedEmail);
          console.log(`[FreeGuide] Email 1 sent + drip sequence scheduled for ${normalizedEmail}`);
        } catch (emailErr) {
          console.error('[FreeGuide] Email send failed:', emailErr);
        }
      } else {
        console.log(`[FreeGuide] Duplicate subscription attempt: ${normalizedEmail}`);
      }
      return res.json({ success: true, isNew });
    } catch (err) {
      console.error('[FreeGuide] Subscribe error:', err);
      return res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  // ── GUIDE EMAIL UNSUBSCRIBE ───────────────────────────────────────────────────
  app.get("/api/free-guide/unsubscribe", async (req, res) => {
    const { email, token } = req.query as { email?: string; token?: string };
    if (!email || !token) {
      return res.redirect("/free-guide/unsubscribed?status=invalid");
    }
    try {
      const success = await storage.optOutGuideSubscriber(
        email.toLowerCase().trim(),
        token
      );
      if (success) {
        // Fire-and-forget confirmation email — don't block the redirect
        (async () => {
          try {
            const { sendEmail } = await import('../email');
            const html = `<div style="max-width:600px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;color:#1C1917;background:#ffffff;padding:40px 32px;"><p style="margin:0;">You've been unsubscribed and won't receive any more emails from this sequence.</p></div>`;
            await sendEmail({
              to: email.toLowerCase().trim(),
              subject: "You've been unsubscribed",
              html,
            });
          } catch (err) {
            console.error('[FreeGuide] Unsubscribe confirmation email failed:', err);
          }
        })();
        const normalizedForRedirect = email.toLowerCase().trim();
        return res.redirect(`/free-guide/unsubscribed?status=success&email=${encodeURIComponent(normalizedForRedirect)}`);
      } else {
        return res.redirect("/free-guide/unsubscribed?status=invalid");
      }
    } catch (err) {
      console.error("[FreeGuide] Unsubscribe error:", err);
      return res.redirect("/free-guide/unsubscribed?status=error");
    }
  });

  registerBlogRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
