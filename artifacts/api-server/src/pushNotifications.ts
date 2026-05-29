import webpush from 'web-push';
import { storage } from './storage';
import type { PushSubscription } from '@workspace/db';
import { sendTripStartsTomorrowEmail } from './email';
import { db } from './db';
import { travelTrips } from '@workspace/db';
import { eq, and, gte, lt, ne } from 'drizzle-orm';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@geoquest.games',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[Push] VAPID keys configured');
} else {
  console.warn('[Push] VAPID keys not configured - push notifications will be disabled');
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] Cannot send notification - VAPID keys not configured');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/favicon.png',
    badge: payload.badge || '/favicon.png',
    url: payload.url || '/',
    tag: payload.tag,
    data: payload.data,
  });

  try {
    await webpush.sendNotification(pushSubscription, notificationPayload);
    console.log(`[Push] Notification sent to ${subscription.endpoint.substring(0, 50)}...`);
    return true;
  } catch (error: any) {
    console.error('[Push] Failed to send notification:', error.message);
    
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('[Push] Subscription expired, removing...');
      await storage.deletePushSubscriptionByEndpoint(subscription.endpoint);
    }
    
    return false;
  }
}

const DAILY_QUEST_MESSAGES = [
  {
    title: "Today's GeoQuest is still open 🌍",
    body: "A quick world challenge is waiting if you have time.",
  },
  {
    title: "A small world challenge is waiting 🌎",
    body: "Ready when you are.",
  },
];

export async function sendDailyQuestReminder(subscription: PushSubscription): Promise<boolean> {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const messageIndex = Math.floor(dayOfYear / 14) % DAILY_QUEST_MESSAGES.length;
  const message = DAILY_QUEST_MESSAGES[messageIndex];
  
  return sendPushNotification(subscription, {
    title: message.title,
    body: message.body,
    icon: '/favicon.png',
    url: '/daily-quest',
    tag: 'daily-quest-reminder',
  });
}

function hasAnyExplorerPlayedToday(players: { lastDailyQuestDate: string | null }[]): boolean {
  const today = new Date().toDateString();
  return players.some(player => player.lastDailyQuestDate === today);
}

export async function sendDailyQuestReminderForUser(userId: string): Promise<{ sent: number; skipped: boolean }> {
  const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
  const dailySubscriptions = subscriptions.filter(s => s.dailyQuestReminders && s.isActive);
  
  if (dailySubscriptions.length === 0) {
    return { sent: 0, skipped: true };
  }
  
  const players = await storage.getPlayersByUserId(userId);
  
  if (hasAnyExplorerPlayedToday(players)) {
    return { sent: 0, skipped: true };
  }
  
  let sent = 0;
  for (const subscription of dailySubscriptions) {
    try {
      const success = await sendDailyQuestReminder(subscription);
      if (success) {
        sent++;
        // Track when daily reminder was sent for suppression logic
        await storage.updatePushSubscription(subscription.id, {
          lastDailyQuestReminderAt: new Date(),
        });
      }
    } catch (error) {
      console.error('[Push] Error sending daily quest reminder:', error);
    }
  }
  
  return { sent, skipped: false };
}

export async function sendAllDailyQuestReminders(): Promise<{ sent: number; skipped: number; users: number }> {
  console.log('[Push] Starting daily quest reminders batch...');
  
  const allSubscriptions = await storage.getActiveSubscriptionsForDailyReminders();
  const userIdSet = new Set<string>();
  for (const sub of allSubscriptions) {
    userIdSet.add(sub.userId);
  }
  const userIds = Array.from(userIdSet);
  
  console.log(`[Push] Found ${userIds.length} users with daily reminder enabled`);
  
  let totalSent = 0;
  let totalSkipped = 0;
  
  for (const userId of userIds) {
    try {
      const result = await sendDailyQuestReminderForUser(userId);
      totalSent += result.sent;
      if (result.skipped) totalSkipped++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[Push] Error processing daily reminder for user ${userId}:`, error);
    }
  }
  
  console.log(`[Push] Daily reminders complete: ${totalSent} sent, ${totalSkipped} skipped (already played)`);
  
  return { sent: totalSent, skipped: totalSkipped, users: userIds.length };
}

let dailyReminderTimer: NodeJS.Timeout | null = null;

function getNext6pm(): Date {
  const now = new Date();
  const next6pm = new Date(now);
  next6pm.setHours(18, 0, 0, 0);
  
  if (now.getHours() >= 18) {
    next6pm.setDate(next6pm.getDate() + 1);
  }
  
  return next6pm;
}

export function scheduleDailyQuestReminders() {
  if (dailyReminderTimer) {
    clearTimeout(dailyReminderTimer);
    dailyReminderTimer = null;
  }
  
  const nextRun = getNext6pm();
  const now = new Date();
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  
  console.log(`[Push] Scheduling daily quest reminders for ${nextRun.toISOString()} (6pm)`);
  
  dailyReminderTimer = setTimeout(async () => {
    await sendAllDailyQuestReminders();
    scheduleDailyQuestReminders();
  }, msUntilNextRun);
}

export async function sendStreakProtectionAlert(
  subscription: PushSubscription,
  streakDays: number,
  playerName: string
): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: `Protect ${playerName}'s streak!`,
    body: `${playerName} has a ${streakDays}-day streak! Play today to keep it going.`,
    icon: '/favicon.png',
    url: '/',
    tag: 'streak-protection',
  });
}

export async function sendTestNotification(subscription: PushSubscription): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "Notifications enabled!",
    body: "You'll now receive reminders for Daily Quest and streak protection.",
    icon: '/favicon.png',
    url: '/',
    tag: 'test-notification',
  });
}

export async function sendWeeklyReviewNotification(
  subscription: PushSubscription,
  totalNewPlaces: number
): Promise<boolean> {
  const placesText = totalNewPlaces === 1 ? '1 new place' : `${totalNewPlaces} new places`;
  return sendPushNotification(subscription, {
    title: "Your explorers Week in Review",
    body: `This week, your explorers discovered ${placesText} 🌍`,
    icon: '/favicon.png',
    url: '/parent-dashboard',
    tag: 'weekly-review',
  });
}

export async function sendWeeklyNotificationsForUser(userId: string): Promise<{ sent: number; errors: number }> {
  const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
  const weeklySubscriptions = subscriptions.filter(s => s.weeklyProgressUpdates && s.isActive);
  
  if (weeklySubscriptions.length === 0) {
    return { sent: 0, errors: 0 };
  }
  
  const players = await storage.getPlayersByUserId(userId);
  const { startDate, endDate } = getLastCompletedWeekDates();
  
  let totalNewPlaces = 0;
  let totalGamesPlayed = 0;
  
  for (const player of players) {
    const stats = await storage.getExplorerWeeklyStats(player.id, startDate, endDate);
    totalNewPlaces += stats.citiesEarned.length;
    totalGamesPlayed += stats.gamesPlayed;
  }
  
  if (totalNewPlaces === 0 && totalGamesPlayed === 0) {
    return { sent: 0, errors: 0 };
  }
  
  let sent = 0;
  let errors = 0;
  
  for (const subscription of weeklySubscriptions) {
    try {
      const success = await sendWeeklyReviewNotification(subscription, totalNewPlaces);
      if (success) sent++;
      else errors++;
    } catch (error) {
      console.error(`[Push] Error sending weekly notification:`, error);
      errors++;
    }
  }
  
  return { sent, errors };
}

export async function sendAllWeeklyPushNotifications(): Promise<{ sent: number; errors: number; users: number }> {
  console.log('[Push] Starting weekly push notifications batch...');
  
  const allSubscriptions = await storage.getAllWeeklyPushSubscriptions();
  const userIdSet = new Set<string>();
  for (const sub of allSubscriptions) {
    userIdSet.add(sub.userId);
  }
  const userIds = Array.from(userIdSet);
  
  console.log(`[Push] Found ${userIds.length} users with weekly push notifications enabled`);
  
  let totalSent = 0;
  let totalErrors = 0;
  
  for (const userId of userIds) {
    try {
      const result = await sendWeeklyNotificationsForUser(userId);
      totalSent += result.sent;
      totalErrors += result.errors;
      
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`[Push] Error processing user ${userId}:`, error);
      totalErrors++;
    }
  }
  
  console.log(`[Push] Weekly notifications complete: ${totalSent} sent, ${totalErrors} errors, ${userIds.length} users`);
  
  return { sent: totalSent, errors: totalErrors, users: userIds.length };
}

function getLastCompletedWeekDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const dayOfWeek = now.getDay();
  
  const lastSunday = new Date(now);
  if (dayOfWeek === 0) {
    lastSunday.setDate(now.getDate() - 7);
  } else {
    lastSunday.setDate(now.getDate() - dayOfWeek);
  }
  lastSunday.setHours(23, 59, 59, 999);
  
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  lastMonday.setHours(0, 0, 0, 0);
  
  return { startDate: lastMonday, endDate: lastSunday };
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

// Monthly Notifications

// Monthly #1 - Explorer Growth Summary (Month-end, 9-10 AM)
// Aggregated across all explorers - 1 notification per account
export async function sendMonthlyGrowthSummary(subscription: PushSubscription): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "This month in GeoQuest 🌍",
    body: "Your explorers discovered new places and built world skills.",
    icon: '/favicon.png',
    url: '/parent-dashboard',
    tag: 'monthly-growth-summary',
  });
}

// Monthly #2 - Memory Reflection (Mid-month, day 14-16)
export async function sendMonthlyMemoryReflection(subscription: PushSubscription): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "A travel memory from this month ✨",
    body: "Your family added moments worth remembering.",
    icon: '/favicon.png',
    url: '/geoadventures',
    tag: 'monthly-memory-reflection',
  });
}

// Monthly #3 - Identity Reinforcement (day 22-24)
// Aggregated across all explorers - 1 notification per account
export async function sendMonthlyIdentityReinforcement(subscription: PushSubscription): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "Something we noticed 🌱",
    body: "Your explorers are becoming more curious about the world.",
    icon: '/favicon.png',
    url: '/',
    tag: 'monthly-identity',
  });
}

async function sendMonthlyNotificationToAllUsers(
  notificationType: 'growth' | 'memory' | 'identity'
): Promise<{ sent: number; errors: number; users: number }> {
  const typeName = {
    growth: 'Monthly Growth Summary',
    memory: 'Monthly Memory Reflection',
    identity: 'Monthly Identity Reinforcement',
  }[notificationType];
  
  console.log(`[Push] Starting ${typeName} batch...`);
  
  const allSubscriptions = await storage.getActiveMonthlySubscriptions();
  const userIdSet = new Set<string>();
  for (const sub of allSubscriptions) {
    userIdSet.add(sub.userId);
  }
  const userIds = Array.from(userIdSet);
  
  console.log(`[Push] Found ${userIds.length} users with monthly notifications enabled`);
  
  let totalSent = 0;
  let totalErrors = 0;
  
  for (const userId of userIds) {
    try {
      const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
      const monthlySubscriptions = subscriptions.filter(s => s.monthlyUpdates && s.isActive);
      
      for (const subscription of monthlySubscriptions) {
        try {
          let success = false;
          switch (notificationType) {
            case 'growth':
              success = await sendMonthlyGrowthSummary(subscription);
              break;
            case 'memory':
              success = await sendMonthlyMemoryReflection(subscription);
              break;
            case 'identity':
              success = await sendMonthlyIdentityReinforcement(subscription);
              break;
          }
          if (success) totalSent++;
          else totalErrors++;
        } catch (error) {
          console.error(`[Push] Error sending ${typeName}:`, error);
          totalErrors++;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`[Push] Error processing ${typeName} for user ${userId}:`, error);
      totalErrors++;
    }
  }
  
  console.log(`[Push] ${typeName} complete: ${totalSent} sent, ${totalErrors} errors`);
  
  return { sent: totalSent, errors: totalErrors, users: userIds.length };
}

export async function sendAllMonthlyGrowthSummaries(): Promise<{ sent: number; errors: number; users: number }> {
  return sendMonthlyNotificationToAllUsers('growth');
}

export async function sendAllMonthlyMemoryReflections(): Promise<{ sent: number; errors: number; users: number }> {
  return sendMonthlyNotificationToAllUsers('memory');
}

export async function sendAllMonthlyIdentityReinforcements(): Promise<{ sent: number; errors: number; users: number }> {
  return sendMonthlyNotificationToAllUsers('identity');
}

// Monthly Schedulers
let monthlyGrowthTimer: NodeJS.Timeout | null = null;
let monthlyMemoryTimer: NodeJS.Timeout | null = null;
let monthlyIdentityTimer: NodeJS.Timeout | null = null;

function getNextMonthEnd9am(): Date {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDayOfMonth.setHours(9, 0, 0, 0);
  
  if (now > lastDayOfMonth) {
    const nextMonthLastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    nextMonthLastDay.setHours(9, 0, 0, 0);
    return nextMonthLastDay;
  }
  
  return lastDayOfMonth;
}

function getNextMidMonth9am(): Date {
  const now = new Date();
  const midMonth = new Date(now.getFullYear(), now.getMonth(), 15);
  midMonth.setHours(9, 0, 0, 0);
  
  if (now > midMonth) {
    const nextMidMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    nextMidMonth.setHours(9, 0, 0, 0);
    return nextMidMonth;
  }
  
  return midMonth;
}

function getNextDay23At9am(): Date {
  const now = new Date();
  const day23 = new Date(now.getFullYear(), now.getMonth(), 23);
  day23.setHours(9, 0, 0, 0);
  
  if (now > day23) {
    const nextDay23 = new Date(now.getFullYear(), now.getMonth() + 1, 23);
    nextDay23.setHours(9, 0, 0, 0);
    return nextDay23;
  }
  
  return day23;
}

const MAX_SAFE_TIMEOUT = 2147483647;

function safeSchedule(
  delay: number,
  callback: () => Promise<void>,
  reschedule: () => void
): ReturnType<typeof setTimeout> {
  if (delay > MAX_SAFE_TIMEOUT) {
    return setTimeout(() => reschedule(), MAX_SAFE_TIMEOUT);
  }
  return setTimeout(async () => {
    await callback();
    reschedule();
  }, Math.max(delay, 1000));
}

export function scheduleMonthlyGrowthSummary() {
  if (monthlyGrowthTimer) {
    clearTimeout(monthlyGrowthTimer);
    monthlyGrowthTimer = null;
  }
  
  const nextRun = getNextMonthEnd9am();
  const now = new Date();
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  
  console.log(`[Push] Scheduling Monthly Growth Summary for ${nextRun.toISOString()} (month-end 9am)`);
  
  monthlyGrowthTimer = safeSchedule(msUntilNextRun, sendAllMonthlyGrowthSummaries, scheduleMonthlyGrowthSummary);
}

export function scheduleMonthlyMemoryReflection() {
  if (monthlyMemoryTimer) {
    clearTimeout(monthlyMemoryTimer);
    monthlyMemoryTimer = null;
  }
  
  const nextRun = getNextMidMonth9am();
  const now = new Date();
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  
  console.log(`[Push] Scheduling Monthly Memory Reflection for ${nextRun.toISOString()} (mid-month 9am)`);
  
  monthlyMemoryTimer = safeSchedule(msUntilNextRun, sendAllMonthlyMemoryReflections, scheduleMonthlyMemoryReflection);
}

export function scheduleMonthlyIdentityReinforcement() {
  if (monthlyIdentityTimer) {
    clearTimeout(monthlyIdentityTimer);
    monthlyIdentityTimer = null;
  }
  
  const nextRun = getNextDay23At9am();
  const now = new Date();
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  
  console.log(`[Push] Scheduling Monthly Identity Reinforcement for ${nextRun.toISOString()} (day 23 9am)`);
  
  monthlyIdentityTimer = safeSchedule(msUntilNextRun, sendAllMonthlyIdentityReinforcements, scheduleMonthlyIdentityReinforcement);
}

export function scheduleAllMonthlyNotifications() {
  scheduleMonthlyGrowthSummary();
  scheduleMonthlyMemoryReflection();
  scheduleMonthlyIdentityReinforcement();
}

// ============================================================================
// GEOADVENTURES NOTIFICATIONS (Event-Based)
// ============================================================================

// Trigger #1 - First Real Travel Signal (once per trip)
export async function sendTripBegunNotification(subscription: PushSubscription): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "Your adventure has begun ✈️",
    body: "GeoQuest will help you remember this journey.",
    icon: '/favicon.png',
    url: '/geoadventures',
    tag: 'trip-begun',
  });
}

// Trigger #2 - Gentle Re-engagement (48h no activity, once per trip)
export async function sendTripReengagementNotification(subscription: PushSubscription): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "A moment from your journey is waiting ⭐",
    body: "Save it whenever it feels right.",
    icon: '/favicon.png',
    url: '/geoadventures',
    tag: 'trip-reengagement',
  });
}

// Trigger #3 - Memory Creation Event (moment saved or keepsake earned)
export async function sendMemoryCreatedNotification(subscription: PushSubscription): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: "A memory was added to your travel map ✨",
    body: "This journey is becoming part of your family story.",
    icon: '/favicon.png',
    url: '/geoadventures',
    tag: 'memory-created',
  });
}

// Suppression check: prevents notification stacking
async function shouldSuppressGeoAdventuresPush(userId: string): Promise<{ suppress: boolean; reason?: string }> {
  const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
  const now = new Date();
  const today = now.toDateString();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  
  for (const sub of subscriptions) {
    if (!sub.geoAdventuresNotifications || !sub.isActive) {
      continue;
    }
    
    // Check if Daily Quest reminder was sent today
    if (sub.lastDailyQuestReminderAt) {
      const reminderDate = new Date(sub.lastDailyQuestReminderAt).toDateString();
      if (reminderDate === today) {
        return { suppress: true, reason: 'Daily Quest reminder was sent today' };
      }
    }
    
    // Check if GeoAdventures push was sent in last 48 hours
    if (sub.lastGeoAdventuresPushAt) {
      const lastPush = new Date(sub.lastGeoAdventuresPushAt);
      if (lastPush > fortyEightHoursAgo) {
        return { suppress: true, reason: 'GeoAdventures push was sent within 48 hours' };
      }
    }
  }
  
  return { suppress: false };
}

// Send GeoAdventures notification with suppression check
export async function sendGeoAdventuresNotification(
  userId: string,
  type: 'trip-begun' | 'reengagement' | 'memory-created'
): Promise<{ sent: number; suppressed: boolean; reason?: string }> {
  const { suppress, reason } = await shouldSuppressGeoAdventuresPush(userId);
  
  if (suppress) {
    console.log(`[Push] GeoAdventures notification suppressed for user ${userId}: ${reason}`);
    return { sent: 0, suppressed: true, reason };
  }
  
  const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
  const geoAdventuresSubs = subscriptions.filter(s => s.geoAdventuresNotifications && s.isActive);
  
  if (geoAdventuresSubs.length === 0) {
    return { sent: 0, suppressed: false, reason: 'No active GeoAdventures subscriptions' };
  }
  
  let sent = 0;
  
  for (const subscription of geoAdventuresSubs) {
    try {
      let success = false;
      switch (type) {
        case 'trip-begun':
          success = await sendTripBegunNotification(subscription);
          break;
        case 'reengagement':
          success = await sendTripReengagementNotification(subscription);
          break;
        case 'memory-created':
          success = await sendMemoryCreatedNotification(subscription);
          break;
      }
      
      if (success) {
        sent++;
        // Update last GeoAdventures push timestamp
        await storage.updatePushSubscription(subscription.id, {
          lastGeoAdventuresPushAt: new Date(),
        });
      }
    } catch (error) {
      console.error(`[Push] Error sending GeoAdventures ${type} notification:`, error);
    }
  }
  
  console.log(`[Push] GeoAdventures ${type} notification: ${sent} sent for user ${userId}`);
  
  return { sent, suppressed: false };
}

// ============================================================================
// TRIP STARTS TOMORROW — daily scheduler (runs at 8am)
// ============================================================================

let tripTomorrowTimer: ReturnType<typeof setTimeout> | null = null;

function getNext8am(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(8, 0, 0, 0);
  if (now.getHours() >= 8) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

async function sendTripStartsTomorrowReminders(): Promise<void> {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const relevant = await db
      .select()
      .from(travelTrips)
      .where(
        and(
          gte(travelTrips.startDate, tomorrow),
          lt(travelTrips.startDate, dayAfter),
          ne(travelTrips.status, 'completed')
        )
      );

    let sent = 0;
    for (const trip of relevant) {
      try {
        const [tripUser, stops] = await Promise.all([
          storage.getUser(trip.userId),
          storage.getStopsByTripId(trip.id),
        ]);
        if (!tripUser?.email || !tripUser.name) continue;
        const firstStop = stops.find(s => !s.isVisited) ?? stops[0];
        const firstStopName = firstStop?.name ?? 'Your first stop';
        await sendTripStartsTomorrowEmail(
          tripUser.name.split(' ')[0] || tripUser.name,
          tripUser.email,
          trip.name,
          firstStopName
        );
        sent++;
      } catch (err) {
        console.error(`[TripTomorrow] Error for trip ${trip.id}:`, err);
      }
    }
    console.log(`[TripTomorrow] Sent ${sent} starts-tomorrow emails`);
  } catch (err) {
    console.error('[TripTomorrow] Scheduler run failed:', err);
  }
}

export function scheduleTripStartsTomorrowEmails() {
  if (tripTomorrowTimer) {
    clearTimeout(tripTomorrowTimer);
    tripTomorrowTimer = null;
  }
  const nextRun = getNext8am();
  const msUntil = nextRun.getTime() - Date.now();
  console.log(`[TripTomorrow] Scheduling starts-tomorrow check for ${nextRun.toISOString()} (8am)`);
  tripTomorrowTimer = setTimeout(async () => {
    await sendTripStartsTomorrowReminders();
    scheduleTripStartsTomorrowEmails();
  }, msUntil);
}
