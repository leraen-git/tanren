import React from 'react'
import { FlexWidget } from 'react-native-android-widget'
import type { WidgetColors } from './widgetTheme'
import { SessionTile } from './SessionTile'

interface Props {
  colors: WidgetColors
  title: string | null
  dayLabel: string | null
  templateId?: string | null
}

export function TanrenWidgetSmallSession({ colors, title, dayLabel, templateId }: Props) {
  const uri = templateId
    ? `tanren://workout/preview?templateId=${templateId}`
    : 'tanren://'

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
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
    >
      <SessionTile colors={colors} title={title} dayLabel={dayLabel} />
    </FlexWidget>
  )
}
