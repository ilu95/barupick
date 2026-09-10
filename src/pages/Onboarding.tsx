import { setString } from '@/lib/storage'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import CharacterCanvas from '@/components/mannequin/CharacterCanvas'
import { COLORS_60 } from '@/lib/colors'
import { DEFAULT_HAIR, DEFAULT_HAIR_COLOR, setCharSex, type CharScene } from '@/lib/char/map'
import { setMode, type AppMode } from '@/lib/mode'
import { trackEvent } from '@/lib/analytics'
import { SUPPORTED_LANGUAGES } from '@/i18n'

// ═══════════════════════════════════════════════════════
// 온보딩 — 기능 설명 슬라이드 대신 질문 둘.
// 1) 캐릭터 성별  2) "옷 고르는 게 어렵나요, 재밌나요?" → 앱 모드(골라 주는 / 직접 만드는)
// 답하면 바로 홈(한 벌). 언어는 한국어 브라우저면 건너뛴다.
// ═══════════════════════════════════════════════════════

const SAMPLE: Record<'m' | 'w', CharScene['items']> = {
  m: [{ id: '28_coat_short', color: COLORS_60.camel.hex }, { id: '11_knit_crew', color: COLORS_60.ivory.hex }, { id: '03_slacks_straight', color: COLORS_60.charcoal.hex }, { id: '74_loafer', color: COLORS_60.brown.hex }],
  w: [{ id: '28_coat_short', color: COLORS_60.camel.hex }, { id: '11_knit_crew', color: COLORS_60.ivory.hex }, { id: '24_skirt_pleat', color: COLORS_60.charcoal.hex }, { id: '74_loafer', color: COLORS_60.brown.hex }],
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const hasLang = !!localStorage.getItem('sp_language')
  const [step, setStep] = useState<'lang' | 'sex' | 'mode'>(hasLang ? 'sex' : 'lang')
  const [sex, setSex] = useState<'m' | 'w' | null>(null)
  const scenes = useMemo(() => ({ m: { items: SAMPLE.m, body: { sex: 'm' as const, hair: DEFAULT_HAIR.m, hairColor: DEFAULT_HAIR_COLOR } }, w: { items: SAMPLE.w, body: { sex: 'w' as const, hair: DEFAULT_HAIR.w, hairColor: DEFAULT_HAIR_COLOR } } }), [])

  const selectLanguage = (code: string) => { i18n.changeLanguage(code); setString('sp_language', code); setStep('sex') }
  const pickSex = (s: 'm' | 'w') => { setSex(s); setCharSex(s); setStep('mode') }
  const finish = (mode: AppMode) => {
    setMode(mode)
    setString('sp_onboarded', '1')
    trackEvent('onboard_done', { sex, mode })
    navigate('/home', { replace: true })
  }

  if (step === 'lang') {
    return (
      <div className="fixed inset-0 bg-[#F7F5F2] z-[500] flex flex-col">
        <div className="flex-1 flex flex-col items-center px-6 pt-14 pb-6 max-w-[480px] mx-auto w-full">
          <div className="text-5xl mb-4">🌍</div>
          <h2 className="font-display text-[22px] font-bold text-warm-900 tracking-tight mb-2">{t('onboarding.langSelectTitle')}</h2>
          <p className="text-sm text-warm-500 mb-6">{t('onboarding.langSelectDesc')}</p>
          <div className="w-full flex-1 overflow-y-auto -mx-1 px-1">
            <div className="flex flex-col gap-2">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => selectLanguage(lang.code)}
                  className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl border-2 transition-all active:scale-[0.98] ${i18n.language === lang.code ? 'border-terra-500 bg-terra-50' : 'border-warm-300 bg-white hover:border-warm-400'}`}>
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="text-left flex-1"><div className="text-[15px] font-bold text-warm-900">{lang.nativeName}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#F7F5F2] z-[500] flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-12 pb-8 max-w-[480px] mx-auto w-full">
        <div className="text-[11px] font-extrabold tracking-[.2em] text-warm-500 mb-6">BARUPICK</div>

        {step === 'sex' && (
          <div className="animate-screen-fade flex-1 flex flex-col">
            <h2 className="font-display text-[24px] font-bold text-warm-900 tracking-tight leading-snug mb-1">{t('onboarding.sexTitle')}</h2>
            <p className="text-sm text-warm-500 mb-5">{t('onboarding.sexDesc')}</p>
            <div className="grid grid-cols-2 gap-3">
              {(['m', 'w'] as const).map(s => (
                <button key={s} onClick={() => pickSex(s)} className="bg-white border-2 border-warm-300 rounded-3xl p-3 flex flex-col items-center gap-2 active:scale-[0.97] active:border-terra-500 transition-all">
                  <CharacterCanvas {...scenes[s]} width={130} />
                  <span className="text-[15px] font-bold text-warm-900">{s === 'm' ? t('builder.male') : t('builder.female')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'mode' && (
          <div className="animate-screen-fade flex-1 flex flex-col">
            <h2 className="font-display text-[24px] font-bold text-warm-900 tracking-tight leading-snug mb-1">{t('onboarding.modeTitle')}</h2>
            <p className="text-sm text-warm-500 mb-5">{t('onboarding.modeDesc')}</p>
            <button onClick={() => finish('easy')} className="w-full bg-terra-500 text-white rounded-3xl p-5 text-left active:scale-[0.98] transition-all shadow-terra mb-3">
              <div className="text-[18px] font-extrabold leading-tight">{t('onboarding.easyTitle')}</div>
              <div className="text-[13px] opacity-90 mt-1 leading-snug">{t('onboarding.easyDesc')}</div>
              <div className="text-[12px] font-bold mt-3 flex items-center gap-1">{t('onboarding.easyCta')} <ArrowRight size={14} /></div>
            </button>
            <button onClick={() => finish('pro')} className="w-full bg-white border-2 border-warm-300 rounded-3xl p-5 text-left active:scale-[0.98] transition-all">
              <div className="text-[18px] font-extrabold text-warm-900 leading-tight">{t('onboarding.proTitle')}</div>
              <div className="text-[13px] text-warm-600 mt-1 leading-snug">{t('onboarding.proDesc')}</div>
              <div className="text-[12px] font-bold text-warm-800 mt-3 flex items-center gap-1">{t('onboarding.proCta')} <ArrowRight size={14} /></div>
            </button>
            <div className="text-[11.5px] text-warm-500 text-center mt-4">{t('onboarding.modeNote')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
