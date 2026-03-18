// @ts-nocheck
// ═══════════════════════════════════════════════════════
// PurchaseSimulate.tsx — "뭘 사면 좋을까?"
// 추천 모드 (기본) + 직접 선택 모드 (보조)
// ═══════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, ArrowLeft, ChevronRight, Sparkles, Target, Shirt, Check, X } from 'lucide-react'
import ColorPicker from '@/components/ui/ColorPicker'
import { COLORS_60, getColorName } from '@/lib/colors'

import { useWardrobe } from '@/hooks/useWardrobe'
import { useTranslation } from 'react-i18next'

type PageMode = 'select' | 'recommend' | 'manual' | 'picked'

const CATEGORIES = [
  { key: 'outer', labelKey: 'categories.outer', emoji: '🧥' },
  { key: 'middleware', labelKey: 'categories.middleware', emoji: '🧶' },
  { key: 'top', labelKey: 'categories.top', emoji: '👔' },
  { key: 'bottom', labelKey: 'categories.bottom', emoji: '👖' },
  { key: 'shoes', labelKey: 'categories.shoes', emoji: '👞' },
]

// 추천 스캔용 대표 색상 (옷장에 없는 것만 필터)
const SCAN_COLORS = [
  'white', 'ivory', 'beige', 'cream', 'lightgray', 'gray', 'charcoal', 'black',
  'navy', 'brown', 'camel', 'cognac', 'tan', 'olive', 'khaki', 'burgundy',
  'terracotta', 'sage', 'moss', 'denim', 'steel_blue', 'dusty_rose', 'plum',
  'red', 'blue', 'green', 'mustard', 'rust', 'teal', 'forest',
  'pastel_pink', 'pastel_blue', 'pastel_green', 'lavender', 'mauve',
]

export default function PurchaseSimulate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const wardrobe = useWardrobe()
  const { t } = useTranslation()

  const presetCategory = searchParams.get('category') || null
  const presetColor = searchParams.get('color') || null
  const hasPreset = !!(presetCategory || presetColor)

  const [mode, setMode] = useState<PageMode>(hasPreset ? 'manual' : 'select')

  // ─── 추천 모드 상태 ───
  const [recResults, setRecResults] = useState<any[]>([])
  const [recAnalyzing, setRecAnalyzing] = useState(false)
  const [recProgress, setRecProgress] = useState(0)

  // ─── 내 옷 기준 검토 모드 상태 ───
  const [pickedStep, setPickedStep] = useState<'items' | 'category' | 'result'>('items')
  const [pickedItems, setPickedItems] = useState<string[]>([])
  const [pickedCategory, setPickedCategory] = useState<string | null>(null)
  const [pickedResults, setPickedResults] = useState<any[]>([])
  const [pickedAnalyzing, setPickedAnalyzing] = useState(false)

  // ─── 직접 선택 모드 상태 ───
  const [manualStep, setManualStep] = useState<'category' | 'color' | 'result'>(
    presetCategory && presetColor ? 'result' : presetCategory ? 'color' : 'category'
  )
  const [category, setCategory] = useState<string | null>(presetCategory)
  const [color, setColor] = useState<string | null>(presetColor)
  const [simResult, setSimResult] = useState<any>(null)
  const [manualAnalyzing, setManualAnalyzing] = useState(false)

  const VERDICT_UI = {
    strong_buy: { emoji: '🔥', label: t('purchaseSimulate.verdict.strongBuy'), bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-400' },
    buy: { emoji: '👍', label: t('purchaseSimulate.verdict.buy'), bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-400' },
    weak: { emoji: '🤔', label: t('purchaseSimulate.verdict.weak'), bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-400' },
    skip: { emoji: '➖', label: t('purchaseSimulate.verdict.skip'), bg: 'bg-warm-50 dark:bg-warm-700', border: 'border-warm-300 dark:border-warm-600', text: 'text-warm-600 dark:text-warm-400' },
  }

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
            const catLabel = t(CATEGORIES.find(c => c.key === cand.category)?.labelKey || '') || cand.category
            const colorName = getColorName(cand.color)
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


  // ═══ 모드 선택 ═══
  if (mode === 'select') {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag size={20} className="text-amber-600 dark:text-amber-400" />
          <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">{t('purchaseSimulate.title')}</h2>
        </div>
        <p className="text-sm text-warm-500 dark:text-warm-400 mb-6">{t('purchaseSimulate.subtitle')}</p>

        <div className="flex flex-col gap-3">
          <button onClick={startRecommend} className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-warm-800 dark:to-warm-700 border border-amber-300 dark:border-amber-700 rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all shadow-warm-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
              <Sparkles size={22} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-amber-800 dark:text-amber-200">{t('purchaseSimulate.recommendMode')}</div>
              <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-0.5">{t('purchaseSimulate.recommendModeDesc')}</div>
            </div>
            <ChevronRight size={16} className="text-amber-500" />
          </button>

          <button onClick={() => { setMode('manual'); setManualStep('category') }} className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all shadow-warm-sm">
            <div className="w-12 h-12 rounded-xl bg-warm-200 dark:bg-warm-700 flex items-center justify-center flex-shrink-0">
              <Target size={22} className="text-warm-600 dark:text-warm-400" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-warm-800 dark:text-warm-200">{t('purchaseSimulate.manualMode')}</div>
              <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-0.5">{t('purchaseSimulate.manualModeDesc')}</div>
            </div>
            <ChevronRight size={16} className="text-warm-400" />
          </button>

          <button onClick={() => { setMode('picked'); setPickedStep('items'); setPickedItems([]); setPickedCategory(null); setPickedResults([]) }} className="w-full bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-warm-800 dark:to-warm-700 border border-violet-300 dark:border-violet-700 rounded-2xl p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all shadow-warm-sm">
            <div className="w-12 h-12 rounded-xl bg-violet-200 dark:bg-violet-800 flex items-center justify-center flex-shrink-0">
              <Shirt size={22} className="text-violet-700 dark:text-violet-300" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-violet-800 dark:text-violet-200">{t('purchaseSimulate.pickedMode')}</div>
              <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-0.5">{t('purchaseSimulate.pickedModeDesc')}</div>
            </div>
            <ChevronRight size={16} className="text-violet-400" />
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
          <ArrowLeft size={16} /> {t('common.goBack')}
        </button>
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">{t('purchaseSimulate.resultTitle')}</h2>
        <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">{t('purchaseSimulate.resultSubtitle')}</p>

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
            <div className="text-sm text-warm-500 dark:text-warm-400">{t('purchaseSimulate.analyzingCompat')}</div>
          </div>
        )}

        {!recAnalyzing && recResults.length === 0 && (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🤔</div>
            <div className="text-sm text-warm-600 dark:text-warm-400">{t('purchaseSimulate.noRecommend')}</div>
            <div className="text-[11px] text-warm-500 mt-1">{t('purchaseSimulate.noRecommendDesc')}</div>
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
                        {t('purchaseSimulate.comboDelta', { count: rec.comboDelta })} · {t('purchaseSimulate.avgScoreLabel', { score: rec.avgScore })} · {t('purchaseSimulate.bestScoreLabel', { score: rec.bestScore })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ═══ 내 옷 기준 검토 모드 ═══
  if (mode === 'picked') {
    // 옷장 아이템을 카테고리별로 그룹화
    const groupedItems = CATEGORIES.map(cat => ({
      ...cat,
      items: wardrobe.getItems(cat.key),
    })).filter(g => g.items.length > 0)

    // 선택된 아이템 실제 객체 조회 헬퍼
    const resolvePickedItems = () => pickedItems.map(id => wardrobe.items.find(i => i.id === id)).filter(Boolean)

    // 이미 선택한 카테고리 목록 (사고 싶은 카테고리 선택 시 제외용)
    const pickedCats = new Set(resolvePickedItems().map(i => i.category))

    const togglePickedItem = (itemId: string) => {
      setPickedItems(prev =>
        prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
      )
    }

    const runPickedSim = (cat: string) => {
      setPickedCategory(cat)
      setPickedStep('result')
      setPickedAnalyzing(true)
      requestAnimationFrame(() => {
        try {
          const resolved = resolvePickedItems().map(i => ({ category: i.category, color: i.color || i.colorKey }))
          const results = wardrobe.simulatePurchaseWithPicks(cat, resolved)
          setPickedResults(results)
        } catch { setPickedResults([]) }
        finally { setPickedAnalyzing(false) }
      })
    }

    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <button onClick={() => {
          if (pickedStep === 'result') { setPickedStep('category'); setPickedResults([]) }
          else if (pickedStep === 'category') { setPickedStep('items') }
          else { setMode('select') }
        }} className="flex items-center gap-1 text-sm text-warm-500 dark:text-warm-400 mb-3 active:opacity-70">
          <ArrowLeft size={16} /> {t('common.goBack')}
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Shirt size={20} className="text-violet-600 dark:text-violet-400" />
          <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">{t('purchaseSimulate.pickedTitle')}</h2>
        </div>

        {/* Step 1: 옷장에서 함께 입을 아이템 선택 */}
        {pickedStep === 'items' && (
          <div className="animate-screen-fade">
            <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">{t('purchaseSimulate.pickedSelectItems')}</p>

            {groupedItems.map(group => (
              <div key={group.key} className="mb-4">
                <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 mb-2">{group.emoji} {t(group.labelKey)}</div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map(item => {
                    const c = COLORS_60[item.color || item.colorKey]
                    if (!c) return null
                    const isSelected = pickedItems.includes(item.id)
                    const displayName = item.name || getColorName(item.color || item.colorKey)
                    const brandLabel = item.brand ? `${item.brand} · ` : ''
                    return (
                      <button key={item.id} onClick={() => togglePickedItem(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-[0.97]
                          ${isSelected
                            ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-600'
                            : 'border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-warm-700 dark:text-warm-300'
                          }`}>
                        {item.photoThumb ? (
                          <img src={item.photoThumb} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-warm-300 dark:border-warm-500" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: c.hex }} />
                        )}
                        <span className="truncate max-w-[140px]">{brandLabel}{displayName}</span>
                        {isSelected && <Check size={12} className="text-violet-500" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* 선택한 아이템 요약 & 다음 버튼 */}
            {pickedItems.length > 0 && (
              <div className="mt-4">
                <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-2xl p-4 mb-4">
                  <div className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-2">{t('purchaseSimulate.pickedSelected', { count: pickedItems.length })}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {resolvePickedItems().map((item) => {
                      const colorKey = item.color || item.colorKey
                      const c = COLORS_60[colorKey]
                      const displayName = item.name || getColorName(colorKey)
                      const brandLabel = item.brand ? `${item.brand} · ` : ''
                      return (
                        <span key={item.id} className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1">
                          {item.photoThumb ? (
                            <img src={item.photoThumb} alt="" className="w-3 h-3 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c?.hex || '#ccc' }} />
                          )}
                          <span className="truncate max-w-[120px]">{brandLabel}{displayName}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
                <button onClick={() => setPickedStep('category')}
                  className="w-full py-3.5 bg-violet-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm">
                  {t('purchaseSimulate.pickedNext')} <ChevronRight size={16} />
                </button>
              </div>
            )}

            {pickedItems.length === 0 && (
              <div className="text-center py-6 text-sm text-warm-500 dark:text-warm-400">{t('purchaseSimulate.pickedHint')}</div>
            )}
          </div>
        )}

        {/* Step 2: 사고 싶은 카테고리 선택 */}
        {pickedStep === 'category' && (
          <div className="animate-screen-fade">
            <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">{t('purchaseSimulate.pickedSelectCategory')}</p>

            {/* 선택한 아이템 요약 */}
            <div className="bg-warm-100 dark:bg-warm-700 rounded-2xl p-3 mb-5">
              <div className="flex flex-wrap gap-1.5">
                {resolvePickedItems().map((item) => {
                  const colorKey = item.color || item.colorKey
                  const c = COLORS_60[colorKey]
                  const displayName = item.name || getColorName(colorKey)
                  const brandLabel = item.brand ? `${item.brand} · ` : ''
                  return (
                    <span key={item.id} className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1">
                      {item.photoThumb ? (
                        <img src={item.photoThumb} alt="" className="w-3 h-3 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c?.hex || '#ccc' }} />
                      )}
                      <span className="truncate max-w-[120px]">{brandLabel}{displayName}</span>
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => runPickedSim(cat.key)}
                  className="flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl px-5 py-4 active:scale-[0.98] transition-all shadow-warm-sm">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{t(cat.labelKey)}</div>
                  </div>
                  <ChevronRight size={16} className="text-warm-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: 결과 */}
        {pickedStep === 'result' && (
          <div className="animate-screen-fade">
            <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">
              {t('purchaseSimulate.pickedResultDesc', { category: t(CATEGORIES.find(c => c.key === pickedCategory)?.labelKey || '') })}
            </p>

            {/* 선택한 아이템 요약 */}
            <div className="bg-warm-100 dark:bg-warm-700 rounded-2xl p-3 mb-5">
              <div className="flex flex-wrap gap-1.5">
                {resolvePickedItems().map((item) => {
                  const colorKey = item.color || item.colorKey
                  const c = COLORS_60[colorKey]
                  const displayName = item.name || getColorName(colorKey)
                  const brandLabel = item.brand ? `${item.brand} · ` : ''
                  return (
                    <span key={item.id} className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1">
                      {item.photoThumb ? (
                        <img src={item.photoThumb} alt="" className="w-3 h-3 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c?.hex || '#ccc' }} />
                      )}
                      <span className="truncate max-w-[120px]">{brandLabel}{displayName}</span>
                    </span>
                  )
                })}
              </div>
            </div>

            {pickedAnalyzing && (
              <div className="flex flex-col items-center py-16">
                <div className="w-10 h-10 border-2 border-violet-300 border-t-violet-500 rounded-full animate-spin mb-4" />
                <div className="text-sm text-warm-500">{t('common.analyzing')}</div>
              </div>
            )}

            {!pickedAnalyzing && pickedResults.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {pickedResults.filter(r => r.score > 0).map((r, idx) => {
                  const c = COLORS_60[r.colorKey]
                  const v = VERDICT_UI[r.verdict] || VERDICT_UI.weak
                  return (
                    <div key={r.colorKey} className={`bg-white dark:bg-warm-800 border ${v.border} rounded-2xl p-4 shadow-warm-sm`}>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-warm-500 dark:text-warm-400 w-6 text-center">{idx + 1}</span>
                        <div className="w-10 h-10 rounded-xl border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: c?.hex || '#ddd' }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-warm-900 dark:text-warm-100">{getColorName(r.colorKey)}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${v.bg} ${v.text}`}>{v.emoji} {v.label}</span>
                          </div>
                          <div className="text-[11px] text-warm-500 dark:text-warm-400 mt-0.5">
                            {t('purchaseSimulate.pickedScore', { score: r.score })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!pickedAnalyzing && pickedResults.filter(r => r.score > 0).length === 0 && (
              <div className="text-center py-16">
                <div className="text-3xl mb-3">🤔</div>
                <div className="text-sm text-warm-600 dark:text-warm-400">{t('purchaseSimulate.pickedNoResult')}</div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ═══ 직접 선택 모드 ═══
  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <button onClick={() => hasPreset ? navigate(-1) : setMode('select')} className="flex items-center gap-1 text-sm text-warm-500 dark:text-warm-400 mb-3 active:opacity-70">
        <ArrowLeft size={16} /> {t('common.goBack')}
      </button>

      <div className="flex items-center gap-2 mb-4">
        <Target size={20} className="text-warm-600 dark:text-warm-400" />
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">{t('purchaseSimulate.compatCheck')}</h2>
      </div>

      {/* Step 1: 부위 */}
      {manualStep === 'category' && (
        <div className="animate-screen-fade">
          <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">{t('purchaseSimulate.selectCategory')}</p>
          <div className="flex flex-col gap-2.5">
            {CATEGORIES.map(cat => {
              const count = wardrobe.getItems(cat.key).length
              return (
                <button key={cat.key} onClick={() => handleCategory(cat.key)}
                  className="flex items-center gap-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl px-5 py-4 active:scale-[0.98] transition-all shadow-warm-sm">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{t(cat.labelKey)}</div>
                    <div className="text-[11px] text-warm-500 dark:text-warm-400">{t('purchaseSimulate.currentCount', { count })}</div>
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
            <ArrowLeft size={16} /> {t('purchaseSimulate.reselectPart')}
          </button>
          <p className="text-sm text-warm-500 dark:text-warm-400 mb-4">{t('purchaseSimulate.selectColor', { category: t(CATEGORIES.find(c => c.key === category)?.labelKey || '') })}</p>
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
              <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{getColorName(color)}</div>
              <div className="text-[11px] text-warm-500 dark:text-warm-400">{t(CATEGORIES.find(c => c.key === category)?.labelKey || '')}</div>
            </div>
            <button onClick={() => { setCategory(null); setColor(null); setSimResult(null); setManualStep('category') }} className="text-xs text-terra-600 dark:text-terra-400 font-medium active:opacity-70">{t('purchaseSimulate.reselect')}</button>
          </div>

          {manualAnalyzing && (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin mb-4" />
              <div className="text-sm text-warm-500">{t('common.analyzing')}</div>
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
                    <div className="text-[10px] text-warm-500">{t('purchaseSimulate.newCombos')}</div>
                  </div>
                  <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-3 text-center">
                    <div className="text-xl font-bold text-warm-900 dark:text-warm-100 font-display">{simResult.bestScore}</div>
                    <div className="text-[10px] text-warm-500">{t('purchaseSimulate.bestScore')}</div>
                  </div>
                  <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl py-3 text-center">
                    <div className="text-xl font-bold text-warm-900 dark:text-warm-100 font-display">{simResult.avgScore}</div>
                    <div className="text-[10px] text-warm-500">{t('purchaseSimulate.avgScore')}</div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
