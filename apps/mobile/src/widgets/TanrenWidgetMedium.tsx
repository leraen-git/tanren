import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import type { WidgetColors } from './widgetTheme'
import { fonts } from './widgetTheme'

interface Props {
  colors: WidgetColors
  sessionTitle: string | null
  sessionDayLabel: string | null
  sessionTemplateId?: string | null
  mealSlot: string | null
  mealName: string | null
  mealKcalLabel: string | null
  mealMacrosLabel: string | null
}

export function TanrenWidgetMedium({
  colors,
  sessionTitle,
  sessionDayLabel,
  sessionTemplateId,
  mealSlot,
  mealName,
  mealKcalLabel,
  mealMacrosLabel,
}: Props) {
  const bothEmpty = !sessionTitle && !mealName
  const sessionUri = sessionTemplateId
    ? `tanren://workout/preview?templateId=${sessionTemplateId}`
    : 'tanren://'

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        backgroundGradient: {
          from: colors.surface,
          to: colors.bg,
          orientation: 'TL_BR',
        },
      }}
    >
      {/* Red left edge */}
      <FlexWidget
        style={{
          width: 4,
          height: 'match_parent',
          backgroundColor: bothEmpty ? colors.textGhost : colors.accent,
        }}
      />

      {/* Session zone */}
      <FlexWidget
        style={{ flex: 1, height: 'match_parent' }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: sessionUri }}
      >
        <SessionTileInline colors={colors} title={sessionTitle} dayLabel={sessionDayLabel} />
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{
          width: 1,
          height: 'match_parent',
          backgroundColor: colors.border,
          marginTop: 8,
          marginBottom: 8,
        }}
      />

      {/* Meal zone */}
      <FlexWidget
        style={{ flex: 1, height: 'match_parent' }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'tanren://diet' }}
      >
        <MealTileInline colors={colors} slot={mealSlot} name={mealName} kcalLabel={mealKcalLabel} macrosLabel={mealMacrosLabel} />
      </FlexWidget>
    </FlexWidget>
  )
}

function SessionTileInline({ colors, title, dayLabel }: { colors: WidgetColors; title: string | null; dayLabel: string | null }) {
  const isEmpty = !title

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        paddingLeft: 12,
        paddingRight: 10,
        paddingTop: 12,
        paddingBottom: 12,
        width: 'match_parent',
        height: 'match_parent',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
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

      <FlexWidget style={{ flex: 3 }} />
      {isEmpty ? (
        <TextWidget
          text="Aucune séance planifiée"
          maxLines={2}
          truncate="END"
          style={{ fontFamily: fonts.sansM, fontSize: 15, color: colors.textMute }}
        />
      ) : (
        <TextWidget
          text={title!.toUpperCase()}
          maxLines={3}
          truncate="END"
          style={{
            fontFamily: fonts.sansX,
            fontSize: 24,
            color: colors.text,
            adjustsFontSizeToFit: true,
          }}
        />
      )}
      <FlexWidget style={{ flex: 1 }} />

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
  )
}

function MealTileInline({ colors, slot, name, kcalLabel, macrosLabel }: { colors: WidgetColors; slot: string | null; name: string | null; kcalLabel: string | null; macrosLabel: string | null }) {
  const isEmpty = !name

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        paddingLeft: 10,
        paddingRight: 12,
        paddingTop: 12,
        paddingBottom: 12,
        width: 'match_parent',
        height: 'match_parent',
      }}
    >
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

      <FlexWidget style={{ flex: 3 }} />
      {isEmpty ? (
        <TextWidget
          text="Aucun repas planifié"
          maxLines={2}
          truncate="END"
          style={{ fontFamily: fonts.sansM, fontSize: 15, color: colors.textMute }}
        />
      ) : (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={name!}
            maxLines={2}
            truncate="END"
            style={{
              fontFamily: fonts.sansX,
              fontSize: 24,
              color: colors.text,
              adjustsFontSizeToFit: true,
            }}
          />
          {kcalLabel && (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <TextWidget text="≈ " style={{ fontFamily: fonts.monoB, fontSize: 13, color: colors.accent }} />
              <TextWidget text={kcalLabel} style={{ fontFamily: fonts.monoB, fontSize: 13, color: colors.text }} />
              <TextWidget text=" kcal" style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.textMute }} />
            </FlexWidget>
          )}
        </FlexWidget>
      )}
      <FlexWidget style={{ flex: 1 }} />

      {!isEmpty && macrosLabel ? (
        <TextWidget
          text={macrosLabel}
          style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.textGhost }}
        />
      ) : (
        <FlexWidget style={{ height: 1 }} />
      )}
    </FlexWidget>
  )
}
