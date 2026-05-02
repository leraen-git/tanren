import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { trpc } from '@/lib/trpc'
import { Screen } from '@/components/Screen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { SessionHero } from '@/components/SessionHero'
import { PRBanner } from '@/components/PRBanner'
import { ExerciseBlock } from '@/components/ExerciseBlock'

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  const { data: session, isLoading } = trpc.history.detail.useQuery(
    { sessionId: id! },
    { enabled: !!id },
  )

  if (isLoading || !session) {
    return (
      <Screen showKanji kanjiChar="鍛">
        <ScreenHeader title={t('history.detailTitle')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>{t('common.loading')}</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen showKanji kanjiChar="鍛">
      <ScreenHeader title={t('history.detailTitle')} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}>
        <SessionHero session={session} />

        {session.prs.length > 0 && <PRBanner prs={session.prs} />}

        {/* Exercises section */}
        <View>
          <Text style={{ ...label.md, color: tokens.textMute,
            marginBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
            paddingBottom: 6 }}>
            {t('history.detailExercises')}
          </Text>
          {session.exercises.map((ex, i) => (
            <ExerciseBlock key={ex.exerciseId} exercise={ex} index={i} />
          ))}
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => {
              if (session.workoutTemplateId) {
                router.push(`/workout/preview?templateId=${session.workoutTemplateId}`)
              }
            }}
            style={{
              flex: 1,
              height: 48,
              borderWidth: 1,
              borderColor: tokens.border,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            accessibilityLabel={t('history.detailReplay')}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: tokens.text }}>
              {t('history.detailReplay')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/workout/share?sessionId=${session.id}`)}
            style={{
              flex: 1,
              height: 48,
              backgroundColor: tokens.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            accessibilityLabel={t('history.detailShare')}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF' }}>
              {t('history.detailShare')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  )
}
