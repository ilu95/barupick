// @ts-nocheck
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Camera, Lock, Users, Globe, X, Pencil, Plus } from 'lucide-react'
import MannequinSVG from '@/components/mannequin/MannequinSVG'
import ColorPicker from '@/components/ui/ColorPicker'
import ImageEditor from '@/components/ui/ImageEditor'
import CropOverlay from '@/components/ui/CropOverlay'
import { COLORS_60 } from '@/lib/colors'
import { ITEMS_CATALOG } from '@/lib/styles'
import { useOotd } from '@/hooks/useOotd'
import { useAuth } from '@/contexts/AuthContext'
import { trackOotdRecord } from '@/lib/analytics'
import { useTranslation } from 'react-i18next'

function itemToSlot(itemId: string): string | null {
  const item = ITEMS_CATALOG.find(i => i.id === itemId)
  if (!item) return null
  if (item.outerType) return 'outer'
  if (item.midType) return 'middleware'
  if (item.slot === 'scarf') return 'scarf'
  if (item.slot === 'hat') return 'hat'
  return 'top'
}

function slotToDefaultItem(slot: string): string | null {
  if (slot === 'outer') return 'jacket'
  if (slot === 'middleware') return 'knit'
  if (slot === 'scarf') return 'scarf'
  if (slot === 'hat') return 'hat'
  if (slot === 'top') return 'tshirt'
  return null
}

const SITUATION_KEYS = ['commute', 'date', 'casual', 'interview', 'travel', 'exercise'] as const
const MOOD_KEYS = [
  { emoji: '😊', key: 'satisfied' },
  { emoji: '😐', key: 'okay' },
  { emoji: '😕', key: 'regret' },
] as const

// 어떤 패널이 열려있는지
type OpenPanel = null | 'clothes' | 'accessory' | 'bottom' | 'shoes'

export default function OotdRecord() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const ootd = useOotd()

  // 편집 모드 로드
  useEffect(() => {
    const editData = localStorage.getItem("_ootd_edit")
    if (editData) {
      try {
        const rec = JSON.parse(editData)
        ootd.startEdit(rec)
        localStorage.removeItem("_ootd_edit")
        const restored: string[] = []
        Object.entries(rec.colors || {}).forEach(([slot, v]) => {
          if (v && slot !== 'bottom' && slot !== 'shoes') {
            const defItem = slotToDefaultItem(slot)
            if (defItem) restored.push(defItem)
          }
        })
        if (restored.length > 0) setPickedItems(restored)
      } catch {}
    }
  }, [])

  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [customSit, setCustomSit] = useState(false)
  const [editingPhotoIdx, setEditingPhotoIdx] = useState<number | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 아이템 상태
  const [pickedItems, setPickedItems] = useState<string[]>([])
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [pendingItem, setPendingItem] = useState<string | null>(null) // 아이템 선택 후 컬러 대기

  // 슬롯 계산
  const usedSlots = new Map<string, string>()
  pickedItems.forEach(id => {
    const slot = itemToSlot(id)
    if (slot) usedSlots.set(slot, id)
  })

  // 마네킹 hex
  const outfitHex: Record<string, string> = {}
  const allSlots = [...Array.from(usedSlots.keys()), 'bottom', 'shoes']
  allSlots.forEach(s => {
    const ck = ootd.colors[s]
    if (ck) { const c = COLORS_60[ck]; if (c) outfitHex[s] = c.hex }
  })

  // 옷 추가 → 아이템 선택
  const handleItemSelect = (itemId: string) => {
    const slot = itemToSlot(itemId)
    if (!slot) return
    // 같은 슬롯 기존 아이템 교체
    setPickedItems(prev => {
      const without = prev.filter(id => itemToSlot(id) !== slot)
      return [...without, itemId]
    })
    setPendingItem(itemId)
  }

  // 컬러 선택 완료 → 패널 닫기
  const handleColorDone = (slot: string, colorKey: string) => {
    ootd.selectColor(slot, colorKey)
    setOpenPanel(null)
    setPendingItem(null)
  }

  // 칩 제거
  const removeItem = (itemId: string) => {
    const slot = itemToSlot(itemId)
    if (slot) ootd.clearColor(slot)
    setPickedItems(prev => prev.filter(id => id !== itemId))
  }
  const removeFixed = (slot: string) => {
    ootd.clearColor(slot)
  }

  // 칩 탭 → 컬러 변경
  const editChipColor = (slot: string, panel: OpenPanel) => {
    setOpenPanel(panel)
    setPendingItem(null) // 이미 아이템은 있으니 바로 컬러 피커
  }

  const handleSave = () => {
    if (!ootd.canSave) {
      setSaveError('옷 1개 이상 + 하의 + 신발을 모두 선택해주세요')
      setTimeout(() => setSaveError(''), 2000)
      return
    }
    if (ootd.needsPhoto) {
      setSaveError('전체 공개는 착용샷이 필수예요')
      setTimeout(() => setSaveError(''), 2000)
      return
    }
    try {
      const ok = ootd.saveRecord()
      if (ok) {
        trackOotdRecord(ootd.photos.length > 0, ootd.visibility)
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          ootd.resetForm()
          setPickedItems([])
          setOpenPanel(null)
          setPendingItem(null)
          navigate('/closet')
        }, 1500)
      } else {
        setSaveError('저장에 실패했어요')
        setTimeout(() => setSaveError(''), 2000)
      }
    } catch (e) {
      setSaveError('저장 중 오류가 발생했어요')
      setTimeout(() => setSaveError(''), 2000)
    }
  }

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') setCropSrc(reader.result) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // 저장 완료
  if (saved) {
    let streakMsg = ''
    try {
      const records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]')
      if (records.length >= 3) streakMsg = t('ootdRecord.streakMessage', { count: records.length })
    } catch {}
    return (
      <div className="animate-screen-fade flex items-center justify-center py-28">
        <div className="text-center relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden -top-8">
            {['✨', '🎉', '⭐', '💫'].map((emoji, i) => (
              <span key={i} className="absolute text-xl animate-confetti"
                style={{ left: `${10 + i * 22}%`, animationDelay: `${i * 0.2}s`, animationDuration: `${1.3 + i * 0.15}s` }}>{emoji}</span>
            ))}
          </div>
          <div className="w-20 h-20 rounded-full bg-sage/20 flex items-center justify-center mx-auto mb-4 animate-score-count">
            <Check size={36} className="text-sage" />
          </div>
          <div className="font-display text-xl font-bold text-warm-900 dark:text-warm-100 mb-1">{t('ootdRecord.saveComplete')}</div>
          <div className="text-sm text-warm-600 dark:text-warm-400">오늘의 코디가 저장되었어요</div>
          {streakMsg && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-terra-50 border border-terra-200 rounded-full text-[13px] font-semibold text-terra-600 animate-pop-in">{streakMsg}</div>
          )}
        </div>
      </div>
    )
  }

  const isReady = ootd.canSave

  return (
    <div className="animate-screen-fade px-5 pt-2 pb-10">

      {/* 마네킹 */}
      {ootd.filledCount > 0 && (
        <div className="flex justify-center mb-3">
          <MannequinSVG outfit={outfitHex} size={90} />
        </div>
      )}

      {/* 날씨 */}
      {ootd.weatherData && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl text-sm">
          <span>{ootd.weatherData.code === 0 ? '☀️' : ootd.weatherData.code <= 3 ? '⛅' : ootd.weatherData.code <= 67 ? '🌧️' : '❄️'}</span>
          <span className="text-warm-800 dark:text-warm-200">{ootd.weatherData.temp}°C</span>
          <span className="text-warm-500 text-xs">체감 {ootd.weatherData.feels}°C</span>
        </div>
      )}

      {/* ═══ 1) 4버튼 1줄 ═══ */}
      <div className="text-[11px] font-semibold text-warm-600 dark:text-warm-400 tracking-wider uppercase mb-2">오늘 뭘 입었나요?</div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <button onClick={() => { setOpenPanel(openPanel === 'clothes' ? null : 'clothes'); setPendingItem(null) }}
          className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
            openPanel === 'clothes' ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300'
          }`}>
          <Plus size={14} />옷 추가
        </button>
        <button onClick={() => { setOpenPanel(openPanel === 'accessory' ? null : 'accessory'); setPendingItem(null) }}
          className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
            openPanel === 'accessory' ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300'
          }`}>
          🧣 악세서리
        </button>
        <button onClick={() => { setOpenPanel(openPanel === 'bottom' ? null : 'bottom'); setPendingItem(null) }}
          className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
            openPanel === 'bottom' ? 'bg-terra-500 text-white' : ootd.colors.bottom
              ? 'bg-terra-50 dark:bg-terra-900/20 border border-terra-300 text-terra-700 dark:text-terra-400'
              : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300'
          }`}>
          👖 하의
        </button>
        <button onClick={() => { setOpenPanel(openPanel === 'shoes' ? null : 'shoes'); setPendingItem(null) }}
          className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
            openPanel === 'shoes' ? 'bg-terra-500 text-white' : ootd.colors.shoes
              ? 'bg-terra-50 dark:bg-terra-900/20 border border-terra-300 text-terra-700 dark:text-terra-400'
              : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300'
          }`}>
          👟 신발
        </button>
      </div>

      {/* ═══ 패널: 옷 추가 (아이템→컬러) ═══ */}
      {openPanel === 'clothes' && !pendingItem && (
        <div className="mb-3 bg-warm-50 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3 animate-screen-fade">
          <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-2">어떤 옷을 입었나요?</div>
          <div className="grid grid-cols-4 gap-1.5">
            {ITEMS_CATALOG.filter(i => !i.slot).map(item => {
              const selected = pickedItems.includes(item.id)
              const slot = itemToSlot(item.id)
              const slotTaken = slot && usedSlots.has(slot) && !selected
              return (
                <button key={item.id} onClick={() => handleItemSelect(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-center transition-all active:scale-93 ${
                    selected ? 'bg-terra-100 dark:bg-terra-900/30 border-[1.5px] border-terra-400'
                    : slotTaken ? 'bg-warm-100 dark:bg-warm-700 border border-warm-200 opacity-40'
                    : 'bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600'
                  }`}>
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-[9px] font-semibold text-warm-700 dark:text-warm-300">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 패널: 옷 추가 (컬러 선택 단계) */}
      {openPanel === 'clothes' && pendingItem && (
        <div className="mb-3 animate-screen-fade">
          <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-2">
            {ITEMS_CATALOG.find(i => i.id === pendingItem)?.label}의 컬러를 골라주세요
          </div>
          <ColorPicker
            inline
            selected={null}
            onSelect={(k) => { const slot = itemToSlot(pendingItem); if (slot) handleColorDone(slot, k) }}
          />
        </div>
      )}

      {/* 패널: 악세서리 (아이템→컬러) */}
      {openPanel === 'accessory' && !pendingItem && (
        <div className="mb-3 bg-warm-50 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-2xl p-3 animate-screen-fade">
          <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-2">악세서리</div>
          <div className="grid grid-cols-4 gap-1.5">
            {ITEMS_CATALOG.filter(i => i.slot).map(item => {
              const selected = pickedItems.includes(item.id)
              return (
                <button key={item.id} onClick={() => handleItemSelect(item.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-center transition-all active:scale-93 ${
                    selected ? 'bg-terra-100 dark:bg-terra-900/30 border-[1.5px] border-terra-400'
                    : 'bg-white dark:bg-warm-700 border border-warm-300 dark:border-warm-600'
                  }`}>
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-[9px] font-semibold text-warm-700 dark:text-warm-300">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 패널: 악세서리 컬러 */}
      {openPanel === 'accessory' && pendingItem && (
        <div className="mb-3 animate-screen-fade">
          <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-2">
            {ITEMS_CATALOG.find(i => i.id === pendingItem)?.label}의 컬러
          </div>
          <ColorPicker inline selected={null}
            onSelect={(k) => { const slot = itemToSlot(pendingItem); if (slot) handleColorDone(slot, k) }} />
        </div>
      )}

      {/* 패널: 하의 컬러 */}
      {openPanel === 'bottom' && (
        <div className="mb-3 animate-screen-fade">
          <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-2">👖 하의 컬러</div>
          <ColorPicker inline selected={ootd.colors.bottom}
            onSelect={(k) => handleColorDone('bottom', k)} />
        </div>
      )}

      {/* 패널: 신발 컬러 */}
      {openPanel === 'shoes' && (
        <div className="mb-3 animate-screen-fade">
          <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 mb-2">👟 신발 컬러</div>
          <ColorPicker inline selected={ootd.colors.shoes}
            onSelect={(k) => handleColorDone('shoes', k)} />
        </div>
      )}

      {/* ═══ 추가된 아이템 칩 ═══ */}
      {(pickedItems.length > 0 || ootd.colors.bottom || ootd.colors.shoes) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {/* 의류/악세서리 칩 */}
          {pickedItems.map(id => {
            const item = ITEMS_CATALOG.find(i => i.id === id)
            const slot = itemToSlot(id)
            const colorKey = slot ? ootd.colors[slot] : null
            const color = colorKey ? COLORS_60[colorKey] : null
            if (!item) return null
            return (
              <div key={id} className="flex items-center gap-1 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1.5">
                {color && <span className="w-4 h-4 rounded border border-warm-200" style={{ background: color.hex }} />}
                <span className="text-[10px] font-semibold text-warm-700 dark:text-warm-300">
                  {item.label}{color ? ` ${color.name}` : ''}
                </span>
                {!color && <button onClick={() => { setOpenPanel('clothes'); setPendingItem(id) }}
                  className="text-[9px] text-terra-500 font-bold">컬러</button>}
                <button onClick={() => removeItem(id)} className="ml-0.5 text-warm-400 dark:text-warm-500"><X size={10} /></button>
              </div>
            )
          })}

          {/* 하의 칩 */}
          {ootd.colors.bottom && (() => {
            const c = COLORS_60[ootd.colors.bottom]
            return c ? (
              <div className="flex items-center gap-1 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1.5">
                <span className="w-4 h-4 rounded border border-warm-200" style={{ background: c.hex }} />
                <span className="text-[10px] font-semibold text-warm-700 dark:text-warm-300">하의 {c.name}</span>
                <button onClick={() => removeFixed('bottom')} className="ml-0.5 text-warm-400"><X size={10} /></button>
              </div>
            ) : null
          })()}

          {/* 신발 칩 */}
          {ootd.colors.shoes && (() => {
            const c = COLORS_60[ootd.colors.shoes]
            return c ? (
              <div className="flex items-center gap-1 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1.5">
                <span className="w-4 h-4 rounded border border-warm-200" style={{ background: c.hex }} />
                <span className="text-[10px] font-semibold text-warm-700 dark:text-warm-300">신발 {c.name}</span>
                <button onClick={() => removeFixed('shoes')} className="ml-0.5 text-warm-400"><X size={10} /></button>
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* 안내 */}
      {!isReady && (
        <div className="mb-4 text-center text-[12px] text-warm-500 dark:text-warm-400 bg-warm-100 dark:bg-warm-800 rounded-xl py-3">
          {ootd.filledCount === 0
            ? '위에서 오늘 입은 옷과 컬러를 골라주세요'
            : !ootd.colors.bottom && !ootd.colors.shoes
              ? '하의와 신발 컬러도 골라주세요'
              : !ootd.colors.bottom
                ? '하의 컬러를 골라주세요'
                : !ootd.colors.shoes
                  ? '신발 컬러를 골라주세요'
                  : '옷을 1개 이상 추가해주세요'}
        </div>
      )}

      {/* ═══ 2) 항상 열린 옵션들 — 압축 레이아웃 ═══ */}

      {/* 사진 */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-warm-500 dark:text-warm-400 tracking-wider uppercase mb-1.5">
          📷 사진 {ootd.visibility === 'public' && <span className="text-red-500 normal-case tracking-normal">(전체 공개 시 필수)</span>}
          {ootd.photos.length > 0 && <span className="ml-auto text-warm-400 normal-case tracking-normal">{ootd.photos.length}/4</span>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {ootd.photos.map((photo, idx) => (
            <div key={idx} className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative">
              <img src={photo} className="w-full h-full object-cover" alt="" />
              <button onClick={() => setEditingPhotoIdx(idx)}
                className="absolute bottom-0.5 left-0.5 w-4 h-4 rounded-full bg-black/50 text-white flex items-center justify-center">
                <Pencil size={7} />
              </button>
              <button onClick={() => ootd.removePhoto(idx)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 text-white text-[8px] flex items-center justify-center">✕</button>
            </div>
          ))}
          {ootd.photos.length < 4 && (
            <label className="w-14 h-14 rounded-xl border-2 border-dashed border-warm-400 dark:border-warm-600 flex flex-col items-center justify-center cursor-pointer flex-shrink-0 active:scale-95 bg-warm-100 dark:bg-warm-800">
              <Camera size={16} className="text-warm-500" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
            </label>
          )}
        </div>
      </div>

      {/* 메모 */}
      <div className="mb-3">
        <input type="text" placeholder={`💬 ${t('ootdRecord.memoPlaceholder')}`} maxLength={100}
          value={ootd.memo} onChange={e => ootd.setMemo(e.target.value)}
          className="w-full bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl px-3 py-2.5 text-xs text-warm-900 dark:text-warm-100 placeholder-warm-400 outline-none focus:border-terra-400 transition-all" />
      </div>

      {/* 상황 — 가로 스크롤 1줄 */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 tracking-wider uppercase mb-1.5">📍 상황</div>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {SITUATION_KEYS.map(key => {
            const label = t(`ootdRecord.situations.${key}`)
            return (
            <button key={key} onClick={() => { setCustomSit(false); ootd.setSituation(ootd.situation === label ? null : label) }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                ootd.situation === label ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
              }`}>{label}</button>
            )
          })}
          <button onClick={() => { setCustomSit(!customSit); ootd.setSituation(null) }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              customSit ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
            }`}>✏️ 직접</button>
        </div>
        {customSit && (
          <input autoFocus type="text" placeholder="예: 소개팅, 결혼식..." maxLength={20}
            className="w-full mt-1.5 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-xl px-3 py-2 text-xs text-warm-900 dark:text-warm-100 placeholder-warm-400 outline-none focus:border-terra-400"
            onChange={e => ootd.setSituation(e.target.value || null)} />
        )}
      </div>

      {/* 기분 — 1줄 */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 tracking-wider uppercase mb-1.5">기분</div>
        <div className="flex gap-1.5">
          {MOOD_KEYS.map(m => {
            const text = t(`ootdRecord.moods.${m.key}`)
            const val = m.emoji + ' ' + text
            return (
              <button key={m.key} onClick={() => ootd.setMood(ootd.mood === val ? null : val)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-medium text-center transition-all ${
                  ootd.mood === val ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
                }`}>{val}</button>
            )
          })}
        </div>
      </div>

      {/* 공개 범위 — 1줄 */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold text-warm-500 dark:text-warm-400 tracking-wider uppercase mb-1.5">공개 범위</div>
        <div className="flex gap-1.5">
          {[
            { key: 'private', icon: <Lock size={11} />, label: t('ootdRecord.visibility.private') },
            { key: 'friends', icon: <Users size={11} />, label: t('ootdRecord.visibility.friends') },
            { key: 'public', icon: <Globe size={11} />, label: t('ootdRecord.visibility.public') },
          ].map(v => (
            <button key={v.key} onClick={() => ootd.setVisibility(v.key as any)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                ootd.visibility === v.key ? 'bg-terra-500 text-white' : 'bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-600 dark:text-warm-400'
              }`}>{v.icon} {v.label}</button>
          ))}
        </div>
        {ootd.visibility === 'public' && (
          <div className="mt-1.5 text-[10px] text-green-600 dark:text-green-400">🌐 기록 시 커뮤니티에 바로 공개 · 착용샷 필수</div>
        )}
        {(ootd.visibility === 'public' || ootd.visibility === 'friends') && profile?.instagram_id && (
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 mt-1.5">
            <div className="text-[11px] font-medium text-warm-800 dark:text-warm-200">📸 @{profile.instagram_id}</div>
            <button onClick={() => ootd.setShowInstagram(!ootd.showInstagram)}
              className={`w-10 h-5 rounded-full transition-all ${ootd.showInstagram ? 'bg-terra-500' : 'bg-warm-400'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${ootd.showInstagram ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}
      </div>

      {/* 이미지 편집기 */}
      {editingPhotoIdx !== null && ootd.photos[editingPhotoIdx] && (
        <ImageEditor src={ootd.photos[editingPhotoIdx]}
          onSave={(dataUrl) => { ootd.replacePhoto(editingPhotoIdx, dataUrl); setEditingPhotoIdx(null) }}
          onCancel={() => setEditingPhotoIdx(null)} />
      )}
      {cropSrc && <CropOverlay src={cropSrc} ratio={4/5} onDone={(url) => { ootd.addPhoto(url); setCropSrc(null) }} onCancel={() => setCropSrc(null)} />}

      {/* 에러 */}
      {saveError && (
        <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3.5 py-2.5 animate-screen-fade">
          <div className="text-xs font-semibold text-red-700 dark:text-red-400">{saveError}</div>
        </div>
      )}

      {/* CTA */}
      <button onClick={handleSave}
        className={`w-full py-3.5 ${isReady && !ootd.needsPhoto ? 'bg-terra-500 shadow-terra active:scale-[0.98]' : 'bg-warm-400 dark:bg-warm-600 opacity-60 cursor-not-allowed'} text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-2`}>
        <Check size={16} /> {ootd.editId ? t('common.done') : t('common.save')}
      </button>

      <button onClick={() => navigate('/closet')}
        className="w-full py-2.5 bg-white dark:bg-warm-800 border border-warm-300 dark:border-warm-600 text-warm-700 dark:text-warm-300 rounded-2xl font-medium text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all">
        코디 캘린더 보기
      </button>
    </div>
  )
}
