import { db } from "./db";
import { gameEvents, userSessions } from "@shared/schema";
import { sql, gte, and, lt } from "drizzle-orm";
import { sendWeeklyMetricsEmail, type DayMetrics, type WeeklyMetricsReport } from "./email";

export async function calculateDayMetrics(date: Date): Promise<DayMetrics> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const sessionsResult = await db
    .select({
      totalSessions: sql<number>`COUNT(DISTINCT ${userSessions.id})`,
      totalGamesPlayed: sql<number>`COALESCE(SUM(${userSessions.gamesPlayed}), 0)`
    })
    .from(userSessions)
    .where(
      and(
        gte(userSessions.sessionStart, startOfDay),
        lt(userSessions.sessionStart, endOfDay)
      )
    );

  const totalSessions = Number(sessionsResult[0]?.totalSessions) || 0;
  const totalGamesPlayed = Number(sessionsResult[0]?.totalGamesPlayed) || 0;
  const gamesPerSession = totalSessions > 0 ? totalGamesPlayed / totalSessions : 0;

  const sessionsWithGamesResult = await db
    .select({
      gamesPlayed: userSessions.gamesPlayed
    })
    .from(userSessions)
    .where(
      and(
        gte(userSessions.sessionStart, startOfDay),
        lt(userSessions.sessionStart, endOfDay),
        gte(userSessions.gamesPlayed, 1)
      )
    );

  const sessionsWithAtLeast1Game = sessionsWithGamesResult.length;
  const sessionsWithAtLeast2Games = sessionsWithGamesResult.filter(s => (s.gamesPlayed || 0) >= 2).length;
  const sessionsWithAtLeast3Games = sessionsWithGamesResult.filter(s => (s.gamesPlayed || 0) >= 3).length;

  const game2StartPercent = sessionsWithAtLeast1Game > 0 
    ? (sessionsWithAtLeast2Games / sessionsWithAtLeast1Game) * 100 
    : 0;
  const game3StartPercent = sessionsWithAtLeast2Games > 0 
    ? (sessionsWithAtLeast3Games / sessionsWithAtLeast2Games) * 100 
    : 0;

  const shareClicksResult = await db
    .select({
      count: sql<number>`COUNT(*)`
    })
    .from(gameEvents)
    .where(
      and(
        sql`${gameEvents.eventType} = 'share_click'`,
        gte(gameEvents.createdAt, startOfDay),
        lt(gameEvents.createdAt, endOfDay)
      )
    );

  const shareClicks = Number(shareClicksResult[0]?.count) || 0;

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    dayName,
    date: dateStr,
    totalSessions,
    totalGamesPlayed,
    gamesPerSession,
    game2StartPercent,
    game3StartPercent,
    shareClicks
  };
}

function getLastCompletedWeekRange(): { monday: Date; sunday: Date } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const dayOfWeek = now.getDay();
  
  const lastSunday = new Date(now);
  if (dayOfWeek === 0) {
    lastSunday.setDate(now.getDate() - 7);
  } else {
    lastSunday.setDate(now.getDate() - dayOfWeek);
  }
  
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  
  return { monday: lastMonday, sunday: lastSunday };
}

export interface DayMetricsRaw extends DayMetrics {
  sessionsWithG1: number;
  sessionsWithG2: number;
  sessionsWithG3: number;
}

export async function calculateDayMetricsRaw(date: Date): Promise<DayMetricsRaw> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const sessionsResult = await db
    .select({
      totalSessions: sql<number>`COUNT(DISTINCT ${userSessions.id})`,
      totalGamesPlayed: sql<number>`COALESCE(SUM(${userSessions.gamesPlayed}), 0)`
    })
    .from(userSessions)
    .where(
      and(
        gte(userSessions.sessionStart, startOfDay),
        lt(userSessions.sessionStart, endOfDay)
      )
    );

  const totalSessions = Number(sessionsResult[0]?.totalSessions) || 0;
  const totalGamesPlayed = Number(sessionsResult[0]?.totalGamesPlayed) || 0;
  const gamesPerSession = totalSessions > 0 ? totalGamesPlayed / totalSessions : 0;

  const sessionsWithGamesResult = await db
    .select({
      gamesPlayed: userSessions.gamesPlayed
    })
    .from(userSessions)
    .where(
      and(
        gte(userSessions.sessionStart, startOfDay),
        lt(userSessions.sessionStart, endOfDay),
        gte(userSessions.gamesPlayed, 1)
      )
    );

  const sessionsWithG1 = sessionsWithGamesResult.length;
  const sessionsWithG2 = sessionsWithGamesResult.filter(s => (s.gamesPlayed || 0) >= 2).length;
  const sessionsWithG3 = sessionsWithGamesResult.filter(s => (s.gamesPlayed || 0) >= 3).length;

  const game2StartPercent = sessionsWithG1 > 0 
    ? (sessionsWithG2 / sessionsWithG1) * 100 
    : 0;
  const game3StartPercent = sessionsWithG2 > 0 
    ? (sessionsWithG3 / sessionsWithG2) * 100 
    : 0;

  const shareClicksResult = await db
    .select({
      count: sql<number>`COUNT(*)`
    })
    .from(gameEvents)
    .where(
      and(
        sql`${gameEvents.eventType} = 'share_click'`,
        gte(gameEvents.createdAt, startOfDay),
        lt(gameEvents.createdAt, endOfDay)
      )
    );

  const shareClicks = Number(shareClicksResult[0]?.count) || 0;

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    dayName,
    date: dateStr,
    totalSessions,
    totalGamesPlayed,
    gamesPerSession,
    game2StartPercent,
    game3StartPercent,
    shareClicks,
    sessionsWithG1,
    sessionsWithG2,
    sessionsWithG3
  };
}

export async function calculateWeeklyMetricsReport(): Promise<WeeklyMetricsReport> {
  const { monday, sunday } = getLastCompletedWeekRange();
  const days: DayMetrics[] = [];
  
  let totalSessionsWithG1 = 0;
  let totalSessionsWithG2 = 0;
  let totalSessionsWithG3 = 0;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const rawMetrics = await calculateDayMetricsRaw(date);
    
    totalSessionsWithG1 += rawMetrics.sessionsWithG1;
    totalSessionsWithG2 += rawMetrics.sessionsWithG2;
    totalSessionsWithG3 += rawMetrics.sessionsWithG3;
    
    const { sessionsWithG1, sessionsWithG2, sessionsWithG3, ...dayMetrics } = rawMetrics;
    days.push(dayMetrics);
  }

  const totalSessions = days.reduce((sum, d) => sum + d.totalSessions, 0);
  const totalGamesPlayed = days.reduce((sum, d) => sum + d.totalGamesPlayed, 0);
  const totalShareClicks = days.reduce((sum, d) => sum + d.shareClicks, 0);
  
  const totals = {
    totalSessions,
    totalGamesPlayed,
    avgGamesPerSession: totalSessions > 0 ? totalGamesPlayed / totalSessions : 0,
    avgGame2StartPercent: totalSessionsWithG1 > 0 
      ? (totalSessionsWithG2 / totalSessionsWithG1) * 100 
      : 0,
    avgGame3StartPercent: totalSessionsWithG2 > 0 
      ? (totalSessionsWithG3 / totalSessionsWithG2) * 100 
      : 0,
    totalShareClicks
  };

  return {
    weekStart: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    weekEnd: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    days,
    totals
  };
}

export async function sendWeeklyMetricsReport(): Promise<boolean> {
  try {
    const report = await calculateWeeklyMetricsReport();
    const result = await sendWeeklyMetricsEmail(report);
    
    if (result) {
      console.log(`[WeeklyMetrics] Sent weekly metrics report for ${report.weekStart} - ${report.weekEnd}`);
    } else {
      console.error(`[WeeklyMetrics] Failed to send weekly metrics report`);
    }
    
    return result;
  } catch (error) {
    console.error('[WeeklyMetrics] Error sending weekly metrics:', error);
    return false;
  }
}

let weeklyMetricsTimer: NodeJS.Timeout | null = null;

function getNextSunday6am(): Date {
  const now = new Date();
  const nextSunday = new Date(now);
  
  const currentDay = now.getDay();
  
  if (currentDay === 0) {
    if (now.getHours() < 6) {
      nextSunday.setHours(6, 0, 0, 0);
    } else {
      nextSunday.setDate(now.getDate() + 7);
      nextSunday.setHours(6, 0, 0, 0);
    }
  } else {
    const daysUntilSunday = 7 - currentDay;
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(6, 0, 0, 0);
  }
  
  return nextSunday;
}

export function scheduleWeeklyMetrics() {
  if (weeklyMetricsTimer) {
    clearTimeout(weeklyMetricsTimer);
    weeklyMetricsTimer = null;
  }
  
  const nextRun = getNextSunday6am();
  const now = new Date();
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  
  console.log(`[WeeklyMetrics] Scheduling next report for ${nextRun.toISOString()} (Sunday 6am)`);
  
  weeklyMetricsTimer = setTimeout(async () => {
    await sendWeeklyMetricsReport();
    scheduleWeeklyMetrics();
  }, msUntilNextRun);
}
