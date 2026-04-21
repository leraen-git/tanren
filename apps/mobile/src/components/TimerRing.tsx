import React from 'react'
import { View, Text } from 'react-native'
import { Canvas, Path, Skia } from '@shopify/react-native-skia'
import { useTheme } from '@/theme/ThemeContext'

interface TimerRingProps {
  progress: number
  secondsRemaining: number
  totalSeconds: number
  size?: number
}

export const TimerRing = React.memo(function TimerRing({ progress, secondsRemaining, totalSeconds, size = 240 }: TimerRingProps) {
  const { tokens, fonts } = useTheme()

  const strokeWidth = 6
  const center = size / 2
  const radius = center - strokeWidth / 2

  const mins = Math.floor(secondsRemaining / 60)
  const secs = secondsRemaining % 60
  const timeLabel = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const totalMins = Math.floor(totalSeconds / 60)
  const totalSecs = totalSeconds % 60
  const totalLabel = `/ ${String(totalMins).padStart(2, '0')}:${String(totalSecs).padStart(2, '0')}`

  const path = Skia.Path.Make()
  path.addArc(
    { x: strokeWidth / 2, y: strokeWidth / 2, width: size - strokeWidth, height: size - strokeWidth },
    -90,
    360 * progress,
  )

  const trackPath = Skia.Path.Make()
  trackPath.addArc(
    { x: strokeWidth / 2, y: strokeWidth / 2, width: size - strokeWidth, height: size - strokeWidth },
    -90,
    360,
  )

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ width: size, height: size, position: 'absolute' }}>
        <Path
          path={trackPath}
          color={tokens.surface2}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="butt"
        />
        <Path
          path={path}
          color={tokens.accent}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="butt"
        />
      </Canvas>

      <Text
        style={{ fontFamily: fonts.monoB, fontSize: 56, color: tokens.text }}
        accessibilityLabel={`Rest timer: ${timeLabel}`}
      >
        {timeLabel}
      </Text>
      <Text style={{ fontFamily: fonts.mono, fontSize: 14, color: tokens.textMute }}>
        {totalLabel}
      </Text>
    </View>
  )
})
