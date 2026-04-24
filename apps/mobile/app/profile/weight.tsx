import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useInvalidateWeight } from '@/lib/invalidation'
import { ScreenHeader } from '@/components/ScreenHeader'
import { WeightHero } from '@/components/profile/WeightHero'
import { PeriodTabs } from '@/components/profile/PeriodTabs'
import { WeightChart } from '@/components/profile/WeightChart'
import { WeightChartStats } from '@/components/profile/WeightChartStats'
import { WeightEntryRow } from '@/components/profile/WeightEntryRow'
import { AddWeightModal } from '@/components/profile/AddWeightModal'
import type { WeightPeriod } from '@tanren/shared'

export default function WeightScreen() {
  const { t } = useTranslation()
  const { tokens, fonts } = useTheme()
  const [period, setPeriod] = useState<WeightPeriod>('30d')
  const [addModalOpen, setAddModalOpen] = useState(false)

  const { data, isLoading } = trpc.weight.list.useQuery({ period })
  const invalidateWeight = useInvalidateWeight()
  const addMutation = trpc.weight.add.useMutation({ onSuccess: invalidateWeight })
  const deleteMutation = trpc.weight.delete.useMutation({ onSuccess: invalidateWeight })

  const entries = data?.entries ?? []
  const stats = data?.stats ?? null

  const handleAdd = (weightKg: number, measuredAt: string) => {
    addMutation.mutate({ weightKg, measuredAt })
  }

  const handleDelete = (id: string) => {
    Alert.alert(
      t('profile.weightDeleteTitle'),
      t('profile.weightDeleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id }),
        },
      ],
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top']}>
      <ScreenHeader
        title={t('profile.weightTitle')}
        right={
          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.addWeightTitle')}
          >
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: tokens.accent,
            }}>
              {t('profile.weightAddCTA')}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        <WeightHero
          currentKg={stats?.current ?? null}
          measuredAt={stats?.currentMeasuredAt ?? null}
          deltaKg={stats?.deltaKg ?? null}
          trendDirection={stats?.trendDirection ?? null}
          period={period}
        />

        <PeriodTabs value={period} onChange={setPeriod} />

        <WeightChart entries={entries} />

        <WeightChartStats
          min={stats?.min ?? null}
          avg={stats?.avg ?? null}
          max={stats?.max ?? null}
        />

        {/* Entry list */}
        {entries.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 24 }}>
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: tokens.textMute,
              marginBottom: 8,
            }}>
              {t('profile.weightHistoryLabel')}
            </Text>
            {entries.map((entry, i) => (
              <WeightEntryRow
                key={entry.id}
                entry={entry}
                previousEntry={entries[i + 1]}
                onLongPress={() => handleDelete(entry.id)}
              />
            ))}
          </View>
        )}

        {!isLoading && entries.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>
              {t('profile.weightEmptyDesc')}
            </Text>
          </View>
        )}
      </ScrollView>

      <AddWeightModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        lastWeightKg={stats?.current ?? null}
        onSave={handleAdd}
      />
    </SafeAreaView>
  )
}
