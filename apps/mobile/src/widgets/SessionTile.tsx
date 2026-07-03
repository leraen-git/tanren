import React from 'react'
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget'
import type { WidgetColors } from './widgetTheme'
import { fonts } from './widgetTheme'
import { forgeMarkSvg } from './ForgeMark'

interface SessionTileProps {
  colors: WidgetColors
  title: string | null
  dayLabel: string | null
}

export function SessionTile({ colors, title, dayLabel }: SessionTileProps) {
  const isEmpty = !title

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'row',
        height: 'match_parent',
        width: 'match_parent',
      }}
    >
      <FlexWidget
        style={{
          width: 4,
          height: 'match_parent',
          backgroundColor: isEmpty ? colors.textGhost : colors.accent,
        }}
      />

      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          paddingLeft: 10,
          paddingRight: 12,
          paddingTop: 12,
          paddingBottom: 12,
          height: 'match_parent',
        }}
      >
        {/* Head — label + forge mark */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isEmpty && (
            <SvgWidget
              svg={forgeMarkSvg(colors.text, colors.accent, 40)}
              style={{ width: 18, height: 18, marginRight: 6 }}
            />
          )}
          <TextWidget
            text="SÉANCE"
            style={{
              fontFamily: fonts.sansM,
              fontSize: 11,
              letterSpacing: 2.5,
              color: colors.textMute,
            }}
          />
        </FlexWidget>

        {/* Body — centered via flex spacers */}
        <FlexWidget style={{ flex: 1 }} />
        {isEmpty ? (
          <TextWidget
            text="Aucune séance planifiée"
            maxLines={2}
            truncate="END"
            style={{
              fontFamily: fonts.sansM,
              fontSize: 17,
              color: colors.textMute,
            }}
          />
        ) : (
          <TextWidget
            text={title!.toUpperCase()}
            maxLines={3}
            truncate="END"
            style={{
              fontFamily: fonts.sansX,
              fontSize: 28,
              color: colors.text,
            }}
          />
        )}
        <FlexWidget style={{ flex: 1 }} />

        {/* Foot — day label */}
        {!isEmpty && dayLabel ? (
          <TextWidget
            text={dayLabel.toUpperCase()}
            style={{
              fontFamily: fonts.sansM,
              fontSize: 10,
              letterSpacing: 2,
              color: colors.textMute,
            }}
          />
        ) : (
          <FlexWidget style={{ height: 1 }} />
        )}
      </FlexWidget>
    </FlexWidget>
  )
}
