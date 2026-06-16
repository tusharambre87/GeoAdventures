import React, { useEffect, useRef } from 'react'
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { F } from '@/lib/tokens'
import { requestNotificationPermission } from '@/services/notifications/notificationPermission'

interface Props {
  onClose: () => void
}

const chips = [
  {
    icon: '\uD83C\uDF05',
    title: 'Morning brief at 8am',
    sub: 'Your day\u2019s stops, weather, costs \u2014 ready to go',
  },
  {
    icon: '\uD83C\uDFAE',
    title: 'Kids Zone when you drive',
    sub: 'Travel games fire when you leave each stop',
  },
  {
    icon: '\u26C5',
    title: 'Weather + rescue alerts',
    sub: 'Only when your plan needs adjusting',
  },
]

export default function NotificationPermissionModal({ onClose }: Props) {
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()
  const translateY = useRef(new Animated.Value(400)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, translateY])

  function dismiss(animated: boolean, cb: () => void) {
    if (!animated) { cb(); return }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 400, duration: 220, useNativeDriver: true }),
    ]).start(() => cb())
  }

  async function handleAllow() {
    await requestNotificationPermission()
    dismiss(true, onClose)
  }

  function handleNotNow() {
    Alert.alert(
      '',
      'You can turn on notifications from the Me tab anytime.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Ok',
          onPress: () => dismiss(true, onClose),
        },
      ],
    )
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss(true, onClose)} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }], maxHeight: screenHeight * 0.9, paddingBottom: Math.max(insets.bottom, 16) + 40 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* Icon */}
          <View style={styles.iconRing}>
            <Text style={styles.iconText}>{'\uD83D\uDD14'}</Text>
          </View>

          <Text style={styles.headline}>{'Stay in the flow, not on your phone'}</Text>
          <Text style={styles.bodyText}>
            {'RoamUs sends one morning brief and stop reminders\nwhile you travel. Nothing else.'}
          </Text>

          {/* Chips */}
          {chips.map(c => (
            <View key={c.title} style={styles.chip}>
              <Text style={styles.chipIcon}>{c.icon}</Text>
              <View style={styles.chipText}>
                <Text style={styles.chipTitle}>{c.title}</Text>
                <Text style={styles.chipSub}>{c.sub}</Text>
              </View>
            </View>
          ))}

          {/* CTAs */}
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={handleAllow}>
            <Text style={styles.primaryBtnText}>{'Turn on notifications'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={handleNotNow}>
            <Text style={styles.secondaryBtnText}>{'Not now \u2192'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  sheet: {
    backgroundColor: '#F5F2EE',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 44,
  },
  scrollContent: {
    alignItems: 'center',
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FDF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: { fontSize: 30 },
  headline: {
    fontFamily: F.bold,
    fontSize: 22,
    color: '#1A1F2E',
    textAlign: 'center',
    marginBottom: 10,
  },
  bodyText: {
    fontFamily: F.regular,
    fontSize: 14,
    color: '#8A8FA8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  chipIcon:  { fontSize: 20 },
  chipText:  { flex: 1 },
  chipTitle: { fontFamily: F.semibold, fontSize: 14, color: '#1A1F2E' },
  chipSub:   { fontFamily: F.regular, fontSize: 12, color: '#8A8FA8', marginTop: 2 },
  primaryBtn: {
    backgroundColor: '#E8692A',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  secondaryBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: F.regular, fontSize: 13, color: '#8A8FA8' },
})
