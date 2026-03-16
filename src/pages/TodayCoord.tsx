// @ts-nocheck
// ═══════════════════════════════════════════════════════
// TodayCoord.tsx — "오늘 뭐 입지?" 결과 페이지
// 옷장 기반 3개 추천 + 상황 필터 + 마네킹 카드
// ═══════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Shirt, Calendar } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { COLORS_60 } from '@/lib/colors'
import { CATEGORY_NAMES } from '@/lib/categories'
import { useTodayCoord, SITUATION_OPTIONS, type TodayCoordResult } from '@/hooks/useTodayCoord'
import { useWeather } from '@/hooks/useWeather'
import { getScorePercentile } from '@/hooks/useWardrobe'
import { useTranslation } from 'react-i18next'

export default function TodayCoord() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { weather } = useWeather()
  const today = useTodayCoord()
  const [activeIdx, setActiveIdx] = useState(0)

  // 초기 생성
  useEffect(() => {
    today.generate(weather)
  }, [])

  // 상황 변경 시 재생성
  const handleSituation = (key: typeof today.situation) => {
    today.setSituation(key)
    setActiveIdx(0)
    today.generate(weather, key)
  }

  // 옷장 아이템 부족
  const wardrobeCount = (() => {
    try { return JSON.parse(localStorage.getItem('sp_wardrobe') || '[]').length } catch { return 0 }
  })()

  if (wardrobeCount < 3) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center">
        <div className="py-16">
          <Shirt size={48} className="text-warm-400 mx-auto mb-4" />
          <div className="text-base font-semibold text-warm-700 dark:text-warm-300 mb-2">{t('todayCoord.needMoreItems')}</div>
          <div className="text-sm text-warm-500 dark:text-warm-400 mb-6">{t('todayCoord.needMoreItemsDesc')}</div>
          <button onClick={() => navigate('/closet/add')} className="px-6 py-3 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">
            {t('common.itemRegister')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 타이틀 */}
      <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">{t('todayCoord.title')}</h2>
      <p className="text-sm text-warm-500 dark:text-warm-400 mb-4">{t('todayCoord.subtitle')}</p>

      {/* 상황 필터 칩 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 hide-scrollbar">
        {SITUATION_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => handleSituation(opt.key)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
              today.situation === opt.key
                ? 'bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 shadow-sm'
                : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {today.loading && (
        <div className="flex flex-col items-center py-16">
          <div className="w-10 h-10 border-2 border-terra-300 border-t-terra-500 rounded-full animate-spin mb-4" />
          <div className="text-sm text-warm-500">{t('todayCoord.analyzingCloset')}</div>
        </div>
      )}

      {/* 결과 없음 */}
      {!today.loading && today.results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">🤔</div>
          <div className="text-sm text-warm-600 dark:text-warm-400 mb-2">{t('todayCoord.noResults')}</div>
          <div className="text-xs text-warm-500 dark:text-warm-400">{t('todayCoord.noResultsDesc')}</div>
        </div>
      )}

      {/* 결과 카드 */}
      {!today.loading && today.results.length > 0 && (
        <>
          {/* 카드 인디케이터 */}
          <div className="flex justify-center gap-1.5 mb-4">
            {today.results.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all ${activeIdx === idx ? 'bg-terra-500 w-5' : 'bg-warm-300 dark:bg-warm-600'}`}
              />
            ))}
          </div>

          {/* 카드 캐러셀 */}
          <div className="relative">
            {/* 이전 버튼 */}
            {activeIdx > 0 && (
              <button onClick={() => setActiveIdx(activeIdx - 1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 rounded-full bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600 shadow-warm-sm flex items-center justify-center active:scale-90 transition-all">
                <ChevronLeft size={16} className="text-warm-600" />
              </button>
            )}
            {/* 다음 버튼 */}
            {activeIdx < today.results.length - 1 && (
              <button onClick={() => setActiveIdx(activeIdx + 1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 rounded-full bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600 shadow-warm-sm flex items-center justify-center active:scale-90 transition-all">
                <ChevronRight size={16} className="text-warm-600" />
              </button>
            )}

            <CoordCard
              result={today.results[activeIdx]}
              rank={activeIdx + 1}
              total={today.results.length}
              navigate={navigate}
            />
          </div>

          {/* 다시 생성 버튼 */}
          <button
            onClick={() => { setActiveIdx(0); today.generate(weather) }}
            className="w-full mt-4 py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl text-sm font-medium text-warm-700 dark:text-warm-300 active:scale-[0.98] transition-all"
          >
            {t('todayCoord.viewOther')}
          </button>
        </>
      )}
    </div>
  )
}

// ─── 코디 카드 컴포넌트 ───

function CoordCard({ result, rank, total, navigate }: {
  result: TodayCoordResult
  rank: number
  total: number
  navigate: any
}) {
  const { t } = useTranslation()
  const outfitHex: Record<string, string> = {}
  Object.entries(result.outfit).forEach(([k, v]) => {
    if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
  })

  const pct = getScorePercentile(result.adjustedScore)

  const scoreColor = result.adjustedScore >= 85 ? 'text-green-600 bg-green-50 border-green-200'
    : result.adjustedScore >= 70 ? 'text-terra-600 bg-terra-50 border-terra-200'
    : 'text-warm-600 bg-warm-100 border-warm-300'

  // OOTD 기록으로 이동 (outfit 프리셋)
  const handleRecord = () => {
    // 컬러 데이터를 OOTD 편집 형태로 변환
    const tempRecord = {
      id: '_today_' + Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      colors: result.outfit,
      photos: [],
      score: result.adjustedScore,
      weather: '',
      weatherData: null,
      situation: null,
      mood: null,
      memo: '',
      visibility: 'private',
      showInstagram: false,
      postId: null,
      createdAt: Date.now(),
    }
    localStorage.setItem('_ootd_edit', JSON.stringify(tempRecord))
    navigate('/record?edit=' + tempRecord.id)
  }

  return (
    <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm animate-screen-fade">
      {/* 상단: 순위 + 점수 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-warm-500 dark:text-warm-400">{rank}/{total}</span>
          {rank === 1 && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">{t('todayCoord.best')}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-display text-xl font-bold ${scoreColor} px-2.5 py-0.5 rounded-lg border`}>
            {result.adjustedScore}점
          </span>
          {pct && (
            <span className="text-[10px] font-semibold bg-terra-100 text-terra-600 dark:bg-terra-900/30 dark:text-terra-400 px-2 py-0.5 rounded-full">{pct.label}</span>
          )}
        </div>
      </div>

      {/* 마네킹 + 아이템 목록 */}
      <div className="flex items-center gap-5 px-4 pb-3">
        <div className="bg-warm-100 dark:bg-warm-700 rounded-2xl p-4 flex-shrink-0">
          <MannequinSVG outfit={outfitHex} size={120} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {Object.entries(result.outfit).filter(([_, v]) => v).map(([part, colorKey]) => {
            const c = COLORS_60[colorKey]
            if (!c) return null
            return (
              <div key={part} className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: c.hex }} />
                <span className="text-warm-500 dark:text-warm-400 w-10">{(CATEGORY_NAMES as any)?.[part] || part}</span>
                <span className="text-warm-800 dark:text-warm-200 font-medium">{c.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 인상 레이블 */}
      <div className="px-4 pb-2">
        <span className="text-[11px] text-warm-500 dark:text-warm-400 italic">{result.impressionLabel}</span>
      </div>

      {/* reasons */}
      {result.reasons.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {result.reasons.map((reason, idx) => (
            <span key={idx} className="text-[10px] bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 px-2.5 py-1 rounded-full">
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="border-t border-warm-200 dark:border-warm-600 px-4 py-3">
        <button
          onClick={handleRecord}
          className="w-full py-3 bg-terra-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra"
        >
          <Calendar size={16} /> {t('todayCoord.recordThis')}
        </button>
      </div>
    </div>
  )
}
