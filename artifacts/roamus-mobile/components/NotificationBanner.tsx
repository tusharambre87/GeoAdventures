import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type * as Notifications from 'expo-notifications'
import { subscribeForegroundNotifications, type NotifPayload } from '@/services/notifications/notificationEngine'
import { NotifType } from '@/services/notifications/notificationPrefs'

interface BannerData {
  title: string
  body: string
  payload: NotifPayload
}

const BANNER_COLORS: Partial<Record<NotifType, string>> = {
  [NotifType.MORNING_BRIEF]:       'rgba(26,31,46,0.94)',
  [NotifType.DEPARTURE_REMINDER]:  '#1A1F2E',
  [NotifType.KIDS_ZONE_ENROUTE]:   '#7C3AED',
  [NotifType.WEATHER_ALERT]:       '#FEF9C3',
  [NotifType.AT_STOP_ARRIVAL]:     '#E8692A',
  [NotifType.DAY_COMPLETE]:        '#059669',
  [NotifType.MEMORY_RECAP]:        '#1A1F2E',
  [NotifType.TRIP_SUMMARY]:        '#E8692A',
}

const BANNER_ICONS: Partial<Record<NotifType, string>> = {
  [NotifType.MORNING_BRIEF]:       '\uD83C\uDF05',
  [NotifType.DEPARTURE_REMINDER]:  '\uD83D\uDDFA\uFE0F',
  [NotifType.KIDS_ZONE_ENROUTE]:   '\uD83C\uDFAE',
  [NotifType.WEATHER_ALERT]:       '\u26C5',
  [NotifType.AT_STOP_ARRIVAL]:     '\uD83D\uDCCD',
  [NotifType.DAY_COMPLETE]:        '\uD83D\uDE4C',
  [NotifType.MEMORY_RECAP]:        '\uD83D\uDCF8',
  [NotifType.TRIP_SUMMARY]:        '\u2728',
}

interface Props {
  onPress: (payload: NotifPayload) => void
}

export default function NotificationBanner({ onPress }: Props) {
  const [banner, setBanner] = useState<BannerData | null>(null)
  const translateY = useRef(new Animated.Value(-120)).current
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showBanner = useCallback((data: BannerData) => {
    setBanner(data)
    translateY.setValue(-120)
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start()
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(hideBanner, 4000)
  }, [translateY])

  const hideBanner = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setBanner(null))
  }, [translateY])

  useEffect(() => {
    const unsub = subscribeForegroundNotifications((n: Notifications.Notification) => {
      const payload = n.request.content.data as unknown as NotifPayload | undefined
      if (!payload?.type) return
      showBanner({
        title: n.request.content.title ?? '',
        body: n.request.content.body ?? '',
        payload,
      })
    })
    return unsub
  }, [showBanner])

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  if (!banner) return null

  const bgColor = BANNER_COLORS[banner.payload.type] ?? 'rgba(26,31,46,0.94)'
  const icon = BANNER_ICONS[banner.payload.type] ?? '\uD83D\uDD14'
  const isLight = banner.payload.type === NotifType.WEATHER_ALERT

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => { hideBanner(); onPress(banner.payload) }}
        style={[styles.banner, { backgroundColor: bgColor }]}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, isLight && styles.titleDark]}>{banner.title}</Text>
          <Text style={[styles.body, isLight && styles.bodyDark]}>{banner.body}</Text>
        </View>
        <TouchableOpacity
          onPress={hideBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.dismiss, isLight && styles.dismissDark]}>{'\u00D7'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon:        { fontSize: 18 },
  text:        { flex: 1 },
  title:       { fontSize: 13, fontWeight: '800', color: '#fff', lineHeight: 16 },
  body:        { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  titleDark:   { color: '#1A1F2E' },
  bodyDark:    { color: 'rgba(26,31,46,0.7)' },
  dismiss:     { fontSize: 18, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 4 },
  dismissDark: { color: 'rgba(26,31,46,0.35)' },
})
