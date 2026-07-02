import { requireNativeModule, Platform } from 'expo-modules-core'

const isIOS = Platform.OS === 'ios'

let WidgetBridge: { setWidgetData: (json: string) => void; reloadWidgets: () => void } | null = null
if (isIOS) {
  try {
    WidgetBridge = requireNativeModule('WidgetBridge')
  } catch {}
}

export function setWidgetData(json: string): void {
  WidgetBridge?.setWidgetData(json)
}

export function reloadWidgets(): void {
  WidgetBridge?.reloadWidgets()
}
