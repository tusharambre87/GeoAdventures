import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

const ASKED_KEY = '@roamus_notif_permission_asked'

export async function hasAskedPermission(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ASKED_KEY)
    return val === 'true'
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
