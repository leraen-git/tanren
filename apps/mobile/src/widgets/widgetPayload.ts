export const WIDGET_PAYLOAD_KEY = 'tanren-widget-payload-v1'

export const WIDGET_SESSION = 'TanrenSession'
export const WIDGET_MEAL = 'TanrenMeal'
export const WIDGET_MEDIUM = 'TanrenMedium'

export type AndroidWidgetPayload = {
  session: {
    title: string
    dayLabel: string
    templateId: string | null
  } | null
  meal: {
    slot: string
    name: string
    kcalLabel: string
    macrosLabel: string
  } | null
  updatedAt: string
}
