import React from 'react'
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { TouchableOpacity } from 'react-native'

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  const { data: program, isLoading } = trpc.programs.byId.useQuery({ id })
  const enroll = trpc.programs.enroll.useMutation({
    onSuccess: () => {
      router.push('/')
    },
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.accent} size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel={t('common.back')} accessibilityRole="button">
          <Text style={{ ...label.md, color: tokens.accent }}>
            {'< '}{t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>

        {program && (
          <>
            <View>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
                {program.name}
              </Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute, marginTop: 4 }}>
                {program.description}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.border }}>
              {[
                { label: t('programs.duration'), value: `${program.durationWeeks}${t('weight.period7d').charAt(0)}` },
                { label: t('programs.daysPerWeek'), value: `${program.sessionsPerWeek}${t('days.mon').charAt(0).toLowerCase()}` },
                { label: t('programs.level'), value: t(`difficulty.${program.level}`) },
              ].map((stat, i) => (
                <View key={stat.label} style={{
                  flex: 1,
                  padding: 12,
                  alignItems: 'center',
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: tokens.border,
                }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
                    {stat.label}
                  </Text>
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.accent, marginTop: 2 }}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 12, gap: 6 }}>
              <Text style={{ ...label.sm, color: tokens.textMute }}>
                {t('programs.goal')}
              </Text>
              <View style={{
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: tokens.accent,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {program.goal.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <Text style={{ ...label.md, color: tokens.textMute }}>
              {t('programs.weekOverview')}
            </Text>
            {Array.from({ length: Math.min(program.durationWeeks, 4) }).map((_, wi) => (
              <View key={wi} style={{ borderWidth: 1, borderColor: tokens.border, padding: 12, gap: 6 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
                  {t('programs.week', { n: wi + 1 })}
                </Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textMute }}>
                  {t('programs.sessionsPlanned', { count: program.sessionsPerWeek })}
                </Text>
                <View style={{ height: 3, backgroundColor: tokens.surface2 }}>
                  <View style={{ width: 0, height: 3, backgroundColor: tokens.accent }} />
                </View>
              </View>
            ))}
            {program.durationWeeks > 4 && (
              <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>
                {t('programs.moreWeeks', { count: program.durationWeeks - 4 })}
              </Text>
            )}

            <Button
              label={t('programs.startProgram')}
              onPress={() => enroll.mutate({ programId: program.id })}
              loading={enroll.isPending}
              style={{ marginTop: 4 }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
