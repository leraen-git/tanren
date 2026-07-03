import React from 'react'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { darkColors, lightColors } from './widgetTheme'
import { TanrenWidgetSmallSession } from './TanrenWidgetSmallSession'
import { TanrenWidgetSmallMeal } from './TanrenWidgetSmallMeal'
import { TanrenWidgetMedium } from './TanrenWidgetMedium'

const WIDGET_SESSION = 'TanrenSession'
const WIDGET_MEAL = 'TanrenMeal'
const WIDGET_MEDIUM = 'TanrenMedium'

const PLACEHOLDER_SESSION = {
  title: 'Push A',
  dayLabel: "Aujourd'hui",
}

const PLACEHOLDER_MEAL = {
  slot: 'Déjeuner',
  name: 'Poulet basquaise',
  kcalLabel: '720',
  macrosLabel: 'P 52 · G 68 · L 24 g',
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget } = props

  if (widgetAction === 'WIDGET_DELETED') return

  const name = widgetInfo.widgetName

  switch (name) {
    case WIDGET_SESSION:
      renderWidget({
        light: (
          <TanrenWidgetSmallSession
            colors={lightColors}
            title={PLACEHOLDER_SESSION.title}
            dayLabel={PLACEHOLDER_SESSION.dayLabel}
          />
        ),
        dark: (
          <TanrenWidgetSmallSession
            colors={darkColors}
            title={PLACEHOLDER_SESSION.title}
            dayLabel={PLACEHOLDER_SESSION.dayLabel}
          />
        ),
      })
      break

    case WIDGET_MEAL:
      renderWidget({
        light: (
          <TanrenWidgetSmallMeal
            colors={lightColors}
            slot={PLACEHOLDER_MEAL.slot}
            name={PLACEHOLDER_MEAL.name}
            kcalLabel={PLACEHOLDER_MEAL.kcalLabel}
            macrosLabel={PLACEHOLDER_MEAL.macrosLabel}
          />
        ),
        dark: (
          <TanrenWidgetSmallMeal
            colors={darkColors}
            slot={PLACEHOLDER_MEAL.slot}
            name={PLACEHOLDER_MEAL.name}
            kcalLabel={PLACEHOLDER_MEAL.kcalLabel}
            macrosLabel={PLACEHOLDER_MEAL.macrosLabel}
          />
        ),
      })
      break

    case WIDGET_MEDIUM:
      renderWidget({
        light: (
          <TanrenWidgetMedium
            colors={lightColors}
            sessionTitle={PLACEHOLDER_SESSION.title}
            sessionDayLabel={PLACEHOLDER_SESSION.dayLabel}
            mealSlot={PLACEHOLDER_MEAL.slot}
            mealName={PLACEHOLDER_MEAL.name}
            mealKcalLabel={PLACEHOLDER_MEAL.kcalLabel}
            mealMacrosLabel={PLACEHOLDER_MEAL.macrosLabel}
          />
        ),
        dark: (
          <TanrenWidgetMedium
            colors={darkColors}
            sessionTitle={PLACEHOLDER_SESSION.title}
            sessionDayLabel={PLACEHOLDER_SESSION.dayLabel}
            mealSlot={PLACEHOLDER_MEAL.slot}
            mealName={PLACEHOLDER_MEAL.name}
            mealKcalLabel={PLACEHOLDER_MEAL.kcalLabel}
            mealMacrosLabel={PLACEHOLDER_MEAL.macrosLabel}
          />
        ),
      })
      break
  }
}
