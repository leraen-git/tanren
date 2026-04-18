import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  type ViewStyle,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'
import { useAuth } from '@/contexts/AuthContext'
import { formatVolume } from '@/utils/format'

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
const GOALS  = ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE'] as const

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  const { colors, typography, spacing } = useTheme()
  return (
    <Text style={{
      fontFamily: typography.family.semiBold,
      fontSize: typography.size.xs,
      color: colors.textMuted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    }}>
      {label}
    </Text>
  )
}

function NavRow({
  icon, label, sublabel, onPress, danger,
}: {
  icon: string
  label: string
  sublabel?: string
  onPress: () => void
  danger?: boolean
}) {
  const { colors, typography, spacing } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface2,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: typography.size.xl, width: 32 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: typography.family.regular,
          fontSize: typography.size.body,
          color: danger ? colors.danger : colors.textPrimary,
        }}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: danger ? colors.danger : colors.textMuted }}>›</Text>
    </TouchableOpacity>
  )
}

function InfoRow({
  icon, label, sublabel,
}: {
  icon: string
  label: string
  sublabel?: string
}) {
  const { colors, typography, spacing } = useTheme()
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface2,
    }}>
      <Text style={{ fontSize: typography.size.xl, width: 32 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: typography.family.regular,
          fontSize: typography.size.body,
          color: colors.textMuted,
        }}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: 2 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function InlineField({
  label, value, onSave, placeholder, keyboardType = 'default', editable = true, unit,
}: {
  label: string
  value: string
  onSave?: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad'
  editable?: boolean
  unit?: string
}) {
  const { colors, typography, spacing } = useTheme()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  const handleSave = () => {
    setEditing(false)
    if (draft !== value) onSave?.(draft)
  }

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface2,
    }}>
      <Text style={{
        fontFamily: typography.family.regular,
        fontSize: typography.size.body,
        color: colors.textMuted,
        width: 100,
      }}>
        {label}
      </Text>
      {editing ? (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={handleSave}
            onSubmitEditing={handleSave}
            returnKeyType="done"
            keyboardType={keyboardType}
            autoFocus
            style={{
              flex: 1,
              fontFamily: typography.family.semiBold,
              fontSize: typography.size.body,
              color: colors.textPrimary,
              borderBottomWidth: 1,
              borderBottomColor: colors.primary,
              paddingVertical: spacing.xs,
            }}
            accessibilityLabel={`Edit ${label}`}
          />
          {unit && <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>{unit}</Text>}
        </View>
      ) : (
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          onPress={() => editable && setEditing(true)}
          disabled={!editable}
          accessibilityLabel={`${label}: ${value || placeholder}`}
          accessibilityRole={editable ? 'button' : 'text'}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{
              fontFamily: typography.family.semiBold,
              fontSize: typography.size.body,
              color: value ? colors.textPrimary : colors.textMuted,
            }}>
              {value || placeholder || '—'}
            </Text>
            {unit && value ? (
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>{unit}</Text>
            ) : null}
          </View>
          {editable && (
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>›</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

function ChipSelector<T extends string>({
  label, options, value, labelMap, onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  labelMap?: Record<string, string>
  onChange: (v: T) => void
}) {
  const { colors, typography, spacing, radius } = useTheme()
  return (
    <View style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface2, gap: spacing.sm }}>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const selected = opt === value
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.primary : colors.surface2,
              }}
              accessibilityLabel={labelMap?.[opt] ?? opt}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text style={{
                fontFamily: selected ? typography.family.semiBold : typography.family.regular,
                fontSize: typography.size.base,
                color: selected ? tokenColors.white : colors.textMuted,
              }}>
                {labelMap?.[opt] ?? opt.charAt(0) + opt.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ─── Theme picker (inline segmented row) ─────────────────────────────────────

type ThemeValue = 'light' | 'dark' | 'system'
const THEME_OPTIONS: { value: ThemeValue; icon: string }[] = [
  { value: 'light',  icon: '☀️' },
  { value: 'dark',   icon: '🌙' },
  { value: 'system', icon: '⚙️' },
]

function ThemeRow({ label }: { label: string }) {
  const { colors, typography, spacing, radius, preference, setTheme } = useTheme()
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface2,
    }}>
      <Text style={{ fontSize: typography.size.xl, width: 32 }}>🎨</Text>
      <Text style={{
        fontFamily: typography.family.regular,
        fontSize: typography.size.body,
        color: colors.textPrimary,
        flex: 1,
      }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 3, gap: 2 }}>
        {THEME_OPTIONS.map(({ value, icon }) => {
          const selected = preference === value
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setTheme(value)}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.sm,
                backgroundColor: selected ? colors.primary : 'transparent',
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${value} theme`}
            >
              <Text style={{ fontSize: typography.size.body }}>{icon}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()

  const { signOut } = useAuth()
  const { data: user, refetch, isLoading, error } = trpc.users.me.useQuery()
  const { data: sessions }      = trpc.sessions.history.useQuery({ limit: 100 })
  const { data: records }       = trpc.progress.records.useQuery()
  const utils = trpc.useUtils()

  const updateMe = trpc.users.updateMe.useMutation({ onSuccess: () => refetch() })
  const deleteMe = trpc.users.deleteMe.useMutation({
    onSuccess: async () => {
      await utils.invalidate()
      await signOut()
      router.replace('/sign-in')
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const save = (data: Parameters<typeof updateMe.mutate>[0]) => updateMe.mutate(data)

  const handleSignOut = () => {
    Alert.alert(
      t('profile.signOutTitle'),
      t('profile.signOutDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/sign-in')
          },
        },
      ],
    )
  }

  const handleDeleteAccount = () => {
    // Two-step confirmation — first warning
    Alert.alert(
      t('profile.deleteTitle'),
      t('profile.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            // Second confirmation — no going back
            Alert.alert(
              t('profile.deleteConfirm2Title'),
              t('profile.deleteConfirm2Desc'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('profile.deleteConfirm2Button'),
                  style: 'destructive',
                  onPress: () => deleteMe.mutate(),
                },
              ],
            )
          },
        },
      ],
    )
  }

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('profile.photoPermTitle'), t('profile.photoPermDesc'))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      save({ avatarUrl: result.assets[0].uri })
    }
  }

  const totalVolume = sessions?.reduce((sum, s) => sum + s.totalVolume, 0) ?? 0

  const goalLabels: Record<string, string> = {
    WEIGHT_LOSS: t('profile.goalWeightLoss'),
    MUSCLE_GAIN: t('profile.goalMuscleGain'),
    MAINTENANCE: t('profile.goalMaintenance'),
  }

  const levelLabels: Record<string, string> = {
    BEGINNER:     t('profile.levelBeginner'),
    INTERMEDIATE: t('profile.levelIntermediate'),
    ADVANCED:     t('profile.levelAdvanced'),
  }

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    overflow: 'hidden',
  }

  const isGuest = user?.authProvider === 'guest'
  const bannerVisible = useGuestBannerVisible()

  if (isLoading) return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
        {t('common.loading')}
      </Text>
    </SafeAreaView>
  )

  if (error || !user) return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.base, gap: spacing.md }}>
      <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.danger, textAlign: 'center' }}>
        {error?.message ?? t('common.error')}
      </Text>
      <TouchableOpacity onPress={() => refetch()} accessibilityRole="button" accessibilityLabel={t('common.retry')}>
        <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.primary }}>
          {t('common.retry')}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.base, gap: spacing.sm }}>
          {/* Avatar */}
          <TouchableOpacity
            onPress={handlePickPhoto}
            accessibilityLabel={t('profile.changePhoto')}
            accessibilityRole="button"
            style={{ position: 'relative' }}
          >
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surface2 }}
              />
            ) : (
              <View style={{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: colors.primary,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: tokenColors.white }}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              backgroundColor: colors.surface2,
              borderRadius: radius.pill,
              width: 26, height: 26,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: colors.background,
            }}>
              <Text style={{ fontSize: 12 }}>📷</Text>
            </View>
          </TouchableOpacity>

          {/* Name */}
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
            {user.name}
          </Text>

          {/* Level + Goal badges */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ backgroundColor: colors.surface2, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3 }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.textMuted }}>
                {levelLabels[user.level] ?? user.level}
              </Text>
            </View>
            <View style={{ backgroundColor: `${colors.primary}18`, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3 }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: colors.primary }}>
                {goalLabels[user.goal] ?? user.goal}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stats strip ── */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, marginBottom: spacing.xs }}>
          {[
            { label: t('profile.statSessions'), value: String(sessions?.length ?? 0) },
            { label: t('profile.statVolume'),   value: formatVolume(totalVolume) },
            { label: t('profile.statPRs'),      value: String(records?.length ?? 0) },
          ].map(({ label, value }) => (
            <View key={label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.primary }}>{value}</Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: spacing.base }}>

          {/* ── Personal info ── */}
          <SectionTitle label={t('profile.sectionPersonal')} />
          <View style={cardStyle}>
            <InlineField
              label={t('profile.fieldName')}
              value={user.name}
              onSave={(v) => save({ name: v })}
              placeholder={t('profile.fieldNamePlaceholder')}
            />
            <InlineField
              label={t('profile.fieldEmail')}
              value={isGuest ? '' : user.email}
              onSave={isGuest ? undefined : (v) => save({ email: v })}
              placeholder={isGuest ? t('guest.emailPlaceholder') : undefined}
              keyboardType="default"
              editable={!isGuest}
            />
            <InlineField
              label={t('profile.fieldHeight')}
              value={user.heightCm != null ? String(user.heightCm) : ''}
              onSave={(v) => save({ heightCm: parseFloat(v) || null })}
              placeholder="—"
              keyboardType="decimal-pad"
              unit="cm"
            />
            <InlineField
              label={t('profile.fieldWeight')}
              value={user.weightKg != null ? String(user.weightKg) : ''}
              onSave={(v) => save({ weightKg: parseFloat(v) || null })}
              placeholder="—"
              keyboardType="decimal-pad"
              unit="kg"
            />
          </View>

          {/* ── Training ── */}
          <SectionTitle label={t('profile.sectionTraining')} />
          <View style={cardStyle}>
            <ChipSelector
              label={t('profile.fieldLevel')}
              options={LEVELS}
              value={user.level}
              labelMap={levelLabels}
              onChange={(v) => save({ level: v })}
            />
            <ChipSelector
              label={t('profile.fieldGoal')}
              options={GOALS}
              value={user.goal}
              labelMap={goalLabels}
              onChange={(v) => save({ goal: v })}
            />
            <View style={{ paddingVertical: spacing.md, gap: spacing.sm }}>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
                {t('profile.weeklyTarget')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => save({ weeklyTarget: n })}
                    style={{
                      flex: 1, paddingVertical: spacing.sm,
                      borderRadius: radius.sm,
                      backgroundColor: user.weeklyTarget === n ? colors.primary : colors.surface2,
                      alignItems: 'center',
                    }}
                    accessibilityLabel={`${n} ${t('profile.sessionsPerWeek')}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: user.weeklyTarget === n }}
                  >
                    <Text style={{
                      fontFamily: typography.family.bold,
                      fontSize: typography.size.base,
                      color: user.weeklyTarget === n ? tokenColors.white : colors.textMuted,
                    }}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'center' }}>
                {t('profile.sessionsPerWeek')}
              </Text>
            </View>
          </View>

          {/* ── App settings ── */}
          <SectionTitle label={t('profile.sectionSettings')} />
          <View style={cardStyle}>
            <NavRow
              icon="✨"
              label={t('explore.title')}
              sublabel={t('profile.exploreSub')}
              onPress={() => router.push('/explore')}
            />
            <NavRow
              icon="🔔"
              label={t('profile.reminders')}
              sublabel={t('profile.remindersSub')}
              onPress={() => router.push('/settings/reminders')}
            />
            <ThemeRow label={t('profile.appearance')} />
          </View>

          {/* ── Privacy & account ── */}
          <SectionTitle label={t('profile.sectionPrivacy')} />
          <View style={cardStyle}>
            <NavRow
              icon="🔒"
              label={t('profile.dataUsage')}
              sublabel={t('profile.dataUsageSub')}
              onPress={() => router.push('/privacy')}
            />
            <InfoRow
              icon=""
              label={t('profile.connectedWith')}
              sublabel={(() => {
                if (isGuest) return t('guest.connectedWith')
                if (user.authProvider === 'google') return `Google · ${user.email}`
                if (user.authProvider === 'email') return `Email · ${user.email}`
                const emailLabel = user.email.endsWith('@privaterelay.appleid.com')
                  ? t('onboarding.step0PrivateEmail')
                  : user.email
                return `Apple Sign-In · ${emailLabel}`
              })()}
            />
            <NavRow
              icon="🚪"
              label={t('profile.signOut')}
              onPress={handleSignOut}
              danger
            />
            <NavRow
              icon="🗑️"
              label={t('profile.deleteAccount')}
              onPress={handleDeleteAccount}
              danger
            />
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
