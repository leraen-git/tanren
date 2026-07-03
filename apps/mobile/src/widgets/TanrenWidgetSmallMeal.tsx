import React from 'react'
import { FlexWidget } from 'react-native-android-widget'
import type { WidgetColors } from './widgetTheme'
import { MealTile } from './MealTile'

interface Props {
  colors: WidgetColors
  slot: string | null
  name: string | null
  kcalLabel: string | null
  macrosLabel: string | null
}

export function TanrenWidgetSmallMeal({ colors, slot, name, kcalLabel, macrosLabel }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: {
          from: colors.surface,
          to: colors.bg,
          orientation: 'TL_BR',
        },
      }}
    >
      <MealTile colors={colors} slot={slot} name={name} kcalLabel={kcalLabel} macrosLabel={macrosLabel} />
    </FlexWidget>
  )
}
