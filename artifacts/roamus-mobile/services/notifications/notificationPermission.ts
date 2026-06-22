import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

const ASKED_KEY = '@roamus_notif_permission_asked'
const DISMISSED_KEY = '@roamus_notif_permission_dismissed'

export async function hasAskedPermission(): Promise<boolean> {
  try {
    const [[, asked], [, dismissed]] = await AsyncStorage.multiGet([ASKED_KEY, DISMISSED_KEY])
    return asked === 'true' || dismissed !== null
  } catch {
    return false
  }
}

export async function markPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, 'true')
}

export async function requestNotificationPermission(): Promise<boolean> {
  await markPermissionAsked()
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function getPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync()
  return status
}
