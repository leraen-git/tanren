import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useProfile } from '@/data/useProfile'
import { trpc } from '@/lib/trpc'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Button } from '@/components/Button'
import { BottomSheetShell } from '@/components/BottomSheetShell'
import { formatDateShort } from '@/utils/format'

function ResetButton({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  const { tokens, fonts } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 14,
        borderBottomWidth: 1, borderBottomColor: tokens.border,
        opacity: loading ? 0.5 : 1,
      }}
    >
      <Text style={{ fontFamily: fonts.sansM, fontSize: 13, color: tokens.accent }}>
        {loading ? '...' : label}
      </Text>
    </TouchableOpacity>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { tokens, fonts } = useTheme()
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: tokens.border,
    }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>{label}</Text>
      <Text style={{ fontFamily: fonts.sansM, fontSize: 13, color: tokens.text }}>{value}</Text>
    </View>
  )
}

export default function AdminUserDetailScreen() {
  const { tokens, fonts, label: labelPreset } = useTheme()
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: me, isPending: meLoading } = useProfile()

  const { data, isPending } = trpc.admin.users.get.useQuery(
    { userId: id! },
    { enabled: !!id && me?.role === 'admin' },
  )
  const utils = trpc.useUtils()

  const [deleteSheet, setDeleteSheet] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [restoreSheet, setRestoreSheet] = useState(false)
  const [restoreEmail, setRestoreEmail] = useState('')
  const [quotaSheet, setQuotaSheet] = useState(false)
  const [quotaUnlimited, setQuotaUnlimited] = useState(false)
  const [quotaReason, setQuotaReason] = useState('')

  const softDeleteMut = trpc.admin.users.softDelete.useMutation({
    onSuccess: () => {
      setDeleteSheet(false)
      utils.admin.users.invalidate()
      router.back()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const restoreMut = trpc.admin.users.restore.useMutation({
    onSuccess: () => {
      setRestoreSheet(false)
      utils.admin.users.invalidate()
      router.back()
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const quotaMut = trpc.admin.users.setQuotaOverrides.useMutation({
    onSuccess: () => {
      setQuotaSheet(false)
      utils.admin.users.get.invalidate({ userId: id! })
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  const resetDietCreditsMut = trpc.admin.users.resetDietCredits.useMutation({
    onSuccess: (data) => Alert.alert('Done', `${data.deletedCount} credit(s) cleared`),
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  if (meLoading) return null
  if (me?.role !== 'admin') return <Redirect href="/(tabs)/profile" />

  if (isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
        <ScreenHeader title={t('admin.users')} />
        <View style={{ paddingHorizontal: 16 }}><SkeletonCard height={300} /></View>
      </SafeAreaView>
    )
  }

  if (!data) return null

  const { user: u, stats } = data
  const isDeleted = !!u.deletedAt

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScreenHeader title={t('admin.users')} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Identity */}
        <View style={{ paddingVertical: 16 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, marginBottom: 4 }}>{u.name}</Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>{u.email}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <View style={{ backgroundColor: tokens.surface2, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 1.5, color: tokens.textMute, textTransform: 'uppercase' }}>
                {u.authProvider}
              </Text>
            </View>
            {u.role === 'admin' && (
              <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 1.5, color: '#FFFFFF' }}>ADMIN</Text>
              </View>
            )}
            {isDeleted && (
              <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 1.5, color: '#FFFFFF' }}>{t('admin.deleted')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={{ borderWidth: 1, borderColor: tokens.border, marginBottom: 16 }}>
          <InfoRow label={t('admin.userSessions')} value={String(stats.sessionCount)} />
          <InfoRow label={t('admin.userLastSession')} value={stats.lastSessionAt ? formatDateShort(new Date(stats.lastSessionAt)) : t('admin.userNever')} />
          <InfoRow label={t('admin.userAiGens')} value={String(stats.aiGenerationCount)} />
          <InfoRow label="ID" value={u.id.slice(0, 8)} />
          <InfoRow label="Created" value={formatDateShort(new Date(u.createdAt))} />
        </View>

        {/* Quota overrides */}
        <Text style={{ ...labelPreset.sm, color: tokens.textGhost, marginBottom: 8 }}>{t('admin.quotaOverrides')}</Text>
        <View style={{ borderWidth: 1, borderColor: tokens.border, marginBottom: 16 }}>
          <InfoRow label={t('admin.quotaUnlimited')} value={(u.aiQuotaOverrides as any)?.unlimited ? 'Oui' : 'Non'} />
        </View>
        <TouchableOpacity
          onPress={() => {
            setQuotaUnlimited((u.aiQuotaOverrides as any)?.unlimited ?? false)
            setQuotaReason('')
            setQuotaSheet(true)
          }}
          style={{ marginBottom: 24 }}
        >
          <Text style={{ fontFamily: fonts.sansM, fontSize: 13, color: tokens.accent }}>{t('admin.quotaEdit')}</Text>
        </TouchableOpacity>

        {/* Quick actions */}
        <Text style={{ ...labelPreset.sm, color: tokens.textGhost, marginBottom: 8 }}>RESETS</Text>
        <View style={{ borderWidth: 1, borderColor: tokens.border, marginBottom: 24 }}>
          <ResetButton
            label={t('admin.resetDietCredits')}
            onPress={() => resetDietCreditsMut.mutate({ userId: id! })}
            loading={resetDietCreditsMut.isPending}
          />
        </View>

        {/* Actions */}
        <Text style={{ ...labelPreset.sm, color: tokens.accent, marginBottom: 8 }}>ACTIONS</Text>
        {isDeleted ? (
          <Button label={t('admin.restore')} variant="outline" onPress={() => { setRestoreEmail(''); setRestoreSheet(true) }} />
        ) : (
          <Button label={t('admin.softDelete')} variant="danger" onPress={() => { setDeleteReason(''); setDeleteSheet(true) }} />
        )}
      </ScrollView>

      {/* Delete sheet */}
      <BottomSheetShell open={deleteSheet} onClose={() => setDeleteSheet(false)} title={t('admin.softDelete')}>
        <View style={{ padding: 16, gap: 16 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>{t('admin.softDeleteReason')}</Text>
          <TextInput
            value={deleteReason}
            onChangeText={setDeleteReason}
            placeholder="..."
            placeholderTextColor={tokens.textGhost}
            style={{
              borderBottomWidth: 1, borderBottomColor: tokens.border, paddingVertical: 8,
              color: tokens.text, fontFamily: fonts.sans, fontSize: 14,
            }}
            multiline
          />
          <Button
            label={t('admin.softDeleteConfirm')}
            variant="danger"
            loading={softDeleteMut.isPending}
            onPress={() => {
              if (!deleteReason.trim()) return
              softDeleteMut.mutate({ userId: id!, reason: deleteReason.trim() })
            }}
          />
        </View>
      </BottomSheetShell>

      {/* Restore sheet */}
      <BottomSheetShell open={restoreSheet} onClose={() => setRestoreSheet(false)} title={t('admin.restore')}>
        <View style={{ padding: 16, gap: 16 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>{t('admin.restoreEmail')}</Text>
          <TextInput
            value={restoreEmail}
            onChangeText={setRestoreEmail}
            placeholder="email@example.com"
            placeholderTextColor={tokens.textGhost}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              borderBottomWidth: 1, borderBottomColor: tokens.border, paddingVertical: 8,
              color: tokens.text, fontFamily: fonts.sans, fontSize: 14,
            }}
          />
          <Button
            label={t('admin.restore')}
            loading={restoreMut.isPending}
            onPress={() => {
              if (!restoreEmail.trim()) return
              restoreMut.mutate({ userId: id!, newEmail: restoreEmail.trim() })
            }}
          />
        </View>
      </BottomSheetShell>

      {/* Quota sheet */}
      <BottomSheetShell open={quotaSheet} onClose={() => setQuotaSheet(false)} title={t('admin.quotaOverrides')}>
        <View style={{ padding: 16, gap: 16 }}>
          <TouchableOpacity
            onPress={() => setQuotaUnlimited(!quotaUnlimited)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: quotaUnlimited }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View style={{
              width: 18, height: 18, borderWidth: 1,
              borderColor: quotaUnlimited ? tokens.accent : tokens.borderStrong,
              backgroundColor: quotaUnlimited ? tokens.accent : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {quotaUnlimited && <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: fonts.sansB }}>✓</Text>}
            </View>
            <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>{t('admin.quotaUnlimited')}</Text>
          </TouchableOpacity>
          <TextInput
            value={quotaReason}
            onChangeText={setQuotaReason}
            placeholder={t('admin.quotaReason')}
            placeholderTextColor={tokens.textGhost}
            style={{
              borderBottomWidth: 1, borderBottomColor: tokens.border, paddingVertical: 8,
              color: tokens.text, fontFamily: fonts.sans, fontSize: 14,
            }}
          />
          <Button
            label={t('common.save')}
            loading={quotaMut.isPending}
            onPress={() => {
              if (!quotaReason.trim()) return
              quotaMut.mutate({
                userId: id!,
                overrides: { unlimited: quotaUnlimited },
                reason: quotaReason.trim(),
              })
            }}
          />
        </View>
      </BottomSheetShell>
    </SafeAreaView>
  )
}
