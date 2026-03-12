// @ts-nocheck
// ═══════════════════════════════════════════════════════
// WardrobeReport.tsx — 옷장 활용도 리포트
// 각 아이템의 코디 활용도를 분석하고 등급 부여
// ═══════════════════════════════════════════════════════
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ChevronRight, ShoppingBag, Sparkles } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { CATEGORY_NAMES } from '@/lib/categories'
import { useWardrobe } from '@/hooks/useWardrobe'

interface ItemReport {
  item: any
  highScoreCombos: number
  avgScore: number
  grade: 'high' | 'medium' | 'low'
  bestPartner?: { category: string; color: string; score: number }
}

const GRADE_UI = {
  high: { label: '핵심', emoji: '⭐', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  medium: { label: '보통', emoji: '👌', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-700' },
  low: { label: '낮음', emoji: '💤', bg: 'bg-warm-100 dark:bg-warm-700', text: 'text-warm-600 dark:text-warm-400', border: 'border-warm-300 dark:border-warm-600' },
}

export default function WardrobeReport() {
  const navigate = useNavigate()
  const wardrobe = useWardrobe()
  const [reports, setReports] = useState<ItemReport[]>([])
  const [analyzing, setAnalyzing] = useState(true)
  const [progress, setProgress] = useState(0)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  // 분석 실행
  useEffect(() => {
    if (wardrobe.items.length < 3) {
      setAnalyzing(false)
      return
    }

    const items = wardrobe.items.filter(i => (i.color || i.colorKey) && COLORS_60[i.color || i.colorKey])
    const total = items.length
    const results: ItemReport[] = []
    let idx = 0

    // 청크 단위 비동기 처리 (UI 블로킹 방지)
    function processChunk() {
      const chunkSize = 3
      const end = Math.min(idx + chunkSize, total)

      for (let i = idx; i < end; i++) {
        const item = items[i]
        try {
          const util = wardrobe.calculateItemUtility(item)
          results.push({ item, ...util })
        } catch {
          results.push({ item, highScoreCombos: 0, avgScore: 0, grade: 'low' })
        }
      }

      idx = end
      setProgress(Math.round((idx / total) * 100))

      if (idx < total) {
        requestAnimationFrame(processChunk)
      } else {
        // 등급별 정렬: high → medium → low, 같은 등급 내에서 highScoreCombos 내림차순
        const order = { high: 0, medium: 1, low: 2 }
        results.sort((a, b) => order[a.grade] - order[b.grade] || b.highScoreCombos - a.highScoreCombos)
        setReports(results)
        setAnalyzing(false)
      }
    }

    requestAnimationFrame(processChunk)
  }, [wardrobe.items])

  // 요약 통계
  const summary = useMemo(() => {
    const high = reports.filter(r => r.grade === 'high').length
    const medium = reports.filter(r => r.grade === 'medium').length
    const low = reports.filter(r => r.grade === 'low').length
    return { high, medium, low, total: reports.length }
  }, [reports])

  // 부족한 색상 계산 (옷장에 없는 색상 중 많은 아이템과 어울릴 색상)
  const missingColors = useMemo(() => {
    if (reports.length === 0) return []
    const existing = new Set(wardrobe.items.map(i => i.color || i.colorKey).filter(Boolean))
    // low 등급 아이템의 bestPartner 색상 중 옷장에 없는 것
    const suggestions: Record<string, number> = {}
    reports.filter(r => r.grade === 'low' && r.bestPartner).forEach(r => {
      const color = r.bestPartner!.color
      if (!existing.has(color) && COLORS_60[color]) {
        suggestions[color] = (suggestions[color] || 0) + 1
      }
    })
    return Object.entries(suggestions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([colorKey, count]) => ({ colorKey, count }))
  }, [reports, wardrobe.items])

  const filtered = filter === 'all' ? reports : reports.filter(r => r.grade === filter)

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={20} className="text-warm-700 dark:text-warm-300" />
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">옷장 활용도 분석</h2>
      </div>
      <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">각 아이템이 만들 수 있는 고점수(75+) 코디 수 기준</p>

      {/* 분석 중 */}
      {analyzing && (
        <div className="py-16">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx={60} cy={60} r={52} fill="none" stroke="#E7E5E4" strokeWidth={8} />
              <circle cx={60} cy={60} r={52} fill="none" stroke="#C2785C" strokeWidth={8}
                strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
                strokeLinecap="round" className="transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-sm font-bold text-warm-700 dark:text-warm-300">{progress}%</span>
            </div>
          </div>
          <div className="text-center text-sm text-warm-500">옷장 분석 중...</div>
        </div>
      )}

      {/* 아이템 부족 */}
      {!analyzing && reports.length === 0 && (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">👕</div>
          <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">옷장에 아이템을 3개 이상 등록해주세요</div>
          <button onClick={() => navigate('/closet/add')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all">아이템 등록하기</button>
        </div>
      )}

      {/* 결과 */}
      {!analyzing && reports.length > 0 && (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl py-3 text-center">
              <div className="text-xl font-bold text-green-700 dark:text-green-400 font-display">{summary.high}</div>
              <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">⭐ 핵심 아이템</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl py-3 text-center">
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400 font-display">{summary.medium}</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">👌 보통</div>
            </div>
            <div className="bg-warm-100 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 rounded-xl py-3 text-center">
              <div className="text-xl font-bold text-warm-600 dark:text-warm-400 font-display">{summary.low}</div>
              <div className="text-[10px] text-warm-500 font-medium">💤 활용도 낮음</div>
            </div>
          </div>

          {/* 부족한 색상 제안 → 구매 시뮬레이션 연결 */}
          {missingColors.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">
                <Sparkles size={14} /> 이 색상을 추가하면 활용도가 올라가요
              </div>
              <div className="flex gap-2.5">
                {missingColors.map(({ colorKey, count }) => {
                  const c = COLORS_60[colorKey]
                  if (!c) return null
                  return (
                    <button
                      key={colorKey}
                      onClick={() => navigate(`/closet/simulate?color=${colorKey}`)}
                      className="flex flex-col items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl border-2 border-amber-300 dark:border-amber-600" style={{ background: c.hex }} />
                      <span className="text-[10px] text-warm-700 dark:text-warm-300 font-medium">{c.name}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-[10px] text-warm-500 mt-2">탭하면 구매 시뮬레이션으로 이동해요</div>
            </div>
          )}

          {/* 필터 탭 */}
          <div className="flex gap-1.5 mb-4">
            {[
              { key: 'all', label: `전체 ${summary.total}` },
              { key: 'high', label: `⭐ 핵심 ${summary.high}` },
              { key: 'medium', label: `👌 보통 ${summary.medium}` },
              { key: 'low', label: `💤 낮음 ${summary.low}` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                  filter === tab.key
                    ? 'bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900'
                    : 'bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
                }`}
              >{tab.label}</button>
            ))}
          </div>

          {/* 아이템 리스트 */}
          <div className="flex flex-col gap-2">
            {filtered.map(report => {
              const colorKey = report.item.color || report.item.colorKey
              const c = colorKey ? COLORS_60[colorKey] : null
              const g = GRADE_UI[report.grade]
              const catLabel = (CATEGORY_NAMES as any)?.[report.item.category] || report.item.category
              const partnerColor = report.bestPartner ? COLORS_60[report.bestPartner.color] : null
              const partnerCat = report.bestPartner ? ((CATEGORY_NAMES as any)?.[report.bestPartner.category] || report.bestPartner.category) : null

              return (
                <div key={report.item.id} className={`bg-white dark:bg-warm-800 border ${g.border} rounded-2xl p-3.5 shadow-warm-sm`}>
                  <div className="flex items-center gap-3">
                    {/* 색상 블록 */}
                    {report.item.photoThumb ? (
                      <img src={report.item.photoThumb} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-warm-300" alt="" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl flex-shrink-0 border border-warm-300" style={{ background: c?.hex || '#ddd' }} />
                    )}

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold text-warm-900 dark:text-warm-100 truncate">{report.item.name || c?.name || '알 수 없음'}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${g.bg} ${g.text}`}>{g.emoji} {g.label}</span>
                      </div>
                      <div className="text-[11px] text-warm-500 dark:text-warm-400">
                        {catLabel} · 고점수 코디 {report.highScoreCombos}개 · 평균 {report.avgScore}점
                      </div>
                    </div>
                  </div>

                  {/* 베스트 파트너 (있을 때) */}
                  {report.bestPartner && partnerColor && (
                    <div className="flex items-center gap-2 mt-2.5 pl-14 text-[11px] text-warm-600 dark:text-warm-400">
                      <span>베스트 조합:</span>
                      <span className="w-3 h-3 rounded border border-warm-300" style={{ background: partnerColor.hex }} />
                      <span>{partnerCat} {partnerColor.name}</span>
                      <span className="font-display font-bold text-terra-600 dark:text-terra-400">{report.bestPartner.score}점</span>
                    </div>
                  )}

                  {/* low 등급 → 시뮬레이션 링크 */}
                  {report.grade === 'low' && (
                    <button
                      onClick={() => navigate('/closet/simulate')}
                      className="mt-2.5 pl-14 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium active:opacity-70"
                    >
                      <ShoppingBag size={12} /> 어울리는 아이템 찾기 →
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
