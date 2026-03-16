// @ts-nocheck
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { COLORS_60, getColorName } from '@/lib/colors'
import { PERSONAL_COLOR_12 } from '@/lib/personalColor'
import { profile } from '@/lib/profile'
import { useTranslation } from 'react-i18next'

// ─── 원본 빛 진단 데이터 (7단계 분기형) ───
const getPcLightSteps = (t: any) => ({
  undertone: [
    { stepNum: 1, phase: t('pcLight.steps.phaseUndertone'), instruction: t('pcLight.steps.u1Inst'), tip: t('pcLight.steps.u1Tip'), leftColor: '#FFA898', rightColor: '#F8A0C0', leftDesc: t('pcLight.steps.u1Left'), rightDesc: t('pcLight.steps.u1Right'), leftValue: 'warm', rightValue: 'cool' },
    { stepNum: 2, phase: t('pcLight.steps.phaseUndertone'), instruction: t('pcLight.steps.u2Inst'), tip: t('pcLight.steps.u2Tip'), leftColor: '#B8E080', rightColor: '#80E0C0', leftDesc: t('pcLight.steps.u2Left'), rightDesc: t('pcLight.steps.u2Right'), leftValue: 'warm', rightValue: 'cool' },
    { stepNum: 3, phase: t('pcLight.steps.phaseUndertone'), instruction: t('pcLight.steps.u3Inst'), tip: t('pcLight.steps.u3Tip'), leftColor: '#F0E0C0', rightColor: '#D8E0F8', leftDesc: t('pcLight.steps.u3Left'), rightDesc: t('pcLight.steps.u3Right'), leftValue: 'warm', rightValue: 'cool' },
  ],
  warm_value: [
    { stepNum: 4, phase: t('pcLight.steps.phaseValue'), instruction: t('pcLight.steps.wv4Inst'), tip: t('pcLight.steps.wv4Tip'), leftColor: '#D8B8A0', rightColor: '#D0A890', leftDesc: t('pcLight.steps.wv4Left'), rightDesc: t('pcLight.steps.wv4Right'), leftValue: 'light', rightValue: 'deep' },
    { stepNum: 5, phase: t('pcLight.steps.phaseValue'), instruction: t('pcLight.steps.wv5Inst'), tip: t('pcLight.steps.wv5Tip'), leftColor: '#D0C8A0', rightColor: '#C8B888', leftDesc: t('pcLight.steps.wv5Left'), rightDesc: t('pcLight.steps.wv5Right'), leftValue: 'light', rightValue: 'deep' },
  ],
  cool_value: [
    { stepNum: 4, phase: t('pcLight.steps.phaseValue'), instruction: t('pcLight.steps.cv4Inst'), tip: t('pcLight.steps.cv4Tip'), leftColor: '#A0A8C8', rightColor: '#8898C8', leftDesc: t('pcLight.steps.cv4Left'), rightDesc: t('pcLight.steps.cv4Right'), leftValue: 'light', rightValue: 'deep' },
    { stepNum: 5, phase: t('pcLight.steps.phaseValue'), instruction: t('pcLight.steps.cv5Inst'), tip: t('pcLight.steps.cv5Tip'), leftColor: '#B0A8C0', rightColor: '#A098B8', leftDesc: t('pcLight.steps.cv5Left'), rightDesc: t('pcLight.steps.cv5Right'), leftValue: 'light', rightValue: 'deep' },
  ],
  warm_chroma: [
    { stepNum: 6, phase: t('pcLight.steps.phaseChroma'), instruction: t('pcLight.steps.wc6Inst'), tip: t('pcLight.steps.wc6Tip'), leftColor: '#F0A090', rightColor: '#D0B0A0', leftDesc: t('pcLight.steps.wc6Left'), rightDesc: t('pcLight.steps.wc6Right'), leftValue: 'clear', rightValue: 'muted' },
    { stepNum: 7, phase: t('pcLight.steps.phaseChroma'), instruction: t('pcLight.steps.wc7Inst'), tip: t('pcLight.steps.wc7Tip'), leftColor: '#90D880', rightColor: '#B0C898', leftDesc: t('pcLight.steps.wc7Left'), rightDesc: t('pcLight.steps.wc7Right'), leftValue: 'clear', rightValue: 'muted' },
  ],
  cool_chroma: [
    { stepNum: 6, phase: t('pcLight.steps.phaseChroma'), instruction: t('pcLight.steps.cc6Inst'), tip: t('pcLight.steps.cc6Tip'), leftColor: '#E090C0', rightColor: '#C0A0B0', leftDesc: t('pcLight.steps.cc6Left'), rightDesc: t('pcLight.steps.cc6Right'), leftValue: 'clear', rightValue: 'muted' },
    { stepNum: 7, phase: t('pcLight.steps.phaseChroma'), instruction: t('pcLight.steps.cc7Inst'), tip: t('pcLight.steps.cc7Tip'), leftColor: '#78B0F0', rightColor: '#98B0C8', leftDesc: t('pcLight.steps.cc7Left'), rightDesc: t('pcLight.steps.cc7Right'), leftValue: 'clear', rightValue: 'muted' },
  ],
})

const PC_LIGHT_RESULT_MAP = {
  'warm_light_clear': 'spring_bright',
  'warm_light_muted': 'spring_light',
  'warm_deep_clear': 'autumn_true',
  'warm_deep_muted': 'autumn_soft',
  'cool_light_clear': 'summer_light',
  'cool_light_muted': 'summer_muted',
  'cool_deep_clear': 'winter_bright',
  'cool_deep_muted': 'winter_deep',
}

function countIn(arr, val) { return arr.filter(v => v === val).length }

export default function PcLight() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [mode, setMode] = useState('guide') // guide | step | project | result
  const [phase, setPhase] = useState('undertone') // undertone | value | chroma
  const [stepIndex, setStepIndex] = useState(0)
  const [undertoneAnswers, setUndertoneAnswers] = useState([])
  const [valueAnswers, setValueAnswers] = useState([])
  const [chromaAnswers, setChromaAnswers] = useState([])
  const [undertoneResult, setUndertoneResult] = useState(null)
  const [valueResult, setValueResult] = useState(null)
  const [result, setResult] = useState(null)
  const [navHistory, setNavHistory] = useState([])

  const steps = getPcLightSteps(t)

  const getSteps = () => {
    if (phase === 'undertone') return steps.undertone
    if (phase === 'value') return undertoneResult === 'warm' ? steps.warm_value : steps.cool_value
    if (phase === 'chroma') return undertoneResult === 'warm' ? steps.warm_chroma : steps.cool_chroma
    return []
  }

  const goBack = () => {
    if (navHistory.length === 0) { setMode('guide'); return }
    const prev = navHistory[navHistory.length - 1]
    setNavHistory(h => h.slice(0, -1))
    if (prev.phase === 'undertone') setUndertoneAnswers(a => a.slice(0, -1))
    else if (prev.phase === 'value') setValueAnswers(a => a.slice(0, -1))
    else if (prev.phase === 'chroma') setChromaAnswers(a => a.slice(0, -1))
    if (prev.phase !== phase) {
      setPhase(prev.phase)
      if (prev.phase === 'undertone') setUndertoneResult(null)
      else if (prev.phase === 'value') setValueResult(null)
    }
    setStepIndex(prev.stepIndex)
    setMode('step')
  }

  const handleAnswer = (value) => {
    setNavHistory(h => [...h, { phase, stepIndex }])

    if (phase === 'undertone') {
      const next = [...undertoneAnswers, value]
      setUndertoneAnswers(next)
      if (stepIndex < getSteps().length - 1) {
        setStepIndex(stepIndex + 1)
      } else {
        // 언더톤 결과
        const wc = countIn(next, 'warm'), cc = countIn(next, 'cool'), sc = countIn(next, 'similar')
        if (sc >= 2 || (wc === 1 && cc === 1 && sc === 1)) {
          setResult('spring_true')
          setMode('result')
          return
        }
        const ut = wc > cc ? 'warm' : 'cool'
        setUndertoneResult(ut)
        setPhase('value')
        setStepIndex(0)
      }
    } else if (phase === 'value') {
      const next = [...valueAnswers, value]
      setValueAnswers(next)
      if (stepIndex < getSteps().length - 1) {
        setStepIndex(stepIndex + 1)
      } else {
        const lc = countIn(next, 'light'), dc = countIn(next, 'deep')
        const vr = lc > dc ? 'light' : (dc > lc ? 'deep' : next[0])
        setValueResult(vr)
        setPhase('chroma')
        setStepIndex(0)
      }
    } else if (phase === 'chroma') {
      const next = [...chromaAnswers, value]
      setChromaAnswers(next)
      if (stepIndex < getSteps().length - 1) {
        setStepIndex(stepIndex + 1)
      } else {
        const clc = countIn(next, 'clear'), mc = countIn(next, 'muted')
        const cr = clc > mc ? 'clear' : (mc > clc ? 'muted' : next[0])
        const mapKey = `${undertoneResult}_${valueResult}_${cr}`
        setResult(PC_LIGHT_RESULT_MAP[mapKey] || 'spring_true')
        setMode('result')
      }
    }
  }

  const startOver = () => {
    setMode('guide')
    setPhase('undertone')
    setStepIndex(0)
    setUndertoneAnswers([])
    setValueAnswers([])
    setChromaAnswers([])
    setUndertoneResult(null)
    setValueResult(null)
    setResult(null)
    setNavHistory([])
  }

  // ═══ 결과 화면 ═══
  if (mode === 'result' && result) {
    const pc = PERSONAL_COLOR_12[result]
    const bestColors = (pc?.bestColors || []).slice(0, 8)
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-full bg-terra-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} className="text-terra-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-2">{pc?.name || result}</h2>
          <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed px-4">{pc?.description || ''}</p>
        </div>
        {bestColors.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">{t('pcLight.bestColors')}</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {bestColors.map(ck => { const c = COLORS_60[ck]; return c ? <div key={ck} className="flex flex-col items-center gap-1"><div className="w-12 h-12 rounded-xl border border-warm-400/30" style={{ background: c.hex }} /><span className="text-[10px] text-warm-600 dark:text-warm-400">{getColorName(ck)}</span></div> : null })}
            </div>
          </div>
        )}
        {pc?.worstColors && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-red-500 dark:text-red-400 tracking-widest uppercase mb-3">{t('pcLight.worstColors')}</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {pc.worstColors.slice(0, 6).map(ck => { const c = COLORS_60[ck]; return c ? <div key={ck} className="flex flex-col items-center gap-1"><div className="w-12 h-12 rounded-xl border border-warm-400/30 relative" style={{ background: c.hex }}><span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold drop-shadow">✕</span></div><span className="text-[10px] text-warm-600 dark:text-warm-400">{getColorName(ck)}</span></div> : null })}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <button onClick={() => { profile.setPersonalColor(result); navigate('/profile/personal-color', { replace: true }) }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"><Check size={18} /> {t('pcLight.applyResult')}</button>
          <button onClick={startOver} className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-700 dark:text-warm-300 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all">{t('common.retry')}</button>
        </div>
        <div className="text-center text-[11px] text-warm-500 mt-4 leading-relaxed">{t('pcLight.disclaimer')}</div>
      </div>
    )
  }

  // ═══ 빛 투사 (프로젝션) — 세로 3등분: A | 블랙 | B ═══
  if (mode === 'project') {
    const steps = getSteps()
    const step = steps[stepIndex]
    const isUndertone = phase === 'undertone'
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
        <div className="flex-1 flex">
          {/* A 영역 (왼쪽 40%) */}
          <div className="flex-[2] flex items-center justify-center" style={{ background: step.leftColor }}>
            <span className="text-white/50 text-4xl font-bold drop-shadow-lg">A</span>
          </div>
          {/* 블랙 분리대 (가운데 20%) — 빛 겹침 방지 */}
          <div className="flex-1 bg-black flex items-center justify-center">
            <span className="text-white/20 text-xs font-medium">◀ ▶</span>
          </div>
          {/* B 영역 (오른쪽 40%) */}
          <div className="flex-[2] flex items-center justify-center" style={{ background: step.rightColor }}>
            <span className="text-white/50 text-4xl font-bold drop-shadow-lg">B</span>
          </div>
        </div>
        <div className="flex-shrink-0 bg-black/90 px-4 pt-3 pb-6">
          <div className="flex gap-2 mb-2">
            <button onClick={() => { setMode('step'); handleAnswer(step.leftValue) }} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white active:scale-[0.97] transition-all" style={{ background: step.leftColor + '99' }}>{t('pcLight.selectA', { desc: step.leftDesc })}</button>
            <button onClick={() => { setMode('step'); handleAnswer(step.rightValue) }} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white active:scale-[0.97] transition-all" style={{ background: step.rightColor + '99' }}>{t('pcLight.selectB', { desc: step.rightDesc })}</button>
          </div>
          {isUndertone && (
            <button onClick={() => { setMode('step'); handleAnswer('similar') }} className="w-full py-2.5 rounded-xl text-xs font-medium text-white/60 border border-white/20 active:scale-[0.98] transition-all">{t('pcLight.similar')}</button>
          )}
          <button onClick={() => setMode('step')} className="w-full text-center text-xs text-white/40 mt-2 py-1 active:opacity-70">← {t('common.goBack')}</button>
        </div>
      </div>
    )
  }

  // ═══ 단계 안내 ═══
  if (mode === 'step') {
    const steps = getSteps()
    const step = steps[stepIndex]
    if (!step) { startOver(); return null }
    const progress = (step.stepNum / 7) * 100
    const canBack = navHistory.length > 0

    return (
      <div className="min-h-screen bg-[#111] text-white px-5 pt-4 pb-10">
        {canBack && <button onClick={goBack} className="text-sm text-white/50 mb-3 active:opacity-70"><ArrowLeft size={14} className="inline mr-1" /> {t('common.previous')}</button>}

        <div className="h-1.5 bg-white/10 rounded-full mb-4"><div className="h-full bg-terra-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>

        <div className="text-xs text-white/40 font-semibold mb-1">{step.phase}</div>
        <div className="text-lg font-bold mb-4">{t('pcLight.stepProgress', { current: step.stepNum, total: 7 })}</div>

        {/* 미리보기 — 3등분 */}
        <div className="flex h-16 rounded-xl overflow-hidden mb-4">
          <div className="flex-[2] flex items-center justify-center" style={{ background: step.leftColor }}><span className="text-white/70 font-bold text-xl">A</span></div>
          <div className="flex-1 bg-black flex items-center justify-center"><span className="text-white/20 text-[10px]">◀ ▶</span></div>
          <div className="flex-[2] flex items-center justify-center" style={{ background: step.rightColor }}><span className="text-white/70 font-bold text-xl">B</span></div>
        </div>

        <div className="text-[15px] font-semibold leading-relaxed whitespace-pre-line mb-3">{step.instruction}</div>
        <div className="text-xs text-white/40 bg-white/5 rounded-xl px-4 py-2.5 mb-3">{step.tip}</div>

        <div className="flex justify-between text-xs text-white/50 mb-5">
          <span>{step.leftDesc}</span>
          <span>vs</span>
          <span>{step.rightDesc}</span>
        </div>

        {phase === 'undertone' && (
          <div className="text-[11px] text-white/30 text-center mb-4">{t('pcLight.similarHint')}</div>
        )}

        <button onClick={() => setMode('project')} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all">{t('pcLight.startButton')} →</button>
      </div>
    )
  }

  // ═══ 가이드 (시작 화면) ═══
  return (
    <div className="min-h-screen bg-[#111] text-white px-5 pt-4 pb-10">
      <button onClick={() => navigate(-1)} className="text-sm text-white/50 mb-4 active:opacity-70"><ArrowLeft size={14} className="inline mr-1" /> {t('common.goBack')}</button>

      <h2 className="text-xl font-bold mb-2">{t('pcLight.guideTitle')}</h2>
      <p className="text-sm text-white/50 mb-6">{t('pcLight.guideDesc')}</p>

      <div className="flex flex-col gap-4 mb-6">
        {[
          { emoji: '🌙', title: t('pcLight.guide.step1Title'), desc: t('pcLight.guide.step1Desc') },
          { emoji: '📱', title: t('pcLight.guide.step2Title'), desc: t('pcLight.guide.step2Desc') },
          { emoji: '✋', title: t('pcLight.guide.step3Title'), desc: t('pcLight.guide.step3Desc') },
          { emoji: '👀', title: t('pcLight.guide.step4Title'), desc: t('pcLight.guide.step4Desc') },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{item.emoji}</span>
            <div><div className="text-sm font-semibold">{item.title}</div><div className="text-xs text-white/40 mt-0.5">{item.desc}</div></div>
          </div>
        ))}
      </div>

      <div className="text-sm font-semibold mb-2">{t('pcLight.screenLayout')}</div>
      <div className="flex h-14 rounded-xl overflow-hidden mb-2">
        <div className="flex-[2] flex items-center justify-center" style={{ background: '#FFA898' }}><span className="text-white/70 font-bold">A</span></div>
        <div className="flex-1 bg-black flex items-center justify-center"><span className="text-white/20 text-[10px]">◀ ▶</span></div>
        <div className="flex-[2] flex items-center justify-center" style={{ background: '#F8A0C0' }}><span className="text-white/70 font-bold">B</span></div>
      </div>
      <div className="text-[11px] text-white/30 text-center mb-5">{t('pcLight.screenLayoutDesc')}</div>

      <div className="bg-white/5 rounded-xl px-4 py-3 mb-4 text-xs text-white/50 leading-relaxed">
        <div className="font-semibold text-white/70 mb-1">{t('pcLight.rememberTitle')}</div>
        <span className="text-green-400">{t('pcLight.matchingTone')}</span> {t('pcLight.matchingToneDesc')}<br />
        <span className="text-red-400">{t('pcLight.wrongTone')}</span> {t('pcLight.wrongToneDesc')}
      </div>

      <div className="bg-white/5 rounded-xl px-4 py-3 mb-6 text-xs text-white/50 leading-relaxed">
        <div className="font-semibold text-white/70 mb-1">{t('pcLight.beforeStartTitle')}</div>
        {t('pcLight.beforeStart1')}<br />
        {t('pcLight.beforeStart2')}<br />
        {t('pcLight.beforeStart3')}
      </div>

      <button onClick={() => { startOver(); setMode('step') }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">{t('pcLight.startButton')} →</button>
    </div>
  )
}
