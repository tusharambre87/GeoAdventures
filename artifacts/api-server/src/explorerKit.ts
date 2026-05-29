import { db } from "./db";
import { explorerKitItems, playerExplorerKit, playerSurpriseItems, players, accountStoryProgress, dailyQuestCities, getExplorerRank, KIT_TIER_RANK_GATES } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const RANK_REQUIREMENTS = KIT_TIER_RANK_GATES;

const EXPECTED_KIT_TIERS: Record<string, TierDefinition[]> = {
  'explorer-compass': [
    { name: "Bronze", tier: 1, label: "Simple brass compass", metric: "cities_discovered", threshold: 1 },
    { name: "Silver", tier: 2, label: "Polished compass", metric: "cities_discovered", threshold: 5 },
    { name: "Gold", tier: 3, label: "Ornate compass", metric: "cities_discovered", threshold: 15 },
    { name: "Mythic", tier: 4, label: "Glowing ancient compass", metric: "cities_discovered", threshold: 30 },
  ],
  'map-scroll': [
    { name: "Bronze", tier: 1, label: "Worn parchment map", metric: "cities_mastered", threshold: 1 },
    { name: "Silver", tier: 2, label: "Detailed map scroll", metric: "cities_mastered", threshold: 3 },
    { name: "Gold", tier: 3, label: "Golden illustrated map", metric: "cities_mastered", threshold: 10 },
    { name: "Mythic", tier: 4, label: "Living enchanted map", metric: "cities_mastered", threshold: 25 },
  ],
  'adventure-boots': [
    { name: "Bronze", tier: 1, label: "Worn leather boots", metric: "adventures_completed", threshold: 1 },
    { name: "Silver", tier: 2, label: "Reinforced travel boots", metric: "adventures_completed", threshold: 3 },
    { name: "Gold", tier: 3, label: "Golden explorer boots", metric: "adventures_completed", threshold: 10 },
    { name: "Mythic", tier: 4, label: "Legendary winged boots", metric: "adventures_completed", threshold: 25 },
  ],
  'sun-dial': [
    { name: "Bronze", tier: 1, label: "Simple sundial", metric: "stories_listened", threshold: 1 },
    { name: "Silver", tier: 2, label: "Polished sundial", metric: "stories_listened", threshold: 5 },
    { name: "Gold", tier: 3, label: "Ornate golden sundial", metric: "stories_listened", threshold: 15 },
    { name: "Mythic", tier: 4, label: "Celestial sundial", metric: "stories_listened", threshold: 40 },
  ],
  'star-navigator': [
    { name: "Bronze", tier: 1, label: "Bronze navigator badge", metric: "cities_discovered", threshold: 10 },
    { name: "Silver", tier: 2, label: "Silver navigator badge", metric: "cities_discovered", threshold: 25 },
    { name: "Gold", tier: 3, label: "Gold navigator badge", metric: "cities_discovered", threshold: 50 },
    { name: "Mythic", tier: 4, label: "Legendary navigator badge", metric: "cities_discovered", threshold: 80 },
  ],
  'globe-lens': [
    { name: "Bronze", tier: 1, label: "Simple magnifying lens", metric: "games_played", threshold: 10 },
    { name: "Silver", tier: 2, label: "Crystal globe lens", metric: "games_played", threshold: 40 },
    { name: "Gold", tier: 3, label: "Golden globe lens", metric: "games_played", threshold: 120 },
    { name: "Mythic", tier: 4, label: "All-seeing globe lens", metric: "games_played", threshold: 300 },
  ],
  'world-journal': [
    { name: "Bronze", tier: 1, label: "Simple travel notebook", metric: "continents_explored", threshold: 2 },
    { name: "Silver", tier: 2, label: "Leather-bound journal", metric: "continents_explored", threshold: 3 },
    { name: "Gold", tier: 3, label: "Golden world journal", metric: "continents_explored", threshold: 5 },
    { name: "Mythic", tier: 4, label: "Legendary world chronicle", metric: "continents_explored", threshold: 6 },
  ],
};

export async function ensureKitItemThresholds() {
  try {
    const allItems = await db.select().from(explorerKitItems).where(eq(explorerKitItems.isSurprise, false));
    let updatedCount = 0;

    for (const item of allItems) {
      const expectedTiers = EXPECTED_KIT_TIERS[item.id];
      if (!expectedTiers) continue;

      const currentTiers = (item.tiers as TierDefinition[]) || [];
      const needsUpdate = expectedTiers.some((expected, i) => {
        const current = currentTiers[i];
        return !current || current.threshold !== expected.threshold || current.metric !== expected.metric;
      });

      if (needsUpdate) {
        await db.update(explorerKitItems)
          .set({ tiers: expectedTiers })
          .where(eq(explorerKitItems.id, item.id));
        updatedCount++;
        console.log(`[ExplorerKit] Updated ${item.name} thresholds`);
      }
    }

    if (updatedCount > 0) {
      console.log(`[ExplorerKit] Synced ${updatedCount} kit item threshold(s)`);
    }
  } catch (e) {
    console.warn('[ExplorerKit] Failed to verify kit item thresholds:', e);
  }
}

export interface TierDefinition {
  tier: number;
  name: string;
  label: string;
  metric: string;
  threshold: number;
}

export interface KitItemProgress {
  itemId: string;
  name: string;
  description: string;
  iconPrefix: string;
  category: string;
  displayOrder: number;
  isSurprise: boolean;
  currentTier: number;
  currentTierName: string;
  currentTierLabel: string;
  nextTierThreshold: number | null;
  nextTierName: string | null;
  progressValue: number;
  progressPercent: number;
  maxTier: number;
  isMaxed: boolean;
  isUnlocked: boolean;
  tiers: TierDefinition[];
}

export interface SurpriseItemInfo {
  itemId: string;
  name: string;
  description: string;
  iconPrefix: string;
  unlockedAt: Date;
}

export interface ExplorerKitState {
  items: KitItemProgress[];
  surpriseItems: SurpriseItemInfo[];
  totalTierPoints: number;
  maxTierPoints: number;
}

interface PlayerMetrics {
  citiesDiscovered: number;
  citiesMastered: number;
  adventuresCompleted: number;
  storiesListened: number;
  gamesPlayed: number;
  continentsExplored: number;
}

async function getPlayerMetrics(playerId: string, userId: string | null): Promise<PlayerMetrics> {
  const player = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!player.length) {
    return { citiesDiscovered: 0, citiesMastered: 0, adventuresCompleted: 0, storiesListened: 0, gamesPlayed: 0, continentsExplored: 0 };
  }

  const p = player[0];
  const mastery = (p.passportMastery as any[]) || [];
  const customStamps = (p.customStamps as any[]) || [];

  const citiesDiscovered = mastery.filter((m: any) => m.discoveredDate).length;

  const citiesMastered = mastery.filter((m: any) =>
    m.star1 && m.star2 && m.star3
  ).length;

  const adventuresCompleted = customStamps.length;

  let storiesListened = 0;
  if (userId) {
    const storyProgress = await db.select().from(accountStoryProgress)
      .where(and(
        eq(accountStoryProgress.userId, userId),
        eq(accountStoryProgress.completed, true)
      ));
    storiesListened = storyProgress.length;
  }

  const gamesPlayed = p.gamesPlayed || 0;

  const discoveredCityIds = mastery.filter((m: any) => m.discoveredDate).map((m: any) => m.cityId);
  let continentsExplored = 0;
  if (discoveredCityIds.length > 0) {
    const allCities = await db.select({
      region: dailyQuestCities.region,
    }).from(dailyQuestCities);

    const cityRegionMap = new Map<string, string>();
    allCities.forEach(c => {
      if (c.region) cityRegionMap.set(c.region, c.region);
    });

    const allCitiesWithIds = await db.select({
      id: dailyQuestCities.id,
      region: dailyQuestCities.region,
    }).from(dailyQuestCities);

    const regionsDiscovered = new Set<string>();
    for (const c of allCitiesWithIds) {
      if (discoveredCityIds.includes(c.id) && c.region) {
        regionsDiscovered.add(c.region);
      }
    }

    const cityIdLower = discoveredCityIds.map((id: string) => id?.toLowerCase?.() || '');
    for (const c of allCitiesWithIds) {
      const cIdLower = String(c.id).toLowerCase();
      if (cityIdLower.includes(cIdLower) && c.region) {
        regionsDiscovered.add(c.region);
      }
    }

    continentsExplored = regionsDiscovered.size;
  }

  return { citiesDiscovered, citiesMastered, adventuresCompleted, storiesListened, gamesPlayed, continentsExplored };
}

function getMetricValue(metrics: PlayerMetrics, metric: string): number {
  switch (metric) {
    case 'cities_discovered': return metrics.citiesDiscovered;
    case 'cities_mastered': return metrics.citiesMastered;
    case 'adventures_completed': return metrics.adventuresCompleted;
    case 'stories_listened': return metrics.storiesListened;
    case 'games_played': return metrics.gamesPlayed;
    case 'continents_explored': return metrics.continentsExplored;
    default: return 0;
  }
}

function computeItemTier(tiers: TierDefinition[], metricValue: number, playerRankLevel: number = 12): { currentTier: number; nextThreshold: number | null } {
  let currentTier = 0;
  for (const t of tiers) {
    const requiredRank = RANK_REQUIREMENTS[t.tier] || 0;
    if (metricValue >= t.threshold && playerRankLevel >= requiredRank) {
      currentTier = t.tier;
    }
  }
  const nextTier = tiers.find(t => t.tier === currentTier + 1);
  return { currentTier, nextThreshold: nextTier?.threshold || null };
}

export async function getExplorerKitState(playerId: string, userId: string | null): Promise<ExplorerKitState> {
  const metrics = await getPlayerMetrics(playerId, userId);
  const allItems = await db.select().from(explorerKitItems).orderBy(explorerKitItems.displayOrder);
  const playerItems = await db.select().from(playerExplorerKit).where(eq(playerExplorerKit.playerId, playerId));
  const surpriseUnlocks = await db.select().from(playerSurpriseItems).where(eq(playerSurpriseItems.playerId, playerId));

  const player = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  const totalXp = player[0]?.totalXp || 0;
  const rankInfo = getExplorerRank(totalXp);
  const playerRankLevel = rankInfo.rank.level;

  const playerItemMap = new Map(playerItems.map(pi => [pi.itemId, pi]));
  const surpriseUnlockSet = new Set(surpriseUnlocks.map(s => s.itemId));

  const items: KitItemProgress[] = [];
  let totalTierPoints = 0;
  let maxTierPoints = 0;

  for (const item of allItems) {
    if (item.isSurprise) continue;

    const tiers = (item.tiers as TierDefinition[]) || [];
    if (tiers.length === 0) continue;

    const metric = tiers[0]?.metric || '';
    const metricValue = getMetricValue(metrics, metric);
    const { currentTier, nextThreshold } = computeItemTier(tiers, metricValue, playerRankLevel);

    const currentTierDef = tiers.find(t => t.tier === currentTier);
    const nextTierDef = tiers.find(t => t.tier === currentTier + 1);
    const maxTier = Math.max(...tiers.map(t => t.tier));
    const isMaxed = currentTier >= maxTier;
    const isUnlocked = currentTier > 0;

    const prevThreshold = currentTier > 0
      ? (tiers.find(t => t.tier === currentTier)?.threshold || 0)
      : 0;

    let progressPercent = 0;
    if (isMaxed) {
      progressPercent = 100;
    } else if (nextThreshold !== null) {
      const range = nextThreshold - prevThreshold;
      const progress = metricValue - prevThreshold;
      progressPercent = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 0;
    }

    totalTierPoints += currentTier;
    maxTierPoints += maxTier;

    items.push({
      itemId: item.id,
      name: item.name,
      description: item.description,
      iconPrefix: item.iconPrefix,
      category: item.category,
      displayOrder: item.displayOrder,
      isSurprise: false,
      currentTier,
      currentTierName: currentTierDef?.name || 'Locked',
      currentTierLabel: currentTierDef?.label || 'Not yet discovered',
      nextTierThreshold: nextThreshold,
      nextTierName: nextTierDef?.name || null,
      progressValue: metricValue,
      progressPercent,
      maxTier,
      isMaxed,
      isUnlocked,
      tiers,
    });
  }

  const surpriseItemsList: SurpriseItemInfo[] = [];
  for (const item of allItems) {
    if (!item.isSurprise) continue;
    if (surpriseUnlockSet.has(item.id)) {
      const unlock = surpriseUnlocks.find(s => s.itemId === item.id);
      surpriseItemsList.push({
        itemId: item.id,
        name: item.name,
        description: item.description,
        iconPrefix: item.iconPrefix,
        unlockedAt: unlock?.unlockedAt || new Date(),
      });
    }
  }

  return { items, surpriseItems: surpriseItemsList, totalTierPoints, maxTierPoints };
}

export interface UpgradeResult {
  itemId: string;
  itemName: string;
  oldTier: number;
  oldTierName: string;
  newTier: number;
  newTierName: string;
  iconPrefix: string;
}

export async function checkAndApplyUpgrades(playerId: string, userId: string | null): Promise<UpgradeResult[]> {
  const metrics = await getPlayerMetrics(playerId, userId);
  const allItems = await db.select().from(explorerKitItems).where(eq(explorerKitItems.isSurprise, false));
  const playerItems = await db.select().from(playerExplorerKit).where(eq(playerExplorerKit.playerId, playerId));

  const player = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  const totalXp = player[0]?.totalXp || 0;
  const rankInfo = getExplorerRank(totalXp);
  const playerRankLevel = rankInfo.rank.level;

  const playerItemMap = new Map(playerItems.map(pi => [pi.itemId, pi]));
  const upgrades: UpgradeResult[] = [];

  for (const item of allItems) {
    const tiers = (item.tiers as TierDefinition[]) || [];
    if (tiers.length === 0) continue;

    const metric = tiers[0]?.metric || '';
    const metricValue = getMetricValue(metrics, metric);
    const { currentTier } = computeItemTier(tiers, metricValue, playerRankLevel);

    const existing = playerItemMap.get(item.id);
    const savedTier = existing?.currentTier || 0;

    if (currentTier > savedTier) {
      const oldTierDef = tiers.find(t => t.tier === savedTier);
      const newTierDef = tiers.find(t => t.tier === currentTier);

      if (existing) {
        await db.update(playerExplorerKit)
          .set({ currentTier, progressValue: metricValue, lastUpgradedAt: new Date() })
          .where(eq(playerExplorerKit.id, existing.id));
      } else {
        await db.insert(playerExplorerKit).values({
          playerId,
          itemId: item.id,
          currentTier,
          progressValue: metricValue,
        });
      }

      upgrades.push({
        itemId: item.id,
        itemName: item.name,
        oldTier: savedTier,
        oldTierName: oldTierDef?.name || 'Locked',
        newTier: currentTier,
        newTierName: newTierDef?.name || 'Unknown',
        iconPrefix: item.iconPrefix,
      });
    } else if (existing && currentTier === savedTier) {
      await db.update(playerExplorerKit)
        .set({ progressValue: metricValue })
        .where(eq(playerExplorerKit.id, existing.id));
    }
  }

  return upgrades;
}

export async function rollForSurpriseItem(playerId: string, eventType: string): Promise<SurpriseItemInfo | null> {
  const surpriseItems = await db.select().from(explorerKitItems).where(eq(explorerKitItems.isSurprise, true));
  const alreadyUnlocked = await db.select().from(playerSurpriseItems).where(eq(playerSurpriseItems.playerId, playerId));
  const unlockedIds = new Set(alreadyUnlocked.map(s => s.itemId));

  const eligible = surpriseItems.filter(item => {
    if (unlockedIds.has(item.id)) return false;
    const events = (item.surpriseEligibleEvents as string[]) || [];
    return events.includes(eventType);
  });

  if (eligible.length === 0) return null;

  for (const item of eligible) {
    const chance = item.surpriseChance || 5;
    const roll = Math.random() * 100;
    if (roll < chance) {
      await db.insert(playerSurpriseItems).values({
        playerId,
        itemId: item.id,
      });

      return {
        itemId: item.id,
        name: item.name,
        description: item.description,
        iconPrefix: item.iconPrefix,
        unlockedAt: new Date(),
      };
    }
  }

  return null;
}
