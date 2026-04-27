import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useGuestBannerVisible } from '@/contexts/GuestBannerContext'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useProfile } from '@/data/useProfile'
import { usePersonalRecords } from '@/data/useProgress'
import { useSessions } from '@/data/useSessions'
import { useAuth } from '@/contexts/AuthContext'
import { SectionStatus } from '@/components/SectionStatus'
import { SkeletonCard } from '@/components/SkeletonCard'
import { formatVolume } from '@/utils/format'
import { SyncStatusBanner } from '@/components/profile/SyncStatusBanner'
import { useProfileStore } from '@/stores/profileStore'
import { EditFirstNameModal } from '@/components/profile/EditFirstNameModal'
import { EditHeightModal } from '@/components/profile/EditHeightModal'
import { EditTrainingLevelModal } from '@/components/profile/EditTrainingLevelModal'
import { EditTrainingGoalModal } from '@/components/profile/EditTrainingGoalModal'
import { EditSessionsPerWeekModal } from '@/components/profile/EditSessionsPerWeekModal'
import { LogoutConfirmModal } from '@/components/profile/LogoutConfirmModal'

function SectionLabel({ label }: { label: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <Text style={{
      fontFamily: fonts.sansM,
      fontSize: 9,
      color: tokens.textGhost,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginTop: 24,
      marginBottom: 4,
    }}>
      {label}
    </Text>
  )
}

function Row({
  label,
  value,
  muted,
  onPress,
  danger,
  disabled,
  badge,
}: {
  label: string
  value?: string
  muted?: boolean
  onPress?: () => void
  danger?: boolean
  disabled?: boolean
  badge?: string
}) {
  const { tokens, fonts } = useTheme()

  const content = (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: tokens.border,
    }}>
      <Text style={{
        fontFamily: fonts.sansM,
        fontSize: 13,
        letterSpacing: 0.3,
        color: danger ? tokens.accent : tokens.text,
        opacity: disabled ? 0.5 : 1,
      }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {badge && (
          <View style={{
            backgroundColor: tokens.surface2,
            paddingHorizontal: 8,
            paddingVertical: 2,
            marginRight: 8,
          }}>
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 9,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              color: tokens.textMute,
            }}>
              {badge}
            </Text>
          </View>
        )}
        {value && !badge && (
          <Text style={{
            fontFamily: muted ? fonts.sansM : fonts.sansB,
            fontSize: 13,
            letterSpacing: 0.3,
            color: muted ? tokens.textMute : tokens.text,
          }}>
            {value}
          </Text>
        )}
        {!disabled && !badge && (
          <Text style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: tokens.textMute,
            marginLeft: 8,
          }}>
            ›
          </Text>
        )}
      </View>
    </View>
  )

  if (disabled || !onPress) return content

  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {content}
    </TouchableOpacity>
  )
}

function ProfileStatsStrip({ sessionsQuery, recordsQuery }: {
  sessionsQuery: ReturnType<typeof useSessions>
  recordsQuery: ReturnType<typeof usePersonalRecords>
}) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const sessions = sessionsQuery.data
  const records = recordsQuery.data
  const isLoading = sessionsQuery.isPending || recordsQuery.isPending
  const isError = sessionsQuery.isError || recordsQuery.isError

  if (isLoading) return <SkeletonCard height={60} />

  if (isError && !sessions && !records) {
    return (
      <SectionStatus
        query={sessionsQuery}
        errorLabel={t('profile.statSessions')}
        loadingHeight={60}
      >
        {() => null}
      </SectionStatus>
    )
  }

  const totalVolume = sessions?.reduce((sum, s) => sum + s.totalVolume, 0) ?? 0

  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.border, marginBottom: 8 }}>
      {[
        { label: t('profile.statSessions'), value: String(sessions?.length ?? 0), highlight: false },
        { label: t('profile.statVolume'), value: formatVolume(totalVolume), highlight: true },
        { label: t('profile.statPRs'), value: String(new Set((records ?? []).map((r: { exerciseId: string }) => r.exerciseId)).size), highlight: false },
      ].map(({ label, value, highlight }, i) => (
        <View key={label} style={{
          flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center',
          borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: tokens.border,
        }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: highlight ? tokens.accent : tokens.text, lineHeight: 22, marginBottom: 4 }}>
            {value}
          </Text>
          <Text style={{ fontFamily: fonts.sansM, fontSize: 9, letterSpacing: 2, color: tokens.textMute, textTransform: 'uppercase' }}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
}

type ThemeValue = 'light' | 'dark' | 'system'

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
        fontFamily: fonts.sansM,
        fontSize: 13,
        letterSpacing: 0.3,
        color: tokens.text,
        flex: 1,
      }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.borderStrong }}>
        {(['light', 'dark', 'system'] as ThemeValue[]).map((value) => {
          const selected = preference === value
          const labels: Record<ThemeValue, string> = { light: 'Clair', dark: 'Sombre', system: 'Auto' }
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setTheme(value)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                backgroundColor: selected ? tokens.accent : 'transparent',
                borderLeftWidth: value !== 'light' ? 1 : 0,
                borderLeftColor: tokens.borderStrong,
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 9,
                letterSpacing: 1,
                color: selected ? '#FFFFFF' : tokens.textMute,
              }}>
                {labels[value]}
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
  const { activeModal, openModal, closeModal } = useProfileStore()

  const profileQuery = useProfile()
  const { data: user, refetch } = profileQuery
  const sessionsQuery = useSessions({ limit: 100 })
  const recordsQuery = usePersonalRecords()
  const utils = trpc.useUtils()

  const updateMe = trpc.users.updateMe.useMutation({ onSuccess: () => refetch() })
  const deleteMe = trpc.users.deleteMe.useMutation({
    onSuccess: async () => {
      await signOut()
      utils.invalidate()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const save = (data: Parameters<typeof updateMe.mutate>[0]) => updateMe.mutate(data)

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

  const handleLogout = async () => {
    closeModal()
    await signOut()
    utils.invalidate()
  }

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

  const isGuest = user?.authProvider === 'guest'
  const bannerVisible = useGuestBannerVisible()

  return (
    <SafeAreaView edges={bannerVisible ? [] : ['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Screen title */}
        <Text style={{
          fontFamily: fonts.sansX,
          fontSize: 24,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: tokens.text,
          paddingTop: 16,
          paddingBottom: 8,
        }}>
          {t('profile.title')}
        </Text>

        {/* Identity section — required */}
        <SectionStatus query={profileQuery} errorLabel={t('profile.title')} loadingHeight={100}>
          {(u) => {
            const providerLabel = (() => {
              if (u.authProvider === 'guest') return t('guest.connectedWith')
              if (u.authProvider === 'google') return 'Connecte via Google'
              if (u.authProvider === 'email') return 'Connecte via Email'
              return 'Connecte via Apple'
            })()
            const weightDisplay = u.weightKg != null
              ? `${u.weightKg.toFixed(1).replace('.', ',')} kg`
              : undefined
            const heightDisplay = u.heightCm != null
              ? `${u.heightCm} cm`
              : undefined

            return (
              <>
                {/* Header: avatar + info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}>
                  <View style={{ width: 56, height: 56, position: 'relative' }}>
                    <View style={{
                      width: 56, height: 56, borderWidth: 2, borderColor: tokens.text,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontFamily: fonts.sansX, fontSize: 22, color: tokens.text, letterSpacing: 1 }}>
                        {u.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ position: 'absolute', top: -2, left: -2, width: 10, height: 10, backgroundColor: tokens.accent }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansX, fontSize: 20, letterSpacing: 0.2, color: tokens.text, lineHeight: 22, marginBottom: 4 }}>
                      {u.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.sans, fontSize: 11, letterSpacing: 0.5, color: tokens.textMute }}>
                      {u.authProvider === 'guest' ? '' : u.email}
                    </Text>
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: tokens.accent, marginTop: 4 }}>
                      {providerLabel}
                    </Text>
                  </View>
                </View>

                {/* Stats strip — under name */}
                <ProfileStatsStrip sessionsQuery={sessionsQuery} recordsQuery={recordsQuery} />

                {/* Personnel */}
                <SectionLabel label={t('profile.sectionPersonal')} />
                <Row label={t('profile.fieldName')} value={u.name} onPress={() => openModal('editFirstName')} />
                <Row label={t('profile.fieldHeight')} value={heightDisplay} onPress={() => openModal('editHeight')} />
                <Row label={t('profile.fieldWeight')} value={weightDisplay} onPress={() => router.push('/profile/weight')} />

                {/* Entraînement */}
                <SectionLabel label={t('profile.sectionTraining')} />
                <Row label={t('profile.fieldLevel')} value={levelLabels[u.level] ?? u.level} onPress={() => openModal('editLevel')} />
                <Row label={t('profile.fieldGoal')} value={goalLabels[u.goal] ?? u.goal} onPress={() => openModal('editGoal')} />
                <Row label={t('profile.sessionsPerWeekLabel')} value={String(u.weeklyTarget)} onPress={() => openModal('editSessions')} />

                {/* Modals */}
                <EditFirstNameModal open={activeModal === 'editFirstName'} onClose={closeModal} currentValue={u.name} onSave={(v) => save({ name: v })} />
                <EditHeightModal open={activeModal === 'editHeight'} onClose={closeModal} currentValue={u.heightCm} onSave={(v) => save({ heightCm: v })} />
                <EditTrainingLevelModal open={activeModal === 'editLevel'} onClose={closeModal} currentValue={u.level} onSave={(v) => save({ level: v })} />
                <EditTrainingGoalModal open={activeModal === 'editGoal'} onClose={closeModal} currentValue={u.goal} onSave={(v) => save({ goal: v })} />
                <EditSessionsPerWeekModal open={activeModal === 'editSessions'} onClose={closeModal} currentValue={u.weeklyTarget} onSave={(v) => save({ weeklyTarget: v })} />
              </>
            )
          }}
        </SectionStatus>

        <SyncStatusBanner />

        {/* Réglages — always visible, no query dependency */}
        <SectionLabel label={t('profile.sectionReglages')} />
        <Row label="Notre Mantra" onPress={() => router.push('/mantra')} muted />
        <Row label={t('explore.title')} onPress={() => router.push('/explore')} muted />
        <Row label={t('profile.reminders')} onPress={() => router.push('/settings/reminders')} muted />
        <Row label={t('profile.healthTitle')} disabled badge={t('profile.healthSoonBadge')} />
        <ThemeRow label={t('profile.appearance')} />

        {/* Compte & confidentialité — always visible */}
        <SectionLabel label={t('profile.sectionAccount')} />
        <Row label={t('profile.dataUsage')} onPress={() => router.push('/privacy')} muted />
        <Row label={t('profile.cgu')} onPress={() => router.push('/settings/cgu')} muted />
        <Row label={t('profile.privacyPolicy')} onPress={() => router.push('/settings/privacy')} muted />
        <Row label={t('profile.signOut')} onPress={() => openModal('logoutConfirm')} muted />
        <Row label={t('profile.deleteAccount')} onPress={handleDeleteAccount} danger />
      </ScrollView>

      <LogoutConfirmModal open={activeModal === 'logoutConfirm'} onClose={closeModal} onConfirm={handleLogout} />
    </SafeAreaView>
  )
}
