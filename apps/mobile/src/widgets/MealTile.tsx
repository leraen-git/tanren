import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import type { WidgetColors } from './widgetTheme'
import { fonts } from './widgetTheme'

interface MealTileProps {
  colors: WidgetColors
  slot: string | null
  name: string | null
  kcalLabel: string | null
  macrosLabel: string | null
}

export function MealTile({ colors, slot, name, kcalLabel, macrosLabel }: MealTileProps) {
  const isEmpty = !name

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
        {/* Head — meal type + amber dot */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!isEmpty && (
            <FlexWidget
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: colors.amber,
                marginRight: 6,
              }}
            />
          )}
          <TextWidget
            text={(slot ?? 'REPAS').toUpperCase()}
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
            text="Aucun repas planifié"
            maxLines={2}
            truncate="END"
            style={{
              fontFamily: fonts.sansM,
              fontSize: 17,
              color: colors.textMute,
            }}
          />
        ) : (
          <FlexWidget style={{ flexDirection: 'column' }}>
            <TextWidget
              text={name!}
              maxLines={2}
              truncate="END"
              style={{
                fontFamily: fonts.sansX,
                fontSize: 26,
                color: colors.text,
                adjustsFontSizeToFit: true,
              }}
            />
            {kcalLabel && (
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <TextWidget
                  text="≈ "
                  style={{ fontFamily: fonts.monoB, fontSize: 14, color: colors.accent }}
                />
                <TextWidget
                  text={kcalLabel}
                  style={{ fontFamily: fonts.monoB, fontSize: 14, color: colors.text }}
                />
                <TextWidget
                  text=" kcal"
                  style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.textMute }}
                />
              </FlexWidget>
            )}
          </FlexWidget>
        )}
        <FlexWidget style={{ flex: 1 }} />

        {/* Foot — macros */}
        {!isEmpty && macrosLabel ? (
          <TextWidget
            text={macrosLabel}
            style={{
              fontFamily: fonts.mono,
              fontSize: 9,
              color: colors.textGhost,
            }}
          />
        ) : (
          <FlexWidget style={{ height: 1 }} />
        )}
      </FlexWidget>
    </FlexWidget>
  )
}
