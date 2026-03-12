// @ts-nocheck
// ═══════════════════════════════════════════════════════
// WardrobeReport.tsx — 내 옷장 이야기
// 스토리텔링 형태: 활약 아이템 / 숨은 가능성 / 컬러 밸런스
// ═══════════════════════════════════════════════════════
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ShoppingBag, Shirt, Sparkles } from 'lucide-react'
import { COLORS_60 } from '@/lib/colors'
import { CATEGORY_NAMES } from '@/lib/categories'
import { useWardrobe } from '@/hooks/useWardrobe'

export default function WardrobeReport() {
  const navigate = useNavigate()
  const wardrobe = useWardrobe()
  const [analyzing, setAnalyzing] = useState(true)
  const [progress, setProgress] = useState(0)
  const [itemStats, setItemStats] = useState([])
  const [totalCombos, setTotalCombos] = useState(0)

  // 각 아이템이 포함된 고점수 코디 수 계산
  useEffect(() => {
    if (wardrobe.items.length < 3) { setAnalyzing(false); return }

    const allCombos = wardrobe.generateAllCombos({ maxCombos: 800 })
    setTotalCombos(allCombos.length)
    const items = wardrobe.items.filter(i => (i.color || i.colorKey) && COLORS_60[i.color || i.colorKey])
    const total = items.length
    const stats = []
    let idx = 0

    function processChunk() {
      const end = Math.min(idx + 5, total)
      for (let i = idx; i < end; i++) {
        const item = items[i]
        const cat = item.category
        const color = item.color || item.colorKey
        const inCombos = allCombos.filter(c => c.outfit[cat] === color)
        const highScore = inCombos.filter(c => c.score >= 75)
        let bestPartner = null
        if (inCombos.length > 0) {
          const best = inCombos[0]
          const partner = Object.entries(best.outfit).find(([k, v]) => k !== cat && v)
          if (partner) bestPartner = { category: partner[0], color: partner[1], score: best.score }
        }
        stats.push({ item, inCombos: inCombos.length, highScore: highScore.length, bestPartner })
      }
      idx = end
      setProgress(Math.round((idx / total) * 100))
      if (idx < total) { requestAnimationFrame(processChunk) }
      else { stats.sort((a, b) => b.inCombos - a.inCombos); setItemStats(stats); setAnalyzing(false) }
    }
    requestAnimationFrame(processChunk)
  }, [wardrobe.items])

  // 가장 활약하는 아이템 (상위 3개)
  const mvpItems = itemStats.slice(0, 3)

  // 숨은 가능성 아이템 (코디 수 적은 것)
  const hiddenPotential = itemStats.filter(s => s.inCombos <= 2 && s.inCombos > 0)
  const noComboItems = itemStats.filter(s => s.inCombos === 0)

  // 컬러 밸런스
  const colorBalance = useMemo(() => {
    const warmKeys = ['red', 'orange', 'coral', 'yellow', 'gold', 'mustard', 'brown', 'camel', 'beige', 'cream', 'ivory', 'terracotta', 'rust', 'burgundy', 'wine', 'olive', 'khaki', 'tan', 'taupe', 'cognac', 'sienna', 'brick', 'amber', 'burnt_orange']
    const coolKeys = ['blue', 'navy', 'cobalt', 'indigo', 'purple', 'lavender', 'plum', 'mint', 'teal', 'emerald', 'royal_blue', 'cyan', 'powder_blue', 'steel_blue', 'sage', 'dark_blue', 'dark_teal', 'dark_purple']
    let warm = 0, cool = 0, neutral = 0
    wardrobe.items.forEach(i => {
      const c = i.color || i.colorKey
      if (!c) return
      if (warmKeys.includes(c)) warm++
      else if (coolKeys.includes(c)) cool++
      else neutral++
    })
    const total = warm + cool + neutral || 1
    return {
      warm, cool, neutral, total,
      warmPct: Math.round((warm / total) * 100),
      coolPct: Math.round((cool / total) * 100),
      neutralPct: Math.round((neutral / total) * 100),
      bias: warm > cool * 1.5 ? 'warm' : cool > warm * 1.5 ? 'cool' : 'balanced'
    }
  }, [wardrobe.items])

  if (analyzing) {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10">
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-6">내 옷장 이야기</h2>
        <div className="py-16 flex flex-col items-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" className="text-warm-300 dark:text-warm-600" strokeWidth={8} />
              <circle cx={60} cy={60} r={52} fill="none" stroke="currentColor" className="text-terra-500" strokeWidth={8}
                strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-sm font-bold text-warm-700 dark:text-warm-300">{progress}%</span>
            </div>
          </div>
          <div className="text-sm text-warm-500">옷장 분석 중...</div>
        </div>
      </div>
    )
  }

  if (wardrobe.items.length < 3) {
    return (
      <div className="animate-screen-fade px-5 pt-2 pb-10 text-center py-20">
        <div className="text-3xl mb-3">👕</div>
        <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">옷장에 아이템을 3개 이상 등록해주세요</div>
        <button onClick={() => navigate('/closet/add')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all">아이템 등록하기</button>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={20} className="text-warm-700 dark:text-warm-300" />
        <h2 className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">내 옷장 이야기</h2>
      </div>
      <p className="text-sm text-warm-500 dark:text-warm-400 mb-5">
        옷장에 {wardrobe.items.length}개 아이템, 총 {totalCombos}개 코디 조합이 가능해요
      </p>

      {/* ─── 가장 활약하는 아이템 ─── */}
      {mvpItems.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">가장 활약하는 아이템</div>
          <div className="flex flex-col gap-2">
            {mvpItems.map((stat, idx) => {
              const c = COLORS_60[stat.item.color || stat.item.colorKey]
              const catLabel = (CATEGORY_NAMES)[stat.item.category] || ''
              const pct = totalCombos > 0 ? Math.round((stat.inCombos / totalCombos) * 100) : 0
              return (
                <div key={stat.item.id} className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-3.5 shadow-warm-sm">
                  <span className="text-sm font-bold text-warm-500 dark:text-warm-400 w-5 text-center">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-lg border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: c?.hex || '#ddd' }} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-warm-900 dark:text-warm-100">{c?.name || '?'} {catLabel}</div>
                    <div className="text-[11px] text-warm-500 dark:text-warm-400">{stat.inCombos}개 코디에 활용 ({pct}%)</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── 아직 가능성이 숨어있는 아이템 ─── */}
      {(hiddenPotential.length > 0 || noComboItems.length > 0) && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">아직 가능성이 숨어있는 아이템</div>
          <div className="flex flex-col gap-2">
            {[...hiddenPotential, ...noComboItems].slice(0, 5).map(stat => {
              const c = COLORS_60[stat.item.color || stat.item.colorKey]
              const catLabel = (CATEGORY_NAMES)[stat.item.category] || ''
              return (
                <div key={stat.item.id} className="bg-warm-50 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border border-warm-300 dark:border-warm-500 flex-shrink-0" style={{ background: c?.hex || '#ddd' }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-warm-800 dark:text-warm-200">{c?.name || '?'} {catLabel}</div>
                      <div className="text-[11px] text-warm-500 dark:text-warm-400">
                        {stat.inCombos === 0 ? '아직 어울리는 조합이 없어요' : `코디 ${stat.inCombos}개로 적어요`}
                      </div>
                    </div>
                  </div>
                  {stat.bestPartner && (
                    <div className="mt-2 pl-12 text-[11px] text-warm-600 dark:text-warm-400">
                      베스트 조합: {COLORS_60[stat.bestPartner.color]?.name || '?'} {(CATEGORY_NAMES)[stat.bestPartner.category] || ''} ({stat.bestPartner.score}점)
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── 옷장 컬러 밸런스 ─── */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-3">옷장 컬러 밸런스</div>
        <div className="bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl p-4 shadow-warm-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">{colorBalance.bias === 'warm' ? '🔥' : colorBalance.bias === 'cool' ? '❄️' : '⚖️'}</span>
            <span className="text-sm font-semibold text-warm-900 dark:text-warm-100">
              {colorBalance.bias === 'warm' ? '웜톤 중심' : colorBalance.bias === 'cool' ? '쿨톤 중심' : '균형 잡힌 밸런스'}
            </span>
          </div>

          {/* 바 그래프 */}
          <div className="flex gap-1 h-4 rounded-full overflow-hidden mb-2">
            {colorBalance.warmPct > 0 && <div className="bg-amber-400 rounded-l-full" style={{ width: `${colorBalance.warmPct}%` }} />}
            {colorBalance.neutralPct > 0 && <div className="bg-warm-400" style={{ width: `${colorBalance.neutralPct}%` }} />}
            {colorBalance.coolPct > 0 && <div className="bg-blue-400 rounded-r-full" style={{ width: `${colorBalance.coolPct}%` }} />}
          </div>
          <div className="flex justify-between text-[10px] text-warm-500 dark:text-warm-400">
            <span>웜톤 {colorBalance.warmPct}%</span>
            <span>뉴트럴 {colorBalance.neutralPct}%</span>
            <span>쿨톤 {colorBalance.coolPct}%</span>
          </div>

          {colorBalance.bias === 'warm' && colorBalance.coolPct < 20 && (
            <div className="mt-3 text-[11px] text-warm-600 dark:text-warm-400">
              <Sparkles size={12} className="inline text-terra-500 mr-1" />
              쿨톤(네이비, 스틸블루 등)을 추가하면 밸런스가 좋아져요
            </div>
          )}
          {colorBalance.bias === 'cool' && colorBalance.warmPct < 20 && (
            <div className="mt-3 text-[11px] text-warm-600 dark:text-warm-400">
              <Sparkles size={12} className="inline text-terra-500 mr-1" />
              웜톤(베이지, 카멜 등)을 추가하면 밸런스가 좋아져요
            </div>
          )}
        </div>
      </div>

      {/* ─── 다음 스텝 ─── */}
      <div className="flex flex-col gap-2.5">
        <button onClick={() => navigate('/closet/combos')} className="w-full py-3 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-terra">
          <Shirt size={16} /> 전체 조합 보기
        </button>
        <button onClick={() => navigate('/closet/simulate')} className="w-full py-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl font-medium text-sm text-warm-700 dark:text-warm-300 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <ShoppingBag size={16} /> 뭘 사면 좋을지 확인하기
        </button>
      </div>
    </div>
  )
}
