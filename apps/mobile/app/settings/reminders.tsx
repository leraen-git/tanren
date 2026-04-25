import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { DayPicker } from '@/components/DayPicker'
import { TimePickerModal } from '@/components/TimePickerModal'
import { trpc } from '@/lib/trpc'
import {
  useNotificationSettingsStore,
  type NotificationSettings,
} from '@/stores/notificationSettingsStore'
import {
  getPermissionStatus,
  requestPermission,
  openNotificationSettings,
} from '@/services/notificationPermissions'
import {
  rescheduleWorkoutNotifications,
  rescheduleMealNotifications,
  rescheduleHydrationNotifications,
} from '@/services/notificationScheduler'

function SectionHeader({ label }: { label: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <Text style={{
      fontFamily: fonts.sansB,
      fontSize: 9,
      color: tokens.textMute,
      textTransform: 'uppercase',
      letterSpacing: 2,
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 8,
    }}>
      {label}
    </Text>
  )
}

function SettingRow({
  label, sublabel, right, onPress,
}: { label: string; sublabel?: string; right: React.ReactNode; onPress?: () => void }) {
  const { tokens, fonts } = useTheme()
  const Wrapper = onPress ? TouchableOpacity : View
  return (
    <Wrapper
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
      }}
      {...(onPress ? { accessibilityRole: 'button' as const, accessibilityLabel: label } : {})}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.text }}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute, marginTop: 2 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {right}
    </Wrapper>
  )
}

function TimeBadge({ time, onPress }: { time: string; onPress: () => void }) {
  const { tokens, fonts } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: tokens.border,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
      accessibilityLabel={`Set time, currently ${time}`}
      accessibilityRole="button"
    >
      <Text style={{ fontFamily: fonts.monoB, fontSize: 14, color: tokens.text }}>
        {time}
      </Text>
    </TouchableOpacity>
  )
}

function PermissionBanner({ onPress }: { onPress: () => void }) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        margin: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: tokens.amber,
        borderLeftWidth: 3,
        borderLeftColor: tokens.amber,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
      accessibilityRole="button"
      accessibilityLabel={t('notifications.permBannerBlocked')}
    >
      <View style={{ width: 18, height: 18, borderWidth: 1, borderColor: tokens.amber, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.amber }}>!</Text>
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.text, flex: 1 }}>
        {t('notifications.permBannerBlocked')}
      </Text>
    </TouchableOpacity>
  )
}

function usePermissionToggle() {
  const [permDenied, setPermDenied] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    getPermissionStatus().then((s) => setPermDenied(s === 'denied'))
  }, [])

  const enableWithPermission = useCallback(
    async (onGranted: () => void) => {
      const status = await getPermissionStatus()
      if (status === 'granted') {
        onGranted()
        return
      }
      if (status === 'denied') {
        setPermDenied(true)
        Alert.alert(
          t('notifications.permDeniedTitle'),
          t('notifications.permDeniedDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('notifications.openSettings'), onPress: openNotificationSettings },
          ],
        )
        return
      }
      Alert.alert(
        t('notifications.permExplainTitle'),
        t('notifications.permExplainDesc'),
        [
          { text: t('notifications.notNow'), style: 'cancel' },
          {
            text: t('notifications.allow'),
            onPress: async () => {
              const result = await requestPermission()
              if (result === 'granted') {
                setPermDenied(false)
                onGranted()
              } else {
                setPermDenied(true)
              }
            },
          },
        ],
      )
    },
    [t],
  )

  return { enableWithPermission, permDenied }
}

function ChipSelector<T extends string | number>({
  options, value, onChange, labelMap,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  labelMap?: Record<string, string>
}) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {options.map((opt) => {
        const selected = opt === value
        const label = labelMap ? labelMap[String(opt)] : String(opt)
        return (
          <TouchableOpacity
            key={String(opt)}
            onPress={() => onChange(opt)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: selected ? tokens.accent : tokens.border,
              backgroundColor: selected ? tokens.accent : 'transparent',
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={label}
          >
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 10,
              letterSpacing: 1,
              color: selected ? '#FFFFFF' : tokens.textMute,
              textTransform: 'uppercase',
            }}>
              {label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

export default function RemindersScreen() {
  const { tokens, fonts } = useTheme()
  const { t, i18n } = useTranslation()
  const settings = useNotificationSettingsStore()
  const { enableWithPermission, permDenied } = usePermissionToggle()
  const lang = (i18n.language === 'fr' ? 'fr' : 'en') as 'en' | 'fr'

  const [timePicker, setTimePicker] = useState<{
    visible: boolean; value: string; label: string
    onConfirm: (t: string) => void
  }>({ visible: false, value: '00:00', label: '', onConfirm: () => {} })

  const syncPrefs = trpc.notifications.upsertPreferences.useMutation({
    onError: (err) => console.warn('syncPrefs failed:', err.message),
  })

  const openTimePicker = (value: string, label: string, onConfirm: (t: string) => void) => {
    setTimePicker({ visible: true, value, label, onConfirm })
  }

  useEffect(() => {
    const prefs = {
      workoutEnabled: settings.workoutEnabled,
      workoutTime: settings.workoutTime,
      workoutOffset: settings.workoutOffset,
      workoutDays: settings.workoutDays,
      breakfastEnabled: settings.meals.breakfast.enabled,
      breakfastTime: settings.meals.breakfast.time,
      lunchEnabled: settings.meals.lunch.enabled,
      lunchTime: settings.meals.lunch.time,
      snackEnabled: settings.meals.snack.enabled,
      snackTime: settings.meals.snack.time,
      dinnerEnabled: settings.meals.dinner.enabled,
      dinnerTime: settings.meals.dinner.time,
      hydrationEnabled: settings.hydrationEnabled,
      hydrationInterval: settings.hydrationInterval,
      hydrationActiveFrom: settings.hydrationActiveFrom,
      hydrationActiveTo: settings.hydrationActiveTo,
    }
    syncPrefs.mutate(prefs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.workoutEnabled, settings.workoutTime, settings.workoutOffset, settings.workoutDays,
    settings.meals.breakfast.enabled, settings.meals.breakfast.time,
    settings.meals.lunch.enabled, settings.meals.lunch.time,
    settings.meals.snack.enabled, settings.meals.snack.time,
    settings.meals.dinner.enabled, settings.meals.dinner.time,
    settings.hydrationEnabled, settings.hydrationInterval,
    settings.hydrationActiveFrom, settings.hydrationActiveTo,
  ])

  const cardStyle = {
    backgroundColor: tokens.surface1,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: tokens.border,
    overflow: 'hidden' as const,
  }

  const offsetLabels: Record<string, string> = {
    '0': t('notifications.atTime'),
    '15': t('notifications.minBefore', { n: 15 }),
    '30': t('notifications.minBefore', { n: 30 }),
  }

  const intervalLabels: Record<string, string> = {
    '60': '1h',
    '90': '1.5h',
    '120': '2h',
  }

  const mealSlots: Array<{
    key: keyof NotificationSettings['meals']
    label: string
  }> = [
    { key: 'breakfast', label: t('diet.mealType.breakfast') },
    { key: 'lunch',     label: t('diet.mealType.lunch') },
    { key: 'snack',     label: t('diet.mealType.snack') },
    { key: 'dinner',    label: t('diet.mealType.dinner') },
  ]

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')} accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
          {t('notifications.title')}
        </Text>
      </View>

      {permDenied && (
        <PermissionBanner onPress={openNotificationSettings} />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Workout */}
        <SectionHeader label={t('notifications.workout')} />
        <View style={cardStyle}>
          <SettingRow
            label={t('notifications.workoutEnable')}
            right={
              <Switch
                value={settings.workoutEnabled}
                onValueChange={(v) => {
                  if (v) {
                    enableWithPermission(() => {
                      settings.updateWorkout({ workoutEnabled: true })
                      rescheduleWorkoutNotifications({ ...settings, workoutEnabled: true }, undefined, lang)
                    })
                  } else {
                    settings.updateWorkout({ workoutEnabled: false })
                    rescheduleWorkoutNotifications({ ...settings, workoutEnabled: false }, undefined, lang)
                  }
                }}
                trackColor={{ true: tokens.accent, false: tokens.surface2 }}
                thumbColor="#FFFFFF"
                accessibilityLabel={t('notifications.workoutEnable')}
              />
            }
          />

          {settings.workoutEnabled && (
            <>
              <SettingRow
                label={t('notifications.trainingTime')}
                right={
                  <TimeBadge
                    time={settings.workoutTime}
                    onPress={() =>
                      openTimePicker(settings.workoutTime, t('notifications.trainingTime'), (time) => {
                        settings.updateWorkout({ workoutTime: time })
                        rescheduleWorkoutNotifications({ ...settings, workoutTime: time }, undefined, lang)
                      })
                    }
                  />
                }
              />

              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.border, gap: 8 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.text }}>
                  {t('notifications.remindMe')}
                </Text>
                <ChipSelector
                  options={[0, 15, 30] as (0 | 15 | 30)[]}
                  value={settings.workoutOffset}
                  onChange={(v) => {
                    settings.updateWorkout({ workoutOffset: v })
                    rescheduleWorkoutNotifications({ ...settings, workoutOffset: v }, undefined, lang)
                  }}
                  labelMap={offsetLabels}
                />
              </View>

              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.text, marginBottom: 8 }}>
                  {t('notifications.activeDays')}
                </Text>
                <DayPicker
                  value={settings.workoutDays}
                  onChange={(days) => {
                    settings.updateWorkout({ workoutDays: days })
                    rescheduleWorkoutNotifications({ ...settings, workoutDays: days }, undefined, lang)
                  }}
                />
              </View>
            </>
          )}
        </View>

        {/* Meals */}
        <SectionHeader label={t('notifications.meals')} />
        <View style={cardStyle}>
          {mealSlots.map(({ key, label }) => (
            <SettingRow
              key={key as string}
              label={label}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {settings.meals[key].enabled && (
                    <TimeBadge
                      time={settings.meals[key].time}
                      onPress={() =>
                        openTimePicker(settings.meals[key].time, label, (time) => {
                          settings.updateMeal(key, { time })
                          rescheduleMealNotifications({
                            ...settings,
                            meals: { ...settings.meals, [key]: { ...settings.meals[key], time } },
                          })
                        })
                      }
                    />
                  )}
                  <Switch
                    value={settings.meals[key].enabled}
                    onValueChange={(v) => {
                      if (v) {
                        enableWithPermission(() => {
                          settings.updateMeal(key, { enabled: true })
                          rescheduleMealNotifications({
                            ...settings,
                            meals: { ...settings.meals, [key]: { ...settings.meals[key], enabled: true } },
                          })
                        })
                      } else {
                        settings.updateMeal(key, { enabled: false })
                        rescheduleMealNotifications({
                          ...settings,
                          meals: { ...settings.meals, [key]: { ...settings.meals[key], enabled: false } },
                        })
                      }
                    }}
                    trackColor={{ true: tokens.accent, false: tokens.surface2 }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel={label}
                  />
                </View>
              }
            />
          ))}
        </View>

        {/* Hydration */}
        <SectionHeader label={t('notifications.hydration')} />
        <View style={cardStyle}>
          <SettingRow
            label={t('notifications.hydrationEnable')}
            right={
              <Switch
                value={settings.hydrationEnabled}
                onValueChange={(v) => {
                  if (v) {
                    enableWithPermission(() => {
                      settings.updateHydration({ hydrationEnabled: true })
                      rescheduleHydrationNotifications({ ...settings, hydrationEnabled: true })
                    })
                  } else {
                    settings.updateHydration({ hydrationEnabled: false })
                    rescheduleHydrationNotifications({ ...settings, hydrationEnabled: false })
                  }
                }}
                trackColor={{ true: tokens.accent, false: tokens.surface2 }}
                thumbColor="#FFFFFF"
                accessibilityLabel={t('notifications.hydrationEnable')}
              />
            }
          />

          {settings.hydrationEnabled && (
            <>
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.border, gap: 8 }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.text }}>
                  {t('notifications.interval')}
                </Text>
                <ChipSelector
                  options={[60, 90, 120] as (60 | 90 | 120)[]}
                  value={settings.hydrationInterval}
                  onChange={(v) => {
                    settings.updateHydration({ hydrationInterval: v })
                    rescheduleHydrationNotifications({ ...settings, hydrationInterval: v })
                  }}
                  labelMap={intervalLabels}
                />
              </View>
              <SettingRow
                label={t('notifications.activeFrom')}
                right={
                  <TimeBadge
                    time={settings.hydrationActiveFrom}
                    onPress={() =>
                      openTimePicker(settings.hydrationActiveFrom, t('notifications.activeFrom'), (time) => {
                        settings.updateHydration({ hydrationActiveFrom: time })
                        rescheduleHydrationNotifications({ ...settings, hydrationActiveFrom: time })
                      })
                    }
                  />
                }
              />
              <SettingRow
                label={t('notifications.activeTo')}
                right={
                  <TimeBadge
                    time={settings.hydrationActiveTo}
                    onPress={() =>
                      openTimePicker(settings.hydrationActiveTo, t('notifications.activeTo'), (time) => {
                        settings.updateHydration({ hydrationActiveTo: time })
                        rescheduleHydrationNotifications({ ...settings, hydrationActiveTo: time })
                      })
                    }
                  />
                }
              />
            </>
          )}
        </View>

        {/* OS settings link */}
        <SectionHeader label="" />
        <View style={{ ...cardStyle }}>
          <SettingRow
            label={t('notifications.osSettings')}
            onPress={openNotificationSettings}
            right={<Text style={{ color: tokens.textMute, fontFamily: fonts.sansB, fontSize: 14 }}>-{'>'}</Text>}
          />
        </View>

      </ScrollView>

      <TimePickerModal
        visible={timePicker.visible}
        value={timePicker.value}
        label={timePicker.label}
        onConfirm={timePicker.onConfirm}
        onClose={() => setTimePicker((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  )
}
