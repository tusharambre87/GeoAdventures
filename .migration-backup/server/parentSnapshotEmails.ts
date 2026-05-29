import { storage } from "./storage";
import { sendConsolidatedSnapshotEmail, type ExplorerWeeklyData, type ConsolidatedSnapshotData } from "./email";
import { sendAllWeeklyPushNotifications } from "./pushNotifications";

function getLastCompletedWeekDates(): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(0, 0, 0, 0);
  
  const previousSunday = new Date(lastSunday);
  previousSunday.setDate(lastSunday.getDate() - 7);
  
  return { startDate: previousSunday, endDate: lastSunday };
}

export async function sendAllParentSnapshots(): Promise<{ sent: number; skipped: number; errors: number }> {
  const { startDate, endDate } = getLastCompletedWeekDates();
  
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  
  try {
    const usersWithEmails = await storage.getUsersForWeeklyEmails();
    console.log(`[ParentSnapshot] Found ${usersWithEmails.length} users with weekly email preference`);
    
    for (const user of usersWithEmails) {
      if (!user.email) continue;
      
      try {
        const explorers = await storage.getPlayersByUserId(user.id);
        
        const explorerDataList: ExplorerWeeklyData[] = [];
        
        for (const explorer of explorers) {
          const stats = await storage.getExplorerWeeklyStats(explorer.id, startDate, endDate);
          
          explorerDataList.push({
            explorerName: explorer.name,
            citiesExplored: stats.citiesEarned,
            gamesPlayed: stats.gamesPlayed,
            explorerStreak: stats.streak,
            completedGeoAdventures: stats.completedGeoAdventures,
          });
        }
        
        const hasAnyActivity = explorerDataList.some(e => 
          e.citiesExplored.length > 0 || e.gamesPlayed > 0 || e.completedGeoAdventures.length > 0
        );
        
        if (!hasAnyActivity) {
          skipped++;
          continue;
        }
        
        const data: ConsolidatedSnapshotData = {
          parentName: user.firstName || user.lastName || 'Explorer Parent',
          explorers: explorerDataList,
        };
        
        const success = await sendConsolidatedSnapshotEmail(data, user.email);
        
        if (success) {
          sent++;
          const activeExplorers = explorerDataList.filter(e => 
            e.citiesExplored.length > 0 || e.gamesPlayed > 0 || e.completedGeoAdventures.length > 0
          );
          console.log(`[ParentSnapshot] Sent consolidated email to ${user.email} for ${activeExplorers.length} explorer(s)`);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`[ParentSnapshot] Error processing user ${user.id}:`, error);
        errors++;
      }
    }
  } catch (error) {
    console.error('[ParentSnapshot] Error fetching users:', error);
    errors++;
  }
  
  console.log(`[ParentSnapshot] Completed: ${sent} sent, ${skipped} skipped, ${errors} errors`);
  return { sent, skipped, errors };
}

let parentSnapshotTimer: NodeJS.Timeout | null = null;

function getNextSunday9am(): Date {
  const now = new Date();
  const nextSunday = new Date(now);
  
  const currentDay = now.getDay();
  
  if (currentDay === 0) {
    if (now.getHours() < 9) {
      nextSunday.setHours(9, 0, 0, 0);
    } else {
      nextSunday.setDate(now.getDate() + 7);
      nextSunday.setHours(9, 0, 0, 0);
    }
  } else {
    const daysUntilSunday = 7 - currentDay;
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(9, 0, 0, 0);
  }
  
  return nextSunday;
}

export function scheduleParentSnapshots() {
  if (parentSnapshotTimer) {
    clearTimeout(parentSnapshotTimer);
    parentSnapshotTimer = null;
  }
  
  const nextRun = getNextSunday9am();
  const now = new Date();
  const msUntilNextRun = nextRun.getTime() - now.getTime();
  
  console.log(`[ParentSnapshot] Scheduling next batch for ${nextRun.toISOString()} (Sunday 9am)`);
  
  parentSnapshotTimer = setTimeout(async () => {
    await sendAllParentSnapshots();
    
    try {
      const pushResult = await sendAllWeeklyPushNotifications();
      console.log(`[ParentSnapshot] Weekly push notifications: ${pushResult.sent} sent, ${pushResult.errors} errors`);
    } catch (error) {
      console.error('[ParentSnapshot] Error sending weekly push notifications:', error);
    }
    
    scheduleParentSnapshots();
  }, msUntilNextRun);
}
