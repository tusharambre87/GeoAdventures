import React, { useEffect, useState } from 'react'
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { getNotifPrefs, NotifType, setNotifPref } from '@/services/notifications/notificationPrefs'

const F = {
  regular: 'PlusJakartaSans_400Regular',
  medium:  'PlusJakartaSans_500Medium',
  semi:    'PlusJakartaSans_600SemiBold',
  bold:    'PlusJakartaSans_700Bold',
}

interface RowConfig {
  type: NotifType | null
  icon: string
  title: string
  sub: string
  alwaysOn?: boolean
}

const WHILE_TRAVELING: RowConfig[] = [
  { type: null,                           icon: '\uD83C\uDF05', title: 'Morning trip brief',    sub: 'Sent at 8am each travel day',                          alwaysOn: true },
  { type: NotifType.DEPARTURE_REMINDER,   icon: '\uD83D\uDDFA\uFE0F', title: 'Departure reminders',   sub: '30 min before leaving each stop' },
  { type: NotifType.KIDS_ZONE_ENROUTE,    icon: '\uD83C\uDFAE', title: 'Kids Zone en route',    sub: 'Travel games when driving to next stop' },
  { type: NotifType.WEATHER_ALERT,        icon: '\u26C5',       title: 'Weather alerts',        sub: 'Rain or heat warnings with plan options' },
  { type: NotifType.AT_STOP_ARRIVAL,      icon: '\uD83C\uDF7D\uFE0F', title: 'Meal reminders',        sub: 'Lunch suggestion when you\u2019re near midday' },
  { type: NotifType.DAY_COMPLETE,         icon: '\uD83D\uDCF8', title: 'End-of-day recap',      sub: 'Memory summary each evening' },
]

const AFTER_TRIP: RowConfig[] = [
  { type: NotifType.TRIP_SUMMARY,   icon: '\u2728', title: 'Trip summary',      sub: 'Full recap 24 hours after your last day' },
  { type: NotifType.COPARENT_SYNC,  icon: '\uD83D\uDC65', title: 'Co-parent updates',  sub: 'When your co-parent marks stops or adds notes' },
]

const GENERAL: RowConfig[] = [
  { type: NotifType.MEMORY_RECAP, icon: '\uD83D\uDCE3', title: 'RoamUs tips & updates', sub: 'Occasional product news' },
]

export default function NotificationsSettings() {
  const insets = useSafeAreaInsets()
  const [prefs, setPrefs] = useState<Partial<Record<NotifType, boolean>>>({})

  useEffect(() => {
    getNotifPrefs().then(p => setPrefs(p))
  }, [])

  async function handleToggle(type: NotifType, value: boolean) {
    setPrefs(prev => ({ ...prev, [type]: value }))
    await setNotifPref(type, value)
  }

  function renderSection(label: string, rows: RowConfig[], isLast?: boolean) {
    return (
      <View style={isLast ? undefined : { marginBottom: 24 }}>
        <Text style={s.sectionLabel}>{label}</Text>
        <View style={s.card}>
          {rows.map((row, i) => {
            const isLastRow = i === rows.length - 1
            return (
              <View key={row.title}>
                <View style={s.row}>
                  <View style={s.iconWrap}>
                    <Text style={s.rowIcon}>{row.icon}</Text>
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowTitle}>{row.title}</Text>
                    <Text style={s.rowSub}>{row.sub}</Text>
                  </View>
                  {row.alwaysOn ? (
                    <View style={s.alwaysPill}>
                      <Text style={s.alwaysPillText}>{'Always on'}</Text>
                    </View>
                  ) : row.type ? (
                    <View style={(prefs[row.type] ?? true) ? s.switchWrapOn : s.switchWrapOff}>
                      <Switch
                        value={prefs[row.type] ?? true}
                        onValueChange={v => { if (row.type) handleToggle(row.type, v) }}
                        trackColor={{ false: '#FDF0E9', true: '#E8692A' }}
                        thumbColor={'#fff'}
                        ios_backgroundColor={'#FDF0E9'}
                      />
                    </View>
                  ) : null}
                </View>
                {!isLastRow && <View style={s.divider} />}
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={s.nav}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backText}>{'‹'}</Text>
        </Pressable>
        <Text style={s.navTitle}>{'Notifications'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderSection('WHILE TRAVELING', WHILE_TRAVELING)}
        {renderSection('AFTER YOUR TRIP', AFTER_TRIP)}
        {renderSection('GENERAL', GENERAL, true)}

        {/* Footer */}
        <Text style={s.footerNote}>
          {'\u201CMorning brief can\u2019t be turned off \u2014 it\u2019s how your day starts.\nTo disable all notifications, go to '}
          {Platform.OS === 'ios' ? (
            <Text
              style={s.footerLink}
              onPress={() => Linking.openSettings()}
            >
              {'iPhone Settings \u2192'}
            </Text>
          ) : (
            <Text
              style={s.footerLink}
              onPress={() => Linking.openSettings()}
            >
              {'App Settings \u2192'}
            </Text>
          )}
          {'\u201D'}
        </Text>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#F5F2EE' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn:   { width: 40, alignItems: 'flex-start' },
  backText:  { fontSize: 28, color: '#1A1F2E', lineHeight: 32 },
  navTitle:  { fontSize: 17, fontFamily: F.bold, color: '#1A1F2E' },
  scroll:    { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: F.bold,
    color: '#8A8FA8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#F5F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon:   { fontSize: 18 },
  rowText:   { flex: 1 },
  rowTitle:  { fontSize: 14, fontFamily: F.semi, color: '#1A1F2E' },
  rowSub:    { fontSize: 12, fontFamily: F.regular, color: '#8A8FA8', marginTop: 2, lineHeight: 16 },
  divider:   { height: 1, backgroundColor: '#F0EDE8', marginLeft: 66 },
  switchWrapOff: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8692A',
  },
  switchWrapOn: {},
  alwaysPill: {
    backgroundColor: 'rgba(232,105,42,0.10)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  alwaysPillText: { fontSize: 11, fontFamily: F.bold, color: '#E8692A' },
  footerNote: {
    fontSize: 12,
    fontFamily: F.regular,
    color: '#8A8FA8',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  footerLink: { color: '#E8692A', fontFamily: F.semi },
})
