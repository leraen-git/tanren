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

export function ExerciseCard({
  name,
  muscleGroups,
  currentVolume,
  previousVolume,
  delta,
  status,
  isPersonalRecord,
  onPress,
}: ExerciseCardProps) {
  const { colors, typography, spacing, radius } = useTheme()

  const deltaColor =
    status === 'improved'
      ? colors.success
      : status === 'declined'
        ? colors.danger
        : colors.warning

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
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: typography.family.semiBold,
              fontSize: typography.size.body,
              color: colors.textPrimary,
            }}
          >
            {name}
          </Text>
          <Text
            style={{
              fontFamily: typography.family.regular,
              fontSize: typography.size.base,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {muscleGroups.join(' · ')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
          {isPersonalRecord && (
            <View
              style={{
                backgroundColor: colors.warning,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xs, color: '#fff' }}>
                ★ PR
              </Text>
            </View>
          )}
          {deltaLabel && (
            <View
              style={{
                backgroundColor: deltaColor + '22',
                borderRadius: radius.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xs, color: deltaColor }}>
                {deltaLabel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Comparison bar */}
      {previousVolume != null && (
        <View style={{ marginTop: spacing.sm, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>
              Prev: {previousVolume.toFixed(0)} kg
            </Text>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.xs, color: deltaColor }}>
              Now: {currentVolume.toFixed(0)} kg
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.surface2, borderRadius: radius.pill, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.min(barWidth, 100)}%`,
                backgroundColor: deltaColor,
                borderRadius: radius.pill,
              }}
            />
          </View>
        </View>
      )}
    </Card>
  )
}
