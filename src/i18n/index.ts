// ═══════════════════════════════════════════════════════
// i18n/index.ts — i18next initialization for BaruPick
// Languages: ko (default), en, ja
// Namespaces: ui, colors, categories, styles, bodyType, personalColor
// ═══════════════════════════════════════════════════════
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Korean
import koUi from './ko/ui.json'
import koColors from './ko/colors.json'
import koCategories from './ko/categories.json'
import koStyles from './ko/styles.json'
import koBodyType from './ko/bodyType.json'
import koPersonalColor from './ko/personalColor.json'

// English
import enUi from './en/ui.json'
import enColors from './en/colors.json'
import enCategories from './en/categories.json'
import enStyles from './en/styles.json'
import enBodyType from './en/bodyType.json'
import enPersonalColor from './en/personalColor.json'

const resources = {
  ko: {
    ui: koUi,
    colors: koColors,
    categories: koCategories,
    styles: koStyles,
    bodyType: koBodyType,
    personalColor: koPersonalColor,
  },
  en: {
    ui: enUi,
    colors: enColors,
    categories: enCategories,
    styles: enStyles,
    bodyType: enBodyType,
    personalColor: enPersonalColor,
  },
}

const storedLang = localStorage.getItem('sp_language')

i18n.use(initReactI18next).init({
  resources,
  lng: storedLang || 'ko',
  fallbackLng: 'ko',
  defaultNS: 'ui',
  ns: ['ui', 'colors', 'categories', 'styles', 'bodyType', 'personalColor'],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  ...(process.env.NODE_ENV === 'development' && {
    saveMissing: true,
    missingKeyHandler: (_lngs: readonly string[], ns: string, key: string) => {
      console.warn(`[i18n] Missing key: ${ns}:${key}`)
    },
  }),
})

/** Maps language code to full locale string */
export function getLocale(lang?: string): string {
  const l = lang || i18n.language || 'ko'
  const map: Record<string, string> = {
    ko: 'ko-KR',
    en: 'en-US',
    ja: 'ja-JP',
  }
  return map[l] || 'ko-KR'
}

export default i18n
