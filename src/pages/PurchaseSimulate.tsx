// @ts-nocheck
// ═══════════════════════════════════════════════════════
// PurchaseSimulate.tsx — "뭘 사면 좋을까?"
// 추천 모드 (기본) + 직접 선택 모드 (보조)
// ═══════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, ArrowLeft, Plus, ChevronRight, Sparkles, Target } from 'lucide-react'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60 } from '@/lib/colors'
import { CATEGORY_NAMES } from '@/lib/categories'
import { useWardrobe } from '@/hooks/useWardrobe'

type PageMode = 'select' | 'recommend' | 'manual'

const CATEGORIES = [
  { key: 'outer', label: '아우터', emoji: '🧥' },
  { key: 'middleware', label: '미들웨어', emoji: '🧶' },
  { key: 'top', label: '상의', emoji: '👔' },
  { key: 'bottom', label: '하의', emoji: '👖' },
  { key: 'shoes', label: '신발', emoji: '👞' },
]

// 추천 스캔용 대표 색상 (옷장에 없는 것만 필터)
const SCAN_COLORS = [
  'white', 'ivory', 'beige', 'cream', 'lightgray', 'gray', 'charcoal', 'black',
  'navy', 'brown', 'camel', 'cognac', 'tan', 'olive', 'khaki', 'burgundy',
  'terracotta', 'sage', 'moss', 'denim', 'steel_blue', 'dusty_rose', 'plum',
  'red', 'blue', 'green', 'mustard', 'rust', 'teal', 'forest',
  'pastel_pink', 'pastel_blue', 'pastel_green', 'lavender', 'mauve',
]

const VERDICT_UI = {
  strong_buy: { emoji: '🔥', label: '강력 추천!', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-400' },
  buy: { emoji: '👍', label: '좋은 선택', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-400' },
  weak: { emoji: '🤔', label: '효과 적음', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-400' },
  skip: { emoji: '➖', label: '조합 없음', bg: 'bg-warm-50 dark:bg-warm-700', border: 'border-warm-300 dark:border-warm-600', text: 'text-warm-600 dark:text-warm-400' },
}

export default function PurchaseSimulate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const wardrobe = useWardrobe()

  const presetCategory = searchParams.get('category') || null
  const presetColor = searchParams.get('color') || null
  const hasPreset = !!(presetCategory || presetColor)

  const [mode, setMode] = useState<PageMode>(hasPreset ? 'manual' : 'select')

  // ─── 추천 모드 상태 ───
  const [recResults, setRecResults] = useState<any[]>([])
  const [recAnalyzing, setRecAnalyzing] = useState(false)
  const [recProgress, setRecProgress] = useState(0)

  // ─── 직접 선택 모드 상태 ───
  const [manualStep, setManualStep] = useState<'category' | 'color' | 'result'>(
    presetCategory && presetColor ? 'result' : presetCategory ? 'color' : 'category'
  )
  const [category, setCategory] = useState<string | null>(presetCategory)
  const [color, setColor] = useState<string | null>(presetColor)
  const [simResult, setSimResult] = useState<any>(null)
  const [manualAnalyzing, setManualAnalyzing] = useState(false)

  // 옷장에 이미 있는 (카테고리, 색상) 쌍
  const existingPairs = useMemo(() => {
    const set = new Set<string>()
    wardrobe.items.forEach(i => {
      const c = i.color || i.colorKey
      const cat = i.category
      if (c && cat) set.add(`${cat}:${c}`)
    })
    return set
  }, [wardrobe.items])

  // ─── 추천 모드 스캔 ───
  const startRecommend = () => {
    setMode('recommend')
    setRecAnalyzing(true)
    setRecProgress(0)

    const candidates: { category: string; color: string }[] = []
    CATEGORIES.forEach(cat => {
      SCAN_COLORS.forEach(color => {
        if (!existingPairs.has(`${cat.key}:${color}`) && COLORS_60[color]) {
          candidates.push({ category: cat.key, color })
        }
      })
    })

    const results: any[] = []
    let idx = 0
    const total = candidates.length

    function processChunk() {
      const end = Math.min(idx + 3, total)
      for (let i = idx; i < end; i++) {
        const cand = candidates[i]
        try {
          const sim = wardrobe.simulatePurchase(cand.category, cand.color)
          if (sim.comboDelta > 0) {
            const catLabel = CATEGORIES.find(c => c.key === cand.category)?.label || cand.category
            const colorName = COLORS_60[cand.color]?.name || cand.color
            results.push({
              ...sim, category: cand.category, color: cand.color,
              catLabel, colorName,
            })
          }
        } catch {}
      }
      idx = end
      setRecProgress(Math.round((idx / total) * 100))
      if (idx < total) {
        requestAnimationFrame(processChunk)
      } else {
        results.sort((a, b) => b.comboDelta - a.comboDelta || b.avgScore - a.avgScore)
        setRecResults(results)
        setRecAnalyzing(false)
      }
    }
    requestAnimationFrame(processChunk)
  }

  // ─── 직접 선택 모드 ───
  const handleCategory = (cat: string) => {
    setCategory(cat)
    if (color) { runManualSim(cat, color) } else { setManualStep('color') }
  }
  const handleColor = (colorKey: string) => {
    setColor(colorKey)
    runManualSim(category!, colorKey)
  }
  const runManualSim = (cat: string, col: string) => {
    setManualAnalyzing(true)
    setManualStep('result')
    requestAnimationFrame(() => {
      try { setSimResult(wardrobe.simulatePurchase(cat, col)) }
      catch { setSimResult(null) }
      finally { setManualAnalyzing(false) }
    })
  }

  // 프리셋 자동 실행
  useEffect(() => {
    if (presetCategory && presetColor && !simResult && !manualAnalyzing) {
      runManualSim(presetCategory, presetColor)
    }
  }, [presetCategory, presetColor])

  const handleAddToWardrobe = (cat: string, col: string) => {
    try {
      const items = JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')
      items.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), category: cat, color: col, colorKey: col, name: COLORS_60[col]?.name || '', createdAt: new Date().toISOString() })
      if (items.length > 200) items.length = 200
      localStorage.setItem('sp_wardrobe', JSON.stringify(items))
      wardrobe.refresh()
      navigate('/closet', { replace: true })
    } catch {}
  }

  // ═══ 모드 선택 ═══
  if (mode === 'select') {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag size={20} className="text-amber-600 dark:text-amber-400" />
          <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">뭘 사면 좋을까?</h2>
        </div>
        <p className="text-sm text-warm-500 dark:text-warm-400 mb-6">내 옷장을 분석해서 추천해드릴게요</p>

        <div className="flex flex-col gap-3">
          <button onClick={startRecommend} className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-warm-800 dark:to-warm-700 border border-amber-300 dark:border-amber-700 rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all shadow-warm-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
              <Sparkles size={22} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-amber-800 dark:text-amber-200">옷장 분석해서 추천받기</div>
              <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-0.5">아무것도 고르지 않아도 돼요</div>
            </div>
            <ChevronRight size={16} className="text-amber-500" />
          </button>

          <button onClick={() => { setMode('manual'); setManualStep('category') }} className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all shadow-warm-sm">
            <div className="w-12 h-12 rounded-xl bg-warm-200 dark:bg-warm-700 flex items-center justify-center flex-shrink-0">
              <Target size={22} className="text-warm-600 dark:text-warm-400" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-warm-800 dark:text-warm-200">특정 아이템 궁합 확인하기</div>
              <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-0.5">사고 싶은 옷의 색상을 직접 선택</div>
            </div>
            <ChevronRight size={16} className="text-warm-400" />
          </button>
        </div>
      </div>
    )
  }

  // ═══ 추천 모드 ═══
  if (mode === 'recommend') {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <button onClick={() => setMode('select')} className="flex items-center gap-1 text-sm text-warm-500 dark:text-warm-400 mb-3 active:opacity-70">
          <ArrowLeft size={16} /> 돌아가기
        </button>
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">추천 결과</h2>
        <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">옷장을 분석해서 효과 높은 순으로 정렬했어요</p>

        {recAnalyzing && (
          <div className="py-16 flex flex-col items-center">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" className="text-warm-300 dark:text-warm-600" strokeWidth={8} />
                <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" className="text-terra-500" strokeWidth={8}
                  strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - recProgress / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-sm font-bold text-warm-700 dark:text-warm-300">{recProgress}%</span>
              </div>
            </div>
            <div className="text-sm text-warm-500 dark:text-warm-400">옷장과 궁합 분석 중...</div>
          </div>
        )}

        {!recAnalyzing && recResults.length === 0 && (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🤔</div>
            <div className="text-sm text-warm-600 dark:text-warm-400">추천할 아이템을 찾지 못했어요</div>
            <div className="text-[11px] text-warm-500 mt-1">옷장에 아이템을 더 등록해보세요</div>
          </div>
        )}

        {!recAnalyzing && recResults.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {recResults.map((rec, idx) => {
              const c = COLORS_60[rec.color]
              const v = VERDICT_UI[rec.verdict] || VERDICT_UI.weak
              return (
                <div key={`${rec.category}-${rec.color}`} className={`bg-white dark:bg-warm-800 border ${v.border} rounded-2xl p-4 shadow-warm-sm`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-warm-500 dark:text-warm-400 w-6 text-center">{idx + 1}</span>
                    <div className="w-10 h-10 rounded-xl border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: c?.hex || '#ddd' }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-warm-900 dark:text-warm-100">{rec.colorName} {rec.catLabel}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${v.bg} ${v.text}`}>{v.emoji} {v.label}</span>
                      </div>
                      <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">
                        +{rec.comboDelta}개 코디 · 평균 {rec.avgScore}점 · 최고 {rec.bestScore}점
                      </div>
                    </div>
                  </div>
                  {rec.verdict === 'strong_buy' || rec.verdict === 'buy' ? (
                    <button onClick={() => handleAddToWardrobe(rec.category, rec.color)} className="mt-3 w-full py-2.5 bg-terra-500 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-all">
                      <Plus size={14} /> 옷장에 추가
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ═══ 직접 선택 모드 ═══
  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <button onClick={() => hasPreset ? navigate(-1) : setMode('select')} className="flex items-center gap-1 text-sm text-warm-500 dark:text-warm-400 mb-3 active:opacity-70">
        <ArrowLeft size={16} /> 돌아가기
      </button>

      <div className="flex items-center gap-2 mb-4">
        <Target size={20} className="text-warm-600 dark:text-warm-400" />
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">궁합 확인</h2>
      </div>

      {/* Step 1: 부위 */}
      {manualStep === 'category' && (
        <div className="animate-screen-fade">
          <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">사고 싶은 옷의 종류를 선택하세요</p>
          <div className="flex flex-col gap-2.5">
            {CATEGORIES.map(cat => {
              const count = wardrobe.getItems(cat.key).length
              return (
                <button key={cat.key} onClick={() => handleCategory(cat.key)}
                  className="flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl px-5 py-4 active:scale-[0.98] transition-all shadow-warm-sm">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{cat.label}</div>
                    <div className="text-[11px] text-warm-500 dark:text-warm-400">현재 {count}개</div>
                  </div>
                  <ChevronRight size={16} className="text-warm-400" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: 색상 */}
      {manualStep === 'color' && (
        <div className="animate-screen-fade">
          <button onClick={() => setManualStep('category')} className="flex items-center gap-1 text-sm text-warm-500 mb-3 active:opacity-70">
            <ArrowLeft size={16} /> 부위 다시 선택
          </button>
          <p className="text-sm text-warm-500 dark:text-warm-400 mb-4">{CATEGORIES.find(c => c.key === category)?.label}의 색상을 선택하세요</p>
          <ColorPicker onSelect={handleColor} selected={color} inline={true} />
        </div>
      )}

      {/* Step 3: 결과 */}
      {manualStep === 'result' && (
        <div className="animate-screen-fade">
          {/* 선택 요약 */}
          <div className="flex items-center gap-3 bg-warm-100 dark:bg-warm-700 rounded-2xl px-4 py-3 mb-5">
            <div className="w-10 h-10 rounded-xl border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: color ? COLORS_60[color]?.hex || '#ddd' : '#ddd' }} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{COLORS_60[color]?.name || color}</div>
              <div className="text-[11px] text-warm-500 dark:text-warm-400">{CATEGORIES.find(c => c.key === category)?.label}</div>
            </div>
            <button onClick={() => { setCategory(null); setColor(null); setSimResult(null); setManualStep('category') }} className="text-xs text-terra-600 dark:text-terra-400 font-medium active:opacity-70">다시 선택</button>
          </div>

          {manualAnalyzing && (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin mb-4" />
              <div className="text-sm text-warm-500">분석 중...</div>
            </div>
          )}

          {!manualAnalyzing && simResult && (() => {
            const v = VERDICT_UI[simResult.verdict]
            return (
              <>
                <div className={`${v.bg} border ${v.border} rounded-2xl p-5 mb-5 text-center`}>
                  <div className="text-4xl mb-2">{v.emoji}</div>
                  <div className={`text-lg font-bold ${v.text} mb-1`}>{v.label}</div>
                  <div className="text-sm text-warm-600 dark:text-warm-400">{simResult.reason}</div>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-3 text-center">
                    <div className="text-xl font-bold text-warm-900 dark:text-warm-100 font-display">+{simResult.comboDelta}</div>
                    <div className="text-[10px] text-warm-500">새 코디 수</div>
                  </div>
                  <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-3 text-center">
                    <div className="text-xl font-bold text-warm-900 dark:text-warm-100 font-display">{simResult.bestScore}</div>
                    <div className="text-[10px] text-warm-500">최고 점수</div>
                  </div>
                  <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-3 text-center">
                    <div className="text-xl font-bold text-warm-900 dark:text-warm-100 font-display">{simResult.avgScore}</div>
                    <div className="text-[10px] text-warm-500">평균 점수</div>
                  </div>
                </div>
                {(simResult.verdict === 'strong_buy' || simResult.verdict === 'buy') && (
                  <button onClick={() => handleAddToWardrobe(category, color)} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra mb-3">
                    <Plus size={16} /> 옷장에 추가
                  </button>
                )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
