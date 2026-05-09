import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useProfile } from '@/data/useProfile'
import { trpc } from '@/lib/trpc'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SkeletonCard } from '@/components/SkeletonCard'

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-7': 'admin.modelOpus',
  'claude-sonnet-4-6': 'admin.modelSonnet',
  'claude-haiku-4-5-20251001': 'admin.modelHaiku',
}

export default function AdminLLMScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: me, isPending: meLoading } = useProfile()

  const { data: pref, isPending: prefLoading } = trpc.admin.llm.getMyPreference.useQuery(undefined, {
    enabled: me?.role === 'admin',
  })
  const utils = trpc.useUtils()

  const setModel = trpc.admin.llm.setMyPreference.useMutation({
    onSuccess: () => utils.admin.llm.getMyPreference.invalidate(),
  })

  if (meLoading) return null
  if (me?.role !== 'admin') return <Redirect href="/(tabs)/profile" />

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScreenHeader title={t('admin.llmModel')} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, marginBottom: 24, lineHeight: 18 }}>
          {t('admin.modelDescription')}
        </Text>

        {prefLoading ? (
          <SkeletonCard height={180} />
        ) : pref ? (
          <View style={{ gap: 0 }}>
            {(pref.allowed as string[]).map((model) => {
              const isSelected = pref.effective === model
              const isDefault = model === 'claude-sonnet-4-6'
              return (
                <TouchableOpacity
                  key={model}
                  onPress={() => setModel.mutate({ model: isDefault ? null : model as any })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: tokens.border,
                    gap: 12,
                  }}
                >
                  <View style={{
                    width: 18, height: 18, borderWidth: 2,
                    borderColor: isSelected ? tokens.accent : tokens.borderStrong,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <View style={{ width: 8, height: 8, backgroundColor: tokens.accent }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text }}>
                      {t(MODEL_LABELS[model] ?? model)}
                    </Text>
                    {isDefault && (
                      <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, marginTop: 2 }}>
                        ({t('admin.modelDefault')})
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}

            {pref.preferred && (
              <TouchableOpacity
                onPress={() => setModel.mutate({ model: null })}
                style={{ marginTop: 16 }}
              >
                <Text style={{ fontFamily: fonts.sansM, fontSize: 13, color: tokens.accent }}>{t('admin.modelReset')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
