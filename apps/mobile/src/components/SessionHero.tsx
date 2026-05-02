import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { CornerAccent } from './CornerAccent'
import { formatVolume, formatDuration, formatDateLong, formatTime } from '@/utils/format'
import { translateMuscleGroup } from '@/hooks/useExercises'
import type { SessionDetail } from '@tanren/shared'

interface SessionHeroProps {
  session: SessionDetail
}

export const SessionHero = React.memo(function SessionHero({ session }: SessionHeroProps) {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  const date = new Date(session.startedAt)
  const dateStr = formatDateLong(date)
  const timeStr = formatTime(date)

  const stats = [
    { label: t('history.detailDuration'), value: session.durationSeconds ? formatDuration(session.durationSeconds) : '--' },
    { label: t('history.detailVolume'), value: session.totalVolume ? formatVolume(session.totalVolume) : '--' },
    { label: t('history.detailSeries'), value: String(session.seriesCount) },
  ]

  return (
    <View style={{ borderWidth: 1, borderColor: tokens.accent, overflow: 'hidden' }}>
      <CornerAccent position="tl" size="md" />
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{
          fontFamily: fonts.jpX,
          fontSize: 10,
          letterSpacing: 4,
          color: tokens.accent,
        }}>
          鍛 錬
        </Text>
        <Text style={{
          fontFamily: fonts.sansX,
          fontSize: 24,
          color: tokens.text,
          textTransform: 'uppercase',
        }}>
          {session.workoutName}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>
          {dateStr} · {timeStr}
        </Text>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', marginTop: 8, borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 12 }}>
          {stats.map((s, i) => (
            <View key={s.label} style={{
              flex: 1,
              alignItems: 'center',
              borderLeftWidth: i > 0 ? 1 : 0,
              borderLeftColor: tokens.border,
            }}>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text }}>{s.value}</Text>
              <Text style={{ ...label.sm, color: tokens.textMute,
                marginTop: 2 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Muscle chips */}
        {session.muscleGroups.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {session.muscleGroups.map((mg) => (
              <View key={mg} style={{
                borderWidth: 1,
                borderColor: tokens.border,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 9,
                  letterSpacing: 1.2,
                  color: tokens.textMute,
                  textTransform: 'uppercase',
                }}>
                  {translateMuscleGroup(mg, t)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
})
