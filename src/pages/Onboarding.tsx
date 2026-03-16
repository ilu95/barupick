import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Palette, Users, Calendar, Sparkles, ChevronRight } from 'lucide-react'

const SLIDES = [
  {
    emoji: '👕',
    icon: <Palette size={32} className="text-terra-500" />,
    titleKey: 'onboarding.slide1Title',
    descKey: 'onboarding.slide1Desc',
    bg: 'from-terra-50 to-warm-100',
  },
  {
    emoji: '📊',
    icon: <Sparkles size={32} className="text-terra-500" />,
    titleKey: 'onboarding.slide2Title',
    descKey: 'onboarding.slide2Desc',
    bg: 'from-amber-50 to-terra-50',
  },
  {
    emoji: '📝',
    icon: <Calendar size={32} className="text-terra-500" />,
    titleKey: 'onboarding.slide3Title',
    descKey: 'onboarding.slide3Desc',
    bg: 'from-sky-50 to-warm-50',
  },
  {
    emoji: '👥',
    icon: <Users size={32} className="text-terra-500" />,
    titleKey: 'onboarding.slide4Title',
    descKey: 'onboarding.slide4Desc',
    bg: 'from-green-50 to-warm-50',
  },
]

const LANGUAGES = [
  { code: 'ko', label: '한국어', flag: '🇰🇷', desc: 'Korean' },
  { code: 'en', label: 'English', flag: '🇺🇸', desc: 'English' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', desc: 'Japanese' },
]

const SWIPE_THRESHOLD = 50

export default function Onboarding() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  // Start at language selection (-1) if no language was previously set
  const hasLang = !!localStorage.getItem('sp_language')
  const [step, setStep] = useState(hasLang ? 0 : -1)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)

  const touchRef = useRef({ startX: 0, startY: 0, swiping: false })

  const goTo = useCallback((next: number, dir: 'left' | 'right') => {
    if (next < -1 || next >= SLIDES.length) return
    setDirection(dir)
    setTimeout(() => {
      setStep(next)
      setDirection(null)
    }, 150)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      swiping: true,
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current.swiping) return
    const dx = e.changedTouches[0].clientX - touchRef.current.startX
    const dy = e.changedTouches[0].clientY - touchRef.current.startY
    touchRef.current.swiping = false

    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return

    if (dx < 0 && step < SLIDES.length - 1) {
      goTo(step + 1, 'left')
    } else if (dx > 0 && step > 0) {
      goTo(step - 1, 'right')
    }
  }, [step, goTo])

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('sp_language', code)
    goTo(0, 'left')
  }

  const finish = () => {
    localStorage.setItem('sp_onboarded', '1')
    navigate('/home', { replace: true })
  }

  // Language selection screen
  if (step === -1) {
    return (
      <div className="fixed inset-0 bg-[#F7F5F2] z-[500] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-[480px] mx-auto w-full">
          <div className="text-5xl mb-6">🌍</div>
          <h2 className="font-display text-[22px] font-bold text-warm-900 tracking-tight mb-2">
            Choose Language
          </h2>
          <p className="text-sm text-warm-500 mb-10">Select your preferred language</p>

          <div className="w-full flex flex-col gap-3">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => selectLanguage(lang.code)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  i18n.language === lang.code
                    ? 'border-terra-500 bg-terra-50'
                    : 'border-warm-300 bg-white hover:border-warm-400'
                }`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <div className="text-left">
                  <div className="text-[16px] font-bold text-warm-900">{lang.label}</div>
                  <div className="text-[12px] text-warm-500">{lang.desc}</div>
                </div>
                {i18n.language === lang.code && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-terra-500 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  const slideAnim = direction === 'left'
    ? 'opacity-0 -translate-x-8'
    : direction === 'right'
    ? 'opacity-0 translate-x-8'
    : 'opacity-100 translate-x-0'

  return (
    <div
      className="fixed inset-0 bg-[#F7F5F2] z-[500] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-[480px] mx-auto w-full">

        <div
          className={`w-full bg-gradient-to-b ${slide.bg} rounded-3xl p-8 mb-8 text-center transition-all duration-200 ease-out ${slideAnim}`}
          aria-live="polite"
        >
          <div className="text-6xl mb-5">{slide.emoji}</div>
          <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-5 shadow-warm-sm">
            {slide.icon}
          </div>
          <h2 className="font-display text-[22px] font-bold text-warm-900 tracking-tight leading-snug whitespace-pre-line mb-3">
            {t(slide.titleKey)}
          </h2>
          <p className="text-sm text-warm-600 leading-relaxed whitespace-pre-line">
            {t(slide.descKey)}
          </p>
        </div>

        <div className="flex gap-2 mb-8" role="tablist" aria-label={t('onboarding.start')}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={`${i + 1}`}
              onClick={() => goTo(i, i > step ? 'left' : 'right')}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-terra-500' : 'w-2 bg-warm-400'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pb-10 max-w-[480px] mx-auto w-full">
        {isLast ? (
          <button
            onClick={finish}
            className="w-full py-4 bg-terra-500 text-white rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
          >
            {t('onboarding.start')} <Sparkles size={18} />
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={finish}
              className="px-6 py-4 bg-white border border-warm-400 text-warm-600 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all"
            >
              {t('onboarding.skip')}
            </button>
            <button
              onClick={() => goTo(step + 1, 'left')}
              className="flex-1 py-4 bg-terra-500 text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
            >
              {t('common.next')} <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
