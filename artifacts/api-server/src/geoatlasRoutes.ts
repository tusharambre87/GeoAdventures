import type { Express, Request, Response } from "express";
import { db } from "./db";
import { geoatlasCountries, geoatlasUserProgress, geoatlasLearningPacks, XP_REWARDS } from "@workspace/db";
import { eq, and, lte, sql, desc, asc, isNull } from "drizzle-orm";
import { storage } from "./storage";

const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

function getNextReviewDate(streakCount: number): Date {
  const dayIndex = Math.min(streakCount, REVIEW_INTERVALS.length - 1);
  const days = REVIEW_INTERVALS[dayIndex];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}

function computeStatus(timesCorrect: number, streakCount: number): string {
  if (streakCount >= 4 && timesCorrect >= 5) return "mastered";
  if (timesCorrect >= 1) return "remembering";
  return "learning";
}

export function registerGeoAtlasRoutes(app: Express) {
  app.get("/api/geoatlas/countries", async (_req: Request, res: Response) => {
    try {
      const countries = await db.select().from(geoatlasCountries).orderBy(asc(geoatlasCountries.continent), asc(geoatlasCountries.countryName));
      res.json(countries);
    } catch (error) {
      console.error("[GeoAtlas] Error fetching countries:", error);
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });

  app.get("/api/geoatlas/countries/:id", async (req: Request, res: Response) => {
    try {
      const [country] = await db.select().from(geoatlasCountries).where(eq(geoatlasCountries.id, req.params.id));
      if (!country) return res.status(404).json({ error: "Country not found" });
      res.json(country);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch country" });
    }
  });

  app.get("/api/geoatlas/continents", async (_req: Request, res: Response) => {
    try {
      const countries = await db.select().from(geoatlasCountries);
      const continentMap: Record<string, { total: number; countries: typeof countries }> = {};

      for (const c of countries) {
        if (!continentMap[c.continent]) {
          continentMap[c.continent] = { total: 0, countries: [] };
        }
        continentMap[c.continent].total++;
        continentMap[c.continent].countries.push(c);
      }

      const result = Object.entries(continentMap).map(([name, data]) => ({
        name,
        total: data.total,
        flagPreviews: data.countries.slice(0, 5).map(c => c.flagEmoji),
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch continents" });
    }
  });

  app.get("/api/geoatlas/continents/:continent", async (req: Request, res: Response) => {
    try {
      const countries = await db.select().from(geoatlasCountries)
        .where(eq(geoatlasCountries.continent, req.params.continent))
        .orderBy(asc(geoatlasCountries.countryName));

      const packs = await db.select().from(geoatlasLearningPacks)
        .where(eq(geoatlasLearningPacks.continent, req.params.continent))
        .orderBy(asc(geoatlasLearningPacks.packOrder));

      res.json({ countries, packs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch continent data" });
    }
  });

  app.get("/api/geoatlas/progress/:playerId", async (req: Request, res: Response) => {
    try {
      const progress = await db.select().from(geoatlasUserProgress)
        .where(eq(geoatlasUserProgress.playerId, req.params.playerId));

      const allCountries = await db.select({ id: geoatlasCountries.id }).from(geoatlasCountries);

      const learned = progress.filter(p => p.status !== "new").length;
      const mastered = progress.filter(p => p.status === "mastered").length;
      const capitalsLearned = progress.filter(p => p.capitalLearned).length;
      const flagsLearned = progress.filter(p => p.flagLearned).length;
      const mapsLearned = progress.filter(p => p.mapLearned).length;
      const reviewing = progress.filter(p => p.nextReviewAt && new Date(p.nextReviewAt) <= new Date()).length;

      res.json({
        totalCountries: allCountries.length,
        learned,
        mastered,
        capitalsLearned,
        flagsLearned,
        mapsLearned,
        reviewDue: reviewing,
        progressByCountry: progress,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  app.get("/api/geoatlas/progress/:playerId/continent/:continent", async (req: Request, res: Response) => {
    try {
      const countries = await db.select().from(geoatlasCountries)
        .where(eq(geoatlasCountries.continent, req.params.continent));

      const countryIds = countries.map(c => c.id);

      const progress = await db.select().from(geoatlasUserProgress)
        .where(eq(geoatlasUserProgress.playerId, req.params.playerId));

      const continentProgress = progress.filter(p => countryIds.includes(p.countryId));

      res.json({
        total: countries.length,
        learned: continentProgress.filter(p => p.status !== "new").length,
        mastered: continentProgress.filter(p => p.status === "mastered").length,
        capitalsLearned: continentProgress.filter(p => p.capitalLearned).length,
        flagsLearned: continentProgress.filter(p => p.flagLearned).length,
        progressMap: Object.fromEntries(continentProgress.map(p => [p.countryId, p])),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch continent progress" });
    }
  });

  app.get("/api/geoatlas/review-queue/:playerId", async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const dueProgress = await db.select().from(geoatlasUserProgress)
        .where(and(
          eq(geoatlasUserProgress.playerId, req.params.playerId),
          lte(geoatlasUserProgress.nextReviewAt, now)
        ))
        .orderBy(asc(geoatlasUserProgress.nextReviewAt));

      const countryIds = dueProgress.map(p => p.countryId);
      let countries: any[] = [];
      if (countryIds.length > 0) {
        const allCountries = await db.select().from(geoatlasCountries);
        countries = allCountries.filter(c => countryIds.includes(c.id));
      }

      const result = dueProgress.map(p => ({
        ...p,
        country: countries.find(c => c.id === p.countryId),
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch review queue" });
    }
  });

  app.post("/api/geoatlas/progress/:playerId/learn", async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const { countryId } = req.body;

      if (!countryId) return res.status(400).json({ error: "countryId required" });

      const [existing] = await db.select().from(geoatlasUserProgress)
        .where(and(
          eq(geoatlasUserProgress.playerId, playerId),
          eq(geoatlasUserProgress.countryId, countryId)
        ));

      if (existing) {
        const [updated] = await db.update(geoatlasUserProgress)
          .set({
            timesSeen: existing.timesSeen + 1,
            status: existing.status === "new" ? "learning" : existing.status,
            updatedAt: new Date(),
          })
          .where(eq(geoatlasUserProgress.id, existing.id))
          .returning();
        return res.json(updated);
      }

      const [created] = await db.insert(geoatlasUserProgress).values({
        playerId,
        countryId,
        status: "learning",
        timesSeen: 1,
      }).returning();

      res.json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to record learning" });
    }
  });

  app.post("/api/geoatlas/progress/:playerId/recall", async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const { countryId, correct, type } = req.body;

      if (!countryId || typeof correct !== "boolean") {
        return res.status(400).json({ error: "countryId and correct (boolean) required" });
      }

      let [existing] = await db.select().from(geoatlasUserProgress)
        .where(and(
          eq(geoatlasUserProgress.playerId, playerId),
          eq(geoatlasUserProgress.countryId, countryId)
        ));

      if (!existing) {
        [existing] = await db.insert(geoatlasUserProgress).values({
          playerId,
          countryId,
          status: "learning",
          timesSeen: 1,
        }).returning();
      }

      const newStreak = correct ? existing.streakCount + 1 : 0;
      const newCorrect = existing.timesCorrect + (correct ? 1 : 0);
      const newIncorrect = existing.timesIncorrect + (correct ? 0 : 1);
      const newStatus = correct ? computeStatus(newCorrect, newStreak) : (existing.status === "mastered" ? "remembering" : existing.status);
      const nextReview = getNextReviewDate(correct ? newStreak : 0);

      const typeUpdates: Record<string, boolean> = {};
      if (type === "capital" && correct) typeUpdates.capitalLearned = true;
      if (type === "flag" && correct) typeUpdates.flagLearned = true;
      if (type === "map" && correct) typeUpdates.mapLearned = true;

      const [updated] = await db.update(geoatlasUserProgress)
        .set({
          timesCorrect: newCorrect,
          timesIncorrect: newIncorrect,
          streakCount: newStreak,
          status: newStatus,
          lastReviewedAt: new Date(),
          nextReviewAt: nextReview,
          updatedAt: new Date(),
          ...typeUpdates,
        })
        .where(eq(geoatlasUserProgress.id, existing.id))
        .returning();

      let xpAwarded = 0;
      if (correct) {
        try {
          const xpAmount = (newStatus === "mastered" && existing.status !== "mastered")
            ? XP_REWARDS.GEOATLAS_COUNTRY_MASTERED
            : (type === "capital" ? XP_REWARDS.CAPITAL_QUEST_CORRECT : type === "flag" ? XP_REWARDS.FLAG_QUEST_CORRECT : XP_REWARDS.GEOATLAS_COUNTRY_LEARNED);
          await storage.awardXp(playerId, xpAmount);
          xpAwarded = xpAmount;
        } catch (e) { /* ignore */ }
      }

      res.json({ progress: updated, statusChanged: updated.status !== existing.status, xpAwarded });
    } catch (error) {
      console.error("[GeoAtlas] Recall error:", error);
      res.status(500).json({ error: "Failed to record recall" });
    }
  });

  app.get("/api/geoatlas/packs/:continent", async (req: Request, res: Response) => {
    try {
      const packs = await db.select().from(geoatlasLearningPacks)
        .where(eq(geoatlasLearningPacks.continent, req.params.continent))
        .orderBy(asc(geoatlasLearningPacks.packOrder));
      res.json(packs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch packs" });
    }
  });

  app.get("/api/geoatlas/memory-sprint/:playerId", async (req: Request, res: Response) => {
    try {
      const allCountries = await db.select().from(geoatlasCountries);
      const progress = await db.select().from(geoatlasUserProgress)
        .where(eq(geoatlasUserProgress.playerId, req.params.playerId));

      const progressMap = new Map(progress.map(p => [p.countryId, p]));

      const now = new Date();
      const reviewDue = progress
        .filter(p => p.nextReviewAt && new Date(p.nextReviewAt) <= now && p.status !== "mastered")
        .sort((a, b) => (a.nextReviewAt?.getTime() || 0) - (b.nextReviewAt?.getTime() || 0));

      const newCountries = allCountries.filter(c => !progressMap.has(c.id));

      const sprint: any[] = [];
      for (const r of reviewDue.slice(0, 2)) {
        const country = allCountries.find(c => c.id === r.countryId);
        if (country) sprint.push({ country, progress: r, type: "review" });
      }

      const shuffled = newCountries.sort(() => Math.random() - 0.5);
      for (const c of shuffled.slice(0, 5 - sprint.length)) {
        sprint.push({ country: c, progress: null, type: "new" });
      }

      res.json(sprint);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate sprint" });
    }
  });

  app.get("/api/geoatlas/quiz-options/:countryId", async (req: Request, res: Response) => {
    try {
      const [targetCountry] = await db.select().from(geoatlasCountries)
        .where(eq(geoatlasCountries.id, req.params.countryId));

      if (!targetCountry) return res.status(404).json({ error: "Country not found" });

      const sameContinent = await db.select().from(geoatlasCountries)
        .where(eq(geoatlasCountries.continent, targetCountry.continent));

      const others = sameContinent.filter(c => c.id !== targetCountry.id);
      const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [...shuffled, targetCountry].sort(() => Math.random() - 0.5);

      res.json({
        target: targetCountry,
        options: options.map(c => ({
          id: c.id,
          countryName: c.countryName,
          capital: c.capital,
          flagEmoji: c.flagEmoji,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate quiz options" });
    }
  });

  app.get("/api/geoatlas/recently-learned/:playerId", async (req: Request, res: Response) => {
    try {
      const recent = await db.select().from(geoatlasUserProgress)
        .where(and(
          eq(geoatlasUserProgress.playerId, req.params.playerId),
        ))
        .orderBy(desc(geoatlasUserProgress.updatedAt))
        .limit(5);

      const allCountries = await db.select().from(geoatlasCountries);
      const result = recent
        .filter(r => r.status !== "new")
        .map(r => ({
          ...r,
          country: allCountries.find(c => c.id === r.countryId),
        }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent" });
    }
  });
}
