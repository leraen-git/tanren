import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { WIDGET_PAYLOAD_KEY, type AndroidWidgetPayload } from './widgetPayload'
import { renderWidgetByName } from './renderWidget'

function readPayload(): AndroidWidgetPayload | null {
  try {
    const { createMMKV } = require('react-native-mmkv')
    const store = createMMKV({ id: 'tanren-default' })
    const raw = store.getString(WIDGET_PAYLOAD_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AndroidWidgetPayload
  } catch {
    return null
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget } = props

  if (widgetAction === 'WIDGET_DELETED') return

  const payload = readPayload()
  const result = renderWidgetByName(widgetInfo.widgetName, payload)
  if (result) renderWidget(result)
}
