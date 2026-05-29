import { storage } from "./storage";
import { sendWeeklyAnalyticsEmail, type WeeklyAnalytics } from "./email";

function getLastCompletedWeekDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(0, 0, 0, 0);
  
  const previousSunday = new Date(lastSunday);
  previousSunday.setDate(lastSunday.getDate() - 7);
  
  return { startDate: previousSunday, endDate: lastSunday };
}

export async function calculateWeeklyMetrics(): Promise<WeeklyAnalytics> {
  const { startDate, endDate } = getLastCompletedWeekDates();
  
  const metrics = await storage.getAnalyticsMetrics(startDate, endDate);
  const pwaStats = await storage.getPwaInstallStats(startDate, endDate);
  
  const weekStart = startDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const endDateDisplay = new Date(endDate);
  endDateDisplay.setDate(endDateDisplay.getDate() - 1);
  const weekEnd = endDateDisplay.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  return {
    weekStart,
    weekEnd,
    totalSessions: metrics.totalSessions,
    uniqueVisitors: metrics.uniqueVisitors,
    firstSessionCompletionRate: metrics.firstSessionCompletionRate,
    avgTimeToFirstPlaySeconds: metrics.avgTimeToFirstPlaySeconds,
    avgSessionLengthSeconds: metrics.avgSessionLengthSeconds,
    mobilePercent: metrics.mobilePercent,
    desktopPercent: metrics.desktopPercent,
    gamesPerSession: metrics.gamesPerSession,
    game2StartPercent: metrics.game2StartPercent,
    game3StartPercent: metrics.game3StartPercent,
    shareClicks: metrics.shareClicks,
    pwaInstalls: pwaStats.installs,
    pwaReturnRate: pwaStats.returnRate,
  };
}

export async function saveWeeklySnapshot(): Promise<void> {
  const { startDate, endDate } = getLastCompletedWeekDates();
  
  const metrics = await storage.getAnalyticsMetrics(startDate, endDate);
  const pwaStats = await storage.getPwaInstallStats(startDate, endDate);
  
  await storage.createWeeklySnapshot({
    weekStartDate: startDate,
    weekEndDate: endDate,
    totalSessions: metrics.totalSessions,
    uniqueVisitors: metrics.uniqueVisitors,
    gamesPerSession: metrics.gamesPerSession,
    game2StartPercent: metrics.game2StartPercent,
    game3StartPercent: metrics.game3StartPercent,
    shareClicks: metrics.shareClicks,
    firstSessionCompletionRate: metrics.firstSessionCompletionRate,
    avgTimeToFirstPlaySeconds: metrics.avgTimeToFirstPlaySeconds,
    avgSessionLengthSeconds: metrics.avgSessionLengthSeconds,
    mobilePercent: metrics.mobilePercent,
    desktopPercent: metrics.desktopPercent,
    pwaInstalls: pwaStats.installs,
    pwaReturnRate: pwaStats.returnRate,
  });
  
  console.log(`[WeeklyAnalytics] Saved snapshot for ${startDate.toISOString()} - ${endDate.toISOString()}`);
}

export async function sendWeeklyAnalyticsReport(): Promise<boolean> {
  try {
    const metrics = await calculateWeeklyMetrics();
    const result = await sendWeeklyAnalyticsEmail(metrics);
    
    if (result) {
      console.log(`[WeeklyAnalytics] Sent weekly analytics report for ${metrics.weekStart} - ${metrics.weekEnd}`);
      await saveWeeklySnapshot();
    } else {
      console.error(`[WeeklyAnalytics] Failed to send weekly analytics report`);
    }
    
    return result;
  } catch (error) {
    console.error('[WeeklyAnalytics] Error sending weekly analytics:', error);
    return false;
  }
}

let weeklyAnalyticsTimer: NodeJS.Timeout | null = null;

function getNextSunday8am(): Date {
  const now = new Date();
  const nextSunday = new Date(now);
  
  const currentDay = now.getDay();
  
  if (currentDay === 0) {
    if (now.getHours() < 8) {
      nextSunday.setHours(8, 0, 0, 0);
    } else {
      nextSunday.setDate(now.getDate() + 7);
      nextSunday.setHours(8, 0, 0, 0);
    }
  } else {
    const daysUntilSunday = 7 - currentDay;
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(8, 0, 0, 0);
  }
  
  return nextSunday;
}

export function scheduleWeeklyAnalytics() {
  if (weeklyAnalyticsTimer) {
    clearTimeout(weeklyAnalyticsTimer);
    weeklyAnalyticsTimer = null;
  }
  
  const nextRun = getNextSunday8am();
  const now = new Date();
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  
  console.log(`[WeeklyAnalytics] Scheduling next report for ${nextRun.toISOString()} (Sunday 8am)`);
  
  weeklyAnalyticsTimer = setTimeout(async () => {
    await sendWeeklyAnalyticsReport();
    scheduleWeeklyAnalytics();
  }, msUntilNextRun);
}
