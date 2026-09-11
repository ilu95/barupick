import { setJSON } from '@/lib/storage'
import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLocale } from '@/i18n'
import { Calendar, Star, Trash2 } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { COLORS_60, getColorName } from '@/lib/colors'
import { plateName } from '@/lib/outfits'
import { HAT_NAMES } from '@/lib/builderSlots'
import { useOotd, type OotdRecord } from '@/hooks/useOotd'
import { loadWishlist, removeWish, boughtWish, wishName, type Wish } from '@/lib/closetAuto'
import { useScrollRestore } from '@/hooks/useScrollRestore'

type ClosetTab = 'wardrobe' | 'records'

export default function Closet() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [tab, setTab] = useState<ClosetTab>('wardrobe')

  useScrollRestore()

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 세그먼트 컨트롤 */}
      <div className="relative flex bg-warm-200 dark:bg-warm-800 rounded-full p-1 mb-5">
        <div
          className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-white dark:bg-warm-700 rounded-full shadow-warm-sm transition-transform duration-200"
          style={{ transform: tab === 'wardrobe' ? 'translateX(0)' : 'translateX(100%)' }}
        />
        <button
          onClick={() => setTab('wardrobe')}
          className={`relative z-10 flex-1 py-2.5 text-[13px] font-semibold text-center rounded-full transition-colors ${
            tab === 'wardrobe' ? 'text-warm-900 dark:text-warm-100' : 'text-warm-600 dark:text-warm-400'
          }`}
        >{t('closet.myCloset')}</button>
        <button
          onClick={() => setTab('records')}
          className={`relative z-10 flex-1 py-2.5 text-[13px] font-semibold text-center rounded-full transition-colors ${
            tab === 'records' ? 'text-warm-900 dark:text-warm-100' : 'text-warm-600 dark:text-warm-400'
          }`}
        >{t('closet.coordRecord')}</button>
      </div>

      {tab === 'wardrobe' && <WardrobeTab navigate={navigate} />}
      {tab === 'records' && <RecordsTab navigate={navigate} />}
    </div>
  )
}

// ═══════════════════════════════════════
// 내 옷장 탭
// ═══════════════════════════════════════
function WardrobeTab({ navigate }: { navigate: any }) {
  const { t, i18n } = useTranslation()
  const ko = (i18n.language || 'ko').startsWith('ko')
  const modal = useModal()
  const toast = useToast()
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_wardrobe') || '[]') } catch { return [] }
  })
  const [filter, setFilter] = useState<string>('all')
  const undoRef = useRef<{ id: string; item: any; timer: ReturnType<typeof setTimeout> } | null>(null)

  const getColor = (item: any) => item.color || item.colorKey || null
  const catOrder = ['outer', 'middleware', 'top', 'bottom', 'shoes', 'scarf', 'hat']
  const plateLabelOf = (plate: string) => HAT_NAMES[plate] ? HAT_NAMES[plate][ko ? 'ko' : 'en'] : plateName(plate)

  // localStorage 저장 헬퍼
  const persist = useCallback((nextItems: any[]) => {
    setJSON('sp_wardrobe', nextItems)
  }, [])

  const handleDelete = (id: string) => {
    const target = items.find((i: any) => i.id === id)
    if (!target) return
    const displayName = target.name || getColorName(getColor(target))

    modal.confirm({
      title: t('closet.deleteItem'),
      message: `"${displayName}"`,
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: () => {
        // 즉시 UI에서 제거
        const next = items.filter((i: any) => i.id !== id)
        setItems(next)
        persist(next)

        // 되돌리기 토스트 (5초)
        toast.toast({
          message: t('closet.deleteSuccess'),
          undoAction: () => {
            // 복원: 원래 위치에 다시 삽입
            const current = JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')
            current.push(target)
            setJSON('sp_wardrobe', current)
            setItems(current)
          },
        })
      },
    })
  }

  const hasTop = items.some((i: any) => i.category === 'top')
  const hasBottom = items.some((i: any) => i.category === 'bottom')
  const filtered = filter === 'all' ? items : items.filter((i: any) => i.category === filter)

  const renderItem = (item: any) => {
    const colorKey = getColor(item)
    const c = colorKey ? COLORS_60[colorKey] : null
    const fallbackName = [colorKey ? getColorName(colorKey) : '', item.plate ? plateLabelOf(item.plate) : ''].filter(Boolean).join(' ')
    const displayName = item.name || fallbackName || colorKey || ''
    const meta = [t('builder.slot.' + item.category), item.plate ? plateLabelOf(item.plate) : ''].filter(Boolean).join(' · ')
    const badge = item.source === 'coord' ? t('closet.fromCoord') : item.source === 'bought' ? t('closet.fromBought') : null

    return (
      <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl px-4 py-3 mb-2 shadow-warm-sm">
        {/* 썸네일 or 컬러 스와치 */}
        {item.photoThumb ? (
          <img src={item.photoThumb} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-warm-300" alt="" />
        ) : (
          <span className="w-10 h-10 rounded-full flex-shrink-0 border border-warm-300" style={{ background: c?.hex || '#ddd' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-warm-900 dark:text-warm-100 truncate">{displayName}</div>
          <div className="flex items-center gap-1 text-[11px] text-warm-500 dark:text-warm-400 mt-0.5 truncate">
            <span className="truncate">{meta}</span>
            {badge && <span className="flex-none ml-0.5 px-1.5 py-0.5 rounded-full bg-terra-50 dark:bg-terra-900/30 text-terra-700 dark:text-terra-300 text-[10px] font-semibold">{badge}</span>}
          </div>
        </div>
        <button onClick={() => handleDelete(item.id)} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg active:bg-warm-200 dark:active:bg-warm-700 transition-colors">
          <Trash2 size={15} className="text-warm-500" />
        </button>
      </div>
    )
  }

  // 살 옷 목록: 결과 화면에서 "없어요"로 뺀 옷. 사면 어떨까 → 구매 시뮬, 샀어요 → 옷장
  const [wishes, setWishes] = useState<Wish[]>(loadWishlist)
  const wishBlock = wishes.length > 0 && (
    <div className="bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3.5 mb-3 shadow-warm-sm">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-300">{t('closet.wish.title')}</span>
        <span className="text-[11px] text-warm-500">{t('closet.wish.hint')}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {wishes.map(w => (
          <div key={w.plate + w.colorKey} className="flex items-center gap-2">
            <i className="w-5 h-5 rounded-full border border-black/10 flex-none" style={{ background: COLORS_60[w.colorKey]?.hex }} />
            <div className="flex-1 min-w-0 text-[12.5px] font-semibold text-warm-900 dark:text-warm-100 truncate">{wishName(w)}</div>
            <button onClick={() => navigate(`/closet/simulate?category=${w.slot === 'inner' ? 'top' : w.slot}&color=${w.colorKey}`)} className="flex-none h-7 px-2.5 rounded-full bg-warm-100 dark:bg-warm-700 border border-warm-300 dark:border-warm-600 text-[11px] font-semibold text-warm-700 dark:text-warm-300 active:scale-95">{t('closet.wish.simulate')}</button>
            <button onClick={() => { boughtWish(w); setWishes(loadWishlist()); try { setItems(JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')) } catch {} toast.success(t('closet.wish.boughtToast')) }} className="flex-none h-7 px-2.5 rounded-full bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900 text-[11px] font-semibold active:scale-95">{t('closet.wish.bought')}</button>
            <button onClick={() => { removeWish(w); setWishes(loadWishlist()) }} aria-label={t('closet.wish.remove')} className="flex-none w-7 h-7 rounded-full flex items-center justify-center text-warm-400 active:bg-warm-200"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  )

  if (items.length === 0) {
    return (
      <div>
        {wishBlock}
        <div className="text-center py-16">
          <div className="text-sm font-semibold text-warm-800 dark:text-warm-200 mb-1.5">{t('closet.emptyCloset')}</div>
          <div className="text-[12.5px] text-warm-500 dark:text-warm-400 mb-5">{t('closet.empty.hint')}</div>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => navigate('/closet/add')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">{t('closet.empty.addManual')}</button>
            <button onClick={() => navigate('/home')} className="px-5 py-2.5 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-800 dark:text-warm-200 rounded-full text-sm font-semibold active:scale-95 transition-all">{t('closet.empty.goHome')}</button>
          </div>
        </div>
      </div>
    )
  }

  const needed = Math.max(0, 3 - items.length)
  const needsCards: { key: string; icon: string; enabled: boolean; go: () => void; hint?: string }[] = [
    { key: 'combos', icon: '🪄', enabled: hasTop && hasBottom, go: () => navigate('/closet/combos'), hint: t('closet.needs.needTopBottom') },
    { key: 'simulate', icon: '🛍', enabled: items.length >= 3, go: () => navigate('/closet/simulate'), hint: t('closet.itemCount', { count: needed }) },
    { key: 'report', icon: '📊', enabled: items.length >= 3, go: () => navigate('/closet/report'), hint: t('closet.itemCount', { count: needed }) },
    { key: 'add', icon: '➕', enabled: true, go: () => navigate('/closet/add') },
  ]

  const chip = (on: boolean) => `flex-none h-7 px-3 rounded-full text-[12px] font-semibold transition-all ${on ? 'bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-300 active:scale-95'}`

  return (
    <div>
      {wishBlock}

      {/* 옷장 요약 줄 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 hide-scrollbar -mx-5 px-5">
        {catOrder.map(cat => {
          const count = items.filter((i: any) => i.category === cat).length
          const label = t('builder.slot.' + cat)
          return count > 0 ? (
            <span key={cat} className="flex-none h-7 px-3 rounded-full text-[12px] font-semibold bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300 flex items-center">{label} {count}</span>
          ) : (
            <button key={cat} onClick={() => navigate(`/closet/add?category=${cat}`)} className="flex-none h-7 px-3 rounded-full text-[12px] font-semibold border border-dashed border-warm-400 dark:border-warm-600 text-warm-500 dark:text-warm-400 active:scale-95">{label} · {t('closet.summary.add')}</button>
          )
        })}
      </div>

      {/* 할 수 있는 일 */}
      <div className="mb-2 text-[13px] font-bold text-warm-900 dark:text-warm-100">{t('closet.needs.title')}</div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {needsCards.map(c => (
          <button
            key={c.key}
            onClick={() => c.enabled && c.go()}
            disabled={!c.enabled}
            className={`relative text-left bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3.5 shadow-warm-sm min-h-[104px] flex flex-col transition-all ${c.enabled ? 'active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'}`}
          >
            <span className="text-[22px] leading-none">{c.icon}</span>
            <span className="mt-2 text-[13.5px] font-extrabold text-warm-900 dark:text-warm-100 leading-tight">{t(`closet.needs.${c.key}.title`)}</span>
            <span className="mt-1 text-[11px] text-warm-500 leading-snug">{c.enabled ? t(`closet.needs.${c.key}.sub`) : c.hint}</span>
          </button>
        ))}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 hide-scrollbar">
        <button onClick={() => setFilter('all')} className={chip(filter === 'all')}>{t('common.all')} {items.length}</button>
        {catOrder.map(cat => {
          const count = items.filter((i: any) => i.category === cat).length
          if (count === 0) return null
          return (
            <button key={cat} onClick={() => setFilter(filter === cat ? 'all' : cat)} className={chip(filter === cat)}>{t('builder.slot.' + cat)} {count}</button>
          )
        })}
      </div>

      {/* 아이템 목록 — 전체면 자리별 그룹, 필터면 플랫 */}
      {filter === 'all' ? (
        catOrder.map(cat => {
          const catItems = items.filter((i: any) => i.category === cat)
          if (catItems.length === 0) return null
          return (
            <div key={cat} className="mb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-wide mb-2">
                {t('builder.slot.' + cat)} <span className="text-warm-500">{catItems.length}</span>
              </div>
              {catItems.map(renderItem)}
            </div>
          )
        })
      ) : (
        filtered.map(renderItem)
      )}
    </div>
  )
}

// ═══════════════════════════════════════
// 코디 기록 탭
// ═══════════════════════════════════════
function RecordsTab({ navigate }: { navigate: any }) {
  const { t } = useTranslation()
  const { getRecords } = useOotd()
  const records = getRecords()

  return (
    <div>
      {/* 캘린더 + 베스트 카드 */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <button
          onClick={() => navigate('/closet/calendar')}
          className="bg-white border border-warm-400 rounded-2xl p-4 text-center shadow-warm-sm active:scale-[0.97] transition-all"
        >
          <Calendar size={24} className="text-terra-500 mx-auto mb-2" />
          <div className="text-[13px] font-semibold text-warm-900">{t('header.calendar')}</div>
        </button>
        <button
          onClick={() => navigate('/closet/best')}
          className="bg-white border border-warm-400 rounded-2xl p-4 text-center shadow-warm-sm active:scale-[0.97] transition-all"
        >
          <Star size={24} className="text-terra-500 mx-auto mb-2" />
          <div className="text-[13px] font-semibold text-warm-900">{t('closet.bestCoordTitle')}</div>
          <div className="text-[10px] text-warm-500 mt-0.5">{t('closet.sortByScore')}</div>
        </button>
      </div>

      {/* 최근 기록 리스트 */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3">
        {t('home.recentOotd')} ({records.length})
      </div>

      {records.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {records.slice(0, 20).map(record => (
            <RecordCard key={record.id} record={record} navigate={navigate} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <div className="text-sm text-warm-600 mb-4">{t('home.noRecords')}</div>
          <button
            onClick={() => navigate('/record')}
            className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra"
          >{t('header.record')}</button>
        </div>
      )}
    </div>
  )
}

// ─── 기록 카드 ───
function RecordCard({ record, navigate }: { record: OotdRecord, navigate: any }) {
  const { t } = useTranslation()
  const outfitHex: Record<string, string> = {}
  Object.entries(record.colors || {}).forEach(([k, v]) => {
    if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
  })

  const dateLabel = (() => {
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')
    const [ty, tm, td] = todayStr.split('-').map(Number)
    const [ry, rm, rd] = (record.date || todayStr).split('-').map(Number)
    const todayMs = new Date(ty, tm - 1, td).getTime()
    const recMs = new Date(ry, rm - 1, rd).getTime()
    const diff = Math.floor((todayMs - recMs) / 86400000)
    if (diff === 0) return t('common.today')
    if (diff === 1) return t('common.yesterday')
    if (diff < 7) return t('common.daysAgoShort', { count: diff })
    return new Date(ry, rm - 1, rd).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })
  })()

  const hasPhoto = record.photos && record.photos.length > 0

  if (hasPhoto) {
    return (
      <button
        onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
        className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm active:scale-[0.98] transition-all text-left"
      >
        <img src={record.photos[0]} className="w-full aspect-[4/5] object-cover" alt="" />
        <div className="px-2.5 py-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-semibold text-warm-900 dark:text-warm-100">{dateLabel}</span>
            <span className="font-display text-[10px] font-bold text-terra-600 bg-terra-100 dark:bg-terra-900/30 px-1.5 py-0.5 rounded-full">{t('common.score', { score: record.score })}</span>
          </div>
          <div className="flex gap-0.5">
            {Object.values(record.colors || {}).filter(Boolean).slice(0, 5).map((colorKey, i) => {
              const c = COLORS_60[colorKey as string]
              return c ? <div key={i} className="w-2.5 h-2.5 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
            })}
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
      className="w-full bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl overflow-hidden shadow-warm-sm active:scale-[0.98] transition-all text-left"
    >
      <div className="flex items-center justify-center py-4 bg-warm-100 dark:bg-warm-700">
        <MannequinSVG outfit={outfitHex} size={80} />
      </div>
      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] font-semibold text-warm-900 dark:text-warm-100">{dateLabel}</span>
          <span className="font-display text-[10px] font-bold text-terra-600 bg-terra-100 dark:bg-terra-900/30 px-1.5 py-0.5 rounded-full">{t('common.score', { score: record.score })}</span>
        </div>
        <div className="flex gap-0.5">
          {Object.values(record.colors || {}).filter(Boolean).slice(0, 5).map((colorKey, i) => {
            const c = COLORS_60[colorKey as string]
            return c ? <div key={i} className="w-2.5 h-2.5 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
          })}
        </div>
      </div>
    </button>
  )
}
