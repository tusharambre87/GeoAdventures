import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import multer from "multer";
import { sendEmailWithAttachments } from "./email";
import { scheduleWeeklyMetrics, sendWeeklyMetricsReport } from "./dailyMetrics";
import { scheduleWeeklyAnalytics } from "./weeklyAnalytics";
import { scheduleParentSnapshots, sendAllParentSnapshots } from "./parentSnapshotEmails";
import { scheduleDailyQuestReminders, scheduleAllMonthlyNotifications, scheduleTripStartsTomorrowEmails } from "./pushNotifications";
import { scheduleStoryRetentionEmails } from "./storyEmailScheduler";
import { scheduleGuideEmails } from "./guideEmailScheduler";
import { pool } from "./db";
import { storage } from "./storage";

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (non-fatal):', err.message);
  if (err.message?.includes('Cannot set property message')) {
    console.error('Neon driver error caught - server continues running');
    return;
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const app = express();

// Enable gzip compression for all responses (reduces payload size by 70-90%)
app.use(compression());

// Serve attached_assets as static files
app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

// Serve pre-generated and DALL-E memory images
app.use('/memory-images', express.static(path.resolve(process.cwd(), 'public', 'memory-images'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
}));

// Serve audio files with correct MIME types (before Vite middleware)
app.use('/audio', express.static(path.resolve(process.cwd(), 'public', 'audio'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    }
  }
}));

app.use('/images', express.static(path.resolve(process.cwd(), 'public', 'images'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
}));

// Initialize Stripe on startup
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  console.log('Initializing Stripe schema...');
  await runMigrations({ databaseUrl });
  console.log('Stripe schema ready');

  const stripeSync = await getStripeSync();

  // Clean up stale webhook endpoints before registering, to avoid the 16-slot limit
  try {
    const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    if (currentDomain) {
      const stripeClient = await getUncachableStripeClient();
      const allWebhooks = await stripeClient.webhookEndpoints.list({ limit: 100 });
      const stale = allWebhooks.data.filter(
        (wh) => !wh.url.includes(currentDomain)
      );
      if (stale.length > 0) {
        console.log(`[Stripe] Deleting ${stale.length} stale webhook endpoint(s) from previous domains...`);
        await Promise.all(stale.map((wh) => stripeClient.webhookEndpoints.del(wh.id)));
        console.log('[Stripe] Stale webhook endpoints removed.');
      }
    }
  } catch (cleanupError: any) {
    console.warn('[Stripe] Stale webhook cleanup failed (non-fatal):', cleanupError?.message);
  }

  // Attempt webhook registration — non-fatal if Stripe test account is at the 16-endpoint limit
  try {
    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ['*'],
        description: 'GeoQuest subscription webhook',
      }
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);
  } catch (webhookError: any) {
    const isEndpointLimitError =
      webhookError?.message?.includes('maximum of') &&
      webhookError?.message?.includes('webhook');
    if (isEndpointLimitError) {
      console.warn('[Stripe] Webhook registration skipped — test account at endpoint limit. Payment events will not trigger real-time sync. Delete stale endpoints at https://dashboard.stripe.com/test/webhooks');
    } else {
      console.error('[Stripe] Webhook setup failed (non-fatal):', webhookError?.message);
    }
  }

  stripeSync.syncBackfill()
    .then(() => {
      console.log('Stripe data synced');
    })
    .catch((err: any) => {
      console.error('Error syncing Stripe data:', err);
    });
}

// Defer Stripe initialization to not block startup, with retry on failure
async function initStripeWithRetry(retries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await initStripe();
      return;
    } catch (err: any) {
      console.error(`Stripe init attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        console.log(`Retrying Stripe init in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }
  console.error('Stripe initialization failed after all retries - server continues without Stripe');
}

setTimeout(() => {
  initStripeWithRetry().catch(err => console.error('Stripe init error:', err));
}, 2000);

// Register Stripe webhook route BEFORE express.json()
app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Register Support form route BEFORE express.json() - multipart/form-data needs multer
const supportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB total (enforced as per-file limit)
    files: 10, // Max 10 files
  },
});

app.post('/api/support/submit', supportUpload.any(), async (req: any, res) => {
  try {
    const { feedbackType, country, email, description } = req.body;
    
    if (!feedbackType || !country || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Get uploaded files
    const files = req.files as Express.Multer.File[] || [];
    
    // Format feedback type label
    const feedbackLabels: Record<string, string> = {
      technical: "Technical Issue / Bug",
      suggestion: "Feature Suggestion",
      content: "Content Question",
      account: "Account Issue",
      other: "Other Feedback",
    };
    
    const feedbackLabel = feedbackLabels[feedbackType] || feedbackType;
    
    // Build email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">
          GeoQuest Support Request
        </h1>
        
        <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Type:</strong> ${feedbackLabel}</p>
          <p style="margin: 10px 0 0 0;"><strong>Country:</strong> ${country}</p>
          ${email ? `<p style="margin: 10px 0 0 0;"><strong>Reply-to Email:</strong> ${email}</p>` : ''}
        </div>
        
        <h2 style="color: #374151; margin-top: 25px;">Message:</h2>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #7c3aed;">
          <p style="margin: 0; white-space: pre-wrap;">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        
        ${files.length > 0 ? `
        <div style="margin-top: 20px;">
          <p style="color: #6b7280;"><strong>📎 ${files.length} attachment(s) included</strong></p>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>Submitted via GeoQuest Support Form</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>
    `;
    
    // Prepare attachments for SendGrid
    const attachments = files.map((file: Express.Multer.File) => ({
      content: file.buffer.toString('base64'),
      filename: file.originalname,
      type: file.mimetype,
      disposition: 'attachment' as const,
    }));
    
    // Send email to support with attachments
    const emailSent = await sendEmailWithAttachments({
      to: 'support@geoquestgame.com',
      subject: `[GeoQuest Support] ${feedbackLabel} - from ${country}`,
      html: emailHtml,
      attachments,
    });
    
    if (!emailSent) {
      console.error("📧 [Support] Failed to send email via SendGrid");
      return res.status(500).json({ message: "Failed to send feedback email. Please try again later." });
    }
    
    console.log("📧 [Support] Feedback submitted:", {
      feedbackType,
      country,
      hasEmail: !!email,
      descriptionLength: description.length,
      attachmentCount: files.length,
      timestamp: new Date().toISOString(),
    });
    
    res.json({ success: true, message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Error submitting support feedback:", error);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '50mb', // Allow large base64 image uploads for Travel Mode moments
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Non-blocking startup health check: warn if any CITY_STOP_MAPS city is missing
  // cached asset rows in trip_story_image_assets. Use POST /api/admin/regenerate-city-images
  // to backfill any missing slots after a deploy or DB wipe.
  import("./memoryImageEngine").then(({ checkCityAssetHealth }) => {
    checkCityAssetHealth().catch(() => {/* non-fatal */});
  }).catch(() => {/* non-fatal */});

  // ── Backfill dayIndex for stops that pre-date the column ─────────────────
  // Runs once per deploy, non-blocking. For each trip whose stops all have
  // dayIndex = null, compute the day assignment using distributeEvenly and
  // persist it so groupStopsByDay can use the sticky path going forward.
  (async () => {
    try {
      const { db } = await import("./db");
      const { travelTrips, travelStops } = await import("@shared/schema");
      const { eq, isNull, asc, sql: drizzleSql } = await import("drizzle-orm");

      // Find trips that have at least one stop with null dayIndex
      const tripsWithNullStops = await db
        .selectDistinct({ tripId: travelStops.tripId })
        .from(travelStops)
        .where(isNull(travelStops.dayIndex));

      let migrated = 0;
      for (const { tripId } of tripsWithNullStops) {
        const trip = await db.select().from(travelTrips).where(eq(travelTrips.id, tripId)).limit(1);
        if (!trip[0]) continue;
        const stops = await db.select().from(travelStops)
          .where(eq(travelStops.tripId, tripId))
          .orderBy(asc(travelStops.displayOrder));
        if (stops.length === 0) continue;

        // Determine numDays from trip dates
        let numDays = 1;
        const t = trip[0] as any;
        if (t.startDate && t.endDate) {
          numDays = Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
        } else if (t.tripDays && Number(t.tripDays) > 0) {
          numDays = Number(t.tripDays);
        } else if (t.plannerTripDays && Number(t.plannerTripDays) > 0) {
          numDays = Number(t.plannerTripDays);
        }

        // Group by cityGroup then distributeEvenly — mirrors groupStopsByDay legacy logic
        type StopRow = typeof stops[0] & { _di?: number };
        const cityOrder: string[] = [];
        const cityMap = new Map<string, StopRow[]>();
        for (const s of stops) {
          const key = (s.cityGroup as string | null) || '__default__';
          if (!cityMap.has(key)) { cityMap.set(key, []); cityOrder.push(key); }
          cityMap.get(key)!.push(s as StopRow);
        }

        const totalStops = stops.length;
        let globalDay = 0;
        for (const city of cityOrder) {
          const cs = (cityMap.get(city) || []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
          if (cs.length === 0) continue;
          const fraction = cs.length / Math.max(1, totalStops);
          const daysForCity = Math.max(1, Math.round(fraction * numDays));
          cs.forEach((s, i) => {
            const localDay = Math.floor(i * daysForCity / cs.length);
            (s as StopRow)._di = globalDay + localDay;
          });
          globalDay += daysForCity;
        }

        for (const s of stops as StopRow[]) {
          if (s.dayIndex != null) continue; // already set
          const di = s._di ?? 0;
          await db.update(travelStops).set({ dayIndex: di } as any).where(eq(travelStops.id, s.id));
        }
        migrated++;
      }
      if (migrated > 0) console.log(`[DayIndex] Backfilled ${migrated} trip(s) with sticky dayIndex values`);
    } catch (e: any) {
      console.warn('[DayIndex] Backfill failed (non-fatal):', e?.message);
    }
  })();

  // Seed TESTLAUNCH26 launch promo code (first 100 families get a free trip)
  storage.getPromoCode('TESTLAUNCH26').then(existing => {
    if (!existing) {
      return storage.createPromoCode({
        code: 'TESTLAUNCH26',
        label: 'First 100 families — free trip',
        accessType: 'full_free',
        discountType: null,
        discountValue: null,
        maxUses: 100,
        oneUsePerUser: true,
        appliesToTripId: null,
        appliesGlobally: true,
        isActive: true,
        expiresAt: null,
        createdBy: 'system',
        notes: 'Launch promo for first 100 GeoAdventures families.',
      }).then(() => console.log('[Promo] TESTLAUNCH26 seeded successfully'));
    } else {
      console.log(`[Promo] TESTLAUNCH26 exists (${existing.usedCount}/${existing.maxUses} used)`);
    }
  }).catch(e => console.warn('[Promo] TESTLAUNCH26 seed failed (non-fatal):', e?.message));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // GeoAdventures-specific meta tags for social sharing
  const geoAdventuresMeta = {
    title: "GeoAdventures: Turn family trips into lasting memories",
    description: "Short games, thoughtful prompts, and memory moments designed to help families learn, reflect, and explore together — before, during, and after travel."
  };

  function injectGeoAdventuresMeta(html: string): string {
    return html
      .replace(/<title>.*?<\/title>/, `<title>${geoAdventuresMeta.title}</title>`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${geoAdventuresMeta.title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${geoAdventuresMeta.description}" />`)
      .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${geoAdventuresMeta.title}" />`)
      .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${geoAdventuresMeta.description}" />`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${geoAdventuresMeta.description}" />`);
  }

  // Share page: inject OG meta tags for social link previews (/s/:tripId)
  async function getShareMeta(tripId: string): Promise<{ title: string; description: string; image: string | null }> {
    try {
      const { pool: dbPool } = await import('./db.js');
      const tripRes = await dbPool.query('SELECT name, destination, city FROM travel_trips WHERE id = $1', [tripId]);
      if (tripRes.rows.length === 0) return { title: "A Family Adventure", description: "Built for families who explore together", image: null };
      const t = tripRes.rows[0];
      const stopsRes = await dbPool.query('SELECT COUNT(*) FROM travel_stops WHERE trip_id = $1 AND is_visited = true', [tripId]);
      const stopCount = parseInt(stopsRes.rows[0]?.count ?? "0");
      const momentRes = await dbPool.query("SELECT photo_url FROM travel_moments WHERE trip_id = $1 AND photo_url IS NOT NULL LIMIT 1", [tripId]);
      const image = momentRes.rows[0]?.photo_url ?? null;
      return {
        title: `What they'll remember from this trip`,
        description: `${stopCount} stop${stopCount !== 1 ? "s" : ""} across ${t.destination || t.city || "their adventure"}. Built for families.`,
        image,
      };
    } catch { return { title: "A Family Adventure", description: "Built for families who explore together", image: null }; }
  }

  function injectSharePageMeta(html: string, meta: { title: string; description: string; image: string | null }): string {
    const esc = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const imgTag = meta.image ? `<meta property="og:image" content="${esc(meta.image)}" /><meta name="twitter:image" content="${esc(meta.image)}" />` : '';
    return html
      .replace(/<title>.*?<\/title>/, `<title>${esc(meta.title)}</title>`)
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${esc(meta.description)}" />${imgTag}`)
      .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${esc(meta.title)}" />`)
      .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${esc(meta.description)}" />`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${esc(meta.description)}" />`);
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Custom static file serving for production
    // Using process.cwd() instead of import.meta.dirname because esbuild bundles
    // the server code and import.meta.dirname resolves incorrectly to /home/runner
    // instead of /home/runner/dist in the Autoscale deployment environment
    const distPublicPath = path.resolve(process.cwd(), "dist", "public");
    log(`Production static files path: ${distPublicPath}`);
    
    if (!fs.existsSync(distPublicPath)) {
      log(`ERROR: dist/public not found at ${distPublicPath}`);
      // Fallback to serveStatic if custom path doesn't work
      serveStatic(app);
    } else {
      log(`Serving static files from: ${distPublicPath}`);
      app.use(express.static(distPublicPath, {
        maxAge: '1y',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        }
      }));
      
      // GeoAdventures route with custom meta tags for social sharing
      app.get("/geoadventures", (_req, res) => {
        const indexPath = path.resolve(distPublicPath, "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        html = injectGeoAdventuresMeta(html);
        res.set("Content-Type", "text/html").send(html);
      });

      // Share page route with dynamic OG meta tags for link previews
      app.get("/s/:tripId", async (req, res) => {
        const indexPath = path.resolve(distPublicPath, "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        const meta = await getShareMeta(req.params.tripId);
        html = injectSharePageMeta(html, meta);
        res.set("Content-Type", "text/html").send(html);
      });
      
      app.use("*", (req, res) => {
        const reqPath = req.originalUrl || req.url;
        if (reqPath.match(/\.(js|css|mjs|map|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp|mp4|webm)(\?.*)?$/)) {
          return res.status(404).end();
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.resolve(distPublicPath, "index.html"));
      });
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Schedule weekly metrics email at 6 AM each Sunday
    scheduleWeeklyMetrics();
    
    // Schedule weekly analytics email at 8 AM each Sunday
    scheduleWeeklyAnalytics();
    
    // Schedule parent weekly snapshot emails at 9 AM each Sunday
    scheduleParentSnapshots();
    
    // Schedule daily quest reminders at 6 PM each day
    scheduleDailyQuestReminders();
    
    // Schedule monthly push notifications
    scheduleAllMonthlyNotifications();

    // Schedule trip starts-tomorrow email reminders at 8am daily
    scheduleTripStartsTomorrowEmails();

    // Schedule story retention emails (1-week & 1-month) at 9am daily
    scheduleStoryRetentionEmails();

    // Schedule guide email drip sequence (Emails 2–5) at 10am daily
    scheduleGuideEmails();

    // Migration: add promo_code column to guide_email_schedules (for Email 5 personal codes)
    (async () => {
      try {
        await pool.query(`ALTER TABLE guide_email_schedules ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50)`);
        console.log('[Migration] guide_email_schedules.promo_code column ready');
      } catch (err: any) {
        console.error('[Migration] guide_email_schedules.promo_code error:', err.message);
      }
    })();

    // Create story_email_schedules table if it doesn't exist
    (async () => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS story_email_schedules (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            trip_id VARCHAR NOT NULL REFERENCES travel_trips(id) ON DELETE CASCADE,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            trigger_type VARCHAR(20) NOT NULL,
            send_at TIMESTAMP NOT NULL,
            sent_at TIMESTAMP,
            email_address VARCHAR NOT NULL
          )
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_story_email_schedules_trip_id" ON story_email_schedules(trip_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_story_email_schedules_send_at" ON story_email_schedules(send_at)`);
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_story_email_schedules_trip_trigger" ON story_email_schedules(trip_id, trigger_type)`);
        console.log('[Migration] story_email_schedules table ready');
      } catch (err: any) {
        console.error('[Migration] story_email_schedules error:', err.message);
      }
    })();

    // Migration: add canonical_template_used column and index to planner_trip_plans (safe idempotent)
    (async () => {
      try {
        await pool.query(`ALTER TABLE planner_trip_plans ADD COLUMN IF NOT EXISTS canonical_template_used VARCHAR`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_planner_trip_plans_canonical" ON planner_trip_plans (canonical_template_used)`);
        console.log('[Migration] planner_trip_plans.canonical_template_used column ready');
      } catch (err: any) {
        console.error('[Migration] canonical_template_used error:', err.message);
      }
    })();

    // Migration: add canonical_cities_used array column to planner_trip_plans (safe idempotent)
    // Tracks per-city canonical template usage in multi-city India trips where the
    // top-level destination may be a region/country rather than a single canonical city.
    (async () => {
      try {
        await pool.query(`ALTER TABLE planner_trip_plans ADD COLUMN IF NOT EXISTS canonical_cities_used TEXT[]`);
        console.log('[Migration] planner_trip_plans.canonical_cities_used column ready');
      } catch (err: any) {
        console.error('[Migration] canonical_cities_used error:', err.message);
      }
    })();

    // Migration: add is_shared_community to travel_moments (community photo opt-in)
    (async () => {
      try {
        await pool.query(`ALTER TABLE travel_moments ADD COLUMN IF NOT EXISTS is_shared_community boolean DEFAULT false`);
        console.log('[Migration] travel_moments.is_shared_community column ready');
      } catch (err: any) {
        console.error('[Migration] travel_moments.is_shared_community error:', err.message);
      }
    })();

    // Migration: add review_required and review_note to planner_trip_plan_stops (source confidence gate)
    (async () => {
      try {
        await pool.query(`ALTER TABLE planner_trip_plan_stops ADD COLUMN IF NOT EXISTS review_required boolean NOT NULL DEFAULT false`);
        await pool.query(`ALTER TABLE planner_trip_plan_stops ADD COLUMN IF NOT EXISTS review_note text`);
        console.log('[Migration] planner_trip_plan_stops.review_required + review_note columns ready');
      } catch (err: any) {
        console.error('[Migration] planner_trip_plan_stops review columns error:', err.message);
      }
    })();

    // Migration: add review_required and review_note to travel_stops (propagated from planner at start-adventure)
    (async () => {
      try {
        await pool.query(`ALTER TABLE travel_stops ADD COLUMN IF NOT EXISTS review_required boolean NOT NULL DEFAULT false`);
        await pool.query(`ALTER TABLE travel_stops ADD COLUMN IF NOT EXISTS review_note text`);
        console.log('[Migration] travel_stops.review_required + review_note columns ready');
      } catch (err: any) {
        console.error('[Migration] travel_stops review columns error:', err.message);
      }
    })();

    // Migration: add cached_at and invalidated_at to planner_stop_intelligence (TTL/serve-then-refresh)
    // Backfill: existing rows get cached_at = enriched_at so staleness is computed from
    // actual enrichment time rather than the migration moment, keeping legacy data eligible
    // for background refresh through the serve-then-refresh pipeline.
    (async () => {
      try {
        await pool.query(`ALTER TABLE planner_stop_intelligence ADD COLUMN IF NOT EXISTS cached_at TIMESTAMP DEFAULT NOW()`);
        await pool.query(`ALTER TABLE planner_stop_intelligence ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP`);
        // Backfill: where enriched_at is known and predates cached_at by more than 5 minutes
        // (i.e. cached_at was just stamped NOW() by the DEFAULT above, not by an actual enrichment),
        // reset cached_at to enriched_at so staleness is accurately computed from enrichment time.
        await pool.query(`
          UPDATE planner_stop_intelligence
          SET cached_at = enriched_at
          WHERE enriched_at IS NOT NULL
            AND enriched_at < cached_at - INTERVAL '5 minutes'
        `);
        console.log('[Migration] planner_stop_intelligence.cached_at + invalidated_at columns ready');
      } catch (err: any) {
        console.error('[Migration] planner_stop_intelligence cache TTL columns error:', err.message);
      }
    })();

    // One-time migration v2: add stars to XP for explorers who had BOTH stars and XP
    // First migration used MAX which was wrong — it didn't ADD stars for users who already had XP > stars.
    // Fix: for those explorers, add stars on top of current XP.
    (async () => {
      try {
        await pool.query(`ALTER TABLE players ADD COLUMN IF NOT EXISTS stars_xp_v2_done boolean DEFAULT false`);
        const result = await pool.query(
          `UPDATE players 
           SET total_xp = COALESCE(total_xp, 0) + COALESCE(stars_earned_total, 0),
               stars_xp_v2_done = true
           WHERE COALESCE(stars_earned_total, 0) > 0 
             AND COALESCE(total_xp, 0) > COALESCE(stars_earned_total, 0)
             AND NOT COALESCE(stars_xp_v2_done, false)
           RETURNING name, stars_earned_total, total_xp`
        );
        if (result.rowCount && result.rowCount > 0) {
          console.log(`⭐→XP Migration v2: Added stars to XP for ${result.rowCount} explorers`);
          result.rows.forEach((r: any) => console.log(`  ${r.name}: +${r.stars_earned_total} stars → total ${r.total_xp} XP`));
        } else {
          console.log('⭐→XP Migration v2: No explorers needed updating (all done or none qualify)');
        }
        await pool.query(`UPDATE players SET stars_xp_v2_done = true WHERE COALESCE(stars_earned_total, 0) > 0`);
      } catch (err: any) {
        console.error('Stars→XP migration v2 error:', err.message);
      }
    })();

    // Migration: add opted_out and unsubscribe_token to guide_subscribers (email opt-out)
    // Backfill: generate a UUID token for any existing subscribers that don't have one yet
    // so that every drip email they receive includes a functional unsubscribe link.
    (async () => {
      try {
        await pool.query(`ALTER TABLE guide_subscribers ADD COLUMN IF NOT EXISTS opted_out boolean NOT NULL DEFAULT false`);
        await pool.query(`ALTER TABLE guide_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token text`);
        // Backfill tokens for existing subscribers who have none
        const { rowCount } = await pool.query(`
          UPDATE guide_subscribers
          SET unsubscribe_token = gen_random_uuid()::text
          WHERE unsubscribe_token IS NULL
        `);
        console.log(`[Migration] guide_subscribers opted_out + unsubscribe_token ready (backfilled ${rowCount ?? 0} existing subscribers)`);
      } catch (err: any) {
        console.error('[Migration] guide_subscribers opt-out columns error:', err.message);
      }
    })();
  });
})();
