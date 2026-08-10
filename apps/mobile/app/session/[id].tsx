import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useIsRestoring } from '@tanstack/react-query'
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

  const isRestoring = useIsRestoring()
  const sessionQuery = trpc.history.detail.useQuery(
    { sessionId: id! },
    { enabled: !!id && !isRestoring },
  )
  const session = sessionQuery.data

  if (!session) {
    const isOffline = !isRestoring && sessionQuery.fetchStatus === 'paused'
    return (
      <Screen showKanji kanjiChar="鍛">
        <ScreenHeader title={t('history.detailTitle')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>
            {isOffline ? t('common.checkConnection') : t('common.loading')}
          </Text>
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
          {(() => {
            const elements: React.ReactNode[] = []
            let i = 0
            while (i < session.exercises.length) {
              const ex = session.exercises[i]!
              const gid = ex.supersetGroupId
              if (gid) {
                const groupStart = i
                while (i < session.exercises.length && session.exercises[i]!.supersetGroupId === gid) i++
                const groupExercises = session.exercises.slice(groupStart, i)
                elements.push(
                  <View key={`group-${gid}`} style={{
                    borderLeftWidth: 3,
                    borderLeftColor: tokens.accent,
                    paddingLeft: 8,
                    marginBottom: 8,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 4,
                    }}>
                      <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 1.2, color: '#FFFFFF', textTransform: 'uppercase' }}>
                          SUPERSET
                        </Text>
                      </View>
                      <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute }}>
                        {groupExercises.map((_, j) => String.fromCharCode(65 + j)).join(' + ')}
                      </Text>
                    </View>
                    {groupExercises.map((gex, j) => (
                      <View key={gex.exerciseId} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
                        <View style={{
                          width: 18, height: 18,
                          backgroundColor: tokens.accent,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 8,
                        }}>
                          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: '#FFFFFF' }}>
                            {String.fromCharCode(65 + j)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <ExerciseBlock exercise={gex} index={groupStart + j} />
                        </View>
                      </View>
                    ))}
                  </View>
                )
              } else {
                elements.push(
                  <ExerciseBlock key={ex.exerciseId} exercise={ex} index={i} />
                )
                i++
              }
            }
            return elements
          })()}
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
