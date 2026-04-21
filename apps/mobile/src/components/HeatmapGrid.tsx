import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'

const CELL_SIZE = 14
const CELL_GAP = 3
const HEATMAP = tokenColors.heatmap

interface HeatmapGridProps {
  data: Array<{ date: Date; value: number }>
  weeks?: number
}

function getIntensityColor(value: number, max: number): string {
  if (value === 0) return HEATMAP[0]
  const ratio = value / max
  if (ratio < 0.25) return HEATMAP[1]
  if (ratio < 0.5) return HEATMAP[2]
  if (ratio < 0.75) return HEATMAP[3]
  return HEATMAP[4]
}

export const HeatmapGrid = React.memo(function HeatmapGrid({ data, weeks = 16 }: HeatmapGridProps) {
  const { tokens, fonts } = useTheme()

  const { grid, maxValue } = useMemo(() => {
    const dataMap = new Map<string, number>()
    let max = 1

    for (const entry of data) {
      const key = entry.date.toISOString().slice(0, 10)
      const val = (dataMap.get(key) ?? 0) + entry.value
      dataMap.set(key, val)
      if (val > max) max = val
    }

    const today = new Date()
    const result: Array<Array<{ date: Date; value: number }>> = []

    for (let w = weeks - 1; w >= 0; w--) {
      const col: Array<{ date: Date; value: number }> = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(today)
        date.setDate(today.getDate() - w * 7 - (6 - d))
        const key = date.toISOString().slice(0, 10)
        col.push({ date, value: dataMap.get(key) ?? 0 })
      }
      result.push(col)
    }

    return { grid: result, maxValue: max }
  }, [data, weeks])

  return (
    <View>
      <View style={[styles.gridRow, { gap: CELL_GAP }]}>
        {grid.map((col, wi) => (
          <View key={wi} style={[styles.gridCol, { gap: CELL_GAP }]}>
            {col.map((cell, di) => (
              <View
                key={di}
                style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: getIntensityColor(cell.value, maxValue) }}
                accessibilityLabel={`${cell.date.toLocaleDateString()}: ${cell.value.toFixed(0)} kg volume`}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={[styles.legend, { gap: 4, marginTop: 6 }]}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.textMute }}>Less</Text>
        {HEATMAP.map((c, i) => (
          <View key={i} style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: c }} />
        ))}
        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.textMute }}>More</Text>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  gridRow: { flexDirection: 'row' },
  gridCol: { flexDirection: 'column' },
  legend: { flexDirection: 'row', alignItems: 'center' },
})
