import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface BarChartProps {
  data: Array<{ label: string; value: number; isCurrent?: boolean }>
  height?: number
}

export const BarChart = React.memo(function BarChart({ data, height = 120 }: BarChartProps) {
  const { tokens, fonts } = useTheme()

  const max = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])

  return (
    <View style={{ height: height + 24 }}>
      <View style={[styles.barRow, { height }]}>
        {data.map((item, i) => {
          const barHeight = Math.max((item.value / max) * height, 2)
          const isActive = item.isCurrent ?? false
          return (
            <View key={i} style={[styles.barCol, { height }]}>
              <View style={styles.barInner}>
                <View
                  style={{ height: barHeight, backgroundColor: isActive ? tokens.accent : tokens.surface2, width: '100%' }}
                  accessibilityLabel={`Week ${item.label}: ${item.value.toFixed(0)} kg`}
                />
              </View>
            </View>
          )
        })}
      </View>
      <View style={[styles.labelRow, { marginTop: 4 }]}>
        {data.map((item, i) => (
          <View key={i} style={styles.labelCol}>
            {i % 4 === 0 && (
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.textMute }}>
                {item.label}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center' },
  barInner: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  labelRow: { flexDirection: 'row', gap: 4 },
  labelCol: { flex: 1, alignItems: 'center' },
})
