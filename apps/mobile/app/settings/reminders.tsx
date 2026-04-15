import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Switch, Alert, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { colors, typography, spacing } = useTheme()
  return (
    <Text style={{
      fontFamily: typography.family.bold,
      fontSize: typography.size.base,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      paddingHorizontal: spacing.base,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xs,
    }}>
      {label}
    </Text>
  )
}

function SettingRow({
  label, sublabel, right, onPress,
}: { label: string; sublabel?: string; right: React.ReactNode; onPress?: () => void }) {
  const { colors, typography, spacing } = useTheme()
  const Wrapper = onPress ? TouchableOpacity : View
  return (
    <Wrapper
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface2,
      }}
      {...(onPress ? { accessibilityRole: 'button' as const } : {})}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary }}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      {right}
    </Wrapper>
  )
}

function TimeBadge({ time, onPress }: { time: string; onPress: () => void }) {
  const { colors, typography, spacing, radius } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.surface2,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
      accessibilityLabel={`Set time, currently ${time}`}
      accessibilityRole="button"
    >
      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary }}>
        {time}
      </Text>
    </TouchableOpacity>
  )
}

function PermissionBanner({ onPress }: { onPress: () => void }) {
  const { colors, typography, spacing, radius } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        margin: spacing.base,
        backgroundColor: `${colors.warning}18`,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: `${colors.warning}40`,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
      accessibilityRole="button"
    >
      <Text style={{ fontSize: 18 }}>⚠️</Text>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textPrimary, flex: 1 }}>
        Notifications are blocked. Tap to open Settings.
      </Text>
    </TouchableOpacity>
  )
}

// ─── Permission-aware toggle ──────────────────────────────────────────────────

function usePermissionToggle() {
  const [showPreModal, setShowPreModal] = useState(false)
  const [permDenied, setPermDenied] = useState(false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    getPermissionStatus().then((s) => setPermDenied(s === 'denied'))
  }, [])

  // Call this before enabling any toggle. Handles permission flow.
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
      // undetermined — show pre-permission modal via Alert for simplicity
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

// ─── Pill selector ────────────────────────────────────────────────────────────

function PillSelector<T extends string | number>({
  options, value, onChange, labelMap,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  labelMap?: Record<string, string>
}) {
  const { colors, typography, spacing, radius } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {options.map((opt) => {
        const selected = opt === value
        const label = labelMap ? labelMap[String(opt)] : String(opt)
        return (
          <TouchableOpacity
            key={String(opt)}
            onPress={() => onChange(opt)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.primary : colors.surface2,
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
          >
            <Text style={{
              fontFamily: selected ? typography.family.bold : typography.family.regular,
              fontSize: typography.size.base,
              color: selected ? tokenColors.white : colors.textMuted,
            }}>
              {label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RemindersScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const settings = useNotificationSettingsStore()
  const { enableWithPermission, permDenied } = usePermissionToggle()
  const utils = trpc.useUtils()

  const [timePicker, setTimePicker] = useState<{
    visible: boolean; value: string; label: string
    onConfirm: (t: string) => void
  }>({ visible: false, value: '00:00', label: '', onConfirm: () => {} })

  // Sync to backend on every settings change (debounced via tRPC mutation)
  const syncPrefs = trpc.notifications.upsertPreferences.useMutation()

  const openTimePicker = (value: string, label: string, onConfirm: (t: string) => void) => {
    setTimePicker({ visible: true, value, label, onConfirm })
  }

  // Push settings to API whenever they change
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.base,
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')} accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
          {t('notifications.title')}
        </Text>
      </View>

      {permDenied && (
        <PermissionBanner onPress={openNotificationSettings} />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>

        {/* ── Workout ── */}
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
                      rescheduleWorkoutNotifications({ ...settings, workoutEnabled: true })
                    })
                  } else {
                    settings.updateWorkout({ workoutEnabled: false })
                    rescheduleWorkoutNotifications({ ...settings, workoutEnabled: false })
                  }
                }}
                trackColor={{ true: colors.primary, false: colors.surface2 }}
                thumbColor={tokenColors.white}
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
                        rescheduleWorkoutNotifications({ ...settings, workoutTime: time })
                      })
                    }
                  />
                }
              />

              <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface2, gap: spacing.sm }}>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary }}>
                  {t('notifications.remindMe')}
                </Text>
                <PillSelector
                  options={[0, 15, 30] as (0 | 15 | 30)[]}
                  value={settings.workoutOffset}
                  onChange={(v) => {
                    settings.updateWorkout({ workoutOffset: v })
                    rescheduleWorkoutNotifications({ ...settings, workoutOffset: v })
                  }}
                  labelMap={offsetLabels}
                />
              </View>

              <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary, marginBottom: spacing.sm }}>
                  {t('notifications.activeDays')}
                </Text>
                <DayPicker
                  value={settings.workoutDays}
                  onChange={(days) => {
                    settings.updateWorkout({ workoutDays: days })
                    rescheduleWorkoutNotifications({ ...settings, workoutDays: days })
                  }}
                />
              </View>
            </>
          )}
        </View>

        {/* ── Meals ── */}
        <SectionHeader label={t('notifications.meals')} />
        <View style={cardStyle}>
          {mealSlots.map(({ key, label }) => (
            <SettingRow
              key={key}
              label={label}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
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
                    trackColor={{ true: colors.primary, false: colors.surface2 }}
                    thumbColor={tokenColors.white}
                    accessibilityLabel={label}
                  />
                </View>
              }
            />
          ))}
        </View>

        {/* ── Hydration ── */}
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
                trackColor={{ true: colors.primary, false: colors.surface2 }}
                thumbColor={tokenColors.white}
                accessibilityLabel={t('notifications.hydrationEnable')}
              />
            }
          />

          {settings.hydrationEnabled && (
            <>
              <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface2, gap: spacing.sm }}>
                <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textPrimary }}>
                  {t('notifications.interval')}
                </Text>
                <PillSelector
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

        {/* ── OS notification settings link ── */}
        <SectionHeader label="" />
        <View style={{ ...cardStyle }}>
          <SettingRow
            label={t('notifications.osSettings')}
            onPress={openNotificationSettings}
            right={<Text style={{ color: colors.textMuted, fontSize: typography.size.body }}>→</Text>}
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
