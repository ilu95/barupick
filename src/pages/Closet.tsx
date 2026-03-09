import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Star, ChevronLeft, ChevronRight, Shirt, Trash2, Wand2 } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { COLORS_60 } from '@/lib/colors'
import { useOotd, type OotdRecord } from '@/hooks/useOotd'

type ClosetTab = 'wardrobe' | 'records'

export default function Closet() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<ClosetTab>('records')

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">
      {/* 세그먼트 컨트롤 */}
      <div className="relative flex bg-warm-200 rounded-xl p-1 mb-5">
        <div
          className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-white rounded-lg shadow-warm-sm transition-transform duration-200"
          style={{ transform: tab === 'wardrobe' ? 'translateX(0)' : 'translateX(100%)' }}
        />
        <button
          onClick={() => setTab('wardrobe')}
          className={`relative z-10 flex-1 py-2.5 text-[13px] font-semibold text-center rounded-lg transition-colors ${
            tab === 'wardrobe' ? 'text-warm-900' : 'text-warm-600'
          }`}
        >내 옷장</button>
        <button
          onClick={() => setTab('records')}
          className={`relative z-10 flex-1 py-2.5 text-[13px] font-semibold text-center rounded-lg transition-colors ${
            tab === 'records' ? 'text-warm-900' : 'text-warm-600'
          }`}
        >코디 기록</button>
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
  const modal = useModal()
  const toast = useToast()
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_wardrobe') || '[]') } catch { return [] }
  })
  const [filter, setFilter] = useState<string>('all')
  const undoRef = useRef<{ id: string; item: any; timer: ReturnType<typeof setTimeout> } | null>(null)

  const getColor = (item: any) => item.color || item.colorKey || null
  const catOrder = ['outer', 'middleware', 'top', 'bottom', 'scarf', 'hat', 'shoes']
  const catNames: Record<string, string> = { outer: '아우터', middleware: '미들웨어', top: '상의', bottom: '하의', scarf: '목도리', hat: '모자', shoes: '신발' }
  const getCatKey = (item: any) => catOrder.includes(item.category) ? item.category : 'etc'

  // localStorage 저장 헬퍼
  const persist = useCallback((nextItems: any[]) => {
    localStorage.setItem('sp_wardrobe', JSON.stringify(nextItems))
  }, [])

  const handleDelete = (id: string) => {
    const target = items.find((i: any) => i.id === id)
    if (!target) return
    const displayName = target.name || COLORS_60[getColor(target)]?.name || '아이템'

    modal.confirm({
      title: '아이템 삭제',
      message: `"${displayName}"을(를) 삭제할까요?`,
      confirmLabel: '삭제',
      variant: 'danger',
      onConfirm: () => {
        // 즉시 UI에서 제거
        const next = items.filter((i: any) => i.id !== id)
        setItems(next)
        persist(next)

        // 되돌리기 토스트 (5초)
        toast.toast({
          message: `"${displayName}" 삭제됨`,
          undoAction: () => {
            // 복원: 원래 위치에 다시 삽입
            const current = JSON.parse(localStorage.getItem('sp_wardrobe') || '[]')
            current.push(target)
            localStorage.setItem('sp_wardrobe', JSON.stringify(current))
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
    const displayName = item.name || c?.name || colorKey || '알 수 없음'
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : ''

    return (
      <div key={item.id} className="flex items-center gap-3 bg-white dark:bg-warm-800 border border-warm-400 dark:border-warm-600 rounded-2xl px-4 py-3 mb-2 shadow-warm-sm">
        {/* 썸네일 or 컬러 블록 */}
        {item.photoThumb ? (
          <img src={item.photoThumb} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-warm-300" alt="" />
        ) : (
          <div className="w-11 h-11 rounded-xl flex-shrink-0 border border-warm-300 flex items-center justify-center" style={{ background: c?.hex || '#ddd' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-warm-900 dark:text-warm-100 truncate">{displayName}</div>
          <div className="flex items-center gap-1.5 text-xs text-warm-600 dark:text-warm-400 mt-0.5">
            <span className="w-3 h-3 rounded-full border border-warm-400 inline-block flex-shrink-0" style={{ background: c?.hex || '#ddd' }} />
            {c?.name || ''}{date ? ` · ${date}` : ''}
          </div>
        </div>
        <button onClick={() => handleDelete(item.id)} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg active:bg-warm-200 dark:active:bg-warm-700 transition-colors">
          <Trash2 size={15} className="text-warm-500" />
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Shirt size={40} className="text-warm-400 mx-auto mb-3" />
        <div className="text-sm text-warm-600 dark:text-warm-400 mb-4">옷장이 비어있어요</div>
        <button onClick={() => navigate('/closet/add')} className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra">첫 아이템 등록하기</button>
      </div>
    )
  }

  return (
    <div>
      {/* 내 옷으로 코디하기 CTA */}
      {hasTop && hasBottom ? (
        <button onClick={() => navigate('/closet/coord')} className="w-full py-3 bg-terra-500 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 mb-4 active:scale-[0.98] transition-all shadow-terra">
          <Wand2 size={16} /> 내 옷으로 코디하기
        </button>
      ) : (
        <button disabled className="w-full py-3 bg-warm-400 dark:bg-warm-600 text-warm-600 dark:text-warm-400 rounded-2xl text-sm font-medium mb-4 cursor-not-allowed">내 옷으로 코디하기 (상의+하의 필요)</button>
      )}

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 hide-scrollbar">
        <button onClick={() => setFilter('all')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${filter === 'all' ? 'bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900' : 'bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400 active:scale-95'}`}>전체 {items.length}</button>
        {catOrder.map(cat => {
          const count = items.filter((i: any) => i.category === cat).length
          if (count === 0) return null
          return (
            <button key={cat} onClick={() => setFilter(filter === cat ? 'all' : cat)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${filter === cat ? 'bg-warm-900 dark:bg-warm-100 text-white dark:text-warm-900' : 'bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400 active:scale-95'}`}>{catNames[cat]} {count}</button>
          )
        })}
      </div>

      {/* 아이템 추가 버튼 */}
      <button onClick={() => navigate('/closet/add')} className="w-full bg-warm-200 dark:bg-warm-800 border-2 border-dashed border-warm-400 dark:border-warm-600 rounded-2xl py-4 text-center mb-4 active:scale-[0.98] transition-all">
        <div className="text-warm-500 text-lg mb-0.5">+</div>
        <div className="text-xs text-warm-600 dark:text-warm-400 font-medium">아이템 추가</div>
      </button>

      {/* 아이템 목록 — 전체면 카테고리별 그룹, 필터면 플랫 */}
      {filter === 'all' ? (
        catOrder.map(cat => {
          const catItems = items.filter((i: any) => i.category === cat)
          if (catItems.length === 0) return null
          return (
            <div key={cat} className="mb-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 dark:text-warm-400 tracking-wide mb-2">
                {catNames[cat]} <span className="text-warm-500">{catItems.length}</span>
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
          <div className="text-[13px] font-semibold text-warm-900">코디 캘린더</div>
          <div className="text-[10px] text-warm-500 mt-0.5">날짜별 기록 보기</div>
        </button>
        <button
          onClick={() => navigate('/closet/best')}
          className="bg-white border border-warm-400 rounded-2xl p-4 text-center shadow-warm-sm active:scale-[0.97] transition-all"
        >
          <Star size={24} className="text-terra-500 mx-auto mb-2" />
          <div className="text-[13px] font-semibold text-warm-900">베스트 코디</div>
          <div className="text-[10px] text-warm-500 mt-0.5">높은 점수순</div>
        </button>
      </div>

      {/* 최근 기록 리스트 */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-600 tracking-widest uppercase mb-3">
        최근 기록 ({records.length})
      </div>

      {records.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {records.slice(0, 20).map(record => (
            <RecordCard key={record.id} record={record} navigate={navigate} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <div className="text-sm text-warm-600 mb-4">아직 기록이 없어요</div>
          <button
            onClick={() => navigate('/record')}
            className="px-5 py-2.5 bg-terra-500 text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-terra"
          >첫 OOTD 기록하기</button>
        </div>
      )}
    </div>
  )
}

// ─── 기록 카드 ───
function RecordCard({ record, navigate }: { record: OotdRecord, navigate: any }) {
  const outfitHex: Record<string, string> = {}
  Object.entries(record.colors || {}).forEach(([k, v]) => {
    if (v) { const c = COLORS_60[v]; if (c) outfitHex[k] = c.hex }
  })

  const dateLabel = (() => {
    const today = new Date()
    const d = new Date(record.date)
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
    if (diff === 0) return '오늘'
    if (diff === 1) return '어제'
    if (diff < 7) return `${diff}일 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  })()

  const hasPhoto = record.photos && record.photos.length > 0

  // 사진이 있으면 사진 중심 레이아웃, 없으면 마네킹 레이아웃
  if (hasPhoto) {
    return (
      <button
        onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
        className="w-full bg-white border border-warm-400 rounded-2xl overflow-hidden shadow-warm-sm active:scale-[0.98] transition-all text-left"
      >
        {/* 사진 — 큰 사이즈 */}
        <img src={record.photos[0]} className="w-full aspect-[4/5] object-cover" alt="" />

        {/* 하단 정보 바 */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <MannequinSVG outfit={outfitHex} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-warm-900">{dateLabel}</span>
              <span className="font-display text-[11px] font-bold text-terra-600 bg-terra-100 px-2 py-0.5 rounded-full">{record.score}점</span>
            </div>
            {record.situation && <div className="text-[11px] text-warm-600 truncate">{record.situation}</div>}
          </div>
          {/* 컬러 도트 */}
          <div className="flex gap-1 flex-shrink-0">
            {Object.values(record.colors || {}).filter(Boolean).slice(0, 4).map((colorKey, i) => {
              const c = COLORS_60[colorKey as string]
              return c ? <div key={i} className="w-3 h-3 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
            })}
          </div>
        </div>
      </button>
    )
  }

  // 사진 없음 → 기존 마네킹 카드
  return (
    <button
      onClick={() => navigate(`/closet/ootd/${record.date}?id=${record.id}`)}
      className="w-full flex items-center gap-3 bg-white border border-warm-400 rounded-2xl p-3 shadow-warm-sm active:scale-[0.98] transition-all text-left"
    >
      <MannequinSVG outfit={outfitHex} size={60} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[13px] font-semibold text-warm-900">{dateLabel}</span>
          <span className="font-display text-[11px] font-bold text-terra-600 bg-terra-100 px-2 py-0.5 rounded-full">{record.score}점</span>
        </div>
        {record.situation && <div className="text-[11px] text-warm-600 mb-0.5">{record.situation}</div>}
        {record.memo && <div className="text-[11px] text-warm-500 truncate">{record.memo}</div>}
        <div className="flex gap-1 mt-1.5">
          {Object.values(record.colors || {}).filter(Boolean).map((colorKey, i) => {
            const c = COLORS_60[colorKey as string]
            return c ? <div key={i} className="w-3 h-3 rounded-full border border-warm-400/50" style={{ background: c.hex }} /> : null
          })}
        </div>
      </div>
    </button>
  )
}
