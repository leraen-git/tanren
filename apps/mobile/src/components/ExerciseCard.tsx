import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { Card } from './Card'
import type { ExerciseStatus } from '@tanren/shared'

interface ExerciseCardProps {
  name: string
  muscleGroups: string[]
  currentVolume: number
  previousVolume?: number
  delta?: number
  status?: ExerciseStatus
  isPersonalRecord?: boolean
  onPress?: () => void
}

export const ExerciseCard = React.memo(function ExerciseCard({
  name, muscleGroups, currentVolume, previousVolume, delta, status, isPersonalRecord, onPress,
}: ExerciseCardProps) {
  const { tokens, fonts } = useTheme()

  const deltaColor =
    status === 'improved' ? tokens.green
    : status === 'declined' ? tokens.accent
    : tokens.amber

  const deltaLabel =
    delta != null
      ? status === 'improved'
        ? `+${(delta * 100).toFixed(1)}%`
        : status === 'declined'
          ? `${(delta * 100).toFixed(1)}%`
          : '='
      : null

  const barWidth =
    previousVolume != null && previousVolume > 0
      ? Math.min((currentVolume / previousVolume) * 100, 200)
      : 100

  return (
    <Card onPress={onPress} accessibilityLabel={`${name} exercise card`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
            {name}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute, marginTop: 2 }}>
            {muscleGroups.join(' / ')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {isPersonalRecord && (
            <View style={{ borderWidth: 1, borderColor: tokens.accent, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.accent, letterSpacing: 1 }}>PR</Text>
            </View>
          )}
          {deltaLabel && (
            <View style={{ borderWidth: 1, borderColor: deltaColor, backgroundColor: `${deltaColor}1A`, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: deltaColor }}>{deltaLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {previousVolume != null && (
        <View style={{ marginTop: 8, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textMute }}>
              Prev: {previousVolume.toFixed(0)} kg
            </Text>
            <Text style={{ fontFamily: fonts.monoB, fontSize: 10, color: deltaColor }}>
              Now: {currentVolume.toFixed(0)} kg
            </Text>
          </View>
          <View style={{ height: 3, backgroundColor: tokens.surface2, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min(barWidth, 100)}%`, backgroundColor: deltaColor }} />
          </View>
        </View>
      )}
    </Card>
  )
})
