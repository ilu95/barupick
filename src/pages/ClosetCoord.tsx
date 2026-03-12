// @ts-nocheck
// ═══════════════════════════════════════════════════════
// ClosetCoord.tsx — 내 옷 코디 허브
// 오늘의 코디, 구매 시뮬, 활용도 분석 + 기존 레이어 코디
// ═══════════════════════════════════════════════════════
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RefreshCw, Bookmark, Lightbulb, Shirt, ShoppingBag, BarChart3, Sparkles, ChevronRight } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { LAYER_LEVELS, STYLE_GUIDE } from '@/lib/styles'
import { CATEGORY_NAMES } from '@/lib/categories'
import { evaluationSystem } from '@/lib/evaluation'
import { profile } from '@/lib/profile'
import { getDynamicCombos } from '@/lib/recommend'

export default function ClosetCoord() {
  const navigate = useNavigate()
  const [layerType, setLayerType] = useState<string | null>(null)
  const [results, setResults] = useState<any[] | null>(null)

  const items = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sp_wardrobe') || '[]') } catch { return [] }
  }, [])

  const catMap: Record<string, string> = { '상의': 'top', '하의': 'bottom', '아우터': 'outer', '미들웨어': 'middleware', '신발': 'shoes', '가방': 'bag', '기타': 'etc' }
  const getColor = (item: any) => item.color || item.colorKey || null
  const byCat = useMemo(() => {
    const map: Record<string, any[]> = {}
    items.forEach((i: any) => {
      const eng = catMap[i.category] || i.category
      if (!map[eng]) map[eng] = []
      map[eng].push({ ...i, color: getColor(i) })
    })
    return map
  }, [items])

  const catOrder = ['outer', 'middleware', 'top', 'bottom', 'shoes']

  const generate = (lt: string) => {
    const layer = LAYER_LEVELS[lt]
    if (!layer) return
    const partKeys = layer.partKeys || ['top', 'bottom', 'shoes']

    let pinCombos: Record<string, string>[] = [{}]
    partKeys.forEach(pk => {
      const pool = byCat[pk]
      if (!pool || pool.length === 0) return
      const itemsToTry = pool.slice(0, 3)
      const newCombos: Record<string, string>[] = []
      pinCombos.forEach(existing => {
        itemsToTry.forEach(item => {
          if (item.color) newCombos.push({ ...existing, [pk]: item.color })
        })
      })
      pinCombos = newCombos
      if (pinCombos.length > 8) {
        pinCombos.sort(() => Math.random() - 0.5)
        pinCombos = pinCombos.slice(0, 8)
      }
    })

    const styles = ['casual', 'minimal', 'normcore', 'preppy', 'amekaji']
    let allResults: any[] = []

    pinCombos.forEach(pinned => {
      const style = styles[Math.floor(Math.random() * styles.length)]
      try {
        const engineResults = getDynamicCombos(style, lt, 6, pinned)
        engineResults.forEach(r => {
          const outfitHex: Record<string, string> = {}
          Object.entries(r.outfit).forEach(([k, v]) => {
            if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
          })
          allResults.push({ outfit: r.outfit, outfitHex, score: r.score, name: r.name, tip: r.tip, tags: r.tags })
        })
      } catch {}
    })

    const seen = new Set<string>()
    const deduped = allResults.filter(r => {
      const key = catOrder.map(pk => r.outfit[pk] || '').join('/')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    deduped.sort((a, b) => b.score - a.score)
    setResults(deduped.slice(0, 20))
  }

  if (items.length === 0) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <div className="text-4xl mb-3">👕</div>
        <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">옷장에 아이템을 먼저 등록해주세요</div>
        <button onClick={() => navigate('/closet/add')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">
          아이템 등록하기
        </button>
      </div>
    )
  }

  // 레이어 선택 전 — 허브 화면
  if (!layerType) {
    const hasEnough = items.length >= 3
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">내 옷 코디</h2>
        <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">옷장에 있는 아이템을 활용해보세요</p>

        {/* ═══ 새 기능 카드 — 항상 표시, 아이템 부족 시 비활성화 ═══ */}
        {(() => {
          const needed = Math.max(0, 3 - items.length)
          return (
            <div className="flex flex-col gap-2.5 mb-6">
              {/* 오늘 뭐 입지? */}
              <button
                onClick={() => hasEnough ? navigate('/home/today') : navigate('/closet/add')}
                className={`group w-full border rounded-2xl p-4 flex items-center gap-3.5 text-left active:scale-[0.98] transition-all shadow-warm-sm ${
                  hasEnough
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-warm-800 dark:to-warm-700 border-amber-300 dark:border-amber-700'
                    : 'bg-warm-100 dark:bg-warm-800 border-warm-300 dark:border-warm-600 opacity-80'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${hasEnough ? 'bg-amber-200 dark:bg-amber-800' : 'bg-warm-300 dark:bg-warm-700'}`}>
                  <Shirt size={22} className={hasEnough ? 'text-amber-700 dark:text-amber-300' : 'text-warm-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[15px] font-bold tracking-tight ${hasEnough ? 'text-amber-800 dark:text-amber-200' : 'text-warm-700 dark:text-warm-300'}`}>오늘 뭐 입지?</div>
                  <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-0.5">
                    {hasEnough ? '날씨·상황에 맞는 코디 3개 추천' : `아이템 ${needed}개 더 등록하면 사용 가능`}
                  </div>
                </div>
                <ChevronRight size={16} className={hasEnough ? 'text-amber-500 flex-shrink-0' : 'text-warm-400 flex-shrink-0'} />
              </button>

              {/* 2열: 사도 될까? + 활용도 */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => hasEnough ? navigate('/closet/simulate') : navigate('/closet/add')}
                  className={`rounded-2xl p-3.5 text-left transition-all shadow-warm-sm ${
                    hasEnough
                      ? 'bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 active:scale-[0.97]'
                      : 'bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 opacity-70'
                  }`}
                >
                  <ShoppingBag size={20} className={hasEnough ? 'text-amber-600 dark:text-amber-400 mb-2' : 'text-warm-400 mb-2'} />
                  <div className={`text-[13px] font-semibold ${hasEnough ? 'text-warm-900 dark:text-warm-100' : 'text-warm-600 dark:text-warm-400'}`}>사도 될까?</div>
                  <div className="text-[10px] text-warm-500 dark:text-warm-400 mt-0.5">{hasEnough ? '구매 전 궁합 분석' : '아이템 등록 필요'}</div>
                </button>
                <button
                  onClick={() => hasEnough ? navigate('/closet/report') : navigate('/closet/add')}
                  className={`rounded-2xl p-3.5 text-left transition-all shadow-warm-sm ${
                    hasEnough
                      ? 'bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 active:scale-[0.97]'
                      : 'bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 opacity-70'
                  }`}
                >
                  <BarChart3 size={20} className={hasEnough ? 'text-warm-600 dark:text-warm-400 mb-2' : 'text-warm-400 mb-2'} />
                  <div className={`text-[13px] font-semibold ${hasEnough ? 'text-warm-900 dark:text-warm-100' : 'text-warm-600 dark:text-warm-400'}`}>활용도 분석</div>
                  <div className="text-[10px] text-warm-500 dark:text-warm-400 mt-0.5">{hasEnough ? '아이템별 등급 확인' : '아이템 등록 필요'}</div>
                </button>
              </div>
            </div>
          )
        })()}

        {/* ═══ 구분선 ═══ */}
        <div className="h-px bg-warm-300 dark:bg-warm-600 mb-5" />

        {/* ═══ 보유 아이템 요약 ═══ */}
        <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">내 옷장 아이템</div>
        <div className="p-3.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl mb-5 shadow-warm-sm">
          {catOrder.map(cat => {
            const arr = byCat[cat] || []
            return (
              <div key={cat} className="flex items-center gap-2 py-1 text-[13px]">
                <span>{arr.length > 0 ? '✅' : '➖'}</span>
                <span className="w-[60px] font-semibold text-warm-900 dark:text-warm-100">{(CATEGORY_NAMES as any)[cat] || cat}</span>
                <span className="flex gap-1 items-center">
                  {arr.length > 0 ? arr.slice(0, 4).map((it: any, i: number) => {
                    const c = COLORS_60[it.color]
                    return c ? <span key={i} className="inline-block w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: c.hex }} /> : null
                  }) : <span className="text-warm-500 dark:text-warm-400">없음 → 추천해줄게요</span>}
                  {arr.length > 4 && <span className="text-[11px] text-warm-600 dark:text-warm-400">+{arr.length - 4}</span>}
                </span>
              </div>
            )
          })}
        </div>

        {/* ═══ 레이어별 코디 생성 ═══ */}
        <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">레이어별 코디 생성</div>
        <div className="grid grid-cols-3 gap-2.5">
          {Object.entries(LAYER_LEVELS).slice(0, 6).map(([key, lvl]) => {
            const missingParts = lvl.partKeys.filter((k: string) => !byCat[k])
            return (
              <button
                key={key}
                onClick={() => { setLayerType(key); generate(key) }}
                className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3 text-center shadow-warm-sm active:scale-[0.97] transition-all"
              >
                <div className="text-[12px] font-semibold text-warm-900 dark:text-warm-100 mb-1">{lvl.name}</div>
                <div className="text-[10px] text-warm-500 dark:text-warm-400">{lvl.parts.join('+')}</div>
                {missingParts.length > 0 && (
                  <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-1">{missingParts.length}개 추천</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 결과 화면
  return (
    <div className="animate-screen-enter px-5 pt-2 pb-10">
      <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">내 옷 코디 결과</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">옷장 아이템 기반 {results?.length || 0}개 조합</p>

      {(() => {
        const layer = LAYER_LEVELS[layerType]
        const missing = layer?.partKeys.filter((k: string) => !byCat[k]) || []
        if (missing.length === 0) return null
        return (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Lightbulb size={14} className="flex-shrink-0 mt-0.5" />
            <span><b>{missing.map((k: string) => (CATEGORY_NAMES as any)[k]).join(', ')}</b>은(는) 옷장에 없어서 어울리는 색상을 추천했어요</span>
          </div>
        )
      })()}

      <button
        onClick={() => generate(layerType)}
        className="w-full flex items-center justify-center gap-1.5 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-800 dark:text-warm-200 shadow-warm-sm active:scale-[0.98] transition-all mb-4"
      >
        <RefreshCw size={16} /> 새로 조합하기
      </button>

      <div className="flex flex-col gap-3">
        {(results || []).map((combo, idx) => (
          <div key={idx} className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 shadow-warm-sm">
            <div className="flex items-center gap-3">
              <MannequinSVG outfit={combo.outfitHex} size={80} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-display text-sm font-bold text-terra-600 dark:text-terra-400">{combo.score}점</span>
                </div>
                {Object.entries(combo.outfit).map(([part, colorKey]) => {
                  const c = COLORS_60[colorKey as string]
                  const owned = byCat[part]?.some((i: any) => i.color === colorKey)
                  return c ? (
                    <div key={part} className="flex items-center gap-1.5 text-xs mb-0.5">
                      <span className="w-3.5 h-3.5 rounded border border-warm-400 dark:border-warm-500" style={{ background: c.hex }} />
                      <span className="text-warm-500 dark:text-warm-400 w-8">{(CATEGORY_NAMES as any)[part]?.slice(0, 2)}</span>
                      <span className="text-warm-800 dark:text-warm-200">{c.name}</span>
                      {!owned && <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1 rounded">추천</span>}
                    </div>
                  ) : null
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => { setLayerType(null); setResults(null) }}
        className="w-full py-3 mt-4 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 text-warm-700 dark:text-warm-300 rounded-2xl font-medium text-sm active:scale-[0.98] transition-all"
      >
        돌아가기
      </button>
    </div>
  )
}
