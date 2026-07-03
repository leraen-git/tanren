import React from 'react'
import type { WidgetRepresentation } from 'react-native-android-widget'
import { darkColors, lightColors } from './widgetTheme'
import { TanrenWidgetSmallSession } from './TanrenWidgetSmallSession'
import { TanrenWidgetSmallMeal } from './TanrenWidgetSmallMeal'
import { TanrenWidgetMedium } from './TanrenWidgetMedium'
import { WIDGET_SESSION, WIDGET_MEAL, WIDGET_MEDIUM, type AndroidWidgetPayload } from './widgetPayload'

export function renderWidgetByName(
  widgetName: string,
  payload: AndroidWidgetPayload | null,
): WidgetRepresentation | null {
  const session = payload?.session ?? null
  const meal = payload?.meal ?? null
  const tid = session?.templateId ?? null

  switch (widgetName) {
    case WIDGET_SESSION:
      return {
        light: (
          <TanrenWidgetSmallSession
            colors={lightColors}
            title={session?.title ?? null}
            dayLabel={session?.dayLabel ?? null}
            templateId={tid}
          />
        ),
        dark: (
          <TanrenWidgetSmallSession
            colors={darkColors}
            title={session?.title ?? null}
            dayLabel={session?.dayLabel ?? null}
            templateId={tid}
          />
        ),
      }

    case WIDGET_MEAL:
      return {
        light: (
          <TanrenWidgetSmallMeal
            colors={lightColors}
            slot={meal?.slot ?? null}
            name={meal?.name ?? null}
            kcalLabel={meal?.kcalLabel ?? null}
            macrosLabel={meal?.macrosLabel ?? null}
          />
        ),
        dark: (
          <TanrenWidgetSmallMeal
            colors={darkColors}
            slot={meal?.slot ?? null}
            name={meal?.name ?? null}
            kcalLabel={meal?.kcalLabel ?? null}
            macrosLabel={meal?.macrosLabel ?? null}
          />
        ),
      }

    case WIDGET_MEDIUM:
      return {
        light: (
          <TanrenWidgetMedium
            colors={lightColors}
            sessionTitle={session?.title ?? null}
            sessionDayLabel={session?.dayLabel ?? null}
            sessionTemplateId={tid}
            mealSlot={meal?.slot ?? null}
            mealName={meal?.name ?? null}
            mealKcalLabel={meal?.kcalLabel ?? null}
            mealMacrosLabel={meal?.macrosLabel ?? null}
          />
        ),
        dark: (
          <TanrenWidgetMedium
            colors={darkColors}
            sessionTitle={session?.title ?? null}
            sessionDayLabel={session?.dayLabel ?? null}
            sessionTemplateId={tid}
            mealSlot={meal?.slot ?? null}
            mealName={meal?.name ?? null}
            mealKcalLabel={meal?.kcalLabel ?? null}
            mealMacrosLabel={meal?.macrosLabel ?? null}
          />
        ),
      }

    default:
      return null
  }
}
