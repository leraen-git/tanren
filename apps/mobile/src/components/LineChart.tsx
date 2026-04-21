import React from 'react'
import { View, Text } from 'react-native'
import { Canvas, Path, Skia } from '@shopify/react-native-skia'
import { useTheme } from '@/theme/ThemeContext'

interface LineChartProps {
  data: Array<{ label: string; value: number }>
  height?: number
  width?: number
  target?: number
}

export function LineChart({ data, height = 160, width = 320, target }: LineChartProps) {
  const { tokens, fonts } = useTheme()

  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: tokens.textMute, fontFamily: fonts.sans, fontSize: 12 }}>
          No data yet
        </Text>
      </View>
    )
  }

  const padX = 8
  const padY = 12
  const chartW = width - padX * 2
  const chartH = height - padY * 2

  const values = data.map((d) => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values, minVal + 1)

  const toX = (i: number) => padX + (i / (data.length - 1)) * chartW
  const toY = (v: number) => padY + chartH - ((v - minVal) / (maxVal - minVal)) * chartH

  const linePath = Skia.Path.Make()
  data.forEach((d, i) => {
    const x = toX(i)
    const y = toY(d.value)
    if (i === 0) linePath.moveTo(x, y)
    else linePath.lineTo(x, y)
  })

  const fillPath = Skia.Path.Make()
  data.forEach((d, i) => {
    const x = toX(i)
    const y = toY(d.value)
    if (i === 0) fillPath.moveTo(x, y)
    else fillPath.lineTo(x, y)
  })
  fillPath.lineTo(toX(data.length - 1), padY + chartH)
  fillPath.lineTo(padX, padY + chartH)
  fillPath.close()

  const targetPath = target != null ? Skia.Path.Make() : null
  if (targetPath && target != null) {
    const ty = toY(target)
    const dashLen = 6
    for (let x = padX; x < padX + chartW; x += dashLen * 2) {
      targetPath.moveTo(x, ty)
      targetPath.lineTo(Math.min(x + dashLen, padX + chartW), ty)
    }
  }

  return (
    <View>
      <Canvas style={{ width, height }}>
        <Path path={fillPath} color={tokens.accent + '22'} style="fill" />
        <Path path={linePath} color={tokens.accent} style="stroke" strokeWidth={2} strokeCap="butt" strokeJoin="miter" />
        {targetPath && (
          <Path path={targetPath} color={tokens.textMute} style="stroke" strokeWidth={1.5} />
        )}
      </Canvas>

      <View style={{ flexDirection: 'row', paddingHorizontal: padX }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 4) === 0) && (
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.textMute }}>
                {d.label}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}
