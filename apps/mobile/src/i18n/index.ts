import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { fr } from './fr'

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const

// Detect device language using the Intl API (works in Hermes without a native module)
function getDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? 'en'
  } catch {
    return 'en'
  }
}

const supportedLocale = getDeviceLocale().startsWith('fr') ? 'fr' : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: supportedLocale,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React Native handles escaping
    },
  })

export default i18n
export type { Translations } from './en'
