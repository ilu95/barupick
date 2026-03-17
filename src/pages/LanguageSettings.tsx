import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/i18n'

export default function LanguageSettings() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('sp_language', code)
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-warm-600 dark:text-warm-400 mb-4 active:opacity-70">
        <ArrowLeft size={16} /> {t('common.back')}
      </button>

      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">
        {t('settings.language')}
      </h2>
      <p className="text-sm text-warm-500 mb-6">{t('settings.languageDesc')}</p>

      <div className="flex flex-col gap-2">
        {SUPPORTED_LANGUAGES.map(lang => {
          const active = i18n.language === lang.code
          return (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                active
                  ? 'border-terra-500 bg-terra-50 dark:bg-terra-900/20'
                  : 'border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 hover:border-warm-400'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <div className="text-left flex-1 min-w-0">
                <div className="text-[15px] font-bold text-warm-900 dark:text-warm-100">{lang.nativeName}</div>
              </div>
              {active && (
                <div className="w-6 h-6 rounded-full bg-terra-500 flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
