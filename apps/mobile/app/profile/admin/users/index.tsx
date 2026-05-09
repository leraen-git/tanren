import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useProfile } from '@/data/useProfile'
import { trpc } from '@/lib/trpc'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SkeletonCard } from '@/components/SkeletonCard'
import { formatDateShort } from '@/utils/format'

export default function AdminUsersScreen() {
  const { tokens, fonts, label: labelPreset } = useTheme()
  const { t } = useTranslation()
  const { data: me, isPending: meLoading } = useProfile()
  const [search, setSearch] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  const listQuery = trpc.admin.users.list.useQuery(
    { limit: 50, includeDeleted },
    { enabled: me?.role === 'admin' && !search },
  )

  const searchQuery = trpc.admin.users.search.useQuery(
    { query: search },
    { enabled: me?.role === 'admin' && search.length >= 2 },
  )

  if (meLoading) return null
  if (me?.role !== 'admin') return <Redirect href="/(tabs)/profile" />

  const users = search.length >= 2 ? searchQuery.data ?? [] : listQuery.data?.items ?? []
  const loading = search.length >= 2 ? searchQuery.isPending : listQuery.isPending

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScreenHeader title={t('admin.users')} />

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('admin.searchPlaceholder')}
          placeholderTextColor={tokens.textGhost}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
            paddingVertical: 10,
            color: tokens.text,
            fontFamily: fonts.sans,
            fontSize: 14,
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setIncludeDeleted(!includeDeleted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: includeDeleted }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}
        >
          <View style={{
            width: 16, height: 16, borderWidth: 1,
            borderColor: includeDeleted ? tokens.accent : tokens.borderStrong,
            backgroundColor: includeDeleted ? tokens.accent : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {includeDeleted && <Text style={{ color: '#FFFFFF', fontSize: 10, fontFamily: fonts.sansB }}>✓</Text>}
          </View>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>{t('admin.includeDeleted')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16 }}><SkeletonCard height={200} /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute, textAlign: 'center', marginTop: 40 }}>
              {t('admin.noUsers')}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/profile/admin/users/${item.id}`)}
              accessibilityRole="button"
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>{item.name}</Text>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>{item.email}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.role === 'admin' && (
                    <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 1.5, color: '#FFFFFF' }}>ADMIN</Text>
                    </View>
                  )}
                  {item.deletedAt && (
                    <View style={{ backgroundColor: tokens.surface2, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 1.5, color: tokens.textMute }}>{t('admin.deleted')}</Text>
                    </View>
                  )}
                  <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>›</Text>
                </View>
              </View>
              <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, marginTop: 4 }}>
                {item.authProvider} · {formatDateShort(new Date(item.createdAt))}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}
