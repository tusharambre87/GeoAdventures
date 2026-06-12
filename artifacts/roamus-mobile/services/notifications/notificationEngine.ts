import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { isNotifEnabled, NotifType } from './notificationPrefs'
import { NotifContent } from './notificationContent'

// ── Foreground handler: show banner instead of OS notification ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
})

export interface NotifPayload {
  type: NotifType
  tripId: string
  dayIndex: number
  meta?: Record<string, unknown>
}

// ── Schedule a morning brief for a specific trip day at 8am ──
export async function scheduleDailyMorningBrief(params: {
  tripId: string
  dayIndex: number
  tripDate: Date
  firstStopName: string
  weather: string
  dayNum: number
}): Promise<void> {
  if (Platform.OS === 'web') return
  if (!(await isNotifEnabled(NotifType.MORNING_BRIEF))) return

  const { tripId, dayIndex, tripDate, firstStopName, weather, dayNum } = params
  const content = NotifContent.MORNING_BRIEF(dayNum, firstStopName, weather)

  const fireDate = new Date(tripDate)
  fireDate.setHours(8, 0, 0, 0)
  if (fireDate.getTime() <= Date.now()) return

  const payload: NotifPayload = { type: NotifType.MORNING_BRIEF, tripId, dayIndex }

  await Notifications.scheduleNotificationAsync({
    content: { title: content.title, body: content.body, data: payload as unknown as Record<string, unknown> },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    identifier: `morning_brief_${tripId}_${dayIndex}`,
  })
}

// ── Schedule a notification seconds from now ──
export async function scheduleIn(
  type: NotifType,
  tripId: string,
  dayIndex: number,
  title: string,
  body: string,
  seconds: number,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (Platform.OS === 'web') return
  if (!(await isNotifEnabled(type))) return
  if (seconds <= 0) return

  const payload: NotifPayload = { type, tripId, dayIndex, meta }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: payload as unknown as Record<string, unknown> },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    identifier: `${type}_${tripId}_${dayIndex}_${Date.now()}`,
  })
}

// ── Cancel all notifications for a trip ──
export async function cancelAllNotificationsForTrip(tripId: string): Promise<void> {
  if (Platform.OS === 'web') return
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  for (const n of scheduled) {
    const data = n.content.data as unknown as NotifPayload | undefined
    if (data?.tripId === tripId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier)
    }
  }
}

// ── Cancel a specific notification ──
export async function cancelNotification(identifier: string): Promise<void> {
  if (Platform.OS === 'web') return
  await Notifications.cancelScheduledNotificationAsync(identifier)
}

// ── Public test helper — bypasses pref check, fires in `seconds` ──
export async function scheduleLocalNotification(
  type: NotifType,
  title: string,
  body: string,
  data: Record<string, unknown>,
  seconds: number,
): Promise<void> {
  if (Platform.OS === 'web') return
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    identifier: `test_${type}_${Date.now()}`,
  })
}

// ── Listen for foreground notifications (show in-app banner) ──
export function subscribeForegroundNotifications(
  onReceive: (n: Notifications.Notification) => void,
): () => void {
  const sub = Notifications.addNotificationReceivedListener(onReceive)
  return () => sub.remove()
}
