import app from "./app";
import { logger } from "./lib/logger";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import compression from "compression";
import { registerRoutes } from "./routes/routes";
import { WebhookHandlers } from "./webhookHandlers";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { sendEmailWithAttachments } from "./email";
import { scheduleWeeklyMetrics } from "./dailyMetrics";
import { scheduleWeeklyAnalytics } from "./weeklyAnalytics";
import { scheduleParentSnapshots } from "./parentSnapshotEmails";
import {
  scheduleDailyQuestReminders,
  scheduleAllMonthlyNotifications,
  scheduleTripStartsTomorrowEmails,
} from "./pushNotifications";
import { scheduleStoryRetentionEmails } from "./storyEmailScheduler";
import { scheduleGuideEmails } from "./guideEmailScheduler";
import { storage } from "./storage";

// @ts-ignore
import { runMigrations } from "stripe-replit-sync";

process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught exception (non-fatal):", err.message);
  if (err.message?.includes("Cannot set property message")) {
    console.error("Neon driver error caught - server continues running");
    return;
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

// Enable gzip compression
app.use(compression());

// Serve attached_assets as static files
app.use(
  "/attached_assets",
  express.static(path.resolve(process.cwd(), "attached_assets")),
);

// Serve pre-generated and DALL-E memory images
app.use(
  "/memory-images",
  express.static(path.resolve(process.cwd(), "public", "memory-images"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".png")) res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=31536000");
    },
  }),
);

// Serve audio files
app.use(
  "/audio",
  express.static(path.resolve(process.cwd(), "public", "audio"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp3")) {
        res.setHeader("Content-Type", "audio/mpeg");
      }
    },
  }),
);

// Serve images
app.use(
  "/images",
  express.static(path.resolve(process.cwd(), "public", "images"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      }
    },
  }),
);

// ── Stripe init ───────────────────────────────────────────────────────────────
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL not set, skipping Stripe initialization");
    return;
  }
  console.log("Initializing Stripe schema...");
  await runMigrations({ databaseUrl });
  console.log("Stripe schema ready");

  const stripeSync = await getStripeSync();

  try {
    const currentDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (currentDomain) {
      const stripeClient = await getUncachableStripeClient();
      const allWebhooks = await stripeClient.webhookEndpoints.list({
        limit: 100,
      });
      const stale = allWebhooks.data.filter(
        (wh: any) => !wh.url.includes(currentDomain),
      );
      if (stale.length > 0) {
        console.log(
          `[Stripe] Deleting ${stale.length} stale webhook endpoint(s)...`,
        );
        await Promise.all(
          stale.map((wh: any) => stripeClient.webhookEndpoints.del(wh.id)),
        );
        console.log("[Stripe] Stale webhook endpoints removed.");
      }
    }
  } catch (cleanupError: any) {
    console.warn(
      "[Stripe] Stale webhook cleanup failed (non-fatal):",
      cleanupError?.message,
    );
  }

  try {
    console.log("Setting up managed webhook...");
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ["*"],
        description: "GeoQuest subscription webhook",
      },
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);
  } catch (webhookError: any) {
    const isEndpointLimitError =
      webhookError?.message?.includes("maximum of") &&
      webhookError?.message?.includes("webhook");
    if (isEndpointLimitError) {
      console.warn(
        "[Stripe] Webhook registration skipped — test account at endpoint limit.",
      );
    } else {
      console.error(
        "[Stripe] Webhook setup failed (non-fatal):",
        webhookError?.message,
      );
    }
  }

  stripeSync
    .syncBackfill()
    .then(() => {
      console.log("Stripe data synced");
    })
    .catch((err: any) => {
      console.error("Error syncing Stripe data:", err);
    });
}

async function initStripeWithRetry(retries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await initStripe();
      return;
    } catch (err: any) {
      console.error(
        `Stripe init attempt ${attempt}/${retries} failed:`,
        err.message,
      );
      if (attempt < retries) {
        console.log(`Retrying Stripe init in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }
  console.error(
    "Stripe initialization failed after all retries - server continues without Stripe",
  );
}

setTimeout(() => {
  initStripeWithRetry().catch((err) =>
    console.error("Stripe init error:", err),
  );
}, 2000);

// ── Stripe webhook — MUST be before express.json() ──────────────────────────
app.post(
  "/api/stripe/webhook/:uuid",
  express.raw({ type: "application/json" }),
  async (req: any, res: any) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }
      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

// ── Support form — MUST be before express.json() ─────────────────────────────
const supportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 10 },
});

app.post(
  "/api/support/submit",
  supportUpload.any(),
  async (req: any, res: any) => {
    try {
      const { feedbackType, country, email, description } = req.body;
      if (!feedbackType || !country || !description) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const files = (req.files as Express.Multer.File[]) || [];
      const feedbackLabels: Record<string, string> = {
        technical: "Technical Issue / Bug",
        suggestion: "Feature Suggestion",
        content: "Content Question",
        account: "Account Issue",
        other: "Other Feedback",
      };
      const feedbackLabel = feedbackLabels[feedbackType] || feedbackType;
      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">GeoQuest Support Request</h1>
        <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Type:</strong> ${feedbackLabel}</p>
          <p style="margin: 10px 0 0 0;"><strong>Country:</strong> ${country}</p>
          ${email ? `<p style="margin: 10px 0 0 0;"><strong>Reply-to Email:</strong> ${email}</p>` : ""}
        </div>
        <h2 style="color: #374151; margin-top: 25px;">Message:</h2>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #7c3aed;">
          <p style="margin: 0; white-space: pre-wrap;">${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
        ${files.length > 0 ? `<div style="margin-top: 20px;"><p style="color: #6b7280;"><strong>📎 ${files.length} attachment(s) included</strong></p></div>` : ""}
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p>Submitted via GeoQuest Support Form</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      </div>`;
      const attachments = files.map((file: Express.Multer.File) => ({
        content: file.buffer.toString("base64"),
        filename: file.originalname,
        type: file.mimetype,
        disposition: "attachment" as const,
      }));
      const emailSent = await sendEmailWithAttachments({
        to: "support@geoquestgame.com",
        subject: `[GeoQuest Support] ${feedbackLabel} - from ${country}`,
        html: emailHtml,
        attachments,
      });
      if (!emailSent) {
        console.error("📧 [Support] Failed to send email");
        return res
          .status(500)
          .json({ message: "Failed to send feedback email." });
      }
      res.json({ success: true, message: "Feedback submitted successfully" });
    } catch (error) {
      console.error("Error submitting support feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  },
);

// ── Body parsing — AFTER raw handlers ─────────────────────────────────────────
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// ── Start ──────────────────────────────────────────────────────────────────────
const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  const server = await registerRoutes(app);

  // Non-blocking: check city asset health
  import("./memoryImageEngine")
    .then(({ checkCityAssetHealth }) => {
      checkCityAssetHealth().catch(() => {});
    })
    .catch(() => {});

  // Seed stop library from existing city pools (fire-and-forget, idempotent)
  import("./planner/stopLibrarySeeder.js")
    .then(({ seedStopLibrary }) => {
      seedStopLibrary().catch((err: any) => {
        console.warn("[StopLibrary] Startup seed failed (non-fatal):", err?.message);
      });
    })
    .catch(() => {});

  // Pre-seed 20 fully-enriched stops for all 60 USA cities (fire-and-forget, idempotent)
  import("./planner/usaLibrarySeeder.js")
    .then(({ seedUSACityLibrary }) => {
      seedUSACityLibrary().catch((err: any) => {
        console.warn("[USALibrarySeeder] Startup seed failed (non-fatal):", err?.message);
      });
    })
    .catch(() => {});

  // Pre-seed 20 fully-enriched stops for all major international cities (fire-and-forget, idempotent)
  import("./planner/internationalLibrarySeeder.js")
    .then(({ seedInternationalCityLibrary }) => {
      seedInternationalCityLibrary().catch((err: any) => {
        console.warn("[InternationalLibrarySeeder] Startup seed failed (non-fatal):", err?.message);
      });
    })
    .catch(() => {});

  // Seed TESTLAUNCH26 launch promo code
  storage
    .getPromoCode("TESTLAUNCH26")
    .then((existing: any) => {
      if (!existing) {
        return storage
          .createPromoCode({
            code: "TESTLAUNCH26",
            label: "First 100 families — free trip",
            accessType: "full_free",
            discountType: null,
            discountValue: null,
            maxUses: 100,
            oneUsePerUser: true,
            appliesToTripId: null,
            appliesGlobally: true,
            isActive: true,
            expiresAt: null,
            createdBy: "system",
            notes: "Launch promo for first 100 GeoAdventures families.",
          })
          .then(() => console.log("[Promo] TESTLAUNCH26 seeded successfully"));
      } else {
        console.log(
          `[Promo] TESTLAUNCH26 exists (${existing.usedCount}/${existing.maxUses} used)`,
        );
      }
    })
    .catch((e: any) =>
      console.warn("[Promo] TESTLAUNCH26 seed failed (non-fatal):", e?.message),
    );

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    logger.error({ err }, "Unhandled error");
  });

  server.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  // Schedulers (non-blocking)
  try {
    scheduleWeeklyMetrics();
  } catch (e) {}
  try {
    scheduleWeeklyAnalytics();
  } catch (e) {}
  try {
    scheduleParentSnapshots();
  } catch (e) {}
  try {
    scheduleDailyQuestReminders();
  } catch (e) {}
  try {
    scheduleAllMonthlyNotifications();
  } catch (e) {}
  try {
    scheduleTripStartsTomorrowEmails();
  } catch (e) {}
  try {
    scheduleStoryRetentionEmails();
  } catch (e) {}
  try {
    scheduleGuideEmails();
  } catch (e) {}
})();
