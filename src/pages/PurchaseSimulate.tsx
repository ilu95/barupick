// @ts-nocheck
// ═══════════════════════════════════════════════════════
// PurchaseSimulate.tsx — "이 옷 사도 될까?" 구매 전 시뮬레이션
// 새 아이템의 색상+부위를 입력하면 옷장과의 궁합을 분석
// ═══════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, ArrowLeft, Plus, ChevronRight } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60 } from '@/lib/colors'
import { CATEGORY_NAMES } from '@/lib/categories'
import { useWardrobe, getScorePercentile } from '@/hooks/useWardrobe'

type SimStep = 'category' | 'color' | 'result'

const CATEGORIES = [
  { key: 'outer', label: '아우터', emoji: '🧥' },
  { key: 'middleware', label: '미들웨어', emoji: '🧶' },
  { key: 'top', label: '상의', emoji: '👔' },
  { key: 'bottom', label: '하의', emoji: '👖' },
  { key: 'shoes', label: '신발', emoji: '👞' },
]

const VERDICT_UI = {
  strong_buy: { emoji: '🔥', label: '강력 추천!', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-400' },
  buy: { emoji: '👍', label: '좋은 선택', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-400' },
  weak: { emoji: '🤔', label: '신중하게', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-400' },
  skip: { emoji: '❌', label: '비추천', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', text: 'text-red-600 dark:text-red-400' },
}

export default function PurchaseSimulate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const wardrobe = useWardrobe()

  // URL 파라미터 (④⑤에서 연결 시 사용)
  const presetCategory = searchParams.get('category') || null
  const presetColor = searchParams.get('color') || null

  const [step, setStep] = useState<SimStep>(presetCategory && presetColor ? 'result' : presetCategory ? 'color' : 'category')
  const [category, setCategory] = useState<string | null>(presetCategory)
  const [color, setColor] = useState<string | null>(presetColor)
  const [simResult, setSimResult] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  // 카테고리 선택
  const handleCategory = (cat: string) => {
    setCategory(cat)
    // 색상이 이미 프리셋되어 있으면 색상 선택 건너뛰고 바로 시뮬레이션
    if (color) {
      runSimulation(cat, color)
    } else {
      setStep('color')
    }
  }

  // 색상 선택 → 분석 실행
  const handleColor = (colorKey: string) => {
    setColor(colorKey)
    runSimulation(category!, colorKey)
  }

  // 시뮬레이션 실행
  const runSimulation = (cat: string, col: string) => {
    setAnalyzing(true)
    setStep('result')
    requestAnimationFrame(() => {
      try {
        const result = wardrobe.simulatePurchase(cat, col)
        setSimResult(result)
      } catch (e) {
        console.error('Simulation error:', e)
        setSimResult(null)
      } finally {
        setAnalyzing(false)
      }
    })
  }

  // 프리셋으로 진입 시 자동 실행
  useEffect(() => {
    if (presetCategory && presetColor && !simResult && !analyzing) {
      runSimulation(presetCategory, presetColor)
    }
  }, [presetCategory, presetColor])

  // 옷장에 추가
  const handleAddToWardrobe = () => {
    if (!category || !color) return
    try {
      const items = JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')
      items.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        category,
        color,
        colorKey: color,
        name: COLORS_60[color]?.name || '',
        createdAt: new Date().toISOString(),
      })
      if (items.length > 200) items.length = 200
      localStorage.setItem('sp_wardrobe', JSON.stringify(items))
      wardrobe.refresh()
      navigate('/closet', { replace: true })
    } catch {}
  }

  // 다시 하기
  const handleReset = () => {
    setCategory(null)
    setColor(null)
    setSimResult(null)
    setStep('category')
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag size={20} className="text-amber-600 dark:text-amber-400" />
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">이 옷 사도 될까?</h2>
      </div>

      {/* ─── Step 1: 부위 선택 ─── */}
      {step === 'category' && (
        <div className="animate-screen-fade">
          <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">사고 싶은 옷의 종류를 선택하세요</p>
          <div className="flex flex-col gap-2.5">
            {CATEGORIES.map(cat => {
              const count = wardrobe.getItems(cat.key).length
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategory(cat.key)}
                  className="flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl px-5 py-4 active:scale-[0.98] transition-all shadow-warm-sm"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{cat.label}</div>
                    <div className="text-[11px] text-warm-500 dark:text-warm-400">현재 옷장에 {count}개</div>
                  </div>
                  <ChevronRight size={16} className="text-warm-400" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Step 2: 색상 선택 ─── */}
      {step === 'color' && (
        <div className="animate-screen-fade">
          <button onClick={() => setStep('category')} className="flex items-center gap-1 text-sm text-warm-500 dark:text-warm-400 mb-3 active:opacity-70">
            <ArrowLeft size={16} /> 부위 다시 선택
          </button>

          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">{CATEGORIES.find(c => c.key === category)?.emoji}</span>
            <span className="text-sm font-semibold text-warm-900 dark:text-warm-100">{CATEGORIES.find(c => c.key === category)?.label}</span>
            <span className="text-sm text-warm-500">의 색상을 선택하세요</span>
          </div>

          <ColorPicker
            onSelect={handleColor}
            selected={color}
            inline={true}
          />
        </div>
      )}

      {/* ─── Step 3: 결과 ─── */}
      {step === 'result' && (
        <div className="animate-screen-fade">
          {/* 선택한 아이템 요약 */}
          <div className="flex items-center gap-3 bg-warm-100 dark:bg-warm-700 rounded-2xl px-4 py-3 mb-5">
            <div className="w-10 h-10 rounded-xl border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: color ? COLORS_60[color]?.hex || '#ddd' : '#ddd' }} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{COLORS_60[color]?.name || color}</div>
              <div className="text-[11px] text-warm-500 dark:text-warm-400">{CATEGORIES.find(c => c.key === category)?.label}</div>
            </div>
            <button onClick={handleReset} className="text-xs text-terra-600 dark:text-terra-400 font-medium active:opacity-70">다시 선택</button>
          </div>

          {/* 분석 중 */}
          {analyzing && (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin mb-4" />
              <div className="text-sm text-warm-500">옷장과 궁합 분석 중...</div>
            </div>
          )}

          {/* 결과 */}
          {!analyzing && simResult && (
            <>
              {/* Verdict 카드 */}
              {(() => {
                const v = VERDICT_UI[simResult.verdict]
                return (
                  <div className={`${v.bg} border ${v.border} rounded-2xl p-5 mb-5 text-center`}>
                    <div className="text-4xl mb-2">{v.emoji}</div>
                    <div className={`text-lg font-bold ${v.text} mb-1`}>{v.label}</div>
                    <div className="text-sm text-warm-600 dark:text-warm-400">{simResult.reason}</div>
                  </div>
                )
              })()}

              {/* 수치 요약 */}
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

              {/* 매칭되는 코디 목록 */}
              {simResult.matchingOutfits.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">가능한 코디 조합</div>
                  <div className="flex flex-col gap-2.5">
                    {simResult.matchingOutfits.slice(0, 5).map((combo: any, idx: number) => {
                      const outfitHex: Record<string, string> = {}
                      Object.entries(combo.outfit).forEach(([k, v]) => {
                        if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
                      })
                      const pct = getScorePercentile(combo.score)
                      return (
                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3 shadow-warm-sm">
                          <MannequinSVG outfit={outfitHex} size={55} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(combo.outfit).filter(([_, v]) => v).map(([part, ck]) => {
                                const c = COLORS_60[ck]
                                if (!c) return null
                                const isNew = part === category && ck === color
                                return (
                                  <div key={part} className={`flex items-center gap-1 text-[10px] ${isNew ? 'bg-amber-100 dark:bg-amber-900/30 rounded px-1' : ''}`}>
                                    <span className="w-3 h-3 rounded border border-warm-300" style={{ background: c.hex }} />
                                    <span className="text-warm-600 dark:text-warm-400">{(CATEGORY_NAMES as any)?.[part]}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="font-display text-sm font-bold text-warm-900 dark:text-warm-100">{combo.score}점</span>
                            {pct && <span className="text-[8px] font-semibold bg-terra-100 text-terra-600 dark:bg-terra-900/30 dark:text-terra-400 px-1.5 py-0.5 rounded-full">{pct.label}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {simResult.matchingOutfits.length > 5 && (
                    <div className="text-center text-[11px] text-warm-500 mt-2">외 {simResult.matchingOutfits.length - 5}개 조합 더</div>
                  )}
                </div>
              )}

              {/* 매칭 없을 때 */}
              {simResult.matchingOutfits.length === 0 && (
                <div className="text-center py-8 mb-5">
                  <div className="text-3xl mb-2">😅</div>
                  <div className="text-sm text-warm-600 dark:text-warm-400">현재 옷장의 아이템과 어울리는 조합을 찾지 못했어요</div>
                </div>
              )}

              {/* CTA 버튼 */}
              <div className="flex flex-col gap-2.5">
                {(simResult.verdict === 'strong_buy' || simResult.verdict === 'buy') && (
                  <button onClick={handleAddToWardrobe} className="w-full py-3.5 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra">
                    <Plus size={16} /> 내 옷장에 추가
                  </button>
                )}
                <button onClick={handleReset} className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-700 dark:text-warm-300 active:scale-[0.98] transition-all">
                  🔄 다른 아이템 분석하기
                </button>
              </div>
            </>
          )}

          {/* 결과 없음 (에러) */}
          {!analyzing && !simResult && (
            <div className="text-center py-16">
              <div className="text-3xl mb-3">🤔</div>
              <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">분석할 수 없었어요. 옷장에 아이템이 충분한지 확인해주세요.</div>
              <button onClick={handleReset} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all">다시 시도</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
