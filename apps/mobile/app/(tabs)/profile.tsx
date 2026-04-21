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
import { useAuth } from '@/contexts/AuthContext'
import { formatVolume } from '@/utils/format'

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
const GOALS  = ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE'] as const

function SectionTitle({ label }: { label: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <Text style={{
      fontFamily: fonts.sansB,
      fontSize: 9,
      color: tokens.textGhost,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 4,
    }}>
      {label}
    </Text>
  )
}

function NavRow({
  label, sublabel, onPress, danger,
}: {
  label: string
  sublabel?: string
  onPress: () => void
  danger?: boolean
}) {
  const { tokens, fonts } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: fonts.sansM,
          fontSize: 14,
          color: danger ? tokens.accent : tokens.text,
        }}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute, marginTop: 2 }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>›</Text>
    </TouchableOpacity>
  )
}

function InfoRow({ label, sublabel }: { label: string; sublabel?: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute, marginTop: 2 }}>
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
  const { tokens, fonts } = useTheme()
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
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    }}>
      <Text style={{
        fontFamily: fonts.sans,
        fontSize: 14,
        color: tokens.textMute,
        width: 100,
      }}>
        {label}
      </Text>
      {editing ? (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
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
              fontFamily: fonts.sansM,
              fontSize: 14,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: tokens.accent,
              paddingVertical: 4,
            }}
            accessibilityLabel={`Edit ${label}`}
          />
          {unit && <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{unit}</Text>}
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
              fontFamily: fonts.sansM,
              fontSize: 14,
              color: value ? tokens.text : tokens.textMute,
            }}>
              {value || placeholder || '—'}
            </Text>
            {unit && value ? (
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{unit}</Text>
            ) : null}
          </View>
          {editable && (
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>›</Text>
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
  const { tokens, fonts } = useTheme()
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.border, gap: 8 }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const selected = opt === value
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 12,
                backgroundColor: selected ? tokens.accent : 'transparent',
                borderWidth: 1,
                borderColor: selected ? tokens.accent : tokens.borderStrong,
              }}
              accessibilityLabel={labelMap?.[opt] ?? opt}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: selected ? '#FFFFFF' : tokens.textMute,
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

type ThemeValue = 'light' | 'dark' | 'system'
const THEME_LABELS: Record<ThemeValue, string> = { light: '☀️', dark: '🌙', system: '⚙️' }

function ThemeRow({ label }: { label: string }) {
  const { tokens, fonts, preference, setTheme } = useTheme()
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    }}>
      <Text style={{
        fontFamily: fonts.sans,
        fontSize: 14,
        color: tokens.text,
        flex: 1,
      }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.borderStrong }}>
        {(['light', 'dark', 'system'] as ThemeValue[]).map((value) => {
          const selected = preference === value
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setTheme(value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: selected ? tokens.accent : 'transparent',
                borderLeftWidth: value !== 'light' ? 1 : 0,
                borderLeftColor: tokens.borderStrong,
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${value} theme`}
            >
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 10,
                letterSpacing: 1,
                color: selected ? '#FFFFFF' : tokens.textMute,
              }}>
                {THEME_LABELS[value]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  const { signOut } = useAuth()
  const { data: user, refetch, isLoading, error } = trpc.users.me.useQuery()
  const { data: sessions } = trpc.sessions.history.useQuery({ limit: 100 })
  const { data: records } = trpc.progress.records.useQuery()
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
    Alert.alert(
      t('profile.deleteTitle'),
      t('profile.deleteDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
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
    backgroundColor: tokens.surface1,
    borderWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: 16,
    overflow: 'hidden',
  }

  const isGuest = user?.authProvider === 'guest'
  const bannerVisible = useGuestBannerVisible()

  if (isLoading) return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>
        {t('common.loading')}
      </Text>
    </SafeAreaView>
  )

  if (error || !user) return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent, textAlign: 'center' }}>
        {error?.message ?? t('common.error')}
      </Text>
      <TouchableOpacity onPress={() => refetch()} accessibilityRole="button" accessibilityLabel={t('common.retry')}>
        <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.accent }}>
          {t('common.retry')}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 16, gap: 8 }}>
          <TouchableOpacity
            onPress={handlePickPhoto}
            accessibilityLabel={t('profile.changePhoto')}
            accessibilityRole="button"
          >
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: 80, height: 80, backgroundColor: tokens.surface2 }}
              />
            ) : (
              <View style={{
                width: 80, height: 80,
                backgroundColor: tokens.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: '#FFFFFF' }}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={{
            fontFamily: fonts.sansX,
            fontSize: 24,
            color: tokens.text,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {user.name}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ borderWidth: 1, borderColor: tokens.borderStrong, paddingHorizontal: 12, paddingVertical: 3 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1.4, color: tokens.textMute, textTransform: 'uppercase' }}>
                {levelLabels[user.level] ?? user.level}
              </Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: tokens.accent, paddingHorizontal: 12, paddingVertical: 3 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1.4, color: tokens.accent, textTransform: 'uppercase' }}>
                {goalLabels[user.goal] ?? user.goal}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats strip */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          marginBottom: 4,
          borderWidth: 1,
          borderColor: tokens.border,
        }}>
          {[
            { label: t('profile.statSessions'), value: String(sessions?.length ?? 0) },
            { label: t('profile.statVolume'), value: formatVolume(totalVolume) },
            { label: t('profile.statPRs'), value: String(new Set(records?.map((r) => r.exerciseId) ?? []).size) },
          ].map(({ label, value }, i) => (
            <View key={label} style={{
              flex: 1,
              padding: 12,
              alignItems: 'center',
              gap: 2,
              borderLeftWidth: i > 0 ? 1 : 0,
              borderLeftColor: tokens.border,
            }}>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.accent }}>{value}</Text>
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 8,
                letterSpacing: 2,
                color: tokens.textMute,
                textTransform: 'uppercase',
              }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
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
            <View style={{ paddingVertical: 12, gap: 8 }}>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>
                {t('profile.weeklyTarget')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 1, borderWidth: 1, borderColor: tokens.borderStrong }}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => save({ weeklyTarget: n })}
                    style={{
                      flex: 1, paddingVertical: 8,
                      backgroundColor: user.weeklyTarget === n ? tokens.accent : 'transparent',
                      alignItems: 'center',
                      borderLeftWidth: n > 1 ? 1 : 0,
                      borderLeftColor: tokens.borderStrong,
                    }}
                    accessibilityLabel={`${n} ${t('profile.sessionsPerWeek')}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: user.weeklyTarget === n }}
                  >
                    <Text style={{
                      fontFamily: fonts.sansB,
                      fontSize: 12,
                      color: user.weeklyTarget === n ? '#FFFFFF' : tokens.textMute,
                    }}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 8,
                letterSpacing: 2,
                color: tokens.textGhost,
                textAlign: 'center',
                textTransform: 'uppercase',
              }}>
                {t('profile.sessionsPerWeek')}
              </Text>
            </View>
          </View>

          <SectionTitle label={t('profile.sectionSettings')} />
          <View style={cardStyle}>
            <NavRow
              label={t('explore.title')}
              sublabel={t('profile.exploreSub')}
              onPress={() => router.push('/explore')}
            />
            <NavRow
              label={t('profile.reminders')}
              sublabel={t('profile.remindersSub')}
              onPress={() => router.push('/settings/reminders')}
            />
            <ThemeRow label={t('profile.appearance')} />
          </View>

          <SectionTitle label={t('profile.sectionPrivacy')} />
          <View style={cardStyle}>
            <NavRow
              label={t('profile.dataUsage')}
              sublabel={t('profile.dataUsageSub')}
              onPress={() => router.push('/privacy')}
            />
            <InfoRow
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
              label={t('profile.signOut')}
              onPress={handleSignOut}
              danger
            />
            <NavRow
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
