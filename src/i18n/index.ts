// ═══════════════════════════════════════════════════════
// i18n/index.ts — i18next initialization for BaruPick
// Languages: ko, en, ja, zh, es, th, vi, id, pt, fr, de
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

// Japanese
import jaUi from './ja/ui.json'
import jaColors from './ja/colors.json'
import jaCategories from './ja/categories.json'
import jaStyles from './ja/styles.json'
import jaBodyType from './ja/bodyType.json'
import jaPersonalColor from './ja/personalColor.json'

// Chinese (Simplified)
import zhUi from './zh/ui.json'
import zhColors from './zh/colors.json'
import zhCategories from './zh/categories.json'
import zhStyles from './zh/styles.json'
import zhBodyType from './zh/bodyType.json'
import zhPersonalColor from './zh/personalColor.json'

// Spanish
import esUi from './es/ui.json'
import esColors from './es/colors.json'
import esCategories from './es/categories.json'
import esStyles from './es/styles.json'
import esBodyType from './es/bodyType.json'
import esPersonalColor from './es/personalColor.json'

// Thai
import thUi from './th/ui.json'
import thColors from './th/colors.json'
import thCategories from './th/categories.json'
import thStyles from './th/styles.json'
import thBodyType from './th/bodyType.json'
import thPersonalColor from './th/personalColor.json'

// Vietnamese
import viUi from './vi/ui.json'
import viColors from './vi/colors.json'
import viCategories from './vi/categories.json'
import viStyles from './vi/styles.json'
import viBodyType from './vi/bodyType.json'
import viPersonalColor from './vi/personalColor.json'

// Indonesian
import idUi from './id/ui.json'
import idColors from './id/colors.json'
import idCategories from './id/categories.json'
import idStyles from './id/styles.json'
import idBodyType from './id/bodyType.json'
import idPersonalColor from './id/personalColor.json'

// Portuguese
import ptUi from './pt/ui.json'
import ptColors from './pt/colors.json'
import ptCategories from './pt/categories.json'
import ptStyles from './pt/styles.json'
import ptBodyType from './pt/bodyType.json'
import ptPersonalColor from './pt/personalColor.json'

// French
import frUi from './fr/ui.json'
import frColors from './fr/colors.json'
import frCategories from './fr/categories.json'
import frStyles from './fr/styles.json'
import frBodyType from './fr/bodyType.json'
import frPersonalColor from './fr/personalColor.json'

// German
import deUi from './de/ui.json'
import deColors from './de/colors.json'
import deCategories from './de/categories.json'
import deStyles from './de/styles.json'
import deBodyType from './de/bodyType.json'
import dePersonalColor from './de/personalColor.json'

const resources = {
  ko: { ui: koUi, colors: koColors, categories: koCategories, styles: koStyles, bodyType: koBodyType, personalColor: koPersonalColor },
  en: { ui: enUi, colors: enColors, categories: enCategories, styles: enStyles, bodyType: enBodyType, personalColor: enPersonalColor },
  ja: { ui: jaUi, colors: jaColors, categories: jaCategories, styles: jaStyles, bodyType: jaBodyType, personalColor: jaPersonalColor },
  zh: { ui: zhUi, colors: zhColors, categories: zhCategories, styles: zhStyles, bodyType: zhBodyType, personalColor: zhPersonalColor },
  es: { ui: esUi, colors: esColors, categories: esCategories, styles: esStyles, bodyType: esBodyType, personalColor: esPersonalColor },
  th: { ui: thUi, colors: thColors, categories: thCategories, styles: thStyles, bodyType: thBodyType, personalColor: thPersonalColor },
  vi: { ui: viUi, colors: viColors, categories: viCategories, styles: viStyles, bodyType: viBodyType, personalColor: viPersonalColor },
  id: { ui: idUi, colors: idColors, categories: idCategories, styles: idStyles, bodyType: idBodyType, personalColor: idPersonalColor },
  pt: { ui: ptUi, colors: ptColors, categories: ptCategories, styles: ptStyles, bodyType: ptBodyType, personalColor: ptPersonalColor },
  fr: { ui: frUi, colors: frColors, categories: frCategories, styles: frStyles, bodyType: frBodyType, personalColor: frPersonalColor },
  de: { ui: deUi, colors: deColors, categories: deCategories, styles: deStyles, bodyType: deBodyType, personalColor: dePersonalColor },
}

const storedLang = localStorage.getItem('sp_language')

// Auto-detect Korean browsers: set Korean without showing language selection
if (!storedLang && navigator.language.startsWith('ko')) {
  localStorage.setItem('sp_language', 'ko')
}

const initialLang = localStorage.getItem('sp_language')

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang || 'ko',
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
    zh: 'zh-CN',
    es: 'es-ES',
    th: 'th-TH',
    vi: 'vi-VN',
    id: 'id-ID',
    pt: 'pt-BR',
    fr: 'fr-FR',
    de: 'de-DE',
  }
  return map[l] || 'ko-KR'
}

/** All supported language definitions */
export const SUPPORTED_LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'en', label: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'zh', label: '中文', flag: '🇨🇳', nativeName: '中文' },
  { code: 'es', label: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', nativeName: 'Português' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
] as const

export default i18n
