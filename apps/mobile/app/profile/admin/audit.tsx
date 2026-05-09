import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useProfile } from '@/data/useProfile'
import { trpc } from '@/lib/trpc'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SkeletonCard } from '@/components/SkeletonCard'
import { KanjiWatermark } from '@/components/KanjiWatermark'
import { formatDateShort } from '@/utils/format'
import { FiltersRow } from '@/components/FiltersRow'

const ACTION_FILTERS = [
  { value: '', label: '' },
  { value: 'user', label: '' },
  { value: 'llm', label: '' },
  { value: 'flag', label: '' },
] as const

const ACTION_LABELS: Record<string, string> = {
  role_changed: 'Role changed',
  user_soft_deleted: 'User deleted',
  user_restored: 'User restored',
  ai_quota_overridden: 'Quota override',
  ai_quota_reset: 'Quota reset',
  feature_flag_overridden: 'Flag override',
  llm_model_changed: 'LLM model',
  bootstrap: 'Bootstrap',
}

const FILTER_ACTIONS: Record<string, string[]> = {
  '': [],
  user: ['role_changed', 'user_soft_deleted', 'user_restored', 'ai_quota_overridden', 'ai_quota_reset'],
  llm: ['llm_model_changed'],
  flag: ['feature_flag_overridden'],
}

export default function AdminAuditScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: me, isPending: meLoading } = useProfile()
  const [filter, setFilter] = useState('')

  const filterOptions = ACTION_FILTERS.map((f) => ({
    value: f.value,
    label: f.value === '' ? t('admin.auditAll')
      : f.value === 'user' ? t('admin.auditUsers')
      : f.value === 'llm' ? t('admin.auditLlm')
      : t('admin.auditFlags'),
  }))

  const { data, isPending } = trpc.admin.audit.list.useQuery(
    { limit: 100 },
    { enabled: me?.role === 'admin' },
  )

  if (meLoading) return null
  if (me?.role !== 'admin') return <Redirect href="/(tabs)/profile" />

  const items = data?.items ?? []
  const filtered = filter
    ? items.filter((i) => FILTER_ACTIONS[filter]?.includes(i.action))
    : items

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <KanjiWatermark char="錬" />
      <ScreenHeader title={t('admin.auditLog')} />

      <View style={{ marginBottom: 8 }}>
        <FiltersRow options={filterOptions} value={filter} onChange={setFilter} />
      </View>

      {isPending ? (
        <View style={{ paddingHorizontal: 16 }}><SkeletonCard height={300} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center', marginTop: 40 }}>
              {t('admin.noAuditEntries')}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{
              paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tokens.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: tokens.surface2, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1, color: tokens.textMute, textTransform: 'uppercase' }}>
                    {ACTION_LABELS[item.action] ?? item.action}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost }}>
                  {formatDateShort(new Date(item.createdAt))}
                </Text>
              </View>
              {item.targetUserId && (
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute, marginTop: 4 }}>
                  Target: {item.targetUserId.slice(0, 8)}
                </Text>
              )}
              {item.payload && Object.keys(item.payload).length > 0 && (
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textGhost, marginTop: 4 }} numberOfLines={2}>
                  {JSON.stringify(item.payload)}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}
