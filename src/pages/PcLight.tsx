// @ts-nocheck
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { COLORS_60 } from '@/lib/colors'
import { PERSONAL_COLOR_12 } from '@/lib/personalColor'
import { profile } from '@/lib/profile'

// ─── 원본 빛 진단 데이터 (7단계 분기형) ───
const PC_LIGHT_STEPS = {
  undertone: [
    { stepNum: 1, phase: '언더톤 진단', instruction: '같은 핑크인데 톤만 달라요\n피부가 깨끗해 보이는 쪽은?', tip: '💡 익숙한 쪽이 아니라 피부가 예뻐 보이는 쪽을 고르세요', leftColor: '#FFA898', rightColor: '#F8A0C0', leftDesc: '웜 핑크', rightDesc: '쿨 핑크', leftValue: 'warm', rightValue: 'cool' },
    { stepNum: 2, phase: '언더톤 진단', instruction: '같은 초록인데 톤만 달라요\n피부가 깨끗해 보이는 쪽은?', tip: '💡 색이 예쁜 쪽이 아니라 \'내 피부\'가 예뻐 보이는 쪽!', leftColor: '#B8E080', rightColor: '#80E0C0', leftDesc: '웜 그린', rightDesc: '쿨 그린', leftValue: 'warm', rightValue: 'cool' },
    { stepNum: 3, phase: '언더톤 진단', instruction: '미세한 차이예요\n피부가 깨끗해 보이는 쪽은?', tip: '💡 비슷하게 느껴지면 \'비슷해요\'를 눌러도 OK', leftColor: '#F0E0C0', rightColor: '#D8E0F8', leftDesc: '아이보리 빛', rightDesc: '블루화이트 빛', leftValue: 'warm', rightValue: 'cool' },
  ],
  warm_value: [
    { stepNum: 4, phase: '명도 진단', instruction: '웜톤이시네요! 🌅\n밝은 빛 vs 깊은 빛\n피부가 깨끗해 보이는 쪽은?', tip: '💡 밝다고 좋은 게 아니에요 — 피부가 편안해 보이는 쪽!', leftColor: '#D8B8A0', rightColor: '#D0A890', leftDesc: '밝은 피치', rightDesc: '리치 앰버', leftValue: 'light', rightValue: 'deep' },
    { stepNum: 5, phase: '명도 진단', instruction: '한 번 더!\n피부가 깨끗해 보이는 쪽은?', tip: '💡 창백하게 뜨거나 칙칙하게 가라앉으면 안 맞는 톤', leftColor: '#D0C8A0', rightColor: '#C8B888', leftDesc: '라이트 골드', rightDesc: '딥 골드', leftValue: 'light', rightValue: 'deep' },
  ],
  cool_value: [
    { stepNum: 4, phase: '명도 진단', instruction: '쿨톤이시네요! ❄️\n밝은 빛 vs 깊은 빛\n피부가 깨끗해 보이는 쪽은?', tip: '💡 밝다고 좋은 게 아니에요 — 피부가 편안해 보이는 쪽!', leftColor: '#A0A8C8', rightColor: '#8898C8', leftDesc: '파우더 블루', rightDesc: '딥 블루', leftValue: 'light', rightValue: 'deep' },
    { stepNum: 5, phase: '명도 진단', instruction: '한 번 더!\n피부가 깨끗해 보이는 쪽은?', tip: '💡 창백하게 뜨거나 칙칙하게 가라앉으면 안 맞는 톤', leftColor: '#B0A8C0', rightColor: '#A098B8', leftDesc: '라이트 라일락', rightDesc: '딥 라일락', leftValue: 'light', rightValue: 'deep' },
  ],
  warm_chroma: [
    { stepNum: 6, phase: '채도 진단', instruction: '거의 다 왔어요!\n선명한 빛 vs 차분한 빛\n피부가 깨끗해 보이는 쪽은?', tip: '💡 선명한 빛에서 잡티가 눈에 띄면 차분한 톤이 맞아요', leftColor: '#F0A090', rightColor: '#D0B0A0', leftDesc: '비비드 코랄', rightDesc: '더스티 살몬', leftValue: 'clear', rightValue: 'muted' },
    { stepNum: 7, phase: '채도 진단', instruction: '마지막!\n피부가 깨끗해 보이는 쪽은?', tip: '💡 마지막이에요 — 직감을 믿어보세요!', leftColor: '#90D880', rightColor: '#B0C898', leftDesc: '비비드 그린', rightDesc: '세이지', leftValue: 'clear', rightValue: 'muted' },
  ],
  cool_chroma: [
    { stepNum: 6, phase: '채도 진단', instruction: '거의 다 왔어요!\n선명한 빛 vs 은은한 빛\n피부가 깨끗해 보이는 쪽은?', tip: '💡 선명한 빛에서 잡티가 눈에 띄면 은은한 톤이 맞아요', leftColor: '#E090C0', rightColor: '#C0A0B0', leftDesc: '비비드 핑크', rightDesc: '더스티 로즈', leftValue: 'clear', rightValue: 'muted' },
    { stepNum: 7, phase: '채도 진단', instruction: '마지막!\n피부가 깨끗해 보이는 쪽은?', tip: '💡 마지막이에요 — 직감을 믿어보세요!', leftColor: '#78B0F0', rightColor: '#98B0C8', leftDesc: '비비드 블루', rightDesc: '그레이 블루', leftValue: 'clear', rightValue: 'muted' },
  ],
}

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

  const getSteps = () => {
    if (phase === 'undertone') return PC_LIGHT_STEPS.undertone
    if (phase === 'value') return undertoneResult === 'warm' ? PC_LIGHT_STEPS.warm_value : PC_LIGHT_STEPS.cool_value
    if (phase === 'chroma') return undertoneResult === 'warm' ? PC_LIGHT_STEPS.warm_chroma : PC_LIGHT_STEPS.cool_chroma
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
          <p className="text-sm text-warm-600 dark:text-warm-400 leading-relaxed px-4">{pc?.description || '퍼스널컬러 진단이 완료되었어요'}</p>
        </div>
        {bestColors.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">베스트 컬러</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {bestColors.map(ck => { const c = COLORS_60[ck]; return c ? <div key={ck} className="flex flex-col items-center gap-1"><div className="w-12 h-12 rounded-xl border border-warm-400/30" style={{ background: c.hex }} /><span className="text-[10px] text-warm-600 dark:text-warm-400">{c.name}</span></div> : null })}
            </div>
          </div>
        )}
        {pc?.worstColors && (
          <div className="mb-6">
            <div className="text-xs font-semibold text-red-500 dark:text-red-400 tracking-widest uppercase mb-3">피해야 할 컬러</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {pc.worstColors.slice(0, 6).map(ck => { const c = COLORS_60[ck]; return c ? <div key={ck} className="flex flex-col items-center gap-1"><div className="w-12 h-12 rounded-xl border border-warm-400/30 relative" style={{ background: c.hex }}><span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold drop-shadow">✕</span></div><span className="text-[10px] text-warm-600 dark:text-warm-400">{c.name}</span></div> : null })}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <button onClick={() => { profile.setPersonalColor(result); navigate('/profile/personal-color', { replace: true }) }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"><Check size={18} /> 이 결과로 설정하기</button>
          <button onClick={startOver} className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-700 dark:text-warm-300 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all">다시 진단하기</button>
        </div>
        <div className="text-center text-[11px] text-warm-500 mt-4 leading-relaxed">이 진단은 간이 테스트예요. 정확한 진단은 전문가에게 받아보세요.</div>
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
            <button onClick={() => { setMode('step'); handleAnswer(step.leftValue) }} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white active:scale-[0.97] transition-all" style={{ background: step.leftColor + '99' }}>A 선택 · {step.leftDesc}</button>
            <button onClick={() => { setMode('step'); handleAnswer(step.rightValue) }} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white active:scale-[0.97] transition-all" style={{ background: step.rightColor + '99' }}>B 선택 · {step.rightDesc}</button>
          </div>
          {isUndertone && (
            <button onClick={() => { setMode('step'); handleAnswer('similar') }} className="w-full py-2.5 rounded-xl text-xs font-medium text-white/60 border border-white/20 active:scale-[0.98] transition-all">비슷해요 (구별이 어려워요)</button>
          )}
          <button onClick={() => setMode('step')} className="w-full text-center text-xs text-white/40 mt-2 py-1 active:opacity-70">← 돌아가기</button>
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
        {canBack && <button onClick={goBack} className="text-sm text-white/50 mb-3 active:opacity-70"><ArrowLeft size={14} className="inline mr-1" /> 이전 단계</button>}

        <div className="h-1.5 bg-white/10 rounded-full mb-4"><div className="h-full bg-terra-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>

        <div className="text-xs text-white/40 font-semibold mb-1">{step.phase}</div>
        <div className="text-lg font-bold mb-4">STEP {step.stepNum} / 7</div>

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
          <div className="text-[11px] text-white/30 text-center mb-4">구별이 어려우면 "비슷해요"를 눌러도 됩니다</div>
        )}

        <button onClick={() => setMode('project')} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all">빛 비추기 시작 →</button>
      </div>
    )
  }

  // ═══ 가이드 (시작 화면) ═══
  return (
    <div className="min-h-screen bg-[#111] text-white px-5 pt-4 pb-10">
      <button onClick={() => navigate(-1)} className="text-sm text-white/50 mb-4 active:opacity-70"><ArrowLeft size={14} className="inline mr-1" /> 돌아가기</button>

      <h2 className="text-xl font-bold mb-2">빛으로 퍼스널 컬러 찾기</h2>
      <p className="text-sm text-white/50 mb-6">화면의 색광을 피부에 비추어 진단합니다 · 약 2~3분</p>

      <div className="flex flex-col gap-4 mb-6">
        {[
          { emoji: '🌙', title: '어두운 곳으로 이동', desc: '조명을 끄거나 어두운 방에서 진행하세요' },
          { emoji: '📱', title: '핸드폰을 뒤집어 세우기', desc: '화면이 아래를 향하도록 뒤집고 45° 기울여 세워주세요' },
          { emoji: '✋', title: '손을 화면 아래에 두기', desc: '화면에서 나오는 빛이 손등에 비춰지도록 놓아주세요' },
          { emoji: '👀', title: '피부가 깨끗해 보이는 쪽 선택!', desc: '양쪽 빛을 비교해서 골라주세요' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{item.emoji}</span>
            <div><div className="text-sm font-semibold">{item.title}</div><div className="text-xs text-white/40 mt-0.5">{item.desc}</div></div>
          </div>
        ))}
      </div>

      <div className="text-sm font-semibold mb-2">화면 구성</div>
      <div className="flex h-14 rounded-xl overflow-hidden mb-2">
        <div className="flex-[2] flex items-center justify-center" style={{ background: '#FFA898' }}><span className="text-white/70 font-bold">A</span></div>
        <div className="flex-1 bg-black flex items-center justify-center"><span className="text-white/20 text-[10px]">◀ ▶</span></div>
        <div className="flex-[2] flex items-center justify-center" style={{ background: '#F8A0C0' }}><span className="text-white/70 font-bold">B</span></div>
      </div>
      <div className="text-[11px] text-white/30 text-center mb-5">같은 색 계열, 톤만 달라요 · 가운데 검정 영역이 빛 겹침을 방지해요</div>

      <div className="bg-white/5 rounded-xl px-4 py-3 mb-4 text-xs text-white/50 leading-relaxed">
        <div className="font-semibold text-white/70 mb-1">💡 이것만 기억하세요</div>
        <span className="text-green-400">✅ 맞는 톤:</span> 피부가 깨끗하고 고르게 보임<br />
        <span className="text-red-400">❌ 안 맞는 톤:</span> 피부가 칙칙하거나 거칠어 보임
      </div>

      <div className="bg-white/5 rounded-xl px-4 py-3 mb-6 text-xs text-white/50 leading-relaxed">
        <div className="font-semibold text-white/70 mb-1">📱 시작 전 확인</div>
        야간모드 / 블루라이트 차단을 끄세요<br />
        화면 밝기를 최대로 올려주세요<br />
        메이크업을 지운 상태가 정확합니다
      </div>

      <button onClick={() => { startOver(); setMode('step') }} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-all shadow-terra">준비 완료 →</button>
    </div>
  )
}
