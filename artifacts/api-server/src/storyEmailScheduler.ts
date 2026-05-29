import { storage } from "./storage";
import { sendStoryRetentionEmail } from "./email";

async function processStoryRetentionEmails(): Promise<void> {
  try {
    const pending = await storage.getPendingStoryEmails();
    if (pending.length === 0) return;

    console.log(`[StoryEmail] Processing ${pending.length} pending retention email(s)`);

    for (const schedule of pending) {
      try {
        const [trip, user] = await Promise.all([
          storage.getTripById(schedule.tripId),
          storage.getUser(schedule.userId),
        ]);

        if (!trip || !user) {
          await storage.markStoryEmailSent(schedule.id);
          continue;
        }

        if (user.emailSubscribed === false) {
          await storage.markStoryEmailSent(schedule.id);
          continue;
        }

        const parentName = user.name?.split(' ')[0] || user.firstName || 'Explorer';
        const triggerType = schedule.triggerType as '1_week' | '1_month';

        const sent = await sendStoryRetentionEmail(
          parentName,
          schedule.emailAddress,
          trip.name,
          trip.destination || trip.city || 'your destination',
          trip.id,
          triggerType
        );

        if (sent) {
          await storage.markStoryEmailSent(schedule.id);
          console.log(`[StoryEmail] Sent ${triggerType} retention email for trip ${trip.id} to ${schedule.emailAddress}`);
        } else {
          console.error(`[StoryEmail] Failed to send ${triggerType} email for trip ${trip.id}`);
        }
      } catch (err: any) {
        console.error(`[StoryEmail] Error processing schedule ${schedule.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[StoryEmail] Error in processStoryRetentionEmails:", err.message);
  }
}

export function scheduleStoryRetentionEmails(): void {
  const MS_PER_HOUR = 60 * 60 * 1000;

  const runAtNineAm = () => {
    const now = new Date();
    const next9am = new Date(now);
    next9am.setHours(9, 0, 0, 0);
    if (next9am <= now) {
      next9am.setDate(next9am.getDate() + 1);
    }
    const msUntil = next9am.getTime() - now.getTime();

    setTimeout(() => {
      processStoryRetentionEmails();
      setInterval(processStoryRetentionEmails, 24 * MS_PER_HOUR);
    }, msUntil);

    console.log(`[StoryEmail] Retention email scheduler set — next run at ${next9am.toISOString()}`);
  };

  runAtNineAm();
}
