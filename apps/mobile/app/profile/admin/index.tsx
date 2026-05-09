import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useProfile } from '@/data/useProfile'
import { trpc } from '@/lib/trpc'
import { ScreenHeader } from '@/components/ScreenHeader'
import { KanjiWatermark } from '@/components/KanjiWatermark'
import { SkeletonCard } from '@/components/SkeletonCard'

function StatCell({ label, value }: { label: string; value: string | number }) {
  const { tokens, fonts, label: labelPreset } = useTheme()
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, lineHeight: 26, marginBottom: 4 }}>
        {value}
      </Text>
      <Text style={{ ...labelPreset.sm, color: tokens.textMute }}>{label}</Text>
    </View>
  )
}

export default function AdminDashboardScreen() {
  const { tokens, fonts, label: labelPreset } = useTheme()
  const { t } = useTranslation()
  const { data: user, isPending } = useProfile()

  const { data: stats, isPending: statsLoading } = trpc.admin.stats.overview.useQuery(undefined, {
    enabled: user?.role === 'admin',
  })

  if (isPending) return null
  if (user?.role !== 'admin') return <Redirect href="/(tabs)/profile" />

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <KanjiWatermark char="鍛" />
      <ScreenHeader title={t('admin.dashboard')} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {statsLoading ? (
          <SkeletonCard height={160} />
        ) : stats ? (
          <>
            <View style={{ borderWidth: 1, borderColor: tokens.border, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: tokens.border }}>
                <StatCell label={t('admin.totalUsers')} value={stats.users.total} />
                <View style={{ width: 1, backgroundColor: tokens.border }} />
                <StatCell label={t('admin.active7d')} value={stats.users.active7d} />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <StatCell label={t('admin.active30d')} value={stats.users.active30d} />
                <View style={{ width: 1, backgroundColor: tokens.border }} />
                <StatCell label={t('admin.newSignups7d')} value={stats.users.newSignups7d} />
              </View>
            </View>

            <View style={{ borderWidth: 1, borderColor: tokens.border, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row' }}>
                <StatCell label={t('admin.sessions24h')} value={stats.sessions.last24h} />
                <View style={{ width: 1, backgroundColor: tokens.border }} />
                <StatCell label={t('admin.sessions7d')} value={stats.sessions.last7d} />
              </View>
            </View>
          </>
        ) : null}

        <Text style={{ ...labelPreset.sm, color: tokens.textGhost, marginBottom: 8 }}>
          ACTIONS
        </Text>

        {[
          { label: t('admin.users'), route: '/profile/admin/users' as const },
          { label: t('admin.llmModel'), route: '/profile/admin/llm' as const },
          { label: t('admin.auditLog'), route: '/profile/admin/audit' as const },
        ].map((item) => (
          <TouchableOpacity
            key={item.route}
            onPress={() => router.push(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
            }}
          >
            <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>{item.label}</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
