import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useInvalidateDiet } from '@/lib/invalidation'
import { useTranslation } from 'react-i18next'

type RegenMode = 'same' | 'edit'

export default function RegeneratePlanScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const [mode, setMode] = useState<RegenMode>('same')
  const invalidateDiet = useInvalidateDiet()

  const { data: plan } = trpc.diet.getMyPlanV2.useQuery()
  const { data: credits } = trpc.diet.getRegenCredits.useQuery()

  const remaining = credits?.remaining ?? 0
  const total = credits?.total ?? 2
  const resetLabel = credits?.resetDateLabel ?? ''

  const deletePlan = trpc.diet.deletePlanV2.useMutation({
    onSuccess: () => {
      invalidateDiet()
      router.replace('/diet')
    },
  })

  const regenerate = trpc.diet.regeneratePlanV2.useMutation({
    onSuccess: () => {
      invalidateDiet()
      router.replace('/diet')
    },
    onError: (err) => {
      Alert.alert(t('intakeV2.genError'), err.message)
    },
  })

  const planData = plan as any

  const createdDate = planData?.createdAt
    ? new Date(planData.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : ''
  const daysActive = planData?.createdAt
    ? Math.max(1, Math.floor((Date.now() - new Date(planData.createdAt).getTime()) / 86400000))
    : 0

  function handleRegenerate() {
    if (remaining <= 0) {
      Alert.alert(t('diet.regenNoCredits'))
      return
    }
    if (mode === 'edit') {
      router.push('/diet/intake-v2/stats')
      return
    }
    regenerate.mutate({ useNewIntake: false })
  }

  function handleDelete() {
    Alert.alert(
      t('diet.regenDelete'),
      t('diet.regenDeleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: () => deletePlan.mutate() },
      ],
    )
  }

  return (
    <Screen showKanji kanjiChar="錬">
      <ScreenHeader title={t('diet.regenTitle')} showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {/* Current plan info */}
        <View style={{ paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 2.8, color: tokens.textMute, textTransform: 'uppercase', marginBottom: 4 }}>
            {t('diet.regenCurrent')}
          </Text>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
            {planData?.goal === 'FAT_LOSS' ? 'Perte de gras' :
             planData?.goal === 'MUSCLE_GAIN' ? 'Prise de muscle' :
             planData?.goal === 'RECOMPOSITION' ? 'Recomposition' : 'Performance'}
            {planData?.targetKcal ? ` · ${planData.targetKcal} kcal` : ''}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute, letterSpacing: 0.8 }}>
            {t('diet.regenGeneratedOn')} {createdDate} · {daysActive} {t('diet.regenDaysActive')}
          </Text>
        </View>

        {/* Regen section */}
        <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 3, color: tokens.textMute, textTransform: 'uppercase' }}>
          {t('diet.regenSection')}
        </Text>

        {/* Credit counter */}
        <View style={{ borderWidth: 1, borderColor: tokens.border, borderTopWidth: 3, borderTopColor: tokens.accent, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 2.8, color: tokens.textMute, textTransform: 'uppercase' }}>
              {t('diet.regenCreditsLabel')}
            </Text>
            <Text style={{ fontFamily: fonts.monoB, fontSize: 24 }}>
              <Text style={{ color: remaining > 0 ? tokens.text : tokens.accent }}>{remaining}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 14, color: tokens.textMute }}> / {total}</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 2, height: 4 }}>
            {Array.from({ length: total }).map((_, i) => (
              <View key={i} style={{
                flex: 1, height: 4,
                backgroundColor: i < (total - remaining) ? tokens.accent : tokens.surface2,
              }} />
            ))}
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute, letterSpacing: 0.8 }}>
            {t('diet.regenReset')} <Text style={{ fontFamily: fonts.monoB, color: tokens.text }}>{resetLabel}</Text>
          </Text>
        </View>

        {/* Info box */}
        <View style={{ padding: 12, borderWidth: 1, borderColor: tokens.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ fontFamily: 'NotoSerifJP_900Black_subset', fontSize: 18, color: tokens.accent, lineHeight: 22 }}>
              鍛
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', color: tokens.text, marginBottom: 4 }}>
                {t('diet.regenWhy')}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute, lineHeight: 16 }}>
                {t('diet.regenWhyDesc')}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 3, color: tokens.textMute, textTransform: 'uppercase' }}>
          {t('diet.regenActions')}
        </Text>

        <TouchableOpacity
          onPress={() => setMode('same')}
          style={{
            padding: 14, borderWidth: 1,
            borderColor: mode === 'same' ? tokens.accent : tokens.border,
            backgroundColor: mode === 'same' ? `${tokens.accent}10` : 'transparent',
            flexDirection: 'row', alignItems: 'center',
          }}
          accessibilityRole="radio" accessibilityState={{ selected: mode === 'same' }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
              {t('diet.regenSame')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
              {t('diet.regenSameDesc')}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.monoB, fontSize: 11, color: tokens.accent }}>-1</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('edit')}
          style={{
            padding: 14, borderWidth: 1,
            borderColor: mode === 'edit' ? tokens.accent : tokens.border,
            backgroundColor: mode === 'edit' ? `${tokens.accent}10` : 'transparent',
            flexDirection: 'row', alignItems: 'center',
          }}
          accessibilityRole="radio" accessibilityState={{ selected: mode === 'edit' }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
              {t('diet.regenEdit')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
              {t('diet.regenEditDesc')}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.monoB, fontSize: 11, color: tokens.accent }}>-1</Text>
        </TouchableOpacity>

        <Button
          label={t('diet.regenCta')}
          onPress={handleRegenerate}
          loading={regenerate.isPending}
          disabled={remaining <= 0}
        />
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, textAlign: 'center' }}>
          {t('diet.regenCtaMeta')}
        </Text>

        {/* Delete */}
        <View style={{ paddingTop: 8 }}>
          <Button
            label={t('diet.regenDelete')}
            variant="ghost"
            onPress={handleDelete}
            loading={deletePlan.isPending}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}
