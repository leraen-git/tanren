import React, { useMemo } from 'react'
import { View, Text } from 'react-native'
import Svg, { Path, Circle, Line } from 'react-native-svg'
import { useTheme } from '@/theme/ThemeContext'
import { formatVolume } from '@/utils/format'
import type { WeeklyVolume } from '@tanren/shared'

interface WeeklyVolumeChartProps {
  weeks: WeeklyVolume[]
}

const CHART_HEIGHT = 100
const PADDING_X = 8
const DOT_RADIUS = 3

export const WeeklyVolumeChart = React.memo(function WeeklyVolumeChart({ weeks }: WeeklyVolumeChartProps) {
  const { tokens, fonts } = useTheme()

  const maxVolume = useMemo(() => {
    const vals = weeks.map((w) => w.volume)
    return Math.max(...vals, 1)
  }, [weeks])

  const chartWidth = useMemo(() => {
    const perWeek = weeks.length > 20 ? 8 : weeks.length > 10 ? 16 : 40
    return Math.max(weeks.length * perWeek, 200)
  }, [weeks.length])

  const points = useMemo(() => {
    const usable = chartWidth - PADDING_X * 2
    return weeks.map((w, i) => {
      const x = weeks.length === 1 ? chartWidth / 2 : PADDING_X + (i / (weeks.length - 1)) * usable
      const y = CHART_HEIGHT - 8 - ((w.volume / maxVolume) * (CHART_HEIGHT - 16))
      return { x, y, volume: w.volume }
    })
  }, [weeks, maxVolume, chartWidth])

  const pathD = points.length > 0
    ? 'M' + points.map((p) => `${p.x},${p.y}`).join('L')
    : ''

  const labelInterval = weeks.length > 30 ? 8 : weeks.length > 15 ? 4 : 1

  return (
    <View>
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = CHART_HEIGHT - 8 - ratio * (CHART_HEIGHT - 16)
          return (
            <Line
              key={ratio}
              x1={PADDING_X}
              y1={y}
              x2={chartWidth - PADDING_X}
              y2={y}
              stroke={tokens.border}
              strokeWidth={0.5}
            />
          )
        })}

        {/* Line */}
        <Path
          d={pathD}
          fill="none"
          stroke={tokens.accent}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1
          return (
            <React.Fragment key={i}>
              {isLast && (
                <Circle cx={p.x} cy={p.y} r={DOT_RADIUS + 3} fill={`${tokens.accent}33`} />
              )}
              <Circle
                cx={p.x}
                cy={p.y}
                r={isLast ? DOT_RADIUS + 1 : DOT_RADIUS}
                fill={p.volume > 0 ? tokens.accent : tokens.border}
              />
            </React.Fragment>
          )
        })}
      </Svg>

      {/* Labels */}
      <View style={{ flexDirection: 'row', marginTop: 4, width: chartWidth }}>
        {weeks.map((w, i) => {
          const weeksAgo = weeks.length - i
          const isLast = i === weeks.length - 1
          const show = isLast || weeksAgo % labelInterval === 0
          const usable = chartWidth - PADDING_X * 2
          const x = weeks.length === 1 ? chartWidth / 2 : PADDING_X + (i / (weeks.length - 1)) * usable
          return show ? (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: x - 10,
                width: 20,
                fontFamily: isLast ? fonts.sansX : fonts.sansM,
                fontSize: 8,
                color: isLast ? tokens.accent : tokens.textMute,
                textAlign: 'center',
                letterSpacing: 0.3,
              }}
            >
              {weeksAgo}
            </Text>
          ) : null
        })}
      </View>
    </View>
  )
})
