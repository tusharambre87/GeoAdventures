/**
 * CANONICAL RoamUs travel-themed XP rank table.
 * This is the single source of truth — import from here everywhere ranks are shown.
 * lib/db/src/schema/schema.ts re-exports these as EXPLORER_XP_RANKS / getExplorerRank
 * for backward compatibility with existing web consumers.
 */

export const ROAMUS_XP_RANKS = [
  { level: 1,  id: 'first_steps',        name: 'First Steps',        minXp: 0,       icon: '\uD83D\uDC23' },
  { level: 2,  id: 'wanderer',           name: 'Wanderer',           minXp: 100,     icon: '\uD83C\uDF31' },
  { level: 3,  id: 'road_tripper',       name: 'Road Tripper',       minXp: 300,     icon: '\uD83D\uDE97' },
  { level: 4,  id: 'trailblazer',        name: 'Trailblazer',        minXp: 650,     icon: '\uD83E\uDD7E' },
  { level: 5,  id: 'adventurer',         name: 'Adventurer',         minXp: 1200,    icon: '\uD83C\uDF92' },
  { level: 6,  id: 'explorer',           name: 'Explorer',           minXp: 2000,    icon: '\uD83D\uDD2D' },
  { level: 7,  id: 'journey_maker',      name: 'Journey Maker',      minXp: 3200,    icon: '\uD83D\uDDFA\uFE0F' },
  { level: 8,  id: 'globe_chaser',       name: 'Globe Chaser',       minXp: 4800,    icon: '\uD83C\uDF0D' },
  { level: 9,  id: 'horizon_seeker',     name: 'Horizon Seeker',     minXp: 7000,    icon: '\uD83C\uDF05' },
  { level: 10, id: 'master_traveler',    name: 'Master Traveler',    minXp: 10000,   icon: '\u2B50' },
  { level: 11, id: 'wayfinder',          name: 'Wayfinder',          minXp: 14000,   icon: '\uD83E\uDDED' },
  { level: 12, id: 'voyage_legend',      name: 'Voyage Legend',      minXp: 19000,   icon: '\uD83C\uDFC6' },
  { level: 13, id: 'world_wanderer',     name: 'World Wanderer',     minXp: 28000,   icon: '\uD83C\uDF10' },
  { level: 14, id: 'grand_voyager',      name: 'Grand Voyager',      minXp: 40000,   icon: '\u2708\uFE0F' },
  { level: 15, id: 'odyssey_master',     name: 'Odyssey Master',     minXp: 55000,   icon: '\uD83D\uDDFF' },
  { level: 16, id: 'legendary_nomad',    name: 'Legendary Nomad',    minXp: 72000,   icon: '\uD83D\uDC51' },
  { level: 17, id: 'trailblazing_icon',  name: 'Trailblazing Icon',  minXp: 88000,   icon: '\u26A1' },
  { level: 18, id: 'ultimate_explorer',  name: 'Ultimate Explorer',  minXp: 100000,  icon: '\uD83C\uDF1F' },
] as const;

export type RoamusXpRank = typeof ROAMUS_XP_RANKS[number];

/** First level whose level >= 13 is considered "elite" */
export const ROAMUS_ELITE_THRESHOLD = 28000;

/**
 * Resolve a player's current rank, next rank, and progress percent from their total XP.
 * Returns the same shape as the legacy getExplorerRank for drop-in compatibility.
 */
export function getRoamusRank(totalXp: number) {
  let currentRank: RoamusXpRank = ROAMUS_XP_RANKS[0];
  for (const rank of ROAMUS_XP_RANKS) {
    if (totalXp >= rank.minXp) {
      currentRank = rank;
    } else {
      break;
    }
  }

  const currentIndex = ROAMUS_XP_RANKS.findIndex(r => r.id === currentRank.id);
  const nextRank = currentIndex < ROAMUS_XP_RANKS.length - 1
    ? ROAMUS_XP_RANKS[currentIndex + 1]
    : null;

  const xpIntoCurrentLevel = totalXp - currentRank.minXp;
  const xpNeededForNext = nextRank ? nextRank.minXp - currentRank.minXp : 0;
  const progressPercent = nextRank
    ? Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNext) * 100))
    : 100;

  const isElite = currentRank.level >= 13;

  return {
    rank: currentRank as { level: number; id: string; name: string; minXp: number; icon: string },
    level: currentRank.level,
    totalXp,
    nextRank: nextRank as { level: number; id: string; name: string; minXp: number; icon: string } | null,
    xpToNextRank: nextRank ? nextRank.minXp - totalXp : 0,
    progressPercent,
    isElite,
    eliteRank: isElite ? (currentRank as { level: number; id: string; name: string; minXp: number; icon: string }) : null,
    nextEliteRank: null,
  };
}
