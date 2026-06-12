import AsyncStorage from '@react-native-async-storage/async-storage'

export enum NotifType {
  MORNING_BRIEF       = 'morning_brief',
  DEPARTURE_REMINDER  = 'departure_reminder',
  KIDS_ZONE_ENROUTE   = 'kids_zone_enroute',
  WEATHER_ALERT       = 'weather_alert',
  AT_STOP_ARRIVAL     = 'at_stop_arrival',
  DAY_COMPLETE        = 'day_complete',
  MEMORY_RECAP        = 'memory_recap',
  TRIP_SUMMARY        = 'trip_summary',
  COPARENT_SYNC       = 'coparent_sync',
}

const PREFS_KEY = '@roamus_notif_prefs'

const DEFAULT_PREFS: Record<NotifType, boolean> = {
  [NotifType.MORNING_BRIEF]:       true,
  [NotifType.DEPARTURE_REMINDER]:  true,
  [NotifType.KIDS_ZONE_ENROUTE]:   true,
  [NotifType.WEATHER_ALERT]:       true,
  [NotifType.AT_STOP_ARRIVAL]:     true,
  [NotifType.DAY_COMPLETE]:        true,
  [NotifType.MEMORY_RECAP]:        true,
  [NotifType.TRIP_SUMMARY]:        true,
  [NotifType.COPARENT_SYNC]:       false,
}

export async function getNotifPrefs(): Promise<Record<NotifType, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFS
  }
}

export async function setNotifPref(type: NotifType, value: boolean): Promise<void> {
  const current = await getNotifPrefs()
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, [type]: value }))
}

export async function isNotifEnabled(type: NotifType): Promise<boolean> {
  const prefs = await getNotifPrefs()
  return prefs[type]
}
