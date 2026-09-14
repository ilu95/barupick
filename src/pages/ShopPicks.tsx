import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Browser } from '@capacitor/browser'
import { getColorName } from '@/lib/colors'
import type { ShopProduct } from '@/lib/shop'

// ================================================================
// /shop/picks — 결과 화면 "없는 옷이 있다면" 버튼이 이어지는 상품 목록.
// StepResult 가 이미 findShopMatches 로 구한 결과를 sessionStorage(sp_shop_picks)
// 로 넘긴다 — 여기서 다시 조회하지 않는다. cafe24_url 은 조립하지 않고 그대로 연다.
// ================================================================

interface ShopPicksPayload { subcat: string; colorKey: string; products: ShopProduct[] }

export default function ShopPicks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [payload] = useState<ShopPicksPayload | null>(() => {
    try { const raw = sessionStorage.getItem('sp_shop_picks'); return raw ? JSON.parse(raw) : null } catch { return null }
  })

  const backBtn = (
    <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="w-9 h-9 rounded-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 flex items-center justify-center active:scale-90">
      <ArrowLeft size={16} />
    </button>
  )

  if (!payload || payload.products.length === 0) {
    return (
      <div className="animate-screen-fade px-5 pt-3 pb-10">
        <div className="mb-4">{backBtn}</div>
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🧺</div>
          <div className="text-sm text-warm-600 dark:text-warm-400 mb-5">{t('shop.picks.empty')}</div>
          <button onClick={() => navigate('/home')} className="px-5 py-2.5 rounded-full bg-terra-500 text-white text-sm font-semibold active:scale-95">{t('shop.picks.backHome')}</button>
        </div>
      </div>
    )
  }

  const title = t('shop.picks.title', { color: getColorName(payload.colorKey), item: payload.subcat, n: payload.products.length })
  const open = (p: ShopProduct) => { Browser.open({ url: p.cafe24_url }).catch(() => {}) }

  return (
    <div className="animate-screen-fade px-5 pt-3 pb-10">
      <div className="flex items-center gap-2 mb-4">
        {backBtn}
        <h1 className="font-display text-[19px] font-bold tracking-tight text-warm-900 dark:text-warm-100 flex-1">{title}</h1>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {payload.products.map((p, i) => (
          <button key={i} onClick={() => open(p)} className="text-left bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm active:scale-[0.98] transition-all">
            <div className="aspect-square bg-warm-100 dark:bg-warm-700 flex items-center justify-center overflow-hidden">
              {p.image_url ? <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" /> : <span className="text-2xl">👕</span>}
            </div>
            <div className="p-2.5">
              <div className="text-[12px] font-semibold text-warm-900 dark:text-warm-100 leading-tight line-clamp-2">{p.product_name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                {p.price != null && <span className="text-[13px] font-bold text-warm-900 dark:text-warm-100">{p.price.toLocaleString()}원</span>}
                {p.original_price != null && p.price != null && p.original_price > p.price && (
                  <span className="text-[11px] text-warm-400 line-through">{p.original_price.toLocaleString()}원</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
