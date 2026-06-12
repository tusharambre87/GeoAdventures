import { NotifContent } from './notificationContent'
import { NotifType } from './notificationPrefs'
import {
  cancelAllNotificationsForTrip,
  cancelNotification,
  scheduleDailyMorningBrief,
  scheduleIn,
} from './notificationEngine'

export { cancelAllNotificationsForTrip }

// ── Called when trip dates are confirmed (onboarding / build flow) ──
export async function onTripDayStart(params: {
  tripId: string
  dayIndex: number
  tripDate: Date
  firstStopName: string
  weather: string
  dayNum: number
}): Promise<void> {
  await scheduleDailyMorningBrief(params)
}

// ── Called when Today tab transitions to EN_ROUTE ──
export async function onEnRoute(params: {
  tripId: string
  dayIndex: number
  stopId: string
  nextStopName: string
  driveMinutes: number
}): Promise<void> {
  const { tripId, dayIndex, nextStopName, driveMinutes } = params

  // Kids zone: fire now so kids can play during the drive
  const kidsContent = NotifContent.KIDS_ZONE_ENROUTE(driveMinutes, nextStopName)
  await scheduleIn(
    NotifType.KIDS_ZONE_ENROUTE,
    tripId,
    dayIndex,
    kidsContent.title,
    kidsContent.body,
    30,
  )

  // Departure reminder: 30 min before estimated arrival
  const depContent = NotifContent.DEPARTURE_REMINDER(nextStopName, driveMinutes)
  const depSeconds = Math.max(driveMinutes * 60 - 30 * 60, 60)
  await scheduleIn(
    NotifType.DEPARTURE_REMINDER,
    tripId,
    dayIndex,
    depContent.title,
    depContent.body,
    depSeconds,
  )
}

// ── Called after weather fetch returns rain/heat condition ──
export async function onWeatherAlert(params: {
  tripId: string
  dayIndex: number
  condition: string
}): Promise<void> {
  const { tripId, dayIndex, condition } = params
  const content = NotifContent.WEATHER_ALERT(condition)
  await scheduleIn(
    NotifType.WEATHER_ALERT,
    tripId,
    dayIndex,
    content.title,
    content.body,
    10,
  )
}

// ── Called when last stop of day is marked visited ──
export async function onDayComplete(params: {
  tripId: string
  dayIndex: number
  stopNames: string[]
  photoCount: number
  dayNum: number
}): Promise<void> {
  const { tripId, dayIndex, stopNames, photoCount, dayNum } = params

  // Cancel any pending en-route notifications for this day
  await cancelNotification(`morning_brief_${tripId}_${dayIndex}`)

  // Day complete banner — fire in 5s so the state transition completes first
  const dayContent = NotifContent.DAY_COMPLETE(stopNames)
  await scheduleIn(
    NotifType.DAY_COMPLETE,
    tripId,
    dayIndex,
    dayContent.title,
    dayContent.body,
    5,
  )

  // Memory recap — 90 minutes later
  const recapContent = NotifContent.MEMORY_RECAP(dayNum, photoCount)
  await scheduleIn(
    NotifType.MEMORY_RECAP,
    tripId,
    dayIndex,
    recapContent.title,
    recapContent.body,
    90 * 60,
  )
}
