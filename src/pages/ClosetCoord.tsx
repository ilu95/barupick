// @ts-nocheck
// ═══════════════════════════════════════════════════════
// ClosetCoord.tsx — 내 옷 코디 허브
// 전체 조합 / 뭘 사면 좋을까 / 내 옷장 이야기
// ═══════════════════════════════════════════════════════
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shirt, ShoppingBag, BarChart3, ChevronRight, Plus } from 'lucide-react'
import { COLORS_60 } from '@/lib/colors'
import { CATEGORY_NAMES } from '@/lib/categories'

export default function ClosetCoord() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const items = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sp_wardrobe') || '[]') } catch { return [] }
  }, [])

  const catMap = { '상의': 'top', '하의': 'bottom', '아우터': 'outer', '미들웨어': 'middleware', '신발': 'shoes' }
  const byCat = useMemo(() => {
    const map = {}
    items.forEach(i => {
      const eng = catMap[i.category] || i.category
      if (!map[eng]) map[eng] = []
      const color = i.color || i.colorKey
      if (color && COLORS_60[color]) map[eng].push({ ...i, color })
    })
    return map
  }, [items])
  const catOrder = ['outer', 'middleware', 'top', 'bottom', 'shoes']

  const hasEnough = items.length >= 3
  const needed = Math.max(0, 3 - items.length)

  if (items.length === 0) {
    return (
      <div className="animate-screen-fade px-5 pt-6 pb-10 text-center py-20">
        <div className="text-4xl mb-3">👕</div>
        <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">{t('closet.emptyCloset')}</div>
        <button onClick={() => navigate('/closet/add')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">
          {t('common.itemRegister')}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      <h2 className="font-display text-lg font-bold text-warm-900 dark:text-warm-100 tracking-tight mb-1">{t('closetCoord.title')}</h2>
      <p className="text-sm text-warm-600 dark:text-warm-400 mb-5">{t('closetCoord.subtitle')}</p>

      {/* ═══ 기능 카드 ═══ */}
      <div className="flex flex-col gap-2.5 mb-6">
        {/* 전체 조합 보기 — 핵심 */}
        <button
          onClick={() => hasEnough ? navigate('/closet/combos') : navigate('/closet/add')}
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
            <div className={`text-[15px] font-bold tracking-tight ${hasEnough ? 'text-amber-800 dark:text-amber-200' : 'text-warm-700 dark:text-warm-300'}`}>{t('closetCoord.allCombos')}</div>
            <div className="text-[11px] text-warm-600 dark:text-warm-400 mt-0.5">
              {hasEnough ? t('closetCoord.allCombosDesc') : t('closet.itemCount', { count: needed })}
            </div>
          </div>
          <ChevronRight size={16} className={hasEnough ? 'text-amber-500' : 'text-warm-400'} />
        </button>

        {/* 2열: 뭘 사면 좋을까 + 옷장 이야기 */}
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
            <div className={`text-[13px] font-semibold ${hasEnough ? 'text-warm-900 dark:text-warm-100' : 'text-warm-600 dark:text-warm-400'}`}>{t('closetCoord.whatToBuy')}</div>
            <div className="text-[10px] text-warm-500 dark:text-warm-400 mt-0.5">{hasEnough ? t('closetCoord.whatToBuyDesc') : t('closet.itemCount', { count: needed })}</div>
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
            <div className={`text-[13px] font-semibold ${hasEnough ? 'text-warm-900 dark:text-warm-100' : 'text-warm-600 dark:text-warm-400'}`}>{t('closetCoord.wardrobeReport')}</div>
            <div className="text-[10px] text-warm-500 dark:text-warm-400 mt-0.5">{hasEnough ? t('closetCoord.wardrobeReportDesc') : t('closet.itemCount', { count: needed })}</div>
          </button>
        </div>
      </div>

      {/* ═══ 구분선 ═══ */}
      <div className="h-px bg-warm-300 dark:bg-warm-600 mb-5" />

      {/* ═══ 옷장 아이템 요약 ═══ */}
      <div className="text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-widest uppercase mb-2">{t('closet.myCloset')}</div>
      <div className="p-3.5 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl mb-4 shadow-warm-sm">
        {catOrder.map(cat => {
          const arr = byCat[cat] || []
          return (
            <div key={cat} className="flex items-center gap-2 py-1 text-[13px]">
              <span>{arr.length > 0 ? '✅' : '➖'}</span>
              <span className="w-[60px] font-semibold text-warm-900 dark:text-warm-100">{(CATEGORY_NAMES)[cat] || cat}</span>
              <span className="flex gap-1 items-center">
                {arr.length > 0 ? arr.slice(0, 4).map((it, i) => {
                  const c = COLORS_60[it.color]
                  return c ? <span key={i} className="inline-block w-3.5 h-3.5 rounded-full border border-black/10" style={{ background: c.hex }} /> : null
                }) : <span className="text-warm-500 dark:text-warm-400">-</span>}
                {arr.length > 4 && <span className="text-[11px] text-warm-600 dark:text-warm-400">+{arr.length - 4}</span>}
              </span>
            </div>
          )
        })}
      </div>

      <button onClick={() => navigate('/closet/add')} className="w-full py-3 bg-warm-100 dark:bg-warm-700 border border-dashed border-warm-400 dark:border-warm-500 rounded-2xl text-sm font-medium text-warm-600 dark:text-warm-400 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all">
        <Plus size={16} /> {t('common.itemRegister')}
      </button>
    </div>
  )
}
